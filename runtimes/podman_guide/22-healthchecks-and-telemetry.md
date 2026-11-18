# 22 — Healthchecks and telemetry

Pinned to Podman v6.2.0 (`055de046`). Health state is **container-local** state computed by
libpod from a command run inside the container; it is not a cluster-level readiness signal.
Telemetry surfaces are `podman stats`, `podman system df/check/info/version`, `journald` and
`podman events` — there is no built-in metrics exporter (see §5).

## 1. States and the health model

| State | Meaning |
|---|---|
| `starting` | initial state; failures before `--health-start-period` ends keep the container here |
| `healthy` | the check succeeded (immediately on success, or after start period) |
| `unhealthy` | failures continue after `--health-start-period` (or after `--health-retries`) |

A successful early check sets `healthy` immediately; failures during the start period leave the
state `starting` until the period ends, then mark `unhealthy`
(`pages/markdown/podman-run.1.md:446-457`). Healthchecks are usually sourced from the image —
inspect `Config.Healthcheck` with `podman image inspect` — or defined at `run`/`create` time
(`pages/markdown/podman-healthcheck.1.md:5-12`). `--no-healthcheck` disables an image-defined
check. A timeout marks the check failed and sends `SIGKILL` to the check command if it runs long
(`pages/markdown/podman-run.1.md:476-481`).

Two check families exist: regular (continuous) and **startup** (`--health-startup-*`), which
gates the regular check and cannot be sourced from an image. Use `--health-start-period` for
predictable boot times and a startup check when boot time is unpredictable or needs a different
probe (`pages/markdown/podman-healthcheck.1.md:13-23`). Startup failures can trigger a restart
via `--health-on-failure` (`pages/markdown/podman-healthcheck.1.md:17-20`).

## 2. Flag matrix (`podman run` / `podman create`)

| Flag | Default | Effect |
|---|---|---|
| `--health-cmd` | from image or none | check command; string → `CMD-SHELL`, JSON array → `CMD`; `none` disables |
| `--health-interval` | `30s` | period between checks; `disable` = no timer |
| `--health-timeout` | `30s` | max check duration; overrun = failure + `SIGKILL` |
| `--health-retries` | `3` | failures before `unhealthy` |
| `--health-start-period` | `0s` | grace window; failures here stay `starting` |
| `--health-on-failure` | `none` | v6 action on transition to `unhealthy` |
| `--health-log-destination` | `local` | `local`, a directory, or `events_logger` |
| `--health-max-log-count` | `5` | stored attempts; `0` = unlimited |
| `--health-max-log-size` | `500` characters | stored log length; `0` = unlimited |
| `--health-startup-cmd` | none | startup probe; requires a regular check |
| `--health-startup-interval` | `0s` | startup probe period; `0s` = no timer |
| `--health-startup-retries` | `0` | failures before restart; `0` = never restart |
| `--health-startup-success` | `0` | successes before regular check starts; `0` = any |
| `--health-startup-timeout` | `30s` | startup probe deadline |

Sources: `pages/markdown/podman-run.1.md:416-481`. `--health-start-interval` is a Docker-compat
alias of `--health-startup-interval` (`pages/markdown/podman-run.1.md:444-445`). All timing
flags overwrite the image's healthcheck configuration
(`pages/markdown/podman-run.1.md:422-425`, `:443`, `:457`, `:481`).

### `--health-on-failure` actions

| Action | Effect |
|---|---|
| `none` | no action (default) |
| `kill` | kill the container |
| `restart` | restart it — **do not combine with `--restart`**; under systemd prefer `kill`/`stop` and let systemd restart |
| `stop` | stop the container |

Source: `pages/markdown/podman-run.1.md:435-440`. `--restart` policies (`no`, `never`,
`on-failure[:n]`, `always`, `unless-stopped`) apply to process exit, not health, and are
explicitly inactive after a user `stop`/`kill` (`pages/markdown/podman-run.1.md:1039-1051`).
Inside a Quadlet/systemd unit set `Restart=` in `[Service]` rather than `--restart`
(`pages/markdown/podman-run.1.md:1049-1051`).

## 3. Health log destination and bounded history

| Destination | Storage |
|---|---|
| `local` (default) | container state file, e.g. `$runroot/healthcheck.log` |
| directory | `<dir>/<container-ID>-healthcheck.log` |
| `events_logger` | written through the events logger, plus a default directory for performance at scale |

`--health-max-log-count=5` and `--health-max-log-size=500` bound the stored history; `0` disables
each bound (`pages/markdown/podman-run.1.md:426-434`). Logs can be changed on a running container
with `podman update --health-max-log-count=10 <container>`
(`pages/markdown/podman-healthcheck.1.md:30-32`). For critical services, keep a bounded history
and route `events_logger` to journald so transitions are captured outside the container state
(`derived` from the destination table and chapter 21).

Derived health-enabled service:
```bash
podman run -d --name api \
  --health-cmd='wget -q --spider http://127.0.0.1:8080/ready || exit 1' \
  --health-interval=10s --health-timeout=3s --health-retries=3 \
  --health-start-period=30s --health-on-failure=restart \
  --health-log-destination=events_logger --health-max-log-count=10 \
  --health-max-log-size=1000 \
  registry.example.com/team/api@sha256:<digest>
```

A JSON-array healthcheck example appears at `pages/markdown/podman-run.1.md:2002-2007`.

## 4. Verification: on-demand check and inspect

`podman healthcheck run <container>` executes the defined check manually; exit codes are
`0` success, `1` failure, `125` error (container missing, no check defined, or not running).
`--ignore-result` returns 0 regardless of result but still surfaces other errors
(`pages/markdown/podman-healthcheck-run.1.md:5-20`). For diagnosis use
`podman --log-level debug healthcheck run <container>`
(`pages/markdown/podman-healthcheck.1.md:24-29`).

