# JavaScript Moderno — Guia Compilado

> Fonte: MDN Web Docs (documentação oficial do ECMAScript)
> Objetivo: Destilar o padrão moderno, semântica atual, boas práticas e armadilhas a evitar

## Estrutura dos Documentos

| Arquivo | Conteúdo |
|---------|----------|
| `01-fundamentos-modernos` | Declarações (`let`/`const`/`var`), tipos, strict mode, template literals |
| `02-funcoes-arrow-closures` | Funções modernas, arrow functions, closures, parâmetros (default/rest) |
| `03-classes-orientacao-objetos` | Classes ES6+, campos privados (`#`), estáticos, blocks, herança |
| `04-modulos-import-export` | ES Modules, named/default exports, dynamic `import()`, import maps |
| `05-assincrono-promises-async-await` | Promises, async/await, composição, concorrência, error handling |
| `06-estruturas-dados-colecoes` | Map, Set, WeakMap, WeakSet, typed arrays, Temporal vs Date |
| `07-operadores-modernos` | Optional chaining, nullish coalescing, destructuring, spread, assignment lógicos |
| `08-iteradores-geradores` | Iterator protocol, generator functions, iterables, `for...of` |
| `09-gerenciamento-recursos` | `using`/`await using`, `DisposableStack`, `Symbol.dispose` |
| `10-metaprogramming` | Proxy, Reflect, traps, invariants |
| `11-padroes-boas-praticas` | Compilado de boas práticas, anti-patterns, guia de decisão |
| `12-expressoes-regulares` | Expressões regulares: patterns, flags, métodos, armadilhas |
| `13-controle-fluxo-erros` | Controle de fluxo, `try/catch/finally/throw`, Error types |
| `14-trabalhando-com-objetos` | Object API, property descriptors, Object.* methods |
| `15-internacionalizacao` | Intl: DateTimeFormat, NumberFormat, Collator, ListFormat |
| `16-gerenciamento-memoria` | GC, memory leaks, WeakRef, FinalizationRegistry |
| `17-numeros-strings-math` | Number, BigInt, String methods, Math API |
| `18-loops-iteracao` | Todos os tipos de loop, break/continue/label |
| `19-cadeia-prototipos` | Prototype chain, `[[Prototype]]`, Object.create, instanceof |
| `20-this-operadores` | `this`, typeof, instanceof, in, delete, void, bitwise |
| `21-symbols-globais` | Well-known Symbols, eval/parseInt, ArrayBuffer, Atomics, lexical grammar |

## Princípios Gerais do JS Moderno

1. **Prefira `const` sobre `let`; evite `var`**
2. **Use `===` sempre; `==` é armadilha** (exige type coercion implícita)
3. **Modules (`type="module"`) são o padrão** — escopo fechado, strict mode automático
4. **Async/await sobre `.then()` puro** — mais legível, mesmo semântica de concorrência
5. **Classes com `#` privado** — encapsulamento real, não convenção `_`
6. **Optional chaining (`?.`) + Nullish coalescing (`??`)** — substituem `&&` e `||` para acesso seguro
7. **`Map`/`Set` sobre `Object`/`Array` para coleções** — performance e semântica corretas
8. **Gerenciamento de recursos com `using`** — adeus `try/finally` manual
9. **Imutabilidade de strings e tipos primitivos** — sempre criar novos valores
10. **Composição sobre herança profunda** — prefira mixins e composição
