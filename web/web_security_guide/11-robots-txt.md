# robots.txt Security

Arquivo que instrui crawlers (principalmente search engines) sobre quais paths não devem ser rastreados.

## Propósito Correto

- Reduzir load no servidor causado por crawlers
- Evitar que conteúdo irrelevante apareça em resultados de busca

## ⚠️ Anti-Padrão Crítico

**NÃO use robots.txt para esconder informações sensíveis.**

`robots.txt` é **público** — qualquer pessoa pode lê-lo. Listar paths como `/admin` ou `/secret` revela sua localização para attackers.

Além disso, crawlers maliciosos (malware, email harvesters) ignoram `robots.txt`.

## Exemplos

### Bloquear todos crawlers do site inteiro
```
User-agent: *
Disallow: /
```

### Bloquear diretório específico (NÃO RECOMENDADO para dados sensíveis)
```http example-bad
User-agent: *
Disallow: /secret/admin-interface
```

## Alternativas a robots.txt

| Método | Onde | Uso |
|--------|------|-----|
| `X-Robots-Tag` HTTP header | Server response | Controle por recurso |
| `<meta name="robots">` | HTML `<head>` | Controle por página |
| `noindex` directive | Ambos | Remove de search results |

```http
X-Robots-Tag: noindex, nofollow
```
```html
<meta name="robots" content="noindex, nofollow">
```

## Regras

1. Use robots.txt apenas para controle de crawl legítimo
2. **Nunca** coloque paths de admin, APIs internas, ou dados sensíveis
3. Use `X-Robots-Tag` ou `<meta name="robots">` para controle granular de indexação
4. Para autenticação real, use mecanismos de acesso (HTTP auth, session, IP allowlist)

## Ref

- [RFC 9309 — Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309)
- [About /robots.txt](https://www.robotstxt.org/robotstxt.html)
