# 20 - Quick reference

This chapter is the in-work lookup surface. Every row resolves to the captured documentation
corpus; it is intentionally dense and does not repeat the narrative in chapters 01-17.

## Install and first run

| Task | Command | Evidence |
|---|---|---|
| Shell install (Linux) | `curl -fsSL https://deno.land/install.sh \| sh` | `docs/rt_runtime__getting_started__installation.md:24-26` |
| npm global install | `npm install -g deno` | `docs/rt_runtime__getting_started__installation.md:28-32` |
| Nix shell | `nix-shell -p deno` | `docs/rt_runtime__getting_started__installation.md:34-38` |
| Run a TypeScript file | `deno run main.ts` | `docs/rt_runtime__fundamentals__security.md:71-74` |
| Run with one host allowed | `deno run --allow-net=example.com main.ts` | `docs/rt_runtime__fundamentals__security.md:76-80` |
| Start REPL | `deno repl` | `docs/rt_runtime__reference__cli.md:19-20` |
| Evaluate inline code | `deno eval` | `docs/rt_runtime__reference__cli.md:20` |

The runtime landing page states that `.ts` execution needs no `tsc`, build step or config, and that
the sandbox blocks file, network and environment access until granted
(`docs/rt_runtime__index.md:32-39`). That is the default mental model for every command above.

## Execution and dependency commands

| Group | Commands | Evidence |
|---|---|---|
| Execution | `run`, `serve`, `task`, `repl`, `eval` | `docs/rt_runtime__reference__cli.md:14-20` |
| Dependencies | `add`, `approve-scripts`, `audit`, `bump-version`, `install`, `uninstall`, `remove`, `outdated`, `why` | `docs/rt_runtime__reference__cli.md:22-40` |
| Tooling | `bench`, `check`, `compile` | `docs/rt_runtime__reference__cli.md:42-48` |
| Quality | `lint`, `fmt`, `test`, `coverage` | `docs/rt_runtime__reference__cli__lint.md:42-51` |

`deno cache` is deprecated in favor of `deno install`
(`docs/rt_runtime__reference__cli.md:30-33`). Scripts installed as executables land under
`$DENO_INSTALL_ROOT/bin` unless the root already ends in `bin`
(`docs/rt_runtime__reference__env_variables.md:144`).

## Permission shorthands

| Intent | Flag | Evidence |
|---|---|---|
| Allow one network host | `--allow-net=example.com` | `docs/rt_runtime__fundamentals__security.md:76-80` |
| Allow one read directory | `--allow-read=./data` | `docs/rt_runtime__fundamentals__security.md:82-85` |
| Allow one environment variable | `--allow-env=API_KEY` | `docs/rt_runtime__fundamentals__security.md:82-85` |
| Deny a path inside an allowed tree | `--allow-read --deny-read=/etc` | `docs/rt_runtime__fundamentals__security.md:109-111` |
| Disable sandbox entirely | `-A` / `--allow-all` | `docs/rt_runtime__fundamentals__security.md:112-114` |
| Read all files | `-R` / `--allow-read` | `docs/rt_runtime__reference__permissions.md:102-105` |
| Write selected files | `--allow-write=foo.txt,bar.txt` | `docs/rt_runtime__reference__permissions.md:137-145` |
| Deny every read | `--deny-read` | `docs/rt_runtime__reference__permissions.md:131-133` |
| Use a named permission set | `-P=<name>` or `-P` for `default` | `docs/rt_runtime__reference__deno_json.md:707-733` |

A refused operation raises `Deno.errors.NotCapable`; the exact catch pattern is preserved in
`samples/sandbox-notcapable.ts` and in `docs/rt_runtime__fundamentals__security.md:87-99`. The named
permission-set contract is preserved in `samples/permission-sets.jsonc`.

## Configuration snippets

`deno.json` is discovered in the current directory or a parent; `--config` selects another file
(`docs/rt_runtime__fundamentals__configuration.md:68-73`). Tasks are commands plus permissions, as
shown in `samples/deno-json-tasks.json`.

