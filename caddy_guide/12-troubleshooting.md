# 12 — Troubleshooting e Profiling

## Debug Mode

```caddy
{
    debug
}
```

Ativa log nível DEBUG — essencial antes de pedir ajuda no fórum.

## Logs Estruturados

```bash
# Logs em tempo real
journalctl -u caddy -f

# Logs com filtro
journalctl -u caddy -o json | jq 'select(.level == "error")'

# Logs via Docker
docker logs -f caddy

# Pipe com jq para legibilidade
caddy run 2>&1 | jq -R 'fromjson? | select(.level == "error") | .msg'
```

## Problemas Comuns

### Certificados não emitem

**Causas**:
- Portas 80/443 não acessíveis externamente
- DNS não propagado
- Rate limits do Let's Encrypt

**Solução**:
```bash
# Usar staging
caddy run -config Caddyfile -adapter caddyfile 2>&1 | grep -i acme
```

Config:
```caddy
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
    debug
}
```

### HTTPS redirect não funciona

```caddy
{
    auto_https off  # Checar se não desativou
}

# Ou:
http://example.com  # Address HTTP explícito desativa auto-HTTPS
```

### Porta 80/443 ocupada

```bash
sudo lsof -i :80 -i :443
sudo netstat -tlnp | grep -E ':80|:443'
```

### Connection refused no proxy

```bash
# Checar se backend está ouvindo
curl http://localhost:8080/health

# Timeout de conexão
reverse_proxy localhost:8080 {
    transport http {
        dial_timeout 3s
    }
}
```

### 502 Bad Gateway

**Causas**:
- Backend offline
- Timeout de conexão
- TLS mismatch

**Debug**:
```caddy
{
    debug
}
```

Ver logs: `journalctl -u caddy -f | grep 502`

### 431 Request Header Fields Too Large

```caddy
{
    servers {
        max_header_size 10MB  # aumentar se necessário
    }
}
```

### WebSocket desconectando

```caddy
reverse_proxy localhost:8080 {
    flush_interval -1
    stream_timeout 24h
}
```

### Memória alta

**Causas comuns**:
- Muitas conexões keep-alive
- Config reloads frequentes (vazamento de conexões websocket)
- Muitos certificados gerenciados

**Solução**:
```caddy
{
    servers {
        timeouts {
            idle 30s  # reduzir idle timeout
        }
    }
}

reverse_proxy localhost:8080 {
    transport http {
        keepalive 30s  # keepalive mais curto
    }
}
```

### CPU alta

**Causas**:
- Compressão on-the-fly sem precompressed
- Handshakes TLS sem session resumption
- Logging excessivo

**Solução**:
```caddy
encode zstd gzip
file_server {
    precompressed br zstd gzip
}
```

## Profiling com pprof

```bash
# CPU profile (30s)
curl -o cpu.prof http://localhost:2019/debug/pprof/profile?seconds=30

# Heap profile
curl -o heap.prof http://localhost:2019/debug/pprof/heap

# Análise
go tool pprof -http=:8080 cpu.prof
go tool pprof -http=:8080 heap.prof

# Top consumers
go tool pprof -top cpu.prof
```

## Config Validation

```bash
# Validar Caddyfile
caddy validate --config Caddyfile

# Ver config adaptada
caddy adapt --config Caddyfile --pretty

# Ver servers gerados
caddy adapt --config Caddyfile 2>&1 | jq '.apps.http.servers | keys'
```

## Admin API Debug

```bash
# Ver config atual
curl -s http://localhost:2019/config/ | jq .

# Ver upstreams
curl -s http://localhost:2019/reverse_proxy/upstreams

# Listar módulos
curl -s http://localhost:2019/config/apps/ | jq 'keys'
```

## Test Environment

```bash
# Usar staging CA
export CADDY_STAGING=true

# Portas alternativas para teste
caddy run -config Caddyfile 2>&1
# Em outro terminal:
curl -k https://localhost:443
```

## Metodologia de Debugging

### Framework Sistemático

1. **Definir comportamento esperado** — O que deveria acontecer? Seja específico.
   - Ex: "Espero que `https://example.com/api/users` retorne JSON 200"
   
2. **Observar comportamento atual** — O que realmente acontece?
   - Ex: "Retorna 502 Bad Gateway"

3. **Formular hipóteses** — Causas possíveis:
   - Backend offline
   - Path mismatch
   - TLS handshake failed
   - Timeout

