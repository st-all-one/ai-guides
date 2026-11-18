# 15 - operations-and-lifecycle

Lifecycle operations must be observable, reversible and bounded. This chapter pins inspection commands, health state, resource updates, prune scope, disk accounting, backup surface, logging boundary, upgrade/rollback and a deterministic checklist. Every fact resolves to a captured line.

## Observation surface

| Command | Purpose and key options | Evidence |
|---|---|---|
| `docker container inspect` | Detailed state; `-f/--format` templates, `-s/--size` adds file sizes | `pages/reference/cli/docker/container/inspect.md:3-5,23-26` |
| `docker container stats` | Live resource stream; `-a`, `--no-stream`, `--format`; stopped containers return no data | `pages/reference/cli/docker/container/stats.md:16-22,49-52` |
| `docker container top` | Running processes inside a container | `pages/reference/cli/docker/container/top.md:3-5,16` |
| `docker system events` | Real-time server events; `--since`, `--until`, `--filter`, `--format` | `pages/reference/cli/docker/system/events.md:3-5,197-204` |
| `docker container diff` | Filesystem changes since creation: `A` added, `D` deleted, `C` changed | `pages/reference/cli/docker/container/diff.md:16-28` |
| `docker container port` | List port mappings or one specific mapping | `pages/reference/cli/docker/container/port.md:3-5,16` |
| `docker system info` | Kernel, container/image counts, storage-driver pool data | `pages/reference/cli/docker/system/info.md:16-36` |

For detailed resource history use `/containers/(id)/stats`; the CLI subtracts cache from Linux memory while the API returns raw totals. `pages/reference/cli/docker/container/stats.md:22-38`

## Health state and updates

Health checks are set at creation with `--health-cmd`, `--health-interval`, `--health-retries`, `--health-start-period`, `--health-start-interval`, `--health-timeout`, or disabled with `--no-healthcheck`. `pages/reference/cli/docker/container/run.md:66-71,97` Current health is read with `docker inspect --format='{{.State.Health.Status}}'`; values are `starting`, `healthy`, `unhealthy`. `pages/engine/containers/run.md:1090-1093`, `pages/reference/cli/docker/container/ls.md:417-418` `docker update` dynamically changes CPU, memory, pids limit and restart policy; it is unsupported for Windows containers. `pages/reference/cli/docker/container/update.md:16-27,34-47`

## Prune scope and disk accounting

Docker is conservative: objects are not removed unless explicitly requested, so unused layers consume disk. `pages/engine/manage-resources/pruning.md:4-11`

| Command | Default scope | Narrowing |
|---|---|---|
| `docker image prune` | dangling images | `-a`; `--filter "until=24h"` |
| `docker container prune` | all stopped containers | `--filter "until=24h"` |
| `docker volume prune` | anonymous unused volumes | `--all`; `--filter "label!=keep"` |
| `docker network prune` | unused networks | `--filter "until=24h"` |
| `docker buildx prune` | dangling cache of selected builder | `--builder`, `--all` |
| `docker system prune` | stopped containers, unused networks, dangling images, build cache | `--volumes`, `-a`, `--filter` |

All rows: `pages/engine/manage-resources/pruning.md:13-210`, `pages/reference/cli/docker/system/prune.md:32-35` All prune commands prompt by default; `-f`/`--force` bypasses it. `pages/engine/manage-resources/pruning.md:37-38,196-197` `docker system prune` never removes volumes unless `--volumes` is given, and even then only anonymous ones. `pages/engine/manage-resources/pruning.md:161-167`

`docker system df` (`-v` for detail) reports columns `TYPE`, `TOTAL`, `ACTIVE`, `SIZE`, `RECLAIMABLE`; the documented example shows `Images 5 2 16.43 MB 11.63 MB (70%)` and `Local Volumes 2 1 36 B 0 B (0%)`. `pages/reference/cli/docker/system/df.md:36-41`

## Backup and restore surface

