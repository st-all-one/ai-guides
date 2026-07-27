NGINX Documentation Guide
=========================

Optimized for AI reading and human reference. Derived from the official
nginx.org documentation (~150 HTML files, ~96K lines), condensed into
focused markdown files (~14.6K lines) plus real-world examples.


Quick start
-----------
Start here depending on what you need:

  ┌─ I want a ready-to-run config ──────────────────────────────┐
  │                                                              │
  │   1. Read 99_GENERAL_EXAMPLE.md for a baseline config.       │
  │   2. Pick an example from examples/ matching your stack.     │
  │   3. Adapt the example to your project, then:                │
  │        nginx -t && nginx -s reload                           │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌─ I need to configure a specific feature ────────────────────┐
  │                                                              │
  │   Browse 00-INDEX.md for the file covering your topic.       │
  │   Every file follows the same structure:                     │
  │     • Directive reference (syntax, default, context, notes)  │
  │     • Use-case examples                                      │
  │     • Performance and security guidance                      │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌─ I'm new to NGINX ──────────────────────────────────────────┐
  │                                                              │
  │   01-ARCHITECTURE.md       →  How NGINX works                │
  │   02-INSTALLATION.md       →  Install from packages or src   │
  │   03-CONFIGURATION-BASICS.md→ Syntax, core directives        │
  │   10-HTTP-CORE.md          →  The HTTP module (listen,       │
  │                              server, location, variables)    │
  │   50-SECURITY-HARDENING.md →  Secure your deployment         │
  │   51-PERFORMANCE-TUNING.md →  Tune for production            │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘


Guide structure
---------------
The documentation is organized into six sections, each with a
numerical prefix for ordering.

### Foundation (00–03)
| File | Covers |
|------|--------|
| 00-INDEX.md | Master index with cross-reference table |
| 01-ARCHITECTURE.md | Process model, signals, event loop, config contexts |
| 02-INSTALLATION.md | Packages, configure flags, CLI, Windows, debug log |
| 03-CONFIGURATION-BASICS.md | Syntax, core/events directives, variables |

### HTTP Modules (10–24)
| File | Covers |
|------|--------|
| 10-HTTP-CORE.md | listen, server, location, try_files, error_page, client_* |
| 11-HTTP-PROXY.md | proxy_pass, FastCGI, uWSGI, SCGI, gRPC, WebSocket |
| 12-HTTP-SSL.md | SSL/TLS, HTTP/2, HTTP/3 (QUIC), OCSP, HSTS, 0-RTT |
| 13-HTTP-LOAD-BALANCING.md | upstream, 6 LB methods, health checks, sticky |
| 14-HTTP-CACHING.md | proxy/FastCGI cache, slice, gzip_static, purging |
| 15-HTTP-REWRITE.md | rewrite, return, if, map, geo, referer |
| 16-HTTP-FASTCGI.md | FastCGI protocol, PHP-FPM, 60+ directives, cache |
| 17-HTTP-SECURITY-AUTH.md | access, auth_basic, auth_jwt, limit_*, realip |
| 18-HTTP-HEADERS-LOGGING.md | add_header, log_format, userid, sub_filter |
| 19-HTTP-ADVANCED.md | SSI, charset, image_filter, gzip, njs, Perl |
| 20-HTTP-PROXY-SUPPLEMENT.md | SCGI/uWSGI/gRPC/memcached references |
| 23-HTTP-ACME.md | ACME/Let's Encrypt automation |
| 24-REFERENCE-SUPPLEMENT.md | Browser vars, stub_status, session_log |

### Stream & Mail (30–35)
| File | Covers |
|------|--------|
| 30-STREAM.md | TCP/UDP proxy, SSL, upstream, zone_sync, MQTT |
| 35-MAIL.md | SMTP/IMAP/POP3 proxy, auth HTTP |

### Advanced (40–45)
| File | Covers |
|------|--------|
| 40-NJS.md | njs scripting, API, shared dicts |
| 41-NJS-EXTENDED.md | TypeScript defs, Node modules, changelog |
| 45-NGINX-PLUS.md | Plus features: API, status, OTel, OIDC |

### Operations (50–56)
| File | Covers |
|------|--------|
| 50-SECURITY-HARDENING.md | OS/TLS/app hardening, checklists |
| 51-PERFORMANCE-TUNING.md | Workers, events, TCP, SSL, cache, H2/H3 |
| 52-TROUBLESHOOTING.md | Errors, debug log, SSL, gdb/lldb |
| 53-DEVELOPMENT.md | Module development (types, phases, filters) |
| 55-DTRACE.md | DTrace pid provider probes |
| 56-FAQ.md | Variables, license, DNS hijacking |

### Examples (examples/)
| File | Stack |
|------|-------|
| php72-laravel55.md | PHP 7.2 + Laravel 5.5 + FastCGI + HTTP/3 |
| php72-laravel55-http2.md | Same, optimized for HTTP/2 only |
| wordpress-php74.md | WordPress + PHP 7.4 + FastCGI cache |
| static-spa-http3.md | SPA estático + HTTP/3 + Brotli |
| api-gateway.md | API Gateway + rate limiting + cache |
| rust-htmx-askama.md | Rust/Axum + htmx + Askama + HTTP/3 |

### Other files
| File | Purpose |
|------|---------|
| VERSION | NGINX version covered by this guide |
| 99_GENERAL_EXAMPLE.md | Baseline config with enrichment guidance |


How to read a guide file
-------------------------
Every module file follows this pattern:

  1. Overview — what the module does, when to use it.
  2. Directive table — sorted by function:
       Directive          Syntax              Default        Context
       ───────────────────────────────────────────────────────────────
       proxy_pass         proxy_pass url;     —              location
  3. Use-case configs — practical, ready-to-adapt examples.
  4. Performance guidance — buffer sizes, timeouts, tuning.
  5. Security notes — common pitfalls and mitigations.
  6. Troubleshooting — frequent errors with root cause and fix.
  7. Cross-references — links to related files.

Variables appear inline as `$variable_name` with context notes.


Cross-reference topics
----------------------
| Topic             | Primary         | Also in                         |
|-------------------|-----------------|---------------------------------|
| SSL               | 12-HTTP-SSL.md  | 30-STREAM.md, 35-MAIL.md       |
| Caching           | 14-HTTP-CACHING.md| 11-HTTP-PROXY.md              |
| Auth              | 17-HTTP-SECURITY-AUTH.md| 40-NJS.md, 23-HTTP-ACME.md|
| Variables         | 10-HTTP-CORE.md | 12, 11, 30, 03, 24             |
| Load balancing    | 13-HTTP-LOAD-BALANCING.md| 11, 30               |
| njs               | 40-NJS.md       | 19-HTTP-ADVANCED.md, 30        |
| Rate limiting     | 17-HTTP-SECURITY-AUTH.md| 10-HTTP-CORE.md        |


Validation workflow
-------------------
After any change:

  nginx -t              # validate syntax
  nginx -T              # validate + print full config (for review)
  nginx -s reload       # apply without downtime

Monitor with:

  curl -I https://your.domain               # check security headers
  curl -I --http3 https://your.domain       # check HTTP/3 (if enabled)
  tail -f /var/log/nginx/access.log         # watch live traffic
  tail -f /var/log/nginx/error.log          # watch errors


Contributing
------------
This guide is maintained alongside the examples/ directory. When
adding a new example, follow the existing structure (overview,
annotated config, infrastructure notes, security checklist,
references) and register it in examples/00-INDEX.md and this
README.md.

Source: https://nginx.org/en/docs/
