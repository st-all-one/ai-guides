# 03 — Componentes e Props

Componentes são o bloco de construção fundamental da UI no Leptos.
São funções Rust anotadas com `#[component]` que retornam `impl IntoView`.

## Definição básica

```rust
#[component]
fn ProgressBar(
    progress: ReadSignal<i32>
) -> impl IntoView {
    view! {
        <progress max="50" value=progress/>
    }
}
```

Uso:

```rust
<ProgressBar progress=count/>
```

## Características de componentes

1. A função **roda uma vez** (setup function, não render function)
2. Props são argumentos da função
3. O macro `#[component]` gera um struct Props automaticamente
4. Componentes sempre usam `PascalCase`

## Props reativas vs estáticas

Props **não têm significado reativo especial**. Para que a UI responda a
mudanças, passe signals ou closures:

```rust
// ✅ Reativo
<ProgressBar progress=count/>

// ❌ Não reativo — passa o valor uma vez
// (depende do tipo esperado pela prop)
```

## Modificadores de Props

### `#[prop(optional)]`

Prop opcional — usa `Default::default()` se omitida:

```rust
#[component]
fn ProgressBar(
    #[prop(optional)]
    max: u16,
    progress: ReadSignal<i32>,
) -> impl IntoView { }
```

### `#[prop(default = ...)]`

Valor padrão customizado:

```rust
#[component]
fn ProgressBar(
    #[prop(default = 100)]
    max: u16,
    progress: ReadSignal<i32>,
) -> impl IntoView { }
```

### `#[prop(into)]`

Aplica `.into()` automaticamente no valor passado:

```rust
#[component]
fn ProgressBar(
    #[prop(into)]
    progress: Signal<i32>,
) -> impl IntoView { }
```

Agora aceita `ReadSignal`, `RwSignal`, `Signal::derive(...)`, etc.

### `#[prop(marker)]`

Para tipos marcadores como `PhantomData<T>` — omite da documentação e do builder:

```rust
#[component]
fn SizeOf<T: Sized>(
    #[prop(marker)] _ty: PhantomData<T>,
) -> impl IntoView {
    std::mem::size_of::<T>()
}
```

## Props Genéricas

```rust
#[component]
fn ProgressBar<F>(
    #[prop(default = 100)]
    max: u16,
    progress: F,
) -> impl IntoView
where
    F: Fn() -> i32 + Send + Sync + 'static,
{ }
```

No template, use `<ProgressBar<closure_type> ...>` ou deixe a inferência agir.

## Props opcionais com tipos genéricos (Box)

```rust
#[component]
fn ProgressBar(
    #[prop(optional)]
    progress: Option<Box<dyn Fn() -> i32 + Send + Sync>>,
) -> impl IntoView { }
```

## Documentação

Use doc comments na função e nos props:

```rust
/// Mostra progresso em direção a um objetivo.
#[component]
fn ProgressBar(
    /// Valor máximo da barra.
    #[prop(default = 100)]
    max: u16,
    /// Quanto progresso exibir.
    #[prop(into)]
    progress: Signal<i32>,
) -> impl IntoView {
    /* ... */
}
```

## Atributos spreading em componentes

Atributos adicionados a um componente são aplicados a **todos** os elementos
HTML de topo retornados pela view do componente:

```rust
let spread = view! { <{..} aria-label="componente"/> };

view! {
    <ComponentThatTakesSpread
        some_prop="foo"
        class:foo=true
        style:font-weight="bold"
        on:click=move |_| alert("clicked!")
        attr:id="foo"
        {..}
        title="ooh, a title!"
        {..spread}
    />
}
```

Para aplicar atributos seletivamente, use `AttributeInterceptor`.
