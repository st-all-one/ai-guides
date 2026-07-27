# HTTP Security and Authentication

## 1. Access Control (ngx_http_access_module)

### allow

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| allow | `allow address \| CIDR \| unix: \| all;` | — | `http`, `server`, `location`, `limit_except` | Allows access for specified network/address. |

### deny

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| deny | `deny address \| CIDR \| unix: \| all;` | — | `http`, `server`, `location`, `limit_except` | Denies access for specified network/address. |

**Order matters:** Rules are checked in sequence until first match. Use `deny all;` as final rule.

```nginx
location / {
    deny  192.168.1.1;
    allow 192.168.1.0/24;
    deny  all;
}
```

Inheritance: child level gets no inheritance if any `allow`/`deny` is defined there.

---

## 2. Basic Auth (ngx_http_auth_basic_module)

### auth_basic

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_basic | `auth_basic string \| off;` | `auth_basic off;` | `http`, `server`, `location`, `limit_except` | Enables HTTP Basic Authentication with given realm. Value can contain variables. |

### auth_basic_user_file

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_basic_user_file | `auth_basic_user_file file;` | — | `http`, `server`, `location`, `limit_except` | Specifies htpasswd file. File name can contain variables. |

**Password formats:**
- `crypt()` — generated via `htpasswd` or `openssl passwd`
- Apache MD5 (apr1) — generated via `htpasswd`
- `{PLAIN}text` — plaintext (not recommended)
- `{SHA}base64` — SHA-1 (not recommended)
- `{SSHA}base64` — salted SHA-1

```nginx
location /admin {
    auth_basic "Restricted Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

---

## 3. Subrequest Auth (ngx_http_auth_request_module)

### auth_request

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_request | `auth_request uri \| off;` | `auth_request off;` | `http`, `server`, `location` | Enables authorization based on subrequest result (requires `--with-http_auth_request_module`). 2xx = allowed, 401/403 = denied. |

### auth_request_set

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_request_set | `auth_request_set $variable value;` | — | `http`, `server`, `location` | Sets variable from auth subrequest response (e.g., `$upstream_http_*`). |

```nginx
location /private/ {
    auth_request /auth;
    auth_request_set $user $upstream_http_x_user;
    proxy_pass http://backend;
}

