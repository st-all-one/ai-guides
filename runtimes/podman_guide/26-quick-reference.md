# 26 — Quick reference

Lookup tables for Podman v6.2.0 (commit `055de046`). Every row cites the captured source;
global flags must precede the subcommand (`pages/markdown/podman.1.md:15-20`). This is a
reference, not a tutorial — see chapters 24–25 for procedure and trade-offs.

## 1. Commands by object

### Container

| Command | Use | Source |
|---|---|---|
| `podman run [flags] image [cmd]` | Create + start; full flag matrix in ch. 8 | `pages/markdown/podman-run.1.md:985-990` |
| `podman create [flags] image [cmd]` | Create without starting | `pages/markdown/podman-create.1.md:4-6` |
| `podman start|stop|restart|kill|rm NAME` | Lifecycle; `kill`/`stop` do not trigger restart policies | `pages/markdown/podman-run.1.md:1041` |
| `podman ps -a --format ...` | List/filter containers | `pages/markdown/podman-ps.1.md:73`, `:181` |
| `podman inspect NAME --format ...` | Read JSON keys / state assertions | `pages/markdown/podman-inspect.1.md:18-20`, `:112-133` |
| `podman logs|attach|exec|cp|port NAME` | Observe and interact | `pages/markdown/podman-exec.1.md:4-6`, `pages/markdown/podman-logs.1.md:4-6` |
| `podman update [flags] NAME` | Change resource limits / healthchecks live | `pages/markdown/podman-update.1.md:4-8` |
| `podman stats|top|wait NAME` | Metrics, processes, exit code | `pages/markdown/podman-stats.1.md:4-6`, `pages/markdown/podman-wait.1.md:4-6` |
| `podman healthcheck run NAME` | On-demand check (exit 0/1/125) | `pages/markdown/podman-healthcheck-run.1.md:8-10` |
| `podman commit NAME image` | Snapshot container to image | `pages/markdown/podman-commit.1.md:4-6` |
| `podman pause|unpause|init|rename` | Process/state control | `pages/markdown/podman-pause.1.md:4-6` |

### Image

| Command | Use | Source |
|---|---|---|
| `podman pull [flags] image@digest` | Pull; policies `always|missing|never|newer` | `pages/markdown/podman-pull.1.md:9`, `:191-195` |
| `podman push [flags] image [dest]` | Push image/manifest to registry | `pages/markdown/podman-push.1.md:4-6` |
| `podman build [flags] -t image .` | Build; `--timestamp`, `--sbom`, `--layers` | `pages/markdown/podman-build.1.md:705-720`, `:909-912` |
| `podman images|image ls` | List local images | `pages/markdown/podman-images.1.md:4-6` |
| `podman image inspect --format ...` | Image metadata/tags/size | `pages/markdown/podman-inspect.1.md:118` |
| `podman tag|untag|rmi` | Tag/remove | `pages/markdown/podman-tag.1.md:9`, `pages/markdown/podman-rmi.1.md:4-6` |
| `podman save|load` | Archive to/from local storage | `pages/markdown/podman-save.1.md:4-6`, `pages/markdown/podman-load.1.md:4-6` |
| `podman image trust show|set` | Manage `policy.json` trust | `pages/markdown/podman-image-trust.1.md:10-25` |
| `podman manifest|artifact ...` | Multi-arch lists / OCI artifacts | `pages/markdown/podman-manifest.1.md:4-6`, `pages/markdown/podman-artifact.1.md:4-6` |

### Pod / Network / Volume / Secret

| Command | Use | Source |
|---|---|---|
| `podman pod create|start|stop|rm|ps` | Group containers with shared namespaces | `pages/markdown/podman-pod.1.md:4-8` |
| `podman pod inspect --format ...` | Pod state | `pages/markdown/podman-pod-inspect.1.md:4-6` |
| `podman network create --subnet ... name` | Fixed network object | `pages/markdown/podman-network-create.1.md:113-115` |
| `podman network ls|inspect|connect|disconnect|prune` | Network management | `pages/markdown/podman-network.1.md:4-7` |
| `podman volume create|ls|inspect|prune` | Named volumes | `pages/markdown/podman-volume-create.1.md:11-34`, `pages/markdown/podman-volume.1.md:4-6` |
| `podman volume export|import NAME` | Backup/restore volume data | `pages/markdown/podman-volume-export.1.md:4-6`, `pages/markdown/podman-volume-import.1.md:4-6` |
| `podman secret create|exists|inspect|ls|rm` | Secret lifecycle | `pages/markdown/podman-secret.1.md:5-18` |

