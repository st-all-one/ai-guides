# 01 — Instalação e Build

## Visão Geral

Caddy é um único binário estático escrito em Go. Suporta instalação via pacotes oficiais, builds customizados com plugins, Docker, e compilação a partir do fonte.

## Métodos de Instalação

### Binário estático (recomendado)

```bash
# Download da página oficial https://caddyserver.com/download
# Escolher plataforma e plugins desejados
curl -o caddy.tar.gz "https://caddyserver.com/api/download?os=linux&arch=amd64&p=github.com/caddy-dns/cloudflare"
tar xzf caddy.tar.gz
sudo mv caddy /usr/local/bin/
```

### Repositórios Linux

**Debian/Ubuntu/Raspbian (estável):**
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

**Fedora/RHEL/CentOS (COPR):**
```bash
sudo dnf install 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy
sudo dnf install caddy
```

**Arch Linux:**
```bash
sudo pacman -S caddy
```

### Docker

```dockerfile
FROM caddy:<version>-builder AS builder
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:<version>
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

Uso básico:
```bash
docker run -d -p 80:80 -p 443:443 -p 2019:2019 \
    -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
    -v caddy_data:/data \
    -v caddy_config:/config \
    caddy
```

### Build customizado com xcaddy

`xcaddy` é a ferramenta oficial para builds customizados com plugins:

```bash
# Instalar xcaddy
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Build com plugins
xcaddy build v2.8.4 \
    --with github.com/caddy-dns/cloudflare \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/caddyserver/transform-encoder

# Build com embed de arquivos estáticos
xcaddy build \
    --embed /path/to/static/files
```

### Compilação a partir do fonte

```bash
git clone https://github.com/caddyserver/caddy.git
cd caddy/cmd/caddy
go build
```

## Verificação de Assinatura

Caddy usa Sigstore/cosign para assinar artefatos:

```bash
# Verificar assinatura com cosign
cosign verify-blob \
    --certificate caddy_linux_amd64.pem \
    --signature caddy_linux_amd64.sig \
    --certificate-identity-regexp '.*caddyserver.*' \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com \
    caddy_linux_amd64.tar.gz

# Verificar no Rekor transparency log
rekor-cli search --artifact caddy_linux_amd64.tar.gz --log-index
```

## Referência Completa da CLI

### caddy run

Executa Caddy em foreground. Modo recomendado para systemd (Type=notify).

```bash
caddy run [--config <path>] [--adapter <name>] [--watch] [--pidfile <file>] [--environ] [--resume]
```

- `--config` — Caminho do arquivo de config (default: `Caddyfile` no diretório atual, ou `$CADDY_PATH`)
- `--adapter` — Adapter para config não-JSON (ex: `caddyfile`, `yaml`, `json5`)
- `--watch` — Observa mudanças no arquivo de config e recarrega automaticamente
- `--pidfile` — Escreve PID ao arquivo
- `--environ` — Mostra variáveis de ambiente antes de iniciar
- `--resume` — Usa a última config salva (autosave) em vez do arquivo especificado

### caddy start

Executa Caddy em background (daemon). Cria um processo filho.

```bash
caddy start [--config <path>] [--adapter <name>] [--pidfile <file>] [--watch]
```

⚠️ Prefira `caddy run` com systemd para produção.

### caddy stop

Para o servidor Caddy em execução.

```bash
caddy stop [--address <addr>] [--config <path>] [--adapter <name>]
```

- `--address` — Endereço da admin API (default: `localhost:2019` ou `$CADDY_ADMIN`)

### caddy reload

Recarrega config sem downtime via admin API.

```bash
caddy reload [--address <addr>] [--config <path>] [--adapter <name>] [--force]
```

- `--force` — Ignora erros de validação

### caddy adapt

Converte Caddyfile (ou outro formato) para JSON.

```bash
caddy adapt [--config <path>] [--adapter <name>] [--pretty]
```

- `--pretty` — JSON indentado

Exemplo:
```bash
caddy adapt --config Caddyfile --pretty > caddy.json
```

### caddy validate

Valida o arquivo de configuração.

```bash
caddy validate [--config <path>] [--adapter <name>]
```

Exit code 0 = válido, 3 = inválido.

### caddy fmt

Formata a Caddyfile.

```bash
caddy fmt [--overwrite] [--diff] [<path>]
```

- `--overwrite` — Reescreve o arquivo (default: stdout)
- `--diff` — Mostra diff das mudanças
- `<path>` — Arquivo ou diretório (default: Caddyfile no diretório atual)

### caddy file-server

Quick static file server.

```bash
caddy file-server [--root <path>] [--listen <addr>] [--domain <domain>] [--browse] [--templates]
```

- `--root` — Diretório raiz (default: current dir)
- `--listen` — Endereço:porta (default: `:80`)
- `--domain` — Nome do domínio (ativa HTTPS)
- `--browse` — Listagem de diretórios
- `--templates` — Ativa template engine

### caddy reverse-proxy

Quick reverse proxy.

```bash
caddy reverse-proxy [--from <addr>] [--to <addr>] [--change-host-header]
```

- `--from` — Endereço de entrada (default: `:80`)
- `--to` — Endereço do backend (obrigatório)
- `--change-host-header` — Seta Host header para o upstream

Exemplo:
```bash
caddy reverse-proxy --from example.com --to localhost:8080
```

### caddy list-modules

Lista todos os módulos compilados no binário.

```bash
caddy list-modules [--packages] [--versions] [--skip <namespaces...>]
```

- `--packages` — Mostra pacotes Go
- `--versions` — Mostra versões

### caddy build-info

Informações detalhadas do build.

```bash
caddy build-info
```

Saída: versão, módulos compilados, Go version, etc.

### caddy environ

Mostra variáveis de ambiente relevantes para o Caddy.

```bash
caddy environ
```

### caddy trust

Instala o certificado root da CA local no trust store do sistema, Java e Firefox.

```bash
caddy trust [--ca <id>] [--cert <path>] [--address <addr>]
```

### caddy untrust

Remove o certificado root da CA local do trust store.

```bash
caddy untrust [--ca <id>] [--cert <path>] [--address <addr>]
```

### caddy hash-password

Gera hash de senha para uso com `basic_auth`.

```bash
caddy hash-password [--plaintext <password>] [--algorithm bcrypt]
```

- Se `--plaintext` não for fornecido, lê interativamente

### caddy fmt

Já documentado acima.

### caddy version

Mostra versão do binário.

```bash
caddy version
```

### caddy help

Mostra ajuda de qualquer comando.

```bash
caddy help [<command>]
```

### caddy completion

Gera script de autocomplete para shell.

```bash
caddy completion [bash|zsh|fish|powershell]
```

### caddy manpage

Gera man pages.

```bash
caddy manpage [--directory <dir>]
```

### caddy upgrade

Faz upgrade do binário Caddy via download.

```bash
caddy upgrade [--keep-plugins]
```

### caddy add-package / remove-package

Gerencia plugins em runtime (requer binário compilado com suporte a plugins).

```bash
caddy add-package <packages...>
caddy remove-package <packages...>
```

### caddy storage export / import

Exporta/importa o storage de certificados.

```bash
caddy storage export --output <file>
caddy storage import --input <file>
```

### caddy respond

Quick response server (útil para debug).

```bash
caddy respond [--listen <addr>] [--body <text>] [--status <code>] [--headers <k=v...>]
```

## Convenções de Diretório

| Dado | Linux | macOS |
|------|-------|-------|
| Data directory | `$HOME/.local/share/caddy` | `$HOME/Library/Application Support/Caddy` |
| Config directory | `$HOME/.config/caddy` | `$HOME/Library/Application Support/Caddy` |

Verificar com: `caddy environ`

## Transparência de Build

```bash
caddy build-info
# Exemplo de saída:
# caddy version: v2.8.4
# modules:
#  - caddy.dns/cloudflare
#  - caddy.http/handlers/ratelimit
```

## Railway

Caddy pode ser deployado no Railway com suporte a plugins customizados.

### Deploy via Template

O botão "Deploy to Railway" no [download page](https://caddyserver.com/download) cria um projeto Railway pré-configurado com os plugins selecionados.

### Deploy Customizado

1. Crie um `Dockerfile`:
```dockerfile
FROM caddy:builder AS builder
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:latest
COPY Caddyfile /etc/caddy/Caddyfile
```

2. Configure as variáveis de ambiente no Railway (ex: `CLOUDFLARE_API_TOKEN`)

3. Faça deploy via GitHub ou Railway CLI:
```bash
railway up
```

### Configuração Mínima

```caddy
{
    email admin@example.com
}

