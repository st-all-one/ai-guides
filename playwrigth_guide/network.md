---
id: network
title: "Rede (Network)"
---

## Introdução

O Playwright fornece APIs para **monitorar** e **modificar** o tráfego de rede do navegador, tanto HTTP quanto HTTPS. Qualquer requisição feita por uma página, incluindo [XHRs](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) e requisições [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), pode ser rastreada, modificada e interceptada.

Todo o poder de interceptação é exposto via **Test Runner** (`@playwright/test`, usando as fixtures `page`/`context`). O exemplo abaixo bloqueia qualquer requisição de CSS em cada teste do arquivo:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  // Bloqueia qualquer requisição de CSS em cada teste deste arquivo.
  await context.route(/.css$/, route => route.abort());
});

test('carrega a página sem CSS', async ({ page }) => {
  await page.goto('https://playwright.dev');
  // ... o teste continua aqui
});
```

Alternativamente, use [`Page.route`](./network.md#handle-requests) para mockar a rede apenas em uma única página:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('carrega a página sem imagens', async ({ page }) => {
  // Bloqueia imagens png e jpeg.
  await page.route(/(png|jpeg)$/, route => route.abort());

  await page.goto('https://playwright.dev');
  // ... o teste continua aqui
});
```

### Quando usar

- Verificar se a página faz as chamadas de API esperadas (`request`/`response` events).
- Simular respostas de API para tornar os testes determinísticos (veja também [Mock de APIs](./mock.md)).
- Bloquear ou redirecionar recursos pesados (imagens, fontes, CSS) para acelerar a suíte.
- Autenticar via HTTP Basic, rotear por proxy ou inspecionar WebSockets.

## Mock de APIs

Consulte o [guia de Mock de APIs](./mock.md) para aprender a:

- mockar requisições de API e nunca bater na API real;
- executar a requisição real e modificar a resposta;
- usar arquivos HAR para mockar requisições de rede;
- mockar a comunicação de WebSockets.

## Network mocking

Não é necessário configurar nada para mockar requisições de rede. Basta definir uma `Route` customizada que intercepta a rede de um `BrowserContext` ou de uma `Page`.

### Armadilhas comuns

- `route.abort()` / `route.fulfill()` / `route.continue()` **não devem ser chamados mais de uma vez** para a mesma rota.
- Use `await` dentro do handler assíncrono quando fizer `route.fetch()` ou `route.continue({ ... })`.
- Padrões glob devem casar com a URL **inteira** (veja [Glob URL patterns](#glob-url-patterns)).

## HTTP Authentication

Para realizar autenticação HTTP Basic, configure `httpCredentials` no `use` do `playwright.config.ts`:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    httpCredentials: {
      username: 'bill',
      password: 'pa55w0rd',
    },
  },
});
```

## HTTP Proxy

Você pode configurar as páginas para carregar através de um proxy HTTP(S) ou SOCKSv5. O proxy pode ser definido globalmente para todo o navegador ou por `BrowserContext` individualmente. É possível informar usuário/senha e também hosts a ignorar (`bypass`).

### Proxy global (Test Runner)

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    proxy: {
      server: 'http://myproxy.com:3128',
      username: 'usr',
      password: 'pwd',
    },
  },
});
```

### Proxy por contexto

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('deve usar proxy customizado em um novo contexto', async ({ browser }) => {
  const context = await browser.newContext({
    proxy: {
      server: 'http://myproxy.com:3128',
    },
  });
  const page = await context.newPage();
  await page.goto('https://example.com');
  await context.close();
});
```

## Network events

Você pode monitorar todos os [Requests](./network.md#handle-requests) e [Responses](./network.md#handle-requests):

```ts title="tests/network.spec.ts"
import { test, expect } from '@playwright/test';

test('monitora requisições e respostas', async ({ page }) => {
  // Inscreve-se nos eventos 'request' e 'response'.
  page.on('request', request => console.log('>>', request.method(), request.url()));
  page.on('response', response => console.log('<<', response.status(), response.url()));

  await page.goto('https://example.com');
});
```

Ou aguarde uma resposta de rede após um clique usando [`Page.waitForResponse`](./network.md#handle-requests):

```ts title="tests/network.spec.ts"
import { test, expect } from '@playwright/test';

test('aguarda resposta da API após clique', async ({ page }) => {
  // Usa um padrão glob de URL. Note: sem await na promessa.
  const responsePromise = page.waitForResponse('**/api/fetch_data');
  await page.getByText('Update').click();
  const response = await responsePromise;

  expect(response.status()).toBe(200);
});
```

### Variações

Aguarde respostas com [`Page.waitForResponse`](./network.md#handle-requests) usando RegExp ou um predicado:

```ts title="tests/network.spec.ts"
import { test, expect } from '@playwright/test';

