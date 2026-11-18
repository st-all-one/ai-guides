# 23 - Coverage evidence

This chapter makes the coverage claim measurable. Each topic has 20 items describing what
effective use requires. An item is `documented` when the guide answers it with a resolved
`path:line` citation; it is `unverified` when only a running daemon, registry, exporter or
sandbox can answer it. Coverage is `documented / 20`, with a target of at least 85% in every
topic. The verifier parses the tables, resolves every evidence line and fails any topic
below the target.

Metric scope (**derived**): this measures documentation coverage of a curated checklist,
not runtime validation or 85% of the Docker manuals. Unverified items are counted honestly
instead of being hidden. The itemized rows are the single source of truth; interpret them
with `17-coverage-and-limits.md`.

## 1. Configuration

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| C01 | configuration | daemon configuration file path | documented | `16-quick-reference.md:11` |
| C02 | configuration | persistent state root | documented | `16-quick-reference.md:12` |
| C03 | configuration | execution state root | documented | `16-quick-reference.md:13` |
| C04 | configuration | default OCI runtime | documented | `16-quick-reference.md:14` |
| C05 | configuration | default log driver | documented | `16-quick-reference.md:15` |
| C06 | configuration | daemon log format | documented | `16-quick-reference.md:16` |
| C07 | configuration | socket group ownership | documented | `16-quick-reference.md:17` |
| C08 | configuration | socket listeners | documented | `16-quick-reference.md:18` |
| C09 | configuration | authorization plugins | documented | `16-quick-reference.md:19` |
| C10 | configuration | live restore during daemon restart | documented | `16-quick-reference.md:20` |
| C11 | configuration | daemon feature switches | documented | `16-quick-reference.md:21` |
| C12 | configuration | cgroup namespace default | documented | `16-quick-reference.md:22` |
| C13 | configuration | default shm size | documented | `16-quick-reference.md:23` |
| C14 | configuration | default stop timeout | documented | `16-quick-reference.md:24` |
| C15 | configuration | firewall backend selection | documented | `16-quick-reference.md:25` |
| C16 | configuration | debug mode | documented | `16-quick-reference.md:26` |
| C17 | configuration | loopback registry change in 29.10 | documented | `16-quick-reference.md:28` |
| C18 | configuration | systemd and daemon.json conflict | documented | `01-engine-architecture.md:27` |
| C19 | configuration | proxy configuration | documented | `02-daemon-configuration.md:7` |
| C20 | configuration | live verification of a changed daemon config | unverified | `17-coverage-and-limits.md:45` |

Coverage: 19/20 documented (95%).

## 2. Logs and telemetry

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| L01 | logs_telemetry | driver selection | documented | `06-logging-and-telemetry.md:5` |
| L02 | logs_telemetry | json-file default | documented | `16-quick-reference.md:38` |
| L03 | logs_telemetry | max-size rotation key | documented | `16-quick-reference.md:36` |
| L04 | logs_telemetry | max-file rotation key | documented | `16-quick-reference.md:36` |
| L05 | logs_telemetry | log-opts values as strings | documented | `16-quick-reference.md:36` |
| L06 | logs_telemetry | per-container logging override | documented | `16-quick-reference.md:64` |
| L07 | logs_telemetry | docker logs flags | documented | `06-logging-and-telemetry.md:16` |
| L08 | logs_telemetry | dual logging | documented | `06-logging-and-telemetry.md:36` |
| L09 | logs_telemetry | log tags | documented | `06-logging-and-telemetry.md:40` |
| L10 | logs_telemetry | event stream | documented | `06-logging-and-telemetry.md:3` |
| L11 | logs_telemetry | daemon logs | documented | `16-quick-reference.md:39` |
| L12 | logs_telemetry | Prometheus metrics | documented | `16-quick-reference.md:40` |
| L13 | logs_telemetry | CLI OpenTelemetry | documented | `16-quick-reference.md:41` |
| L14 | logs_telemetry | structured log fields | documented | `20-logs-telemetry-deep.md:9` |
| L15 | logs_telemetry | redaction boundary | documented | `20-logs-telemetry-deep.md:55` |
| L16 | logs_telemetry | retention tiers | documented | `20-logs-telemetry-deep.md:59` |
| L17 | logs_telemetry | health state in logs | documented | `20-logs-telemetry-deep.md:19` |
| L18 | logs_telemetry | error taxonomy | documented | `19-errors-and-retries-deep.md:5` |
| L19 | logs_telemetry | restart backoff | documented | `19-errors-and-retries-deep.md:29` |
| L20 | logs_telemetry | live exporter delivery | unverified | `17-coverage-and-limits.md:46` |

Coverage: 19/20 documented (95%).

