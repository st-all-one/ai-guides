WordPress + PHP 7.4 + FastCGI Cache
====================================

Visão geral
-----------
WordPress é a plataforma mais comum em shared hosting, mas
também uma das mais exigentes em cache. Este exemplo cobre
PHP 7.4 + NGINX com FastCGI cache de página inteira, purga
automática por cookie e isolamento do wp-admin.

Configuração: `/etc/nginx/sites-available/wordpress`
------------------------------------------------------

```
# ── Cache path (contexto http) ──────────────────────────
fastcgi_cache_path  /var/cache/nginx/wp levels=1:2
                    keys_zone=wpcache:64m inactive=60m
                    max_size=512m use_temp_path=off;
fastcgi_cache_key       "$scheme$host$request_uri";
fastcgi_cache_lock      on;
fastcgi_cache_use_stale error timeout updating http_500 http_503;


server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    # ── HTTP/3 ──────────────────────────────────────────
    # listen 443 quic reuseport;
    # listen [::]:443 quic reuseport;
    # add_header Alt-Svc 'h3=":443"; ma=86400';

    server_name blog.exemplo.com;
    root /var/www/wordpress;
    index index.php;

    ssl_certificate     /etc/ssl/certs/exemplo.pem;
    ssl_certificate_key /etc/ssl/private/exemplo.key;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # ── Segurança ───────────────────────────────────────
    server_tokens        off;
    add_header X-Content-Type-Options    nosniff always;
    add_header X-Frame-Options           SAMEORIGIN always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;

    # ── Cache de assets estáticos ───────────────────────
    location ~* \.(?:css|js|gif|ico|jpe?g|png|svg|webp|woff2?|eot|ttf|otf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        log_not_found off;
    }

    # ── XML-RPC (proteger contra bruteforce) ────────────
    location = /xmlrpc.php {
        deny all;
        return 404;
    }

    # ── wp-admin (sem cache FastCGI) ────────────────────
    location ~* /wp-admin/ {
        try_files $uri $uri/ /index.php?$args;
        fastcgi_cache_bypass 1;
        fastcgi_no_cache     1;
    }

    # ── wp-login (rate limit) ───────────────────────────
    location = /wp-login.php {
        limit_req zone=login_limit burst=3 nodelay;
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_cache_bypass 1;
        fastcgi_no_cache     1;
    }

    # ── Front controller do WordPress ──────────────────
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # ── PHP + FastCGI Cache ────────────────────────────
    location ~ \.php$ {
        fastcgi_pass           unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_index          index.php;
        fastcgi_param          SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include                fastcgi_params;

        fastcgi_buffer_size      16k;
        fastcgi_buffers          8 16k;
        fastcgi_busy_buffers_size 32k;
        fastcgi_temp_file_write_size 32k;
        fastcgi_max_temp_file_size 0;

        fastcgi_connect_timeout  5;
        fastcgi_read_timeout     60;
        fastcgi_send_timeout     30;

        fastcgi_keep_conn on;
        fastcgi_http_version 1.1;

        # ── Bypass do cache para usuários logados ───────
        set $skip_cache 0;
        if ($http_cookie ~* "wordpress_logged_in|comment_author|woocommerce_items_in_cart") {
            set $skip_cache 1;
        }
        if ($request_method != GET) { set $skip_cache 1; }
        if ($args ~* "s=")          { set $skip_cache 1; }  # search results

        fastcgi_cache           wpcache;
        fastcgi_cache_bypass    $skip_cache;
        fastcgi_no_cache        $skip_cache;
        fastcgi_cache_valid     200 301 302 15m;
        fastcgi_cache_valid     404 1m;
        fastcgi_cache_min_uses  2;
        add_header X-FastCGI-Cache $upstream_cache_status;
    }

    # ── Negar acesso a arquivos sensíveis ───────────────
    location ~* \.(?:htaccess|htpasswd|svn|git|log|backup|sql)$ {
        deny all;
        return 404;
    }
    location ~ /\. { deny all; return 404; }

    access_log /var/log/nginx/wp-access.log combined buffer=64k flush=5s;
    error_log  /var/log/nginx/wp-error.log warn;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json
               application/xml image/svg+xml font/ttf font/otf;
}

server {
    listen      80;
    listen [::]:80;
    server_name blog.exemplo.com;
    return 301 https://$host$request_uri;
}
```

Plugins de cache vs FastCGI Cache
----------------------------------
O cache no NGINX dispensa plugins como W3 Total Cache ou
WP Super Cache — o NGINX entrega páginas estáticas direto
da RAM sem sequer chamar o PHP.

A purga do cache pode ser feita via `fastcgi_cache_purge`
(apenas NGINX Plus) ou por script externo que remova os
arquivos em `/var/cache/nginx/wp/`.

Referências
-----------
- 16-HTTP-FASTCGI.md
- 14-HTTP-CACHING.md
- 50-SECURITY-HARDENING.md
- 51-PERFORMANCE-TUNING.md
