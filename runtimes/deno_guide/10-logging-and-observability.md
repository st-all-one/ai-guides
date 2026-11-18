# 10 - Logging and observability

Pinned to Deno 2.9.3. Deno does not ship one logging backend: `console.*` writes to stdout/stderr, runtime diagnostics such as the inspector URL go to stderr, and the OpenTelemetry integration can export the same records with trace context (`docs/rt_runtime__fundamentals__open_telemetry.md:274-282`, `docs/rt_runtime__fundamentals__debugging.md:50-51`). Decide which stream you read before changing code.

## Streams, levels and sinks

| id | surface | user-visible behavior | evidence |
|---|---|---|---|
| L01 | `console.log` / `console.error` | both are auto-collected as log records when `OTEL_DENO=true`; the `console` methods are named explicitly | `docs/rt_runtime__fundamentals__open_telemetry.md:274-275` |
| L02 | console exporter output | records print to stderr in readable text with a bracketed level such as `[INFO]` | `docs/rt_runtime__fundamentals__open_telemetry.md:41-49`, `:58-61` |
| L03 | `OTEL_DENO_CONSOLE=capture` | default: a log goes to stdout/stderr **and** is exported | `docs/rt_runtime__fundamentals__open_telemetry.md:284-288` |
| L04 | `OTEL_DENO_CONSOLE=replace` | log is exported only; nothing appears on stdout/stderr | `docs/rt_runtime__fundamentals__open_telemetry.md:289-290` |
| L05 | `OTEL_DENO_CONSOLE=ignore` | log stays on stdout/stderr; no OTLP log record is emitted | `docs/rt_runtime__fundamentals__open_telemetry.md:291-292` |
| L06 | runtime-originated logs | debug logs and `Downloading` messages are collected alongside app logs | `docs/rt_runtime__fundamentals__open_telemetry.md:275-277` |
| L07 | fatal errors | any error that makes the runtime exit, from user code or from Deno itself, is exported as a log | `docs/rt_runtime__fundamentals__open_telemetry.md:278-279` |
| L08 | active span context | a `console.*` call inside an active span carries that span's trace context | `docs/rt_runtime__fundamentals__open_telemetry.md:281-282` |
| L09 | inspector banner | `Debugger listening on ws://...` is printed to stderr, not stdout | `docs/rt_runtime__fundamentals__debugging.md:50-56` |
| L10 | `--log-level=debug` | surfaces module resolution, network requests and permission checks while connecting an inspector | `docs/rt_runtime__fundamentals__debugging.md:399-408` |
| L11 | watch mode | the watcher prints change notices and error warnings in the console | `docs/rt_runtime__reference__cli__run.md:67-73` |
| L12 | custom streams | log streams other than `console.log` / `console.error` are not exported by the built-in integration | `docs/rt_runtime__fundamentals__open_telemetry.md:819-820` |

The console exporter's own output shows the scope and trace fields attached to a log line; this is the fastest way to verify instrumentation before pointing at a collector (`docs/rt_runtime__fundamentals__open_telemetry.md:53-61`):
```
SPAN inner span [00000000000000000000000000000001/0000000000000002] Internal 0.495ms
  parent: 0000000000000001
  scope: example-tracer
  key: value
LOG [INFO] 2025-03-14T13:47:07.235Z "hello from inner"
  scope: deno@2.7.5
  trace: 00000000000000000000000000000001/0000000000000002
```

## Request logs, audit records and structured fields

| id | mechanism | concrete output | evidence |
|---|---|---|---|
| L13 | request handler logging | `console.log("Method:", req.method)` and path/query/header/body lines inside `Deno.serve` give a per-request log | `docs/rt_runtime__fundamentals__http_server.md:64-83` |
| L14 | permission audit file | `DENO_AUDIT_PERMISSIONS=<path>` writes JSONL with `v`, `datetime` (RFC 3339), `permission`, `value` (`null` when absent) | `docs/rt_runtime__reference__permissions.md:55-68` |
| L15 | audit stack frames | `DENO_TRACE_PERMISSIONS=1` adds a `stack` array of frames to each audit entry | `docs/rt_runtime__reference__permissions.md:51-53`, `:70-72` |
| L16 | audit via exporter | `DENO_AUDIT_PERMISSIONS=otel` emits OTel log records with `deno.permission.type`, `deno.permission.value` and optional `deno.permission.stack` | `docs/rt_runtime__fundamentals__open_telemetry.md:294-310` |
| L17 | audit cost | stack collection is off by default because it has a performance hit; file mode is recorded regardless of allow or deny | `docs/rt_runtime__reference__env_variables.md:154-155` |
| L18 | CLI usage errors | `console.error("Usage: ...")` followed by `Deno.exit(2)` keeps machine-readable diagnostics off stdout | `docs/rt_runtime__cli_apps.md:110-121` |
| L19 | log batching | log record processor batching follows the OpenTelemetry specification environment variables | `docs/rt_runtime__fundamentals__open_telemetry.md:756-758` |

### Derived local check

The command below exercises both sinks in one run: the audit record goes through the configured exporter while `console.*` stays visible because `capture` is the default (`derived` from `docs/rt_runtime__fundamentals__open_telemetry.md:284-292`, `:308-310`):
```
OTEL_DENO=true OTEL_DENO_CONSOLE=capture DENO_AUDIT_PERMISSIONS=otel deno run -A main.ts
```

## Library logger status and gaps

`@std/log` is labeled UNSTABLE in the standard library index, and its own page says it is no longer recommended and likely to be removed; the docs direct production systems to OpenTelemetry (`docs/rt_runtime__reference__std.md:78`, `docs/rt_runtime__reference__std__log.md:12-15`). The corpus page contains only that notice: it gives no logger, handler, formatter, or level API to reproduce here.

| id | gap | what to do instead | evidence |
|---|---|---|---|
| L20 | `@std/log` handler and formatter API | unverified: no documented handler, formatter, or level table for `@std/log` exists in the read corpus; use OTel log records and `OTEL_DENO_CONSOLE` for supported control | `10-logging-and-observability.md:60` |
| PIT1 | `replace` hides local output | a crashed process may leave no console trail; use `capture` while diagnosing | `docs/rt_runtime__fundamentals__open_telemetry.md:287-292` |
| PIT2 | custom log streams | an app-specific logger that bypasses `console.*` will not appear as an OTel log | `docs/rt_runtime__fundamentals__open_telemetry.md:819-820` |
| PIT3 | stderr interleave | inspector banners and console exporter output share stderr; split by the `LOG [LEVEL]` prefix when parsing | `docs/rt_runtime__fundamentals__debugging.md:50-56`, `docs/rt_runtime__fundamentals__open_telemetry.md:53-61` |

## Sources

- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://docs.deno.com/runtime/reference/permissions/
- https://docs.deno.com/runtime/fundamentals/http_server/
- https://docs.deno.com/runtime/fundamentals/debugging/
- https://docs.deno.com/runtime/reference/cli/run/
- https://docs.deno.com/runtime/reference/env_variables/
- https://docs.deno.com/runtime/reference/std/
- https://jsr.io/@std/log
- https://github.com/denoland/deno
- https://deno.com/
