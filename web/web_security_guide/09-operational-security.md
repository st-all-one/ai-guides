# Operational Security (OpSec)

Práticas de segurança não-relacionadas ao código, mas ao processo de desenvolver, construir, entregar e atualizar o projeto. Defesa primária contra [Supply Chain Attacks](/en-US/docs/Web/Security/Attacks/Supply_chain_attacks).

## 1. Securing the Development Environment

### Strong Authentication for Maintainers
| Método | Nível |
|--------|-------|
| Passkeys (WebAuthn) | Ótimo — phishing-resistant |
| MFA (TOTP) | Bom — mas phishable |
| Senha isolada | Fraco — não usar |

### Role-Based Access Control (RBAC)
- Conceder apenas privilégios necessários
- Ex: só um subconjunto de maintainers pode modificar security settings ou fazer releases
- Limita dano se conta de maintainer for comprometida

### Evaluating Tools
Todo third-party tool (IDE, plugin, source control, CI/CD) pode ser vetor de ataque.

Usar [Concise Guide for Evaluating Open Source Software](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software) (OpenSSF).

### Securing Configuration
| Prática | Detalhe |
|---------|---------|
| PR review obrigatório | Aprovação de code owner antes de merge |
| CI checks obrigatórios | PR deve passar CI antes de merge |
| Commits assinados | Verificação de autoria |
| Secrets scanner | Evitar credenciais em repositórios públicos |

Ver [SCM Best Practices](https://best.openssf.org/SCM-BestPractices/) (OpenSSF) — checklist específico para GitHub e GitLab.

### Handling Secrets Securely
- Store: gerenciador de segredos (vault, environment variables, CI/CD secrets)
- Access: controlado e limitado
- Never: checked into public repositories
- Ferramentas: `git-secrets`, `truffleHog`, GitHub secret scanning

## 2. Managing Third-Party Dependencies

### Lockfile (Version Pinning)
```
package.json → "example-dependency": "^1.0.2"
package-lock.json → example-dependency@1.0.2 (fixada)
```
- **Usar** `npm ci` em vez de `npm install` em CI
- **Comitar** lockfile no source control
- **Rever** updates via PR do lockfile (dependabot, renovate)

### Review de Updates
1. Ler changelog
2. Verificar novas dependências introduzidas
3. Revisar diff do source code
4. Aguardar antes de aceitar (supply chain attacks são frequentemente detectados rápido)

### Software Bill of Materials (SBOM)

**Formatos principais:**
| Formato | Mantido por | Foco |
|---------|-------------|------|
| CycloneDX | OWASP | Supply chain security, leve |
| SPDX | Linux Foundation | Licenças + segurança |

**Componentes do SBOM (CycloneDX):**
- **Components:** frameworks, libraries, apps, config data
- **Services:** external APIs (endpoint URIs)
- **Vulnerabilities:** CWE codes, mitigations, advisories

**Geração:**
```bash
npm sbom  # npm 10+
```
ou ferramenta dedicada: [cdxgen](https://cdxgen.github.io/cdxgen/)

**Uso do SBOM:**
- Vulnerability management (Dependency-Track, GitHub Advisories, NVD)
- Integrity verification (hashes)
- Supplier risk management

## 3. Monitoring & Response

### Eventos para Logar (e Alertar)
| Categoria | Eventos |
|-----------|---------|
| **Input validation failures** | Valores inesperados, formatos inválidos, opções inexistentes (ex: `<select>`) |
| **Authentication** | Failed sign-ins (especialmente repetições), logins de locais inesperados, credential changes, password reset flows |
| **Access control failures** | Tentativas de acesso sem autorização |
| **CSP violations** | Reports via Reporting API (`report-to` endpoint) |

### SECURITY.md
- Arquivo na raiz do repositório
- Explica como reportar vulnerabilidades
- Detalhes de bug bounty (se houver)
- Canal de contato dedicado

## 4. Backups

| Tipo | Protege Contra |
|------|---------------|
| Regular | Erros de maintainers, bugs, vandalismo |
| Offline/air-gapped | Ransomware |
| Com integridade/confidencialidade | Ataque a backups |

## 5. Sumário — Checklist OpSec

- [ ] Passkeys ou MFA para todos maintainers
- [ ] RBAC implementado (mínimo privilégio)
- [ ] Commits assinados + PR review + CI obrigatórios
- [ ] Secrets gerenciados (nunca em repositório)
- [ ] Lockfile versionado + `npm ci` em build
- [ ] SBOM (CycloneDX/SPDX) mantido atualizado
- [ ] Dependency scanning ativo (Dependabot, Dependency-Track)
- [ ] Logging de auth failures + access control + CSP violations
- [ ] SECURITY.md publicado
- [ ] Backups regulares + protegidos