location = /auth {
    internal;
    proxy_pass http://auth-server;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
}
```

---

## 4. JWT Auth (ngx_http_auth_jwt_module, Plus)

### auth_jwt

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt | `auth_jwt string [token=$variable] \| off;` | `auth_jwt off;` | `http`, `server`, `location`, `limit_except` | Enables JWT validation. Realm string can contain variables. By default reads from `Authorization: Bearer`. Optional `token` parameter specifies variable with JWT. |

### auth_jwt_key_file

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt_key_file | `auth_jwt_key_file file;` | — | `http`, `server`, `location`, `limit_except` | Specifies JWKS file for signature validation. Value can contain variables. Multiple directives allowed. |

### auth_jwt_key_request

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt_key_request | `auth_jwt_key_request uri;` | — | `http`, `server`, `location`, `limit_except` | Retrieves JWKS from subrequest (since 1.15.6). Multiple directives allowed. Cache recommended. |

### auth_jwt_key_cache

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt_key_cache | `auth_jwt_key_cache time;` | `0` (disabled) | `http`, `server`, `location` | Enables caching of JWK keys for specified time (since 1.21.4). |

### auth_jwt_type

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt_type | `auth_jwt_type signed \| encrypted \| nested;` | `signed` | `http`, `server`, `location`, `limit_except` | JWT type: JWS, JWE, or Nested JWT (since 1.19.7). |

### auth_jwt_require

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt_require | `auth_jwt_require $value ... [error=401\|403];` | — | `http`, `server`, `location`, `limit_except` | Additional validation checks. All values must be non-empty and non-"0". Default error 401 (since 1.21.2). |

### auth_jwt_claim_set

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt_claim_set | `auth_jwt_claim_set $variable name ...;` | — | `http` | Sets variable to JWT claim value identified by key names (since 1.11.10). |

### auth_jwt_header_set

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt_header_set | `auth_jwt_header_set $variable name ...;` | — | `http` | Sets variable to JOSE header parameter value (since 1.11.10). |

### auth_jwt_leeway

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt_leeway | `auth_jwt_leeway time;` | `0s` | `http`, `server`, `location` | Leeway for clock skew when verifying `exp` and `nbf` claims (since 1.13.10). |

**Supported algorithms:** HS256/384/512, RS256/384/512, ES256/384/512, EdDSA, PS256/384/512 (JWS). JWE content encryption: A128CBC-HS256, A192CBC-HS384, A256CBC-HS512, A128GCM, A192GCM, A256GCM. JWE key management: A128KW, A192KW, A256KW, A128GCMKW, A192GCMKW, A256GCMKW, dir, RSA-OAEP variants.

**JWT variables:**

| Variable | Description |
|----------|-------------|
| `$jwt_header_name` | JOSE header value |
| `$jwt_claim_name` | JWT claim value |
| `$jwt_payload` | Decrypted payload for nested/encrypted tokens |

```nginx
location /api {
    auth_jwt "API" token=$cookie_auth_token;
    auth_jwt_key_file /etc/nginx/jwks.json;
    auth_jwt_require $valid_jwt_iss error=403;
}
```

---

## 5. Auth Require (ngx_http_auth_require_module, Plus)

### auth_require

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_require | `auth_require $value ... [error=4xx\|5xx];` | `auth_require off;` | `http`, `server`, `location`, `limit_except` | Enables authorization based on variables. All must be non-empty/non-"0". Default error 403 (since 1.29.0). |

```nginx
map $oidc_claim_role $admin_role {
    "admin" 1;
}
location /admin {
    auth_require $admin_role error=403;
}
```

---

## 6. OIDC (ngx_http_oidc_module, Plus)

### oidc_provider

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| oidc_provider | `oidc_provider name { ... }` | — | `http` | Defines an OpenID Provider configuration (since 1.27.4). |

### auth_oidc

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_oidc | `auth_oidc name \| off;` | `auth_oidc off;` | `http`, `server`, `location` | Enables OIDC authentication. Value can contain variables (since 1.29.0). |

**Provider directives:**

| Directive | Default | Description |
|-----------|---------|-------------|
| `issuer URL` | — (required) | Issuer Identifier URL |
| `client_id string` | — (required) | Relying Party client ID |
| `client_secret string` | — (required) | Client secret |
| `config_url URL` | `<issuer>/.well-known/openid-configuration` | Custom metadata URL |
| `cookie_name name` | `NGX_OIDC_SESSION` | Session cookie name |
| `extra_auth_args string` | — | Additional auth request query args |
| `frontchannel_logout_uri uri` | — | Front-channel logout endpoint (1.29.3) |
| `pkce on\|off` | auto | Enable/disable PKCE (1.29.3) |
| `redirect_uri uri` | `/oidc_callback` | Redirection URI path |
| `logout_uri uri` | — | Logout initiation URI (1.29.0) |
| `post_logout_uri uri` | — | Post-logout redirect URI (1.29.0) |
| `logout_token_hint on\|off` | `off` | Add `id_token_hint` to logout (1.29.0) |
| `scope scopes` | `openid` | Requested scopes |
| `session_store name` | auto-created | Custom key-value database for sessions |
| `session_timeout time` | `8h` | Session timeout |
| `ssl_crl file` | — | CRL file for OP endpoint verification |
| `ssl_trusted_certificate file` | system CA | CA certificates for OP verification |
| `userinfo on\|off` | `off` | Enable UserInfo endpoint data download (1.29.0) |

**OIDC variables:**

| Variable | Description |
|----------|-------------|
| `$oidc_id_token` | ID token |
| `$oidc_access_token` | Access token |
| `$oidc_claim_name` | Top-level ID token or UserInfo claim |
| `$oidc_userinfo` | UserInfo data in JSON format (1.29.0) |

```nginx
http {
    resolver 10.0.0.1;

    oidc_provider my_idp {
        issuer        "https://accounts.example.com";
        client_id     "nginx-client";
        client_secret "secret";
        scope         openid email profile;
        session_timeout 4h;
    }

    server {
        location / {
            auth_oidc my_idp;
            proxy_pass http://backend;
        }
    }
}
```

---

## 7. Rate Limiting — Connections (ngx_http_limit_conn_module)

### limit_conn_zone

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_conn_zone | `limit_conn_zone key zone=name:size;` | — | `http` | Sets shared memory zone for connection limiting. |

### limit_conn

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_conn | `limit_conn zone number;` | — | `http`, `server`, `location` | Sets maximum number of connections for a zone. |

### limit_conn_log_level

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_conn_log_level | `limit_conn_log_level info \| notice \| warn \| error;` | `error` | `http`, `server`, `location` | Log level for limit_conn violations. |

### limit_conn_status

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_conn_status | `limit_conn_status code;` | `503` | `http`, `server`, `location` | Status code returned on limit_conn violation. |

### limit_conn_dry_run

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_conn_dry_run | `limit_conn_dry_run on \| off;` | `off` | `http`, `server`, `location` | Enables dry-run mode (log only, no actual limiting). |

### limit_conn_variable

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_conn_variable | `limit_conn_variable variable;` | — | `http`, `server`, `location` | Uses variable as key instead of built-in key. |

```nginx
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    location /download/ {
        limit_conn addr 1;
        limit_conn_log_level warn;
        limit_conn_status 429;
    }
}
```

---

## 8. Rate Limiting — Requests (ngx_http_limit_req_module)

### limit_req_zone

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_req_zone | `limit_req_zone key zone=name:size rate=rate [sync];` | — | `http` | Sets shared memory zone for request rate limiting. Rate format: `r/s` or `r/m`. |

### limit_req

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_req | `limit_req zone=name [burst=number] [nodelay \| delay=number];` | — | `http`, `server`, `location` | Sets rate limit with optional burst and delay. |

### limit_req_log_level

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_req_log_level | `limit_req_log_level info \| notice \| warn \| error;` | `error` | `http`, `server`, `location` | Log level for limit_req violations. |

### limit_req_status

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_req_status | `limit_req_status code;` | `503` | `http`, `server`, `location` | Status code returned on limit_req violation. |

### limit_req_dry_run

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| limit_req_dry_run | `limit_req_dry_run on \| off;` | `off` | `http`, `server`, `location` | Enables dry-run mode. |

```nginx
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
    location /login/ {
        limit_req zone=login burst=10 nodelay;
        limit_req_log_level warn;
        limit_req_status 429;
    }
}
```

---

## 9. Secure Links (ngx_http_secure_link_module)

### secure_link_secret

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| secure_link_secret | `secure_link_secret word;` | — | `location` | Defines secret word for link checksum validation (requires `--with-http_secure_link_module`). |

### secure_link

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| secure_link | `secure_link expression;` | — | `http`, `server`, `location` | Defines expression with variables for protected link validation. |

### secure_link_md5

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| secure_link_md5 | `secure_link_md5 expression;` | — | `http`, `server`, `location` | Defines expression for MD5 hash computation. |

**secure_link variables:**

| Variable | Description |
|----------|-------------|
| `$secure_link` | Empty string if link is valid, otherwise "0" |
| `$secure_link_expires` | Expiration timestamp passed in link |

```nginx
location /protected/ {
    secure_link_secret "mysecret";
    if ($secure_link = "") { return 403; }
}

