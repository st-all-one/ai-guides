# 03 - Functional Programming

TypeScript checks shapes and flow, not purity. Functional style means explicit values, local mutation, and visible branches; mechanisms are cited, the discipline is a design rule.

## Functions, purity, effect boundaries

Functions are values with call signatures (`docs/docs__handbook__2__functions.html.txt:7-8`). Keep untrusted input as `unknown` and check it before use, since `any` disables checking (`docs/docs__handbook__2__functions.html.txt:545-558`, `docs/docs__handbook__2__everyday-types.html.txt:27-28`). Purity cannot be declared: `readonly` only stops reassigning the property, not changing internal contents (`docs/docs__handbook__2__objects.html.txt:139-141`), and TypeScript does not assume arrays are immutable (`docs/docs__handbook__2__functions.html.txt:633`). For higher-order callbacks, do not mark a parameter optional unless the implementation may omit that argument (`docs/docs__handbook__2__functions.html.txt:373`).

## Immutable data

`ReadonlyArray<T>` describes arrays that should not change: a consumer cannot `push`, and any array can be passed to it (`docs/docs__handbook__2__objects.html.txt:621-635`). Its shorthand is `readonly T[]`, and assignability is one-way: a mutable array fits a readonly parameter, not the reverse (`docs/docs__handbook__2__objects.html.txt:648-661`). `as const` preserves literal types and tuple lengths for a fixed value (`docs/docs__handbook__2__everyday-types.html.txt:523-530`, `docs/docs__handbook__2__functions.html.txt:643-646`); `Readonly<Type>` marks every property non-reassignable (`docs/docs__handbook__utility-types.html.txt:66`), and mapped types can add or remove `readonly` (`docs/docs__handbook__2__mapped-types.html.txt:43-49`). Under `exactOptionalPropertyTypes`, an absent key and an explicit `undefined` differ, which changes spread and `Object.keys` behavior (`docs/docs__handbook__release-notes__typescript-4-4.html.txt:308-312`). Indexed reads are potential `undefined` under `noUncheckedIndexedAccess`, so immutable lookups must be checked (`docs/docs__handbook__release-notes__typescript-4-1.html.txt:286`).

| Tool | Use | Guard | Evidence |
|---|---|---|---|
| `ReadonlyArray<T>` | consume a sequence without mutation | `push` absent | `docs/docs__handbook__2__objects.html.txt:621-635` |
| `as const` | fixed literal or tuple | widening prevented | `docs/docs__handbook__2__everyday-types.html.txt:530` |
| `Readonly<Type>` | freeze property writes | assignment error | `docs/docs__handbook__utility-types.html.txt:66` |

## Algebraic data types

Model alternatives as a union of objects with a literal discriminant; optional fields on one wide object do not connect presence to the tag (`docs/docs__handbook__2__narrowing.html.txt:487-503`). The checker narrows each switch arm to one member, and a `never` default reports any newly added variant (`docs/docs__handbook__2__narrowing.html.txt:531-581`).

A Result or Either is `{ ok: true; value: T } | { ok: false; error: E }`: the literal tag gives each arm its own payload, and `never` reports a new variant (`docs/docs__handbook__2__narrowing.html.txt:531-563`). Option is `T | undefined`, or `{ kind: "none" } | { kind: "some"; value: T }` when a tagged payload and switch are needed (`docs/docs__handbook__2__narrowing.html.txt:557-558`); absence must be explicit because optional properties default to including `undefined` (`docs/docs__handbook__release-notes__typescript-4-4.html.txt:308`). A `pet is Fish` guard narrows the rest of a branch (`docs/docs__handbook__2__narrowing.html.txt:377-400`).

## Composition, currying, higher-order functions

Generics relate arguments and results without losing information, unlike `any` (`docs/docs__handbook__2__functions.html.txt:106-142`), and both type parameters can be inferred from an argument and a returned expression (`docs/docs__handbook__2__functions.html.txt:142-172`). Compose with small generic functions; constrain a parameter with `extends` only when the body needs a property (`docs/docs__handbook__2__generics.html.txt:220-224`), avoid surplus type parameters (`docs/docs__handbook__2__functions.html.txt:230`), and use `NoInfer` to keep one position from influencing inference (`docs/docs__handbook__utility-types.html.txt:347`). Currying is a function returning a function, typed by the same call signatures (`docs/docs__handbook__2__functions.html.txt:7-8`). Rest parameters accept a tuple type (`docs/docs__handbook__2__functions.html.txt:610-622`), and an `as const` tuple makes spread arguments type-check (`docs/docs__handbook__2__functions.html.txt:643-646`). A variadic pipe can express `Awaited<ReturnType<...>>` with `infer` in a conditional type (`docs/docs__handbook__2__conditional-types.html.txt:131-151`, `docs/docs__handbook__utility-types.html.txt:284`).

## Deterministic iteration

The v6.0 lib adds `Map.getOrInsert(key, defaultValue)` and `Map.getOrInsertComputed(key, callback)` for check-then-set, plus the same pair on `WeakMap` (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:224-244`, `repo/lib/lib.esnext.collection.d.ts:20-46`). The computed form calls its callback only when the key is absent and passes the key to it (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:253-261`, `repo/lib/lib.esnext.collection.d.ts:31`). Use an eager default for a constant, the computed form for an expensive pure default. The cache is mutable state; keep it private and expose readonly views (`docs/docs__handbook__2__objects.html.txt:621-635`).

`repo/lib/lib.esnext.collection.d.ts:25-31`
```ts
    getOrInsert(key: K, defaultValue: V): V;
    /**
     * Returns a specified element from the Map object.
     * If no element is associated with the specified key, the result of passing the specified key to the `callback` function will be inserted into the Map and returned.
     * @returns The element associated with the specified key, which will be the newly computed value if no element previously existed.
     */
    getOrInsertComputed(key: K, callback: (key: K) => V): V;
```

| Case | Call | Why | Evidence |
|---|---|---|---|
| constant default | `getOrInsert` | one expression replaces has/get/set | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:245-251` |
| costly default | `getOrInsertComputed` | callback runs only when absent | `docs/docs__handbook__release-notes__typescript-6-0.html.txt:253-254` |

## Boundary requiring live execution

The docs state when the computed callback is invoked, not whether a given runtime invokes it exactly once under concurrent access; that claim needs live execution to verify (`docs/docs__handbook__release-notes__typescript-6-0.html.txt:254`, `repo/lib/lib.esnext.collection.d.ts:31`).

## Sources

- https://www.typescriptlang.org/docs/handbook/2/functions.html
- https://www.typescriptlang.org/docs/handbook/2/objects.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
- https://www.typescriptlang.org/docs/handbook/utility-types.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- https://github.com/microsoft/TypeScript
