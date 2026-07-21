# 20. `this` e Operadores

## `this` — O Contexto de Execução

`this` é resolvido em **call-time** (como a função é chamada, não onde é definida), exceto arrow functions.

### Regras de Binding

| Contexto | `this` aponta para |
|----------|-------------------|
| Global (non-strict) | `window` (browser) / `globalThis` |
| Global (strict/module) | `undefined` |
| Método de objeto | O objeto (antes do `.`) |
| Função solta (non-strict) | `globalThis` |
| Função solta (strict) | `undefined` |
| Arrow function | Escopo léxico (onde foi definida) |
| Constructor (`new`) | Nova instância |
| Event handler | O elemento (DOM API) |
| `call`/`apply`/`bind` | O valor passado |

```js
const obj = {
  nome: "Objeto",
  metodo() { return this.nome; },
  arrow: () => this.nome,  // ❌ this NÃO é obj! É o escopo de definição
};

obj.metodo();   // "Objeto"
obj.arrow();    // undefined (this = global ou undefined em módulo)
```

### `this` em Arrow Functions — Léxico

```js
function Person() {
  this.age = 0;
  setInterval(() => {
    this.age++;      // ✅ this capturado do escopo Person
  }, 1000);
  // ❌ Se fosse function(): this seria global/undefined
}
```

### `call`, `apply`, `bind` — Explícito

```js
function greet(greeting) {
  return `${greeting}, ${this.name}`;
}

const user = { name: "Ana" };

greet.call(user, "Olá");   // "Olá, Ana"
greet.apply(user, ["Oi"]); // "Oi, Ana"

const bound = greet.bind(user);
bound("Hello");             // "Hello, Ana"

// bind com args parciais
const hiAna = greet.bind(user, "Hi");
hiAna();                    // "Hi, Ana"
```

## Operadores — Guia de Referência

### `typeof` — Tipo em Runtime

```js
typeof 42;            // "number"
typeof "hello";       // "string"
typeof true;          // "boolean"
typeof undefined;     // "undefined"
typeof Symbol();      // "symbol"
typeof 42n;           // "bigint"
typeof null;          // "object"  ← ❌ bug histórico!
typeof [];            // "object"
typeof {};            // "object"
typeof function(){};  // "function"
typeof class{};       // "function"

// Armadilhas
typeof NaN;           // "number" (NaN é número)
typeof document.all;  // "undefined" (exceção intencional do spec)
```

✅ Para null: use `x === null`
✅ Para array: use `Array.isArray(x)`

### `instanceof` — Verifica Protótipo

```js
[] instanceof Array;       // true
[] instanceof Object;      // true
[] instanceof String;      // false

class A {}
class B extends A {}
new B() instanceof A;      // true (cadeia de protótipo)

// Armadilha: não funciona entre realms (iframes, workers)
```

### `in` — Propriedade Existe?

```js
"propriedade" in obj;  // própria OU herdada
Object.hasOwn(obj, "propriedade");  // só própria

// ✅ Com # private (ES2022+)
#privado in obj;  // true se obj tem campo #privado (sem try/catch)
```

### `delete` — Remove Propriedade

```js
const obj = { a: 1, b: 2 };
delete obj.a;           // true (removeu)
obj.a;                  // undefined

// ❌ Não deleta propriedades não-configuráveis
delete Math.PI;         // false (configurable: false)

// ❌ Array: deixa buraco (não reindexa)
const arr = [1, 2, 3];
delete arr[1];          // arr → [1, empty, 3]; length ainda 3
// ✅ Para array: .splice()
```

### `void` — Avalia Expressão, Retorna undefined

```js
void 0;           // undefined
void (1 + 1);     // undefined
void (() => 42)(); // undefined

// Uso real: href="javascript:void(0)" (legado)
// Uso moderno: IIFE com void para evitar vazamento
void async function() {
  await fetch(url);
}();
```

### Ternary Operator `? :`

