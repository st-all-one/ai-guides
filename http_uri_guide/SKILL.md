---
name: http-uri-moderno
description: Habilidade para implementar sistemas web seguindo padrões HTTP/URI modernos (RFC 9110-9114, RFC 3986) com segurança, caching, compressão e semântica correta.
tags: [http, uri, rest, api, segurança, caching, hsts, csp, cors, client-hints]
version: 2026.07
---

# Skill: HTTP + URI Moderno

## Princípios Fundamentais

1. **HTTPS sempre** — TLS 1.2 mínimo, TLS 1.3 preferido. HSTS com `max-age=63072000; includeSubDomains; preload`.
2. **HTTP/2 ou HTTP/3** sobre HTTP/1.1 — multiplexação, compressão HPACK/QPACK.
3. **Semântica REST fiel** — GET safe/idempotent, PUT/DELETE idempotent, POST/PATCH não-idempotent. Use 201 Created, 204 No Content, 308/307 redirects.
4. **Cache explícito** — HTML: `no-cache` + ETag; assets versionados: `public, max-age=31536000, immutable`; API mutável: `no-store`.
5. **CSP strict com nonces** — `script-src 'nonce-{RANDOM}'; object-src 'none'; base-uri 'none'`. Nunca `'unsafe-inline'`.
6. **Cookies seguros** — `Secure; HttpOnly; SameSite=Strict; __Host-` prefix. Prefira tokens Bearer + refresh rotation.
7. **Feature detection** sobre browser detection. Client Hints (`Sec-CH-UA-*`) sobre User-Agent string.
8. **CORS específico** — origins explícitas, nunca wildcard `*` com credentials. `Vary: Origin` sempre.
9. **Brotli** prioritário, gzip fallback. `Vary: Accept-Encoding`.
10. **URI correta** — sem credenciais na URL, sem `javascript:` URLs, `data:` moderado, `blob:` com `revokeObjectURL`. Text fragments com `rel="noopener"` cross-origin.

## Stack de Headers Recomendado

### Toda Resposta (Obrigatórios)
```
Content-Type: correto
Content-Length: <bytes>
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Segurança (Sempre)
```
Content-Security-Policy: script-src 'nonce-{RANDOM}'; object-src 'none'; base-uri 'none'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
X-Frame-Options: DENY
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Opener-Policy: same-origin
```

### Cache por Tipo de Recurso

| Tipo | Cache-Control | Validação |
|------|---------------|-----------|
| HTML | `no-cache` | ETag + Last-Modified |
| JS/CSS versionado | `public, max-age=31536000, immutable` | ETag |
| Imagem | `public, max-age=86400` | ETag |
| API mutável | `no-store` | — |
| API semi-estática | `public, max-age=60` | ETag |
| Dados sensíveis | `no-store, private` | — |

### CORS (API cross-origin)
```
Access-Control-Allow-Origin: https://exact-origin.com
Access-Control-Allow-Credentials: true  (se necessário)
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization, If-Match
Access-Control-Max-Age: 86400
Vary: Origin
```

## Métodos HTTP — Semântica Correta

| Operação | Método | Body Req | Idempotente | Status Codes |
|----------|--------|----------|-------------|--------------|
| Listar | GET | ❌ | ✅ | 200 |
| Obter | GET | ❌ | ✅ | 200, 404 |
| Criar | POST | ✅ | ❌ | 201 (+ Location) |
| Substituir | PUT | ✅ | ✅ | 200, 201, 204 |
| Atualizar parcial | PATCH | ✅ | ❌ | 200 |
| Remover | DELETE | ❌ | ✅ | 204 |
| Preflight | OPTIONS | ❌ | ✅ | 204 |

## Conditional Requests (Cache + Concorrência)

```
GET /resource → 200 + ETag: "abc"
GET /resource + If-None-Match: "abc" → 304 (cache válido)
PUT /resource + If-Match: "abc" → 412 (conflito) ou 200 (sucesso)
```

## Status Codes Essenciais

- **200** OK — sucesso
- **201** Created — POST/PUT com `Location`
- **204** No Content — DELETE, OPTIONS
- **301** Moved Permanently — pode mudar método, cacheável
- **307** Temporary Redirect — preserva método
- **308** Permanent Redirect — preserva método, cacheável
- **304** Not Modified — cache
- **400** Bad Request — validação
- **401** Unauthorized + `WWW-Authenticate`
- **403** Forbidden
- **404** Not Found
- **409** Conflict
- **412** Precondition Failed — ETag mismatch
- **415** Unsupported Media Type
- **429** Too Many Requests + `Retry-After`
- **500** Internal Server Error + `X-Request-Id`

## Segurança em Camadas

```
Transporte: TLS 1.2/1.3 + HSTS
HTTP: CSP + X-Content-Type-Options + X-Frame-Options + Referrer-Policy + Permissions-Policy
Cross-origin: CORS + CORP + COOP + COEP + Fetch Metadata
Sessão: Secure + HttpOnly + SameSite + __Host- prefix
Aplicação: Validação input + Rate limiting + CSRF tokens
```

### CSP Strict Template
```
Content-Security-Policy: script-src 'nonce-{RANDOM}'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

