# 01 — Product, editions and boundaries

## 1. What is in this repository

**SonarQube Community Build** [Community Build]: the free/open-source edition of this repo,
with the same analysis engine as the product line (source: `README.md:23`). Analysis uses
symbolic execution and data/control flows to find bugs, vulnerabilities and structural
problems; output lands in the IDE, PRs and CI (source: `README.md:21`). The platform covers
40+ languages; [CB] covers a **subset** (source: `README.md:36`). Version: `26.12`
(source: `gradle.properties:2`).

The UI (webapp) is **not in this repo**: it lives in `sonarqube-webapp`
(source: `README.md:103-105`). License LGPL-3.0 (source: `README.md:217-221`). Commercial
editions are documented as product docs, not as this code.

## 2. Capability matrix per edition

Markers: **[CB]** = Community Build (this repo); **[Srv]** = SonarQube Server
(Developer/Enterprise/Data Center); **[Cloud]** = SonarQube Cloud
(Free/Team/Enterprise). Plan-dependent differences are explicit.

| Capability | [CB] | [Srv] | [Cloud] | Source |
|---|---|---|---|---|
| Main branch analysis | only it | yes | yes (Free+) | `feature-comparison-table.md`; `README.md:54` |
| PR analysis/decoration | **no** | yes (all editions) | Team/Enterprise (Free: main target only) | `feature-comparison-table.md`; `sonarqube-server-editions.md` |
| Multiple branches | no | yes | yes | `README.md:54,97`; `feature-comparison-table.md` |
| Custom quality profiles/gates | yes | yes | not on Free; Team/Enterprise yes | `feature-comparison-table.md` |
| Basic quality, metrics, issues | yes | yes | yes | `README.md:29-36`; `readme.md` (CB) |
| Advanced Java rules | no | yes | yes | `feature-comparison-table.md` |
| Architecture analysis | no | yes (Enterprise: "enterprise architecture") | yes (Team+) | `feature-comparison-table.md`; `sonarqube-server-editions.md` |
| SCA, advanced SAST, secrets, IaC | no | **Advanced Security** add-on (Enterprise/DC) | Advanced Security subscription (Team/Enterprise) | `README.md:46-49,67`; `feature-comparison-table.md` |
| Portfolios, dashboards, security/regulatory reports, PDF | no | Enterprise/DC | Enterprise (some in Team) | `feature-comparison-table.md`; `sonarqube-server-editions.md` |
| Webhooks | yes | yes | not on Free; Team/Enterprise | `feature-comparison-table.md` |
| SAML SSO | yes | yes | Enterprise | `feature-comparison-table.md`; `sonarqube-server-editions.md` |
| Audit logs, SCIM, max token lifetime | no | Enterprise/DC | Enterprise (SCIM/audit) | `feature-comparison-table.md`; `sonarqube-server-editions.md` |
| DevOps integrations (GitHub, GitLab, Bitbucket, Azure DevOps) | yes | yes | yes | `feature-comparison-table.md`; `README.md:77-78` |
| Merge blocked by QG on PR | no | yes | Team/Enterprise | `feature-comparison-table.md` |
| Remediation Agent, Sonar Vortex, Hunter Agent | no | separate subscription (Enterprise/DC) | separate subscription | `feature-comparison-table.md`; `README.md:65-67` |

[Srv] has three editions: **Developer** (branch/PR, more languages), **Enterprise**
(governance, portfolios, reports, IdP/DevOps), **Data Center** (HA, scale) (source:
https://docs.sonarsource.com/sonarqube-server/discovering/sonarqube-server-editions.md).
Licensing: [Srv] per instance/year per LOC; [Cloud] per organization over private LOC
(source: https://docs.sonarsource.com/sonarqube-server/discovering/server-versus-cloud.md).

## 3. End-to-end pipeline

Sequence [Srv 2026.5] (source: https://docs.sonarsource.com/sonarqube-server/discovering/analysis-overview/process-steps.md)
and setup [CB] (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/overview.md):

```text
repo (commit) -> CI (webhook/poll) -> full-depth checkout -> build
  -> SonarScanner -> download scanner engine and analyzers -> report sent
  -> queue in DB -> Compute Engine (metrics/issue tracking/QG) -> DB + ES index
  -> Quality Gate result -> API/webhook -> CI (pass/fail)
```

1. [CB]/[Srv]/[Cloud] The scanner is a *bootstrapper*: it queries the server for the
   scanner engine version, uses the local cache or downloads it, then only the analyzers of
   detected languages. The CE computes metrics/issues into the DB; ES holds the indexed copy
   for the UI; the job queue persists in the DB (sources:
   https://docs.sonarsource.com/sonarqube-server/discovering/analysis-overview/process-steps.md;
   https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md).
2. [CB]/[Srv]/[Cloud] A new issue is matched against the previous analysis by line hash
   (first line's content without whitespace); issue date = last commit touching the line
   when SCM data exists, else the analysis date (source: https://docs.sonarsource.com/sonarqube-server/discovering/analysis-overview/process-steps.md).
3. [CB] **full depth** checkout is required: a shallow clone makes blame be skipped and
   analysis can fail (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/overview.md).
4. [CB] The project is created automatically if the key is absent from the DB; it can also
   be created in the UI (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/overview.md).

## 4. Pitfalls

- **Assuming "40+ languages" applies to [CB].** The number is the platform's; Community
  Build covers a subset (source: `README.md:36`).
- **Promising PR decoration on [CB].** Absent; on [Cloud] it depends on the plan, on [Srv]
  it exists in all editions (source: `feature-comparison-table.md`).
- **Calling both server and scanner "SonarQube".** The scanner bootstraps; the server
  processes in the CE (source: `process-steps.md`; `server-components-overview.md`).
- **Assuming SCA/SAST/IaC ship with [Srv] Enterprise.** They need the separate Advanced
  Security subscription (source: `README.md:67`; `feature-comparison-table.md`).
- **Applying [Cloud] rules to [CB].** [Cloud] has "organization" and approved plugins only;
  [CB]/[Srv] do not (source: https://docs.sonarsource.com/sonarqube-server/discovering/server-versus-cloud.md).

## Sources

**repo ae3d6eb800dacf528b752a51b6b6bda0ec3f4971:** `README.md:19-36`, `README.md:38-83`,
`README.md:93-125`, `README.md:168-221`, `gradle.properties:2`.

**URLs .md:**
- https://docs.sonarsource.com/sonarqube-community-build/readme.md
- https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md
- https://docs.sonarsource.com/sonarqube-server/discovering/sonarqube-server-editions.md
- https://docs.sonarsource.com/sonarqube-server/discovering/server-versus-cloud.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/overview.md
- https://docs.sonarsource.com/sonarqube-server/discovering/analysis-overview/process-steps.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md
