# 14 - Coverage evidence

Coverage is measured per topic, never as a single global percentage. Each of six topics has 20
items describing what effective use requires. An item is `documented` when the guide answers it
with a resolved `path:line` citation; it is `unverified` when only a live compiler, dependency
tree or running program can answer. Coverage is `documented / 20`, with a floor of 85%. The
verifier parses every row, resolves every evidence line and fails any topic below the floor.

Metric scope (**derived**): this measures documentation coverage of a curated checklist, not
runtime validation. The five `unverified` items are counted as gaps, not hidden as successes.

```ts
    getOrInsert(key: K, defaultValue: V): V;
```

The block above is verbatim from the pinned lib (`repo/lib/lib.esnext.collection.d.ts:25`) and
backs F19 and P17.

## 1. Functional programming

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| F01 | functional | inference and annotation boundaries | documented | `02-type-system-core.md:7` |
| F02 | functional | contextual typing of callbacks | documented | `02-type-system-core.md:12` |
| F03 | functional | satisfies without widening | documented | `02-type-system-core.md:13` |
| F04 | functional | literal types, unions, as const | documented | `02-type-system-core.md:19` |
| F05 | functional | unknown at untrusted boundaries | documented | `03-functional-programming.md:7` |
| F06 | functional | purity: shapes checked, effects not | documented | `03-functional-programming.md:7` |
| F07 | functional | readonly is shallow immutability | documented | `03-functional-programming.md:7` |
| F08 | functional | ReadonlyArray for safe consumers | documented | `03-functional-programming.md:15` |
| F09 | functional | as const for fixed literals | documented | `03-functional-programming.md:16` |
| F10 | functional | Readonly for property writes | documented | `03-functional-programming.md:17` |
| F11 | functional | exactOptionalPropertyTypes absence | documented | `02-type-system-core.md:57` |
| F12 | functional | noUncheckedIndexedAccess on reads | documented | `02-type-system-core.md:56` |
| F13 | functional | discriminated unions as ADTs | documented | `03-functional-programming.md:21` |
| F14 | functional | tagged Result and Option flows | documented | `03-functional-programming.md:23` |
| F15 | functional | exhaustiveness via never | documented | `02-type-system-core.md:34` |
| F16 | functional | type-predicate guards | documented | `03-functional-programming.md:23` |
| F17 | functional | generic composition and pipe | documented | `03-functional-programming.md:27` |
| F18 | functional | currying and higher-order callbacks | documented | `03-functional-programming.md:27` |
| F19 | functional | deterministic Map upsert | documented | `03-functional-programming.md:31` |
| F20 | functional | once-only callback under concurrency | unverified | `03-functional-programming.md:51` |

## 2. Determinism

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| D01 | determinism | encounter-order type IDs sort unions | documented | `04-deterministic-design.md:9` |
| D02 | determinism | unrelated declaration reorders emit | documented | `04-deterministic-design.md:10` |
| D03 | determinism | errors appear or disappear by order | documented | `04-deterministic-design.md:11` |
| D04 | determinism | TS7 parallel checking breaks IDs | documented | `04-deterministic-design.md:12` |
| D05 | determinism | TS7 content-based sort | documented | `04-deterministic-design.md:13` |
| D06 | determinism | cross-version declaration diff noise | documented | `04-deterministic-design.md:14` |
| D07 | determinism | stableTypeOrdering aligns 6 with 7 | documented | `04-deterministic-design.md:15` |
| D08 | determinism | cost up to 25 percent | documented | `04-deterministic-design.md:16` |
| D09 | determinism | flag is migration diagnostic only | documented | `04-deterministic-design.md:17` |
| D10 | determinism | explicit type arguments | documented | `04-deterministic-design.md:39` |
| D11 | determinism | explicit variable annotations | documented | `04-deterministic-design.md:40` |
| D12 | determinism | contextual typing and inference | documented | `04-deterministic-design.md:41` |
| D13 | determinism | literal unions | documented | `04-deterministic-design.md:42` |
| D14 | determinism | as const | documented | `04-deterministic-design.md:43` |
| D15 | determinism | satisfies | documented | `04-deterministic-design.md:44` |
| D16 | determinism | discriminated-union narrowing | documented | `04-deterministic-design.md:45` |
| D17 | determinism | pure functions | documented | `04-deterministic-design.md:46` |
| D18 | determinism | explicit types, no ambient enumeration | documented | `04-deterministic-design.md:54` |
| D19 | determinism | explicit rootDir and declaration output | documented | `04-deterministic-design.md:55` |
| D20 | determinism | derived CI owner and removal date | unverified | `04-deterministic-design.md:58` |

