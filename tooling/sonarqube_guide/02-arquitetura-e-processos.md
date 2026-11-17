# 02 — Architecture and processes

## 1. JVM processes

[CB] docs declare three Java processes plus the **`Sonar`** (App) process managing their
availability (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md).
The four identifiers appear in the log format: `app`, `web`, `ce`, `es` (source:
`sonar-application/src/main/assembly/conf/sonar.properties:344-395`).

| Process | Responsibility | Verified port/default | Log |
|---|---|---|---|
| App (`app`) | manages availability of the others | - | `sonar.log` (`sonar.properties:347-352`) |
| Web (`web`) | serves the UI and the Web API | HTTP **9000** (`sonar.properties:109-110`); 50 threads, min 5, queue 25 (`:113-125`) | `web.log` |
| CE (`ce`) | processes analysis reports, writes to the DB | no HTTP port of its own | `ce.log` |
| Search/ES (`es`) | mirror index of the DB for search | HTTP **9001** (`sonar.properties:298-300`); TCP transport on loopback, random port (`:302-304`) | `es.log` |

Heap: values are *placeholders* resolved at build time - `@webDefaultHeapSize@` (source:
`sonar.properties:78-92`), `@ceDefaultHeapSize@` (`:259-269`), `@searchDefaultHeapSize@`
with `MaxDirectMemorySize` = half the heap (`:275-296`). `sonar.search.host` defaults to
loopback, never expose it (source: `sonar.properties:306-309`). A low `vm.max_map_count`
warns in standalone mode and blocks ES cluster startup (source: `sonar.properties:281-289`).

## 2. Bootstrap and lifecycle

`sonar-application` holds the `main`: `App.main` calls `App.start` (source:
`sonar-application/src/main/java/org/sonar/application/App.java:83-85`). Startup uses
`AppSettingsLoaderImpl`, `CommandFactoryImpl` and `org.sonar.application.process`
(`EsManagedProcess`, `ManagedProcess`, `ManagedProcessLifecycle`) to build and supervise
processes (source:
`server/sonar-main/src/main/java/org/sonar/application/config/AppSettingsLoaderImpl.java`;
`server/sonar-main/src/main/java/org/sonar/application/process/EsManagedProcess.java`).

Web and CE have a `main`, but the code states they **cannot be started directly**:

- `WebServer implements Monitored`, holds `EmbeddedTomcat`: "Can't be started as is. Needs
  to be bootstrapped by sonar-application" (source:
  `server/sonar-webserver/src/main/java/org/sonar/server/app/WebServer.java:34-38,93-103`).
- `CeServer implements Monitored`, starts a `ce-main` thread, same warning (source:
  `server/sonar-ce/src/main/java/org/sonar/ce/app/CeServer.java:40-55,112-124`).

`ComputeEngineImpl.startup()` delegates to `ComputeEngineContainer.start(props)` and drives
`INIT -> STARTING -> STARTED`; `stopProcessing()` stops workers, `shutdown()` closes the
container (source: `server/sonar-ce/src/main/java/org/sonar/ce/ComputeEngineImpl.java:40-76`).
`sonar.properties` is **not reloaded** by `api/system/restart`: a full restart is required
(source: `sonar.properties:1-6`).

## 3. Server modules

Modules declared in `settings.gradle` (line numbers in parentheses):

