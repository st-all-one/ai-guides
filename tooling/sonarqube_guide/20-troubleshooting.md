# 20 — Troubleshooting

## 1. First: logs and endpoints

Logs in `<sonarqubeHome>/logs`: `sonar.log` (wrapper), `web.log` (DB/HTTP), `ce.log` (tasks), `es.log` (ES), `access.log`. Read the first line and every `Caused by`. (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/server-logs.md)

`sonar.log.level`: `INFO` (default), `DEBUG`, `TRACE` (SQL/ES; degrades the instance); there is also `sonar.log.level.app|web|ce|es` (source: `sonar-application/src/main/assembly/conf/sonar.properties:387-395`). Endpoints: `GET api/system/status` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:62`), `GET api/system/health` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/HealthActionSupport.java:50`), `GET api/qualitygates/project_status` (source: `sonar-ws/src/main/protobuf/ws-qualitygates.proto:29`), `GET api/system/db_migration_status` (source: `server/sonar-webserver-auth/src/main/java/org/sonar/server/authentication/UserSessionInitializer.java:69`).

## 2. Startup failures

| Symptom | Cause / action |
|---|---|
| `Failed to launch process [web/ce/es]` | child process did not start: read its log (source: `server/sonar-main/src/main/java/org/sonar/application/process/ManagedProcessHandler.java:78`) |
| `Status UP requires Elasticsearch cluster to be healthy While Elasticsearch is unreachable, the status is STARTING.` | ES unhealthy: check `es.log`, disk, limits (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:42-43`) |
| `Bad format of JDBC URL` / `Unsupported JDBC driver provider` | URL not `jdbc:<provider>:…`; fix `sonar.jdbc.url` (source: `server/sonar-main/src/main/java/org/sonar/application/config/JdbcSettings.java:119,125`) |
| `cannot run elasticsearch as root` | use a dedicated non-root user (source: elasticsearch.md) |
| `Initialization failed. All nodes must be restarted` | restart all nodes (source: `server/sonar-main/src/main/java/org/sonar/application/SchedulerImpl.java:166`) |

Slow startup from low entropy: `sonar.properties` suggests `-Djava.security.egd=file:/dev/./urandom` (source: `sonar-application/src/main/assembly/conf/sonar.properties:88-90`).

## 3. Database

- `HikariPool-1 - Connection is not available` / `Cannot acquire connection from data source`: exhausted pool (typical on MS SQL). Tune `sonar.jdbc.minIdle=25`, `sonar.jdbc.maxActive=25`, `sonar.jdbc.maxLifetime=0`, `sonar.jdbc.maxWait=30000`.
- Firewall drops idle connections: `sonar.jdbc.idleTimeout=600000`, `sonar.jdbc.keepaliveTime=300000`, `sonar.jdbc.maxLifetime=1800000`, `sonar.jdbc.validationTimeout=5000`. Any HikariCP option is accepted as `sonar.jdbc.{name}`. (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/database-related-issues.md)
- Permissions/schema: grant `create`/`update`/`delete`, create the schema first (source: `sonar-application/src/main/assembly/conf/sonar.properties:23-26`).
- MS SQL: `TCP/IP connection refused` → enable TCP/IP and Named Pipes; CS/AS collation and `READ_COMMITTED_SNAPSHOT ON`. Oracle stuck on `/dev/random` → `-Djava.security.egd=file:///dev/urandom` in `sonar.web.javaOpts`. (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/installing-the-database.md, linux.md)

## 4. Elasticsearch

Current docs require `vm.max_map_count >= 524288`, `fs.file-max >= 131072`, nofile ≥ 131072, nproc ≥ 8192 on any installation (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md). The checkout's `sonar.properties` has the legacy warning `vm.max_map_count [65530] is too low, increase to at least [262144]` (source: `sonar-application/src/main/assembly/conf/sonar.properties:284-289`): **use 524288**; divergence logged in `21-decisoes-e-armadilhas.md`.

```bash
sysctl vm.max_map_count
sudo sysctl -w vm.max_map_count=524288
```

When `sonar.jdbc.url` contains `jdbc:h2`, bootstrap checks are disabled by default; with an external DB, `-Des.enforce.bootstrap.checks=true` applies (source: `server/sonar-main/src/main/java/org/sonar/application/command/EsJvmOptions.java:52-54`). Do not use H2 to dodge production requirements.

| Symptom | Cause / action |
|---|---|
| read-only indices, errors in web/CE | 95% watermark (warnings at 85%/90%): free disk **and restart**; if it persists: stop, delete `data/es9`, restart (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/elasticsearch.md) |
| `Unable to open socket file /tmp/.java_pid<PID>` | ES 9.x needs a writable `/tmp`: `tmpfs: - /tmp:size=256M,mode=1777` or drop `read_only: true` (source: linux.md, above) |
| `Failed to allocate closure` | `noexec` on the JNA directory: remove the flag or point `sonar.path.temp` (source: elasticsearch.md, above) |
| `UnsatisfiedLinkError` at startup (SUSE, 26.1+) | `sudo zypper install java-21-openjdk-devel` (source: elasticsearch.md, above) |

## 5. JVM and heap

Three JVMs: web `-Xmx1G` (`sonar.web.javaOpts`), CE `-Xmx1536m` (`sonar.ce.javaOpts`), ES `-Xmx512m` (`sonar.search.javaOpts`) — ~3 GB total. `javaOpts` replaces the default; `*.javaAdditionalOpts` appends flags. (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md, `sonar-application/src/main/assembly/conf/sonar.properties:92,269,293,296`)

`sonar.search.port` defaults to **9001**; `sonar.path.logs|data|temp` default to `logs`/`data`/`temp` (source: `sonar-application/src/main/assembly/conf/sonar.properties:298-300,397-399,459-463`).

## 6. Scanner, authentication and Quality Gate

| Symptom | Action |
|---|---|
| `Missing blame information`, `Could not find ref` | full checkout; see `14-integracao-ci.md` |
| missing `sonar.projectKey` | `sonar-project.properties` or `-Dsonar.projectKey=` |
| QG not captured | `sonar.qualitygate.wait=true`, `sonar.qualitygate.timeout` (300 s) |
| QG timeout during reindex | reindex finishes before the computation; past the timeout the QG expires (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/reindexing.md) |
| token stopped working | revoked/expired or issuer lost *Execute Analysis* (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md) |
| SAML "You are not authorized" behind IIS | check redirection and `valid recipient` in `web.log` at `DEBUG` (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/other-issues.md) |
| ECS with `unknownhostexception` | replace bridge networking with host (source: other-issues.md, above) |

## 7. Pitfalls

`TRACE` degrades the server; freeing disk without restarting does not release read-only indices; disabling bootstrap checks hides the problem.

## Sources

- repo ae3d6eb: `sonar-application/src/main/assembly/conf/sonar.properties:23-26,88-92,269,284-300,387-395,397-399,459-463`, `server/sonar-main/src/main/java/org/sonar/application/command/EsJvmOptions.java:52-54`, `server/sonar-main/src/main/java/org/sonar/application/config/JdbcSettings.java:119,125`, `server/sonar-main/src/main/java/org/sonar/application/process/ManagedProcessHandler.java:78`, `server/sonar-main/src/main/java/org/sonar/application/SchedulerImpl.java:166`, `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:42-43,62`, `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/HealthActionSupport.java:50`, `server/sonar-webserver-auth/src/main/java/org/sonar/server/authentication/UserSessionInitializer.java:69`, `sonar-ws/src/main/protobuf/ws-qualitygates.proto:29`
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/server-logs.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/database-related-issues.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/elasticsearch.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/other-issues.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/installing-the-database.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/reindexing.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md
