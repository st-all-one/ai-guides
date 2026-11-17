# 09 — Quality model

## 1. Issues and types

[all] An issue is a problem detected when a rule is violated; it affects one or more software qualities with an impact level (severity) inherited from the rule (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/issues/introduction.md). In code, types are `CODE_SMELL(1)`, `BUG(2)`, `VULNERABILITY(3)`, `SECURITY_HOTSPOT(4)` (source: `sonar-core/src/main/java/org/sonar/core/rule/RuleType.java:31`).

| Mode | Categories |
|---|---|
| Standard Experience | bug, vulnerability, code smell, security hotspot |
| MQR (Multi-Quality Rule) | security, reliability, maintainability + security hotspot |

Security Hotspots are being phased out: rules that produced hotspots now produce vulnerabilities (Standard) or security issues (MQR) (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-rules/rules.md). Instance mode changes metric names and rating computation (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/changing-modes.md).

## 2. Severity

Standard Experience: `BLOCKER`, `CRITICAL`, `MAJOR`, `MINOR`, `INFO`. MQR: `BLOCKER`, `HIGH`, `MEDIUM`, `LOW`, `INFO`. Hotspots carry no severity, since the vulnerability is confirmed only at review. Assignment derives from "what is the worst that can happen?" combining impact and probability: both high → Blocker; high impact → Critical/High; high probability → Major/Medium; both low → Minor/Low (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-rules/rules.md). Effective severity can be customized per rule or per software quality.

## 3. Lifecycle and identification

States: **Open** (initial), **Accepted** (postponed; ignored in ratings), **False positive** (flawed analysis; ignored in reports and ratings), **Fixed** (next analysis does not detect it; purged after 30 days by housekeeping). An authorized user can reopen Accepted/False positive (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/issues/solution-overview.md).

Identification: per file, the current analysis is compared to the previous one. MATCH when same rule and same *line hash* (first line content, spaces ignored), or same rule/line/message, or same offset inside a moved block. No match → Fixed (or reopened if it was Fixed); new issue → no correspondence. Issue date is the last commit date of the line when SCM data exists; without SCM, the analysis date — this *backdating* prevents a rule/analyzer change from creating false issues in "new code" (source: same URL). Auto-assignment goes to the last committer mapped to a user, else the default assignee. During PRs only new code issues are reported; the first analysis of the target after merge may reveal issues in old code.

## 4. Clean code / new code

New code is code added or changed recently; the definition (NCD) can be Previous version, Number of days (default 30, max 90), Specific analysis or Reference branch. Global baseline default is Previous version; the project definition overrides the global one (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code.md). Clean as You Code: fix new code issues first; the built-in QG evaluates only new code, so cleaning new code reduces debt without reviewing all history.

**Rule of thumb**: require full-depth checkout and correct SCM; without trustworthy commit dates backdating fails and new code is biased.

## 5. Metrics

Most metrics have overall and new code values (prefix `new_`). Confirmed keys (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/metrics-definition.md):

| Domain | Keys and definition |
|---|---|
| Coverage | `coverage = (CT + LC)/(B + EL)`; `line_coverage = LC/EL`; `branch_coverage = (CT + CF)/(2*B)`; `lines_to_cover`, `uncovered_lines`, `uncovered_conditions`, `tests`, `test_success_density` |
| Duplication | `duplicated_lines_density = duplicated_lines / lines * 100`; `duplicated_blocks`, `duplicated_files`. Unsupported for Terraform/IaC and CSS |
| Size | `lines` (physical), `ncloc` (non-comment), `statements`, `functions`, `classes`, `files`, `comment_lines_density`, `ncloc_language_distribution` |
| Complexity | `complexity` (cyclomatic = 1 + conditional branches, min 1 per function); `cognitive_complexity` (flow comprehension difficulty) |
| Debt | `sqale_index` (sum of remediation effort in minutes), `sqale_debt_ratio = debt / (30 min * ncloc)` (30 min is the default per-line cost), `sqale_rating` |
| Quality issues | `bugs`/`vulnerabilities`/`code_smells`/`security_hotspots` plus `software_quality_*_issues` variants in MQR |

Duplicated block thresholds: non-Java ≥100 tokens over ≥10 lines (30 for COBOL, 20 for ABAP); Java ≥10 consecutive statements regardless of tokens/lines; indentation and string literals are ignored. Ratings: security/reliability A (0) to E (≥1 blocker); maintainability `A ≤5%`, `B <10%`, `C <20%`, `D <50%`, `E ≥50%` of `sqale_debt_ratio`; security review `A ≥80%`, `B ≥70%`, `C ≥50%`, `D ≥30%`, `E <30%` of reviewed hotspots. An 8-hour day is assumed when showing effort in days (source: same URL).

## 6. Where numbers are computed

The scanner sends raw data; Compute Edge builds the report and the Compute Engine persists issues and metrics. Modules live in `server/sonar-ce-task` (task framework; source: `server/sonar-ce-task/build.gradle:1`) and `server/sonar-ce-task-projectanalysis`, with specialized steps — `PersistIssuesStep` handles issue persistence and new code references (source: `server/sonar-ce-task-projectanalysis/src/main/java/org/sonar/ce/task/projectanalysis/step/PersistIssuesStep.java:30-46`) — plus coverage, duplication and complexity steps in the same folder.

## 7. SARIF and external issues

[`sonar-sarif` module] The project ships the SARIF 2.1.0 schema at `sonar-sarif/src/main/resources/sarif/sarif-schema-2.1.0.json`; the local README records the single deviation: removing every `default` from the schema to avoid `-1` indices where Java prefers `null` (source: `sonar-sarif/src/main/resources/sarif/README.md:1-3`). Import:

```properties
sonar.sarifReportPaths=reports/scan.sarif,build/**/*.sarif
sonar.externalIssuesReportPaths=reports/external-issues.json
```

Paths are relative to `sonar.projectBaseDir` or absolute; comma-separated lists (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/analysis-parameters/parameters-not-settable-in-ui.md). External issues are displayed but cannot be managed as native issues (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/importing-external-issues/about-external-issues.md).

## Sources

`repo ae3d6eb`:
- `sonar-core/src/main/java/org/sonar/core/rule/RuleType.java:31`
- `server/sonar-ce-task/build.gradle:1`
- `server/sonar-ce-task-projectanalysis/src/main/java/org/sonar/ce/task/projectanalysis/step/PersistIssuesStep.java:30-46`
- `sonar-sarif/src/main/resources/sarif/README.md:1-3`

URLs `.md`:
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/issues/introduction.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/issues/solution-overview.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/metrics-definition.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/changing-modes.md
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-rules/rules.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/analysis-parameters/parameters-not-settable-in-ui.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/importing-external-issues/about-external-issues.md
