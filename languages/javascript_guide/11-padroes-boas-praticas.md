# 11. Padrões, Boas Práticas e Anti-Patterns

## Resumo das Regras de Ouro

```
const   → padrão absoluto (99% dos casos)
let     → only when you MUST reassign
var     → ❌ NEVER (a não ser que precise de compatibilidade legada)
===     → sempre (exceto null check: `x ?? default`)
class   → para agrupar estado + comportamento com encapsulamento #privado
module  → sempre (type="module") — escopo fechado, strict auto
async   → async/await sobre .then() para legibilidade
Map     → para mapas dinâmicos (Object é para structs fixos)
Set     → para valores únicos
??      → default values (sobrescreve ||)
?.      → acesso seguro a propriedades aninhadas
using   → gerenciamento automático de recursos
```

## Anti-Patterns Clássicos (Evitar)

### 1. `var`
```js
// ❌ Escopo de função, hoisting confuso
var x = 1;
if (true) { var x = 2; } // x === 2 aqui fora!
```

### 2. Comparações com `==`
```js
// ❌ Coerção implícita
0 == "";      // true
[] == false;  // true

// ✅ Use === sempre
0 === "";     // false
```

### 3. Callback Hell / Pyramid of Doom
```js
// ❌
doSomething(function(r) {
  doSomethingElse(r, function(r2) {
    doThirdThing(r2, function(r3) { });
  });
});

// ✅
async function exec() {
  const r = await doSomething();
  const r2 = await doSomethingElse(r);
  return doThirdThing(r2);
}
```

### 4. Modificar objetos built-in
```js
// ❌
Array.prototype.myMethod = function() { };

// ✅ Use herança ou funções auxiliares
```

### 5. `for...in` para arrays (itera keys como string, inclui prototype)
```js
// ❌
for (const i in arr) console.log(arr[i]);

// ✅
for (const v of arr) console.log(v);
arr.forEach(v => console.log(v));
```

### 6. Uso excessivo de `||` para default
```js
// ❌ count = 0 → vira 42
const qty = count || 42;

// ✅
const qty = count ?? 42;
```

### 7. Stringly-typed data
```js
// ❌
const data = "1,2,3";
const parts = data.split(",");

// ✅
const data = [1, 2, 3];
```

### 8. Objeto como Map
```js
// ❌
const dict = {};
dict[key] = val;
"toString" in dict; // true (herdado!)

// ✅
const dict = new Map();
dict.set(key, val);
dict.has("toString"); // false
```

### 9. Bitmask para booleanos
```js
// ❌ (só em casos extremos de otimização)
const flags = READ | WRITE;

// ✅
const flags = { read: true, write: true };
```

### 10. Métodos no construtor
```js
// ❌ Cria N funções idênticas (N instâncias)
class A {
  constructor() {
    this.getNome = () => this.nome;
  }
}

// ✅ Método no prototype (compartilhado)
class A {
  getNome() { return this.nome; }
}
```

## Guia de Decisão — Qual Ferramenta Usar

### Declaração de Variáveis
```
Precisa reatribuir?
  ├── Sim  → let
  └── Não  → const (sempre prefira)
```

### Estrutura de Dados
```
Chave-valor dinâmico?
  ├── Sim → Map (qualquer chave), Object (struct fixa)
  └── Não → Array (ordenado) / Set (único)
```

### Função
```
Precisa de this dinâmico? (método de objeto, constructor)
  ├── Sim → function declaration / method syntax
  └── Não → arrow function
```

### Async
```
Precisa de paralelismo (todas)?
  ├── Sim → Promise.all()
  ├── Precisa de primeira resposta? → Promise.any()
  ├── Precisa saber de todas (sucesso ou falha)? → Promise.allSettled()
  └── Sequential → async/await com for...of
```

### Módulo
```
Quantos exports?
  ├── Um principal → default export
  ├── Múltiplos → named exports
  └── Muitos relacionados → namespace import (`import * as`)
```

### Classes
```
Precisa encapsular estado interno?
  ├── Sim → class com campos #
  ├── Só agrupar funções → module com funções exportadas
  └── Herança polimórfica → class extends
```

## Padrões Modernos Recomendados

### Factory Function (alternativa a classes)
```js
function createUser(name) {
  let role = "user";
  return {
    getName: () => name,
    promote: () => { role = "admin"; },
    getRole: () => role,
  };
}
```

### Module Pattern (com ESM é nativo)
```js
// Cada arquivo .js já é um módulo com escopo fechado
// Não precisa de IIFE
```

### Composition over Inheritance
```js
const canEat = { eat: () => "eating" };
const canWalk = { walk: () => "walking" };
const person = Object.assign({}, canEat, canWalk);

// vs herança profunda ❌
```

### Immutable Updates
```js
// ❌ Mutação
const arr = [1, 2, 3];
arr.push(4);

// ✅ Cópia
const newArr = [...arr, 4];

// ❌ Mutação objeto
user.name = "João";

// ✅ Cópia
const updated = { ...user, name: "João" };
```

## Checklist de Qualidade

- [ ] Usa `const`/`let` — sem `var`
- [ ] Usa `===` — sem `==`
- [ ] Promises encadeadas com `.catch()` ou `async/await` com `try/catch`
- [ ] Módulos com `import`/`export`
- [ ] Campos privados com `#` em classes
- [ ] `?.` e `??` no lugar de `&&`/`||` para null checks
- [ ] `Map`/`Set` para coleções dinâmicas
- [ ] Spread (`...`) para imutabilidade
- [ ] `using` para recursos descartáveis
- [ ] Sem mutação de prototypes ou globais
- [ ] Sem callback hell (async/await)
- [ ] Sem `for...in` para arrays
