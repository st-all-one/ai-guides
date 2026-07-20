# Shadow DOM Profundo

## O que é Shadow DOM?

Shadow DOM é uma árvore DOM isolada anexada a um elemento. Proporciona:

- **Encapsulamento de estilo** — CSS não vaza para dentro nem para fora
- **Encapsulamento DOM** — seletores como `querySelector` não atravessam a boundary
- **Composição via `<slot>`** — projeção de conteúdo do light DOM no shadow DOM

## Lit e Shadow DOM

Por padrão, `LitElement` cria um `ShadowRoot` aberto:

```typescript
// Default — aberto
createRenderRoot() {
  return this.attachShadow({ mode: 'open', delegatesFocus: true });
}
```

### Modos

| Modo | Acesso via `element.shadowRoot` | Uso |
|------|--------------------------------|-----|
| `open` | ✅ Sim | Padrão, recomendado |
| `closed` | ❌ Não | Raramente necessário |

> **`closed` é quase sempre desnecessário.** Dá falsa sensação de segurança (dá pra contornar) e quebra funcionalidades como `element.shadowRoot` para testes e debugging.

## Slots — Projeção de Conteúdo

```typescript
@customElement('my-card')
export class MyCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    .header { background: #f5f5f5; padding: 12px 16px; font-weight: 700; }
    .body { padding: 16px; }
    .footer { background: #fafafa; padding: 8px 16px; border-top: 1px solid #eee; }
    ::slotted(*) { margin: 0; }
  `;

  render() {
    return html`
      <div class="header"><slot name="header">Default Header</slot></div>
      <div class="body"><slot>Default content</slot></div>
      <div class="footer"><slot name="footer"></slot></div>
    `;
  }
}
```

```html
<my-card>
  <h2 slot="header">Card Title</h2>
  <p>Main body content</p>
  <p slot="footer">Footer note</p>
</my-card>
```

### Slots — Características Importantes

1. **Fallback content**: Conteúdo dentro de `<slot>` é exibido se nenhum child for projetado
2. **`slotchange` event**: Dispara quando nodes projetados mudam
3. **`::slotted(selector)`**: Estiliza conteúdo projetado (⚠️ apenas seletores simples)
4. **Múltiplos slots**: Diferenciados por `name="..."`; slot sem nome (`default`) recebe conteúdo sem `slot` attribute

### Limitações de `::slotted`

```css
/* ✅ Funciona */
::slotted(h2) { color: blue; }
::slotted(.my-class) { font-weight: bold; }
::slotted(*) { margin: 0; }

/* ❌ NÃO funciona */
::slotted(.container span) { }  /* descendente */
::slotted(h2, p) { }            /* múltiplos (funciona em alguns browsers) */
::slotted([slot="header"]) { }  /* por atributo slot */
```

## Composição: Slot vs. Propriedades

| Objetivo | Abordagem |
|----------|-----------|
| Conteúdo textual | Propriedade + child expression |
| Conteúdo HTML simples | Slot |
| Conteúdo complexo/componentes | Slot nomeado |
| Configuração | Propriedades/atributos |
| Template customizado | Slot + fallback default |

```typescript
// Quando usar property vs slot
@customElement('my-badge')
export class MyBadge extends LitElement {
  // Use property para texto curto/config
  @property() label = '';
  @property() variant: 'info' | 'success' = 'info';

  // Use slot para conteúdo complexo
  render() {
    return html`
      <span class="badge ${this.variant}">
        <slot>${this.label}</slot> <!-- fallback: label como texto -->
      </span>
    `;
  }
}
```

## Acessando Slotted Children

```typescript
@customElement('my-tabs')
export class MyTabs extends LitElement {
  private _tabItems: HTMLElement[] = [];

  render() {
    return html`
      <div class="tabs"><slot @slotchange=${this._onSlotChange}></slot></div>
    `;
  }

  private _onSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._tabItems = slot.assignedElements({ flatten: true });
    this._tabItems.forEach((el, i) => {
      el.classList.toggle('active', i === 0);
    });
  }
}
```

### Decorators para Slotted Children

```typescript
import { queryAssignedElements, queryAssignedNodes } from 'lit/decorators.js';

class MyTabs extends LitElement {
  @queryAssignedElements({ slot: 'tab', flatten: true })
  private _tabs!: HTMLElement[];

  @queryAssignedNodes({ slot: 'panel', flatten: true })
  private _panels!: Node[];
}
```

## Querying no Shadow DOM

```typescript
class MyElement extends LitElement {
  @query('#my-input')
  private _input!: HTMLInputElement;

