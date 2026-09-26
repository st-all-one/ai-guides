# HTTP Headers and Logging

## 1. Headers Module (ngx_http_headers_module)

### add_header

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| add_header | `add_header name value [always];` | — | `http`, `server`, `location`, `if in location` | Adds response header field for codes 200, 201, 204, 206, 301, 302, 303, 304, 307, 308. `always` forces for all codes. Value can contain variables. |

Multiple `add_header` directives allowed. Inherited only if no `add_header` at current level.

### add_header_inherit

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| add_header_inherit | `add_header_inherit on \| off \| merge;` | `on` | `http`, `server`, `location`, `if in location` | Alters header inheritance rules. `merge` appends previous level values (1.29.3). |

### add_trailer

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| add_trailer | `add_trailer name value [always];` | — | `http`, `server`, `location`, `if in location` | Adds response trailer field. Same response code restrictions as add_header (1.13.2). |

### add_trailer_inherit

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| add_trailer_inherit | `add_trailer_inherit on \| off \| merge;` | `on` | `http`, `server`, `location`, `if in location` | Alters trailer inheritance rules (1.29.3). |

### expires

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| expires | `expires [modified] time` | `expires off;` | `http`, `server`, `location`, `if in location` | Adds/modifies `Expires` and `Cache-Control` headers for codes 200, 201, 204, 206, 301, 302, 303, 304, 307, 308. |
| | `expires epoch \| max \| off` | | |

| Setting | Expires | Cache-Control |
|---------|---------|---------------|
| `expires 24h;` | now + 24h | `max-age=86400` |
| `expires modified +24h;` | file_mtime + 24h | `max-age=86400` |
| `expires @15h30m;` | 15:30 today | `max-age=...` |
| `expires -1;` | past date | `no-cache` |
| `expires epoch;` | `Thu, 01 Jan 1970 00:00:01 GMT` | `no-cache` |
| `expires max;` | `Thu, 31 Dec 2037 23:55:55 GMT` | 10 years |
| `expires off;` | disabled | disabled |
| `expires $variable;` | dynamic | dynamic |

```nginx
map $sent_http_content_type $expires {
    default         off;
    application/pdf 42d;
    ~image/         max;
}
expires $expires;
```

---

## 2. Log Module (ngx_http_log_module)

### log_format

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| log_format | `log_format name [escape=default\|json\|none] string ...;` | `combined "..."` | `http` | Defines log format. Default `combined` = `$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"`. |

**escape parameter:**
- `default` — chars \x22-\x5C, \x7F-\xFF escaped as \xXX
- `json` — JSON-compliant escaping
- `none` — no escaping

```nginx
# JSON logging
log_format json escape=json '{'
    '"time_local":"$time_local",'
    '"remote_addr":"$remote_addr",'
    '"remote_user":"$remote_user",'
    '"request":"$request",'
    '"status":$status,'
    '"body_bytes_sent":$body_bytes_sent,'
    '"request_time":$request_time,'
    '"http_referrer":"$http_referer",'
    '"http_user_agent":"$http_user_agent",'
    '"http_x_forwarded_for":"$http_x_forwarded_for"'
'}';

access_log /var/log/nginx/access.json json;
```

### access_log

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| access_log | `access_log path [format [buffer=size] [gzip[=level]] [flush=time] [if=condition]];` | `access_log logs/access.log combined;` | `http`, `server`, `location`, `if in location`, `limit_except` | Sets access log path, format, buffering, gzip compression, flush interval, and conditional logging. |

**Parameters:**
- `buffer=size` — buffer log writes (e.g., `32k`)
- `gzip[=level]` — compress with gzip (level 1-9)
- `flush=time` — flush buffer after specified time
- `if=condition` — log only if condition is non-empty/zero

**Special `path` values:**
- `off` — disable access log
- `syslog:server=address[,facility=facility][,tag=tag][,severity=severity]` — syslog logging

```nginx
# Buffer with gzip
access_log /var/log/nginx/access.log combined buffer=64k gzip=3 flush=5m;

# Conditional logging
access_log /var/log/nginx/access.log combined if=$loggable;

# Syslog
access_log syslog:server=10.0.0.1:514,facility=local7,tag=nginx,severity=info combined;
```

### log_subrequest

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| log_subrequest | `log_subrequest on \| off;` | `off` | `http`, `server`, `location` | Enables logging of subrequests. |

### open_log_file_cache

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| open_log_file_cache | `open_log_file_cache max=N [inactive=time] [min_uses=N] [valid=time];` | — | `http`, `server`, `location` | Caches open file descriptors for frequently used logs. |

**Parameters:**
- `max` — max number of descriptors cached
- `inactive` — close after inactivity (default 10s)
- `min_uses` — minimum uses during inactive before caching (default 1)
- `valid` — check file existence after this time (default 60s)

```nginx
open_log_file_cache max=1000 inactive=20s valid=1m min_uses=2;
```

---

## 3. User ID Module (ngx_http_userid_module)

### userid

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| userid | `userid on \| off \| v1 \| log;` | `userid off;` | `http`, `server`, `location` | Enables client ID cookie generation. `on` = v1 + log; `v1` = set cookie; `log` = log only. |

