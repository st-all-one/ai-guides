# 8. Iteradores e Geradores

## Iterator Protocol

Um objeto é iterator se tem um método `next()` que retorna `{ value, done }`:

```js
function makeRange(start, end, step = 1) {
  let nextIndex = start;
  let count = 0;
  return {
    next() {
      if (nextIndex < end) {
        const value = nextIndex;
        nextIndex += step;
        count++;
        return { value, done: false };
      }
      return { value: count, done: true };
    },
  };
}

const iter = makeRange(1, 5);
iter.next(); // { value: 1, done: false }
iter.next(); // { value: 2, done: false }
// ...
```

## Iterable Protocol

Um objeto é **iterable** se tem `[Symbol.iterator]()`:

```js
const meuIterable = {
  *[Symbol.iterator]() {
    yield 1;
    yield 2;
    yield 3;
  },
};

for (const v of meuIterable) console.log(v); // 1, 2, 3
[...meuIterable]; // [1, 2, 3]
```

### Built-in Iterables
- `String`, `Array`, `TypedArray`, `Map`, `Set`
- `arguments`, `NodeList` (no browser)

### Syntaxes que consomem iterables
- `for...of`
- Spread `[...arr]`
- `yield*`
- Destructuring `[a, b] = iterable`
- `new Map(iterable)`, `new Set(iterable)`
- `Promise.all(iterable)`, `Promise.race(iterable)`

## Generator Functions (`function*`)

Função que retorna um Generator (que é iterator + iterable):

```js
function* genIds() {
  let id = 1;
  while (true) {
    yield id++;
  }
}

const ids = genIds();
console.log(ids.next().value); // 1
console.log(ids.next().value); // 2
```

### Vantagens sobre iterador manual:
- Código procedural em vez de estado manual
- `yield` pausa e retoma a execução
- Pode representar sequências infinitas sem alocar memória

### Bidirecionalidade

```js
function* perguntas() {
  const nome = yield "Qual seu nome?";
  const idade = yield `Olá ${nome}, qual sua idade?`;
  return `${nome} tem ${idade} anos`;
}

const gen = perguntas();
console.log(gen.next().value);        // "Qual seu nome?"
console.log(gen.next("Ana").value);   // "Olá Ana, qual sua idade?"
console.log(gen.next(30).value);      // "Ana tem 30 anos"
```

### Delegando com `yield*`

```js
function* combinar() {
  yield* [1, 2, 3];
  yield* "abc";
  yield* gen();
}
// Equivalente a: yield 1; yield 2; yield 3; yield "a"; yield "b"; yield "c"; ...
```

### Generator Methods

```js
const obj = {
  *gerador() {
    yield 1;
    yield 2;
  },
};

class MinhaClasse {
  *[Symbol.iterator]() {
    yield "a";
    yield "b";
  }
}
```

## Quando Usar

| Use Generators | Não Use |
|---------------|---------|
| Sequências infinitas/lazy (range, fibonacci) | Simples iteração sobre arrays (`for...of` basta) |
| Processamento sob demanda (streaming) | Quando a performance de overhead não compensa |
| Máquinas de estado | Quando `async/await` resolve |
| Implementar protocolos customizados | Para casos únicos: `yield*` + built-in iterables |
| Árvores/estruturas recursivas como flat sequence | |
