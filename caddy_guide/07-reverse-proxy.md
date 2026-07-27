# 07 — Reverse Proxy

## Visão Geral

Caddy's `reverse_proxy` é um proxy reverso completo com load balancing, health checks, streaming, manipulação de headers, e interceptação de respostas.

## Syntax

```caddy
reverse_proxy [<matcher>] [<upstreams...>] {
    # backends
    to      <upstreams...>
    dynamic <module> ...

    # load balancing
    lb_policy       <name> [<options...>]
    lb_retries      <retries>
    lb_try_duration <duration>
    lb_try_interval <interval>
    lb_retry_match  <request-matcher>

    # active health checks
    health_uri          <uri>
    health_port         <port>
    health_interval     <interval>
    health_passes       <num>
    health_fails        <num>
    health_timeout      <duration>

    # passive health checks
    fail_duration     <duration>
    max_fails         <num>
    unhealthy_status  <status>
    unhealthy_latency <duration>

    # streaming
    flush_interval     <duration>
    request_buffers    <size>
    response_buffers   <size>
    stream_timeout     <duration>
    stream_close_delay <duration>

    # headers
    header_up   [+|-]<field> [<value|regexp> [<replacement>]]
    header_down [+|-]<field> [<value|regexp> [<replacement>]]

    # transport
    transport <name> { ... }

    # response interception
    replace_status [<matcher>] <status_code>
    handle_response [<matcher>] { ... }
}
```

## Upstream Addresses

```caddy
reverse_proxy localhost:4000
reverse_proxy https://example.com
reverse_proxy h2c://127.0.0.1:8080
reverse_proxy unix//var/php.sock
reverse_proxy localhost:8001-8006  # range: 6 upstreams
```

- `https://` prefix → transport com TLS
- `h2c://` prefix → HTTP/2 cleartext
- Port ranges: expandem para múltiplos upstreams

## Load Balancing Policies

| Policy | Descrição |
|--------|-----------|
| `random` | Aleatório (default) |
| `random_choose <n>` | Seleciona n aleatórios, pega o de menor carga |
| `first` | First available (failover primário/secundário) |
| `round_robin` | Round-robin |
| `weighted_round_robin <weights...>` | Com pesos |
| `least_conn` | Menos conexões ativas |
| `ip_hash` | Sticky por IP do peer |
| `client_ip_hash` | Sticky por IP do cliente (requer trusted_proxies) |
| `uri_hash` | Sticky por URI |
| `query <key>` | Sticky por query param |
| `header <field>` | Sticky por header |
| `cookie [<name> [<secret>]]` | Sticky por cookie |

### Sticky Session com Cookie

```caddy
reverse_proxy node1:80 node2:80 node3:80 {
    lb_policy cookie lb_secret my_secret_key
}
```

### Fallback de Políticas

```caddy
lb_policy header X-Upstream {
    fallback first
}
```

## Health Checks

### Active Health Checks

```caddy
reverse_proxy node1:80 node2:80 {
    health_uri      /healthz
    health_port     8080            # opcional: porta diferente
    health_interval 30s             # default
    health_timeout  5s              # default
    health_passes   1               # consecutive passes to become healthy
    health_fails    1               # consecutive fails to become unhealthy
    health_status   2xx             # ou 200, etc.
    health_method   GET             # default
    health_body     "OK"            # match no body
    health_headers {
        Host health.local
    }
}
```

### Passive Health Checks

```caddy
reverse_proxy node1:80 node2:80 {
    fail_duration           30s  # ativa passive HC
    max_fails               3
    unhealthy_status        5xx
    unhealthy_latency       10s  # request lento = failed
    unhealthy_request_count 100  # sobrecarga = failed
}
```

## Retries

```caddy
reverse_proxy node1:80 node2:80 {
    lb_try_duration 5s
    lb_try_interval 250ms
    lb_retries      2
    lb_retry_match  method GET  # só retry em GET (default)
}
```

## Streaming

```caddy
reverse_proxy localhost:8080 {
    flush_interval     -1     # low-latency mode
    stream_timeout     24h    # timeout de conexões longas
    stream_close_delay 5m     # delay para evitar thundering herd em reload
}
```

### WebSocket

Suportado automaticamente sem config extra. O proxy faz upgrade HTTP e transiciona para túnel bidirecional.

### Server-Sent Events (SSE)

Flushing automático quando `Content-Type: text/event-stream`.

## Headers

### Defaults

Caddy passa headers originais (incluindo `Host`) sem modificação, exceto:

- `X-Forwarded-For` — adiciona/aumenta
- `X-Forwarded-Proto` — seta
- `X-Forwarded-Host` — seta
- `Accept-Encoding: gzip` — adiciona se ausente (transport http)

### Manipulação

