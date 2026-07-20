# Performance e Otimização

## Princípios de Performance do Lit

1. **Sem Virtual DOM** — Lit atualiza apenas expressões que mudaram, não a árvore inteira
2. **Template parsing único** — HTML é parseado uma vez, re-renders só atualizam valores
3. **Updates em batch** — múltiplas mudanças de propriedade disparam um único update assíncrono
4. **Árvore de updates eficiente** — apenas componentes com props modificadas re-renderizam

---

## 1. Evitando Re-renders Desnecessários

### shouldUpdate

```typescript
class MyElement extends LitElement {
  @property() a = '';
  @property() b = '';
  @property() c = '';

  shouldUpdate(changedProperties: Map<string, unknown>) {
    // Só re-renderiza se 'a' ou 'b' mudaram
    return changedProperties.has('a') || changedProperties.has('b');
  }

  render() {
    return html`<p>${this.a} - ${this.b}</p>`;
  }
}
```

### willUpdate para Computações

```typescript
class ExpensiveRender extends LitElement {
  @property() items: Item[] = [];
  private _processed: ProcessedItem[] = [];

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('items')) {
      // Computa uma vez, não a cada render
      this._processed = this.items
        .filter(i => i.active)
        .map(i => this._expensiveTransform(i));
    }
  }

  render() {
    return html`
      <ul>
        ${this._processed.map(i => html`<li>${i.label}</li>`)}
      </ul>
    `;
  }
}
```

### Immutable Data Pattern

```typescript
// ❌ Mutação — não dispara update
this.items.push(newItem);

// ✅ Imutável — dispara update
this.items = [...this.items, newItem];

// ❌ Mutação de objeto
this.config.theme = 'dark';

// ✅ Imutável
this.config = { ...this.config, theme: 'dark' };
```

### @state vs @property

```typescript
// @state não cria observed attribute — menos overhead
@state()
private _internalState = 0;

// @property cria observed attribute — use apenas para API pública
@property({ type: Number })
publicValue = 0;
```

---

## 2. Templates Eficientes

### Evitar Funções no Template

```typescript
// ❌ Recria a cada render
render() {
  return html`<button @click=${() => this.handleClick(id)}>`;
}

// ✅ Referência estável
render() {
  return html`<button @click=${this._handleClick} data-id=${id}>`;
}
```

### Cache para Templates (alternância)

```typescript
import { cache } from 'lit/directives/cache.js';

render() {
  // cache preserva DOM quando alterna entre templates
  return html`${cache(this.view === 'list'
    ? html`<list-view .items=${this.items}></list-view>`
    : html`<grid-view .items=${this.items}></grid-view>`)}`;
}
```

### guard Directive

```typescript
import { guard } from 'lit/directives/guard.js';

render() {
  // Só re-avalia quando os valores do array mudam
  return html`
    <div>${guard([this.items, this.filter], () =>
      this._expensiveRender(this.items, this.filter)
    )}</div>
  `;
}
```

### live Directive

```typescript
import { live } from 'lit/directives/live.js';

// Usar quando o valor DOM pode ter sido alterado externamente
// ao render cycle (ex: input do usuário)
render() {
  return html`<input .value=${live(this.value)}>`;
}
```

---

## 3. Directives de Performance

### classMap vs className

```typescript
// ✅ classMap — mais performático que manipular className
import { classMap } from 'lit/directives/class-map.js';

render() {
  return html`<div class=${classMap({
    active: this.active,
    visible: this.visible,
    highlighted: this.isHighlighted
  })}>...</div>`;
}
```

### styleMap vs style string

```typescript
// ✅ styleMap — atualiza só propriedades que mudaram
import { styleMap } from 'lit/directives/style-map.js';

render() {
  return html`<div style=${styleMap({
    color: this.textColor,
    backgroundColor: this.bgColor
  })}>...</div>`;
}
```

### keyed Directive

```typescript
import { keyed } from 'lit/directives/keyed.js';

// Força recriação completa do DOM quando a key muda
render() {
  return html`<div ${keyed(this.userId)}>
    <user-profile .userId=${this.userId}></user-profile>
  </div>`;
}
```

---

## 4. Signals para Pinpoint Updates (@lit-labs/signals)

```typescript
import { SignalWatcher, watch, signal, computed } from '@lit-labs/signals';

const count = signal(0);
const expensive = computed(() => count.get() * 2);

@customElement('perf-counter')
class PerfCounter extends SignalWatcher(LitElement) {
  render() {
    return html`
      <!-- watch() faz apenas este binding atualizar -->
      <p>Count: ${watch(count)}</p>
      <p>Doubled: ${watch(expensive)}</p>
      <button @click=${() => count.set(count.get() + 1)}>+</button>

      <!-- Resto do template NÃO re-renderiza -->
      <heavy-content></heavy-content>
    `;
  }
}
```