:80 {
    respond "Hello from Railway!"
}
```

## Outros Métodos de Instalação (Comunidade)

| Método | Comando |
|--------|---------|
| Homebrew | `brew install caddy` |
| Chocolatey | `choco install caddy` |
| Scoop | `scoop install caddy` |
| Webi | `curl -sS https://webinstall.dev/caddy | bash` |
| Ansible | `ansible-galaxy install n0ts.caddy` |
| Termux | `pkg install caddy` |
| Nix/NixOS | `nix-shell -p caddy` |
| Unikraft | Imagem unikernel |
| OPNsense | Plugin OS-Caddy |
| Mise | `mise use -g caddy` |

## Variáveis de Ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `CADDY_ADMIN` | Endereço da admin API | `localhost:2019` |
| `HOME` | Diretório home do usuário | — |
| `XDG_DATA_HOME` | Data directory (sobrescreve HOME) | `$HOME/.local/share` |
| `XDG_CONFIG_HOME` | Config directory | `$HOME/.config` |
| `CADDY_COMPLETION` | Cache de autocomplete | — |
| `CADDY_PATH` | Caminho da config (fallback) | — |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint OTLP | — |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | Endpoint OTLP metrics | — |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | Protocolo OTLP | `grpc` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Headers OTLP | — |
| `OTEL_METRIC_EXPORT_INTERVAL` | Intervalo de exportação | — |
| `OTEL_METRICS_EXPORTER` | Exporter de métricas | — |
| `SSLKEYLOGFILE` | Log de chaves TLS (debug) | — |

## Signals

| Signal | Efeito |
|--------|--------|
| SIGINT / SIGTERM | Graceful shutdown |
| SIGQUIT | Shutdown imediato (força fechamento) |
| SIGUSR1 | Recarrega config (com `caddy run` apenas) |
| SIGUSR2 | Abre profiler pprof |
| SIGHUP | Ignorado |

## Exit Codes

| Code | Significado |
|------|-------------|
| 0 | Sucesso |
| 1 | Erro inesperado (panic, falha interna) |
| 2 | Erro de uso de CLI (flag inválida, argumento faltando) |
| 3 | Config inválida (validação falhou) |
