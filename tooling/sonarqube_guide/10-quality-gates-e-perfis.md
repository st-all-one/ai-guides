# 10 — Quality Gates and profiles

## 1. Quality Gate: role and default

[all] A Quality Gate (QG) answers "is the project ready to release?" via metric conditions (metric + operator + error value); one failure fails it. Conditions target new code or overall code; projects without an association get the instance default QG (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates.md).

Built-in **Sonar way** is the default, read-only QG with four new code conditions: no new issues (or reliability/security/maintainability ratings worse than A), 100% hotspots reviewed, coverage ≥80%, duplication ≤3% (source: same URL). Two QGs are built in; creating/editing custom ones requires *Administer Quality Gates* (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-gates/managing-custom-quality-gates.md).

*Fudge factor*: duplication conditions ignored up to 20 new lines, coverage up to 20 lines to cover; global default, per-project override. Tests affect only Maintainability/Reliability metrics (Standard: Code Smells/Bugs); duplication and security in test code are not measured.

**Commercial**: conditions on *prioritized rules* exist only in SonarQube Server; **AI Code Assurance** (QG qualified for AI code) is absent from Community Build — Developer/Enterprise/Data Center only (source: https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md).

## 2. Create, copy, associate

UI: **Quality Gates → Create** copies Sonar way conditions; **Copy** duplicates; **Rename**/**Delete** manage lifecycle. Edit via **Unlock editing → Add Condition** (new/overall code, metric, failure value). Association: QG administrator or project manager (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-gates/managing-custom-quality-gates.md). Standard ↔ MQR switching may require revisiting conditions; Sonar way updates automatically.

Web API controller: `api/qualitygates` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/qualitygate/ws/QualityGatesWs.java:45`). Confirmed actions: `create`, `copy`, `rename`, `destroy`, `list`, `search`, `show`, `select`, `deselect`, `set_as_default`, `add_condition`, `update_condition`, `delete_condition`, `project_status`. Search pagination uses `pageSize` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/qualitygate/ws/QualityGatesWsParameters.java:44`).

```bash
export SONAR_URL=http://localhost:9000
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" "$SONAR_URL/api/qualitygates/list"
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" \
  "$SONAR_URL/api/qualitygates/project_status?projectKey=my:project"
```

`api/qualitygates/project_status` is the canonical pipeline status read; alternatively the scanner polls with `sonar.qualitygate.wait=true` (default `false`, timeout 300 s).

## 3. New code period: definitions and real parameters

NCD: Previous version, Number of days (default 30, max 90), Specific analysis or Reference branch; global baseline default is Previous version, the project definition prevails (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code.md).

Web API controller `api/new_code_periods` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/newcodeperiod/ws/NewCodePeriodsWs.java:39`), actions `set`, `unset`, `show`, `list`; `set` takes `project`, `branch`, `type`, `value` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/newcodeperiod/ws/SetAction.java:57-60`). Enum: `PREVIOUS_VERSION`, `NUMBER_OF_DAYS`, `SPECIFIC_ANALYSIS`, `REFERENCE_BRANCH` (source: `server/sonar-db-dao/src/main/java/org/sonar/db/newcodeperiod/NewCodePeriodType.java:22-26`). `value` required by `NUMBER_OF_DAYS` (integer), `SPECIFIC_ANALYSIS`, `REFERENCE_BRANCH`; absent for `PREVIOUS_VERSION`.

```bash
curl -sS -X POST -H "Authorization: Bearer $SONAR_TOKEN" \
  -d 'project=my:project&type=NUMBER_OF_DAYS&value=14' \
  "$SONAR_URL/api/new_code_periods/set"
```

Community Build nuance: without `branch` the project value is written to the **main branch**; without `project` the change is global and requires *System Administrator*. Type is validated against level and edition, and the value must fit Clean as You Code, else the call fails (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/newcodeperiod/ws/SetAction.java:145-166`, `:175-179`).

## 4. Quality Profiles

[all] A Quality Profile (QP) defines active rules **per language**. Built in: **Sonar way core** (default: security + reliability ≥ Major + maintainability Blocker), **extended** (reliability ≥ Minor, maintainability ≥ Critical) and **comprehensive** (all recommended), same security rules. Since 26.10 comprehensive replaces the former "Sonar way" (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-profiles/built-in-quality-profiles.md).

Needs *Administer Quality Profiles*. Custom profiles can inherit: inherited rules are immutable in the child, parent changes propagate; otherwise maintenance is manual per analyzer upgrade (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-profiles/maintaining-your-custom-quality-profiles.md). Default: each language's default profile.

Controller: `api/qualityprofiles`. Actions in `server/sonar-webserver-webapi/src/main/java/org/sonar/server/qualityprofile/ws/`: `create`, `copy`, `rename`, `delete`, `set_default`, `activate_rule`, `deactivate_rule`, `activate_rules`, `deactivate_rules`, `change_parent`, `inheritance`, `compare` (params `leftKey`/`rightKey`, source: `CompareAction.java:82-83`), `changelog`, `projects`, `backup`, `restore`, `export`, `search`, `show`.

```bash
# export/backup produce XML (real sample: .../qualityprofile/ws/export-example.xml)
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" \
  -G --data-urlencode "leftKey=$LEFT_KEY" --data-urlencode "rightKey=$RIGHT_KEY" \
  "$SONAR_URL/api/qualityprofiles/compare"
```

## 5. Pitfalls

- Conditions express **failure**: "Coverage < 80" fails; inverting them inverts the gate.
- Standard ↔ MQR changes metric keys; custom QGs may need review.
- In Community Build, project-level `new_code_periods/set` writes to the main branch — no project-level record.
- Inherited profile: activate/deactivate on the parent; editing the child fails.

## Sources

`repo ae3d6eb`:
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/qualitygate/ws/QualityGatesWs.java:45`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/qualitygate/ws/QualityGatesWsParameters.java:44`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/newcodeperiod/ws/NewCodePeriodsWs.java:39`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/newcodeperiod/ws/SetAction.java:57-60,145-166,175-179`
- `server/sonar-db-dao/src/main/java/org/sonar/db/newcodeperiod/NewCodePeriodType.java:22-26`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/qualityprofile/ws/ExportAction.java:1`

URLs `.md`:
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates.md
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-gates/managing-custom-quality-gates.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code.md
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-profiles/introduction.md
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-profiles/built-in-quality-profiles.md
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-profiles/maintaining-your-custom-quality-profiles.md
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-profiles/associating-a-quality-profile-with-projects.md
- https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md
