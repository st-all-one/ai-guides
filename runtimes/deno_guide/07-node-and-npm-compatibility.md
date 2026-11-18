# 07 - Node and npm compatibility

Deno 2.9.3 runs most Node.js code unchanged. As of 2.8, over 75% of Node's own test suite passes, covering nearly every `node:` module; pure-JavaScript npm packages generally work, with caveats for native addons and tools that assume npm's on-disk layout (`docs/rt_runtime__fundamentals__node.md:54-62`).

## Compatibility surface

| Surface | Status | Evidence |
|---|---|---|
| `node:` built-ins | supported; nearly every module implemented | `docs/rt_runtime__fundamentals__node.md:43-45` |
| npm packages | `npm:` specifiers or `package.json` | `docs/rt_runtime__fundamentals__node.md:64-97` |
| globals | `process` everywhere; `Buffer` needs an import | `docs/rt_runtime__fundamentals__node.md:132-145` |
| `package.json` | dependencies, `deno task` scripts, `type`, `engines` | `docs/rt_runtime__fundamentals__node.md:223-274` |
| CommonJS | `require()`, `.cjs`, with one detection difference | `docs/rt_runtime__fundamentals__node.md:351-421` |
| `node_modules` | three modes; isolated or hoisted layout | `docs/rt_runtime__fundamentals__node.md:513-640` |
| Node-API addons | need local `node_modules` and `--allow-ffi` | `docs/rt_runtime__fundamentals__node.md:642-655` |
| `.npmrc` | private registries, tokens, mTLS | `docs/rt_runtime__fundamentals__node.md:828-949` |

## Built-ins and globals

Import Node built-ins with the `node:` prefix; since 2.9 a bare built-in name such as `os` also resolves, but an `imports` entry or `package.json` dependency of the same name still wins (`docs/rt_runtime__fundamentals__node.md:102-128`). `node:module` exposes `registerHooks()` for loader customization (`docs/rt_runtime__fundamentals__node.md:117-119`).

Node built-in access example (`docs/rt_runtime__fundamentals__node.md:107-110`):
```js title="main.mjs"
import * as os from "node:os";
console.log(os.cpus());
```

| Global | Behavior in Deno | Evidence |
|---|---|---|
| `process` | available everywhere; `no-process-global` lint rule is off by default | `docs/rt_runtime__fundamentals__node.md:138-152` |
| `Buffer` | not global in user code; import from `node:buffer` | `docs/rt_runtime__fundamentals__node.md:180-186` |
| `__filename`, `__dirname` | undefined; use `import.meta.filename` / `.dirname` | `docs/rt_runtime__reference__node_apis.md:101-107` |
| timers | since 2.8 return a Node `Timeout` object with `.ref()`, `.unref()`, `.refresh()` | `docs/rt_runtime__fundamentals__node.md:209-221` |
| system info | `os.cpus()` needs `--allow-sys=cpus`, `os.networkInterfaces()` needs the matching name | `docs/rt_runtime__reference__permissions.md:400-407` |

## npm specifiers and package.json projects

The specifier form is `npm:<package-name>[@<version-requirement>][/<sub-path>]`, and a subpath can select a binary for CLI tools such as `npm:cowsay@1.5.0/cowthink` (`docs/rt_runtime__fundamentals__node.md:79-84`, `docs/rt_runtime__fundamentals__node.md:327-345`). npm packages run under the same permission system as the rest of the code (`docs/rt_runtime__fundamentals__node.md:88-91`).

Import an npm package directly (`docs/rt_runtime__fundamentals__node.md:68-72`):
```ts title="main.js"
import * as emoji from "npm:node-emoji";

console.log(emoji.emojify(`:sauropod: :heart:  npm`));
```

`deno install` reads `package.json`, creates `node_modules`, and makes bare imports resolve; `deno task` runs scripts, `"type"` is honored, and unmet `engines` constraints warn (`docs/rt_runtime__fundamentals__node.md:223-274`). When no real `node` is on `PATH`, Deno places a shim in its cache and prepends it to child `PATH`; `DENO_DISABLE_NODE_SHIM=1` disables this (`docs/rt_runtime__fundamentals__node.md:292-308`).

