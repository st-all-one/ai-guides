# 11 - OpenTelemetry

Pinned to Deno 2.9.3. Enable the integration with one variable and configure it entirely through environment variables; there is no SDK bootstrap call (`docs/rt_runtime__fundamentals__open_telemetry.md:30-39`, `:323-332`).

## Enabling and exporting

| id | setting | observable effect | evidence |
|---|---|---|---|
| T01 | `OTEL_DENO=true` | enables collection and export; without it no telemetry is produced | `docs/rt_runtime__fundamentals__open_telemetry.md:30-39` |
| T02 | default endpoint | `localhost:4318` using Protobuf over HTTP (`http/protobuf`) | `docs/rt_runtime__fundamentals__open_telemetry.md:37-39` |
| T03 | `OTEL_EXPORTER_OTLP_PROTOCOL=console` | prints spans, logs and metrics to stderr; no endpoint needed | `docs/rt_runtime__fundamentals__open_telemetry.md:41-49`, `:692-695` |
| T04 | `http/json` | exports JSON over HTTP to the configured endpoint | `docs/rt_runtime__fundamentals__open_telemetry.md:687` |
| T05 | `grpc` | Protobuf over HTTP/2, available in Deno 2.8+; default port 4317 | `docs/rt_runtime__fundamentals__open_telemetry.md:688-691` |
| T06 | `OTEL_EXPORTER_OTLP_HEADERS` | carries credentials when the collector requires authentication | `docs/rt_runtime__fundamentals__open_telemetry.md:697-698` |
| T07 | per-signal endpoints | `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, `..._TRACES_ENDPOINT`, `..._LOGS_ENDPOINT` override the shared endpoint | `docs/rt_runtime__fundamentals__open_telemetry.md:700-705` |
| T08 | service identity | `OTEL_SERVICE_NAME` sets `service.name` (else `<unknown_service>`); runtime adds `process.runtime.name`, `telemetry.sdk.name` and versions | `docs/rt_runtime__fundamentals__open_telemetry.md:710-722` |
| T09 | `OTEL_PROPAGATORS` | defaults to `tracecontext,baggage`; W3C trace context and baggage are the supported values | `docs/rt_runtime__fundamentals__open_telemetry.md:724-729` |
| T10 | `OTEL_TRACES_SAMPLER` | `always_on` is the default; `always_off`, `traceidratio` and the three `parentbased_*` variants are supported | `docs/rt_runtime__fundamentals__open_telemetry.md:731-739` |
| T11 | `OTEL_TRACES_SAMPLER_ARG` | ratio for ratio samplers, a number in `0..1`, default `1.0` | `docs/rt_runtime__fundamentals__open_telemetry.md:741-746` |
| T12 | `OTEL_METRIC_EXPORT_INTERVAL` | metric collection frequency in ms; default `60000` (60 seconds) | `docs/rt_runtime__fundamentals__open_telemetry.md:748-750` |
| T13 | exporter batching | span and log batch processors follow the OpenTelemetry specification environment variables | `docs/rt_runtime__fundamentals__open_telemetry.md:752-758` |

Sampling one tenth of traces is a one-line operational change (verbatim from `docs/rt_runtime__fundamentals__open_telemetry.md:744-746`):
```
OTEL_DENO=true OTEL_TRACES_SAMPLER=traceidratio OTEL_TRACES_SAMPLER_ARG=0.1 deno run -A main.ts
```

## Auto-instrumentation: spans and metrics

| id | signal | what Deno creates | evidence |
|---|---|---|---|
| T14 | server span | one span per `Deno.serve` request, named `${method}`, kind `server`, ending when response headers are sent | `docs/rt_runtime__fundamentals__open_telemetry.md:114-120` |
| T15 | server attributes | `http.request.method`, `url.full`, `url.scheme`, `url.path`, `url.query`, then `http.response.status_code` | `docs/rt_runtime__fundamentals__open_telemetry.md:122-132` |
| T16 | client span | `fetch()` spans named `${method}`, kind `client`, ending when headers arrive, with `http.status_code` after the response | `docs/rt_runtime__fundamentals__open_telemetry.md:165-183` |
| T17 | extra sources | incoming HTTP/2 over `node:http2` (2.9), `Deno.cron()` invocations (2.7) are traced too | `docs/rt_runtime__fundamentals__open_telemetry.md:108-112` |
| T18 | route naming | no automatic `http.route`; use `trace.getActiveSpan()`, `setAttribute("http.route", ...)` and `updateName()` in the handler | `docs/rt_runtime__fundamentals__open_telemetry.md:134-162` |
| T19 | HTTP metrics | `http.server.request.duration` (seconds), `http.server.active_requests` gauge, and request/response body size histograms in bytes; status or `error.type` attributes | `docs/rt_runtime__fundamentals__open_telemetry.md:191-268` |
| T20 | batch processor defaults | unverified: exact `OTEL_BSP_*` / batch log processor defaults were not in the read corpus; the docs only refer to the specification | `docs/rt_runtime__fundamentals__open_telemetry.md:752-758` |

### Derived collector configuration

This names the service, sends traces and metrics to distinct endpoints and shortens the metric interval (`derived` from `docs/rt_runtime__fundamentals__open_telemetry.md:700-750`):
```
OTEL_DENO=true OTEL_SERVICE_NAME=checkout \
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://collector:4318/v1/traces \
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://collector:4318/v1/metrics \
  OTEL_METRIC_EXPORT_INTERVAL=15000 deno run -A main.ts
