# 22 — Quick reference

Verified values only. `CB` = Community Build; `SRV` = Server/Cloud. Map: CI (`14`), ALM/PR (`15`), plugins (`16`), failures (`20`), decisions (`21`), final recipe (`23`).

## 1. Commands

```bash
# Development from source (repo /tmp/sq-src; default = community)
./build.sh
./start.sh                 # -e community|developer|enterprise|datacenter, -l all|sonar|web|ce|es
./stop.sh

# ZIP (classic installation)
<home>/bin/<os>/sonar.sh start
<home>/bin/<os>/sonar.sh stop

# Docker: external DB mandatory outside tests
docker run -d --name sonarqube -p 9000:9000 \
  -e SONAR_JDBC_URL=... -e SONAR_JDBC_USERNAME=... -e SONAR_JDBC_PASSWORD=... \
  -v sonarqube_data:/opt/sonarqube/data \
  -v sonarqube_extensions:/opt/sonarqube/extensions \
  -v sonarqube_logs:/opt/sonarqube/logs \
  sonarqube:<versao>-community
docker logs -f sonarqube
docker restart sonarqube       # after swapping a plugin manually

# Kubernetes / Helm
helm upgrade --install -n sonarqube sonarqube sonarqube/sonarqube -f values.yaml
kubectl -n sonarqube logs -f sonarqube-sonarqube-0 -c sonarqube

# Linux host (Elasticsearch prerequisite)
sysctl vm.max_map_count
sudo sysctl -w vm.max_map_count=524288

# Scanners
sonar-scanner -Dsonar.token="$SONAR_TOKEN" -Dsonar.host.url="$SONAR_HOST_URL" \
  -Dsonar.qualitygate.wait=true
mvn -B verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar
./gradlew build sonar
```

Sources: `start.sh:2-11`, `stop.sh:20-30` (source: repo ae3d6eb); https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-docker-image/set-up-and-start-container.md, https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md, https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md, https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md.

## 2. Properties and defaults

| Property | Default / note |
|---|---|
| `sonar.jdbc.url` | embedded H2 when absent; production: PostgreSQL/Oracle/MS SQL (source: `sonar-application/src/main/assembly/conf/sonar.properties:28,38,43,53`) |
| `sonar.web.host` / `sonar.web.port` / `sonar.web.context` | `0.0.0.0` / `9000` / empty (source: `sonar-application/src/main/assembly/conf/sonar.properties:100,108,110`) |
| `sonar.search.port` | `9001`, block it at the firewall (source: `sonar-application/src/main/assembly/conf/sonar.properties:298-300`) |
| `sonar.web.javaOpts` / `sonar.ce.javaOpts` / `sonar.search.javaOpts` | `-Xmx1G` / `-Xmx1536m` / `-Xmx512m` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md) |
| `sonar.*.javaAdditionalOpts` | appends flags without replacing the default (same source) |
| `sonar.path.logs` / `data` / `temp` | `logs` / `data` / `temp` under the home (source: `sonar-application/src/main/assembly/conf/sonar.properties:397-399,459-463`) |
| `sonar.es.bootstrap.checks.disable` | defaults to `true` when the JDBC URL contains `jdbc:h2`; with an external DB, `-Des.enforce.bootstrap.checks=true` (source: `server/sonar-main/src/main/java/org/sonar/application/command/EsJvmOptions.java:52-54`) |
| `sonar.projectKey`, `sonar.sources`, `sonar.sourceEncoding` | key mandatory; `sources` defaults to `.`; encoding defaults to the system one (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md) |
| `sonar.qualitygate.wait` / `sonar.qualitygate.timeout` | `false` / `300` s (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview.md) |

## 3. Environment variables

Short doc names refer to the URLs in `## Sources`.

