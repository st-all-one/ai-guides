# 13 — Integração com JavaScript

## `wasm-bindgen`

Use para importar funções JS:

```rust
#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}
```

Veja a [documentação do wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/).

## `web-sys`

Bindings para Web APIs do browser:

```toml
[dependencies]
web-sys = { version = "0.3", features = ["DomRect", "Element"] }
```

Para APIs experimentais (ex: WebGPU):

```bash
RUSTFLAGS=--cfg=web_sys_unstable_apis cargo build
```

Ou no `.cargo/config.toml`:

```toml
[env]
RUSTFLAGS = "--cfg=web_sys_unstable_apis"
```

Leptos já ativa diversas features do `web-sys`. Se a API que você
precisa não estiver disponível, adicione a feature manualmente.

## Acessando elementos DOM

### `NodeRef`

```rust
use leptos::html::Input;

let input_ref: NodeRef<Input> = NodeRef::new();

view! { <input node_ref=input_ref/> }

// Acessar o elemento
Effect::new(move |_| {
    if let Some(node) = input_ref.get() {
        logging::log!("value = {}", node.value());
    }
});
```

`NodeRef::get()` retorna `Option<leptos::HtmlElement<T>>`, que implementa
`Deref` para o tipo `web_sys` correspondente.

### Uso em eventos

```rust
let on_submit = move |ev: SubmitEvent| {
    ev.prevent_default();
    let value = input_element
        .get()
        .expect("input to exist")
        .value();
    set_name.set(value);
};
```

## JS/TS libraries

Integre bibliotecas JS via `wasm-bindgen`. Cuidado com bibliotecas que
manipulam o DOM diretamente — tanto a lib quanto o Leptos assumem ser
a fonte da verdade para o estado da UI.
