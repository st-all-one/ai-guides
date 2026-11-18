# 12 - Quick reference

Use this file when the task is "which flag or pattern applies now?" The answers are pinned to the
TypeScript 6.0.3 release notes and handbook. Defaults changed in 6.0: `strict`, `module: esnext`,
a floating current-year target, `noUncheckedSideEffectImports`, `libReplacement: false`,
`types: []` and config-relative `rootDir`
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:323-348`).

Verbatim escape hatch (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:596-597`):
```ts
sh
tsc --ignoreConfig foo.ts
```

The two-line command above is the explicit escape hatch when a `tsconfig.json` exists but you
intentionally want file arguments compiled with defaults
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:596-597`). Without it, TS5112 is an
error rather than silently ignored configuration
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:587-594`).

## Compiler flags by intent

| Intent | Flag or config | Default in 6.0 | Failure signal | Evidence |
|---|---|---|---|---|
| Catch unsafe null/undefined | `strict` | `true` | Previously accepted code now errors | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:325-328` |
| Emit modern modules | `module` | `esnext` | CommonJS assumptions break | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:329-331` |
| Target evergreen runtimes | `target` | current-year, now `es2025` | Older runtime syntax gap | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:331-334` |
| Catch typo-only imports | `noUncheckedSideEffectImports` | `true` | Unresolved side-effect import | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:335-336` |
| Avoid needless resolution work | `libReplacement` | `false` | Watch scope grew in older versions | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:337-339` |
| Limit ambient type surface | `types` | `[]` | Missing `node`, `jest`, `bun` globals | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-381` |
| Fix output paths | `rootDir` | `.` relative to tsconfig | `dist/src/index.js` instead of `dist/index.js` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:341-348` |
| Compare 6.0 with 7.0 emit | `stableTypeOrdering` | `false` | Union order noise in `.d.ts` diffs | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:141-184` |
| Bridge a migration | `ignoreDeprecations` | unset | Deprecation errors | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:312-313` |

## Commands by task

| Task | Command | Guard | Evidence |
|---|---|---|---|
| Type-check without emit | `tsc --noEmit` | Config is picked up from cwd or `-p` | `docs/docs__handbook__tsconfig-json.html.txt:13-15` |
| Watch a project | `tsc --watch` | Watch options apply | `docs/docs__handbook__configuring-watch.html.txt:1-12` |
| Build project graph | `tsc --build` | References and composite projects are configured | `docs/docs__handbook__project-references.html.txt:1-12` |
| Inspect compiler work | `tsc --generateTrace <dir>` | Trace output reviewed with a consumer | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:337-339` |
| Compile one file despite config | `tsc --ignoreConfig foo.ts` | Intentional bypass only | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:590-598` |
| Migrate baseUrl prefixes | add prefixes to `paths`, remove `baseUrl` | `ts5to6` can automate adjustments | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:441-501` |

## Type patterns by problem

| Problem | Pattern | Avoid | Evidence |
|---|---|---|---|
| Untrusted input | `unknown` plus a guard | `any` | `docs/docs__handbook__declaration-files__do-s-and-don-ts.html.txt:27` |
| Misspelled discriminant | literal union such as `"circle" \| "square"` | bare `string` | `docs/docs__handbook__2__narrowing.html.txt:430-437` |
| Missing variant handling | `never` default in a switch | silent fallthrough | `docs/docs__handbook__2__narrowing.html.txt:449-455` |
| Validate shape without widening | `satisfies` | broad annotation that loses literals | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:185-199` |
| Optional key present with `undefined` | `exactOptionalPropertyTypes` | conflating absence with `undefined` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:309-311` |
| Expensive Map default | `getOrInsertComputed(key, callback)` | eager default construction | `repo/lib/lib.esnext.collection.d.ts:26-31` |
| Regex from user text | `RegExp.escape(text)` | manual escaping of `* + ? ( )` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:270-281` |
| Import attributes | `with { type: "json" }` | deprecated `asserts` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:564-581` |

## Deprecation quick map

| Removed or deprecated | Replacement | Evidence |
|---|---|---|
| `target: es5`, `downlevelIteration` | `es2015` or newer | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:412-422` |
| `moduleResolution: node` (node10) | `nodenext` or `bundler` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:423-428` |
| `moduleResolution: classic` | `nodenext` or `bundler` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:503-508` |
| `amd`, `umd`, `systemjs`, `none`, `outFile` | ESM target or external bundler | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:429-440` |
| `baseUrl` lookup root | explicit `paths` prefixes | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:441-501` |
| `esModuleInterop: false` | always-on safe interop | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:509-525` |
| `module Foo {}` | `namespace Foo {}` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:534-563` |

## Sources

- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://www.typescriptlang.org/docs/handbook/configuring-watch.html
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/lib/lib.esnext.collection.d.ts
