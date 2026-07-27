Rust (Axum) + htmx + Askama com HTTP/3
========================================

Visão geral
-----------
Aplicação Rust com Axum servindo HTML gerado por templates
Askama (compilados em tempo de build, zero runtime overhead)
e htmx no frontend para interatividade sem JavaScript
customizado.

O NGINX atua como proxy reverso, servindo assets estáticos
diretamente e fazendo proxy das requisições dinâmicas para
o backend Rust com cache inteligente e HTTP/3.

Arquitetura
------------
```
                    ┌──────────────────────────────────┐
                    │           NGINX (443)            │
                    │  HTTP/3 + HTTP/2 + HTTP/1.1      │
                    │                                  │
                    │  /static/*  →  disco local       │
                    │  /*         →  Rust (127.0.0.1)  │
                    └──────┬───────────────────────────┘
                           │ proxy_pass http://rust_app
                           ▼
                    ┌──────────────────────────────────┐
                    │  Rust (Axum) :8080               │
                    │  ├── Askama templates (HTML)     │
                    │  ├── htmx endpoints (fragments)  │
                    │  └── API (JSON)                  │
                    └──────────────────────────────────┘
```

Estrutura do projeto
---------------------
```
/var/www/rust-app/
├── static/                   ← servido diretamente pelo NGINX
│   ├── css/
│   │   └── app.css
│   ├── js/
│   │   ├── htmx.min.js       ← versionado: htmx-2.0.0.min.js
│   │   └── app.js
│   ├── img/
│   └── favicon.ico
├── templates/                 ← Askama (compilado no binário)
│   ├── base.html
│   ├── index.html
│   └── components/
│       └── list.html
└── src/
    └── main.rs               ← Axum server
```

Configuração NGINX: `/etc/nginx/sites-available/rust-app`
----------------------------------------------------------

```
upstream rust_app {
    server 127.0.0.1:8080 max_fails=3 fail_timeout=10s;
    keepalive 256;
}

proxy_cache_path /var/cache/nginx/rust
                 levels=1:2
                 keys_zone=rust_cache:32m
                 inactive=30m
                 max_size=256m
                 use_temp_path=off;


server {
    # ── HTTP/3 + HTTP/2 + HTTP/1.1 ─────────────────────
    listen 443 quic reuseport;
    listen [::]:443 quic reuseport;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name app.exemplo.com;
    root /var/www/rust-app/static;

    # ── SSL ─────────────────────────────────────────────
    ssl_certificate     /etc/ssl/certs/exemplo.pem;
    ssl_certificate_key /etc/ssl/private/exemplo.key;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # ── HTTP/3 Alt-Svc ─────────────────────────────────
    add_header Alt-Svc 'h3=":443"; ma=86400' always;

    # ── Segurança ──────────────────────────────────────
    server_tokens          off;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options        DENY always;
    add_header X-XSS-Protection       "1; mode=block" always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy     "camera=(), microphone=(), geolocation=()" always;
    # add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # ── Content-Security-Policy para htmx ──────────────
    # htmx usa atributos como hx-get, hx-post, hx-target.
    # 'unsafe-eval' não é necessário. Ajuste os hashes
    # conforme seus scripts inline.
    add_header Content-Security-Policy "
        default-src 'self';
        script-src  'self' 'unsafe-inline';   # htmx usa inline handlers
        style-src   'self' 'unsafe-inline';
        img-src     'self' data:;
        connect-src 'self';
        frame-ancestors 'none';
    " always;

    # ── Logs ───────────────────────────────────────────
    access_log /var/log/nginx/rust-access.log combined buffer=64k flush=5s;
    error_log  /var/log/nginx/rust-error.log warn;


    # ── Assets estáticos (servidos direto pelo NGINX) ───
    location /static/ {
        alias /var/www/rust-app/static/;

        # Arquivos com hash no nome → imutáveis
        location ~* \.[a-f0-9]{8,}\.(css|js)$ {
            expires 1y;
            add_header Cache-Control "public, immutable" always;
            access_log off;
        }

        # Assets sem hash → cache curto para permitir atualização
        location ~* \.(css|js)$ {
            expires 1h;
            add_header Cache-Control "public, must-revalidate" always;
        }

        # Imagens e fontes
        location ~* \.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|eot|ttf|otf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable" always;
            access_log off;
        }
    }

    # ── htmx endpoint (fragmentos HTML) ────────────────
    # Requisições htmx são concorrentes e não devem travar
    # em proxy_cache_lock por muito tempo. Cache apenas
    # fragmentos GET sem cookie de sessão.
    location /htmx/ {
        proxy_pass http://rust_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Identifica requisição htmx
        proxy_set_header HX-Request $http_hx_request;
        proxy_set_header HX-Current-URL $http_hx_current_url;
        proxy_set_header HX-Target $http_hx_target;
        proxy_set_header HX-Trigger $http_hx_trigger;

        # Cache apenas GET sem sessão
        set $cache_htmx 1;
        if ($http_cookie ~* "session")         { set $cache_htmx 0; }
        if ($request_method != GET)            { set $cache_htmx 0; }

        proxy_cache rust_cache;
        proxy_cache_key "$scheme$host$uri$is_args$args";
        proxy_cache_bypass $cache_htmx;
        proxy_cache_valid 200 2m;
        add_header X-Proxy-Cache $upstream_cache_status;

        proxy_connect_timeout 5;
        proxy_read_timeout    10;
        proxy_send_timeout    10;
    }

    # ── API JSON (sem cache) ───────────────────────────
    location /api/ {
        proxy_pass http://rust_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache off;
        proxy_connect_timeout 5;
        proxy_read_timeout    30;
        proxy_send_timeout    15;
    }

    # ── Páginas HTML completas (proxy para Rust) ───────
    location / {
        proxy_pass http://rust_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache de páginas HTML completas (GET sem sessão)
        set $cache_page 1;
        if ($http_cookie ~* "session")  { set $cache_page 0; }
        if ($request_method != GET)     { set $cache_page 0; }

        proxy_cache rust_cache;
        proxy_cache_key "$scheme$host$uri$is_args$args";
        proxy_cache_bypass $cache_page;
        proxy_cache_valid 200 5m;
        add_header X-Proxy-Cache $upstream_cache_status;

        proxy_connect_timeout 10;
        proxy_read_timeout    30;
        proxy_send_timeout    15;

        # Buffers ajustados para HTML gerado por Askama
        proxy_buffer_size       8k;
        proxy_buffers          16 8k;
        proxy_busy_buffers_size 32k;
        proxy_max_temp_file_size 0;
    }

    # ── Health check ───────────────────────────────────
    location = /health {
        access_log off;
        proxy_pass http://rust_app;
        proxy_connect_timeout 3;
        proxy_read_timeout    3;
    }

    # ── Favicon / robots (servidos da raiz static) ─────
    location = /favicon.ico {
        log_not_found off;
        access_log off;
        expires 1y;
    }
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # ── Gzip (respostas HTML e JSON do Rust) ───────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types
        text/html
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml;

    # ── Brotli (requer ngx_brotli) ────────────────────
    # brotli on;
    # brotli_comp_level 6;
    # brotli_min_length 256;
    # brotli_types text/html text/plain text/css text/javascript
    #              application/javascript application/json text/xml;
}


# ── Redirecionamento HTTP → HTTPS ───────────────────────
server {
    listen      80;
    listen [::]:80;
    server_name app.exemplo.com;
    return 301 https://$host$request_uri;
}
```

