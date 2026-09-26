---
id: service-workers
title: "Service Workers"
---

## Introdução

:::warning
Service Workers são suportados apenas em navegadores baseados em Chromium.
:::

:::note
Se você procura fazer mocking, roteamento e interceptação de rede em geral, veja primeiro o [guia de Rede](./network.md). O Playwright oferece APIs nativas para esse caso de uso que não exigem as informações abaixo. Porém, se você tem interesse em requisições feitas pelos próprios Service Workers, leia adiante.
:::

[Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) fornecem um método nativo do navegador de tratar requisições feitas por uma página com a [Fetch API nativa (`fetch`)](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), junto com outros assets solicitados pela rede (como scripts, CSS e imagens).

Eles podem atuar como um **proxy de rede** entre a página e a rede externa para realizar lógica de cache, ou podem oferecer uma experiência offline se o Service Worker adicionar um listener de [FetchEvent](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent#examples).

Muitos sites que usam Service Workers simplesmente os utilizam como uma técnica transparente de otimização. Embora usuários possam notar uma experiência mais rápida, a implementação da aplicação desconhece sua existência. Rodar a aplicação com ou sem Service Workers habilitados parece funcionalmente equivalente.

### Quando usar

- Testar o comportamento da sua aplicação quando um Service Worker está no controle da página.
- Roteamento/interceptação de requisições feitas **pelo próprio** Service Worker (não apenas pela página).
- Validar experiência offline ou estratégias de cache implementadas via Service Worker.

## Como desabilitar Service Workers

O Playwright permite desabilitar Service Workers durante os testes. Isso torna os testes mais previsíveis e performáticos. Porém, se a sua página real usa um Service Worker, o comportamento pode ser diferente.

Para desabilitar service workers, defina `serviceWorkers` como `'block'` no `use` da configuração (Test Runner):

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    serviceWorkers: 'block',
  },
});
```

## Acessando Service Workers e aguardando a ativação

Você pode usar [`BrowserContext.serviceWorkers`](./service-workers-js-python.md#acessando-service-workers-e-aguardando-a-ativação) para listar os Service Workers, ou especificamente aguardar pelo Service Worker se você antecipa que a página vai disparar seu [registro](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register):

```ts
const serviceWorkerPromise = context.waitForEvent('serviceworker');
await page.goto('/example-with-a-service-worker.html');
const serviceworker = await serviceWorkerPromise;
```

O evento [`BrowserContext.serviceWorker`](./service-workers-js-python.md#acessando-service-workers-e-aguardando-a-ativação) é disparado **antes** do Service Worker assumir o controle da página, ou seja, **antes** de avaliar código no worker com [`Worker.evaluate`](./service-workers-js-python.md#acessando-service-workers-e-aguardando-a-ativação) você deve aguardar sua ativação.

Existem métodos mais idiomáticos de aguardar a ativação de um Service Worker, mas o seguinte é um método agnóstico de implementação:

```ts
await page.evaluate(async () => {
  const registration = await window.navigator.serviceWorker.getRegistration();
  if (registration.active?.state === 'activated')
    return;
  await new Promise(resolve => {
    window.navigator.serviceWorker.addEventListener('controllerchange', resolve);
  });
});
```

## Eventos de rede e roteamento

Qualquer requisição de rede feita pelo **Service Worker** é reportada através do objeto [BrowserContext](./browser-contexts.md):

- [`BrowserContext.request`](./service-workers-js-python.md#eventos-de-rede-e-roteamento), [`BrowserContext.requestFinished`](./service-workers-js-python.md#eventos-de-rede-e-roteamento), [`BrowserContext.response`](./service-workers-js-python.md#eventos-de-rede-e-roteamento) e [`BrowserContext.requestFailed`](./service-workers-js-python.md#eventos-de-rede-e-roteamento) são disparados
- [`BrowserContext.route`](./network.md#handle-requests) enxerga a requisição
- [`Request.serviceWorker`](./service-workers-js-python.md#eventos-de-rede-e-roteamento) será definido com a instância do Service Worker, e [`Request.frame`](./service-workers-js-python.md#eventos-de-rede-e-roteamento) **lançará exceção**

Adicionalmente, para qualquer requisição de rede feita pela **Page**, o método [`Response.fromServiceWorker`](./service-workers-js-python.md#eventos-de-rede-e-roteamento) retorna `true` quando a requisição foi tratada pelo handler fetch de um Service Worker.

Considere um Service Worker simples que faz fetch de toda requisição feita pela página:

```js title="transparent-service-worker.js"
self.addEventListener('fetch', event => {
  // de fato faz a requisição
  const responsePromise = fetch(event.request);
  // envia de volta para a página
  event.respondWith(responsePromise);
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});
```

Se `index.html` registra esse service worker e então faz fetch de `data.json`, os seguintes eventos de Request/Response seriam emitidos (junto com os eventos correspondentes do ciclo de vida de rede):

| Event                             | Dono             | URL                            | Roteado | `Response.fromServiceWorker` |
| -                                 | -                | -                              | -      | -                            |
| `BrowserContext.request`          | Frame            | index.html                     | Sim    |                              |
| `Page.request`                    | Frame            | index.html                     | Sim    |                              |
| `BrowserContext.request`          | Service Worker   | transparent-service-worker.js  | Sim    |                              |
| `BrowserContext.request`          | Service Worker   | data.json                      | Sim    |                              |
| `BrowserContext.request`          | Frame            | data.json                      |        | Sim                          |
| `Page.request`                    | Frame            | data.json                      |        | Sim                          |

Como o exemplo de Service Worker atua apenas como um "proxy" transparente básico:

- Existem 2 eventos `BrowserContext.request` para `data.json`; um pertencente ao Frame, outro ao Service Worker.
- Apenas a requisição pertencente ao Service Worker para o recurso foi roteável via [`BrowserContext.route`](./network.md#handle-requests); os eventos pertencentes ao Frame para `data.json` não são roteáveis, pois eles nem sequer teriam a possibilidade de atingir a rede externa já que o Service Worker registrou um handler fetch.

:::caution
É importante notar: chamar [`Request.frame`](./service-workers-js-python.md#eventos-de-rede-e-roteamento) ou [`Response.frame`](./service-workers-js-python.md#eventos-de-rede-e-roteamento) **lançará** uma exceção, se chamado em um Request/Response que possui um [`Request.serviceWorker`](./service-workers-js-python.md#eventos-de-rede-e-roteamento) não nulo.
:::

## Roteando apenas requisições do Service Worker

```ts
await context.route('**', async route => {
  if (route.request().serviceWorker()) {
    // NB: chamar route.request().frame() aqui LANÇARIA exceção
    await route.fulfill({
      contentType: 'text/plain',
      status: 200,
      body: 'from sw',
    });
  } else {
    await route.continue();
  }
});
```

## Limitações conhecidas

Requisições para o código de script principal atualizado do Service Worker atualmente não podem ser roteadas (https://github.com/microsoft/playwright/issues/14711).

## Exemplo completo

Abaixo, um teste que aguarda o registro do Service Worker, garante a ativação e então roteia apenas as requisições originadas do próprio Service Worker:

```ts title="tests/service-worker.spec.ts"
import { test, expect } from '@playwright/test';

