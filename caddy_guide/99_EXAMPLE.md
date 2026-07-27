# 99 — Exemplo Completo: Caddy em Produção com Docker

Este exemplo cobre um cenário real: múltiplos serviços (frontend SPA + API REST + PHP + WebSocket) servidos por trás de um único Caddy em Docker, com HTTPS automático, monitoramento e boas práticas.

## Estrutura do Projeto

```
project/
├── docker-compose.yml      # Orquestração principal
├── caddy/
│   ├── Dockerfile           # Build customizado com plugins
│   ├── Caddyfile            # Configuração completa
│   └── data/                # Volume de dados (certificados, etc)
├── frontend/
│   ├── dist/                # Build do SPA (React/Vue/Angular)
│   └── Dockerfile
├── api/
│   ├── main.go              # API em Go/Node/Python
│   └── Dockerfile
├── php-app/
│   ├── public/              # WordPress/Laravel
│   └── Dockerfile
├── websocket/
│   └── server.js
├── prometheus/
│   └── prometheus.yml
└── grafana/
    └── provisioning/
```

## 1. Caddyfile (completo, comentado)

```caddy
# ═══════════════════════════════════════════════════════════════
# GLOBAL OPTIONS
# ═══════════════════════════════════════════════════════════════
{
    # ── Performance ──────────────────────────────────────────
    # Compressão zstd + gzip com preferência zstd
    # Comentado porque é configurado por site abaixo
    # (pode ficar aqui para aplicar a todos)

    # ── TLS / ACME ───────────────────────────────────────────
    email admin@example.com              # Obrigatório para ACME
    acme_ca https://acme-v02.api.letsencrypt.org/directory
    key_type ed25519                     # Handshakes 5-10x mais rápidos que RSA

    # ── OCSP Stapling ────────────────────────────────────────
    ocsp_interval 30m                    # Verificar a cada 30 min (default: 1h)

    # ── Storage ─────────────────────────────────────────────
    storage file_system /data            # Persistir certificados

    # ── Admin API ────────────────────────────────────────────
    admin :2019                          # Apenas rede interna do Docker
    # admin off                          # Descomentar se não usar reload via API

    # ── Logging global ──────────────────────────────────────
    log default {
        output file /var/log/caddy/app.log {
            roll true                    # Rotação automática
            roll_size 100mb
            roll_keep 10
            roll_keep_days 90
        }
        format json                     # Structured logs para Loki/Elastic
        level INFO
    }

    # ── Server-level timeouts ───────────────────────────────
    servers {
        trusted_proxies static private_ranges  # Confiar redes internas
        trusted_proxies_strict                  # Right-to-left XFF parsing

        timeouts {
            read_body   10s              # Slowloris protection
            read_header 5s
            write       60s              # Para uploads grandes
            idle        120s             # Keep-alive max
        }

        max_header_size 1MB

        protocols h1 h2 h3               # HTTP/1.1 + HTTP/2 + HTTP/3 (QUIC)
    }

    # ── Metrics ─────────────────────────────────────────────
    metrics {
        per_host
    }
}

# ═══════════════════════════════════════════════════════════════
# SITE 1: Frontend SPA (React/Vue/Angular)
# ═══════════════════════════════════════════════════════════════
app.example.com {
    # ── Root ─────────────────────────────────────────────────
    root * /var/www

    # ── Security Headers ────────────────────────────────────
    header {
        # HSTS: 2 anos, incluir subdomínios, pré-carregar
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"

        # Prevenir clickjacking
        X-Frame-Options "DENY"

        # Proteção XSS (obsoleto mas ainda utilizado)
        X-XSS-Protection "1; mode=block"

        # Prevenir MIME sniffing
        X-Content-Type-Options "nosniff"

        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"

        # Content Security Policy (ajustar conforme necessidade)
        default-src 'self'
        script-src 'self' 'unsafe-inline'
        style-src 'self' 'unsafe-inline'
        img-src 'self' data: https:
        connect-src 'self' https://api.example.com wss://ws.example.com
        frame-ancestors 'none'

        # Permissions Policy
        Permissions-Policy "camera=(), microphone=(), geolocation=()"

        # Remove server banner
        -Server

        # Cache de assets estáticos (1 ano)
        ~\.(jpg|jpeg|png|gif|ico|svg|webp|woff2?|ttf|eot)$ {
            Cache-Control "public, max-age=31536000, immutable"
        }
        ~\.(js|css|mjs)$ {
            Cache-Control "public, max-age=31536000, immutable"
        }
        ~\.(html|json)$ {
            Cache-Control "no-cache"
        }
    }

    # ── Compressão ──────────────────────────────────────────
    encode zstd gzip {
        minimum_length 256               # Comprimir respostas > 256 bytes
        match {
            header Content-Type text/*
            header Content-Type application/json*
            header Content-Type application/javascript*
        }
    }

    # ── CORS para API (apenas quando Origin é esperado) ────
    @cors {
        header Origin *
        path /api/*
    }
    header @cors Access-Control-Allow-Origin *
    header @cors Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    header @cors Access-Control-Allow-Headers Content-Type, Authorization
    header @cors Access-Control-Max-Age 86400

    @preflight {
        method OPTIONS
        path /api/*
    }
    respond @preflight 204               # CORS preflight sem corpo

    # ── SPA Fallback ────────────────────────────────────────
    # Requests que não correspondem a arquivos existentes
    # servem index.html (para React Router, Vue Router, etc.)
    try_files {path} /index.html

    # ── Static Files ────────────────────────────────────────
    file_server {
        precompressed br zstd gzip       # Usar arquivos .br/.zst/.gz pré-compactados
        hide .git .env                    # Esconder arquivos sensíveis
    }

    # ── Logging específico ──────────────────────────────────
    log {
        output file /var/log/caddy/frontend-access.log {
            roll_size 50mb
            roll_keep 7
        }
        format json
    }

    # ── Health Check ────────────────────────────────────────
    handle /health {
        @shutting_down vars {http.shutting_down} true
        respond @shutting_down "shutting down" 503
        respond "ok" 200
    }
}

# ═══════════════════════════════════════════════════════════════
# SITE 2: API REST (Go/Node/Python)
# ═══════════════════════════════════════════════════════════════
api.example.com {
    # ── Reverse Proxy com Load Balancing ────────────────────
    reverse_proxy api:8080 api:8081 api:8082 {
        # ── Load Balancing ────────────────────────────────
        lb_policy least_conn              # Distribuir para o menos ocupado
        lb_try_duration 5s               # Tentar por 5s antes de desistir
        lb_try_interval 250ms
        lb_retries 2

        # ── Active Health Checks ──────────────────────────
        health_uri /health
        health_interval 10s
        health_timeout 3s
        health_status 2xx
        health_body "ok"

        # ── Passive Health Checks ─────────────────────────
        fail_duration 30s
        max_fails 3
        unhealthy_status 5xx
        unhealthy_latency 10s

        # ── Transport ─────────────────────────────────────
        transport http {
            dial_timeout 3s
            response_header_timeout 30s
            read_timeout 60s
            write_timeout 30s

            # Keep-alive tuning
            keepalive 2m
            keepalive_interval 30s
            keepalive_idle_conns_per_host 32

            # Confiar TLS interno
            tls_trust_pool file /etc/caddy/internal-ca.pem
            tls_server_name api.internal
        }

        # ── Headers ───────────────────────────────────────
        header_up X-Real-IP {remote_host}
        header_up X-Request-ID {uuid}
        header_down -Server

        # ── Response Interception ─────────────────────────
        @error status 500 502 503 504
        handle_response @error {
            root /etc/caddy/error-pages
            rewrite /{rp.status_code}.json
            file_server
        }
    }

    # ── Rate Limiting (requer plugin) ─────────────────────
    rate_limit {
        zone api_zone {
            key {client_ip}
            events 100
            window 1m
        }
    }

    # ── Logging ────────────────────────────────────────────
    log {
        output file /var/log/caddy/api-access.log {
            roll_size 100mb
            roll_keep 14
        }
        format json
    }
}

# ═══════════════════════════════════════════════════════════════
# SITE 3: PHP App (WordPress/Laravel) via PHP-FPM
# ═══════════════════════════════════════════════════════════════
blog.example.com {
    # ── Compressão ──────────────────────────────────────────
    encode zstd gzip

    # ── PHP-FPM ─────────────────────────────────────────────
    root * /var/www/html
    php_fastcgi php-fpm:9000 {
        env APP_ENV production
        env APP_DEBUG 0
    }

    # ── Static Files ────────────────────────────────────────
    file_server

    # ── Cache de assets ────────────────────────────────────
    header ~\.(jpg|jpeg|png|gif|ico|css|js|svg|webp)$ {
        Cache-Control "public, max-age=31536000, immutable"
    }
}

# ═══════════════════════════════════════════════════════════════
# SITE 4: WebSocket Server
# ═══════════════════════════════════════════════════════════════
ws.example.com {
    reverse_proxy websocket:6001 {
        # ── Streaming (WebSocket) ─────────────────────────
        flush_interval -1                # Low-latency mode, sem buffering
        stream_timeout 24h               # Timeout máximo para conexão longa
        stream_close_delay 5m            # Evitar thundering herd em reload

        # ── Headers para WebSocket ───────────────────────
        header_up -Origin

        # ── Health check específico ──────────────────────
        health_uri /health
        health_interval 30s
    }

    # ── Rate limiting mais brando para WS ────────────────
    rate_limit {
        zone ws_zone {
            key {client_ip}
            events 1000
            window 1m
        }
    }
}

# ═══════════════════════════════════════════════════════════════
# SITE 5: Prometheus Metrics Endpoint (protegido)
# ═══════════════════════════════════════════════════════════════
metrics.example.com {
    basicauth {
        prometheus $2a$14$hash...       # Gerar com: caddy hash-password
    }

    reverse_proxy localhost:2019         # Admin API local
}
```

