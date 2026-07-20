# SKILL: CSS Modern Guide

## Description
Comprehensive modern CSS reference (2026 edition) covering CSS Grid, Subgrid, @property, @layer, Container Queries, intrinsic design, performance, accessibility, and full foundational topics — each file self-contained for AI consumption.

## When to Use
- Building layouts with CSS Grid, Subgrid, or Flexbox
- Managing CSS cascade and specificity with `@layer` and `:where()`
- Creating type-safe custom properties with `@property` and `env()`
- Implementing intrinsic responsive design (container queries, `clamp()`, `minmax()`)
- Animating with `@starting-style`, view transitions, and discrete animations
- Optimizing rendering performance (`content-visibility`, `contain`, `will-change`)
- Ensuring cross-browser interoperability and progressive enhancement
- Designing accessible, print-friendly, and themeable stylesheets

## Files
| File | Covers |
|------|--------|
| `00-introducao.md` | Meta-guide, philosophy, file map, coding conventions |
| `01-layout-grid.md` | Grid — `grid-template-areas`, named lines, auto-placement, `gap` |
| `02-subgrid.md` | Subgrid — component composition, inheriting parent tracks |
| `03-performance.md` | `content-visibility`, `contain`, `will-change`, render critical path |
| `04-interoperabilidade.md` | Cross-browser fallbacks, `@supports`, progressive enhancement |
| `05-variaveis-camadas.md` | Custom properties, `@layer`, scoping, `var()` fallbacks |
| `06-responsivo.md` | Intrinsic responsive — `clamp()`, `minmax()`, container queries |
| `07-padroes-componentes.md` | Reusable component patterns, BEM alternatives, naming |
| `08-propriedades-registradas.md` | `@property` (syntax, inherits, initial-value), `env()`, `attr()` |
| `09-funcoes-modernas.md` | `oklch()`, `color-mix()`, `min/max/clamp()`, advanced `calc()` |
| `10-seletores-avancados.md` | `:has()`, `:where()`, `:is()`, specificity management |
| `11-tipografia-moderna.md` | `@font-face`, variable fonts, `text-wrap`, `font-display` |
| `12-stacking-scroll.md` | Stacking context, `scroll-snap`, `overscroll-behavior`, `position: sticky` |
| `13-acessibilidade.md` | `prefers-reduced-motion`, `color-scheme`, `:focus-visible`, contrast |
| `14-animacoes-discretas.md` | `@starting-style`, `transition-behavior: allow-discrete`, view transitions |
| `15-web-component-optimization.md` | Web Components + Shadow DOM, subgrid, `@property`, container queries |
| `16-flexbox.md` | Flexbox — container, items, alignment, `gap`, patterns |
| `17-seletores-basicos.md` | Type, class, ID, attribute, combinators, pseudo-classes/elements |
| `18-box-model.md` | `content-box` vs `border-box`, padding, margin, margin collapse |
| `19-cascata-heranca.md` | Cascade, inheritance, `initial/inherit/unset/revert`, shorthand processing |
| `20-posicionamento-display.md` | `position`, `display`, float, BFC |
| `21-backgrounds-borders.md` | Backgrounds, borders, `border-radius`, `box-shadow`, gradients, outline |
| `22-animacoes-keyframes.md` | `@keyframes`, animation properties, fill modes, performance |
| `23-transicoes.md` | Transitions, triggers, animatable properties |
| `24-cores-fundamentos.md` | Hex, `rgb`, `hsl`, named colors, `currentColor`, alpha |
| `25-transforms.md` | 2D/3D transforms, `perspective`, `transform-origin` |
| `26-sintaxe-at-rules.md` | `@charset`, `@import`, `@namespace`, `@supports`, `@scope`, rule order |
| `27-print.md` | `@page`, `@media print`, page breaks, margin boxes |
| `28-contadores.md` | `counter-reset/increment`, `counters()`, `@counter-style`, `::marker` |
| `29-imagens.md` | `object-fit/position`, `aspect-ratio`, `image-set`, SVG, `<picture>` |
| `30-filtros.md` | `filter`, `backdrop-filter`, `drop-shadow`, blend modes |
| `31-tipos-valores-unidades.md` | CSS data types, units, logical properties |
| `32-recommended-modern-implementation.md` | Full implementation — dashboard, subgrid, containers, theme, a11y, print |

## How to Read
- Start with `00-introducao.md` for philosophy, conventions, and overview
- For modern layouts: `01-layout-grid.md` → `02-subgrid.md` → `06-responsivo.md`
- For cascade management: `05-variaveis-camadas.md` → `10-seletores-avancados.md` → `19-cascata-heranca.md`
- For design tokens: `08-propriedades-registradas.md` → `09-funcoes-modernas.md` → `24-cores-fundamentos.md`
- For animations: `14-animacoes-discretas.md` → `22-animacoes-keyframes.md` → `23-transicoes.md`
- For performance: `03-performance.md` → `11-tipografia-moderna.md`
- For Web Components: `15-web-component-optimization.md`
- End with `32-recommended-modern-implementation.md` for a consolidated reference implementation
- Foundational files (`16-flexbox.md` through `31-tipos-valores-unidades.md`) are self-contained references

## Prerequisites
- Basic CSS understanding (selectors, box model, cascade)
- Familiarity with HTML semantics
- A modern browser (2024+) for CSS Subgrid, Container Queries, `@property`

## Related Guides
- `ai_guides/alpine_js_guide/` — adding client interactivity styled with CSS
- `ai_guides/askama_guide/` — server-side HTML generation that references CSS classes