4. **Testar cada hipótese** — Isolar variáveis:
   - `curl http://localhost:8080/api/users` — backend responde?
   - `caddy adapt --config Caddyfile --pretty | jq '.apps.http.servers.srv0.routes'` — config gerada está correta?

5. **Reproduzir minimamente** — Config mais simples possível que reproduz o problema:
   ```caddy
   localhost:8080 {
       reverse_proxy localhost:9000
   }
   ```

6. **Explorar com tinkering** — Mudar uma variável por vez:
   - Desativar TLS
   - Mudar policy de LB
   - Aumentar timeouts

7. **Verificar suposições** — DNS, firewall, portas, permissões:
   ```bash
   ping example.com
   nc -zv example.com 443
   sudo iptables -L -n | grep 443
   ```

### Isolamento de Problemas

```bash
# Testar backend direto
curl -v http://localhost:9000/health

# Testar Caddy sem TLS
curl -v -k https://localhost:443

# Testar Caddy por HTTP
curl -v -H "Host: example.com" http://localhost:80

# Ver rota que Caddy vai usar
caddy adapt --config Caddyfile --pretty | jq '.apps.http.servers.srv0.routes[] | select(.match[]?.host[]? == "example.com")'
```

## Diagnóstico Rápido

```bash
# 1. Caddy está rodando?
caddy start 2>&1 || echo "Caddy not running"
curl -s -o /dev/null -w "%{http_code}" http://localhost:2019/config/

# 2. Portas estão ouvindo?
sudo ss -tlnp | grep -E ':80|:443|:2019'

# 3. Config é válida?
caddy validate --config Caddyfile

# 4. Adaptação está correta?
caddy adapt --config Caddyfile --pretty | jq '.apps.http.servers | keys'

# 5. Logs de erro
journalctl -u caddy --since "5 minutes ago" -p err

# 6. Teste de conectividade
curl -sv https://example.com 2>&1 | head -50
```

## Problemas por Código de Erro

| Código | Causa Comum | Ação |
|--------|-------------|------|
| 400 | Request malformada, header muito grande | Verificar max_header_size |
| 401 | Falta ou expirou auth | Verificar basic_auth / forward_auth |
| 403 | Permissão de arquivo negada | Verificar root path e permissões |
| 404 | Arquivo não encontrado, rota não match | Verificar root, try_files, matchers |
| 405 | Método não permitido | Verificar CORS config |
| 408 | Timeout de request | Aumentar timeouts |
| 421 | SNI mismatch | Configurar strict_sni_host |
| 429 | Rate limit excedido | Verificar caddy-ratelimit |
| 431 | Header muito grande | Aumentar max_header_size |
| 500 | Erro interno | Verificar handle_errors |
| 502 | Bad Gateway (upstream offline) | Verificar backend e network |
| 503 | Service Unavailable | Verificar health checks |
| 504 | Gateway Timeout | Aumentar dial_timeout / response_header_timeout |

## Logs Detalhados

```bash
# Nível DEBUG completo
caddy run --config Caddyfile --debug

# Filtrar logs de TLS
caddy run --debug 2>&1 | grep -i tls

# Filtrar logs de ACME
caddy run --debug 2>&1 | grep -i acme

# Filtrar logs de proxy
caddy run --debug 2>&1 | grep -i "reverse_proxy\|upstream"

# JSON logs formatados com jq
caddy run 2>&1 | jq -R 'fromjson? | select(.level == "error" or .level == "warn") | {ts: .ts, level: .level, msg: .msg, logger: .logger}'

# Ver logs do systemd
journalctl -u caddy -f -o json | jq -R 'fromjson? | select(.level == "error") | .msg'

# Últimos 100 logs com timestamp
journalctl -u caddy -n 100 --no-pager
```

## Troubleshooting Tools

```bash
# DNS
dig +short example.com
dig +short -x <ip>
drill example.com
nslookup example.com

# TLS/SSL
openssl s_client -connect example.com:443 -servername example.com -tlsextdebug
openssl s_client -connect example.com:443 -servername example.com -status  # OCSP
curl -vI https://example.com 2>&1 | grep -i "ssl\|tls\|certificate"

# HTTP/3 (QUIC)
curl --http3 -I https://example.com

# Portas
nc -zv example.com 80
nc -zv example.com 443
nc -zvu example.com 443  # UDP (HTTP/3)

# Firewall
sudo iptables -L -n | grep -E '80|443'
sudo nft list ruleset

# Caddy info
caddy version
caddy build-info
caddy list-modules
caddy environ
```
