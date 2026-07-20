# Estratégias de CSS no Lit

Guia completo sobre estilos em componentes Lit: com Shadow DOM, sem Shadow DOM, CSS compartilhado, CSS isolado, e otimizações de performance.

---

## 1. Shadow DOM + CSS Encapsulado (Padrão)

### Estilos no Componente

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('my-button')
export class MyButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      padding: 8px 16px;
      background: var(--btn-bg, #0066cc);
      color: var(--btn-color, white);
      border-radius: 4px;
      cursor: pointer;
    }
    :host([disabled]) {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .label {
      font-weight: 600;
    }
  `;

  @property({ type: Boolean }) disabled = false;

  render() {
    return html`<span class="label"><slot></slot></span>`;
  }
}
```

### Características do `css` Tag

- Retorna `CSSResult` — não é string
- Otimizado: parsed uma vez, compartilhado entre instâncias
- Suporta `unsafeCSS` para strings dinâmicas (⚠️ risco XSS)
- Template expressions NÃO funcionam dentro de `css\`...\``
- Validação de template (no dev mode): previne CSS malformado

### `:host` Selector

```css
:host { /* estilos no elemento raiz */ }
:host([disabled]) { /* quando atributo disabled presente */ }
:host(.active) { /* quando classe active */ }
:host-context(.dark-theme) { /* ancestral com classe dark-theme */ }
```

## 2. CSS Compartilhado entre Componentes

### Objeto de Estilos Compartilhados

```typescript
// shared-styles.ts
import { css } from 'lit';

export const buttonStyles = css`
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-primary {
    background: #0066cc;
    color: white;
  }
  .btn-primary:hover {
    background: #0052a3;
  }
  .btn-secondary {
    background: #f0f0f0;
    color: #333;
  }
`;

export const typographyStyles = css`
  .heading { font-size: 24px; font-weight: 700; line-height: 1.3; }
  .body { font-size: 14px; line-height: 1.6; }
  .caption { font-size: 12px; color: #666; }
`;
```

### Consumo

```typescript
import { buttonStyles, typographyStyles } from './shared-styles.js';

@customElement('my-awesome-button')
export class MyAwesomeButton extends LitElement {
  static styles = [buttonStyles, css`
    :host {
      display: inline-block;
    }
    .btn {
      /* sobrescreve ou estende estilos compartilhados */
      padding: 12px 24px;
    }
  `];
  // ...
}
```

### Design Tokens via CSS Custom Properties

```typescript
// tokens.css — global, não no Shadow DOM
:root {
  --color-primary: #0066cc;
  --color-primary-hover: #0052a3;
  --color-text: #1a1a1a;
  --spacing-unit: 8px;
  --font-family: 'Inter', system-ui, sans-serif;
  --border-radius: 4px;
}
```

```typescript
// Componente consome tokens
static styles = css`
  :host {
    background: var(--color-primary);
    color: white;
    font-family: var(--font-family);
    padding: calc(var(--spacing-unit) * 2);
  }
`;
```

### CSS Modules/Layers para Organização

```typescript
import { css } from 'lit';

export const baseStyles = css`
  @layer base, components;

  @layer base {
    :host {
      box-sizing: border-box;
    }
    *, *::before, *::after {
      box-sizing: inherit;
    }
  }
`;
```

## 3. CSS Dinâmico

### Troca de Estilos via Propriedades

```typescript
@customElement('my-badge')
export class MyBadge extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    :host([variant='success']) { background: #d4edda; color: #155724; }
    :host([variant='warning']) { background: #fff3cd; color: #856404; }
    :host([variant='danger'])  { background: #f8d7da; color: #721c24; }
  `;

  @property() variant: 'success' | 'warning' | 'danger' = 'success';

  render() {
    return html`<slot></slot>`;
  }
}
```

### styleMap Directive

```typescript
import { styleMap } from 'lit/directives/style-map.js';

@customElement('my-box')
export class MyBox extends LitElement {
  static styles = css`
    :host {
      display: block;
      transition: all 0.3s;
    }
  `;

  @property() color = '#0066cc';
  @property() width = 200;

  render() {
    return html`
      <div style=${styleMap({
        backgroundColor: this.color,
        width: `${this.width}px`,
        height: `${this.width * 0.6}px`,
        '--local-prop': this.color
      })}>
        <slot></slot>
      </div>`;
  }
}
```

### CSS Custom Properties Dinâmicas

```typescript
// No template, defina custom properties que penetram o Shadow DOM
render() {
  return html`
    <div style="--bg: ${this.bgColor}; --text: ${this.textColor};">
      <my-themed-component></my-themed-component>
    </div>
  `;
}
```

## 4. Sem Shadow DOM (Light DOM)

### Quando Usar

- **Componentes de formulário**: `<form>` não enxerga inputs dentro de Shadow Root
- **Performance extrema**: evitar o overhead do Shadow DOM
- **Estilos globais necessários**: o componente deve herdar estilos do contexto
- **SSR simples**: sem `declarative-shadow-dom`

```typescript
@customElement('my-input')
export class MyInput extends LitElement {
  // Desativa Shadow DOM
  createRenderRoot() {
    return this;
  }

  // ⚠️ Estilos precisam usar seletores globais ou scoped via class
  static styles = css`
    .my-input-wrapper {
      display: flex;
      flex-direction: column;
    }
    .my-input-label {
      font-size: 12px;
      color: #666;
    }
    .my-input-field {
      border: 1px solid #ccc;
      padding: 8px;
      border-radius: 4px;
    }
  `;

  render() {
    return html`
      <div class="my-input-wrapper">
        <label class="my-input-label" for="input">${this.label}</label>
        <input id="input" class="my-input-field" .value=${this.value}>
      </div>
    `;
  }
}
```

### Problemas com Light DOM

1. **Colisão de IDs** — sem Shadow DOM, IDs são globais
2. **Estilos vazam** — `<style>` no Light DOM afeta outros elementos
3. **Slots não funcionam** — sem Shadow DOM, `<slot>` é ignorado
4. **Componentes filhos** — elementos filhos do componente são visíveis e estilizáveis externamente

### Mitigação de Colisão de Estilos

```typescript
// Prefixed class names (convenção BEM)
static styles = css`
  .my-input { /* scoped pelo nome do componente */ }
  .my-input--focused { /* variante */ }
`;
```

## 5. CSS Híbrido: Shadow DOM + Estilos Globais

### Inherited Properties Penetram Shadow DOM

```css
/* Global — afeta componentes mesmo com Shadow DOM */
:root {
  --theme-primary: #0066cc;
  --theme-font: 'Inter', sans-serif;
}

body {
  color: var(--theme-text, #1a1a1a);
  font-family: var(--theme-font);
}
```

```typescript
// Componente usa inherited properties
static styles = css`
  :host {
    color: var(--theme-text, #1a1a1a);
    font-family: var(--theme-font);
  }
`;
```

### part e exportparts

```typescript
// Componente expõe partes para estilização externa
static styles = css`
  :host {
    display: block;
  }
  .header {
    font-size: 18px;
    font-weight: 700;
  }
  .content {
    padding: 16px;
  }
`;

render() {
  return html`
    <div class="header" part="header"><slot name="header"></slot></div>
    <div class="content" part="content"><slot></slot></div>
  `;
}
```

```css
/* Usuário do componente estiliza partes expostas */
my-card::part(header) {
  background: #f0f0f0;
  border-bottom: 2px solid #0066cc;
}
my-card::part(content) {
  color: #333;
}
```

### Exportparts de Componentes Aninhados

```html
<!-- my-card. parte do header é re-exposta -->
<my-card exportparts="header: card-header">
  <my-card-header part="header"></my-card-header>
</my-card>
```

## 6. CSS Encapsulado sem Shadow DOM

### Constructible Stylesheets (Adopted Stylesheets)

```typescript
import { adoptedStyles } from './shared-styles.js';

@customElement('my-light-component')
export class MyLightComponent extends LitElement {
  createRenderRoot() {
    return this;
  }

  // Ainda funciona! Lit injeta no adoptedStyleSheets do document
  static styles = css`
    .my-scoped-class {
      color: red;
    }
  `;
}
```

### Scoped Styles com `@scope` (CSS nativo)

```css
/* CSS nativo — suporte ainda limitado (Chrome 118+) */
@scope (.my-component) {
  :scope {
    display: block;
  }
  p {
    color: #333;
  }
}
```

## 7. Performance CSS

### Comparação de Estratégias

| Estratégia | Encapsulamento | Performance | Complexidade | SSR |
|------------|---------------|-------------|--------------|-----|
| Shadow DOM + `static styles` | ✅ Total | ⭐⭐⭐ | Baixa | ✅ |
| Light DOM + class scoping | ❌ Nenhum | ⭐⭐⭐⭐ | Média | ✅ |
| Light DOM + adopted stylesheets | Parcial | ⭐⭐⭐⭐ | Média | ⚠️ |
| Shadow DOM + `part` | Total com escape | ⭐⭐⭐ | Baixa | ✅ |
| CSS Custom Properties | Herdado | ⭐⭐⭐⭐⭐ | Baixa | ✅ |

### Regras de Ouro para Performance

1. **Sempre use `css\`...\`` tagged template** — nunca string concat para estilos estáticos
2. **Estilos compartilhados como objetos** — evita duplicação na memória
3. **CSS Custom Properties para temas** — zero overhead de runtime
4. **Evite `styleMap` para valores estáticos** — use CSS classes
5. **`classMap` é mais performático que `styleMap`** — preferir classes
6. **Evite `unsafeCSS`** — quebra otimizações e arrisca XSS
7. **`:host` selectors são mais rápidos que class no render root**
8. **Shadow DOM adiciona ~0.5ms por componente** — irrelevante para maioria

### Exemplo: Componente de Botão Otimizado

```typescript
@customElement('opt-button')
export class OptimizedButton extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--btn-padding, 8px 16px);
      background: var(--btn-bg, #0066cc);
      color: var(--btn-color, white);
      border: none;
      border-radius: var(--btn-radius, 4px);
      font: inherit;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    :host(:hover) { opacity: 0.85; }
    :host([variant='outline']) {
      background: transparent;
      border: 1px solid var(--btn-bg, #0066cc);
      color: var(--btn-bg, #0066cc);
    }
    :host([size='small']) { padding: 4px 8px; font-size: 12px; }
    :host([size='large']) { padding: 12px 24px; font-size: 16px; }
  `;

  render() {
    return html`<slot></slot>`;
  }
}
```

### Adopted StyleSheets (Avançado)

```typescript
// shared-styles.ts
const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  .shared-utility { margin: 0; padding: 0; box-sizing: border-box; }
`);

export function applySharedStyles(element: HTMLElement) {
  if (element.shadowRoot) {
    element.shadowRoot.adoptedStyleSheets = [
      ...element.shadowRoot.adoptedStyleSheets,
      sheet
    ];
  }
}
```

### Animações com `@keyframes` no Shadow DOM

```typescript
static styles = css`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  :host {
    animation: fadeIn 0.3s ease-out;
  }
`;
```

> `@keyframes` definidos dentro de `css\`...\`` são scoped ao Shadow DOM — não colidem com keyframes globais.
