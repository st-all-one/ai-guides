---
id: puppeteer
title: "Migrando do Puppeteer"
---

## Princípios de migração

Este guia descreve a migração para a [Playwright Library](./library) e o [Playwright Test](./intro.md) a partir do Puppeteer. As APIs têm similaridades, mas o Playwright oferece muito mais possibilidades para testes web e automação cross-browser.

- A maioria das APIs do Puppeteer pode ser usada como está.
- O uso de [ElementHandle] é desencorajado; use objetos [Locator] e web-first assertions.
- O Playwright é cross-browser.
- Você provavelmente não precisa de waits explícitos.

## Cheat Sheet

| Puppeteer                                          | Playwright Library                          |
|----------------------------------------------------|---------------------------------------------|
| `await puppeteer.launch()`                         | `await playwright.chromium.launch()`        |
| `puppeteer.launch({product: 'firefox'})`           | `await playwright.firefox.launch()`         |
|  WebKit não é suportado pelo Puppeteer              | `await playwright.webkit.launch()`          |
| `await browser.createIncognitoBrowserContext(...)` | `await browser.newContext(...)`             |
| `await page.setViewport(...)`                      | `await page.setViewportSize(...)`           |
| `await page.waitForXPath(XPathSelector)`           | `await page.waitForSelector(XPathSelector)` |
| `await page.waitForNetworkIdle(...)`               | `await page.waitForLoadState('networkidle')` |
| `await page.$eval(...)`                            | [Assertions](./test-assertions) costumam substituir a verificação de texto, atributo, classe... |
| `await page.$(...)`                                | Desencorajado, use [Locators](./locators) |
| `await page.$x(xpath_selector)`                    | Desencorajado, use [Locators](./locators) |
| Sem métodos dedicados a checkbox/radio              | `await page.locator(selector).check()`<br/>`await page.locator(selector).uncheck()` |
| `await page.click(selector)`                       | `await page.locator(selector).click()`      |
| `await page.focus(selector)`                       | `await page.locator(selector).focus()`      |
| `await page.hover(selector)`                       | `await page.locator(selector).hover()`      |
| `await page.select(selector, values)`              | `await page.locator(selector).selectOption(values)` |
| `await page.tap(selector)`                         | `await page.locator(selector).tap()`        |
| `await page.type(selector, ...)`                   | `await page.locator(selector).fill(...)`    |
| `await page.waitForFileChooser(...)`<br/>`await elementHandle.uploadFile(...)` | `await page.locator(selector).setInputFiles(...)` |
| `await page.cookies([...urls])`                    | `await browserContext.cookies([urls])`      |
| `await page.deleteCookie(...cookies)`              | `await browserContext.clearCookies()`       |
| `await page.setCookie(...cookies)`                 | `await browserContext.addCookies(cookies)`  |
| `page.on(...)`                                     | `page.on(...)`<br/>Para interceptar e mutar requests, veja [`method: Page.route`] |

`page.waitForNavigation` e `page.waitForSelector` continuam existindo, mas em muitos casos não serão necessários graças ao [auto-waiting](./actionability).

O uso de [ElementHandle] é desencorajado; use objetos [Locator] e web-first assertions.

Locators são a peça central do auto-waiting e da retry-ability do Playwright. Locators são estritos (strict). Isso significa que todas as operações em locators que implicam algum elemento DOM alvo lançarão uma exceção se mais de um elemento corresponder a um dado seletor.

## Exemplos

### Exemplo de automação

Puppeteer:

```js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://playwright.dev/', {
    waitUntil: 'networkidle2',
  });
  await page.screenshot({ path: 'example.png' });
  await browser.close();
})();
```

Migração linha a linha para o Playwright (TypeScript):

```ts
import { chromium } from 'playwright'; // 1

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage(); // 2
  await page.setViewportSize({ width: 1280, height: 800 }); // 3
  await page.goto('https://playwright.dev/', {
    waitUntil: 'networkidle', // 4
  });
  await page.screenshot({ path: 'example.png' });
  await browser.close();
})();
```