## CommonJS

`.cjs` is always CommonJS; `.js`, `.jsx`, `.ts`, and `.tsx` are treated as CommonJS when a nearby `package.json` has `"type": "commonjs"` (`docs/rt_runtime__fundamentals__node.md:390-420`). From an ES module, create `require` explicitly (`docs/rt_runtime__fundamentals__node.md:422-430`):
```js title="main.js"
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const express = require("express");
```

Resolution probes `package.json` and `node_modules`, so `-R` and `-E` are typically needed; `require()` can load synchronous ES modules only (`docs/rt_runtime__fundamentals__node.md:381-388`, `docs/rt_runtime__fundamentals__node.md:436-465`).

## node_modules modes

| Mode | Use | Enable |
|---|---|---|
| `none` (default) | new projects; global cache, no local directory | do nothing |
| `auto` | bundlers and Node-API packages | `"nodeModulesDir": "auto"` or `--node-modules-dir=auto` |
| `manual` | existing `package.json` with an install step | `"nodeModulesDir": "manual"` plus `deno install` |

Source: `docs/rt_runtime__fundamentals__node.md:513-589`. The default **isolated** layout places real files in `node_modules/.deno/` and exposes them via symlinks, so each package sees only declared dependencies; the opt-in **hoisted** linker requires manual mode and flattens shared versions to the top (`docs/rt_runtime__fundamentals__node.md:591-640`).

## Addons, conditions, and types

Node-API addons such as `esbuild`, `sqlite3`, and `duckdb` need a local `node_modules` plus `--allow-ffi`; build scripts are not run unless approved with `deno install --allow-scripts=npm:duckdb` (`docs/rt_runtime__fundamentals__node.md:642-690`). Import resolution uses conditions `["deno", "node", "import", "module-sync", "default"]`, while `require()` uses `["require", "node", "module-sync", "default"]`; `--conditions` extends them (`docs/rt_runtime__fundamentals__node.md:695-733`). Since 2.8, `lib.node` is included in every type-check; older setups use `/// <reference types="npm:@types/node" />`, and Deno supports `node16` module resolution only (`docs/rt_runtime__fundamentals__node.md:735-826`).

## Private registries

A project-root or `$HOME` `.npmrc` sets a scoped registry and `_authToken`, and maps `@mycompany/package` to `npm:@mycompany/package@1.0.0` in `deno.json` (`docs/rt_runtime__fundamentals__node.md:849-899`). Deno also reads `certfile`/`keyfile` for mTLS, legacy `_auth` with `email`, `min-release-age`, `trust-policy`, and `NPM_CONFIG_REGISTRY` (`docs/rt_runtime__fundamentals__node.md:901-968`). Stray `file:` and `link:` entries in published metadata are skipped since 2.8 (`docs/rt_runtime__fundamentals__node.md:951-968`).

## Pitfalls

- Bare built-in names work in 2.9 but `node:` remains unambiguous and portable (`docs/rt_runtime__fundamentals__node.md:121-128`).
- Running before `deno install` in a `package.json` project fails with a node_modules out-of-date error (`docs/rt_runtime__fundamentals__node.md:276-286`).
- Hoisted layout is needed only for tools that walk `node_modules` for flat siblings (`docs/rt_runtime__fundamentals__node.md:638-640`).
- `npm:` packages are sandboxed like local code; CLI tools that read files still need grants (`docs/rt_runtime__fundamentals__node.md:347-349`).

## Sources
- https://docs.deno.com/runtime/fundamentals/node/
- https://docs.deno.com/runtime/reference/node_apis/
- https://docs.deno.com/runtime/reference/permissions/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/runtime/migrate/migrate_from_npm/
- https://github.com/denoland/deno
- https://docs.npmjs.com/
- https://docs.deno.com/runtime/fundamentals/security/
- https://docs.deno.com/runtime/reference/cli/add/
