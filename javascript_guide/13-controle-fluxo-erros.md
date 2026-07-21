# 13. Controle de Fluxo e Tratamento de Erros

## Condicionais

### `if/else`

```js
if (condicao) {
  // ...
} else if (outraCondicao) {
  // ...
} else {
  // ...
}
```

**Truthy vs Falsy** — Considere sempre o que é "falso" para JS:
- `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`
- **Tudo mais é truthy**: `"false"`, `[]`, `{}`, `42`, `Infinity`

```js
// ❌ Armadilha: string vazia
if (str) { }          // false para "" — pode ser intencional ou não

// ✅ Explícito
if (str !== "") { }   // quando "" é valor válido
if (str) { }          // quando "" é "ausência de valor"
```

### `switch` — Use com Cuidado

```js
switch (valor) {
  case 1:
    console.log("um");
    break;            // ⚠️ OBRIGATÓRIO — sem break, continua (fallthrough)
  case 2:
  case 3:             // fallthrough intencional: mesmo código para 2 e 3
    console.log("dois ou três");
    break;
  default:
    console.log("outro");
}
```

**Regras:**
- Usa `===` (strict comparison) — sem coerção
- `break` é obrigatório a menos que fallthrough seja intencional
- Escopo compartilhado entre cases — use `{}` para `let`/`const` em cada case
- **Prefira `Map` de funções ou `if/else`** para lógicas complexas:

```js
// ❌ switch grande
switch (type) {
  case "a": return fnA();
  case "b": return fnB();
  case "c": return fnC();
}

// ✅ Map dispatch
const handlers = new Map([
  ["a", fnA],
  ["b", fnB],
  ["c", fnC],
]);
return handlers.get(type)?.();
```

## Loops → documento 18-loops-iteracao

## Tratamento de Erros

### `try/catch/finally`

```js
try {
  // código que pode lançar
  JSON.parse(invalidJson);
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error("Erro de parse:", error.message);
  } else {
    throw;  // re-lança se não souber tratar
  }
} finally {
  // SEMPRE executa (mesmo com return no try/catch)
  cleanup();
}
```

**Regras:**
- `catch` captura **qualquer exceção** — sempre filtre com `instanceof`
- `finally` é executado mesmo após `return`, `break`, `continue`
- `throw` pode lançar **qualquer valor**, mas sempre prefira `Error`

### `throw`

```js
throw new Error("Algo deu errado");

// ✅ Sempre use Error (ou subclasse) — stack trace incluso
throw "string";            // ❌ sem stack trace
throw { code: 400, msg }; // ❌ perde stack trace

// ✅ Error.cause — encadeamento de erros
try {
  await fetchData();
} catch (cause) {
  throw new Error("Falha ao buscar dados", { cause });
}
```

## Error Types (Built-in)

| Tipo | Quando Ocorre | Exemplo |
|------|--------------|---------|
| `Error` | Genérico (base) | `new Error("msg")` |
| `SyntaxError` | Erro de sintaxe no parse | `eval("if(")` |
| `TypeError` | Operação em tipo inválido | `null.prop`, `1()` |
| `ReferenceError` | Referência a variável inexistente | `x.y` com x undefined |
| `RangeError` | Valor fora do intervalo válido | `new Array(-1)` |
| `URIError` | Erro em `encodeURI`/`decodeURI` | `decodeURI("%")` |
| `EvalError` | Reserved (não usado atualmente) | — |

```js
try {
  null.prop;
} catch (e) {
  console.log(e instanceof TypeError);  // true
  console.log(e.message);               // "Cannot read properties of null"
  console.log(e.stack);                 // stack trace completo
}
```

### Custom Errors

```js
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

throw new ValidationError("Campo obrigatório", "email");
```

## `debugger` Statement

```js
function complexCalc(x) {
  debugger;  // pausa no DevTools (se aberto)
  return x * x;
}
```

## `with` — EVITAR

```js
// ❌ Strict mode proíbe. Ambíguo, lento.
with (obj) {
  console.log(x);  // é obj.x ou variável x?
}
```

## Statements de Finalização

- `empty` (`;`) — statement que não faz nada. Raramente útil.
- `expression_statement` — qualquer expressão seguida de `;` (ex: `foo();`, `a = 1;`)

## Boas Práticas

1. **Sempre use `Error`** (não string/number) para `throw`
2. **Use `Error.cause`** para preservar contexto em wrap de erros
3. **Filtre exceções** com `instanceof` — nunca `catch (e) { }` genérico
4. **`finally`** para cleanup (ou `using` / `await using` para recursos)
5. **`switch` só para 3-4 cases** — acima disso, prefira dispatch table
6. **Evite lógica em condicionais** — extraia para variável com nome claro
