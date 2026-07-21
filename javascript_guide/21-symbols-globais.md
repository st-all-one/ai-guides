# 21. Symbols, Globais e Tópicos Avulsos

## Symbol — Chave Única e Imutável

### Criação

```js
const s1 = Symbol("descricao");
const s2 = Symbol("descricao");
s1 === s2;  // false (cada Symbol é único)

// Symbols no "global registry" — compartilhados entre realms
const g1 = Symbol.for("app.versao");
const g2 = Symbol.for("app.versao");
g1 === g2;  // true
Symbol.keyFor(g1);  // "app.versao"
```

### Well-Known Symbols

Símbolos embutidos que customizam comportamento de objetos:

| Symbol | Intercepta | Exemplo |
|--------|------------|---------|
| `Symbol.iterator` | `for...of`, spread, `[...obj]` | Protocolo iterável (ver 08) |
| `Symbol.asyncIterator` | `for await...of` | Async generator |
| `Symbol.match` | `str.match(obj)` | Custom regex matching |
| `Symbol.matchAll` | `str.matchAll(obj)` | — |
| `Symbol.replace` | `str.replace(obj, ...)` | Custom replace |
| `Symbol.search` | `str.search(obj)` | Custom search |
| `Symbol.split` | `str.split(obj)` | Custom split |
| `Symbol.hasInstance` | `obj instanceof Classe` | Custom instanceof |
| `Symbol.toPrimitive` | Coerção para primitivo | `obj + 1`, `String(obj)` |
| `Symbol.toStringTag` | `Object.prototype.toString.call(obj)` | `"[object MyClass]"` |
| `Symbol.species` | `arr.map()`, `promise.then()` | Construtor para derived objects |
| `Symbol.unscopables` | `with` statement | Propriedades a excluir do escopo |
| `Symbol.isConcatSpreadable` | `arr.concat(obj)` | Se objeto deve ser spread |
| `Symbol.dispose` | `using` | Protocolo disposable (ver 09) |
| `Symbol.asyncDispose` | `await using` | Protocolo async disposable |

### Exemplos Práticos

```js
// Symbol.toStringTag
class MinhaClasse {
  get [Symbol.toStringTag]() { return "MinhaClasse"; }
}
Object.prototype.toString.call(new MinhaClasse());
// "[object MinhaClasse]"

// Symbol.toPrimitive
const moeda = {
  valor: 100,
  [Symbol.toPrimitive](hint) {
    if (hint === "number") return this.valor;
    if (hint === "string") return `R$${this.valor}`;
    return this.valor;
  },
};
+moeda;       // 100
`${moeda}`;   // "R$100"

// Symbol.hasInstance
class A {
  static [Symbol.hasInstance](obj) {
    return obj.canDoSomething;
  }
}
{ canDoSomething: true } instanceof A;  // true
```

## Funções Globais

### `eval()` — EVITAR

```js
eval("2 + 2");          // 4
// ❌ Inseguro, lento, impede otimizações do JIT
// ❌ Executa no seu escopo — acesso a variáveis locais
```

✅ Alternativas seguras:
- `JSON.parse()` para dados
- `new Function()` para código (ainda arriscado)
- `import()` para módulos dinâmicos

### `parseInt()` e `parseFloat()`

```js
parseInt("42", 10);       // ✅ sempre com base
parseInt("42px");         // 42 — para no não dígito
parseInt("  42  ");       // 42 — trim automático
parseInt("0xFF");         // 255 — detecta hex (mas SEMPRE use base)
parseFloat("3.14e2");     // 314

// ❌ Diff de Number():
Number("42px");           // NaN
parseInt("42px");         // 42
```

### `isNaN()` e `isFinite()`

```js
isNaN("abc");             // true — ❌ coerção implícita
Number.isNaN("abc");      // false — ✅ correto

isFinite("42");           // true — ❌ coerção
Number.isFinite("42");    // false — ✅ correto

// Sempre prefira Number.isNaN() e Number.isFinite()
```

### URI Functions

