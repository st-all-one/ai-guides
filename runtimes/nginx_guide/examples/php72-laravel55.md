PHP 7.2 + Laravel 5.5 via FastCGI
====================================

Visão geral
-----------
Laravel 5.5 (LTS) exige PHP >= 7.0. Este guia cobre a versão 7.2,
a última compatível com 5.5 que recebeu patches de segurança
estendidos até 2020. O foco é extrair o máximo de performance,
segurança e estabilidade de uma stack NGINX + PHP-FPM servindo
uma aplicação Laravel em produção.

Estrutura do projeto (referência)
---------------------------------
```
/var/www/laravel/
├── app/
├── bootstrap/
├── config/
├── database/
├── public/          ← DocumentRoot do NGINX
│   ├── index.php    ← Front controller
│   ├── .htaccess
│   └── storage/     ← Symlink: `php artisan storage:link`
├── resources/
├── routes/
├── storage/
│   ├── app/
│   ├── framework/
│   └── logs/
├── vendor/
└── .env             ← NUNCA deve ser acessível via HTTP
```

Configuração completa: `/etc/nginx/sites-available/laravel`
----------------------------------------------------------

```
# ------------------------------------------------------------------
# Contexto: http
# Ajustes globais obrigatórios (incluir antes do server block)
# ------------------------------------------------------------------

sendfile        on;
tcp_nopush      on;
tcp_nodelay     on;
server_tokens   off;

open_file_cache          max=2000 inactive=20s;
open_file_cache_valid    30s;
open_file_cache_min_uses 2;
open_file_cache_errors   on;

# ── FastCGI Cache ─────────────────────────────────────────
fastcgi_cache_path  /var/cache/nginx/laravel
                    levels=1:2
                    keys_zone=laravel_cache:32m
                    inactive=60m
                    max_size=256m
                    use_temp_path=off;

fastcgi_cache_key       "$scheme$request_method$host$request_uri";
fastcgi_cache_lock      on;
fastcgi_cache_lock_age  5s;
fastcgi_cache_lock_timeout 5s;
fastcgi_cache_use_stale error timeout updating http_500 http_503;
fastcgi_cache_background_update  on;
fastcgi_cache_revalidate         on;

# ── Rate limiting ─────────────────────────────────────────
limit_req_zone  $binary_remote_addr  zone=login_limit:10m  rate=5r/m;
limit_req_zone  $binary_remote_addr  zone=api_limit:10m    rate=100r/m;


# ------------------------------------------------------------------
# Server block principal
# ------------------------------------------------------------------

server {
    # ── HTTP/3 (QUIC) + HTTP/2 + HTTP/1.1 ────────────────
    # NGINX >= 1.25.0 compilado com --with-http_v3_module.
    listen 443 quic reuseport;
    listen [::]:443 quic reuseport;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name     app.exemplo.com;
    root            /var/www/laravel/public;
    index           index.php;

    client_max_body_size 32M;

    # ── SSL ──────────────────────────────────────────────
    ssl_certificate     /etc/ssl/certs/exemplo.pem;
    ssl_certificate_key /etc/ssl/private/exemplo.key;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # ── HTTP/3 Alt-Svc ──────────────────────────────────
    add_header Alt-Svc 'h3=":443"; ma=86400' always;

    # ── Segurança de resposta ──────────────────────────
    add_header X-Content-Type-Options    nosniff always;
    add_header X-Frame-Options           SAMEORIGIN always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;

    # HSTS — habilitar APENAS após confirmar que TLS está 100%
    # add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # ── Content-Security-Policy (ajustar ao seu caso) ────
    # add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;

    # ── Assets versionados (cache agressivo) ─────────────
    location /css/  { expires 1y; add_header Cache-Control "public, immutable"; access_log off; }
    location /js/   { expires 1y; add_header Cache-Control "public, immutable"; access_log off; }
    location /fonts/{ expires 1y; add_header Cache-Control "public, immutable"; access_log off; }

    # ── Arquivos estáticos do storage (public disk) ──────
    location /storage/ {
        alias /var/www/laravel/storage/app/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        log_not_found off;

        # Bloquear execução de PHP em uploads
        location ~ \.php$ { deny all; return 404; }
    }

    # ── Favicon / robots ─────────────────────────────────
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # ── Health check (sem cache) ─────────────────────────
    location = /health-check {
        access_log off;
        fastcgi_pass unix:/var/run/php/php7.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
        include fastcgi_params;
        fastcgi_cache_bypass 1;
        fastcgi_no_cache     1;
    }

    # ── Front controller do Laravel ──────────────────────
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # ── Processamento PHP via FastCGI ────────────────────
    # Seguro: apenas arquivos .php reais (não atalhos)
    location ~ \.php$ {
        try_files              $uri =404;
        fastcgi_pass           unix:/var/run/php/php7.2-fpm.sock;
        fastcgi_index          index.php;
        fastcgi_param          SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include                fastcgi_params;

        fastcgi_pass_request_headers  on;
        fastcgi_pass_request_body     on;

        # ── Buffers — sem I/O em disco ────────────────────
        fastcgi_buffer_size          32k;
        fastcgi_buffers              8 32k;
        fastcgi_busy_buffers_size    64k;
        fastcgi_temp_file_write_size 64k;
        fastcgi_max_temp_file_size   0;

        # ── Timeouts (estabilidade com queries lentas) ────
        fastcgi_connect_timeout    10;
        fastcgi_read_timeout       120;
        fastcgi_send_timeout       60;
        fastcgi_socket_keepalive   on;

        # ── Keepalive com upstream PHP-FPM ────────────────
        fastcgi_keep_conn    on;
        fastcgi_http_version 1.1;

        # ── Segurança: intercepta erros e esconde versão ──
        fastcgi_intercept_errors on;
        fastcgi_hide_header      X-Powered-By;

        # ── FastCGI Cache (apenas GET sem sessão ativa) ───
        set $no_cache "";
        if ($http_cookie ~* "laravel_session|XSRF-TOKEN") { set $no_cache 1; }
        if ($request_method != GET)                       { set $no_cache 1; }
        if ($args ~* "s=")                                { set $no_cache 1; }

        fastcgi_cache               laravel_cache;
        fastcgi_cache_bypass        $no_cache;
        fastcgi_no_cache            $no_cache;
        fastcgi_cache_valid         200 301 302 10m;
        fastcgi_cache_valid         404 1m;
        fastcgi_cache_min_uses      2;
        add_header X-FastCGI-Cache  $upstream_cache_status;
        add_header Vary             "Accept-Encoding, Cookie";
    }

    # ── Negar acesso a arquivos/diretórios críticos ─────
    location ~* (\.env|\.git|\.svn|artisan|composer\.json|composer\.lock|package\.json|yarn\.lock|storage/logs|storage/framework) {
        deny all;
        return 404;
    }

    # ── Negar acesso a arquivos ocultos (ponto) ─────────
    location ~ /\. {
        deny all;
        return 404;
    }

    # ── Limitar taxa para rotas de login ─────────────────
    location ~* /(login|register|password) {
        limit_req zone=login_limit burst=3 nodelay;
        try_files $uri $uri/ /index.php?$query_string;
    }

    # ── Limitar taxa para API ────────────────────────────
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        try_files $uri $uri/ /index.php?$query_string;
    }

    # ── Logs ─────────────────────────────────────────────
    access_log  /var/log/nginx/laravel-access.log combined buffer=64k flush=5s;
    error_log   /var/log/nginx/laravel-error.log warn;

    # ── Brotli (prioritário; req. ngx_brotli) ──────────
    brotli on;
    brotli_comp_level 6;
    brotli_min_length 256;
    brotli_types
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

    # ── Gzip (fallback para clientes sem Brotli) ────────
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
}


# ------------------------------------------------------------------
# Redirecionamento HTTP → HTTPS
# ------------------------------------------------------------------
server {
    listen      80;
    listen [::]:80;
    server_name app.exemplo.com;
    return 301 https://$host$request_uri;
}
```