## 3. Performance

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| P01 | performance | types array and explicit packages | documented | `06-performance.md:9` |
| P02 | performance | types wildcard only as fallback | documented | `06-performance.md:10` |
| P03 | performance | rootDir default is config directory | documented | `06-performance.md:11` |
| P04 | performance | explicit rootDir for nested sources | documented | `06-performance.md:12` |
| P05 | performance | libReplacement false cuts resolutions | documented | `06-performance.md:13` |
| P06 | performance | skipLibCheck tradeoff | documented | `06-performance.md:14` |
| P07 | performance | incremental and build info | documented | `06-performance.md:15` |
| P08 | performance | composite projects and tsc -b | documented | `06-performance.md:16` |
| P09 | performance | generateTrace event trace | documented | `06-performance.md:17` |
| P10 | performance | stableTypeOrdering slowdown | documented | `06-performance.md:18` |
| P11 | performance | content-based sort internals | documented | `06-performance.md:19` |
| P12 | performance | TS7 native port rationale | documented | `06-performance.md:20` |
| P13 | performance | watchOptions.useFsEvents | documented | `06-performance.md:21` |
| P14 | performance | explicit types shrink editor scope | documented | `06-performance.md:22` |
| P15 | performance | es2025 target and lib | documented | `06-performance.md:32` |
| P16 | performance | esnext.temporal lib | documented | `06-performance.md:33` |
| P17 | performance | Map.getOrInsert upsert | documented | `06-performance.md:34` |
| P18 | performance | getOrInsertComputed for defaults | documented | `06-performance.md:35` |
| P19 | performance | modern target avoids downlevel helpers | documented | `06-performance.md:36` |
| P20 | performance | published p95 editor latency | unverified | `06-performance.md:37` |

## 4. Security

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| S01 | security | strict true as safety boundary | documented | `07-security.md:9` |
| S02 | security | strict sub-flags | documented | `07-security.md:10` |
| S03 | security | unknown instead of any | documented | `07-security.md:11` |
| S04 | security | noUncheckedIndexedAccess | documented | `07-security.md:12` |
| S05 | security | exactOptionalPropertyTypes | documented | `07-security.md:13` |
| S06 | security | satisfies validation | documented | `07-security.md:14` |
| S07 | security | discriminated unions | documented | `07-security.md:15` |
| S08 | security | never exhaustive check | documented | `07-security.md:16` |
| S09 | security | RegExp.escape interpolation | documented | `07-security.md:24` |
| S10 | security | Temporal deterministic time | documented | `07-security.md:25` |
| S11 | security | explicit types limit ambient surface | documented | `07-security.md:26` |
| S12 | security | avoid moduleResolution node10 | documented | `07-security.md:27` |
| S13 | security | classic resolution removed | documented | `07-security.md:28` |
| S14 | security | ESM interop always on | documented | `07-security.md:29` |
| S15 | security | with attributes replace asserts | documented | `07-security.md:30` |
| S16 | security | declaration-file trust boundary | documented | `07-security.md:31` |
| S17 | security | skipLibCheck audit cost | documented | `07-security.md:32` |
| S18 | security | deprecation removal before TS7 | documented | `07-security.md:33` |
| S19 | security | TS5112 replaces silent config ignore | documented | `07-security.md:34` |
| S20 | security | static prototype-pollution prevention | unverified | `07-security.md:35` |

