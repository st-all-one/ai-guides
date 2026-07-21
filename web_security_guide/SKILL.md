---
name: web-security-review
description: >-
  Skill for reviewing web application security architecture and implementation.
  Uses the Web Security & Privacy Guide (MDN-based) to enforce modern best
  practices across TLS, authentication, cookies, CSP, privacy, threat modeling,
  and operational security.
---

# Web Security & Privacy Guide — AI Skill

## When to Use

Apply this skill when the user asks you to:
- Review security of a web application (code, config, architecture)
- Audit HTTP headers, CSP, cookies, or TLS configuration
- Implement or review authentication (passkeys, sessions, OIDC)
- Evaluate privacy posture (tracking, fingerprinting, data collection)
- Perform or review threat modeling (STRIDE, LINDDUN)
- Review deployment/infrastructure security (OpSec, SBOM, CI/CD)
- Migrate from third-party cookies to CHIPS / Storage Access API
- Implement Content Security Policy (strict nonce/hash-based)
- Review input validation, file upload, or CSRF defenses

## Source Files

All documents are in `web_security_guide/`:

| File | Content |
|------|---------|
| `00-index.md` | Index and cross-cutting principles |
| `01-core-defenses.md` | TLS, SOP, Secure Contexts, CORP, COOP, SRI, CT, User Activation |
| `02-authentication-modern.md` | Passkeys/WebAuthn, Session Mgmt, OTP, OIDC/PKCE, FedCM |
| `03-cookie-security.md` | SameSite, CHIPS, State Partitioning, Storage Access API |
| `04-privacy-anti-tracking.md` | Bounce Tracking, Referrer Policy, Permissions Policy, Fingerprinting |
| `05-attack-defense-matrix.md` | Attack↔Defense mapping, defense in depth examples |
| `06-threat-modeling-framework.md` | 4 Questions, STRIDE, LINDDUN, PWA threat model |
| `07-practical-implementation.md` | Headers, CSP templates, cookie config, deploy checklist |
| `08-modern-web-security-model.md` | Unified synthesis, patterns & anti-patterns |
| `09-operational-security.md` | SDLC, secrets, dependencies, SBOM, monitoring |
| `10-local-network-access.md` | Address spaces, permissions, mixed content relaxation |
| `11-robots-txt.md` | Crawl control security, anti-patterns |
| `12-form-autocompletion.md` | autocomplete attribute, WCAG, login exception |
| `13-input-validation.md` | Allowlist vs denylist, file uploads, attack mapping |
| `14-tls-deep.md` | Mozilla config profiles, HSTS, redirection |
| `15-firefox-tracking-protection.md` | ETP modes, graceful degradation |
| `16-storage-access-policy-errors.md` | All 5 Firefox errors, causes, resolutions |
| `17-https-by-default.md` | HTTPS as privacy feature, Secure Contexts |
| `modern-implementation-example.md` | Full reference implementation (all concepts applied) |
| `VERSION` | Guide version and date |

## Core Principles to Enforce

1. **Defense in Depth** — multiple layers for every attack (never single defense)
2. **Least Privilege** — minimal access for every component
3. **Secure by Default** — safe defaults (SameSite=Lax, HTTPS-only, strict CSP)
4. **Privacy by Design** — minimize collection, partition state, delete when done
5. **Zero Trust for Third Parties** — audit, isolate, verify integrity
6. **HTTPS is Absolute** — prerequisite for Secure Contexts, Service Workers, powerful APIs
7. **End of Third-Party Cookies** — use CHIPS, Storage Access API, first-party storage

## Review Workflow

### Step 1: Map the System
Identify components, assets, data flows, trust boundaries, external dependencies, stakeholders.

### Step 2: Check Each Layer (Bottom→Top)

```
Infrastructure → Transport → Cookie → HTTP Headers →
Application (Server) → Application (Browser) →
Authentication → Privacy → OpSec
```

