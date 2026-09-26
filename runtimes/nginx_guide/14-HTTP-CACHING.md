# HTTP Caching

## Overview

NGINX provides caching for proxied content via multiple protocol modules: `proxy_`, `fastcgi_`, `uwsgi_`, `scgi_`, and `grpc_`. All share the same caching architecture with protocol-specific prefixes.

---

## Cache Path / Zone Configuration

### proxy_cache_path

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_path | `proxy_cache_path path [levels=levels] [use_temp_path=on\|off] keys_zone=name:size [inactive=time] [max_size=size] [min_free=size] [manager_files=number] [manager_sleep=time] [manager_threshold=time] [loader_files=number] [loader_sleep=time] [loader_threshold=time] [purger=on\|off] [purger_files=number] [purger_sleep=time] [purger_threshold=time]` | — | `http` | Sets cache path and parameters. Only `path` and `keys_zone` are required. |

**Equivalent directives:** `fastcgi_cache_path`, `uwsgi_cache_path`, `scgi_cache_path`, `grpc_cache_path`.

**Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `levels=levels` | — | Directory hierarchy levels (e.g. `1:2` creates `/c/29/...`) |
| `use_temp_path=on\|off` | `on` | If `off`, temp files go directly in cache directory (1.7.10) |
| `keys_zone=name:size` | — | Shared memory zone name and size (~8000 keys per MB) |
| `inactive=time` | `10m` | Remove cached data not accessed within this time |
| `max_size=size` | — | Max cache size; cache manager removes LRU data |
| `min_free=size` | — | Min free space on cache filesystem (1.19.1) |
| `manager_files=number` | `100` | Items deleted per iteration |
| `manager_sleep=time` | `50ms` | Pause between manager iterations |
| `manager_threshold=time` | `200ms` | Max duration per manager iteration |
| `loader_files=number` | `100` | Items loaded per iteration |
| `loader_sleep=time` | `50ms` | Pause between loader iterations |
| `loader_threshold=time` | `200ms` | Max duration per loader iteration |
| `purger=on\|off` | `off` | Enable cache purger for wildcard keys (Plus) |
| `purger_files=number` | `10` | Items scanned per purger iteration |
| `purger_sleep=time` | `50ms` | Pause between purger iterations |
| `purger_threshold=time` | `50ms` | Max duration per purger iteration |

```nginx
proxy_cache_path /data/nginx/cache levels=1:2 keys_zone=one:10m inactive=60m max_size=1g;
```

---

## Enabling Cache

### proxy_cache

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache | `proxy_cache zone \| off` | `proxy_cache off;` | `http`, `server`, `location` | Defines shared memory zone for caching. Value can contain variables (1.7.9). `off` disables caching. |

**Equivalent directives:** `fastcgi_cache`, `uwsgi_cache`, `scgi_cache`, `grpc_cache`.

---

## Cache Key

### proxy_cache_key

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_key | `proxy_cache_key string` | `proxy_cache_key $scheme$proxy_host$request_uri;` | `http`, `server`, `location` | Defines cache key. Default close to `$scheme$proxy_host$uri$is_args$args`. |

**Equivalent directives:** `fastcgi_cache_key`, `uwsgi_cache_key`, `scgi_cache_key`, `grpc_cache_key`.

```nginx
proxy_cache_key "$host$request_uri $cookie_user";
```

---

## Cache Validity

### proxy_cache_valid

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_valid | `proxy_cache_valid [code ...] time` | — | `http`, `server`, `location` | Sets caching time per response code. `any` caches all codes. |

**Equivalent directives:** `fastcgi_cache_valid`, `uwsgi_cache_valid`, `scgi_cache_valid`, `grpc_cache_valid`.

```nginx
proxy_cache_valid 200 302 10m;
proxy_cache_valid 404      1m;
proxy_cache_valid any      1m;
```

**Header-based cache control (higher priority):**
- `X-Accel-Expires`: caching time in seconds; `@` prefix for absolute epoch time; `0` disables
- `Expires` / `Cache-Control`: used if no X-Accel-Expires
- `Set-Cookie`: response will NOT be cached if present
- `Vary: *`: response NOT cached; `Vary: User-Agent`: cached with request header consideration

---

## Cache Bypass

### proxy_cache_bypass

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_bypass | `proxy_cache_bypass string ...` | — | `http`, `server`, `location` | If any string value is non-empty and non-"0", response is NOT taken from cache. |

