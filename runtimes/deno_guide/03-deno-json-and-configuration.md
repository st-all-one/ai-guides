# 03 - deno.json and configuration

Deno 2.9.3 reads two optional, first-class configuration files: Node's `package.json` and its own `deno.json`. The rule stated in the docs is to use `package.json` for dependencies and scripts, and add `deno.json` only to configure Deno's formatter, linter, compiler or tasks (`docs/rt_runtime__fundamentals__configuration.md:9-17`). When both exist, dependencies come from each file while Deno's own settings come only from `deno.json` (`docs/rt_runtime__fundamentals__configuration.md:31-39`).

## Discovery and file forms

`deno.json` supports `.json` and `.jsonc` extensions, the latter allowing comments and trailing commas (`docs/rt_runtime__fundamentals__configuration.md:64-66`). Deno auto-detects the file in the working directory or any parent, and `--config` points at a different file; in a monorepo a root file can declare a workspace whose members carry their own (`docs/rt_runtime__fundamentals__configuration.md:68-73`). A minimal file is verbatim (`docs/rt_runtime__fundamentals__configuration.md:51-61`):
```json
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

| Field family | Configures | Evidence |
|---|---|---|
| Dependencies and import maps | remote specifiers, path mappings, scopes | `docs/rt_runtime__fundamentals__configuration.md:82` |
| Tasks | named commands run by `deno task` | `docs/rt_runtime__fundamentals__configuration.md:83` |
| Linting and formatting | rules, include/exclude, style | `docs/rt_runtime__fundamentals__configuration.md:84-85` |
| Lockfile and `node_modules` | integrity, install layout | `docs/rt_runtime__fundamentals__configuration.md:86-87` |
| TypeScript compiler options | checker behavior | `docs/rt_runtime__fundamentals__configuration.md:88` |
| Unstable features, exports, permissions | opt-in APIs, public surface, `-P` sets | `docs/rt_runtime__fundamentals__configuration.md:89`, `:92` |
| Compile options, minimum dependency age | standalone build, supply-chain window | `docs/rt_runtime__fundamentals__configuration.md:93-94` |

## Dependencies and import maps

The `imports` field maps bare specifiers to URLs or paths, so scripts use short names (`docs/rt_runtime__reference__deno_json.md:19-22`). The documented example is verbatim (`docs/rt_runtime__reference__deno_json.md:28-33`):
```json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.0",
    "chalk": "npm:chalk@5"
  }
}
```

| Mechanism | Field | Behavior | Evidence |
|---|---|---|---|
| Exact and directory mappings | `imports` | `"bar/": "./some/folder/bar/"` supports `bar/file.ts` | `docs/rt_runtime__reference__deno_json.md:67-89` |
| Scoped overrides | `scopes` | path-prefix-specific import maps, e.g. legacy versions | `docs/rt_runtime__reference__deno_json.md:111-134` |
| Local package override | `links` | `npm link`-style override, accepts globs and `!` exclusion | `docs/rt_runtime__reference__deno_json.md:136-159`, `:178-189` |
| Target `package.json` | `preferPackageJson` | `deno add`/`remove` write there; warns if `imports` linger | `docs/rt_runtime__reference__deno_json.md:161-176` |

## Formatting, linting and file selection

The formatter exposes a wide option set; defaults and allowed values are documented (`docs/rt_runtime__reference__deno_json.md:303-334`).

| Option | Default | Allowed values | Evidence |
|---|---|---|---|
| `lineWidth` | `80` | number | `docs/rt_runtime__reference__deno_json.md:312` |
| `indentWidth` | `2` | number | `docs/rt_runtime__reference__deno_json.md:311` |
| `useTabs` | `false` | `true`, `false` | `docs/rt_runtime__reference__deno_json.md:328` |
| `semiColons` | `true` | `true`, `false` | `docs/rt_runtime__reference__deno_json.md:318` |
| `singleQuote` | `false` | `true`, `false` | `docs/rt_runtime__reference__deno_json.md:320` |
| `proseWrap` | `always` | `always`, `never`, `preserve` | `docs/rt_runtime__reference__deno_json.md:316` |

`exclude` has higher precedence than `include`, and a negated glob can un-exclude a narrower path in Deno 1.41.2+ (`docs/rt_runtime__reference__deno_json.md:546-564`). A top-level `exclude` applies to all subcommands and the LSP (`:566-578`).

## Reproducibility and install layout

| Field | Setting | Effect | Evidence |
|---|---|---|---|
| `lock` | `{"path":"./deno.lock","frozen":true}` | record exact versions and hashes; error on change | `docs/rt_runtime__reference__deno_json.md:346-368` |
| `lock` | `false` | disable lockfile entirely | `docs/rt_runtime__reference__deno_json.md:370-376` |
| `minimumDependencyAge` | `"P3D"` | reject versions younger than the window | `docs/rt_runtime__reference__deno_json.md:388-411` |
| `nodeModulesDir` | `"none"`, `"auto"`, `"manual"` | global cache, managed local dir, or user-managed dir | `docs/rt_runtime__reference__deno_json.md:428-458` |
| `jsrDepsInNodeModules` | `true` | rewrite `jsr:` to npm-compat form in `node_modules` | `docs/rt_runtime__reference__deno_json.md:460-473` |

Since Deno 2.9 a 24-hour minimum dependency age applies by default even when unset, and `0` disables it (`docs/rt_runtime__reference__deno_json.md:409-411`). The lockfile form above is verbatim (`docs/rt_runtime__reference__deno_json.md:357-360`):
```json
  "lock": {
    "path": "./deno.lock",
    "frozen": true
  }
