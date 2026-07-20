# 07 — Comunicação Pai-Filho e Context API

Há quatro padrões para comunicação pai-filho no Leptos.

## 1. Passar um `WriteSignal`

O pai passa um setter para o filho modificar:

```rust
#[component]
pub fn App() -> impl IntoView {
    let (toggled, set_toggled) = signal(false);
    view! {
        <p>"Toggled? " {toggled}</p>
        <ButtonA setter=set_toggled/>
    }
}

#[component]
pub fn ButtonA(setter: WriteSignal<bool>) -> impl IntoView {
    view! {
        <button on:click=move |_| setter.update(|v| *v = !*v)>
            "Toggle"
        </button>
    }
}
```

⚠️ Cuidado: pode levar a "spaghetti code" se usado em excesso.

## 2. Usar um Callback

O filho recebe uma closure (callback) que o pai define:

```rust
#[component]
pub fn ButtonB(on_click: impl FnMut(MouseEvent) + 'static) -> impl IntoView {
    view! { <button on:click=on_click>"Toggle"</button> }
}
```

A lógica de mutação fica no pai, não no filho.

## 3. Usar Event Listener (`on:`)

O pai adiciona `on:click` diretamente no componente no view:

```rust
<ButtonC on:click=move |_| set_toggled.update(|v| *v = !*v)/>
```

O filho só precisa renderizar o `<button>` — o listener é aplicado a
todos os elementos de topo do componente.

Ideal quando o callback mapeia diretamente para um evento DOM nativo.

## 4. Context API

Para comunicação que atravessa múltiplos níveis sem "prop drilling":

```rust
// Pai fornece
#[component]
pub fn App() -> impl IntoView {
    let (toggled, set_toggled) = signal(false);
    provide_context(set_toggled);
    view! {
        <p>"Toggled? " {toggled}</p>
        <Layout/>  {/* não precisa de props intermediárias */}
    }
}

// Filho consome
#[component]
pub fn ButtonD() -> impl IntoView {
    let setter = use_context::<WriteSignal<bool>>()
        .expect("setter not provided");
    view! {
        <button on:click=move |_| setter.update(|v| *v = !*v)>
            "Toggle"
        </button>
    }
}
```

### Boas práticas com Context

- Use o **newtype pattern** para evitar conflitos de tipo:

```rust
#[derive(Copy, Clone)]
struct MyContext(WriteSignal<bool>);

// prover
provide_context(MyContext(setter));

// consumir
let MyContext(setter) = use_context::<MyContext>().unwrap();
```

- Context é identificado por **tipo**: só pode haver um valor de cada tipo
- Não há overhead de performance: componentes intermediários não são notificados

## Children (Passando conteúdo filho)

### `children: Children`

```rust
#[component]
pub fn TakesChildren(
    children: Children,
) -> impl IntoView {
    view! {
        <h1>"Wrapper"</h1>
        {children()}
    }
}
```

Uso:

```rust
<TakesChildren>
    "Some text"
    <span>"A span"</span>
</TakesChildren>
```

### Tipos de children

| Tipo | Descrição |
|------|-----------|
| `Children` | `Box<dyn FnOnce() -> AnyView>` |
| `ChildrenFn` | `Box<dyn Fn() -> AnyView>` (chamável múltiplas vezes) |
| `ChildrenMut` | `Box<dyn FnMut() -> AnyView>` |
| `ChildrenFragment` | Retorna `Fragment` (acessível como `Vec<View>`) |

### Manipulando children (ex: wrap em `<li>`)

```rust
#[component]
pub fn WrapsChildren(children: ChildrenFragment) -> impl IntoView {
    let children = children()
        .nodes
        .into_iter()
        .map(|child| view! { <li>{child}</li> })
        .collect::<Vec<_>>();
    view! { <ul>{children}</ul> }
}
```

### Render Props

Props que são funções retornando view:

```rust
#[component]
pub fn TakesChildren<F, IV>(
    render_prop: F,
    children: Children,
) -> impl IntoView
where
    F: Fn() -> IV,
    IV: IntoView,
{
    view! {
        <h2>"Render Prop"</h2>
        {render_prop()}
        <hr/>
        <h2>"Children"</h2>
        {children()}
    }
}
```

## Slots (Children tipados)

Para componentes com múltiplos tipos de children:

```rust
#[slot]
struct Then { children: ChildrenFn }

#[slot]
struct Else { children: ChildrenFn }

#[component]
fn If(
    condition: Signal<bool>,
    then_slot: Then,
    else_slot: Else,
) -> impl IntoView {
    move || {
        if condition.get() {
            (then_slot.children)().into_any()
        } else {
            (else_slot.children)().into_any()
        }
    }
}
```

Uso:

```rust
<If condition=a_is_true>
    <Then slot:then_slot>"Show this"</Then>
    <Else slot:else_slot>"Otherwise this"</Else>
</If>
```

## Projetando Children (NestedShow)

Para passar children através de múltiplas camadas de componentes,
use `StoredValue`:

```rust
pub fn NestedShow<F, IV>(fallback: F, children: ChildrenFn) -> impl IntoView
where
    F: Fn() -> IV + Send + Sync + 'static,
    IV: IntoView + 'static,
{
    let fallback = StoredValue::new(fallback);
    let children = StoredValue::new(children);

    view! {
        <Show when=|| todo!() fallback=|| ()>
            <Show
                when=move || todo!()
                fallback=move || fallback.read_value()()
            >
                {children.read_value()()}
            </Show>
        </Show>
    }
}
```

### `clone:` syntax

Para clonar valores antes de mover para children:

```rust
view! {
    <Outer>
        <Inner clone:name>
            <Inmost name=name.clone()/>
        </Inner>
    </Outer>
}
```