| Module | Role in the code |
|---|---|
| `server:sonar-main` (`:45`) | App, config, JVM commands, ES management (`org.sonar.application.*`) |
| `server:sonar-process` (`:46`) | process primitives, logging, shared memory, cluster/Hazelcast |
| `server:sonar-webserver` (`:51`) | `WebServer`, embedded Tomcat (`EmbeddedTomcat.java`) |
| `server:sonar-webserver-core` (`:55`) | platform filters (`RootFilter.java:56`) |
| `server:sonar-webserver-ws` (`:60`) | `WebServiceEngine implements LocalConnector, Startable` (`WebServiceEngine.java:60`), `ServletFilterHandler` |
| `server:sonar-webserver-es` (`:56`) | index: `IndexDefinitions`, `IssueIndex`, `ComponentIndex`, `ProjectMeasuresIndex`, `RecoveryIndexer` |
| `server:sonar-ce` (`:38`) | queue and workers (`InternalCeQueueImpl`, `CeProcessingSchedulerImpl`, `CeWorkerImpl`) |
| `server:sonar-ce-task-projectanalysis` (`:41`) | project analysis/export task processors |
| `server:sonar-db-dao` (`:42`) | data access |
| `server:sonar-db-migration` (`:43`) | versioned schema migrations |
| `sonar-application` (`:65`) | distribution (assembly, scripts, `conf/sonar.properties`) |

Hazelcast code exists in `server/sonar-process/src/main/java/org/sonar/process/cluster/hz/`
(e.g. `HazelcastMemberImpl.java`), but **HA/cluster is [Server: Data Center]** (source:
https://docs.sonarsource.com/sonarqube-server/discovering/sonarqube-server-editions.md); the
package's presence in [CB] does not imply HA support.

## 4. Analysis pipeline in the CE [CB]

1. The scanner report fills the DB job queue - "populated by SonarScanner and processed by
   the Compute Engine" (source:
   https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md).
2. `InternalCeQueueImpl` (`org.sonar.ce.queue`) exposes the queue;
   `CeProcessingSchedulerImpl` schedules, `CeWorkerImpl` runs tasks, with interrupters
   (`CeTaskInterrupterProvider`, `TimeoutCeTaskInterrupter`) and log listeners (source:
   `server/sonar-ce/src/main/java/org/sonar/ce/queue/InternalCeQueueImpl.java`;
   `server/sonar-ce/src/main/java/org/sonar/ce/taskprocessor/CeWorkerImpl.java`).
3. `CeTaskProcessorRepositoryImpl` resolves the processor by task type; analysis/export ones
   live in `server/sonar-ce-task-projectanalysis` (source:
   `server/sonar-ce/src/main/java/org/sonar/ce/taskprocessor/CeTaskProcessorRepositoryImpl.java`;
   `settings.gradle:41`).
4. Web and CE write to DB and ES consistently; on ES disaster recovery, **rebuilding the
   indexes is the Web's job** (source:
   https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md).

## 5. Elasticsearch index [CB]

`IndexDefinitions implements Startable` publishes `Map<String, BuiltIndex>`;
`sonar.internal.es.disableIndexes` can disable collection (source:
`server/sonar-webserver-es/src/main/java/org/sonar/server/es/IndexDefinitions.java:34-63`).
ES is an "indexed copy of the database" for fast recovery (source:
https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md);
build version **9.4.7** (source: `gradle.properties:31`).

## Sources

**repo ae3d6eb800dacf528b752a51b6b6bda0ec3f4971:** `sonar-application/src/main/assembly/conf/sonar.properties:1-6,78-125,259-309,344-431`; `sonar-application/src/main/java/org/sonar/application/App.java:83-85`; `server/sonar-webserver/src/main/java/org/sonar/server/app/WebServer.java:34-38,93-103`; `server/sonar-ce/src/main/java/org/sonar/ce/app/CeServer.java:40-55,112-124`; `server/sonar-ce/src/main/java/org/sonar/ce/ComputeEngineImpl.java:40-76`; `server/sonar-webserver-es/src/main/java/org/sonar/server/es/IndexDefinitions.java:34-63`; `server/sonar-webserver-core/src/main/java/org/sonar/server/platform/web/RootFilter.java:56`; `server/sonar-webserver-ws/src/main/java/org/sonar/server/ws/WebServiceEngine.java:60`; `settings.gradle:32-65`; `gradle.properties:31`.

**URLs .md:**
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-components-overview.md
- https://docs.sonarsource.com/sonarqube-server/discovering/sonarqube-server-editions.md