| Variable | Use |
|---|---|
| `SONAR_TOKEN`, `SONAR_HOST_URL` | scanner/CI authentication and URL (source: managing-tokens.md, sonarscanner.md) |
| `SONAR_USER_HOME` | scanner cache in CI (source: adding-analysis-to-gitlab-ci-cd.md) |
| `SONAR_SCANNER_OPTS` | scanner JVM, e.g. JDWP debug (source: plugin-basics.md) |
| `SONAR_JDBC_URL`, `SONAR_JDBC_USERNAME`, `SONAR_JDBC_PASSWORD` | DB in Docker (source: set-up-and-start-container.md) |
| `SONAR_WEB_HOST`, `SONAR_WEB_PORT`, `SONAR_WEB_CONTEXT` | web connection in Docker (same source) |
| `SONAR_WEB_JAVAOPTS`, `SONAR_WEB_JAVAADDITIONALOPTS` | web JVM in a container (source: set-up-and-start-container.md, `server/sonar-process/src/main/java/org/sonar/process/ProcessProperties.java:95-96`) |
| `SONAR_SECRETKEYPATH`, `SONAR_AUTH_JWTBASE64HS256SECRET` | encryption key and session secret on migration (source: zip-migration-guide.md) |
| `SONAR_ES_BOOTSTRAP_CHECKS_DISABLE` | env equivalent of the bootstrap property (source: `server/sonar-process/src/main/java/org/sonar/process/ProcessProperties.java:93`) |
| `SONARQUBE_HOME` | home inside the container; used in plugin paths (source: install-a-plugin.md) |

`derived:` general property → env rule: uppercase, dots become underscores (source: zip-migration-guide.md).

## 4. Web API (endpoints confirmed in code)

| Endpoint | Use / source |
|---|---|
| `GET api/system/status`, `GET api/system/health` | instance health (`server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:62`, `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/HealthActionSupport.java:50`) |
| `GET api/system/db_migration_status` | migration state (`server/sonar-webserver-auth/src/main/java/org/sonar/server/authentication/UserSessionInitializer.java:69`) |
| `GET api/qualitygates/project_status` | project QG status (`sonar-ws/src/main/protobuf/ws-qualitygates.proto:29`) |
| `api/user_tokens/generate` | token generation at scale — use **form data** on POST (`server/sonar-webserver-webapi/src/main/java/org/sonar/server/usertoken/ws/UserTokenSupport.java:46,49`) |
| `GET api/measures/component`, `GET api/metrics` | metrics (source: https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md) |

```bash
curl --request GET \
  --url 'https://<host>/api/qualitygates/project_status?projectKey=<key>' \
  --header 'Authorization: Bearer <token>'
```

Recommended authentication: `Authorization: Bearer <token>`; `X-Sonar-Passcode` only where bearer does not fit. `Content-Type: application/x-www-form-urlencoded` by default. (source: web-api.md)

## 5. Numbers worth memorizing

`version=26.12`, `pluginApiVersion=14.1.0.5543`, `elasticSearchServerVersion=9.4.7`, `jre_release_name=jdk-21.0.13+9`, `webappVersion=2026.6.0.82538`, `scannerEngineVersion=13.16.0.6705` — all from `gradle.properties:2,14,31,38-39,50` (repo ae3d6eb). Host limits: `vm.max_map_count >= 524288`, `fs.file-max >= 131072`, nofile 131072, nproc 8192 (source: pre-installation/linux.md). ES watermarks: warnings at 85%/90%, read-only indices at 95% (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/elasticsearch.md).

## Sources

- repo ae3d6eb: `gradle.properties:2,14,31,38-39,50`, `start.sh:2-11`, `stop.sh:20-30`, `sonar-application/src/main/assembly/conf/sonar.properties:28,38,43,53,100,108,110,298-300,387-399,459-463`, `server/sonar-process/src/main/java/org/sonar/process/ProcessProperties.java:93,95-96`, `server/sonar-main/src/main/java/org/sonar/application/command/EsJvmOptions.java:52-54`, `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:62`, `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/HealthActionSupport.java:50`, `server/sonar-webserver-auth/src/main/java/org/sonar/server/authentication/UserSessionInitializer.java:69`, `server/sonar-webserver-webapi/src/main/java/org/sonar/server/usertoken/ws/UserTokenSupport.java:46,49`, `sonar-ws/src/main/protobuf/ws-qualitygates.proto:29`
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview.md
- https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/gitlab-integration/adding-analysis-to-gitlab-ci-cd.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-docker-image/set-up-and-start-container.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/plugins/install-a-plugin.md
- https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md
- https://docs.sonarsource.com/sonarqube-community-build/extension-guide/developing-a-plugin/plugin-basics.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/elasticsearch.md