`podman inspect` exposes `.Config.Healthcheck` (effective settings), `.State.Healthcheck`,
`.Config.StartupHealthCheck`, `.Config.HealthcheckOnFailureAction`, `.Config.HealthMaxLogCount`,
`.Config.HealthMaxLogSize`, `.Config.HealthLogDestination`; the compact health state is
`.State.Health.Status` (`pages/markdown/podman-healthcheck.1.md:24-26`). Format templates use
uppercase JSON field names (`pages/markdown/podman-inspect.1.md:18-20`).

Derived verification sequence:
```bash
podman inspect --format '{{.State.Health.Status}}' api
podman inspect --format '{{.Config.Healthcheck}} {{.Config.HealthcheckOnFailureAction}}' api
podman healthcheck run api; echo "exit=$?"
podman --log-level debug healthcheck run api
```

Health transitions also appear in events as `.HealthStatus` and in journald as
`PODMAN_HEALTH_STATUS` (`pages/markdown/podman-events.1.md:121-122`, `:177-178`).

## 5. Stats, disk, consistency and metrics limits

`podman stats` streams CPU, memory, block and PID usage; rootless cannot report **network**
statistics (`pages/markdown/podman-stats.1.md:6-9`).

| Command / flag | Meaning |
|---|---|
| `--format=json\|'table {{.ID}} {{.MemUsage}}'` | JSON or Go template; fields `.CPU`, `.CPUPerc`, `.MemUsageBytes`, `.MemLimit`, `.MemPerc`, `.NetIO`, `.BlockIO`, `.PIDs`, `.UpTime` |
| `--no-stream` | one snapshot; CPU is a coarse ~100 ms sample, not a 5 s average |
| `--interval=N` | seconds between reports; default `5` |
| `--all`, `-a` | include non-running containers |
| `--no-reset` | do not clear screen between intervals |

Sources: `pages/markdown/podman-stats.1.md:10-85`, `:97-122`. For sustained CPU monitoring use
streaming mode or the REST API with `stream=true`; the rootlesskit port handler attributes
forwarded traffic to `lo`, which is excluded from stats
(`pages/markdown/podman-stats.1.md:78-84`, `:119-122`).

| Command | Use | Caveat |
|---|---|---|
| `podman system df [-v] [--format]` | image/container/volume size and reclaimable space | image reclaimable size can be overstated when layers are shared |
| `podman system check [--quick] [--repair] [--max=dur] [--force]` | storage consistency; optionally remove damaged images | `--force` also removes containers depending on damaged images; `--quick` skips slow checks |
| `podman info --format` | host/storage/registries/version fact source | template fields capitalized, JSON lowercase |
| `podman version --format` | client/server version and API version | useful to prove host/machine parity |

Sources: `pages/markdown/podman-system-df.1.md:5-12`, `:30-31`, `:54-70`;
`pages/markdown/podman-system-check.1.md:5-28`; `pages/markdown/podman-info.1.md:9-25`, `:345`;
`pages/markdown/podman-version.1.md:6-18`.

Derived SLO-style probe and snapshot:
```bash
podman inspect --format '{{.State.Health.Status}}' api | grep -qx healthy || exit 1
podman healthcheck run api
podman stats --no-stream --format '{{.ID}} {{.MemPerc}} {{.CPUPerc}} {{.PIDs}}' api
podman system df --format '{{.Type}} {{.Size}} {{.Reclaimable}}'
podman system check --quick
```

Metrics integration limit (`derived` from the enumerated v6.2 surfaces): Podman provides no
native Prometheus scrape endpoint and no OTLP exporter. The available signals are `podman stats`
(CLI and REST), `podman events`, journald, `system df/check/info/version`. Export requires an
**external** consumer: a Prometheus exporter that polls `podman stats`/REST, a journald shipper,
or an events-to-telemetry bridge. An unhealthy state is not automatically an alert — generate
the alert from events/health status in that external layer.

## Pitfalls

- Health state is local to libpod; do not equate `healthy` with application readiness at the service mesh level.
- A check that outlives `--health-timeout` is killed and counted as a failure.
- `--health-on-failure=restart` plus `--restart` is explicitly discouraged; use systemd `Restart=` inside units.
- Switching `--rootful` or `--health-log-destination` changes where evidence lives; pin both in provisioning.
- `podman stats --no-stream` CPU is a ~100 ms snapshot; do not use it for sustained CPU SLOs.
- Rootless stats have no network data, and rootlesskit forwarding traffic on `lo` is not counted.
- `system df` reclaimable bytes may exceed what a prune actually frees with shared layers.
- `system check --repair --force` can delete running containers' dependencies; inspect before repair.
- No native Prometheus/OTLP export — an external exporter is mandatory.

## Sources

- `pages/markdown/podman-run.1.md:416-481`, `:1039-1051`, `:2000-2005`
- `pages/markdown/podman-healthcheck.1.md:5-32`
- `pages/markdown/podman-healthcheck-run.1.md:5-20`
- `pages/markdown/podman-inspect.1.md:18-20`
- `pages/markdown/podman-events.1.md:121-122`, `:177-178`
- `pages/markdown/podman-stats.1.md:6-85`, `:97-122`
- `pages/markdown/podman-system-df.1.md:5-12`, `:30-31`, `:54-70`
- `pages/markdown/podman-system-check.1.md:5-28`
- `pages/markdown/podman-info.1.md:9-25`, `:345`
- `pages/markdown/podman-version.1.md:6-18`
- https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- https://docs.podman.io/en/latest/markdown/podman-stats.1.html
