# Practical Implementation — Headers, CSP, Deploy Checklist

Ordem recomendada por impacto × facilidade (MDN Practical Implementation Guides).

## Priority 1: TLS/HTTPS (Max Impact, Low Difficulty)

### Configuração do Servidor
```
# NGINX — HTTP → HTTPS redirect
server { listen 80; return 301 https://$host$request_uri; }
```
Usar Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/

### HSTS
```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
- `max-age`: 2 anos (`63072000`)
- `includeSubDomains`: testar antes
- `preload`: submeter em hstspreload.org

### CSP upgrade-insecure-requests
```http
Content-Security-Policy: upgrade-insecure-requests;
```

## Priority 2: Secure Cookie Configuration

### Template Universal
```http
Set-Cookie: __Host-MOZSESSIONID=7307d70a86bd4ab5a00499762; Max-Age=2592000; Path=/; Secure; HttpOnly; SameSite=Lax
```

### Casos Específicos

**Session (browser close = deletado):**
```http
Set-Cookie: MOZSESSIONID=980e5da39d4b472b9f504cac9; Path=/; Secure; HttpOnly
```

**Cross-subdomain session (30 dias, SameSite=Lax):**
```http
Set-Cookie: __Secure-SESSION=7307d70a86bd4ab5a00499762; Max-Age=2592000; Domain=example.org; Path=/; Secure; HttpOnly; SameSite=Lax
```

**Long-lived JS-accessible (SameSite=Lax):**
```http
Set-Cookie: __Host-ACCEPTEDTOS=true; Expires=Fri, 31 Dec 9999 23:59:59 GMT; Path=/; Secure; SameSite=Lax
```

**Strictest (`__Host-` + `SameSite=Strict`):**
```http
Set-Cookie: __Host-BMOSESSIONID=YnVnemlsbGE=; Max-Age=2592000; Path=/; Secure; HttpOnly; SameSite=Strict
```

### CHIPS (Partitioned Cookies)
```http
Set-Cookie: __Host-chat_prefs=dark; SameSite=None; Secure; Path=/; Partitioned
```

## Priority 3: Content Security Policy (CSP)

### Strict CSP (Nonce-based) — RECOMENDADO
```http
Content-Security-Policy:
  default-src 'none';
  script-src 'nonce-{random}' 'strict-dynamic' 'unsafe-inline' https:;
  object-src 'none';
  base-uri 'none';
```

### Strict CSP (Hash-based)
```http
Content-Security-Policy:
  default-src 'none';
  script-src 'sha256-{hash}' 'strict-dynamic' 'unsafe-inline' https:;
  object-src 'none';
  base-uri 'none';
```

### Frame-ancestors (Clickjacking Protection)
```http
Content-Security-Policy: frame-ancestors 'none';
Content-Security-Policy: frame-ancestors 'self';
```
+ legacy:
```http
X-Frame-Options: DENY (ou SAMEORIGIN)
```

### Report-Only Mode (Testing)
```http
Content-Security-Policy-Report-Only: ...; report-to csp-endpoint; report-uri /csp-reports
```
```http
Reporting-Endpoints: csp-endpoint="https://example.com/csp-reports"
```

### NÃO USAR (inseguro)
```http
script-src 'unsafe-inline' data: https:;   # NUNCA
```

## Priority 4: Cross-Origin Resource Policy (CORP)
```http
Cross-Origin-Resource-Policy: same-origin
```

## Priority 5: MIME Type Verification
```http
X-Content-Type-Options: nosniff
```

## Priority 6: Referrer Policy
```http
Referrer-Policy: strict-origin-when-cross-origin
```
Fallback:
```http
Referrer-Policy: no-referrer, strict-origin-when-cross-origin
```

## Priority 7: CORS (Mínimo Necessário)
```http
# Público sem credenciais
Access-Control-Allow-Origin: *

# Específico com credenciais
Access-Control-Allow-Origin: https://trusted.example.org
```
NUNCA refletir `Origin` header com `Access-Control-Allow-Credentials: true`.

## Priority 8: Permissions Policy
```http
Permissions-Policy: geolocation=(self), camera=(), microphone=()
```

## Priority 9: Subresource Integrity (SRI)
```html
<script src="https://cdn.example/lib.js"
        integrity="sha384-r1y8TJcloKTvouxnYsi4PJAx+nHNr90ibsEn3zznzDzWBN9X3o3kbHLSgcIPtzAp"
        crossorigin="anonymous"></script>
```

Gerar hash:
```bash
curl -s https://cdn.example/lib.js | openssl dgst -sha384 -binary | openssl base64 -A
```

## Priority 10: Clear-Site-Data (Logout)
```http
Clear-Site-Data: "cache", "cookies", "storage"
```

---

## Deploy Checklist (Resumo Executivo)

### Infrastructure
- [ ] TLS certificate (Let's Encrypt)
- [ ] HSTS: `max-age=63072000; includeSubDomains; preload`
- [ ] HTTP → HTTPS 301 redirect
- [ ] HSTS preload list submission

### HTTP Headers
- [ ] `Content-Security-Policy` (strict, nonce/hash-based)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` (restringir acesso a APIs)
- [ ] `Cross-Origin-Resource-Policy: same-origin`
- [ ] `Cross-Origin-Opener-Policy: same-origin`

### Cookies
- [ ] `Secure` em todos cookies
- [ ] `HttpOnly` em session cookies
- [ ] `SameSite=Lax` (ou `Strict`)
- [ ] `__Host-` prefix onde possível
- [ ] CHIPS `Partitioned` para third-party use cases
- [ ] CSRF tokens para state-changing requests
- [ ] Fetch Metadata validation server-side

### Authentication
- [ ] Passkeys (WebAuthn) como primary method
- [ ] Session management: centralized model
- [ ] Session cookies: HttpOnly + Secure + SameSite
- [ ] Idle timeout (30 min) + absolute timeout
- [ ] Invalidar sessão em eventos suspeitos

### Third-Party
- [ ] Auditar todos third-party scripts
- [ ] SRI para CDN resources
- [ ] CSP frame-ancestors para iframes
- [ ] Testar com third-party cookies bloqueados

### Privacy
- [ ] Privacy policy publicada
- [ ] Consentimento para coleta de dados
- [ ] Usuário pode acessar + deletar seus dados
- [ ] Clear-Site-Data no logout
- [ ] CHIPS para cookies third-party necessários

### Monitoring
- [ ] CSP violation reports (report-to endpoint)
- [ ] Logging de authentication events + access control failures
- [ ] Monitorar Certificate Transparency logs
- [ ] SBOM (CycloneDX/SPDX) mantido atualizado
