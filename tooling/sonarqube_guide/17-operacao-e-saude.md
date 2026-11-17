# 17 — Operations and health

## 1. Processes and log files [Community Build]

Each process writes its own file under `<sonarqubeHome>/logs` (or `sonar.path.logs`); there are also an access log and a deprecation log (source: `sonar-application/src/main/assembly/conf/sonar.properties:344-355`).

| File | Content |
|---|---|
| `sonar.log` | main process: startup/shutdown and overall status, no details |
| `web.log` | initial DB connection, migration, reindexing and HTTP requests |
| `ce.log` | background-task processing plus related DB/ES logs |
| `es.log` | Elasticsearch startup, health, cluster/node/index operations |
| `access.log` | all HTTP requests (with `enable=true` and `file` target) |
| `deprecation.log` | calls to deprecated Web APIs |

With a support contract, **Administration > System > Download logs** delivers the current logs (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/server-logs.md). Line format: timestamp (`YYYY.MM.DD HH:MM:SS`), level, process id (`app`, `web`, `ce`, `es`), thread/request/task ID, logger and payload (source: `sonar-application/src/main/assembly/conf/sonar.properties:361-383`).

## 2. Level, rotation and output [Community Build]

`sonar.log.level` defaults to `INFO`; `DEBUG` may log personal data, `TRACE` shows SQL/ES and degrades the instance. Per-process `sonar.log.level.app|web|ce|es` exist; the UI changes the level only until restart (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/server-logs.md).

`sonar.log.rollingPolicy=time:yyyy-MM-dd` (or `size:10MB`, `none`) and `sonar.log.maxFiles=7` apply per file (source: `sonar-application/src/main/assembly/conf/sonar.properties:357-411`). `sonar.log.jsonOutput=true` emits JSON for Loki; `sonar.web.accessLogs.target=file|console|both` enables a sidecar, and the pattern accepts `%reqAttribute{ID}`/`%reqAttribute{TOKEN_NAME}` (source: `sonar-application/src/main/assembly/conf/sonar.properties:419-450`). The log format is not configurable (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/server-logs.md).

## 3. Status, health and restart [Community Build]

`GET /api/system/status` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:62-81`) returns:

| Status | Meaning |
|---|---|
| `STARTING` | web answering, startup in progress, or ES health not GREEN/YELLOW |
| `UP` | instance operational and ES GREEN/YELLOW |
| `DOWN` | migration failed or another cause (see logs) |
| `RESTARTING` | restart requested |
| `DB_MIGRATION_NEEDED` / `DB_MIGRATION_RUNNING` | migration pending/running (`/api/system/migrate_db`) |

Since 2026.6, `UP` requires a working ES (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:78-80`, `:100-104`). `GET /api/system/health` gives a health overview and is among the paths that need no user session (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/monitoring/instance.md; `server/sonar-webserver-auth/src/main/java/org/sonar/server/authentication/UserSessionInitializer.java:81`).

`POST /api/system/restart` restarts web, CE and search, requires `Administer System`, is invalid on a cluster node and **does not reload** `sonar.properties` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/RestartAction.java:54-68`).

## 4. JMX [Community Build]

Extra MBeans: `ComputeEngine`, `Database`, `SonarQube`, read-only. Attributes: `ProcessingTime`, `ErrorCount`, `PendingCount`, `InProgressCount` (0/1), `SuccessCount`, `PendingTime`; `MigrationStatus` is `UP_TO_DATE`, `REQUIRES_UPGRADE`, `REQUIRES_DOWNGRADE` or `FRESH_INSTALL` (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/monitoring/instance.md).

Nothing is enabled locally. Remote: `sonar.web.javaAdditionalOpts` with `-Dcom.sun.management.jmxremote=true -Dcom.sun.management.jmxremote.authenticate=true -Dcom.sun.management.jmxremote.port=10443 -Dcom.sun.management.jmxremote.rmi.port=10444`; repeat on the CE with other ports and `chmod 600` on `jmxremote.password` (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/monitoring/instance.md).

## 5. Prometheus, OpenMetrics and Datadog [Community Build]

In every deployment, `GET /api/monitoring/metrics` returns OpenMetrics authenticated by passcode or bearer token; it is an unauthenticated-session path (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/set-up-monitoring/prometheus-metrics.md; `server/sonar-webserver-auth/src/main/java/org/sonar/server/usertoken/UserTokenAuthentication.java:43`). Action `metrics`: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/SafeModeMonitoringMetricAction.java:55`.

