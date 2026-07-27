# 04 — Configuração JSON e Admin API

## Estrutura JSON Completa

```json
{
  "admin": {
    "listen": "localhost:2019",
    "origins": ["localhost:2019"],
    "enforce_origin": false
  },
  "logging": {
    "logs": {
      "default": {
        "writer": {"output": "stderr"},
        "encoder": {"format": "console"},
        "level": "INFO"
      }
    }
  },
  "storage": {
    "module": "file_system",
    "root": "/data"
  },
  "apps": {
    "http": {
      "servers": {
        "srv0": {
          "listen": [":443"],
          "routes": [...],
          "tls_connection_policies": [...]
        }
      }
    },
    "tls": {
      "automation": {
        "policies": [...]
      }
    },
    "pki": {
      "certificate_authorities": {
        "local": {
          "name": "Caddy Local Authority"
        }
      }
    }
  }
}
```

## Admin API

A admin API do Caddy (default `localhost:2019`) permite gerenciamento total da configuração em runtime.

### Endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/load` | Carrega/configura nova config |
| POST | `/stop` | Para o servidor |
| GET | `/config/[path]` | Lê config atual |
| POST | `/config/[path]` | Adiciona nó |
| PUT | `/config/[path]` | Substitui nó |
| PATCH | `/config/[path]` | Merge parcial |
| DELETE | `/config/[path]` | Remove nó |
| POST | `/adapt` | Adapta config para JSON |
| GET | `/pki/ca/<id>` | Info da CA |
| GET | `/pki/ca/<id>/certificates` | Certificados da CA |
| GET | `/reverse_proxy/upstreams` | Status dos upstreams |

### Exemplos de Uso

```bash
# Load config (primeira vez)
curl -X POST "http://localhost:2019/load" \
    -H "Content-Type: application/json" \
    -d @caddy.json

# Adicionar rota via path traversal
curl -X POST "http://localhost:2019/config/apps/http/servers/srv0/routes/..." \
    -H "Content-Type: application/json" \
    -d '{"handle": [{"handler": "static_response", "body": "Hello"}]}'

# Ver config atual
curl "http://localhost:2019/config/"

# Adaptar Caddyfile → JSON
curl -X POST "http://localhost:2019/adapt" \
    -H "Content-Type: text/caddyfile" \
    --data-binary @Caddyfile

# Usar @id para paths curtos
curl -X PUT "http://localhost:2019/config/apps/http/servers/srv0/routes/0/handle/0" \
    -H "Content-Type: application/json" \
    -d '{"body": "Updated!", "handler": "static_response", "@id": "my_response"}'
# Agora pode ser acessado como:
curl "http://localhost:2019/id/my_response"
```

### Concorrência com Etag

Usar `If-Match` header para evitar conflitos em updates concorrentes:

```bash
# Primeiro, pegar o ETag
ETAG=$(curl -sI "http://localhost:2019/config/" | grep -i etag | awk '{print $2}')

# Depois, modificar com If-Match
curl -X PUT "http://localhost:2019/config/..." \
    -H "Content-Type: application/json" \
    -H "If-Match: $ETAG" \
    -d '{"handler": "static_response", "body": "New"}'
```

### Desabilitando Admin

```caddy
{
    admin off
}
```

⚠️ **Atenção**: Com `admin off`, `caddy reload` não funciona.

### Admin via Unix Socket

```caddy
{
    admin unix//run/caddy-admin.sock
}
```

Acesso:
```bash
curl --unix-socket /run/caddy-admin.sock http://localhost/config/
```

## Config Adapters

Além da Caddyfile, Caddy suporta vários formatos via adapters:

| Adapter | Flag |
|---------|------|
| caddyfile | `--adapter caddyfile` |
| nginx | `--adapter nginx` |
| jsonc | `--adapter jsonc` |
| json5 | `--adapter json5` |
| yaml | `--adapter yaml` |
| cue | `--adapter cue` |
| toml | `--adapter toml` |
| hcl | `--adapter hcl` |
| dhall | `--adapter dhall` |

```bash
caddy adapt --config config.yaml --adapter yaml
```

## JSON → Caddyfile Equivalences

| Conceito | Caddyfile | JSON |
|----------|-----------|------|
| Site block | `example.com { ... }` | `servers.srv0.routes[].match[].host[]` |
| Diretiva | `reverse_proxy localhost:8080` | `routes[].handle[].handler: "reverse_proxy"` |
| Matcher | `@post { method POST }` | `routes[].match[].method: ["POST"]` |
| Global options | `{ debug }` | `logging.logs.default.level: "DEBUG"` |
| Subdiretiva | `transport http { dial_timeout 3s }` | `handle[].transport.dial_timeout: 3000000000` |
