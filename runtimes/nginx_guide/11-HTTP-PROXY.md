# NGINX HTTP Proxy & Upstream Modules

This document covers all HTTP proxy-related modules: **ngx_http_proxy_module**, **ngx_http_fastcgi_module**, **ngx_http_uwsgi_module**, **ngx_http_scgi_module**, **ngx_http_grpc_module**, **ngx_http_memcached_module**, **ngx_http_tunnel_module**, and **WebSocket proxying**.

---

## 1. ngx_http_proxy_module

Passes requests to another HTTP/HTTPS server.

### Basic Configuration

```nginx
location / {
    proxy_pass       http://localhost:8000;
    proxy_set_header Host      $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Directives

#### `proxy_allow_upstream`

| Field | Value |
|-------|-------|
| Syntax | `proxy_allow_upstream string ...;` |
| Default | — |
| Context | http, server, location |

Conditions under which access to proxied server is allowed. Commercial subscription.

#### `proxy_bind`

| Field | Value |
|-------|-------|
| Syntax | `proxy_bind address [transparent] \| off;` |
| Default | — |
| Context | http, server, location |

Makes outgoing connections originate from a specific local IP/port. Supports variables. `transparent` allows non-local IP bind (e.g., client's real IP). Requires superuser or CAP_NET_RAW on Linux.

#### `proxy_bind_dynamic`

| Field | Value |
|-------|-------|
| Syntax | `proxy_bind_dynamic on \| off;` |
| Default | `proxy_bind_dynamic off;` |
| Context | http, server, location |

Binds at each connection attempt. Commercial subscription.

#### `proxy_buffer_size`

| Field | Value |
|-------|-------|
| Syntax | `proxy_buffer_size size;` |
| Default | `proxy_buffer_size 4k\|8k;` |
| Context | http, server, location |

Size of buffer for reading the first part of response (header). Default = one memory page.

#### `proxy_buffering`

| Field | Value |
|-------|-------|
| Syntax | `proxy_buffering on \| off;` |
| Default | `proxy_buffering on;` |
| Context | http, server, location |

Enables/disables buffering of responses. When off, response is sent synchronously as it arrives.

#### `proxy_buffers`

| Field | Value |
|-------|-------|
| Syntax | `proxy_buffers number size;` |
| Default | `proxy_buffers 8 4k\|8k;` |
| Context | http, server, location |

Number and size of buffers for reading response.

#### `proxy_busy_buffers_size`

| Field | Value |
|-------|-------|
| Syntax | `proxy_busy_buffers_size size;` |
| Default | `proxy_busy_buffers_size 8k\|16k;` |
| Context | http, server, location |

Size of buffers that can be sent while response is not fully read.

#### `proxy_cache`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache zone \| off;` |
| Default | `proxy_cache off;` |
| Context | http, server, location |

Defines shared memory zone for caching.

#### `proxy_cache_background_update`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_background_update on \| off;` |
| Default | `proxy_cache_background_update off;` |
| Context | http, server, location |

Allows background subrequest to update expired cache item.

#### `proxy_cache_bypass`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_bypass string ...;` |
| Default | — |
| Context | http, server, location |

Conditions under which the response is taken from upstream instead of cache. If any string is non-empty and not "0", the cache is bypassed.

#### `proxy_cache_convert_head`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_convert_head on \| off;` |
| Default | `proxy_cache_convert_head on;` |
| Context | http, server, location |

When enabled, HEAD requests are converted to GET for caching.

#### `proxy_cache_key`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_key string;` |
| Default | `proxy_cache_key $scheme$proxy_host$request_uri;` |
| Context | http, server, location |

Defines cache key.

#### `proxy_cache_lock`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_lock on \| off;` |
| Default | `proxy_cache_lock off;` |
| Context | http, server, location |

Prevents multiple requests from updating the same cache item simultaneously.

#### `proxy_cache_lock_age`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_lock_age time;` |
| Default | `proxy_cache_lock_age 5s;` |
| Context | http, server, location |

Time before another request can take the cache lock.

#### `proxy_cache_lock_timeout`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_lock_timeout time;` |
| Default | `proxy_cache_lock_timeout 5s;` |
| Context | http, server, location |

Timeout for cache lock. After timeout, the request is passed to upstream (response not cached).

#### `proxy_cache_max_range_offset`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_max_range_offset number;` |
| Default | — |
| Context | http, server, location |

Offset for byte-range requests to be cached.

#### `proxy_cache_methods`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_methods GET \| HEAD \| POST ...;` |
| Default | `proxy_cache_methods GET HEAD;` |
| Context | http, server, location |

Methods for which caching is enabled.

#### `proxy_cache_min_uses`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_min_uses number;` |
| Default | `proxy_cache_min_uses 1;` |
| Context | http, server, location |

Number of requests before response is cached.

#### `proxy_cache_path`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_path path [levels=levels] [use_temp_path=on\|off] keys_zone=name:size [inactive=time] [max_size=size] [min_free=size] [manager_files=number] [manager_sleep=time] [manager_threshold=time] [loader_files=number] [loader_sleep=time] [loader_threshold=time] [purger=on\|off] [purger_files=number] [purger_sleep=time] [purger_threshold=time];` |
| Default | — |
| Context | http |

