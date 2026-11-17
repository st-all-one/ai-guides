# 23 — Recommended implementation

Dossier close-out: the **verified** minimal scope turning a survey into a decision. All is Community Build (`CB`) unless marked; optional/commercial items are flagged, nothing depends on them.

## 1. Gaps and contradictions

1. **`vm.max_map_count`:** `sonar-application/src/main/assembly/conf/sonar.properties:288` carries the legacy warning `increase to at least [262144]`; the docs require `>= 524288`. Use 524288 (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md).
2. **CI YAML with PRs:** the GitHub Actions doc shows `pull_request`, but the same page says only the main branch is analyzed; the table marks PR analysis *Not available* (source: https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/github-integration/adding-analysis-to-github-actions-workflow.md, https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md).
3. **Moving versions:** `/sonarqube-server/...` URLs describe 2026.5; the checkout is `version=26.12` (`gradle.properties:2`). No number was inferred from `latest`.
4. **Nonexistent endpoints:** there is no `api/users/tokens/create` or `api/project_status` in the code; the real ones are `api/user_tokens/generate` and `api/qualitygates/project_status` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/usertoken/ws/UserTokenSupport.java:46,49`, `sonar-ws/src/main/protobuf/ws-qualitygates.proto:29`).
5. **Plugin matrix not textual:** an embedded component, not transcribable from Markdown (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/plugins/plugin-version-matrix.md).
6. **UI outside the repo:** the webapp lives in `sonarqube-webapp` (`README.md:105,170-172`); nothing about the UI was inferred here.
7. **H2 hides requirements:** with `jdbc:h2`, ES bootstrap checks are disabled (source: `server/sonar-main/src/main/java/org/sonar/application/command/EsJvmOptions.java:52-54`): a test boot does not prove production boots.

## 2. Artifact → data → interaction → model

| Artifact | Data shown | Real interaction | Requirement |
|---|---|---|---|
| Project view | ncloc, issues, coverage, rating, QG status, new code | browse, filter, flag issues | `[all]`, CB included |
| Quality Gate | new-code conditions, Passed/Failed | create/edit QG, bind project | `[all]`; custom QGs on CB |
| Background tasks | queue, analysis/reindex status, duration | monitor and diagnose | `[all]` |
| Project coverage | connected platforms, imported repos, analyzed projects | connect, import, configure analysis | `[CB]`; *Administer System* + *Create Projects* |
| Webhooks | analysis event payloads | configure endpoint and secret | `[CB]` included; `[Cloud Free]` no |
| Marketplace / plugins | installed, updates, compatibility | install/remove/restart | `[CB]` included, at own risk |
| Branch view / PR decoration | branches, diff, inline annotations, QG on PR | comment/block merge | `[Server: Developer+]` / `[Cloud Team+]`; **CB: main only, no PR/decoration** |
| SCA / Advanced SAST / Remediation Agent | dependencies, taint, fix PRs | understand/fix | *Advanced Security* subscription; CB no |
| Portfolio, dashboards, reports, audit logs, SCIM | consolidated governance | administer | `[Server: Enterprise/DC]` / `[Cloud Enterprise]`; CB no |
| MCP server / AI CodeFix | AI assistance and fixes | use agent/IDE | `[Server]`/`[Cloud]`; CB no |

Model column source: https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md; Project coverage: https://docs.sonarsource.com/sonarqube-community-build/project-coverage.md. **CB has no decoration and no merge blocking**; what exists is CI job failure (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview.md).

## 3. Minimal Community Build recipe

### 3.1 External database (PostgreSQL)

Empty schema, user `sonarqube` with `create`/`update`/`delete`, UTF-8, DB on a separate host with low latency; PostgreSQL 15–18 from 26.8 (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/installing-the-database.md). For a custom schema:

```sql
ALTER USER mySonarUser SET search_path to mySonarQubeSchema;
```

(source: same URL). H2 for testing only: it does not migrate to a container (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md).

### 3.2 Host and container

```bash
sudo sysctl -w vm.max_map_count=524288
sudo sysctl -w fs.file-max=131072
printf 'vm.max_map_count=524288\nfs.file-max=131072\n' | sudo tee /etc/sysctl.d/99-sonarqube.conf
docker volume create sonarqube_data
docker volume create sonarqube_extensions
docker volume create sonarqube_logs
docker run -d --name sonarqube -p 9000:9000 \
  --ulimit nofile=131072:131072 --ulimit nproc=8192:8192 \
  -e SONAR_JDBC_URL='jdbc:postgresql://<db-host>:5432/sonar' \
  -e SONAR_JDBC_USERNAME='sonar' \
  -e SONAR_JDBC_PASSWORD='<secret>' \
  -v sonarqube_data:/opt/sonarqube/data \
  -v sonarqube_extensions:/opt/sonarqube/extensions \
  -v sonarqube_logs:/opt/sonarqube/logs \
  sonarqube:26.12-community
