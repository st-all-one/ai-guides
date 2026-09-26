# NGINX Architecture

## Process Model

nginx runs as a **master process** managing **worker processes**.

- The **master process** reads and evaluates configuration, maintains worker processes, and handles signal-based lifecycle events. It runs as root.
- **Worker processes** perform actual request processing. They run under an unprivileged user (default `nobody`).
- nginx uses an **event-based** model with OS-dependent mechanisms (epoll/kqueue/select/poll) to efficiently distribute requests among workers.

```
                                    ┌──────────────┐
                    Signals         │  Master      │
                    ───────────────►│  Process     │
                                    │  (root)      │
                                    └──────┬───────┘
                                           │
                          ┌────────────────┼────────────────┐
                          ▼                ▼                 ▼
                    ┌──────────┐    ┌──────────┐     ┌──────────┐
                    │ Worker 1 │    │ Worker 2 │ ... │ Worker N │
                    │ (www)    │    │ (www)    │     │ (www)    │
                    └──────────┘    └──────────┘     └──────────┘
```

### worker_processes

The number of worker processes is defined by the `worker_processes` directive. Use `auto` to autodetect the number of CPU cores.

```nginx
worker_processes auto;
worker_processes 4;
```

## Signal-Based Control

Signals are sent to the master process ID stored in `nginx.pid` (default `logs/nginx.pid`).

### Signals for Master Process

| Signal | Action |
|--------|--------|
| TERM, INT | Fast shutdown |
| QUIT | Graceful shutdown — finish serving current requests then exit |
| HUP | Reload configuration — check syntax, apply new config, start new workers, gracefully shut down old workers |
| USR1 | Re-open log files — for log rotation |
| USR2 | Upgrade executable on the fly |
| WINCH | Graceful shutdown of worker processes (without closing master) |

### Signals for Worker Processes

| Signal | Action |
|--------|--------|
| TERM, INT | Fast shutdown |
| QUIT | Graceful shutdown |
| USR1 | Re-open log files |
| WINCH | Abnormal termination for debugging (requires `debug_points`) |

### Sending Signals

```bash
# Using nginx -s
nginx -s quit       # graceful shutdown
nginx -s reload     # reload configuration
nginx -s reopen     # reopen logs
nginx -s stop       # fast shutdown

# Using kill
kill -s QUIT 1628
kill -s HUP 1628
```

### HUP Reload Process

1. Master process checks syntax validity of new configuration file.
2. Tries to apply new configuration (open log files, new listen sockets).
3. If successful: starts new worker processes, sends shutdown message to old workers.
4. Old workers stop accepting new connections, finish servicing current clients, then exit.
5. If failed: rolls back changes, continues with old configuration.

### Binary Upgrade (USR2 → WINCH → QUIT)

1. Replace old executable with new one.
2. `kill -s USR2 <master_pid>` — master renames pid file to `.oldbin`, starts new master + workers.
3. `kill -s WINCH <old_master_pid>` — old workers shut down gracefully.
4. If new executable is acceptable: `kill -s QUIT <old_master_pid>` to finish.
5. If new executable fails: send HUP to old master to restart old workers, or TERM to new master.

## Event Processing Methods

nginx selects the most efficient method automatically. Method can be overridden with the `use` directive in the `events` block.

| Method | Platform | Notes |
|--------|----------|-------|
| `select` | All | Standard method; built automatically when no efficient method available. Controlled by `--with-select_module` / `--without-select_module`. |
| `poll` | All | Standard method; built automatically when no efficient method available. Controlled by `--with-poll_module` / `--without-poll_module`. |
| `kqueue` | FreeBSD 4.1+, OpenBSD 2.9+, NetBSD 2.0+, macOS | Efficient. Reports number of new connections (ignores `multi_accept`). |
| `epoll` | Linux 2.6+ | Efficient. Supports `EPOLLRDHUP` (Linux 2.6.17+, since nginx 1.11.3) and `EPOLLEXCLUSIVE` (Linux 4.5+, since nginx 1.11.3). |
| `/dev/poll` | Solaris 7 11/99+, HP/UX 11.22+, IRIX 6.5.15+, Tru64 UNIX 5.1A+ | Efficient. |
| `eventport` | Solaris 10+ | Event ports. Known issues exist; prefer `/dev/poll`. |

