# 20 - Logs, Metrics, Tracing, and Diagnostics

Surfaces: raw logs (redacted at egress), a metadata-only audit ledger, and exporters `diagnostics-prometheus` (pull) + `diagnostics-otel` (OTLP/HTTP push).

## Log levels and destinations

- File JSON logs `openclaw-YYYY-MM-DD.log` in `<stateDir>/logs/`; `logging.file`/`logging.level`; rotate at `logging.maxFileBytes` (100 MB), 5 archives, 24h prune, hot reload (`pages/gateway/logging.md:59-61,81-83`).
- `--verbose` = console/WS only; file detail needs `logging.level: debug|trace`; `consoleLevel`/`consoleStyle`; WS shows failures/slow ≥1,000 ms/parse errors (`pages/gateway/logging.md:156-160,327-362`).
- Derived (arithmetic): 5×100 MB + 100 MB active ≈ 600 MB/series (`pages/gateway/logging.md:60`).

## Raw logs vs redaction; what must never be logged

- Raw files `0600`; redaction only at `logs.tail`, console, bundles, OTLP export; direct reads raw (`pages/gateway/logging.md:332-339`).
- `logging.redactPatterns` replaces default list; ≥18 chars → first 6 + last 4, shorter `***`; auth-header/AWS-key rules always apply; egress redaction always on (`pages/gateway/logging.md:347-351`; `pages/gateway/config-observability.md:94`).
- Never masked: tool args/results, transcripts, `.env` reads (size limits only); masked: config snapshots, audit output, CLI diagnostics, credential URLs (`pages/gateway/logging.md:341-345`).
- Bounded records carry IDs/sizes not content; WS summaries use char counts; Talk omits transcript/audio/ids (`pages/gateway/logging.md:102,122-125,355`).

## Tails, bundles, export, correlation

- `openclaw logs --follow [--json]` (defaults `--limit 200`, `--max-bytes 250000`, `--interval 1000`) tails over RPC; 5,000-line/1 MB cap, byte cursor; 8×/30 s reconnect (`pages/cli/logs.md:11-31,79-81`; `pages/gateway/logging.md:141-148`).
- `openclaw gateway diagnostics export [--output …] [--json]` → sanitized zip (summary/diagnostics.json/manifest/stability); content/credentials/ids omitted; `/diagnostics` needs exec approval (`pages/gateway/diagnostics.md:10-15,37-45,69-97`).
- `diagnostics-otel` = OTLP/HTTP protobuf + optional stdout JSONL; `diagnostics-prometheus` = protected pull (`pages/gateway/opentelemetry.md:11-22`).
- `model.usage` fields: `ts`, `usage`, `costUsd`, `trace` (`pages/gateway/opentelemetry/spans-and-events.md:159-211`). Chain: inbound `webhook.received` → `message.queued` → turn `run` → tool `tool.execution` → provider `model.call` → `message.delivery`; JSONL logs carry `traceId`/`spanId`/`parentSpanId`/`traceFlags` (`pages/gateway/opentelemetry/configuration.md:120-128`).

## OpenTelemetry

- `openclaw plugins install @openclaw/diagnostics-otel`, allow/enable + `diagnostics.enabled`/`otel.enabled`, endpoint, `http/protobuf`; traces/metrics on, logs off (`otel.logs: true`) (`pages/gateway/opentelemetry/setup.md:11-42`; `pages/gateway/opentelemetry/configuration.md:19-23`).
- Spans: `gateway.rpc.*`, `run`, `model.call`, `harness.run`, `tool.execution`, `message.processed`, `message.delivery`, `tool.loop`; model spans: prompt sizes (counts/chars), `observation_unit` (`request`|`turn`), usage, hashed ids — no raw ids (`pages/gateway/opentelemetry/spans-and-events.md:11-79,38-47`).
- Metrics: `openclaw.tokens`, `openclaw.cost.usd`, `openclaw.model_call.duration_ms`, `gen_ai.client.token.usage`, RPC/message histograms (`pages/gateway/opentelemetry/model-calls-and-metrics.md:253-281`).
- Privacy: no raw content default; `captureContent: true` adds redacted content + `gen_ai.conversation.id`/`openclaw.session.id`; system prompts/`thinking` excluded (`pages/gateway/opentelemetry/privacy-and-trace-context.md:45-113`). Authenticated WS injects `traceparent` per frame (post-handshake; `connect` ignores, `baggage` rejected) (`pages/gateway/opentelemetry/privacy-and-trace-context.md:11-24`):

