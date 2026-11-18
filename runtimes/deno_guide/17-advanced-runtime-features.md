# 17 - Advanced runtime features

Beyond HTTP and tests, Deno exposes native integration, WebAssembly, scheduling,
and GPU surfaces. Each has a distinct permission or stability contract, so this
chapter records the gate and the observable behavior together.

## Foreign Function Interface

`Deno.dlopen` loads a dynamic library and binds its exported functions. It needs
`--allow-ffi`, and native code runs outside the sandbox with the same access as
the Deno process itself (`docs/rt_runtime__fundamentals__ffi.md:64-70`):
```ts
const dylib = Deno.dlopen("libexample.so", {
  add: { parameters: ["i32", "i32"], result: "i32" },
});

console.log(dylib.symbols.add(5, 3)); // 8

dylib.close();
```

| Aspect | Behavior |
|---|---|
| path with separator | opened from that exact location; relative paths resolve against cwd |
| bare name | left to the OS loader search path |
| module-relative | use `new URL("./lib.so", import.meta.url).pathname` |
| compile | `deno compile --allow-ffi --include libexample.so main.ts` |
| failures | throws synchronously for a missing file or a missing symbol |
| types | `i8`–`f64`, `i64`/`u64`/`usize` as `bigint`, `pointer`, `buffer`, `function`, `struct` |
| structs | `{ struct: [...] }` is a positional array of field types |
| callbacks | `new Deno.UnsafeCallback(...)`; pass `.pointer`, then `close()` |
| cleanup | `dylib.close()` and `callback.close()` |

Source: `docs/rt_runtime__fundamentals__ffi.md:53-199`, `:201-351`.
`i64`, `u64`, and `usize` map to `bigint`, and a returned struct always comes
back as a `Uint8Array` (`docs/rt_runtime__fundamentals__ffi.md:161-199`,
`:308-317`). A C struct is mirrored by field types in declaration order
(`docs/rt_runtime__fundamentals__ffi.md:213-229`):
```c
typedef struct {
  double x;
  double y;
} Point;

double distance(Point a, Point b) {
  double dx = a.x - b.x;
  double dy = a.y - b.y;
  return __builtin_sqrt(dx * dx + dy * dy);
}

Point midpoint(Point a, Point b) {
  Point m;
  m.x = (a.x + b.x) / 2.0;
  m.y = (a.y + b.y) / 2.0;
  return m;
}
```

FFI differs from Node-API: FFI needs no build step but is tied to a library ABI,
while Node-API is ABI-stable yet needs precompiled binaries or a build step
(`docs/rt_runtime__fundamentals__ffi.md:431-460`). WebAssembly is the sandboxed
alternative (`docs/rt_runtime__fundamentals__ffi.md:462-471`).

## WebAssembly

Wasm modules can be imported directly since Deno 2.1 and their exports are type
checked; import specifiers can be remapped through the `deno.json` import map
(`docs/rt_runtime__reference__wasm.md:13-176`). Streaming instantiation is the
efficient path and requires the `application/wasm` MIME type
(`docs/rt_runtime__reference__wasm.md:225-261`).

| Surface | Behavior |
|---|---|
| import | `import { add } from "./add.wasm"` with type checking |
| WebAssembly API | fetch bytes, `new WebAssembly.Module`, instantiate |
| streaming | `instantiateStreaming` / `compileStreaming` vs `compile` / `instantiate` |
| WASI Preview 1 | `node:wasi` module, `version: "preview1"`, `getImportObject()` |
| WASI Preview 2 | component model; run or transpile with `jco` |
| preopens | map guest paths to real directories; needs read/write permission |
| bindings | `wasmbuild` compiles Rust and generates TypeScript definitions |

