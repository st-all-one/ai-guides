# HTTP Proxy Supplement — Missing Directives Reference

This document covers all directives missing from the main proxy guide (11-HTTP-PROXY.md).
It provides complete references for **SCGI**, **uWSGI**, and fills gaps in **gRPC**, **Proxy**,
**Tunnel**, and **Memcached** modules.

---

## 1. SCGI Module — Complete Reference

### Basic Configuration

```nginx
location / {
    include   scgi_params;
    scgi_pass localhost:9000;
}
```

### Directives

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| `scgi_allow_upstream` | `scgi_allow_upstream string ...;` | — | http, server, location | Access control for SCGI server. Parameter values can contain variables. If all string params are non-empty and not "0", access is allowed. Commercial subscription (1.29.3+). |
| `scgi_bind` | `scgi_bind address [transparent] \| off;` | — | http, server, location | Makes outgoing connections originate from the specified local IP address with optional port. Supports variables. `transparent` allows binding to a non-local IP (e.g., client real IP). `off` cancels inheritance. |
| `scgi_bind_dynamic` | `scgi_bind_dynamic on \| off;` | `scgi_bind_dynamic off;` | http, server, location | When enabled, performs the bind operation at each connection attempt. Commercial subscription (1.29.3+). |
| `scgi_buffer_size` | `scgi_buffer_size size;` | `scgi_buffer_size 4k\|8k;` | http, server, location | Size of the buffer for reading the first part of the SCGI response (usually the header). Default = one memory page (4K or 8K). |
| `scgi_buffering` | `scgi_buffering on \| off;` | `scgi_buffering on;` | http, server, location | Enables or disables buffering of responses from the SCGI server. When on, nginx reads the response as soon as possible into buffers. When off, response is sent synchronously. Can be controlled via `X-Accel-Buffering` header. |
| `scgi_buffers` | `scgi_buffers number size;` | `scgi_buffers 8 4k\|8k;` | http, server, location | Number and size of buffers for reading a response from the SCGI server for a single connection. |
| `scgi_busy_buffers_size` | `scgi_busy_buffers_size size;` | `scgi_busy_buffers_size 8k\|16k;` | http, server, location | Limits the total size of buffers that can be busy sending a response to the client while the response is not yet fully read. Default = size of two buffers from `scgi_buffer_size` and `scgi_buffers`. |
| `scgi_cache` | `scgi_cache zone \| off;` | `scgi_cache off;` | http, server, location | Defines a shared memory zone used for caching. Parameter value can contain variables (1.7.9+). `off` disables caching inherited from previous level. |
| `scgi_cache_background_update` | `scgi_cache_background_update on \| off;` | `scgi_cache_background_update off;` | http, server, location | Allows starting a background subrequest to update an expired cache item while a stale cached response is returned to the client (1.11.10+). |
| `scgi_cache_bypass` | `scgi_cache_bypass string ...;` | — | http, server, location | Conditions under which the response will not be taken from cache. If any string is non-empty and not "0", cache is bypassed. Can be used with `scgi_no_cache`. |
| `scgi_cache_key` | `scgi_cache_key string;` | — | http, server, location | Defines a key for caching, e.g. `scgi_cache_key localhost:9000$request_uri;` |
| `scgi_cache_lock` | `scgi_cache_lock on \| off;` | `scgi_cache_lock off;` | http, server, location | When enabled, only one request at a time can populate a new cache element. Other requests wait up to `scgi_cache_lock_timeout` (1.1.12+). |
| `scgi_cache_lock_age` | `scgi_cache_lock_age time;` | `scgi_cache_lock_age 5s;` | http, server, location | If the last request for populating a new cache element has not completed within this time, another request may be passed to the SCGI server (1.7.8+). |
| `scgi_cache_lock_timeout` | `scgi_cache_lock_timeout time;` | `scgi_cache_lock_timeout 5s;` | http, server, location | Timeout for `scgi_cache_lock`. When expired, the request is passed to the SCGI server but the response will not be cached (1.1.12+). |
| `scgi_cache_max_range_offset` | `scgi_cache_max_range_offset number;` | — | http, server, location | Sets an offset in bytes for byte-range requests. If the range is beyond the offset, the request is passed to the SCGI server and not cached (1.11.6+). |
| `scgi_cache_methods` | `scgi_cache_methods GET \| HEAD \| POST ...;` | `scgi_cache_methods GET HEAD;` | http, server, location | Client request methods for which the response will be cached. GET and HEAD are always added. |
| `scgi_cache_min_uses` | `scgi_cache_min_uses number;` | `scgi_cache_min_uses 1;` | http, server, location | Number of requests after which the response will be cached. |
| `scgi_cache_path` | `scgi_cache_path path [levels=levels] [use_temp_path=on\|off] keys_zone=name:size [inactive=time] [max_size=size] [min_free=size] [manager_files=number] [manager_sleep=time] [manager_threshold=time] [loader_files=number] [loader_sleep=time] [loader_threshold=time] [purger=on\|off] [purger_files=number] [purger_sleep=time] [purger_threshold=time];` | — | http | Sets the path and parameters of a cache. Cache data stored in files (MD5 of cache key). `levels` defines directory hierarchy (1-3 levels, each 1 or 2). `keys_zone` sets shared memory zone name and size. `inactive` removes entries not accessed within time (default 10 min). `max_size` / `min_free` limits cache size. Manager/loader/purger processes configure cleanup. Purger parameters require commercial subscription. |
| `scgi_cache_purge` | `scgi_cache_purge string ...;` | — | http, server, location | Defines conditions for cache purge requests. If any string is non-empty and not "0", the cache entry matching the cache key is removed. Wildcard key (`*`) purges all matching entries. Returns 204 on success. Commercial subscription (1.5.7+). |
| `scgi_cache_revalidate` | `scgi_cache_revalidate on \| off;` | `scgi_cache_revalidate off;` | http, server, location | Enables revalidation of expired cache items using conditional requests with If-Modified-Since and If-None-Match (1.5.7+). |
| `scgi_cache_use_stale` | `scgi_cache_use_stale error \| timeout \| invalid_header \| updating \| http_500 \| http_503 \| http_403 \| http_404 \| http_429 \| off ...;` | `scgi_cache_use_stale off;` | http, server, location | Determines when a stale cached response can be used during SCGI server errors. `updating` allows serving stale while updating. Also supports Cache-Control extensions stale-while-revalidate and stale-if-error. |
| `scgi_cache_valid` | `scgi_cache_valid [code ...] time;` | — | http, server, location | Sets caching time for different response codes. `scgi_cache_valid 200 302 10m; scgi_cache_valid 404 1m;` Use `any` to cache all responses. Can be overridden by X-Accel-Expires, Expires, or Cache-Control headers. |
| `scgi_connect_timeout` | `scgi_connect_timeout time;` | `scgi_connect_timeout 60s;` | http, server, location | Timeout for establishing a connection with an SCGI server. Usually cannot exceed 75 seconds. |
| `scgi_force_ranges` | `scgi_force_ranges on \| off;` | `scgi_force_ranges off;` | http, server, location | Enables byte-range support for both cached and uncached SCGI responses regardless of Accept-Ranges header (1.7.7+). |
| `scgi_hide_header` | `scgi_hide_header field;` | — | http, server, location | Sets additional header fields that will not be passed from the SCGI server response to the client. By default, "Status" and "X-Accel-..." headers are hidden. |
| `scgi_http_version` | `scgi_http_version 1.0 \| 1.1;` | — | http, server, location | Sets the HTTP protocol version for proxying SCGI connections. |
| `scgi_ignore_client_abort` | `scgi_ignore_client_abort on \| off;` | `scgi_ignore_client_abort off;` | http, server, location | Determines whether the connection with an SCGI server should be closed when the client closes the connection without waiting for a response. |
| `scgi_ignore_headers` | `scgi_ignore_headers field ...;` | — | http, server, location | Disables processing of certain response header fields from the SCGI server: X-Accel-Redirect, X-Accel-Expires, X-Accel-Limit-Rate, X-Accel-Buffering, X-Accel-Charset, Expires, Cache-Control, Set-Cookie, Vary. |
| `scgi_index` | `scgi_index name;` | — | http, server, location | Sets the index file name for SCGI. |
| `scgi_intercept_errors` | `scgi_intercept_errors on \| off;` | `scgi_intercept_errors off;` | http, server, location | Determines whether SCGI responses with codes >= 300 should be intercepted and processed with `error_page` directive. |
| `scgi_limit_rate` | `scgi_limit_rate rate;` | `scgi_limit_rate 0;` | http, server, location | Limits the speed of reading the response from the SCGI server in bytes per second. Zero disables limiting. Works only when buffering is enabled. Supports variables (1.27.0+). |
| `scgi_max_temp_file_size` | `scgi_max_temp_file_size size;` | `scgi_max_temp_file_size 1024m;` | http, server, location | Maximum size of a temporary file when the response doesn't fit into buffers. Zero disables buffering to temporary files. |
| `scgi_next_upstream` | `scgi_next_upstream error \| timeout \| denied \| invalid_header \| http_500 \| http_503 \| http_403 \| http_404 \| http_429 \| non_idempotent \| off ...;` | `scgi_next_upstream error timeout;` | http, server, location | Specifies when a request should be passed to the next upstream server. `denied` requires commercial subscription (1.29.3+). |
| `scgi_next_upstream_timeout` | `scgi_next_upstream_timeout time;` | `scgi_next_upstream_timeout 0;` | http, server, location | Limits the time during which a request can be passed to the next server (1.7.5+). 0 = no limit. |
| `scgi_next_upstream_tries` | `scgi_next_upstream_tries number;` | `scgi_next_upstream_tries 0;` | http, server, location | Limits the number of possible tries for passing a request to the next server (1.7.5+). 0 = no limit. |
| `scgi_no_cache` | `scgi_no_cache string ...;` | — | http, server, location | Conditions under which the response will not be saved to cache. If any string is non-empty and not "0", the response is not saved. Can be used with `scgi_cache_bypass`. |
| `scgi_param` | `scgi_param parameter value [if_not_empty];` | `scgi_param HTTP_HOST $host$is_request_port$request_port;` | http, server, location | Sets a parameter passed to the SCGI server. With `if_not_empty`, the parameter is only sent if its value is non-empty (1.1.11+). Standard CGI environment variables should be provided (see `scgi_params` file). |
| `scgi_pass` | `scgi_pass address;` | — | location, if in location | Sets the address of an SCGI server. Supports domain name, IP:port, UNIX socket (`unix:/path`), or upstream server group. Parameter can contain variables (resolved via resolver if not a server group). |
| `scgi_pass_header` | `scgi_pass_header field;` | — | http, server, location | Permits passing otherwise disabled header fields from an SCGI server to a client. |
| `scgi_pass_request_body` | `scgi_pass_request_body on \| off;` | `scgi_pass_request_body on;` | http, server, location | Indicates whether the original request body is passed to the SCGI server. |
| `scgi_pass_request_headers` | `scgi_pass_request_headers on \| off;` | `scgi_pass_request_headers on;` | http, server, location | Indicates whether the header fields of the original request are passed to the SCGI server. |
| `scgi_read_timeout` | `scgi_read_timeout time;` | `scgi_read_timeout 60s;` | http, server, location | Timeout for reading a response from the SCGI server between two successive read operations. |
| `scgi_request_buffering` | `scgi_request_buffering on \| off;` | `scgi_request_buffering on;` | http, server, location | Enables or disables buffering of the client request body. When on, the entire body is read before sending to SCGI. When off, body is sent as received but the request cannot be passed to next server if sending already started (1.7.11+). |
| `scgi_request_dynamic` | `scgi_request_dynamic on \| off;` | `scgi_request_dynamic off;` | http, server, location | When enabled, creates a separate request instance for each SCGI server, allowing per-server request customization (e.g., per-server Host header). Commercial subscription (1.29.3+). |
| `scgi_send_timeout` | `scgi_send_timeout time;` | `scgi_send_timeout 60s;` | http, server, location | Timeout for transmitting a request to the SCGI server between two successive write operations. |
| `scgi_socket_keepalive` | `scgi_socket_keepalive on \| off;` | `scgi_socket_keepalive off;` | http, server, location | Configures TCP keepalive for outgoing connections to the SCGI server. When on, sets the `SO_KEEPALIVE` socket option (1.15.6+). |
| `scgi_socket_rcvbuf` | `scgi_socket_rcvbuf size;` | — | http, server, location | Sets the receive buffer size (`SO_RCVBUF`) for outgoing connections to the SCGI server. Value 0 cancels inheritance (1.31.3+). |
| `scgi_socket_sndbuf` | `scgi_socket_sndbuf size;` | — | http, server, location | Sets the send buffer size (`SO_SNDBUF`) for outgoing connections to the SCGI server. Value 0 cancels inheritance (1.31.3+). |
| `scgi_ssl_certificate` | `scgi_ssl_certificate file;` | — | http, server, location | Specifies a PEM file with the certificate for authentication to an SCGI SSL server. Supports variables in file name (1.21.0+). |
| `scgi_ssl_certificate_key` | `scgi_ssl_certificate_key file;` | — | http, server, location | Specifies a PEM file with the secret key for authentication to an SCGI SSL server. Supports `engine:name:id`, `store:scheme:id` (1.29.0+), and variables (1.21.0+). |
| `scgi_ssl_ciphers` | `scgi_ssl_ciphers ciphers;` | `scgi_ssl_ciphers DEFAULT;` | http, server, location | Specifies the enabled ciphers for requests to an SCGI SSL server. |
| `scgi_ssl_conf_command` | `scgi_ssl_conf_command name value;` | — | http, server, location | Sets arbitrary OpenSSL configuration commands when establishing a connection with the SCGI SSL server (1.19.4+). Requires OpenSSL 1.0.2+. |
| `scgi_ssl_crl` | `scgi_ssl_crl file;` | — | http, server, location | Specifies a PEM file with revoked certificates (CRL) for verifying the SCGI SSL server certificate. |
| `scgi_ssl_name` | `scgi_ssl_name name;` | host from scgi_pass | http, server, location | Overrides the server name used to verify the SCGI SSL server certificate and passed through SNI. |
| `scgi_ssl_password_file` | `scgi_ssl_password_file file;` | — | http, server, location | Specifies a file with passphrases for secret keys, one per line. Passphrases are tried in turn. |
| `scgi_ssl_protocols` | `scgi_ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3];` | `scgi_ssl_protocols TLSv1.2 TLSv1.3;` | http, server, location | Enables the specified SSL/TLS protocols for requests to an SCGI SSL server. |
| `scgi_ssl_server_name` | `scgi_ssl_server_name on \| off;` | `scgi_ssl_server_name off;` | http, server, location | Enables or disables passing the server name through TLS SNI when establishing a connection with the SCGI SSL server. |
| `scgi_ssl_session_reuse` | `scgi_ssl_session_reuse on \| off;` | `scgi_ssl_session_reuse on;` | http, server, location | Determines whether SSL sessions can be reused when working with the SCGI SSL server. Disable if "digest check failed" errors appear. |
| `scgi_ssl_trusted_certificate` | `scgi_ssl_trusted_certificate file;` | — | http, server, location | Specifies a PEM file with trusted CA certificates for verifying the SCGI SSL server certificate. |
| `scgi_ssl_verify` | `scgi_ssl_verify on \| off;` | `scgi_ssl_verify off;` | http, server, location | Enables or disables verification of the SCGI SSL server certificate. |
| `scgi_ssl_verify_depth` | `scgi_ssl_verify_depth number;` | `scgi_ssl_verify_depth 1;` | http, server, location | Sets the verification depth in the SCGI SSL server certificate chain. |
| `scgi_store` | `scgi_store on \| off \| string;` | `scgi_store off;` | http, server, location | Enables saving of files to disk. `on` saves using alias/root paths. String with variables allows explicit path. Useful for local copies of static files. |
| `scgi_store_access` | `scgi_store_access users:permissions ...;` | `scgi_store_access user:rw;` | http, server, location | Sets access permissions for newly created files and directories, e.g. `scgi_store_access user:rw group:rw all:r;` |
| `scgi_temp_file_write_size` | `scgi_temp_file_write_size size;` | `scgi_temp_file_write_size 8k\|16k;` | http, server, location | Limits the size of data written to a temporary file at a time when response buffering to temp files is enabled. Default = two buffers set by `scgi_buffer_size` and `scgi_buffers`. |
| `scgi_temp_path` | `scgi_temp_path path [level1 [level2 [level3]]];` | `scgi_temp_path scgi_temp;` | http, server, location | Defines a directory for storing temporary files with data received from SCGI servers. Up to three-level subdirectory hierarchy. |

