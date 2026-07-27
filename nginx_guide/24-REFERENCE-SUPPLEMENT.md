# Reference Supplement — Missing Directives & Variables

This document covers directives, variables, and modules that are not fully documented elsewhere in this guide.

---

## 1. Browser Detection Module (ngx_http_browser_module)

### Directives

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| ancient_browser_value | `ancient_browser_value string;` | `ancient_browser_value 1;` | `http`, `server`, `location` | Sets the value of the `$ancient_browser` variable when the browser is identified as ancient |
| modern_browser_value | `modern_browser_value string;` | `modern_browser_value 1;` | `http`, `server`, `location` | Sets the value of the `$modern_browser` variable when the browser is identified as modern |

### Variables

| Variable | Module | Description |
|----------|--------|-------------|
| `$modern_browser` | Browser | Equals the value set by `modern_browser_value` if the browser was identified as modern |
| `$ancient_browser` | Browser | Equals the value set by `ancient_browser_value` if the browser was identified as ancient |
| `$msie` | Browser | Equals `"1"` if the client was identified as MSIE of any version |

### Example

```nginx
modern_browser_value "modern.";
modern_browser msie 6.0;
modern_browser gecko 1.0.0;
modern_browser opera 9.0;
modern_browser safari 413;
modern_browser konqueror 3.0;

# $modern_browser will be "modern." or "1" depending on configuration
index index.${modern_browser}html index.html;

# Redirect ancient browsers
ancient_browser Links Lynx netscape4;
if ($ancient_browser) {
    rewrite ^ /old-browser.html;
}
```

---

## 2. Perl Module — perl_set

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| perl_set | `perl_set $variable module::function \| 'sub { ... }';` | — | `http` | Installs a Perl handler for the specified variable |

The directive binds a Perl function to an nginx variable. Every time the variable is referenced, the Perl handler is invoked. The function receives the nginx request object and returns the variable value.

### Example

```nginx
http {
    perl_modules /etc/nginx/perl;
    perl_require MyApp.pm;

    perl_set $my_var MyApp::handler;

    server {
        location / {
            add_header X-My-var $my_var;
        }
    }
}
```

Inline syntax is also supported:

```nginx
perl_set $greeting 'sub { my $r = shift; return "Hello, " . $r->remoteaddr; }';
```

---

## 3. Google Performance Tools (ngx_google_perftools_module)

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| google_perftools_profiles | `google_perftools_profiles file;` | — | `main` | Enables CPU profiling per worker process using gperftools |

The module requires `--with-google_perftools_module` at build time and the gperftools library at runtime.

Profiles are written as `<file>.<worker_pid>` (the worker process ID is appended after a dot).

### Example

```nginx
google_perftools_profiles /var/log/nginx/profile;
```

This creates profile files such as `/var/log/nginx/profile.1234`, `/var/log/nginx/profile.5678`, etc.

---

## 4. Session Log Module — session_log_format (Plus)

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| session_log_format | `session_log_format name string ...;` | `session_log_format combined "...";` | `http` | Specifies the output format for a session log |

This directive is part of the `ngx_http_session_log_module` (NGINX Plus). The format string uses the same variables as `log_format`. The `$body_bytes_sent` variable is aggregated across all requests in a session; all other variable values correspond to the first request in the session.

### Example

```nginx
session_log_format myformat '$remote_addr - $remote_user [$time_local] '
                           '"$request" $status $body_bytes_sent '
                           '"$http_referer" "$http_user_agent"';

session_log_zone /var/log/nginx/session.log format=myformat
                 zone=sessions:1m timeout=30s
                 md5=$binary_remote_addr$http_user_agent;

location / {
    session_log sessions;
}
```

---

## 5. Status Module — status_format (Plus)

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| status_format | `status_format json \| jsonp [callback];` | `status_format json;` | `http`, `server`, `location` | Sets the output format for the NGINX Plus status dashboard |

By default, the status page outputs JSON. When set to `jsonp`, an optional callback parameter specifies the JSONP callback function name. When set to `http`, the status page is served as an HTML dashboard.

### Example

```nginx
location = /status {
    status;
    status_format json;
    allow 10.0.0.0/8;
    deny all;
}
```

---

## 6. stub_status Directive

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| stub_status | `stub_status;` | — | `server`, `location` | Enables basic status information at the surrounding location |

Requires `--with-http_stub_status_module`. Produces a plain-text page with current connection statistics:

```
Active connections: 291
server accepts handled requests
 16630948 16630948 31070465
Reading: 6 Writing: 179 Waiting: 106
```

### Example

```nginx
location = /basic_status {
    stub_status;
    allow 127.0.0.1;
    deny all;
}
```

### Embedded Variables (1.3.14+)

These variables are provided by the module and are already documented elsewhere in this guide:

| Variable | Description |
|----------|-------------|
| `$connections_active` | Current active client connections |
| `$connections_reading` | Connections reading request headers |
| `$connections_writing` | Connections writing responses |
| `$connections_waiting` | Idle connections awaiting request |

---

## 7. limit_zone (Deprecated)

| Directive | Syntax | Default | Context | Description |
|-----------|--------|---------|---------|-------------|
| limit_zone | `limit_zone name $variable size;` | — | `http` | **Deprecated.** Defines a shared memory zone for connection limiting |

**Deprecated in 1.1.8, removed in 1.7.6.** Replaced by `limit_conn_zone`.

### Replacement syntax

```nginx
# Old syntax (do not use):
limit_zone zone_name $binary_remote_addr 10m;

# New syntax (use instead):
limit_conn_zone $binary_remote_addr zone=zone_name:10m;
```

---

## 8. Missing Variables

The following variables are referenced but not fully documented in earlier sections of this guide.

| Variable | Module | Description |
|----------|--------|-------------|
| `$date_gmt` | SSI (ngx_http_ssi_module) | Current time in GMT. The format is controlled by the `config timefmt` SSI command (default: ISO 8601-like) |
| `$date_local` | SSI (ngx_http_ssi_module) | Current time in the local time zone. The format is controlled by the `config timefmt` SSI command |
| `$msie` | Browser (ngx_http_browser_module) | Equals `"1"` if the client User-Agent matches MSIE of any version |
| `$jwt_alg` | Auth JWT (ngx_http_auth_jwt_module, Plus) | Algorithm used for JWT validation — e.g., `"HS256"`, `"RS256"`, `"ES256"`, `"EdDSA"` |

### Usage Notes

- `$date_gmt` and `$date_local` originate from the SSI module but are available as variables in any context (not limited to SSI-processed responses).
- `$msie` allows differentiating Internet Explorer clients for workarounds and compatibility handling.
- `$jwt_alg` is useful for logging the signing algorithm used in a validated JWT, or for algorithm-specific routing logic.
