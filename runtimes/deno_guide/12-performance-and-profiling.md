# 12 - Performance and profiling

Pinned to Deno 2.9.3. Separate three questions: where CPU time goes (`--cpu-prof`), how fast a snippet runs (`deno bench`), and how much time is spent starting up and resolving dependencies (cache and engine settings). The built-in profiler is V8's, so its line numbers refer to transpiled JavaScript (`docs/rt_runtime__fundamentals__cpu_profiling.md:32-39`).

## CPU profiler flags

| id | flag | user-visible result | evidence |
|---|---|---|---|
| P01 | `--cpu-prof` | captures a profile during execution and writes it to disk on exit | `docs/rt_runtime__fundamentals__cpu_profiling.md:7-9`, `:25` |
| P02 | `--cpu-prof-dir=<DIR>` | writes profiles into `DIR`; implies `--cpu-prof`, default current directory | `docs/rt_runtime__fundamentals__cpu_profiling.md:26` |
| P03 | `--cpu-prof-name=<NAME>` | sets the filename; default `CPU.<timestamp>.<pid>.cpuprofile` | `docs/rt_runtime__fundamentals__cpu_profiling.md:17-19`, `:27` |
| P04 | `--cpu-prof-interval=<US>` | sampling interval in microseconds; default `1000` (1 ms), `100` for short functions | `docs/rt_runtime__fundamentals__cpu_profiling.md:28`, `:53-60` |
| P05 | `--cpu-prof-md` | adds a human-readable Markdown report next to the `.cpuprofile` | `docs/rt_runtime__fundamentals__cpu_profiling.md:29`, `:74-83` |
| P06 | `--cpu-prof-flamegraph` | adds a self-contained interactive SVG flamegraph | `docs/rt_runtime__fundamentals__cpu_profiling.md:30`, `:129-139` |
| P07 | output filename | example on disk: `CPU.1769017882255.25986.cpuprofile` | `docs/rt_runtime__fundamentals__cpu_profiling.md:17-19` |
| P08 | TypeScript source maps | report line numbers come from transpiled JS, not the original `.ts` | `docs/rt_runtime__fundamentals__cpu_profiling.md:32-39` |

Both `deno run` and `deno eval` accept the profiler flags (verbatim from `docs/rt_runtime__fundamentals__cpu_profiling.md:12-14`):
```
deno run --cpu-prof your_script.ts
# or with deno eval
deno eval --cpu-prof "for (let i = 0; i < 1e8; i++) {}"
```

### Derived profiling run

One run can emit all three artifacts at a higher sampling rate; the directory is created by the flag and the name makes before/after comparisons possible (`derived` from `docs/rt_runtime__fundamentals__cpu_profiling.md:41-60`, `:163-171`):
```
deno run -A --cpu-prof --cpu-prof-dir=./profiles \
  --cpu-prof-name=before.cpuprofile --cpu-prof-interval=100 \
  --cpu-prof-md --cpu-prof-flamegraph server.js
```

## Reading the profile

| id | artifact | how to use it | evidence |
|---|---|---|---|
| P09 | Markdown report | summary (duration, samples, interval, functions), Top 10, Hot Functions by self time, Call Tree by total time, Function Details | `docs/rt_runtime__fundamentals__cpu_profiling.md:119-127` |
| P10 | Chrome DevTools | F12, Performance tab, **Load profile**, select the `.cpuprofile` to get a flame chart and breakdown | `docs/rt_runtime__fundamentals__cpu_profiling.md:62-72` |
| P11 | SVG flamegraph | click a frame to zoom, **Reset Zoom**, Ctrl+F regex search, **Invert** for an icicle graph, hover for sample counts | `docs/rt_runtime__fundamentals__cpu_profiling.md:138-147` |
| P12 | interpretation | high self time marks the bottleneck; high total time with low self time means delegation; profile realistic traffic and long enough runs | `docs/rt_runtime__fundamentals__cpu_profiling.md:154-175` |
| P13 | `--strace-ops` | prints every op with `Dispatch` / `Complete` events and timing; useful for hangs and I/O-bound work | `docs/rt_runtime__fundamentals__debugging.md:410-425` |

## Benchmarks with `deno bench`

