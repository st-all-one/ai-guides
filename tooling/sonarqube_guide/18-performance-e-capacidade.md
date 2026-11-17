# 18 — Performance and capacity

## 1. Sizing [Community Build]

"Small" = up to 1M LOC; "large" = up to 50M LOC. Minimums: 4 GB RAM to start, 8 GB recommended in production, 16 GB for large; 2 cores (small) or 4 (large); 30 GB disk with 10% free (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md). Default heaps let the three Java processes use ~3 GB: little left on a 4 GB host for the OS and the Elasticsearch file cache.

LOC alone does not define size: analyses/hour and average project size count. One **single CE worker** exists: more cores do not add concurrent analyses; a persistent background-task queue signals insufficient capacity (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md). Monitor CPU, memory of all three processes and disk; above 100 users or 5M LOC, monitor continuously (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/monitoring/instance.md).

## 2. Heap of the three processes [Community Build]

| Process | Property | Default | Tuning |
|---|---|---|---|
| Web | `sonar.web.javaOpts` | `-Xmx1G` | `-Xmx2G -Xms1G` |
| Compute Engine | `sonar.ce.javaOpts` | `-Xmx1536m` | `-Xmx3G` |
| Elasticsearch | `sonar.search.javaOpts` | `-Xmx512m` | `-Xmx2G -Xms2G` |

Defaults (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md). `javaOpts` **replaces** default flags; append with `javaAdditionalOpts` to keep `-Xms`/`-Xmx` (source: `sonar-application/src/main/assembly/conf/sonar.properties:92-95`, `:269-272`, `:292-296`).

```properties
sonar.web.javaOpts=-Xmx2G -Xms1G -server
sonar.ce.javaAdditionalOpts=-Xmx3G
sonar.search.javaOpts=-Xmx2G -Xms2G -XX:MaxDirectMemorySize=1G
```

For ES, `MaxDirectMemorySize` must be half the maximum heap; in 26.12 the embedded ES is 9.4.7 (source: `sonar-application/src/main/assembly/conf/sonar.properties:276-279`; `gradle.properties:31`). Set `-Xms` = `-Xmx` on ES: runtime heap resizing raises latency of in-flight requests (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/monitoring/instance.md). Never exceed 32 GB of ES heap (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md).

Raise heap when: process near the limit, OOM in `sonar.log`, background-task OOM, or `Issues` index size ≥ ES process memory (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/monitoring/instance.md).

## 3. HTTP threads and the JDBC pool [Community Build]

| Property | Default | Effect |
|---|---|---|
| `sonar.web.http.maxThreads` | `50` | cap on processed connections |
| `sonar.web.http.minThreads` | `5` | threads always alive |
| `sonar.web.http.acceptCount` | `25` | connection queue |
| `sonar.web.http.keepAliveTimeout` | `60000` | ms; `-1` = infinite |
| `sonar.web.http.maxPostSize` | `-1` | unlimited |
| `sonar.jdbc.maxActive` | `60` | 1.2 × maxThreads |
| `sonar.jdbc.minIdle` | `10` | minimum idle |
| `sonar.jdbc.maxWait` | `8000` | ms to wait |

Sources: `sonar-application/src/main/assembly/conf/sonar.properties:113-137`, `:60-75`; pool defaults in `server/sonar-process/src/main/java/org/sonar/process/ProcessProperties.java:59-61`. `sonar.jdbc.maxIdle` is deprecated/inert (source: `server/sonar-db-migration/src/main/java/org/sonar/db/DefaultDatabase.java:71-74`). The system-properties page gives other pool numbers; trust the 26.12 code.

Raising `maxThreads` without reviewing pool, heap and CPU only moves the bottleneck: the 1.2 × maxThreads rule keeps connections and threads coherent (source: `sonar-application/src/main/assembly/conf/sonar.properties:60-66`).

## 4. Elasticsearch and disk [Community Build]

`vm.max_map_count` ≥ 524288, `fs.file-max` ≥ 131072, `nofile` ≥ 131072, `nproc` ≥ 8192 — also mandatory in containers; `/tmp` must be writable (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md). `sonar.search.port` defaults to 9001, `sonar.es.port` is random; both restricted to loopback/firewall (source: `sonar-application/src/main/assembly/conf/sonar.properties:298-309`).

Disk: SSD with `deadline`/`NOOP` (never CFQ), RAID 0 acceptable, **never** NFS/SMB/NAS; `<home>/data` on a separate partition. ES marks indices read-only at a disk watermark (docs cite 95%; the free-space note cites 90% as high watermark) — 10% free is the requirement (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md). Prefer more cores over faster cores; I/O latency is usually the ES bottleneck (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md).

## 5. Storage, housekeeping and JRE [Community Build]

The acronym EDR appears in neither the code nor the indexes consulted; the topic here is data storage/retention. Shorter retention housekeeping and a narrower analysis scope reduce the footprint (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/performance-issues.md).

JRE: ZIP requires JDK 21 or 25 (use CPU releases); Docker/Helm bundle JRE `jdk-21.0.13+9` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md; `gradle.properties:38`). Compiled versions: `version=26.12`, `elasticSearchServerVersion=9.4.7`, `scannerEngineVersion=13.16.0.6705` (source: `gradle.properties:2`, `:31`, `:50`). After a PostgreSQL update that leaves slowness, reindex the `issues`, `rules` and `components` tables (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/performance-issues.md).

## 6. Monitoring signals [Community Build]

`/api/monitoring/metrics` exposes `sonarqube_compute_engine_pending_tasks_total` (queue), `sonarqube_elasticsearch_disk_usage_percent`, `sonarqube_elasticsearch_read_only_indices_total`, `sonarqube_health_*_status` and `sonarqube_web_uptime_minutes` — the minimum set for capacity alerts (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/set-up-monitoring/prometheus-metrics.md). JMX `ComputeEngineTasks.PendingTime` is the age of the oldest task; a growing `PendingCount` means the instance cannot keep up (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/monitoring/instance.md).

## Pitfalls

- High heap without `MaxDirectMemorySize` on ES: direct-memory OOM.
- Heap beyond physical RAM: swap and GC latency; prefer SSD and more RAM.
- `docker compose down -v` destroys data volumes; not for maintenance.
- A growing CE queue is not fixed with more cores: single worker.

## Sources

- repo ae3d6eb: `gradle.properties:2`, `:31`, `:38`, `:50`; `sonar-application/src/main/assembly/conf/sonar.properties:60-75`, `:92-95`, `:113-137`, `:269-272`, `:276-300`, `:298-309`; `server/sonar-process/src/main/java/org/sonar/process/ProcessProperties.java:59-61`; `server/sonar-db-migration/src/main/java/org/sonar/db/DefaultDatabase.java:71-74`.
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/monitoring/instance.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/troubleshooting/performance-issues.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/set-up-monitoring/prometheus-metrics.md
