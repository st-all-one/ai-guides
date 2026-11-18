# 07 - Security in TypeScript 6.0.3

Security in this release is mostly about shrinking what the compiler trusts implicitly. `strict` is now true by default, and options that once widened the ambient surface or accepted legacy module semantics are deprecated or removed (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:325-328`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:509-516`). The compiler treats every declaration file it loads as part of the program, so explicit configuration is a real boundary (`docs/docs__handbook__declaration-files__consumption.html.txt:8-17`).

## Type-level boundaries

| ID | guard | when | evidence |
|---|---|---|---|
| S01 | `strict: true` by default | all new projects | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:325-328` |
| S02 | strict sub-flags (`strictNullChecks`, `strictFunctionTypes`, `strictBuiltinIteratorReturn`) | when auditing individual checks | `repo/src/compiler/commandLineParser.ts:919-976` |
| S03 | `unknown` in place of `any` for external data | parsing untrusted input | `docs/docs__handbook__2__functions.html.txt:545-558` |
| S04 | `noUncheckedIndexedAccess` | indexing arrays or records from input | `docs/docs__handbook__compiler-options.html.txt:386-389` |
| S05 | `exactOptionalPropertyTypes` | optional fields must not smuggle `undefined` | `docs/docs__handbook__compiler-options.html.txt:211-214` |
| S06 | `satisfies` to validate without widening | configs, maps of literals | `docs/docs__handbook__release-notes__typescript-4-9.html.txt:38-51` |
| S07 | discriminated union on a literal discriminant | modelling messages or state | `docs/docs__handbook__2__narrowing.html.txt:531-535` |
| S08 | `never` default branch for exhaustiveness | switch over a closed union | `docs/docs__handbook__2__narrowing.html.txt:563-576` |

`unknown` is described as any value that cannot legally be used without narrowing, unlike `any` (`docs/docs__handbook__2__functions.html.txt:545-558`); a variable of that type must be checked with `typeof`, comparison, or a type guard before use (`docs/docs__handbook__basic-types.html.txt:163-172`). `satisfies` validates an expression against a type while retaining the more precise inferred type, which keeps literal keys available for later checks (`docs/docs__handbook__release-notes__typescript-4-9.html.txt:38-51`). A discriminant property with literal types lets the checker eliminate impossible branches, and assigning a leftover value to `never` turns a new union member into a compile error (`docs/docs__handbook__2__narrowing.html.txt:531-535`, `docs/docs__handbook__2__narrowing.html.txt:563-576`).

## Runtime-facing checks

| ID | guard | when | evidence |
|---|---|---|---|
| S09 | `RegExp.escape` before interpolating a literal | building regexes from user text | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:270-281` |
| S10 | `Temporal` for time arithmetic | deterministic, timezone-aware values | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:207-221` |
| S11 | explicit `types` array | limit ambient globals | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-380` |
| S12 | `moduleResolution: nodenext` or `bundler` | never `node10` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:423-428` |
| S13 | modern resolution instead of `classic` | removed strategy | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:503-508` |
| S14 | ESM interop always on | consuming CommonJS from ESM | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:509-516` |
| S15 | `with { type: "json" }` import attributes | replacing `asserts` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:564-580` |
| S16 | treat `@types` as installed dev dependencies | declaration trust boundary | `docs/docs__handbook__declaration-files__consumption.html.txt:8-17` |
| S17 | `skipLibCheck` false for audited dependencies | reviewing third-party declarations | `docs/docs__handbook__compiler-options.html.txt:473-476` |
| S18 | resolve deprecations before TS7 | `ignoreDeprecations: "6.0"` is temporary | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:600-603` |
| S19 | explicit config instead of file arguments | tsconfig present in directory | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:587-594` |
| S20 | static prevention of prototype pollution | no such guarantee in pinned sources | not established |

`RegExp.escape` escapes syntax characters so a string can be interpolated as a literal (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:270-272`); the declaration states the safety property directly (`repo/lib/lib.es2025.regexp.d.ts:17-29`):

`repo/lib/lib.es2025.regexp.d.ts:17-29`
```
interface RegExpConstructor {
    /**
     * Escapes any RegExp syntax characters in the input string, returning a
     * new string that can be safely interpolated into a RegExp as a literal
     * string to match.
     * @example
     * ```ts
     * const regExp = new RegExp(RegExp.escape("foo.bar"));
     * regExp.test("foo.bar"); // true
     * regExp.test("foo!bar"); // false
     * ```
     */
    escape(string: string): string;
```

`Temporal` is stage 4 and exposed through `esnext` or `esnext.temporal`, giving deterministic instant and plain-date arithmetic without locale-dependent `Date` parsing (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:207-221`, `repo/lib/lib.esnext.temporal.d.ts:219-249`). `types` defaults to `[]`, so ambient packages must be named explicitly; the old behaviour enumerated everything under `node_modules/@types` (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:375-380`).

Module resolution is also a trust decision. `node10` and `classic` are deprecated or removed, `esModuleInterop` and `allowSyntheticDefaultImports` can no longer be disabled, and `asserts` imports now error in favour of `with` (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:423-428`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:503-516`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:564-580`). `skipLibCheck` skips checking all `.d.ts` files and keeps that choice in build info; it is an optimization with a real audit cost (`docs/docs__handbook__compiler-options.html.txt:473-476`, `repo/src/compiler/commandLineParser.ts:1559-1566`). Deprecated options continue under `ignoreDeprecations: "6.0"` but are removed in TS7, and silently ignoring a tsconfig when file arguments are given is now error TS5112 (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:312`, `docs/docs__handbook__release-notes__typescript-6-0.html.txt:587-594`).

## Sources

- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/2/functions.html
- https://www.typescriptlang.org/docs/handbook/basic-types.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html
- https://www.typescriptlang.org/docs/handbook/module-resolution.html
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/lib/lib.es2025.regexp.d.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/lib/lib.esnext.temporal.d.ts
- https://tc39.es/proposal-temporal/
