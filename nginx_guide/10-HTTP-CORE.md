# NGINX HTTP Core Module (ngx_http_core_module)

## Overview

The `ngx_http_core_module` is the foundational HTTP module providing the core request processing framework, virtual server handling, location matching, URI processing, variable system, and client connection management.

---

## Request Processing

### Phase Order

1. **Post-read** – read request headers
2. **Server rewrite** – evaluate server-level `rewrite` directives
3. **Find config** – match location
4. **Location rewrite** – evaluate location-level `rewrite` directives
5. **Access control** – satisfy all/any access modules
6. **Pre-content** – `try_files`, `mirror`
7. **Content** – generate response (`proxy_pass`, `fastcgi_pass`, static files, etc.)
8. **Log** – write access log

### Virtual Server Selection

1. Nginx first matches the IP address and port from `listen` directives to determine which `server` blocks apply.
2. If multiple server blocks match the same `address:port`, the `Host` header is tested against `server_name`.
3. If no match, the `default_server` for that address:port handles the request.
4. The `Host` header is checked at the following stages:
   - During SSL handshake via SNI
   - After parsing the request line
   - After processing the `Host` header field
   - Falls back to empty name if not determined

### Location Matching Priority

1. **Exact match** (`= /path`) – highest priority, terminates immediately
2. **Prefix match with `^~`** – longest prefix match, skips regex checks
3. **Regular expression** (`~` case-sensitive, `~*` case-insensitive) – first match in file order wins
4. **Prefix match** (no modifier) – longest match used as fallback
5. **Named location** (`@name`) – internal redirection only

---

## Directives

### `absolute_redirect`

| Field | Value |
|-------|-------|
| Syntax | `absolute_redirect on \| off;` |
| Default | `absolute_redirect on;` |
| Context | http, server, location |

If disabled, redirects issued by nginx will be relative.

---

### `aio`

| Field | Value |
|-------|-------|
| Syntax | `aio on \| off \| threads[=pool];` |
| Default | `aio off;` |
| Context | http, server, location |

Enables asynchronous file I/O on FreeBSD and Linux. Use `threads` for multi-threaded read/send. Requires `--with-threads`.

---

### `aio_write`

| Field | Value |
|-------|-------|
| Syntax | `aio_write on \| off;` |
| Default | `aio_write off;` |
| Context | http, server, location |

If `aio` is enabled, specifies whether it is used for writing files (only with `aio threads`).

---

### `alias`

| Field | Value |
|-------|-------|
| Syntax | `alias path;` |
| Default | — |
| Context | location |

Defines a replacement for the location path. The path value can contain variables (except `$document_root` and `$realpath_root`). When used inside regex locations, the regex must contain captures.

```nginx
location /i/ {
    alias /data/w3/images/;
}
# /i/top.gif -> /data/w3/images/top.gif
```

---

### `auth_delay`

| Field | Value |
|-------|-------|
| Syntax | `auth_delay time;` |
| Default | `auth_delay 0s;` |
| Context | http, server, location |

Delays processing of unauthorized 401 responses to prevent timing attacks.

---

### `chunked_transfer_encoding`

| Field | Value |
|-------|-------|
| Syntax | `chunked_transfer_encoding on \| off;` |
| Default | `chunked_transfer_encoding on;` |
| Context | http, server, location |

Allows disabling chunked transfer encoding in HTTP/1.1.

---

### `client_body_buffer_size`

| Field | Value |
|-------|-------|
| Syntax | `client_body_buffer_size size;` |
| Default | `client_body_buffer_size 8k\|16k;` |
| Context | http, server, location |

Sets buffer size for reading client request body. If body exceeds buffer, it is written to a temporary file. Default is two memory pages (8K on x86/x86-64, 16K on other 64-bit).

---

### `client_body_in_file_only`

| Field | Value |
|-------|-------|
| Syntax | `client_body_in_file_only on \| clean \| off;` |
| Default | `client_body_in_file_only off;` |
| Context | http, server, location |

Saves entire client request body to a file. `on` leaves files after processing; `clean` removes them.

---

### `client_body_in_single_buffer`

| Field | Value |
|-------|-------|
| Syntax | `client_body_in_single_buffer on \| off;` |
| Default | `client_body_in_single_buffer off;` |
| Context | http, server, location |

