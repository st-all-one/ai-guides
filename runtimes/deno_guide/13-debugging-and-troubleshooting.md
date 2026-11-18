# 13 - Debugging and troubleshooting

Pinned to Deno 2.9.3. Deno speaks the V8 Inspector Protocol, so Chrome/Edge DevTools, VS Code and JetBrains attach to the same process (`docs/rt_runtime__fundamentals__debugging.md:10-18`). Choose the launch flag by when execution pauses, then use runtime diagnostics when no breakpoint is convenient.

## Choosing an inspector flag

| mode | behavior | evidence |
|---|---|---|
| `--inspect` | starts the inspector and executes the program immediately; default `127.0.0.1:9229` | `docs/rt_runtime__fundamentals__debugging.md:20-32`, `:37-46` |
| `--inspect=9230` / `--inspect=0.0.0.0:9229` | accepts a bare port or a full host:port address | `docs/rt_runtime__fundamentals__debugging.md:34-46` |
| `--inspect-wait` | waits for a debugger to connect before running any code | `docs/rt_runtime__fundamentals__debugging.md:73-80` |
| `--inspect-brk` | waits for a connection, then breaks on the first line; the default used by JetBrains and VS Code | `docs/rt_runtime__fundamentals__debugging.md:82-94` |
| `--inspect-publish-uid=http` | publishes the WebSocket URL via `/json/list` instead of stderr; `stderr` is the default | `docs/rt_runtime__fundamentals__debugging.md:48-60` |
| short programs | `--inspect` may finish before a client attaches; use `--inspect-wait` / `--inspect-brk` or add a timeout | `docs/rt_runtime__fundamentals__debugging.md:62-71` |

The signal-based workflow for a server that was started without an inspector flag (Linux and macOS, Deno 2.9.2+) is verbatim from `docs/rt_runtime__fundamentals__debugging.md:156-161`:
```
$ deno run server.ts &
$ kill -USR1 <pid>
Debugger listening on ws://127.0.0.1:9229/ws/...
Visit chrome://inspect to connect to the debugger.
```

`SIGUSR1` binds `127.0.0.1:9229` without pausing, needs no permissions, is a no-op if an inspector already runs, and does not exist on Windows (`docs/rt_runtime__fundamentals__debugging.md:149-176`). The handler installs shortly after startup, so sub-half-second programs are poor targets (`:172-173`). A public bind lets any reachable host execute code; stay on loopback (`docs/rt_runtime__fundamentals__debugging.md:141-147`).

## DevTools workflow and live inspection

| step | action | evidence |
|---|---|---|
| 1 | run `deno run --inspect-brk -RN jsr:@std/http/file-server`; copy the `Debugger listening on ws://...` banner | `docs/rt_runtime__fundamentals__debugging.md:178-189` |
| 2 | open `chrome://inspect`, click **Inspect** beside the Deno target; allow a few seconds for modules to load | `docs/rt_runtime__fundamentals__debugging.md:191-198` |
| 3 | expect the first pause in `_constants.ts` — the left-most dependency evaluates first, not in `file_server.ts` | `docs/rt_runtime__fundamentals__debugging.md:200-203` |
| 4 | open a source, set a breakpoint in `listenAndServe`, resume, then send `curl http://0.0.0.0:4507/` | `docs/rt_runtime__fundamentals__debugging.md:205-234` |
| 5 | use the italic source-map entries to step through TypeScript with types intact | `docs/rt_runtime__fundamentals__debugging.md:211-222` |
| 6 | Network tab (2.8+) shows `fetch`, `node:http(s)`, `WebSocket` and `Deno.upgradeWebSocket()` traffic with headers, bodies and timing | `docs/rt_runtime__fundamentals__debugging.md:239-262`, `:291-327` |

Network events are emitted only with an attached session that called `Network.enable`; otherwise overhead is effectively zero (`docs/rt_runtime__fundamentals__debugging.md:369-375`). Web Workers are separate targets since Deno 2.7, both in `chrome://inspect` and as VS Code Call Stack threads (`:460-491`). `node:inspector` offers `open(port, host, wait)`, `url()`, `close()` and `Session`; `inspector.open()` needs `--allow-net`, `SIGUSR1` does not (`docs/rt_runtime__fundamentals__debugging.md:96-139`, `:163-166`).