### userid_name

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| userid_name | `userid_name name;` | `uid` | `http`, `server`, `location` | Sets cookie name. |

### userid_domain

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| userid_domain | `userid_domain name \| none;` | none | `http`, `server`, `location` | Sets cookie domain. |

### userid_path

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| userid_path | `userid_path path;` | `"/"` | `http`, `server`, `location` | Sets cookie path. |

### userid_expires

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| userid_expires | `userid_expires time \| max \| off;` | `off` (session) | `http`, `server`, `location` | Sets cookie expiration. `max` = 31 Dec 2037 23:55:55 GMT. |

### userid_flags

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| userid_flags | `userid_flags flag ...;` | — | `http`, `server`, `location` | Sets cookie flags: `secure`, `httponly`, `samesite=strict\|lax\|none`. |

### userid_p3p

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| userid_p3p | `userid_p3p string \| off;` | `off` | `http`, `server`, `location` | Sets P3P header for cookie privacy policy. |

### userid_mark

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| userid_mark | `userid_mark letter \| digit \| = \| off;` | `off` | `http`, `server`, `location` | If set, cookies are marked (second bit of first octet). Use `off` to output without mark, `=` to set marked cookie. |

### userid_service

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| userid_service | `userid_service number;` | IP of server | `http`, `server`, `location` | Sets service identifier in cookie to prevent collisions among multiple nginx instances. |

**Variables:** `$uid_set` (set cookie value), `$uid_got` (received cookie value), `$uid_reset` (non-empty = force new cookie).

```nginx
userid        on;
userid_name   cid;
userid_domain .example.com;
userid_path   /;
userid_expires max;
userid_flags  secure httponly;
```

---

## 4. Substitution Module (ngx_http_sub_module)

### sub_filter

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| sub_filter | `sub_filter string replacement;` | — | `http`, `server`, `location` | Sets a string to replace in response body (requires `--with-http_sub_module`). |

### sub_filter_last_modified

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| sub_filter_last_modified | `sub_filter_last_modified on \| off;` | `off` | `http`, `server`, `location` | Preserves `Last-Modified` header from original response (1.5.1). |

### sub_filter_once

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| sub_filter_once | `sub_filter_once on \| off;` | `on` | `http`, `server`, `location` | If on, replaces first match only; if off, replaces all. |

### sub_filter_types

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| sub_filter_types | `sub_filter_types mime-type ...;` | `text/html` | `http`, `server`, `location` | Enables substitution for specified MIME types. `*` matches all. |

```nginx
location / {
    sub_filter      </head>  '</head><script src="/analytics.js"></script>';
    sub_filter_once on;
    sub_filter_types text/html text/xml;
}
```

---

## 5. Addition Module (ngx_http_addition_module)

### add_before_body

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| add_before_body | `add_before_body uri;` | — | `http`, `server`, `location` | Adds response body before the original response (requires `--with-http_addition_module`). |

### add_after_body

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| add_after_body | `add_after_body uri;` | — | `http`, `server`, `location` | Adds response body after the original response. |

### addition_types

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| addition_types | `addition_types mime-type ...;` | `text/html` | `http`, `server`, `location` | Enables addition for specified MIME types. `*` matches all. |

```nginx
location / {
    add_before_body /before;
    add_after_body  /after;
    addition_types  text/html text/plain;
}

location = /before {
    internal;
    return 200 "<!-- before content -->";
}

location = /after {
    internal;
    return 200 "<!-- after content -->";
}
```

---

## Complete Headers and Logging Example

```nginx
http {
    # JSON log format
    log_format json escape=json '{"time":"$time_local","remote":"$remote_addr",'
        '"request":"$request","status":$status,"bytes":$body_bytes_sent,'
        '"duration":$request_time,"referer":"$http_referer",'
        '"ua":"$http_user_agent","fwd":"$http_x_forwarded_for"}';

    # Standard combined format with upstream timing
    log_format detailed '$remote_addr - $remote_user [$time_local] '
        '"$request" $status $body_bytes_sent '
        '"$http_referer" "$http_user_agent" '
        'rt=$request_time uct="$upstream_connect_time" uht="$upstream_header_time" urt="$upstream_response_time"';

    # Access log with buffering + gzip
    access_log /var/log/nginx/access.log detailed buffer=32k gzip=3 flush=5s;
    access_log /var/log/nginx/access.json json;

    # User tracking
    userid        on;
    userid_name   uid;
    userid_domain .example.com;
    userid_path   /;
    userid_expires max;
    userid_flags  secure httponly;

    # Cache open log files
    open_log_file_cache max=1000 inactive=20s valid=1m;

    server {
        listen 80;
        server_name example.com;

        # Security headers
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options DENY always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000" always;

        # Cache control
        location /static/ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        location /api/ {
            # No caching for API
            add_header Cache-Control "no-store" always;
            expires off;
            proxy_pass http://backend;
        }

        # Response body substitution
        location / {
            sub_filter '<body>' '<body><!-- injected by nginx -->';
            sub_filter_once on;
            proxy_pass http://backend;
        }
    }
}
```
