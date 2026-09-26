PHP 7.2 + Laravel 5.5 via FastCGI (sem HTTP/3)
================================================

Visão geral
-----------
Versão do exemplo PHP/Laravel otimizada para ambientes sem
HTTP/3 (NGINX < 1.25, OpenSSL < 1.1.1, firewalls que
bloqueiam UDP, ou infraestrutura legada).

O protocolo máximo é HTTP/2 sobre TLS 1.3. Para compensar a
ausência das reduções de RTT do QUIC, esta config emprega:
TCP Fast Open, TLS 1.3 Early Data (0-RTT), OCSP Stapling,
pré-carga via `Link` header, sessão SSL agressiva e tuning
fino de multiplexação HTTP/2.

Todas as melhorias de segurança, cache e estabilidade da
versão com HTTP/3 estão mantidas.

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

Configuração: `/etc/nginx/sites-available/laravel`
---------------------------------------------------

```
# ------------------------------------------------------------------
# Contexto: http — tuning de soquete e kernel
# ------------------------------------------------------------------

sendfile        on;
tcp_nopush      on;
tcp_nodelay     on;
server_tokens   off;

# TCP Fast Open — reduz 1 RTT em conexões novas
# Requer net.ipv4.tcp_fastopen = 3 no sysctl.
listen        80 default_server reuseport fastopen=256;
listen        [::]:80 default_server reuseport fastopen=256;

open_file_cache          max=2000 inactive=20s;
open_file_cache_valid    30s;
open_file_cache_min_uses 2;
open_file_cache_errors   on;

reset_timedout_connection on;
client_body_timeout       10;
client_header_timeout     10;
send_timeout              10;

lingering_close  off;
lingering_time   10s;
lingering_timeout 5s;

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

# ── Resolver para OCSP Stapling ───────────────────────────
resolver 1.1.1.1 8.8.8.8 valid=300s;
resolver_timeout 5s;


# ------------------------------------------------------------------
# Server block principal — HTTP/2 como protocolo máximo
# ------------------------------------------------------------------

server {
    # Apenas HTTP/2 + HTTP/1.1. Sem QUIC/HTTP/3.
    listen 443 ssl http2 reuseport fastopen=256;
    listen [::]:443 ssl http2 reuseport fastopen=256;

    server_name     app.exemplo.com;
    root            /var/www/laravel/public;
    index           index.php;

    client_max_body_size 32M;

    # ── SSL / TLS ─────────────────────────────────────────
    ssl_certificate         /etc/ssl/certs/exemplo.pem;
    ssl_certificate_key     /etc/ssl/private/exemplo.key;
    ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;

    ssl_session_cache       shared:SSL:50m;   # maior sem QUIC
    ssl_session_timeout     60m;              # retenção estendida
    ssl_session_tickets     on;
    ssl_session_ticket_key  /etc/ssl/ticket.key;  # rotação manual

    ssl_protocols           TLSv1.2 TLSv1.3;
    ssl_ciphers             ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_ecdh_curve          prime256v1:secp384r1;
    ssl_buffer_size         4k;        # record size ideal

    # ── TLS 1.3 Early Data (0-RTT) — compensa 1 RTT ──────
    # Simula o 0-RTT do QUIC sobre TLS 1.3. Cuidado com
    # replay: só seguro para requisições GET idempotentes.
    ssl_early_data on;

    # ── OCSP Stapling — elimina consulta externa do cliente ─
    ssl_stapling         on;
    ssl_stapling_verify  on;

    # ── HSTS — habilitar APENAS após validar TLS ──────────
    # add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # ── Early Hints (103) — pré-carrega assets críticos ───
    # Avisa o navegador quais recursos baixar antes mesmo
    # do response body. Requer http2 + TLS 1.3.
    location = / {
        add_header Link "</css/app.css>; rel=preload; as=style";
        add_header Link "</js/app.js>; rel=preload; as=script";
        try_files $uri $uri/ /index.php?$query_string;
    }

    # ── HTTP/2 tuning (maximizar multiplexação) ──────────
    http2_max_concurrent_streams 256;
    http2_chunk_size              8k;
    http2_body_preread_size      64k;
    http2_recv_buffer_size      256k;

    # ── Keepalive agressivo (reduz criação de conexões) ──
    keepalive_timeout  120;
    keepalive_requests 2000;

    # ── Segurança de resposta ──────────────────────────
    add_header X-Content-Type-Options    nosniff always;
    add_header X-Frame-Options           SAMEORIGIN always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;

    # ── Content-Security-Policy (ajustar ao seu caso) ────
    # add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;

    # ── Cache de assets versionados ─────────────────────
    location /css/  { expires 1y; add_header Cache-Control "public, immutable"; access_log off; }
    location /js/   { expires 1y; add_header Cache-Control "public, immutable"; access_log off; }
    location /fonts/{ expires 1y; add_header Cache-Control "public, immutable"; access_log off; }

    # ── Storage (uploads) ──────────────────────────────
    location /storage/ {
        alias /var/www/laravel/storage/app/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        log_not_found off;
        location ~ \.php$ { deny all; return 404; }
    }

    # ── Favicon / robots ──────────────────────────────
    location = /favicon.ico { log_not_found off; access_log off; }
    location = /robots.txt  { log_not_found off; access_log off; }

    # ── Health check (sem cache) ──────────────────────
    location = /health-check {
        access_log off;
        fastcgi_pass unix:/var/run/php/php7.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
        include fastcgi_params;
        fastcgi_cache_bypass 1;
        fastcgi_no_cache     1;
    }

    # ── Front controller ──────────────────────────────
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # ── PHP via FastCGI ──────────────────────────────
    location ~ \.php$ {
        try_files              $uri =404;
        fastcgi_pass           unix:/var/run/php/php7.2-fpm.sock;
        fastcgi_index          index.php;
        fastcgi_param          SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include                fastcgi_params;

        fastcgi_pass_request_headers  on;
        fastcgi_pass_request_body     on;

        fastcgi_buffer_size          32k;
        fastcgi_buffers              8 32k;
        fastcgi_busy_buffers_size    64k;
        fastcgi_temp_file_write_size 64k;
        fastcgi_max_temp_file_size   0;

        fastcgi_connect_timeout     10;
        fastcgi_read_timeout       120;
        fastcgi_send_timeout        60;
        fastcgi_socket_keepalive    on;

        fastcgi_keep_conn    on;
        fastcgi_http_version 1.1;

        fastcgi_intercept_errors on;
        fastcgi_hide_header      X-Powered-By;

        # FastCGI Cache
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

    # ── Negar acesso a arquivos críticos ────────────
    location ~* (\.env|\.git|\.svn|artisan|composer\.json|composer\.lock|package\.json|yarn\.lock|storage/logs|storage/framework) {
        deny all; return 404;
    }
    location ~ /\. { deny all; return 404; }

    # ── Rate limiting ──────────────────────────────
    location ~* /(login|register|password) {
        limit_req zone=login_limit burst=3 nodelay;
        try_files $uri $uri/ /index.php?$query_string;
    }
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        try_files $uri $uri/ /index.php?$query_string;
    }

    # ── Logs ──────────────────────────────────────
    access_log /var/log/nginx/laravel-access.log combined buffer=64k flush=5s;
    error_log  /var/log/nginx/laravel-error.log warn;

    # ── Brotli + Gzip ─────────────────────────────
    brotli on;
    brotli_comp_level 6;
    brotli_min_length 256;
    brotli_types text/plain text/css text/xml text/javascript
                 application/javascript application/x-javascript
                 application/json application/xml application/rss+xml
                 image/svg+xml font/ttf font/otf;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/x-javascript
               application/json application/xml application/rss+xml
               image/svg+xml font/ttf font/otf;
}


# ------------------------------------------------------------------
# Redirecionamento HTTP → HTTPS
# ------------------------------------------------------------------
server {
    listen      80 reuseport fastopen=256;
    listen [::]:80 reuseport fastopen=256;
    server_name app.exemplo.com;
    return 301 https://$host$request_uri;
}
```