Sets cache storage path and parameters.

```nginx
proxy_cache_path /data/nginx/cache keys_zone=one:10m;
proxy_cache_path /data/nginx/cache levels=1:2 keys_zone=one:10m max_size=1g;
```

#### `proxy_cache_purge`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_purge string ...;` |
| Default | — |
| Context | http, server, location |

Enables cache purge requests (commercial).

#### `proxy_cache_revalidate`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_revalidate on \| off;` |
| Default | `proxy_cache_revalidate off;` |
| Context | http, server, location |

Enables revalidation of expired cache items using conditional requests (If-Modified-Since, If-None-Match).

#### `proxy_cache_use_stale`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_use_stale error \| timeout \| invalid_header \| updating \| http_500 \| http_502 \| http_503 \| http_504 \| http_403 \| http_404 \| http_429 \| off ...;` |
| Default | `proxy_cache_use_stale off;` |
| Context | http, server, location |

Serves stale cached response when upstream returns specified errors or timeouts.

#### `proxy_cache_valid`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cache_valid [code ...] time;` |
| Default | — |
| Context | http, server, location |

Sets caching time for different response codes.

```nginx
proxy_cache_valid 200 302 10m;
proxy_cache_valid 404      1m;
```

#### `proxy_connect_timeout`

| Field | Value |
|-------|-------|
| Syntax | `proxy_connect_timeout time;` |
| Default | `proxy_connect_timeout 60s;` |
| Context | http, server, location |

Timeout for establishing connection to proxied server.

#### `proxy_cookie_domain`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cookie_domain off;` / `proxy_cookie_domain domain replacement;` |
| Default | `proxy_cookie_domain off;` |
| Context | http, server, location |

Replaces domain in Set-Cookie header.

#### `proxy_cookie_flags`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cookie_flags off;` / `proxy_cookie_flags string ...;` |
| Default | `proxy_cookie_flags off;` |
| Context | http, server, location |

Adds flags to Set-Cookie header.

#### `proxy_cookie_path`

| Field | Value |
|-------|-------|
| Syntax | `proxy_cookie_path off;` / `proxy_cookie_path path replacement;` |
| Default | `proxy_cookie_path off;` |
| Context | http, server, location |

Replaces path in Set-Cookie header.

#### `proxy_force_ranges`

| Field | Value |
|-------|-------|
| Syntax | `proxy_force_ranges on \| off;` |
| Default | `proxy_force_ranges off;` |
| Context | http, server, location |

Enables byte-range support for cached and proxied responses regardless of backend Accept-Ranges.

#### `proxy_headers_hash_bucket_size`

| Field | Value |
|-------|-------|
| Syntax | `proxy_headers_hash_bucket_size size;` |
| Default | `proxy_headers_hash_bucket_size 64;` |
| Context | http, server, location |

Bucket size for hash tables of `proxy_set_header` and `proxy_hide_header`.

#### `proxy_headers_hash_max_size`

| Field | Value |
|-------|-------|
| Syntax | `proxy_headers_hash_max_size size;` |
| Default | `proxy_headers_hash_max_size 512;` |
| Context | http, server, location |

Max size of hash tables for `proxy_set_header` and `proxy_hide_header`.

#### `proxy_hide_header`

| Field | Value |
|-------|-------|
| Syntax | `proxy_hide_header field;` |
| Default | — |
| Context | http, server, location |

Hides specified response headers from the client.

#### `proxy_http_version`

| Field | Value |
|-------|-------|
| Syntax | `proxy_http_version 1.0 \| 1.1;` |
| Default | `proxy_http_version 1.0;` |
| Context | http, server, location |

Sets HTTP protocol version for proxying. Use 1.1 for keepalive, WebSocket, or chunked transfer.

#### `proxy_ignore_client_abort`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ignore_client_abort on \| off;` |
| Default | `proxy_ignore_client_abort off;` |
| Context | http, server, location |

Continues proxying if client aborts connection.

#### `proxy_ignore_headers`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ignore_headers field ...;` |
| Default | — |
| Context | http, server, location |

Ignores specified response headers from proxied server. Used to disable processing of: X-Accel-Redirect, X-Accel-Expires, X-Accel-Limit-Rate, X-Accel-Buffering, X-Accel-Charset, Expires, Cache-Control, Set-Cookie.

#### `proxy_intercept_errors`

| Field | Value |
|-------|-------|
| Syntax | `proxy_intercept_errors on \| off;` |
| Default | `proxy_intercept_errors off;` |
| Context | http, server, location |

Intercepts upstream error responses (>=300) and processes them with `error_page`.

#### `proxy_limit_rate`

| Field | Value |
|-------|-------|
| Syntax | `proxy_limit_rate rate;` |
| Default | `proxy_limit_rate 0;` |
| Context | http, server, location |

Limits reading speed from proxied server. Zero = unlimited.

#### `proxy_max_temp_file_size`

| Field | Value |
|-------|-------|
| Syntax | `proxy_max_temp_file_size size;` |
| Default | `proxy_max_temp_file_size 1024m;` |
| Context | http, server, location |

Max size of temporary file when response doesn't fit in buffers. Zero = disable temp files.

