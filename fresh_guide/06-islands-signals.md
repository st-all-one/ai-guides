## 6. Islands, Signals & Interatividade Client-Side

### 6.1 Definição de Island

Islands são componentes Preact hidratados no cliente. Localizam-se em `islands/` ou `routes/**/(_islands)/`.

```tsx
// islands/my-island.tsx
import { useSignal } from "@preact/signals";

export default function MyIsland() {
  const count = useSignal(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => count.value += 1}>+</button>
    </div>
  );
}
```

- Nome do arquivo: PascalCase (`MyIsland.tsx`) ou kebab-case (`my-island.tsx`)
- Uso: como qualquer componente Preact, em qualquer `.tsx`

```tsx
// routes/index.tsx
import MyIsland from "@/islands/MyIsland.tsx";
export default function Home() {
  return <MyIsland />;
}
```

### 6.2 Passagem de Props — Tipos Serializáveis

Props enviadas do servidor para islands passam por serialização/deserialização. **Somente tipos serializáveis**:

| Serializável | Não-Serializável |
|---|---|
| `string`, `number`, `boolean` | Functions |
| `bigint`, `null`, `undefined` | Class instances |
| `NaN`, `Infinity`, `-Infinity`, `-0` | `Symbol` |
| `Array`, plain objects | `WeakMap`, `WeakSet` |
| `Date`, `URL`, `RegExp` | Streams, Promises |
| `Set`, `Map`, `Uint8Array` | Async generators |
| `Signal`, `Computed Signal` | Custom getters/setters |
| `Temporal.*` (PlainDate, etc.) | DOM nodes |
| JSX Elements | Event handlers inline |

```tsx
// OK
<Counter start={5} label="clicks" enabled={true} />
<Item date={new Date()} tags={new Set(["a","b"])} />

// ERRO — função não serializável
<Counter onClick={() => console.log("click")} />

// CORRETO — mover lógica para dentro da island
// islands/Counter.tsx — define o handler internamente
```

### 6.3 Passagem de JSX para Islands (children)

```tsx
// routes/index.tsx
import MyIsland from "@/islands/MyIsland.tsx";

export default function Home() {
  return (
    <MyIsland jsx={<h1>hello</h1>}>
      <p>Server-rendered children</p>
    </MyIsland>
  );
}
```

- `jsx` prop: elemento JSX único serializado como VNode
- `children` (conteúdo entre tags): renderizado no servidor, disponível como `props.children` na island
- Ambos são serializáveis e hidratados no cliente

### 6.4 Nesting de Islands

Islands aninhadas funcionam normalmente. Cada island interna é serializada independentemente.

```tsx
// islands/Outer.tsx
import Inner from "@/islands/Inner.tsx";
export default function Outer() {
  return <div><Inner /></div>;
}
```

Inner é processada como island separada — seu estado/sinais são independentes.

### 6.5 Guard `IS_BROWSER`

Para APIs que só existem no navegador (`EventSource`, `getUserMedia`, `localStorage`, etc.):

```tsx
import { IS_BROWSER } from "fresh/runtime";

export function MyIsland() {
  if (!IS_BROWSER) return <div></div>; // fallback no servidor
  // Código abaixo roda apenas no browser
  const source = new EventSource("/api/events");
  // ...
  return <div>live data...</div>;
}
```

- `IS_BROWSER` é `true` no cliente, `false` no servidor
- O fallback deve ter a mesma estrutura DOM para evitar mismatch de hidratação
- Use para: SSE, WebRTC, Canvas, Web Audio, IndexedDB, etc.

### 6.6 Custom Elements (Web Components)

Registre o custom element dentro da island, uma única vez:

```tsx
import { useEffect } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";

export function MyElement() {
  useEffect(() => {
    if (customElements.get("my-greeting")) return;
    customElements.define("my-greeting", class extends HTMLElement {
      connectedCallback() {
        const name = this.getAttribute("name") ?? "World";
        this.innerHTML = `<p>Hello, ${name}!</p>`;
      }
    });
  }, []);

  if (!IS_BROWSER) return <div></div>;
  return <my-greeting name="Fresh" />;
}
```

- `useEffect` roda apenas no cliente (após hidratação)
- Verificar `customElements.get()` evita re-registro em re-renders
- Fallback `<div></div>` no servidor — o custom element real substitui no cliente

### 6.7 Web Components de Terceiros (Lazy Import)

```tsx
useEffect(() => {
  import("@shoelace-style/shoelace/dist/components/button/button.js");
}, []);
```

- `import()` dinâmico carrega o registry do componente no cliente
- O import é executado uma única vez (efeito com `[]`)
- Combine com `IS_BROWSER` para fallback server-side

### 6.8 Signals — `useSignal` (Estado Local)

