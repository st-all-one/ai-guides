# 17. Números, Strings, Math e BigInt

## Number — IEEE 754 Double64

### Precisão

```js
// Inteiros "seguros"
Number.MAX_SAFE_INTEGER;   // 2^53 - 1 = 9007199254740991
Number.MIN_SAFE_INTEGER;   // -9007199254740991
Number.isSafeInteger(2**53);  // false

// Limites
Number.MAX_VALUE;          // ~1.8e308
Number.MIN_VALUE;          // ~5e-324 (positivo mais próximo de zero)
Number.EPSILON;            // 2^-52 ≈ 2.22e-16

// Armadilha clássica
0.1 + 0.2;                // 0.30000000000000004
0.1 + 0.2 === 0.3;        // false
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON; // true (comparação segura)
```

### Métodos Estáticos

```js
Number.isNaN(NaN);          // true ✅ (vs global isNaN() que coerção)
Number.isFinite(Infinity);  // false
Number.isInteger(42);       // true
Number.isInteger(42.0);     // true
Number.isInteger(42.1);     // false
Number.parseFloat("3.14");  // 3.14
Number.parseInt("42", 10);  // 42
```

### Number.prototype

```js
(3.14159).toFixed(2);       // "3.14"
(3.14159).toPrecision(3);   // "3.14"
(255).toString(16);         // "ff"
(255).toString(2);          // "11111111"
(1234567).toLocaleString("pt-BR"); // "1.234.567"
```

## BigInt — Inteiros de Precisão Arbitrária

```js
const big = 9007199254740993n;   // sufixo n
const fromNum = BigInt(42);
const fromStr = BigInt("0x1A");

// Operadores: +, -, *, /, %, ** (apenas entre BigInts)
// ❌ Misturar BigInt com Number: 1n + 1 → TypeError

// BigInt: só inteiro, divisão trunca
5n / 2n;   // 2n

// Comparações mistas funcionam:
1n === 1;  // false (tipos diferentes)
1n == 1;   // true (coerção)
0n;        // falsy
1n;        // truthy

// Conversão segura só se estiver no range seguro
Number(123n);               // 123
Number(BigInt(Number.MAX_SAFE_INTEGER) + 1n); // ❌ perde precisão
```

### BigInt e Typed Arrays

```js
const big64 = new BigInt64Array([1n, 2n, -3n]);
const ub64 = new BigUint64Array([1n, 2n, 3n]);
```

## Math — Métodos Principais

### Constantes

```js
Math.PI;     // 3.141592653589793
Math.E;      // 2.718281828459045
Math.SQRT2;  // 1.4142135623730951
```

### Arredondamento

```js
Math.round(4.5);    // 5
Math.floor(4.7);    // 4
Math.ceil(4.3);     // 5
Math.trunc(4.7);    // 4 (remove decimal, sem arredondar)
Math.trunc(-4.7);   // -4
Math.floor(-4.7);   // -5
```

### Potência, Raiz e Log

```js
Math.pow(2, 10);     // 1024
2 ** 10;              // 1024 (preferido ✅)
Math.sqrt(16);        // 4
Math.cbrt(27);        // 3
Math.log(Math.E);     // 1
Math.log10(100);      // 2
Math.log2(8);         // 3
Math.hypot(3, 4);     // 5 (sqrt(x² + y²))
```

### Trigonometria

```js
Math.sin(Math.PI / 2);   // 1
Math.cos(0);             // 1
Math.atan2(y, x);        // ângulo no círculo
```

### Aleatório

```js
Math.random();                // [0, 1)
Math.floor(Math.random() * 6) + 1;  // 1-6 (dado)

// ✅ Crypto seguro (para senhas, tokens)
crypto.getRandomValues(new Uint32Array(1))[0];
```

### Utilitários

