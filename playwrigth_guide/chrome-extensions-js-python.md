---
id: chrome-extensions
title: "Extensões do Chrome"
---

## Introdução

:::note
Extensões funcionam apenas no Chromium quando iniciadas com um contexto persistente. Use argumentos customizados do navegador por sua conta e risco, pois alguns deles podem quebrar funcionalidades do Playwright.

O Google Chrome e o Microsoft Edge [removeram as flags de linha de comando necessárias para carregar extensões via side-load](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/FxMU1TvxWWg/m/daZVTYNlBQAJ), então use o Chromium que acompanha o Playwright.
:::

O snippet abaixo recupera o [service worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers) de uma extensão [Manifest v3](https://developer.chrome.com/docs/extensions/develop/migrate) cuja origem está em `./my-extension`.

Note o uso do channel `chromium` que permite rodar extensões em modo headless. Alternativamente, você pode iniciar o navegador em modo headed.

```ts title="load-extension.ts"
import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const pathToExtension = path.join(__dirname, 'my-extension');
  const userDataDir = '/tmp/test-user-data-dir';
  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`
    ],
  });
  let [serviceWorker] = browserContext.serviceWorkers();
  if (!serviceWorker)
    serviceWorker = await browserContext.waitForEvent('serviceworker');

  // Teste o service worker como testaria qualquer outro worker.
  await browserContext.close();
})();
```

## Suspensão ociosa do service worker (MV3)

Service workers do Chrome MV3 são automaticamente suspensos após ~30 segundos de inatividade e reiniciados sob demanda. Quando isso acontece, o Playwright mantém o **mesmo objeto [Worker]** vivo — nenhum novo evento `'serviceworker'` é emitido. Novas chamadas `evaluate()` feitas durante a janela de reinício são pausadas até que o novo contexto esteja pronto e então retomadas automaticamente:

```ts
const sw = await context.waitForEvent('serviceworker');

// ... o SW suspende após 30s de inatividade e é reiniciado pelo navegador ...

// O handle existente é transparente através do reinício.
await sw.evaluate(() => sendMessage({ type: 'ping' })); // simplesmente funciona
```

:::note
Chamadas `evaluate()` que estavam em andamento exatamente no momento da suspensão lançarão `"Service worker restarted"`, comportamento equivalente a navegações de página em andamento.
:::

## Testando

Para ter a extensão carregada ao rodar testes você pode usar um fixture de teste para configurar o contexto. Você também pode recuperar dinamicamente o extension id e usá-lo para carregar e testar, por exemplo, a página popup.

Note o uso do channel `chromium` que permite rodar extensões em modo headless. Alternativamente, você pode iniciar o navegador em modo headed.

Primeiro, adicione fixtures que carregarão a extensão:

```ts title="fixtures.ts"
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({ }, use) => {
    const pathToExtension = path.join(__dirname, 'my-extension');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // para manifest v3:
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent('serviceworker');

    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
});
export const expect = test.expect;
```

Depois use esses fixtures em um teste:

```ts title="tests/extension.spec.ts"
import { test, expect } from './fixtures';

test('example test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('body')).toHaveText('Changed by my-extension');
});

test('popup page', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.locator('body')).toHaveText('my-extension popup');
});
```

## Exemplo completo

Um arquivo de teste autônomo que carrega a extensão, recupera o id e valida o conteúdo da popup:

```ts title="tests/extension-full.spec.ts"
import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
import path from 'path';

test('extensão altera a página e a popup funciona', async () => {
  const pathToExtension = path.join(__dirname, '../my-extension');
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker)
    serviceWorker = await context.waitForEvent('serviceworker');
  const extensionId = serviceWorker.url().split('/')[2];

  const page = await context.newPage();
  await page.goto('https://example.com');
  await expect(page.locator('body')).toHaveText('Changed by my-extension');

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator('body')).toHaveText('my-extension popup');

  await context.close();
});
```

## Boas práticas

- Use sempre o Chromium que acompanha o Playwright (`channel: 'chromium'`) para carregar extensões.
- Use `--disable-extensions-except` junto com `--load-extension` para evitar carregar extensões de terceiros.
- Recupere o `extensionId` a partir do `serviceWorker.url()` para referenciar páginas `chrome-extension://`.

## Armadilhas comuns

- Extensões **não** funcionam em contextos non-persistentes (`browser.newContext()`); use `launchPersistentContext`.
- Service workers MV3 suspensos reiniciam silenciosamente; `evaluate()` em andamento pode lançar `"Service worker restarted"`.
- Não use flags de linha de comando arbitrárias sem testar — algumas quebram o Playwright.