Key metrics: `sonarqube_compute_engine_pending_tasks_total`, `sonarqube_compute_engine_tasks_running_duration_seconds` (labels `task_type`, `project_key`), `sonarqube_elasticsearch_disk_space_free_bytes`, `sonarqube_elasticsearch_read_only_indices_total`, `sonarqube_elasticsearch_disk_usage_percent`, `sonarqube_health_web_status`, `sonarqube_health_elasticsearch_status`, `sonarqube_health_compute_engine_status`, `sonarqube_web_uptime_minutes` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/set-up-monitoring/prometheus-metrics.md).

On Helm the chart attaches the JMX Exporter to web and CE when `prometheusExporter.enabled: true` (`applicationNodes.prometheusExporter.enabled: true` in the DCE chart, [Server]); default ports 8000 (`web`) and 8001 (`CE`), keys `prometheusExporter.webBeanPort`/`ceBeanPort`. Exports include `SonarQube_Database_PoolActiveConnections`, `SonarQube_ComputeEngineTasks_PendingCount`, `process_cpu_seconds_total` and Tomcat metrics (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/set-up-monitoring/prometheus-metrics.md; https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/set-up-monitoring/introduction.md). Datadog can consume the same Web API endpoint (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/set-up-monitoring/introduction.md).

## 6. Telemetry [Community Build]

Every 24 h the instance sends anonymous payloads to `https://telemetry.sonarsource.com/sonarqube` and `/metrics`: version, edition, DB type, technical identifiers of projects/users/quality gates/profiles/branches, and measures such as lines per language. Source code, project names, e-mails and IPs are never sent (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/system-functions/telemetry.md). The daemon schedules the send with `scheduleWithFixedDelay` and reads `sonar.telemetry.enable` (source: `server/sonar-telemetry/src/main/java/org/sonar/telemetry/TelemetryDaemon.java:54`, `:91-92`, `:107`). Disable with `sonar.telemetry.enable=false` (default `true`) (source: `sonar-application/src/main/assembly/conf/sonar.properties:465-468`).

## Pitfalls

- `api/system/status=UP` since 2026.6 depends on ES health; check `es.log` before blaming web.
- `TRACE` in production inflates logs and increases latency.
- `api/system/restart` does not apply `sonar.properties` changes.
- `access.log` with `%requestContent` writes passwords/tokens in clear text.

## Sources

- repo ae3d6eb: `sonar-application/src/main/assembly/conf/sonar.properties:344-355`, `:357-383`, `:385-450`, `:465-468`; `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:62-81`, `:100-104`; `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/RestartAction.java:54-68`; `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/SafeModeMonitoringMetricAction.java:55`; `server/sonar-webserver-auth/src/main/java/org/sonar/server/authentication/UserSessionInitializer.java:81`; `server/sonar-webserver-auth/src/main/java/org/sonar/server/usertoken/UserTokenAuthentication.java:43`; `server/sonar-telemetry/src/main/java/org/sonar/telemetry/TelemetryDaemon.java:54`, `:91-92`, `:107`.
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/server-logs.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/monitoring/instance.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/set-up-monitoring/introduction.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/set-up-monitoring/prometheus-metrics.md
- https://docs.sonarsource.com/sonarqube-community-build/instance-administration/system-functions/telemetry.md