# MD5-based:
location /files/ {
    secure_link $arg_md5,$arg_expires;
    secure_link_md5 "$secure_link_expires$uri$remote_addr secret";
    if ($secure_link = "") { return 403; }
}
```

---

## 10. Real IP (ngx_http_realip_module)

### set_real_ip_from

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| set_real_ip_from | `set_real_ip_from address \| CIDR \| unix:;` | — | `http`, `server`, `location` | Defines trusted addresses that can send spoofed IP headers. |

### real_ip_header

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| real_ip_header | `real_ip_header field \| X-Real-IP \| X-Forwarded-For \| proxy_protocol;` | `X-Real-IP` | `http`, `server`, `location` | Specifies header field to replace client IP. |

### real_ip_recursive

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| real_ip_recursive | `real_ip_recursive on \| off;` | `off` | `http`, `server`, `location` | If off, last address in X-Forwarded-For is used; if on, last non-trusted address is used. |

```nginx
set_real_ip_from 10.0.0.0/8;
set_real_ip_from 172.16.0.0/12;
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```

---

## 11. Browser Detection (ngx_http_browser_module)

### modern_browser

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| modern_browser | `modern_browser browser value;` | — | `http`, `server`, `location` | Specifies version for a modern browser. Browsers: `msie`, `gecko`, `opera`, `safari`, `konqueror`. |

### ancient_browser

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ancient_browser | `ancient_browser string ...;` | — | `http`, `server`, `location` | Specifies substrings for ancient browser detection. |

**Browser variables:**

| Variable | Description |
|----------|-------------|
| `$modern_browser` | "1" if modern browser |
| `$ancient_browser` | "1" if ancient browser |

```nginx
modern_browser msie 6.0;
modern_browser gecko 1.0.0;
modern_browser opera 9.0;
modern_browser safari 413;
modern_browser konqueror 3.0;

