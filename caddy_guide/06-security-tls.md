# 06 — Segurança e TLS

## Automatic HTTPS

Caddy foi o primeiro servidor web a usar HTTPS automática e por default.

### Ativação

Automatic HTTPS ativa quando Caddy conhece um domínio ou IP:
- Site address na Caddyfile com hostname
- Host matcher no JSON
- Flags CLI `--domain` ou `--from`

### Desativação

```caddy
{
    auto_https off                     # desativa tudo
    auto_https disable_redirects       # só certificados, sem redirect
    auto_https disable_certs           # só redirect, sem certificados
    auto_https ignore_loaded_certs     # certificados manuais também são gerenciados
}
```

### Efeitos

- Certificados obtidos e renovados automaticamente
- HTTP → HTTPS redirect automático (porta 80)
- Nunca sobrescreve config explícita

## Hostname Requirements

Públicos (Let's Encrypt/ZeroSSL):
- Não localhost (`localhost`, `.local`, `.internal`, `.home.arpa`)
- Não IP address
- Wildcard `*` apenas no label mais à esquerda

Locais (CA própria):
- Qualquer hostname/IP funciona
- Certificados auto-assinados com CA local

## ACME Challenges

### HTTP Challenge (porta 80)

```caddy
{
    # DNS aponta A/AAAA para o servidor, porta 80 acessível
}
```

### TLS-ALPN Challenge (porta 443)

```caddy
{
    # DNS aponta A/AAAA, porta 443 acessível
}
```

### DNS Challenge

```caddy
{
    acme_dns cloudflare {env.CLOUDFLARE_API_TOKEN}
}
```

Requer build com plugin DNS.

```caddy
*.example.com {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
}
```

Única forma de obter wildcard certificates.

## On-Demand TLS

Obtém certificado no primeiro TLS handshake, não no startup.

```caddy
{
    on_demand_tls {
        ask http://localhost:9123/ask?domain={domain}
        # permission <module>  # módulo customizado
    }
}

https:// {
    tls {
        on_demand
    }
}
```

⚠️ **Segurança**: Sempre configurar `ask` em produção para evitar abuso.

## Local HTTPS

Caddy gera sua própria CA para hosts locais:

```caddy
example.com {
    tls internal
}
```

### Configuração da CA Local

```caddy
{
    pki {
        ca local {
            name "My Local CA"
            root_cn "My Local CA Root"
            intermediate_cn "My Local CA Intermediate"
            intermediate_lifetime 7d   # default
        }
    }
}
```

### Instalação da CA

- Automática na primeira execução (pode pedir senha)
- Manual: `caddy trust` (como root)
- Remoção: `caddy untrust`
- Pular: `skip_install_trust`

## TLS Directive

### Configuração Básica

```caddy
example.com {
    tls cert.pem key.pem                 # certificado manual
    tls admin@example.com                 # email ACME
    tls internal                          # CA local
    tls {
        protocols tls1.2 tls1.3           # min/max (default: tls1.2/tls1.3)
        ciphers TLS_AES_128_GCM_SHA256 ... # custom ciphers (não recomendado)
        curves x25519 secp256r1           # curvas elípticas
        alpn h2 http/1.1                  # ALPN values
    }
}
```

⚠️ **Não modificar** `protocols`, `ciphers`, `curves` sem conhecimento profundo. Os defaults são seguros.

### Certificate Issuers

```caddy
tls {
    issuer acme {
        dir https://acme-staging-v02.api.letsencrypt.org/directory
        email admin@example.com
        disable_http_challenge
        disable_tlsalpn_challenge
        alt_http_port 8080
        alt_tlsalpn_port 8443
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
        preferred_chains smallest
    }
    issuer zerossl <api_key> {
        validity_days 90
    }
    issuer internal {
        ca local
        lifetime 12h
    }
}
```

### Client Authentication

```caddy
tls {
    client_auth {
        mode require_and_verify  # request|require|verify_if_given|require_and_verify
        trust_pool file /path/to/ca.pem
        # trust_pool inline { trust_der <base64> }
        # trust_pool pki_root local
    }
}
```

### Trust Pool Providers

| Provider | Descrição |
|----------|-----------|
| `file <files...>` | PEM files do disco |
| `inline { trust_der <base64> }` | Inline base64 DER |
| `pki_root <ca>` | Root da CA interna |
| `pki_intermediate <ca>` | Intermediate da CA interna |
| `storage { ... }` | Certificados do storage |
| `http <endpoints...>` | Endpoints HTTP |

### Certificate Managers

```caddy
tls {
    get_certificate tailscale           # Tailscale *.ts.net
    get_certificate http http://localhost:9007/certs  # HTTP endpoint
}
```

## Key Types

```caddy
{
    key_type ed25519  # mais rápido, seguro
    # p256 | p384 | rsa2048 | rsa4096
}
```

## SNI

```caddy
{
    default_sni example.com     # quando ClientHello não tem SNI
    fallback_sni example.com    # experimental, quando SNI não match
    servers {
        strict_sni_host on      # valida Host == SNI (auto com client_auth)
    }
}
```

## Encrypted ClientHello (ECH)

### Ativação

```caddy
{
    dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    ech ech.example.net
}
```

### Considerações

- Build com plugin DNS obrigatório
- Public name deve apontar para o servidor
- Caddy obtém certificado para o public name
- Usar **um único public name** para todos os sites (maximiza anonymity set)
- Clientes precisam DoH/DoT para baixar HTTPS records
- Wildcard certificates + ECH = subdomínios privados

## OCSP Stapling

```caddy
{
    ocsp_interval 1h   # default
    # ocsp_stapling off  # desabilitar
}
```

## Preferred Chains

```caddy
{
    preferred_chains smallest  # cadeia com menos bytes
    # preferred_chains {
    #     root_common_name "ISRG Root X2"
    #     any_common_name "R3"
    # }
}
```

## Troubleshooting TLS

### Testar com staging

```caddy
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

### Logs

```caddy
{
    debug  # logs detalhados de TLS/ACME
}
```

### Forçar renovação

```bash
caddy renew --force
```

### Ver certificados

```bash
curl -vI https://example.com 2>&1 | grep -i certificate
openssl s_client -connect example.com:443 -servername example.com
```

## Resumo de Segurança

| Configuração | Recomendação |
|-------------|-------------|
| HTTPS automático | ON (default) |
| key_type | ed25519 |
| OCSP stapling | ON (default) |
| HSTS | Usar `header` directive (`header Strict-Transport-Security max-age=63072000`) |
| TLS versions | tls1.2-tls1.3 (default) |
| Ciphers | Default (não customizar) |
| On-Demand TLS | Apenas com `ask` endpoint |
| ECH | Para privacidade de SNI |
| trusted_proxies | Configurar se atrás de CDN/load balancer |
| strict_sni_host | ON se usar client auth |
