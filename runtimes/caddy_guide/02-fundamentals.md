# 02 — Fundamentos e Arquitetura

## Arquitetura do Caddy

Caddy é um binário Go autossuficiente composto por:

1. **Comando** (`cmd/caddy`) — CLI com subcomandos
2. **Core library** (`caddy` package) — Gerenciamento de configuração e lifecycle
3. **Módulos** — Toda funcionalidade além do core é modular

```
┌─────────────────────────────────────────┐
│              caddy command               │
├─────────────────────────────────────────┤
│           caddy.Caddy type               │
├─────────────┬───────────┬───────────────┤
│  App modules │ TLS modules │ HTTP modules │
│  (http, tls, │ (issuers,  │ (handlers,    │
│   pki, etc)  │  storage)  │  matchers)    │
└─────────────┴───────────┴───────────────┘
```

## Module Lifecycle

Cada módulo passa por estas fases:

1. **Load** — Config é desserializada do JSON em structs Go
2. **Provision** — Setup inicial (conexões, alocação de recursos)
3. **Validate** — Validação da configuração
4. **Use** — Execução (serve requests, etc.)
5. **Cleanup** — Liberação de recursos quando config é descarregada

## Config Management

- Config é **atômica**: toda config é um único documento JSON
- Mudanças via **admin API** são tratadas como transações (ACID-like)
- Configs são **imutáveis**: uma nova config substitui completamente a anterior
- Zero-downtime reloads: servidores antigos mantêm conexões durante `grace_period`

## JSON Config Structure

A configuração do Caddy é um documento JSON que segue esta estrutura:

```json
{
  "admin": { ... },
  "logging": { ... },
  "storage": { ... },
  "apps": {
    "http": { ... },
    "tls": { ... },
    "pki": { ... },
    "events": { ... }
  }
}
```

- `admin` — Configuração do endpoint API
- `logging` — Configuração global de logging
- `storage` — Módulo de armazenamento (certificados, etc.)
- `apps` — Aplicações (os módulos de topo: `http`, `tls`, `pki`, `events`)

## Caddyfile

A Caddyfile é um formato de configuração amigável que é convertido para JSON pelo **config adapter** interno.

### Estrutura Visual

```
{
    email admin@example.com     # Global options block (opcional)
    servers { ... }
}

example.com {                   # Site block
    root * /var/www
    encode zstd gzip
    file_server
}
```

### Regras Essenciais

- **Global options block**: opcional, `{ ... }` sem chave, deve ser o primeiro bloco
- **Snippets**: `(nome) { ... }` — blocos reutilizáveis, importados com `import`
- **Named routes**: `&(nome) { ... }` — experimentais, invocados com `invoke`
- **Site blocks**: começam com endereço, seguido de `{ ... }`
- **Chaves**: `{` deve estar no final da linha, `}` na própria linha
- **Um único site**: chaves são opcionais
- **Múltiplos sites**: chaves obrigatórias

### Addresses

| Address | Efeito |
|---------|--------|
| `example.com` | HTTPS automático com certificado público |
| `*.example.com` | Wildcard certificate |
| `localhost` | HTTPS com certificado local |
| `http://` | HTTP catch-all |
| `https://` | HTTPS catch-all |
| `:8080` | HTTP na porta 8080 |
| `localhost:8080` | HTTPS na porta não-padrão |

### Environment Variables

Substituição antes do parsing:
```caddy
{$DOMAIN:localhost}  # com default
{env.CLOUDFLARE_API_TOKEN}  # runtime placeholder
```

### Placeholders (Shorthands Caddyfile)

| Caddyfile | Expande para |
|-----------|-------------|
| `{client_ip}` | `{http.vars.client_ip}` |
| `{host}` | `{http.request.host}` |
| `{method}` | `{http.request.method}` |
| `{uri}` | `{http.request.uri}` |
| `{path}` | `{http.request.uri.path}` |
| `{query}` | `{http.request.uri.query}` |
| `{header.*}` | `{http.request.header.*}` |
| `{cookie.*}` | `{http.request.cookie.*}` |
| `{vars.*}` | `{http.vars.*}` |
| `{re.*}` | `{http.regexp.*}` |
| `{rp.*}` | `{http.reverse_proxy.*}` |
| `{resp.*}` | `{http.intercept.*}` |

### Global Placeholders

Disponíveis em toda config, não apenas em contexto HTTP:

| Placeholder | Descrição |
|-------------|-----------|
| `{env.*}` | Variável de ambiente |
| `{file.*}` | Conteúdo de arquivo (`{file./path}`) |
| `{system.hostname}` | Hostname da máquina |
| `{system.uuid}` | UUID do sistema |
| `{time.now}` | Timestamp atual |
| `{time.now.http}` | Timestamp no formato HTTP |
| `{time.now.common_log}` | Timestamp no formato Common Log |

### Placeholders HTTP (runtime)

Disponíveis durante o processamento de requests:

