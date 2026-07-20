# 18 — Arquitetura Islands

A arquitetura Islands inverte o modelo padrão: comece com HTML estático
(sem interatividade) e adicione "ilhas" de interatividade onde necessário.

## Ativando Islands

No `Cargo.toml`:

```toml
leptos = { version = "0.7", features = ["islands"] }
```

No `src/lib.rs`:

```rust
// Substitua
// leptos::mount::hydrate_body(App);
// por
leptos::mount::hydrate_islands();
```

No `app.rs`, no componente shell:

```rust
<HydrationScripts options islands=true/>
```

## Criando Islands

Use `#[island]` em vez de `#[component]`:

```rust
#[island]
fn Counter() -> impl IntoView {
    let (count, set_count) = signal(0);
    view! {
        <button on:click=move |_| *set_count.write() += 1>
            "Click Me: " {count}
        </button>
    }
}
```

### Componentes vs Islands

| `#[component]` | `#[island]` |
|----------------|-------------|
| Roda no servidor + cliente | Roda apenas onde hidratado |
| Compilado para WASM se usado em island | Compilado para WASM |
| Pode usar código server-only (em modo islands) | Props serializáveis (JSON) |

### Redução de tamanho WASM

- App "Hello World" SSR: ~274kb
- App "Hello World" islands: ~24kb (sem interatividade)
- App com um island: ~166kb
- App islands cresce com a **quantidade de interatividade**, não com o
  tamanho total do app

## Islands: Server Children

O poder real: passe conteúdo server-only como children para islands.

```rust
#[component]
fn HomePage() -> impl IntoView {
    let content = std::fs::read_to_string("a.txt").unwrap(); // server-only!
    view! {
        <h1>"Welcome"</h1>
        <Tabs labels=vec!["Tab 1".into()]>
            <div>{content}</div>
        </Tabs>
    }
}

#[island]
fn Tabs(labels: Vec<String>, children: Children) -> impl IntoView {
    view! {
        <div>{labels.into_iter().map(|l| view! { <button>{l}</button> }).collect_view()}</div>
        {children()}
    }
}
```

- O conteúdo de `a.txt` é lido **apenas no servidor**
- O island `Tabs` não precisa saber como o conteúdo foi gerado
- O conteúdo server-side não aumenta o WASM binary

## Context entre Islands

Islands podem se comunicar via contexto:

```rust
#[island]
fn Tabs(labels: Vec<String>, children: Children) -> impl IntoView {
    let (selected, set_selected) = signal(0);
    provide_context(selected);
    // botões que chamam set_selected...
    view! { /* ... */ {children()} }
}

#[island]
fn Tab(index: usize, children: Children) -> impl IntoView {
    let selected = expect_context::<ReadSignal<usize>>();
    view! {
        <div style:display=move || if selected.get() == index { "block" } else { "none" }>
            {children()}
        </div>
    }
}
```

## Boas práticas

- Islands devem ser **pequenas e específicas**
- Separe conteúdo server (`#[component]`) de interatividade (`#[island]`)
- Passe conteúdo server como children para islands
- Use contexto entre islands para estado compartilhado

## Output HTML

Um island é renderizado como:

```html
<leptos-island data-component="Counter_12345" data-props='{"initial":0}'>
    <button>Click Me: 0</button>
</leptos-island>
```

Apenas o código dentro do `<leptos-island>` é compilado para WASM e hidratado.