| Field | Purpose | Evidence |
|---|---|---|
| `tasks` | Named commands run by `deno task` | `docs/rt_runtime__reference__deno_json.md:191-208` |
| `imports` | Bare-specifier and path mappings | `docs/rt_runtime__reference__deno_json.md:67-89` |
| `lint` | Rule tags, include, exclude | `docs/rt_runtime__reference__cli__lint.md:63-87` |
| `fmt` | Formatter options such as `lineWidth` | `docs/rt_runtime__fundamentals__configuration.md:50-62` |
| `lock` | Lockfile path and behavior | `docs/rt_runtime__reference__deno_json.md:346-377` |
| `permissions` | Named allow/deny sets, Deno 2.5+ | `docs/rt_runtime__reference__deno_json.md:676-705` |
| `compilerOptions` | TypeScript compiler settings | `docs/rt_runtime__reference__deno_json.md:475-497` |
| `unstable` | Opt-in unstable feature list | `docs/rt_runtime__reference__deno_json.md:498-514` |

## Logging and telemetry

| Variable | Effect | Evidence |
|---|---|---|
| `OTEL_DENO=true` | Enable runtime telemetry | `docs/rt_runtime__fundamentals__open_telemetry.md:28-39` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf`, `http/json`, `grpc`, `console` | `docs/rt_runtime__fundamentals__open_telemetry.md:681-695` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector endpoint | `docs/rt_runtime__fundamentals__open_telemetry.md:681-682` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Authentication headers | `docs/rt_runtime__fundamentals__open_telemetry.md:697-698` |
| `OTEL_DENO_CONSOLE` | `capture`, `replace`, `ignore` | `docs/rt_runtime__fundamentals__open_telemetry.md:284-292` |
| `DENO_AUDIT_PERMISSIONS` | JSONL path or `otel` | `docs/rt_runtime__reference__env_variables.md:154` |
| `DENO_TRACE_PERMISSIONS` | Stack traces in permission audit | `docs/rt_runtime__reference__env_variables.md:155` |

The shortest collector-free instrumentation command is copied exactly in `samples/otel-quickstart.md`
and below:

`docs/rt_runtime__fundamentals__open_telemetry.md:47-49`
```sh
OTEL_DENO=true OTEL_EXPORTER_OTLP_PROTOCOL=console deno run my_script.ts
```

`samples/otel-console-modes.md` carries the three console modes; `samples/otel-console-exporter.md`
carries the zero-collector path. The docs no longer recommend `@std/log` for production systems
(`docs/rt_runtime__reference__std__log.md:12-15`).

## Performance and quality gates

| Flag or command | Effect | Evidence |
|---|---|---|
| `--cpu-prof` | Write a CPU profile on exit | `docs/rt_runtime__fundamentals__cpu_profiling.md:23-30` |
| `--cpu-prof-dir=<DIR>` | Choose profile directory | `docs/rt_runtime__fundamentals__cpu_profiling.md:26` |
| `--cpu-prof-interval=<MICROSECONDS>` | Sampling interval, default `1000` | `docs/rt_runtime__fundamentals__cpu_profiling.md:28` |
| `--cpu-prof-flamegraph` | Emit an interactive SVG flamegraph | `docs/rt_runtime__fundamentals__cpu_profiling.md:30` |
| `deno test --parallel` | Run test modules in parallel | `docs/rt_runtime__test.md:116-117` |
| `deno lint` | Non-zero exit on violations | `docs/rt_runtime__reference__cli__lint.md:42-51` |
| `deno fmt --check` | Fail when files need formatting | `docs/rt_runtime__reference__cli__lint.md:47-51` |

Lint tags, include and exclude are copied byte-for-byte into `samples/lint-rules.json`; the
precedence rule is that `exclude` disables a rule even when a tag includes it
(`docs/rt_runtime__reference__cli__lint.md:79-87`).

## Sources

- https://docs.deno.com/runtime/
- https://docs.deno.com/runtime/getting_started/installation/
- https://docs.deno.com/runtime/reference/cli/
- https://docs.deno.com/runtime/reference/cli/lint/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/runtime/fundamentals/configuration/
- https://docs.deno.com/runtime/fundamentals/security/
- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://docs.deno.com/runtime/fundamentals/cpu_profiling/
- https://docs.deno.com/runtime/reference/env_variables/
- https://docs.deno.com/runtime/test/