location / {
    if ($ancient_browser) {
        return 403;
    }
}
```

---

## 12. GeoIP (ngx_http_geoip_module)

The `ngx_http_geoip_module` (requires `--with-http_geoip_module`) creates variables based on client IP and MaxMind GeoIP databases.

### geoip_country

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| geoip_country | `geoip_country file;` | — | `http` | Specifies GeoIP country database file. |

### geoip_city

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| geoip_city | `geoip_city file;` | — | `http` | Specifies GeoIP city database file. |

### geoip_org

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| geoip_org | `geoip_org file;` | — | `http` | Specifies GeoIP organization database file. |

### geoip_proxy

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| geoip_proxy | `geoip_proxy address \| CIDR;` | — | `http` | Defines trusted proxy addresses for GeoIP. |

### geoip_proxy_recursive

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| geoip_proxy_recursive | `geoip_proxy_recursive on \| off;` | `off` | `http` | Enables recursive search for client IP behind trusted proxies. |

---

## 13. Geo Module (ngx_http_geo_module)

### geo

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| geo | `geo [$address] $variable { ... }` | — | `http` | Creates variable based on client IP. `$address` optional source variable (default `$remote_addr`). |

**Parameters:** `delete`, `default`, `include`, `proxy`, `proxy_recursive`, `ranges`, `volatile`

```nginx
geo $country {
    default        ZZ;
    include        geo.conf;
    proxy          192.168.100.0/24;
    127.0.0.0/24   US;
    10.1.0.0/16    RU;
}
```

---

## 14. satisfy — Combining Access Modules

### satisfy (ngx_http_core_module)

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| satisfy | `satisfy all \| any;` | `all` | `http`, `server`, `location` | `all` = all access modules must grant access; `any` = at least one must grant. |

```nginx
location / {
    satisfy any;
    allow 10.0.0.0/8;
    deny all;
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

---

## Complete Security Example

```nginx
http {
    # Geo IP mapping
    geo $blocked_country {
        default 0;
        XX 1; # block country code XX
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=conn:10m;

    # Real IP behind proxy
    set_real_ip_from 10.0.0.0/8;
    real_ip_header X-Forwarded-For;
    real_ip_recursive on;

    server {
        listen 443 ssl;
        server_name api.example.com;

        # JWT auth for API
        location /api/ {
            auth_jwt "API Access" token=$http_authorization;
            auth_jwt_key_file /etc/nginx/jwks.json;
            auth_jwt_require $valid_issuer error=403;

            limit_req zone=api burst=20 nodelay;
            limit_req_status 429;

            # Country block
            if ($blocked_country) {
                return 403;
            }

            proxy_pass http://backend;
        }

        # Admin with IP allow + basic auth
        location /admin/ {
            satisfy all;
            allow 10.0.0.0/8;
            deny all;
            auth_basic "Admin Login";
            auth_basic_user_file /etc/nginx/admin.htpasswd;
            proxy_pass http://admin-backend;
        }

        # Static files with secure links
        location /downloads/ {
            secure_link_secret "download_secret_key";
            if ($secure_link = "") {
                return 403;
            }
            root /var/www/private;
        }
    }
}
```
