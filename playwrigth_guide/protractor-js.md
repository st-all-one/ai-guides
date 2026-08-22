---
id: protractor
title: "Migrando do Protractor"
---

## Princípios de migração

- Não há necessidade de "webdriver-manager" / Selenium.
- O [ElementFinder] do Protractor ⇄ [Locator do Playwright Test](./locators).
- O [`waitForAngular`] do Protractor ⇄ [auto-waiting](./actionability) do Playwright Test.
- Não esqueça de usar `await` no Playwright Test.

## Cheat Sheet

| Protractor                                        | Playwright Test                         |
|---------------------------------------------------|-----------------------------------------|
| `element(by.buttonText('...'))`                   | `page.locator('button, input[type="button"], input[type="submit"] >> text="..."')` |
| `element(by.css('...'))`                          | `page.locator('...')`                   |
| `element(by.cssContainingText('..1..', '..2..'))` | `page.locator('..1.. >> text=..2..')`   |
| `element(by.id('...'))`                           | `page.locator('#...')`                  |
| `element(by.model('...'))`                        | `page.locator('[ng-model="..."]')`      |
| `element(by.repeater('...'))`                     | `page.locator('[ng-repeat="..."]')`     |
| `element(by.xpath('...'))`                        | `page.locator('xpath=...')`             |
| `element.all`                                     | `page.locator`                          |
| `browser.get(url)`                                | `await page.goto(url)`                  |
| `browser.getCurrentUrl()`                         | `page.url()`                            |

## Exemplo

Protractor:

```js
describe('angularjs homepage todo list', function() {
  it('should add a todo', function() {
    browser.get('https://angularjs.org');

    element(by.model('todoList.todoText')).sendKeys('first test');
    element(by.css('[value="add"]')).click();

    const todoList = element.all(by.repeater('todo in todoList.todos'));
    expect(todoList.count()).toEqual(3);
    expect(todoList.get(2).getText()).toEqual('first test');

    // You wrote your first test, cross it off the list
    todoList.get(2).element(by.css('input')).click();
    const completedAmount = element.all(by.css('.done-true'));
    expect(completedAmount.count()).toEqual(2);
  });
});
```

Migração linha a linha para o Playwright Test (TypeScript):

```ts title="todo.spec.ts"
import { test, expect } from '@playwright/test'; // 1

test.describe('angularjs homepage todo list', () => {
  test('should add a todo', async ({ page }) => { // 2, 3
    await page.goto('https://angularjs.org'); // 4

    await page.locator('[ng-model="todoList.todoText"]').fill('first test');
    await page.locator('[value="add"]').click();

    const todoList = page.locator('[ng-repeat="todo in todoList.todos"]'); // 5
    await expect(todoList).toHaveCount(3);
    await expect(todoList.nth(2)).toHaveText('first test', {
      useInnerText: true,
    });

    // You wrote your first test, cross it off the list
    await todoList.nth(2).getByRole('textbox').click();
    const completedAmount = page.locator('.done-true');
    await expect(completedAmount).toHaveCount(2);
  });
});
```

Destaques da migração (veja os comentários inline):

1. Cada arquivo do Playwright Test tem import explícito das funções `test` e `expect`.
2. A função de teste é marcada com `async`.
3. O Playwright Test recebe uma `page` como um de seus parâmetros. Este é um dos muitos [fixtures úteis](./test-fixtures) do Playwright Test.
4. Quase todas as chamadas do Playwright são prefixadas com `await`.
5. A criação de Locator com [`method: Page.locator`] é um dos poucos métodos síncronos.

> Observação: o exemplo original usa `require`. Em TypeScript moderno com `@playwright/test`, prefira `import { test, expect } from '@playwright/test';`.

## Polyfill de `waitForAngular`

O Playwright Test tem [auto-waiting](./actionability) embutido que torna o [`waitForAngular`] do Protractor desnecessário no caso geral.

Porém, pode ser útil em alguns edge cases. Veja como fazer o polyfill da função `waitForAngular` no Playwright Test:

1. Garanta que o protractor está instalado no seu package.json.
2. Função polyfill:

    ```js
    async function waitForAngular(page) {
      const clientSideScripts = require('protractor/built/clientsidescripts.js');

      async function executeScriptAsync(page, script, ...scriptArgs) {
        await page.evaluate(`
          new Promise((resolve, reject) => {
            const callback = (errMessage) => {
              if (errMessage)
                reject(new Error(errMessage));
              else
                resolve();
            };
            (function() {${script}}).apply(null, [...${JSON.stringify(scriptArgs)}, callback]);
          })
        `);
      }

      await executeScriptAsync(page, clientSideScripts.waitForAngular, '');
    }
    ```

    Se você não quiser manter uma versão do protractor por perto, também pode usar esta abordagem mais simples (funciona apenas para Angular 2+):

    ```js
    async function waitForAngular(page) {
      await page.evaluate(async () => {
        // @ts-expect-error
        if (window.getAllAngularTestabilities) {
          // @ts-expect-error
          await Promise.all(window.getAllAngularTestabilities().map(whenStable));
          // @ts-expect-error
          async function whenStable(testability) {
            return new Promise(res => testability.whenStable(res));
          }
        }
      });
    }
    ```
3. Uso do polyfill:

    ```js
    const page = await context.newPage();
    await page.goto('https://example.org');
    await waitForAngular(page);
    ```

## Superpoderes do Playwright Test

Ao migrar para o Playwright Test, você ganha muito:

- Suporte completo a TypeScript sem configuração.
- Rode testes em **todos os motores web** (Chrome, Firefox, Safari) em **qualquer SO popular** (Windows, macOS, Ubuntu).
- Suporte completo a múltiplas origens, [(i)frames](./pages), [tabs e contexts](./pages).
- Rode testes em paralelo em múltiplos navegadores.
- Coleta de [artifacts de teste](./test-use-options.md#recording-options) embutida.

Você também ganha todas essas ✨ ferramentas ✨ que acompanham o Playwright Test:
- [Playwright Inspector](./debug.md)
- [Geração de código do Playwright Test](./codegen-intro.md)
- [Playwright Tracing](./trace-viewer.md) para debug post-mortem.

## Leitura adicional

Saiba mais sobre o runner Playwright Test:

- [Getting Started](./intro)
- [Fixtures](./test-fixtures)
- [Locators](./locators)
- [Assertions](./test-assertions)
- [Auto-waiting](./actionability)

[ElementFinder]: https://www.protractortest.org/#/api?view=ElementFinder
[`waitForAngular`]: https://www.protractortest.org/#/api?view=ProtractorBrowser.prototype.waitForAngular
