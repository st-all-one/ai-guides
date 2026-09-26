# 09 — Deploy em Produção

## Instalação Manual (Linux)

### 1. Criar usuário e grupo

```bash
sudo groupadd --system caddy
sudo useradd --system \
    --gid caddy \
    --create-home \
    --home-dir /var/lib/caddy \
    --shell /usr/sbin/nologin \
    --comment "Caddy Web Server" \
    caddy
```

### 2. Criar diretórios

```bash
sudo mkdir -p /etc/caddy
sudo mkdir -p /var/log/caddy
sudo chown -R caddy:caddy /etc/caddy /var/log/caddy
```

### 3. Copiar binário

```bash
sudo cp caddy /usr/bin/
sudo chown root:root /usr/bin/caddy
sudo chmod 755 /usr/bin/caddy

# Capacidades para bind em portas < 1024 sem root
sudo setcap cap_net_bind_service=+ep /usr/bin/caddy
```

### 4. Copiar unit file systemd e ativar

```bash
sudo cp caddy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable caddy
sudo systemctl start caddy
```

## Systemd (Linux)

### Caddyfile Service (`caddy.service`)

Uso típico com Caddyfile estático:

```ini
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

### Admin API Service (`caddy-api.service`)

Uso com config gerenciada via API REST:

```ini
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/autosave.json
ExecReload=/bin/kill -USR1 $MAINPID
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

### Environment Overrides

```bash
sudo systemctl edit caddy
```

```ini
[Service]
Environment=CLOUDFLARE_API_TOKEN=your_token
Environment=CADDY_ADMIN=:2020
```

### Restart on Crash

systemd restartará automaticamente baseado no `Restart=` (default no pacote oficial).

### SELinux

Em distribuições com SELinux enforcing (RHEL, Fedora, CentOS):

```bash
# Verificar contexto do binário
ls -Z /usr/bin/caddy

# Se o binário foi copiado manualmente, restaurar contexto
sudo restorecon -v /usr/bin/caddy

# Verificar logs de negação
sudo ausearch -m avc -ts recent

# Se Caddy precisa ler arquivos de diretórios não-padrão:
sudo semanage fcontext -a -t httpd_sys_content_t "/srv(/.*)?"
sudo restorecon -Rv /srv

# Permitir admin API em porta alternativa
sudo semanage port -a -t http_port_t -p tcp 2019

# Se necessário, gerar política customizada:
sudo grep caddy /var/log/audit/audit.log | audit2allow -M caddy_custom
sudo semodule -i caddy_custom.pp
```

## Docker

### Dockerfile

```dockerfile
FROM caddy:builder AS builder
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:latest
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
```

### Docker Compose

```yaml
services:
  caddy:
    image: caddy:latest
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"   # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
      - ./www:/srv
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
    environment:
      - CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}

volumes:
  caddy_data:
  caddy_config:
```

### Local HTTPS com Docker

Para desenvolvimento local com Caddy em Docker e certificados confiáveis:

```bash
# Copiar CA root do container para o host
docker cp $(docker create --name caddy-tmp caddy):/data/caddy/pki/authorities/local/root.crt /tmp/caddy-root.crt
docker rm caddy-tmp

# Linux: instalar no trust store do sistema
sudo cp /tmp/caddy-root.crt /usr/local/share/ca-certificates/caddy-root.crt
sudo update-ca-certificates

# macOS: instalar no keychain
sudo security add-trusted-cert -d -r trustRoot \
    -k /Library/Keychains/System.keychain /tmp/caddy-root.crt

# Windows: instalar via certutil
certutil -addstore -user Root C:\tmp\caddy-root.crt
```

Verificar instalação:
```bash
# Linux
openssl verify -CApath /etc/ssl/certs /tmp/caddy-root.crt

# Navegador: navegar para https://localhost deve mostrar cadeado
```

## Windows Service

```powershell
# Via sc.exe
sc.exe create caddy binPath="\"C:\Program Files\Caddy\caddy.exe\" run"
sc.exe start caddy

# Via WinSW (recomendado)
# https://github.com/winsw/winsw
```

