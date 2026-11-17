# 19 — Backup, restore and upgrade

## 1. What to persist [Community Build]

Source of truth: the database (projects, issues, profiles/gates, users, permissions, settings). Rebuildable: `<home>/data/es9`. Outside the database: `conf/sonar.properties`, env vars, `extensions/` (plugins/Oracle driver), the AES key and `sonar.auth.jwtBase64Hs256Secret`; do not copy `logs/`/`temp/` (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md; https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-zip-file/starting-stopping-server/running-as-a-service.md).

## 2. Backup [Community Build]

Use native DBMS tools; hot backup is supported (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/backup-and-restore.md). A dump before every update is the rollback point and the staging base (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/pre-update-steps.md). Versioning conf, extensions, secrets and the AES key completes the backup (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md).

## 3. Restore and reindex [Community Build]

1. Stop the server.
2. Restore the database backup.
3. Delete the contents of `<home>/data/es9` to force a full reindex.
4. Start the server (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/backup-and-restore.md).

K8s with `persistence.enabled=false`: nothing to delete. With a PVC: `helm upgrade ... --set replicaCount=0`, `kubectl delete pvc <nome>`, back to 1 and validate. Single project: `api/issues/reindex` with `Administer System` (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/reindexing.md).

During reindex, analyses continue (priority over reindex), but issue/hotspot filters and the global Issues page are limited; newest projects first. Track it in the banner/Background tasks; a QG may time out (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/reindexing.md).

## 4. Upgrade path [Community Build]

Calendar versioning `YY.M.0.BuildNumber`, one release per month; the Community Build documentation has no "active/LTA" concepts (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/release-cycle-model.md). Rules: versions within the current year upgrade directly; for the next year, pass through the December release first. Because of known issues in release 25.12.0.117093, 26.1.0.118079 may also serve as an intermediate (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/determine-path.md).

| From | To | Path |
|---|---|---|
| 25.10.0.x | 26.1.0.x | direct |
| 25.9.0.x | 26.3.0.x | 25.9 → 25.12 → 26.3 |
| 10.6 | 25.4.0.x | 10.6 → 24.12.0.100206 → 25.4 |
| 8.9 LTA | 25.4.0.x | 8.9 → 9.9 → 24.12 → 25.4 |

## 5. Pre-update [Community Build]

Read the release notes of every intermediate version. Tables may be duplicated during migration, raising disk usage up to 2×: keep the database below 50% occupancy. Take a backup, build staging from a recent dump and measure total time (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/pre-update-steps.md).

Recommended maintenance in an outage window (statements lock tables): PostgreSQL `VACUUM FULL; REINDEX DATABASE <db>; ANALYZE;`; SQL Server `EXEC sp_MSforeachtable 'ALTER INDEX ALL ON ? REBUILD'; EXEC sp_MSforeachtable 'UPDATE STATISTICS ? WITH FULLSCAN';`; Oracle `ALTER TABLE ... MOVE`, index rebuild and `DBMS_STATS.GATHER_SCHEMA_STATS` (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/pre-update-steps.md).

## 6. Execution [Community Build]

**ZIP**: unpack into `<newHome>`, reapply the `sonar.properties` settings manually (do not copy old files), reinstall plugins compatible with the version matrix, copy the Oracle driver if applicable, stop the old instance, start the new one and finish at `/setup`; reanalyze the projects (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/update.md).

**Docker**: `docker stop` + `docker rm`, restart with the same image of volumes and env vars, complete `/setup` (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/update.md).

**Helm**: change `image.tag` in `values.yaml` and run `helm upgrade --install -f values.yaml -n <ns> <release> <chart>`; check that custom values are still compatible with the chart (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/update.md).

## 7. Post-update and migrations [Community Build]

Check scanner versions, update `sonarqube.service` if the JAR path changed, watch deprecated Web API usage and reanalyze projects. On PostgreSQL run vacuum; on Oracle, dropped columns stay UNUSED — `DROP UNUSED COLUMNS` locks the whole table, `MOVE ONLINE` requires Enterprise Edition (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/post-update-steps.md).

Hotspots are being removed: on 26.11+, use `GET /api/hotspots/migration_status`, `POST /api/hotspots/migrate_to_issues?dryRun=true` and `POST /api/hotspots/migrate_to_issues` (optional `project`), per project on large instances (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/post-update-steps.md).

Migrations in `DbVersion202606.addSteps`: `2026_06_005`/`006` migrate and remove Anyone group permissions; `2026_06_020`–`024` create OAuth2 tables (source: `server/sonar-db-migration/src/main/java/org/sonar/server/platform/db/migration/version/v202606/DbVersion202606.java:25-60`).

## 8. LTA/EOL, rollback and vendor change [Community Build]

`gradle.properties` records `isLta=false`, `versionEOL=2027-02-01` and `premiumVersionEOL=2027-02-01` with the rules: non-LTA runs until the next release; LTA, 12 months; premium support for LTA, 18 months (source: `gradle.properties:3-11`). These are build metadata: the Community Build docs state the product has no LTA/active releases; premium support dates belong to [Server] (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/release-cycle-model.md).

Rollback: stop, restore the pre-update dump, return to the previous version, start (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/other-procedures.md). Vendor change: SonarQube DB Copy Tool (copies data, not schema — create the schema first with a temporary instance of the same version) (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/sonarqube-db-copy-tool.md). ZIP → container: same version, same JDBC URL (changing the URL resets the Server ID), external DB; do **not** copy `data/` (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md).

## Pitfalls

- Upgrading without a backup or with the database disk above 50%.
- Copying the old `sonar.properties` over the new one: configure explicitly.
- Moving ZIP → container with embedded H2: unsupported; an external DB is required.

## Sources

- repo ae3d6eb: `gradle.properties:3-11`; `server/sonar-db-migration/src/main/java/org/sonar/server/platform/db/migration/version/v202606/DbVersion202606.java:25-60`.
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/backup-and-restore.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/reindexing.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/zip-migration-guide.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/maintenance/sonarqube-db-copy-tool.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/release-cycle-model.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/determine-path.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/pre-update-steps.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/update.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/post-update-steps.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/other-procedures.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-zip-file/starting-stopping-server/running-as-a-service.md
