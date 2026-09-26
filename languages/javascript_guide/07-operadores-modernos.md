# 7. Operadores Modernos

## Optional Chaining (`?.`)

Acesso seguro a propriedades sem `&&` intermediário:

```js
// ❌ Antigo
const name = user && user.profile && user.profile.name;

// ✅ Moderno
const name = user?.profile?.name;

// ✅ Também funciona com:
arr?.[index];              // acesso indexado seguro
obj?.[expr];               // bracket notation segura
func?.(args);              // chamada segura (se existir)
```

### Comportamento:
- Se `user` for `null`/`undefined`, retorna `undefined` imediatamente (short-circuit)
- Não substitui checagem de valores **falsy** como `0`, `""` (só `null`/`undefined`)
- Não pode ser usado no lado esquerdo de atribuição: `obj?.prop = val` ❌

```js
// Casos de uso comuns
const city = customer?.details?.address?.city ?? "Unknown";
const first = arr?.[0] ?? "default";
callback?.(data);        // callback opcional
```

## Nullish Coalescing (`??`)

Retorna o RHS apenas se LHS for `null` ou `undefined`:

```js
// ❌ || pega qualquer falsy
const qty = count || 42;    // se count = 0, retorna 42 (erro!)

// ✅ ?? só pega null/undefined
const qty = count ?? 42;    // se count = 0, retorna 0
const text = str ?? "default"; // se str = "", retorna ""
```

### `??` vs `||`

| LHS | `||` | `??` |
|-----|------|------|
| `null` | RHS | RHS |
| `undefined` | RHS | RHS |
| `false` | RHS | `false` |
| `0` | RHS | `0` |
| `""` | RHS | `""` |

### Combinação com `?.`

```js
const cidade = usuario?.endereco?.cidade ?? "Não informada";
```

### Restrição: `??` não pode ser combinado com `&&`/`||` sem parênteses

```js
// ❌ SyntaxError
null || undefined ?? "foo";

// ✅ Correto
(null || undefined) ?? "foo";
```

## Logical Assignment Operators

```js
// ??=  — Só atribui se for null/undefined
x ??= "default";       // equivalente a: x ?? (x = "default")

// &&= — Só atribui se for truthy
x &&= "outro";         // equivalente a: x && (x = "outro")

// ||= — Só atribui se for falsy
x ||= "default";       // equivalente a: x || (x = "default")
```

```js
// Exemplo prático
config.timeout ??= 5000;          // default só se não definido
element.textContent ||= "vazio";  // default só se vazio/null
```

## Destructuring

### Array

```js
const [a, b] = [1, 2];           // a=1, b=2
const [first, ...rest] = [1,2,3]; // first=1, rest=[2,3]
const [x, , z] = [1, 2, 3];      // x=1, z=3 (pula 2)
const [a = 10] = [];             // default: a=10
let [a, b] = [b, a];             // swap (genial!)
```

### Object

```js
const { nome, idade } = pessoa;
const { nome: n, idade: i } = pessoa;      // renomeando
const { cidade = "SP" } = pessoa;           // default
const { endereco: { cidade } } = pessoa;    // aninhado
const { a, ...resto } = { a:1, b:2, c:3 }; // rest properties
```

### Destructuring em Parâmetros

```js
// ❌ Antigo
function render(user) {
  const nome = user.nome;
  const idade = user.idade;
}

// ✅ Moderno
function render({ nome, idade = 0 }) { }

// Com default para o objeto todo:
function drawChart({ size = "big", coords = { x:0, y:0 } } = {}) { }
```

## Spread Syntax (`...`)

```js
// Arrays — imutabilidade
const novo = [...arr, 4];          // cópia + append
const combinado = [...arr1, ...arr2]; // concat
const [first, ...rest] = arr;      // rest (no destructuring)

// Objetos — composição
const clone = { ...obj };
const merged = { ...obj1, ...obj2 };
const comOverride = { ...defaults, ...user };  // user sobrescreve defaults
```

## Spread vs `Object.assign()`

```js
// ❌ Verboso
const clone = Object.assign({}, obj);

// ✅ Conciso
const clone = { ...obj };
```

## Operadores de Exponenciação

```js
const quadrado = 2 ** 3;   // 8 (em vez de Math.pow(2, 3))
let x = 2;
x **= 3;                    // x = 8
```

## Numeric Separators

```js
const milhao = 1_000_000;
const bin = 0b1010_0001;
const hex = 0xFF_EC_DE_5E;
const bytes = 0b0110_1001;
```