#### `proxy_method`

| Field | Value |
|-------|-------|
| Syntax | `proxy_method method;` |
| Default | — |
| Context | http, server, location |

Overrides the HTTP method for proxied requests.

#### `proxy_next_upstream`

| Field | Value |
|-------|-------|
| Syntax | `proxy_next_upstream error \| timeout \| invalid_header \| http_500 \| http_502 \| http_503 \| http_504 \| http_403 \| http_404 \| http_429 \| non_idempotent \| off ...;` |
| Default | `proxy_next_upstream error timeout;` |
| Context | http, server, location |

Conditions for passing request to next upstream server.

#### `proxy_next_upstream_timeout`

| Field | Value |
|-------|-------|
| Syntax | `proxy_next_upstream_timeout time;` |
| Default | `proxy_next_upstream_timeout 0;` |
| Context | http, server, location |

Timeout for trying next upstream servers.

#### `proxy_next_upstream_tries`

| Field | Value |
|-------|-------|
| Syntax | `proxy_next_upstream_tries number;` |
| Default | `proxy_next_upstream_tries 0;` |
| Context | http, server, location |

Max number of upstream servers to try.

#### `proxy_no_cache`

| Field | Value |
|-------|-------|
| Syntax | `proxy_no_cache string ...;` |
| Default | — |
| Context | http, server, location |

Conditions under which response is not cached. If any string is non-empty and not "0", response is not saved.

#### `proxy_pass`

| Field | Value |
|-------|-------|
| Syntax | `proxy_pass url;` |
| Default | — |
| Context | location, if in location |

Sets the protocol and address of a proxied server.

**URI handling:**
- If `proxy_pass` has no URI (just server), the original request URI is passed unchanged.
- If `proxy_pass` has a URI path, the part of the request matching the location prefix is replaced by the `proxy_pass` URI.
- Variables in `proxy_pass`: when variables are used, the full URI is passed as-is.

```nginx
location /some/path/ {
    proxy_pass http://backend;           # no URI: full original URI passed
    proxy_pass http://backend/;          # URI /: location prefix replaced by /
    proxy_pass http://backend/new/;      # /some/path/ is replaced by /new/
    proxy_pass http://backend$request_uri; # variables used
}
```

**UNIX socket:**
```nginx
proxy_pass http://unix:/tmp/backend.sock:/uri/;
```

#### `proxy_pass_header`

| Field | Value |
|-------|-------|
| Syntax | `proxy_pass_header field;` |
| Default | — |
| Context | http, server, location |

Overrides `proxy_hide_header` for specific fields.

#### `proxy_pass_request_body`

| Field | Value |
|-------|-------|
| Syntax | `proxy_pass_request_body on \| off;` |
| Default | `proxy_pass_request_body on;` |
| Context | http, server, location |

Indicates whether the request body is passed to the proxied server.

#### `proxy_pass_request_headers`

| Field | Value |
|-------|-------|
| Syntax | `proxy_pass_request_headers on \| off;` |
| Default | `proxy_pass_request_headers on;` |
| Context | http, server, location |

Indicates whether the request headers are passed to the proxied server.

#### `proxy_read_timeout`

| Field | Value |
|-------|-------|
| Syntax | `proxy_read_timeout time;` |
| Default | `proxy_read_timeout 60s;` |
| Context | http, server, location |

Timeout for reading response from proxied server between successive read operations.

#### `proxy_redirect`

| Field | Value |
|-------|-------|
| Syntax | `proxy_redirect default;` / `proxy_redirect off;` / `proxy_redirect redirect replacement;` |
| Default | `proxy_redirect default;` |
| Context | http, server, location |

Rewrites the Location and Refresh header fields in proxied responses.

```nginx
proxy_redirect http://localhost:8000/two/ http://frontend/one/;
proxy_redirect http://localhost:8000/ /;
proxy_redirect http://backend.example.com/ /;
proxy_redirect ~^(http://[^:]+):\d+(/.+)$ $1$2;
```

#### `proxy_request_buffering`

| Field | Value |
|-------|-------|
| Syntax | `proxy_request_buffering on \| off;` |
| Default | `proxy_request_buffering on;` |
| Context | http, server, location |

When on, the entire request body is buffered before proxying. When off, body is sent as it arrives.

#### `proxy_send_lowat`

| Field | Value |
|-------|-------|
| Syntax | `proxy_send_lowat size;` |
| Default | `proxy_send_lowat 0;` |
| Context | http, server, location |

Low-water mark for sending data to proxied server. Used only on FreeBSD with kqueue.

#### `proxy_send_timeout`

| Field | Value |
|-------|-------|
| Syntax | `proxy_send_timeout time;` |
| Default | `proxy_send_timeout 60s;` |
| Context | http, server, location |

Timeout for writing request body to proxied server between successive write operations.

#### `proxy_set_body`

| Field | Value |
|-------|-------|
| Syntax | `proxy_set_body value;` |
| Default | — |
| Context | http, server, location |

Sets the request body passed to the proxied server. Value can contain variables.

#### `proxy_set_header`

| Field | Value |
|-------|-------|
| Syntax | `proxy_set_header field value;` |
| Default | `proxy_set_header Host $proxy_host;` and `proxy_set_header Connection close;` |
| Context | http, server, location |

