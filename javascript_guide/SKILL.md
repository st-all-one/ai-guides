# Skill: JavaScript Moderno (ES2025)

## Perfil
Especialista em JavaScript ECMAScript 2025. Domina do ES6 ao ES2025 com todas as boas práticas.

## Regras Absolutas

### Declarações
- `const` é padrão (99% dos casos). `let` só quando reatribuir. `var` é proibido.
- Sempre `===`. `==` é proibido (coerção implícita causa bugs).
- Semicolons: usar `;` explicitamente (ASI existe mas é fonte de bugs).

### Estrutura de Projeto
- Módulos ESM (`type="module"`) — nunca CommonJS para código novo.
- `import`/`export` com named exports preferidos (melhor tree-shaking).
- Barrel files (`index.js`) para organizar diretórios.

### Classes e Objetos
- `class` com campos `#` privados para encapsulamento real.
- Preferir composição sobre herança (herança profunda é anti-pattern).
- `Object.hasOwn(obj, prop)` em vez de `hasOwnProperty()` ou `in`.
- `Object.freeze()` para objetos de configuração imutáveis.
- `Map` para dicionários dinâmicos; `Object` só para structs fixas.
- `Set` para valores únicos.

### Assincronismo
- `async`/`await` sempre — nunca `.then()` puro.
- `Promise.all()` para paralelismo (todas necessárias).
- `Promise.allSettled()` quando quer saber resultado de todas.
- `Promise.any()` para "primeira a resolver".
- `Promise.race()` para timeout.
- Tratar rejeições: toda promise precisa de `.catch()` ou `await`.
- `Error.cause` para encadear erros sem perder contexto.

### Operadores Modernos
- `?.` (optional chaining) em vez de `&&` aninhado para acesso seguro.
- `??` (nullish coalescing) em vez de `||` para defaults (preserva `0`, `""`, `false`).
- `??=`, `||=`, `&&=` para atribuição condicional.
- Spread `...` para imutabilidade (cópias, merge).
- Destructuring em parâmetros e variáveis.
- `**` em vez de `Math.pow()`.

### Gerenciamento de Recursos
- `using` para recursos síncronos descartáveis (implementam `[Symbol.dispose]`).
- `await using` para recursos assíncronos (implementam `[Symbol.asyncDispose]`).
- `DisposableStack` para aquisição condicional ou recursos legados (`.adopt()`, `.defer()`).
- Substitui `try/finally` manual para recursos não gerenciados pelo GC.

### Imutabilidade
- Strings e primitivos são imutáveis por natureza.
- Arrays: `toSorted()`, `toReversed()`, `toSpliced()`, `with()` em vez de `sort()`, `reverse()`, `splice()`.
- Objetos: `{ ...obj }` em vez de `Object.assign()`.
- `structuredClone()` para clonagem profunda (ES2023+).

### Iteração
- `for...of` é padrão (iteráveis, Unicode-safe, suporta `break`/`continue`).
- `for...in` é proibido para arrays (itera keys como string, inclui prototype).
- `for` clássico só quando precisa de índice numérico.
- `for await...of` para streams e async generators.
- Preferir `.map()`, `.filter()`, `.reduce()` sobre loops imperativos.

### Metaprogramação
- `Proxy`/`Reflect` para validação, logging, mocks — com cautela (overhead).
- Nunca modificar protótipos de built-ins (`Array.prototype.foo = ...`).
- `Symbol.toStringTag`, `Symbol.toPrimitive`, `Symbol.hasInstance` para integração com APIs nativas.

### Erros
- Sempre `throw new Error(...)` — nunca string ou objeto literal (perdem stack trace).
- `Error.cause` para wrapping.
- `instanceof` para filtrar exceções no `catch`.
- `SuppressedError` (ES2025) combina erros de bloco + cleanup.
- Custom errors: `class MeuErro extends Error { constructor() { super(); this.name = "MeuErro"; } }`

### Memória
- `WeakMap`/`WeakSet` para metadados associados a objetos sem vazar.
- `WeakRef` para caches descartáveis.
- Remover event listeners, timers, intervals no cleanup.
- `FinalizationRegistry` só para diagnóstico, nunca para lógica crítica.

### Formatos e Locale
- `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.Collator`, `Intl.ListFormat`, `Intl.RelativeTimeFormat`.
- Criar formatadores uma vez e reutilizar (construtores `Intl.*` são caros).
- Sempre especificar locale explicitamente.

### Armadilhas Conhecidas (Nunca Fazer)
- `var` — escopo de função, hoisting confuso.
- `==` — coerção implícita (`0 == ""` é `true`).
- Callback hell — sempre async/await.
- `for...in` em arrays — itera proto, índices como string.
- `||` para default — `0 || 42` retorna `42` (use `??`).
- Objeto como Map — conflito com prototype (`"toString" in obj`).
- Métodos no construtor — cria N funções iguais (use método de classe).
- Modificar array durante iteração — use `.filter()`.
- `delete` em array — deixa buraco (use `.splice()` ou `.filter()`).
- `typeof null === "object"` — sempre teste null com `x === null`.
- `isNaN()` — faz coerção (use `Number.isNaN()`).
- `parseInt()` sem base — use `parseInt(str, 10)`.

## Guia de Decisão Rápido

```
Precisa encapsular estado interno? → class com #privado
Só agrupar funções? → module com named exports
Chave-valor dinâmico? → Map
Struct fixa conhecida? → Object
Valores únicos? → Set
Requisição paralela (todas necessárias)? → Promise.all
Quer resultado de todas (sucesso/ falha)? → Promise.allSettled
Primeira resposta? → Promise.any
Timeout? → Promise.race
Recurso externo (arquivo, socket)? → using/await using
Iterar valores? → for...of
Callback com this dinâmico? → function declaration
Callback sem this próprio? → arrow function
```
