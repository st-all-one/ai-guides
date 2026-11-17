# 00 — SonarQube: overview, surface, guide map

> **Community Build 26.12**, commit `ae3d6eb` (2026-11-16). Docs `docs.sonarsource.com`:
> Community Build and Server 2026.5 LTA tracks. Every fact traces to `path:line` (repo)
> or a `.md` URL (docs).

## 1. What it is (and is not)

`SonarSource/sonarqube` holds **SonarQube Community Build**: a self-hosted platform
applying static analysis (symbolic execution, data/control-flow analysis) to find bugs,
vulnerabilities and structural problems (`README.md:19-36`). License **LGPL-3.0**
(`README.md:217-221`).

Not to be confused with: **SonarQube Server** (commercial self-hosted:
Developer/Enterprise/Data Center), **SonarQube Cloud** (managed SaaS), **SonarScanner CLI**
(CI scanner `sonar-scanner`), **SonarQube CLI** (project/issue management), **SonarQube for
IDE** (real-time editor analysis), **SonarQube MCP Server** (analysis to AI-agent bridge,
`SonarSource/sonarqube-mcp-server`). Source: `README.md:73-89`;
`https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner.md`.

## 2. Edition boundary (golden rule)

Repo is Community Build; docs also cover paid features. Classify first:

| Feature | Community Build | Server / Cloud |
|---|---|---|
| Branch analysis | main only | yes (Server, Cloud Team+) |
| PR analysis / decoration | no | yes (Cloud Team+ / Server) |
| Quality gates, custom profiles | yes | yes |
| Webhooks | yes | yes (not Cloud Free) |
| SAML SSO | yes | yes (not Cloud Free/Team) |
| SCA, Advanced SAST, secret patterns, AI CodeFix, portfolios, audit | no | paid tier |
| Hosted MCP Server, Remediation/Hunter Agent, Vortex | no | separate subscription |

Source: `https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md`;
`README.md:38-67`.

## 3. Measured surface (derived)

| Surface | Count | How measured |
|---|---:|---|
| Files in repo (no `.git`) | 8,559 | `find . -path ./.git -prune -o -type f -print \| wc -l` |
| `.java` files | 7,633 | `find . -name '*.java' \| wc -l` |
| Modules in `server/` | 32 | `find server -maxdepth 1 -mindepth 1 -type d` |
| CB pages in docs index | 373 | `- [` entries in `/tmp/sq-research/community-llms.txt` |
| Server pages in docs index | 4,335 | `- [` entries in `/tmp/sq-research/server-llms.txt` (old versions included) |

## 4. Architecture and pipeline

```
  CI / IDE / dev ──► SonarScanner ──► POST analyze ──► Web ──► queue in DB
                                                        │
                             DB (Postgres/Oracle/MSSQL) ◄┤ CE ( Compute Engine )
                                     ▲                   │
                                     └── index ─────────► ES (Elasticsearch)
```

Four Java processes: **`Sonar`** (app, supervisor), **`Web`** (UI + Web API), **`CE`**
(reports), **`Elasticsearch`** (indexed DB copy). The DB holds configuration,
metrics/issues and the queue; Web and CE keep DB and ES consistent; on index disaster
recovery **Web** rebuilds it (source:
`https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md`).
Logs: `sonar.log`, `web.log`, `ce.log`, `es.log`, `access.log`, `deprecation.log`
(`sonar-application/src/main/assembly/conf/sonar.properties:344-355`).

1. **Full checkout** in CI; a shallow clone makes SCM skip blame and can fail analysis
   (`https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/overview.md`).
2. **Dedicated scanner per build** (Maven/Gradle/.NET/NPM/Python) or CLI as fallback, with
   `sonar.*` parameters in `sonar-project.properties`, CLI, env vars or UI - see `08`.
   The **Quality Gate** result feeds CI - see `12`, `14`.

## 5. Guide map

| Block | Files | Focus |
|---|---|---|
| Fundamentals | `01`, `02`, `03` | product/editions, architecture, code/build |
| Install and base | `04`, `05`, `06`, `07` | topologies, deep config, DB, security |
| Usage and quality | `08`, `09`, `10`, `11` | scanners, quality model, gates/profiles, rules |
| Automation | `12`, `13`, `14`, `15` | Web API, webhooks, CI, ALM/PR |
| Extension | `16` | plugins and compatibility |
| Operations | `17`, `18`, `19` | health/logs, performance, backup/upgrade |
| Support | `20`, `21`, `22`, `23`, `24` | troubleshooting, decisions, cheatsheet, minimal scope, coverage/limits |

Full order: `SKILL.md` (`File Map`). Reading: `00` -> `01` -> `02`; install `04`-`07`,
analyze `08`-`10`, automate `12`-`14`, ALM `15`, operate `17`-`19`, errors `20`,
decide `21`+`23`, lookup `22`.

## 6. Golden rules

- DB is truth; ES is a derived index rebuildable by Web; H2 for tests only
  (`sonar.properties:17-20`).
- Quality Gate acts on **new code**; Sonar way has 4 conditions and a 20-line fudge factor
  (`.../introduction-to-quality-gates.md`).
- Dedicated scanner per build; CLI only as fallback; full clone in CI (`fetch-depth: 0`).
- Web API: `Authorization: Bearer <token>`; `X-Sonar-Passcode` only when bearer does not fit.
- ES on loopback; ports 9000 (web), 9001 (search) never public
  (`sonar.properties:97-110,298-309`); check EOL/LTA before upgrading
  (`gradle.properties:3-11`).

## Sources

repo `ae3d6eb`: `README.md:19-36`, `README.md:38-67`, `README.md:73-89`,
`README.md:103-105`, `README.md:127-221`, `gradle.properties:2-11`,
`sonar-application/src/main/assembly/conf/sonar.properties:1-20`, `:60-65`, `:97-110`,
`:171-257`, `:298-309`, `:344-355`.

docs:
- https://docs.sonarsource.com/sonarqube-community-build/readme.md
- https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/overview.md
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates.md
- https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner.md
- https://docs.sonarsource.com/sonarqube-server/extension-guide/web-api.md
