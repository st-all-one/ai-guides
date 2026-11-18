# 20 - logs-telemetry-deep

Scope: record structure, bounded retention, parsing, correlation and export surfaces documented by Docker. No exporter or collector was run; exporters are configuration-only.

## Record shape by surface

`json-file` writes one JSON object per stdout/stderr line with origin and timestamp, one file per container (`pages/engine/logging/drivers/json-file.md:4-8`):

Record fields: `log: "Log line is here\n"`, `stream: stdout`, `time: 2019-01-01T11:11:11.111111111Z` (`pages/engine/logging/drivers/json-file.md:10-14`).

| Surface | Fields carried |
|---|---|
| `fluentd` | `container_id`, `container_name`, `source`, `log` (`pages/engine/logging/drivers/fluentd.md:10-18`) |
| `journald` | `CONTAINER_ID`, `CONTAINER_ID_FULL`, `CONTAINER_NAME`, `CONTAINER_TAG`/`SYSLOG_IDENTIFIER`, `CONTAINER_PARTIAL_MESSAGE`, `IMAGE_NAME` (`pages/engine/logging/drivers/journald.md:9-19`) |
| `syslog` | priority, timestamp, hostname, facility, process name and PID, RFC 5424 (`pages/engine/logging/drivers/syslog.md:4-16`) |
| `docker events` | `status`, `id`, `Type`, `Action`, `Actor`; JSON Lines with `--format json` (`pages/reference/cli/docker/system/events.md:193-194`, `pages/reference/cli/docker/system/events.md:409-420`) |
| CLI OTel | `command.time` with `command.name`, `command.status.code`, three `*.isatty` attributes (`pages/engine/cli/otel.md:151-161`) |
| Docker Scout | gauges `scout_stream_vulnerabilities`, `scout_policy_compliant_images`, `scout_policy_evaluated_images` (`pages/scout/explore/metrics-exporter.md:11-17`) |
| Healthcheck | `Start`, `End`, `ExitCode`, `Output` per probe, `FailingStreak` (`pages/engine/containers/run.md:1094-1120`) |

## Rotation math (derived)

| Surface | Inputs | Derived bound |
|---|---|---|
| `json-file` default | `max-size=-1`, `max-file=1` (`pages/engine/logging/drivers/json-file.md:81-82`) | derived: no cap; disk grows with output |
| `json-file` tuned | `max-size=10m`, `max-file=3` (`pages/engine/logging/configure.md:55-61`) | derived: up to 3 × 10 MB ≈ 30 MB |
| `local` default | 20 MB × 5, compression on (`pages/engine/logging/drivers/local.md:8-10`, `pages/engine/logging/drivers/local.md:69-73`) | derived: ~100 MB/container before compression |
| Dual cache | `cache-max-size=20m`, `cache-max-file=5` (`pages/engine/logging/dual-logging.md:113-118`) | derived: ~100 MB cache per container, additional to remote sink |
| Read cost | rotated files decompressed on read (`pages/engine/logging/configure.md:206-208`) | derived: transient disk and CPU spike |

Compressed byte totals are `unverified`; host storage is the hard ceiling for file logs (`pages/engine/logging/configure.md:209-211`).

## Multiline and parsing

`awslogs-datetime-format` uses Python `strftime`: a matching start line plus following non-matching lines; it wins over `awslogs-multiline-pattern` (`pages/engine/logging/drivers/awslogs.md:156-169`). Codes include `%d`, `%Y`, `%H`, `%M`, `%S`, `%L` (`pages/engine/logging/drivers/awslogs.md:215-242`). The pattern variant uses a regex start line and is ignored if datetime format is set (`pages/engine/logging/drivers/awslogs.md:244-251`). Both regex-match every message and may hurt performance (`pages/engine/logging/drivers/awslogs.md:171-174`, `pages/engine/logging/drivers/awslogs.md:253-256`).

`docker logs --timestamps` adds RFC3339Nano (`pages/reference/cli/docker/container/logs.md:50-55`); events stream as JSON Lines (`pages/reference/cli/docker/system/events.md:187-194`). Derived: treat `log` as opaque text unless the app emits JSON; driver-side decoding is `unverified`.

## Correlation identifiers

`tag` defaults to the first 12 container-ID characters; templates include `{{.ID}}`, `{{.FullID}}`, `{{.Name}}`, `{{.ImageID}}`, `{{.ImageFullID}}`, `{{.ImageName}}`, `{{.DaemonName}}` (`pages/engine/logging/log_tags.md:4-24`). `labels`/`env` variants add metadata (`pages/engine/logging/configure.md:165-181`); `journald` carries full ID and image name (`pages/engine/logging/drivers/journald.md:12-19`). Derived: `{{.ImageName}}/{{.Name}}/{{.ID}}` plus labels is a join key; trace-ID propagation by log drivers is `unverified`. Renames are not reflected (`pages/engine/logging/log_tags.md:30-33`).

