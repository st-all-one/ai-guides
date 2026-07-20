# 08 — Async: Resources, Suspense, Transition, Actions

## `spawn_local`

A forma mais simples de executar async:

```rust
spawn_local(async {
    let data = fetch_data().await;
    // atualizar signal com o resultado
});
```

## Resources

Resources são wrappers reativos para `Future`s.

### `LocalResource`

Para CSR ou dados `!Send`:

```rust
let (count, set_count) = signal(0);
let async_data = LocalResource::new(move || load_data(count.get()));
```

Se `count` mudar, o fetcher roda novamente.

### `Resource` (para SSR)

Para SSR serializável — dois argumentos: source + fetcher:

```rust
let async_data = Resource::new(
    move || count.get(),
    |count| load_data(count)
);
```

Signals no **source** são trackeados; signals no **fetcher** não são (importante
para hidratação correta).

### `OnceResource`

Para dados carregados uma vez:

```rust
let once = OnceResource::new(load_data(42));
```

### Acessando resources

Implementam `.read()`, `.with()`, `.get()` retornando `Option<T>`:

```rust
let async_result = move || {
    async_data.get()
        .map(|value| format!("Result: {value:?}"))
        .unwrap_or_else(|| "Loading...".into())
};
```

## `<Suspense/>`

Aguarda **todos** os resources nos children carregarem antes de mostrar
o conteúdo. Enquanto isso, exibe `fallback`:

```rust
<Suspense
    fallback=move || view! { <p>"Loading..."</p> }
>
    <h2>"My Data"</h2>
    {move || Suspend::new(async move {
        let a = resource_a.await;
        let b = resource_b.await;
        view! {
            <ShowA a/>
            <ShowB b/>
        }
    })}
</Suspense>
```

### `Suspend`

Permite usar `async` blocks diretamente no view, dentro de `<Suspense/>`:

```rust
{move || Suspend::new(async move {
    let data = resource.await;
    view! { <Display data/> }
})}
```

### `<Await/>`

Combina `OnceResource` + `Suspense` sem fallback:

```rust
<Await
    future=fetch_monkeys(3)
    let:data
>
    <p>{*data} " little monkeys."</p>
</Await>
```

## `<Transition/>`

Como `<Suspense/>`, mas nas recargas seguintes **mantém o conteúdo antigo**
enquanto o novo carrega (sem flickering):

```rust
<Transition
    fallback=move || view! { <p>"Loading initial data..."</p> }
    set_pending  // opcional: signal bool para status
>
    <p>{move || user_data.read().as_deref().map(ToString::to_string)}</p>
</Transition>
```

## Actions

Para mutações async ocasionais (ex: submit de formulário):

```rust
let add_todo = Action::new(|input: &String| {
    let input = input.to_owned();
    async move { add_todo_request(&input).await }
});

// Disparar
add_todo.dispatch("Buy milk".to_string());
```

### Signals fornecidos por Action

```rust
let submitted = add_todo.input();   // RwSignal<Option<String>>
let pending = add_todo.pending();    // ReadSignal<bool>
let result = add_todo.value();      // RwSignal<Option<Uuid>>
```

### Input type

Sempre uma única referência:

```rust
// Sem argumentos
Action::new(|input: &()| async { todo!() });

// Múltiplos argumentos (tupla)
Action::new(|input: &(usize, String)| async { todo!() });
```

Actions são a base para `<ActionForm/>` (veja capítulo 17).
