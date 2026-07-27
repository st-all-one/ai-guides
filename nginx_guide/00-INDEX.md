# NGINX Documentation — Master Index

Optimized for AI reading. Derived from official nginx.org documentation.

## File Map

| #  | File | Lines | Coverage |
|----|------|-------|----------|
| 00 | [00-INDEX.md](00-INDEX.md) | — | This file |
| 01 | [01-ARCHITECTURE.md](01-ARCHITECTURE.md) | 471 | Process model, signals, events, config contexts, request/stream phases, hashes, variables |
| 02 | [02-INSTALLATION.md](02-INSTALLATION.md) | 626 | Packages, `./configure` flags, CLI switches, Windows, debug log, syslog |
| 03 | [03-CONFIGURATION-BASICS.md](03-CONFIGURATION-BASICS.md) | 889 | Syntax, units, all core/events directives, thread pools, performance basics |
| — | **——— HTTP ———** | — | — |
| 10 | [10-HTTP-CORE.md](10-HTTP-CORE.md) | 1,258 | `ngx_http_core_module` — listen/server/location/try_files/error_page/client_*/keepalive/sendfile/resolver/variables |
| 11 | [11-HTTP-PROXY.md](11-HTTP-PROXY.md) | 1,126 | proxy/fastcgi/uwsgi/scgi/grpc/memcached/tunnel + WebSocket |
| 12 | [12-HTTP-SSL.md](12-HTTP-SSL.md) | 962 | SSL/TLS, HTTPS, HTTP/2, HTTP/3 (QUIC), OCSP, HSTS, 0-RTT |
| 13 | [13-HTTP-LOAD-BALANCING.md](13-HTTP-LOAD-BALANCING.md) | 334 | upstream, 6 LB methods, health checks, sticky sessions, zone sync |
| 14 | [14-HTTP-CACHING.md](14-HTTP-CACHING.md) | 375 | proxy/fastcgi/uwsgi/scgi cache, slice, gzip_static, gunzip, cache purging |
| 15 | [15-HTTP-REWRITE.md](15-HTTP-REWRITE.md) | 396 | rewrite/return/if, map, geo, split_clients, referer, internal redirects |
| 16 | [16-HTTP-FASTCGI.md](16-HTTP-FASTCGI.md) | 1,013 | FastCGI completo: protocolo, php-fpm, todas 60+ diretivas, cache, SSL, performance, troubleshooting |
| 17 | [17-HTTP-SECURITY-AUTH.md](17-HTTP-SECURITY-AUTH.md) | 601 | access/auth_basic/auth_request/auth_JWT/OIDC, limit_conn/req, secure_link, realip, geo/geoip |
| 18 | [18-HTTP-HEADERS-LOGGING.md](18-HTTP-HEADERS-LOGGING.md) | 349 | add_header/expires, log_format/access_log, userid, sub_filter, addition |
| 19 | [19-HTTP-ADVANCED.md](19-HTTP-ADVANCED.md) | 749 | SSI/charset/image_filter/XSLT/WebDAV/autoindex/streaming/mirror/keyval/gzip/njs/Perl |
| 20 | [20-HTTP-PROXY-SUPPLEMENT.md](20-HTTP-PROXY-SUPPLEMENT.md) | 417 | SCGI/uWSGI full refs + missing grpc/proxy/tunnel/memcached directives |
| 23 | [23-HTTP-ACME.md](23-HTTP-ACME.md) | 244 | ACME/Let's Encrypt: 10 directives, variables, renewal workflow |
| 24 | [24-REFERENCE-SUPPLEMENT.md](24-REFERENCE-SUPPLEMENT.md) | 219 | Browser module, perl_set, perftools, session_log, status, stub_status, limit_zone, missing vars |
| — | **——— STREAM & MAIL ———** | — | — |
| 30 | [30-STREAM.md](30-STREAM.md) | 661 | TCP/UDP proxy, SSL, upstream, health checks, zone_sync, MQTT, all stream modules |
| 35 | [35-MAIL.md](35-MAIL.md) | 270 | Mail proxy (SMTP/IMAP/POP3), auth HTTP, SSL |
| — | **——— ADVANCED ———** | — | — |
| 40 | [40-NJS.md](40-NJS.md) | 291 | njs scripting — directives, API, shared dicts, examples |
| 41 | [41-NJS-EXTENDED.md](41-NJS-EXTENDED.md) | 320 | njs: TypeScript defs, Node.js modules, changelog summary |
| 45 | [45-NGINX-PLUS.md](45-NGINX-PLUS.md) | 268 | Plus features: mgmt/license, API, status, OTel, OIDC |
| 50 | [50-SECURITY-HARDENING.md](50-SECURITY-HARDENING.md) | 411 | OS/TLS/app hardening, rate limiting, security headers, checklists |
| 51 | [51-PERFORMANCE-TUNING.md](51-PERFORMANCE-TUNING.md) | 427 | Workers/events/TCP/SSL/gzip/cache/H2/H3/OS tuning, benchmarking |
| 52 | [52-TROUBLESHOOTING.md](52-TROUBLESHOOTING.md) | 506 | Errors, debug log, SSL issues, rewrite loops, gdb/lldb |
| 53 | [53-DEVELOPMENT.md](53-DEVELOPMENT.md) | 973 | Module dev: code layout, types, memory, events, HTTP phases, filters, upstream, style |
| 55 | [55-DTRACE.md](55-DTRACE.md) | 206 | DTrace pid provider: probes, build flags, D scripts, examples |
| 56 | [56-FAQ.md](56-FAQ.md) | 191 | FAQ: variables as macros, license/copyright, "Welcome to nginx" DNS hijacking |