```caddy
reverse_proxy localhost:8080 {
    header_up -Authorization          # deleta
    header_up +X-Custom "value"       # adiciona
    header_up X-Override "new-value"  # sobrescreve
    header_down -Server               # deleta do response

    # Regex replacement
    header_up X-Forwarded-For "^([^,]+)" "$1"

    # Para HTTPS upstream: Host automaticamente setado desde v2.11.0
    # Desativar comportamento automático:
    header_up Host {hostport}
}
```

### Trusted Proxies

```caddy
{
    servers {
        trusted_proxies static private_ranges  # ou CIDRs específicos
        trusted_proxies_strict                  # right-to-left XFF
    }
}
```

## Transports

### HTTP Transport

```caddy
reverse_proxy localhost:8080 {
    transport http {
        read_buffer                4KiB
        write_buffer               4KiB
        max_response_header        10MiB
        dial_timeout               3s
        dial_fallback_delay        300ms
        response_header_timeout    30s
        expect_continue_timeout    1s
        resolvers                  8.8.8.8 1.1.1.1

        tls
        tls_client_auth <cert> <key>
        tls_insecure_skip_verify    # ⚠️ evitar em produção
        tls_server_name example.com
        tls_curves x25519 secp256r1

        keepalive                  2m
        keepalive_interval         30s
        keepalive_idle_conns       0          # sem limite
        keepalive_idle_conns_per_host 32

        versions                   1.1 2      # default
        compression                off        # desabilitar se backend já comprime
        max_conns_per_host         100
        proxy_protocol             v1|v2      # PROXY protocol para upstream
        network_proxy              none|url <url>
    }
}
```

### FastCGI Transport

```caddy
reverse_proxy localhost:9000 {
    transport fastcgi {
        root               /var/www
        split              .php
        env                APP_ENV production
        resolve_root_symlink
        dial_timeout       3s
        read_timeout       60s
        write_timeout      60s
        capture_stderr
    }
}
```

## Dynamic Upstreams

### SRV Records

```caddy
reverse_proxy {
    dynamic srv _api._tcp.example.com {
        refresh 1m
    }
}
```

### A/AAAA Records

```caddy
reverse_proxy {
    dynamic a example.com 9000 {
        refresh 1m
        versions ipv4 ipv6
    }
}
```

### Multi (múltiplas fontes)

```caddy
reverse_proxy {
    dynamic multi {
        srv _api._tcp.primary.example.com
        srv _api._tcp.backup.example.com
    }
}
```

## Response Interception

### Mudar Status Code

```caddy
reverse_proxy localhost:8080 {
    replace_status 500 "Service Unavailable"
}
```

### Handle Response Customizado

```caddy
reverse_proxy localhost:8080 {
    @error status 500 502 503
    handle_response @error {
        root /var/error-pages
        rewrite /{rp.status_code}.html
        file_server
    }
}
```

### X-Accel-Redirect (Nginx-style)

```caddy
reverse_proxy localhost:8080 {
    @accel header X-Accel-Redirect *
    handle_response @accel {
        root /private/files
        rewrite {rp.header.X-Accel-Redirect}
        method GET
        file_server
    }
}
```

### copy_response / copy_response_headers

```caddy
reverse_proxy localhost:8080 {
    handle_response {
        copy_response 200  # copia body com status 200
        copy_response_headers {
            exclude Server
        }
    }
}
```

## Forward Auth

```caddy
forward_auth localhost:9090 {
    uri /auth

    # Headers enviados ao auth service
    copy_headers Authorization X-Real-IP

    # Headers copiados do auth service para a request original
    # auth service retorna 200 OK para autorizar
    # qualquer outro status = nega acesso
}
```

## Exemplos Comuns

### Proxy simples

```caddy
example.com {
    reverse_proxy localhost:3000
}
```

### Load balancing com health check

```caddy
example.com {
    reverse_proxy app1:8080 app2:8080 app3:8080 {
        lb_policy least_conn
        health_uri /health
        health_interval 10s
        fail_duration 30s
        max_fails 3
    }
}
```

### Proxy com path stripping

```caddy
example.com {
    handle_path /api/* {
        reverse_proxy localhost:9000
    }
}
```

### Proxy para HTTPS upstream

```caddy
example.com {
    reverse_proxy https://internal.example.com {
        transport http {
            tls_trust_pool file /etc/caddy/internal-ca.pem
            tls_server_name internal.example.com
        }
    }
}
```

### WebSocket proxy

```caddy
example.com {
    reverse_proxy localhost:8080 {
        flush_interval -1
        header_up -Origin
    }
}
```

## Eventos de Health Check

```caddy
{
    events {
        on healthy  exec /usr/local/bin/notify-healthy.sh
        on unhealthy exec /usr/local/bin/notify-unhealthy.sh
    }
}
```

Placeholders disponíveis: `{event.data.host}`
