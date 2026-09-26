# HTTP Rewrite Module

## Overview

The `ngx_http_rewrite_module` changes request URI using PCRE regex, returns redirects, and conditionally selects configurations.

**Processing order:**
1. Server-level directives execute sequentially.
2. Location is found based on URI.
3. Location-level directives execute sequentially.
4. If URI was rewritten, loop repeats (max 10 times).

---

## Directives

### break

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| break | `break;` | — | `server`, `location`, `if` | Stops processing the current set of rewrite module directives. |

### if

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| if | `if (condition) { ... }` | — | `server`, `location` | Evaluates condition; if true, executes inner directives and assigns inner config. |

**Conditions:**
- Variable name: false if empty or `"0"`
- `=` / `!=` comparison of variable with string
- `~` (case-sensitive) / `~*` (case-insensitive) regex match; captures in `$1`..`$9`
- `!~` / `!~*` negative regex match
- `-f` / `!-f` file existence check
- `-d` / `!-d` directory existence check
- `-e` / `!-e` file/dir/symlink existence check
- `-x` / `!-x` executable check

**When `if` is safe to use:**
- `return` codes
- `rewrite` with `last` or `break` flag
- `set` variable assignments
- `deny` / `allow`

**When NOT to use if:**
- Inside location for anything other than return/rewrite/set
- With `proxy_pass` directly inside if (use `try_files` or map instead)

### return

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| return | `return code [text];` | — | `server`, `location`, `if` | Stops processing and returns code to client. |
| | `return code URL;` | | | Redirect URL (301, 302, 303, 307, 308). |
| | `return URL;` | | | Temporary redirect (302) with absolute URL starting with `http://`, `https://`, or `$scheme`. |

**Common codes:**
- 301 Moved Permanently
- 302 Moved Temporarily
- 303 See Other
- 307 Temporary Redirect (keeps method)
- 308 Permanent Redirect (keeps method)
- 444 Close connection without response (non-standard)

```nginx
return 301 https://$host$request_uri;
return 200 "OK";
return 302 /redirect/target;
```

### rewrite

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| rewrite | `rewrite regex replacement [flag];` | — | `server`, `location`, `if` | If regex matches request URI, changes URI to replacement string. |

**Flags:**