```

## User-defined traces and metrics

No global provider setup is needed; Deno configures `npm:@opentelemetry/api@1` (version `1.x`) itself (`docs/rt_runtime__fundamentals__open_telemetry.md:323-336`). Create a tracer from the app or library name (verbatim from `docs/rt_runtime__fundamentals__open_telemetry.md:351-353`):
```
import { trace } from "npm:@opentelemetry/api@1";

const tracer = trace.getTracer("my-app", "1.0.0");
```

`startActiveSpan` makes the span active for nested spans; end it in `finally`, record exceptions in `catch`, and set status explicitly because `recordException` does not set `ERROR` (`docs/rt_runtime__fundamentals__open_telemetry.md:356-433`). `startSpan` needs `context.with` / `trace.setSpan` to become active (`:457-480`, `:652-671`). Attribute values accept strings, numbers, bigints, booleans and arrays (`:392-404`); events and links use `addEvent` / `addLink` (`:435-455`).

`metrics.getMeter("my-app", "1.0.0")` yields `Counter`, `UpDownCounter`, `Gauge`, `Histogram` and observable variants whose callbacks run before export (`docs/rt_runtime__fundamentals__open_telemetry.md:485-578`). Keep metric attributes low cardinality (`:515-524`). Propagation uses internal `AsyncContext` with automatic `fetch` / `Deno.serve` support, plus `propagation.extract` / `inject` (`:593-602`, `:760-810`).

## Known limits and gaps

- Trace links carry no attributes; metric exemplars are unsupported (`docs/rt_runtime__fundamentals__open_telemetry.md:812-818`).
- Only OTLP (`http/protobuf`, `http/json`, `grpc`) and `console` export (`docs/rt_runtime__fundamentals__open_telemetry.md:821-822`).
- Observable metrics are not collected on exit/crash; sync ones are (`docs/rt_runtime__fundamentals__open_telemetry.md:823-825`).
- Per-span attribute and event limit defaults to 128; other limit variables are ignored (`docs/rt_runtime__fundamentals__open_telemetry.md:826-831`).
- The `Deno.serve` server span has no OTel status; handler errors are not span events (`docs/rt_runtime__fundamentals__open_telemetry.md:836-839`).
- `http.route` cannot be set on the `fetch` client span (`docs/rt_runtime__fundamentals__open_telemetry.md:840-842`).

## Sources

- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://github.com/denoland/deno
- https://jsr.io/@opentelemetry/api
- https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- https://open-telemetry.github.io/opentelemetry-js/
- https://opentelemetry.io/
- https://deno.com/
- https://docs.deno.com/runtime/reference/env_variables/
- https://docs.deno.com/runtime/reference/permissions/
- https://docs.deno.com/runtime/reference/cli/run/
- https://docs.deno.com/runtime/reference/std/log/