Sets or overrides a request header passed to the proxied server.

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

#### `proxy_socket_keepalive`

| Field | Value |
|-------|-------|
| Syntax | `proxy_socket_keepalive on \| off;` |
| Default | `proxy_socket_keepalive off;` |
| Context | http, server, location |

Enables TCP keepalive on connections to upstream servers.

#### `proxy_ssl_certificate`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_certificate file;` |
| Default | — |
| Context | http, server, location |

Client certificate for proxied HTTPS connections.

#### `proxy_ssl_certificate_key`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_certificate_key file;` |
| Default | — |
| Context | http, server, location |

Client certificate key for proxied HTTPS connections.

#### `proxy_ssl_ciphers`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_ciphers ciphers;` |
| Default | `proxy_ssl_ciphers DEFAULT;` |
| Context | http, server, location |

Ciphers for proxied HTTPS connections.

#### `proxy_ssl_conf_command`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_conf_command name value;` |
| Default | — |
| Context | http, server, location |

Arbitrary OpenSSL configuration commands for proxied HTTPS.

#### `proxy_ssl_crl`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_crl file;` |
| Default | — |
| Context | http, server, location |

CRL file for verifying proxied server certificate.

#### `proxy_ssl_name`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_name name;` |
| Default | `proxy_ssl_name $proxy_host;` |
| Context | http, server, location |

Server name for SNI in proxied HTTPS connections.

#### `proxy_ssl_password_file`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_password_file file;` |
| Default | — |
| Context | http, server, location |

Passphrases for `proxy_ssl_certificate_key`.

#### `proxy_ssl_protocols`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3];` |
| Default | `proxy_ssl_protocols TLSv1.2 TLSv1.3;` |
| Context | http, server, location |

Protocols for proxied HTTPS connections.

#### `proxy_ssl_server_name`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_server_name on \| off;` |
| Default | `proxy_ssl_server_name off;` |
| Context | http, server, location |

Enables SNI passthrough for proxied HTTPS connections.

#### `proxy_ssl_session_reuse`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_session_reuse on \| off;` |
| Default | `proxy_ssl_session_reuse on;` |
| Context | http, server, location |

Reuses SSL sessions for proxied HTTPS connections.

#### `proxy_ssl_trusted_certificate`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_trusted_certificate file;` |
| Default | — |
| Context | http, server, location |

Trusted CA certificates for verifying proxied server certificate.

#### `proxy_ssl_verify`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_verify on \| off;` |
| Default | `proxy_ssl_verify off;` |
| Context | http, server, location |

Enables verification of proxied server certificate.

#### `proxy_ssl_verify_depth`

| Field | Value |
|-------|-------|
| Syntax | `proxy_ssl_verify_depth number;` |
| Default | `proxy_ssl_verify_depth 1;` |
| Context | http, server, location |

Verification depth for proxied server certificate chain.

#### `proxy_store`

| Field | Value |
|-------|-------|
| Syntax | `proxy_store on \| off \| string;` |
| Default | `proxy_store off;` |
| Context | http, server, location |

Enables local file storage of proxied files for static file serving.

#### `proxy_store_access`

| Field | Value |
|-------|-------|
| Syntax | `proxy_store_access users:permissions ...;` |
| Default | `proxy_store_access user:rw;` |
| Context | http, server, location |

Sets access permissions for stored files.

#### `proxy_temp_file_write_size`

| Field | Value |
|-------|-------|
| Syntax | `proxy_temp_file_write_size size;` |
| Default | `proxy_temp_file_write_size 8k\|16k;` |
| Context | http, server, location |

Size of data written to temp file at a time.

#### `proxy_temp_path`

| Field | Value |
|-------|-------|
| Syntax | `proxy_temp_path path [level1 [level2 [level3]]];` |
| Default | `proxy_temp_path proxy_temp;` |
| Context | http, server, location |

Directory for temporary files with response data.

### Proxy Variables

| Variable | Description |
|----------|-------------|
| `$proxy_host` | Name and port of proxied server from `proxy_pass` |
| `$proxy_port` | Port of proxied server |
| `$proxy_add_x_forwarded_for` | `$remote_addr` appended to X-Forwarded-For, or `$remote_addr` if not present |
| `$proxy_protocol_addr` | Client address from PROXY protocol |
| `$proxy_protocol_port` | Client port from PROXY protocol |

---

## 2. ngx_http_fastcgi_module

Passes requests to a FastCGI server (PHP, etc.).

### Basic Configuration

```nginx
location / {
    fastcgi_pass  localhost:9000;
    fastcgi_index index.php;

    fastcgi_param SCRIPT_FILENAME /home/www/scripts/php$fastcgi_script_name;
    fastcgi_param QUERY_STRING    $query_string;
    fastcgi_param REQUEST_METHOD  $request_method;
    fastcgi_param CONTENT_TYPE    $content_type;
    fastcgi_param CONTENT_LENGTH  $content_length;
}
```

