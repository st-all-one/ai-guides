99_GENERAL_EXAMPLE.md
======================

Recommended Baseline Configuration

  This file provides a production-ready, general-purpose NGINX
  configuration that balances performance, security, and stability.
  Each block is annotated with enrichment guidance -- concrete
  directives to add depending on your deployment scenario.

  Use this as your starting point, then strip or extend based on
  the role this server plays: reverse proxy, static server, API
  gateway, PHP/FastCGI host, etc.


File: /etc/nginx/nginx.conf
=============================

# ------------------------------------------------------------------
# main context
# ------------------------------------------------------------------

user                 nginx;
pid                  /var/run/nginx.pid;
worker_processes     auto;
worker_rlimit_nofile 65535;
pcre_jit             on;                    # faster regex matching

error_log /var/log/nginx/error.log warn;

#   ── Enrichment ───────────────────────────────────────────────
#   • Load modules:  load_module modules/ngx_http_brotli_filter_module.so;
#   • Debug:         error_log ... debug;  (never in production)
#   • Core dump:     worker_rlimit_core; working_directory;
#   • CPU pinning:   worker_cpu_affinity auto;
#   • Priority:      worker_priority -5; (realtime hint)
#   • Thread pools:  thread_pool default threads=32 max_queue=65536;
#   • SSL engine:    ssl_engine aesni;  (or qat_engine)
#   • See: 03-CONFIGURATION-BASICS.md, 51-PERFORMANCE-TUNING.md


# ------------------------------------------------------------------
# events context
# ------------------------------------------------------------------

events {
    worker_connections  1024;   # raise to 4096-65535 for high traffic
    multi_accept        on;
    accept_mutex        on;
    accept_mutex_delay  200ms;
    use                 epoll;  # Linux; kqueue on FreeBSD
}

#   ── Enrichment ───────────────────────────────────────────────
#   • Debug connection:  debug_connection 10.0.0.0/24;
#   • See: 03-CONFIGURATION-BASICS.md, 51-PERFORMANCE-TUNING.md


# ------------------------------------------------------------------
# http context
# ------------------------------------------------------------------

