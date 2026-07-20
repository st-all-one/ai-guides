# 14 — Testes

## 1. Testar lógica de negócio (testes Rust comuns)

Extraia a lógica dos componentes para structs testáveis:

```rust
pub struct Todos(Vec<Todo>);

impl Todos {
    pub fn num_remaining(&self) -> usize {
        self.0.iter().filter(|todo| !todo.completed).sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_num_remaining() {
        let todos = Todos(vec![
            Todo { completed: false, /* ... */ },
            Todo { completed: true, /* ... */ },
        ]);
        assert_eq!(todos.num_remaining(), 1);
    }
}
```

## 2. Testes end-to-end (e2e)

### `wasm-bindgen-test`

```rust
#[wasm_bindgen_test]
async fn clear() {
    let document = document();
    let test_wrapper = document.create_element("section").unwrap();
    let _ = document.body().unwrap().append_child(&test_wrapper);

    let _dispose = mount_to(
        test_wrapper.clone().unchecked_into(),
        || view! { <SimpleCounter initial_value=10 step=1/> },
    );

    let clear = test_wrapper
        .query_selector("button").unwrap().unwrap()
        .unchecked_into::<web_sys::HtmlElement>();
    clear.click();

    tick().await;

    assert_eq!(
        test_wrapper.inner_html(),
        /* compare com um SimpleCounter com initial_value=0 */
    );
}
```

### Playwright

```js
test.describe("Increment Count", () => {
    test("should increase the total count", async ({ page }) => {
        const ui = new CountersPage(page);
        await ui.goto();
        await ui.addCounter();
        await ui.incrementCount();
        await expect(ui.total).toHaveText("1");
    });
});
```

### Gherkin/Cucumber

```
Feature: Add Todo
    Scenario: Should see the todo
        Given I set the todo as Buy Bread
        When I click the Add button
        Then I see the todo named Buy Bread
```

Definições em Rust:

```rust
#[given(regex = "^I add a todo as (.*)$")]
async fn i_add_a_todo_titled(world: &mut AppWorld, text: String) -> Result<()> {
    let client = &world.client;
    action::add_todo(client, text.as_str()).await?;
    Ok(())
}
```

### Dica geral

O mínimo de lógica dentro dos componentes facilita testar. Use
`wasm-pack test` para testes WASM e ferramentas JS como Playwright
para testes e2e completos.