### Directives

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| `fastcgi_allow_upstream` | `fastcgi_allow_upstream string ...;` | — | http, server, location | Access control for FastCGI server (commercial) |
| `fastcgi_bind` | `fastcgi_bind address [transparent] \| off;` | — | http, server, location | Bind local address for FastCGI connections |
| `fastcgi_bind_dynamic` | `fastcgi_bind_dynamic on \| off;` | off | http, server, location | Bind per connection attempt (commercial) |
| `fastcgi_buffer_size` | `fastcgi_buffer_size size;` | 4k\|8k | http, server, location | Size of buffer for first part of response |
| `fastcgi_buffering` | `fastcgi_buffering on \| off;` | on | http, server, location | Enables response buffering |
| `fastcgi_buffers` | `fastcgi_buffers number size;` | 8 4k\|8k | http, server, location | Number and size of response buffers |
| `fastcgi_busy_buffers_size` | `fastcgi_busy_buffers_size size;` | 8k\|16k | http, server, location | Size of busy buffers |
| `fastcgi_cache` | `fastcgi_cache zone \| off;` | off | http, server, location | Cache zone name |
| `fastcgi_cache_background_update` | `fastcgi_cache_background_update on \| off;` | off | http, server, location | Background cache update |
| `fastcgi_cache_bypass` | `fastcgi_cache_bypass string ...;` | — | http, server, location | Cache bypass conditions |
| `fastcgi_cache_key` | `fastcgi_cache_key string;` | `$scheme$fastcgi_server_name$request_uri` | http, server, location | Cache key |
| `fastcgi_cache_lock` | `fastcgi_cache_lock on \| off;` | off | http, server, location | Cache lock |
| `fastcgi_cache_lock_age` | `fastcgi_cache_lock_age time;` | 5s | http, server, location | Cache lock age |
| `fastcgi_cache_lock_timeout` | `fastcgi_cache_lock_timeout time;` | 5s | http, server, location | Cache lock timeout |
| `fastcgi_cache_max_range_offset` | `fastcgi_cache_max_range_offset number;` | — | http, server, location | Byte-range cache offset |
| `fastcgi_cache_methods` | `fastcgi_cache_methods GET \| HEAD \| POST ...;` | GET HEAD | http, server, location | Cacheable methods |
| `fastcgi_cache_min_uses` | `fastcgi_cache_min_uses number;` | 1 | http, server, location | Min uses before caching |
| `fastcgi_cache_path` | `fastcgi_cache_path path ...;` | — | http | Cache storage path (same params as proxy_cache_path) |
| `fastcgi_cache_purge` | `fastcgi_cache_purge string ...;` | — | http, server, location | Cache purge (commercial) |
| `fastcgi_cache_revalidate` | `fastcgi_cache_revalidate on \| off;` | off | http, server, location | Conditional cache revalidation |
| `fastcgi_cache_use_stale` | `fastcgi_cache_use_stale ...;` | off | http, server, location | Serve stale on errors |
| `fastcgi_cache_valid` | `fastcgi_cache_valid [code ...] time;` | — | http, server, location | Cache time by status code |
| `fastcgi_catch_stderr` | `fastcgi_catch_stderr string;` | — | http, server, location | Treat response as invalid if string found in stderr |
| `fastcgi_connect_timeout` | `fastcgi_connect_timeout time;` | 60s | http, server, location | Connection timeout |
| `fastcgi_force_ranges` | `fastcgi_force_ranges on \| off;` | off | http, server, location | Force byte-range support |
| `fastcgi_hide_header` | `fastcgi_hide_header field;` | — | http, server, location | Hide response headers |
| `fastcgi_ignore_client_abort` | `fastcgi_ignore_client_abort on \| off;` | off | http, server, location | Continue on client abort |
| `fastcgi_ignore_headers` | `fastcgi_ignore_headers field ...;` | — | http, server, location | Ignore specific response headers |
| `fastcgi_index` | `fastcgi_index name;` | — | http, server, location | Index file name for FastCGI |
| `fastcgi_intercept_errors` | `fastcgi_intercept_errors on \| off;` | off | http, server, location | Intercept error responses |
| `fastcgi_keep_conn` | `fastcgi_keep_conn on \| off;` | off | http, server, location | Keep FastCGI connection alive |
| `fastcgi_limit_rate` | `fastcgi_limit_rate rate;` | 0 | http, server, location | Read rate limit |
| `fastcgi_max_temp_file_size` | `fastcgi_max_temp_file_size size;` | 1024m | http, server, location | Max temp file size |
| `fastcgi_next_upstream` | `fastcgi_next_upstream ...;` | error timeout | http, server, location | Next upstream conditions |
| `fastcgi_next_upstream_timeout` | `fastcgi_next_upstream_timeout time;` | 0 | http, server, location | Next upstream timeout |
| `fastcgi_next_upstream_tries` | `fastcgi_next_upstream_tries number;` | 0 | http, server, location | Next upstream tries |
| `fastcgi_no_cache` | `fastcgi_no_cache string ...;` | — | http, server, location | No-cache conditions |
| `fastcgi_param` | `fastcgi_param parameter value [if_not_empty];` | — | http, server, location | Set FastCGI parameter |
| `fastcgi_pass` | `fastcgi_pass address;` | — | http, server, location | FastCGI server address |
| `fastcgi_pass_header` | `fastcgi_pass_header field;` | — | http, server, location | Pass hidden headers |
| `fastcgi_pass_request_body` | `fastcgi_pass_request_body on \| off;` | on | http, server, location | Pass request body |
| `fastcgi_pass_request_headers` | `fastcgi_pass_request_headers on \| off;` | on | http, server, location | Pass request headers |
| `fastcgi_read_timeout` | `fastcgi_read_timeout time;` | 60s | http, server, location | Read timeout |
| `fastcgi_request_buffering` | `fastcgi_request_buffering on \| off;` | on | http, server, location | Buffer request body |
| `fastcgi_request_dynamic` | `fastcgi_request_dynamic on \| off;` | off | http, server, location | Per-server request instance (commercial) |
| `fastcgi_send_lowat` | `fastcgi_send_lowat size;` | 0 | http, server, location | Send low-water mark |
| `fastcgi_send_timeout` | `fastcgi_send_timeout time;` | 60s | http, server, location | Send timeout |
| `fastcgi_socket_keepalive` | `fastcgi_socket_keepalive on \| off;` | off | http, server, location | TCP keepalive |
| `fastcgi_socket_rcvbuf` | `fastcgi_socket_rcvbuf size;` | — | http, server, location | Socket receive buffer (SO_RCVBUF, 1.31.3+) |
| `fastcgi_socket_sndbuf` | `fastcgi_socket_sndbuf size;` | — | http, server, location | Socket send buffer (SO_SNDBUF, 1.31.3+) |
| `fastcgi_split_path_info` | `fastcgi_split_path_info regex;` | — | http, server, location | Split PATH_INFO from SCRIPT_FILENAME |
| `fastcgi_store` | `fastcgi_store on \| off \| string;` | off | http, server, location | Store files locally |
| `fastcgi_store_access` | `fastcgi_store_access users:permissions ...;` | user:rw | http, server, location | Store file permissions |
| `fastcgi_temp_file_write_size` | `fastcgi_temp_file_write_size size;` | 8k\|16k | http, server, location | Temp file write size |
| `fastcgi_temp_path` | `fastcgi_temp_path path [level1 [level2 [level3]]];` | fastcgi_temp | http, server, location | Temp directory |

