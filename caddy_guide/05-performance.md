# 05 — Performance

Este documento cobre todas as opções de performance disponíveis no Caddy, desde compressão e buffers até tuning de conexão e protocolos.

## Compressão (encode)

A diretiva `encode` é a principal ferramenta de compressão.

### Algoritmos

- **zstd** (Zstandard) — Preferido por padrão, melhor relação compressão/velocidade
- **gzip** — Fallback compatível

```caddy
encode zstd gzip
```

### Configurações de Nível

```caddy
encode {
    gzip 5          # nível 1-9 (default: no level = default do gzip)
    zstd best       # default, fastest, better, best
}
```

### Threshold de Tamanho

```caddy
encode {
    minimum_length 512  # default: 512 bytes
}
```

### Matcher Customizado

```caddy
encode {
    match {
        header Content-Type text/*
        header Content-Type application/json*
    }
}
```

### Precompressed (file_server)

Para arquivos estáticos, usar `precompressed` evita compressão on-the-fly:

```caddy
file_server {
    precompressed br zstd gzip  # default: br zstd gzip
}
```

Gere os arquivos .br, .zst, .gz junto com os originais para máxima eficiência.

## Buffers

### Reverse Proxy Transport

```caddy
reverse_proxy localhost:8080 {
    transport http {
        read_buffer            4KiB   # default
        write_buffer           4KiB   # default
        max_response_header    10MiB  # default
    }
    flush_interval -1   # low-latency mode
    request_buffers     # ⚠️ ineficiente, evitar
    response_buffers    # ⚠️ ineficiente, evitar
}
```

- `flush_interval -1`: modo low-latency, desabilita buffering, ideal para streaming
- `flush_interval 0`: sem flush periódico (default)
- Manter buffers pequenos (4KiB) para reduzir latência

### Request/Response Buffers

```caddy
reverse_proxy {
    request_buffers  <size>   # ⚠️ lê body inteiro antes de enviar (evitar)
    response_buffers <size>   # ⚠️ lê response inteira antes de enviar (evitar)
}
```

Apenas usar se estritamente necessário (ex: backend com memória muito limitada).

## Timeouts

### Server Timeouts

```caddy
{
    servers {
        timeouts {
            read_body   10s    # slowloris protection
            read_header 5s     # slowloris protection
            write       30s    # para arquivos grandes, aumentar
            idle        5m     # default, conexões keep-alive
        }
    }
}
```

- `read_body` e `read_header` previnem ataques slowloris
- `write` deve ser alto o suficiente para transferências grandes
- `idle` muito curto = overhead de novas conexões TLS

### Reverse Proxy Timeouts

```caddy
reverse_proxy localhost:8080 {
    transport http {
        dial_timeout            3s    # default
        response_header_timeout 30s   # default: no timeout
        read_timeout            60s   # default: no timeout
        write_timeout           30s   # default: no timeout
        expect_continue_timeout 1s    # RFC 100-continue
    }
    stream_timeout     24h    # timeout de conexões streaming
    stream_close_delay 5m     # delay para fechar streams no reload
    lb_try_duration    5s     # tempo total de tentativas de retry
    lb_try_interval    250ms  # intervalo entre retries
}
```

### Dial Fallback

```caddy
transport http {
    dial_fallback_delay 300ms  # para dual-stack (RFC 6555)
}
```

## Keep-Alive

### TCP Keepalive (server)

```caddy
{
    servers {
        keepalive_interval 30s  # intervalo entre probes (default: 15s)
        keepalive_idle     1m   # idle antes do probe (default: 15s)
        keepalive_count    5    # probes antes de declarar morto (default: 9)
    }
}
```

### HTTP Keep-Alive (upstream)

```caddy
reverse_proxy localhost:8080 {
    transport http {
        keepalive 2m                        # duração (default: 2m)
        keepalive_interval 30s              # probe interval
        keepalive_idle_conns 0              # sem limite (default)
        keepalive_idle_conns_per_host 32    # default
    }
}
```

⚠️ Keepalive maior que o timeout do backend causa "connection reset by peer".

## Conexões por Host

```caddy
transport http {
    max_conns_per_host 100  # default: sem limite
}
```

## Full-Duplex HTTP/1

```caddy
{
    servers {
        enable_full_duplex  # experimental
    }
}
```

Permite ler request body enquanto escreve response em HTTP/1.1. Para HTTP/2+ é sempre ativo.

## 0-RTT (QUIC/HTTP/3)

```caddy
{
    servers {
        0rtt off  # desabilitar se usar remote_ip matcher
    }
}
```

