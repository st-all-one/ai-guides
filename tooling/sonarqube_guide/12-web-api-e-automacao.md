# 12 — Web API and automation

## 1. Discovery

[all] The Web API is documented inside the instance: the help button in the top bar opens the web service catalog with method, parameters and examples. Web API V2 will gradually replace legacy endpoints as they are deprecated (source: https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md).

Definitions live in `server/sonar-webserver-webapi/src/main/java/org/sonar/server/<domain>/ws/`; response examples are in `server/sonar-webserver-webapi/src/main/resources/org/sonar/server/ws/ws/list-example.json:1` and `response_example-example.json:1`. The only XML samples in that resource are `server/sonar-webserver-webapi/src/main/resources/org/sonar/server/qualityprofile/ws/export-example.xml:1` and `backup-example.xml:1` (exported profiles). No single XML file holds the endpoint catalog: the list below was extracted from `api/...` literals and module controllers.

## 2. Authentication

Recommended: **Bearer** with a user token:

```bash
export SONAR_URL=http://localhost:9000
export SONAR_TOKEN=...        # User, Project analysis or Global analysis token
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" "$SONAR_URL/api/system/health"
```

**HTTP Basic with the token as login and an empty password** is also accepted — the code states the login may be an access token and decodes the `login:password` pair (source: `server/sonar-webserver-auth/src/main/java/org/sonar/server/authentication/BasicAuthentication.java:36-40,64-75`). Docs direct you to send the token via bearer or basic schemes without a password (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md).

For endpoints that do not support Bearer (e.g. `monitoring/metrics`), use `X-Sonar-Passcode: <passcode>`, taken from `sonar.web.systemPasscode` or `SONAR_WEB_SYSTEMPASSCODE` (source: https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md). Token responses include the `SonarQube-Authentication-Token-Expiration` header, useful for rotation; it is absent on `/api/authentication/*`, badges, `/api/server/version` and `/api/system/migrate_db` (source: managing-tokens URL above).

## 3. Format and pagination

Use `Content-Type: application/x-www-form-urlencoded` (curl/requests default) and, on POST, prefer form data over query string — query params on POST are not passed safely to the endpoint (source: https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md).

```bash
curl -sS -X POST -H "Authorization: Bearer $SONAR_TOKEN" \
  -d 'project=my:project&type=NUMBER_OF_DAYS&value=30' \
  "$SONAR_URL/api/new_code_periods/set"
```

Common pagination: `p` (1-based page index) and `ps` (size). Code examples: `p` in `server/sonar-webserver-webapi/src/main/java/org/sonar/server/almintegration/ws/gitlab/SearchGitlabReposAction.java:102` and `ps` in `server/sonar-webserver-webapi/src/main/java/org/sonar/server/language/ws/ListAction.java:77-81` (on this endpoint `ps=0` means "all"). **Not universal**: `api/qualitygates/search` uses `pageSize` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/qualitygate/ws/QualityGatesWsParameters.java:44`). Always confirm parameters in the instance catalog.

## 4. Domains and confirmed endpoints

Literal paths in the webapi module (source: `api/...` literals under `server/sonar-webserver-webapi/src/main/java/`): `api/alm_integrations`, `api/alm_settings`, `api/analysis_cache`, `api/analysis_reports`, `api/authentication`, `api/ce`, `api/developers`, `api/duplications`, `api/emails`, `api/features`, `api/hotspots`, `api/issues`, `api/languages`, `api/measures`, `api/metrics`, `api/monitoring`, `api/navigation`, `api/new_code_periods`, `api/notifications`, `api/plugins`, `api/project_analyses`, `api/project_badges`, `api/project_branches`, `api/project_dump`, `api/project_links`, `api/project_tags`, `api/qualitygates`, `api/rules`, `api/server`, `api/settings`, `api/sources`, `api/system`, `api/user_groups`, `api/user_tokens`, `api/users`, `api/webhooks`, `api/webservices`. The `api/qualitygates` and `api/new_code_periods` controllers are visible in `QualityGatesWs.java:45` and `NewCodePeriodsWs.java:39` (same `org/sonar/server/<domain>/ws/` directory). `derived:` the profile controller uses `api/qualityprofiles`, missing from the literal list because it is assembled from a constant.

## 5. Executable examples

```bash
export SONAR_URL=http://localhost:9000
export SONAR_TOKEN=...

