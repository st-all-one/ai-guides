# 11 - Tooling and CI

## Compiler entry points

With no inputs `tsc` searches upward; `-p` accepts a directory or JSON path; command-line input files bypass config discovery (`docs/docs__handbook__tsconfig-json.html.txt:13-15`). In 6.0 that mix raises TS5112: a present `tsconfig.json` will not be loaded when files are given, and `--ignoreConfig` suppresses it (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:587-598`). The CLI checks for a config before honoring the ignore flag (`repo/src/compiler/executeCommandLine.ts:624-634`), which is command-line-only (`repo/src/compiler/commandLineParser.ts:692-699`).

| Flag | Role | Failure signal | Evidence |
|---|---|---|---|
| `--noEmit` | Type-check without writing output | No artifacts for downstream steps | `docs/docs__handbook__compiler-options.html.txt:330-333` |
| `--watch` | Recompile on file changes | Needs file and directory watch hooks | `repo/src/compiler/watch.ts:673-683` |
| `--incremental` | Persist `.tsbuildinfo` for faster rebuilds | Stale build info after config drift | `docs/docs__handbook__compiler-options.html.txt:246-249` |
| `--build` | Orchestrate references in dependency order | Upstream errors block downstream projects | `docs/docs__handbook__project-references.html.txt:75-83` |
| `--generateTrace` | Emit an event trace plus a type catalog | Output directory must be writable | `repo/src/compiler/commandLineParser.ts:460-466` |

Build-mode examples are documented (`docs/docs__handbook__project-references.html.txt:87-92`); the trace flag is a directory-valued CLI option:

`repo/src/compiler/commandLineParser.ts:459-463`
```
    {
        name: "generateTrace",
        type: "string",
        isFilePath: true,
        paramType: Diagnostics.DIRECTORY,
```

## Build graph and build info

References split programs, speed builds, and load dependency declarations on import (`docs/docs__handbook__project-references.html.txt:7-9`, `docs/docs__handbook__project-references.html.txt:41-58`). Referenced projects need `composite`, which implies `declaration` and a config-relative default `rootDir` (`docs/docs__handbook__project-references.html.txt:59-68`). Build mode finds references, tests currency, and builds in order; plain `tsc` never builds dependencies (`docs/docs__handbook__project-references.html.txt:73-83`). Its switches are `--verbose`, `--dry`, `--clean`, `--force` and `--watch` (`docs/docs__handbook__project-references.html.txt:94-99`). It acts as if `noEmitOnError` were on, so a new dependency error cannot be hidden by a later skipped build (`docs/docs__handbook__project-references.html.txt:100-104`).

The solver distinguishes up-to-date, missing output, out-of-date self/upstream/options, upstream-blocked and container-only states (`repo/src/compiler/tsbuild.ts:10-38`). A build-info change forces a rebuild (`repo/src/compiler/builder.ts:1227-1229`), and serialized info records roots, errors, check state and compiler version (`repo/src/compiler/builder.ts:1232-1251`). `tsBuildInfoFile` fixes the path and affects emit and build info (`repo/src/compiler/commandLineParser.ts:805-814`); `incremental` is implied by `composite` (`repo/src/compiler/commandLineParser.ts:468-475`). Checked-in outputs may require `--force` after timestamp changes (`docs/docs__handbook__project-references.html.txt:101-104`).

## Editor and server integration

The watch host binds `watchFile` and `watchDirectory` from the system and reports status changes (`repo/src/compiler/watch.ts:673-683`); watched kinds include config files, source files, missing files and wildcard directories (`repo/src/compiler/watch.ts:688-693`). Incremental compilation uses a builder program and reports diagnostics after emit (`repo/src/compiler/watch.ts:987-999`). VS Code's in-memory `.d.ts` generation mitigates missing outputs at a performance cost and can be disabled with `disableSourceOfProjectReferenceRedirect` (`docs/docs__handbook__project-references.html.txt:69-72`). `plugins` exposes language-service plugins (`docs/docs__handbook__compiler-options.html.txt:414-416`), while `explainFiles` and `traceResolution` show inclusion and resolution (`docs/docs__handbook__compiler-options.html.txt:219-222`, `docs/docs__handbook__compiler-options.html.txt:531-534`).

## Emit artifacts and package hand-off

`sourceMap`, `declarationMap`, `inlineSourceMap`, `inlineSources` and `sourceRoot` control map output and embedding (`docs/docs__handbook__compiler-options.html.txt:156-166`, `docs/docs__handbook__compiler-options.html.txt:250-257`, `docs/docs__handbook__compiler-options.html.txt:477-483`). Serialized maps carry sources, names, mappings and source content (`repo/src/compiler/sourcemap.ts:320-330`), with a `sourceMappingURL` link (`repo/src/compiler/sourcemap.ts:363-365`). Ship declarations; maps help only if sources ship too (`docs/docs__handbook__modules__guides__choosing-compiler-options.html.txt:155-157`).

Under Node-family resolution, `exports` subpaths are chosen by conditions and unmapped subpaths blocked (`docs/docs__handbook__modules__reference.html.txt:666-697`); `#` imports use the same algorithm (`docs/docs__handbook__modules__reference.html.txt:856-861`). `paths` does not rewrite emit, so bundled apps may use aliases but published libraries should not (`docs/docs__handbook__modules__reference.html.txt:570-589`). If a bundler emits ESM while `tsc` emits per-file declarations, extensionless declaration imports can fail for `nodenext` consumers (`docs/docs__handbook__modules__guides__choosing-compiler-options.html.txt:158-167`).

## CI gates and reproducibility

| Gate | Decision | Tradeoff | Evidence |
|---|---|---|---|
| Explicit `types: ["node"]` | Name global type packages | Default `[]` otherwise | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-380` |
| `skipLibCheck` | Skip checking all `.d.ts` | Faster, but declaration errors hidden | `docs/docs__handbook__compiler-options.html.txt:473-476` |
| `forceConsistentCasingInFileNames` | Deterministic casing | True by default | `docs/docs__handbook__compiler-options.html.txt:227-230` |
| `stableTypeOrdering` | Stable type order across runs | Opt-in | `docs/docs__handbook__compiler-options.html.txt:484-487` |

`diagnostics` and `extendedDiagnostics` print timing after a build (`docs/docs__handbook__compiler-options.html.txt:167-170`, `docs/docs__handbook__compiler-options.html.txt:223-226`). Trace mode is a CLI concern (`repo/src/compiler/executeCommandLine.ts:1142-1153`); it creates trace and type files and a legend (`repo/src/compiler/tracing.ts:57-95`). Retire deprecations rather than mask them: `ignoreDeprecations: "6.0"` buys time until 7.0 removes the options, and `ts5to6` adjusts `baseUrl`/`rootDir` (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:312-314`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:600-603`).

## Sources

- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://www.typescriptlang.org/docs/handbook/modules/reference.html
- https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/executeCommandLine.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/tsbuild.ts
