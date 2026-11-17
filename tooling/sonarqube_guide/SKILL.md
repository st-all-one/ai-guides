---
name: sonarqube
description: >
  SonarQube Community Build 26.12 and the Sonar product line (Server/Cloud/IDE):
  implementation (web/CE/Elasticsearch/DB processes, Gradle modules, analysis
  pipeline), installation (ZIP, Docker/Compose, Helm/Kubernetes, systemd, reverse
  proxy), deep configuration (sonar.properties, env vars, JVM, JDBC pool,
  SSO/LDAP, TLS, logs), database and migrations, security/tokens/permissions,
  scanners (CLI, Maven, Gradle, .NET, NPM, Python), quality model (issues,
  metrics, MQR), quality gates/profiles/rules, Web API and webhooks, CI/ALM/PR
  integration, plugins, operations/monitoring/backup/upgrade/troubleshooting.
  Load when deploying, configuring, analyzing, integrating, tuning, upgrading or
  debugging SonarQube. Triggers: sonarqube, sonar, sonar.properties,
  sonar-project.properties, scanner, quality gate, quality profile, SQ, CE,
  Sonar way, webhook, tokens.
category: tooling
version: "26.12 (Community Build)"
tags: [sonarqube, community-build, sonar-scanner, quality-gate, quality-profile, static-analysis, devops, ci, docker, helm, postgres, elasticsearch, web-api, sast]
license: MIT
---

# SonarQube — Community Build 26.12

**Baseline:** `SonarSource/sonarqube` @ `ae3d6eb` (2026-11-16), `version=26.12`
(`gradle.properties:2`). Docs: `docs.sonarsource.com`, Community Build and
Server 2026.5 LTA tracks. This repository is the **Community Build** (LGPL-3.0);
Server/Cloud features are commercial — mark the edition before prescribing.

**Load when:** installing/operating/upgrading an instance, writing
`sonar.properties` or `sonar-project.properties`, choosing a scanner,
configuring quality gates/profiles/rules, integrating CI/ALM, automating via
Web API, or diagnosing startup/DB/ES/scanner failures.

## Use When

- Choose edition and topology (ZIP vs Docker vs Helm; H2 vs external DB)
- Configure web/CE/search, JDBC, JVM, proxy, TLS, SSO and permissions
- Run analysis (CLI/Maven/Gradle/.NET/NPM/Python) and import coverage
- Define new code, quality gate, quality profile and webhooks
- Integrate GitHub Actions/GitLab CI/Jenkins/Azure DevOps/Bitbucket
- Call the Web API (v1/v2) or write a plugin
- Back up, restore, upgrade, tune and troubleshoot

## Core Rules

1. **Edition first.** Community Build = self-managed, main branch, custom QGs/profiles,
   webhooks. PR decoration, branch analysis, SCA/advanced SAST, portfolios and AI
   agents require higher plans (`https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md`).
2. **Four Java processes:** `Sonar` (app supervisor), `Web` (UI/API), `CE`
   (report queue), `Elasticsearch` (derived index). Logs: `sonar.log`, `web.log`,
   `ce.log`, `es.log` (`sonar.properties:344-395`).
3. **DB is truth; ES is derived.** Web rebuilds the index after ES disaster
   (`https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md`).
4. **Never use H2 in production.** External PostgreSQL 15–18, Oracle 19c/21c/26ai
   and SQL Server 2017–2025 (`sonar.properties:14-57`).
5. **`sonar.properties` is not reloaded by `api/system/restart`.** Full service
   restart required; env vars override with uppercase and `_` for `.`/`-`
   (`sonar.properties:1-12`).
6. **Use the scanner that matches the build.** Maven/Gradle/.NET/NPM/Python have
   dedicated scanners; CLI is the fallback. Full clone required — shallow clone
   loses blame and may fail analysis
   (`https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/overview.md`).
7. **Quality is measured on new code.** Sonar way = four conditions (no new issues,
   hotspots reviewed, coverage ≥80%, duplication ≤3%) with a 20-line fudge factor
   (`https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates.md`).
8. **Token in CI secrets**, never in `sonar-project.properties`. Web API uses
   `Authorization: Bearer <token>`; `X-Sonar-Passcode` only when bearer is not
   possible (`https://docs.sonarsource.com/sonarqube-server/extension-guide/web-api.md`).
9. **Fail CI on the quality gate status**, not on scanner exit alone.
10. **Keep ES on loopback:** `sonar.search.port=9001`, `sonar.es.port` random,
    `sonar.search.host` loopback; never expose (`sonar.properties:298-309`).
