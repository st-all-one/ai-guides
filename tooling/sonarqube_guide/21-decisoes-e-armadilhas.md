# 21 — Decisions and pitfalls

## 1. Is Community Build enough?

| Need | Decision |
|---|---|
| Main-branch analysis, custom quality gates/profiles, webhooks, GitHub/GitLab/Bitbucket/Azure auth, SAML | Community Build suffices (source: https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md) |
| Branch/PR analysis, PR decoration, merge blocking by QG | `[Server: Developer+]` / Cloud Team+ (source: same URL; `README.md:97`) |
| SCA, Advanced SAST, Remediation Agent, IaC, reports/portfolio, multiple ALM instances, monorepo, SCIM, audit logs | separate subscription or commercial edition (source: same URL) |

Rationale: the repo is explicitly Community Build (`README.md:23`); Server/Cloud add branch/PR analysis, SCA and SAST on top (`README.md:97`).

## 2. H2 vs external database

H2 for tests/trials only; production always PostgreSQL, MS SQL or Oracle. Config calls H2 "Embedded Database (default)" (source: `sonar-application/src/main/assembly/conf/sonar.properties:28`); docs recommend a DB on a separate host, low latency (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/installing-the-database.md).

Code backs it: with H2, `-Des.enforce.bootstrap.checks=true` is **not** applied (source: `server/sonar-main/src/main/java/org/sonar/application/command/EsJvmOptions.java:52-54`), and an H2 instance cannot migrate to a container (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md). PostgreSQL 15–18 documented from 26.8 (source: installing-the-database.md, above).

## 3. ZIP vs Docker vs Helm

Docker for a single host; Helm/Kubernetes where K8s is already run; ZIP as legacy only. Docs recommend the Docker image or Helm chart and state the ZIP "will be removed in a future release" (source: zip-migration-guide.md, above).

Migrating: **same version/build** (never mixed with an upgrade), **do not copy `data/`** (index rebuilt from the DB), JDBC URL **identical** — the Server ID derives from database + URL, so `localhost` → service name resets it. The container runs as UID 1000: mounted plugins, key and Oracle driver must be readable by it. Without the key, startup fails with `Fail to decrypt the property sonar.jdbc.password. Please check your secret key.` (source: zip-migration-guide.md, above).

## 4. Token vs login and password

Always a token; never login/password in CI. Docs call the token the preferred method and state no password is needed (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md).

| Scenario | Type |
|---|---|
| CI of one project | project token (*Execute Analysis* on the project) |
| Automation across projects | global token (*Global Execute Analysis*) |
| SonarQube for IDE / connected mode | user token (the others do not work) |

`[Community Build]` no configurable maximum token lifetime (source: feature-comparison-table.md, above).

## 5. Right scanner per build

The ecosystem scanner: Maven → `sonar-maven-plugin`, Gradle → `org.sonarqube`, .NET → `dotnet-sonarscanner`, rest → SonarScanner CLI. CLI on Maven/Gradle/.NET degrades analysis and does not cover C#/VB.NET (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md). At scale, one template per stack reduces drift (source: https://docs.sonarsource.com/sonarqube-community-build/project-coverage.md).

## 6. Quality Gate on new code

Measure new code, not overall code. `Sonar way` already defines conditions **on new code only** (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code.md). Options: *Previous version* (default global baseline), *Number of days* (default 30, max 90), *Specific analysis*, *Reference branch*; the project definition overrides the global one (source: same URL).

`[Community Build]` no PR analysis, so the checkpoint is the CI job on the main branch; do not expect a "PR diff".

## 7. PR decoration

Does not exist in Community Build. The table marks "Quality gate status report on pull requests; preventing merge when quality gate fails" as *Not available* (source: feature-comparison-table.md, above). If a PR comment is a requirement, move to `[Server]` or Cloud Team+ — or accept job blocking as the control mechanism.

## 8. Reindex

Reindex is an operational window, not an error. Startup after upgrade/restore rebuilds the indices; analyses may run meanwhile (they have priority), but the global Issues page stays unavailable until it ends, and the QG can expire if the index does not finish in time (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/reindexing.md). Force it: stop, delete `<home>/data/es9`, start. On K8s: `replicaCount=0`, delete the PVC, back to 1.

## 9. Secrets

No plaintext secret in the repository. Token in a CI secret; DB password encrypted (`{aes-gcm}`) with the key outside the home; JWT secret reused on migration so users stay logged in (source: zip-migration-guide.md, above). For monitoring, `X-Sonar-Passcode` via `sonar.web.systemPasscode`/`SONAR_WEB_SYSTEMPASSCODE`; on Web API POST prefer form data (source: https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md).

## 10. Upgrade

Plan the path before downloading. Versions follow the calendar: a direct jump only within the same year; to the next year go through the December version (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/determine-path.md). Docs' own warning: because of problems in 25.12.0.117093, 26.1.0.118079 can also serve as the intermediate version. Back up the DB first; the upgrade triggers a reindex (source: reindexing.md, above).

## 11. Contradictions and pitfalls found in the survey

1. **`vm.max_map_count`:** the checkout's `sonar.properties` says `at least [262144]` (source: `sonar-application/src/main/assembly/conf/sonar.properties:288`), current docs require `>= 524288` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md). Use the larger value; the docs decide.
2. **CI examples with PRs on CB:** GitHub/GitLab docs show `pull_request`/`merge_request_event`, yet the same page says only the main branch is analyzed and the table marks PR analysis unavailable. Read the example as YAML syntax only.
3. **Moving versions:** `.../sonarqube-server/...` URLs are 2026.5, the Community Build ones describe 26.x, the code here is `version=26.12` (`gradle.properties:2`). Do not assume `latest` matches the commit.
4. **Web API v2:** docs announce gradual replacement; use endpoints confirmed in code (`api/qualitygates/project_status`, `api/user_tokens/generate`, `api/system/health`, `api/system/status`).

## Sources

- repo ae3d6eb: `README.md:23,97`, `gradle.properties:2`, `sonar-application/src/main/assembly/conf/sonar.properties:28,288`, `server/sonar-main/src/main/java/org/sonar/application/command/EsJvmOptions.java:52-54`
- https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/installing-the-database.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md
- https://docs.sonarsource.com/sonarqube-community-build/project-coverage.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/reindexing.md
- https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/determine-path.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md
