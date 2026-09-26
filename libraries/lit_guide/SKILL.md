---
name: lit
description: >
  Lit v3 — Web Components library with SSR: reactive architecture, properties,
  lit-html templates, styles, Shadow DOM, events, composition, data management,
  performance, interoperability, SSR, custom directives, localization. Load
  when building framework-agnostic reusable components.
category: libraries
version: "3"
tags: [lit, web-components, shadow-dom, ssr, directives, reactivity, localization]
license: MIT
---

# Lit v3

## Use When
- Building reusable Web Components across frameworks
- Shadow DOM encapsulation, slots, and styling
- Reactive properties and rendering with `lit-html`
- SSR (`@lit-labs/ssr`) and hydration
- Custom directives and localization

## Core Rules
- Extend `LitElement`; declare reactive props with `@property`/`@state`.
- Static `styles = css\`...\``; use `::part()`/CSS custom properties for theming.
- Reflect only what needs to appear as an attribute (`reflect: true` selectively).
- Use `@click`/`addEventListener` on the shadow root; clean up in `disconnectedCallback`.
- Render declaratively; batch updates (Lit does this automatically).
- Slots for composition; avoid reaching into light DOM children imperatively.
- SSR: use `@lit-labs/ssr` directives (`unsafeHTML`, `repeat`, `when`) and hydrate.
- `delegatesFocus: true` for focusable shadow roots; maintain a11y roles/names.
- Tree-shake: import only used directives.

## Core Patterns
```ts
import { LitElement, html, css } from "lit";
import { property, state, customElement } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

@customElement("x-counter")
export class Counter extends LitElement {
  static styles = css`:host{display:block} button{font:inherit}`;
  @property({ type: Number }) value = 0;
  @state() private history: number[] = [];

  render() {
    return html`
      <button @click=${this.#inc} aria-label="increment">+</button>
      <output>${this.value}</output>
      ${repeat(this.history, (n) => n, (n) => html`<span>${n}</span>`)}
    `;
  }
  #inc = () => { this.value++; this.history = [...this.history, this.value]; };
}
declare global { interface HTMLElementTagNameMap { "x-counter": Counter } }
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Overview, v3, Web Components, SSR |
| `01-arquitetura-fundamentos.md` | Reactive update lifecycle |
| `02-componentes-propriedades.md` | Properties, attributes, decorators |
| `03-templates-renderizacao.md` | lit-html templates and rendering |
| `04-estilos-css.md` | Scoped CSS, adoptedStyleSheets |
| `05-shadow-dom.md` | Shadow DOM, slots, encapsulation |
| `06-eventos.md` | Events, composed, delegation |
| `07-composicao.md` | Composition and slots |
| `08-gerenciamento-dados.md` | State/data patterns, controllers |
| `09-performance.md` | Update batching, lazy loading |
| `10-interoperabilidade.md` | Framework interop |
| `11-ssr.md` | SSR and hydration |
| `12-ferramentas.md` | Tooling, build, dev server |
| `13-custom-directives.md` | Writing directives |
| `14-localizacao.md` | Localization |
| `general-cross-lang-usage.md` | Cross-language usage notes |

## Read Order
`00`→`01`→`02`→`03`; styling/Shadow DOM `04`+`05`; SSR `11`; directives `13`.

## Prereqs
JavaScript/TypeScript, DOM and Web Components basics.