Source — `pages/gateway/opentelemetry/privacy-and-trace-context.md:16-24`:
```json
{
  "type": "req",
  "id": "eval-item-42",
  "method": "agent",
  "params": {},
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

- Sampling: `sampleRate` (0–1), `flushIntervalMs` (≥1000 ms), collector filtering (`pages/gateway/opentelemetry/configuration.md:105-119`).

## Prometheus, Doctor, audit, health

- `GET /api/diagnostics/prometheus` (`text/plain; version=0.0.4; charset=utf-8`) needs auth + `operator.read`, never public; install plugin + `diagnostics.enabled`, restart; empty if off (`pages/gateway/prometheus.md:11-29,33-70,97-99`). Series: `openclaw_gateway_rpc_requests_total`, `openclaw_model_call_total`, `openclaw_prometheus_series_dropped_total` (`pages/gateway/prometheus.md:101-237`).
- `openclaw doctor`: findings + repairs; `--lint` read-only, `--fix` mutates, redacted exporter snapshot (`pages/cli/doctor.md:9-11,27-30`). Audit: metadata-only, 30d/100k rows, no content; `openclaw audit [--execution … --explain --json]`; identity/messages off by default (`pages/gateway/config-observability.md:28-39`; `pages/cli/audit.md:17-78`).
- Health: `openclaw status [--all|--deep]`, `openclaw health [--json]`, `/status`; probes `/health`/`/startup`/`/ready` (+`-z`); `/healthz 200` ≠ ready; readiness adds `coreReady`, `childRuntime.available`, state-DB/plugin gates (`pages/gateway/health.md:14-24,125-166,286-300`); repo `src/gateway/server/health-state.ts:32-40` scopes by audience/strength.

## Retention/cost and triage ladder

- Rotation 100 MB×5 + 24h prune; audit 30d/100k, 1,024-item ticks; OTel sampling/flush + collector filtering; bounded labels/dropped counters; metrics-only skip prompt sizes (`pages/cli/audit.md:258-267`; `pages/gateway/diagnostics.md:157-164`).
- Ladder: `logs → status → doctor --lint/--fix → audit --explain → triage`; triage excludes raw logs/secrets, pseudonymizes ids, no agent under `--json`/`--non-interactive` (`pages/cli/triage.md:11-18,44-48,129`).

## Signal-to-action

| signal | source | field/metric | redaction | evidence |
| --- | --- | --- | --- | --- |
| Raw log line | file `0600` | JSON line | tails redacted; file raw | `pages/gateway/logging.md:332-355` |
| Model usage | ledger/event | `usage`, `costUsd`, `trace` | metadata-only | `pages/gateway/opentelemetry/spans-and-events.md:159-211` |
| Provider call | `model.call` span | `observation_unit`, tokens | hashed ids, no text | `pages/gateway/opentelemetry/spans-and-events.md:38-47` |
| Delivery outcome | `message.delivery` | `outcome`, `errorCategory` | counts only | `pages/gateway/prometheus.md:169-171` |
| Readiness fail | `/readyz` | `failing`, `coreReady` | sensitive gated | `pages/gateway/health.md:286-300` |

| symptom | first command | next check | evidence |
| --- | --- | --- | --- |
| Gateway down | `openclaw status` | `logs --follow`, `doctor` | `pages/gateway/health.md:14-24` |
| No inbound | `openclaw channels status` | inspect ingress cause | `pages/gateway/health.md:113-121` |
| High cost | `openclaw status --usage` | `audit`, model metrics | `pages/cli/status.md:255-263` |
| Who ran tool | `openclaw audit --kind tool_action` | `--run … --explain` | `pages/cli/audit.md:44-55` |

## Sources

- https://docs.openclaw.ai/gateway/logging
- https://docs.openclaw.ai/gateway/diagnostics
- https://docs.openclaw.ai/gateway/prometheus
- https://docs.openclaw.ai/gateway/opentelemetry
- https://docs.openclaw.ai/gateway/opentelemetry/configuration
- https://docs.openclaw.ai/gateway/opentelemetry/spans-and-events
- https://docs.openclaw.ai/gateway/opentelemetry/privacy-and-trace-context
- https://docs.openclaw.ai/gateway/health