## 5. Logs and errors

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| E01 | logs-errors | diagnostic codes and categories | documented | `08-errors-and-diagnostics.md:5-12` |
| E02 | logs-errors | TS5112 message and metadata | documented | `08-errors-and-diagnostics.md:14-20` |
| E03 | logs-errors | TS5112 recovery via ignoreConfig | documented | `08-errors-and-diagnostics.md:26` |
| E04 | logs-errors | missing globals after types array | documented | `08-errors-and-diagnostics.md:24` |
| E05 | logs-errors | deprecation errors and bridge | documented | `08-errors-and-diagnostics.md:28` |
| E06 | logs-errors | declaration ordering errors | documented | `08-errors-and-diagnostics.md:30` |
| E07 | logs-errors | unknown catch variables | documented | `08-errors-and-diagnostics.md:41` |
| E08 | logs-errors | tagged Result modelling | documented | `08-errors-and-diagnostics.md:41` |
| E09 | logs-errors | assertNever exhaustiveness | documented | `08-errors-and-diagnostics.md:41` |
| E10 | logs-errors | typeof, equality, in, control flow | documented | `08-errors-and-diagnostics.md:32-37` |
| E11 | logs-errors | source maps for stack frames | documented | `08-errors-and-diagnostics.md:41` |
| E12 | logs-errors | error taxonomy with recovery | documented | `08-errors-and-diagnostics.md:5-12` |
| E13 | logs-errors | structured logging design | documented | `09-logging-and-observability.md:15` |
| E14 | logs-errors | typed log levels | documented | `09-logging-and-observability.md:15` |
| E15 | logs-errors | satisfies for log schemas | documented | `09-logging-and-observability.md:15` |
| E16 | logs-errors | stable fields, no any payloads | documented | `09-logging-and-observability.md:15` |
| E17 | logs-errors | deterministic error serialization | documented | `09-logging-and-observability.md:25` |
| E18 | logs-errors | generateTrace and compiler tracing | documented | `09-logging-and-observability.md:29` |
| E19 | logs-errors | watch, CI, redaction, correlation | documented | `09-logging-and-observability.md:5-11` |
| E20 | logs-errors | observed production correlation | unverified | `09-logging-and-observability.md:48` |

## 6. Modern TypeScript 6

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| M01 | modern | strict true default | documented | `01-modern-typescript-6.md:9` |
| M02 | modern | module esnext default | documented | `01-modern-typescript-6.md:10` |
| M03 | modern | floating target, now es2025 | documented | `01-modern-typescript-6.md:11` |
| M04 | modern | noUncheckedSideEffectImports default | documented | `01-modern-typescript-6.md:12` |
| M05 | modern | libReplacement false default | documented | `01-modern-typescript-6.md:13` |
| M06 | modern | types empty-array default | documented | `01-modern-typescript-6.md:14` |
| M07 | modern | rootDir config-relative default | documented | `01-modern-typescript-6.md:15` |
| M08 | modern | es2025 target and lib support | documented | `01-modern-typescript-6.md:23` |
| M09 | modern | Temporal types and esnext.temporal | documented | `01-modern-typescript-6.md:24` |
| M10 | modern | RegExp.escape in es2025 | documented | `01-modern-typescript-6.md:25` |
| M11 | modern | Map and WeakMap upsert methods | documented | `01-modern-typescript-6.md:26` |
| M12 | modern | dom absorbs iterable libs | documented | `01-modern-typescript-6.md:27` |
| M13 | modern | hash-slash subpath imports | documented | `01-modern-typescript-6.md:28` |
| M14 | modern | bundler with commonjs | documented | `01-modern-typescript-6.md:29` |
| M15 | modern | deprecated es5 and downlevelIteration | documented | `01-modern-typescript-6.md:48` |
| M16 | modern | deprecated node10 and classic | documented | `01-modern-typescript-6.md:49` |
| M17 | modern | removed amd, umd, systemjs, outFile | documented | `01-modern-typescript-6.md:50` |
| M18 | modern | deprecated baseUrl and alwaysStrict | documented | `01-modern-typescript-6.md:51` |
| M19 | modern | interop-false, module keyword, asserts | documented | `01-modern-typescript-6.md:52` |
| M20 | modern | derived migration owner and date | unverified | `01-modern-typescript-6.md:55` |

## Sources

- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://www.typescriptlang.org/docs/handbook/intro.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/2/functions.html
- https://www.typescriptlang.org/docs/handbook/2/generics.html
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://github.com/microsoft/TypeScript/tree/v6.0.3