### Derived editor workflow

For a dev server launched by a task, add a debug task and attach VS Code on the default inspector port (`derived` from `docs/rt_runtime__reference__vscode.md:298-340`):
```
deno task dev:debug   # deno run --inspect -A npm:vite
```

Attach with `"type": "node"`, `"request": "attach"`, `"port": 9229` in `.vscode/launch.json`; the generated launcher uses `type: node` too, which is expected (`docs/rt_runtime__reference__vscode.md:290-296`, `:322-336`). Use `--inspect-wait` when debugging startup code (`docs/rt_runtime__reference__vscode.md:318-320`).

## Diagnostics without a breakpoint

| tool | output | evidence |
|---|---|---|
| `--log-level=debug` | module resolution, network requests and permission checks; combine with `--inspect-brk` when the inspector itself will not connect | `docs/rt_runtime__fundamentals__debugging.md:399-408` |
| `--strace-ops` | `Dispatch` and `Complete` events for each op with timings; useful for hangs and for seeing JS↔Rust calls | `docs/rt_runtime__fundamentals__debugging.md:410-425` |
| `SSLKEYLOGFILE=./keys.log` | writes TLS session keys for decryption in Wireshark (TLS master-secret log) | `docs/rt_runtime__fundamentals__debugging.md:493-504` |
| `--inspect-publish-uid=http` | lets tooling poll the inspector port for targets instead of parsing stderr | `docs/rt_runtime__fundamentals__debugging.md:50-60` |
| `OTEL_DENO=true` | sends request traces, runtime metrics and console/errors to a collector for production diagnosis | `docs/rt_runtime__fundamentals__debugging.md:434-458` |
| `deno lsp` | editor diagnostics, formatting and go-to-definition over stdio; normally started by the editor | `docs/rt_runtime__reference__cli__lsp.md:11-29` |
| `deno:/status.md` | LSP virtual document describing the language server state for a user | `docs/rt_runtime__reference__lsp_integration.md:158-169` |
| `deno/performance` | LSP custom request returning timing averages of internal instrumentation | `docs/rt_runtime__reference__lsp_integration.md:148-152` |

## Failure modes

- Vite breakpoints show **Unbound breakpoint** until the route is first requested, then bind.
- `ts(2691)` / `Cannot find name 'Deno'` means the built-in TS service is active: set `deno.enable: true`, disable `enableProjectDiagnostics`, inspect **Deno: Language Server Status** (`docs/rt_runtime__reference__vscode.md:383-405`).
- `Uncached or missing remote URL: ...` needs the quick fix or **Deno: Cache Dependencies**; the editor does not cache implicitly (`docs/rt_runtime__reference__vscode.md:174-196`).
- Check the extension's Deno binary with `deno.path`; relative paths resolve from the workspace root (`docs/rt_runtime__reference__vscode.md:149-154`).
- JetBrains generates a run configuration with no permission flags; add them in the Command field (`docs/rt_runtime__fundamentals__debugging.md:383-397`).
- On Linux, an atomic-save editor can detach `--watch-hmr` after one edit; use plain `--watch` or disable atomic save (`docs/rt_runtime__run__watch_mode.md:69-84`).
- Under load, prefer CPU profiles (chapter 12) or OTEL traces (chapter 11): breakpoints change timing (`docs/rt_runtime__fundamentals__debugging.md:434-458`).

## Sources

- https://docs.deno.com/runtime/fundamentals/debugging/
- https://docs.deno.com/runtime/reference/vscode/
- https://docs.deno.com/runtime/reference/lsp_integration/
- https://docs.deno.com/runtime/reference/cli/lsp/
- https://docs.deno.com/runtime/run/watch_mode/
- https://docs.deno.com/runtime/fundamentals/cpu_profiling/
- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://nodejs.org/api/inspector.html
- https://microsoft.github.io/language-server-protocol/
- https://github.com/denoland/vscode_deno