Relação entre NGINX e Rust — boas práticas
-------------------------------------------
| Aspecto               | Recomendação                                    |
|-----------------------|--------------------------------------------------|
| **Porta**             | Rust escuta em `127.0.0.1:8080` (nunca exposto)  |
| **Keepalive**         | `keepalive 256` + `proxy_http_version 1.1` + `Connection ""` |
| **TLS**               | Terminado no NGINX, Rust recebe HTTP puro        |
| **Static files**      | Servidos pelo NGINX, não pelo Rust               |
| **Bind**              | Rust faz `bind("0.0.0.0:8080")` mas escuta só local |
| **Logs**              | Centralizados no NGINX (Rust pode logar só erros) |
| **Rate limiting**     | No NGINX (Rust livre para focar em negócio)      |

Estratégia de cache para htmx
-------------------------------
Requisições htmx (`HX-Request: true`) trafegam fragmentos
HTML. O cache por `proxy_cache` com a regra `$http_cookie`
funciona bem para:

- Listagens públicas (produtos, posts) → cache HIT
- Formulários e conteúdo personalizado → cache BYPASS

Para purgar o cache manualmente ao atualizar conteúdo:
```
# Via script externo (remove arquivos do cache dir)
find /var/cache/nginx/rust -type f -delete
```

Se usar NGINX Plus, `proxy_cache_purge` permite purgar por
chave específica.

HTTP/3 — requisitos
-------------------
- NGINX >= 1.25.0 com `--with-http_v3_module`
- OpenSSL >= 1.1.1 (TLS 1.3)
- Porta UDP 443 liberada no firewall
- `reuseport` no `listen quic` para escalabilidade

A stack Rust + NGINX com HTTP/3 é particularmente vantajosa
para users mobile (handshake 0-RTT, sem head-of-line
blocking do TCP).

Segurança — checklist
---------------------
- [ ] `server_tokens off` — versão do NGINX oculta
- [ ] CSP configurado para htmx (`'unsafe-inline'` para script e style)
- [ ] `X-Frame-Options: DENY` — previne clickjacking
- [ ] HSTS habilitado (após validação do TLS)
- [ ] Rust escutando apenas em `127.0.0.1`
- [ ] Nenhum arquivo estático servido pelo Rust
- [ ] Rate limiting nos endpoints /api/ e /htmx/ (se aplicável)
- [ ] Health check sem expor info interna

Referências
-----------
- 11-HTTP-PROXY.md — proxy reverso (tuning de buffers)
- 12-HTTP-SSL.md — TLS
- 14-HTTP-CACHING.md — proxy cache
- 10-HTTP-CORE.md — diretivas listen, root, try_files
- 51-PERFORMANCE-TUNING.md — tuning geral
- https://htmx.org/docs/#request-headers
- https://docs.rs/askama/latest/askama/
