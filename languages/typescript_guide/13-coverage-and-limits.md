# 13 - Coverage and limits

This dossier covers the documented and source-verifiable surface of TypeScript 6.0.3, not the
behaviour of a running compiler on your machine. It distinguishes three layers: pinned facts
from the release notes and handbook, signatures from the checked-out `lib` files, and **derived**
guidance assembled by this guide. The transition framing matters: 6.0 remains API-compatible
with 5.9 but deprecates options that 7.0 will remove
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:301-313`).

Verbatim lib signature (`repo/lib/lib.esnext.collection.d.ts:25`):
```ts
    getOrInsert(key: K, defaultValue: V): V;
```

The signature above is a source fact; advice about when to prefer it over an eager default is
**derived** from the release-note explanation
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:253-260`).

## Measured surface

| Surface | Measurement | Provenance |
|---|---|---|
| Pinned tag | `v6.0.3` | `git ls-remote --tags` on `microsoft/TypeScript` |
| Pinned commit | `050880ce59e30b356b686bd3144efe24f875ebc8` | tag resolution |
| Repository files | 81,500 | local checkout inventory (**derived**) |
| Test files | 80,520 | local checkout inventory (**derived**) |
| Compiler sources | 743 files under `src/` | local checkout inventory (**derived**) |
| Documentation exports | 126 pages, about 1.9 MB | crawl of `/docs/` (**derived**) |
| Guide chapters | 16 | this repository (**derived**) |
| Byte-identical samples | 6 | `samples/MANIFEST.md` (**derived**) |

## Coverage model

| Topic | Checklist ID | Items | Target | Evidence file |
|---|---|---:|---:|---|
| Functional programming | `F01-F20` | 20 | 85% | `14-coverage-evidence.md` |
| Determinism | `D01-D20` | 20 | 85% | `14-coverage-evidence.md` |
| Performance | `P01-P20` | 20 | 85% | `14-coverage-evidence.md` |
| Security | `S01-S20` | 20 | 85% | `14-coverage-evidence.md` |
| Logs and errors | `E01-E20` | 20 | 85% | `14-coverage-evidence.md` |
| Modern TypeScript 6 | `M01-M20` | 20 | 85% | `14-coverage-evidence.md` |

An item is `documented` only when a chapter answers it with a resolved `path:line` citation.
An item that needs a running compiler, a live dependency tree or production traffic is
`unverified`; it is not silently counted as covered. The target is per topic, so strength in one
area cannot hide a gap in another.

## Known limits

| Limit | Consequence | Safer interpretation | Evidence |
|---|---|---|---|
| No compiler execution | No local timing or diagnostic reproduction | Treat timing claims as source-reported | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-381` |
| No runtime program | No observed error serialisation or log volume | Use only the documented type contracts | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:590-598` |
| Release notes are transition guidance | Deprecations can be deferred temporarily | Remove them before 7.0 adoption | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:600-603` |
| `stableTypeOrdering` has a cost | Comparison runs can be much slower | Use it as a migration diagnostic only | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:182-201` |
| Docs exports are rendered text | Some tooltip duplication exists in exports | Cite the sentence, not the surrounding noise | corpus header lines `1-3` |
| Native 7 checker is not this release | Parallel-checking claims are rationale, not v6 behaviour | Read them as migration context | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:173-178` |

## Verification method

The verifier resolves every token, checks that line ranges exist, compares fenced blocks to the
cited lines, counts official URLs, checks chapter size bands, verifies the six samples against
their pinned slices, parses all six 20-item tables and fails any topic below 85%. It is a
mechanical check of the dossier, not a type-check of a project. The final numbers are recorded in
`14-coverage-evidence.md`; the "smallest sufficient subset" is argued in
`15-minimal-verified-cut.md`.

## What "covered" means in practice

| Question | Answer location | Deliberately not answered here |
|---|---|---|
| Which config is safe by default? | `01`, `05`, flags in `12`; release defaults at `docs/docs__handbook__release-notes__typescript-6-0.html.txt:323-348` | Framework-specific overrides owned by bundlers |
| How should invalid input be modelled? | `02`, `03`, `07`; `any` warning at `docs/docs__handbook__declaration-files__do-s-and-don-ts.html.txt:27` | Choice of a runtime schema library |
| Why did a `.d.ts` file change? | `04`, `10`; ordering at `docs/docs__handbook__release-notes__typescript-6-0.html.txt:145-184` | Actual TypeScript 7 emitted output |
| Where did build time go? | `06`, `11`; `types` impact at `docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-381` | A profile of your specific repository |
| How should a failure be logged? | `08`, `09`; diagnostic metadata at `repo/src/compiler/diagnosticMessages.json:4747-4750` | Runtime collector configuration |
| Which language features arrived in 6.0? | `01`, `12`; `docs/docs__handbook__release-notes__typescript-6-0.html.txt:203-299` | Every historical release note in full |

This boundary is intentional. A dossier that claims runtime truth from documentation alone is
worse than one that names its limits. The six checklists in `14-coverage-evidence.md` therefore
measure whether a question has a traced answer, while this chapter records what a traced answer
still cannot prove. When you need the missing layer, run the project and record the result in your
own repository; do not retrofit it into this guide as if it had been observed here.

The version pin is part of the boundary. If you use TypeScript 5.9, most type-system guidance
still applies, but the defaults and deprecations do not. If you move to 7.0, the compatibility
claim ends: deprecated options are removed there
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:600-603`). Treat the version line
in `VERSION` as a precondition for every citation in this guide.

## Sources

- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/intro.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://www.typescriptlang.org/docs/handbook/modules/reference.html
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://github.com/microsoft/TypeScript/tree/v6.0.3
- https://github.com/microsoft/TypeScript/blob/v6.0.3/lib/lib.esnext.collection.d.ts