### SCGI Variables

| Variable | Description |
|----------|-------------|
| `$scgi_path_info` | PATH_INFO value derived from `scgi_split_path_info` |
| `$scgi_script_name` | Request URI or SCRIPT_NAME value |

### SCGI Example Configuration

```nginx
http {
    scgi_cache_path /data/nginx/cache levels=1:2 keys_zone=scgi_cache:10m;

    server {
        location / {
            include scgi_params;

            scgi_pass         localhost:9000;
            scgi_cache        scgi_cache;
            scgi_cache_key    $scheme$request_uri;
            scgi_cache_valid  200 10m;
            scgi_cache_valid  404 1m;
            scgi_cache_use_stale error timeout updating;

            scgi_ssl_certificate     /etc/ssl/client.crt;
            scgi_ssl_certificate_key /etc/ssl/client.key;
        }
    }
}
```

---

## 2. uWSGI Module — Complete Reference

### Basic Configuration

```nginx
location / {
    include    uwsgi_params;
    uwsgi_pass localhost:9000;
}
```

### Directives

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| `uwsgi_allow_upstream` | `uwsgi_allow_upstream string ...;` | — | http, server, location | Access control for uwsgi server. Parameter values can contain variables. Commercial subscription (1.29.3+). |
| `uwsgi_bind` | `uwsgi_bind address [transparent] \| off;` | — | http, server, location | Makes outgoing connections originate from specified local IP/port. Supports variables. `transparent` allows non-local IP bind. `off` cancels inheritance. |
| `uwsgi_bind_dynamic` | `uwsgi_bind_dynamic on \| off;` | `uwsgi_bind_dynamic off;` | http, server, location | Performs bind at each connection attempt. Commercial subscription (1.29.3+). |
| `uwsgi_buffer_size` | `uwsgi_buffer_size size;` | `uwsgi_buffer_size 4k\|8k;` | http, server, location | Size of buffer for reading the first part of uwsgi response (header). Default = one memory page. |
| `uwsgi_buffering` | `uwsgi_buffering on \| off;` | `uwsgi_buffering on;` | http, server, location | Enables/disables buffering of responses from the uwsgi server. Can be controlled via X-Accel-Buffering header. |
| `uwsgi_buffers` | `uwsgi_buffers number size;` | `uwsgi_buffers 8 4k\|8k;` | http, server, location | Number and size of buffers for reading a response from the uwsgi server for a single connection. |
| `uwsgi_busy_buffers_size` | `uwsgi_busy_buffers_size size;` | `uwsgi_busy_buffers_size 8k\|16k;` | http, server, location | Limits total size of buffers busy sending to client while response not fully read. Default = two buffers from `uwsgi_buffer_size` and `uwsgi_buffers`. |
| `uwsgi_cache` | `uwsgi_cache zone \| off;` | `uwsgi_cache off;` | http, server, location | Defines a shared memory zone for caching. Supports variables (1.7.9+). |
| `uwsgi_cache_background_update` | `uwsgi_cache_background_update on \| off;` | `uwsgi_cache_background_update off;` | http, server, location | Allows background subrequest to update expired cache item while serving stale response (1.11.10+). |
| `uwsgi_cache_bypass` | `uwsgi_cache_bypass string ...;` | — | http, server, location | Conditions under which the response will not be taken from cache. If any string is non-empty and not "0", cache is bypassed. |
| `uwsgi_cache_key` | `uwsgi_cache_key string;` | — | http, server, location | Defines a key for caching, e.g. `uwsgi_cache_key localhost:9000$request_uri;` |
| `uwsgi_cache_lock` | `uwsgi_cache_lock on \| off;` | `uwsgi_cache_lock off;` | http, server, location | When enabled, only one request at a time populates a new cache element (1.1.12+). |
| `uwsgi_cache_lock_age` | `uwsgi_cache_lock_age time;` | `uwsgi_cache_lock_age 5s;` | http, server, location | If the last request for populating a new cache element has not completed within this time, another request may be passed (1.7.8+). |
| `uwsgi_cache_lock_timeout` | `uwsgi_cache_lock_timeout time;` | `uwsgi_cache_lock_timeout 5s;` | http, server, location | Timeout for cache lock. After timeout, request is passed but response not cached (1.1.12+). |
| `uwsgi_cache_max_range_offset` | `uwsgi_cache_max_range_offset number;` | — | http, server, location | Offset in bytes for byte-range requests. Range beyond offset triggers pass-through without caching (1.11.6+). |
| `uwsgi_cache_methods` | `uwsgi_cache_methods GET \| HEAD \| POST ...;` | `uwsgi_cache_methods GET HEAD;` | http, server, location | Client request methods for which caching is enabled. GET and HEAD always added. |
| `uwsgi_cache_min_uses` | `uwsgi_cache_min_uses number;` | `uwsgi_cache_min_uses 1;` | http, server, location | Number of requests before response is cached. |
| `uwsgi_cache_path` | `uwsgi_cache_path path [levels=levels] [use_temp_path=on\|off] keys_zone=name:size [inactive=time] [max_size=size] [min_free=size] [manager_files=number] [manager_sleep=time] [manager_threshold=time] [loader_files=number] [loader_sleep=time] [loader_threshold=time] [purger=on\|off] [purger_files=number] [purger_sleep=time] [purger_threshold=time];` | — | http | Sets cache storage path and parameters. Same parameters as `proxy_cache_path`. Purger parameters require commercial subscription. |
| `uwsgi_cache_purge` | `uwsgi_cache_purge string ...;` | — | http, server, location | Defines conditions for cache purge requests. Wildcard key (`*`) purges all matching entries. Commercial subscription (1.5.7+). |
| `uwsgi_cache_revalidate` | `uwsgi_cache_revalidate on \| off;` | `uwsgi_cache_revalidate off;` | http, server, location | Enables revalidation of expired cache items using conditional requests (1.5.7+). |
| `uwsgi_cache_use_stale` | `uwsgi_cache_use_stale error \| timeout \| invalid_header \| updating \| http_500 \| http_503 \| http_403 \| http_404 \| http_429 \| off ...;` | `uwsgi_cache_use_stale off;` | http, server, location | Determines when a stale cached response can be used during uwsgi server errors. `updating` allows serving stale while updating. |
| `uwsgi_cache_valid` | `uwsgi_cache_valid [code ...] time;` | — | http, server, location | Sets caching time for different response codes. Use `any` for all codes. |
| `uwsgi_connect_timeout` | `uwsgi_connect_timeout time;` | `uwsgi_connect_timeout 60s;` | http, server, location | Timeout for establishing connection with uwsgi server. Usually cannot exceed 75 seconds. |
| `uwsgi_force_ranges` | `uwsgi_force_ranges on \| off;` | `uwsgi_force_ranges off;` | http, server, location | Enables byte-range support regardless of Accept-Ranges header (1.7.7+). |
| `uwsgi_hide_header` | `uwsgi_hide_header field;` | — | http, server, location | Sets additional header fields not passed from uwsgi response to client. By default "Status" and "X-Accel-..." are hidden. |
| `uwsgi_http_version` | `uwsgi_http_version 1.0 \| 1.1;` | — | http, server, location | Sets the HTTP protocol version for proxying uwsgi connections. |
| `uwsgi_ignore_client_abort` | `uwsgi_ignore_client_abort on \| off;` | `uwsgi_ignore_client_abort off;` | http, server, location | Determines whether connection to uwsgi server should be closed when client aborts. |
| `uwsgi_ignore_headers` | `uwsgi_ignore_headers field ...;` | — | http, server, location | Disables processing of response headers: X-Accel-Redirect, X-Accel-Expires, X-Accel-Limit-Rate, X-Accel-Buffering, X-Accel-Charset, Expires, Cache-Control, Set-Cookie, Vary. |
| `uwsgi_intercept_errors` | `uwsgi_intercept_errors on \| off;` | `uwsgi_intercept_errors off;` | http, server, location | Intercepts uwsgi responses >= 300 for processing with `error_page`. |
| `uwsgi_limit_rate` | `uwsgi_limit_rate rate;` | `uwsgi_limit_rate 0;` | http, server, location | Limits reading speed from uwsgi server in bytes/second. Works only with buffering enabled. Supports variables (1.27.0+). |
| `uwsgi_max_temp_file_size` | `uwsgi_max_temp_file_size size;` | `uwsgi_max_temp_file_size 1024m;` | http, server, location | Maximum temp file size. Zero disables buffering to temp files. |
| `uwsgi_modifier1` | `uwsgi_modifier1 number;` | `uwsgi_modifier1 0;` | http, server, location | Sets the `modifier1` field in the uwsgi packet header. Legacy directive. |
| `uwsgi_modifier2` | `uwsgi_modifier2 number;` | `uwsgi_modifier2 0;` | http, server, location | Sets the `modifier2` field in the uwsgi packet header. Legacy directive. |
| `uwsgi_next_upstream` | `uwsgi_next_upstream error \| timeout \| denied \| invalid_header \| http_500 \| http_503 \| http_403 \| http_404 \| http_429 \| non_idempotent \| off ...;` | `uwsgi_next_upstream error timeout;` | http, server, location | Specifies when a request should be passed to the next server. `denied` requires commercial subscription (1.29.3+). |
| `uwsgi_next_upstream_timeout` | `uwsgi_next_upstream_timeout time;` | `uwsgi_next_upstream_timeout 0;` | http, server, location | Limits time for passing request to next server (1.7.5+). |
| `uwsgi_next_upstream_tries` | `uwsgi_next_upstream_tries number;` | `uwsgi_next_upstream_tries 0;` | http, server, location | Limits number of tries for passing request to next server (1.7.5+). |
| `uwsgi_no_cache` | `uwsgi_no_cache string ...;` | — | http, server, location | Conditions under which response is not saved to cache. Can be used with `uwsgi_cache_bypass`. |
| `uwsgi_param` | `uwsgi_param parameter value [if_not_empty];` | `uwsgi_param HTTP_HOST $host$is_request_port$request_port;` | http, server, location | Sets a parameter passed to the uwsgi server. With `if_not_empty` (1.1.11+), parameter sent only when non-empty. |
| `uwsgi_pass` | `uwsgi_pass [protocol://]address;` | — | location, if in location | Sets protocol (`uwsgi://` or `suwsgi://` for SSL) and address of uwsgi server. Supports UNIX sockets and upstream groups. Supports variables. |
| `uwsgi_pass_header` | `uwsgi_pass_header field;` | — | http, server, location | Permits passing otherwise disabled headers from uwsgi server to client. |
| `uwsgi_pass_request_body` | `uwsgi_pass_request_body on \| off;` | `uwsgi_pass_request_body on;` | http, server, location | Indicates whether original request body is passed to uwsgi server. |
| `uwsgi_pass_request_headers` | `uwsgi_pass_request_headers on \| off;` | `uwsgi_pass_request_headers on;` | http, server, location | Indicates whether original request headers are passed to uwsgi server. |
| `uwsgi_read_timeout` | `uwsgi_read_timeout time;` | `uwsgi_read_timeout 60s;` | http, server, location | Timeout for reading response from uwsgi server between successive read operations. |
| `uwsgi_request_buffering` | `uwsgi_request_buffering on \| off;` | `uwsgi_request_buffering on;` | http, server, location | Enables/disables buffering of client request body (1.7.11+). |
| `uwsgi_request_dynamic` | `uwsgi_request_dynamic on \| off;` | `uwsgi_request_dynamic off;` | http, server, location | Creates a separate request instance per uwsgi server for per-server customization. Commercial subscription (1.29.3+). |
| `uwsgi_send_timeout` | `uwsgi_send_timeout time;` | `uwsgi_send_timeout 60s;` | http, server, location | Timeout for transmitting request to uwsgi server between successive write operations. |
| `uwsgi_socket_keepalive` | `uwsgi_socket_keepalive on \| off;` | `uwsgi_socket_keepalive off;` | http, server, location | Configures TCP keepalive for outgoing connections (1.15.6+). |
| `uwsgi_socket_rcvbuf` | `uwsgi_socket_rcvbuf size;` | — | http, server, location | Sets receive buffer size (`SO_RCVBUF`) for outgoing connections. Value 0 cancels inheritance (1.31.3+). |
| `uwsgi_socket_sndbuf` | `uwsgi_socket_sndbuf size;` | — | http, server, location | Sets send buffer size (`SO_SNDBUF`) for outgoing connections. Value 0 cancels inheritance (1.31.3+). |
| `uwsgi_ssl_certificate` | `uwsgi_ssl_certificate file;` | — | http, server, location | PEM certificate for secured uwsgi server authentication (1.7.8+). Supports variables (1.21.0+). |
| `uwsgi_ssl_certificate_cache` | `uwsgi_ssl_certificate_cache off;` / `uwsgi_ssl_certificate_cache max=N [inactive=time] [valid=time];` | `uwsgi_ssl_certificate_cache off;` | http, server, location | Cache for SSL certificates and keys specified with variables. `max` sets max elements (LRU eviction). `inactive` default 10s. `valid` default 60s (1.27.4+). |
| `uwsgi_ssl_certificate_key` | `uwsgi_ssl_certificate_key file;` | — | http, server, location | PEM secret key for secured uwsgi server. Supports `engine:name:id`, `store:scheme:id` (1.29.0+), and variables (1.21.0+). |
| `uwsgi_ssl_ciphers` | `uwsgi_ssl_ciphers ciphers;` | `uwsgi_ssl_ciphers DEFAULT;` | http, server, location | Enabled ciphers for secured uwsgi connections (1.5.8+). |
| `uwsgi_ssl_conf_command` | `uwsgi_ssl_conf_command name value;` | — | http, server, location | Sets arbitrary OpenSSL configuration commands (1.19.4+). Requires OpenSSL 1.0.2+. |
| `uwsgi_ssl_crl` | `uwsgi_ssl_crl file;` | — | http, server, location | PEM file with revoked certificates for verifying secured uwsgi server (1.7.0+). |
| `uwsgi_ssl_key_log` | `uwsgi_ssl_key_log path;` | — | http, server, location | Enables logging of SSL keys in SSLKEYLOGFILE format (Wireshark compatible). Commercial subscription (1.27.2+). |
| `uwsgi_ssl_name` | `uwsgi_ssl_name name;` | host from uwsgi_pass | http, server, location | Overrides the server name for certificate verification and SNI (1.7.0+). |
| `uwsgi_ssl_password_file` | `uwsgi_ssl_password_file file;` | — | http, server, location | File with passphrases for secret keys, one per line (1.7.8+). |
| `uwsgi_ssl_protocols` | `uwsgi_ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2] [TLSv1.3];` | `uwsgi_ssl_protocols TLSv1.2 TLSv1.3;` | http, server, location | Enabled SSL/TLS protocols for secured uwsgi (1.5.8+). TLSv1.3 added by default since 1.23.4. |
| `uwsgi_ssl_server_name` | `uwsgi_ssl_server_name on \| off;` | `uwsgi_ssl_server_name off;` | http, server, location | Enables/disables TLS SNI for secured uwsgi connections (1.7.0+). |
| `uwsgi_ssl_session_reuse` | `uwsgi_ssl_session_reuse on \| off;` | `uwsgi_ssl_session_reuse on;` | http, server, location | Determines whether SSL sessions can be reused. Disable if "digest check failed" errors appear (1.5.8+). |
| `uwsgi_ssl_trusted_certificate` | `uwsgi_ssl_trusted_certificate file;` | — | http, server, location | PEM file with trusted CA certificates for verifying secured uwsgi server (1.7.0+). |
| `uwsgi_ssl_verify` | `uwsgi_ssl_verify on \| off;` | `uwsgi_ssl_verify off;` | http, server, location | Enables verification of secured uwsgi server certificate (1.7.0+). |
| `uwsgi_ssl_verify_depth` | `uwsgi_ssl_verify_depth number;` | `uwsgi_ssl_verify_depth 1;` | http, server, location | Verification depth in the certificate chain (1.7.0+). |
| `uwsgi_store` | `uwsgi_store on \| off \| string;` | `uwsgi_store off;` | http, server, location | Enables saving of files to disk. `on` uses alias/root paths. String with variables allows explicit path. |
| `uwsgi_store_access` | `uwsgi_store_access users:permissions ...;` | `uwsgi_store_access user:rw;` | http, server, location | Sets access permissions for stored files and directories. |
| `uwsgi_temp_file_write_size` | `uwsgi_temp_file_write_size size;` | `uwsgi_temp_file_write_size 8k\|16k;` | http, server, location | Limits data written to temp file at a time. Default = two buffers from `uwsgi_buffer_size` and `uwsgi_buffers`. |
| `uwsgi_temp_path` | `uwsgi_temp_path path [level1 [level2 [level3]]];` | `uwsgi_temp_path uwsgi_temp;` | http, server, location | Directory for temporary files with uwsgi response data. |

### uWSGI Variables

| Variable | Description |
|----------|-------------|
| `$uwsgi_path_info` | PATH_INFO value |
| `$uwsgi_script_name` | Request URI or SCRIPT_NAME value |

### uWSGI Example Configuration

```nginx
http {
    uwsgi_cache_path /data/nginx/uwsgi_cache keys_zone=uwsgi_cache:10m;

    server {
        location / {
            include uwsgi_params;

            uwsgi_pass         localhost:9000;
            uwsgi_cache        uwsgi_cache;
            uwsgi_cache_key    $scheme$request_uri;
            uwsgi_cache_valid  200 10m;

            uwsgi_buffering    on;
            uwsgi_buffers      16 4k;
            uwsgi_buffer_size  4k;
        }
    }
}
```

```nginx
# SSL-secured uwsgi
location / {
    uwsgi_pass suwsgi://localhost:9000;
    uwsgi_param UWSGI_SCHEME $scheme;

    uwsgi_ssl_certificate     /etc/ssl/client.crt;
    uwsgi_ssl_certificate_key /etc/ssl/client.key;
    uwsgi_ssl_ciphers         HIGH:!aNULL:!MD5;
}
```

---

## 3. gRPC — Missing Directives

### Directives

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| `grpc_allow_upstream` | `grpc_allow_upstream string ...;` | — | http, server, location | Defines conditions under which access to a gRPC server is allowed. Parameter values can contain variables. If all string params are non-empty and not "0", access is allowed. Commercial subscription (1.29.3+). |
| `grpc_request_dynamic` | `grpc_request_dynamic on \| off;` | `grpc_request_dynamic off;` | http, server, location | Creates a separate request instance for each gRPC server, allowing per-server customization (e.g., per-server Host header). Commercial subscription (1.29.3+). |
| `grpc_socket_rcvbuf` | `grpc_socket_rcvbuf size;` | — | http, server, location | Sets the receive buffer size (`SO_RCVBUF`) for outgoing connections to a gRPC server. Value 0 cancels inheritance (1.31.3+). |
| `grpc_socket_sndbuf` | `grpc_socket_sndbuf size;` | — | http, server, location | Sets the send buffer size (`SO_SNDBUF`) for outgoing connections to a gRPC server. Value 0 cancels inheritance (1.31.3+). |
| `grpc_ssl_certificate_cache` | `grpc_ssl_certificate_cache off;` / `grpc_ssl_certificate_cache max=N [inactive=time] [valid=time];` | `grpc_ssl_certificate_cache off;` | http, server, location | Cache for SSL certificates and keys specified with variables. `max` sets max elements (LRU eviction). `inactive` default 10s. `valid` default 60s. Certificates exceeding `valid` time are reloaded/revalidated (1.27.4+). |
| `grpc_ssl_key_log` | `grpc_ssl_key_log path;` | — | http, server, location | Enables logging of gRPC SSL server connection keys in SSLKEYLOGFILE format (Wireshark compatible). Commercial subscription (1.27.2+). |

