# 13 — Webhooks and events

## 1. When it fires

[all] Webhooks notify external services when (a) a project analysis finishes — regardless of background task status or Quality Gate — and (b) an issue's type, severity or status changes **and** that change alters the QG status (e.g. marking FP turns it green, raising severity turns it red). The call is a POST with UTF-8 JSON, `Content-Type: application/json` and header `X-SonarQube-Project` holding the project key (source: https://docs.sonarsource.com/sonarqube-community-build/project-administration/webhooks.md).

QG-change firing is implemented by `WebhookQGChangeEventListener`, which sends only when the status actually changed and rebuilds the payload with analysis properties (source: `server/sonar-webserver-core/src/main/java/org/sonar/server/webhook/WebhookQGChangeEventListener.java:38-70`).

## 2. Configuration

Limit of **10 webhooks per project and 10 global**; if both levels are configured, all 20 run — the project level does not replace the global one. Requires *project administrator* (project) or *system administrator* (global). Options: UI under **Project settings > Webhooks** / **Administration > Configuration > Webhooks**, or Web API `api/webhooks` (source: URL from section 1). Creation format confirmed in the resource (source: `server/sonar-webserver-webapi/src/main/resources/org/sonar/server/webhook/ws/example-webhook-create.json:2-7`):

```json
{
  "webhook": {
    "name": "Meu webhook",
    "url": "https://listener.exemplo.com/sonar",
    "hasSecret": true
  }
}
```

```bash
curl -sS -X POST -H "Authorization: Bearer $SONAR_TOKEN" \
  -d 'name=Meu webhook&url=https://listener.exemplo.com/sonar' \
  "$SONAR_URL/api/webhooks/create"
```

The webhook `key` is a UUID in the response. `hasSecret` indicates an HMAC secret is configured; the secret itself is never returned.

## 3. Payload