Saves entire client request body in a single buffer. Recommended when using `$request_body`.

---

### `client_body_temp_path`

| Field | Value |
|-------|-------|
| Syntax | `client_body_temp_path path [level1 [level2 [level3]]];` |
| Default | `client_body_temp_path client_body_temp;` |
| Context | http, server, location |

Defines directory for temporary files holding client request bodies. Supports up to 3-level subdirectory hierarchy.

---

### `client_body_timeout`

| Field | Value |
|-------|-------|
| Syntax | `client_body_timeout time;` |
| Default | `client_body_timeout 60s;` |
| Context | http, server, location |

Timeout for reading client request body between successive read operations. Returns 408 on timeout.

---

### `client_header_buffer_size`

| Field | Value |
|-------|-------|
| Syntax | `client_header_buffer_size size;` |
| Default | `client_header_buffer_size 1k;` |
| Context | http, server |

Buffer size for reading client request header. Falls back to `large_client_header_buffers` if too small.

---

### `client_header_timeout`

| Field | Value |
|-------|-------|
| Syntax | `client_header_timeout time;` |
| Default | `client_header_timeout 60s;` |
| Context | http, server |

Timeout for reading client request header. Returns 408 on timeout.

---

### `client_max_body_size`

| Field | Value |
|-------|-------|
| Syntax | `client_max_body_size size;` |
| Default | `client_max_body_size 1m;` |
| Context | http, server, location |

Maximum allowed size of client request body. Returns 413 if exceeded. Set to 0 to disable.

---

### `connection_pool_size`

| Field | Value |
|-------|-------|
| Syntax | `connection_pool_size size;` |
| Default | `connection_pool_size 256\|512;` |
| Context | http, server |

Per-connection memory allocation tuning. Minimal performance impact.

---

### `default_type`

| Field | Value |
|-------|-------|
| Syntax | `default_type mime-type;` |
| Default | `default_type text/plain;` |
| Context | http, server, location |

Default MIME type for responses when no type mapping matches.

---

### `directio`

| Field | Value |
|-------|-------|
| Syntax | `directio size \| off;` |
| Default | `directio off;` |
| Context | http, server, location |

Enables `O_DIRECT` flag (FreeBSD, Linux), `F_NOCACHE` (macOS), or `directio()` (Solaris) for files >= size. Automatically disables `sendfile` for the request.

---

### `directio_alignment`

| Field | Value |
|-------|-------|
| Syntax | `directio_alignment size;` |
| Default | `directio_alignment 512;` |
| Context | http, server, location |

Sets alignment for `directio`. Increase to 4K for XFS under Linux.

---

### `disable_symlinks`

| Field | Value |
|-------|-------|
| Syntax | `disable_symlinks off;` / `disable_symlinks on \| if_not_owner [from=part];` |
| Default | `disable_symlinks off;` |
| Context | http, server, location |

Controls symbolic link handling. `on` denies access if any component is a symlink. `if_not_owner` denies if link owner differs from target owner. `from=part` skips checking for the initial path component.

---

### `error_log_tag`

| Field | Value |
|-------|-------|
| Syntax | `error_log_tag name value;` |
| Default | — |
| Context | http, server, location |

Defines additional context tag for error log messages. Commercial subscription feature.

---

### `error_page`

| Field | Value |
|-------|-------|
| Syntax | `error_page code ... [=[response]] uri;` |
| Default | — |
| Context | http, server, location, if in location |

Defines URI shown for specified errors. Supports internal redirects, response code changes (`=200`), named locations (`@fallback`), and external redirects.

```nginx
error_page 404             /404.html;
error_page 500 502 503 504 /50x.html;
error_page 404 =200        /empty.gif;
error_page 404 =           /404.php;
error_page 404 = @fallback;
error_page 403             http://example.com/forbidden.html;
```

---

### `etag`

| Field | Value |
|-------|-------|
| Syntax | `etag on \| off;` |
| Default | `etag on;` |
| Context | http, server, location |

Enables/disables automatic ETag header generation for static resources.

---

### `http`

| Field | Value |
|-------|-------|
| Syntax | `http { ... }` |
| Default | — |
| Context | main |