### Fetch Metadata — Resource Isolation
```
Sec-Fetch-Site: cross-site | same-site | same-origin | none
Sec-Fetch-Mode: navigate | same-origin | no-cors | cors | websocket
Sec-Fetch-Dest: document | iframe | script | style | image | empty
Sec-Fetch-User: ?1
```
Use para bloquear: API não deve vir de `Sec-Fetch-Dest: document`; Admin deve ser `Sec-Fetch-Site: same-origin`.

## Cookies — Template por Tipo

| Finalidade | Cookie | Atributos |
|------------|--------|-----------|
| Sessão | `__Host-session=abc` | `Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400` |
| Preferência | `lang=pt-BR` | `Secure; SameSite=Lax; Path=/; Max-Age=31536000` |
| Refresh token | `__Host-refresh_token=xyz` | `Secure; HttpOnly; SameSite=Strict; Path=/api/auth` |
| Third-party | `_ga=...` | `Secure; SameSite=None` (evitar) |

## Autenticação — Fluxo Bearer + Refresh

1. `POST /auth/login` → `201` + `access_token` (15min) + `Set-Cookie: __Host-refresh_token` (HttpOnly)
2. Toda API: `Authorization: Bearer <access_token>`
3. `401` → `POST /auth/refresh` (cookie) → novo `access_token` + novo refresh (rotação)
4. Refresh inválido → redirect `/login`

## URI — Regras de Ouro

- `https://` para tudo em produção
- Nunca `user:password@host` em URLs
- Nunca `javascript:` URLs — use event listeners
- `data:` apenas para dados inline pequenos; bloqueado em top-level navigation
- `blob:` sempre com `URL.revokeObjectURL()` após uso
- `query` para dados do servidor; `fragment` para dados do cliente
- Text fragments: `#:~:text=alvo` sempre com `rel="noopener"` cross-origin
- Domínio canônico definido (www vs non-www) com 301
- Versionamento de API no path: `/api/v1/`

## Compressão

```
Cliente envia: Accept-Encoding: br, gzip
Servidor: Content-Encoding: br (prioritário) ou gzip
Vary: Accept-Encoding
```

## Client Hints — Uso Correto

```
Servidor solicita: Accept-CH: Sec-CH-UA-Model, Sec-CH-Prefers-Color-Scheme, Downlink
Cache: Vary: Sec-CH-UA-Model, Sec-CH-Prefers-Color-Scheme
Critical: Critical-CH: Sec-CH-Prefers-Color-Scheme (se necessário em load)
```

## Browser Detection — Ordem de Preferência

1. **Feature detection**: `CSS.supports()`, `'geolocation' in navigator`
2. **Client Hints**: `navigator.userAgentData.getHighEntropyValues()`
3. **UA sniffing** (último caso): detecte *engine* (Blink/Gecko/WebKit), não browser

## Erros Comuns a Evitar

- ❌ `unsafe-inline` em CSP
- ❌ CORS wildcard `*` com credentials
- ❌ Credenciais em URLs
- ❌ `javascript:` URLs em links
- ❌ Browser detection quando feature detection serve
- ❌ Domain sharding (obsoleto desde HTTP/2)
- ❌ Nonce reutilizado (deve ser único por request)
- ❌ `Application/octet-stream` para JS/CSS
- ❌ Cookie sem `Secure` em produção
- ❌ `data:` URLs grandes ou em navegação top-level
- ❌ Não liberar `blob:` URLs (memory leak)

## NEL (Network Error Logging)

```http
Reporting-Endpoints: nel="https://example.com/reports"
NEL: {"report_to":"nel","max_age":31556952,"failure_fraction":1.0}
```

## Referências (RFCs)

- RFC 3986 (STD 66) — URI Generic Syntax
- RFC 9110 (STD 97) — HTTP Semantics
- RFC 9111 (STD 98) — HTTP Caching
- RFC 9112 (STD 99) — HTTP/1.1
- RFC 9113 — HTTP/2
- RFC 9114 — HTTP/3 (QUIC)
- RFC 6265 — Cookies
- RFC 6750 — Bearer Token
- RFC 6797 — HSTS
- RFC 7541 — HPACK
- RFC 9204 — QPACK
- RFC 9842 — Compression Dictionary Transport

---

## Instructions for AI

When asked to implement HTTP/URI patterns:
1. Apply the header stacks from this skill by resource type
2. Use the exact Cache-Control values by resource category
3. Always include security headers (CSP, HSTS, X-Content-Type-Options)
4. Use semantic HTTP methods + correct status codes
5. Implement conditional requests with ETag for cache/concurrency
6. Use Bearer tokens + refresh rotation for auth, __Host- prefix for cookies
7. Favor Brotli compression, then gzip
8. Use Client Hints over User-Agent; feature detection over browser detection
9. Apply CORS with explicit origins + Vary: Origin
10. Never embed credentials in URLs, never use javascript: URLs