```

## Environment variables and unstable flags

Beyond `Deno.env` and `.env` files, the runtime defines special variables that control its own behavior (`docs/rt_runtime__reference__env_variables.md:131-135`). Relevant to configuration and automation (`docs/rt_runtime__reference__env_variables.md:137-161`):

| Variable | Effect | Evidence |
|---|---|---|
| `DENO_DIR` | cache directory location | `docs/rt_runtime__reference__env_variables.md:142` |
| `DENO_INSTALL` / `DENO_INSTALL_ROOT` | shell-install binary path / `deno install` root | `docs/rt_runtime__reference__env_variables.md:143-144` |
| `DENO_NO_PACKAGE_JSON` | disable `package.json` auto-resolution | `docs/rt_runtime__reference__env_variables.md:146` |
| `DENO_NO_UPDATE_CHECK` | disable upgrade check | `docs/rt_runtime__reference__env_variables.md:150` |
| `DENO_CONDITIONS` | export conditions for npm resolution | `docs/rt_runtime__reference__env_variables.md:147` |
| `DENO_AUDIT_PERMISSIONS` | audit permission access to JSONL or OTel | `docs/rt_runtime__reference__env_variables.md:154` |
| `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` | proxy for downloads and `fetch` | `docs/rt_runtime__reference__env_variables.md:158-162` |

Unstable features can be enabled three ways: a `--unstable-<name>` CLI flag, an `unstable` array in `deno.json` using names without the prefix, or an environment variable for flags that support it (`docs/rt_runtime__reference__cli__unstable_flags.md:18-48`). The config form is verbatim (`docs/rt_runtime__reference__deno_json.md:508-510`):
```json
  "unstable": ["cron", "kv", "webgpu"]
```

A standalone example token is `export DENO_UNSTABLE_SLOPPY_IMPORTS=true` (`docs/rt_runtime__reference__cli__unstable_flags.md:53-55`).

## Sources

- https://docs.deno.com/runtime/fundamentals/configuration/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/runtime/reference/env_variables/
- https://docs.deno.com/runtime/reference/cli/unstable_flags/
- https://docs.deno.com/runtime/fundamentals/workspaces/
- https://docs.deno.com/runtime/reference/permissions/
- https://github.com/denoland/deno/blob/main/cli/schemas/config-file.v1.json
- https://jsr.io/
