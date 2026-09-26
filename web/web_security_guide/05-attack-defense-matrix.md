# Attack-Defense Matrix

Relacionamento many-to-many entre ataques e defesas. Uma defesa protege contra múltiplos ataques; um ataque exige múltiplas defesas (defense in depth).

## 1. Ataques — Definições Rápidas

| Ataque | Como Funciona | Pré-condição |
|--------|--------------|--------------|
| **XSS** | Injeção de script pelo input do usuário | Input sem sanitização/output encoding |
| **CSRF** | Request cross-site usando credenciais do usuário | Apenas cookies para auth + state-changing via HTTP |
| **Clickjacking** | Iframe invisível sobre UI falsa | Site permite embedding (`frame-ancestors` não setado) |
| **XS-Leaks** | Deriva info via cross-site interactions | Site permite cross-site interactions sem isolamento |
| **IDOR** | Modifica referência a objeto (ex: user_id) | Server só verifica auth, não authorization |
| **MITM** | Interceptação entre browser e server | HTTP ou mixed content |
| **Phishing** | Página falsa que imita site legítimo | Usuário não distingue domínio |
| **Prototype Pollution** | Modifica `__proto__` para poluir Object.prototype | Dynamic property assignment sem validação |
| **SSRF** | Server faz request arbitrário | URL input sem validação |
| **Subdomain Takeover** | CNAME aponta para hosting não provisionado | Ordem errada provision/deprovision |
| **Supply Chain** | Compromete dependência third-party | Sem verificação de integridade |

## 2. Defesas vs Ataques — Mapa Direto

| Defesa | Protege Contra | Implementação |
|--------|---------------|---------------|
| **TLS/HTTPS** | MITM, Cookie theft | Certificado TLS + redirecionamento |
| **HSTS** | SSL stripping | `Strict-Transport-Security` header |
| **CSP (frame-ancestors)** | Clickjacking | `frame-ancestors 'none'` ou `'self'` |
| **CSP (strict)** | XSS (todos tipos) | Nonce/hash-based: `script-src 'nonce-{random}'` |
| **SameSite cookies** | CSRF, Clickjacking, XS-Leaks | `SameSite=Lax` ou `Strict` |
| **Fetch Metadata** | CSRF, XS-Leaks | Validar `Sec-Fetch-Site` no server |
| **Output Encoding** | XSS (server-side) | Template engine que escapa output |
| **Sanitization (DOMPurify)** | XSS (client-side HTML) | `DOMPurify.sanitize(input)` |
| **Trusted Types API** | DOM-based XSS | CSP: `require-trusted-types-for 'script'` |
| **CORP** | XS-Leaks, Spectre | `Cross-Origin-Resource-Policy: same-origin` |
| **COOP** | XS-Leaks (window) | `Cross-Origin-Opener-Policy: same-origin` |
| **Access Control (por objeto)** | IDOR | Comparar user_id com resource owner |
| **UUIDs (non-guessable IDs)** | IDOR | Substituir IDs sequenciais |
| **Input Validation** | XSS, SQLi, Command injection, SSRF | Allowlist validation |
| **Null-prototype objects** | Prototype Pollution | `Object.create(null)` ou `Map` |
| **Object.hasOwn()** | Prototype Pollution | Verificar own properties |
| **SRI** | Supply Chain (CDN) | `integrity="sha384-..."` |
| **SPF/DKIM/DMARC** | Phishing (email spoofing) | DNS records |
| **Passkeys (WebAuthn)** | Phishing, Credential stuffing | Origin-bound key pair |
| **Least Privilege** | SSRF, Supply Chain | Restringir network perms, dependências |
| **SBOM / Dependency Mgmt** | Supply Chain | CycloneDX/SPDX, lockfiles, updates |
| **Lifecycle Management** | Subdomain Takeover | Ordem correta provision/deprovision |
| **User Activation** | Clickjacking, Popup abuse | APIs gated on user interaction |
| **Mixed Content Blocking** | MITM (subresources) | Block/upgrade HTTP em páginas HTTPS |
| **Local Network Access** | CSRF (local devices) | Permission gating loopback |
| **Certificate Transparency** | CA compromise | SCTs em certificados |

## 3. Defense in Depth — Exemplo XSS

Para proteger contra XSS, **todas** as seguintes são necessárias:

1. Output encoding no template (server-side)
2. Sanitização de HTML rich (DOMPurify)
3. Strict CSP (nonce/hash-based)
4. Trusted Types API (CSP: `require-trusted-types-for`)
5. HttpOnly cookies (limita dano)
6. Input validation (allowlist)

## 4. Defense in Depth — Exemplo CSRF

1. `SameSite=Lax` (ou `Strict`) em cookies de sessão
2. CSRF tokens em forms
3. Fetch Metadata validation no server (`Sec-Fetch-Site: same-origin`)
4. Non-simple requests (JSON content type, custom headers)

## 5. Defesa por Camada (Modelo OSI-style)

| Camada | Defesas |
|--------|---------|
| **Network** | TLS 1.3, HSTS, HSTS preload, Certificate Transparency |
| **Transport** | HTTPS-only, Mixed Content blocking, upgrade-insecure-requests |
| **HTTP Headers** | CSP, Permissions-Policy, Referrer-Policy, CORP, COOP, COEP, X-Content-Type-Options |
| **Cookies** | SameSite, Secure, HttpOnly, __Host- prefix, CHIPS |
| **Application (server)** | Input validation, Output encoding, CSRF tokens, Access control, Rate limiting |
| **Application (browser)** | SOP, User Activation, Trusted Types, SRI, Storage Access API |
| **Authentication** | Passkeys (WebAuthn), MFA (TOTP), Session management |
| **Privacy** | State Partitioning, CHIPS, Storage Access Policy, Bounce Tracking Mitigations |
| **Infrastructure** | OpSec, SBOM, Dependency management, Backups, Monitoring (CSP reports, logging) |