### gRPC Example

```nginx
server {
    listen 9000 http2;

    location / {
        grpc_pass grpcs://127.0.0.1:443;

        grpc_ssl_certificate       /etc/ssl/client.crt;
        grpc_ssl_certificate_key   /etc/ssl/client.key;
        grpc_ssl_certificate_cache max=1000 inactive=20s valid=1m;

        grpc_socket_rcvbuf 65536;
        grpc_socket_sndbuf 65536;
    }
}
```

```nginx
# Per-server request customization with grpc_request_dynamic
location / {
    grpc_request_dynamic on;
    grpc_set_header      Host $upstream_last_server_name;
    grpc_pass            grpc://backend;
}
```

---

## 4. Proxy — Missing Directives

### Directives

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| `proxy_pass_trailers` | `proxy_pass_trailers on \| off;` | `proxy_pass_trailers off;` | http, server, location | Permits passing trailer fields from a proxied server to a client. Trailer section must be explicitly enabled via TE header. Trailer fields are passed as-is without interpretation (1.27.2+). |
| `proxy_request_dynamic` | `proxy_request_dynamic on \| off;` | `proxy_request_dynamic off;` | http, server, location | Creates a separate request instance for each proxied server, allowing per-server request customization (e.g., per-server Host header using `$upstream_last_server_name`). Commercial subscription (1.29.3+). |

