---
name: javascript-moderno
description: >
  Modern JavaScript (ES2025): syntax, async/await, modules, classes, private
  fields, iterators/generators, explicit resource management (using), promises,
  meta-programming, collections, regex, Intl, memory. Load when writing,
  reviewing, or debugging modern JS/TS.
category: languages
version: "ES2025"
tags: [javascript, ecmascript, es2025, async, modules, classes, iterators, metaprogramming]
license: MIT
---

# Modern JavaScript (ES2025)

Single-runtime language guide: ES6 (2015) → ES2025. No framework, no browser APIs beyond language/Intl.

## Use When
- Writing/reviewing/debugging modern JS or TS
- Choosing between modern syntaxes (optional chaining vs guards, `using` vs `try/finally`)
- Implementing async, module, class, iterator, or meta-programming logic
- Migrating legacy JS to ES2022+ idioms

## Core Rules
- Prefer `const`; `let` only when reassigned; never `var`.
- Always ESM (`import`/`export`); avoid `require` in new code.
- Equality: `===`/`!==` only. Guard nullish with `??`, not `||`.
- Optional chaining `?.` + nullish `??=` for safe defaults.
- Errors: throw `Error` subclasses; never throw strings; use `Error.cause`.
- Async: `async/await` over raw chains; run independent work with `Promise.all`.
- Never `await` inside loops sequentially unless order is required; use `for await` or `Promise.all(map)`.
- Immutability by default: spread/`toSorted`/`toReversed`/`with` over in-place mutation.
- Inject timers/IO for testability; avoid module-level global state.

## Key APIs (ES2022–ES2025)
```js
class Box {
  #v = 0;                         // private field
  static #count = 0;
  get value() { return this.#v; }
  static { Box.#count = 0; }      // static init block
  #increment() { this.#v++; }
}
const byId = Object.groupBy(items, x => x.type);   // ES2024
const resolved = await Promise.withResolvers();    // ES2024
const sorted = arr.toSorted((a,b)=>a-b);           // ES2023 (copy)
const copy = { ...a, ...b };
structuredClone(obj);                              // deep clone

using res = openResource();           // ES2025: Symbol.dispose
await using h = openAsync();          // AsyncDisposableStack
const stack = new DisposableStack();

for await (const chunk of stream) { /* async iteration */ }
function* gen() { yield 1; yield* [2,3]; }

const it = arr[Symbol.iterator]();
tag`hello ${name}`;                    // tagged template
new Proxy(target, { get, set, has });
Reflect.ownKeys(obj);
/^foo(?<n>\d+)$/u.exec("foo42").groups.n;
new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(10);
10n ** 2n;                             // BigInt
new WeakRef(obj); new FinalizationRegistry(fn);
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Overview, decision guide, TOC |
| `01-fundamentos-modernos.md` | let/const, scope, template literals, destructuring, spread, optional chaining, nullish |
| `02-funcoes-arrow-closures.md` | arrows, `this`, closures, IIFE, partial application |
| `03-classes-orientacao-objetos.md` | classes, fields, `#private`, getters, static, inheritance, `super` |
| `04-modulos-import-export.md` | ESM syntax, default/named, dynamic `import()`, top-level await |
| `05-assincrono-promises-async-await.md` | event loop, promises, `all`/`allSettled`/`any`/`race`, async/await |
| `06-estruturas-dados-colecoes.md` | Map/Set/WeakMap/WeakSet, typed arrays, iteration |
| `07-operadores-modernos.md` | optional chaining, `??`, `??=`, logical assignment, exponent |
| `08-iteradores-geradores.md` | iterables, `Symbol.iterator`, generators, async generators |
| `09-gerenciamento-recursos.md` | `using`, `Symbol.dispose`, DisposableStack |
| `10-metaprogramming.md` | Proxy, Reflect, symbols, well-known symbols |
| `11-padroes-boas-praticas.md` | idioms, immutability, error handling, testing seams |
| `12-expressoes-regulares.md` | regex, named groups, lookaround, `d`/`v` flags |
| `13-controle-fluxo-erros.md` | control flow, try/catch/finally, custom errors |
| `14-trabalhando-com-objetos.md` | prototype of literals, getters/setters, immutability |
| `15-internacionalizacao.md` | Intl (Number, DateTime, RelativeTime, Collator) |
| `16-gerenciamento-memoria.md` | GC, WeakRef, FinalizationRegistry, leaks |
| `17-numeros-strings-math.md` | Number, BigInt, Math, string helpers |
| `18-loops-iteracao.md` | for/for-in/for-of, labels, break/continue |
| `19-cadeia-prototipos.md` | [[Prototype]], `Object.create`, `class` desugaring |
| `20-this-operadores.md` | `this` binding rules, call/apply/bind |
| `21-symbols-globais.md` | global symbols, `Symbol.for`, well-known symbols |
| `EXEMPLO_COMPLETO.md` | consolidated example |

## Read Order
1. `00-index.md` → `01-fundamentos-modernos.md`
2. Async: `05-assincrono-promises-async-await.md`
3. Classes/modules: `03` + `04`
4. Advanced: `08`–`10`, `16`, `19`
5. `EXEMPLO_COMPLETO.md`

## Prereqs
Basic programming; a JS runtime (Node ≥20, Deno, Bun, or modern browser).
