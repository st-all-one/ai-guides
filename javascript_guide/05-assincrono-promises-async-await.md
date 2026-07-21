# 5. Assincronismo: Promises e Async/Await

## Promise — Contrato de Futuro

```js
const promise = new Promise((resolve, reject) => {
  // operação assíncrona
  if (sucesso) resolve(valor);
  else reject(erro);
});
```

### Ciclo de Vida
- `pending` → `fulfilled` (resolve) ou `rejected` (reject)
- **Imutável** após settled — resolve/reject uma vez só
- Callbacks são sempre **assíncronos** (microtask)

## Promise Chaining

```js
// ❌ Callback Hell (evitar)
doSomething(function(result) {
  doSomethingElse(result, function(newResult) {
    doThirdThing(newResult, function(finalResult) {
      console.log(finalResult);
    }, failureCallback);
  }, failureCallback);
}, failureCallback);

// ✅ Promise Chain
doSomething()
  .then(result => doSomethingElse(result))
  .then(newResult => doThirdThing(newResult))
  .then(finalResult => console.log(finalResult))
  .catch(failureCallback);
```

### Regra de Ouro: **Sempre `return` a promise**

```js
// ❌ Floating promise — next then executa cedo
doSomething()
  .then(url => { fetch(url); })
  .then(result => { /* result é undefined! */ });

// ✅ Return explícito
doSomething()
  .then(url => fetch(url))     // return implícito com arrow
  .then(response => response.json());
```

## Async/Await — Açúcar Sintático sobre Promises

```js
// ✅ Moderno, legível, equivalente ao chain acima
async function process() {
  try {
    const result = await doSomething();
    const newResult = await doSomethingElse(result);
    const finalResult = await doThirdThing(newResult);
    console.log(finalResult);
  } catch (error) {
    failureCallback(error);
  }
}
```

### Regras:
- `async` function sempre retorna uma Promise
- `await` só dentro de `async` (ou top-level await em módulos)
- `await` pausa a função, **não** o event loop
- `try/catch` captura rejeições como exceções síncronas

## Concorrência

```js
// ✅ Paralelo: Promise.all
const [users, posts] = await Promise.all([
  fetch("/api/users").then(r => r.json()),
  fetch("/api/posts").then(r => r.json()),
]);

// ✅ Promise.allSettled — espera todos, sem reject rápido
const results = await Promise.allSettled([fetch(url1), fetch(url2)]);
results.forEach(r => {
  if (r.status === "fulfilled") console.log(r.value);
  if (r.status === "rejected") console.log(r.reason);
});

// ✅ Promise.any — primeira a resolver
const first = await Promise.any([cdn1, cdn2].map(fetch));

// ✅ Promise.race — primeira a settle (resolve ou reject)
const withTimeout = Promise.race([
  fetch(url),
  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
]);
```

### Escolha o método certo:

| Método | Resolve | Reject | Uso |
|--------|---------|--------|-----|
| `Promise.all` | Quando todas resolvem | Na **primeira** rejeição | Todas são necessárias |
| `Promise.allSettled` | Quando todas completam | **Nunca** | Quer saber o resultado de todas |
| `Promise.any` | Na **primeira** resolução | Se **todas** rejeitarem | "Quem chegar primeiro" |
| `Promise.race` | Na primeira settle | Na primeira settle | Timeout, fallback rápido |

## Error Handling

```js
// ✅ Catch no final do chain
doSomething()
  .then(a => doSomethingElse(a))
  .then(b => doThirdThing(b))
  .catch(err => console.error("Qualquer erro na cadeia", err));

// ✅ Nested catch para erros opcionais
doSomethingCritical()
  .then(result =>
    doSomethingOptional(result)
      .then(r => doSomethingExtraNice(r))
      .catch(() => { /* ignora erro opcional */ })
  )
  .then(() => moreCriticalStuff())
  .catch(err => console.error("Critical:", err));
```

### Unhandled Rejections

Toda promise deve ter um `.catch()` ou ser `await`ada. Rejeições não tratadas:
- Browser: evento `unhandledrejection` no `window`
- Node.js: evento `unhandledRejection` no `process`

```js
process.on("unhandledRejection", (reason, promise) => {
  console.error("Promise rejeitada não tratada:", reason);
});
```

## Criando Promises a partir de APIs antigas

```js
// Wrapper para setTimeout
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper para APIs callback-style
const readFile = (path) => new Promise((resolve, reject) => {
  fs.readFile(path, "utf8", (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
```

## Microtasks vs Tasks (Event Loop)

```js
console.log(1);
Promise.resolve().then(() => console.log(2)); // microtask
setTimeout(() => console.log(3), 0);           // task (macrotask)
console.log(4);
// Output: 1, 4, 2, 3
```

- **Microtasks** (Promises, `queueMicrotask`): executam antes do próximo render/macro task
- **Tasks** (`setTimeout`, `setInterval`, events): executam no próximo ciclo

## Três Armadilhas Comuns

1. **Floating promise** — esquecer `return` no `.then()`
2. **Nested desnecessário** — preferir chain flat sobre callback dentro de `.then()`
3. **`async` sem `await`** — função async sem await não é assíncrona de fato
