# 02 — Sintaxe `view!` e Construção de UI

A macro `view!` é o coração da construção de interfaces no Leptos.
Ela usa uma sintaxe semelhante a JSX/HTML.

## Estrutura básica

```rust
use leptos::prelude::*;

#[component]
fn App() -> impl IntoView {
    let (count, set_count) = signal(0);

    view! {
        <button on:click=move |_| *set_count.write() += 1>
            "Click me: " {count}
        </button>
        <p>
            "Double: " {move || count.get() * 2}
        </p>
    }
}
```

## Regras importantes

1. **Text nodes** devem ser strings Rust entre aspas: `"texto"`
2. **Expressões Rust** vão entre chaves `{ }`
3. **Signals** e **closures** são reativos; `signal.get()` não é
4. Event listeners usam `on:{evento}`

## Reatividade no `view!`

```rust
{count}                    // reativo (signal diretamente)
{move || count.get() * 2} // reativo (closure)
{count.get()}              // NÃO reativo (valor único)
```

## Atributos Dinâmicos

### Classes

```rust
// classe toggle
class:red=move || count.get() % 2 == 1

// nome de classe não-parsável
class=("button-20", move || count.get() % 2 == 1)

// múltiplas classes sob mesma condição
class=(["btn", "rounded"], move || cond)
```

### Estilos

```rust
style="position: absolute"
style:left=move || format!("{}px", count.get() + 100)
style:background-color=move || format!("rgb({}, {}, 100)", count.get(), 100)
style:max-width="400px"
style=("--custom-var", move || count.get().to_string())
```

### Atributos HTML

```rust
// estático
max="50"

// reativo (signal)
value=count

// reativo (closure)
value=move || count.get() * 2
```

### Propriedades DOM (`prop:`)

Útil para `value` de inputs e `checked` de checkboxes:

```rust
prop:value=name
prop:checked=is_active
```

### `inner_html` (injeção de HTML raw)

```rust
let html = "<p>HTML injetado.</p>";
view! { <div inner_html=html/> }
```

## Derived Signals

Um closure que acessa um signal pode ser reutilizado:

```rust
let double_count = move || count.get() * 2;

view! {
    <progress max="50" value=double_count/>
    <p>{double_count}</p>
}
```

## Event Listeners

```rust
on:click=move |_| *set_count.write() += 1
on:input:target=move |ev| set_name.set(ev.target().value())
```

O sufixo `:target` dá acesso tipado ao elemento alvo do evento.

## Builder Syntax (alternativa sem macros)

Para quem prefere evitar macros:

```rust
pub fn counter(initial_value: i32, step: i32) -> impl IntoView {
    let (count, set_count) = signal(initial_value);
    div().child((
        button()
            .on(ev::click, move |_| set_count.set(0))
            .child("Clear"),
        button()
            .on(ev::click, move |_| *set_count.write() -= step)
            .child("-1"),
        span().child(("Value: ", move || count.get(), "!")),
        button()
            .on(ev::click, move |_| *set_count.write() += step)
            .child("+1"),
    ))
}
```

### Usando componentes com builder

```rust
Show(
    ShowProps::builder()
        .when(move || value.get() > 5)
        .fallback(|| p().child("fallback"))
        .children(ToChildren::to_children(|| {
            p().child("main content")
        }))
        .build(),
)
```

## Elementos customizados / Web Components

```rust
view! { <my-custom-element some-attr="value"/> }

// ou com builder
custom("my-custom-element")
```

## Expandindo macros

Use `cargo expand` ou o recurso "expand macro recursively" do rust-analyzer
para ver o código gerado pelas macros.