Ajustes no PHP-FPM (`/etc/php/7.2/fpm/pool.d/www.conf`)
---------------------------------------------------------
O NGINX é metade da stack. A outra metade é o pool do PHP-FPM.

```
[www]
user  = www-data
group = www-data

listen = /var/run/php/php7.2-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode  = 0660

; ── Gerenciamento de processos (estável para Laravel) ──
pm = dynamic
pm.max_children  = 50    ; RAM_total(MB) / 40MB (média Laravel)
pm.start_servers = 8
pm.min_spare_servers = 4
pm.max_spare_servers = 16
pm.max_requests  = 500   ; evita vazamento de memória

; ── Timeouts ────────────────────────────────────────────
request_terminate_timeout = 120  ; igual ao fastcgi_read_timeout

; ── Limpeza de ambiente ─────────────────────────────────
; Laravel 5.5 define tudo via .env; não expor variáveis
; globais do sistema via FastCGI.
env[APP_ENV] = production
```

Ajustes no OPcache (`/etc/php/7.2/mods-available/opcache.ini`)
---------------------------------------------------------------
```
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=10000
opcache.revalidate_freq=60
opcache.fast_shutdown=1
opcache.validate_timestamps=0     ; produção: 0, usar opcache_reset() no deploy
```

Laravel Queue Worker (supervisord)
-----------------------------------
O NGINX não gerencia filas. Use Supervisor:

```
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/laravel/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
numprocs=4
user=www-data
```

FastCGI Cache — estratégia para Laravel
----------------------------------------
O cache de respostas inteiras no NGINX só é seguro para
conteúdo público (visitantes não autenticados). A lógica
`$no_cache` no config acima bloqueia o cache quando o cookie
`laravel_session` ou `XSRF-TOKEN` está presente.

Para páginas públicas com alta taxa de repetição (home,
blog, landing pages), esse cache reduz a carga no PHP-FPM
em até 95%.

Monitoramento:
```
add_header X-FastCGI-Cache $upstream_cache_status;
```
Valores possíveis: `HIT`, `MISS`, `BYPASS`, `EXPIRED`,
`STALE`, `UPDATING`, `REVALIDATED`.

HTTP/3 (QUIC)
-------------
O HTTP/3 já está ativo na config acima (`listen 443 quic
reuseport` + `Alt-Svc` header). Requer NGINX >= 1.25.0
compilado com `--with-http_v3_module` e OpenSSL >= 1.1.1.

Benefício para Laravel: handshake 0-RTT elimina uma
round-trip na conexão, reduzindo latência especialmente em
redes móveis. O `reuseport` permite que workers do NGINX
compartilhem o mesmo socket QUIC, essencial para escalar
sob concorrência.

Para verificar se o HTTP/3 está funcionando:
```
$ curl -I --http3 https://app.exemplo.com
# resposta deve conter: alt-svc: h3=":443"; ma=86400
```
No log de acesso, `$server_protocol` retorna `QUIC` para
conexões HTTP/3.

Segurança — checklist
----------------------
- [ ] `server_tokens off;` no contexto `http` — versão oculta
- [ ] `fastcgi_hide_header X-Powered-By;` — PHP não exposto
- [ ] `fastcgi_intercept_errors on;` — impede vazamento de
      backtrace do PHP
- [ ] PHP bloqueado em `/storage/` (nested `location ~ \.php$
      { deny all; }`)
- [ ] `try_files $uri =404` antes do `fastcgi_pass` — só
      executa .php que realmente existe no disco
- [ ] `.env` inacessível (`location ~* \.env`)
- [ ] `APP_DEBUG=false` no `.env` de produção
- [ ] `storage/` e `vendor/` não servidos pelo NGINX
- [ ] Headers de segurança configurados (CSP, HSTS, XFO)
- [ ] Rate limiting ativo em `/login`, `/register`, `/api/`
- [ ] PHP-FPM escutando em socket Unix (não TCP)
- [ ] `open_basedir` restrito no `php.ini` se possível
- [ ] `expose_php = Off` no `php.ini`
- [ ] Laravel `session.driver` = `redis` ou `database` (não
      `file` em cluster)
- [ ] `client_max_body_size 32M` definido para uploads

Estabilidade — recomendações adicionais
---------------------------------------
- `fastcgi_cache_use_stale error timeout updating` → serve
  cache mesmo se o PHP-FPM falhar ou durante refresh.
- `fastcgi_cache_background_update on` → servidor atende
  com stale enquanto um worker revalida em background.
- `fastcgi_cache_revalidate on` → usa `If-Modified-Since`
  para reduzir tráfego de revalidação.
- `fastcgi_cache_lock on` + `lock_age 5s` → evita o
  "thundering herd" sem travar por muito tempo.
- `fastcgi_max_temp_file_size 0` + `temp_file_write_size
  64k` → sem I/O síncrono em disco durante buffering.
- `fastcgi_socket_keepalive on` → detecta conexões mortas
  no upstream rapidamente.
- `fastcgi_read_timeout 120` → comporta queries lentas do
  Laravel sem abortar prematuramente.
- `pm.max_requests = 500` no PHP-FPM → recicla processos
  antes que vazamentos de memória acumulem.
- `sendfile on; tcp_nopush on;` → acelera entrega de
  assets estáticos via kernel.
- `open_file_cache` → reduz chamadas `stat()` em arquivos
  estáticos muito requisitados.

Referências
-----------
- 16-HTTP-FASTCGI.md — todas as diretivas FastCGI
- 12-HTTP-SSL.md — configuração TLS
- 14-HTTP-CACHING.md — FastCGI cache em detalhe
- 51-PERFORMANCE-TUNING.md — tuning geral do NGINX
- 50-SECURITY-HARDENING.md — hardening de produção
- 52-TROUBLESHOOTING.md — resolução de problemas comuns
- https://laravel.com/docs/5.5/deployment
