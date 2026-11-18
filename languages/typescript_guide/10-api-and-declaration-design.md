# 10 - API and declaration design

A public type is a long-lived contract. In TypeScript 6.0.3 the declaration emitter is also a
determinism surface: literal union order can change when unrelated declarations are processed
first, and `--stableTypeOrdering` exists to make 6.0 match the content-based ordering of 7.0
(`docs/docs__handbook__release-notes__typescript-6-0.html.txt:145-184`). Design the API so the
emitted `.d.ts` is a deliberate artifact, not a side effect of file order.
Verbatim package contract (`docs/docs__handbook__declaration-files__publishing.html.txt:18-25`):
```ts
json
{
"name": "awesome",
"author": "Vandelay Industries",
"version": "1.0.0",
"main": "./lib/main.js",
"types": "./lib/main.d.ts"
}
```

The snippet above is the published package contract: when a package has a `main` JavaScript file,
the `types` property must point at its bundled declaration file
(`docs/docs__handbook__declaration-files__publishing.html.txt:19-25`).

## Declaration strategy

| Strategy | Use when | Cost or failure signal | Evidence |
|---|---|---|---|
| Generate types from source | The package owns its TypeScript source | `declaration` emit must be checked in CI | `docs/docs__handbook__declaration-files__publishing.html.txt:11-12` |
| Publish to `@types` | The library is JavaScript-only or types are community-owned | A separate package must stay version-aligned | `docs/docs__handbook__declaration-files__publishing.html.txt:10-12` |
| Bundle `types` in `package.json` | Consumers should resolve types from the same package | Missing `types` produces unresolved imports | `docs/docs__handbook__declaration-files__publishing.html.txt:13-15` |
| `typesVersions` | Different TypeScript ranges need different declarations | More release matrix to maintain | `docs/docs__handbook__declaration-files__publishing.html.txt:73-76` |
| `/// <reference types="..." />` | A declaration depends on an installed `@types` package | `reference path` couples to local layout | `docs/docs__handbook__declaration-files__publishing.html.txt:55-64` |

Do not copy dependent declarations into your package; depend on the npm type package instead
(`docs/docs__handbook__declaration-files__publishing.html.txt:68-72`). Declaration packages you
depend on belong in `dependencies`, not `devDependencies`, because consumers need them to
resolve your exposed types (`docs/docs__handbook__declaration-files__publishing.html.txt:30-50`).

## Export and import rules

| Rule | Reason | Failure signal | Evidence |
|---|---|---|---|
| `import type` / `export type` for type-only names | They are guaranteed to be elided from JavaScript | A value import used only as a type can survive or confuse emit | `docs/docs__handbook__modules__reference.html.txt:39-50` |
| Never call a name imported with `import type` | It has no runtime binding | `'f' cannot be used as a value` | `docs/docs__handbook__modules__reference.html.txt:59-63` |
| Use inline `type` specifiers when mixing value and type imports | Keeps elision explicit per specifier | Ambiguous runtime imports | `docs/docs__handbook__modules__reference.html.txt:69-72` |
| Enable `verbatimModuleSyntax` when CommonJS emit surprises you | It forbids imports that would be emitted as `require` calls | Unexpected `require` in ESM-oriented code | `docs/docs__handbook__modules__reference.html.txt:933` |
| Order overloads from most specific to most general | Otherwise broad signatures swallow specific ones | Wrong overload selected | `docs/docs__handbook__declaration-files__do-s-and-don-ts.html.txt:100-116` |
| Do not use `any` in a public signature | It disables checking at every call site | Silent propagation of unchecked values | `docs/docs__handbook__declaration-files__do-s-and-don-ts.html.txt:27` |
| Do not write a generic that ignores its parameter | It creates false flexibility | Unusable inference at call sites | `docs/docs__handbook__declaration-files__do-s-and-don-ts.html.txt:24` |

## Shape the type, not the implementation

Prefer `unknown` at boundaries and narrow deliberately; prefer literal unions over `string` so
misspellings become diagnostics (`docs/docs__handbook__2__narrowing.html.txt:436-437`). Keep
`readonly` and `as const` on data that consumers must not mutate, and use `satisfies` to validate
a shape without widening it. When a callback result is ignored, avoid a useless `any` return type
(`docs/docs__handbook__declaration-files__do-s-and-don-ts.html.txt:31`). Do not add optional
parameters to callbacks unless callers truly may omit them
(`docs/docs__handbook__declaration-files__do-s-and-don-ts.html.txt:56`).

Module libraries need more care than file modules because the declaration must describe the
exact call/new/property shape consumers see
(`docs/docs__handbook__declaration-files__deep-dive.html.txt:8-13`). Write the declaration from
the consumer's perspective first, then make the implementation fit; the reverse tends to leak
private helper types into the public surface.

## Determinism checklist for emitted declarations

1. Pin the compiler version; this guide pins v6.0.3 at commit
   `050880ce59e30b356b686bd3144efe24f875ebc8`.
2. Set explicit `types` rather than enumerating ambient packages
   (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:371-381`).
3. If comparing 6.0 output with 7.0 output, enable `--stableTypeOrdering` for the comparison only;
   it can add up to 25% to check time and is not a long-term feature
   (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:182-201`).
4. Add an explicit type argument or variable annotation when ordering changes create errors
   (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:185-199`).
5. Diff `.d.ts` output in CI and treat unexplained literal-order churn as a regression.

## Sources

- https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/deep-dive.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/library-structures.html
- https://www.typescriptlang.org/docs/handbook/modules/reference.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/transformers/declarations.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/lib/lib.esnext.collection.d.ts
