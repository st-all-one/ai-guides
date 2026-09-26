# 17 — Progressive Enhancement e `<ActionForm/>`

Progressive enhancement = começar com HTML funcional e adicionar
camadas de interatividade. Graceful degradation = manter funcionalidade
quando JS/WASM não estão disponíveis.

## Princípios

1. **SSR** — sem SSR, sem conteúdo sem JS/WASM
2. **Elementos HTML nativos** — `<a>`, `<form>`, `<details>` funcionam sem JS
3. **Estado via URL** — formulários GET persistem estado na URL
4. **Modos SSR** — `PartiallyBlocked` ou `InOrder` para HTML mais completo
5. **Formulários** — `<form>` é a base da progressive enhancement

## `<ActionForm/>`

`<ActionForm/>` automaticamente despacha uma Server Action no submit.
Funciona **com e sem JS/WASM**.

```rust
#[server]
pub async fn add_todo(title: String) -> Result<(), ServerFnError> {
    todo!()
}

#[component]
fn AddTodo() -> impl IntoView {
    let add_todo = ServerAction::<AddTodo>::new();
    let has_error = move || {
        add_todo.value()
            .with(|val| matches!(val, Some(Err(_))))
    };

    view! {
        <ActionForm action=add_todo>
            <label>
                "Add a Todo"
                <input type="text" name="title"/>
            </label>
            <input type="submit" value="Add"/>
        </ActionForm>
        {move || has_error().then(|| "Error!")}
    }
}
```

### Como funciona

| Funcionalidade | Com JS/WASM | Sem JS/WASM |
|----------------|-------------|-------------|
| Submit | Fetch assíncrono | POST com reload |
| `.input()`, `.pending()`, `.value()` | Signals reativos | — |
| Redirect (via `leptos_axum::redirect`) | Navegação client-side | Redirect HTTP |

### Client-Side Validation

Use `on:submit:capture` para validar antes do submit:

```rust
let on_submit = move |ev| {
    let data = AddTodo::from_event(&ev);
    if data.is_err() || data.unwrap().title == "nope!" {
        ev.prevent_default(); // impede submissão
    }
};

<ActionForm on:submit:capture=on_submit action=add_todo>
```

Use `on:submit:capture` (não `on:submit`) para executar **antes** do
handler interno do `ActionForm`.

### Inputs Complexos

Use notação de índice `serde_qs` para structs aninhadas:

```rust
#[derive(Serialize, Deserialize)]
struct HeftyData {
    first_name: String,
    last_name: String,
    settings: Settings,
}

view! {
    <ActionForm action=submit>
        <input type="text" name="hefty_arg[first_name]" value="leptos"/>
        <input type="text" name="hefty_arg[last_name]" value="closures"/>
        <input type="text" name="hefty_arg[settings][display_name]" value="alias"/>
        <input type="submit"/>
    </ActionForm>
}
```

## `ServerAction`

```rust
let action = ServerAction::<MyServerFn>::new();
// Convenções:
action.input()    // RwSignal<Option<Input>>
action.pending()  // ReadSignal<bool>
action.value()    // RwSignal<Option<Result<Output, ServerFnError>>>
```
