# 11 — Estilização

Leptos não tem opinião sobre CSS. Você pode usar qualquer abordagem.

## CSS Simples

### Trunk (CSR)

Adicione no `index.html`:

```html
<link data-trunk rel="css" href="./style.css"/>
```

### cargo-leptos (SSR)

Use o arquivo `style.scss` existente, ou coloque CSS em `public/foo.css`
e importe com:

```rust
use leptos_meta::Stylesheet;

view! {
    <Stylesheet href="/foo.css"/>
}
```

## TailwindCSS

```rust
#[component]
fn Home() -> impl IntoView {
    view! {
        <main class="my-0 mx-auto max-w-3xl text-center">
            <h2 class="p-6 text-4xl">"Leptos + Tailwind"</h2>
            <button
                class="bg-sky-600 hover:bg-sky-700 px-5 py-3 text-white rounded-lg"
                on:click=move |_| *set_count.write() += 1
            >
                {move || count.get().to_string()}
            </button>
        </main>
    }
}
```

Exemplos oficiais: [tailwind_csr](https://github.com/leptos-rs/leptos/tree/main/examples/tailwind_csr),
[tailwind_actix](https://github.com/leptos-rs/leptos/tree/main/examples/tailwind_actix).

## Stylers (compile-time scoped CSS)

```rust
use stylers::style;

#[component]
pub fn App() -> impl IntoView {
    let styler_class = style! { "App",
        ##two{ color: blue; }
        div.one{ color: red; }
    };

    view! { class = styler_class,
        <div class="one">
            <h1 id="two">"Hello"</h1>
        </div>
    }
}
```

## Stylance (scoped CSS em arquivos .css)

```rust
import_style!(style, "app.module.scss");

view! {
    <div class=style::jumbotron/>
}
```

## Styled (runtime scoped CSS)

```rust
use styled::style;

let styles = style!(
    div { background-color: red; color: white; }
);

styled::view! { styles,
    <div>"Red with white text"</div>
}
```
