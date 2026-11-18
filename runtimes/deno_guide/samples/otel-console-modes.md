`console` auto instrumentation can be configured using the `OTEL_DENO_CONSOLE`
environment variable:

- `capture`: Logs are emitted to stdout/stderr and are also exported with
  OpenTelemetry. (default)
- `replace`: Logs are only exported with OpenTelemetry, and not emitted to
  stdout/stderr.
- `ignore`: Logs are emitted only to stdout/stderr, and will not be exported
  with OpenTelemetry.
