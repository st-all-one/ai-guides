SPA Estático com HTTP/3
========================

Visão geral
-----------
Aplicações SPA (React, Vue, Angular, Svelte) compilam para
arquivos estáticos — HTML, JS, CSS, assets com hash. Não há
processamento server-side (a menos que haja SSR). O NGINX
atua como servidor de arquivos estáticos otimizado.

Este cenário aproveita HTTP/3 (QUIC) para reduzir latência
de conexão, Brotli para compressão superior a gzip, e cache
imutável baseado em hash dos arquivos.

Estrutura típica de build
--------------------------
```
/var/www/app/
├── index.html           ← SPA shell (não versionado)
├── favicon.ico
├── robots.txt
├── assets/
│   ├── index-B7kF3d2f.js   ← hash no nome
│   ├── main-Cx9pQ1aA.css
│   └── logo-a1b2c3d4.svg
└── static/                 ← imagens, fontes
```

Configuração: `/etc/nginx/sites-available/spa`
-----------------------------------------------

```
server {
    # ── HTTP/3 + HTTP/2 + HTTP/1.1 no mesmo server ────
    # Requer NGINX >= 1.25.0 compilado com http_v3_module.
    listen 443 quic reuseport;
    listen [::]:443 quic reuseport;

    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name app.exemplo.com;
    root /var/www/app;
    index index.html;

    # ── SSL (obrigatório para HTTP/3) ──────────────────
    ssl_certificate     /etc/ssl/certs/exemplo.pem;
    ssl_certificate_key /etc/ssl/private/exemplo.key;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # ── HTTP/3 Alt-Svc — avisa o cliente que QUIC existe ─
    add_header Alt-Svc 'h3=":443"; ma=86400' always;

    # ── Segurança ───────────────────────────────────────
    server_tokens        off;
    add_header X-Content-Type-Options    nosniff always;
    add_header X-Frame-Options           SAMEORIGIN always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;

    # HSTS (após confirmar TLS funcional)
    # add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # ── SPA fallback — toda rota não arquivo → index.html ─
    location / {
        try_files $uri $uri/ /index.html;

        # index.html NUNCA deve ser cacheado pelo navegador
        # porque o service worker ou o cliente precisa ver
        # novas versões do JS/CSS.
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }

    # ── Assets com hash no nome (imutáveis) ───────────────
    location /assets/ {
        # O hash no nome garante que o conteúdo nunca muda
        # para uma mesma URL. Pode expirar para sempre.
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        access_log off;
    }

    # ── Arquivos estáticos tradicionais ───────────────────
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        access_log off;
    }

    # ── Favicon / robots ─────────────────────────────────
    location = /favicon.ico {
        log_not_found off;
        access_log off;
        expires 1y;
    }
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # ── Negar acesso a dotfiles ──────────────────────────
    location ~ /\. { deny all; return 404; }

    access_log /var/log/nginx/spa-access.log combined buffer=64k flush=5s;
    error_log  /var/log/nginx/spa-error.log warn;


    # ── Brotli (substitui gzip para navegadores modernos) ─
    # Requer ngx_brotli (https://github.com/google/ngx_brotli)
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
        font/otf
        application/wasm;

    # ── Gzip fallback (para clientes sem Brotli) ─────────
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
        image/svg+xml
        font/ttf
        font/otf
        application/wasm;
}


# ── Redirecionamento HTTP → HTTPS ───────────────────────
server {
    listen      80;
    listen [::]:80;
    server_name app.exemplo.com;

    # Para visitantes que chegam via HTTP, avisa que
    # HTTP/3 está disponível via Alt-Svc no 301.
    return 301 https://$host$request_uri;
}
```

HTTP/3 no NGINX — requisitos
-----------------------------
| Requisito                     | Detalhe                                      |
|-------------------------------|----------------------------------------------|
| NGINX >= 1.25.0               | Compilado com `--with-http_v3_module`        |
| OpenSSL >= 1.1.1              | QUIC requer TLS 1.3                         |
| `reuseport`                   | Necessário no `listen quic` para performance |
| Porta UDP 443 aberta          | QUIC usa UDP, não TCP                        |
| Firewall liberado             | Ex.: `ufw allow 443/udp`                    |

Monitoramento do HTTP/3
-----------------------
```
$ curl -I --http3 https://app.exemplo.com
```
A resposta deve incluir `alt-svc: h3=":443"; ma=86400`.

Para logs, o formato `$server_protocol` retorna `QUIC` para
conexões HTTP/3.

Referências
-----------
- 10-HTTP-CORE.md — diretivas `listen`, `root`, `try_files`
- 12-HTTP-SSL.md — SSL/TLS
- 51-PERFORMANCE-TUNING.md — tuning geral
- 50-SECURITY-HARDENING.md — hardening