---

## 5. Shadow DOM vs Light DOM

```typescript
// Light DOM — sem overhead de Shadow Root
class LightElement extends LitElement {
  createRenderRoot() { return this; }
}

// Shadow DOM — encapsulamento com custo mínimo (~0.5ms)
class ShadowElement extends LitElement {
  // Default — não precisa sobrescrever
}
```

### Quando usar Light DOM para performance

- Leaf components (botões, labels, spans)
- Componentes em listas longas (1000+ instâncias)
- Componentes que não precisam de slots
- SSR first (sem `declarative-shadow-dom`)

---

## 6. Lazy Loading

### Dynamic Import de Componentes

```typescript
class MyApp extends LitElement {
  private _heavyComponentLoaded = false;

  async _loadHeavyComponent() {
    await import('./heavy-component.js');
    this._heavyComponentLoaded = true;
    this.requestUpdate();
  }

  render() {
    return html`
      <button @click=${this._loadHeavyComponent}>Show</button>
      ${this._heavyComponentLoaded
        ? html`<heavy-component></heavy-component>`
        : nothing}
    `;
  }
}
```

### IntersectionObserver para Lazy

```typescript
class LazyLoader implements ReactiveController {
  /* controller com IntersectionObserver (ver 07-composicao.md) */
}

@customElement('lazy-section')
class LazySection extends LitElement {
  private _loader = new LazyLoaderController(this);

  async _onVisible() {
    await import('./section-content.js');
    this._loaded = true;
    this.requestUpdate();
  }
}
```

---

## 7. Lit Compiler (@lit-labs/compiler)

```bash
npm i -D @lit-labs/compiler
```

O Lit Compiler é um plugin para bundlers que otimiza templates em build time:

- **Template pre-parsing**: faz o parsing dos templates em tempo de build
- **Static optimizations**: identifica partes estáticas e remove overhead de runtime
- **Smaller bundles**: reduz o código de template gerado

```typescript
// rollup.config.js
import lit from '@lit-labs/compiler/rollup.js';

export default {
  plugins: [lit()]
};
```

---

## 8. Bundle e Code Splitting

### Import maps

```html
<script type="importmap">
{
  "imports": {
    "lit": "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js",
    "lit/decorators.js": "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js"
  }
}
</script>
```

### Tree Shaking

Importe apenas o que usar:

```typescript
// ✅ Importação específica — tree-shakeable
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';

// ❌ Importação inteira — não tree-shakeable
import * as Lit from 'lit';
```

---

## 9. Métricas e Profiling

### updateComplete

```typescript
class ProfiledElement extends LitElement {
  async _measureRender() {
    const start = performance.now();
    this.someProp = 'new value';
    await this.updateComplete;
    const elapsed = performance.now() - start;
    console.log(`Update took ${elapsed}ms`);
  }
}
```

### Chrome DevTools Performance

1. Abra Performance tab
2. Grave interação
3. Procure por `update()` / `render()` no flame chart
4. Identifique componentes com update lento

---

## 10. Checklist de Performance

| Prática | Impacto | Esforço |
|---------|---------|---------|
| `shouldUpdate` para filtrar re-renders | ⭐⭐⭐ | Baixo |
| `willUpdate` para computações | ⭐⭐⭐ | Baixo |
| Imutable data over mutation | ⭐⭐⭐ | Médio |
| `cache` directive para alternância | ⭐⭐ | Baixo |
| `classMap`/`styleMap` sobre string | ⭐⭐ | Baixo |
| Signals para pinpoint updates | ⭐⭐⭐⭐ | Médio |
| Light DOM em leaf components | ⭐⭐ | Baixo |
| Lazy loading de componentes pesados | ⭐⭐⭐⭐ | Médio |
| Lit Compiler em build | ⭐⭐⭐ | Baixo |
| Code splitting | ⭐⭐⭐⭐ | Alto |
| Evitar funções no template | ⭐ | Baixo |
| `@state` em vez de `@property` | ⭐ | Baixo |

## 11. Exemplo: Lista Virtualizada

```bash
npm i @lit-labs/virtualizer
```

```typescript
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@lit-labs/virtualizer';

@customElement('virtual-list')
class VirtualList extends LitElement {
  @property({ attribute: false })
  items: any[] = [];

  render() {
    return html`
      <lit-virtualizer
        .items=${this.items}
        .renderItem=${(item: any) => html`
          <div class="item">${item.name}</div>
        `}
      ></lit-virtualizer>
    `;
  }
}
```
