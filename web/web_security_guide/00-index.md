# Web Security & Privacy Guide — Índice e Visão Geral

## Propósito

Compilado AI-optimizado extraído da documentação MDN sobre segurança e privacidade na web. Foco: **padrão moderno atual**, semântica de defesas, interdependências entre ataques e mitigações, e modelo básico de implementação.

## Estrutura dos Documentos

| Doc | Título | Foco |
|-----|--------|------|
| 01 | Core Defenses & Foundation | TLS, HSTS, SOP, Secure Contexts, Mixed Content |
| 02 | Modern Authentication | Passkeys, WebAuthn, Session Management, Federated Identity |
| 03 | Cookie Security & Privacy | SameSite, CHIPS, State Partitioning, Storage Access API |
| 04 | Privacy & Anti-Tracking | Bounce Tracking, Privacy Sandbox, Fingerprinting, Referrer Policy |
| 05 | Attack-Defense Matrix | Relacionamento many-to-many entre ataques e defesas |
| 06 | Threat Modeling Framework | STRIDE, LINDDUN, Metodologia 4 Perguntas, PWA Threat Model |
| 07 | Practical Implementation | Headers exatos, CSP templates, cookie config, deploy checklist |
| 08 | Modern Web Security Model | Síntese do modelo de segurança moderno — visão unificada |
| 09 | Operational Security (OpSec) | SDLC, secrets, dependencies, SBOM, monitoring, backups |
| 10 | Local Network Access | Address spaces, permissions, mixed content relaxation |
| 11 | robots.txt Security | Crawl control, anti-pattern de expor paths sensíveis |
| 12 | Form Autocompletion | autocomplete="off", login fields exception, WCAG |
| 13 | Input Validation (Detalhado) | Allowlist, client/server-side, file uploads, relação com ataques |
| 14 | TLS Configuration (Detalhado) | Mozilla config generator, redirection, HSTS, ciphers |
| 15 | Firefox Tracking Protection | ETP modes, tracking list, impacto em sites, graceful degradation |
| 16 | Storage Access Policy Errors | Todos 5 erros Firefox: causas, mensagens, resoluções |
| 17 | HTTPS by Default | HTTPS como feature de privacidade, Secure Contexts, anti-tracking |

## Princípios Transversais (Cross-Cutting)

1. **Defense in Depth** — múltiplas camadas de defesa para cada ataque
2. **Least Privilege** — menor acesso possível para cada componente
3. **Secure by Default** — configurações seguras como padrão (SameSite=Lax, HTTPS-only)
4. **Privacy by Design** — minimizar coleta, particionar estado, eliminar dados ao fim do uso
5. **Zero Trust** para third-parties — auditar, isolar, verificar integridade
6. **HTTPS é requisito absoluto** — base para Secure Contexts, Service Workers, APIs poderosas
7. **Fim dos third-party cookies** — migrar para CHIPS, Storage Access API, first-party storage

## Relação Privacidade + Segurança

- **Privacidade** sem segurança é frágil — dados coletados eticamente precisam ser protegidos
- **Segurança** sem privacidade é incompleta — proteger dados que não deveriam ser coletados não é suficiente
- **Legislação**: GDPR (UE), CCPA (Califórnia), LGPD (Brasil) — exigem transparência, consentimento, acesso e deleção
