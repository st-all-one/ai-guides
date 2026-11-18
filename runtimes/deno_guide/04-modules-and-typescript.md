# 04 - Modules and TypeScript

Deno 2.9.3 uses ECMAScript modules as its primary system and also runs Node's older CommonJS modules, with the two interoperating; ESM is recommended for new code (`docs/rt_runtime__fundamentals__modules.md:12-23`). File format is chosen from the extension and nearest `package.json`: `.mjs` is always ESM, `.cjs` always CommonJS, while `.js` and `.ts` are ESM unless a `package.json` sets `"type": "commonjs"` (`:25-30`). TypeScript is a first-class language: files run directly with no build step and no required config (`docs/rt_runtime__fundamentals__typescript.md:15-18`).

## Local modules and import rules

Local import specifiers must include the full file extension; it cannot be omitted (`docs/rt_runtime__fundamentals__modules.md:52-53`). The documented contrast is verbatim (`docs/rt_runtime__fundamentals__modules.md:56-60`):
```ts
// WRONG: missing file extension
import { add } from "./calc";

// CORRECT: includes file extension
import { add } from "./calc.ts";
```

| Feature | Form | Permission implication | Evidence |
|---|---|---|---|
| Static import | `import { add } from "./calc.ts"` | part of module graph, no permission | `docs/rt_runtime__fundamentals__modules.md:34-53` |
| Dynamic import | `await import("./calc.ts")` | literal specifier is graphed; computed one is checked at runtime | `docs/rt_runtime__fundamentals__modules.md:63-91` |
| Import metadata | `import.meta.url`, `.main`, `.filename`, `.dirname`, `.resolve()` | `filename`/`dirname` undefined for remote modules | `docs/rt_runtime__fundamentals__modules.md:93-120` |
| JSON import | `with { type: "json" }` | supported via import attributes | `docs/rt_runtime__fundamentals__modules.md:122-131` |
| Text / bytes | `with { type: "text" }` / `"bytes"` | text stable in 2.8; bytes needs `--unstable-raw-imports` | `docs/rt_runtime__fundamentals__modules.md:133-169` |
| CSS | `with { type: "css" }` | yields `CSSStyleSheet`; still experimental | `docs/rt_runtime__fundamentals__modules.md:171-232` |
| Deferred evaluation | `import defer * as x` | loads but delays top-level execution; Stage 3 | `docs/rt_runtime__fundamentals__modules.md:234-256` |
| WebAssembly | `import { add } from "./add.wasm"` | named exports mirror Wasm exports | `docs/rt_runtime__fundamentals__modules.md:258-274` |

A dynamic import whose specifier cannot be analyzed reads the file at runtime and needs `--allow-read` (`docs/rt_runtime__fundamentals__modules.md:194-197`). A computed remote import needs `--allow-import` (`:87-91`).

## Registries and import maps

Third-party modules start with `jsr:` or `npm:`; JSR is the recommended registry (`docs/rt_runtime__fundamentals__modules.md:313-329`). The documented pair is verbatim (`docs/rt_runtime__fundamentals__modules.md:320-321`):
```ts
import { camelCase } from "jsr:@luca/cases@1.0.0";
import { say } from "npm:cowsay@1.6.0";
```

An `imports` field in `deno.json` centralizes version specifiers; the docs call this the import map (`docs/rt_runtime__fundamentals__modules.md:331-336`). The example is verbatim (`docs/rt_runtime__fundamentals__modules.md:341-346`):
```json
{
  "imports": {
    "@luca/cases": "jsr:@luca/cases@^1.0.0",
    "cowsay": "npm:cowsay@^1.6.0"
  }
}
```

| Specifier form | Meaning | Evidence |
|---|---|---|
| `jsr:@scope/pkg@1.0.0` | JSR registry module | `docs/rt_runtime__fundamentals__modules.md:319-322` |
| `npm:pkg@1.6.0` | npm registry package | `docs/rt_runtime__fundamentals__modules.md:319-322` |
| `node:assert` | built-in Node module, typed | `docs/rt_runtime__reference__cli__eval.md:44`, `docs/rt_runtime__fundamentals__typescript.md:74` |
| `@std/…` via import map | bare specifier remapped to `jsr:` | `docs/rt_runtime__fundamentals__modules.md:340-354` |

There is a deliberate difference between `deno.json` and a standalone `import_map.json`: the latter requires both a plain and a trailing-`/` entry per module (`jsr:/@std/async`), while `deno.json` needs only the plain specifier (`docs/rt_runtime__fundamentals__modules.md:360-393`).

## TypeScript execution versus checking

Execution strips types in-process and caches the result; `deno check` runs the real compiler without executing, with strict mode plus `noImplicitOverride` on by default (`docs/rt_runtime__fundamentals__typescript.md:39-45`, `:106-113`). `deno eval` is a notable exception: unlike `deno run`, it executes with all permissions enabled by default (`docs/rt_runtime__reference__cli__eval.md:11-13`). The checking commands are verbatim (`docs/rt_runtime__fundamentals__typescript.md:119-130`):
```sh
# Check the whole project
deno check

# Check a specific file or directory
deno check main.ts
deno check src/

# Also type-check remote modules and npm dependencies
deno check --all main.ts

# Type-check JavaScript files too, without adding @ts-check to each one
deno check --check-js main.js
```

| Checker behavior | Command / setting | Effect | Evidence |
|---|---|---|---|
| Default mode | strict + `noImplicitOverride` | errors on implicit overrides and strict violations | `docs/rt_runtime__fundamentals__typescript.md:106-113` |
| Check before run | `deno run --check main.ts` | stops before any code runs on type error | `docs/rt_runtime__fundamentals__typescript.md:139-150` |
| CI suitability | `deno check` exit code | exits non-zero on errors | `docs/rt_runtime__fundamentals__typescript.md:133-137` |
| JavaScript opt-in | `// @ts-check`, `checkJs`, `--check-js` | three ways to type-check `.js` | `docs/rt_runtime__fundamentals__typescript.md:252-259` |
| Native compiler | `deno check --unstable-tsgo` | Go compiler, about 10× faster, preview | `docs/rt_runtime__fundamentals__typescript.md:159-174` |

The two native-compiler invocations are verbatim (`docs/rt_runtime__fundamentals__typescript.md:172-173`):
```sh
DENO_UNSTABLE_TSGO=1 deno check main.ts
deno check --unstable-tsgo main.ts
```

## Types for untyped code and other targets

Deno does not auto-discover a sibling `.d.ts` file the way `tsc` does; declare types with `@ts-self-types` in the source, `@ts-types` at the import site, or an `@types` dependency with local `node_modules` (`docs/rt_runtime__fundamentals__typescript.md:299-371`). Dynamic imports use a `typeof import(...)` assertion instead (`:373-384`). Browser-targeted code swaps libraries via `compilerOptions.lib`, e.g. `["dom", "dom.iterable", "dom.asynciterable", "deno.ns"]`, while workers use `deno.worker` (`docs/rt_runtime__fundamentals__typescript.md:393-415`). Global augmentation must use `var` on `globalThis` because Deno 2 has no `window` object (`:417-429`).

## Sources

- https://docs.deno.com/runtime/fundamentals/modules/
- https://docs.deno.com/runtime/fundamentals/typescript/
- https://docs.deno.com/runtime/reference/cli/eval/
- https://docs.deno.com/runtime/reference/cli/check/
- https://docs.deno.com/runtime/reference/ts_config_migration/
- https://docs.deno.com/runtime/reference/jsx/
- https://docs.deno.com/runtime/fundamentals/node/
- https://jsr.io/
