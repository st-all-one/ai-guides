# 21 - Minimal verified cut

A dossier can be precise and still leave a team without a decision. This chapter converts the Deno
runtime material into the smallest verified model that covers the recurring artifacts: a project
config, a CLI invocation, a permission boundary, an observability setup and a CI gate. It derives
from the chapters, not from an unread source.

## Artifact contract

| Artifact | Data displayed | Real interaction | Model requirement |
|---|---|---|---|
| `deno.json` | Tasks, imports, lint, fmt, permissions | `deno task`, `deno lint`, `deno fmt` | One config object with named sections |
| CLI invocation | Command, flags, target path | `deno run`, `deno test`, `deno compile` | Command + scoped capability tokens |
| Permission set | Named allow/deny entries | `deno run -P=<name>` | Config key plus CLI reference, no duplicate store |
| OTel setup | Endpoint, protocol, headers, console mode | `OTEL_DENO=true deno run ...` | Environment token set, no app-level registry |
| Log flow | Console output, runtime logs, exit errors | stdout/stderr or exporter | One signal model with mode selector |
| HTTP server | Handler, route, stream, TLS options | `Deno.serve` and request handling | Runtime API contract, no framework model |
| CI gate | Lint, format, tests, coverage | Three documented commands | Ordered commands with exit-status semantics |
| CPU profile | Directory, filename, interval, report format | `deno run --cpu-prof ...` | Flag set with default values |

Eight artifacts are listed. Six are projections of one config-plus-invocation core: `deno.json`,
CLI invocation, permission set, OTel setup, log flow and CI gate all reduce to named settings plus
command-line or environment tokens. The two exceptions are the HTTP server handler contract and
the CPU profiling output contract, which are runtime APIs rather than configuration projections.
The ratio is therefore 6/8 projections and 2/8 models with their own shape.

`docs/rt_runtime__fundamentals__configuration.md:46-62`
```json title="deno.json"
{
  "tasks": {
    "dev": "deno run --watch main.ts"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1"
  },
  "fmt": {
    "lineWidth": 100
  }
}
```

## Simplest model that covers all artifacts

Use one **runtime contract** with three layers:

1. **Config core** — `deno.json` holds tasks, imports, lint, fmt, compiler options and named
   permissions. The field families are enumerated in
   `docs/rt_runtime__fundamentals__configuration.md:75-99`.
2. **Capability tokens** — `--allow-*`, `--deny-*` and `-P=<name>` express what a process may touch.
   Scoped flags are documented in `docs/rt_runtime__fundamentals__security.md:64-85`; named sets are
   documented in `docs/rt_runtime__reference__deno_json.md:676-733`.
3. **Signal tokens** — `OTEL_DENO`, `OTEL_EXPORTER_OTLP_*` and `OTEL_DENO_CONSOLE` select where logs,
   traces and metrics go (`docs/rt_runtime__fundamentals__open_telemetry.md:676-698`).

Rejected alternatives:

- **A separate model per artifact.** Eight stores would duplicate task names, permission names and
  environment variables; the sources already use one config file and one process invocation.
- **A global permission matrix.** It would lose the path and host scoping that the allow flags carry
  (`docs/rt_runtime__reference__permissions.md:102-133`).
- **An app-level telemetry registry.** The runtime exports `console.*`, runtime logs and exit errors
  automatically once opted in (`docs/rt_runtime__fundamentals__open_telemetry.md:270-292`).
- **A wrapper around `deno lint`/`deno fmt`.** The documented CI gate is the three raw commands
  (`docs/rt_runtime__reference__cli__lint.md:42-51`).

## Sufficiency test

Each question below must be answerable from the three layers without adding a column:

1. Which config file is discovered from a nested directory? Answer: current directory or any parent
   (`docs/rt_runtime__fundamentals__configuration.md:68-73`).
2. How is a task defined? Answer: `tasks` in `deno.json`, executed by `deno task`
   (`docs/rt_runtime__reference__deno_json.md:191-208`).
3. How is one network host granted? Answer: `--allow-net=example.com`
   (`docs/rt_runtime__fundamentals__security.md:76-80`).
4. How is one path denied inside an allowed tree? Answer: `--allow-read --deny-read=/etc`
   (`docs/rt_runtime__fundamentals__security.md:109-111`).
5. How are named permissions reused? Answer: `-P=<name>` or `-P` for `default`
   (`docs/rt_runtime__reference__deno_json.md:707-733`).
6. How is a bare specifier mapped? Answer: `imports` in `deno.json`
   (`docs/rt_runtime__fundamentals__configuration.md:50-62`).
7. How is telemetry enabled? Answer: `OTEL_DENO=true`
   (`docs/rt_runtime__fundamentals__open_telemetry.md:28-39`).
8. How is a collector-free trace viewed? Answer: `OTEL_EXPORTER_OTLP_PROTOCOL=console`
   (`docs/rt_runtime__fundamentals__open_telemetry.md:43-49`).
9. Which console modes exist? Answer: `capture`, `replace`, `ignore`
   (`docs/rt_runtime__fundamentals__open_telemetry.md:284-292`).
10. How are permission accesses audited? Answer: `DENO_AUDIT_PERMISSIONS` as path or `otel`
    (`docs/rt_runtime__reference__env_variables.md:154`).
11. How is lint enforced in CI? Answer: `deno lint` with non-zero exit
    (`docs/rt_runtime__reference__cli__lint.md:42-51`).
12. How are lint rules tuned? Answer: `tags`, `include`, `exclude`
    (`docs/rt_runtime__reference__cli__lint.md:63-87`).
13. How are tests run in parallel? Answer: `deno test --parallel`
    (`docs/rt_runtime__test.md:116-117`).
14. How is a CPU profile emitted? Answer: `--cpu-prof` and optional dir/name/interval flags
    (`docs/rt_runtime__fundamentals__cpu_profiling.md:21-30`).
15. What is the minimal HTTP handler? Answer: `Deno.serve((_req) => new Response(...))`
    (`docs/rt_runtime__fundamentals__http_server.md:26-30`).

No question requires a new field. Two answers rely on runtime APIs rather than config, which is the
intended split identified above.

## Spec budget

| Document | Line ceiling | Rule |
|---|---:|---|
| `00-index.md` | 130 | Scope, contract and reading order only |
| `01`-`17` | 170 each | One concern per chapter; citation above every fence |
| `18-coverage-and-limits.md` | 130 | Measurement model, not new claims |
| `19-coverage-evidence.md` | 220 | Tables only; no narrative expansion |
| `20-quick-reference.md` | 150 | Lookup rows only |
| `21-minimal-verified-cut.md` | 130 | Decisions only; no new source facts |

Growth controls: derive command names from the CLI reference instead of restating them in every
chapter; keep one canonical sample per contract; store each environment variable once in chapter 20;
never move an answer from a chapter into the index without deleting the duplicate.

## Sources

- https://docs.deno.com/runtime/fundamentals/configuration/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/runtime/fundamentals/security/
- https://docs.deno.com/runtime/reference/permissions/
- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://docs.deno.com/runtime/reference/env_variables/
- https://docs.deno.com/runtime/reference/cli/lint/
- https://docs.deno.com/runtime/test/
- https://docs.deno.com/runtime/fundamentals/cpu_profiling/
- https://docs.deno.com/runtime/fundamentals/http_server/