For each layer, verify:

| Layer | Check Against |
|-------|---------------|
| **Infrastructure** | `09-operational-security.md` — SBOM, secrets, backups |
| **Transport** | `01-core-defenses.md`, `14-tls-deep.md`, `17-https-by-default.md` — TLS 1.3, HSTS, CT |
| **Cookie** | `03-cookie-security.md` — SameSite, Secure, HttpOnly, __Host-, CHIPS |
| **HTTP Headers** | `01-core-defenses.md`, `07-practical-implementation.md` — CSP, HSTS, CORP, COOP, Referrer-Policy, Permissions-Policy |
| **Application (Server)** | `13-input-validation.md`, `05-attack-defense-matrix.md` — validation, encoding, CSRF |
| **Application (Browser)** | `01-core-defenses.md` — SOP, SRI, Trusted Types, User Activation |
| **Authentication** | `02-authentication-modern.md` — passkeys, sessions, MFA, OIDC |
| **Privacy** | `04-privacy-anti-tracking.md`, `15-firefox-tracking-protection.md`, `16-storage-access-policy-errors.md` |
| **OpSec** | `09-operational-security.md` — CI/CD, dependency mgmt, monitoring |

### Step 3: Threat Model
Use `06-threat-modeling-framework.md` — 4 Questions + STRIDE + LINDDUN.

### Step 4: Attack-Defense Mapping
Use `05-attack-defense-matrix.md` — ensure every identified threat has a corresponding defense (ideally multiple).

### Step 5: Verify with Deploy Checklist
Use `07-practical-implementation.md` deploy checklist and `modern-implementation-example.md` as reference.

## Quick Reference — Non-Negotiables

### HTTP Headers (every response)
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'none'; script-src 'nonce-{random}' 'strict-dynamic' 'unsafe-inline' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; upgrade-insecure-requests;
Permissions-Policy: geolocation=(), camera=(), microphone=()
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Opener-Policy: same-origin
```

### Cookies (every Set-Cookie)
```
Set-Cookie: __Host-<name>=<value>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=<seconds>
```

### Authentication Priority
Passkeys (WebAuthn) > TOTP > Federated Identity (OIDC+PKCE) > Passwords + MFA

### CSP Enforcement
- ✅ Strict CSP (nonce/hash-based) with `'strict-dynamic'`
- ✅ `frame-ancestors 'none'` (or `'self'`)
- ❌ NEVER `'unsafe-inline'` in `script-src`
- ❌ NEVER host-based allowlists in `script-src`

## Common Anti-Patterns to Flag

| Anti-Pattern | Replace With |
|-------------|--------------|
| `script-src 'unsafe-inline'` + `data:` | Strict nonce/hash CSP |
| Third-party cookies | CHIPS (`Partitioned`) + Storage Access API |
| JWT in localStorage | HttpOnly session cookie |
| `SameSite=None` without `Secure` | Remove `SameSite=None` or add `Secure` |
| Implicit Flow (OAuth) | Authorization Code + PKCE |
| `robots.txt` with `/admin` paths | Authentication + access control |
| `autocomplete="off"` on password fields | `autocomplete="new-password"` or accept browser behavior |
| Reflecting `Origin` in `Access-Control-Allow-Origin` with creds | Specific allowlist |

## Verification Commands (when applicable)

```bash
# Check TLS configuration
npx ssl-cert-check --host example.com --port 443

# Evaluate CSP
# https://csp-evaluator.withgoogle.com/

# Check HSTS preload status
# https://hstspreload.org/

# Audit npm dependencies
npm audit --audit-level=high

# Generate SBOM
npm sbom --omit=dev --format=cyclonedx

# Check for secrets in repo
trufflehog filesystem --directory=. --max-depth=5

# Test with third-party cookies blocked
# Chrome: chrome://settings/cookies → "Block third-party cookies"
# Firefox: about:preferences#privacy → ETP Strict
```