| Placeholder | Descrição |
|-------------|-----------|
| `{http.request.host}` | Host header |
| `{http.request.hostport}` | Host:port |
| `{http.request.host.labels.*}` | Labels do host (ex: `{host.labels.0}`) |
| `{http.request.port}` | Porta |
| `{http.request.scheme}` | http ou https |
| `{http.request.method}` | Método HTTP |
| `{http.request.uri}` | URI completa |
| `{http.request.uri.path}` | Path |
| `{http.request.uri.path.dir}` | Diretório do path |
| `{http.request.uri.path.file}` | Nome do arquivo |
| `{http.request.uri.path.file.base}` | Nome sem extensão |
| `{http.request.uri.path.file.ext}` | Extensão |
| `{http.request.uri.query}` | Query string |
| `{http.request.uri.prefixed_query}` | Query com `?` prefixo |
| `{http.request.header.*}` | Headers |
| `{http.request.cookie.*}` | Cookies |
| `{http.request.remote}` | Remote IP:port |
| `{http.request.remote.host}` | Remote IP |
| `{http.request.remote.port}` | Remote port |
| `{http.request.tls.version}` | TLS version |
| `{http.request.tls.cipher_suite}` | Cipher suite |
| `{http.request.tls.client.*}` | TLS client cert info |
| `{http.vars.client_ip}` | Client IP (considerando trusted_proxies) |
| `{http.vars.*}` | Variáveis setadas via `vars` directive |
| `{http.reverse_proxy.upstream.hostport}` | Upstream atual do proxy |
| `{http.regexp.*}` | Capturas de regex match |
| `{http.intercept.*}` | Response interceptada |
| `{http.error.*}` | Informações de erro |
| `{http.shutting_down}` | True se servidor está shutting down |
| `{http.time_until_shutdown}` | Tempo até shutdown |

## File Locations

### Data Directory

Armazena certificados, chaves, CA local, config autosaved:

| OS | Path |
|----|------|
| Linux | `$XDG_DATA_HOME/caddy` ou `$HOME/.local/share/caddy` |
| macOS | `$HOME/Library/Application Support/Caddy` |
| Windows | `%AppData%/Caddy` |

Estrutura típica:
```
$DATA_DIR/
  certificates/       # Certificados gerenciados
  pki/                # CA local (root + intermediate)
  autosave.json       # Última config salva
  instance.uuid       # UUID da instância
  ech/configs/        # Configs ECH
```

### Config Directory

Armazena config persistida via admin API:

| OS | Path |
|----|------|
| Linux | `$XDG_CONFIG_HOME/caddy` ou `$HOME/.config/caddy` |
| macOS | `$HOME/Library/Application Support/Caddy` |
| Windows | `%AppData%/Caddy` |

## Network Addresses

Formato: `network/address`

```
localhost:8080                   TCP, IPv4/IPv6
tcp/example.com:80               TCP explícito
udp/localhost:9000               UDP
unix//var/run/caddy.sock         Unix socket
unix+h2c//var/run/caddy.sock     Unix socket com H2C
:443                             Todas interfaces, porta 443
127.0.0.1:2019                   IPv4 específico
[::1]:2019                       IPv6
[fe80::ea9f:80ff:fe46:cbfd%eth0]:443    IPv6 com zone ID
```

## Duration Format

| Suffix | Unidade | Exemplo |
|--------|---------|---------|
| `ns` | Nanosegundo | `500ns` |
| `us` / `µs` | Microssegundo | `100us` |
| `ms` | Milissegundo | `250ms` |
| `s` | Segundo | `30s` |
| `m` | Minuto | `5m` |
| `h` | Hora | `2h` |
| `d` | Dia | `7d` |

Combinações: `1h30m`, `2h15m30s`, `7d12h`

## Size Format

Usa `go-humanize`:

| Suffix | Exemplo | Bytes |
|--------|---------|-------|
| `B` | `512B` | 512 |
| `KB` | `4KB` | 4.000 |
| `KiB` | `4KiB` | 4.096 |
| `MB` | `10MB` | 10.000.000 |
| `MiB` | `10MiB` | 10.485.760 |
| `GB` | `1GB` | 1.000.000.000 |
| `GiB` | `1GiB` | 1.073.741.824 |

## Getting Started Tutorial

### 1. Primeira Config

Crie um arquivo `Caddyfile`:

```caddy
localhost:8080

respond "Hello, Caddy!"
```

Execute:
```bash
caddy run
```

Acesse: `http://localhost:8080` — veja "Hello, Caddy!"

### 2. Static File Server

```caddy
localhost:8080

root * /var/www
encode zstd gzip
file_server
```

```bash
mkdir -p /var/www
echo "<h1>Hello World</h1>" > /var/www/index.html
caddy run
```

Acesse: `http://localhost:8080`

### 3. Reverse Proxy

```caddy
localhost:8080

reverse_proxy localhost:9000
```

Com um backend de teste:
```bash
caddy respond --listen :9000 --body "from backend"
caddy run
```

Acesse: `http://localhost:8080` — veja "from backend"

### 4. HTTPS Automático

```caddy
example.com

root * /var/www
file_server
```

Requer DNS apontando para o servidor e portas 80/443 abertas. Caddy obtém certificado automaticamente.

### 5. JSON config via API

```bash
# Iniciar Caddy sem config
caddy run --resume

# Enviar config via API
curl -X POST http://localhost:2019/load \
    -H "Content-Type: application/json" \
    -d '{
        "apps": {
            "http": {
                "servers": {
                    "srv0": {
                        "listen": [":8080"],
                        "routes": [{
                            "handle": [{
                                "handler": "static_response",
                                "body": "Hello from API!"
                            }]
                        }]
                    }
                }
            }
        }
    }'

# Testar
curl http://localhost:8080
```

## Ordem de Diretivas HTTP Handler

A ordem padrão é hard-coded:

```
tracing
map
vars
fs
root
log_append | log_skip | log_name
header | copy_response_headers | request_body
redir
method | rewrite | uri | try_files
basic_auth | forward_auth | request_header | encode | push | intercept | templates
invoke | handle | handle_path | route
abort | error | copy_response | respond | metrics | reverse_proxy | php_fastcgi | file_server | acme_server
```

Usar `route { ... }` para bypassar a ordenação automática.