## Total

**28 files · 14,607 lines** covering all aspects of NGINX configuration, derived from `nginx-docs/` (~150 HTML files, ~96K lines).

## Cross-Reference Topics

| Topic | Primary | Also In |
|-------|---------|---------|
| SSL configuration | `12-HTTP-SSL.md` | `30-STREAM.md` (stream SSL), `35-MAIL.md` (mail SSL) |
| Caching | `14-HTTP-CACHING.md` | `11-HTTP-PROXY.md` (per-module cache directives) |
| Auth methods | `17-HTTP-SECURITY-AUTH.md` | `40-NJS.md` (njs auth), `23-HTTP-ACME.md` (ACME certs) |
| Variables | `10-HTTP-CORE.md` | `12-HTTP-SSL.md` (`$ssl_*`), `11-HTTP-PROXY.md` (`$upstream_*`), `30-STREAM.md` (stream vars), `03-CONFIGURATION-BASICS.md` (naming), `24-REFERENCE-SUPPLEMENT.md` (misc vars) |
| Upstream / LB | `13-HTTP-LOAD-BALANCING.md` | `11-HTTP-PROXY.md` (proxy_pass), `30-STREAM.md` (stream upstream) |
| njs scripting | `40-NJS.md` | `19-HTTP-ADVANCED.md` (js_* directives), `30-STREAM.md` (stream js), `41-NJS-EXTENDED.md` (TS/Node) |
| gzip | `19-HTTP-ADVANCED.md` | `14-HTTP-CACHING.md` (gzip_static) |
| Rate limiting | `17-HTTP-SECURITY-AUTH.md` | `10-HTTP-CORE.md` (limit_rate) |
| ACME certs | `23-HTTP-ACME.md` | `12-HTTP-SSL.md` (SSL config), `52-TROUBLESHOOTING.md` |
| SCGI / uWSGI | `20-HTTP-PROXY-SUPPLEMENT.md` | `11-HTTP-PROXY.md` (overview), `14-HTTP-CACHING.md` |
| DTrace | `55-DTRACE.md` | `52-TROUBLESHOOTING.md` |
| FAQ | `56-FAQ.md` | `03-CONFIGURATION-BASICS.md` (variables) |