Fields confirmed by docs and by the payload builder (sources: https://docs.sonarsource.com/sonarqube-community-build/project-administration/webhooks.md and `server/sonar-server-common/src/main/java/org/sonar/server/webhook/WebhookPayloadFactoryImpl.java:65-107,143`):

| Field | Origin |
|---|---|
| `serverUrl` | public server URL (`:73`) |
| `taskId`, `status` | background task id and status (`:106-107`) |
| `analysedAt`, `revision` | analysis date and SCM revision (`:78-79`) |
| `project` | `key`, `name`, `url` (`:84-90`) |
| `branch` | branch information when applicable (`:110-117`) |
| `qualityGate` | conditions with `metric`, `operator`, `errorThreshold`, `value`, `status`, `onLeakPeriod`, plus `name`/`status` (`:143`) |
| `properties` | `sonar.analysis.*` parameters of the analysis (`:94-98`) |

Minimal example (derived from the fields above):

```json
{
  "serverUrl": "http://sonarqube:9000",
  "taskId": "AVh21JS2JepAEhwQ-b3u",
  "status": "SUCCESS",
  "analysedAt": "2026-11-17T10:46:28+0100",
  "project": { "key": "myProject", "name": "My Project" },
  "properties": { "sonar.analysis.buildNumber": "12345" },
  "qualityGate": { "name": "Sonar way", "status": "OK" }
}
```

Extra properties are included automatically: `sonar-scanner -Dsonar.analysis.buildNumber=12345` yields `"properties": {"sonar.analysis.buildNumber": "12345"}`. No `is_set_as_new_code_period` field was found in this commit (unverified); rely only on the fields confirmed above.

## 4. Security

With a secret configured, the server sends `X-Sonar-Webhook-HMAC-SHA256`: **lowercase hex** HMAC-SHA256 digest of the request body. The receiver must recompute and compare in constant time, discarding mismatched signatures (source: URL from section 1):

```java
String received = request.getHeader("X-Sonar-Webhook-HMAC-SHA256");
String expected = new HmacUtils(HmacAlgorithms.HMAC_SHA_256, "your_secret").hmacHex(request.getBody());
if (!Objects.equals(expected, received)) { return; }
```

Basic auth is also accepted by embedding user/password in the URL (`https://user:pass@host/path`). Destination validation (SSRF) is on by default: loopback/wildcard, link-local/private (`10.x.x.x`, `192.168.x.x`), multicast, cloud metadata and the server's own host are blocked; validation runs on create, on update and on every delivery, redirects included. For an internal receiver, a *system administrator* disables **Enable local webhooks validation** (`sonar.validateWebhooks`) — it affects **all** webhooks in the instance (source: same URL).

## 5. Delivery, monitoring and retry

A delivery is marked failed if the URL does not answer within **10 seconds**; records are purged after **30 days**. Community Build does **not** retry automatically — implement your own redelivery logic by querying `api/webhooks/deliveries` and `api/webhooks/delivery` (actions confirmed in `server/sonar-webserver-webapi/src/main/java/org/sonar/server/webhook/ws/`; delivery format in `example-delivery.json:2-13`: `id`, `componentKey`, `ceTaskId`, `name`, `url`, `at`, `success`, `httpStatus`, `durationMs`, `payload`).

```bash
curl -sS -H "Authorization: Bearer $SONAR_TOKEN" \
  "$SONAR_URL/api/webhooks/list"
```

## 6. Compute Engine events

The payload `taskId` correlates the webhook with the background task; the scanner also writes that id into `report-task.txt` via `sonar.scanner.metadataFilePath`. The task projection used in the payload exposes `SUCCESS` and `FAILED` (source: `server/sonar-server-common/src/main/java/org/sonar/server/webhook/CeTask.java:30-32`). To read the outcome and the associated QG use `api/ce/task` and `api/qualitygates/project_status` (source: `api/ce` and `api/qualitygates` literals under `server/sonar-webserver-webapi/src/main/java/`). The analysis webhook fires even when the task fails — handle `status` explicitly instead of assuming success.

## 7. Email and Slack notifications

**Native email**: each user subscribes under *My Account > Notifications*. Global events include background task failure on administered projects, changes to issues/hotspots assigned to the user, QG changes on all accessible projects and new issues assigned; per project there are also "issues resolved as false positive or accepted" and "new issues" (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-your-account/subscribing-to-notifications.md). The mail server is configured under administration *Notifications* (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/system-functions/notifications.md).

**Slack**: no native channel is documented in Community Build. `derived:` forward the webhook (with HMAC validated) to your own adapter that publishes to the target channel; do not attribute a native Slack integration to Community Build.

## 8. Pitfalls

- Relying on native retry: none exists; monitor `deliveries`.
- Exposing the HMAC secret in logs or committing a URL with credentials.
- Assuming a project webhook replaces the global one: both fire.
- Internal destination blocked: adjust `sonar.validateWebhooks` knowing its global scope.

## Sources

`repo ae3d6eb`:
- `server/sonar-webserver-webapi/src/main/resources/org/sonar/server/webhook/ws/example-webhook-create.json:2-7`
- `server/sonar-webserver-webapi/src/main/resources/org/sonar/server/webhook/ws/example-delivery.json:2-13`
- `server/sonar-server-common/src/main/java/org/sonar/server/webhook/WebhookPayloadFactoryImpl.java:65-107,143`
- `server/sonar-webserver-core/src/main/java/org/sonar/server/webhook/WebhookQGChangeEventListener.java:38-70`
- `server/sonar-server-common/src/main/java/org/sonar/server/webhook/CeTask.java:30-32`
- `server/sonar-webserver-webapi/src/main/java/org/sonar/server/webhook/ws/WebhooksWsParameters.java:27`

URLs `.md`:
- https://docs.sonarsource.com/sonarqube-community-build/project-administration/webhooks.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-your-account/subscribing-to-notifications.md
- https://docs.sonarsource.com/sonarqube-community-build/instance-administration/system-functions/notifications.md