test('aguarda resposta com RegExp e predicado', async ({ page }) => {
  // Usa uma RegExp. Note: sem await na promessa.
  const responsePromise1 = page.waitForResponse(/\.jpeg$/);
  await page.getByText('Update').click();
  const response1 = await responsePromise1;

  // Usa um predicado que recebe o objeto Response. Note: sem await.
  const token = 'abc';
  const responsePromise2 = page.waitForResponse(response => response.url().includes(token));
  await page.getByText('Update').click();
  const response2 = await responsePromise2;

  expect(response1.ok()).toBeTruthy();
});
```

## Handle requests

```ts title="tests/network.spec.ts"
import { test, expect } from '@playwright/test';

const testData = JSON.stringify({ message: 'dados mockados' });

test('responde a uma rota com dados mockados', async ({ page }) => {
  await page.route('**/api/fetch_data', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: testData,
  }));
  await page.goto('https://example.com');

  const response = await page.waitForResponse('**/api/fetch_data');
  expect(await response.json()).toEqual({ message: 'dados mockados' });
});
```

Você pode mockar endpoints de API interceptando as requisições de rede no próprio script do Playwright.

### Variações

Configure a rota no `BrowserContext` inteiro com [`BrowserContext.route`](./network.md#handle-requests) ou na `Page` com [`Page.route`](./network.md#handle-requests). Isso também se aplica a janelas popup e links abertos.

```ts title="tests/network.spec.ts"
import { test, expect } from '@playwright/test';

test('mocka login no contexto inteiro', async ({ context, page }) => {
  await context.route('**/api/login', route => route.fulfill({
    status: 200,
    body: 'accept',
  }));
  await page.goto('https://example.com');

  const response = await page.waitForResponse('**/api/login');
  expect(await response.text()).toBe('accept');
});
```

## Modify requests

Você pode continuar requisições com modificações. O exemplo abaixo remove um cabeçalho HTTP das requisições de saída e força o método POST.

```ts title="tests/network.spec.ts"
import { test, expect } from '@playwright/test';

test('remove cabeçalho e força POST', async ({ page }) => {
  // Remove um cabeçalho de todas as requisições.
  await page.route('**/*', async route => {
    const headers = { ...route.request().headers() };
    delete headers['X-Secret'];
    await route.continue({ headers });
  });

  // Continua as requisições como POST.
  await page.route('**/*', route => route.continue({ method: 'POST' }));

  await page.goto('https://example.com');
});
```

### Boas práticas

- Sempre faça `await route.continue(...)` quando modificar headers/body/método, pois o handler é assíncrono.
- Evite definir duas rotas conflitantes para o mesmo padrão; a última registrada tem precedência.
- Para modificar apenas parte das requisições, use um predicado no handler e chame `route.continue()` no caso contrário.

## Abort requests

Você pode abortar requisições usando [`Page.route`](./network.md#handle-requests) e [`Route.abort`](./network.md#handle-requests).

```ts title="tests/network.spec.ts"
import { test, expect } from '@playwright/test';

test('aborta imagens e tipos específicos', async ({ page }) => {
  await page.route('**/*.{png,jpg,jpeg}', route => route.abort());

  // Aborta com base no tipo de recurso.
  await page.route('**/*', route => {
    return route.request().resourceType() === 'image' ? route.abort() : route.continue();
  });

  await page.goto('https://example.com');
});
```

### Armadilhas comuns

- `route.abort()` dispara um erro de rede no navegador; se a página espera esse recurso para funcionar, o teste pode falhar. Bloqueie apenas o que realmente pode faltar.
- Chamar `route.continue()` e `route.abort()` para a mesma rota causa exceção.

## Modify responses

Para modificar uma resposta, use [APIRequestContext](./api-testing-js.md) para obter a resposta original via [`Route.fetch`](./network.md#handle-requests) e então passe a resposta para [`Route.fulfill`](./network.md#handle-requests), sobrescrevendo os campos desejados.

```ts title="tests/network.spec.ts"
import { test, expect } from '@playwright/test';

