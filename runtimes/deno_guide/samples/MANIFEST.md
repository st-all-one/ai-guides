# Sample manifest

Each file is a byte-identical slice of the captured Deno documentation corpus. Ranges are inclusive and one-based; no header or normalization was added. A sample is critical when it carries a contract that prose alone can distort.

| sample | origin | start | end | why critical |
|---|---|---:|---:|---|
| `sandbox-notcapable.ts` | docs/rt_runtime__fundamentals__security.md | 91 | 99 | Shows the exact `NotCapable` catch boundary for denied permission. |
| `permission-sets.jsonc` | docs/rt_runtime__reference__deno_json.md | 693 | 705 | Defines named permission sets and their boolean, array and object forms. |
| `deno-json-tasks.json` | docs/rt_runtime__reference__deno_json.md | 200 | 208 | Carries the executable command-and-permission contract behind `deno task`. |
| `otel-quickstart.md` | docs/rt_runtime__fundamentals__open_telemetry.md | 28 | 39 | Pins the opt-in variable, default collector endpoint and wire protocol. |
| `otel-console-exporter.md` | docs/rt_runtime__fundamentals__open_telemetry.md | 43 | 49 | Pins the zero-collector debugging path via the console exporter. |
| `otel-console-modes.md` | docs/rt_runtime__fundamentals__open_telemetry.md | 284 | 292 | Defines the three `OTEL_DENO_CONSOLE` modes and their stdout/stderr effects. |
| `lint-rules.json` | docs/rt_runtime__reference__cli__lint.md | 67 | 77 | Carries the exact `tags`/`include`/`exclude` precedence contract. |
| `deno-serve.ts` | docs/rt_runtime__fundamentals__http_server.md | 26 | 30 | Shows the minimal `Deno.serve` handler contract. |
