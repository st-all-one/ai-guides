---
name: caddy
description: >
  Caddy 2.x operational guide: automatic HTTPS (ACME), Caddyfile and JSON,
  reverse proxy, load balancing, TLS/ECH, performance, observability, and
  production deployment. Load when configuring, debugging, or hardening Caddy,
  writing Caddyfiles, or extending Caddy with Go modules.
category: runtimes
version: "2.x"
tags: [caddy, web-server, reverse-proxy, tls, acme, https, caddyfile, json, http3, go]
license: MIT
---

# Caddy 2.x

Single static Go binary. HTTP/1.1, HTTP/2, HTTP/3 (QUIC), automatic HTTPS.

## Use When
- Installing Caddy (binary, package, Docker, `xcaddy` custom build)
- Writing/validating `Caddyfile` (directives, matchers, snippets, globals)
- Adapting config to JSON or driving the Admin API
- Automatic HTTPS, ACME, on-demand TLS, ECH, OCSP
- Reverse proxy, load balancing, health checks, streaming
- Serving SPAs, PHP-FPM, apps behind a CDN
- Logs, Prometheus/OTLP metrics, tracing, profiling
- Deploy (systemd, Docker, cluster, distributed storage)
- Extending Caddy with Go modules and custom Caddyfile directives

## Core Rules
- HTTPS is automatic when DNS resolves publicly; write `https://` to force it.
- Prefer Caddyfile for humans, JSON/Admin API for automation; `caddy adapt` to convert.
- Validate before reload: `caddy validate`; reload without downtime (`systemctl reload caddy`).
- Protect the Admin API (`:2019`); never expose it publicly.
- Reverse proxy: set `health_uri`/`health_interval`; choose `lb_policy`.
- Security: HSTS, security headers, TLS 1.2+ (prefer 1.3), OCSP stapling.
- HTTP/3 requires UDP/443 reachable; `protocols h1 h2 h3`.
- Custom builds only via `xcaddy`; never patch the official binary.

## Core Patterns
```
# Caddyfile
{
    email admin@example.com
}

example.com {
    encode zstd gzip
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options nosniff
        -Server
    }
    reverse_proxy /api/* localhost:8080 {
        health_uri /health
        lb_policy least_conn
    }
    root * /srv
    file_server
    try_files {path} /index.html
}
```

```bash
caddy run --config Caddyfile
caddy adapt --config Caddyfile --pretty    # JSON
caddy validate --config Caddyfile
caddy reload --config Caddyfile
```

## File Map
| File | Content |
|---|---|
| `README.md` | Index and overview |
| `01-installation.md` | Binary, packages, xcaddy, Docker, systemd |
| `02-fundamentals.md` | Architecture, module lifecycle, concepts |
| `03-caddyfile-reference.md` | Directives, matchers, snippets, globals |
| `04-json-configuration.md` | JSON config, Admin API, adapters |
| `05-performance.md` | Compression, buffers, timeouts, H1/H2/H3 tuning |
| `06-security-tls.md` | Auto HTTPS, ACME, TLS, ECH, on-demand TLS |
| `07-reverse-proxy.md` | reverse_proxy, LB, health checks, WebSocket |
| `08-observability.md` | Logging, Prometheus/OTLP, tracing, profiling |
| `09-deployment.md` | Docker, systemd, cluster, distributed storage |
| `10-integration-patterns.md` | PHP, SPA, CDN, delegated auth |
| `11-extending-caddy.md` | Go modules and custom directives |
| `12-troubleshooting.md` | TLS/proxy/cert errors, profiling |
| `99_EXAMPLE.md` | Consolidated example |
| `examples/` | Real configurations |

## Read Order
Setup `01`→`02`→`03`; production `09`+`06`+`05`; proxy `07`; debug `12`.

## Prereqs
HTTP, DNS, TLS, reverse proxy basics; ports 80/443 and DNS for ACME.