**Equivalent directives:** `fastcgi_cache_bypass`, `uwsgi_cache_bypass`, `scgi_cache_bypass`, `grpc_cache_bypass`.

```nginx
proxy_cache_bypass $cookie_nocache $arg_nocache$arg_comment;
proxy_cache_bypass $http_pragma    $http_authorization;
```

### proxy_no_cache

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_no_cache | `proxy_no_cache string ...` | — | `http`, `server`, `location` | If any string value is non-empty and non-"0", response is NOT cached. |

**Equivalent directives:** `fastcgi_no_cache`, `uwsgi_no_cache`, `scgi_no_cache`, `grpc_no_cache`.

---

## Cache Locking

### proxy_cache_lock

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_lock | `proxy_cache_lock on \| off` | `proxy_cache_lock off;` | `http`, `server`, `location` | Only one request populates a cache element; others wait (1.1.12). |

### proxy_cache_lock_age

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_lock_age | `proxy_cache_lock_age time` | `proxy_cache_lock_age 5s;` | `http`, `server`, `location` | If cache population request hasn't completed in this time, another request may be sent (1.7.8). |

### proxy_cache_lock_timeout

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_lock_timeout | `proxy_cache_lock_timeout time` | `proxy_cache_lock_timeout 5s;` | `http`, `server`, `location` | Timeout for cache lock; after expiry, request passes to proxy but response NOT cached (1.1.12). |

---

## Stale Cache

### proxy_cache_use_stale

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_use_stale | `proxy_cache_use_stale error \| timeout \| invalid_header \| updating \| http_500 \| http_502 \| http_503 \| http_504 \| http_403 \| http_404 \| http_429 \| off ...` | `proxy_cache_use_stale off;` | `http`, `server`, `location` | Determines when a stale cached response can be used. |

**Equivalent directives:** `fastcgi_cache_use_stale`, `uwsgi_cache_use_stale`, `scgi_cache_use_stale`, `grpc_cache_use_stale`.

```nginx
proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
```

### proxy_cache_revalidate

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_revalidate | `proxy_cache_revalidate on \| off` | `proxy_cache_revalidate off;` | `http`, `server`, `location` | Enables conditional revalidation with `If-Modified-Since` and `If-None-Match` (1.5.7). |

### proxy_cache_background_update

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_background_update | `proxy_cache_background_update on \| off` | `proxy_cache_background_update off;` | `http`, `server`, `location` | Starts background subrequest to update expired cache while returning stale response to client (1.11.10). Requires `proxy_cache_use_stale updating`. |

---

## Cache Methods

### proxy_cache_methods

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_methods | `proxy_cache_methods GET \| HEAD \| POST ...` | `proxy_cache_methods GET HEAD;` | `http`, `server`, `location` | Caches responses only for listed client request methods (0.7.59). |

### proxy_cache_convert_head

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_convert_head | `proxy_cache_convert_head on \| off` | `proxy_cache_convert_head on;` | `http`, `server`, `location` | Converts HEAD to GET for caching; if off, include `$request_method` in cache key (1.9.7). |

---

## Cache Min Uses

### proxy_cache_min_uses

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_min_uses | `proxy_cache_min_uses number` | `proxy_cache_min_uses 1;` | `http`, `server`, `location` | Number of requests before response is cached. |

---

## Range Request Caching

### proxy_cache_max_range_offset

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_max_range_offset | `proxy_cache_max_range_offset number` | — | `http`, `server`, `location` | Offset in bytes for byte-range requests. Beyond this, range request passes to server uncached (1.11.6). |

---

## Cache Purging (Plus)

### proxy_cache_purge

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_cache_purge | `proxy_cache_purge string ...` | — | `http`, `server`, `location` | Defines conditions for cache purge requests. Returns 204 on success (Plus, 1.5.7). |

**Equivalent directives:** `fastcgi_cache_purge`, `uwsgi_cache_purge`, `scgi_cache_purge`, `grpc_cache_purge`.

```nginx
map $request_method $purge_method {
    PURGE   1;
    default 0;
}
proxy_cache_purge $purge_method;
```

Cache key ending with `*` performs wildcard purge; disk entries remain until purger or client access.

---

## Slice Module

The `ngx_http_slice_module` (1.9.8, `--with-http_slice_module`) splits requests into subrequests for efficient caching of large responses.

