# 16 - Quick reference

This chapter is the working surface: exact keys, flags and commands with the line that proves
them. It is a lookup table, not a policy; read the owning chapter before changing production
state. All tokens resolve against the capture described in `00-index.md`.

## 1. Daemon keys and flag equivalents

| Concern | Key or flag | Evidence |
|---|---|---|
| Config file location | `--config-file`, default `/etc/docker/daemon.json` | `pages/reference/cli/dockerd.md:31` |
| Persistent state root | `--data-root`, default `/var/lib/docker` | `pages/reference/cli/dockerd.md:40` |
| Execution state root | `--exec-root`, default `/var/run/docker` | `pages/reference/cli/dockerd.md:56` |
| Default OCI runtime | `--default-runtime`, default `runc` | `pages/reference/cli/dockerd.md:48` |
| Default log driver | `--log-driver`, default `json-file` | `pages/reference/cli/dockerd.md:82` |
| Daemon log format | `--log-format`, `text` or `json` | `pages/reference/cli/dockerd.md:83` |
| Socket group | `--group`, default `docker` | `pages/reference/cli/dockerd.md:62` |
| Socket listener | `--host` / `-H` | `pages/reference/cli/dockerd.md:64` |
| Authorization plugins | `--authorization-plugin` | `pages/reference/cli/dockerd.md:24` |
| Live restore | `--live-restore` | `pages/reference/cli/dockerd.md:81` |
| Feature switches | `--feature map` | `pages/reference/cli/dockerd.md:58` |
| cgroup namespace default | `--default-cgroupns-mode`, default `private` | `pages/reference/cli/dockerd.md:43` |
| Shm size default | `--default-shm-size`, default 64MiB | `pages/reference/cli/dockerd.md:49` |
| Stop timeout default | `--default-stop-timeout`, default 10 | `pages/reference/cli/dockerd.md:50` |
| Firewall backend | `--firewall-backend`, iptables or nftables | `pages/reference/cli/dockerd.md:59` |
| Debug mode | `--debug` / `-D` | `pages/reference/cli/dockerd.md:41` |

The 29.10.0 release changed loopback registry handling when `insecure-registries` is present
in `daemon.json`; an explicit empty list disables all default insecure registries
(`pages/engine/release-notes/29.md:23-30`).

## 2. Log rotation and drivers

| Concern | Value | Evidence |
|---|---|---|
| Rotation keys | `max-size`, `max-file` as strings | `samples/configure.md:57-58`, `pages/engine/logging/configure.md:84` |
| Rotation example | `json-file` with `10m` and `3` | `pages/engine/logging/drivers/json-file.md:47-55` |
| Driver default | `json-file` | `pages/reference/cli/dockerd.md:82` |
| Daemon log inspection | daemon log command | `pages/engine/daemon/logs.md` |
| Metrics endpoint | Prometheus scraping | `pages/engine/daemon/prometheus.md` |
| CLI telemetry | OpenTelemetry export | `pages/engine/cli/otel.md` |

## 3. Container flags with a direct safety effect