```tsx
import { useSignal } from "@preact/signals";

export default function Counter() {
  const count = useSignal(0);
  const name = useSignal("Fresh");

  // Leitura: count.value
  // Escrita: count.value = 5; count.value += 1
  // No JSX: {count} (auto-subscribe — sem .value!)

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => count.value++}>Increment</button>
      <input value={name} onInput={(e) => name.value = e.currentTarget.value} />
    </div>
  );
}
```

- `useSignal(initialValue)` cria sinal reativo local ao componente
- Leitura: `.value` | Escrita: `sig.value = X`
- No JSX: `{sig}` (sem `.value`) — Preact faz auto-subscribe
- Re-renderiza **apenas** os trechos que leem o sinal alterado (granular)

### 6.9 Signals — `useComputed` (Valores Derivados)

```tsx
import { useSignal, useComputed } from "@preact/signals";

export default function TempConverter() {
  const celsius = useSignal(20);
  const fahrenheit = useComputed(() => celsius.value * 9/5 + 32);

  return (
    <div>
      <input type="number" value={celsius} onInput={(e) => celsius.value = +e.currentTarget.value} />
      <p>{celsius}°C = {fahrenheit}°F</p>
    </div>
  );
}
```

- `useComputed(fn)` recalcula automaticamente quando dependências mudam
- Computed é lazy — só recalcula quando lido
- Resultado é memoizado entre leituras
- Desestruturar: `const double = useComputed(() => val.value * 2); double.value`

### 6.10 Signals — `signal()` (Estado Compartilhado, Módulo)

```tsx
// utils/cart.ts
import { signal } from "@preact/signals";
export const cart = signal<string[]>([]);
export const itemCount = signal(0);
```

```tsx
// islands/AddToCart.tsx
import { cart, itemCount } from "@/utils/cart.ts";
export default function AddToCart({ product }: { product: string }) {
  const add = () => {
    cart.value = [...cart.value, product];
    itemCount.value += 1;
  };
  return <button onClick={add}>Add {product}</button>;
}
```

```tsx
// islands/CartCount.tsx
import { itemCount } from "@/utils/cart.ts";
export default function CartCount() {
  return <span>{itemCount} items</span>;
}
```

**ATENÇÃO**: Sinais em escopo de módulo são compartilhados entre **todas** as requisições do servidor. Use `signal()` de módulo **apenas em islands** (client-side only). Para estado isolado por requisição no servidor, use `useSignal()` dentro de handlers/rotas.

### 6.11 Passagem de Signals como Props (Islands Sincronizadas)

```tsx
// routes/index.tsx
import { useSignal } from "@preact/signals";
import Slider from "@/islands/Slider.tsx";
import Display from "@/islands/Display.tsx";

export default function Home() {
  const value = useSignal(50);

  return (
    <div>
      <Slider value={value} />
      <Display value={value} />
      {/* Mesmo sinal → mesmo estado no cliente */}
    </div>
  );
}
```

```tsx
// islands/Slider.tsx
import { Signal } from "@preact/signals";
export default function Slider({ value }: { value: Signal<number> }) {
  return (
    <input
      type="range"
      value={value}
      onInput={(e) => value.value = +e.currentTarget.value}
    />
  );
}
```

- Sinal criado na rota (não na island) com `useSignal()`
- Servidor serializa o sinal → cliente reconstrói como `signal()` vivo
- Mesmo objeto sinal passado para múltiplas islands → mesma instância no cliente
- Alteração em uma island reflete instantaneamente nas outras
- Tipagem: use `Signal<T>` do `@preact/signals` como tipo da prop

### 6.12 Serialização de Signals

```
Servidor: sig.peek() → valor bruto → HTML serializado
Cliente:  valor bruto → signal(valor) → sinal vivo reconstruído
```

- `.peek()` lê o valor sem criar subscription
- O sinal é recriado no cliente com o valor inicial do servidor
- Após hidratação, comporta-se como sinal normal (reativo)

### 6.13 Serialização de Computed

```
Servidor: computed.value → valor calculado → HTML serializado
Cliente:  valor → computed(() => valor) → valor estático (não reativo)
```

Computed signals desserializam como **valor estático** no cliente — a função de derivação não é serializada. Se precisar de computed reativo no cliente, recrie-o dentro da island com `useComputed()`.

### 6.14 Referências Circulares

Objetos com referências circulares são tratados automaticamente pelo serializador do Fresh — deduplicados, sem loop infinito.

```tsx
const a = { self: null as any };
a.self = a;
// Passar `a` como prop de island → serializado corretamente
```

### 6.15 Imports do `@preact/signals`

```tsx
import { useSignal, useComputed, signal, computed } from "@preact/signals";
import type { Signal } from "@preact/signals";
```

| Export | Uso |
|---|---|
| `useSignal(init)` | Estado local em componente/handler |
| `useComputed(fn)` | Valor derivado reativo local |
| `signal(init)` | Sinal em escopo de módulo (client-only) |
| `computed(fn)` | Computed em escopo de módulo (client-only) |
| `Signal<T>` | Tipo TypeScript para prop de sinal |
