# 01 - Runtime architecture

Deno 2.9.3 ships as one self-contained executable: the guide calls it "a single binary executable with no external dependencies" for macOS, Linux and Windows on x64 and arm64 (`docs/rt_runtime__getting_started__installation.md:11-12`). Four layers matter when reasoning about startup, latency and failure: the V8 engine that executes JavaScript, the Rust host that drives it, an in-process TypeScript transpiler, and a permission boundary gating privileged operations.

## Host and engine split

The main `deno` repository is primarily Rust with JavaScript and TypeScript (`docs/rt_runtime__contributing.md:30-34`). Two low-level crates define the boundary: `rusty_v8` supplies "Rust bindings for the V8 JavaScript engine", and `serde_v8` provides "a bijection layer between V8 and Rust objects" built on `serde` (`docs/rt_runtime__contributing.md:61-72`). The linter and documentation generator are separate Rust crates the binary drives (`docs/rt_runtime__contributing.md:48-59`).

| Layer | Component | Documented role | Evidence |
|---|---|---|---|
| CLI host | `deno` repo | provides the CLI; Rust + JS + TS | `docs/rt_runtime__contributing.md:30-34` |
| Engine bindings | `rusty_v8` | low-level Rust bindings to V8 | `docs/rt_runtime__contributing.md:61-65` |
| Value bridge | `serde_v8` | V8↔Rust bijection via `serde` | `docs/rt_runtime__contributing.md:67-72` |
| Tooling | `deno_lint`, `deno_doc` | Rust behind `deno lint` and `deno doc` | `docs/rt_runtime__contributing.md:48-59` |
| Userland | `deno_std` | TS + Wasm analogue of libc++ | `docs/rt_runtime__contributing.md:36-40`, `docs/rt_runtime__contributing__architecture.md:16` |

## Process model: the Linux analogy

The architecture overview states the mapping directly; it is the shortest reliable description of how user code reaches the host (`docs/rt_runtime__contributing__architecture.md:8-18`).

| Linux concept | Deno concept | Operator meaning | Evidence |
|---|---|---|---|
| Processes | Web Workers | isolation unit for parallel work | `docs/rt_runtime__contributing__architecture.md:12` |
| Syscalls | Ops | privileged operations cross as ops | `docs/rt_runtime__contributing__architecture.md:13` |
| File descriptors | Resource ids (`rid`) | integer handles for files and sockets | `docs/rt_runtime__contributing__architecture.md:14`, `:22-25` |
| Scheduler | Tokio | async work driven by the Rust scheduler | `docs/rt_runtime__contributing__architecture.md:15` |
| Userland libc++ | `https://jsr.io/@std` | standard library lives in JSR | `docs/rt_runtime__contributing__architecture.md:16` |
| `/proc/$$/stat` | `Deno.metrics()` | in-process counters, not OS files | `docs/rt_runtime__contributing__architecture.md:17`, `:37-38` |

## Resources and metrics as hooks

A `rid` is "Deno's version of file descriptors" — integer values referring to open files, sockets and similar concepts (`docs/rt_runtime__contributing__architecture.md:22-25`). Closing stdin and reprinting the table is shown verbatim (`docs/rt_runtime__contributing__architecture.md:28-32`):
```ts
console.log(Deno.resources());
// { 0: "stdin", 1: "stdout", 2: "stderr" }
Deno.close(0);
console.log(Deno.resources());
// { 1: "stdout", 2: "stderr" }
```

`Deno.metrics()` is "Deno's internal counter for various statistics"; it separates dispatched from completed ops and reports byte counters (`docs/rt_runtime__contributing__architecture.md:37-38`). The documented console table (middle rows omitted) is verbatim (`docs/rt_runtime__contributing__architecture.md:40-55`):
```shell
> console.table(Deno.metrics())
┌─────────────────────────┬───────────┐
│          (idx)          │  Values   │
├─────────────────────────┼───────────┤
│      opsDispatched      │    9      │
…
│      bytesReceived      │   856     │
└─────────────────────────┴───────────┘
```

## Execution is not type checking

The two concerns are separate: `deno run` strips types and hands JavaScript to V8 in-process and cached, while `deno check` runs the real compiler without executing (`docs/rt_runtime__fundamentals__typescript.md:39-45`). Type errors therefore do not stop execution unless requested; stripped output stays in an internal cache and stack traces still point at `.ts` sources (`docs/rt_runtime__fundamentals__typescript.md:47-61`).

| Concern | Command path | Source treatment | Failure timing | Evidence |
|---|---|---|---|---|
| Execution | `deno run main.ts` | types stripped in-process, cached | runtime, at offending line | `docs/rt_runtime__fundamentals__typescript.md:41-43` |
| Checking | `deno check`, `deno run --check` | full compiler walks graph | before any code runs with `--check` | `docs/rt_runtime__fundamentals__typescript.md:44-45`, `:139-150` |
| Editor | Deno language server | same checker, inline | as you type | `docs/rt_runtime__fundamentals__typescript.md:32-35` |
| Tests | `deno test`, `deno bench` | type-check by default; `--no-check` skips | before tests | `docs/rt_runtime__fundamentals__typescript.md:152-157` |

## Permission boundary

Code runs with "no access to the network, filesystem, environment, or subprocesses" until granted; an ungranted operation stops and asks, or fails when prompts are disabled (`docs/rt_runtime__run.md:33-38`). Remote code is sandboxed identically — it receives no permissions unless granted (`docs/rt_runtime__run.md:103-104`). Config-time permission sets require explicit `-P` opt-in because a script could otherwise edit `deno.json` to elevate itself (`docs/rt_runtime__reference__deno_json.md:878-884`).

| Boundary | Default | Grant form | Short form | Evidence |
|---|---|---|---|---|
| Network | denied | `--allow-net=api.example.com` | `-N` | `docs/rt_runtime__run.md:44`, `:46` |
| Filesystem | denied | `--allow-read=./data` | `-R` | `docs/rt_runtime__run.md:45` |
| Environment | denied | `--allow-env` | `-E` | `docs/rt_runtime__run.md:46` |
| Subprocess | denied | `--allow-run` | not in cited slice | `docs/rt_runtime__run.md:35-37` |
| Sandbox bypass | n/a | `-A` / `--allow-all` | `-A` | `docs/rt_runtime__run.md:49-52` |

## Engine tuning knobs

`DENO_V8_FLAGS` sets V8 command-line options and `DENO_JOBS` sets the parallel worker count for `--parallel` (default CPU count) (`docs/rt_runtime__reference__env_variables.md:151-152`). The native TypeScript compiler behind `--unstable-tsgo` is the Go implementation, about ten times faster than the JavaScript compiler and integrated with Deno's module resolution (`docs/rt_runtime__fundamentals__typescript.md:159-166`).

## Sources

- https://docs.deno.com/runtime/contributing/architecture/
- https://docs.deno.com/runtime/contributing/
- https://docs.deno.com/runtime/getting_started/installation/
- https://docs.deno.com/runtime/fundamentals/typescript/
- https://docs.deno.com/runtime/fundamentals/security/
- https://docs.deno.com/runtime/reference/env_variables/
- https://docs.deno.com/runtime/reference/deno_json/
- https://github.com/denoland/deno
- https://github.com/denoland/rusty_v8