### Machine / System / Kube / Compose / Quadlet

| Command | Use | Source |
|---|---|---|
| `podman machine init|start|set|ssh|stop|rm|list|inspect` | macOS/Windows VM lifecycle | `pages/markdown/podman-machine.1.md:4-8`, `pages/markdown/podman-machine-init.1.md:35-65` |
| `podman info|version` | Host/driver facts, version | `pages/markdown/podman-run.1.md:589-590`, `pages/markdown/podman-version.1.md:4-6` |
| `podman events --since ... --filter ...` | Audit stream | `pages/markdown/podman-events.1.md:147-151`, `:198-209` |
| `podman system df|check|prune|migrate|renumber|reset` | Storage health/maintenance | `pages/markdown/podman-system-check.1.md:4-14`, `pages/markdown/podman-system-df.1.md:55-67` |
| `podman system service --time N` | REST API service / socket activation | `pages/markdown/podman-system-service.1.md:6-26` |
| `podman kube play|down|generate|apply` | Kubernetes YAML workloads | `pages/markdown/podman-kube.1.md:4-8`, `pages/markdown/podman-kube-play.1.md:307` |
| `podman compose up|down ...` | External compose provider wrapper | `pages/markdown/podman-compose.1.md:6-9` |
| `podman quadlet print ...` | Inspect generated Quadlet state | `pages/markdown/podman-quadlet.1.md:4-8` |
| `systemctl --user daemon-reload` after editing `*.container` | Quadlet units are generated, not enabled | `samples/podman-quadlet-basic-usage.7.md:36-42`, `:59-60` |

## 2. Global flags and environment variables

| Flag (before subcommand) | Effect | Source |
|---|---|---|
| `--log-level=debug|info|warn|error|fatal|panic` | Global verbosity; default `warn` | `pages/markdown/podman.1.md:78` |
| `--root`, `--runroot`, `--storage-driver`, `--storage-opt` | Storage paths/driver; `--root`/`--storage-driver` clear config options | `pages/markdown/podman.1.md:80-104` |
| `--remote`, `-r`, `--connection`, `-c`, `--url` | Remote client / service endpoint | `pages/markdown/podman.1.md:33-36`, `:134-160` |
| `--events-backend=file|journald|none` | Events store | `pages/markdown/podman.1.md:37-40` |
| `--config`, `--module`, `--hooks-dir`, `--cdi-spec-dir` | Config/hooks/CDI discovery | `pages/markdown/podman.1.md:23-30`, `:42-50`, `:66` |
| `--runtime`, `--runtime-flag`, `--cgroup-manager` | OCI runtime selection | `pages/markdown/podman.1.md:25-27`, `:88-92` |

| Environment variable | Effect | Source |
|---|---|---|
| `CONTAINER_HOST` | Service URL; implies `--remote`; schema `ssh|tcp|unix` | `pages/markdown/podman.1.md:134-160` |
| `CONTAINER_SSHKEY` | SSH identity when `CONTAINER_HOST` is set | `pages/markdown/podman.1.md:66-69` |
| `PODMAN_USERNS` | Default user namespace mode | `pages/markdown/podman-run.1.md:1474` |
| `PODMAN_COMPOSE_PROVIDER`, `PODMAN_COMPOSE_WARNING_LOGS` | Compose provider / warning toggle | `pages/markdown/podman-compose.1.md:8-9` |
| `STORAGE_DRIVER`, `STORAGE_OPTS` | Storage defaults overridden by CLI flags | `pages/markdown/podman.1.md:99-104` |
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_RUNTIME_DIR` | Rootless config/data/runtime roots | `samples/rootless_tutorial.md:114-118`, `:151-154` |

## 3. Config file paths (root vs rootless)

| File | Root | Rootless | Source |
|---|---|---|---|
| `containers.conf` | `/usr/share/containers` defaults, `/etc/containers` overrides | `${XDG_CONFIG_HOME}/containers` (default `$HOME/.config/containers`) | `samples/rootless_tutorial.md:112-118`, `:129` |
| `storage.conf` | `/etc/containers/storage.conf` | `${XDG_CONFIG_HOME}/containers/storage.conf` | `samples/rootless_tutorial.md:137` |
| `registries.conf` | `/etc/containers/registries.conf` | `${XDG_CONFIG_HOME}/containers/registries.conf` | `samples/rootless_tutorial.md:161` |
| `policy.json` | `/etc/containers/policy.json` | user containers config dir | `pages/markdown/podman-image-trust.1.md:10` |
| `auth.json` | root auth path | `${XDG_RUNTIME_DIR}/containers/auth.json` | `samples/rootless_tutorial.md:166` |
| `graphroot` | `/var/lib/containers/storage` | `$HOME/.local/share/containers/storage` | `pages/markdown/podman.1.md:80-81`, `samples/rootless_tutorial.md:151` |
| `runroot` | `/run/containers/storage` | `/run/user/$UID/run` | `pages/markdown/podman.1.md:83-86` |
| network config | `/etc/containers/networks` | `$graphroot/networks` | `pages/markdown/podman.1.md:71-72` |
| service socket | `unix:///run/podman/podman.sock` | `unix:///run/user/$UID/podman/podman.sock` | `pages/markdown/podman.1.md:134` |
| Quadlet units | `/etc/containers/systemd` | `~/.config/containers/systemd` | `samples/podman-quadlet-basic-usage.7.md:36-42` |