Destaques da migração:

1. Cada arquivo da Playwright Library tem import explícito de `chromium`. Outros navegadores `webkit` ou `firefox` podem ser usados.
2. Para isolamento de estado do navegador, considere [browser contexts](./browser-contexts.md).
3. `setViewport` vira `setViewportSize`.
4. `networkidle2` vira `networkidle`. Note que na maioria dos casos não é útil, graças ao auto-waiting.

### Exemplo de teste

Puppeteer com Jest:

```js
import puppeteer from 'puppeteer';

describe('Playwright homepage', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  it('contains hero title', async () => {
    await page.goto('https://playwright.dev/');
    await page.waitForSelector('.hero__title');
    const text = await page.$eval('.hero__title', e => e.textContent);
    expect(text).toContain('Playwright enables reliable end-to-end testing'); // 5
  });

  afterAll(() => browser.close());
});
```

Migração linha a linha para o Playwright Test (TypeScript):

```ts title="home.spec.ts"
import { test, expect } from '@playwright/test'; // 1

test.describe('Playwright homepage', () => {
  test('contains hero title', async ({ page }) => { // 2, 3
    await page.goto('https://playwright.dev/');
    const titleLocator = page.locator('.hero__title'); // 4
    await expect(titleLocator).toContainText( // 5
        'Playwright enables reliable end-to-end testing'
    );
  });
});
```

1. Cada arquivo do Playwright Test tem import explícito das funções `test` e `expect`.
2. A função de teste é marcada com `async`.
3. O Playwright Test recebe uma `page` como um de seus parâmetros. O Playwright Test cria um objeto [Page] isolado para cada teste. Porém, se você quiser reusar um único objeto [Page] entre múltiplos testes, crie o seu próprio em [`method: Test.beforeAll`] e feche em [`method: Test.afterAll`].
4. A criação de Locator com [`method: Page.locator`] é um dos poucos métodos síncronos.
5. Use [assertions](./test-assertions) para verificar o estado em vez de `page.$eval()`.

## Testando

Para melhorar os testes, recomenda-se usar [Locators](./locators) e web-first [Assertions](./test-assertions). Veja [Writing Tests](./writing-tests).

É comum com Puppeteer usar `page.evaluate()` ou `page.$eval()` para inspecionar um [ElementHandle] e extrair o valor de texto, atributo, classe... As web-first [Assertions](./test-assertions) oferecem vários matchers para esse propósito, sendo mais confiável e legível.

O [Playwright Test](./intro.md) é o runner de testes first-party recomendado para uso com o Playwright. Ele oferece recursos como Page Object Model, paralelismo, fixtures e reporters.

## Superpoderes do Playwright Test

Ao migrar para o Playwright Test, você ganha muito:

- Suporte completo a TypeScript sem configuração.
- Rode testes em **todos os motores web** (Chrome, Firefox, Safari) em **qualquer SO popular** (Windows, macOS, Ubuntu).
- Suporte completo a múltiplas origens, [(i)frames](./pages), [tabs e contexts](./pages).
- Rode testes em isolamento em paralelo em múltiplos navegadores.
- Coleta de [artifacts de teste](./test-use-options.md#recording-options) embutida.

Você também ganha todas essas ✨ ferramentas ✨ que acompanham o Playwright Test:
- [Playwright Inspector](./debug.md)
- [Geração de código do Playwright Test](./codegen-intro.md)
- [Playwright Tracing](./trace-viewer.md) para debug post-mortem.

## Leitura adicional

Saiba mais sobre o runner Playwright Test:

- [Getting Started](./intro)
- [Fixtures](./test-fixtures)
- [Locators](./locators.md)
- [Assertions](./test-assertions)
- [Auto-waiting](./actionability)