Source: `docs/rt_runtime__reference__wasm.md:178-397`. A Preview 1 guest is
started explicitly (`docs/rt_runtime__reference__wasm.md:333-345`):
```ts
import { WASI } from "node:wasi";

const wasi = new WASI({
  version: "preview1",
  args: ["hello", "alpha", "beta"],
  env: { GREETING: "hello-wasi" },
});

const bytes = await Deno.readFile(new URL("./hello.wasm", import.meta.url));
const module = await WebAssembly.compile(bytes);
const instance = await WebAssembly.instantiate(module, wasi.getImportObject());

wasi.start(instance);
```

`node:wasi` is experimental and emits a warning; a Preview 2 component is not a
plain module and loads only through `jco`
(`docs/rt_runtime__reference__wasm.md:358-388`).

## Cron

`Deno.cron` is an unstable API enabled with `--unstable-cron` or `"cron"` in
`deno.json.unstable`; schedules are UTC, jobs must be registered at module top
level, and `backoffSchedule` supplies retry delays in milliseconds
(`docs/rt_runtime__fundamentals__cron.md:33-35`):
```ts
Deno.cron("log-a-message", "* * * * *", () => {
  console.log("This runs once a minute.");
});
```

| Detail | Behavior |
|---|---|
| schedule | 5-field expression or object such as `{ hour: { every: 1 } }` |
| field forms | exact value, `*`, range, list, step |
| registration | top level only, before any server starts |
| retries | none by default; opt in with `backoffSchedule` |
| state | in-memory per process in the CLI |
| observability | `OTEL_DENO=true` emits a span per invocation |

Source: `docs/rt_runtime__fundamentals__cron.md:26-105`. Deploy discovers
definitions and manages scheduling and retries, so no long-running CLI process
is required (`docs/rt_runtime__fundamentals__cron.md:82-90`).

## Desktop WebGPU

`deno desktop` exists from Deno 2.9.0. The `raw` backend gives a native window
with no web engine; `Deno.BrowserWindow.getNativeWindow()` returns an
`UnsafeWindowSurface`, and WebGPU is enabled with `"unstable": ["webgpu"]`
(`docs/rt_runtime__desktop__webgpu.md:34-39`):
```json
{
  "desktop": {
    "backend": "raw"
  },
  "unstable": ["webgpu"]
}
```

The `raw` backend is selectable only through `desktop.backend`, never through
`--backend` on the command line (`docs/rt_runtime__desktop__webgpu.md:42-44`).
The render loop calls `present()` every frame and fetches a fresh texture each
time (`docs/rt_runtime__desktop__webgpu.md:170-183`):
```ts
const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: context.getCurrentTexture().createView(),
    clearValue: { r: 0.05, g: 0.05, b: 0.08, a: 1 },
    loadOp: "clear",
    storeOp: "store",
  }],
});
pass.setPipeline(pipeline);
pass.draw(3);
pass.end();
device.queue.submit([encoder.finish()]);
surface.present();
```

| Rule | Reason |
|---|---|
| request adapter before wrapping the window | `getNativeWindow()` throws without an active WebGPU context |
| size the surface and handle `resize` | a mismatched surface stretches or clips |
| call `present()` each frame | otherwise the window stays blank |
| fetch a fresh texture per frame | the swapchain hands out a different texture each time |
| exit with `Deno.exit()` on close | once a surface exists, `close()` only hides the window |

Source: `docs/rt_runtime__desktop__webgpu.md:76-100`, `:186-302`, `:304-329`.
There is no DOM, so the loop self-schedules with `setTimeout` and guards on
`win.isClosed()` (`docs/rt_runtime__desktop__webgpu.md:186-193`, `:292-302`).

## Sources

- https://docs.deno.com/runtime/fundamentals/ffi/
- https://docs.deno.com/runtime/reference/wasm/
- https://docs.deno.com/runtime/fundamentals/cron/
- https://docs.deno.com/runtime/desktop/webgpu/
- https://docs.deno.com/runtime/desktop/backends/
- https://docs.deno.com/runtime/reference/web_platform_apis/
- https://docs.deno.com/api/deno/~/Deno.dlopen
- https://github.com/denoland/wasmbuild
- https://github.com/bytecodealliance/jco
- https://www.w3.org/TR/WGSL/