docker logs -f sonarqube
```

Limits: https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md; volumes/ulimits: zip-migration-guide.md (above). `derived:` the `26.12-community` tag comes from `gradle.properties:2`, not Docker Hub — check the available tag (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-docker-image/set-up-and-start-container.md).

### 3.3 Token, project and scanner

Generate a project token in **User > My Account > Security** (or `api/user_tokens/generate` at scale, with form data on POST); it requires *Execute Analysis* (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md, https://docs.sonarsource.com/sonarqube-community-build/project-coverage.md). Import the repository in **Administration > Project coverage**. Use the dedicated scanner for Maven/Gradle/.NET; CLI for the rest (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md):

```bash
sonar-scanner -Dsonar.projectKey=my:project -Dsonar.sources=. \
  -Dsonar.token="$SONAR_TOKEN" -Dsonar.host.url="$SONAR_HOST_URL"
```

### 3.4 Quality Gate and CI

`Sonar way` evaluates new code; the default global baseline is *Previous version* (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code.md). Job blocking: `sonar.qualitygate.wait=true` (default timeout 300 s) or the QG action/pipe (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview.md); YAML in `14-integracao-ci.md`. Verification:

```bash
curl -H 'Authorization: Bearer '"$SONAR_TOKEN" 'http://<host>:9000/api/system/status'
curl -H 'Authorization: Bearer '"$SONAR_TOKEN" \
  'http://<host>:9000/api/qualitygates/project_status?projectKey=my:project'
```

Endpoint sources: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:62`, `sonar-ws/src/main/protobuf/ws-qualitygates.proto:29`; authentication: https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md.

### 3.5 Outside the recipe (optional/commercial)

Third-party plugins (admin risk, `16`), PR decoration and branch analysis (`[Server]`/`[Cloud Team+]`), SCA/Advanced SAST/Remediation Agent (`Advanced Security`), portfolios and audit (`[Enterprise/DC]`), ZIP→Docker migration (only with an existing ZIP + external DB), UI build in a separate repo. None is a prerequisite.

## 4. Twelve sufficiency questions

1. Code version and `pluginApiVersion`? (`22`, `16`)
2. Does CB cover PR/branch analysis? (`15`, `21`)
3. H2 in production? Why not? (`21`)
4. Kernel limits for ES? (`20`, `22`)
5. Web/search ports, and what to do with the second? (`22`)
6. How to generate and store the CI token? (`15`, `14`)
7. Scanner for Maven/Gradle/.NET/others? (`14`)
8. How does a red QG fail the job? (`14`, `22`)
9. What is reindex and how to force it? (`21`, `20`)
10. How to migrate ZIP→Docker without changing the Server ID? (`21`)
11. How to install a plugin, where, at what risk? (`16`)
12. What is optional/commercial? (`15`, `21`, `23`)

## 5. Budget and anti-regrowth rules

**Budget:** 7 track files, 4–9 KB each (11 KB here), up to ~200 lines, `## Sources` up to 25 entries. Index, SKILL, VERSION, README belong to the guide owner.

1. One sentence per verifiable fact; no source, omit.
2. Table before prose; one YAML per CI; point duplication to the file by number.
3. Commercial feature always with `[Server]`/`[Cloud]`; CB claim with the table/code source.
4. Version number, default or limit requires `path:line` or `.md` URL.
5. A contradiction becomes an item in section 1, not a scattered note.
6. A new topic **replaces** an existing line; never create a file or expand the index.
7. Optional/commercial stays in its own section, never mixed into the minimal recipe.

## Sources

- repo ae3d6eb: `gradle.properties:2,14`, `README.md:105,170-172`, `sonar-application/src/main/assembly/conf/sonar.properties:288`, `server/sonar-main/src/main/java/org/sonar/application/command/EsJvmOptions.java:52-54`, `server/sonar-webserver-webapi/src/main/java/org/sonar/server/usertoken/ws/UserTokenSupport.java:46,49`, `sonar-ws/src/main/protobuf/ws-qualitygates.proto:29`, `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/StatusAction.java:62`
- https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md
- https://docs.sonarsource.com/sonarqube-community-build/project-coverage.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview.md
- https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/github-integration/adding-analysis-to-github-actions-workflow.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/installing-the-database.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-docker-image/set-up-and-start-container.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/plugins/plugin-version-matrix.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code.md
- https://docs.sonarsource.com/sonarqube-community-build/extension-guide/web-api.md
