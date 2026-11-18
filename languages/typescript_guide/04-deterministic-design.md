# 04 - Deterministic Design

Type ordering leaks into declaration files and errors. TS6 assigns type IDs in encounter order and sorts unions by them; an unrelated declaration can reorder emitted unions (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:141-145`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:158-171`). Prefer explicit contracts; use the ordering flag only as a migration diagnostic.

## Why ordering changes

| id | pattern | when it matters | failure signal | evidence |
|---|---|---|---|---|
| D01 | encounter-order type IDs | any union whose members are created in different declaration orders | stable source, reordered `A \| B` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:141-145`, `repo/src/compiler/checker.ts:18064-18099` |
| D02 | unrelated declarations | declaration emit compared across versions or files | an added `const` flips `100 \| 500` to `500 \| 100` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:158-171` |
| D03 | rare ordering-sensitive errors | heavily inference-dependent calls | an error appears or disappears after moving code | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:172`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:181-182` |
| D04 | parallel checking in TS7 | comparing 6.0 and 7.0 results | identical files produce different declarations or diagnostics | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:173-176` |
| D05 | content-based sort in TS7 | reading native-port output | TS7 consistently prints `100 \| 500` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:176-179`, `repo/src/compiler/checker.ts:53856-53878` |
| D06 | cross-version diff noise | declaration-file reviews during migration | large benign diffs obscure real breakage | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:179-181` |
| D07 | `--stableTypeOrdering` | temporary 6.0-to-7.0 comparison | flag default is `false` in the option declaration | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:182-183`, `repo/src/compiler/commandLineParser.ts:978-987` |
| D08 | check cost | enabling the flag in a normal build | up to 25% slowdown, depending on codebase | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:184` |
| D09 | migration-only intent | long-lived build config | false confidence that the flag is a permanent guarantee | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:201-202` |

The canonical example is verbatim (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:148-156`):

```
ts
// Input: some-file.ts
export function foo(condition: boolean) {
return condition ? 100 : 500;
}
// Output: some-file.d.ts
export declare function foo(condition: boolean): 100 | 500;
// ^^^^^^^^^
// Note the order of this union: 100, then 500.
```

The flag swaps ID-keyed union search for a content comparator and sorts symbols; it also maps source files for node comparison (`repo/src/compiler/checker.ts:18068-18099`, `repo/src/compiler/checker.ts:53812-53818`).

## Design rules that remove order dependence

| id | pattern | when to use it | failure signal | evidence |
|---|---|---|---|---|
| D10 | explicit type arguments | inference previously succeeded only by luck | error under `--stableTypeOrdering` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:185-193`, `docs/docs__handbook__2__functions.html.txt:205-230` |
| D11 | annotated variables | complex object passed into a generic call | inferred argument shape changes after reordering | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:194-200`, `docs/docs__handbook__type-inference.html.txt:37-43` |
| D12 | contextual types | callbacks and handlers | untyped parameter inferred as `any` or `unknown` once context changes | `docs/docs__handbook__type-inference.html.txt:45-58`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:83-89` |
| D13 | literal unions | a closed set of commands or states | widening to `string` accepts invalid values | `docs/docs__handbook__2__everyday-types.html.txt:425-472` |
| D14 | `as const` | width must stay literal through a call | `req.method` widens to `string` and is rejected | `docs/docs__handbook__2__everyday-types.html.txt:489-530` |
| D15 | `satisfies` | validate a value without erasing its literal type | check-only annotation loses property detail | `docs/docs__handbook__release-notes__typescript-4-9.html.txt:38-53` |
| D16 | discriminated unions | branching on a literal `kind` field | optional fields force casts instead of narrowing | `docs/docs__handbook__2__narrowing.html.txt:420-433`, `docs/docs__handbook__2__narrowing.html.txt:531` |
| D17 | pure functions | mapping, reducing, and deriving public types | hidden mutable state makes repeated inference order-sensitive | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:172-177`, `docs/docs__handbook__type-inference.html.txt:19-28` |

Best-common-type inference picks a candidate compatible with all others, or a union when none dominates; an explicit annotation removes that search (`docs/docs__handbook__type-inference.html.txt:18-44`). TS6 also stops treating an unused `this` as contextually sensitive (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:83-89`), but explicit annotations remain the documented fix for stable-ordering errors (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:185-200`).

## Configuration and reproducibility

| id | pattern | when to use it | failure signal | evidence |
|---|---|---|---|---|
| D18 | explicit `types` array | every checked-in tsconfig | ambient globals vanish or unwanted packages appear | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-380`, `repo/src/compiler/program.ts:1785-1788` |
| D19 | explicit `rootDir` and stable declaration emit | output compared between 6.0 and 7.0 | files land under `dist/src`, or union order differs | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:341-348`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:145`, `repo/src/compiler/program.ts:3978-3990` |
| D20 | reproducibility checklist | before declaring a migration complete | a clean run uses ambient type discovery or an unpinned target | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:318-322`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:600-603` |

Checklist: pin compiler and `target`; list `types`; set `rootDir`; compare once with `--stableTypeOrdering`, then remove the flag (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:184`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:201-202`). Derived team convention for D20: name an owner and removal date for any temporary flag in CI.

## Sources
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/2/functions.html
- https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- https://www.typescriptlang.org/docs/handbook/type-inference.html
- https://github.com/microsoft/TypeScript
- https://github.com/microsoft/typescript-go
- https://nodejs.org/api/esm.html
