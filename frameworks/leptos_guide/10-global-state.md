# 10 — Estado Global e Stores

Na maioria dos casos, **você não precisa de estado global**. Componha sua
aplicação com estado local em cada componente. Mas para theming, preferências,
etc., há três abordagens.

## 1. URL como Estado Global

A URL é o melhor lugar para estado global: acessível de qualquer componente,
persiste entre reloads, é compartilhável.

```rust
let query = use_query_map();
let theme = move || query.read().get("theme").unwrap_or_default();
```

## 2. Context API

Forneça signals via `provide_context` no topo da árvore:

```rust
#[component]
fn App() -> impl IntoView {
    let (count, set_count) = signal(0);
    provide_context(count);

    view! {
        <SetterButton set_count/>
        <FancyMath/>   // consome count via use_context
        <ListItems/>   // consome count via use_context
    }
}

#[component]
fn FancyMath() -> impl IntoView {
    let count = use_context::<ReadSignal<u32>>()
        .expect("count signal not provided");
    view! {
        <p>"Count is " {move || if count.get() & 1 == 0 { "even" } else { "odd" }}</p>
    }
}
```

Apenas onde o signal é lido ocorre update reativo — componentes
intermediários não são notificados.

## 3. Stores (`reactive_stores`)

Stores oferecem acesso reativo de grão fino a campos individuais de structs.

Adicione `reactive_stores` ao `Cargo.toml`.

```rust
use reactive_stores::Store;

#[derive(Clone, Debug, Default, Store)]
struct GlobalState {
    count: i32,
    name: String,
}

#[component]
fn App() -> impl IntoView {
    provide_context(Store::new(GlobalState::default()));
    // ...
}

#[component]
fn GlobalStateCounter() -> impl IntoView {
    let state = expect_context::<Store<GlobalState>>();
    let count = state.count(); // acesso reativo SÓ ao campo count

    view! {
        <button on:click=move |_| { *count.write() += 1; }>
            "Increment"
        </button>
        <span>"Count: " {move || count.get()}</span>
    }
}
```

### Vantagens das Stores

- Acesso reativo a campos individuais sem signals aninhados
- Mutar `count` não notifica quem lê `name`
- Derive macro reduz boilerplate
- Integra com `<For/>` via `#[store(key)]`

### Uso com `<For/>` e dados complexos

```rust
#[derive(Store, Debug, Clone)]
pub struct Data {
    #[store(key: String = |row| row.key.clone())]
    rows: Vec<DatabaseEntry>,
}

#[derive(Store, Debug, Clone)]
struct DatabaseEntry {
    key: String,
    value: i32,
}

let data = Store::new(Data { rows: vec![/* ... */] });

view! {
    <For
        each=move || data.rows()
        key=|row| row.read().key.clone()
        children=|child| {
            let value = child.value();
            view! { <p>{move || value.get()}</p> }
        }
    />
}
```

### Atualização em lote

```rust
use reactive_stores::StoreFieldIterator;

for row in data.rows().iter_unkeyed() {
    *row.value().write() *= 2;
}
```
