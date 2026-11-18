# 06 - logging-and-telemetry

Scope: documented configuration and read paths for logs, events, daemon diagnostics and CLI telemetry. Exporters are configuration-only; none was run.

## Driver inventory and selection

Each daemon has one default driver, inherited by containers unless overridden (`pages/engine/logging/configure.md:4-8`). Built-in set (`pages/engine/logging/configure.md:190-202`):

| Driver | Capture path | Selection note |
|---|---|---|
| `json-file` | daemon JSON files | Default; no rotation unless configured (`pages/engine/logging/configure.md:10-23`) |
| `local` | daemon JSON files | Recommended against disk exhaustion; rotates by default (`pages/engine/logging/configure.md:25-30`) |
| `journald` / `syslog` | host journal or RFC 5424 server | Both need a host daemon; syslog metadata is limited (`pages/engine/logging/drivers/journald.md:4-7`, `pages/engine/logging/drivers/syslog.md:4-16`) |
| `fluentd` | Fluentd forward input | Structured records; `localhost:24224` default (`pages/engine/logging/drivers/fluentd.md:4-8`, `pages/engine/logging/drivers/fluentd.md:73-75`) |
| `gelf`, `awslogs`, `splunk`, `gcplogs`, `etwlogs` | remote or Windows endpoints | Inventory in `pages/engine/logging/configure.md:197-202` |
| `none` | none | `docker logs` returns nothing (`pages/engine/logging/configure.md:192`) |

Prefer `local` except for backward compatibility or Kubernetes-as-runtime hosts (`pages/engine/logging/configure.md:14-30`). Plugins extend the set via `docker plugin install` (`pages/engine/logging/plugins.md:11-16`).

## Configuration layers and precedence

Daemon defaults use `log-driver` and `log-opts` in `daemon.json`; `log-opts` values must be strings, including numbers and booleans (`pages/engine/logging/configure.md:32-38`, `pages/engine/logging/configure.md:80-84`):

Documented daemon example: `log-driver: json-file` with `log-opts` of `max-size=10m`, `max-file=3`, `labels=production_status`, `env=os,customer` (`pages/engine/logging/configure.md:54-62`).

Restart is required, and only containers created afterward are affected (`pages/engine/logging/configure.md:65-78`, `pages/engine/logging/configure.md:97-106`). Per-container overrides use `--log-driver` and repeated `--log-opt` on `run`/`create` (`pages/engine/logging/configure.md:108-120`). Verify with `docker info --format '{{.LoggingDriver}}'` or `docker inspect -f '{{.HostConfig.LogConfig.Type}}' <CONTAINER>` (`pages/engine/logging/configure.md:86-95`, `pages/engine/logging/configure.md:122-130`).

Delivery mode shares the option namespace: `mode=blocking` (default) or `mode=non-blocking`, with `max-buffer-size` default `1m`; a full buffer drops messages by design (`pages/engine/logging/configure.md:132-163`).

## Rotation keys and exact defaults

| Driver | Keys | Defaults |
|---|---|---|
| `json-file` | `max-size`, `max-file`, `labels`, `labels-regex`, `env`, `env-regex`, `compress` | `-1` (unlimited), `1`, `false`; `max-file` needs `max-size` (`pages/engine/logging/drivers/json-file.md:79-87`) |
| `local` | `max-size`, `max-file`, `compress` | `20m`, `5` (100 MB), compression on (`pages/engine/logging/drivers/local.md:8-10`, `pages/engine/logging/drivers/local.md:69-73`) |
| Dual-log cache | `cache-disabled`, `cache-max-size`, `cache-max-file`, `cache-compress` | `"false"`, `"20m"`, `"5"`, `"true"` (`pages/engine/logging/dual-logging.md:113-118`) |

File drivers reserve their files for the daemon; external readers risk corruption (`pages/engine/logging/drivers/json-file.md:17-22`, `pages/engine/logging/drivers/local.md:12-17`).

## Reading logs, dual logging, tags

`docker logs` batch-retrieves at execution time (`pages/reference/cli/docker/container/logs.md:18-21`). Flags: `--details`, `-f`, `--since`, `-n/--tail` (`all`), `-t/--timestamps`, `--until` (API 1.35+) (`pages/reference/cli/docker/container/logs.md:26-33`). Invalid `--tail` becomes `all`; timestamps are RFC3339Nano; `--since` accepts RFC3339, Unix time or Go durations (`pages/reference/cli/docker/container/logs.md:44-76`).