### FastCGI SSL Directives

| Directive | Syntax | Default | Description |
|-----------|--------|---------|-------------|
| `fastcgi_ssl_certificate` | `fastcgi_ssl_certificate file;` | — | Client cert for HTTPS FastCGI |
| `fastcgi_ssl_certificate_key` | `fastcgi_ssl_certificate_key file;` | — | Client cert key |
| `fastcgi_ssl_ciphers` | `fastcgi_ssl_ciphers ciphers;` | DEFAULT | Ciphers |
| `fastcgi_ssl_conf_command` | `fastcgi_ssl_conf_command name value;` | — | OpenSSL conf |
| `fastcgi_ssl_crl` | `fastcgi_ssl_crl file;` | — | CRL |
| `fastcgi_ssl_name` | `fastcgi_ssl_name name;` | host name | SNI name |
| `fastcgi_ssl_password_file` | `fastcgi_ssl_password_file file;` | — | Key passphrases |
| `fastcgi_ssl_protocols` | `fastcgi_ssl_protocols ...;` | TLSv1.2 TLSv1.3 | Protocols |
| `fastcgi_ssl_server_name` | `fastcgi_ssl_server_name on \| off;` | off | SNI |
| `fastcgi_ssl_session_reuse` | `fastcgi_ssl_session_reuse on \| off;` | on | Session reuse |
| `fastcgi_ssl_trusted_certificate` | `fastcgi_ssl_trusted_certificate file;` | — | Trusted CA |
| `fastcgi_ssl_verify` | `fastcgi_ssl_verify on \| off;` | off | Verify server cert |
| `fastcgi_ssl_verify_depth` | `fastcgi_ssl_verify_depth number;` | 1 | Verify depth |

### FastCGI Variables

| Variable | Description |
|----------|-------------|
| `$fastcgi_path_info` | PATH_INFO value (from `fastcgi_split_path_info`) |
| `$fastcgi_script_name` | Request URI or SCRIPT_NAME value |

---

## 3. ngx_http_uwsgi_module

Passes requests to a uwsgi server.

### Basic Configuration

```nginx
location / {
    include     uwsgi_params;
    uwsgi_pass localhost:9000;
}
```

All directives follow the same pattern as FastCGI: `uwsgi_pass`, `uwsgi_param`, `uwsgi_buffers`, `uwsgi_buffer_size`, `uwsgi_busy_buffers_size`, `uwsgi_cache_*`, `uwsgi_connect_timeout`, `uwsgi_read_timeout`, `uwsgi_send_timeout`, `uwsgi_ssl_*`, `uwsgi_next_upstream`, `uwsgi_socket_keepalive`, `uwsgi_store`, `uwsgi_temp_path`, etc.

### Key Differences from FastCGI

- Uses uwsgi protocol instead of FastCGI protocol
- `uwsgi_param` sets uwsgi parameters
- `uwsgi_modifier1`, `uwsgi_modifier2` (legacy)
- `uwsgi_pass` accepts `unix:` socket paths

---

## 4. ngx_http_scgi_module

