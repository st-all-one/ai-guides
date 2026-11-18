# 21 — Logging and events

Pinned to Podman v6.2.0 (`055de046`). Two independent streams matter: **container logs**
(stdout/stderr, selected by `--log-driver`) and **engine events** (lifecycle records, selected by
`--events-backend` / `events_logger`). They use different storage and different query tools.

## 1. Container log drivers

Default is `journald`; confirm the live value with `podman info --format '{{ .Host.LogDriver }}'`
(`pages/markdown/podman-run.1.md:586-590`; `pages/markdown/podman-info.1.md:66-68`).

| Driver | Destination | Constraints / behavior |
|---|---|---|
| `journald` (default) | systemd journal | supports `--log-opt tag` and `label`; `tag` defaults to truncated container ID |
| `k8s-file` | file in container storage | `json-file` is an alias for scripting compatibility |
| `none` | discarded | no log retrieval |
| `passthrough` | inherited stdio of the client | forbidden with remote clients (macOS/Windows except WSL2) and on a TTY (TIOCSTI attack); `podman logs` has nothing to read |
| `passthrough-tty` | inherited stdio, TTY allowed | explicit opt-in to the TTY case |

Source: `pages/markdown/podman-run.1.md:586-594`; `samples/containers.conf:215-242`. Config
default for the engine is `[containers] log_driver` (sample shows `k8s-file` commented out) with
`log_path`, `log_size_max = -1` (unlimited; positive values must be ≥ 8192 bytes) and `log_tag`
(`samples/containers.conf:215-238`). CLI flags override config.

## 2. Rotation with `--log-opt`

| Option | Effect |
|---|---|
| `path=/abs/file` | log file path (journald/k8s-file storage) |
| `max-size=10mb` | size cap; sets `log_size_max` |
| `max-file=5` | number of rotated files kept; **requires conmon ≥ 2.2.0**; setting it implicitly enables rotation |
| `log-rotate=true` | numbered-suffix rotation instead of truncation; requires conmon ≥ 2.2.0 |
| `tag={{.ImageName}}` | custom journald tag; uses `podman inspect --format` keys |
| `label=KEY={{.ImageName}}` | custom journald label; repeatable |

If rotation is enabled without `max-file`, conmon keeps **one** backup by default
(`pages/markdown/podman-run.1.md:595-619`). `tag` and `label` are journald-only
(`pages/markdown/podman-run.1.md:611-619`). File-backend engine defaults are
`log_path=""` (removed with the container) and `log_size_max=-1`
(`samples/containers.conf:219-232`).

Derived bounded-log run:
```bash
podman run -d --name api --log-driver=k8s-file \
  --log-opt path=/var/log/containers/api/ctr.log \
  --log-opt max-size=10mb --log-opt max-file=5 --log-opt log-rotate=true \
  registry.example.com/team/api@sha256:<digest>
```

For journald, retention is a journald setting, not a Podman `log-opt`; size-capping the journal
and shipping it off-host is the production pattern (`derived` from the driver split above).
Never rely on `none` for a service you must debug.

## 3. Reading container logs

`podman logs` batch-retrieves current logs; ordering relative to `podman run` is not guaranteed
(`pages/markdown/podman-logs.1.md:6-10`).

| Flag | Effect |
|---|---|
| `--follow`, `-f` | stream new output; a `--rm` container may lose its final lines before the reader sees them |
| `--since=TS` / `--until=TS` | Unix timestamp, date format, or Go duration relative to the **client** clock |
| `--tail=N` | last N lines; default `-1` = all |
| `--timestamps`, `-t` | prefix timestamps |
| `--names`, `-n` / `--color` | prefix names / colorize output |
| `--latest`, `-l` | last created container; unavailable on remote clients |

Sources: `pages/markdown/podman-logs.1.md:11-39`. Accepted timestamp formats include
`RFC3339Nano`, `RFC3339`, `2006-01-02T15:04:05[.999999999]`, `2006-01-02Z07:00`, `2006-01-02`
(`pages/markdown/podman-logs.1.md:25-39`). Example invocations are verbatim at
`pages/markdown/podman-logs.1.md:53-80`.

Derived incident query:
```bash
podman logs --since 30m --until 5m --tail 200 --timestamps api
podman logs --follow --names api sidecar
```

## 4. Engine events: backends and event types

| Backend | Storage | Query |
|---|---|---|
| `journald` (default) | systemd journal, `SYSLOG_IDENTIFIER=podman` | `podman events`, `journalctl` |
| `file` | `<tmpdir>/events/events.log`; `events_logfile_path` override, rotated at `events_logfile_max_size` (default `1m`) | `podman events`, file tools |
| `none` | nothing recorded | `podman events` reports nothing |

`--events-backend=file|journald|none` is a global flag — it must precede the subcommand
(`pages/markdown/podman.1.md:37-40`, `:19-20`). `events_logger = "journald"` is the config
default; setting `events_container_create_inspect_data = true` (default `false`) adds an inspect
JSON payload to create events (`samples/containers.conf:562-569`;
`pages/markdown/podman-events.1.md:82-83`). Note the docs'
global-flag page lists `file|journald|none` while the events page says only `file` and `journald`
are accepted plus a disabling `none` — treat `none` as "off", not a queryable backend
(`pages/markdown/podman-events.1.md:7-12`).

