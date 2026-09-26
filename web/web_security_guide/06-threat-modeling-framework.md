# Threat Modeling Framework

Baseado na metodologia MDN: processo iterativo, living document, começa cedo, revisitado frequentemente.

## As 4 Perguntas (Threat Modeling Manifesto)

### Q1: What are we working on? (System Modeling)

**Componentes (C1, C2...):** o que roda código ou armazena dados
- Web server, blog software, auth system, user content, contact form, third-party scripts

**Assets (A1, A2...):** o que o atacante quer
- User data, credentials, cookies/sessions, private content, PII

**Data Flows (F1, F2...):** como assets se movem entre componentes
- Unidirecional ou bidirecional, atravessando trust boundaries

**Trust Boundaries:** onde dados cruzam de áreas não-confiáveis para confiáveis
- Ataques se concentram aqui

**External Dependencies (E1, E2...):** black boxes
- OS, browser/web platform, hosting provider, browser extensions

**Stakeholders (S1, S2...):** humanos impactados
- Anonymous users, registered users, admins, developers, business owners
- **Não** modelar attackers (evita viés de análise)

### Q2: What can go wrong? (Threat Identification)

Usar frameworks STRIDE e/ou LINDDUN + listas de ameaças (OWASP Top 10, MDN attack pages).

Apresentar threats em tabela: T1, T2, T3...

### Q3: What are we going to do? (Response — ERTA)

| Resposta | Ação |
|----------|------|
| **Eliminate** | Remover asset/feature (ex: remover comentários) |
| **Reduce** | Adicionar controles, mitigações |
| **Transfer** | Delegar a outro sistema (ex: plugin de comentários externo) |
| **Accept** | Assumir risco com monitoramento |

### Q4: Did we do a good enough job? (Validation)

- File issues, document findings
- Revalidar em rodadas subsequentes
- Publicar threat model (demonstra confiabilidade)

---

## Frameworks de Análise

### STRIDE (Security — Microsoft)

| Letra | Categoria | Pergunta Exemplo |
|-------|-----------|-----------------|
| **S** | Spoofing | Cookies protegidos contra roubo? |
| **T** | Tampering | Tudo encriptado com HTTPS? |
| **R** | Repudiation | Logamos eventos de segurança? |
| **I** | Information Disclosure | Dados expostos em query strings? |
| **D** | Denial of Service | Rate limiting implementado? |
| **E** | Elevation of Privilege | Privilege checks em cada operação? |

### LINDDUN (Privacy)

| Letra | Categoria | Pergunta Exemplo |
|-------|-----------|-----------------|
| **L** | Linking | Third parties podem trackear users cross-site? |
| **I** | Identifying | Pseudônimos são realmente não-identificáveis? |
| **N** | Non-repudiation | Logs mantidos mais que necessário? |
| **D** | Detecting | Login revela se usuário existe? |
| **D** | Data Disclosure | Analytics recebem dados pessoais? |
| **U** | Unawareness | Usuários entendem opt-in/opt-out? |
| **N** | Non-compliance | Third-parties compliant com políticas? |

---

## Notação Padrão

Usar índices consistentes:

| Prefixo | Significado | Exemplo |
|---------|-------------|---------|
| C1, C2 | Components | Web server, Auth system |
| A1, A2 | Assets | User data, Credentials |
| F1, F2 | Data Flows | Page rendering, Auth |
| E1, E2 | External Dependencies | Browser, Hosting |
| S1, S2 | Stakeholders | Registered user, Admin |
| T1, T2 | Threats | XSS, Account takeover |
| R1, R2 | Responses | Strict CSP, CSRF tokens |

---

## Exemplo: Static Blog

Arquitetura: public-facing blog + comments + contact form + analytics + map embed.

**Componentes:** Web server (C1), Auth (C2), User content (C3, C4), Third-party script loader (C5)

**Assets:** User data (A1-A5)

**Threats identificados:**

| ID | Threat | Mitigations |
|----|--------|-------------|
| T1 | XSS (comments) | Sanitization + Strict CSP + Template output encoding |
| T2 | Account takeover | CSRF tokens + Secure/HttpOnly/SameSite cookies + 30-day idle timeout |
| T3 | Spam | Rate limiting + spam filtering + manual moderation |
| T4 | Data leakage | Limit data exposure + review logs |
| T5 | DoS | Request limits + timeouts |

---

## Exemplo PWA: CycleTracker

App que armazena dados de ciclo menstrual APENAS em localStorage, sem third-party scripts.

**13 ameaças PWA-específicas:**

| Categoria | Threat | Mitigação |
|-----------|--------|-----------|
| **Device** | Acesso físico ao dispositivo | Device passcode + app PIN opcional |
| **Device** | Malware | OS updates + antivírus (accepted) |
| **Device** | Seizure forense | Botão "Delete all data" + encryption opcional |
| **Browser** | Perfil compartilhado | Private browsing guidance + delete button |
| **Browser** | Sync leakage (localStorage → cloud) | Documentar risco |
| **Browser** | Malicious extensions | Warn users (accepted) |
| **App** | XSS → leitura localStorage | Strict CSP + no inline scripts + code auditável |
| **App** | Service worker comprometido | Minimal SW + versioning + integrity checks |
| **App** | SW DoS | Fallback logic + SW simples |
| **Infra** | Hosting compromise | HTTPS-only + repository integrity monitoring |
| **Data** | Data corruption | Validate writes + export/import |
| **Privacy** | Inference attacks | Aceito (dados inerentemente sensíveis) |
| **Supply Chain** | Lookalike forks | Documentar URLs oficiais + code signing |

### Lições PWA
- Service workers são asset E vector (DoS, exfiltração)
- localStorage é inerentemente vulnerável a sync, backup, extensões
- Sem third-party dependencies = estratégia de segurança
- Código simples e auditável = first-class security control