## Cluster e Storage Distribuído

### Problema

Múltiplas instâncias de Caddy precisam compartilhar certificados e evitar emissão duplicada.

### Solução: Storage Compartilhado

```caddy
{
    storage file_system /mnt/nfs/caddy-data  # NFS/EFS/FAIlover
    # ou storage redis { ... } via plugin
}
```

### Solução: Consul

```caddy
{
    storage redis {
        host localhost:6379
        key_prefix caddy
    }
}
```

Plugins disponíveis: `redis`, `consul`, `etcd`, `s3`, `gcs`, `azure`, `mysql`, `postgres`, `mongodb`.

### Lock Contention

Caddy usa locks no storage para coordenar emissão de certificados. Storage com boa performance em locks (ex: Redis) é recomendado para clusters grandes.

## Graceful Shutdown

### Configuração

```caddy
{
    grace_period  30s
    shutdown_delay 30s
}
```

- **shutdown_delay**: tempo antes do grace period, servidor continua operando mas indica que vai parar
- **grace_period**: tempo máximo para conexões ativas terminarem

### Health Check Awareness

```caddy
handle /health {
    @shutting_down vars {http.shutting_down} true
    respond @shutting_down "Shutting down" 503
    respond "OK" 200
}
```

## Variáveis de Ambiente em Produção

```bash
# Admin API não exposta publicamente
CADDY_ADMIN=localhost:2019

# Debug OFF em produção
# debug não deve estar no Caddyfile
```

## Railway

Deploy simplificado no Railway:

```caddy
# Caddyfile
{
    email admin@example.com
}

:80 {
    root * /app
    encode zstd gzip
    file_server
}
```

```dockerfile
# Dockerfile
FROM caddy:builder AS builder
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:latest
COPY Caddyfile /etc/caddy/Caddyfile
COPY . /app
```

Configurar variáveis de ambiente no painel Railway:
- `CLOUDFLARE_API_TOKEN` (se usar DNS challenge)
- `CADDY_ADMIN=:2019`

## Capacidades Linux

```bash
# Verificar capacidades atuais
getcap /usr/bin/caddy

# Se não usar systemd, conceder manualmente
sudo setcap cap_net_bind_service=+ep /usr/bin/caddy

# Remover capacidades (voltar a rodar como root)
sudo setcap -r /usr/bin/caddy
```

## File Limits

```bash
# Ver limites atuais
ulimit -n

# Aumentar temporariamente
ulimit -n 1048576

# Permanente (via /etc/security/limits.conf)
echo "caddy soft nofile 1048576" | sudo tee -a /etc/security/limits.conf
echo "caddy hard nofile 1048576" | sudo tee -a /etc/security/limits.conf

# systemd já configura via LimitNOFILE no unit file
```

## Monitoring Stack (Docker Compose completo)

```yaml
version: "3.8"
services:
  caddy:
    image: caddy-custom:latest
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
      - ./www:/srv
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
    labels:
      prometheus_job: "caddy"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:
  prometheus_data:
  grafana_data:
```

Prometheus config (`prometheus.yml`):
```yaml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'caddy'
    static_configs:
      - targets: ['caddy:2019']
```

## Backup

### Certificados

Localização: `$CADDY_DATA_DIR/certificates/`

```bash
# Backup diário
tar czf /backup/caddy-certs-$(date +%Y%m%d).tar.gz /var/lib/caddy/.local/share/caddy/certificates/
```

### Config

```bash
# Config atual via API
curl -s http://localhost:2019/config/ > /backup/caddy-config-$(date +%Y%m%d).json
```

## Segurança em Produção

1. **Nunca expor admin API publicamente**
2. Usar `trusted_proxies` atrás de CDN
3. `strict_sni_host` se usar client auth
4. Rate limiting via plugin `caddy-ratelimit`
5. `max_header_size` configurado
6. `read_body` e `read_header` timeouts
7. Rodar como usuário não-root (`caddy`)
8. `PrivateTmp=true` no systemd
9. `ProtectSystem=full` no systemd