Volumes are the data boundary: a helper container with `--volumes-from` tars mounted data to a host directory, and a second helper untars it to restore. The backup command is `docker run --rm --volumes-from dbstore -v $(pwd):/backup ubuntu tar cvf /backup/backup.tar /dbdata`. `pages/engine/storage/volumes.md:714-758` State outside volumes lives under `data-root` (`/var/lib/docker` by default); embedded containerd keeps state in `/var/lib/docker/containerd/daemon`, so containers in a prior host containerd are not visible in embedded mode. `pages/engine/daemon/embedded-containerd.md:54-60`, `pages/reference/cli/dockerd.md:1117`

## Log shipping boundary

Daemon and container logs are separate. The daemon log comes from the journal (`journalctl -xu docker.service`) or Desktop `init.log`, where `dockerd`, `containerd` and other services are multiplexed with a `"component"` field. `pages/engine/daemon/logs.md:4-19` Container stdout is governed by the log driver: `json-file` is default and grows until `log-opts` set `max-size`/`max-file`; `local` rotates by default, or a driver ships to an aggregator. `pages/engine/install/linux-postinstall.md:246-263`, `pages/reference/cli/dockerd.md:1176-1188` `docker system events` streams lifecycle transitions such as `container create`, `container start`, `container kill`, `container die` and `container stop`. `pages/reference/cli/docker/system/events.md:231-237`

## Upgrade and rollback

Live restore spans only patch upgrades (`YY.MM.x`); major upgrades or skipped releases can leave containers unmanaged. `pages/engine/daemon/live-restore.md:43-58` Rollback means reinstalling a pinned version with `VERSION_STRING=...` and `apt install docker-ce=$VERSION_STRING`; the repository lists all versions. `pages/engine/install/ubuntu.md:148-163` Review deprecations first: a feature remains for at least one stable release before removal. `pages/engine/deprecated.md:18-28` Captured release line: 28.5.2 through 29.10.0. `pages/engine/release-notes/28.md:11`, `pages/engine/release-notes/29.md:11`

## Deterministic operational checklist

1. Snapshot `docker system info`, `docker system df` and `docker container inspect` for critical containers. `pages/reference/cli/docker/system/info.md:16-36`
2. Back up volumes and verify the archive before destructive work. `pages/engine/storage/volumes.md:714-758`
3. Bound resources with `docker update`; watch `docker system events` during change windows. `pages/reference/cli/docker/container/update.md:34-47`, `pages/reference/cli/docker/system/events.md:197-204`
4. Reclaim with scoped prunes (`--filter "until=24h"`) first; reserve `--volumes` for reviewed cases. `pages/engine/manage-resources/pruning.md:40-46,161-197`
5. Ship daemon logs and set container `log-opts` rotation before production traffic. `pages/engine/daemon/logs.md:8-13`
6. Upgrade on patch releases with live restore, or pin an exact version for rollback. `pages/engine/daemon/live-restore.md:43-58`

## Sources

- https://docs.docker.com/reference/cli/docker/container/inspect/
- https://docs.docker.com/reference/cli/docker/container/stats/
- https://docs.docker.com/reference/cli/docker/system/events/
- https://docs.docker.com/reference/cli/docker/system/df/
- https://docs.docker.com/reference/cli/docker/system/info/
- https://docs.docker.com/reference/cli/docker/system/prune/
- https://docs.docker.com/reference/cli/docker/container/update/
- https://docs.docker.com/reference/cli/docker/container/run/
- https://docs.docker.com/engine/manage-resources/pruning/
- https://docs.docker.com/engine/storage/volumes/
- https://docs.docker.com/engine/daemon/logs/
- https://docs.docker.com/engine/daemon/live-restore/
- https://docs.docker.com/engine/daemon/embedded-containerd/
- https://docs.docker.com/reference/cli/dockerd/
- https://docs.docker.com/engine/install/linux-postinstall/
- https://docs.docker.com/engine/install/ubuntu/
- https://docs.docker.com/engine/deprecated/
- https://docs.docker.com/engine/containers/run/
- https://docs.docker.com/reference/cli/docker/container/ls/
- https://docs.docker.com/engine/release-notes/28/
- https://docs.docker.com/engine/release-notes/29/
