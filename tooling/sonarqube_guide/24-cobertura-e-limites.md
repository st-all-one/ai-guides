# 24 — Measured coverage, gaps and limits

> **Verdict: no, the dossier does not guarantee >=85% coverage of effective use.** Core flows
> are covered well, but "85% of everything a team does with the Community Build" is not
> demonstrable without a real usage base.

## 1. What was measured

Surface: the official index `https://docs.sonarsource.com/llms.txt`, section **SonarQube
Community Build** (373 pages). The dossier has 24 thematic files; the comparison is **topic by
topic**, not line by line. Coverage percentages are **derived estimates** from the guide's
files and official page titles - not telemetry, not automatic counting. Marked `derived`.

## 2. Coverage by documentation category

| Category (CB pages) | Pages | Estimated coverage | Where the guide covers it | Main gap |
|---|---:|---:|---|---|
| `analyzing-source-code` | 87 | 55-65% | `08`, `09` | 21 per-language pages, 9 on coverage, ecosystem formats, incremental analysis |
| `instance-administration` | 68 | 65-75% | `07`, `10`, `11`, `17` | 27 auth pages per provider, uncommon features, UI tweaks |
| `server-installation` | 42 | 80-90% | `04`, `05`, `06` | Helm/OpenShift per platform, install variants |
| `devops-platform-integration` | 38 | 65-80% | `14`, `15` | Azure (14 pages), Bitbucket (9), GitHub (7), GitLab (4) |
| `user-guide` | 31 | 55-70% | `09`, `10`, `12` | UI flows (issues, projects, account, reports), shortcuts |
| `project-administration` | 29 | 50-65% | `08`, `09`, `15` | 13 fine-tuning pages, maintenance, creation/import |
| `server-update-and-maintenance` | 28 | 80-90% | `17`, `18`, `19`, `20` | upgrade matrices, patch procedures |
| `quality-standards-administration` | 25 | 85-95% | `10`, `11` | inherited profiles, bulk operations |
| `extension-guide` | 11 | 50-70% | `16` | plugin development beyond the overview |
| root/glossary | 7 | 40-60% | `00`, `01` | auxiliary pages, glossary |

**Coverage weighted by page count:** about **65-72%** (`derived`). Below 85% because the two
largest categories - analysis (87 pages) and instance administration (68) - are the broadest
and are treated in aggregate.

## 3. Coverage by typical task (usage weight)

| Effective task | Estimated coverage | File |
|---|---:|---|
| Docker/Compose + PostgreSQL bring-up | 95% | `04`, `06`, `23` |
| ZIP/Helm/systemd install | 75% | `04` |
| `sonar.properties`, JVM, proxy, TLS | 90% | `05`, `07` |
| Tokens, LDAP/SSO, groups, permissions | 85% | `07` |
| Scanner in CI (GitHub/GitLab/Jenkins/Azure/Bitbucket) | 85% | `08`, `14` |
| Scope, exclusions, test coverage, external import | 65% | `08`, `09` |
| Quality Gate, profiles, new code and rules | 90% | `10`, `11` |
| Review issues, hotspots, metrics in UI | 70% | `09`, `10` |
| Web API and webhooks | 80% | `12`, `13` |
| Backup, restore, upgrade, reindex | 85% | `19` |
| Logs, health, performance | 80% | `17`, `18` |
| Plugins, IDE Connected Mode, languages | 55% | `16`, `15` |

**Simple average of the 12 tasks:** about **80%** (`derived`). **Weighted by a typical team's
frequency** (install, scan, gate, review, authenticate, maintain): about **85-88%**
(`derived`) - conditioned on the usage profile, not a guarantee.

## 4. What is guaranteed (mechanically verified)

- Every cited `path:line` exists at commit `ae3d6eb`, inside the file (349 citations in the
  original survey); every cited `.md` URL responds or appears in the official index.
- Structure: 24 numbered files, `SKILL.md`, `VERSION`, sources section in all, balanced code
  blocks, 1:1 install via CLI.
- Edition boundary: CB, Server and Cloud marked; no commercial feature attributed to CB.

## 5. What is **not** guaranteed

1. **Per-language coverage.** Says how to analyze, without Java/Python/JS-TS/C#/Go/PHP/Ruby/
   Scala/Kotlin configuration details.
2. **Test coverage per ecosystem.** No per-tool recipe for JaCoCo, Cobertura, LCOV, OpenCover
   or XML coverage paths.
3. **End-to-end UI.** No visual walkthrough of issues, projects, reports, users or on-screen
   configuration.
4. **Complete Web API catalog.** Auth, pagination, domains covered; the ~hundreds of endpoints
   are not replicated (intentional: the catalog lives in the instance).
5. **Authentication per provider.** LDAP and header SSO detailed; SAML, GitHub, GitLab and
   Bitbucket have keys and flow, not a runbook.
6. **Version-by-version upgrade.** Procedure and criteria only; no official path matrix or
   release notes.
7. **Plugin development.** API, install, classloading and risks; not a tutorial.
8. **Measured real-world use.** No telemetry, survey or pipeline sample.

## 6. How to turn this into an 85% guarantee

1. **Define the usage base.** Pick 40-60 Community Build tasks (installation, analysis,
   quality, administration, operations), weighted by real frequency.
2. **Blind sufficiency test.** Answer each task using only the dossier, without the official
   docs. Criterion: >=85% of tasks solved correctly and without external lookup.
3. **Close the heaviest gaps first:** per-language analysis, per-ecosystem test coverage,
   authentication runbooks and UI.
4. **Record the measurement.** Each round produces a table
   `task -> result -> gap -> file fixed`; else it is opinion again.

**Editorial rule:** never claim "covers 85%" without the section 6 measurement. With the
current verification: core flows covered with high confidence, known gaps as above.

## Sources

- https://docs.sonarsource.com/llms.txt (SonarQube Community Build section; 373 pages)
- https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/languages/overview.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/test-coverage/overview.md
- https://docs.sonarsource.com/sonarqube-community-build/instance-administration/authentication/overview.md
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-profiles/introduction.md
- https://docs.sonarsource.com/sonarqube-community-build/extension-guide/developing-a-plugin/plugin-basics.md
