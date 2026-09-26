# 9. Gerenciamento de Recursos (ES2025)

## O Problema

Recursos como file handles, conexões de rede, locks de stream precisam ser liberados explicitamente. O padrão `try/finally` funciona mas é verboso e propenso a erro:

```js
// ❌ Verboso, aninhado, frágil
const reader1 = stream1.getReader();
try {
  const reader2 = stream2.getReader();
  try {
    // usar readers
  } finally {
    reader2.releaseLock();
  }
} finally {
  reader1.releaseLock();
}
```

## `using` — Declaração de Descarte Automático

```js
// ✅ Moderno, limpo, seguro
{
  using reader1 = stream1.getReader();
  using reader2 = stream2.getReader();
  // usar readers
}
// Ao sair do bloco: reader2 liberado → reader1 liberado
```

### Como funciona:
- Requer que o valor implemente `[Symbol.dispose]()` (protocolo **disposable**)
- Recursos são liberados em **ordem reversa** de declaração (LIFO)
- Funciona com `break`, `return`, `continue`, exceções
- `using` é como `const` — não pode ser reatribuído

### Disposable Protocol

```js
// Um recurso "disposable" implementa:
class MeuRecurso {
  [Symbol.dispose]() {
    this.close();  // cleanup síncrono
  }
}

// Ou alias:
MeuRecurso.prototype[Symbol.dispose] = MeuRecurso.prototype.close;
```

## `await using` — Descarte Assíncrono

```js
{
  await using fileHandle = open("file.txt", "w");
  await fileHandle.write("Hello");
}
// Aguarda fileHandle.close() completar
```

Requer `[Symbol.asyncDispose]()` — método que retorna `Promise`:

```js
class AsyncResource {
  async [Symbol.asyncDispose]() {
    await this.close();
  }
}
```

## `DisposableStack` — Flexibilidade Avançada

```js
// Caso 1: Aquisição condicional
{
  using disposer = new DisposableStack();
  let reader;
  if (condicao) {
    reader = disposer.use(stream.getReader());
  } else {
    reader = disposer.use(stream.getReader({ mode: "byob" }));
  }
}

// Caso 2: Recurso sem protocolo nativo
{
  using disposer = new DisposableStack();
  const url = disposer.adopt(
    URL.createObjectURL(blob),
    URL.revokeObjectURL,   // função de cleanup
  );
}

// Caso 3: Ação de cleanup avulsa
{
  using disposer = new DisposableStack();
  disposer.defer(() => console.log("Cleanup finalizado"));
}

// Caso 4: Transferência (conditional disposal)
class MeuRecurso {
  #disposables;
  constructor() {
    using disposer = new DisposableStack();
    this.#resource1 = disposer.use(getResource1());
    this.#resource2 = disposer.use(getResource2());
    this.#disposables = disposer.move(); // preserva recursos
  }
  [Symbol.dispose]() {
    this.#disposables.dispose();
  }
}
```

## Error Handling

```js
// Se o corpo do bloco LANÇA e o cleanup também LANÇA:
class Reader {
  [Symbol.dispose]() { throw new Error("Falha no cleanup"); }
}

try {
  using reader = new Reader();
  throw new Error("Erro na operação");
} catch (e) {
  console.error(e); // SuppressedError
  console.error(e.error); // Erro do cleanup (mais recente)
  console.error(e.suppressed); // Erro original (suprimido)
}
```

`SuppressedError` combina múltiplos erros sem perder informação.

## Boas Práticas

1. **Sempre use `using`/`await using`** para recursos que implementam o protocolo
2. **Implemente `[Symbol.dispose]()`** em classes que gerenciam recursos externos
3. **`DisposableStack.adopt()`** para recursos legados que não implementam o protocolo
4. **Nomeie blocos** com `{}` para escopo explícito
5. **Cuidado com use-after-free**: `using` não previne referências posteriores ao recurso
6. **`using` não é para memória** — GC cuida disso; `using` é para recursos **não gerenciados** pelo GC
