# 6. Estruturas de Dados e Coleções

## Map — O Novo Padrão para Dicionários

```js
const mapa = new Map();
mapa.set("chave", { dados: 123 });
mapa.get("chave");        // { dados: 123 }
mapa.has("chave");        // true
mapa.delete("chave");      // true
mapa.size;                // 1 (!! não é .length)
mapa.clear();

// Iteração
mapa.keys();              // MapIterator
mapa.values();
mapa.entries();           // [key, value]
mapa.forEach((v, k) => ...);
```

### Map vs Object

| Aspecto | `Map` | `Object` |
|---------|-------|---------|
| Key type | Qualquer valor (objetos, funções, NaN) | String ou Symbol |
| Ordem | ✅ Inserção | ✅ (desde ES2015, mas nem sempre confiável) |
| `size` | ✅ `.size` | ❌ manual `Object.keys().length` |
| Performance | ✅ Ótima para add/remove frequentes | ❌ Degrada com muitas keys |
| Iteração | ✅ Direta (`for...of`) | ❌ `Object.keys()`/`entries()` |
| Serialização | ❌ Não serializa diretamente (`JSON.stringify` ignorado) | ✅ `JSON.stringify` |
| Herança | ❌ Não tem prototype chain | ✅ Pode ter conflitos com prototype |

> **Regra:** Use `Map` sempre que precisar de chaves dinâmicas ou muitas operações de add/delete. Use `Object` para registros com estrutura fixa conhecida (tipo um struct/DTO).

## Set — Coleção de Valores Únicos

```js
const set = new Set([1, 2, 3, 1, 2]);  // Set { 1, 2, 3 }
set.add(4);
set.has(4);           // true
set.delete(4);
set.size;             // 3

// Operações com arrays
const unique = [...new Set(array)];    // dedup rápido
const exists = new Set(array).has(valor);  // busca O(1)
```

## WeakMap e WeakSet

```js
const wm = new WeakMap();
const obj = {};
wm.set(obj, "dados privados");   // key DEVE ser objeto
// Se obj for coletado, a entrada no WeakMap também é

const ws = new WeakSet();
ws.add(obj);
ws.has(obj);   // true
```

### Características:
- **Keys não são enumeráveis** — impossível iterar
- **Referências fracas** — não impedem GC
- Úteis para: metadados privados, cache, dados associados a DOM nodes
- `WeakMap` substitui o padrão antigo de `_prop` para encapsulamento

```js
// ANTI-PADRÃO: metadados na instância
const el = document.getElementById("btn");
el._meusDados = { x: 1 };   // ❌ polui o objeto, vaza

// ✅ Moderno: WeakMap
const dadosEl = new WeakMap();
dadosEl.set(el, { x: 1 });
```

## Arrays — Operações Modernas

```js
// 🚀 Métodos funcionais (prefira sobre for/forEach)
const nums = [1, 2, 3, 4, 5];

nums.map(n => n * 2);          // [2, 4, 6, 8, 10]
nums.filter(n => n % 2 === 0); // [2, 4]
nums.reduce((acc, n) => acc + n, 0); // 15
nums.find(n => n > 3);         // 4
nums.includes(3);              // true (SameValueZero — acha NaN!)
nums.flatMap(n => [n, n * 2]); // [1,2, 2,4, 3,6, ...]
nums.toSorted();               // ✅ novo — retorna cópia, não modifica
nums.toReversed();             // ✅ novo
nums.toSpliced(1, 2);          // ✅ novo
nums.with(0, 10);              // ✅ novo — retorna cópia com [0] = 10

// Prefira métodos imutáveis (ES2023+)
// ❌ nums.sort()          — modifica original
// ✅ nums.toSorted()      — cópia ordenada
```

## Typed Arrays

```js
const buffer = new ArrayBuffer(16);
const view = new Int32Array(buffer);
view[0] = 42;

// Sem alocar buffer separadamente:
const float64 = new Float64Array([1.0, 2.0, Math.PI]);
```

Usados para: WebGL, WebAudio, File API, protocolos binários, performance.

## Date (Legacy) → Temporal (Moderno)

```js
// ❌ Date — API problemática, mutável, timezone confuso
const d = new Date();
d.setMonth(d.getMonth() + 1); // modifica!

// ✅ Temporal — moderno, imutável, timezone-aware
// Temporal.PlainDate, Temporal.PlainTime, Temporal.ZonedDateTime
const today = Temporal.Now.plainDateISO();
const tomorrow = today.add({ days: 1 });
```

> **Nota:** Temporal ainda pode não estar disponível em todos os ambientes (Stage 3 no momento).

## JSON

```js
const obj = JSON.parse('{"a":1}');    // string → object
const str = JSON.stringify(obj);       // object → string

// Atenção: Map/Set não serializam para JSON
// Use replacer no stringify:
JSON.stringify(mapa, (key, value) => {
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
});
```