http {
    # ── Basic settings
    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    server_tokens       off;
    keepalive_timeout   65;
    keepalive_requests  1000;
    types_hash_max_size 2048;
    client_max_body_size 16M;

    # ── Open file cache (reduces stat() calls)
    open_file_cache          max=2000 inactive=20s;
    open_file_cache_valid    30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors   on;

    # ── MIME types
    include      /etc/nginx/mime.types;
    default_type application/octet-stream;

    # ── Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/x-javascript
        application/json
        application/xml
        application/rss+xml
        image/svg+xml
        font/ttf
        font/otf;

    # ── Logging format
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    '$request_time $upstream_response_time';

    access_log /var/log/nginx/access.log main buffer=64k flush=5s;

    # ── Rate limiting zones (example, adjust per endpoint)
    # limit_req_zone $binary_remote_addr zone=general:10m rate=30r/m;

    # ── Upstreams (example, uncomment and adjust)
    # upstream backend {
    #     least_conn;
    #     server 10.0.1.10:8080 max_fails=3 fail_timeout=10s;
    #     server 10.0.1.11:8080 max_fails=3 fail_timeout=10s;
    #     keepalive 64;
    # }

    # ── Proxy / FastCGI cache paths (example sizes)
    # proxy_cache_path  /var/cache/nginx/proxy   levels=1:2
    #                   keys_zone=proxy_cache:32m inactive=60m
    #                   max_size=256m use_temp_path=off;
    # fastcgi_cache_path /var/cache/nginx/fastcgi levels=1:2
    #                   keys_zone=fastcgi_cache:32m inactive=60m
    #                   max_size=256m use_temp_path=off;

    # ── SSL global settings (used by all HTTPS servers)
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    #   ── Enrichment (http context) ──────────────────────────
    #   • Brotli:       brotli on; brotli_comp_level 6;
    #                   (requires ngx_brotli module)
    #   • Map blocks:   map $http_upgrade $connection_upgrade { ... }
    #   • Geo:          geo $allow { default 0; 10.0.0.0/8 1; }
    #   • Real IP:      set_real_ip_from 10.0.0.0/8;
    #                   real_ip_header X-Forwarded-For;
    #   • Resolver:     resolver 1.1.1.1 8.8.8.8 valid=300s;
    #   • TCP Fast Open: listen ... fastopen=256;
    #   • See: 10-HTTP-CORE.md, 11-HTTP-PROXY.md, 12-HTTP-SSL.md
    #         19-HTTP-ADVANCED.md, 51-PERFORMANCE-TUNING.md


    # ==============================================================
    # HTTPS server (generic)
    # ==============================================================

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;

        # ── Optional: HTTP/3 (QUIC) -- requires NGINX >= 1.25.0
        # listen 443 quic reuseport;
        # listen [::]:443 quic reuseport;
        # add_header Alt-Svc 'h3=":443"; ma=86400' always;

        server_name example.com www.example.com;
        root /var/www/example;
        index index.html;

        # ── SSL certificates
        ssl_certificate     /etc/ssl/certs/example.pem;
        ssl_certificate_key /etc/ssl/private/example.key;

        # ── OCSP Stapling (optional, requires resolver + trusted_chain)
        # ssl_stapling on;
        # ssl_stapling_verify on;
        # ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;

        # ── Security headers
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options        SAMEORIGIN always;
        add_header X-XSS-Protection       "1; mode=block" always;
        add_header Referrer-Policy        "strict-origin-when-cross-origin" always;
        # add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

        # ── Logs
        access_log /var/log/nginx/example-access.log main buffer=64k flush=5s;
        error_log  /var/log/nginx/example-error.log  warn;

        # ── Static assets
        location / {
            try_files $uri $uri/ =404;
        }

        # ── Specific static path with aggressive cache
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # ── Favicon / robots
        location = /favicon.ico { log_not_found off; access_log off; }
        location = /robots.txt  { log_not_found off; access_log off; }

        # ── Deny dotfiles
        location ~ /\. { deny all; return 404; }

        #   ── Enrichment (server / location) ──────────────────
        #
        #   • PHP/FastCGI:
        #       location ~ \.php$ {
        #           try_files $uri =404;
        #           fastcgi_pass unix:/var/run/php/php-fpm.sock;
        #           include fastcgi_params;
        #           fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        #       }
        #       See: 16-HTTP-FASTCGI.md, examples/php72-laravel55.md
        #
        #   • Reverse proxy:
        #       location /api/ {
        #           proxy_pass http://backend;
        #           proxy_http_version 1.1;
        #           proxy_set_header Connection "";
        #           proxy_set_header Host $host;
        #           proxy_set_header X-Real-IP $remote_addr;
        #           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        #           proxy_set_header X-Forwarded-Proto $scheme;
        #       }
        #       See: 11-HTTP-PROXY.md, examples/api-gateway.md
        #
        #   • Proxy cache:
        #       proxy_cache proxy_cache;
        #       proxy_cache_key "$scheme$host$uri$is_args$args";
        #       proxy_cache_valid 200 5m;
        #       add_header X-Proxy-Cache $upstream_cache_status;
        #       See: 14-HTTP-CACHING.md
        #
        #   • Rate limiting:
        #       limit_req zone=general burst=10 nodelay;
        #       limit_req_status 429;
        #       See: 17-HTTP-SECURITY-AUTH.md
        #
        #   • WebSocket:
        #       proxy_set_header Upgrade $http_upgrade;
        #       proxy_set_header Connection "Upgrade";
        #       See: 11-HTTP-PROXY.md
        #
        #   • SPA fallback:
        #       try_files $uri $uri/ /index.html;
        #       See: examples/static-spa-http3.md
        #
        #   • Directory listing:
        #       autoindex on;
        #       See: 19-HTTP-ADVANCED.md
        #
        #   • Access control (IP whitelist / basic auth):
        #       allow 10.0.0.0/8;
        #       deny all;
        #       auth_basic "Restricted";
        #       auth_basic_user_file /etc/nginx/.htpasswd;
        #       See: 17-HTTP-SECURITY-AUTH.md
        #
        #   • CORS (for API):
        #       add_header Access-Control-Allow-Origin "https://app.example.com";
        #       add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE";
        #       if ($request_method = OPTIONS) { return 204; }
        #       See: 12-HTTP-SSL.md, examples/api-gateway.md
        #
        #   • Rewrite rules:
        #       rewrite ^/old-path/(.*)$ /new-path/$1 permanent;
        #       See: 15-HTTP-REWRITE.md
        #
        #   • njs scripting:
        #       js_import /etc/nginx/njs/app.js;
        #       js_set $custom_var app.customFunction;
        #       See: 40-NJS.md, 41-NJS-EXTENDED.md
        #
        #   • ACME / Let's Encrypt:
        #       location /.well-known/acme-challenge/ {
        #           root /var/www/acme;
        #       }
        #       See: 23-HTTP-ACME.md
        #
        #   • Health check endpoint:
        #       location = /health {
        #           access_log off;
        #           return 200 "OK\n";
        #       }
    }


    # ==============================================================
    # HTTP → HTTPS redirect
    # ==============================================================

    server {
        listen      80;
        listen [::]:80;
        server_name example.com www.example.com;

        # Optional: ACME challenge path (uncomment if needed)
        # location /.well-known/acme-challenge/ {
        #     root /var/www/acme;
        # }

        return 301 https://$host$request_uri;
    }

    #   ── Enrichment (redirect server) ─────────────────────────
    #   • ACME: serve /.well-known/acme-challenge/ from a dedicated
    #           root before the return 301.
    #   • Maintenance page:
    #       location / {
    #           return 503;
    #       }
    #       error_page 503 /maintenance.html;
    #   • See: 23-HTTP-ACME.md, 15-HTTP-REWRITE.md


    # ==============================================================
    # Additional servers can be added below (one per domain/app).
    # Split them into separate files under
    #   /etc/nginx/sites-available/ → symlink to sites-enabled/
    # ==============================================================
}