Passes requests to an SCGI server.

### Basic Configuration

```nginx
location / {
    scgi_pass localhost:9000;
    scgi_param SCRIPT_FILENAME /home/www/scripts/php$scgi_script_name;
    scgi_param QUERY_STRING $query_string;
    ...
}
```

All directives follow the same pattern: `scgi_pass`, `scgi_param`, `scgi_buffers`, `scgi_buffer_size`, `scgi_busy_buffers_size`, `scgi_cache_*`, `scgi_connect_timeout`, `scgi_read_timeout`, `scgi_send_timeout`, `scgi_ssl_*`, `scgi_next_upstream`, `scgi_socket_keepalive`, `scgi_store`, `scgi_temp_path`, etc.

---

## 5. ngx_http_grpc_module

Passes requests to a gRPC server. Requires the `ngx_http_v2_module`.

### Basic Configuration

```nginx
server {
    listen 9000;
    http2 on;

    location / {
        grpc_pass 127.0.0.1:9000;
    }
}
```

### Directives

| Directive | Syntax | Default | Description |
|-----------|--------|---------|-------------|
| `grpc_pass` | `grpc_pass address;` | — | gRPC server address |
| `grpc_bind` | `grpc_bind address [transparent] \| off;` | — | Bind address |
| `grpc_bind_dynamic` | `grpc_bind_dynamic on \| off;` | off | Bind per attempt (commercial) |
| `grpc_buffer_size` | `grpc_buffer_size size;` | 4k\|8k | Response header buffer |
| `grpc_connect_timeout` | `grpc_connect_timeout time;` | 60s | Connection timeout |
| `grpc_hide_header` | `grpc_hide_header field;` | — | Hide response headers |
| `grpc_ignore_headers` | `grpc_ignore_headers field ...;` | — | Ignore response headers |
| `grpc_intercept_errors` | `grpc_intercept_errors on \| off;` | off | Intercept error responses |
| `grpc_next_upstream` | `grpc_next_upstream ...;` | error timeout | Next upstream conditions |
| `grpc_next_upstream_timeout` | `grpc_next_upstream_timeout time;` | 0 | Next upstream timeout |
| `grpc_next_upstream_tries` | `grpc_next_upstream_tries number;` | 0 | Next upstream tries |
| `grpc_pass_header` | `grpc_pass_header field;` | — | Pass hidden headers |
| `grpc_pass_request_body` | `grpc_pass_request_body on \| off;` | on | Pass request body |
| `grpc_pass_request_headers` | `grpc_pass_request_headers on \| off;` | on | Pass request headers |
| `grpc_read_timeout` | `grpc_read_timeout time;` | 60s | Read timeout |
| `grpc_send_timeout` | `grpc_send_timeout time;` | 60s | Send timeout |
| `grpc_set_header` | `grpc_set_header field value;` | — | Set request headers |
| `grpc_socket_keepalive` | `grpc_socket_keepalive on \| off;` | off | TCP keepalive |
| `grpc_ssl_certificate` | `grpc_ssl_certificate file;` | — | Client cert |
| `grpc_ssl_certificate_key` | `grpc_ssl_certificate_key file;` | — | Client cert key |
| `grpc_ssl_ciphers` | `grpc_ssl_ciphers ciphers;` | DEFAULT | Ciphers |
| `grpc_ssl_conf_command` | `grpc_ssl_conf_command name value;` | — | OpenSSL conf |
| `grpc_ssl_crl` | `grpc_ssl_crl file;` | — | CRL |
| `grpc_ssl_name` | `grpc_ssl_name name;` | host name | SNI name |
| `grpc_ssl_password_file` | `grpc_ssl_password_file file;` | — | Key passphrases |
| `grpc_ssl_protocols` | `grpc_ssl_protocols ...;` | TLSv1.2 TLSv1.3 | Protocols |
| `grpc_ssl_server_name` | `grpc_ssl_server_name on \| off;` | off | SNI |
| `grpc_ssl_session_reuse` | `grpc_ssl_session_reuse on \| off;` | on | Session reuse |
| `grpc_ssl_trusted_certificate` | `grpc_ssl_trusted_certificate file;` | — | Trusted CA |
| `grpc_ssl_verify` | `grpc_ssl_verify on \| off;` | off | Verify server cert |
| `grpc_ssl_verify_depth` | `grpc_ssl_verify_depth number;` | 1 | Verify depth |

---

## 6. ngx_http_memcached_module

Obtains responses from a memcached server. The key is set in `$memcached_key`.

### Basic Configuration

```nginx
server {
    location / {
        set            $memcached_key "$uri?$args";
        memcached_pass host:11211;
        error_page     404 502 504 = @fallback;
    }

    location @fallback {
        proxy_pass     http://backend;
    }
}
```

### Directives