```js
const msg = idade >= 18 ? "Maior" : "Menor";
// ❌ Evite aninhar ternários — prefira if/else ou função
const status = condition1 ? "A" : condition2 ? "B" : "C";  // legibilidade sofre
```

### Comma Operator `,`

```js
let x = (1, 2, 3);  // x = 3 (último valor)
// Raramente útil. Evite em código normal.
```

### Bitwise Operators

```js
&   // AND
|   // OR
^   // XOR
~   // NOT (bitwise NOT: ~x === -(x+1))
<<  // Left shift
>>  // Right shift (propaga sinal)
>>> // Unsigned right shift (zero-fill)

// Aplicação: flags
const READ  = 1 << 0;  // 1
const WRITE = 1 << 1;  // 2
const EXEC  = 1 << 2;  // 4

let perms = READ | WRITE;      // 3
perms & READ;                   // 1 (tem READ)
perms & EXEC;                   // 0 (não tem EXEC)

// Prefira objetos/bitsets em JS (menos propenso a erro)
const flags = { read: true, write: true };
```

### `new` e `new.target`

```js
function Foo() {
  console.log(new.target);  // undefined se chamado sem new
}

new Foo();   // new.target = Foo
Foo();       // new.target = undefined

// Em classes, new.target é sempre a classe usada com new
class Animal {
  constructor() {
    if (new.target === Animal) {
      throw new Error("Animal é abstrata");
    }
  }
}
```

### Property Accessors (`.`) vs (`[]`)

```js
obj.prop;     // nome literal, válido como identificador
obj["prop"];  // expressão, dinâmico
obj[0];       // números: bracket necessário
```

### Grouping `()`

```js
(1 + 2) * 3;   // 9 (sem parênteses: 1 + 2*3 = 7)
// Também usado para:
// - Função imediata (() => {})()
// - Destructuring: ({ a, b } = obj)
// - Expressão em template: `${(x * 2)}`
```

### Operadores Aritméticos e de Atribuição

```js
+   -   *   /   %   **
+=  -=  *=  /=  %=  **=  ++  --
```

### Operadores Lógicos

```js
&&  ||  !   // short-circuit
??          // nullish coalescing — só null/undefined
?.          // optional chaining

// Logical assignment (ES2021)
x &&= y;   // x = x && y
x ||= y;   // x = x || y
x ??= y;   // x = x ?? y
```

### Operadores de Comparação

```js
===  !==   // strict (preferido)
==   !=    // com coerção (evitar)
>    <     >=   <=
```

### Operador `super`

```js
class Child extends Parent {
  constructor() { super(); }         // chama construtor pai
  metodo() { super.metodo(); }       // chama método pai
}
```

## Tabela de Precedência (Top 10)

| Prioridade | Operadores |
|------------|------------|
| 1 | `()` grouping |
| 2 | `.` `[]` `?.` `()` chamada |
| 3 | `new` (com args) |
| 4 | `++` `--` `!` `~` `typeof` `void` `delete` `+x` `-x` |
| 5 | `**` |
| 6 | `*` `/` `%` |
| 7 | `+` `-` |
| 8 | `<<` `>>` `>>>` |
| 9 | `<` `>` `<=` `>=` `in` `instanceof` |
| 10 | `===` `!==` `==` `!=` |

## Boas Práticas

1. **Arrow functions para preservar `this`** em callbacks e closures
2. **`===` sempre** (nunca `==`)
3. **`??` em vez de `||`** para defaults (preserva `0`, `""`, `false`)
4. **`?.` em vez de `&&`** para acesso aninhado seguro
5. **Bitwise só se necessário** (performance ou flags binárias)
6. **`void`** raramente necessário em JS moderno
7. **`delete` em array?** Use `.splice()` ou `.filter()`
8. **`instanceof`** funciona entre classes do mesmo realm
9. **`typeof null === "object"`** — sempre teste null com `x === null`