How to enrich this configuration
=================================

The configuration above is intentionally minimal -- it serves as
a secure, performant scaffold. Below is a decision tree mapping
common scenarios to the specific guide files and example configs
you should consult next.

Scenario                                           Guide File(s)              Example(s)
-------------------------------------------------- -------------------------- -------------------------------
Serve static website / SPA                         10-HTTP-CORE.md            static-spa-http3.md
Reverse proxy to backend HTTP service              11-HTTP-PROXY.md           api-gateway.md
FastCGI / PHP application                          16-HTTP-FASTCGI.md         php72-laravel55.md
                                                                               php72-laravel55-http2.md
                                                                               wordpress-php74.md
Load balancing across multiple upstreams           13-HTTP-LOAD-BALANCING.md  api-gateway.md
Cache proxy / FastCGI responses                    14-HTTP-CACHING.md         php72-laravel55.md
                                                                               wordpress-php74.md
SSL/TLS optimization, HSTS, OCSP                   12-HTTP-SSL.md             static-spa-http3.md
HTTP/3 (QUIC)                                      12-HTTP-SSL.md             static-spa-http3.md
                                                                               php72-laravel55.md
Rate limiting, access control, auth                17-HTTP-SECURITY-AUTH.md   api-gateway.md
Security hardening                                 50-SECURITY-HARDENING.md   --
Performance tuning                                 51-PERFORMANCE-TUNING.md   --
Rust backend + htmx                                (proxy_pass technique)     rust-htmx-askama.md
Rewrite rules / redirects                          15-HTTP-REWRITE.md         --
WebSocket proxy                                    11-HTTP-PROXY.md           --
ACME / Let's Encrypt automation                    23-HTTP-ACME.md            --
njs scripting                                      40-NJS.md                  --
                                                                               41-NJS-EXTENDED.md
NGINX Plus features                                45-NGINX-PLUS.md           --
Troubleshooting                                    52-TROUBLESHOOTING.md      --
Stream (TCP/UDP) proxy                             30-STREAM.md               --
Mail proxy (SMTP/IMAP/POP3)                        35-MAIL.md                 --


Workflow: from this baseline to a tailored config
===================================================

  1. Copy this file as /etc/nginx/nginx.conf.
  2. Set server_name, root, and ssl_* paths for your domain.
  3. Uncomment the enrichment blocks you need (HTTP/3, PHP,
     proxy, cache, rate limiting, etc.).
  4. Consult the corresponding guide files for every directive
     you add -- the guides contain the full syntax, defaults,
     and context for each directive.
  5. For complete real-world scenarios, browse examples/ and
     adapt the configuration to your project structure.
  6. Validate:
       nginx -t
       nginx -s reload
  7. Monitor access/error logs and the $upstream_cache_status
     header to confirm everything is working as expected.