```nginx
events {
    use epoll;
    worker_connections 2048;
}
```

## Configuration Context Hierarchy

```
main (global)
├── events
├── http
│   ├── server (virtual host)
│   │   ├── location (URI matching)
│   │   └── location
│   └── server
│       └── location
├── mail
│   └── server
├── stream
│   └── server
└── (other directives like worker_processes, error_log, etc.)
```

### Directive Types

- **Simple directive**: `name parameters;` (ends with semicolon)
- **Block directive**: `name { ... }` (contains other directives inside braces)
- **Context**: A block directive that can contain other directives (e.g., `events`, `http`, `server`, `location`)
- **Main context**: Directives placed outside any block context

### Directive Inheritance Model

Directives placed in a parent context are inherited by child contexts unless overridden. For example, a `root` directive in `server` is inherited by all `location` blocks within that server, unless a `location` defines its own `root`.

```nginx
http {
    root /data/www;       # inherited by all servers & locations

    server {
        # inherits root /data/www

        location /images/ {
            root /data;   # overrides parent root for this location
        }

        location / {
            # inherits root /data/www from http
        }
    }
}
```

### Comments

Lines starting with `#` are comments.

```nginx
# This is a comment
```

## Variable System

Variables are **evaluated at runtime** during request processing. They are **not** macro/template substitutions.

### Variable Naming

- Variables start with `$`.
- Some variables are provided by modules (e.g., `$remote_addr`, `$uri`, `$args`).
- Variables can be set with `set` or `map` directives.

### Cost of Variables

Variables are **costly** compared to static configuration. They are evaluated per-request. **Do not use variables as template macros or to store static strings** — use `include` and external tooling (sed, make) for configuration generation instead.

### Common Built-in Variables

| Variable | Module | Description |
|----------|--------|-------------|
| `$args` | core | Full query string |
| `$arg_<name>` | core | Specific query parameter |
| `$binary_remote_addr` | core | Client address as binary (4 bytes for IPv4) |
| `$body_bytes_sent` | core | Number of bytes sent to client, excluding headers |
| `$bytes_sent` | core/log | Number of bytes sent to client |
| `$connection` | core | Serial connection number |
| `$connection_requests` | core | Current number of requests through a connection |
| `$connection_time` | core | Connection time in seconds |
| `$content_length` | core | Content-Length request header |
| `$content_type` | core | Content-Type request header |
| `$cookie_<name>` | core | Named cookie value |
| `$document_root` | core | Root directive value for current request |
| `$document_uri` | core | Current URI (decoded) |
| `$host` | core | Host header, or server name |
| `$hostname` | core | Hostname of the server machine |
| `$http_<name>` | core | Arbitrary request header field |
| `$https` | core | "on" if SSL/TLS mode, empty otherwise |
| `$is_args` | core | "?" if request has args, empty otherwise |
| `$limit_rate` | core | Rate limit setting |
| `$msec` | core | Current Unix timestamp in seconds with milliseconds |
| `$nginx_version` | core | NGINX version |
| `$pid` | core | PID of the worker process |
| `$pipe` | core | "p" if pipelined, "." otherwise |
| `$proxy_protocol_addr` | core | PROXY protocol client address |
| `$proxy_protocol_port` | core | PROXY protocol client port |
| `$proxy_protocol_server_addr` | core | PROXY protocol server address |
| `$proxy_protocol_server_port` | core | PROXY protocol server port |
| `$query_string` | core | Same as `$args` |
| `$realpath_root` | core | Real path of document root (resolved symlinks) |
| `$remote_addr` | core | Client IP address |
| `$remote_port` | core | Client port |
| `$remote_user` | core | Basic auth username |
| `$request` | core | Full request line (method + URI + HTTP version) |
| `$request_body` | core | Request body |
| `$request_body_file` | core | Temp file name of request body |
| `$request_completion` | core | "OK" if request is complete, empty otherwise |
| `$request_filename` | core | File path for current request (root + URI) |
| `$request_id` | core | Unique 16-byte random request ID (hex) |
| `$request_length` | core | Request length (bytes) |
| `$request_method` | core | HTTP method (GET, POST, etc.) |
| `$request_time` | core | Request processing time (seconds, milliseconds) |
| `$request_uri` | core | Full original URI (with arguments, encoded) |
| `$scheme` | core | Request scheme (http or https) |
| `$sent_http_<name>` | core | Arbitrary response header field |
| `$sent_trailer_<name>` | core | Arbitrary response trailer field |
| `$server_addr` | core | Server IP address |
| `$server_name` | core | Server name for the current request |
| `$server_port` | core | Server port |
| `$server_protocol` | core | HTTP version (HTTP/1.0, HTTP/1.1, HTTP/2.0) |
| `$status` | core | Response status code |
| `$tcpinfo_rtt`, `$tcpinfo_rttvar`, `$tcpinfo_snd_cwnd`, `$tcpinfo_rcv_space` | core | TCP connection info (Linux only) |
| `$time_iso8601` | core | Local time in ISO 8601 format |
| `$time_local` | core | Local time in Common Log Format |
| `$uid_got` | core | Cookie and possibly embedded client identifier |
| `$uid_set` | core | Set cookie and possibly embedded client identifier |
| `$upstream_<name>` | upstream | Various upstream response variables |
| `$uri` | core | Current normalized URI |