Configuration file context for HTTP server directives.

---

### `if_modified_since`

| Field | Value |
|-------|-------|
| Syntax | `if_modified_since off \| exact \| before;` |
| Default | `if_modified_since exact;` |
| Context | http, server, location |

How to compare modification time with If-Modified-Since header. `off` = always modified; `exact` = exact match; `before` = response time <= header time.

---

### `ignore_invalid_headers`

| Field | Value |
|-------|-------|
| Syntax | `ignore_invalid_headers on \| off;` |
| Default | `ignore_invalid_headers on;` |
| Context | http, server |

Controls whether headers with invalid names are ignored. Valid names: English letters, digits, hyphens, underscores (per `underscores_in_headers`).

---

### `internal`

| Field | Value |
|-------|-------|
| Syntax | `internal;` |
| Default | — |
| Context | location |

Restricts location to internal requests only. External requests return 404.

Internal requests include:
- `error_page`, `index`, `internal_redirect`, `random_index`, `try_files` redirects
- X-Accel-Redirect from upstream
- Subrequests (SSI, addition, auth_request, mirror)
- Rewrite directives

Max 10 internal redirects per request.

---

### `keepalive_disable`

| Field | Value |
|-------|-------|
| Syntax | `keepalive_disable none \| browser ...;` |
| Default | `keepalive_disable msie6;` |
| Context | http, server, location |

Disables keep-alive for misbehaving browsers. `msie6` = MSIE after POST; `safari` = Safari on macOS; `none` = enable for all.

---

### `keepalive_min_timeout`

| Field | Value |
|-------|-------|
| Syntax | `keepalive_min_timeout timeout;` |
| Default | `keepalive_min_timeout 0;` |
| Context | http, server, location |

Timeout during which a keep-alive connection will not be closed for reuse or graceful shutdown.

---

### `keepalive_requests`

| Field | Value |
|-------|-------|
| Syntax | `keepalive_requests number;` |
| Default | `keepalive_requests 1000;` |
| Context | http, server, location |

Max requests per keep-alive connection. Was 100 before 1.19.10.

---

### `keepalive_time`

| Field | Value |
|-------|-------|
| Syntax | `keepalive_time time;` |
| Default | `keepalive_time 1h;` |
| Context | http, server, location |

Max time requests can be processed through one keep-alive connection.

---

### `keepalive_timeout`

| Field | Value |
|-------|-------|
| Syntax | `keepalive_timeout timeout [header_timeout];` |
| Default | `keepalive_timeout 75s;` |
| Context | http, server, location |

First parameter: server-side keep-alive timeout. Second parameter: value in `Keep-Alive: timeout=` response header. Zero disables keep-alive.

---

### `large_client_header_buffers`

| Field | Value |
|-------|-------|
| Syntax | `large_client_header_buffers number size;` |
| Default | `large_client_header_buffers 4 8k;` |
| Context | http, server |

Max number and size of buffers for reading large client request headers. Request line cannot exceed one buffer (returns 414). A header field cannot exceed one buffer (returns 400).

---

### `limit_except`

| Field | Value |
|-------|-------|
| Syntax | `limit_except method ... { ... }` |
| Default | — |
| Context | location |

Limits allowed HTTP methods inside a location. Allowing GET also allows HEAD.

```nginx
limit_except GET {
    allow 192.168.1.0/32;
    deny  all;
}
```

---

### `limit_rate`

| Field | Value |
|-------|-------|
| Syntax | `limit_rate rate;` |
| Default | `limit_rate 0;` |
| Context | http, server, location, if in location |

Limits response transmission rate in bytes/second. Zero = unlimited. Can use variables (1.17.0+).

---

### `limit_rate_after`

| Field | Value |
|-------|-------|
| Syntax | `limit_rate_after size;` |
| Default | `limit_rate_after 0;` |
| Context | http, server, location, if in location |

Initial amount after which rate limiting starts. Can use variables (1.17.0+).

---

### `lingering_close`

| Field | Value |
|-------|-------|
| Syntax | `lingering_close off \| on \| always;` |
| Default | `lingering_close on;` |
| Context | http, server, location |

Controls how nginx closes connections. `on` = wait/process additional data if heuristic suggests more data; `always` = unconditionally wait; `off` = close immediately (breaks protocol).

