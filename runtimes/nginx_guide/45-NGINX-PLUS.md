# NGINX Plus Features Reference

## ngx_mgmt_module (License & Usage Reporting)

### Overview

Mandatory for NGINX Plus since 1.27.2 (R33). Handles license verification and usage reporting to F5.

**License file**: `license.jwt` at `/etc/nginx/` (Linux) or `/usr/local/etc/nginx/` (FreeBSD).

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mgmt | `mgmt { ... }` | — | main | License management context |
| enforce_initial_report | `enforce_initial_report on\|off` | on | mgmt | 180-day grace period for initial report |
| license_token | `license_token file` | license.jwt | mgmt | JWT license file path |
| proxy | `proxy host:port` | — | mgmt | HTTP CONNECT proxy for reports |
| proxy_username | `proxy_username string` | — | mgmt | Proxy auth username |
| proxy_password | `proxy_password string` | — | mgmt | Proxy auth password |
| resolver | `resolver address ... [params]` | — | mgmt | DNS for reporting endpoint |
| ssl_crl | `ssl_crl file` | — | mgmt | CRL for endpoint verification |
| ssl_trusted_certificate | `ssl_trusted_certificate file` | system CA bundle | mgmt | CA for endpoint verification |
| ssl_verify | `ssl_verify on\|off` | on | mgmt | Verify endpoint certificate |
| state_path | `state_path path` | /var/lib/nginx/state or /var/db/nginx/state | mgmt | State files directory |
| usage_report | `usage_report [endpoint=address] [interval=time]` | endpoint=product.connect.nginx.com interval=1h | mgmt | Reporting configuration |

### Automatic License Renewal

Since 1.29.0 (R35), instances reporting directly to F5 can auto-renew their license without reload.

---

## ngx_otel_module (OpenTelemetry)

### Overview

Provides distributed tracing support with W3C context propagation and OTLP/gRPC export. Available as `nginx-module-otel` package (1.25.3+) or `nginx-plus-module-otel` (1.23.4+).

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| otel_exporter | `otel_exporter { ... }` | — | http | OTel export parameters |
| otel_service_name | `otel_service_name name` | unknown_service:nginx | http | Service name attribute |
| otel_resource_attr | `otel_resource_attr name value` | — | http | Custom resource attribute (0.1.2) |
| otel_trace | `otel_trace on\|off\|$variable` | off | http, server, location | Enable tracing |
| otel_trace_context | `otel_trace_context extract\|inject\|propagate\|ignore` | ignore | http, server, location | Trace context propagation |
| otel_span_name | `otel_span_name name` | location name | http, server, location | Span name |
| otel_span_attr | `otel_span_attr name value` | — | http, server, location | Custom span attribute |

### otel_exporter Parameters

| Parameter | Description |
|-----------|-------------|
| `endpoint [(http\|https)://]host:port` | OTLP/gRPC endpoint |
| `trusted_certificate path` | CA cert for TLS (0.1.2) |
| `header name value` | Custom header (0.1.2) |
| `interval time` | Export interval (default: 5s) |
| `batch_size number` | Max spans per batch (default: 512) |
| `batch_count number` | Pending batches (default: 4) |

### otel_trace_context Values

| Value | Description |
|-------|-------------|
| `extract` | Use existing trace context from request |
| `inject` | Add new context, overwrite existing |
| `propagate` | Combine extract and inject |
| `ignore` | Skip context processing |

### Default Span Attributes

- `http.method`, `http.target`, `http.route`, `http.scheme`, `http.flavor`
- `http.user_agent`, `http.request_content_length`, `http.response_content_length`
- `http.status_code`, `net.host.name`, `net.host.port`
- `net.sock.peer.addr`, `net.sock.peer.port`

### OTel Variables

| Variable | Description |
|----------|-------------|
| `$otel_trace_id` | Current trace identifier |
| `$otel_span_id` | Current span identifier |
| `$otel_parent_id` | Parent span identifier |
| `$otel_parent_sampled` | Parent sampled flag (1 or 0) |

---

## ngx_http_api_module

### Overview

REST API (since 1.13.3) for status information, dynamic upstream configuration, and key-value management. **Plus only**. Supersedes `ngx_http_status_module` and `ngx_http_upstream_conf_module`. Current API version: `9`.

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| api | `api [write=on\|off]` | — | location | Enable REST API |
| status_zone | `status_zone zone` | — | server, location, if | Collect server status |