## Hash Table Configuration

nginx uses hash tables for fast lookups of static data sets: server names, map directive values, MIME types, and request header names.

### How Hash Tables Work

- At startup and each reconfiguration, nginx selects the minimum possible hash table size.
- The **bucket size** stores keys with identical hash values.
- Bucket size is aligned to a multiple of the processor's **cache line size** for performance.
- If bucket size = 1 cache line, worst-case memory accesses = 2 (one for bucket address, one for key search inside bucket).

### Key Directives

| Directive | Default | Context | Description |
|-----------|---------|---------|-------------|
| `server_names_hash_max_size` | 512 | http | Maximum size of server names hash table |
| `server_names_hash_bucket_size` | 32/64/128 | http | Bucket size for server names hash (aligned to cache line) |
| `variables_hash_max_size` | 1024 | http | Maximum size of variables hash table |
| `variables_hash_bucket_size` | 64 | http | Bucket size for variables hash |
| `types_hash_max_size` | 1024 | http | Maximum size of types hash table |
| `types_hash_bucket_size` | 64 | http | Bucket size for types hash |
| `map_hash_max_size` | 2048 | http | Maximum size of map hash table |
| `map_hash_bucket_size` | 64 | http | Bucket size for map hash |

```nginx
http {
    server_names_hash_max_size 1024;
    server_names_hash_bucket_size 64;
    variables_hash_max_size 2048;
}
```

If nginx emits a message requesting to increase hash max size or bucket size, increase the max size first.

## HTTP Request Processing Phases

### Server Selection

1. nginx first selects which `server` block handles the request based on the **listen** directive (IP address and port).
2. For the matched listen socket, nginx determines the `server_name` by examining the Host header.
3. If no Host header matches, the **default server** for that port handles the request (first server defined, or the one with `default_server` parameter).

```nginx
server {
    listen 80 default_server;
    server_name example.org;
    ...
}
```

Requests without a Host header can be caught with:

```nginx
server {
    listen 80;
    server_name "";
    return 444;
}
```

### Location Selection

After server selection, nginx determines which `location` block processes the request:

1. **Prefix locations** (literal strings) are checked first. The **longest matching prefix** is remembered.
2. **Regular expression locations** (`~` for case-sensitive, `~*` for case-insensitive) are then checked **in order in the configuration file**.
3. The **first matching regular expression** is used.
4. If no regular expression matches, the **longest-matching prefix location** is used.
5. `^~` prefix modifier: if this prefix matches, nginx skips regular expression checking.
6. `=` prefix modifier: exact match, stops immediately.

```
Location match priority:
  1. = /exact        (exact match, highest priority)
  2. ^~ /prefix      (prefix match, skip regex)
  3. ~  regex        (case-sensitive regex, first match wins)
  4. ~* regex        (case-insensitive regex, first match wins)
  5. /prefix         (longest prefix match)
```

