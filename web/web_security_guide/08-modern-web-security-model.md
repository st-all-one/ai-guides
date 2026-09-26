# Modern Web Security Model — Síntese Unificada

Este documento sintetiza o modelo de segurança web moderno a partir da documentação MDN, integrando privacidade, segurança, autenticação e threat modeling em uma visão coesa.

## 1. O Modelo em Uma Frase

**Confiança zero em cross-origem, verificação explícita em cada camada, coleta mínima de dados, defesa em profundidade.**

## 2. Pilares do Modelo Moderno

### 2.1 HTTPS como Base Absoluta
Sem HTTPS, nada mais funciona:
- APIs poderosas são bloqueadas (Secure Contexts)
- Service Workers não registram
- Mixed content é bloqueado
- MITM pode interceptar tudo

### 2.2 Same-Origin Policy como Fundação
- SOP isola origins por padrão
- Cross-origin reads bloqueados
- Cross-origin embedding permitido mas controlado
- Relaxamento explícito via CORS, CORP, COEP, COOP

### 2.3 Fim dos Third-Party Cookies
- Todos os browsers estão bloqueando ou particionando por padrão
- Substituição por CHIPS (opt-in partitioned) + Storage Access API + first-party storage
- Redirect tracking mitigado por bounce tracking heuristics

### 2.4 Content Security Policy como Firewall de Conteúdo
- Strict CSP (nonce/hash-based) elimina XSS por injeção
- `frame-ancestors` previne clickjacking
- `require-trusted-types-for` previne DOM-based XSS
- Modo report-only para testes seguros

### 2.5 Autenticação Phishing-Resistant
- Passkeys (WebAuthn) como padrão: origin-bound, sem shared secrets
- MFA (TOTP) como fallback/second factor
- Session management com cookies seguros + refresh tokens

### 2.6 Privacidade por Design
- State partitioning (double-keying) de todo client-side state
- Coleta mínima de dados + transparência + deleção
- Controle de acesso a APIs poderosas via Permissions Policy
- Referrer Policy restrito

### 2.7 Defense in Depth
Nenhuma defesa única é suficiente. Exemplo XSS precisa:
1. Output encoding
2. Sanitização
3. Strict CSP
4. Trusted Types
5. HttpOnly cookies

### 2.8 Threat Modeling Contínuo
- Processo iterativo, não evento único
- 4 perguntas: System → Threats → Responses → Validation
- STRIDE + LINDDUN para cobertura security + privacy
- Documento versionado, publicado idealmente

## 3. Arquitetura de Defesa em Camadas

```
┌──────────────────────────────────────────────────────┐
│                    PRIVACY LAYER                       │
│  State Partitioning | CHIPS | Storage Access Policy   │
│  Bounce Tracking | Fingerprinting Protection          │
├──────────────────────────────────────────────────────┤
│               AUTHENTICATION LAYER                     │
│  Passkeys (WebAuthn) | Session Management | MFA      │
├──────────────────────────────────────────────────────┤
│               APPLICATION LAYER (Browser)             │
│  SOP | User Activation | Trusted Types | SRI         │
├──────────────────────────────────────────────────────┤
│               APPLICATION LAYER (Server)              │
│  Input Validation | Output Encoding | CSRF Tokens    │
│  Access Control (per object) | Rate Limiting         │
├──────────────────────────────────────────────────────┤
│               HTTP HEADERS LAYER                      │
│  CSP | HSTS | CORP | COOP | Permissions-Policy      │
│  Referrer-Policy | X-Content-Type-Options            │
├──────────────────────────────────────────────────────┤
│               COOKIE LAYER                            │
│  SameSite | Secure | HttpOnly | __Host- prefix      │
│  CHIPS (Partitioned) | Max-Age                       │
├──────────────────────────────────────────────────────┤
│               TRANSPORT LAYER                         │
│  TLS 1.3 | HSTS | Certificate Transparency           │
│  Mixed Content Blocking                              │
├──────────────────────────────────────────────────────┤
│               INFRASTRUCTURE LAYER                    │
│  OpSec | SBOM | Dependency Mgmt | Backups           │
│  Monitoring (CSP reports, auth logs)                 │
└──────────────────────────────────────────────────────┘
```

## 4. Padrões e Anti-Padrões

### ✅ Padrão Moderno (Do This)
| Área | Padrão |
|------|--------|
| Transport | HTTPS-only + HSTS preload |
| Cookies | `__Host-` prefix + Secure + HttpOnly + SameSite=Lax |
| Third-party cookies | CHIPS (`Partitioned`) ou Storage Access API |
| CSP | Strict CSP (nonce/hash) + `frame-ancestors` + `require-trusted-types-for` |
| CORS | Specific origins only; never reflect `Origin` with credentials |
| Auth | Passkeys (WebAuthn) primary |
| Session | Centralized, cookie-based, HttpOnly + Secure + SameSite |
| Privacy | State partitioning, min data collection, Referrer-Policy |
| Threat model | STRIDE + LINDDUN, 4 questions, iterative |

### ❌ Anti-Padrão (Stop Doing)
| Área | Anti-Padrão | Por quê |
|------|-------------|---------|
| CSP | `'unsafe-inline'` + `data:` em script-src | Permite XSS |
| CSP | Host-based allowlists no script-src | Muito amplo, difícil de manter |
| CORS | Refletir `Origin` header | Cria trust escalável |
| Auth | Implicit Flow (OAuth) | Tokens expostos no front-end |
| Session | localStorage para session tokens | Sem HttpOnly, vulnerável a XSS |
| Cookies | SameSite=None sem Secure | Rejeitado por browsers |
| Third-party | Embed scripts sem auditar | Privacidade comprometida |
| robots.txt | Listar paths sensíveis | Revela localização para attackers |
| Privacy | Coletar dados "por precaução" | Aumenta risco sem benefício |

## 5. Tomada de Decisão Rápida

### "Devo usar third-party cookies?"
NÃO. Use CHIPS (`Partitioned`) + Storage Access API ou first-party storage.

### "Qual método de autenticação?"
Passkeys > TOTP > Federated Identity > Passwords + MFA

### "Que headers de segurança são obrigatórios?"
1. `Strict-Transport-Security`
2. `Content-Security-Policy` (strict)
3. `X-Content-Type-Options: nosniff`
4. `Referrer-Policy`
5. `Permissions-Policy`

### "Como proteger cookies?"
`Set-Cookie: __Host-<name>=<value>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=<seconds>`

### "Como implementar CSP sem quebrar o site?"
Usar `Content-Security-Policy-Report-Only` primeiro, monitorar reports, depois ativar.

### "Preciso me preocupar com fingerprinting?"
Sim. Browsers já aplicam noise e restrições. Sua parte: minimizar APIs de fingerprinting, usar Permissions Policy, não depender de canvas fingerprinting.

### "Como lidar com a transição de third-party cookies?"
1. Auditar
2. Testar com bloqueio
3. Implementar CHIPS ou Storage Access API
4. Graceful degradation
5. Remover dependência quando possível

## 6. Referências Principais

- MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security
- MDN Web Privacy: https://developer.mozilla.org/en-US/docs/Web/Privacy
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
- Threat Modeling Manifesto: https://threatmodelingmanifesto.org/
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/
- HSTS Preload List: https://hstspreload.org/
- CSP Evaluator: https://csp-evaluator.withgoogle.com/