## 3. Compose

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| M01 | compose | application model | documented | `07-compose-model.md:60` |
| M02 | compose | file discovery | documented | `07-compose-model.md:21` |
| M03 | compose | file merge precedence | documented | `07-compose-model.md:21` |
| M04 | compose | config normalization gate | documented | `16-quick-reference.md:72` |
| M05 | compose | quiet validation only | documented | `16-quick-reference.md:73` |
| M06 | compose | variable interpolation | documented | `07-compose-model.md:17` |
| M07 | compose | environment precedence | documented | `07-compose-model.md:56` |
| M08 | compose | env_file resolution | documented | `07-compose-model.md:56` |
| M09 | compose | profile activation rules | documented | `16-quick-reference.md:78` |
| M10 | compose | depends_on conditions | documented | `08-compose-production.md:37` |
| M11 | compose | secrets model | documented | `07-compose-model.md:69` |
| M12 | compose | configs model | documented | `07-compose-model.md:69` |
| M13 | compose | extends and include | documented | `07-compose-model.md:67` |
| M14 | compose | deploy resources and limits | documented | `08-compose-production.md:3` |
| M15 | compose | replicas and update policy | documented | `08-compose-production.md:16` |
| M16 | compose | healthcheck gate | documented | `08-compose-production.md:33` |
| M17 | compose | GPU support | documented | `08-compose-production.md:44` |
| M18 | compose | networks model | documented | `13-networking.md:9` |
| M19 | compose | volumes model | documented | `14-storage-and-volumes.md:18` |
| M20 | compose | startup order and wait | documented | `08-compose-production.md:25` |

Coverage: 20/20 documented (100%).

## 4. Sandbox

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| B01 | sandbox | sandbox architecture | documented | `05-sandboxes.md:7` |
| B02 | sandbox | outbound TCP default | documented | `16-quick-reference.md:86` |
| B03 | sandbox | outbound UDP default | documented | `16-quick-reference.md:87` |
| B04 | sandbox | internal DNS and ICMP | documented | `05-sandboxes.md:32` |
| B05 | sandbox | active policy inspection | documented | `16-quick-reference.md:88` |
| B06 | sandbox | policy rule precedence | documented | `05-sandboxes.md:111` |
| B07 | sandbox | workspace mount mode | documented | `05-sandboxes.md:10` |
| B08 | sandbox | shared skills read-only | documented | `05-sandboxes.md:21` |
| B09 | sandbox | credential proxy injection | documented | `16-quick-reference.md:89` |
| B10 | sandbox | raw credentials unavailable | documented | `16-quick-reference.md:89` |
| B11 | sandbox | local versus cloud behavior | documented | `05-sandboxes.md:4` |
| B12 | sandbox | kits and tool mixins | documented | `05-sandboxes.md:118` |
| B13 | sandbox | MCP gateway | documented | `05-sandboxes.md:49` |
| B14 | sandbox | governance | documented | `05-sandboxes.md:71` |
| B15 | sandbox | rootless prerequisites | documented | `03-isolation-and-runtime.md:56` |
| B16 | sandbox | seccomp profile control | documented | `16-quick-reference.md:53` |
| B17 | sandbox | AppArmor profile | documented | `16-quick-reference.md:52` |
| B18 | sandbox | capability drops | documented | `16-quick-reference.md:47` |
| B19 | sandbox | no-new-privileges | documented | `16-quick-reference.md:51` |
| B20 | sandbox | live policy enforcement | unverified | `17-coverage-and-limits.md:51` |

Coverage: 19/20 documented (95%).

## 5. Images

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| I01 | images | tag versus digest | documented | `09-images-verification.md:3` |
| I02 | images | pull policy | documented | `16-quick-reference.md:61` |
| I03 | images | platform pinning | documented | `16-quick-reference.md:62` |
| I04 | images | multi-arch manifests | documented | `09-images-verification.md:22` |
| I05 | images | image inspection | documented | `09-images-verification.md:14` |
| I06 | images | SBOM attestation | documented | `16-quick-reference.md:90` |
| I07 | images | provenance attestation | documented | `09-images-verification.md:46` |
| I08 | images | Scout analysis | documented | `09-images-verification.md:37` |
| I09 | images | policy and exceptions | documented | `09-images-verification.md:37` |
| I10 | images | Hardened Images | documented | `09-images-verification.md:83` |
| I11 | images | attestation verification gate | documented | `16-quick-reference.md:92` |
| I12 | images | cosign verification | documented | `09-images-verification.md:85` |
| I13 | images | registry mirror | documented | `09-images-verification.md:83` |
| I14 | images | multi-stage Dockerfile | documented | `10-dockerfile-and-build.md:45` |
| I15 | images | dockerignore | documented | `10-dockerfile-and-build.md:55` |
| I16 | images | layer ordering | documented | `10-dockerfile-and-build.md:27` |
| I17 | images | cache mounts | documented | `10-dockerfile-and-build.md:85` |
| I18 | images | build secrets | documented | `10-dockerfile-and-build.md:38` |
| I19 | images | non-root USER | documented | `10-dockerfile-and-build.md:17` |
| I20 | images | bake and remote cache | documented | `11-build-bake-and-cache.md:3` |