```js
encodeURI("https:// exemplo.com/path com espaços");
// "https://%20exemplo.com/path%20com%20espaços" (???)
// encodeURI NÃO codifica caracteres especiais de URI

encodeURIComponent("path com espaços & símbolos");
// "path%20com%20espa%C3%A7os%20%26%20s%C3%ADmbolos"
// encodeURIComponent codifica TUDO

decodeURIComponent(encoded);
decodeURI(encoded);

// Regra: encodeURIComponent para query params e path segments
//        encodeURI para URI completa
```

## Globais de Valor

```js
Infinity;      // 1/0
NaN;           // 0/0
undefined;     // ausência de valor — não é palavra reservada (!!!)
null;          // Null literal — reservada

// ⚠️ undefined é uma propriedade global que PODE ser sobrescrita (não faça)
// ✅ null é uma palavra reservada (segura)
```

## ArrayBuffer, SharedArrayBuffer e DataView

```js
// ArrayBuffer — memória raw de tamanho fixo
const buffer = new ArrayBuffer(16);  // 16 bytes
buffer.byteLength;                   // 16

// DataView — acesso flexível a tipos em buffer
const view = new DataView(buffer);
view.setInt32(0, 42, true);    // offset 0, little-endian
view.getInt32(0, true);        // 42
view.setFloat64(8, 3.14);
view.getUint8(0);              // 42 (primeiro byte)

// Typed Arrays — acesso tipado
const ints = new Int32Array(buffer);  // 4 inteiros de 32 bits
ints[0] = 42;

// SharedArrayBuffer — compartilhado entre workers
const shared = new SharedArrayBuffer(16);
// Requer headers COOP/COEP para segurança
```

## Atomics — Operações Thread-Safe

```js
const sab = new SharedArrayBuffer(4);
const arr = new Int32Array(sab);

Atomics.store(arr, 0, 42);
Atomics.load(arr, 0);             // 42
Atomics.add(arr, 0, 1);           // 42 (retorna anterior)
Atomics.compareExchange(arr, 0, 43, 99);  // se for 43, troca pra 99
Atomics.wait(arr, 0, 0);          // espera até que arr[0] mude
Atomics.notify(arr, 0, 1);        // acorda um waiter
```

## Lexical Grammar — Regras de Sintaxe

### Comentários

```js
// Single-line
/* Multi-line */
/** JSDoc */
```

### Whitespace e Line Terminators

```js
// Line terminators: \n, \r, \r\n, \u2028 (Line Separator), \u2029 (Paragraph Separator)
// Whitespace: espaço, tab (\t), \v, \f, NBSP (\u00A0), ZWNBSP (\uFEFF)
```

### Automatic Semicolon Insertion (ASI)

```js
return
{ a: 1 };       // ❌ ASI insere ; após return → return undefined

// ✅ Correto
return { a: 1 };

// Casos problemáticos:
x = a + b
(c + d).toString();  // ❌ interpretado como: x = a + b(c + d).toString()
```

**Regra prática:** Nunca comece uma linha com `(` `[` `` ` `` `/` `+` `-`.

### Numeric Separators

```js
1_000_000;         // 1000000
0b1010_0001;       // binário
0xFF_EC_DE_5E;     // hexadecimal
```

## Trailing Commas

```js
// ✅ Sempre use em objetos e arrays multi-linha
const obj = {
  a: 1,
  b: 2,        // trailing comma — diffs mais limpos
};

// ✅ Em parâmetros de função
function f(
  a,
  b,             // válido
) {}

// ⚠️ Não em JSON (SyntaxError)
// JSON.parse('{"a":1,}')  // ❌
```

## Boas Práticas

1. **Symbol.for()** para símbolos compartilhados entre módulos/realms
2. **Well-known symbols** para integrar objetos com APIs nativas do JS
3. **Nunca use `eval()`** — sempre há alternativa mais segura
4. **`Number.isNaN()`** em vez de `isNaN()`
5. **`encodeURIComponent()`** para query params; `encodeURI()` para URI completa
6. **Trailing commas** sempre em multi-linha
7. **ArrayBuffer/DataView** para protocolos binários (WebSocket, WebGL, File)
8. **Atomics** só com SharedArrayBuffer e Web Workers
9. **Numeric separators** para legibilidade de números grandes
