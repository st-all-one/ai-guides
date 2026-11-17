# 11 — Rules and customization

## 1. What a rule is

[all] Rules run in the analyzer over the code and raise issues. Category depends on instance mode: **Standard Experience** has four types — bug, vulnerability, code smell, security hotspot; **MQR Mode** classifies by software quality (security, reliability, maintainability) plus hotspots. Bugs and code smells are expected to have zero false positives; vulnerabilities more than 80% true positives; hotspots are sensitive code needing review. Hotspots are being phased out and migrated to issues (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-rules/rules.md). Persisted types: `CODE_SMELL`, `BUG`, `VULNERABILITY`, `SECURITY_HOTSPOT` (source: `sonar-core/src/main/java/org/sonar/core/rule/RuleType.java:31`).

**Edition boundary**: since 26.11, advanced Java rules with symbolic execution (e.g. S2755 XXE, S6373, S6376) are **not** in Community Build; they exist in commercial Server editions and in Cloud, Free included (source: URL from section 1).

## 2. Severity and rule status

Standard severities: Blocker, Critical, Major, Minor, Info. MQR: Blocker, High, Medium, Low, Info. Hotspots have no severity. Assignment comes from impact × probability of the "worst case"; permitted users can set custom severity (source: URL from section 1).

Rule **status** is independent of severity: `READY` (production-ready), `BETA` (recent implementation, possible false positives/negatives), `DEPRECATED` (a more accurate alternative exists). Search filters also cover language, tag, repository, "available since", template and quality-profile association — with active severity and inheritance flag when a profile is selected (source: same URL).

## 3. Search and filters

The **Rules** screen lists every installed rule; the sidebar filters. In MQR there are also `impactSoftwareQualities`, `impactSeverities` and `cleanCodeAttributeCategories` (consistency, intentionality, adaptability, responsibility). In the API, `api/rules` parameters confirmed in `RulesWsParameters.java` include `repositories`, `rule_key`, `activation`, `qprofile`, `severities`, `available_since`, `statuses`, `languages`, `tags`, `types`, `inheritance`, `active_severities`, `is_template`, `template_key`, `impactSoftwareQualities`, `impactSeverities`, `active_impactSeverities`, `cleanCodeAttributeCategories` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/RulesWsParameters.java:26-58`).

```bash
export SONAR_URL=http://localhost:9000
# list active rules of a profile
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" \
  -G --data-urlencode 'qprofile=java-sonar-way-core-12345' \
  --data-urlencode 'activation=true' \
  "$SONAR_URL/api/rules/search"
# rule detail
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" \
  -G --data-urlencode 'rule_key=java:S1192' \
  "$SONAR_URL/api/rules/show"
```

`qprofile` takes the profile key; get it from `api/qualityprofiles/search`. Controller `api/rules` is created in `server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/RulesWs.java:35`; module actions include `search` (`server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/SearchAction.java:117`), `show` (`server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/ShowAction.java:70`) and `tags` (`server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/TagsAction.java:46`), plus `list`, `create`, `update`, `delete`, `repositories` and `app`.

## 4. Tags

Tags categorize rules and issues and aid discovery. Users with *Administer Quality Profiles* can add existing tags or create new ones by typing a name; plugin-provided built-in tags cannot be removed (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-rules/rules.md). The API exposes `tags` on `api/rules` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/TagsAction.java:46`); field and tag changes use `api/rules/update` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/UpdateAction.java:1`). Tags are a useful profile slice: filter by tag and activate/deactivate the set via `api/qualityprofiles/activate_rules`.

## 5. Activation per profile

Rules are not activated globally: they belong to a **Quality Profile** per language. Activate/deactivate individually (`activate_rule`, `deactivate_rule`) or in batch (`activate_rules`, `deactivate_rules`); inheritance and comparison use `change_parent`, `inheritance` and `compare` (source: action classes in `server/sonar-webserver-webapi/src/main/java/org/sonar/server/qualityprofile/ws/`). The `activation` parameter of `api/rules/search` filters active/inactive rules within a `qprofile` (source: `RulesWsParameters.java:28-29`). If many false positives appear, deactivate the rule in the profile or adjust analysis scope — do not just mark FP (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/issues/solution-overview.md).

## 6. Custom rules and plugins

**Templates** are supplied by plugins. In **Rules → Template = Show Templates Only**, pick the template and **Create**; fields vary by mode (source: https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-rules/rules.md):

| Mode | Main fields |
|---|---|
| Standard | Name, Key, Type (Bug/Vulnerability/Code Smell/Security Hotspot), Severity (Blocker→Info), Status, Description (Markdown), template parameters |
| MQR | Name, Key, Type (Issue/Hotspot), Category, Attribute, Software Quality, Severity (Blocker/High/Medium/Low/Info), Status, Description, parameters |

Entirely new rules require an analyzer plugin — see `extension-guide/adding-coding-rules.md` (source: link in https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-rules/rules.md). Deleting a custom rule does not remove it: its status becomes `REMOVED` to preserve old issues (source: same URL).

## 7. Description format

Custom rule descriptions accept Markdown; administrators can **Extend description** with internal guidance, visible to all users in the rule detail (source: URL from section 1). Conversion of legacy descriptions into sections is implemented in `server/sonar-webserver-core/src/main/java/org/sonar/server/rule/LegacyIssueRuleDescriptionSectionsGenerator.java:1`.

## 8. Pitfalls

- Do not confuse severity with rule status (`BETA`/`DEPRECATED`/`READY`).
- Rule classification changes with instance mode; QGs and filters using `types` may stop making sense after the switch.
- In Community Build, commercial symbolic-execution rules do not appear — not a plugin installation failure.
- A deleted custom rule still exists as `REMOVED`; do not recreate the same key without checking.

## Sources

`repo ae3d6eb`:
- `sonar-core/src/main/java/org/sonar/core/rule/RuleType.java:31`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/RulesWsParameters.java:26-58`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/RulesWs.java:35`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/SearchAction.java:117`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/ShowAction.java:70`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/rule/ws/TagsAction.java:46`
- `server/sonar-webserver-core/src/main/java/org/sonar/server/rule/LegacyIssueRuleDescriptionSectionsGenerator.java:1`

URLs `.md`:
- https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-rules/rules.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/issues/solution-overview.md
- https://docs.sonarsource.com/sonarqube-community-build/extension-guide/adding-coding-rules.md