| Flag | Description |
|------|-------------|
| `last` | Stops rewrite processing and searches for new location matching changed URI. |
| `break` | Stops rewrite processing; continues request with new URI in current location. |
| `redirect` | Returns 302 temporary redirect (when replacement doesn't start with `http://`). |
| `permanent` | Returns 301 permanent redirect. |

```nginx
rewrite ^(/download/.*)/media/(.*)\..*$ $1/mp3/$2.mp3 last;
rewrite ^/users/(.*)$ /show?user=$1? last;  # trailing ? discards old query args
```

### rewrite_log

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| rewrite_log | `rewrite_log on \| off` | `rewrite_log off;` | `http`, `server`, `location`, `if` | Logs rewrite processing results at `notice` level to error_log. |

### set

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| set | `set $variable value;` | — | `server`, `location`, `if` | Assigns a value (text, variables, combinations) to a variable. |

### uninitialized_variable_warn

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| uninitialized_variable_warn | `uninitialized_variable_warn on \| off` | `on` | `http`, `server`, `location`, `if` | Controls warnings about uninitialized variables. |

---

## Internal Redirects

### error_page

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| error_page | `error_page code ... [=[response]] uri;` | — | `http`, `server`, `location`, `if in location` | Defines URI to show for specified errors. Internal redirect. |

```nginx
error_page 404             /404.html;
error_page 500 502 503 504 /50x.html;
error_page 404 =200        /empty.gif;   # change response code
error_page 404 =           /404.php;     # preserve original status
```

### try_files

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| try_files | `try_files file ... uri;` | — | `location` | Checks files in order; uses first that exists. Last parameter can be a fallback URI, named location (`@name`), or status code (`=code`). Performs internal redirect. |

```nginx
location / {
    try_files $uri $uri/ /index.php?$args;
}

location @fallback {
    proxy_pass http://backend;
}
```

### Named Locations

Named locations (e.g., `@name`) are used with `try_files`, `error_page`, and `X-Accel-Redirect`.

```nginx
error_page 404 @fallback;
location @fallback {
    proxy_pass http://backend;
}
```

### X-Accel-Redirect

Response header `X-Accel-Redirect` triggers an internal redirect to the specified URI. Only valid for responses from upstream/FastCGI servers.

---

## Redirect Types

| Type | Description |
|------|-------------|
| Absolute redirect | Full URL including scheme and host (default) |
| Relative redirect | Path only (set `absolute_redirect off;`) |
| Server-relative | `return 301 $scheme://$host$request_uri;` — preserves host and URI |

### absolute_redirect

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| absolute_redirect | `absolute_redirect on \| off` | `on` | `http`, `server`, `location` | If off, redirects are relative. |

---

## Map Module

### map

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| map | `map string $variable { ... }` | — | `http` | Creates variable depending on values of source variables. |

```nginx
map $http_host $name {
    hostnames;
    default       0;
    example.com   1;
    *.example.com 1;
}

map $http_user_agent $mobile {
    default       0;
    "~Opera Mini" 1;
}
```

**Special parameters:** `default value`, `hostnames`, `include file`, `volatile`

**Match priority:**
1. String value without mask
2. Longest prefix mask (`*.example.com`)
3. Longest suffix mask (`mail.*`)
4. First matching regex
5. Default value

### map_hash_bucket_size

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| map_hash_bucket_size | `map_hash_bucket_size size` | 32\|64\|128 | `http` | Bucket size for map hash tables. |

### map_hash_max_size

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| map_hash_max_size | `map_hash_max_size size` | `2048` | `http` | Max size for map hash tables. |

---

## Geo Module

### geo

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| geo | `geo [$address] $variable { ... }` | — | `http` | Creates variable based on client IP address (defaults to `$remote_addr`). |

**Special parameters:** `delete`, `default`, `include`, `proxy`, `proxy_recursive`, `ranges`, `volatile`

```nginx
geo $country {
    default        ZZ;
    include        conf/geo.conf;
    proxy          192.168.100.0/24;
    127.0.0.0/24   US;
    10.1.0.0/16    RU;
}
```

With `ranges`, addresses are specified as `start-end` ranges.

---

## Split Clients Module (A/B Testing)

### split_clients

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| split_clients | `split_clients string $variable { ... }` | — | `http` | Creates variable for A/B testing using MurmurHash2. |

```nginx
split_clients "${remote_addr}AAA" $variant {
    0.5%               .one;
    2.0%               .two;
    *                  "";
}
```

---

## Referer Module

### valid_referers

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| valid_referers | `valid_referers none \| blocked \| server_names \| string ...` | — | `server`, `location` | Specifies valid `Referer` header values. Sets `$invalid_referer` variable. |

**Parameters:**
- `none` — Referer header missing
- `blocked` — Referer present but value doesn't start with `http://` or `https://`
- `server_names` — Referer contains one of the server names
- `string` — server name with optional `*` wildcard or URI prefix
- `~regex` — regular expression match

```nginx
valid_referers none blocked server_names *.example.com ~\.google\.;
if ($invalid_referer) {
    return 403;
}
```

### referer_hash_bucket_size / referer_hash_max_size

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| referer_hash_bucket_size | `referer_hash_bucket_size size` | `64` | `server`, `location` |
| referer_hash_max_size | `referer_hash_max_size size` | `2048` | `server`, `location` |

### Embedded Variables

| Variable | Description |
|----------|-------------|
| `$invalid_referer` | Empty string if Referer is valid; `"1"` otherwise. |

---

## Converting Apache Rewrite Rules

**Bad pattern** (using if inside server):
```nginx
# DON'T do this:
if ($http_host = example.org) {
    rewrite (.*) http://www.example.com$1;
}
```

**Correct pattern** (separate server blocks):
```nginx
server {
    listen       80;
    server_name  example.org;
    return       301 http://www.example.com$request_uri;
}

server {
    listen       80;
    server_name  www.example.org;
    # ...
}
```

**Using try_files instead of file-check rewrites:**
```nginx
# Apache: RewriteCond %{REQUEST_FILENAME} -f → RewriteRule ^(.*)$ $1
location / {
    try_files $uri $uri/index.html $uri.html @backend;
}

location @backend {
    proxy_pass http://mongrel;
}
```

---

## Complete Rewrite Example

```nginx
server {
    listen 80;
    server_name example.com;

    # Force HTTPS redirect
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com www.example.com;

    # Map user agent to mobile flag
    map $http_user_agent $is_mobile {
        default   0;
        "~Mobile" 1;
        "~Android" 1;
    }

    location / {
        # A/B testing variant
        split_clients "${remote_addr}${http_user_agent}" $ab_variant {
            10%  "-beta";
            *    "";
        }

        # Try files, then PHP
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        rewrite_log on;
        rewrite ^/old/(.*)$ /new/$1 last;

        fastcgi_pass unix:/var/run/php.sock;
        include fastcgi_params;
    }

    location /admin/ {
        # IP-based access
        geo $restricted {
            default 1;
            10.0.0.0/8 0;
        }
        if ($restricted) {
            return 403;
        }
    }

    # Custom error page
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }
}
```
