# NGINX Configuration Basics

## Table of Contents

1. [Configuration Syntax](#configuration-syntax)
2. [Measurement Units](#measurement-units)
3. [Core Module Directives](#core-module-directives)
4. [Events Block Directives](#events-block-directives)
5. [Thread Pools Configuration](#thread-pools-configuration)
6. [Performance Tuning](#performance-tuning)
7. [Variable Index](#variable-index)
8. [Directive Index](#directive-index)

---

## Configuration Syntax

### Directives

- **Simple directive**: `name parameters;`
- **Block directive**: `name { ... }`
- **Context**: A block directive that can contain other directives

```nginx
# Simple directive
worker_processes auto;
error_log logs/error.log;

# Block directive / context
events {
    worker_connections 1024;
}

# Nested contexts
http {
    server {
        listen 80;
        location / {
            root /data/www;
        }
    }
}
```

### Comments

```nginx
# This is a comment
```

### include Directive

```nginx
include mime.types;
include vhosts/*.conf;
```

Can be used in any context.

### load_module Directive

```nginx
load_module modules/ngx_mail_module.so;
```

Available since 1.9.11. Context: `main`.

## Measurement Units

### Sizes and Offsets

| Suffix | Meaning | Example |
|--------|---------|---------|
| (none) | bytes | `1024` |
| `k` / `K` | kilobytes | `8k` |
| `m` / `M` | megabytes | `1m` |
| `g` / `G` | gigabytes (offsets only) | `2g` |

### Time Intervals

| Suffix | Meaning | Notes |
|--------|---------|-------|
| (none) | seconds | Default if no suffix |
| `ms` | milliseconds | |
| `s` | seconds | |
| `m` | minutes | |
| `h` | hours | |
| `d` | days | |
| `w` | weeks | |
| `M` | months, 30 days | |
| `y` | years, 365 days | |

Multiple units can be combined, from most to least significant:

```nginx
client_body_timeout 1h 30m;      # same as 90m or 5400s
```

Always specify a suffix. Some time intervals have only seconds resolution.

## Core Module Directives

All directives in the `ngx_core_module`.

### accept_mutex

| Item | Value |
|------|-------|
| **Syntax** | `accept_mutex on \| off;` |
| **Default** | `accept_mutex off;` |
| **Context** | `events` |

Enables mutual exclusion for accepting new connections. When `on`, workers accept by turn. When `off`, all workers are notified. Unnecessary with `EPOLLEXCLUSIVE` (Linux 4.5+, nginx 1.11.3) or `reuseport`. Default changed to `off` in 1.11.3 (was `on` before).

### accept_mutex_delay

| Item | Value |
|------|-------|
| **Syntax** | `accept_mutex_delay <time>;` |
| **Default** | `accept_mutex_delay 500ms;` |
| **Context** | `events` |

Maximum time a worker waits to retry accepting connections when `accept_mutex` is enabled.

### daemon

| Item | Value |
|------|-------|
| **Syntax** | `daemon on \| off;` |
| **Default** | `daemon on;` |
| **Context** | `main` |

If `off`, nginx runs in the foreground. Used during development.

### debug_connection

| Item | Value |
|------|-------|
| **Syntax** | `debug_connection <address> \| <CIDR> \| unix:` |
| **Default** | — |
| **Context** | `events` |
| **Since** | 1.3.0 (IPv6 / UNIX) |

Enables debug logging for connections from specified addresses. Requires `--with-debug`.

```nginx
events {
    debug_connection 127.0.0.1;
    debug_connection localhost;
    debug_connection 192.0.2.0/24;
    debug_connection ::1;
    debug_connection 2001:0db8::/32;
    debug_connection unix:;
}
```

### debug_points

| Item | Value |
|------|-------|
| **Syntax** | `debug_points abort \| stop;` |
| **Default** | — |
| **Context** | `main` |

For debugging: on internal error, creates a core file (`abort`) or stops the process (`stop`).

### env

| Item | Value |
|------|-------|
| **Syntax** | `env <variable>[=<value>];` |
| **Default** | `env TZ;` |
| **Context** | `main` |

Preserves, modifies, or creates environment variables. By default, nginx removes all inherited variables except `TZ`.

```nginx
env MALLOC_OPTIONS;
env PERL5LIB=/data/site/modules;
env OPENSSL_ALLOW_PROXY_CERTS=1;
```

Variables are inherited during live upgrade, used by `ngx_http_perl_module`, and by worker processes. The `NGINX` environment variable is reserved for internal use.

### error_log

| Item | Value |
|------|-------|
| **Syntax** | `error_log <file> [<level>] [json];` |
| **Default** | `error_log logs/error.log error;` |
| **Context** | `main`, `http`, `mail`, `stream`, `server`, `location` |

Configures logging. Multiple logs per level (since 1.5.2). File values:

- A filesystem path
- `stderr` — standard error
- `syslog:` prefix — syslog logging
- `memory:<size>` prefix — cyclic memory buffer (debugging, 1.7.11+)

Log levels (increasing severity): `debug`, `info`, `notice`, `warn`, `error` (default), `crit`, `alert`, `emerg`.

```nginx
error_log /var/log/nginx/error.log warn;
error_log syslog:server=192.168.1.1 debug;
error_log memory:32m debug;
```

#### JSON Format (1.29.8+)

```nginx
error_log /var/log/nginx/error.log debug json;
```

Produces structured JSON log entries with fields like `level`, `timestamp`, `pid`, `tid`, `cnum`, `msg`, `client`, `server`, `request`, `upstream`, `errno`, `errtext`:

```json
{
  "level": "error",
  "timestamp": "2026-05-13T10:30:15.042+00:00",
  "pid": 12345,  "tid": 12345,  "cnum": 3,
  "msg": "connect() failed",
  "client": "192.168.1.10",  "server": "example.com",
  "request": "GET /api HTTP/1.1",
  "upstream": "http://127.0.0.1:8080/api",
  "errno": 111,
  "errtext": "Connection refused"
}
```

Log entries cannot exceed 2 KB. Debug logging not supported for JSON. Commercial subscription feature.

### events

| Item | Value |
|------|-------|
| **Syntax** | `events { ... }` |
| **Default** | — |
| **Context** | `main` |

Provides context for connection processing directives.

### include

| Item | Value |
|------|-------|
| **Syntax** | `include <file> \| <mask>;` |
| **Default** | — |
| **Context** | `any` |

Includes other files or matching files by mask.

```nginx
include mime.types;
include vhosts/*.conf;
```

### load_module

| Item | Value |
|------|-------|
| **Syntax** | `load_module <file>;` |
| **Default** | — |
| **Context** | `main` |
| **Since** | 1.9.11 |

Loads a dynamic module.

```nginx
load_module modules/ngx_mail_module.so;
```

### lock_file

| Item | Value |
|------|-------|
| **Syntax** | `lock_file <file>;` |
| **Default** | `lock_file logs/nginx.lock;` |
| **Context** | `main` |

Prefix for lock files used by `accept_mutex` and shared memory serialization. Ignored on systems using atomic operations (most modern platforms).

### master_process

| Item | Value |
|------|-------|
| **Syntax** | `master_process on \| off;` |
| **Default** | `master_process on;` |
| **Context** | `main` |

If `off`, worker processes are not started. Intended for nginx developers.

### multi_accept

| Item | Value |
|------|-------|
| **Syntax** | `multi_accept on \| off;` |
| **Default** | `multi_accept off;` |
| **Context** | `events` |

If `on`, a worker accepts all new connections at once. If `off`, one at a time. Ignored with `kqueue`.

### pcre_jit

| Item | Value |
|------|-------|
| **Syntax** | `pcre_jit on \| off;` |
| **Default** | `pcre_jit off;` |
| **Context** | `main` |
| **Since** | 1.1.12 |

Enables or disables PCRE JIT compilation for regular expressions known at parse time. PCRE must be 8.20+ with `--enable-jit` (or `--with-pcre-jit` if built with nginx).

### pid

| Item | Value |
|------|-------|
| **Syntax** | `pid <file>;` |
| **Default** | `pid logs/nginx.pid;` |
| **Context** | `main` |

File storing the master process ID.

### ssl_engine

| Item | Value |
|------|-------|
| **Syntax** | `ssl_engine <device>;` |
| **Default** | — |
| **Context** | `main` |

Name of the hardware SSL accelerator.

### ssl_object_cache_inheritable

| Item | Value |
|------|-------|
| **Syntax** | `ssl_object_cache_inheritable on \| off;` |
| **Default** | `ssl_object_cache_inheritable on;` |
| **Context** | `main` |
| **Since** | 1.27.4 |

If enabled, SSL certificates, secret keys, trusted CA certificates, and CRL lists are inherited across configuration reloads if their modification time and file index have not changed. Secret keys specified as `engine:name:id` are never inherited. Keys as `data:value` are always inherited. Variables-based SSL objects cannot be inherited.

```nginx
ssl_object_cache_inheritable on;

http {
    server {
        ssl_certificate     example.com.crt;
        ssl_certificate_key example.com.key;
    }
}
```

### stall_threshold

| Item | Value |
|------|-------|
| **Syntax** | `stall_threshold <time>;` |
| **Default** | `stall_threshold 1000ms;` |
| **Context** | `events` |
| **Since** | 1.29.0 |

Event loop iteration time threshold before a stall is reported. Ignored if `timer_resolution` is enabled. Commercial subscription.

### thread_pool

| Item | Value |
|------|-------|
| **Syntax** | `thread_pool <name> threads=<number> [max_queue=<number>];` |
| **Default** | `thread_pool default threads=32 max_queue=65536;` |
| **Context** | `main` |
| **Since** | 1.7.11 |

Defines a thread pool for multi-threaded file I/O (requires `--with-threads`).

```nginx
thread_pool default threads=32 max_queue=65536;
thread_pool images threads=8 max_queue=1024;
```

### timer_resolution

| Item | Value |
|------|-------|
| **Syntax** | `timer_resolution <interval>;` |
| **Default** | — |
| **Context** | `main` |

Reduces `gettimeofday()` system calls. By default, called on each kernel event. With this directive, called once per interval.

```nginx
timer_resolution 100ms;
```

Implementation:
- `kqueue`: `EVFILT_TIMER`
- `eventport`: `timer_create()`
- Others: `setitimer()`

### use

| Item | Value |
|------|-------|
| **Syntax** | `use <method>;` |
| **Default** | — |
| **Context** | `events` |

Explicitly selects the connection processing method: `select`, `poll`, `kqueue`, `epoll`, `/dev/poll`, `eventport`. Normally auto-selected.

### user

| Item | Value |
|------|-------|
| **Syntax** | `user <user> [<group>];` |
| **Default** | `user nobody nobody;` |
| **Context** | `main` |

Defines credentials for worker processes.

```nginx
user www www;
```

### worker_aio_requests

| Item | Value |
|------|-------|
| **Syntax** | `worker_aio_requests <number>;` |
| **Default** | `worker_aio_requests 32;` |
| **Context** | `events` |
| **Since** | 1.1.4 / 1.0.7 |

Maximum number of outstanding asynchronous I/O operations per worker when using AIO with epoll.

### worker_connections

| Item | Value |
|------|-------|
| **Syntax** | `worker_connections <number>;` |
| **Default** | `worker_connections 512;` |
| **Context** | `events` |

Maximum simultaneous connections per worker process (includes all connections: clients + upstream servers). Also limited by `worker_rlimit_nofile`.

### worker_cpu_affinity

| Item | Value |
|------|-------|
| **Syntax** | `worker_cpu_affinity <cpumask> ...;` <br> `worker_cpu_affinity auto [<cpumask>];` |
| **Default** | — |
| **Context** | `main` |

Binds workers to CPU sets using bitmasks.

```nginx
# 4 workers, each on separate CPU
worker_processes    4;
worker_cpu_affinity 0001 0010 0100 1000;

# 2 workers on hyper-threaded CPUs
worker_processes    2;
worker_cpu_affinity 0101 1010;

# Auto-bind
worker_processes auto;
worker_cpu_affinity auto;

# Auto-bind with mask
worker_cpu_affinity auto 01010101;
```

Only available on FreeBSD and Linux.

### worker_priority

| Item | Value |
|------|-------|
| **Syntax** | `worker_priority <number>;` |
| **Default** | `worker_priority 0;` |
| **Context** | `main` |

Scheduling priority (like `nice`). Negative = higher priority. Range typically -20 to 20.

```nginx
worker_priority -10;
```

### worker_processes

| Item | Value |
|------|-------|
| **Syntax** | `worker_processes <number> \| auto;` |
| **Default** | `worker_processes 1;` |
| **Context** | `main` |

Number of worker processes. `auto` autodetects CPU cores (since 1.3.8 / 1.2.5).

### worker_rlimit_core

| Item | Value |
|------|-------|
| **Syntax** | `worker_rlimit_core <size>;` |
| **Default** | — |
| **Context** | `main` |

Changes RLIMIT_CORE for worker processes without restarting master.

### worker_rlimit_nofile

| Item | Value |
|------|-------|
| **Syntax** | `worker_rlimit_nofile <number>;` |
| **Default** | — |
| **Context** | `main` |

Changes RLIMIT_NOFILE for worker processes without restarting master.

### worker_shutdown_timeout

| Item | Value |
|------|-------|
| **Syntax** | `worker_shutdown_timeout <time>;` |
| **Default** | — |
| **Context** | `main` |
| **Since** | 1.11.11 |

Timeout for graceful worker shutdown. When time expires, nginx closes all open connections to facilitate shutdown.

### working_directory

| Item | Value |
|------|-------|
| **Syntax** | `working_directory <directory>;` |
| **Default** | — |
| **Context** | `main` |

Current working directory for worker processes, primarily for core file writing.

## Events Block Directives

Complete list of directives valid inside the `events { }` block:

| Directive | Syntax | Default | Description |
|-----------|--------|---------|-------------|
| `accept_mutex` | `on \| off` | `off` | Serialize new connection acceptance |
| `accept_mutex_delay` | `<time>` | `500ms` | Retry delay for accept mutex |
| `debug_connection` | `<addr> \| <CIDR> \| unix:` | — | Debug log for selected clients |
| `multi_accept` | `on \| off` | `off` | Accept all connections at once |
| `stall_threshold` | `<time>` | `1000ms` | Event loop stall threshold (commercial) |
| `use` | `<method>` | auto | Connection processing method |
| `worker_aio_requests` | `<number>` | `32` | Max AIO operations per worker |
| `worker_connections` | `<number>` | `512` | Max connections per worker |

## Thread Pools Configuration

### thread_pool Directive

| Item | Value |
|------|-------|
| **Syntax** | `thread_pool <name> threads=<number> [max_queue=<number>];` |
| **Default** | `thread_pool default threads=32 max_queue=65536;` |
| **Context** | `main` |

```nginx
thread_pool default threads=32 max_queue=65536;
thread_pool smallpool threads=8 max_queue=1024;
```

Parameters:
- `threads`: Number of threads in the pool.
- `max_queue`: Maximum wait queue size. Overflow causes error.

Thread pools enable multi-threaded file reading/sending without blocking worker processes. Requires `--with-threads` at build time.

## Performance Tuning

### Recommended Baseline

```nginx
# Number of CPU cores — use auto for autodetection
worker_processes auto;

# Worker priority — slightly higher than default
worker_priority -5;

# Open file limit — must match system ulimit -n
worker_rlimit_nofile 65536;

events {
    # Max connections per worker
    worker_connections 4096;

    # Use epoll on Linux, kqueue on BSD/macOS
    use epoll;

    # Accept all new connections at once
    multi_accept on;

    # No need for accept_mutex with EPOLLEXCLUSIVE or reuseport
    accept_mutex off;
}

http {
    # Hash table tuning
    server_names_hash_max_size 1024;
    server_names_hash_bucket_size 64;
}
```

### Key Performance Formulas

```
Max concurrent connections ≈ worker_processes × worker_connections
Max open files needed       ≈ worker_connections + (worker_connections / 4)
```

For example, with `worker_processes auto` (e.g., 4 cores) and `worker_connections 4096`:
- Max connections ≈ 4 × 4096 = 16,384
- Set `worker_rlimit_nofile` to at least 8192 per worker

### Timer Resolution

```nginx
timer_resolution 100ms;  # reduces gettimeofday() calls
```

### PCRE JIT

```nginx
pcre_jit on;  # speeds up regex matching
```

## Variable Index

All built-in variables across HTTP and stream modules. Variables are evaluated at runtime per-request (or per-session for stream).

### HTTP Core Variables

| Variable | Since | Description |
|----------|-------|-------------|
| `$args` | | Full query string |
| `$arg_<name>` | | Specific query string parameter value |
| `$binary_remote_addr` | | Client address as binary (4 bytes IPv4, 16 bytes IPv6) |
| `$body_bytes_sent` | | Bytes sent to client, excluding response headers |
| `$bytes_sent` | | Bytes sent to client (includes headers) |
| `$connection` | | Serial connection number |
| `$connection_requests` | | Number of requests made through a connection |
| `$connection_time` | | Connection time in seconds with milliseconds |
| `$content_length` | | Content-Length request header |
| `$content_type` | | Content-Type request header |
| `$cookie_<name>` | | Named cookie value |
| `$document_root` | | Value of root/alias directive for current request |
| `$document_uri` | | Current normalized URI (decoded) |
| `$host` | | Host header value, or server name if absent |
| `$hostname` | | Machine hostname |
| `$http_<name>` | | Arbitrary request header field (lowercase, hyphens → underscores) |
| `$https` | | "on" if in SSL mode, empty otherwise |
| `$is_args` | | "?" if request has args, "" otherwise |
| `$limit_rate` | | Rate limit for response |
| `$msec` | | Current Unix time in seconds with milliseconds |
| `$nginx_version` | | nginx version string |
| `$pid` | | Worker process PID |
| `$pipe` | | "p" if pipelined, "." otherwise |
| `$proxy_protocol_addr` | | Client address from PROXY protocol header |
| `$proxy_protocol_port` | | Client port from PROXY protocol header |
| `$proxy_protocol_server_addr` | | Server address from PROXY protocol header |
| `$proxy_protocol_server_port` | | Server port from PROXY protocol header |
| `$query_string` | | Same as $args |
| `$realpath_root` | | Real path of document root (symlinks resolved) |
| `$remote_addr` | | Client IP address |
| `$remote_port` | | Client port |
| `$remote_user` | | Basic auth username |
| `$request` | | Full request line |
| `$request_body` | | Request body |
| `$request_body_file` | | Name of temp file with request body |
| `$request_completion` | | "OK" if request is complete, "" otherwise |
| `$request_filename` | | File path for current request (root + URI) |
| `$request_id` | 1.11.0 | Unique 16-byte random request ID in hex |
| `$request_length` | | Request length in bytes |
| `$request_method` | | HTTP method (GET, POST, HEAD, etc.) |
| `$request_time` | | Request processing time in seconds with milliseconds |
| `$request_uri` | | Full original URI (encoded, with arguments) |
| `$scheme` | | Request scheme ("http" or "https") |
| `$sent_http_<name>` | | Arbitrary response header field |
| `$sent_trailer_<name>` | 1.13.2 | Arbitrary response trailer field |
| `$server_addr` | | Server IP address |
| `$server_name` | | Server name for current request |
| `$server_port` | | Server port |
| `$server_protocol` | | HTTP protocol version |
| `$status` | | Response status code |
| `$tcpinfo_rtt` | | TCP RTT info (Linux only) |
| `$tcpinfo_rttvar` | | TCP RTT variance (Linux only) |
| `$tcpinfo_snd_cwnd` | | TCP send congestion window (Linux only) |
| `$tcpinfo_rcv_space` | | TCP receive space (Linux only) |
| `$time_iso8601` | | Local time in ISO 8601 format |
| `$time_local` | | Local time in Common Log Format |
| `$uid_got` | | Cookie and client identifier (if any) |
| `$uid_set` | | Response cookie identifier |
| `$upstream_addr` | | Upstream server IP:port |
| `$upstream_bytes_received` | | Bytes received from upstream |
| `$upstream_bytes_sent` | | Bytes sent to upstream |
| `$upstream_cache_status` | | Cache status (HIT/MISS/...) |
| `$upstream_connect_time` | | Upstream connection time |
| `$upstream_cookie_<name>` | | Cookie from upstream Set-Cookie |
| `$upstream_first_byte_time` | | Time to first byte from upstream |
| `$upstream_header_time` | | Time to receive upstream headers |
| `$upstream_http_<name>` | | Upstream response header |
| `$upstream_queue_time` | | Time in upstream queue |
| `$upstream_response_length` | | Upstream response length |
| `$upstream_response_time` | | Upstream response time |
| `$upstream_status` | | Upstream HTTP status |
| `$upstream_trailer_<name>` | | Upstream response trailer |
| `$uri` | | Current normalized URI |

### Stream Core Variables

| Variable | Since | Description |
|----------|-------|-------------|
| `$binary_remote_addr` | | Client address as binary |
| `$bytes_received` | | Bytes received from client |
| `$bytes_sent` | | Bytes sent to client |
| `$connection` | | Serial connection number |
| `$hostname` | | Machine hostname |
| `$msec` | | Current Unix time in seconds with milliseconds |
| `$nginx_version` | | nginx version |
| `$pid` | | Worker process PID |
| `$protocol` | | Protocol of accepted connection (TCP/UDP) |
| `$proxy_protocol_addr` | | PROXY protocol client address |
| `$proxy_protocol_port` | | PROXY protocol client port |
| `$proxy_protocol_server_addr` | | PROXY protocol server address |
| `$proxy_protocol_server_port` | | PROXY protocol server port |
| `$remote_addr` | | Client address |
| `$remote_port` | | Client port |
| `$server_addr` | | Server address |
| `$server_port` | | Server port |
| `$session_time` | | Session duration in seconds |
| `$status` | | Session status code |
| `$time_iso8601` | | Local time in ISO 8601 |
| `$time_local` | | Local time in CLF |

### Stub Status Module Variables

| Variable | Description |
|----------|-------------|
| `$connections_active` | Number of active connections |
| `$connections_reading` | Number of reading connections |
| `$connections_waiting` | Number of waiting connections |
| `$connections_writing` | Number of writing connections |

### Map Module Variables

Variables created with the `map` directive:

```nginx
map $http_host $backend {
    default     web1.example.com;
    example.com web2.example.com;
}
```

### Split Clients Module Variables

```nginx
split_clients $remote_addr $variant {
    50%     version_a;
    50%     version_b;
}
```

## Directive Index

The following list covers directives from `ngx_core_module` (the `events` and `main` context directives). HTTP/stream/mail module directives are documented in their respective module files.

### Main Context Directives

| Directive | Syntax | Default | Description |
|-----------|--------|---------|-------------|
| `daemon` | `on \| off` | `on` | Run as daemon or foreground |
| `debug_points` | `abort \| stop` | — | Debugging: core file or process stop |
| `env` | `<var>[=<val>]` | `env TZ` | Preserve/set environment variables |
| `error_log` | `<file> [level] [json]` | `logs/error.log error` | Error log configuration |
| `events` | `{ ... }` | — | Connection processing context |
| `include` | `<file> \| <mask>` | — | Include config files |
| `load_module` | `<file>` | — | Load dynamic module (1.9.11) |
| `lock_file` | `<file>` | `logs/nginx.lock` | Lock file prefix |
| `master_process` | `on \| off` | `on` | Start worker processes |
| `pcre_jit` | `on \| off` | `off` | Enable PCRE JIT (1.1.12) |
| `pid` | `<file>` | `logs/nginx.pid` | Master process ID file |
| `ssl_engine` | `<device>` | — | Hardware SSL accelerator |
| `ssl_object_cache_inheritable` | `on \| off` | `on` | Inherit SSL objects across reloads (1.27.4) |
| `thread_pool` | `<name> threads=N [max_queue=N]` | `default threads=32 max_queue=65536` | Thread pool (1.7.11) |
| `timer_resolution` | `<interval>` | — | Reduce gettimeofday() calls |
| `user` | `<user> [<group>]` | `nobody nobody` | Worker process credentials |
| `worker_cpu_affinity` | `<cpumask> ... \| auto [mask]` | — | Bind workers to CPUs |
| `worker_priority` | `<number>` | `0` | Worker process nice priority |
| `worker_processes` | `<number> \| auto` | `1` | Number of worker processes |
| `worker_rlimit_core` | `<size>` | — | Core file size limit (RLIMIT_CORE) |
| `worker_rlimit_nofile` | `<number>` | — | Open file limit (RLIMIT_NOFILE) |
| `worker_shutdown_timeout` | `<time>` | — | Graceful shutdown timeout (1.11.11) |
| `working_directory` | `<dir>` | — | CWD for core files |

### Events Context Directives

| Directive | Syntax | Default | Since |
|-----------|--------|---------|-------|
| `accept_mutex` | `on \| off` | `off` | |
| `accept_mutex_delay` | `<time>` | `500ms` | |
| `debug_connection` | `<addr> \| <CIDR> \| unix:` | — | 1.3.0 |
| `multi_accept` | `on \| off` | `off` | |
| `stall_threshold` | `<time>` | `1000ms` | 1.29.0 (commercial) |
| `use` | `<method>` | auto | |
| `worker_aio_requests` | `<number>` | `32` | 1.1.4 / 1.0.7 |
| `worker_connections` | `<number>` | `512` | |

---

## Configuration File Example (Complete)

```nginx
# Main context — global settings
user www www;
worker_processes auto;
worker_rlimit_nofile 65536;
worker_cpu_affinity auto;
worker_priority -5;

error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

pcre_jit on;
timer_resolution 100ms;

thread_pool default threads=32 max_queue=65536;
thread_pool images threads=8 max_queue=1024;

events {
    use epoll;
    worker_connections 4096;
    multi_accept on;
    accept_mutex off;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    server_names_hash_max_size 1024;
    server_names_hash_bucket_size 64;

    # Logging
    access_log /var/log/nginx/access.log combined;
    error_log  /var/log/nginx/error.log warn;

    # Performance
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout 65;

    # Load virtual hosts
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;

    # Default server
    server {
        listen 80 default_server;
        server_name _;
        root /var/www/html;

        location / {
            index index.html;
        }
    }
}

stream {
    # TCP/UDP proxying
    server {
        listen 12345;
        proxy_pass backend_stream;
    }

    upstream backend_stream {
        server 10.0.0.1:9000;
        server 10.0.0.2:9000;
    }
}
```
