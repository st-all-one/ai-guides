# 05 — Controle de Fluxo

Leptos aproveita Rust como linguagem expression-oriented para controle de fluxo.

## Princípios

1. Expressões `if`, `match` retornam valores
2. `Option<T>` e `Result<T, impl Error>` implementam `IntoView`
3. `Fn() -> Option<T>` e `Fn() -> Result<T, _>` são reativos
4. Para ser reativo, o valor deve ser uma **função** (`move ||`)

## `if` no view

```rust
view! {
    <p>
        {move || if is_odd() {
            "Odd"
        } else {
            "Even"
        }}
    </p>
}
```

## `Option<T>`

```rust
let message = move || {
    if is_odd() {
        Some("Ding ding ding!")
    } else {
        None
    }
};

view! { <p>{message}</p> }

// ou com bool::then()
let msg = move || is_odd().then(|| "Ding ding ding!");
```

## `match`

```rust
let message = move || {
    match value.get() {
        0 => "Zero",
        1 => "One",
        n if is_odd() => "Odd",
        _ => "Even"
    }
};
view! { <p>{message}</p> }
```

## `<Show/>` — toggle eficiente

`<Show/>` memoiza a condição: renderiza o conteúdo **uma vez** e só troca
quando a condição muda. Evita rerenderizações desnecessárias.

```rust
<Show
    when=move || { value.get() > 5 }
    fallback=|| view! { <Small/> }
>
    <Big/>
</Show>
```

Use `<Show/>` quando o conteúdo for caro de renderizar.
Para texto simples, `move || if ...` é mais leve.

## Iteração

### Listas estáticas com `Vec<_>`

```rust
let values = vec![0, 1, 2];

view! {
    <ul>
        {values.into_iter()
            .map(|n| view! { <li>{n}</li>})
            .collect::<Vec<_>>()}
    </ul>
}

// Ou com collect_view()
{values.into_iter().map(|n| view! { <li>{n}</li> }).collect_view()}
```

Items reativos em lista estática:

```rust
let counters = (1..=5).map(|idx| RwSignal::new(idx));
let counter_buttons = counters
    .map(|count| view! {
        <li>
            <button on:click=move |_| *count.write() += 1>
                {count}
            </button>
        </li>
    })
    .collect_view();

view! { <ul>{counter_buttons}</ul> }
```

### Listas dinâmicas com `<For/>`

Componente keyed (eficiente para adicionar/remover/reordenar):

```rust
<For
    each=move || counters.get()
    key=|counter| counter.0
    children=move |(id, count)| {
        view! {
            <li>
                <button on:click=move |_| *count.write() += 1>
                    {count}
                </button>
            </li>
        }
    }
/>
```

**Props do `<For/>`:**
- `each`: função que retorna iterável (signal ou derived signal)
- `key`: função `&T -> K` onde K é única e estável (não use índice!)
- `children`: função `T -> impl IntoView`

### `<ForEnumerate/>`

Quando precisa do índice:

```rust
<ForEnumerate
    each=move || counters.get()
    key=|counter| counter.id
    let(idx, counter)
>
    <button>{move || idx.get()} ": " {move || counter.count.get()}</button>
</ForEnumerate>
```

## Iteração com dados complexos

Problema: atualizar o valor de uma linha não re-renderiza porque a `key`
não mudou. Quatro soluções:

### 1. Mudar a key

```rust
key=|state| (state.key.clone(), state.value)
```

Menos eficiente — substitui o nó inteiro.

### 2. Signals aninhados

```rust
struct DatabaseEntry {
    key: String,
    value: RwSignal<i32>,  // reativo
}
```

### 3. Slices memoizados com `<ForEnumerate/>`

```rust
<ForEnumerate
    each=move || data.get()
    key=|state| state.key.clone()
    children=move |index, _| {
        let value = Memo::new(move |_| {
            data.with(|d| d.get(index.get()).map(|d| d.value).unwrap_or(0))
        });
        view! { <p>{value}</p> }
    }
/>
```

### 4. Stores (reactive_stores)

```rust
#[derive(Store, Debug, Clone)]
pub struct Data {
    #[store(key: String = |row| row.key.clone())]
    rows: Vec<DatabaseEntry>,
}
```

## Erros

### `Result<T, E>` no view

```rust
let (value, set_value) = signal(Ok(0));

view! {
    <input type="number" on:input:target=move |ev| {
        set_value.set(ev.target().value().parse::<i32>())
    }/>
    <p>"You entered " <strong>{value}</strong> "</p>
}
```

### `<ErrorBoundary/>`

Captura `Err` renderizado nos children e mostra fallback:

```rust
<ErrorBoundary
    fallback=|errors| view! {
        <div class="error">
            <p>"Not a number! Errors:"</p>
            <ul>
                {move || errors.get()
                    .into_iter()
                    .map(|(_, e)| view! { <li>{e.to_string()}</li>})
                    .collect::<Vec<_>>()
                }
            </ul>
        </div>
    }
>
    <p>"You entered " <strong>{value}</strong></p>
</ErrorBoundary>
```

## Tipos diferentes em branches

Use `.into_any()` para unificar tipos diferentes:

```rust
{move || match is_odd() {
    true if value.get() == 1 => {
        view! { <pre>"One"</pre> }.into_any()
    },
    _ => view! { <textarea>{value.get()}</textarea> }.into_any()
}}
```

Ou use os enums `Either`, `EitherOf3`, `EitherOf4`.