test('adiciona prefixo ao título da resposta', async ({ page }) => {
  await page.route('**/title.html', async route => {
    // Busca a resposta original.
    const response = await route.fetch();
    // Adiciona um prefixo ao título.
    let body = await response.text();
    body = body.replace('<title>', '<title>My prefix:');
    await route.fulfill({
      // Repassa todos os campos da resposta original.
      response,
      // Sobrescreve o corpo da resposta.
      body,
      // Força o content type para html.
      headers: {
        ...response.headers(),
        'content-type': 'text/html',
      },
    });
  });

  await page.goto('https://example.com/title.html');
});
```

## Glob URL patterns

O Playwright usa padrões glob simplificados para casar URLs em métodos de interceptação como [`Page.route`](./network.md#handle-requests) e [`Page.waitForResponse`](./network.md#handle-requests). Esses padrões suportam curingas básicos:

1. Asteriscos:
   - Um único `*` casa quaisquer caracteres, exceto `/`
   - Um duplo `**` casa quaisquer caracteres, incluindo `/`
1. O ponto de interrogação `?` casa apenas o próprio `?`. Se quiser casar qualquer caractere, use `*` no lugar.
1. Chaves `{}` podem ser usadas para casar uma lista de opções separadas por vírgula `,`
1. A barra invertida `\` pode ser usada para escapar qualquer caractere especial (note que a própria barra invertida deve ser escapada como `\\`)

Exemplos:

- `https://example.com/*.js` casa `https://example.com/file.js`, mas não `https://example.com/path/file.js`
- `https://example.com/?page=1` casa `https://example.com/?page=1`, mas não `https://example.com`
- `**/*.js` casa tanto `https://example.com/file.js` quanto `https://example.com/path/file.js`
- `**/*.{png,jpg,jpeg}` casa todas as requisições de imagem

Notas importantes:

- O padrão glob deve casar a URL **inteira**, não apenas uma parte dela.
- Ao usar globs para casar URLs, considere a estrutura completa da URL, incluindo protocolo e separadores de caminho.
- Para requisitos de casamento mais complexos, considere usar [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) em vez de globs.

## WebSockets

O Playwright suporta inspeção, mocking e modificação de [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) nativamente. Veja o [guia de Mock de APIs](./mock.md#mock-de-websockets) para aprender a mockar WebSockets.

Toda vez que um WebSocket é criado, o evento [`Page.webSocket`](./network.md#web-sockets) é disparado. Esse evento contém a instância de [WebSocket](./network.md#web-sockets) para inspecionar os frames:

```ts title="tests/websocket.spec.ts"
import { test, expect } from '@playwright/test';

test('inspeciona frames de WebSocket', async ({ page }) => {
  page.on('websocket', ws => {
    console.log(`WebSocket aberto: ${ws.url()}>`);
    ws.on('framesent', event => console.log(event.payload));
    ws.on('framereceived', event => console.log(event.payload));
    ws.on('close', () => console.log('WebSocket fechado'));
  });

  await page.goto('https://example.com');
});
```

## Eventos de rede ausentes e Service Workers

As APIs nativas do Playwright [`BrowserContext.route`](./network.md#handle-requests) e [`Page.route`](./network.md#handle-requests) permitem que seus testes roteiem requisições e façam mocking/interceptação de forma nativa.

Se você usa as rotas nativas do Playwright e percebe que eventos de rede estão faltando, desabilite os Service Workers configurando `serviceWorkers` como `'block'` no `use` da configuração (Test Runner):

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    serviceWorkers: 'block',
  },
});
```

É possível que você esteja usando uma ferramenta de mock como o Mock Service Worker (MSW). Embora essa ferramenta funcione imediatamente para mockar respostas, ela adiciona seu próprio Service Worker que assume o controle das requisições de rede, tornando-as invisíveis para [`BrowserContext.route`](./network.md#handle-requests) e [`Page.route`](./network.md#handle-requests). Se você quer tanto testar quanto mockar a rede, considere usar as rotas nativas do Playwright para [response mocking](#handle-requests).

Se o seu interesse não é usar apenas Service Workers para testes e mocking, mas sim rotear e escutar requisições feitas pelos próprios Service Workers, veja o [guia de Service Workers](./service-workers-js-python.md).

## Exemplo completo

Abaixo, um teste que combina monitoramento, mock de resposta e bloqueio de recursos pesados para acelerar e tornar determinístico o teste de uma página que consome uma API:

```ts title="tests/network-full.spec.ts"
import { test, expect } from '@playwright/test';

test.describe('rede: monitorar + mockar + bloquear', () => {
  test.beforeEach(async ({ context }) => {
    // 1) Bloqueia imagens e CSS para acelerar.
    await context.route('**/*.{png,jpg,jpeg,css}', route => route.abort());

    // 2) Mocka a API de dados para resposta determinística.
    await context.route('**/api/items', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Item A' }, { id: 2, name: 'Item B' }]),
    }));
  });

  test('exibe os itens mockados e registra o tráfego', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', req => requests.push(req.url()));

    await page.goto('https://example.com');

    await expect(page.getByText('Item A')).toBeVisible();
    await expect(page.getByText('Item B')).toBeVisible();

    // A API mockada NÃO bateu na rede real.
    expect(requests.some(url => url.includes('/api/items'))).toBe(false);
  });
});
```

## Boas práticas

- Defina rotas **antes** de `page.goto()` para garantir que a primeira requisição já seja interceptada.
- Prefira padrões glob restritos (`**/api/v1/fruits`) para não interceptar recursos acidentalmente.
- Use `await` em todos os handlers assíncronos de rota.
- Combine bloqueio de recursos estáticos com mock de API para suítes rápidas e estáveis.