```nginx
location = / {              # exact match for "/"
    ...
}

location ^~ /images/ {      # prefix match, skip regex after match
    ...
}

location ~ \.php$ {         # case-sensitive regex
    fastcgi_pass localhost:9000;
    ...
}

location ~* \.(gif|jpg|png)$ {  # case-insensitive regex
    root /data/images;
    ...
}

location / {                # catch-all prefix (shortest)
    root /data/www;
}
```

### URI Arguments Handling

- Locations test only the URI **path** part, not query string arguments.
- Query arguments are in `$args` / `$query_string`.
- Internal redirects (e.g., from `index` module) cause nginx to re-search locations.

## Stream Session Processing Phases

TCP/UDP sessions in the `stream` module process through the following phases in order:

```
Post-accept → Pre-access → Access → SSL → Preread → Content → Log
```

| Phase | Description | Modules |
|-------|-------------|---------|
| **Post-accept** | First phase after accepting a connection | `ngx_stream_realip_module` |
| **Pre-access** | Preliminary access checks | `ngx_stream_limit_conn_module`, `ngx_stream_set_module` |
| **Access** | Client access limitation | `ngx_stream_access_module`, `njs js_access` |
| **SSL** | TLS/SSL termination | `ngx_stream_ssl_module` |
| **Preread** | Read initial bytes into preread buffer | `ngx_stream_ssl_preread_module`, `njs js_preread` |
| **Content** | Actual data processing (mandatory) | `ngx_stream_proxy_module`, `ngx_stream_return_module`, `ngx_stream_upstream_module`, `njs js_filter` |
| **Log** | Final phase, record session result | `ngx_stream_log_module` |

## Connection Processing

### accept_mutex

When enabled, worker processes accept new connections by turn. When disabled, all workers are notified about new connections, potentially wasting system resources on low-volume connections.

```nginx
events {
    accept_mutex on;       # default was on before 1.11.3, off since 1.11.3
    accept_mutex_delay 500ms;  # max time a worker waits to retry accepting
}
```

No need to enable `accept_mutex` on systems with `EPOLLEXCLUSIVE` (Linux 4.5+, nginx 1.11.3+) or when using `reuseport`.

### multi_accept

```nginx
events {
    multi_accept on;       # accept all new connections at once
    multi_accept off;      # accept one new connection at a time (default)
}
```

Ignored when using `kqueue` (which reports the number of waiting connections).

### worker_connections

Maximum number of simultaneous connections per worker process. Includes all connections (clients, upstream servers, etc.). Actual limit is constrained by `worker_rlimit_nofile` (RLIMIT_NOFILE).

```nginx
events {
    worker_connections 2048;
}
```

### stall_threshold

Defaults to 1000ms. When an event loop iteration exceeds this threshold, a stall is reported. Ignored if `timer_resolution` is enabled. (Commercial subscription feature since 1.29.0.)

```nginx
events {
    stall_threshold 2000ms;
}
```

## Thread Pools

Enables multi-threaded reading and sending of files without blocking worker processes. Requires `--with-threads` at build time.

```nginx
thread_pool default threads=32 max_queue=65536;
thread_pool custom threads=16 max_queue=1024;
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `threads` | 32 | Number of threads in the pool |
| `max_queue` | 65536 | Maximum number of tasks waiting in queue; overflow causes errors |

## Timer Resolution

Reduces the number of `gettimeofday()` system calls. By default, called on every kernel event. With `timer_resolution`, called once per specified interval.

```nginx
timer_resolution 100ms;
```

Implementation depends on event method:
- `kqueue`: `EVFILT_TIMER` filter
- `eventport`: `timer_create()`
- Others: `setitimer()`

## PCRE JIT

Enables just-in-time compilation for regular expressions to speed up processing. Configure with `--with-pcre-jit` at build time.

```nginx
pcre_jit on;
```

Available since nginx 1.1.12. PCRE library must be 8.20+ built with `--enable-jit`.

## Core Module Example Configuration

```nginx
user www www;
worker_processes 2;

error_log /var/log/nginx-error.log info;

events {
    use kqueue;
    worker_connections 2048;
}

http {
    server {
        listen 80;
        server_name example.com;
        root /var/www/example;
    }
}
```
