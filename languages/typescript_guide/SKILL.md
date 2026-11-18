---
name: typescript
description: >-
  TypeScript 6.0.3 audited reference: modern defaults and TS7 migration, strict type-system
  core, functional and immutable patterns, deterministic declaration emit, modules and tsconfig,
  compiler and runtime performance, security boundaries, diagnostics, typed logging, API and
  declaration design, tooling and CI. Load when writing, reviewing, migrating, hardening or
  debugging TypeScript code or a tsconfig at v6.0.3.
category: languages
version: 6.0.3 / 050880ce
tags: [typescript, typescript6, strict, functional, determinism, performance, security, diagnostics, logging, tsconfig, declarations]
license: MIT
---

# TypeScript 6.0.3

Static, auditable snapshot of the official documentation at `typescriptlang.org/docs/` and of the
`microsoft/TypeScript` checkout at tag `v6.0.3`, commit
`050880ce59e30b356b686bd3144efe24f875ebc8`. Captured on 2026-11-18. No compiler build, package
install or live program was executed; every factual claim resolves to a file that was read.

## When to load this skill

- Writing or reviewing TypeScript code that must stay strict and deterministic.
- Upgrading a 5.9 project to 6.0.3 or preparing it for the native 7.0 compiler.
- Choosing a `module`/`moduleResolution` pair, `types`, `rootDir` or declaration policy.
- Refactoring toward pure functions, algebraic data types and explicit failure channels.
- Diagnosing compiler errors, declaration churn, slow builds or unclear runtime logs.

## Measured surface

| Surface | Measurement |
|---|---|
| Repository files | 81,500 total; 80,520 under `tests/`; 743 under `src/` |
| Documentation pages | 126 exported pages, about 1.9 MB, under `docs/` in the research corpus |
| Guide | 16 chapters (00-15), six byte-identical samples, one mechanical verifier |
| Coverage | six 20-item checklists, each measured against an 85% floor |

## Four focus themes

| Theme | Primary chapters | Core claim |
|---|---|---|
| Modern baseline | 01, 05, 12 | 6.0 flips modern defaults and bridges deprecated options to 7.0 |
| Functional and deterministic | 02, 03, 04, 10 | Model facts with literal unions and guards; make emit reproducible |
| Performance and safety | 06, 07 | Compiler time comes from config surface; safety comes from strict boundaries |
| Errors and observability | 08, 09, 11 | Diagnostics, tagged failures and stable log fields share one vocabulary |

## Six invariants worth memorizing

1. **Explicit beats ambient.** Set `types` and `rootDir`; do not rely on implicit enumeration or inference.
2. **Unknown at the boundary.** Narrow with guards; `any` deletes the contract for every caller.
3. **Make illegal states unrepresentative.** Use literal unions, discriminants and exhaustive switches.
4. **Purity is a review discipline.** TypeScript checks shapes, not effects; keep effects at the edge.
5. **Declarations are output.** Diff `.d.ts` files in CI; use `stableTypeOrdering` only for comparisons.
6. **Deprecations are debt.** `ignoreDeprecations: "6.0"` is a bridge, not a destination.

## File Map

| File | Content |
|---|---|
| `00-index.md` | Scope, citation contract, measured surface, reading order, non-goals |
| `01-modern-typescript-6.md` | Defaults, ES2025, Temporal, RegExp.escape, upsert methods, deprecations, TS7 bridge |
| `02-type-system-core.md` | Inference, contextual typing, satisfies, literals, unknown/never, narrowing, generics |
| `03-functional-programming.md` | Purity, readonly data, algebraic types, Result/Option, composition, Map upsert |
| `04-deterministic-design.md` | Stable type ordering, explicit annotations, reproducible declarations, migration cost |
| `05-modules-and-configuration.md` | tsconfig, strict family, ESM/CJS, resolution, paths, type-only imports, references |
| `06-performance.md` | types/rootDir/libReplacement, incremental builds, tracing, stable ordering cost, modern targets |
| `07-security.md` | Strict boundaries, unknown, indexed access, RegExp.escape, Temporal, module trust |
| `08-errors-and-diagnostics.md` | Diagnostic codes, TS5112, deprecations, narrowing errors, tagged failures, source maps |
| `09-logging-and-observability.md` | Typed log levels, stable fields, tagged serialization, trace events, redaction |
| `10-api-and-declaration-design.md` | Package types, export shape, overload ordering, declaration determinism |
| `11-tooling-and-ci.md` | tsc modes, build info, exports/imports, editor integration, CI gates, migration workflow |
| `12-quick-reference.md` | Flags, commands, type patterns and deprecation map with line citations |
| `13-coverage-and-limits.md` | Measured surface, coverage model, known limits, verification method |
| `14-coverage-evidence.md` | 20-item checklists and measured coverage for six focus topics |
| `15-minimal-verified-cut.md` | Artifact contract, simplest model, sufficiency questions, spec budget |
| `samples/` | Six byte-identical slices anchored to docs exports and the pinned source |

## Citation contract

- `docs/<file>.txt:LINE` resolves to the exported documentation page; URL is on line 1.
- `repo/<path>:LINE` resolves to the pinned `v6.0.3` checkout.
- `NN-slug.md:LINE` is used as evidence in the coverage tables.
- A path without a line supports a whole-file fact. Computed claims carry **derived**.
- Fenced blocks are verbatim, cite their source on the line above and never invent code.
- Every chapter ends with `## Sources` and at least eight official URLs.

## Read order

Start at `00-index.md`. For an upgrade, continue `01` → `05` → `11` → `12`. For code design,
read `02` → `03` → `04` → `10`. For failure work, read `08` → `09`. Use `06` and `07` before
performance or security decisions, and `13`/`14` before claiming coverage.

## Sources

- https://www.typescriptlang.org/
- https://www.typescriptlang.org/docs/
- https://www.typescriptlang.org/docs/handbook/intro.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html
- https://github.com/microsoft/TypeScript/tree/v6.0.3
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/diagnosticMessages.json
