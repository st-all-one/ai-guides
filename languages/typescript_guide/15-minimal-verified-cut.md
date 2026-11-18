# 15 - Minimal verified cut

A dossier fails if it is precise but unusable. This chapter selects the smallest set of rules that
still answers real tasks. The test is not "is every flag mentioned?" but "can an agent choose a
safe default, explain a failure and avoid a migration trap without inventing a new concept?" The
selection is constrained by the pinned release: 6.0 is transition software and deprecations can be
bridged with `ignoreDeprecations` while they are retired
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:312-314`).

Verbatim lib signature (`repo/lib/lib.esnext.collection.d.ts:31`):
```ts
    getOrInsertComputed(key: K, callback: (key: K) => V): V;
```

It earns a place in the minimal cut because one library capability replaces an entire
hand-written "check, compute, insert" pattern
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:253-260`).

## Artifact contract

| Artifact | Data it exposes | Real interaction | Model requirement | Evidence |
|---|---|---|---|---|
| `tsconfig.json` | Defaults, strictness, type surface, output root | Edit once; every other tool reads it | One config core | `docs/docs__handbook__tsconfig-json.html.txt:9-15` |
| Compiler diagnostic | Code, category, message | Triage and fix | Shared diagnostic vocabulary | `repo/src/compiler/diagnosticMessages.json:4747-4750` |
| `.d.ts` output | Public types consumed downstream | Diff in CI | Deterministic ordering rule | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:145-184` |
| Build trace | Compiler events and type list | Locate slow phases | No new runtime model | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:173-184` |
| Typed source | Literal unions, guards, `unknown`, `readonly` | Write and review code | Algebraic type model | `docs/docs__handbook__2__narrowing.html.txt:425-437` |
| Structured log event | Stable fields, tagged error, correlation id | Query after failure | Reuse the error model | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:596-597` |

**Derived count:** five of these six artifacts are projections of two cores - the compiler config
and the algebraic type model. Only the build trace and the runtime log need separate collection
surfaces, and neither adds a data-model column.

## Simplest sufficient model

| Candidate model | Verdict | Reason |
|---|---|---|
| One `tsconfig` plus literal unions and guards | Keep | Covers defaults, safety, determinism and API shape |
| A separate model per compiler flag | Reject | Flags are projections of the config core |
| Runtime `Result` class hierarchy for every error | Reject | Tagged unions already express success and failure |
| Closure table for module dependencies | Reject | Project references and `paths` cover the real build graph |
| Duplicated type definitions per package | Reject | Declaration emit and `types` already define the contract |
| Custom regex escaping helper | Reject | `RegExp.escape` is standardized in the pinned lib |

## Sufficiency questions

The kept model answers each question without adding a column:

1. Which defaults changed? `strict`, `module`, `target`, side-effect imports, `libReplacement`,
   `types` and `rootDir` are listed in the release notes
   (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:323-348`).
2. Why did a build get faster? Explicit `types` avoids ambient enumeration
   (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-381`).
3. Why did declaration output move? Literal type IDs depend on encounter order unless stable
   ordering is requested (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:141-171`).
4. What fixes an inference error under stable ordering? An explicit type argument or variable
   annotation (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:185-199`).
5. How is invalid input handled? `unknown` at the boundary plus narrowing
   (`docs/docs__handbook__declaration-files__do-s-and-don-ts.html.txt:27`).
6. How is a misspelled variant caught? A literal union instead of `string`
   (`docs/docs__handbook__2__narrowing.html.txt:436-437`).
7. How are missing cases detected? A `never` default in the switch
   (`docs/docs__handbook__2__narrowing.html.txt:449-455`).
8. Which module strategy is viable? `nodenext` or `bundler` replace deprecated resolution
   (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:423-428`).
9. How is a regex user input made safe? `RegExp.escape`
   (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:270-281`).
10. Why did one command ignore the config? TS5112 makes that explicit
    (`repo/src/compiler/diagnosticMessages.json:4747-4750`).
11. How is expensive default construction avoided? `getOrInsertComputed`
    (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:253-260`).
12. What is the migration bridge? `ignoreDeprecations: "6.0"` plus the `ts5to6` codemod
    (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:312-314`).

## Spec budget

| Document | Ceiling | Rule preventing regrowth |
|---|---:|---|
| `01` | 7.6 KB | List a default once; link the rest from `12` |
| `02-04` | 7.6 KB each | One pattern per row; no historical timeline |
| `05-11` | 7.6 KB each | Derive flags from the config core |
| `12` | 7.6 KB | Commands and flags only, no prose tutorials |
| `13-15` | 7.6 KB each | Measure, do not re-explain the chapters |
| `14` | 20 KB | Table rows only; one evidence line per item |

Any new claim must displace an existing row or cite a source line that is not already represented.
That is the guard against turning this cut back into a museum.

## Sources

- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/diagnosticMessages.json
- https://github.com/microsoft/TypeScript/blob/v6.0.3/lib/lib.esnext.collection.d.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts
