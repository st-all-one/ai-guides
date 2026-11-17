# 06 — Database and migrations

## 1. Supported databases and JDBC URLs [CB]

The assembly configuration file is the primary source: "Supported databases are Oracle,
PostgreSQL and Microsoft SQLServer"; H2 is embedded and recommended for tests, not
production (source: `sonar-application/src/main/assembly/conf/sonar.properties:14-20`).

| Database | Versions in `sonar.properties` | Example URL (verified) |
|---|---|---|
| H2 (default, embedded) | port `9092` | `sonar.embeddedDatabase.port=9092` (`:28-30`) |
| Oracle | 19c/21c/26ai | `jdbc:oracle:thin:@localhost:1521/XE` (`:33-38`) |
| PostgreSQL | 15 to 18; schema `public` by default, overridable with `currentSchema` | `jdbc:postgresql://localhost/sonarqube?currentSchema=my_schema` (`:41-43`) |
| Microsoft SQL Server | 2017/2019/2022/2025 and SQL Azure | `jdbc:sqlserver://localhost;databaseName=sonar;integratedSecurity=true` and `jdbc:sqlserver://localhost;databaseName=sonar` (`:46-57`) |

The [CB] documentation gives a compatible enumeration with a version caveat: PostgreSQL
15-18 "starting in SonarQube Community Build 26.8"; SQL Server 2017/2019/2022 (with bundled
JDBC driver; Express accepted); Oracle 23ai/21c/19c/XE (source:
https://docs.sonarsource.com/sonarqube-community-build/server-installation/installing-the-database.md).
**Doc versions move**: when sources diverge (e.g. `26ai` in `sonar.properties` vs. `23ai` in
the docs), cite the source instead of merging them.

**MySQL and MariaDB are not supported**: they appear neither in the closed list of
`sonar.properties:19` nor in the engine list of the installation docs (source:
https://docs.sonarsource.com/sonarqube-community-build/server-installation/installing-the-database.md).

Verified database rules:

- The JDBC user needs permission to **create tables, indexes and triggers**; the **schema
  must exist beforehand** (source: `sonar.properties:22-24`).
- Oracle: the driver must be copied to `extensions/jdbc-driver/oracle/`; **thin client
  only** (source: `sonar.properties:33-38`). The docs add: `ojdbc14.jar` is unsupported, only
  `MAX_STRING_SIZE=STANDARD` and UTF-8 charset (source: installing-the-database.md).
- SQL Server: **case-sensitive (CS) and accent-sensitive (AS)** collation; with integrated
  security do not set `sonar.jdbc.username`/`password` and install the Microsoft SQL JDBC
  Auth package (source: `sonar.properties:46-53`; installing-the-database.md). The docs also
  require `READ_COMMITTED_SNAPSHOT ON` (source: installing-the-database.md).
- PostgreSQL: UTF-8 charset; for a custom schema, `ALTER USER ... SET search_path to ...`
  (source: installing-the-database.md).
- **Changing `sonar.jdbc.url` can affect licensed SonarSource products** (source:
  `sonar.properties:17-20`).

## 2. Connection pool [CB]

| Property | Default | Documented rule |
|---|---|---|
| `sonar.jdbc.maxActive` | `60` | "recommended value is 1.2 * max sizes of HTTP pools"; with `sonar.web.http.maxThreads=50` -> `1.2 * 50 = 60`; negative = no limit (source: `sonar.properties:60-66`) |
| `sonar.jdbc.minIdle` | `10` | minimum idle connections; `0` creates none (source: `sonar.properties:68-70`) |
| `sonar.jdbc.maxWait` | `8000` ms | wait time for a connection; `<= 0` waits indefinitely (source: `sonar.properties:72-75`) |

derived: raising `sonar.web.http.maxThreads` to 100 makes the file's own 1.2x rule point to
`maxActive=120` - a calculation from the cited formula, not a literal source value.

## 3. H2 and local storage [CB]

H2 is the assembly default and serves tests/prototypes, not production (source:
`sonar.properties:17-19`; installing-the-database.md). The docs list concrete reasons: scale
and concurrency limits, risk of data loss in in-memory mode, no replication/HA/robust
backups, and SQL compatibility differences (source: installing-the-database.md). Persistent
data (embedded database and search index) lives in `<install home>/data`, temporary data in
`<install home>/temp`, configurable via `sonar.path.data` / `sonar.path.temp` (source:
`sonar.properties:459-463`).

## 4. Schema migrations [CB]

Module `server/sonar-db-migration` (declared in `settings.gradle:43`) holds the migration
infrastructure:

- `org.sonar.server.platform.db.migration.step`: `MigrationStepsExecutorImpl`,
  `MigrationStepsProvider`, `MigrationStepRegistryImpl`, `MigrationNumber` - registration,
  ordering and execution of steps (source:
  `server/sonar-db-migration/src/main/java/org/sonar/server/platform/db/migration/step/MigrationStepsExecutorImpl.java:35`
  and neighbouring files).
- `org.sonar.server.platform.db.migration.history`: `MigrationHistoryTableImpl`,
  `MigrationHistoryImpl` - applied history (source: directory
  `server/sonar-db-migration/src/main/java/org/sonar/server/platform/db/migration/history/`).
- Steps versioned by date in `.../migration/version/v202606/`, e.g. `DbVersion202606
  implements DbVersion` and `CreateOAuthRegisteredClientsTable.java` (source:
  `server/sonar-db-migration/src/main/java/org/sonar/server/platform/db/migration/version/v202606/DbVersion202606.java:25`).

The database is therefore the source of truth for configuration, metrics/issues and the job
queue, while Elasticsearch keeps an indexed copy; on ES disaster the Web process rebuilds the
indexes (source:
https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md).

## 5. Pitfalls

- **Changing the JDBC url without assessing licensing.** The warning is in
  `sonar.properties:20` itself (source: `sonar.properties:17-20`).
- **Tuning only `maxActive` without looking at HTTP threads.** The file's recommendation is
  tied to `sonar.web.http.maxThreads` (source: `sonar.properties:60-66,113-117`).
- **Using H2 in production.** Recommended for tests only (source: `sonar.properties:18-19`;
  installing-the-database.md).
- **Expecting the user to create the schema from scratch automatically.** The docs require a
  pre-existing empty schema and a user with create/update/delete permissions (source:
  installing-the-database.md); `sonar.properties:23-24` requires creating tables/indexes/
  triggers.

## Sources

**repo ae3d6eb800dacf528b752a51b6b6bda0ec3f4971:** `sonar-application/src/main/assembly/conf/sonar.properties:14-20,22-75,459-463`; `settings.gradle:43`; `server/sonar-db-migration/src/main/java/org/sonar/server/platform/db/migration/step/MigrationStepsExecutorImpl.java:35`; `server/sonar-db-migration/src/main/java/org/sonar/server/platform/db/migration/version/v202606/DbVersion202606.java:25`; `sonar-application/src/main/assembly/extensions/jdbc-driver/oracle/README.txt`.

**URLs .md:**
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/installing-the-database.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md
