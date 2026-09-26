---
name: alpine-js
description: >
  Alpine.js v3.15.12: directives (x-data, x-bind, x-on, x-for…), reactivity,
  magic properties, transitions, official plugins, and integration with
  server-rendered Rust/Leptos islands. Load when adding lightweight
  interactivity without a JS bundler.
category: libraries
version: "3.15.12"
tags: [alpinejs, javascript, reactivity, directives, plugins, ssr, islands, leptos, rust]
license: MIT
---

# Alpine.js v3.15.12

## Use When
- Adding interactivity to server-rendered HTML (`x-*`, `@`, `:`)
- Integrating Alpine with Rust SSR (Leptos, Axum) or islands
- Implementing dropdowns, modals, tabs, toggles without a bundler
- Debugging reactivity, transitions, or plugins

## Core Rules
- State lives in `x-data`; keep components small and self-contained.
- Use `x-cloak` + `[x-cloak]{display:none}` to avoid flash of unstyled markup.
- Prefer `x-model` for form binding; `x-bind` (`:`) for attributes; `@` for events.
- Use `Alpine.store()` for cross-component state; `$dispatch` for events.
- Never inline user data into `x-html`/`x-data` unsafely (CSP/XSS).
- With strict CSP, use `Alpine.data()` registrations and `@alpinejs/csp`.
- Clean up with `x-init` + `destroy()`; watch for leaks in `x-for`.
- Load plugins explicitly before `Alpine.start()`.

## Core Patterns
```html
<div x-data="{ open: false, items: [], async init(){ this.items = await (await fetch('/api')).json() } }" x-cloak>
  <button @click="open = !open" :aria-expanded="open">Menu</button>
  <ul x-show="open" x-transition>
    <template x-for="item in items" :key="item.id">
      <li x-text="item.name"></li>
    </template>
  </ul>
</div>
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.data('dropdown', () => ({ open: false, toggle(){ this.open = !this.open } }));
    Alpine.store('cart', { count: 0, add(){ this.count++ } });
  });
</script>
```

## File Map
| File | Content |
|---|---|
| `00-foreword.md` | Scope, conventions, TOC |
| `01-instalacao.md` | CDN, npm, Rust asset pipeline |
| `02-estado-reatividade.md` | `x-data`, `$store`, `Alpine.store()`, reactivity |
| `03-diretivas-fundamentais.md` | x-show/if/for/model/bind/on/text/html |
| `04-transicoes-animacoes.md` | `x-transition`, enter/leave stages |
| `05-magicas-globais.md` | `$refs`, `$dispatch`, `$watch`, `$nextTick`, `$el`, `$root`, `$id` |
| `06-plugins.md` | Mask, Persist, Focus, Collapse, Intersect, Mutation, Sort, Anchor, Tooltip |
| `07-avancado.md` | Custom directives, lifecycle, async, CSP |
| `08-integracao-rust.md` | Leptos 0.8 SSR + Alpine islands, Axum, asset hashing |
| `09-praticas-recomendadas.md` | Scoping, performance, security, testing |

## Read Order
`00`→`01`→`03`; state `02`; plugins `06`; Rust integration `08`.

## Prereqs
Basic HTML; familiarity with reactive directives.