  @queryAll('.item')
  private _items!: NodeListOf<HTMLElement>;

  @queryAsync('#dynamic-content')
  private _dynamic!: Promise<HTMLElement>;

  firstUpdated() {
    this._input.focus();
  }
}
```

- `@query` — `this.renderRoot.querySelector(...)`
- `@queryAll` — `this.renderRoot.querySelectorAll(...)`
- `@queryAsync` — Promise que resolve quando o elemento existe

## Eventos e Shadow DOM

### Retargeting de Eventos

Eventos que borbulham de dentro do Shadow DOM têm seu `target` retargetado para o host element:

```typescript
// Dentro do componente:
render() {
  return html`<button @click=${this._handleClick}>Click</button>`;
}

_handleClick(e: Event) {
  e.target; // o <button> dentro do Shadow DOM
}

// Fora do componente:
element.addEventListener('click', (e) => {
  e.target; // o <my-element> (não o <button> interno!)
  e.composedPath(); // [button, #shadow-root, my-element, body, html, document]
});
```

### Eventos que Atravessam Shadow DOM (`composed: true`)

```typescript
// Evento customizado que atravessa Shadow DOM
this.dispatchEvent(new CustomEvent('my-event', {
  bubbles: true,
  composed: true, // necessário para atravessar Shadow Root
  detail: { value: this.value }
}));
```

Eventos padrão que usam `composed: true`: click, mouseenter, keydown, focus, blur, etc.

Eventos que **não** são composed: mouseenter, mouseleave, focusin, focusout (em alguns browsers).

### Focus e Shadow DOM

```typescript
// delegatesFocus permite que foco "pule" o Shadow Root
createRenderRoot() {
  return this.attachShadow({
    mode: 'open',
    delegatesFocus: true  // foco no primeiro focoável do Shadow DOM
  });
}
```

## Sem Shadow DOM — Alternativas e Implicações

### Quando NÃO usar Shadow DOM

1. **Performance**: Shadow Root overhead (~0.5ms por componente)
2. **Formulários**: `<form>` não captura inputs dentro de Shadow DOM
3. **Estilos herdados**: Componente precisa herdar estilos do contexto (ex: tipografia)
4. **SSR sem DSD**: `Declarative Shadow DOM` requer suporte SSR
5. **Testes**: `querySelector` no Light DOM é mais direto

```typescript
@customElement('my-input')
class MyInput extends LitElement {
  createRenderRoot() { return this; } // Light DOM

  @property() value = '';
  @property() label = '';
  @property() type = 'text';

  render() {
    return html`
      <label>
        <span>${this.label}</span>
        <input .value=${this.value} type=${this.type} @input=${this._onInput}>
      </label>
    `;
  }

  private _onInput(e: InputEvent) {
    this.value = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value }
    }));
  }
}
```

### Arquitetura Híbrida

```typescript
// Root component: Shadow DOM para encapsulamento estrutural
<my-app>
  #shadow-root
    <my-header></my-header>
    <main>
      <slot></slot>  <!-- conteúdo da página projetado -->
    </main>

<!-- Content component: Light DOM para integração com formulários -->
<my-page>
  <my-search-field></my-search-field>  <!-- Light DOM -->
  <my-data-table></my-data-table>      <!-- Light DOM -->
```

### Detectando Shadow DOM Dinamicamente

```typescript
class HybridElement extends LitElement {
  // Decide em runtime se usa Shadow DOM
  createRenderRoot() {
    if (this.hasAttribute('light-dom')) {
      return this;
    }
    return super.createRenderRoot();
  }
}
```

## Scoped Custom Element Registry (Experimental)

```bash
npm i @lit-labs/scoped-registry-mixin
```

```typescript
import { ScopedRegistryMixin } from '@lit-labs/scoped-registry-mixin';

class MyScopedElement extends ScopedRegistryMixin(LitElement) {
  // Cada shadow root tem seu próprio registry
  // Evita colisão de nomes de custom elements
}
```

## Dicas de Performance e Boas Práticas

1. **Preferir `open` mode** — `closed` raramente traz benefício real
2. **Usar `delegatesFocus`** para melhor acessibilidade em inputs
3. **Evitar `@query` excessivo** — chamadas `querySelector` têm custo
4. **Named slots para flexibilidade** — permite que usuários do componente projetem conteúdo
5. **Fallback em slots** — sempre forneça conteúdo default quando fizer sentido
6. **`::slotted` apenas para estilos simples** — para CSS complexo, use `part` ou propriedades
7. **Considerar Light DOM** para componentes de formulário e leaf components
8. **`composed: true`** em eventos customizados que precisam ser ouvidos fora do componente
