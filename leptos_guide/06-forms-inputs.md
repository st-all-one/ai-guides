# 06 — Formulários e Inputs

Leptos suporta dois padrões: **controlado** e **não-controlado**.

## Inputs Controlados

O framework controla o estado do input. A cada evento `input`, atualiza
um signal que atualiza `prop:value`.

```rust
let (name, set_name) = signal("Controlled".to_string());

view! {
    <input type="text"
        on:input:target=move |ev| {
            set_name.set(ev.target().value());
        }
        // Use prop:value, NÃO value (attribute)
        prop:value=name
    />
    <p>"Name is: " {name}</p>
}
```

### Por que `prop:`?

- `value` **attribute**: define valor inicial apenas
- `value` **property**: define valor atual (reage a mudanças)
- Para inputs controlados, sempre use `prop:value`

O mesmo vale para `checked` em checkboxes: use `prop:checked`.

### Simplificando com `bind:`

Leptos oferece `bind:` para reduzir boilerplate:

```rust
let (name, set_name) = signal("".to_string());
let spam_me = RwSignal::new(true);
let favorite_color = RwSignal::new("red".to_string());

view! {
    <input type="text" bind:value=(name, set_name)/>

    // Com RwSignal (simplificado)
    <input type="email" bind:value=email/>

    // Checkbox
    <input type="checkbox" bind:checked=spam_me/>

    // Radio buttons
    <input type="radio" name="color" value="red" bind:group=favorite_color/>
    <input type="radio" name="color" value="green" bind:group=favorite_color/>
    <input type="radio" name="color" value="blue" bind:group=favorite_color/>
}
```

## Inputs Não-Controlados

O navegador controla o estado. Use `NodeRef` para acessar o valor
quando necessário (ex: no submit do form):

```rust
let input_element: NodeRef<html::Input> = NodeRef::new();

let on_submit = move |ev: SubmitEvent| {
    ev.prevent_default();
    let value = input_element
        .get()
        .expect("<input> should be mounted")
        .value();
    set_name.set(value);
};

view! {
    <form on:submit=on_submit>
        <input type="text"
            value=name  // só valor inicial
            node_ref=input_element
        />
        <input type="submit" value="Submit"/>
    </form>
}
```

## `<textarea>`

Não suporta `value` attribute. Use child text + `prop:value`:

```rust
view! {
    <textarea
        prop:value=move || some_value.get()
        on:input:target=move |ev| some_value.set(ev.target().value())
    >
        {some_value}
    </textarea>
}
```

## `<select>`

```rust
let (value, set_value) = signal(0i32);
view! {
    <select
        on:change:target=move |ev| {
            set_value.set(ev.target().value().parse().unwrap());
        }
        prop:value=move || value.get().to_string()
    >
        <option value="0">"0"</option>
        <option value="1">"1"</option>
        <option value="2">"2"</option>
    </select>
}
```

## Eventos: `input` vs `change`

- `input`: dispara em (quase) toda mudança
- `change`: dispara ao perder foco (mais ou menos)
- Para reatividade instantânea, use `on:input`
