# 08 - Errors and diagnostics

Compiler diagnostics are structured data: each entry in `repo/src/compiler/diagnosticMessages.json` pairs a template with a code and category; the enum is Warning, Error, Suggestion, Message (`repo/src/compiler/types.ts:7313-7318`). Automate on code, route on category, leave text for humans.

| Code | Category | Trigger | Recovery action | Evidence |
|---|---|---|---|---|
| 2307 | Error | Unresolved module | Add dependency or declarations | `repo/src/compiler/diagnosticMessages.json:1950-1952` |
| 2322 | Error | Value not assignable | Fix value or contract; avoid blind casts | `repo/src/compiler/diagnosticMessages.json:2010-2012` |
| 2591 | Error | Missing global after narrowed `types` | Add `"node"` to `types` | `repo/src/compiler/diagnosticMessages.json:2967-2969` |
| 5101 / 5107 | Error | Deprecated option or value | Migrate; `ignoreDeprecations` only defers | `repo/src/compiler/diagnosticMessages.json:4703-4705` |
| 5111 | Message | Migration link | Advice, not a build failure | `repo/src/compiler/diagnosticMessages.json:4743-4745` |
| 5112 | Error | File arguments with config present | Drop files or pass `--ignoreConfig` | `repo/src/compiler/diagnosticMessages.json:4747-4750` |

`repo/src/compiler/diagnosticMessages.json:4747-4750`
```
    "tsconfig.json is present but will not be loaded if files are specified on commandline. Use '--ignoreConfig' to skip this error.": {
        "category": "Error",
        "code": 5112
    },
```

## Configuration-origin errors

TypeScript 6.0 defaults `types` to `[]`, so projects relying on automatic `@types` enumeration now see unresolved globals and modules (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-380`). The notes enumerate the new `fs`/`path`/`process`/`Bun`/`describe` messages (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:401-410`). Recovery: list packages explicitly (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:381-389`) or use `["*"]`, which restores enumeration at a performance cost (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:376-399`). Dedicated TS2591-2593 templates name the likely package (`repo/src/compiler/diagnosticMessages.json:2967-2978`).

TS5112 is config-selection, not type checking: file arguments with a present config mean the config is not loaded (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:587-593`). The flag is command-line-only (`repo/src/compiler/commandLineParser.ts:688-700`; `docs/docs__handbook__compiler-options.html.txt:37-39`). Use `tsc --ignoreConfig foo.ts` only when defaults are intended (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:594-599`); it discards every config option.

TS5101/5107 direct users to `"ignoreDeprecations": "6.0"` (`repo/src/compiler/diagnosticMessages.json:4703-4705`; `repo/src/compiler/diagnosticMessages.json:4727-4729`); TS5103 flags an invalid value (`repo/src/compiler/diagnosticMessages.json:4711-4713`). The option is a parsed string (`repo/src/compiler/commandLineParser.ts:1683-1688`). It defers, not performs, migration: TS7 removes deprecated options (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:600-603`), and some changes have no direct error (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:315-320`).

With `--stableTypeOrdering`, an unrelated constant can flip declaration-emit order from `100 | 500` to `500 | 100` (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:141-172`); rarely an error appears or disappears (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:172-181`). The flag aligns 6.0 with 7.0 (`docs/docs__handbook__compiler-options.html.txt:484-487`). On new errors, add an explicit type argument or annotation (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:182-199`); the flag is a migration diagnostic, not a permanent setting (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:201`).

| Guard or construct | Error pattern it addresses | Failure signal | Evidence |
|---|---|---|---|
| `typeof` | `typeof null` is `"object"`; branch on more than one guard | Widened `string[] | null` survives | `docs/docs__handbook__2__narrowing.html.txt:63-98` |
| `in` | Optional versus missing properties | False branch still contains optional members | `docs/docs__handbook__2__narrowing.html.txt:254-271` |
| Control flow | Guards and assignments split and re-merge | TS2322 after an assignment | `docs/docs__handbook__2__narrowing.html.txt:337-355` |
| Discriminated union | A shared literal `kind` field | TS2367 on impossible comparisons | `docs/docs__handbook__2__narrowing.html.txt:420-436`; `docs/docs__handbook__2__narrowing.html.txt:531` |

## Runtime error values

A tagged or Result-style error is **derived** from discriminated unions: a literal field lets a switch narrow variants, explicitly recommended for network messages and state transitions (`docs/docs__handbook__2__narrowing.html.txt:557-558`). An `assertNever` helper is **derived** naming for the documented `never` default (`docs/docs__handbook__2__narrowing.html.txt:559-576`); a new variant yields TS2322 (`docs/docs__handbook__2__narrowing.html.txt:581-598`). Strict mode defaults catch bindings to `unknown`, forcing a guard before `message` (`docs/docs__handbook__release-notes__typescript-4-4.html.txt:226-253`; `docs/docs__handbook__compiler-options.html.txt:549-552`); explicit `any` opts out (`docs/docs__handbook__release-notes__typescript-4-4.html.txt:269`). `--sourceMap` and `--declarationMap` emit maps for JavaScript and `.d.ts` (`docs/docs__handbook__compiler-options.html.txt:163-166`, `docs/docs__handbook__compiler-options.html.txt:477-483`); the compiler resolves generated positions via `sourceRoot`/`sources` (`repo/src/compiler/sourcemap.ts:699-705`) and logs decode failures (`repo/src/compiler/sourcemap.ts:739-745`). Shipping maps is **derived** practice for authored stack frames.

## Sources
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/diagnosticMessages.json
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/types.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/sourcemap.ts
