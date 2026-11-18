# 01 - Modern TypeScript 6.0

TypeScript 6.0.3 is a transition release: it stays API-compatible with 5.9, yet changes defaults and deprecates options that TypeScript 7 removes (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:302-303`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:600-603`). Treat configuration as an explicit contract rather than an inherited assumption.

## Defaults to state explicitly

| id | pattern | v6.0.3 behavior | failure signal | evidence |
|---|---|---|---|---|
| M01 | `strict` | on by default; previous behavior needs an explicit `false` | new implicit-any and nullability errors in older code | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:325-328` |
| M02 | `module` | defaults to `esnext` | CommonJS assumptions break in ESM-oriented emit | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:329-330` |
| M03 | `target` | floating current-year ES version; `es2025` today | annual drift when a project leaves `target` unset | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:331-334`, `repo/src/compiler/commandLineParser.ts:589-602` |
| M04 | `noUncheckedSideEffectImports` | on by default | typo in a side-effect-only import now errors | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:335-336`, `repo/src/compiler/checker.ts:1544` |
| M05 | `libReplacement` | off by default | failed lib resolutions and extra watch locations disappear | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:337-339`, `repo/src/compiler/program.ts:3839-3848` |
| M06 | `types` | defaults to `[]` | missing `process`, `fs`, `describe` after upgrade | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-380` |
| M07 | `rootDir` | defaults to the tsconfig directory, not an inferred common source root | output appears at `./dist/src/index.js` instead of `./dist/index.js` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:341-348`, `repo/src/compiler/program.ts:3978-3990` |

The option declaration describes the target default as `ScriptTarget.LatestStandard`; pin `target` in checked-in config when output stability matters (`repo/src/compiler/commandLineParser.ts:601`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:332-334`). Automatic `@types` loading only consumes names obtained from the `types` option or implicit discovery; an empty array removes that work (`repo/src/compiler/program.ts:1785-1788`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:378-380`).

## Language and library surface

| id | pattern | when to use it | failure signal | evidence |
|---|---|---|---|---|
| M08 | `es2025` target/lib | new builds targeting evergreen runtimes | unresolved `RegExp.escape` or `Promise.try` on an older `lib` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:203-206` |
| M09 | Temporal types | date arithmetic with stage-4 Temporal; use `esnext` or `esnext.temporal` | `Cannot find name 'Temporal'` on an older `lib` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:207-222`, `repo/lib/lib.esnext.temporal.d.ts:21-31` |
| M10 | `RegExp.escape` | interpolating user text into a regex literal | hand-rolled escaping misses metacharacters | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:270-282`, `repo/lib/lib.es2025.regexp.d.ts:17-29` |
| M11 | Map/WeakMap upsert | `getOrInsert` or lazy `getOrInsertComputed` defaults | has/get/set boilerplate; eager expensive defaults | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:224-269`, `repo/lib/lib.esnext.collection.d.ts:19-47` |
| M12 | `dom` lib | browser code; iterable and async-iterable DOM APIs are now inside it | redundant `dom.iterable` entries; no error when omitted | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:283-299`, `repo/lib/lib.dom.iterable.d.ts:17-18` |
| M13 | `#/` subpath imports | package-internal aliases without an extra segment under `nodenext`/`bundler` | older Node 20 releases reject `#/*` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:114-132` |
| M14 | `moduleResolution: bundler` with `module: commonjs` | upgrade path from deprecated `node10` before moving to `preserve`/`bundler` or `nodenext` | earlier versions rejected this pair | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:133-140` |

Node's subpath-import form and its `#/` variant are shown verbatim below (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:122-129`):

```
json
{
"name": "my-package",
"type": "module",
"imports": {
"#/*": "./dist/*"
}
}
```

## Deprecations and migration

| id | pattern | replacement | failure signal | evidence |
|---|---|---|---|---|
| M15 | `target: es5`, `downlevelIteration` | ES2015 or newer, external post-processor; drop the iteration flag | deprecation error on any `downlevelIteration` setting | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:412-422`, `repo/src/compiler/commandLineParser.ts:596` |
| M16 | `moduleResolution: node`/`node10`, `classic` | `nodenext` for Node, `bundler` for bundles or Bun | resolution deprecation error; `classic` removed | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:423-428`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:503-508` |
| M17 | `amd`, `umd`, `systemjs`, `none`, `outFile` | ESM emit plus an external bundler | unsupported module value; `amd-module` directive inert | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:429-440`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:532-533` |
| M18 | `baseUrl`, `alwaysStrict: false` | fold prefixes into `paths`; assume strict mode everywhere | unresolved-looking paths that worked only via lookup root; reserved-word identifiers fail | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:441-502`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:526-531` |
| M19 | `esModuleInterop: false`, `allowSyntheticDefaultImports: false`, `module Foo`, `asserts` imports, `no-default-lib` | always-on interop, `namespace`, `with`, `noLib`/`libReplacement` | runtime interop bugs; hard deprecation on legacy syntax | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:509-525`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:534-586` |
| M20 | TS5112 and TS7 preparation | `--ignoreConfig` for standalone files; `ignoreDeprecations: "6.0"` temporarily; `ts5to6` for `baseUrl`/`rootDir` | TS5112 when file arguments meet a tsconfig | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:587-599`, `repo/src/compiler/diagnosticMessages.json:4747-4750`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:312-314` |

Derived team policy for M20: record an owner and date for the deprecation bridge, and never carry `ignoreDeprecations` past that date. A codemod adjusts `baseUrl` and `rootDir`, but review remains required (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:313-314`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:601-603`).

## Sources
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/2/functions.html
- https://www.typescriptlang.org/docs/handbook/type-inference.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://github.com/microsoft/TypeScript
- https://tc39.es/proposal-temporal/
- https://tc39.es/ecma262/
- https://nodejs.org/api/packages.html