O que muda sem HTTP/3 — fundamentos
-------------------------------------
| Aspecto              | Com HTTP/3 (QUIC)            | Sem HTTP/3 (esta config)          |
|----------------------|------------------------------|-----------------------------------|
| Transporte           | UDP, sem HOL blocking        | TCP (HOL blocking no transporte)  |
| Handshake inicial    | 0-RTT (QUIC + TLS 1.3)      | TCP Fast Open + TLS 1.3 Early Data|
| Conexões repetidas   | Session ticket nativo        | Session cache + ticket + 0-RTT    |
| Certificado          | Enviado no primeiro pacote   | OCSP Stapling para evitar consulta|
| Multiplexação        | Nativa no protocolo          | HTTP/2 multiplex sobre TCP        |
| Migração de rede     | Nativa (connection ID)       | Não suportada (nova conexão)      |
| Alt-Svc              | Avisa cliente sobre QUIC     | Não usado                         |

A config acima compensa cada limitação do TCP/TLS com
diretivas específicas.

TCP Fast Open (TFO)
--------------------
Reduz o handshake TCP de 3-way para 1-RTT em conexões
repetidas. O cliente envia dados já no SYN.

Requer no host:
```
# sysctl -w net.ipv4.tcp_fastopen=3
```
O valor `3` ativa TFO para cliente e servidor. No NGINX,
`fastopen=256` no `listen` define o tamanho da fila de
conexões TFO pendentes.

