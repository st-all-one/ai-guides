# SKILL: Leptos 0.8

## Description
Complete full-stack Rust web framework guide covering Leptos 0.8: fine-grained reactivity, SSR, server functions, routing, and deployment.

## When to Use
- Building reactive web UIs in Rust with the `view!` macro
- Understanding Leptos signals, effects, memos, and the reactive system
- Implementing parent-child communication, async data loading, and routing
- Using server functions for full-stack (client + server) logic
- Progressive enhancement, islands architecture, and SSR/SSG/hydration
- Testing, deployment, JS interop, and metadata management

## Files
| File | Covers |
|------|--------|
| `00-foreword.md` | Overview: Leptos philosophy, full-stack Rust, fine-grained reactivity, target audience |
| `01-getting-started.md` | Project setup: cargo-leptos, CSR vs SSR, directory structure, dev server |
| `02-view-syntax.md` | `view!` macro: HTML/Rust interpolation, attributes, classes, events, fragments |
| `03-components.md` | Components: definition, props (optional, default, generic), children, `cx` usage |
| `04-reactivity.md` | Reactivity core: `create_signal`, `create_effect`, `create_memo`, `with`, `update` |
| `05-control-flow.md` | Control flow: `if`/`match` in views, `<Show/>`, `<For/>`, `<Suspense/>`, error boundaries |
| `06-forms-inputs.md` | Forms: controlled/uncontrolled inputs, validation, `on:input`/`on:submit` |
| `07-parent-child.md` | Parent-child: passing signals as props, callback props, context API |
| `08-async.md` | Async: `<Suspense/>`, `Resource`, parallel data loading, streaming |
| `09-routing.md` | Routing: `<Router/>`, `<Route/>`, nested routes, params, `<A/>`, navigation |
| `10-global-state.md` | Global state: context, signals at module level, stores, reactive singletons |
| `11-styling.md` | Styling: CSS modules, Tailwind (Trunk, Leptos style), `<Style/>`, global CSS, class toggling |
| `12-metadata.md` | Metadata: `<Title/>`, `<Meta/>`, `<Link/>` components for SEO, social tags |
| `13-js-interop.md` | JS interop: `window` access, JS FFI, `document` API, third-party JS libs |
| `14-testing.md` | Testing: unit tests, integration with `wasm-bindgen-test`, DOM testing, CI patterns |
| `15-ssr.md` | SSR: server rendering, hydration, `leptos_axum`/`leptos_actix` integration, streaming HTML |
| `16-server-functions.md` | Server functions: `#[server]`, typed client-server calls, auth, file uploads |
| `17-progressive-enhancement.md` | Progressive enhancement: `<ActionForm/>`, `<MultiActionForm/>`, JS-disabled UX |
| `18-islands.md` | Islands: `#[island]`, selective hydration, partial interactivity, reducing WASM size |
| `19-deployment.md` | Deployment: WASM vs SSR builds, Docker, hosting (Vercel, Fly, Shuttle, custom), env vars |
| `20-appendix-reactive-system.md` | Appendix: deep dive into Leptos' reactive primitives — signal graph, batching, disposal |
| `21-appendix-lifecycle.md` | Appendix: component lifecycle — mount, update, unmount hooks, `on_cleanup`, ordering |

## How to Read
1. Start with `00-foreword.md` for the mental model.
2. Follow `01-getting-started.md` → `02-view-syntax.md` → `03-components.md` → `04-reactivity.md` for the core foundation.
3. Continue `05-control-flow.md` → `06-forms-inputs.md` → `07-parent-child.md` → `08-async.md` → `09-routing.md` → `10-global-state.md` for the full app-building path.
4. Remaining chapters (`11-styling.md` through `19-deployment.md`) are topical references — read as needed.
5. Appendices (`20-appendix-reactive-system.md`, `21-appendix-lifecycle.md`) are deep-dive references.

## Prerequisites
- Intermediate Rust: ownership, traits, macros, async
- Basic HTML/CSS/JS understanding (for JS interop and web concepts)
- No prior Leptos or reactive framework experience required

## Related Guides
- **daisy_guide** — daisyUI 5 + Tailwind CSS 4 for styling Leptos components (chapter 11)
- **htmx4_guide** — Alternative approach: htmx 4 + Axum without client-side reactivity
