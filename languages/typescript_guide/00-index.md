# 00 - Index

TypeScript 6.0.3 is a transition release: it keeps the 5.9 API surface while making modern
defaults mandatory and preparing projects for the native TypeScript 7 compiler
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:301-313`). This guide is an
on-demand reference for agents. It does not teach syntax from scratch; it records the decisions,
failure signals and verification hooks that matter when writing, reviewing or migrating typed
code. Facts are pinned to `docs/...:line` exports of the official documentation and to
`repo/...:line` files in the `v6.0.3` checkout at commit
`050880ce59e30b356b686bd3144efe24f875ebc8`.

The smallest deterministic starting configuration is an explicit `types` array instead of the
old implicit `@types` enumeration; the release notes report 20-50% build-time improvements from
setting it appropriately (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-381`).
Verbatim migration block (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:383-389`):
```ts
diff
{
"compilerOptions": {
// Explicitly list the @types packages you need
+ "types": ["node", "jest"]
}
}
```

## Concept map

| Theme | Chapters | Decision it resolves | Primary evidence |
|---|---|---|---|
| Modern v6 baseline | `01`, `12` | Which defaults and deprecations apply now | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:323-340` |
| Type-system core | `02`, `10` | How to model a value without `any` | `docs/docs__handbook__declaration-files__do-s-and-don-ts.html.txt:9-31` |
| Functional style | `03`, `04` | How to make effects and data explicit | `docs/docs__handbook__2__narrowing.html.txt:425-437` |
| Determinism | `04`, `05`, `13` | How to stop declaration and build output drifting | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:141-184` |
| Modules and config | `05`, `11` | Which module/resolution pair to choose | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:423-440` |
| Performance | `06`, `11` | Where compiler time is actually spent | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:337-348` |
| Security | `07`, `08` | Which type boundary rejects bad input | `repo/lib/lib.es2025.regexp.d.ts:18-29` |
| Errors and logs | `08`, `09` | How failures become stable, queryable signals | `repo/src/compiler/diagnosticMessages.json:4747-4750` |

## Reading order

| Task | Start | Then | Stop when |
|---|---|---|---|
| Upgrade a 5.9 project | `01-modern-typescript-6.md` | `05-modules-and-configuration.md`, `11-tooling-and-ci.md` | deprecations resolved or explicitly deferred with `ignoreDeprecations` |
| Design a typed API | `02-type-system-core.md` | `10-api-and-declaration-design.md`, `07-security.md` | public types avoid `any` and expose exhaustive unions |
| Refactor toward FP | `03-functional-programming.md` | `04-deterministic-design.md`, `06-performance.md` | effects are explicit and emitted output is reproducible |
| Diagnose a build | `11-tooling-and-ci.md` | `06-performance.md`, `08-errors-and-diagnostics.md` | the diagnostic code and config causing it are identified |
| Audit coverage | `13-coverage-and-limits.md` | `14-coverage-evidence.md`, `15-minimal-verified-cut.md` | each topic measured against its 20-item checklist |

## Measured surface

| Surface | Measurement | Source |
|---|---|---|
| Pinned commit | `050880ce59e30b356b686bd3144efe24f875ebc8` | `git ls-remote --tags` on `v6.0.3` |
| Repository files | 81,500 (including 80,520 test files) | local checkout inventory |
| Compiler sources | 743 files under `src/` | local checkout inventory |
| Documentation pages | 126 exported pages, about 1.9 MB | crawl of `https://www.typescriptlang.org/docs/` |
| Guide | 16 chapters, six byte-identical samples, one mechanical verifier | this repository |

## Verification contract

Every claim uses a path-and-line token; a bare path describes a whole file. Derived arithmetic is
marked **derived**. A code block is accepted only when its body is literally present in the cited
source lines. `unverified` appears only in the coverage chapter and marks items that need a live
program, never a documentation gap hidden as a success. The verifier counts citations, official
URLs, literal blocks, chapter sizes, sample identity and per-topic coverage.

## Non-goals

| Not here | Reason | Use instead |
|---|---|---|
| Syntax tutorial | Agents need lookup density, not a first lesson | `https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html` |
| Exhaustive type-level puzzle catalog | Most production wins come from unions, guards and explicit annotations | `02-type-system-core.md`, `03-functional-programming.md` |
| Framework-specific build recipes | Bundler and framework docs own those flags | `05-modules-and-configuration.md` for the compiler boundary only |
| Compiler internals as an end in itself | Only observable options and diagnostics are auditable here | `repo/src/compiler/` sources cited per claim |
| Runtime measurements | No program was executed during this dossier | `14-coverage-evidence.md` marks those items `unverified` |

## Citation legend

| Token form | Meaning | Example |
|---|---|---|
| `docs/<file>.txt:LINE` | One line in the exported documentation page; URL is on line 1 | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:326` |
| `repo/<path>:LINE` | One line in the pinned `v6.0.3` source checkout | `repo/src/compiler/commandLineParser.ts:979` |
| `NN-slug.md:LINE` | One line in a guide chapter, used only as checklist evidence | `04-deterministic-design.md:12` |
| **derived** | A calculation or inference made by this guide, not a source quote | `20-50% build-time gain` from release notes |

The token is deliberately mechanical: a verifier can resolve it, check the line range and compare
a fenced block byte-for-byte. Prose that merely sounds authoritative is not accepted. When a
source and a local convention conflict, the pinned source wins and the convention is recorded as
**derived** guidance. This is what keeps the guide useful after the public docs move again.

## Sources

- https://www.typescriptlang.org/
- https://www.typescriptlang.org/docs/
- https://www.typescriptlang.org/docs/handbook/intro.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://www.typescriptlang.org/docs/handbook/2/modules.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html
- https://github.com/microsoft/TypeScript/tree/v6.0.3
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/diagnosticMessages.json