TLS 1.3 Early Data (0-RTT sobre TLS)
--------------------------------------
Com `ssl_early_data on;`, o NGINX aceita dados na primeira
mensagem TLS 1.3 (mesmo conceito do QUIC). A diferença é
que o TCP SYN ainda é necessário (TFO reduz para 1 RTT, mas
não elimina como o QUIC faz com UDP).

Segurança: Early Data é vulnerável a replay attacks. O NGINX
só deve aceitar 0-RTT em requisições GET idempotentes. Esta
config expõe apenas conteúdo público (FastCGI cache), então
o risco é mitigado.

OCSP Stapling
--------------
Sem HTTP/3, o cliente precisa validar o certificado TLS.
Sem stapling, ele consulta a CA → +1 RTT. Com stapling,
o NGINX busca e cacheia a resposta OCSP e a envia junto
do Certificate message, eliminando essa viagem.

```
ssl_stapling        on;
ssl_stapling_verify on;
resolver            1.1.1.1 8.8.8.8 valid=300s;
```

Sessão SSL agressiva
--------------------
Como não há connection ID do QUIC para retomar sessões, o
NGINX depende de session cache e session tickets:

```
ssl_session_cache      shared:SSL:50m;   # 50MB ≈ 400k sessions
ssl_session_timeout    60m;
ssl_session_tickets    on;
ssl_session_ticket_key /etc/ssl/ticket.key;
```

Para gerar a chave de ticket (válida por toda a vida do
cluster, evitando mismatch atrás de LB):
```
$ openssl rand 48 > /etc/ssl/ticket.key
```

Early Hints (103) — pré-carrega antes do HTML
-----------------------------------------------
O header `Link` com `rel=preload` dentro de um `add_header`
no `location = /` dispara o mecanismo de Early Hints
(HTTP status 103) se o NGINX suportar. O navegador começa a
baixar CSS/JS antes mesmo de receber o HTML.

Isso é particularmente útil sem HTTP/3, pois cada recurso
carregado sequencialmente custa uma nova conexão ou espera
na fila do HTTP/2.

HTTP/2 tuning
--------------
| Diretiva                     | Valor   | Efeito                               |
|------------------------------|---------|--------------------------------------|
| `http2_max_concurrent_streams`| 256    | Mais requisições paralelas por conn  |
| `http2_chunk_size`           | 8k      | Tamanho do frame HTTP/2              |
| `http2_body_preread_size`    | 64k     | Lê corpo antes de decidir roteamento |
| `http2_recv_buffer_size`     | 256k    | Buffer de recepção do HPACK          |

Keepalive estendido
--------------------
`keepalive_timeout 120` + `keepalive_requests 2000` → cada
conexão TCP vive mais e serve mais requisições, reduzindo a
frequência de handshakes TCP + TLS.

Em HTTP/2 isso é natural (uma conexão serve centenas de
streams), mas o timeout alto garante que a conexão
permaneça aberta mesmo entre rajadas de tráfego.

Ajustes no PHP-FPM
-------------------
Os mesmos da versão com HTTP/3 (ver php72-laravel55.md):

```
[www]
pm = dynamic
pm.max_children  = 50
pm.start_servers = 8
pm.min_spare_servers = 4
pm.max_spare_servers = 16
pm.max_requests  = 500
request_terminate_timeout = 120
env[APP_ENV] = production
```

Ajustes no OPcache
-------------------
```
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=10000
opcache.revalidate_freq=60
opcache.fast_shutdown=1
opcache.validate_timestamps=0
```

Segurança — checklist (adicional para esta config)
----------------------------------------------------
- [ ] `ssl_early_data on` requer verificação de replay:
      só expor a recursos públicos / cacheados
- [ ] `ssl_session_ticket_key` deve ser idêntico em todos
      os servidores atrás do mesmo LB
- [ ] OCSP stapling requer `ssl_trusted_certificate`
      apontando para a CA chain correta
- [ ] `net.ipv4.tcp_fastopen=3` no sysctl.conf
- [ ] UDP não precisa ser liberado (sem QUIC), mas a porta
      443 TCP deve estar acessível
- [ ] `reset_timedout_connection on` aborta conexões lentas
      sem passar pelo TIME_WAIT

Referências
-----------
- php72-laravel55.md — versão com HTTP/3 (mesma base)
- 12-HTTP-SSL.md — OCSP, session tickets, early data
- 10-HTTP-CORE.md — listen, keepalive, timeouts
- 51-PERFORMANCE-TUNING.md — tuning TCP e kernel
- 50-SECURITY-HARDENING.md — hardening
- 52-TROUBLESHOOTING.md — resolução de problemas