test('roteia apenas requisições do service worker', async ({ context, page }) => {
  const swPromise = context.waitForEvent('serviceworker');
  await page.goto('/example-with-a-service-worker.html');
  const sw = await swPromise;

  // Aguarda a ativação antes de avaliar no worker.
  await page.evaluate(async () => {
    const registration = await window.navigator.serviceWorker.getRegistration();
    if (registration?.active?.state === 'activated')
      return;
    await new Promise(resolve => {
      window.navigator.serviceWorker.addEventListener('controllerchange', resolve);
    });
  });

  await context.route('**', async route => {
    if (route.request().serviceWorker()) {
      await route.fulfill({
        contentType: 'text/plain',
        status: 200,
        body: 'from sw',
      });
    } else {
      await route.continue();
    }
  });

  // sw está ativo e pronto para uso.
  expect(sw.url()).toContain('service-worker');
});
```

## Boas práticas

- Se o objetivo é mocking/interceptação de rede comum, prefira as rotas nativas do Playwright (veja [Rede](./network.md)) em vez de lidar com Service Workers.
- Aguarde a ativação do Service Worker antes de chamar `evaluate` nele.
- Desabilite Service Workers (`serviceWorkers: 'block'`) quando eles não forem relevantes para o teste e estiverem apenas atrapalhando.

## Armadilhas comuns

- Chamar `route.request().frame()` (ou `response.frame()`) em uma requisição/response de Service Worker **lança exceção**.
- Service Workers só funcionam em Chromium; não espere suporte em Firefox/WebKit.
- O script principal do Service Worker não pode ser roteado (limitação conhecida).
