# SKILL: htmx 4

## Description
Complete guide to building a 3-column Task Manager with htmx 4 and Rust Axum, following HTML-over-the-wire and HATEOAS principles.

## When to Use
- Building multi-column dashboards with independent fragment updates
- Implementing htmx 4 patterns: hx-get, hx-post, hx-target, hx-swap, hx-trigger, hx-oob
- Handling forms with validation and error feedback via htmx
- Multi-target updates (OOB swaps) for sidebar + center + detail panels
- Rust Axum server patterns: handlers, templates, extractors, SSE
- Migrating from htmx v2

## Files
| File | Covers |
|------|--------|
| `01-introduction.md` | htmx 4 philosophy: HTML-over-the-wire, HATEOAS, 3-column Task Manager architecture |
| `02-setup.md` | Project setup: Rust Axum project, templates, htmx 4 CDN, static assets |
| `03-three-column-layout.md` | 3-column layout: sidebar (E), center (M), detail (D) with htmx partial updates |
| `04-task-crud.md` | CRUD operations: create, read, update, delete tasks via htmx requests |
| `05-multi-target.md` | Multi-target updates: OOB swaps, updating multiple DOM elements per response |
| `06-forms.md` | Form handling: validation errors, inline feedback, form submission with htmx |
| `07-error-handling.md` | Error handling: server errors, htmx error events, user-facing error messages |
| `08-optimizations.md` | Performance: caching, lazy loading, debounce, throttle, request dedup |
| `09-rust-axum-patterns.md` | Axum patterns: extractors, middleware, error handling, template rendering |
| `10-migration-from-v2.md` | Migration guide: breaking changes from htmx v2 to v4 |

## How to Read
1. Start with `01-introduction.md` for the mental model.
2. Read `02-setup.md` to scaffold the project.
3. Follow `03-three-column-layout.md` → `04-task-crud.md` → `05-multi-target.md` → `06-forms.md` → `07-error-handling.md` → `08-optimizations.md` for the full implementation.
4. `09-rust-axum-patterns.md` is a reference for Axum specifics.
5. `10-migration-from-v2.md` is only needed when upgrading an existing project.

## Prerequisites
- Basic HTML, JavaScript, and Rust
- Familiarity with Axum (or general Rust web patterns)
- No prior htmx knowledge required

## Related Guides
- **daisy_guide** — daisyUI 5 + Tailwind CSS 4 for styling the same Task Manager UI
- **leptos_guide** — Alternative approach: Leptos 0.8 client/server reactivity instead of htmx