# health and version
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" "$SONAR_URL/api/system/health"
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" "$SONAR_URL/api/server/version"

# measures: metricKeys and component (documentation example)
curl -sS -G -H "Authorization: Bearer $SONAR_TOKEN" \
  --data-urlencode 'metricKeys=ncloc,code_smells,complexity' \
  --data-urlencode 'component=my:project' \
  "$SONAR_URL/api/measures/component"

# catalogs and state
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" "$SONAR_URL/api/metrics/search"
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" "$SONAR_URL/api/qualitygates/list"
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" "$SONAR_URL/api/webhooks/list"
```

The `/api/measures/component` call and response shape (`component.measures[].metric/value`) follow the docs example (source: https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md).

## 6. `sonar-ws` Java client

The `sonar-ws` module holds a Java client for the web services: `sonar-ws/src/main/java/org/sonarqube/ws/client/` (e.g. `SendGithubCodeScanningAlertWebhookPayloadRequest.java:1`). Use it when automation already runs on a JVM and you prefer generated types to `curl`; for shell scripts the examples above suffice. The matching generator lives in `sonar-ws-generator/`.

## 7. Web API V2

Base path `/api/v2` (source: `server/sonar-webserver-webapi-v2/src/main/java/org/sonar/server/v2/security/WebSecurityConfig.java:105`), also mapped in `server/sonar-webserver/src/main/java/org/sonar/server/platform/PlatformImpl.java:147`. It is a separate Spring application with its own security filter and REST controllers under `server/sonar-webserver-webapi-v2/src/main/java/org/sonar/server/v2/api/`. Domains present: `agentic`, `analysis`, `dashboards`, `dop`, `email`, `github`, `gitlab`, `group`, `history`, `membership`, `mode`, `model`, `onboarding`, `projectbindings`, `projects`, `rule`, `system`, `user`. Confirmed examples: `/api/v2/system/liveness` (source: `WebSecurityConfig.java:96`), analysis controllers `ActiveRulesController.java:37`, `JresController.java:41`, `ScannerEngineController.java:36`, and endpoint `api/v2/remediation-agent/jobs` cited in `DefaultAgenticJobsController.java:143`.

```bash
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" "$SONAR_URL/api/v2/system/liveness"
```

## 8. Pitfalls

- Sending POST with a query string instead of form data.
- Assuming every endpoint uses `p`/`ps`: check the catalog.
- Using `sonar.login`/`sonar.password` against the API instead of a token.
- Treating V2 as stable: migration is gradual and some resources still exist only under `/api/*`.

## Sources

`repo ae3d6eb`:
- `server/sonar-webserver-auth/src/main/java/org/sonar/server/authentication/BasicAuthentication.java:36-40,64-75`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/almintegration/ws/gitlab/SearchGitlabReposAction.java:102`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/language/ws/ListAction.java:77-81`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/qualitygate/ws/QualityGatesWsParameters.java:44`
- `server/sonar-webserver-webapi/src/main/resources/org/sonar/server/ws/ws/list-example.json:1`
- `server/sonar-webserver-webapi/src/main/resources/org/sonar/server/qualityprofile/ws/export-example.xml:1`
- `sonar-ws/src/main/java/org/sonarqube/ws/client/SendGithubCodeScanningAlertWebhookPayloadRequest.java:1`
- `server/sonar-webserver-webapi-v2/src/main/java/org/sonar/server/v2/security/WebSecurityConfig.java:96,105`
- `server/sonar-webserver/src/main/java/org/sonar/server/platform/PlatformImpl.java:147`

URLs `.md`:
- https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md