Dual logging uses `local` as a cache so `docker logs` works with remote drivers, enabled automatically when the driver cannot be read (`pages/engine/logging/dual-logging.md:6-11`, `pages/engine/logging/dual-logging.md:17-21`). Disabling it yields "configured logging driver does not support reading" (`pages/engine/logging/dual-logging.md:52-55`); it has no effect on readable drivers (`pages/engine/logging/dual-logging.md:144-148`). Cache writes are not retried (`pages/engine/logging/dual-logging.md:150-159`).

Tags default to the first 12 container-ID characters; templates support `{{.ID}}`, `{{.FullID}}`, `{{.Name}}`, `{{.ImageID}}`, `{{.ImageFullID}}`, `{{.ImageName}}`, `{{.DaemonName}}`; renames are not reflected (`pages/engine/logging/log_tags.md:4-33`). `labels`/`env` and regex variants add selected metadata (`pages/engine/logging/configure.md:165-181`).

## Health, events, daemon diagnostics

Health state is inspectable as `.State.Health.Status` and as `.State.Health` with `FailingStreak`, `Start`, `End`, `ExitCode`, `Output` (`pages/engine/containers/run.md:1090-1096`, `pages/engine/containers/run.md:1097-1120`); `health_status` is a container event (`pages/reference/cli/docker/system/events.md:44`).

`docker events` streams local- or Swarm-scoped events, last 256 returned (`pages/reference/cli/docker/system/events.md:18-24`). Container actions include `die`, `oom`, `kill`, `restart`, `update`, `health_status` (`pages/reference/cli/docker/system/events.md:30-56`). Same-key filters OR, cross-key AND (`pages/reference/cli/docker/system/events.md:162-168`); `--format json` emits JSON Lines (`pages/reference/cli/docker/system/events.md:187-194`).

Daemon logs: `journalctl -xu docker.service` on Linux, `init.log` on Desktop, Windows Event Log on Windows containers (`pages/engine/daemon/logs.md:4-13`). Desktop lines carry `component`, `level`, `msg`, `time` (`pages/engine/daemon/logs.md:15-33`). Debug uses `"debug": true` in `daemon.json`; `log-level` is `debug`, `info` (default), `warn`, `error`, `fatal`; send `SIGHUP` to reload, or start with `-D` (`pages/engine/daemon/logs.md:35-71`). `SIGUSR1` forces a stack trace without stopping the daemon (`pages/engine/daemon/logs.md:73-98`).

## Metrics and structured-logging boundary

Prometheus needs `"metrics-addr": "127.0.0.1:9323"` in `daemon.json`; `0.0.0.0` needs threat-model review (`pages/engine/daemon/prometheus.md:21-46`). Only Docker itself is monitored, names may change, and `engine_daemon_network_actions_seconds_count` is the sample metric (`pages/engine/daemon/prometheus.md:7-13`, `pages/engine/daemon/prometheus.md:120-125`). CLI OpenTelemetry is opt-in via `DOCKER_CLI_OTEL_EXPORTER_OTLP_ENDPOINT` (`pages/engine/cli/otel.md:6-14`, `pages/engine/cli/otel.md:28-43`).

`json-file` writes one JSON object per line with `log`, `stream`, `time`, one file per container (`pages/engine/logging/drivers/json-file.md:4-15`); `fluentd` adds `container_id`, `container_name`, `source`, `log` (`pages/engine/logging/drivers/fluentd.md:10-18`). Redaction boundary: drivers copy allowlisted `env`/`label` values into records (`pages/engine/logging/configure.md:165-181`), so only non-secret keys should be selected. Value-level masking by a driver is `unverified`.

## Sources

- https://docs.docker.com/engine/logging/configure/
- https://docs.docker.com/engine/logging/drivers/json-file/
- https://docs.docker.com/engine/logging/drivers/local/
- https://docs.docker.com/engine/logging/drivers/fluentd/
- https://docs.docker.com/engine/logging/dual-logging/
- https://docs.docker.com/engine/logging/log_tags/
- https://docs.docker.com/reference/cli/docker/container/logs/
- https://docs.docker.com/reference/cli/docker/system/events/
- https://docs.docker.com/engine/daemon/logs/
- https://docs.docker.com/engine/daemon/prometheus/
- https://docs.docker.com/engine/cli/otel/
