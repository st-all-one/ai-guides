---
name: leptos
description: >
  Leptos 0.8 full-stack Rust: fine-grained reactivity (signals/effects/memos),
  view! macro, components/props, control flow, forms, async, routing, global
  state, SSR/SSG/hydration, server functions, islands, progressive enhancement,
  JS interop, testing, deploy. Load when building reactive web UIs in Rust.
category: frameworks
version: "0.8"
tags: [rust, leptos, ssr, reactivity, signals, islands, server-functions, fullstack, wasm]
license: MIT
---

# Leptos 0.8

## Use When
- Reactive UIs in Rust with `view!`
- Signals, memos, effects, resources and the reactive graph
- Parent/child communication, async loaders, routing
- Full-stack logic with server functions (client + server)
- SSR/SSG/ISR, hydration, islands, progressive enhancement
- Testing, deployment, JS interop, metadata

## Core Rules
- Reactive primitives are `Copy`; clone cheaply, never wrap in `Rc<RefCell>`.
- `signal()` returns `(ReadSignal, WriteSignal)`; `RwSignal` when both needed.
- Use `Memo` for derived values; `Effect` for side effects; avoid effects for derivation.
- Async: `Resource`/`Action` + `Suspense`/`Transition`; don't block the render.
- Emit updates through signals; do not mutate DOM manually.
- `#[component]` + `#[prop(into)]`/`optional`/`default`; children as `Children`/`Child`.
- Server: `#[server]` functions; client calls them transparently.
- Gate browser-only APIs (`web_sys`, `window`) behind `#[cfg(feature = "hydrate")]`.
- Hydration must render identical markup on server and client to avoid mismatch.
- Prefer `leptos_router` routes with typed params.

## Core Patterns
```rust
use leptos::prelude::*;
use leptos::html::Input;

#[component]
fn Counter(#[prop(default = 0)] initial: i32) -> impl IntoView {
    let (count, set_count) = signal(initial);
    let doubled = Memo::new(move |_| count.get() * 2);
    view! {
        <div>
            <button on:click=move |_| set_count.update(|n| *n += 1)>"+"</button>
            <p>{move || count.get()} " -> " {move || doubled.get()}</p>
        </div>
    }
}

#[server(GetTodos, "/api")]
pub async fn get_todos() -> Result<Vec<String>, ServerFnError> {
    Ok(vec!["a".into(), "b".into()])
}

#[component]
fn Todos() -> impl IntoView {
    let todos = Resource::new(|| (), |_| get_todos());
    view! {
        <Suspense fallback=move || view! { <p>"Loading…"</p> }>
            {move || todos.get().map(|res| match res {
                Ok(list) => view! { <ul>{list.into_iter().map(|t| view!{ <li>{t}</li> }).collect_view()}</ul> }.into_any(),
                Err(e) => view! { <p>{e.to_string()}</p> }.into_any(),
            })}
        </Suspense>
    }
}
```

## File Map
| File | Content |
|---|---|
| `00-foreword.md` | Philosophy, full-stack Rust, audience |
| `01-getting-started.md` | cargo-leptos, CSR/SSR, structure |
| `02-view-syntax.md` | `view!`, attributes, events, fragments |
| `03-components.md` | Components, props, children |
| `04-reactivity.md` | Signals, memos, effects, derived state |
| `05-control-flow.md` | Show, For, Match, portals |
| `06-forms-inputs.md` | Controlled inputs, form actions |
| `07-parent-child.md` | Callbacks, context, slots |
| `08-async.md` | Resources, actions, Suspense/Transition |
| `09-routing.md` | `leptos_router`, nested routes, params |
| `10-global-state.md` | Context, stores, shared signals |
| `11-styling.md` | CSS, classes, styling strategies |
| `12-metadata.md` | `<Title>`, meta, hydration templates |
| `13-js-interop.md` | `web_sys`, wasm-bindgen, NodeRef |
| `14-testing.md` | Unit and integration tests |
| `15-ssr.md` | SSR modes, streaming, hydration |
| `16-server-functions.md` | `#[server]`, extractors, errors |
| `17-progressive-enhancement.md` | No-JS forms, actions |
| `18-islands.md` | Islands architecture |
| `19-deployment.md` | Build, assets, hosting |
| `20-appendix-reactive-system.md` | Reactive internals |
| `21-appendix-lifecycle.md` | Component/effect lifecycle |

## Read Order
`00`→`01`→`02`→`03`→`04`; async `08`; server `16`; SSR `15`.

## Prereqs
Rust 1.85+, basic HTML/CSS; cargo-leptos.
