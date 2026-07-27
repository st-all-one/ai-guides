# 08 — Observabilidade

## Logging

Caddy usa `zap` (Uber Go) para logging estruturado.

### Arquitetura

```
Emissor → Pipeline (encoder → writer) → Saída
```

- **Emissores**: módulos internos que emitem logs com nomes (`http.log.access`, `admin.api`, etc.)
- **Pipeline**: encoder (formato) + writer (destino)
- **Consumo**: ferramentas externas (Loki, Datadog, Elastic) leem os logs

### Configuração Global

```caddy
{
    log default {
        output file /var/log/caddy/app.log {
            roll true            # rotação
            roll_size 100mb      # tamanho máximo
            roll_keep 10         # arquivos mantidos
            roll_keep_days 90    # dias mantidos
        }
        format json
        level INFO
        include http.log.access admin.api
        exclude http.log.access.static
    }

    # Logger específico
    log http_logs {
        output file /var/log/caddy/access.log
        format console
        level DEBUG
    }
}
```

### Access Logging

```caddy
example.com {
    log {
        output file /var/log/caddy/access.log {
            roll_keep 30
        }
        format json
    }
}
```

#### Output Modules

| Module | Descrição |
|--------|-----------|
| `stdout` | Stdout |
| `stderr` | Stderr (default) |
| `file <path>` | Arquivo com rotação |
| `net <addr>` | Socket network |

#### Format Modules

| Module | Descrição |
|--------|-----------|
| `json` | JSON estruturado |
| `console` | Formato legível |
| `single_field` | Apenas um campo |
| `filter` | Filtra/modifica campos |
| `regex` | Regex replacement |
| `formatted` | Template string (requer plugin transform-encoder) |

#### Filter Format

```caddy
log {
    format filter {
        wrap json  # ou console
        fields {
            request>headers>Authorization delete
            request>headers>Cookie delete
            request>remote_ip replace ".*" "REDACTED"
        }
    }
}
```

### Log Skipping

```caddy
example.com {
    log_skip /health  # não loga requests de health check
    log_skip @static  # não loga arquivos estáticos
}

@static {
    path /static/* /assets/* /favicon.ico
}
```

### Log Name Override

```caddy
example.com {
    log_name api_logs  # escreve neste logger
}
```

### Log Append

```caddy
example.com {
    log_append my_field "custom_value"
    log_append client_country {header.CF-IPCountry}
}
```

## Métricas (Prometheus / OpenTelemetry)

### Ativação

```caddy
{
    metrics {
        per_host              # label por host
        observe_catchall_hosts # observar hosts catch-all
        otlp                   # exportar via OTLP
    }
}
```

### Endpoint Prometheus

```caddy
example.com {
    metrics
}
```

Default: `/metrics` no endpoint configurado.

### Configuração Prometheus

```yaml
scrape_configs:
  - job_name: 'caddy'
    static_configs:
      - targets: ['localhost:2019']
```

### OpenTelemetry (OTLP)

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318 \
OTEL_METRICS_EXPORTER=otlp \
caddy run
```

Variáveis suportadas: `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_METRIC_EXPORT_INTERVAL`, `OTEL_METRICS_EXPORTER`.

### Métricas Disponíveis

#### Runtime

| Métrica | Descrição |
|---------|-----------|
| `caddy_admin_requests_total` | Total de requests admin API |
| `caddy_go_*` | Métricas Go runtime (GC, mem, goroutines) |
| `caddy_info` | Info do build (versão, módulos) |

#### HTTP Middleware

| Métrica | Descrição |
|---------|-----------|
| `caddy_http_requests_total` | Total requests HTTP |
| `caddy_http_request_duration_seconds` | Histograma de duração |
| `caddy_http_response_size_bytes` | Tamanho da response |
| `caddy_http_responses_total` | Total responses por status |

#### Reverse Proxy

| Métrica | Descrição |
|---------|-----------|
| `caddy_reverse_proxy_upstreams_healthy` | Upstreams saudáveis |
| `caddy_reverse_proxy_requests_total` | Requests proxy |
| `caddy_reverse_proxy_request_duration_seconds` | Latência do upstream |

### Exemplos PromQL

```promql
# Request rate
rate(caddy_http_requests_total[1m])

# P99 latency
histogram_quantile(0.99, rate(caddy_http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(caddy_http_responses_total{code=~"5.."}[5m])) / sum(rate(caddy_http_requests_total[5m]))

# Healthy upstreams
caddy_reverse_proxy_upstreams_healthy

# Memory usage
caddy_go_memstats_alloc_bytes
```

## Tracing (OpenTelemetry)

```caddy
example.com {
    tracing "my-span"  # opcional: nome customizado do span
}
```

Ativa tracing automático via OTLP. Configurado via variáveis `OTEL_*`.

```caddy
{
    servers {
        trace  # experimental: log cada handler invocado (nível DEBUG)
    }
}
```

## Profiling

### Ativação

A admin API expõe pprof endpoints em `/debug/pprof/`.

### Acesso Local

```bash
# Ver goroutines
curl http://localhost:2019/debug/pprof/goroutine?debug=2

# CPU profile (30s)
curl -o cpu.prof http://localhost:2019/debug/pprof/profile?seconds=30

# Heap profile
curl -o heap.prof http://localhost:2019/debug/pprof/heap

# Alocation profile
curl -o alloc.prof http://localhost:2019/debug/pprof/allocs
```

### Análise com go tool pprof

```bash
go tool pprof -http=:8080 cpu.prof
go tool pprof -http=:8080 heap.prof

# Modo texto
go tool pprof -top cpu.prof
go tool pprof -tree cpu.prof
```

### Acesso Remoto

**Via reverse proxy** (seguro):
```caddy
debug.example.com {
    reverse_proxy localhost:2019
}
```

**Via SSH tunnel**:
```bash
ssh -L 2019:localhost:2019 user@server
```

**Admin remoto** (⚠️ apenas em rede segura):
```caddy
{
    admin :2020
}
```

### Interpretação de Profiles

**Goroutines**: verificar vazamento com `goroutine?debug=2` — procurar por padrões de goroutines presas.

**Heap**: `go tool pprof -diff_base base.prof current.prof` para comparar.

**CPU**: olhar por funções com alto tempo累积. Suspeitas comuns:
- GC frequente (muitas alocações)
- Criptografia intensa
- Parsing de JSON grande

## Health Check Endpoint (Healthz)

```caddy
{
    shutdown_delay 30s
}

example.com {
    handle /healthz {
        @shutting_down vars {http.shutting_down} true
        respond @shutting_down "Shutting down" 503
        respond "OK" 200
    }
}
```