## 4. Flag defaults worth memorizing

| Flag / setting | Default | Source |
|---|---|---|
| `--pull` | `missing` | `pages/markdown/podman-run.1.md:986` |
| `--log-driver` | `journald` (`json-file` aliases `k8s-file`) | `pages/markdown/podman-run.1.md:587` |
| `--events-backend` | configured in `containers.conf` (`file`/`journald`/`none` allowed) | `pages/markdown/podman.1.md:37-40` |
| `--health-interval` | `30s` | `pages/markdown/podman-run.1.md:424` |
| `--health-retries` | `3` | `pages/markdown/podman-run.1.md:442` |
| `--health-on-failure` | `none` | `pages/markdown/podman-run.1.md:436` |
| `--health-max-log-count` / `--health-max-log-size` | `5` attempts / `500` chars (`0` = unlimited) | `pages/markdown/podman-run.1.md:431-434` |
| `--health-log-destination` | `local` | `pages/markdown/podman-run.1.md:426-430` |
| `--cpus` / `--memory` | `0.0` / `0` = no limit | `pages/markdown/podman-run.1.md:230-232`, `:628-633` |
| `--memory-swap` | double `--memory` | `pages/markdown/podman-run.1.md:644-650` |
| `--pids-limit` | `2048` where cgroup controller exists | `pages/markdown/podman-run.1.md:899-901` |
| `--read-only-tmpfs` | `true` with `--read-only` | `pages/markdown/podman-run.1.md:1000-1001` |
| `--rm` | `false` | `pages/markdown/podman-run.1.md:1058-1060` |
| `--retry` | `3` (pull/push) | `pages/markdown/podman-run.1.md:1052-1054` |
| `--restart` | `no` | `pages/markdown/podman-run.1.md:1043` |
| `--userns` | pod → `PODMAN_USERNS` → `containers.conf` → `host` | `pages/markdown/podman-run.1.md:1472-1477` |
| `--cgroup-manager` | `systemd` | `pages/markdown/podman.1.md:25-26` |
| `--log-level` | `warn` | `pages/markdown/podman.1.md:78` |
| `--rollback` (auto-update) | `true` | `pages/markdown/podman-auto-update.1.md:116-117` |

## 5. Output formats and exit checks

`--format` uses Go templates over the JSON keys of the object; the same keys work in
`inspect`, `ps`, and system commands (`pages/markdown/podman-inspect.1.md:18-20`).

Source: `pages/markdown/podman-run.1.md:589-590`
```bash
$ podman info --format '{{ .Host.LogDriver }}'
journald
```

| Object | Template example | Source |
|---|---|---|
| Image | `podman image inspect --format "size: {{.Size}}" alpine` | `pages/markdown/podman-inspect.1.md:118-120` |
| Container | `podman container inspect myContainer --format {{.State.OOMKilled}}` | `pages/markdown/podman-inspect.1.md:123-124` |
| Container caps | `podman container inspect --latest --format {{.EffectiveCaps}}` | `pages/markdown/podman-inspect.1.md:121-122` |
| Container list | `podman ps -a --format "{{.ID}} {{.Image}} {{.Labels}} {{.Mounts}}"` | `pages/markdown/podman-ps.1.md:181-183` |
| Pod membership | `podman ps --format "{{.Names}} is in pod {{.PodName}} ({{.Pod}})"` | `pages/markdown/podman-ps.1.md:263-265` |
| Health | `podman inspect --format '{{.State.Health.Status}} {{.Config.Healthcheck}}' NAME` | `pages/markdown/podman-healthcheck.1.md:26` |
| Disk | `podman system df --format "{{.Type}}\t{{.Total}}"` / `--format json` | `pages/markdown/podman-system-df.1.md:55-60` |
| Events | `podman events --format json` | `pages/markdown/podman-events.1.md:209` |

