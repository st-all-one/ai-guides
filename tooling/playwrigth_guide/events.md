---
id: events
title: "Events — escutando eventos da página (TypeScript)"
---

## Introdução

O Playwright permite escutar vários tipos de eventos que acontecem na página web, como requisições de rede, criação de páginas filhas (popups), dedicated workers etc. Existem várias formas de se inscrever nesses eventos: aguardar por um evento específico ou adicionar/remover listeners.

## Aguardando um evento

Na maior parte do tempo, os scripts precisarão esperar que um evento específico aconteça. Abaixo estão padrões típicos de espera.

Aguardar uma requisição com a URL especificada usando [`method: Page.waitForRequest`]:

```ts
// Inicia a espera pela requisição antes do goto. Note: sem await.
const requestPromise = page.waitForRequest('**/*logo*.png');
await page.goto('https://wikipedia.org');
const request = await requestPromise;
console.log(request.url());
```

Aguardar o popup (nova janela):

```ts
// Inicia a espera pelo popup antes do clique. Note: sem await.
const popupPromise = page.waitForEvent('popup');
await page.getByText('open the popup').click();
const popup = await popupPromise;
await popup.goto('https://wikipedia.org');
```

> **Dica:** sempre inicie a promise de espera **antes** da ação que dispara o evento (sem `await`), exatamente como nos exemplos acima, senão o evento pode passar antes de você começar a escutar.

## Adicionando/removendo listeners

Às vezes os eventos acontecem em momentos aleatórios e, em vez de esperar por eles, precisam ser tratados. O Playwright suporta mecanismos tradicionais de inscrição/desinscrição:

```ts
page.on('request', request => console.log(`Request sent: ${request.url()}`));
const listener = request => console.log(`Request finished: ${request.url()}`);
page.on('requestfinished', listener);
await page.goto('https://wikipedia.org');

page.off('requestfinished', listener);
await page.goto('https://www.openstreetmap.org/');
```

## Listeners únicos (one-off)

Se um determinado evento precisa ser tratado apenas uma vez, há uma API de conveniência:

```ts
page.once('dialog', dialog => dialog.accept('2021'));
await page.evaluate("prompt('Enter a number:')");
```

## Exemplo completo

```ts title="tests/events.spec.ts"
import { test, expect } from '@playwright/test';

test('escuta requisições e popup', async ({ page }) => {
  // Listener contínuo: registra todas as requisições concluídas.
  const finished: string[] = [];
  const listener = (request: { url: () => string }) =>
    finished.push(request.url());
  page.on('requestfinished', listener);

  // Aguarda popup disparado por um clique.
  const popupPromise = page.waitForEvent('popup');
  await page.goto('https://wikipedia.org');
  await page.getByText('open the popup').click();
  const popup = await popupPromise;
  await popup.goto('https://wikipedia.org');

  // Remove o listener para não vazar estado entre testes.
  page.off('requestfinished', listener);
  expect(finished.length).toBeGreaterThan(0);
});
```

## Armadilhas comuns

- **Ordem da espera:** inicie `waitForEvent`/`waitForRequest` **antes** da ação que dispara o evento, senão ele passa despercebido.
- **Vazamento de listeners:** `page.on(...)` persiste entre navegações; sempre remova com `page.off(...)` (ou use `once`) para não acumular handlers entre testes.
- **Escopo do listener:** o callback roda no contexto do Node; não use variáveis do navegador ali dentro sem `evaluate`.
- **`requestfinished` vs `response`:** use `waitForResponse` quando precisar do corpo/status da resposta, e `waitForRequest` apenas para a requisição.

## Boas práticas

- Prefira `waitForResponse`/`waitForRequest` com um predicado (função) para filtrar eventos específicos com precisão.
- Use `once` para diálogos e handlers descartáveis.
- Centralize escutas globais em fixtures ou `beforeEach` e remova em `afterEach` ([Test Fixtures](./test-fixtures-js.md)).
- Combine listeners com asserções para validar efeitos colaterais de rede/UI.