| Directive | Syntax | Default | Description |
|-----------|--------|---------|-------------|
| `memcached_allow_upstream` | `memcached_allow_upstream string ...;` | — | Access control (commercial) |
| `memcached_bind` | `memcached_bind address [transparent] \| off;` | — | Bind address |
| `memcached_bind_dynamic` | `memcached_bind_dynamic on \| off;` | off | Bind per attempt (commercial) |
| `memcached_buffer_size` | `memcached_buffer_size size;` | 4k\|8k | Response buffer size |
| `memcached_connect_timeout` | `memcached_connect_timeout time;` | 60s | Connection timeout |
| `memcached_gzip_flag` | `memcached_gzip_flag flag;` | — | Flag for gzip compressed responses |
| `memcached_next_upstream` | `memcached_next_upstream ...;` | error timeout | Next upstream conditions |
| `memcached_next_upstream_timeout` | `memcached_next_upstream_timeout time;` | 0 | Next upstream timeout |
| `memcached_next_upstream_tries` | `memcached_next_upstream_tries number;` | 0 | Next upstream tries |
| `memcached_pass` | `memcached_pass address;` | — | Memcached server address |
| `memcached_read_timeout` | `memcached_read_timeout time;` | 60s | Read timeout |
| `memcached_send_timeout` | `memcached_send_timeout time;` | 60s | Send timeout |
| `memcached_socket_keepalive` | `memcached_socket_keepalive on \| off;` | off | TCP keepalive |

### Variables

| Variable | Description |
|----------|-------------|
| `$memcached_key` | Memcached key (must be set before `memcached_pass`) |

---

## 7. ngx_http_tunnel_module

The tunnel module provides HTTP CONNECT method support for creating tunnels through proxy servers.

### Directives

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| `tunnel_pass` | `tunnel_pass address;` | — | location, if in location | Address of the tunnel endpoint |
| `tunnel_bind` | `tunnel_bind address [transparent] \| off;` | — | http, server, location | Bind local address for tunnel connections |
| `tunnel_connect_timeout` | `tunnel_connect_timeout time;` | 60s | http, server, location | Connection timeout |
| `tunnel_next_upstream` | `tunnel_next_upstream ...;` | error timeout | http, server, location | Next upstream conditions |
| `tunnel_next_upstream_timeout` | `tunnel_next_upstream_timeout time;` | 0 | http, server, location | Next upstream timeout |
| `tunnel_next_upstream_tries` | `tunnel_next_upstream_tries number;` | 0 | http, server, location | Next upstream tries |
| `tunnel_read_timeout` | `tunnel_read_timeout time;` | 60s | http, server, location | Read timeout |
| `tunnel_send_timeout` | `tunnel_send_timeout time;` | 60s | http, server, location | Send timeout |
| `tunnel_socket_keepalive` | `tunnel_socket_keepalive on \| off;` | off | http, server, location | TCP keepalive |
| `tunnel_ssl_certificate` | `tunnel_ssl_certificate file;` | — | http, server, location | Client cert |
| `tunnel_ssl_certificate_key` | `tunnel_ssl_certificate_key file;` | — | http, server, location | Client cert key |
| `tunnel_ssl_ciphers` | `tunnel_ssl_ciphers ciphers;` | DEFAULT | http, server, location | Ciphers |
| `tunnel_ssl_conf_command` | `tunnel_ssl_conf_command name value;` | — | http, server, location | OpenSSL conf |
| `tunnel_ssl_crl` | `tunnel_ssl_crl file;` | — | http, server, location | CRL |
| `tunnel_ssl_name` | `tunnel_ssl_name name;` | host name | http, server, location | SNI name |
| `tunnel_ssl_password_file` | `tunnel_ssl_password_file file;` | — | http, server, location | Key passphrases |
| `tunnel_ssl_protocols` | `tunnel_ssl_protocols ...;` | TLSv1.2 TLSv1.3 | http, server, location | Protocols |
| `tunnel_ssl_server_name` | `tunnel_ssl_server_name on \| off;` | off | http, server, location | SNI |
| `tunnel_ssl_session_reuse` | `tunnel_ssl_session_reuse on \| off;` | on | http, server, location | Session reuse |
| `tunnel_ssl_trusted_certificate` | `tunnel_ssl_trusted_certificate file;` | — | http, server, location | Trusted CA |
| `tunnel_ssl_verify` | `tunnel_ssl_verify on \| off;` | off | http, server, location | Verify server cert |
| `tunnel_ssl_verify_depth` | `tunnel_ssl_verify_depth number;` | 1 | http, server, location | Verify depth |

---

## 8. WebSocket Proxying

Since version 1.3.13, nginx supports WebSocket proxying by establishing a tunnel when the upstream returns 101 (Switching Protocols).

### Configuration

The `Upgrade` and `Connection` headers are hop-by-hop and must be passed explicitly:

```nginx
location /chat/ {
    proxy_pass http://backend;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Advanced Example

```nginx
http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    server {
        location /chat/ {
            proxy_pass http://backend;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
        }
    }
}
```

### Notes

- By default, connection closes if no data for 60 seconds. Increase with `proxy_read_timeout`.
- Upstream can send WebSocket ping frames to reset timeout.
- TCP_NODELAY is automatically enabled for WebSocket proxying.
- HTTP/1.1 is required for WebSocket (use `proxy_http_version 1.1` if needed; since 1.29.7, web socket proxying works with default 1.0).

---

## Common Proxy Pattern: Keepalive to Upstream

```nginx
upstream backend {
    server backend1.example.com weight=5;
    server backend2.example.com;
    keepalive 32;
}

server {
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```