### Proxy Example

```nginx
location / {
    proxy_pass http://backend;

    # Enable trailer passing
    proxy_http_version  1.1;
    proxy_set_header    Connection "te";
    proxy_set_header    TE "trailers";
    proxy_pass_trailers on;
}
```

```nginx
# Per-server request customization with proxy_request_dynamic
upstream backend {
    server backend1.example.com;
    server backend2.example.com;
}

location / {
    proxy_request_dynamic on;
    proxy_set_header      Host $upstream_last_server_name;
    proxy_pass            http://backend;
}
```

---

## 5. Tunnel — Missing Directives

### Directives

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| `tunnel_allow_upstream` | `tunnel_allow_upstream string ...;` | — | http, server, location | Defines conditions under which access to the backend server is allowed. Parameter values can contain variables. Commercial subscription (1.29.3+). |
| `tunnel_bind_dynamic` | `tunnel_bind_dynamic on \| off;` | `tunnel_bind_dynamic off;` | http, server, location | When enabled, makes the `tunnel_bind` operation at each connection attempt. Useful with variable-based bind addresses from geo. Commercial subscription (1.29.3+). |
| `tunnel_buffer_size` | `tunnel_buffer_size size;` | `tunnel_buffer_size 16k;` | http, server, location | Sets the buffer size used for reading data from the backend server and from the client. |
| `tunnel_request_dynamic` | `tunnel_request_dynamic on \| off;` | `tunnel_request_dynamic off;` | http, server, location | When enabled, creates a separate request instance for each tunnel backend server, allowing per-server customization. Commercial subscription (1.29.3+). |
| `tunnel_send_lowat` | `tunnel_send_lowat size;` | `tunnel_send_lowat 0;` | http, server, location | If non-zero, minimizes send operations on outgoing connections using `NOTE_LOWAT` (kqueue) or `SO_SNDLOWAT` socket option. Ignored on Linux, Solaris, and Windows. |
| `tunnel_socket_rcvbuf` | `tunnel_socket_rcvbuf size;` | — | http, server, location | Sets the receive buffer size (`SO_RCVBUF`) for outgoing connections to a backend server. Value 0 cancels inheritance (1.31.3+). |
| `tunnel_socket_sndbuf` | `tunnel_socket_sndbuf size;` | — | http, server, location | Sets the send buffer size (`SO_SNDBUF`) for outgoing connections to a backend server. Value 0 cancels inheritance (1.31.3+). |

