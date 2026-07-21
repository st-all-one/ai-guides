# 12. Expressões Regulares

## Criação

```js
// Literal — preferido (compilado em parse-time)
const re = /padrão/gimsuy;

// Construtor — útil para padrões dinâmicos
const re = new RegExp("padrão", "gimsuy");
```

## Flags

| Flag | Nome | Efeito |
|------|------|--------|
| `g` | Global | Encontra todas as ocorrências, não só a primeira |
| `i` | Case-insensitive | Ignora maiúsculas/minúsculas |
| `m` | Multiline | `^`/`$` passam a corresponder a início/fim de **linha** (não string toda) |
| `s` | DotAll | `.` passa a corresponder a `\n` também |
| `u` | Unicode | Modo Unicode — trata padrão como código Unicode, não UTF-16 |
| `y` | Sticky | Só busca a partir de `lastIndex` (não avança) |
| `d` | Indices | Gera `indices` com posições de cada match no resultado |

```js
/foo/gi;   // global + case-insensitive
/./s;      // dotAll — "." casa \n
/^\d+/m;   // multiline — ^ no início de cada linha
```

## Character Classes

| Classe | Significado | Negação |
|--------|-------------|---------|
| `\d` | Dígito `[0-9]` | `\D` — não dígito |
| `\w` | Word `[a-zA-Z0-9_]` | `\W` — não word |
| `\s` | Whitespace (espaço, tab, \n, \r) | `\S` — não whitespace |
| `.` | Qualquer caractere **exceto** `\n` (a menos que flag `s`) | — |
| `[abc]` | Conjunto: a, b ou c | `[^abc]` — negação |
| `[a-z]` | Range: a até z | — |
| `\p{L}` | Unicode: qualquer letra (requer flag `u`) | `\P{L}` |

```js
/^\d{5}(-\d{4})?$/;          // CEP americano
/^[\w.-]+@[\w.-]+\.\w+$/;    // Email simples
/^\p{L}+$/u;                  // Só letras (qualquer idioma)
```

## Quantifiers

| Quantifier | Greedy | Lazy (adiciona `?`) |
|------------|--------|---------------------|
| `*` | zero ou mais | `*?` |
| `+` | um ou mais | `+?` |
| `?` | zero ou um | `??` |
| `{n}` | exatamente n | — |
| `{n,}` | n ou mais | `{n,}?` |
| `{n,m}` | entre n e m | `{n,m}?` |

### Greedy vs Lazy

```js
const str = "<div><p>texto</p></div>";

/<.+>/.exec(str);     // Greedy: "<div><p>texto</p></div>" (tudo!)
/<.+?>/.exec(str);    // Lazy: "<div>" (mínimo possível)
```

### Armadilha: Catastrophic Backtracking

```js
// ❌ Perigoso — se a string não casar, o engine tenta TRILHÕES de combinações
/(a+)+b/.test("aaaaaaaaaaaaac");  // trava!

// ✅ Use possessive (não suportado nativamente em JS) ou atomic groups via lookahead
// Melhor: evitar padrões com quantifiers alinhados
```

## Groups

| Tipo | Sintaxe | Referência |
|------|---------|------------|
| Capturing | `(abc)` | `\1`, `$1` (por índice) |
| Non-capturing | `(?:abc)` | ❌ |
| Named | `(?<nome>abc)` | `\k<nome>`, `$<nome>` |

```js
// Capturing groups
/(\d{2})\/(\d{2})\/(\d{4})/.exec("31/12/2024");
// ['31/12/2024', '31', '12', '2024']

// Named groups — mais legível ✅
const { groups: { dia, mes, ano } } =
  /(?<dia>\d{2})\/(?<mes>\d{2})\/(?<ano>\d{4})/.exec("31/12/2024");

// Backreference na mesma regex
/(?<palavra>\w+) \k<palavra>/.test("hello hello"); // true
```

## Assertions

| Assertion | Significado |
|-----------|-------------|
| `^` | Início da string (ou linha com `m`) |
| `$` | Fim da string (ou linha com `m`) |
| `\b` | Word boundary |
| `\B` | Non-word boundary |
| `(?=padrão)` | Lookahead positivo |
| `(?!padrão)` | Lookahead negativo |
| `(?<=padrão)` | Lookbehind positivo |
| `(?<!padrão)` | Lookbehind negativo |