| id | feature | concrete behavior | evidence |
|---|---|---|---|
| P14 | registration | `Deno.bench("name", fn)`, named functions, or the long form `{ name, fn }`; async functions are supported via a returned promise | `docs/rt_runtime__reference__cli__bench.md:40-95` |
| P15 | critical sections | `b.start()` / `b.end()` exclude setup and teardown from the measurement | `docs/rt_runtime__reference__cli__bench.md:97-130` |
| P16 | groups and baseline | `group: "timing"` plus `baseline: true` produces a comparison line such as `1.35x faster than` | `docs/rt_runtime__reference__cli__bench.md:132-180` |
| P17 | discovery and filters | no file argument runs `{*_,*.,}bench.{ts,...}` recursively; `--filter` accepts strings or `/regex/`; `only` forces focus and fails the run; `ignore` skips conditionally | `docs/rt_runtime__reference__cli__bench.md:184-207`, `:228-312` |
| P18 | JSON output | `--json` reports `avg`, `min`, `max`, `p75`, `p99`, `p995`, `p999`, plus runtime and cpu strings | `docs/rt_runtime__reference__cli__bench.md:314-349` |

## Startup, cache and memory knobs

| id | knob | user-visible effect | evidence |
|---|---|---|---|
| P19 | `DENO_DIR` / `--reload` / `--cached-only` | global cache directory; `--reload` refetches and recompiles (all or one specifier); `--cached-only` forbids network access | `docs/rt_runtime__reference__cli__env_variables.md:43-49`, `docs/rt_runtime__packages.md:188-207` |
| P20 | heap snapshot workflow | unverified: the read corpus has no heap-snapshot or `--max-old-space-size` recipe; `DENO_V8_FLAGS` only says "Set V8 command line options" | `docs/rt_runtime__reference__env_variables.md:151` |
| P21 | `nodeModulesDir: "auto"` | local links recreate `node_modules` on each run, slightly increasing startup time | `docs/rt_runtime__packages.md:301-308` |
| P22 | `--bundle --minify` | reduces embedded bundle size and runtime memory use, at the cost of less readable stack traces | `docs/rt_runtime__reference__cli__compile.md:324-334` |
| P23 | `--engine quickjs` | lower startup and memory use, no JIT, slower compute; experimental backend | `docs/rt_runtime__reference__cli__compile.md:159-166` |
| P24 | `--watch` / `--watch-hmr` | full restart on change versus in-place module swap; `deno watch` is shorthand for `deno run --watch-hmr` | `docs/rt_runtime__run__watch_mode.md:11-23`, `:50-67` |
| P25 | npm install path | installing Deno through npm changes CLI startup time; the official install script is recommended | `docs/rt_runtime__getting_started__installation.md:113-117` |

## Pitfalls

- Short-lived programs are dominated by module loading and JIT compilation; extend the workload before trusting a profile (`docs/rt_runtime__fundamentals__cpu_profiling.md:172-175`).
- A lower sampling interval increases detail and file size; keep the 1 ms default for long runs (`docs/rt_runtime__fundamentals__cpu_profiling.md:57-60`).
- A bench with `only: true` makes the overall run fail even when every executed case passes (`docs/rt_runtime__reference__cli__bench.md:296-302`).
- Atomic-save editors can detach `--watch-hmr` after one edit; plain `--watch` re-establishes watchers on restart (`docs/rt_runtime__run__watch_mode.md:69-84`).
- Self-extracting compiled binaries pay a first-run extraction cost and use more memory than the in-memory virtual file system (`docs/rt_runtime__reference__cli__compile.md:375-384`).

## Sources

- https://docs.deno.com/runtime/fundamentals/cpu_profiling/
- https://docs.deno.com/runtime/reference/cli/bench/
- https://docs.deno.com/runtime/reference/cli/coverage/
- https://docs.deno.com/runtime/fundamentals/debugging/
- https://docs.deno.com/runtime/reference/cli/compile/
- https://docs.deno.com/runtime/reference/cli/watch/
- https://docs.deno.com/runtime/run/watch_mode/
- https://docs.deno.com/runtime/packages/
- https://docs.deno.com/runtime/reference/env_variables/
- https://github.com/denoland/deno
