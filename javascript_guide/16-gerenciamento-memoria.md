# 16. Gerenciamento de Memória

## Ciclo de Vida da Memória

1. **Alocação** — JS aloca automaticamente quando cria valores
2. **Uso** — leitura/escrita dos valores alocados
3. **Liberação** — GC descobre objetos inalcançáveis e libera memória

## Garbage Collection: Mark-and-Sweep

O motor JS varre a partir das **raízes** (global, variáveis locais, call stack) e marca todos os objetos alcançáveis. Objetos não marcados são coletados.

```js
// Enquanto referenciado → vivo
let obj = { dados: "importante" };
obj = null;  // objeto original agora é inalcançável → GC coleta
```

### Generational GC

Objetos jovens (recém-alocados) são coletados com mais frequência. Objetos que sobrevivem a múltiplas coleções "envelhecem" e são movidos para gerações mais velhas (coletadas menos vezes).

## Alcançabilidade (Reachability)

Um valor é **alcançável** se pode ser acessado a partir das raízes:

```js
let user = { name: "Ana" };
let admin = user;       // ambos referenciam o mesmo objeto

user = null;            // objeto AINDA alcançável via admin
admin = null;           // agora sim → GC coleta
```

## Memory Leaks Comuns

### 1. Closures com referências não intencionais

```js
function createLeak() {
  const heavyData = new Array(1000000).fill("🐘");
  return function() {
    console.log("hi");   // ❌ captura heavyData mesmo sem usar
  };
}
// heavyData nunca será coletado enquanto a closure existir
```

**Solução:** referencie só o necessário ou nullifique.

### 2. Event Listeners não removidos

```js
class Component {
  constructor() {
    button.addEventListener("click", this.handleClick);
    // ❌ Se Component for descartado, listener ainda referencia this
  }
  destroy() {
    button.removeEventListener("click", this.handleClick); // ✅
  }
}
```

### 3. Referências a DOM removido

```js
const elements = [];
const div = document.getElementById("meuDiv");
elements.push(div);
div.remove();  // ❌ div ainda vivo em elements → nunca GC
```

### 4. Timers / Intervals não limpos

```js
const interval = setInterval(() => {
  // referência a objetos grandes
}, 1000);
// ❌ se esquecer clearInterval, mantém toda a closure viva
```

### 5. Cache sem limites

```js
const cache = new Map();
function getData(key) {
  if (!cache.has(key)) cache.set(key, fetchData(key));
  return cache.get(key);
}
// ❌ cache cresce infinitamente → eventual OOM
// ✅ Use Map com limite, WeakRef, ou LRU
```

## WeakRef — Referência Fraca

Referência que **não impede** o GC de coletar o objeto:

```js
let obj = { dados: "importantes" };
const ref = new WeakRef(obj);

console.log(ref.deref());  // { dados: "importantes" } — ou undefined se coletado

obj = null;
// Após GC: ref.deref() → undefined
```

**Casos de uso:** cache grande onde perder dados é aceitável.

```js
// Cache com WeakRef
const cache = new Map();
function getCached(key) {
  if (cache.has(key)) {
    const ref = cache.get(key);
    const value = ref.deref();
    if (value !== undefined) return value;
  }
  const value = expensiveCompute(key);
  cache.set(key, new WeakRef(value));
  return value;
}
```

## FinalizationRegistry — Cleanup ao Coletar

Executa um callback quando um objeto é coletado:

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`Cleanup para ${heldValue}`);
});

function createResource() {
  const resource = { dados: "recurso caro" };
  registry.register(resource, "identificador");
  return resource;
}
```

**Atenção:**
- Callback **pode nunca ser chamado** (se o processo terminar primeiro)
- Callback é chamado em **momento indeterminado** (não confie para lógica crítica)
- Use para **instrumentação/diagnóstico**, não para lógica de negócio

## WeakMap e WeakSet — Referências Fracas em Coleções

```js
const wm = new WeakMap();
let el = document.getElementById("btn");
wm.set(el, { clique: 0 });
el.remove();
el = null;  // entrada no WeakMap é coletada automaticamente

// ✅ Uso principal: metadados associados a objetos sem vazar
// (ver documento 06)
```

## Ferramentas de Diagnóstico

### Chrome DevTools — Memory
- **Heap Snapshot**: tira foto da memória, analisa retainers
- **Allocation Timeline**: grava alocações ao longo do tempo
- **Allocation Sampling**: amostragem de alocações

### Node.js
```js
// --expose-gc para acesso programático
global.gc();
process.memoryUsage();  // { rss, heapTotal, heapUsed, external }
```

## Boas Práticas

1. **Evite closures que capturam dados desnecessários**
2. **Sempre remova event listeners** quando descartar componentes
3. **Limpe timers/intervals** no cleanup
4. **Use `WeakRef`** para caches descartáveis
5. **Use `WeakMap`** para metadados associados a objetos/DOM
6. **Evite cache sem limites** — implemente LRU ou limite de tamanho
7. **`using`/`await using`** para recursos não-memória (arquivos, sockets)
8. **Não confie em `FinalizationRegistry`** para lógica crítica
