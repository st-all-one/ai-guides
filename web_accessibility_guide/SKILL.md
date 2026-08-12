# Skill: Acessibilidade Web Moderna (WCAG 2.2 AA + ARIA 1.2)

## Objetivo

Produzir código HTML/CSS/JS/TS acessível seguindo WCAG 2.2 AA e WAI-ARIA 1.2, usando **HTML semântico nativo como fundação** e ARIA apenas quando não há alternativa HTML.

---

## Regras Absolutas

1. **HTML semântico primeiro.** `<button>` antes de `role="button"`. `<h1>`-`<h6>` antes de `role="heading"`. `<nav>`, `<main>`, `<aside>`, `<footer>` em vez de `<div role="navigation">` etc.
2. **ARIA é muleta, não fundação.** Se existe elemento nativo com a semântica desejada, use-o. "No ARIA is better than bad ARIA."
3. **Tudo operável por teclado.** Tab, setas, Enter, Space, Escape. Roving tabindex em widgets compostos. Focus trap em modais. Skip link.
4. **Cor nunca é o único canal.** Informação transmitida por cor deve ter redundância textual/icônica.
5. **Prefira `aria-labelledby` a `aria-label`** quando o label visível existe no DOM.
6. **Live regions ANTES da mudança.** `aria-live="polite"` por padrão; `assertive` só para emergências.
7. **`inert` em vez de `aria-hidden`** para desabilitar conteúdo fora de modais (resolve foco fantasma).
8. **`delegatesFocus: true`** em Web Components interativos.
9. **Preferências do SO sempre respeitadas:** `prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`, `forced-colors`.
10. **Teste com AT real.** NVDA+Chrome, VoiceOver+Safari, TalkBack+Android. Automatizado cobre ~40%.

---

## Hierarquia de Nome Acessível

```
aria-labelledby  >  aria-label  >  <label> / alt  >  conteúdo  >  placeholder  >  title
```

## Hierarquia de Implementação (Prioridade)

1. HTML nativo (`<button>`, `<input>`, `<dialog>`, `<details>`)
2. HTML nativo + atributo ARIA simples (`aria-label`, `aria-describedby`)
3. HTML nativo + ARIA avançado (`aria-expanded`, `aria-controls`)
4. Elemento genérico + role + tabindex + keyboard handlers (último caso)

---

## Padrões Obrigatórios por Componente

### Accordion
```html
<button aria-expanded="false" aria-controls="panel-1">Título</button>
<div id="panel-1" role="region" aria-labelledby="..." hidden>...</div>
```

### Dialog/Modal
```html
<div role="dialog" aria-modal="true" aria-labelledby="title">
  <h2 id="title">...</h2>
</div>
```
- Focus trap + `inert` no fundo + Escape fecha + foco restaurado ao fechar

### Tabs
```html
<div role="tablist" aria-label="...">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Aba 1</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">...</div>
```
- Setas navegam, Tab sai do tablist

### Combobox/Autocomplete
```html
<div role="combobox" aria-expanded="false" aria-controls="listbox">
  <input aria-activedescendant="">
</div>
<ul role="listbox" id="listbox" hidden>...</ul>
```

### Carousel
```html
<section aria-roledescription="carousel" aria-label="Destaques">
  <div role="group" aria-roledescription="slide" aria-label="Slide 1 de 5">...</div>
</section>
```

---

## CSS Obrigatório

```css
/* Skip link */
.skip-link { position: absolute; top: -100%; }
.skip-link:focus { top: 0; }

/* Focus visible */
*:focus-visible { outline: 3px solid Highlight; outline-offset: 2px; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Forced colors */
@media (forced-colors: active) {
  *:focus-visible { outline: 3px solid Highlight; }
}

/* Screen reader only */
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

/* Touch targets */
button, a, input, select, textarea, [tabindex] { min-height: 44px; min-width: 44px; }
```

---

## JavaScript Obrigatório

```javascript
// Focus trap
function focusTrap(container, e) {
  const focusable = container.querySelectorAll(
    'button, input, a, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

// Roving tabindex
function rovingTabindex(items, currentIndex, nextIndex) {
  items[currentIndex].tabIndex = -1
  items[nextIndex].tabIndex = 0
  items[nextIndex].focus()
}

// Live region announce
function announce(msg) {
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.textContent = msg
  document.body.append(el)
  setTimeout(() => el.remove(), 3000)
}
```

---

## Testes (Mínimo)

| Tipo | Ferramenta | Comando |
|------|-----------|---------|
| Lint | eslint-plugin-jsx-a11y | `npx eslint --plugin jsx-a11y src/` |
| Unitário | jest-axe | `expect(await axe(container)).toHaveNoViolations()` |
| E2E | cypress-axe | `cy.checkA11y(null, { includedImpacts: ['critical'] })` |
| Auditoria | Lighthouse CI | `npx lhci autorun` |
| Contraste | WebAIM | Manual |

---

## Pipeline CI (GitHub Actions)

```yaml
- run: npx eslint --plugin jsx-a11y src/
- run: npx jest --testMatch "**/*.a11y.test.js"
- run: npx cypress run --spec "cypress/e2e/a11y/**"
- run: npx lhci autorun
- run: npx pa11y-ci
```

---

## Anti-padrões (NUNCA Fazer)

- `tabindex` positivo (`tabindex="5"`)
- `outline: none` sem substituto
- `role="button"` em `<div>` sem `tabindex="0"` + handlers
- `aria-hidden="true"` em elemento focável
- `aria-label` duplicando label visível
- `role="alert"` em HTML estático (não é anunciado)
- `aria-live="assertive"` para tudo
- `placeholder` como único label
- Texto em imagem em vez de HTML
- `display: none` em live regions
- `role="application"` em site normal

---

## WCAG 2.2 — Critérios Críticos para AA

| Critério | Resumo |
|----------|--------|
| 1.1.1 | `alt` em toda imagem |
| 1.4.3 | Contraste ≥ 4.5:1 (texto normal) |
| 1.4.11 | UI/gráficos ≥ 3:1 |
| 2.1.1 | Tudo por teclado |
| 2.4.1 | Skip link |
| 2.4.3 | Ordem de foco lógica |
| 2.4.7 | Foco visível |
| 2.5.3 | Label in Name |
| 2.5.8 | Target ≥ 24×24px |
| 3.3.2 | Labels em todo input |
| 4.1.2 | Name, Role, Value programáticos |
| 4.1.3 | Status messages com role/live region |

---

## Recursos

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- ARIA APG: https://www.w3.org/WAI/ARIA/apg/
- axe-core: https://github.com/dequelabs/axe-core
- Radix UI: https://www.radix-ui.com/
- MDN A11y: https://developer.mozilla.org/en-US/docs/Web/Accessibility
- Referência elemento → role implícita: `25-tag-role-reference.md`
- Medição real com a ferramenta: `sniffCSS` (contrast + ax já ON por padrão)
