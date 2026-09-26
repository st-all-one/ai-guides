API Gateway com Rate Limiting e Cache
=====================================

Visão geral
-----------
NGINX como API Gateway: um único ponto de entrada que
roteia requisições para diferentes upstreams (microservices),
aplica rate limiting por IP, cacheia respostas bem-sucedidas,
gerencia CORS e coleta métricas centralizadas.

Arquitetura
------------
```
                   ┌──────────┐
Cliente ────HTTPS──┤  NGINX   ├──→ upstream_users:8081
                   │ Gateway  ├──→ upstream_orders:8082
                   └──────────┘──→ upstream_payments:8083
                        │
                   /api/v1/users     → users
                   /api/v1/orders    → orders
                   /api/v1/payments  → payments
```

Configuração: `/etc/nginx/conf.d/api-gateway.conf`
--------------------------------------------------

```
# ── Upstream definitions ──────────────────────────────
upstream users {
    least_conn;
    server 10.0.1.10:8081 max_fails=3 fail_timeout=10s;
    server 10.0.1.11:8081 max_fails=3 fail_timeout=10s;
    keepalive 64;
}

upstream orders {
    least_conn;
    server 10.0.2.10:8082 max_fails=3 fail_timeout=10s;
    server 10.0.2.11:8082 max_fails=3 fail_timeout=10s;
    keepalive 64;
}

upstream payments {
    least_conn;
    server 10.0.3.10:8083 max_fails=3 fail_timeout=10s;
    server 10.0.3.11:8083 max_fails=3 fail_timeout=10s;
    keepalive 64;
}

# ── Rate limiting zones ────────────────────────────────
limit_req_zone  $binary_remote_addr  zone=api_global:10m  rate=300r/m;
limit_req_zone  $binary_remote_addr  zone=auth:10m        rate=10r/m;
limit_req_zone  $binary_remote_addr  zone=payments:10m    rate=50r/m;

# ── Cache de respostas da API ──────────────────────────
proxy_cache_path  /var/cache/nginx/api
                  levels=1:2
                  keys_zone=api_cache:32m
                  inactive=30m
                  max_size=256m
                  use_temp_path=off;


server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    # ── HTTP/3 (QUIC) ─────────────────────────────────
    # listen 443 quic reuseport;
    # listen [::]:443 quic reuseport;
    # add_header Alt-Svc 'h3=":443"; ma=86400';

    server_name api.exemplo.com;

    ssl_certificate     /etc/ssl/certs/exemplo.pem;
    ssl_certificate_key /etc/ssl/private/exemplo.key;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # ── Segurança ─────────────────────────────────────
    server_tokens     off;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options        DENY always;

    # ── CORS (global) ────────────────────────────────
    set $cors_origin "";
    if ($http_origin ~* "^https?://(app\.exemplo\.com|admin\.exemplo\.com)$") {
        set $cors_origin $http_origin;
    }
    add_header Access-Control-Allow-Origin      $cors_origin always;
    add_header Access-Control-Allow-Methods      "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
    add_header Access-Control-Allow-Headers      "Authorization, Content-Type, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials  "true" always;

    # ── Preflight (OPTIONS) — responder sem proxy ────
    if ($request_method = OPTIONS) {
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }

    # ── Log estruturado (JSON) ──────────────────────
    log_format api_json escape=json
        '{'
        '"time":"$time_iso8601",'
        '"remote_addr":"$remote_addr",'
        '"request":"$request",'
        '"status":$status,'
        '"body_bytes":$body_bytes_sent,'
        '"request_time":$request_time,'
        '"upstream_addr":"$upstream_addr",'
        '"upstream_status":"$upstream_status",'
        '"upstream_response_time":"$upstream_response_time",'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent"'
        '}';

    access_log /var/log/nginx/api-access.log api_json buffer=64k flush=5s;
    error_log  /var/log/nginx/api-error.log warn;

    # ── Rate limiting global ──────────────────────────
    limit_req zone=api_global burst=30 nodelay;
    limit_req_status 429;


    # ── Rotas ─────────────────────────────────────────

    # Auth — login/register (rate limit agressivo)
    location /api/v1/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://users;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Users — cacheia GETs de listagem/perfil
    location /api/v1/users/ {
        proxy_pass http://users;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        set $cache_key "$scheme$host$uri$is_args$args";
        proxy_cache api_cache;
        proxy_cache_key $cache_key;
        proxy_cache_valid 200 301 302 5m;
        proxy_cache_valid 404 1m;
        proxy_cache_bypass $http_cache_control;
        add_header X-Proxy-Cache $upstream_cache_status;

        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # Orders — sem cache (dados dinâmicos)
    location /api/v1/orders/ {
        proxy_pass http://orders;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # Payments — rate limit específico
    location /api/v1/payments/ {
        limit_req zone=payments burst=10 nodelay;
        proxy_pass http://payments;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # ── Health check interno (sem proxy) ──────────────
    location = /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    # ── Fallback (404) ────────────────────────────────
    location / {
        return 404;
    }

    # ── Gzip para respostas JSON ──────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types application/json application/problem+json;
}


server {
    listen      80;
    listen [::]:80;
    server_name api.exemplo.com;
    return 301 https://$host$request_uri;
}
```

Considerações de segurança
---------------------------
- `limit_req` com `burst + nodelay` → protege endpoints
  sem bloquear rajadas curtas legítimas.
- CORS seletivo por regex em `$http_origin` — jamais use
  `Access-Control-Allow-Origin: *` com credenciais.
- `proxy_set_header Connection ""` + `HTTP/1.1` → permite
  keepalive entre NGINX e upstream, reduzindo latência e
  file descriptors.
- Health check interno (`/health`) dispensa monitoria
  externa bater em endpoints de negócio.

Monitoramento
-------------
O log em JSON pode ser consumido por Elasticsearch, Loki
ou qualquer agregador. Campos críticos:
- `upstream_status` — detecta erros 5XX nos microservices
- `request_time` — lentidão no gateway
- `upstream_response_time` — lentidão no backend

Referências
-----------
- 11-HTTP-PROXY.md — proxy reverso
- 13-HTTP-LOAD-BALANCING.md — upstream e balanceamento
- 14-HTTP-CACHING.md — proxy cache
- 15-HTTP-REWRITE.md — rewrite de URIs
- 50-SECURITY-HARDENING.md — hardening
- 51-PERFORMANCE-TUNING.md — tuning
