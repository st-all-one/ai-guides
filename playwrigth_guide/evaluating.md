---
id: evaluating
title: "Evaluating JavaScript no contexto da página (TypeScript)"
---

## Introdução

Os scripts do Playwright rodam no seu ambiente Playwright. Os scripts da sua página rodam no ambiente do navegador. Esses ambientes não se cruzam: estão em máquinas virtuais diferentes, em processos distintos e potencialmente em computadores diferentes.

A API [`method: Page.evaluate`] executa uma função JavaScript no contexto da página e traz os resultados de volta ao ambiente do Playwright. Globals do navegador como `window` e `document` podem ser usados dentro de `evaluate`.

```ts
const href = await page.evaluate(() => document.location.href);
```

Se o resultado for uma Promise ou a função for assíncrona, `evaluate` aguarda automaticamente até que seja resolvida:

```ts
const status = await page.evaluate(async () => {
  const response = await fetch(location.href);
  return response.status;
});
```

## Ambientes diferentes

Os scripts avaliados rodam no ambiente do navegador, enquanto o teste roda no ambiente de teste. Isso significa que você **não** pode usar variáveis do seu teste dentro da página e vice-versa. Passe-as explicitamente como argumento.

O snippet abaixo está **ERRADO** porque usa a variável diretamente:

```ts
const data = 'some data';
const result = await page.evaluate(() => {
  // ERRADO: não existe "data" na página web.
  window.myApp.use(data);
});
```

O snippet abaixo está **CORRETO** porque passa o valor explicitamente como argumento:

```ts
const data = 'some data';
// Passa |data| como parâmetro.
const result = await page.evaluate(data => {
  window.myApp.use(data);
}, data);
```

## Argumento de avaliação

Métodos de avaliação como [`method: Page.evaluate`] aceitam um único argumento opcional. Esse argumento pode ser uma mistura de valores [Serializable] e instâncias [JSHandle]. Handles são convertidos automaticamente no valor que representam.

```ts
// Um valor primitivo.
await page.evaluate(num => num, 42);

// Um array.
await page.evaluate(array => array.length, [1, 2, 3]);

// Um objeto.
await page.evaluate(object => object.foo, { foo: 'bar' });

// Um único handle.
const button = await page.evaluateHandle('window.button');
await page.evaluate(button => button.textContent, button);

// Notação alternativa usando JSHandle.evaluate.
await button.evaluate((button, from) => button.textContent.substring(from), 5);

// Objeto com múltiplos handles.
const button1 = await page.evaluateHandle('window.button1');
const button2 = await page.evaluateHandle('window.button2');
await page.evaluate(
    o => o.button1.textContent + o.button2.textContent,
    { button1, button2 });

// Destructuring de objeto funciona. Os nomes das propriedades precisam
// coincidir entre o objeto destruturado e o argumento. Note os parênteses.
await page.evaluate(
    ({ button1, button2 }) => button1.textContent + button2.textContent,
    { button1, button2 });

// Array também funciona. Nomes arbitrários podem ser usados no destructuring.
// Note os parênteses obrigatórios.
await page.evaluate(
    ([b1, b2]) => b1.textContent + b2.textContent,
    [button1, button2]);

// Qualquer combinação de serializáveis e handles funciona.
await page.evaluate(
    x => x.button1.textContent + x.list[0].textContent + String(x.foo),
    { button1, list: [button2], foo: null });
```

## Init scripts

Às vezes é conveniente avaliar algo na página antes de ela começar a carregar — por exemplo, para configurar mocks ou dados de teste. Nesse caso, use [`method: Page.addInitScript`] ou [`method: BrowserContext.addInitScript`].

No exemplo abaixo, substituímos `Math.random()` por um valor constante. Primeiro, crie um arquivo `preload.js` com o mock:

```js
// preload.js
Math.random = () => 42;
```

Em seguida, adicione o init script à página:

```ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.beforeEach(async ({ page }) => {
  // Adiciona o script para cada teste no hook beforeEach.
  // Resolva corretamente o caminho do script.
  await page.addInitScript({ path: path.resolve(__dirname, '../mocks/preload.js') });
});
```

Alternativamente, passe uma função em vez de criar o arquivo `preload.js`. Isso é mais conveniente para scripts curtos ou únicos. Você também pode passar um argumento dessa forma:

```ts
import { test, expect } from '@playwright/test';

// Adiciona o script para cada teste no hook beforeEach.
test.beforeEach(async ({ page }) => {
  const value = 42;
  await page.addInitScript(value => {
    Math.random = () => value;
  }, value);
});
```

## Exemplo completo

```ts title="tests/evaluating.spec.ts"
import { test, expect } from '@playwright/test';

test('lê estado da página e injeta dados via init script', async ({ page }) => {
  // Init script: garante Math.random() determinístico em toda a página.
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });

  await page.goto('https://example.com');

  // Avalia no contexto do navegador e traz o resultado de volta.
  const title = await page.evaluate(() => document.title);
  expect(typeof title).toBe('string');

  // Passa argumentos explicitamente (nunca use variáveis do teste direto).
  const result = await page.evaluate((n: number) => n * 2, 21);
  expect(result).toBe(42);
});
```

## Armadilhas comuns

- **Usar variáveis do teste dentro de `evaluate`:** o closure não enxerga o escopo do teste. Passe tudo como argumento.
- **Retornar valores não serializáveis:** `evaluate` só traz de volta valores serializáveis (JSON) ou `JSHandle`. Funções, `Map`/`Set` complexos ou nós do DOM precisam de `evaluateHandle`.
- **`document` indisponível antes do carregamento:** use `addInitScript` se precisar injetar antes do `goto`.
- **Caminho de init script:** `path` é resolvido relativo ao diretório de trabalho; use `path.resolve(__dirname, ...)` para robustez.

## Boas práticas

- Mantenha a lógica dentro de `evaluate` mínima e pura; faça asserções no lado do Playwright.
- Use `evaluateHandle` quando precisar referenciar elementos/nós da página fora do `evaluate`.
- Centralize mocks de inicialização em `addInitScript` no `beforeEach` ou em fixtures ([Test Fixtures](./test-fixtures-js.md)).
- Prefira Locators e `expect` nativos quando possível; use `evaluate` apenas para acessar estado interno não exposto pela UI.