---

### `lingering_time`

| Field | Value |
|-------|-------|
| Syntax | `lingering_time time;` |
| Default | `lingering_time 30s;` |
| Context | http, server, location |

Max time for processing (reading and ignoring) additional data during lingering close.

---

### `lingering_timeout`

| Field | Value |
|-------|-------|
| Syntax | `lingering_timeout time;` |
| Default | `lingering_timeout 5s;` |
| Context | http, server, location |

Max waiting time for more client data during lingering close.

---

### `listen`

| Field | Value |
|-------|-------|
| Syntax | `listen address[:port] [default_server] [ssl] [http2\|quic] [proxy_protocol] [setfib=number] [fastopen=number] [backlog=number] [rcvbuf=size] [sndbuf=size] [accept_filter=filter] [deferred] [bind] [ipv6only=on\|off] [reuseport] [multipath] [so_keepalive=on\|off\|keepidle:keepintvl:keepcnt];` |
| Default | `listen *:80 \| *:8000;` |
| Context | server |

Sets the address and port (or UNIX-domain socket path) for accepting requests.

**Parameters:**
- `default_server` – makes this the default server for the address:port
- `ssl` – SSL mode on this port
- `http2` – accepts HTTP/2 connections (deprecated, use `http2` directive)
- `quic` – accepts QUIC connections (HTTP/3)
- `proxy_protocol` – expects PROXY protocol v1/v2
- `setfib=number` – sets FIB routing table (FreeBSD)
- `fastopen=number` – TCP Fast Open queue length
- `backlog=number` – listen() backlog (default: -1 on FreeBSD/DragonFly/macOS, 511 elsewhere)
- `rcvbuf=size` – SO_RCVBUF
- `sndbuf=size` – SO_SNDBUF
- `accept_filter=filter` – SO_ACCEPTFILTER (FreeBSD/NetBSD): dataready, httpready
- `deferred` – TCP_DEFER_ACCEPT (Linux)
- `bind` – separate bind() call per address:port
- `ipv6only=on\|off` – IPV6_V6ONLY (default on)
- `reuseport` – SO_REUSEPORT/SO_REUSEPORT_LB (Linux 3.9+, DragonFly, FreeBSD 12+)
- `multipath` – Multipath TCP (Linux 5.6+)
- `so_keepalive=on\|off\|keepidle:keepintvl:keepcnt` – TCP keepalive

```nginx
listen 127.0.0.1:8000;
listen 127.0.0.1;
listen 8000;
listen *:8000;
listen localhost:8000;
listen [::]:8000;
listen [::1];
listen unix:/var/run/nginx.sock;
listen 127.0.0.1 default_server accept_filter=dataready backlog=1024;
```

---

### `location`

| Field | Value |
|-------|-------|
| Syntax | `location [=\|~\|~*\|^~] uri { ... }` / `location @name { ... }` |
| Default | — |
| Context | server, location |

Sets configuration based on request URI. URI is normalized (decoded %XX, resolved `.` and `..`, merged slashes).

