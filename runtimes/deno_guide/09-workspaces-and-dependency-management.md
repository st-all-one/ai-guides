# 09 - Workspaces and dependency management

A Deno 2.9.3 workspace is a set of directories containing `deno.json` or `package.json` files, declared by the root config (`docs/rt_runtime__fundamentals__workspaces.md:8-19`). Deno uses `workspace`, singular, where npm uses `workspaces` (`docs/rt_runtime__fundamentals__workspaces.md:40-45`).

## Declaring members

| Form | Behavior | Evidence |
|---|---|---|
| literal paths | list member directories directly | `docs/rt_runtime__fundamentals__workspaces.md:15-31` |
| `packages/*` | one directory level below the base | `docs/rt_runtime__fundamentals__workspaces.md:168-202` |
| `packages/**` | any depth below the base | `docs/rt_runtime__fundamentals__workspaces.md:204-215` |
| `!packages/internal` | exclude a path or glob swept up by an earlier pattern | `docs/rt_runtime__fundamentals__workspaces.md:217-234` |
| `package.json` only | Node-first member importable by its manifest `name` | `docs/rt_runtime__fundamentals__workspaces.md:32-38` |

Root declaration (`docs/rt_runtime__fundamentals__workspaces.md:15-19`):
```json title="deno.json"
{
  "workspace": ["./add", "./subtract"]
}
```

## Resolution and visibility

Deno walks up from the executing file to a root config, checks its `workspace` list, matches import specifiers against member `name` values, and resolves through that member's `exports` (`docs/rt_runtime__fundamentals__workspaces.md:236-270`). Members inherit root `imports`, and a member's own version wins for files inside it while the root map applies elsewhere (`docs/rt_runtime__fundamentals__workspaces.md:673-712`). `exports` may be a string or an object mapping subpaths to files (`docs/rt_runtime__fundamentals__workspaces.md:292-320`). Containerized members must copy the root config, every dependent member, and the same directory layout (`docs/rt_runtime__fundamentals__workspaces.md:272-290`).

## Configuration scope

Resolution-wide options are root-only; this keeps one resolver and one security policy per workspace (`docs/rt_runtime__fundamentals__workspaces.md:498-550`).

| Option | Root | Member | Note |
|---|---|---|---|
| `minimumDependencyAge`, `nodeModulesDir`, `vendor` | yes | no | resolution must match across members |
| `allowScripts` | yes | no | one security policy for all packages |
| `links`, `lock`, `workspace` | yes | no | nested workspaces unsupported |
| `name`, `version`, `exports` | no | yes | identity and entry points |
| `publish` | no | yes | `false` opts a member out of publishing |
| `imports`, `compilerOptions`, `tasks` | yes | yes | member values take priority |
| `publish.include`, `publish.exclude` | yes | yes | file selection for publish |

Source: `docs/rt_runtime__fundamentals__workspaces.md:507-550`. `deno check`, `deno test`, `deno fmt`, and `deno lint` from the root cover all members; `deno task --cwd=<member> <task>` targets one member (`docs/rt_runtime__fundamentals__workspaces.md:552-671`).

## Centralized versions

The `catalog:` protocol, added in 2.8 and usable in `deno.json` imports since 2.9, keeps one npm version requirement at the root (`docs/rt_runtime__fundamentals__workspaces.md:760-782`). It is npm-only, root-only, and a missing name is a resolution error; `catalog:` and `catalog:default` are equivalent, and `package.json` catalogs win when both roots define them (`docs/rt_runtime__fundamentals__workspaces.md:851-882`).

Define a catalog at the root (`docs/rt_runtime__fundamentals__workspaces.md:785-795`):
```jsonc title="deno.json"
{
  "workspace": ["./packages/a", "./packages/b"],
  "catalog": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "chalk": "^5.3.0"
  }
}
```

Named catalogs live under `catalogs` and are selected as `catalog:react18` or `catalog:react19` (`docs/rt_runtime__fundamentals__workspaces.md:810-849`). For npm workspaces, `workspace:*`, `workspace:~`, and `workspace:^` remain supported (`docs/rt_runtime__fundamentals__workspaces.md:739-758`).

## Peer dependencies

Peer dependencies exist only in `package.json`; `deno.json` has no `peerDependencies` field or equivalent, and its `imports` map merely makes the peer resolvable (`docs/rt_runtime__packages__peer_dependencies.md:7-42`).

| Situation | Behavior | Evidence |
|---|---|---|
| satisfying a peer | list both packages in root `imports`, or the peer in `dependencies` | `docs/rt_runtime__packages__peer_dependencies.md:44-62` |
| isolated layout | each package sees only declared dependencies, so missing peers fail early | `docs/rt_runtime__packages__peer_dependencies.md:64-72` |
| flat-sibling assumption | use `nodeModulesDir: manual` with `nodeModulesLinker: hoisted` | `docs/rt_runtime__packages__peer_dependencies.md:74-85` |
| optional peers | `peerDependenciesMeta` marks them; supply only if the feature is used | `docs/rt_runtime__packages__peer_dependencies.md:87-105` |
| unmet peer | module-not-found error until it is added and `deno install` runs | `docs/rt_runtime__packages__peer_dependencies.md:107-122` |

## Publishing and migration

`deno publish` tries every member with `name` and `exports` and fails on a missing `version`; `"publish": false` opts a `deno.json` member out while leaving it in the workspace (`docs/rt_runtime__fundamentals__workspaces.md:352-379`). Workspace references are replaced with registry references at publish time, and dependent packages are published first (`docs/rt_runtime__fundamentals__workspaces.md:381-396`). `publish.exclude` prunes tests and examples from the uploaded file list (`docs/rt_runtime__fundamentals__workspaces.md:328-350`). npm `workspaces` globs are read directly; a `pnpm-workspace.yaml` must be converted to a `deno.json` workspace (`docs/rt_runtime__fundamentals__workspaces.md:884-915`).

## Pitfalls

- `package.json` `"private": true` is not read by Deno; only `publish: false` in a `deno.json` member opts out of JSR publishing (`docs/rt_runtime__fundamentals__workspaces.md:376-379`).
- A `nodeModulesDir` or `allowScripts` setting in a member is ignored with a warning (`docs/rt_runtime__fundamentals__workspaces.md:500-502`).
- Catalog entries always resolve to npm specifiers; JSR packages stay in `imports` (`docs/rt_runtime__fundamentals__workspaces.md:773-780`).
- If both root files define catalogs they are not merged (`docs/rt_runtime__fundamentals__workspaces.md:872-873`).

## Sources
- https://docs.deno.com/runtime/fundamentals/workspaces/
- https://docs.deno.com/runtime/packages/peer_dependencies/
- https://docs.deno.com/runtime/packages/publishing/
- https://docs.deno.com/runtime/reference/cli/publish/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/runtime/migrate/migrate_from_npm/
- https://jsr.io/
- https://github.com/denoland/deno