```js
// Lookahead: senha com requisitos
/^(?=.*[A-Z])(?=.*\d).{8,}$/.test("Senha1segura"); // true

// Lookbehind: preço sem o símbolo
/(?<=\$)\d+\.\d{2}/.exec("Preço: $25.99"); // ['25.99']

// Negative lookahead: não seguido de
/foo(?!bar)/.test("foobaz");  // true
/foo(?!bar)/.test("foobar");  // false
```

## Métodos

### RegExp.prototype

```js
const re = /hello/g;

re.test("hello world");     // true — retorna booleano
re.exec("hello hello");     // ['hello', index: 0, ...] — próximo match (global)
re.lastIndex;               // 5 (atualizado após exec com /g)
```

### String.prototype

```js
const str = "Hello 123 World 456";

str.match(/\d+/);          // ['123'] — primeiro match
str.match(/\d+/g);         // ['123', '456'] — todos (com /g)
str.matchAll(/(\d+)/g);    // Iterator de todos os matches (inclui groups!)
str.search(/\d+/);         // 6 — posição do primeiro match
str.replace(/\d+/, "X");   // "Hello X World 456"
str.replace(/\d+/g, "X");  // "Hello X World X"
str.replaceAll(" ", "-");  // "Hello-123-World-456" (string, não regex)
str.split(/\s+/);          // ['Hello', '123', 'World', '456']
```

### `matchAll` — Preferido sobre `exec` com loop

```js
// ❌ Antigo: loop manual com exec
const re = /(\w+), (\w+)/g;
let m;
while ((m = re.exec(str)) !== null) {
  console.log(m[1], m[2]);
}

// ✅ Moderno: matchAll + for...of
const matches = str.matchAll(/(\w+), (\w+)/g);
for (const m of matches) {
  console.log(m[1], m[2]);
}
```

## Unicode Mode (flag `u`)

```js
// Sem flag u: \u{61} é interpretado como "u{61}" literal
/^\u{61}$/.test("a");    // false
/^\u{61}$/u.test("a");   // true (61 = 'a' em hex)

// Unicode property escapes
/^\p{Emoji}$/u.test("😀");  // true
/^\p{Script=Greek}+$/u.test("αβγ"); // true
/^\p{ASCII}$/u.test("a");   // true

// v-mode (ES2024+) — superset do u-mode
/^\p{RGI_Emoji}$/v.test("👋🏽");  // true
```

## Armadilhas Comuns

### 1. `lastIndex` com `/g` e `test()`/`exec()` alternados

```js
const re = /foo/g;
re.test("foo");   // true — lastIndex = 3
re.test("foo");   // false — lastIndex = 0 (após falha)
re.test("foo");   // true — lastIndex = 3 (loop infinito!)

// ✅ Reset manual quando necessário
re.lastIndex = 0;
```

### 2. Escape em `new RegExp`

```js
// ❌
new RegExp("\\d+\\.\\d+");  // precisa escapar \ duas vezes!

// ✅ Prefira literal a menos que padrão seja dinâmico
/\d+\.\d+/;

// Para padrão dinâmico, escape user input:
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
```

### 3. `replace` com string vs regex

```js
"aaa".replace("a", "b");     // "baa" — só primeira
"aaa".replace(/a/g, "b");    // "bbb" — todas
```

## Guia Rápido — Quando Usar

| Operação | Método | Retorno |
|----------|--------|---------|
| Existe? | `regex.test(str)` | `boolean` |
| Primeiro match | `str.match(regex)` | array ou `null` |
| Todos os matches | `str.match(regex)` com `/g` | array ou `null` |
| Todos + groups | `str.matchAll(regex)` | Iterator |
| Posição | `str.search(regex)` | index ou `-1` |
| Substituir | `str.replace(regex, subst)` | string |
| Subst. callback | `str.replace(regex, (match, ...) => ...)` | string |
| Dividir | `str.split(regex)` | array |
