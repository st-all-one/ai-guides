## Quick start

To enable the OpenTelemetry integration set the environment variable
`OTEL_DENO=true`:

```sh
OTEL_DENO=true deno run my_script.ts
```

This will automatically collect and export runtime observability data to an
OpenTelemetry endpoint at `localhost:4318` using Protobuf over HTTP
(`http/protobuf`).
