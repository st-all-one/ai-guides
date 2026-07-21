# 1. Fundamentos Modernos

## Declarações de Variáveis

| Keyword | Escopo | Hoisting | Reatribuível | Redeclarável | Uso |
|---------|--------|----------|-------------|-------------|-----|
| `const` | Bloco | TDZ | ❌ | ❌ | **Padrão absoluto** |
| `let` | Bloco | TDZ | ✅ | ❌ | Quando precisar reatribuir |
| `var` | Função | Sim (undefined) | ✅ | ✅ | **Evitar** — escopo vaza, hoisting confuso |

```js
// Moderno ✅
const nome = "João";
let contador = 0;

// Antigo ❌
var nome = "João"; // escopa função, não bloco
```

### Temporal Dead Zone (TDZ)

`let` e `const` existem no bloco mas não podem ser acessados antes da declaração:

```js
console.log(x); // ReferenceError: Cannot access before initialization
const x = 10;
```

## Tipos Primitivos (imutáveis)

1. `string` — UTF-16, imutável
2. `number` — IEEE 754 double64 (±5e-324 a ±1.8e308, inteiros seguros até 2^53-1)
3. `bigint` — inteiros de precisão arbitrária (sufixo `n`)
4. `boolean` — `true` / `false`
5. `undefined` — ausência de valor
6. `symbol` — chave única e imutável para propriedades
7. `null` — "ausência de objeto" (`typeof null === "object"` — bug histórico)

> **Armadilha:** `typeof null === "object"` — sempre use `x === null` para testar null

## Template Literals

Substituem concatenação e strings multilinha:

```js
const nome = "Ana";
const msg = `Olá, ${nome}!`;           // interpolação
const bloco = `linha 1
linha 2`;                               // multilinha natural
const tag = html`<p>${nome}</p>`;       // tagged template
```

## Strict Mode

- Modules (`type="module"`) ativam strict mode **automaticamente**
- Classes também são strict por padrão
- Efeitos: `this` global é `undefined` (não `window`), elimina `with`, proíbe octal, etc.

## Semicolons

- ASI (Automatic Semicolon Insertion) existe, mas **sempre use `;`** explícito
- Evita bugs com linhas começando com `[`, `(`, `` ` ``, `/`

## Coerção de Tipos — Atenção

```js
"37" - 7;   // 30 (number)
"37" + 7;   // "377" (string) — o `+` é ambíguo!
```

Prefira conversão explícita:
```js
Number("42");     // 42
String(42);       // "42"
Boolean(0);       // false
```

## Comparações

| Operador | Coerção | NaN | -0/+0 | Uso |
|----------|---------|-----|-------|-----|
| `===` | ❌ | `false` | iguais | **Sempre que possível** |
| `==` | ✅ | `false` | iguais | **Evitar** |
| `Object.is()` | ❌ | `true` | distintos | Casos específicos (ex: `Object.defineProperty`) |
| SameValueZero | ❌ | `true` | iguais | `Array.includes()`, `Map`, `Set` |

```js
// Armadilhas do ==
0 == "0";       // true
0 == false;     // true
"" == false;    // true
null == undefined; // true

// Safe sempre com ===
0 === "0";      // false
null === undefined; // false
```

## Literais Modernos

```js
// Object literal enhanced
const obj = {
  nome,                    // shorthand property
  metodo() { },            // shorthand method
  ["dinamico_" + id]: val, // computed property
  __proto__: protoObj,     // prototype assignment
};

// Numeric separators
const milhao = 1_000_000;
const bin = 0b1010_0001;
```