Event types/statuses are extensive: container (`create`, `init`, `start`, `died`, `stop`, `kill`,
`remove`, `restart`, `exec`, `checkpoint`, `update`, …), pod, image (`pull`, `pull-error`, `push`,
`tag`, …), artifact, system (`refresh`, `renumber`), volume, secret, network
(`pages/markdown/podman-events.1.md:14-81`). `die` is mapped to `died` for Docker compatibility
(`pages/markdown/podman-events.1.md:85-108`).

| `podman events` flag | Effect |
|---|---|
| `--filter`, `-f` | `type=`, `event=`, `container=`, `image=`, `pod=`, `volume=`, `network=`, `label=`, `artifact=` |
| `--format` | JSON Lines or Go template with `.Time`, `.Type`, `.Status`, `.Name`, `.ID`, `.Image`, `.Attributes`, `.HealthStatus`, `.ContainerExitCode`, `.OOMKilled`, `.PodID`, `.Network`, `.Error`, `.ContainerInspectData` |
| `--since` / `--until` | RFC3339Nano or Go duration (`10m`, `5h`); with neither, only new events are shown |
| `--stream` | default true — keep reading past the last known event |
| `--no-trunc` | default true |

Filter and JSON format examples appear at `pages/markdown/podman-events.1.md:191-211`.
Derived examples:
```bash
$ podman events -f event=create
$ podman events --filter event=create --filter type=pod
$ podman events --since 5m
$ podman events --format json
```

Source: `pages/markdown/podman-events.1.md:191-211`. Note the filter example also shows
`volume create` matching `event=create` — combine with `type=` when you want containers only
(`pages/markdown/podman-events.1.md:192-196`).

## 5. Structured extraction, journald queries, retention limits

Journald events carry fields `PODMAN_EVENT`, `PODMAN_TYPE`, `PODMAN_TIME`, `PODMAN_NAME`,
`PODMAN_ID`, `PODMAN_EXIT_CODE`, `PODMAN_POD_ID`, `PODMAN_LABELS`, `PODMAN_HEALTH_STATUS`,
`PODMAN_CONTAINER_INSPECT_DATA`, `PODMAN_NETWORK_NAME` plus `SYSLOG_IDENTIFIER=podman`
(`pages/markdown/podman-events.1.md:155-182`).
Derived query patterns:
```bash
journalctl -t podman -o json --since '30 min ago'
journalctl -t podman -o json | jq -r 'select(.PODMAN_EVENT=="died") | .PODMAN_ID'
podman events --since 1h --format '{{.Time}} {{.Type}}/{{.Status}} {{.Name}} {{.ContainerExitCode}}'
podman events -f type=container -f event=died --format json >> /var/log/podman-events.jsonl
```

`--format json` emits JSON Lines (`pages/markdown/podman-events.1.md:208-211`); the Go template
fields are more selective than `{{json .}}`-style whole-object dumps, so prefer explicit fields
for stable parsers (`derived`). File-backend retention is bounded by `events_logfile_max_size`
with rotation deleting the old file; `none` records nothing
(`samples/containers.conf:550-560`).

Audit and tamper-evidence: Podman does **not** document signing, hashing or append-only audit
storage for either stream; journald and files are writable by privileged local actors, and the
file backend rotates/deletes by design (`derived` from the documented surfaces). For
tamper-evident auditing, ship events/logs to an external WORM or SIEM store and treat the local
journal as a cache. Alerting patterns (`derived`): consume `container/died` with non-zero
`.ContainerExitCode`, `.OOMKilled=true`, `.HealthStatus=unhealthy` transitions, and
`image/pull-error` as alerts; use `--since`/`--until` for replay and `--stream` for live tails.

Telemetry caveat (`derived` from the enumerated surfaces): Podman v6.2 has **no native OTLP
exporter and no built-in Prometheus metrics endpoint**. Telemetry leaves the host only through
external consumers — journald/log shippers, `podman events` consumers, or exporters that poll
`podman stats`/REST (see chapter 22). Do not label the journal as "metrics" or assume a scrape
endpoint exists.

## Pitfalls

- Container logs and engine events are separate stores; `podman logs` does not show lifecycle events and `events_logger=none` leaves no lifecycle trail.
- `passthrough` is unavailable on remote clients and on a TTY; use `passthrough-tty` only with an explicit trust decision.
- `json-file` is an alias of `k8s-file`, not the Docker implementation.
- `max-file` and `log-rotate` need conmon ≥ 2.2.0; enabling rotation without `max-file` keeps one backup.
- `--log-opt tag`/`label` are journald-only and silently irrelevant elsewhere.
- `--since`/`--until` durations are relative to the client clock — clock skew distorts incident windows.
- `--events-backend` and `--log-level` are global flags and must precede the subcommand.
- With no `--since`/`--until`, `podman events` shows only new events; use a time window for replay.
- `events_logger=none` means no events at all, not "write to a quiet file".
- No native OTLP/Prometheus export: build the exporter outside Podman.

## Sources

- `pages/markdown/podman-run.1.md:586-619`
- `pages/markdown/podman-logs.1.md:6-39`, `:53-80`
- `pages/markdown/podman-events.1.md:7-12`, `:14-83`, `:84-154`, `:155-182`, `:191-211`
- `pages/markdown/podman.1.md:19-20`, `:37-40`
- `pages/markdown/podman-info.1.md:66-68`
- `samples/containers.conf:215-238`, `:550-569`
- https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- https://docs.podman.io/en/latest/markdown/podman-events.1.html
- https://docs.podman.io/en/latest/markdown/podman-run.1.html