**Modifiers:**
- `=` – exact match, terminates search
- `^~ – prefix match, skips regex if matched
- `~` – case-sensitive regex
- `~*` – case-insensitive regex
- `@name` – named location, internal only

**Trailing slash handling:** If a prefix location ends with `/` and is used with `proxy_pass`/`fastcgi_pass` etc., a request without trailing slash gets a 301 redirect with the slash appended.

```nginx
location = / { ... }              # exact match
location / { ... }                 # prefix match
location /documents/ { ... }       # longer prefix
location ^~ /images/ { ... }       # prefix, skip regex
location ~* \.(gif|jpg)$ { ... }   # case-insensitive regex
location @fallback { ... }         # named
```

---

### `log_not_found`

| Field | Value |
|-------|-------|
| Syntax | `log_not_found on \| off;` |
| Default | `log_not_found on;` |
| Context | http, server, location |

Enables/disables logging of "file not found" errors.

---

### `log_subrequest`

| Field | Value |
|-------|-------|
| Syntax | `log_subrequest on \| off;` |
| Default | `log_subrequest off;` |
| Context | http, server, location |

Enables/disables logging of subrequests in access_log.

---

### `max_headers`

| Field | Value |
|-------|-------|
| Syntax | `max_headers number;` |
| Default | `max_headers 1000;` |
| Context | http, server |

Max allowed number of header lines in requests. Returns 400 if exceeded.

---

### `max_ranges`

| Field | Value |
|-------|-------|
| Syntax | `max_ranges number;` |
| Default | — (unlimited) |
| Context | http, server, location |

Limits max number of ranges in byte-range requests. Zero = disable byte-range support.

---

### `merge_slashes`

| Field | Value |
|-------|-------|
| Syntax | `merge_slashes on \| off;` |
| Default | `merge_slashes on;` |
| Context | http, server |

Compresses two or more adjacent slashes in URI into one. Turn off if URI contains base64 with `/`.

---

### `msie_padding`

| Field | Value |
|-------|-------|
| Syntax | `msie_padding on \| off;` |
| Default | `msie_padding on;` |
| Context | http, server, location |

Adds comments to responses for MSIE clients with status > 400 to pad to 512 bytes.

---

### `msie_refresh`

| Field | Value |
|-------|-------|
| Syntax | `msie_refresh on \| off;` |
| Default | `msie_refresh off;` |
| Context | http, server, location |

Issues refreshes instead of redirects for MSIE clients.

---

### `open_file_cache`

| Field | Value |
|-------|-------|
| Syntax | `open_file_cache off;` / `open_file_cache max=N [inactive=time];` |
| Default | `open_file_cache off;` |
| Context | http, server, location |

Caches open file descriptors, sizes, modification times, directory existence, and file lookup errors.

```nginx
open_file_cache max=1000 inactive=20s;
open_file_cache_valid    30s;
open_file_cache_min_uses 2;
open_file_cache_errors   on;
```

---

### `open_file_cache_errors`

| Field | Value |
|-------|-------|
| Syntax | `open_file_cache_errors on \| off;` |
| Default | `open_file_cache_errors off;` |
| Context | http, server, location |

Enables caching of file lookup errors.

---

### `open_file_cache_min_uses`

| Field | Value |
|-------|-------|
| Syntax | `open_file_cache_min_uses number;` |
| Default | `open_file_cache_min_uses 1;` |
| Context | http, server, location |

Min file accesses during `inactive` period to keep descriptor open in cache.

---

### `open_file_cache_valid`

| Field | Value |
|-------|-------|
| Syntax | `open_file_cache_valid time;` |
| Default | `open_file_cache_valid 60s;` |
| Context | http, server, location |

Time after which cache elements are validated.

---

### `output_buffers`

| Field | Value |
|-------|-------|
| Syntax | `output_buffers number size;` |
| Default | `output_buffers 2 32k;` |
| Context | http, server, location |

Number and size of buffers for reading response from disk.

---

### `port_in_redirect`

| Field | Value |
|-------|-------|
| Syntax | `port_in_redirect on \| off;` |
| Default | `port_in_redirect on;` |
| Context | http, server, location |

Enables/disables port in absolute redirects.

---

### `postpone_output`

| Field | Value |
|-------|-------|
| Syntax | `postpone_output size;` |
| Default | `postpone_output 1460;` |
| Context | http, server, location |

Postpones data transmission until at least `size` bytes are ready. Zero = disable.

---

### `read_ahead`

| Field | Value |
|-------|-------|
| Syntax | `read_ahead size;` |
| Default | `read_ahead 0;` |
| Context | http, server, location |

Sets kernel pre-reading amount. Linux uses `posix_fadvise` (size ignored). FreeBSD uses `fcntl(O_READAHEAD)`.

---

### `recursive_error_pages`

| Field | Value |
|-------|-------|
| Syntax | `recursive_error_pages on \| off;` |
| Default | `recursive_error_pages off;` |
| Context | http, server, location |

Enables multiple redirects using `error_page`. Limited to 10 internal redirects.

---

### `request_pool_size`

| Field | Value |
|-------|-------|
| Syntax | `request_pool_size size;` |
| Default | `request_pool_size 4k;` |
| Context | http, server |

Per-request memory allocation tuning. Minimal performance impact.

---

### `reset_timedout_connection`

| Field | Value |
|-------|-------|
| Syntax | `reset_timedout_connection on \| off;` |
| Default | `reset_timedout_connection off;` |
| Context | http, server, location |

Resets timed out connections with TCP RST. Sets SO_LINGER with 0 timeout. Also works with non-standard 444 code.

---

### `resolver`

| Field | Value |
|-------|-------|
| Syntax | `resolver address ... [valid=time] [ipv4=on\|off] [ipv6=on\|off] [status_zone=zone];` |
| Default | — |
| Context | http, server, location |

Configures DNS name servers for resolving upstream server names.

```nginx
resolver 127.0.0.1 [::1]:5353;
resolver 127.0.0.1 valid=30s;
resolver 127.0.0.1 ipv6=off;
```

---

### `resolver_timeout`

| Field | Value |
|-------|-------|
| Syntax | `resolver_timeout time;` |
| Default | `resolver_timeout 30s;` |
| Context | http, server, location |

Timeout for DNS name resolution.

```nginx
resolver_timeout 5s;
```

---

### `root`

| Field | Value |
|-------|-------|
| Syntax | `root path;` |
| Default | `root html;` |
| Context | http, server, location, if in location |

Sets root directory for requests. Path is URI appended to root value. Can contain variables (except `$document_root` and `$realpath_root`).

```nginx
location /i/ {
    root /data/w3;
}
# /i/top.gif -> /data/w3/i/top.gif
```

---

### `satisfy`

| Field | Value |
|-------|-------|
| Syntax | `satisfy all \| any;` |
| Default | `satisfy all;` |
| Context | http, server, location |

Allows access if all (`all`) or at least one (`any`) of the access/auth modules allow.

---

### `send_lowat`

| Field | Value |
|-------|-------|
| Syntax | `send_lowat size;` |
| Default | `send_lowat 0;` |
| Context | http, server, location |

Minimize send operations using NOTE_LOWAT (kqueue) or SO_SNDLOWAT. Ignored on Linux, Solaris, Windows.

---

### `send_timeout`

| Field | Value |
|-------|-------|
| Syntax | `send_timeout time;` |
| Default | `send_timeout 60s;` |
| Context | http, server, location |

Timeout for transmitting response to client between successive write operations.

---

### `sendfile`

| Field | Value |
|-------|-------|
| Syntax | `sendfile on \| off;` |
| Default | `sendfile off;` |
| Context | http, server, location, if in location |

Enables `sendfile()` for efficient file transfer.

---

### `sendfile_max_chunk`

| Field | Value |
|-------|-------|
| Syntax | `sendfile_max_chunk size;` |
| Default | `sendfile_max_chunk 2m;` |
| Context | http, server, location |

Limits data per `sendfile()` call. Prevents a fast connection from seizing the worker. No limit before 1.21.4.

---

### `server`

| Field | Value |
|-------|-------|
| Syntax | `server { ... }` |
| Default | — |
| Context | http |

Sets configuration for a virtual server.

---

### `server_name`

| Field | Value |
|-------|-------|
| Syntax | `server_name name ...;` |
| Default | `server_name "";` |
| Context | server |

Sets names of a virtual server. The first name is the primary name.

**Name types:**
- Exact name: `example.com`
- Wildcard starting with `*`: `*.example.com`
- Wildcard ending with `*`: `mail.*`
- Special form `.example.org` (matches both `example.org` and `*.example.org`)
- Regex with `~` prefix: `~^www\d+\.example\.com$`
- Named captures in regex: `~^(www\.)?(?<domain>.+)$`
- Empty name `""` for requests without Host header
- `$hostname` for the machine's hostname

**Search priority:**
1. Exact name
2. Longest wildcard starting with `*`
3. Longest wildcard ending with `*`
4. First matching regex (in file order)

---

### `server_name_in_redirect`

| Field | Value |
|-------|-------|
| Syntax | `server_name_in_redirect on \| off;` |
| Default | `server_name_in_redirect off;` |
| Context | http, server, location |

Use primary server name in absolute redirects. If off, uses Host header (or server IP if absent).

---

### `server_names_hash_bucket_size`

| Field | Value |
|-------|-------|
| Syntax | `server_names_hash_bucket_size size;` |
| Default | `server_names_hash_bucket_size 32\|64\|128;` |
| Context | http |

Bucket size for server names hash tables. Depends on CPU cache line.

---

### `server_names_hash_max_size`

| Field | Value |
|-------|-------|
| Syntax | `server_names_hash_max_size size;` |
| Default | `server_names_hash_max_size 512;` |
| Context | http |

Max size of server names hash tables.

---

### `server_tokens`

| Field | Value |
|-------|-------|
| Syntax | `server_tokens on \| off \| build \| string;` |
| Default | `server_tokens on;` |
| Context | http, server, location |

Controls nginx version in error pages and Server header. `build` includes build name. `string` (commercial) customizes the value.

---

### `subrequest_output_buffer_size`

| Field | Value |
|-------|-------|
| Syntax | `subrequest_output_buffer_size size;` |
| Default | `subrequest_output_buffer_size 4k\|8k;` |
| Context | http, server, location |

Buffer size for storing subrequest response body. Used by SSI `include virtual` etc.

---

### `tcp_nodelay`

| Field | Value |
|-------|-------|
| Syntax | `tcp_nodelay on \| off;` |
| Default | `tcp_nodelay on;` |
| Context | http, server, location |

Enables TCP_NODELAY option. Enabled on keep-alive, SSL, unbuffered proxying, and WebSocket proxying.

---

### `tcp_nopush`

| Field | Value |
|-------|-------|
| Syntax | `tcp_nopush on \| off;` |
| Default | `tcp_nopush off;` |
| Context | http, server, location |

Enables TCP_NOPUSH (FreeBSD) or TCP_CORK (Linux). Works only with `sendfile`. Sends header + file start in one packet.

---

### `try_files`

| Field | Value |
|-------|-------|
| Syntax | `try_files file ... uri;` / `try_files file ... =code;` |
| Default | — |
| Context | server, location |

Checks file existence in order, uses first found. Last parameter is the fallback URI, named location, or status code.

```nginx
try_files $uri /images/default.gif;
try_files $uri $uri/index.html $uri.html =404;
try_files /system/maintenance.html $uri $uri/index.html $uri.html @mongrel;
```

---

### `types`

| Field | Value |
|-------|-------|
| Syntax | `types { ... }` |
| Default | `types { text/html html; image/gif gif; image/jpeg jpg; }` |
| Context | http, server, location |

Maps file extensions to MIME types. Extensions are case-insensitive.

```nginx
types {
    application/octet-stream bin exe dll;
}
```

---

### `types_hash_bucket_size`

| Field | Value |
|-------|-------|
| Syntax | `types_hash_bucket_size size;` |
| Default | `types_hash_bucket_size 64;` |
| Context | http, server, location |

Bucket size for types hash tables.

---

### `types_hash_max_size`

| Field | Value |
|-------|-------|
| Syntax | `types_hash_max_size size;` |
| Default | `types_hash_max_size 1024;` |
| Context | http, server, location |

Max size of types hash tables.

---

### `underscores_in_headers`

| Field | Value |
|-------|-------|
| Syntax | `underscores_in_headers on \| off;` |
| Default | `underscores_in_headers off;` |
| Context | http, server |

Enables underscores in client request header field names. When off, underscores trigger `ignore_invalid_headers`.

---

### `variables_hash_bucket_size`

| Field | Value |
|-------|-------|
| Syntax | `variables_hash_bucket_size size;` |
| Default | `variables_hash_bucket_size 64;` |
| Context | http |

Bucket size for variables hash table.

---

### `variables_hash_max_size`

| Field | Value |
|-------|-------|
| Syntax | `variables_hash_max_size size;` |
| Default | `variables_hash_max_size 1024;` |
| Context | http |

Max size of variables hash table. Default was 512 before 1.5.13.

---

## Embedded Variables

| Variable | Description |
|----------|-------------|
| `$arg_name` | Argument `name` in request line |
| `$args` | Full query string arguments |
| `$binary_remote_addr` | Client address in binary (4 bytes IPv4, 16 bytes IPv6) |
| `$body_bytes_sent` | Bytes sent to client (excluding headers) |
| `$bytes_sent` | Total bytes sent to client |
| `$connection` | Connection serial number |
| `$connection_requests` | Requests made through this connection |
| `$connection_time` | Connection time in seconds with ms resolution |
| `$content_length` | Content-Length request header |
| `$content_type` | Content-Type request header |
| `$cookie_name` | Named cookie value |
| `$document_root` | Current root or alias value |
| `$document_uri` | Same as `$uri` |
| `$host` | Host from request line, then Host header, then server name |
| `$hostname` | Machine hostname |
| `$http_name` | Arbitrary request header (lowercase, dashes to underscores) |
| `$https` | "on" if SSL mode, else "" |
| `$is_args` | "?" if args exist, else "" |
| `$is_request_port` | ":" if `$request_port` is non-empty |
| `$limit_rate` | Set to enable rate limiting (deprecated, use `limit_rate` directive) |
| `$msec` | Current time in seconds with ms resolution |
| `$nginx_version` | nginx version string |
| `$pid` | Worker process PID |
| `$pipe` | "p" if pipelined, "." otherwise |
| `$proxy_protocol_addr` | Client address from PROXY protocol header |
| `$proxy_protocol_port` | Client port from PROXY protocol header |
| `$proxy_protocol_server_addr` | Server address from PROXY protocol header |
| `$proxy_protocol_server_port` | Server port from PROXY protocol header |
| `$proxy_protocol_tlv_name` | TLV value from PROXY protocol header |
| `$query_string` | Same as `$args` |
| `$realpath_root` | Absolute root/alias path with symlinks resolved |
| `$remote_addr` | Client IP address |
| `$remote_port` | Client port |
| `$remote_user` | Username from Basic authentication |
| `$request` | Full original request line |
| `$request_body` | Request body (available in proxy/fastcgi/uwsgi/scgi_pass) |
| `$request_body_file` | Temp file name with request body |
| `$request_completion` | "OK" if request completed |
| `$request_filename` | File path for current request |
| `$request_id` | Unique request ID (16 random bytes, hex) |
| `$request_length` | Total request length (line + headers + body) |
| `$request_method` | HTTP method (GET, POST, etc.) |
| `$request_port` | Port from URI authority or Host header |
| `$request_time` | Request processing time in seconds with ms resolution |
| `$request_uri` | Full original URI (with arguments) |
| `$scheme` | "http" or "https" |
| `$sent_http_name` | Arbitrary response header |
| `$sent_trailer_name` | Arbitrary response trailer field |
| `$server_addr` | Server IP that accepted the request |
| `$server_name` | Server name that accepted the request |
| `$server_port` | Server port that accepted the request |
| `$server_protocol` | Protocol (HTTP/1.0, HTTP/1.1, HTTP/2.0, HTTP/3.0) |
| `$status` | Response status code |
| `$tcpinfo_rtt` | TCP RTT info |
| `$tcpinfo_rttvar` | TCP RTT variance |
| `$tcpinfo_snd_cwnd` | TCP send congestion window |
| `$tcpinfo_rcv_space` | TCP receive space |
| `$time_iso8601` | Local time in ISO 8601 format |
| `$time_iso8601_ms` | Local time in ISO 8601 with ms resolution (commercial) |
| `$time_local` | Local time in Common Log Format |
| `$uri` | Normalized current URI (may change during processing) |

---

## Server Names (server_names.html)

### Wildcard Names

- `*.example.org` matches `www.example.org`, `www.sub.example.org`
- `mail.*` matches `mail.example.org`, `mail.example.net`
- `.example.org` matches both `example.org` and `*.example.org`
- Wildcard only valid at start or end, on dot boundary

### Regex Names

- Prefix with `~`: `~^www\d+\.example\.net$`
- Named captures: `~^(www\.)?(?<domain>.+)$` → `$domain`
- Digital captures: `~^(www\.)?(.+)$` → `$2`
- Must quote if contains `{` or `}`

### IDN Names

Specify in Punycode (ASCII) representation:
```nginx
server_name xn--e1afmkfd.xn--80akhbyknj4f;  # пример.испытание
```

### Optimization

- Exact names stored in hash table (fastest search)
- Wildcards stored in two hash tables (starting `*`, ending `*`)
- Regex tested sequentially (slowest)
- Tune `server_names_hash_max_size` and `server_names_hash_bucket_size` for large sets
- If only one server per port, hash tables are not built (except regex with captures)
