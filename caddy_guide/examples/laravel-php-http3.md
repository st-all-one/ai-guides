# Exemplo: Laravel 5.5 + PHP 7.2 com HTTP/3

Stack legado otimizado: **PHP 7.2 + Laravel 5.5 + MySQL 5.7 + Redis + Caddy com HTTP/3**.

> Laravel 5.5 requer PHP 7.0–8.0. PHP 7.2 é o sweet spot. Esta config maximiza performance mesmo com versões antigas.

## Estrutura

```
laravel-project/
├── docker-compose.yml
├── caddy/
│   ├── Dockerfile
│   ├── Caddyfile
│   └── error-pages/
│       ├── 404.html
│       └── 500.html
├── app/
│   ├── Dockerfile
│   └── (código Laravel montado via volume)
├── mysql/
│   └── init.sql
└── .env
```

## 1. Caddyfile

```caddy
# ── Global ──────────────────────────────────────────────────
{
    email admin@example.com
    key_type ed25519

    servers {
        protocols h1 h2 h3               # HTTP/3 ativo
        trusted_proxies static private_ranges
        trusted_proxies_strict

        timeouts {
            read_body   15s              # Laravel uploads podem ser grandes
            read_header 5s
            write       120s             # Suporte a uploads grandes
            idle        60s
        }

        max_header_size 10MB             # Laravel session cookies podem ser grandes
    }

    ocsp_interval 30m

    metrics {
        per_host
    }
}

# ── APP ─────────────────────────────────────────────────────
*.laravel.example.com, laravel.example.com {
    # ── Raiz do Laravel ────────────────────────────────────
    root * /var/www/public              # Sempre aponte para /public

    # ── PHP-FPM ─────────────────────────────────────────────
    php_fastcgi app:9000 {
        # PHP 7.2 precisa de split explícito
        split .php

        # ENVs do Laravel
        env APP_ENV production
        env APP_DEBUG 0
        env DB_CONNECTION mysql
        env DB_HOST db
        env DB_PORT 3306
        env DB_DATABASE laravel
        env DB_USERNAME laravel
        env DB_PASSWORD {env.DB_PASSWORD}
        env REDIS_HOST redis
        env REDIS_PORT 6379
        env SESSION_DRIVER redis
        env CACHE_DRIVER redis
        env QUEUE_CONNECTION redis
        env BROADCAST_DRIVER log
        env LOG_CHANNEL stderr

        # Laravel 5.5 específico
        env APP_KEY {env.APP_KEY}
        env APP_URL https://laravel.example.com
    }

    # ── Compressão (zstd + gzip) ──────────────────────────
    encode zstd gzip {
        minimum_length 512
        match {
            header Content-Type text/*
            header Content-Type application/json*
            header Content-Type application/javascript*
            header Content-Type image/svg+xml*
        }
    }

    # ── Cache de Assets (Laravel mix versioning) ──────────
    header {
        # Assets versionados (com hash no filename)
        ~\.(css|js|mjs)$ {
            Cache-Control "public, max-age=31536000, immutable"
        }
        # Fontes e imagens
        ~\.(woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$ {
            Cache-Control "public, max-age=31536000, immutable"
        }
        # HTML e JSON: evitar cache
        ~\.(html|json|xml)$ {
            Cache-Control "no-cache, no-store, must-revalidate"
        }

        # Security headers
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"

        # Laravel-specific: esconder versão do PHP
        -X-Powered-By
        -Server

        # CSP para Laravel (ajustar conforme necessário)
        Content-Security-Policy "
            default-src 'self';
            script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
            style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
            font-src 'self' https://cdn.jsdelivr.net data:;
            img-src 'self' data: https:;
            connect-src 'self';
            frame-ancestors 'none';
        "
    }

    # ── Static Files ───────────────────────────────────────
    file_server {
        index index.php
        hide .env .git composer.json composer.lock storage/app
    }

    # ── Logging ─────────────────────────────────────────────
    log {
        output file /var/log/caddy/laravel-access.log {
            roll_size 100mb
            roll_keep 30
            roll_keep_days 90
        }
        format json
    }

    # ── Health Check ────────────────────────────────────────
    handle /caddy-health {
        respond "ok" 200
    }

    # ── Páginas de Erro ────────────────────────────────────
    handle_errors {
        rewrite /{err.status_code}.html
        root /etc/caddy/error-pages
        file_server
    }
}

# ── Horizon / Queue (painel Laravel Horizon) ───────────────
horizon.laravel.example.com {
    basicauth {
        admin {env.HORIZON_PASSWORD_HASH}
    }

    reverse_proxy app:9000 {
        transport fastcgi {
            split .php
        }
    }
}
```

## 2. Dockerfile do Caddy

```dockerfile
FROM caddy:builder AS builder
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:latest
COPY Caddyfile /etc/caddy/Caddyfile
COPY error-pages/ /etc/caddy/error-pages/

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:2019/config/ || exit 1
```

## 3. Dockerfile da App (PHP 7.2)

