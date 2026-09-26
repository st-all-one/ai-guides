# 10 — Padrões de Integração

## Static File Server

```caddy
example.com {
    root * /var/www
    encode zstd gzip
    file_server {
        precompressed br zstd gzip
        hide .git
    }
}
```

## Reverse Proxy (API Backend)

```caddy
api.example.com {
    reverse_proxy localhost:8080 {
        lb_policy least_conn
        health_uri /health
        health_interval 10s
        fail_duration 30s
    }
}
```

## Path-based Reverse Proxy

```caddy
example.com {
    handle_path /api/* {
        reverse_proxy localhost:8080
    }
    handle_path /app/* {
        reverse_proxy localhost:3000
    }
    root * /var/www
    file_server
}
```

## PHP (PHP-FPM)

```caddy
example.com {
    root * /var/www
    encode zstd gzip
    php_fastcgi unix//var/run/php/php8.2-fpm.sock
    file_server
}
```

### Configuração Explícita

```caddy
example.com {
    root * /var/www
    encode zstd gzip
    reverse_proxy unix//var/run/php/php8.2-fpm.sock {
        transport fastcgi {
            root /var/www
            split .php
            env APP_ENV production
        }
    }
    file_server
}
```

## Single-Page Application (SPA)

### React / Vue / Angular

```caddy
example.com {
    root * /var/www/spa
    encode zstd gzip
    try_files {path} /index.html  # SPA fallback
    file_server
}
```

### SPA com API

```caddy
example.com {
    handle_path /api/* {
        reverse_proxy localhost:8080
    }

    root * /var/www/spa
    encode zstd gzip
    try_files {path} /index.html
    file_server
}
```

## Redirect www

### Add www

```caddy
example.com {
    redir https://www.example.com{uri} 301
}

www.example.com {
    root * /var/www
    encode zstd gzip
    file_server
}
```

### Remove www

```caddy
www.example.com {
    redir https://example.com{uri} 301
}

example.com {
    root * /var/www
    encode zstd gzip
    file_server
}
```

## Trailing Slash

### Internal (Caddyfile)

Caddy já normaliza trailing slashes por default no `file_server`.
Para controle explícito:

```caddy
example.com {
    @missing_slash {
        path /
        not path */
    }
    redir @missing_slash {path}/ 301
}
```

### External (para o cliente)

```caddy
example.com {
    redir /path{uri} /path/{uri} 301
}
```

## Wildcard Certificates

```caddy
*.example.com, example.com {
    root * /var/www
    file_server
}
```

Requer DNS challenge:

```caddy
{
    acme_dns cloudflare {env.CLOUDFLARE_API_TOKEN}
}
```

## Caddy → Caddy (proxy chain)

### Forward proxy

```caddy
# Edge Caddy
edge.example.com {
    reverse_proxy internal:8080
}

# Internal Caddy
internal:8080 {
    root * /var/www
    file_server
}
```

### Unix Socket proxy

```caddy
# Edge (público)
edge.example.com {
    reverse_proxy unix//run/internal-caddy.sock
}

# Internal (localhost)
:8080 {
    bind unix//run/internal-caddy.sock
    root * /var/www
    file_server
}
```

## CDN Integration (Cloudflare)

### Trusted Proxies

```caddy
{
    servers {
        trusted_proxies static private_ranges
        trusted_proxies_strict
        client_ip_headers X-Forwarded-For CF-Connecting-IP
    }
}
```

### Real IP

```caddy
{
    servers {
        trusted_proxies static 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22
        trusted_proxies_strict
    }
}
```

## Autenticação Delegada (forward_auth)

### Authelia / OAuth2 Proxy

```caddy
example.com {
    forward_auth localhost:9090 {
        uri /api/verify?rd=https://auth.example.com/
        copy_headers Authorization Remote-User Remote-Groups
    }

    root * /var/www
    file_server
}
```

## Basic Auth

```caddy
example.com {
    basicauth * {
        user $2a$14$hash...
    }
    root * /var/www
    file_server
}
```

Gerar hash: `caddy hash-password`

## Rate Limiting (plugin)

```caddy
{
    order rate_limit before basicauth
}

example.com {
    rate_limit {
        zone dynamic {
            key {client_ip}
            events 100
            window 1m
        }
    }

    root * /var/www
    file_server
}
```

## ACME Server (internal CA)

```caddy
ca.internal {
    acme_server {
        lifetime 360h
        ca my-internal-ca
    }
}

# Configurar PKI
{
    pki {
        ca my-internal-ca {
            name "Internal CA"
        }
    }
}

# Outros servidores usam esta CA
{
    acme_ca https://ca.internal/acme/local/directory
    acme_ca_root /etc/caddy/internal-ca.pem
}
```

## Compressão Customizada

```caddy
encode {
    match {
        header Content-Type text/*
        header Content-Type application/json*
        header Content-Type application/grpc*
    }
    minimum_length 256
    zstd best
    gzip 5
}
```

## CORS

```caddy
example.com {
    @cors {
        header Origin *
    }
    header @cors Access-Control-Allow-Origin *
    header @cors Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    header @cors Access-Control-Allow-Headers Content-Type, Authorization
    header @cors Access-Control-Max-Age 86400

    @preflight {
        method OPTIONS
        header Origin *
    }
    respond @preflight 204
}
```

## HSTS

```caddy
example.com {
    header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    root * /var/www
    file_server
}
```

## Multi-site (virtual hosts)

```caddy
site1.com, www.site1.com {
    root * /var/www/site1
    encode zstd gzip
    file_server
}

site2.com, www.site2.com {
    reverse_proxy localhost:3000
}

api.site1.com {
    reverse_proxy localhost:8080 {
        health_uri /health
    }
}
```

## Subpath para subfolder problem

```caddy
example.com {
    handle_path /app/* {
        reverse_proxy localhost:3000
    }

    root * /var/www
    file_server
}
```

Ver: [The subfolder problem](https://caddy.community/t/the-subfolder-problem-or-why-cant-i-reverse-proxy-my-app-into-a-subfolder/8575)

## HTTP/3 Only

```caddy
{
    servers :443 {
        protocols h3
    }
}
```

## Graceful Health Checks

```caddy
{
    shutdown_delay 30s
    grace_period 10s
}

example.com {
    handle /health {
        @shutdown vars {http.shutting_down} true
        respond @shutdown "unhealthy" 503
        respond "healthy" 200
    }
}
```
