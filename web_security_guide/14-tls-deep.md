# TLS Configuration — Guia de Implementação

## 1. Configuração do Servidor

Usar o [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/):

```
https://ssl-config.mozilla.org/
```

Opções (baseadas nas [Mozilla TLS Guidelines](https://wiki.mozilla.org/Security/Server_Side_TLS)):

| Perfil | Segurança | Compatibilidade |
|--------|-----------|----------------|
| **Modern** | Máxima | Navegadores recentes apenas (TLS 1.3) |
| **Intermediate** | Alta | Ampla compatibilidade (TLS 1.2 + 1.3) |
| **Old** | Baixa | Sistemas legados (não recomendado) |

## 2. Resource Loading

**Problema:** Sites HTTPS carregando recursos HTTP são bloqueados ou geram mixed content warnings.

**Solução:** Todos recursos (JS, CSS, imagens, fonts, etc.) devem usar HTTPS.

```html example-good
<script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
```

```html example-bad
<script src="http://code.jquery.com/jquery-3.7.0.min.js"></script>
```

## 3. HTTP → HTTPS Redirection

### Regra de Ouro
Redirecionar HTTP para HTTPS **no mesmo host**. Redirecionar para host diferente impede HSTS de funcionar.

### NGINX
```nginx
server {
  listen 80;
  return 301 https://$host$request_uri;
}
```

### Apache
```apacheconf
<VirtualHost *:80>
  ServerName site.example.org
  Redirect permanent / https://site.example.org/
</VirtualHost>
```

### Múltiplos hosts
Correto:
1. `http://example.com` → `https://example.com` (301)
2. `https://example.com` → `https://example.org` (se necessário)

## 4. HSTS (HTTP Strict Transport Security)

### Diretivas
| Diretiva | Obrigatório | Descrição |
|----------|-------------|-----------|
| `max-age` | SIM | Duração em segundos. Mínimo 6 meses (`15768000`), recomendado 2 anos (`63072000`) |
| `includeSubDomains` | Opcional | Aplica HSTS a todos subdomínios |
| `preload` | Opcional | Permite inclusão no [HSTS preload list](https://hstspreload.org/) |

### Exemplos
```http
Strict-Transport-Security: max-age=63072000
```
```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Passos para Implementar
1. Set `max-age` mínimo 6 meses
2. Testar `includeSubDomains` cuidadosamente (pode quebrar subdomínios sem HTTPS)
3. Submeter em https://hstspreload.org/ (exige `includeSubDomains` + `max-age` ≥ 1 ano)

### CSP complementar
```http
Content-Security-Policy: upgrade-insecure-requests;
```
Converte URLs HTTP para HTTPS no navegador.

## 5. Checklist TLS

- [ ] Certificado TLS (Let's Encrypt, ZeroSSL, CA comercial)
- [ ] Mozilla SSL Config Generator (perfil Intermediate ou Modern)
- [ ] HTTP → HTTPS redirect (mesmo host, 301)
- [ ] `Strict-Transport-Security` (max-age ≥ 2 anos)
- [ ] `includeSubDomains` (após testar)
- [ ] `preload` + submissão em hstspreload.org
- [ ] `upgrade-insecure-requests` CSP
- [ ] Todos recursos carregados via HTTPS
- [ ] Sem mixed content warnings