| Exit signal | Meaning | Source |
|---|---|---|
| healthcheck run `0` / `1` / `125` | success / failed / internal error | `pages/markdown/podman-healthcheck-run.1.md:8-10` |
| `podman wait` | prints container exit code | `pages/markdown/podman-wait.1.md:4-6` |
| `podman container inspect --format {{.State.ExitCode}}` | last exit code from state | `pages/markdown/podman-container-inspect.1.md:122`, `:95` |
| `podman healthcheck run` with `--log-level=debug` | failure diagnosis | `pages/markdown/podman-healthcheck.1.md:28` |

A `derived` exit-check snippet for CI (no source token — composed from the cited keys):
```bash
podman pull --policy never "$IMG@$DIGEST" || exit 1
podman run -d --name api --pull=never --health-cmd='curl -fsS http://127.0.0.1/health' \
  --health-on-failure=stop "$IMG@$DIGEST" || exit 1
podman healthcheck run api || exit 1
test "$(podman inspect api --format '{{.State.Health.Status}}')" = healthy
test "$(podman inspect api --format '{{.State.ExitCode}}')" = 0
```

## 6. Site command catalogue

The site's `Commands` page is a compact catalogue of global options, environment variables, exit
codes and configuration files, followed by the per-command one-line index
(`pages/Commands.md:2-6`). Use it for discovery; the per-command man-page extractions under
`pages/markdown/` remain the citable authority for flags and defaults.

## Pitfalls

- Global flags after the subcommand are passed to the subcommand, not interpreted globally.
- `--format` key names differ by object; an empty value often means a wrong key, not a missing value.
- `podman generate systemd` is deprecated — use Quadlet (`pages/markdown/podman-generate-systemd.1.md:4-7`).
- `--root`/`--storage-driver` override (not merge with) `storage.conf` and `STORAGE_OPTS`.
- `podman compose` options belong to the provider; `podman compose --help` shows the provider's flags (`pages/markdown/podman-compose.1.md:10-11`).
- `latest` is implicit on untagged pull/tag operations (`pages/markdown/podman-pull.1.md:9`).

## Sources

- `pages/markdown/podman.1.md:14-20`, `:15-20`, `:23-50`, `:66-69`, `:71-72`, `:78-104`, `:134-160` — https://docs.podman.io/en/latest/markdown/podman.1.html
- `pages/markdown/podman-run.1.md:230-232`, `:416-443`, `:586-619`, `:628-650`, `:899-901`, `:985-990`, `:1000-1001`, `:1039-1060`, `:1052-1054`, `:1472-1477` — https://docs.podman.io/en/latest/markdown/podman-run.1.html
- `pages/markdown/podman-inspect.1.md:18-20`, `:112-133`; `pages/markdown/podman-ps.1.md:73`, `:181-183`, `:263-265`; `pages/markdown/podman-container-inspect.1.md:95`, `:122`
- `pages/markdown/podman-pull.1.md:9`, `:191-195`; `pages/markdown/podman-push.1.md:4-6`; `pages/markdown/podman-build.1.md:705-720`, `:909-912`; `pages/markdown/podman-image-trust.1.md:10-25`
- `pages/markdown/podman-pod.1.md:4-8`; `pages/markdown/podman-network.1.md:4-7`; `pages/markdown/podman-network-create.1.md:113-115`; `pages/markdown/podman-volume.1.md:4-6`; `pages/markdown/podman-secret.1.md:5-18`
- `pages/markdown/podman-machine.1.md:4-8`; `pages/markdown/podman-machine-init.1.md:35-65`; `pages/markdown/podman-system-service.1.md:6-26`; `pages/markdown/podman-system-check.1.md:4-14`; `pages/markdown/podman-system-df.1.md:55-67`
- `pages/markdown/podman-kube.1.md:4-8`; `pages/markdown/podman-kube-play.1.md:307`; `pages/markdown/podman-compose.1.md:6-11`; `pages/markdown/podman-quadlet.1.md:4-8`; `pages/markdown/podman-generate-systemd.1.md:4-7`
- `pages/markdown/podman-events.1.md:147-151`, `:198-209`; `pages/markdown/podman-healthcheck.1.md:26-28`; `pages/markdown/podman-healthcheck-run.1.md:8-10`; `pages/markdown/podman-stats.1.md:4-6`; `pages/markdown/podman-wait.1.md:4-6`; `pages/markdown/podman-auto-update.1.md:116-117`
- `samples/rootless_tutorial.md:112-166`; `samples/podman-quadlet-basic-usage.7.md:36-42`, `:59-60`