## 2. Dockerfile (build customizado)

```dockerfile
# caddy/Dockerfile
FROM caddy:builder AS builder

# Adicionar plugins necessários
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/caddyserver/transform-encoder

FROM caddy:latest

# Certificados internos para comunicação entre serviços
COPY internal-ca.pem /etc/caddy/internal-ca.pem

# Páginas de erro customizadas
COPY error-pages/ /etc/caddy/error-pages/

COPY Caddyfile /etc/caddy/Caddyfile

# Health check do container
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:2019/config/ || exit 1
```

## 3. Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  # ── Caddy ──────────────────────────────────────────────────
  caddy:
    build:
      context: ./caddy
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"          # HTTP/3 (QUIC)
      - "2019:2019"            # Admin API (não expor publicamente)
    volumes:
      - caddy_data:/data
      - caddy_config:/config
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy/error-pages:/etc/caddy/error-pages:ro
      - ./frontend/dist:/var/www:ro
    restart: unless-stopped
    cap_add:
      - NET_ADMIN              # Necessário para HTTP/3
    networks:
      - frontend
      - backend
    environment:
      - CADDY_ADMIN=:2019
    labels:
      prometheus_job: "caddy"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ── API ────────────────────────────────────────────────────
  api:
    build: ./api
    expose:
      - "8080"
      - "8081"
      - "8082"
    volumes:
      - api_data:/data
    networks:
      - backend
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    deploy:
      replicas: 3               # Escalar para 3 instâncias
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ── PHP-FPM ────────────────────────────────────────────────
  php-fpm:
    image: php:8.2-fpm
    volumes:
      - ./php-app:/var/www/html
    networks:
      - backend
    healthcheck:
      test: ["CMD", "php-fpm-healthcheck"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped

  # ── WebSocket ──────────────────────────────────────────────
  websocket:
    build: ./websocket
    expose:
      - "6001"
    networks:
      - backend
    restart: unless-stopped

  # ── Database ───────────────────────────────────────────────
  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    restart: unless-stopped

  # ── Redis (cache/session) ────────────────────────────────
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - backend
    restart: unless-stopped

  # ── Prometheus ─────────────────────────────────────────────
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - frontend
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'

  # ── Grafana ────────────────────────────────────────────────
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    networks:
      - frontend
    restart: unless-stopped

  # ── Loki (logs agregados) ─────────────────────────────────
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki_data:/loki
    networks:
      - frontend
    command: -config.file=/etc/loki/local-config.yaml

volumes:
  caddy_data:
  caddy_config:
  api_data:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  loki_data:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true              # Backend isolado da internet
```

## 4. Prometheus Config

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'caddy'
    scrape_interval: 10s
    static_configs:
      - targets: ['caddy:2019']
        labels:
          service: 'caddy'

  - job_name: 'api'
    scrape_interval: 15s
    static_configs:
      - targets: ['api:8080']
        labels:
          service: 'api'

  - job_name: 'node'
    scrape_interval: 30s
    static_configs:
      - targets: ['node-exporter:9100']
```

## 5. Variáveis de Ambiente

```bash
# .env
DOMAIN=example.com
ADMIN_EMAIL=admin@example.com
CLOUDFLARE_API_TOKEN=your_token_here
DB_PASSWORD=strong_password_here
GRAFANA_PASSWORD=admin
```

## 6. Deploy

```bash
# 1. Build e start
docker compose up -d --build

# 2. Verificar logs
docker compose logs -f caddy

# 3. Verificar health
curl -k https://app.example.com/health
curl -k https://api.example.com/health

# 4. Verificar métricas
curl -s http://localhost:2019/metrics | head -20

# 5. Recarregar config sem downtime
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# 6. Backup de certificados
docker compose exec caddy tar czf /tmp/certs.tar.gz -C /data certificates/
docker compose cp caddy:/tmp/certs.tar.gz ./backup/
```

## 7. Checklist de Produção

- [ ] `email` configurado no Caddyfile
- [ ] Portas 80/443 acessíveis externamente
- [ ] DNS apontando para o servidor (A/AAAA records)
- [ ] HTTP/3: UDP 443 aberto no firewall
- [ ] `trusted_proxies` configurado (se atrás de CDN)
- [ ] `max_header_size` e timeouts configurados
- [ ] Rate limiting ativo para endpoints públicos
- [ ] Health checks configurados em todos os serviços
- [ ] Logs com rotação configurada
- [ ] Backup automatizado de certificados
- [ ] Monitoramento (Prometheus + Grafana)
- [ ] `CADDY_ADMIN` não exposto publicamente
- [ ] Usuário não-root (padrão Docker)
- [ ] Secrets gerenciados via Docker secrets ou vault
- [ ] Updates de certificados testados
- [ ] Staging CA testado antes de produção
```

