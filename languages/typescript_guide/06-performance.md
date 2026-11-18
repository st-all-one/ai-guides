# 06 - Performance in TypeScript 6.0.3

TypeScript 6.0.3 is a transition release toward the native TypeScript 7 compiler. Its performance gains come from doing less work by default: no enumeration of `node_modules/@types`, no inference of a common source directory, and no lib-replacement probing (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:302-303`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:337-348`). Projects that set these options explicitly have reported 20-50% build-time improvements (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:380`).

## Compiler-side levers

| ID | lever | when | evidence |
|---|---|---|---|
| P01 | `types: []` plus an explicit `["node", "jest"]` | every tsconfig | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-381` |
| P02 | `types: ["*"]` for temporary compatibility | only while migrating | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:319` |
| P03 | `rootDir` defaults to the tsconfig directory | no CLI-only compilation | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:341-347` |
| P04 | explicit `rootDir: "./src"` | sources below the config directory | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:348-357` |
| P05 | `libReplacement: false` | default; no lib shadowing configured | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:337-339` |
| P06 | `skipLibCheck: true` | dependency declarations are not owned here | `docs/docs__handbook__compiler-options.html.txt:473-476` |
| P07 | `incremental` with `tsBuildInfoFile` | repeated local builds | `repo/src/compiler/commandLineParser.ts:468-474` |
| P08 | `composite` with `tsc -b` | project-reference workspaces | `docs/docs__handbook__project-references.html.txt:76-79` |
| P09 | `--generateTrace <dir>` | investigating slow checks | `repo/src/compiler/commandLineParser.ts:460-466` |
| P10 | `stableTypeOrdering` for 6-to-7 comparison | migration windows only; up to 25% slower | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:182-184` |
| P11 | checker sorts types and symbols by content | enabled by P10 | `repo/src/compiler/checker.ts:1545`, `repo/src/compiler/checker.ts:53815-53817` |
| P12 | native TS7 port with parallel checking | planning migrations | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:173-176` |
| P13 | `watchOptions.useFsEvents` | large watch trees with OS limits | `docs/docs__handbook__configuring-watch.html.txt:10-11` |
| P14 | explicit `types` shrinks watch locations | watch and editor sessions | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:338` |

`types` is declared as a list that changes program structure (`repo/src/compiler/commandLineParser.ts:1167-1177`). The old default enumerated every package under `node_modules/@types`, which in flattened workspaces can add hundreds of declaration files (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:374-379`). `rootDir` was formerly inferred from every non-declaration input path, a cost eliminated by the new default (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:343-346`). `skipLibCheck` also participates in build-info invalidation, so toggling it forces a rebuild (`repo/src/compiler/commandLineParser.ts:1559-1566`).

Tracing is available through the compiler event tracer (`repo/src/compiler/tracing.ts:26-27`) and the `--generateTrace` option emits an event trace plus a type list (`repo/src/compiler/commandLineParser.ts:460-466`). Deterministic ordering is intentionally not free: the flag is described as adding up to 25% slowdown and is meant only to diagnose order differences (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:184`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:201`). Parallel checking in the native port needs content-based ordering so checkers see the same objects (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:173-178`).

## Runtime-side levers

| ID | lever | when | evidence |
|---|---|---|---|
| P15 | `target`/`lib` of `es2025` | evergreen runtimes | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:203-205` |
| P16 | `lib: ["esnext.temporal"]` | deterministic time arithmetic | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:207-209` |
| P17 | `Map.getOrInsert` upsert | default computed once per key | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:224-244` |
| P18 | `getOrInsertComputed` | expensive or I/O-bound defaults | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:253-260` |
| P19 | modern target avoids downlevel helpers | ES5 is deprecated | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:412-421` |
| P20 | published p95 editor latency for 6.0 versus 5.9 in large monorepos | no figure in pinned sources | not established |

The upsert methods are declared on both `Map` and `WeakMap`, with a callback variant that runs only on a miss (`repo/lib/lib.esnext.collection.d.ts:19-31`):

`repo/lib/lib.esnext.collection.d.ts:19-32`
```
interface Map<K, V> {
    /**
     * Returns a specified element from the Map object.
     * If no element is associated with the specified key, a new element with the value `defaultValue` will be inserted into the Map and returned.
     * @returns The element associated with the specified key, which will be `defaultValue` if no element previously existed.
     */
    getOrInsert(key: K, defaultValue: V): V;
    /**
     * Returns a specified element from the Map object.
     * If no element is associated with the specified key, the result of passing the specified key to the `callback` function will be inserted into the Map and returned.
     * @returns The element associated with the specific key, which will be the newly computed value if no element previously existed.
     */
    getOrInsertComputed(key: K, callback: (key: K) => V): V;
}
```

Modern targets also remove the need for emitted helpers: the default target is now the current-year ES version, effectively `es2025`, because most code ships to evergreen runtimes (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:331-334`). `target: es5` and `--downlevelIteration` are deprecated, so their transform work is no longer inherent to a build (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:412-422`). `Temporal` and `RegExp.escape` are type-only additions, so they add no emit cost (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:204-209`).

## Sources

- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://www.typescriptlang.org/docs/handbook/configuring-watch.html
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/checker.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/tracing.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/program.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/lib/lib.esnext.collection.d.ts
- https://tc39.es/proposal-upsert/