```js
Math.abs(-42);       // 42
Math.sign(-5);       // -1
Math.min(3, 1, 4);   // 1
Math.max(3, 1, 4);   // 4
Math.clamp?.(x, min, max);  // ES2025 — limita a range
```

## String — Métodos Essenciais

### Busca e Teste

```js
"Hello World".includes("World");    // true
"Hello World".startsWith("He");     // true
"Hello World".endsWith("ld");       // true
"Hello".indexOf("l");               // 2 (primeira ocorrência)
"Hello".lastIndexOf("l");           // 3 (última)
"Hello".search(/[aeiou]/);          // 1 (posição da primeira vogal)
```

### Extração

```js
"Hello".at(1);              // "e" (aceita negativo)
"Hello".at(-1);             // "o"
"Hello".charAt(1);          // "e"
"Hello".charCodeAt(1);      // 101 (UTF-16 code unit)
"Hello".codePointAt(1);     // 101 (código Unicode completo)
"Hello".slice(1, 4);        // "ell"
"Hello".slice(-3);          // "llo"
"Hello".substring(1, 4);    // "ell" (sem negativos)
"Hello".substr(1, 3);       // "ell" (deprecated ❌)
```

### Transformação

```js
"hello".toUpperCase();          // "HELLO"
"HELLO".toLowerCase();          // "hello"
" hello ".trim();               // "hello"
" hello ".trimStart();          // "hello "
" hello ".trimEnd();            // " hello"
"Hello".padStart(10, "-");     // "-----Hello"
"Hello".padEnd(10, "-");       // "Hello-----"
"Hello".repeat(3);             // "HelloHelloHello"
"Hello World".replace("World", "JS");     // "Hello JS"
"Hello Hello".replace("Hello", "Hi");     // "Hi Hello" (só primeiro)
"Hello Hello".replaceAll("Hello", "Hi");  // "Hi Hi" (todos)
"a,b,c".split(",");            // ["a", "b", "c"]
```

### Unicode

```js
"🌟".length;                   // 2 (surrogate pair)
"🌟".at(0);                    // "�" (high surrogate sozinho)
"🌟".codePointAt(0);           // 127775 (código completo)
[... "🌟"].length;             // 1 (correto!)
"café".normalize();            // "café" (composed)
"cafe\u0301".normalize();      // "café" (decomposed → composed)
```

### Well-Formed Strings (ES2024)

```js
String.isWellFormed("\uD800");         // false (lone surrogate)
"\uD800".toWellFormed();               // "\uFFFD" (substitui por �)
```

### String.raw — Tagged Template para Strings Raw

```js
String.raw`C:\Users\${name}\file.txt`;  // não interpreta escapes
// "C:\Users\Ana\file.txt" (com \ literais)
```

## isNaN vs Number.isNaN

```js
isNaN("abc");           // true (coerção: Number("abc") = NaN)
Number.isNaN("abc");    // false (sem coerção)
Number.isNaN(NaN);      // true ✅

// Prefira Number.isNaN() sempre
```

## parseInt / parseFloat — Sempre com Base

```js
parseInt("42");         // 42
parseInt("42px");       // 42 (para no primeiro não dígito)
parseInt("0xFF");       // 255 (detecta hex)
parseInt("010");        // 10 (ES5+, não mais octal)

parseInt("42", 10);     // ✅ sempre especifique a base!
parseInt(" 42 ", 10);   // 42 (trim automático)
parseFloat("3.14e2");   // 314
```

## Boas Práticas

1. **Nunca compare floats diretamente** — use `Math.abs(a - b) < Number.EPSILON`
2. **`Number.isNaN`** em vez de `isNaN`
3. **`parseInt` com base 10** sempre
4. **BigInt para inteiros > 2^53** — mas não misture com Number
5. **Métodos imutáveis** de string (`replace`/`toUpperCase` retornam nova string)
6. **Precisa de formatação localizada?** Use `Intl.NumberFormat` e `Intl.DateTimeFormat`