### slice

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| slice | `slice size` | `slice 0;` | `http`, `server`, `location` | Sets slice size. Zero disables. |

**Variable:** `$slice_range` — current slice range in HTTP byte range format (e.g., `bytes=0-1048575`).

```nginx
location / {
    slice             1m;
    proxy_cache       cache;
    proxy_cache_key   $uri$is_args$args$slice_range;
    proxy_set_header  Range $slice_range;
    proxy_cache_valid 200 206 1h;
    proxy_pass        http://localhost:8000;
}
```

---

## Gzip Static Module

The `ngx_http_gzip_static_module` (`--with-http_gzip_static_module`) serves precompressed `.gz` files.

### gzip_static

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_static | `gzip_static on \| off \| always` | `gzip_static off;` | `http`, `server`, `location` | Check for precompressed files. `always` serves gzipped regardless of client support (1.3.6). |

Respects `gzip_http_version`, `gzip_proxied`, `gzip_disable`, `gzip_vary`.

---

## Gunzip Module

The `ngx_http_gunzip_module` (`--with-http_gunzip_module`) decompresses gzipped responses for clients without gzip support.

### gunzip

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gunzip | `gunzip on \| off` | `gunzip off;` | `http`, `server`, `location` | Enables decompression for non-gzip clients. |

### gunzip_buffers

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gunzip_buffers | `gunzip_buffers number size` | `gunzip_buffers 32 4k\|16 8k;` | `http`, `server`, `location` | Buffer count and size for decompression. |

---

## Cache-Control via headers_module

### expires

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| expires | `expires [modified] time` \| `expires epoch \| max \| off` | `expires off;` | `http`, `server`, `location`, `if in location` | Sets `Expires` and `Cache-Control` headers. |

| Value | Expires | Cache-Control |
|-------|---------|---------------|
| positive time | `now + time` | `max-age=t` |
| negative time | `now - time` | `no-cache` |
| `epoch` | `Thu, 01 Jan 1970 00:00:01 GMT` | `no-cache` |
| `max` | `Thu, 31 Dec 2037 23:55:55 GMT` | 10 years |
| `modified + time` | file_mtime + time | `max-age=t` |
| `@15h30m` | 15:30 today | — |
| variable | dynamic value | — |

### add_header

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| add_header | `add_header name value [always]` | — | `http`, `server`, `location`, `if in location` | Adds response header field. Only added for 2xx, 3xx, 4xx (specific codes). `always` forces regardless of status. |

---

## Conditional Caching Patterns

```nginx
# Cache based on cookie/custom header
proxy_no_cache $http_x_no_cache;
proxy_cache_bypass $http_x_no_cache;

# Vary cache by language
proxy_cache_key "$scheme$host$request_uri$http_accept_language";

# Cache only GET/HEAD, bypass for authenticated users
proxy_no_cache $http_authorization;
proxy_cache_methods GET HEAD;

# Cache warming via manual requests (cron job)
# Use curl to request pages and populate cache
```

---

## Cache Status Variable

`$upstream_cache_status` values:

| Value | Description |
|-------|-------------|
| `MISS` | Response not found in cache |
| `HIT` | Fresh cache entry served |
| `EXPIRED` | Cache entry expired, new response fetched |
| `STALE` | Stale entry served due to upstream error |
| `UPDATING` | Stale entry served while background update runs |
| `REVALIDATED` | Cache entry revalidated with upstream |
| `BYPASS` | Response fetched from upstream (bypass condition met) |

---

## Complete Caching Example

```nginx
http {
    proxy_cache_path /data/nginx/cache levels=1:2 keys_zone=my_cache:10m inactive=60m max_size=1g;

    server {
        location / {
            proxy_cache my_cache;
            proxy_cache_key "$scheme$host$request_uri";
            proxy_cache_valid 200 302 10m;
            proxy_cache_valid 404 1m;
            proxy_cache_valid any 1m;
            proxy_cache_use_stale error timeout updating http_500;
            proxy_cache_background_update on;
            proxy_cache_revalidate on;
            proxy_cache_lock on;
            proxy_cache_lock_timeout 5s;
            proxy_cache_min_uses 3;
            proxy_cache_bypass $cookie_nocache $arg_nocache;
            proxy_no_cache $http_pragma $http_authorization;
            proxy_pass http://backend;
        }
    }
}
```