## OTLP and OpenTelemetry paths

CLI telemetry needs `DOCKER_CLI_OTEL_EXPORTER_OTLP_ENDPOINT` and is off by default (`pages/engine/cli/otel.md:6-14`, `pages/engine/cli/otel.md:26-38`). The sample stack runs an `otel/opentelemetry-collector` with OTLP receivers and a Prometheus exporter, queried as `command_time_milliseconds_total` (`pages/engine/cli/otel.md:57-90`, `pages/engine/cli/otel.md:151-161`). App traces use OTLP HTTP at `http://collector:4318/v1/traces` with a Jaeger exporter (`pages/guides/opentelemetry.md:4-8`, `pages/guides/opentelemetry.md:80-120`); BuildKit uses `JAEGER_TRACE` via `--driver-opt` (`pages/build/debug/opentelemetry.md:4-25`). Derived: these are separate pipelines; log drivers as OTLP exporters are `unverified`.

## Metrics exporters

The daemon endpoint uses `metrics-addr` (sample `127.0.0.1:9323`), monitors Docker only, and has unstable names (`pages/engine/daemon/prometheus.md:7-13`, `pages/engine/daemon/prometheus.md:21-46`). Scout serves HTTPS metrics at `/v1/exporter/org/<ORG>/metrics` with a PAT bearer token (`pages/scout/explore/metrics-exporter.md:30-39`, `pages/scout/explore/metrics-exporter.md:51-86`). `docker stats` and `/sys/fs/cgroup` provide local runtime signals (`pages/engine/containers/runmetrics.md:4-8`, `pages/engine/containers/runmetrics.md:23-34`).

## Sampling, flush and filtering

`mode=non-blocking` with `max-buffer-size` drops messages on a full buffer rather than blocking the app (`pages/engine/logging/configure.md:137-154`). Fluentd offers `fluentd-async`, `fluentd-buffer-limit`, `fluentd-retry-wait`, `fluentd-max-retries`, `fluentd-write-timeout` (`pages/engine/logging/drivers/fluentd.md:119-153`). Dual logging can lose cached lines and does not retry failed writes (`pages/engine/logging/dual-logging.md:150-159`); events stop at 256 (`pages/reference/cli/docker/system/events.md:23-24`). Derived: bounds come from buffers and files, not sampling; sampling rates are `unverified`.

## Sensitive data and log injection

Only listed `env`/`label` keys reach attributes (`pages/engine/logging/configure.md:165-181`), with `env` winning collisions in `journald` and `fluentd` (`pages/engine/logging/drivers/journald.md:71-73`, `pages/engine/logging/drivers/fluentd.md:107-112`). External tools must not edit file logs (`pages/engine/logging/drivers/json-file.md:17-22`). Derived: exclude secret-bearing keys and parse `log` as data; documented sanitization is `unverified`.

## Triage signals and retention tiers

| Signal | Surface |
|---|---|
| `die`, `kill`, `oom`, `restart`, `update`, `exitCode`/`signal` | events (`pages/reference/cli/docker/system/events.md:30-56`, `pages/reference/cli/docker/system/events.md:231-237`) |
| `health_status`, `.State.Health` | events, health state (`pages/engine/containers/run.md:1094-1120`) |
| Daemon hang | `SIGUSR1` stack trace (`pages/engine/daemon/logs.md:73-98`) |
| CLI / supply chain | `command.status.code`, Scout gauges (`pages/engine/cli/otel.md:151-161`, `pages/scout/explore/metrics-exporter.md:11-17`) |

Retention tiers (derived): `json-file` unbounded unless rotated (`pages/engine/logging/drivers/json-file.md:81-82`); `local` and dual cache ~100 MB/container each (`pages/engine/logging/drivers/local.md:8-10`, `pages/engine/logging/dual-logging.md:9-11`); external systems control `journald`, `syslog`, `fluentd` retention (`unverified`).

## Sources

- https://docs.docker.com/engine/logging/drivers/json-file/
- https://docs.docker.com/engine/logging/drivers/local/
- https://docs.docker.com/engine/logging/drivers/syslog/
- https://docs.docker.com/engine/logging/drivers/fluentd/
- https://docs.docker.com/engine/logging/drivers/awslogs/
- https://docs.docker.com/engine/logging/configure/
- https://docs.docker.com/engine/logging/dual-logging/
- https://docs.docker.com/reference/cli/docker/system/events/
- https://docs.docker.com/engine/cli/otel/
- https://docs.docker.com/scout/explore/metrics-exporter/
