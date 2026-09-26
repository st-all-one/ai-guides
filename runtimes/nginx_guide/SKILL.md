---
name: nginx
description: >
  NGINX 1.27.x reference from official docs: process architecture,
  install/compile, core directives, HTTP (core/proxy/SSL/cache/rewrite/FastCGI/
  auth), stream TCP/UDP, mail, njs, NGINX Plus, hardening, tuning,
  troubleshooting, module development. Load when writing nginx.conf,
  configuring proxy/TLS/LB, optimizing, hardening, or debugging NGINX.
category: runtimes
version: "1.27.x"
tags: [nginx, web-server, reverse-proxy, tls, http2, http3, quic, fastcgi, stream, njs, load-balancing]
license: MIT
---

# NGINX 1.27.x

## Use When
- Installing, compiling with flags, or running NGINX in production
- Writing/validating `nginx.conf` (`http`, `server`, `location`, `stream`, `mail`)
- Reverse proxy, FastCGI/php-fpm, gRPC, WebSocket, uWSGI/SCGI
- TLS/HTTPS, HTTP/2, HTTP/3 (QUIC), OCSP, HSTS, 0-RTT, ACME
- Load balancing, upstreams, health checks, sticky sessions
- Proxy cache, gzip/gzip_static, slice, purging
- Rate limiting, auth (basic/JWT/OIDC), secure_link, realip
- njs scripting, DTrace, module development
- Hardening, tuning, troubleshooting

## Core Rules
- Edit only inside valid contexts; `events` and `http` are unique per config.
- Modularize with `include`; always run `nginx -t` before `reload`.
- TLS: `ssl_protocols TLSv1.2 TLSv1.3`, OCSP stapling, HSTS, session cache.
- HTTP/3 requires NGINX ≥1.25 built with `--with-http_v3_module` and UDP configured.
- Proxy: forward `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- Cache: `proxy_cache_path` + `proxy_cache_key`; upstream `Cache-Control` governs.
- Protect with `limit_req`/`limit_conn`; combine with `realip` behind an LB.
- Avoid complex `if` in `location`; prefer `map`/`rewrite`.
- `worker_processes auto`, size `worker_connections`, use `multi_accept`.
- Structured JSON logs via `log_format`; ship to syslog/OTel.

## Core Patterns
```nginx
worker_processes auto;
events { worker_connections 4096; multi_accept on; }

http {
  sendfile on;
  keepalive_timeout 65;
  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;

  upstream app { least_conn; server 127.0.0.1:8080; keepalive 32; }

  server {
    listen 443 ssl;
    http2 on;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_stapling on;

    location /api/ {
      proxy_pass http://app;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ { root /srv; expires 1y; add_header Cache-Control "public, immutable"; }
    location / { root /srv; try_files $uri /index.html; }
  }
}
```

```bash
nginx -t && nginx -s reload
```

## File Map
| File | Content |
|---|---|
| `00-INDEX.md` | Master index and cross-references |
| `01-ARCHITECTURE.md` | Processes, signals, events, phases, variables |
| `02-INSTALLATION.md` | Packages, `./configure`, CLI, debug log |
| `03-CONFIGURATION-BASICS.md` | Syntax, units, core/events directives |
| `10-HTTP-CORE.md` | listen/server/location/try_files/error_page |
| `11-HTTP-PROXY.md` | proxy/fastcgi/uwsgi/scgi/grpc/memcached/tunnel + WS |
| `12-HTTP-SSL.md` | SSL/TLS, H2, H3 (QUIC), OCSP, HSTS, 0-RTT |
| `13-HTTP-LOAD-BALANCING.md` | upstream, LB methods, health checks, zone sync |
| `14-HTTP-CACHING.md` | proxy/fastcgi cache, slice, gzip_static, purge |
| `15-HTTP-REWRITE.md` | rewrite/return/if, map, geo, split_clients |
| `16-HTTP-FASTCGI.md` | FastCGI, php-fpm, 60+ directives |
| `17-HTTP-SECURITY-AUTH.md` | auth_basic/request/JWT/OIDC, limit_*, realip |
| `18-HTTP-HEADERS-LOGGING.md` | add_header/expires, log_format, sub_filter |
| `19-HTTP-ADVANCED.md` | SSI, charset, image_filter, XSLT, WebDAV, mirror, njs |
| `20-HTTP-PROXY-SUPPLEMENT.md` | SCGI/uWSGI full refs, missing directives |
| `23-HTTP-ACME.md` | ACME/Let's Encrypt directives and renewal |
| `24-REFERENCE-SUPPLEMENT.md` | Browser, perl, perftools, status, vars |
| `30-STREAM.md` | TCP/UDP proxy, SSL, upstream, health, MQTT |
| `35-MAIL.md` | Mail proxy (SMTP/IMAP/POP3) |
| `40-NJS.md` / `41-NJS-EXTENDED.md` | njs scripting, TS defs, Node modules |
| `45-NGINX-PLUS.md` | Plus: mgmt, API, status, OTel, OIDC |
| `50-SECURITY-HARDENING.md` | OS/TLS/app hardening checklists |
| `51-PERFORMANCE-TUNING.md` | Workers/events/TCP/SSL/cache/H2/H3/OS |
| `52-TROUBLESHOOTING.md` | Errors, debug log, SSL, rewrite loops |
| `53-DEVELOPMENT.md` | Module development |
| `55-DTRACE.md` | DTrace probes |
| `56-FAQ.md` | FAQ |
| `99_GENERAL_EXAMPLE.md` | Consolidated example |
| `examples/` | Real-world configurations |

## Read Order
`00`→`01`→`02`→`03`; HTTP `10`–`20`; stream/mail `30`+`35`; ops `50`–`52`.

## Prereqs
HTTP, DNS, TLS, proxy, systemd basics.
