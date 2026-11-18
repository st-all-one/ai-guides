If you want to quickly see OpenTelemetry output without setting up a collector,
you can use the built-in console exporter to print spans, logs, and metrics
directly to stderr in a human-readable format:

```sh
OTEL_DENO=true OTEL_EXPORTER_OTLP_PROTOCOL=console deno run my_script.ts
```
