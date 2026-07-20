# SKILL: daisyUI 5

## Description
Complete guide to building a Task Manager UI with daisyUI 5 + Tailwind CSS 4, covering both pure HTML and Rust Leptos 0.8+ implementations.

## When to Use
- Building UI components with daisyUI semantic classes (`btn`, `card`, `drawer`, `modal`, etc.)
- Applying daisyUI theming (light/dark/custom) via CSS variables
- Combining Tailwind utilities with daisyUI component classes
- Implementing layouts: navbar, sidebar, drawer, footer
- Building a Task Manager (TickTick clone) in pure HTML or Leptos

## Files
| File | Covers |
|------|--------|
| `00-index.md` | Overview: daisyUI philosophy, compatibility (Tailwind 4, Leptos 0.8+), project scope |
| `01-installation.md` | Setup: npm, CDN, Tailwind v4 plugin config, daisyUI 5 install |
| `02-color-system.md` | Theming: CSS variables, dark mode, custom color palettes, daisyUI semantic colors |
| `03-components.md` | Core components: btn, card, badge, input, select, textarea, toggle, checkbox, modal, dropdown, tooltip, avatar, tabs, menu, navbar, drawer, footer, table, kbd, indicator, countdown, diff, timeline, stepper |
| `04-layout.md` | Layout patterns: responsive grid, drawer + navbar composition, sidebar with main area |
| `05-task-manager-html.md` | Pure HTML Task Manager: 3-column layout, form elements, search, theme toggle |
| `06-task-manager-leptos.md` | Leptos integration: view! macro with daisyUI, reactive state, conditional classes |
| `07-best-practices.md` | Conventions: CDN-first approach, class ordering, responsive prefixes, Tailwind 4 + daisyUI 5 differences from v3/v4 |

## How to Read
1. Start with `00-index.md` for scope and philosophy.
2. Read `02-color-system.md` for theming; essential before any component work.
3. Consult `03-components.md` as a reference when building UIs.
4. For layout patterns, read `04-layout.md`.
5. For a complete implementation, read `05-task-manager-html.md` (HTML) or `06-task-manager-leptos.md` (Leptos).
6. `07-best-practices.md` is a final reference for conventions and gotchas.

## Prerequisites
- Basic HTML and CSS (Tailwind experience helpful)
- For the Leptos chapter: Rust, Leptos 0.8 basics

## Related Guides
- **leptos_guide** — Leptos 0.8 full-stack framework (used in chapter 06)
- **htmx4_guide** — Alternative approach: htmx 4 with Rust Axum for the same Task Manager