| Concern | Flag | Evidence |
|---|---|---|
| Drop capabilities | `--cap-drop` | `pages/reference/cli/docker/container/run.md:34` |
| Add capabilities | `--cap-add` | `pages/reference/cli/docker/container/run.md:33` |
| Read-only root | `--read-only` | `pages/reference/cli/docker/container/run.md:108` |
| Security options | `--security-opt` | `pages/reference/cli/docker/container/run.md:112` |
| `no-new-privileges` | `--security-opt="no-new-privileges=true"` | `pages/reference/cli/docker/container/run.md:1472` |
| AppArmor profile | `--security-opt="apparmor=PROFILE"` | `pages/reference/cli/docker/container/run.md:1471` |
| Seccomp profile | `--security-opt="seccomp=profile.json"` | `pages/reference/cli/docker/container/run.md:1475` |
| CPU limit | `--cpus` | `pages/reference/cli/docker/container/run.md:45` |
| CPU pinning | `--cpuset-cpus` | `pages/reference/cli/docker/container/run.md:46` |
| Memory limit | `-m`, `--memory` | `pages/reference/cli/docker/container/run.md:89` |
| Memory swap | `--memory-swap` | `pages/reference/cli/docker/container/run.md:91` |
| PID limit | `--pids-limit` | `pages/reference/cli/docker/container/run.md:101` |
| Network attach | `--network` | `pages/reference/cli/docker/container/run.md:95` |
| Network alias | `--network-alias` | `pages/reference/cli/docker/container/run.md:96` |
| Pull policy | `--pull`, default `missing` | `pages/reference/cli/docker/container/run.md:106` |
| Platform | `--platform` | `pages/reference/cli/docker/container/run.md:102` |
| Restart policy | `--restart`, default `no` | `pages/reference/cli/docker/container/run.md:109` |
| Per-container logging | `--log-driver` | `pages/reference/cli/docker/container/run.md:86` |
| cgroup namespace | `--cgroupns` | `pages/reference/cli/docker/container/run.md:36` |
| cgroup parent | `--cgroup-parent` | `pages/reference/cli/docker/container/run.md:35` |

## 4. Compose validation and activation

| Concern | Command or key | Evidence |
|---|---|---|
| Normalize and validate | `docker compose config` | `pages/reference/cli/docker/compose/config.md:18-20` |
| Quiet validation only | `-q`, `--quiet` | `pages/reference/cli/docker/compose/config.md:41` |
| Pin tags to digests | `--resolve-image-digests` | `pages/reference/cli/docker/compose/config.md:42` |
| Emit digest override | `--lock-image-digests` | `pages/reference/cli/docker/compose/config.md:31` |
| Print resolved services | `--services` | `pages/reference/cli/docker/compose/config.md:43` |
| Print active profiles | `--profiles` | `pages/reference/cli/docker/compose/config.md:40` |
| Profile rule | services without `profiles` are always enabled | `samples/profiles.md:6-10` |
| Profile constraint | `depends_on` requires a shared active profile | `samples/profiles.md:54-60` |
| Compose model reference | full service schema | `pages/reference/compose-file/services.md` |

## 5. Sandbox and image evidence

| Concern | Command or fact | Evidence |
|---|---|---|
| Outbound TCP default | all outbound TCP blocked unless allowed | `samples/defaults.md:18-22` |
| Outbound UDP default | disabled by default | `samples/defaults.md:18-20` |
| Active rules | `sbx policy ls` | `samples/defaults.md:24` |
| Credential injection | proxy injects headers, agent cannot read raw values | `samples/defaults.md:58-61` |
| SBOM attestation | generated and attached at build time | `samples/sbom.md` |
| List attestations | attestation listing command | `samples/verify.md:37-54` |
| Validate attestation | `--verify` with predicate type | `samples/verify.md:167-171` |
| Seccomp profile control | default profile and opt-out forms | `samples/seccomp.md` |
| Live restore | `live-restore` in `daemon.json` | `samples/live-restore.md:25-29` |
| Flag form is advisory | `dockerd --live-restore` is not recommended | `samples/live-restore.md:39` |

## Sources

- https://docs.docker.com/reference/cli/dockerd/
- https://docs.docker.com/reference/cli/docker/container/run.md
- https://docs.docker.com/reference/cli/docker/compose/config/
- https://docs.docker.com/reference/compose-file/profiles/
- https://docs.docker.com/engine/logging/configure/
- https://docs.docker.com/engine/logging/drivers/json-file/
- https://docs.docker.com/engine/daemon/logs/
- https://docs.docker.com/engine/daemon/prometheus/
- https://docs.docker.com/engine/cli/otel/
- https://docs.docker.com/engine/release-notes/29/
- https://docs.docker.com/ai/sandboxes/security/defaults/
- https://docs.docker.com/dhi/how-to/verify/
- https://docs.docker.com/build/metadata/attestations/sbom/
- https://docs.docker.com/engine/daemon/live-restore/
