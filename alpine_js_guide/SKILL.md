# SKILL: Alpine.js Guide

## Description
Complete Alpine.js v3.15.12 reference covering HTML and Rust/Leptos 0.8+ integration, with focus on SSR, islands architecture, and reactive UI without a JS bundler.

## When to Use
- Building interactive HTML with Alpine.js directives (`x-*`, `@`, `:`)
- Integrating Alpine.js with Rust SSR frameworks (Leptos, Axum)
- Implementing islands architecture with server-rendered + client-hydrated components
- Debugging state management, reactivity, transitions, or plugin behavior
- Designing reactive UIs without a heavy JavaScript build step

## Files
| File | Covers |
|------|--------|
| `00-foreword.md` | Meta-guide, version, audience, conventions, TOC |
| `01-instalacao.md` | Installation via CDN, npm, or Rust asset pipeline |
| `02-estado-reatividade.md` | x-data, $store, Alpine.store(), reactive state patterns |
| `03-diretivas-fundamentais.md` | x-show, x-if, x-for, x-model, x-bind, x-on, x-text, x-html |
| `04-transicoes-animacoes.md` | x-transition, enter/leave stages, duration, timing |
| `05-magicas-globais.md` | $refs, $dispatch, $watch, $nextTick, $el, $root, $id |
| `06-plugins.md` | Official plugins: Mask, Persist, Focus, Collapse, Intersect, Mutation, Sort, Anchor, Tooltip |
| `07-avancado.md` | Custom directives, lifecycle hooks, async data, CSP |
| `08-integracao-rust.md` | Leptos 0.8+ SSR + Alpine islands, Axum templates, asset hashing |
| `09-praticas-recomendadas.md` | Patterns: component scoping, performance, security, testing |

## How to Read
- Start with `00-foreword.md` for conventions and scope
- Read `01-instalacao.md` → `03-diretivas-fundamentais.md` for core usage
- Read `08-integracao-rust.md` if using Rust SSR
- Use remaining files as targeted references per topic
- Each file is self-contained; no strict sequential dependency beyond basics

## Prerequisites
- Basic HTML knowledge
- Familiarity with reactive directives (Vue, htmx, or similar)
- For Rust integration: Rust 1.85+, Leptos 0.8+, Cargo familiarity

## Related Guides
- `ai_guides/css_guide/` — styling Alpine components
- `ai_guides/askama_guide/` — server-side template rendering (alternative to Leptos SSR)