Coverage: 20/20 documented (100%).

## 6. Flags and determinism

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| F01 | flags_determinism | drop capabilities flag | documented | `12-runtime-flags.md:28` |
| F02 | flags_determinism | no-new-privileges flag | documented | `12-runtime-flags.md:30` |
| F03 | flags_determinism | read-only root flag | documented | `12-runtime-flags.md:32` |
| F04 | flags_determinism | seccomp security option | documented | `12-runtime-flags.md:30` |
| F05 | flags_determinism | CPU limit flag | documented | `12-runtime-flags.md:45` |
| F06 | flags_determinism | memory limit flag | documented | `12-runtime-flags.md:46` |
| F07 | flags_determinism | PID limit flag | documented | `12-runtime-flags.md:48` |
| F08 | flags_determinism | network attach flag | documented | `12-runtime-flags.md:57` |
| F09 | flags_determinism | pull policy flag | documented | `12-runtime-flags.md:19` |
| F10 | flags_determinism | platform flag | documented | `12-runtime-flags.md:18` |
| F11 | flags_determinism | restart policy flag | documented | `12-runtime-flags.md:68` |
| F12 | flags_determinism | per-container log driver flag | documented | `12-runtime-flags.md:88` |
| F13 | flags_determinism | cgroup namespace flag | documented | `16-quick-reference.md:65` |
| F14 | flags_determinism | cgroup parent flag | documented | `16-quick-reference.md:66` |
| F15 | flags_determinism | pinned image identity | documented | `21-determinism-deep.md:9` |
| F16 | flags_determinism | normalized compose config | documented | `21-determinism-deep.md:13` |
| F17 | flags_determinism | environment precedence | documented | `21-determinism-deep.md:45` |
| F18 | flags_determinism | reproducible build controls | documented | `21-determinism-deep.md:63` |
| F19 | flags_determinism | rollback and replay gate | documented | `21-determinism-deep.md:80` |
| F20 | flags_determinism | measured determinism | unverified | `17-coverage-and-limits.md:49` |

Coverage: 19/20 documented (95%).

## 7. Security

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| S01 | security | daemon root equivalence | documented | `22-security-hardening-deep.md:5` |
| S02 | security | socket protection | documented | `04-security-hardening.md:7` |
| S03 | security | TLS remote access | documented | `04-security-hardening.md:9` |
| S04 | security | authorization plugin control | documented | `04-security-hardening.md:35` |
| S05 | security | secret exposure boundary | documented | `04-security-hardening.md:3` |
| S06 | security | rootless operation | documented | `04-security-hardening.md:39` |
| S07 | security | user namespace remap | documented | `03-isolation-and-runtime.md:12` |
| S08 | security | seccomp profile policy | documented | `03-isolation-and-runtime.md:27` |
| S09 | security | AppArmor policy | documented | `03-isolation-and-runtime.md:43` |
| S10 | security | capability reduction | documented | `22-security-hardening-deep.md:28` |
| S11 | security | read-only root filesystem | documented | `22-security-hardening-deep.md:30` |
| S12 | security | tmpfs for writable paths | documented | `12-runtime-flags.md:33` |
| S13 | security | non-root image user | documented | `22-security-hardening-deep.md:30` |
| S14 | security | network segmentation | documented | `22-security-hardening-deep.md:45` |
| S15 | security | supply-chain verification | documented | `22-security-hardening-deep.md:51` |
| S16 | security | audit and event trail | documented | `22-security-hardening-deep.md:53` |
| S17 | security | incident containment | documented | `22-security-hardening-deep.md:53` |
| S18 | security | untrusted workload handling | documented | `05-sandboxes.md:143` |
| S19 | security | sandbox governance | documented | `05-sandboxes.md:71` |
| S20 | security | live attack test | unverified | `17-coverage-and-limits.md:47` |

Coverage: 19/20 documented (95%).

## Sources

- https://docs.docker.com/manuals/
- https://docs.docker.com/engine/
- https://docs.docker.com/compose/
- https://docs.docker.com/build/
- https://docs.docker.com/reference/
- https://docs.docker.com/scout/
- https://docs.docker.com/dhi/
- https://docs.docker.com/ai/sandboxes/
- https://docs.docker.com/engine/logging/
- https://docs.docker.com/engine/security/
- https://docs.docker.com/engine/daemon/