0-RTT permite enviar dados no primeiro round trip do TLS handshake. Desabilitar se usar `remote_ip` matcher (pode causar HTTP 425).

## Protocolos

```caddy
{
    servers {
        protocols h1 h2 h3  # default
    }
}
```

- `h1` — HTTP/1.1
- `h2` — HTTP/2 (TLS)
- `h2c` — HTTP/2 cleartext (não recomendado)
- `h3` — HTTP/3 (QUIC)

HTTP/2 e HTTP/3 trazem benefícios significativos de performance:
- Multiplexing (várias requests na mesma conexão)
- Server push (HTTP/2)
- Head-of-line blocking mitigado
- 0-RTT (HTTP/3)

## Server-Side Tuning

### Max Header Size

```caddy
{
    servers {
        max_header_size 1MB  # default
    }
}
```

Reduzir para `64KB` em APIs internas para mitigar ataques.

### Grace Period

```caddy
{
    grace_period 10s  # default: ∞ (espera todas conexões)
}
```

- `∞` = máxima disponibilidade, conexões não são forçadas
- `10s-30s` = bom para produção atrás de load balancer

### Shutdown Delay

```caddy
{
    shutdown_delay 30s  # anuncia shutdown antes de começar o grace period
}
```

Útil para load balancers detectarem que o servidor vai sair. Combinar com:

```caddy
handle /health {
    @going_down vars {http.shutting_down} true
    respond @going_down "Shutting down" 503
    respond 200
}
```

## TLS Performance

### Key Type

```caddy
{
    key_type ed25519  # mais rápido que RSA
}
```

`ed25519` é significativamente mais rápido que RSA para handshakes TLS.

### OCSP Stapling

```caddy
{
    ocsp_interval 1h  # default
}
```

OCSP stapling evita que clientes consultem o CA diretamente.

### Session Resumption

Suportado automaticamente via TLS session tickets. HTTP/2 e HTTP/3 connection reuse também reduzem handshakes.

## HTTP/3 Considerations

- UDP precisa estar aberto (não apenas TCP)
- Performance em redes com perda de pacotes é superior ao TCP
- 0-RTT reduz latência de conexões repetidas
- NAT rebinding: QUIC lida melhor que TCP

## Memory Tuning

- Caddy usa a GC padrão do Go — não requer tuning manual
- Múltiplos sites com config compartilhada via named routes reduz memória
- `precompressed` files reduzem CPU (compressão já feita)
- `header_up -Accept-Encoding` ou `compression off` no transport se o backend já comprime

## Load Balancing Performance

```caddy
reverse_proxy upstream1 upstream2 upstream3 {
    lb_policy least_conn            # melhor para cargas desbalanceadas
    # lb_policy round_robin         # previsível, overhead mínimo
    # lb_policy random_choose 2     # bom tradeoff
    # lb_policy ip_hash             # sticky sessions
}
```

- `random_choose 2`: escolhe 2 aleatórios, pega o com menos carga (The Power of Two Choices)
- `least_conn`: melhor para upstreams com tempos de request variáveis
- `first`: failover primário/secundário (precisa health checks)

## Health Checks

### Passive (recomendado para performance)

```caddy
reverse_proxy upstream1 upstream2 {
    fail_duration     30s
    max_fails         3
    unhealthy_status  5xx
    unhealthy_latency 10s
}
```

Não gera tráfego extra — apenas observa requests reais.

### Active

```caddy
reverse_proxy upstream1 upstream2 {
    health_uri      /health
    health_interval 30s   # default, aumentar para reduzir overhead
    health_timeout  5s
}
```

Gera tráfego periódico. Usar intervalos maiores em produção.

## Resumo de Otimizações

| Área | Ação | Impacto |
|------|------|---------|
| Compressão | `encode zstd gzip` | Alto |
| Precompressão | `precompressed br zstd gzip` + gerar arquivos | CPU↓, disco↑ |
| Buffering | `flush_interval -1` para streaming | Latência↓ |
| Timeouts | `read_body 10s, read_header 5s` | Segurança↑ |
| TLS | `key_type ed25519` | Handshake 5-10x mais rápido |
| Protocolos | `h1 h2 h3` | Multiplexing, 0-RTT |
| HTTP/3 | Manter UDP 443 aberto | Performance em rede ruim |
| LB Policy | `least_conn` ou `random_choose 2` | Distribuição eficiente |
| HC passivos | `fail_duration 30s` | Sem overhead de tráfego |
| Grace period | `grace_period 10s` | Libera recursos rapidamente |
| Keepalive | `keepalive 2m, keepalive_idle_conns_per_host 32` | Pool eficiente |
