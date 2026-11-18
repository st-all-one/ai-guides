# 05 - Modules and configuration

## Configuration surface

A `tsconfig.json` marks a project root and names root files plus compiler options (`docs/docs__handbook__tsconfig-json.html.txt:8-9`). With no inputs `tsc` searches upward; `-p` accepts a directory or JSON path; command-line input files bypass config discovery (`docs/docs__handbook__tsconfig-json.html.txt:13-15`). `compilerOptions` may be omitted (`docs/docs__handbook__tsconfig-json.html.txt:76`); membership uses `files` or `include`/`exclude` (`docs/docs__handbook__tsconfig-json.html.txt:45-58`), and `extends` inherits baselines (`docs/docs__handbook__tsconfig-json.html.txt:60-62`). `composite` requires every implementation file to be matched by a glob or `files` entry (`docs/docs__handbook__project-references.html.txt:63-65`).

### Inherited 6.0.3 defaults

| Setting | Default | Consequence | Evidence |
|---|---|---|---|
| `strict` | on | Opt out with `"strict": false` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:325-328` |
| `module` | `esnext` | ESM emit unless overridden | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:329-330` |
| `target` | current-year ES, now `es2025` | Floating target | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:331-334` |
| `types` | `[]` | No implicit `@types` enumeration | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-380` |
| `rootDir` | config directory | No inferred common root | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:341-347` |
| `noUncheckedSideEffectImports` | on | Side-effect typos caught | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:335-336` |
| `libReplacement` | off | Fewer resolutions | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:337-339` |

`strict` gates `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `useUnknownInCatchVariables` and `strictBuiltinIteratorReturn` (`docs/docs__handbook__compiler-options.html.txt:491-513`, `docs/docs__handbook__compiler-options.html.txt:549-552`). `lib` selects bundled runtime declarations (`docs/docs__handbook__compiler-options.html.txt:285-287`) and `target` implies a matching `lib` (`docs/docs__handbook__modules__guides__choosing-compiler-options.html.txt:142`).

## Module and resolution matrix

`module` controls emit, `moduleResolution` controls lookup (`docs/docs__handbook__compiler-options.html.txt:307-318`); only Node-family modes model dual-format Node.js (`docs/docs__handbook__modules__reference.html.txt:167-168`), where `.ts` follows the nearest `"type": "module"` (`docs/docs__handbook__modules__reference.html.txt:199-201`).

| Mode | Choose when | Failure signal | Evidence |
|---|---|---|---|
| `nodenext` | Runs in modern Node.js | `ERR_MODULE_NOT_FOUND` on extensionless paths | `docs/docs__handbook__modules__guides__choosing-compiler-options.html.txt:130-141` |
| `bundler` | Bundler resolves and emits | Bundle-only specifiers break on publish | `docs/docs__handbook__modules__guides__choosing-compiler-options.html.txt:158-167` |
| `preserve` | Mixed ESM/CJS syntax survives one emit | Needs a matching third-party emitter | `docs/docs__handbook__modules__reference.html.txt:254-280` |
| `node10` / `node` | Deprecated; migration only | Deprecation error unless ignored | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:423-428` |
| `classic` | Removed | All use cases served elsewhere | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:503-507` |
| `amd`, `umd`, `system`, `none` | Removed targets | Error; `amd-module` inert | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:429-439` |

## Interop and package boundaries

`esModuleInterop` and `allowSyntheticDefaultImports` cannot be `false`; rewrite `import * as express` to `import express` where needed (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:509-524`). Node modes imply interop (`docs/docs__handbook__modules__reference.html.txt:247`), `preserve` only for checking (`docs/docs__handbook__modules__reference.html.txt:278-280`); ESM consuming CJS gets `module.exports` as default while named imports are optimistically accepted (`docs/docs__handbook__modules__reference.html.txt:203-205`).

`verbatimModuleSyntax` preserves non-type-only imports/exports and implies `isolatedModules` (`docs/docs__handbook__compiler-options.html.txt:553-556`, `docs/docs__handbook__compiler-options.html.txt:262-265`). `import type`, `export type { ... }` and per-specifier `type` are erased and a type-only import cannot be called (`docs/docs__handbook__modules__reference.html.txt:39`, `docs/docs__handbook__modules__reference.html.txt:59-63`); dual emit from one source is incompatible (`docs/docs__handbook__modules__guides__choosing-compiler-options.html.txt:168-170`).

`#` specifiers resolve via the nearest `package.json` `"imports"` under `node16`/`nodenext`/`bundler` (`docs/docs__handbook__modules__reference.html.txt:856-857`); local remapping uses `outDir`/`declarationDir` and `rootDir` (`docs/docs__handbook__modules__reference.html.txt:860-861`). `paths` never rewrites emit, so libraries prefer `"imports"` (`docs/docs__handbook__modules__reference.html.txt:570-571`, `docs/docs__handbook__modules__reference.html.txt:589`).

## Declaration emit and references

`declaration` emits `.d.ts`, is implied by `composite`, and `declarationMap` adds maps (`docs/docs__handbook__compiler-options.html.txt:156-166`); a separate `outDir` with `rootDir: "src"` avoids loading `.ts` inputs instead of `.d.ts` outputs (`docs/docs__handbook__modules__guides__choosing-compiler-options.html.txt:155-157`). `references` load a dependency's `.d.ts` and enable `tsc -b` ordering (`docs/docs__handbook__project-references.html.txt:41-58`, `docs/docs__handbook__project-references.html.txt:75-83`); solution configs hold references plus empty `files` (`docs/docs__handbook__project-references.html.txt:115-120`).

## Migration decisions

`ignoreDeprecations: "6.0"` is a bridge to 7.0, where deprecated options are removed; `ts5to6` adjusts `baseUrl`/`rootDir` (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:312-314`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:600-603`).

The `baseUrl` prefix fix is in the release notes (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:469-483`); the parser's config-discovery escape hatch:

`repo/src/compiler/commandLineParser.ts:691-695`
```
    {
        name: "ignoreConfig",
        type: "boolean",
        showInSimplifiedHelpView: true,
```

| Pattern | When | Failure signal | Evidence |
|---|---|---|---|
| Fold prefixes into `paths` | Aliases only | Bare `someModule.js` resolves from `src` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:441-467` |
| Explicit `"*"` mapping | Real lookup-root use | Unmapped bare specifiers stop resolving | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:484-500` |

## Sources

- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html
- https://www.typescriptlang.org/docs/handbook/modules/reference.html
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts
- https://nodejs.org/api/packages.html#subpath-imports
