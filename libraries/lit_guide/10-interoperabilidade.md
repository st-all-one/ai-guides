# Interoperabilidade com Frameworks

Lit components são **Web Components** — funcionam em qualquer framework JavaScript (ou sem framework algum).

---

## Princípios de Interoperabilidade

1. **Componentes Lit são HTMLElements** — funcionam como tags HTML nativas
2. **API via atributos e propriedades** — `my-component prop="value"` ou `.prop=${value}`
3. **Eventos customizados** para comunicação output
4. **Slots** para projeção de conteúdo
5. **Shadow DOM encapsula** estilos e DOM

---

## 1. React

### React 19+ (Recomendado)

React 19 tem suporte nativo a Web Components:

```tsx
// React 19 — funciona sem wrappers
function App() {
  const [count, setCount] = useState(0);

  return (
    <my-counter
      value={count}
      onChange={(e: CustomEvent) => setCount(e.detail.value)}
    />
  );
}
```

### React 17/18 — Wrapper Necessário

React < 19 não passa props corretamente para Custom Elements.

```tsx
// react-wrapper.tsx
import { useRef, useEffect, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  [key: string]: any;
}

export function createComponent<T extends HTMLElement>(
  tagName: string,
  eventMap: Record<string, string> = {}
) {
  return function Wrapper(props: Props) {
    const ref = useRef<T>(null);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      // Sincronizar propriedades (não atributos)
      for (const [key, value] of Object.entries(props)) {
        if (key !== 'children' && key !== 'style' && key !== 'className') {
          (el as any)[key] = value;
        }
      }

      // Event listeners
      const listeners: (() => void)[] = [];
      for (const [eventName, reactEvent] of Object.entries(eventMap)) {
        const handler = (e: Event) => {
          const reactHandler = props[reactEvent];
          if (typeof reactHandler === 'function') {
            reactHandler(e);
          }
        };
        el.addEventListener(eventName, handler);
        listeners.push(() => el.removeEventListener(eventName, handler));
      }

      return () => listeners.forEach(fn => fn());
    });

    return React.createElement(tagName, {
      ...props,
      ref,
      children: props.children
    });
  };
}
```

```tsx
// Uso
const MyCounter = createComponent('my-counter', {
  change: 'onChange'
});

function App() {
  return <MyCounter value={5} onChange={(e) => console.log(e.detail)} />;
}
```

### React + @lit/react

```bash
npm i @lit/react
```

```typescript
// wrapper.ts
import React from 'react';
import { createComponent } from '@lit/react';
import { MyCounter } from './my-counter.js';

export const MyCounterReact = createComponent({
  tagName: 'my-counter',
  elementClass: MyCounter,
  react: React,
  events: {
    onChange: 'change' as CustomEvent<{ value: number }>
  },
});

// No React:
// <MyCounterReact value={5} onChange={(e) => setValue(e.detail.value)} />
```

---

## 2. Angular

```typescript
// app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // ...
})
export class AppModule {}
```

```typescript
// my-counter.usage.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <my-counter
      [attr.value]="count"
      (change)="onChange($event)">
    </my-counter>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  count = 5;
  onChange(e: CustomEvent) {
    this.count = e.detail.value;
  }
}
```

> ⚠️ Angular usa `[attr.value]` para atributos. Para propriedades JavaScript (complexas), use `[property]` binding diretamente ou crie um value accessor.

---

## 3. Vue 3

```vue
<template>
  <my-counter
    :value="count"
    @change="onChange">
  </my-counter>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import './my-counter.js';

const count = ref(5);
const onChange = (e: CustomEvent) => {
  count.value = e.detail.value;
};
</script>
```

Vue 3 tem excelente suporte a Custom Elements:

- `:prop` binding → propriedades
- `@event` → eventos customizados
- `v-model` → funciona com `@change`/`:value` em CE
- Slots → `<slot>` nativo

---

## 4. Svelte

```svelte
<script>
  import './my-counter.js';
  let count = 5;

  function onChange(e: CustomEvent) {
    count = e.detail.value;
  }
</script>

<my-counter value={count} on:change={onChange} />
```

Svelte 5 (runes):

```svelte
<script>
  import './my-counter.js';
  let count = $state(5);

  function onChange(e: CustomEvent) {
    count = e.detail.value;
  }
</script>

<my-counter value={count} onchange={onChange} />
```

---

## 5. Frameworks sem Wrappers

### Atributos vs Propriedades

```html
<!-- Atributo — string sempre -->
<my-counter value="5"></my-counter>

<!-- Propriedade — qualquer tipo JavaScript -->
<script>
  const el = document.querySelector('my-counter');
  el.value = 5;                    // number
  el.config = { theme: 'dark' };   // object
  el.items = [1, 2, 3];           // array
</script>
```

### Eventos Customizados

```typescript
// No componente Lit:
this.dispatchEvent(new CustomEvent('change', {
  detail: { value: this.value },
  bubbles: true,
  composed: true
}));

// Fora do componente:
element.addEventListener('change', (e: CustomEvent) => {
  console.log(e.detail.value);
});
```

---

## 6. Design Systems com Lit

### Estrutura Recomendada

```
design-system/
├── packages/
│   ├── tokens/          # Design tokens (CSS custom properties)
│   ├── components/      # Componentes Lit individuais
│   ├── react/           # Wrappers React (@lit/react)
│   └── vue/             # Wrappers Vue (opcional)
├── site/                # Documentação (Storybook)
└── dist/                # Build output
```

### Estratégia de Publicação

```json
// Componente individual: package.json
{
  "name": "@my-ds/button",
  "main": "./dist/button.js",
  "exports": {
    ".": "./dist/button.js",
    "./react": "./dist/react/button.js"
  },
  "customElements": "./dist/custom-elements.json"
}
```

### Custom Elements Manifest

Gere `custom-elements.json` para documentação automática e IDE support:

```bash
npm i -D @lit-labs/analyzer
npx lit-analyzer components/**/*.ts --outFile custom-elements.json
```

---

## 7. Boas Práticas de API para Interoperabilidade

```typescript
@customElement('my-slider')
class MySlider extends LitElement {
  // 1. Preferir propriedades sobre métodos
  @property({ type: Number }) value = 50;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  @property({ type: Boolean }) disabled = false;

  // 2. Eventos em kebab-case (padrão web)
  private _dispatchChange() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  // 3. Métodos públicos quando necessário
  reset() {
    this.value = 50;
  }

  render() {
    return html`
      <input
        type="range"
        .value=${this.value}
        min=${this.min}
        max=${this.max}
        step=${this.step}
        ?disabled=${this.disabled}
        @input=${this._onInput}
      >
    `;
  }

  private _onInput(e: Event) {
    this.value = Number((e.target as HTMLInputElement).value);
    this._dispatchChange();
  }
}
```

### Regras de Ouro para Interoperabilidade

1. **Propriedades reativas** para input (não métodos)
2. **Eventos customizados** (`composed: true`) para output
3. **Kebab-case para eventos** (`change`, `item-selected`)
4. **Atributos para valores primitivos**, `.property` para objetos
5. **Slots para projeção** de conteúdo
6. **`part` e `exportparts`** para customização visual
7. **CSS Custom Properties** para theming
8. **Exportar `custom-elements.json`** para tooling
9. **Publicar wrappers** para frameworks que precisam (React < 19)
10. **Testar em múltiplos frameworks** no CI