```dockerfile
FROM php:7.2-fpm-alpine

# PHP 7.2 + extensões Laravel
RUN docker-php-ext-install \
    pdo_mysql \
    mbstring \
    bcmath \
    opcache \
    && apk add --no-cache $PHPIZE_DEPS \
    && pecl install redis-5.3.7 \
    && docker-php-ext-enable redis

# OPcache tuning para PHP 7.2
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=256'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=20000'; \
    echo 'opcache.revalidate_freq=60'; \
    echo 'opcache.fast_shutdown=1'; \
    echo 'opcache.validate_timestamps=1'; \
    echo 'opcache.revalidate_path=0'; \
    echo 'realpath_cache_size=4096K'; \
    echo 'realpath_cache_ttl=600'; \
} > /usr/local/etc/php/conf.d/opcache.ini

# PHP tuning
RUN { \
    echo 'memory_limit=256M'; \
    echo 'upload_max_filesize=100M'; \
    echo 'post_max_size=108M'; \
    echo 'max_execution_time=300'; \
    echo 'max_input_time=300'; \
    echo 'max_input_vars=5000'; \
    echo 'date.timezone=UTC'; \
} > /usr/local/etc/php/conf.d/custom.ini

WORKDIR /var/www
COPY --chown=www-data:www-data . .

# Laravel 5.5: permissões
RUN chmod -R 775 storage bootstrap/cache

EXPOSE 9000
```

## 4. Docker Compose

```yaml
version: "3.8"

services:
  caddy:
    build: ./caddy
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"          # HTTP/3 (QUIC)
    volumes:
      - caddy_data:/data
      - caddy_config:/config
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
    networks:
      - frontend
    environment:
      - CADDY_ADMIN=:2019
    depends_on:
      app:
        condition: service_healthy

  app:
    build: ./app
    volumes:
      - ./app:/var/www
    restart: unless-stopped
    networks:
      - backend
    environment:
      - DB_PASSWORD=${DB_PASSWORD}
      - APP_KEY=${APP_KEY}
      - HORIZON_PASSWORD_HASH=${HORIZON_PASSWORD_HASH}
    healthcheck:
      test: ["CMD", "php", "-v"]
      interval: 10s
      timeout: 3s
      retries: 3

  db:
    image: mysql:5.7
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - backend
    environment:
      MYSQL_DATABASE: laravel
      MYSQL_USER: laravel
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --innodb_buffer_pool_size=2G
      --innodb_log_file_size=512M
      --max_connections=500

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - backend
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru

  queue:
    build: ./app
    command: php artisan queue:work redis --sleep=3 --tries=3 --timeout=300
    volumes:
      - ./app:/var/www
    restart: unless-stopped
    networks:
      - backend
    environment:
      - DB_PASSWORD=${DB_PASSWORD}
      - APP_KEY=${APP_KEY}
    depends_on:
      - redis
      - db

  scheduler:
    build: ./app
    command: php artisan schedule:work
    volumes:
      - ./app:/var/www
    restart: unless-stopped
    networks:
      - backend
    environment:
      - DB_PASSWORD=${DB_PASSWORD}
      - APP_KEY=${APP_KEY}
    depends_on:
      - redis
      - db

volumes:
  caddy_data:
  caddy_config:
  mysql_data:
  redis_data:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

## 5. .env

```bash
DB_PASSWORD=supersecret
DB_ROOT_PASSWORD=rootsecret
APP_KEY=base64:xxxxxxxxxxxxxxxxxxxxxxxxx
HORIZON_PASSWORD_HASH=$2y$10$...
```

## 6. Geração da APP_KEY (Laravel 5.5)

```bash
# Executar uma vez para gerar a key
docker compose run --rm app php artisan key:generate --show
# Copiar o output para .env como APP_KEY
```

## 7. OPcache + PHP 7.2 Tuning

As configs de OPcache acima são específicas para PHP 7.2:

| Diretiva | Valor | Motivo |
|----------|-------|--------|
| `opcache.memory_consumption` | 256MB | Laravel 5.5 tem ~200 classes |
| `opcache.interned_strings_buffer` | 16 | Strings internas |
| `opcache.max_accelerated_files` | 20000 | Cobre vendor + app |
| `opcache.revalidate_freq` | 60 | Produção: revalidar a cada 60s |

## 8. HTTP/3 (QUIC) — Verificação

```bash
# Testar HTTP/3
curl --http3 -I https://laravel.example.com

# Verificar se portas UDP estão abertas
nc -zvu laravel.example.com 443

# Logs do Caddy para confirmar
docker compose logs caddy | grep -i "http\/3\|quic\|h3"
```

## 9. Comandos Úteis

```bash
# Build e start
docker compose up -d --build

# Rodar migrations
docker compose exec app php artisan migrate --force

# Cache Laravel 5.5
docker compose exec app php artisan config:cache
docker compose exec app php artisan route:cache
docker compose exec app php artisan view:cache

# Reload Caddy sem downtime
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Ver logs em tempo real
docker compose logs -f caddy app

# Backup DB
docker compose exec db mysqldump -u root -p${DB_ROOT_PASSWORD} laravel > backup.sql
```

## 10. Considerações PHP 7.2 / Laravel 5.5

- **PHP 7.2 está EOL desde 2020** — esta config minimiza riscos com isolation Docker e sem ext exposta
- **Laravel 5.5** não suporta nativamente HTTP/3; Caddy faz a terminação QUIC externamente
- **Session driver Redis** essencial para performance com múltiplas réplicas
- **Queue worker** separado para não bloquear o FPM
- **Scheduler** container separado (Laravel 5.5 não tem `schedule:work`; usar cron no container)
