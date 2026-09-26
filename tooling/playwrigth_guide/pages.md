---
id: pages
title: "Páginas (Pages)"
---

## Introdução

Cada `BrowserContext` pode conter várias páginas. Uma `Page` representa uma única aba (tab) ou janela popup dentro de um contexto de navegador. Ela é usada para navegar até URLs e interagir com o conteúdo da página.

Em termos práticos, no Playwright Test Runner, o objeto `page` já é fornecido para você como fixture de cada teste. Quando você usa a biblioteca (`playwright`) pura, cria a `page` a partir de um `context`.

```ts
import { test, expect } from '@playwright/test';

test('criar e navegar em uma página', async ({ page }) => {
  // Navegação explícita, equivalente a digitar uma URL no navegador.
  await page.goto('http://example.com');

  // Preenche um campo de entrada.
  await page.locator('#search').fill('query');

  // Navegação implícita clicando em um link.
  await page.locator('#submit').click();

  // Verifica a nova URL.
  console.log(page.url());
});
```

Quando usar a biblioteca (`playwright`) diretamente, crie o contexto e a página manualmente:

```ts
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();

// Cria uma página.
const page = await context.newPage();

// Navegação explícita.
await page.goto('http://example.com');
// Preenche um campo.
await page.locator('#search').fill('query');
// Navegação implícita clicando em um link.
await page.locator('#submit').click();
console.log(page.url());

await context.close();
await browser.close();
```

### Quando usar

- **Navegação e interação padrão:** a grande maioria dos testes usa a `page` padrão fornecida pelo fixture.
- **Múltiplas abas/janelas:** quando o fluxo abre novas abas (ex.: `target="_blank"`) ou popups.
- **Cenários multiusuário:** duas páginas diferentes (ou contextos) representando dois usuários.

## Múltiplas páginas

Cada contexto de navegador pode hospedar várias páginas (abas).

- Cada página se comporta como uma página ativa e focada. Não é necessário trazê-la para frente (`bring to front`).
- Páginas dentro de um mesmo contexto respeitam a emulação definida no nível do contexto (tamanho de viewport, rotas de rede customizadas, locale do navegador etc.).

```ts
import { test } from '@playwright/test';

test('trabalhar com múltiplas páginas', async ({ context }) => {
  // Cria duas páginas no mesmo contexto.
  const pageOne = await context.newPage();
  const pageTwo = await context.newPage();

  // Obtém todas as páginas do contexto.
  const allPages = context.pages();
  console.log(`Total de páginas: ${allPages.length}`);
});
```

> **Armadilhas comuns**
> - Páginas em contextos diferentes **não** compartilham storage, cookies ou estado de login. Se você precisa testar dois usuários, crie dois contextos (veja `browser-contexts.md`), não apenas duas páginas no mesmo contexto.
> - `context.pages()` retorna o estado atual no momento da chamada. Se uma aba foi aberta de forma assíncrona e ainda não terminou de carregar, ela já estará no array, mas pode não estar pronta para interação.

## Tratando novas páginas

O evento `page` do `BrowserContext` permite capturar novas páginas criadas no contexto. Isso é útil para lidar com abas abertas por links `target="_blank"`.

O padrão recomendado é **iniciar a espera antes da ação que dispara a nova página** e só então aguardar a resolução da promessa:

```ts
import { test, expect } from '@playwright/test';

test('capturar nova aba aberta por link', async ({ context, page }) => {
  await page.goto('https://example.com');

  // Inicia a espera pela nova página ANTES de clicar. Note: sem await aqui.
  const pagePromise = context.waitForEvent('page');
  await page.getByText('open new tab').click();
  const newPage = await pagePromise;

  // Interage com a nova página normalmente.
  await newPage.getByRole('button').click();
  console.log(await newPage.title());
});
```

Se a ação que dispara a nova página é desconhecida, use um listener global:

```ts
import { test } from '@playwright/test';

test('escutar todas as novas páginas do contexto', async ({ context }) => {
  context.on('page', async (page) => {
    await page.waitForLoadState();
    console.log(await page.title());
  });
});
```

## Tratando popups

Se a página abre um popup (por exemplo, via links `target="_blank"`), você obtém uma referência a ele escutando o evento `popup` da própria `page`.

Esse evento é emitido **além** do `browserContext.on('page')`, mas apenas para popups relevantes àquela página específica.

```ts
import { test, expect } from '@playwright/test';

test('capturar popup', async ({ page }) => {
  await page.goto('https://example.com');

  // Inicia a espera pelo popup ANTES de clicar. Note: sem await aqui.
  const popupPromise = page.waitForEvent('popup');
  await page.getByText('open the popup').click();
  const popup = await popupPromise;

  // Interage com o popup normalmente.
  await popup.getByRole('button').click();
  console.log(await popup.title());
});
```

Se o gatilho do popup é desconhecido, use o listener:

```ts
import { test } from '@playwright/test';

test('escutar todos os popups', async ({ page }) => {
  page.on('popup', async (popup) => {
    await popup.waitForLoadState();
    console.log(await popup.title());
  });
});
```

## Exemplo completo

Arquivo `tests/pages.spec.ts` com cenário realista de múltiplas abas e popup:

```ts
import { test, expect } from '@playwright/test';

test.describe('Fluxo com múltiplas abas e popup', () => {
  test('abre nova aba e interage com popup', async ({ context, page }) => {
    await page.goto('https://example.com');

    // 1) Nova aba disparada por link target="_blank".
    const newTabPromise = context.waitForEvent('page');
    await page.getByRole('link', { name: 'Documentação' }).click();
    const docsTab = await newTabPromise;
    await docsTab.waitForLoadState();
    await expect(docsTab).toHaveURL(/docs/);
    console.log('Título da nova aba:', await docsTab.title());

    // 2) Popup disparado por botão.
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Abrir popup' }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await expect(popup.getByRole('heading')).toBeVisible();

    // 3) Volta para a página original.
    await page.bringToFront();
    await expect(page).toHaveURL('https://example.com/');
  });
});
```

## Boas práticas

- Sempre inicie `waitForEvent('page' | 'popup')` **antes** da ação que dispara a nova janela; caso contrário, você pode perder o evento.
- Nunca use `await` na linha que cria a promessa de espera (`const p = context.waitForEvent('page')`) — apenas depois da ação.
- Prefira `waitForLoadState()` logo após capturar a nova página/popup para garantir interação segura.
- Use `page.bringToFront()` se precisar garantir foco visual, embora o Playwright não exija isso para interagir.
- Para cenários de dois usuários isolados, prefira múltiplos `BrowserContext` (veja `browser-contexts.md`) em vez de múltiplas páginas no mesmo contexto.
