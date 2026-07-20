# 09 — Roteamento

O Leptos Router é um pacote separado (`leptos_router`) que gerencia
navegação baseada em URL.

## Configuração básica

```rust
use leptos::prelude::*;
use leptos_router::components::*;
use leptos_router::path;

#[component]
pub fn App() -> impl IntoView {
    view! {
        <Router>
            <nav>
                <a href="/">"Home"</a>
                <a href="/users">"Users"</a>
            </nav>
            <main>
                <Routes fallback=|| "Not found.">
                    <Route path=path!("/") view=Home/>
                    <Route path=path!("/users") view=Users/>
                    <Route path=path!("/users/:id") view=UserProfile/>
                    <Route path=path!("/*any") view=|| view! { <h1>"404"</h1> }/>
                </Routes>
            </main>
        </Router>
    }
}
```

### Path syntax

- `/users` — path estático
- `/users/:id` — parâmetro nomeado
- `/user/*any` — wildcard

> `view` recebe `Fn() -> impl IntoView`. Componentes sem props podem
> ser passados diretamente: `view=Home` é açúcar para `view=|| view! { <Home/> }`.

## Roteamento Aninhado

Routes podem ser aninhados para criar **layouts**:

```rust
<Routes fallback=|| "Not found.">
    <Route path=path!("/") view=Home/>
    <ParentRoute path=path!("/contacts") view=ContactList>
        <Route path=path!(":id") view=ContactInfo/>
        <Route path=path!("") view=|| view! {
            <p>"Select a contact."</p>
        }/>
    </ParentRoute>
</Routes>
```

### Como funciona

- `/contacts/alice` → renderiza `ContactList` + `ContactInfo`
- `/contacts` → renderiza `ContactList` + fallback (se houver)

Cada URL pode **combinar múltiplos routes** simultaneamente.

### `<Outlet/>`

O componente pai deve incluir `<Outlet/>` para renderizar o filho aninhado:

```rust
#[component]
fn ContactList() -> impl IntoView {
    view! {
        <div style="display: flex">
            <For each=contacts key=|c| c.id children=|c| todo!()/>
            <Outlet/>
        </div>
    }
}
```

### Performance

Navegar entre `/contacts/alice` e `/contacts/bob` **não rerrenderiza**
`<ContactList/>`, preservando estado (ex: texto em busca).

### Refatorando rotas

```rust
#[component]
pub fn App() -> impl IntoView {
    view! {
        <Router>
            <Routes fallback=|| "Not found.">
                <ParentRoute path=path!("/contacts") view=ContactList>
                    <ContactInfoRoutes/>
                </ParentRoute>
            </Routes>
        </Router>
    }
}

#[component(transparent)]
fn ContactInfoRoutes() -> impl MatchNestedRoutes + Clone {
    view! {
        <ParentRoute path=path!(":id") view=ContactInfo>
            <Route path=path!("") view=EmailAndPhone/>
            <Route path=path!("address") view=Address/>
        </ParentRoute>
    }
    .into_inner()
    .into_any_nested_route()
}
```

## Parâmetros e Queries

### Untyped

```rust
use leptos_router::hooks::{use_params_map, use_query_map};

let params = use_params_map();
let id = move || params.read().get("id").unwrap_or_default();

let query = use_query_map();
let search = move || query.read().get("q").unwrap_or_default();
```

### Typed

```rust
use leptos_router::params::Params;
use leptos_router::hooks::{use_params, use_query};

#[derive(Params, PartialEq)]
struct ContactParams { id: Option<usize> }

#[derive(Params, PartialEq)]
struct ContactSearch { q: Option<String> }

let params = use_params::<ContactParams>();
let id = move || {
    params.read().as_ref().ok()
        .and_then(|p| p.id)
        .unwrap_or_default()
};
```

Retornam `Memo<Result<T, _>>` — reagem a mudanças na URL.

## Navegação

### `<A/>` (link avançado)

```rust
use leptos_router::components::A;

// Resolve rotas relativas corretamente
<A href="alice">"Alice"</A>
// Adiciona aria-current="page" se for a rota ativa
```

`<A/>` resolve `href` relativo ao path do route aninhado.
`<a>` comum também funciona, mas não resolve relativos corretamente.

### Navegação programática

```rust
let navigate = leptos_router::hooks::use_navigate();
navigate("/somewhere", Default::default());
```

Use `NavigateOptions` para `replace`, `state`, `scroll`, etc.

## `<Form/>`

Client-side form navigation:

```rust
<Form method="GET" action="">
    <input type="search" name="q" value=search/>
    <input type="submit"/>
</Form>
```

Com submissão automática via JS inline:

```rust
<input type="search" name="q" value=search
    oninput="this.form.requestSubmit()"
/>
```

Ideal para search: dados fluem URL → resource → UI.
A URL armazena o estado, permitindo compartilhar/bookmark.
