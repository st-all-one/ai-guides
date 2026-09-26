# 18. Loops e Iteração

## Tipos de Loop

| Loop | Quando Usar |
|------|-------------|
| `for` clássico | Índice numérico, acesso por posição |
| `for...of` | Valores de iteráveis (arrays, Map, Set, strings) — **preferido** |
| `for...in` | **Evitar** — itera keys como string, inclui prototype |
| `for-await...of` | Iteração assíncrona (streams, async generators) |
| `while` | Número indeterminado de iterações |
| `do...while` | Executa pelo menos uma vez |

## `for` clássico

```js
// ✅ Array — índice numérico
for (let i = 0; i < arr.length; i++) {
  console.log(arr[i]);
}

// ✅ Quando você precisa do índice
for (let i = 0; i < arr.length; i++) {
  if (arr[i] === target) return i;
}

// ✅ Multiple variáveis
for (let i = 0, j = 10; i < j; i++, j--) { }
```

**Atenção:** Cache `arr.length` se o array não muda:
```js
for (let i = 0, len = arr.length; i < len; i++) { }  // otimização
```

## `for...of` — Iterando Valores (Preferido)

```js
// Array — valores
for (const val of arr) { }

// Array com índice
for (const [i, val] of arr.entries()) { }

// String — caracteres (correto com Unicode!)
for (const char of "hello 🌟") { }

// Map — entries
for (const [key, val] of map) { }

// Set — valores
for (const val of set) { }

// NodeList (browser)
for (const el of document.querySelectorAll("div")) { }
```

**Vantagens:** funciona com qualquer iterável, suporta `break`/`continue`, Unicode correto.

## `for...in` — EVITAR para Arrays

```js
// ❌ Array — itera índices como string, inclui prototype
Array.prototype.custom = 42;
for (const i in ["a", "b"]) {
  console.log(i, typeof i); // "0", "1", "custom" (string!)
}

// ⚠️ Único caso legítimo: objetos (com hasOwnProperty check)
for (const key in obj) {
  if (Object.hasOwn(obj, key)) {
    console.log(key, obj[key]);
  }
}
```

## `while` e `do...while`

```js
// while — condição testada antes
let i = 0;
while (i < arr.length) {
  process(arr[i++]);
}

// do...while — executa pelo menos uma vez
let input;
do {
  input = prompt("Digite 'sair':");
} while (input !== "sair");
```

## `for-await...of` — Iteração Assíncrona

```js
async function* asyncGen() {
  for (let i = 0; i < 3; i++) {
    await wait(1000);
    yield i;
  }
}

for await (const val of asyncGen()) {
  console.log(val);  // 0, 1, 2 (com 1s de intervalo)
}

// Consumindo ReadableStream (browser/Node)
for await (const chunk of readableStream) {
  process(chunk);
}
```

## Controle de Fluxo em Loops

### `break` — Sai do loop

```js
for (const item of items) {
  if (item.id === targetId) {
    result = item;
    break;  // para o loop imediatamente
  }
}
```

### `continue` — Pula para próxima iteração

```js
for (const item of items) {
  if (!item.active) continue;  // pula inativos
  process(item);
}
```

### `label` — Break/Continue nomeado (raro, mas útil em loops aninhados)

```js
outer: for (const row of matrix) {
  for (const cell of row) {
    if (cell === target) {
      break outer;  // sai de AMBOS os loops
    }
  }
}
```

## Performance: `for` vs `for...of` vs `forEach`

Para a maioria dos casos, a diferença é irrelevante. Regras práticas:

| Método | Performance | Legibilidade | Break/Continue |
|--------|------------|--------------|----------------|
| `for` clássico | ⚡ Mais rápido | Média | ✅ |
| `for...of` | Rápido | ✅ Excelente | ✅ |
| `.forEach()` | Rápido | ✅ | ❌ |
| `for...in` | 🐢 Lento | Ruim | ✅ |

```js
// ✅ Prefira por padrão
for (const val of arr) process(val);

// ✅ Performance extrema (milhões de iterações)
for (let i = 0; i < arr.length; i++) process(arr[i]);

// ❌ Evite
arr.forEach(v => process(v));  // não pode break/continue
for (const i in arr) process(arr[i]);  // lento, inseguro
```

## Armadilhas Comuns

### 1. `for...in` em arrays

```js
const arr = [10, 20, 30];
for (const i in arr) {
  console.log(i + 1);  // "01", "11", "21" — concatenação de string!
}
```

### 2. Esquecer `let`/`const` no `for` clássico

```js
for (i = 0; i < 5; i++) { }  // ❌ i vaza para escopo global!
for (let i = 0; i < 5; i++) { }  // ✅
```

### 3. Modificar array durante iteração

```js
// ❌ Remover itens durante forEach ou for...of quebra iteração
const arr = [1, 2, 3, 4];
for (const item of arr) {
  if (item % 2 === 0) arr.splice(arr.indexOf(item), 1);
}
// Resultado imprevisível!

// ✅ Use filter ou itere de trás pra frente
const filtered = arr.filter(n => n % 2 !== 0);
```

### 4. Infinity loop

```js
let i = 0;
while (i < 10) { }        // ❌ esqueceu i++
do { } while (condicao);   // ❌ se condicao nunca muda
```

## Boas Práticas

1. **`for...of` é o padrão** — mais legível, Unicode-safe, break/continue
2. **`for` clássico** quando precisar do índice ou performance extrema
3. **`for...in` só em objetos** e **sempre com `Object.hasOwn()`**
4. **`for-await...of`** para streams e async generators
5. **`forEach`** só quando não precisar de break/continue (callbacks)
6. **Evite mutar o iterável** durante iteração
7. **Sempre declare** a variável de iteração (`let`/`const`)