### Tunnel Example Configuration

```nginx
http {
    map $request_port $allow_port {
        443            1;
    }

    map $host $allow_host {
        hostnames;
        example.org    1;
    }

    server {
        listen 8000;

        resolver dns.example.com;

        tunnel_pass;
        tunnel_allow_upstream $allow_port;
        tunnel_buffer_size    32k;
        tunnel_socket_rcvbuf  65536;
        tunnel_socket_sndbuf  65536;
    }
}
```

### Dynamic Bind Example

```nginx
geo $upstream_last_addr $bind_addr {
    volatile;
    10.0.0.0/24     10.0.0.1;
    192.168.0.0/24  192.168.0.1;
}

server {
    tunnel_bind         $bind_addr;
    tunnel_bind_dynamic on;
    tunnel_pass;
}
```

---

## 6. Memcached — Missing Directives

### Directives

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| `memcached_allow_upstream` | `memcached_allow_upstream string ...;` | — | http, server, location | Defines conditions under which access to a memcached server is allowed. Parameter values can contain variables. If all string params are non-empty and not "0", access is allowed. Commercial subscription (1.29.3+). |

### Memcached Example

```nginx
geo $upstream_last_addr $allow {
    volatile;
    10.10.0.0/24        1;
}

server {
    listen 127.0.0.1:8080;

    location / {
        set                    $memcached_key "$uri?$args";
        memcached_pass         host:11211;
        memcached_allow_upstream $allow;
    }
}
```
