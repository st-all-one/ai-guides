# 02 - Type System Core

Scope: compile-time facts pinned to v6.0.3. A type describes what the checker accepts, not a runtime guarantee.

## Inference, context, validation

Variables infer from initializers and functions infer returns from return statements (`docs/docs__handbook__2__everyday-types.html.txt:57-61`, `docs/docs__handbook__2__everyday-types.html.txt:99`). Callback parameters are typed by context, as in `names.forEach((s) => ...)`, which gives `s: string` (`docs/docs__handbook__2__everyday-types.html.txt:118-129`). `satisfies` checks an expression without changing its type; an annotation catches the same typo but loses per-property detail (`docs/docs__handbook__release-notes__typescript-4-9.html.txt:8-23`, `docs/docs__handbook__release-notes__typescript-4-9.html.txt:38`); it also enforces exact keys and checks value types separately (`docs/docs__handbook__release-notes__typescript-4-9.html.txt:54-70`).

| Need | Mechanism | Failure signal | Evidence |
|---|---|---|---|
| Derive from a value | initializer/return inference | stale annotation | `docs/docs__handbook__2__everyday-types.html.txt:57`, `docs/docs__handbook__2__everyday-types.html.txt:99` |
| Type a lambda | contextual typing | implicit parameter | `docs/docs__handbook__2__everyday-types.html.txt:129` |
| Check a shape, keep literals | `satisfies` | excess key error | `docs/docs__handbook__release-notes__typescript-4-9.html.txt:38`, `docs/docs__handbook__release-notes__typescript-4-9.html.txt:65` |

Generics relate two or more values through one type (`docs/docs__handbook__2__functions.html.txt:106-173`); arguments are inferred from inputs but may be explicit when inference fails (`docs/docs__handbook__2__generics.html.txt:57-65`). `extends` constrains a type parameter (`docs/docs__handbook__2__generics.html.txt:220-224`), defaults apply when no candidate is found (`docs/docs__handbook__2__generics.html.txt:328`), and surplus parameters or constraints weaken inference (`docs/docs__handbook__2__functions.html.txt:230`).

## Literals, unions, intersections

A `let` gets `string`, a `const` gets a literal type (`docs/docs__handbook__2__everyday-types.html.txt:430-438`); object properties still widen because assignment may follow (`docs/docs__handbook__2__everyday-types.html.txt:501-502`), while `as const` makes the whole object literal-typed (`docs/docs__handbook__2__everyday-types.html.txt:523-530`). `boolean` aliases `true | false` (`docs/docs__handbook__2__everyday-types.html.txt:487-488`). A union admits any member but permits only operations valid for all (`docs/docs__handbook__2__everyday-types.html.txt:186-218`); `Animal & { honey: boolean }` intersects members (`docs/docs__handbook__2__everyday-types.html.txt:353-360`). A common literal property acts as a discriminant (`docs/docs__handbook__2__narrowing.html.txt:531-533`).

| Pattern | When | Failure signal | Evidence |
|---|---|---|---|
| literal union | closed input set | typo rejected | `docs/docs__handbook__2__everyday-types.html.txt:457` |
| `as const` | preserve literals | widened argument error | `docs/docs__handbook__2__everyday-types.html.txt:530` |
| intersection | merge capabilities | missing property | `docs/docs__handbook__2__everyday-types.html.txt:353` |
| tagged union | branch on a field | unhandled tag | `docs/docs__handbook__2__narrowing.html.txt:531` |

## `any`, `unknown`, `never`

`any` allows property access, calls, and assignment in either direction and disables checking; implicit `any` is flagged by `noImplicitAny` (`docs/docs__handbook__2__everyday-types.html.txt:27-46`). `unknown` represents any value but forbids operations before a check, so it fits untrusted input (`docs/docs__handbook__2__functions.html.txt:545-558`). `never` represents an unobserved value (`docs/docs__handbook__2__functions.html.txt:578-580`) and is assignable to every type while nothing but itself is assignable to it (`docs/docs__handbook__2__narrowing.html.txt:563`).

## Narrowing and exhaustiveness

Control flow plus `typeof`, `instanceof`, assignment, and reachability refine declared types (`docs/docs__handbook__2__narrowing.html.txt:45-63`, `docs/docs__handbook__2__narrowing.html.txt:288-354`). A guard declares `parameterName is Type` and narrows both branches; assertion functions also narrow (`docs/docs__handbook__2__narrowing.html.txt:377-419`). With a discriminant, each switch branch narrows to one member (`docs/docs__handbook__2__narrowing.html.txt:531-535`), and a `never` default fails when a member is added (`docs/docs__handbook__2__narrowing.html.txt:563-581`).

## Type operators

`keyof` yields literal keys or the index type (`docs/docs__handbook__2__keyof-types.html.txt:8-17`); `typeof` in a type position works only on identifiers and properties (`docs/docs__handbook__2__typeof-types.html.txt:15-58`), enabling indexed access such as `typeof MyArray[number]` (`docs/docs__handbook__2__indexed-access-types.html.txt:15-47`). Conditional types relate input and output types (`docs/docs__handbook__2__conditional-types.html.txt:9-24`); `infer` declares a variable in the true branch and distributes over unions (`docs/docs__handbook__2__conditional-types.html.txt:131-165`). Mapped types iterate a key union, adjust `readonly`/`?`, and rename keys using template literals (`docs/docs__handbook__2__mapped-types.html.txt:20-93`); template literals expand unions into all string combinations (`docs/docs__handbook__2__template-literal-types.html.txt:7-26`).

## Utilities and flags

Global utilities (`docs/docs__handbook__utility-types.html.txt:7`) include `Partial` (`docs/docs__handbook__utility-types.html.txt:28`), `Readonly` (`docs/docs__handbook__utility-types.html.txt:66`), `Record` (`docs/docs__handbook__utility-types.html.txt:88`), `Pick`/`Omit` (`docs/docs__handbook__utility-types.html.txt:109-130`), `Exclude`/`Extract` (`docs/docs__handbook__utility-types.html.txt:160-188`), `NonNullable` (`docs/docs__handbook__utility-types.html.txt:210`), `Parameters` (`docs/docs__handbook__utility-types.html.txt:223`), `ReturnType` (`docs/docs__handbook__utility-types.html.txt:284`), and `NoInfer` (`docs/docs__handbook__utility-types.html.txt:347`).

The pinned lib declares the readonly array used by these transformations:
`repo/lib/lib.es5.d.ts:1189-1193`
```ts
interface ReadonlyArray<T> {
    /**
     * Gets the length of the array. This is a number one higher than the highest element defined in an array.
     */
    readonly length: number;
```

| Flag | Default | Enabled | Evidence |
|---|---|---|---|
| `noUncheckedIndexedAccess` | index read keeps declared type | read gains `undefined`, even in bounds-checked arrays | `docs/docs__handbook__release-notes__typescript-4-1.html.txt:286-311` |
| `exactOptionalPropertyTypes` | `age?: number` admits `undefined` | `undefined` must be explicit; spread and `Object.keys` see presence | `docs/docs__handbook__release-notes__typescript-4-4.html.txt:308-312` |

## Sources

- https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/2/functions.html
- https://www.typescriptlang.org/docs/handbook/2/generics.html
- https://www.typescriptlang.org/docs/handbook/2/keyof-types.html
- https://www.typescriptlang.org/docs/handbook/2/typeof-types.html
- https://www.typescriptlang.org/docs/handbook/utility-types.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
