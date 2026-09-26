# 2. Funções Modernas

## Function Declaration vs Expression

```js
// Declaration — hoisted completamente ✅
function square(x) { return x * x; }

// Expression — não hoisted
const square = function(x) { return x * x; };

// Arrow — não hoisted, sem próprio this
const square = (x) => x * x;
```

## Arrow Functions

### Quando usar ✅
- Callbacks, `.map()`, `.filter()`, `.reduce()`
- Promises chains
- Funções aninhadas que precisam capturar `this` do escopo pai
- Funções curtas de uma expressão

### Quando NÃO usar ❌
- Métodos de objeto (perdem `this` dinâmico)
- Construtores (não podem ser usados com `new`)
- Geradores (não suportam `yield`)
- Funções que precisam de `arguments` (arrow não tem)
- `call()`, `apply()`, `bind()` não funcionam para redefinir `this`

### Regras de Sintaxe

```js
// Parênteses: obrigatórios com zero ou múltiplos parâmetros
const f1 = () => 42;           // ✅
const f2 = a => a * 2;         // ✅ (único param, sem default/rest)
const f3 = (a, b) => a + b;    // ✅
const f4 = ({ x }) => x;       // ✅ (destructuring precisa de () )
const f5 = (a = 1) => a;       // ✅ (default precisa de () )

// Chaves: obrigatórias com múltiplas statements
const f6 = (a) => {            // block body
  const b = a * 2;
  return b;
};
const f7 = (a) => a * 2;       // expression body — return implícito

// Objeto literal: precisa de () extra
const getObj = () => ({ id: 1 });  // ✅
const getObj = () => { id: 1 };    // ❌ return undefined!
```

### `this` Léxico — O Grande Benefício

```js
function Person() {
  this.age = 0;
  setInterval(() => {          // ✅ arrow captura this do Person
    this.age++;
  }, 1000);
}

// Antes: precisava de const self = this;
function Person() {
  const self = this;
  setInterval(function() { self.age++; }, 1000);
}
```

## Parâmetros

### Default Parameters

```js
function multiply(a, b = 1) {    // ✅ moderno
  return a * b;
}

// Antes (evitar):
function multiply(a, b) {
  b = typeof b !== "undefined" ? b : 1;
  return a * b;
}
```

### Rest Parameters (`...args`)

```js
function logAll(...args) {       // ✅ array real
  args.forEach(console.log);
}

// vs arguments (evitar):
function logAll() {
  Array.prototype.slice.call(arguments).forEach(console.log); // ❌
}
```

- Rest é **Array real** — tem `.map()`, `.filter()`, etc.
- `arguments` é array-like, não tem métodos de Array
- Rest não conta para `Function.length`

## Closures — O Essencial

Toda função em JS é uma closure. A closure "lembra" as variáveis do escopo onde foi criada:

```js
function criarContador() {
  let count = 0;                    // variável "presa"
  return () => ++count;             // closure
}

const contador = criarContador();
console.log(contador()); // 1
console.log(contador()); // 2
```

### Padrão: Módulo via Closure

```js
const criarUsuario = (nome) => {
  let senha = "default";
  return {
    getNome: () => nome,
    setSenha: (s) => { senha = s; },
    validar: (s) => senha === s,
  };
};
```

> **Nota:** Em JS moderno, prefira classes com campos privados `#` para encapsulamento mais robusto que closures.

## IIFE — Quando Ainda Faz Sentido

```js
// Útil para criar escopo isolado rapidamente
const valor = (() => {
  const config = JSON.parse(localStorage.getItem("config"));
  return config.theme ?? "dark";
})();
```

Em módulos ES, IIFEs são raramente necessárias (cada módulo já tem seu próprio escopo).