11. **Plugin compatibility is a matrix**, and the UI lives in
    `SonarSource/sonarqube-webapp`, not this repo (`README.md:103-105,168-195`).
12. **Tune with evidence:** web/CE/search heap, HTTP threads, JDBC pool (1.2×
    HTTP threads) and `vm.max_map_count` are the first checks
    (`sonar.properties:60-65,113-131,281-300`).

## Core Patterns

```bash
# Server with external DB — env vars are uppercase property names
docker run -d --name sonarqube -p 9000:9000 \
  -e SONAR_JDBC_URL=jdbc:postgresql://db:5432/sonar \
  -e SONAR_JDBC_USERNAME=sonar -e SONAR_JDBC_PASSWORD=sonar \
  -v sonarqube_data:/opt/sonarqube/data \
  -v sonarqube_extensions:/opt/sonarqube/extensions \
  -v sonarqube_logs:/opt/sonarqube/logs sonarqube:<tag>-community
```

```properties
# sonar-project.properties (repository root)
sonar.projectKey=my-org:my-project
sonar.sources=.
sonar.sourceEncoding=UTF-8
# token is NOT here: use SONAR_TOKEN in the environment
```

```bash
sonar-scanner -Dsonar.host.url="$SONAR_HOST_URL" -Dsonar.token="$SONAR_TOKEN"
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" \
  "$SONAR_HOST_URL/api/qualitygates/project_status?projectKey=my-org:my-project"
```

## File Map

| File | Content |
|---|---|
| `00-indice.md` | Orientation, measured surface, edition boundary, map |
| `01-produto-e-edicoes.md` | Product, licenses, edition matrix, end-to-end pipeline |
| `02-arquitetura-e-processos.md` | Processes, modules, startup, request/CE/ES flow |
| `03-codigo-fonte-e-build.md` | Gradle, modules, tests, plugin API, separate webapp |
| `04-instalacao-e-topologias.md` | ZIP, Docker/Compose, Helm/K8s, systemd, proxy |
| `05-configuracao-profunda.md` | `sonar.properties`, env vars, JVM, web/CE/search |
| `06-banco-e-migracoes.md` | PostgreSQL/Oracle/MSSQL, pool, schema, migrations, H2 |
| `07-seguranca-auth-e-permissoes.md` | Tokens, SSO/LDAP/SAML, groups, encryption, passcode |
| `08-scanners-e-analise.md` | CLI/Maven/Gradle/.NET/NPM/Python, JRE, parameters |
| `09-modelo-de-qualidade.md` | Issues, metrics, new code, duplication, coverage, SARIF |
| `10-quality-gates-e-perfis.md` | Conditions, Sonar way, profiles, new-code period |
| `11-regras-e-customizacao.md` | Rules, profile activation, tags, custom rules |
| `12-web-api-e-automacao.md` | Auth, endpoints, pagination, `curl`, v1/v2 |
| `13-webhooks-e-eventos.md` | Webhooks, payloads, retry, events, notifications |
| `14-integracao-ci.md` | GitHub Actions, GitLab, Jenkins, Azure, Bitbucket |
| `15-integracao-alm-e-pr.md` | ALM bindings, PR/branch analysis, decoration |
| `16-plugins-e-extensoes.md` | Plugin API, install, classloading, Marketplace |
| `17-operacao-e-saude.md` | Logs, restart, status, health, monitoring |
| `18-performance-e-capacidade.md` | Heap, threads, pool, ES, sizing |
| `19-backup-restore-e-upgrade.md` | Backup, restore, upgrade, reindex, LTA/EOL |
| `20-troubleshooting.md` | Symptom → cause → action |
| `21-decisoes-e-armadilhas.md` | Trade-offs and anti-patterns with sources |
| `22-referencia-rapida.md` | Commands, properties, endpoints, defaults |
| `23-implementacao-recomendada.md` | Verified minimum: zero to CI with a quality gate |
| `24-cobertura-e-limites.md` | Measured coverage, gaps, path to a real 85% claim |

## Read Order

Always `00` → `01` → `02`. Install: `04`+`05`+`06`+`07`. Analyze: `08`+`09`+`10`.
Automate: `12`+`13`+`14`. ALM: `15`. Operate: `17`+`18`+`19`. Errors: `20`.
Decide: `21`+`23`. Quick lookup: `22`. Coverage/limits: `24`.

## Prereqs

Java 21 for the server build; Docker/Compose or ZIP + external DB; Gradle/Maven and
CI basics. SonarScanner CLI needs Java 21 (or auto-provisioned JRE, see `08`).