### API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/` | GET | List root endpoints |
| `/nginx` | GET | NGINX version, build, uptime |
| `/processes` | GET, DELETE | Process spawn/respawn stats |
| `/connections` | GET, DELETE | Connection stats |
| `/slabs/` | GET | All slab allocator zones |
| `/slabs/{name}` | GET, DELETE | Specific slab zone |
| `/http/` | GET | HTTP-related endpoint list |
| `/http/requests` | GET, DELETE | HTTP request stats |
| `/http/server_zones/` | GET | All HTTP server zones |
| `/http/server_zones/{name}` | GET, DELETE | Specific server zone |
| `/http/location_zones/` | GET | All HTTP location zones |
| `/http/location_zones/{name}` | GET, DELETE | Specific location zone |
| `/http/caches/` | GET | All cache zones |
| `/http/caches/{name}` | GET, DELETE | Specific cache |
| `/http/limit_conns/` | GET | All limit_conn zones |
| `/http/limit_conns/{name}` | GET, DELETE | Specific limit_conn zone |
| `/http/limit_reqs/` | GET | All limit_req zones |
| `/http/limit_reqs/{name}` | GET, DELETE | Specific limit_req zone |
| `/http/upstreams/` | GET | All upstream groups |
| `/http/upstreams/{name}/` | GET, DELETE | Specific upstream |
| `/http/upstreams/{name}/servers/` | GET, POST | Server list, add server |
| `/http/upstreams/{name}/servers/{id}` | GET, PATCH, DELETE | Specific server |
| `/http/keyvals/` | GET | All keyval zones |
| `/http/keyvals/{name}` | GET, POST, PATCH, DELETE | Keyval zone operations |
| `/stream/` | GET | Stream endpoint list |
| `/stream/server_zones/` | GET | All stream server zones |
| `/stream/server_zones/{name}` | GET, DELETE | Specific stream server zone |
| `/stream/upstreams/` | GET | All stream upstreams |
| `/stream/upstreams/{name}/` | GET, DELETE | Specific stream upstream |
| `/stream/upstreams/{name}/servers/` | GET, POST | Server list, add |
| `/stream/upstreams/{name}/servers/{id}` | GET, PATCH, DELETE | Specific server |
| `/stream/keyvals/` | GET | All stream keyval zones |
| `/stream/keyvals/{name}` | GET, POST, PATCH, DELETE | Stream keyval operations |
| `/stream/zone_sync/` | GET | Zone sync status |

### API Filtering

Use `?fields=field1,field2` to limit output fields.

---

## ngx_http_status_module

Superseded by `ngx_http_api_module`. Provides `status_zone` directive for server zone statistics.

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| status | `status` | — | location | Enable status page (legacy) |
| status_zone | `status_zone zone` | — | server | Collect statistics |

---

## ngx_http_auth_jwt_module (Plus)

### Overview

Enables JWT authentication for HTTP requests. Validates RS256/RS384/RS512, ES256/ES384/ES512, and HS256/HS384/HS512 signed tokens.

### Key Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| auth_jwt | `auth_jwt string [token=$variable]` | — | http, server, location | Enable JWT validation |
| auth_jwt_require | `auth_jwt_require $variable [error=value]` | — | http, server, location | Additional validation |
| auth_jwt_claim_set | `auth_jwt_claim_set $variable claim ...` | — | http, server, location | Extract claim to variable |
| auth_jwt_header_set | `auth_jwt_header_set $variable header ...` | — | http, server, location | Extract header to variable |
| auth_jwt_key_cache | `auth_jwt_key_cache time` | 0 | http, server, location | JWK cache duration (1.25.5) |
| auth_jwt_key_file | `auth_jwt_key_file file` | — | http, server, location | JSON key file |
| auth_jwt_key_request | `auth_jwt_key_request url` | — | http, server, location | Key endpoint |
| auth_jwt_type | `auth_jwt_type signed\|encrypted` | signed | http, server, location | JWT type (1.25.3) |

### Variables

| Variable | Description |
|----------|-------------|
| `$jwt_header_*` | JOSE header values |
| `$jwt_claim_*` | JWT claim values |
| `$jwt_payload` | Decoded payload |
| `$jwt_alg` | Algorithm used |

---

## ngx_http_oidc_module (Plus)

### Overview

OpenID Connect authentication module. Validates identity tokens from OIDC providers.

### Directives

| Name | Syntax | Context |
|------|--------|---------|
| auth_oidc | `auth_oidc provider_name` | location |
| oidc_provider | `oidc_provider name { ... }` | http |

### oidc_provider Parameters

| Parameter | Description |
|-----------|-------------|
| `client_id` | OAuth2 client ID |
| `client_secret` | OAuth2 client secret |
| `issuer` | OIDC issuer URL |
| `authorization_endpoint` | Auth endpoint |
| `token_endpoint` | Token endpoint |
| `jwks_uri` | JWKS URI |
| `userinfo_endpoint` | UserInfo endpoint |
| `scopes` | Required scopes |
| `set` | Claim mapping |

---

## ngx_http_acme_module (Plus)

### Overview

Automatic Certificate Management Environment (ACME) support for Let's Encrypt automated certificate provisioning and renewal.

### Directives

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| acme_client | `acme_client name { ... }` | — | http | ACME client configuration |
| acme_eab_credentials | `acme_eab_credentials file` | — | http | External Account Binding credentials |
| acme_dns01_callback | `acme_dns01_callback path` | — | http | DNS-01 challenge webhook |
| acme_dns01_wait | `acme_dns01_wait time` | 30s | http | DNS propagation wait time |
| acme_renew_threshold | `acme_renew_threshold days` | 30d | http, server | Days before expiry to renew |
| acme | `acmes name` | — | http, server | Enable ACME for a certificate |

### acme_client Parameters

| Parameter | Description |
|-----------|-------------|
| `directory` | ACME directory URL (e.g., `https://acme-v02.api.letsencrypt.org/directory`) |
| `key_type` | `rsa` or `ecdsa` |
| `rsa_key_size` | RSA key size (default: 2048) |
| `ecdsa_key_type` | ECDSA curve (default: `P-256`) |
| `certificate` | Certificate output file |
| `certificate_key` | Private key output file |
| `terms_of_service` | Accept ToS |

### Example

```
http {
    acme_client myacme {
        directory https://acme-v02.api.letsencrypt.org/directory;
        key_type  ecdsa;
        certificate /etc/nginx/certs/example.com.crt;
        certificate_key /etc/nginx/certs/example.com.key;
    }

    server {
        listen 443 ssl;
        server_name example.com;
        ssl_certificate /etc/nginx/certs/example.com.crt;
        ssl_certificate_key /etc/nginx/certs/example.com.key;
        acme myacme;
    }
}
```
