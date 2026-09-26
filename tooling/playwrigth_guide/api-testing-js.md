---
id: api-testing
title: "Testes de API"
---

## Introdução

O Playwright pode ser usado para acessar a API [REST](https://en.wikipedia.org/wiki/Representational_state_transfer) da sua aplicação.

Às vezes você pode querer enviar requisições diretamente ao servidor a partir do Node.js, sem carregar uma página e rodar código JS nela. Alguns exemplos onde isso é útil:

- Testar a API do seu servidor.
- Preparar o estado do servidor antes de visitar a aplicação Web em um teste.
- Validar pós-condições no servidor após executar ações no navegador.

Tudo isso pode ser feito via métodos de [APIRequestContext](./api-testing-js.md#escrevendo-testes-de-api).

### Quando usar

- **Teste de contrato de API**: validar endpoints diretamente, sem UI.
- **Precondições**: criar dados/usuários via API antes do teste de UI.
- **Pós-condições**: confirmar no servidor que a ação feita na UI realmente persistiu.
- **Compartilhamento de autenticação**: logar via API e reutilizar o `storageState` no navegador.

## Escrevendo testes de API

[APIRequestContext](./api-testing-js.md#escrevendo-testes-de-api) pode enviar todo tipo de requisição HTTP(S) pela rede.

O exemplo a seguir demonstra como usar o Playwright para testar a criação de issues via [GitHub API](https://docs.github.com/en/rest). A suíte de teste fará o seguinte:

- Criar um novo repositório antes de rodar os testes.
- Criar algumas issues e validar o estado do servidor.
- Remover o repositório após rodar os testes.

### Configuração

A GitHub API exige autorização, então configuraremos o token uma única vez para todos os testes. Aproveitamos para definir o `baseURL` e simplificar os testes. Você pode colocar isso no arquivo de configuração ou no próprio arquivo de teste com `test.use()`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Todas as requisições enviadas vão para este endpoint de API.
    baseURL: 'https://api.github.com',
    extraHTTPHeaders: {
      // Definimos este cabeçalho seguindo as diretrizes do GitHub.
      'Accept': 'application/vnd.github.v3+json',
      // Adiciona o token de autorização a todas as requisições.
      // Assume um personal access token disponível na variável de ambiente.
      'Authorization': `token ${process.env.API_TOKEN}`,
    },
  },
});
```

**Configuração de proxy**

Se seus testes precisam rodar atrás de um proxy, você pode especificá-lo na configuração e o fixture `request` o capturará automaticamente:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    proxy: {
      server: 'http://my-proxy:8080',
      username: 'user',
      password: 'secret'
    },
  },
});
```

### Escrevendo os testes

O Playwright Test já vem com o fixture embutido `request`, que respeita as opções de configuração como `baseURL` e `extraHTTPHeaders` que especificamos e está pronto para enviar requisições.

Agora podemos adicionar alguns testes que criarão novas issues no repositório.

```ts title="tests/github-api.spec.ts"
import { test, expect } from '@playwright/test';

const REPO = 'test-repo-1';
const USER = 'github-username';

test('deve criar um bug report', async ({ request }) => {
  const newIssue = await request.post(`/repos/${USER}/${REPO}/issues`, {
    data: {
      title: '[Bug] report 1',
      body: 'Bug description',
    }
  });
  expect(newIssue.ok()).toBeTruthy();

  const issues = await request.get(`/repos/${USER}/${REPO}/issues`);
  expect(issues.ok()).toBeTruthy();
  expect(await issues.json()).toContainEqual(expect.objectContaining({
    title: '[Bug] report 1',
    body: 'Bug description'
  }));
});

test('deve criar um feature request', async ({ request }) => {
  const newIssue = await request.post(`/repos/${USER}/${REPO}/issues`, {
    data: {
      title: '[Feature] request 1',
      body: 'Feature description',
    }
  });
  expect(newIssue.ok()).toBeTruthy();

  const issues = await request.get(`/repos/${USER}/${REPO}/issues`);
  expect(issues.ok()).toBeTruthy();
  expect(await issues.json()).toContainEqual(expect.objectContaining({
    title: '[Feature] request 1',
    body: 'Feature description'
  }));
});
```

### Setup e teardown

Esses testes assumem que o repositório existe. Você provavelmente quer criar um novo antes de rodar os testes e removê-lo depois. Use os hooks `beforeAll` e `afterAll` para isso.

```ts title="tests/github-api.spec.ts"
import { test, expect } from '@playwright/test';

const REPO = 'test-repo-1';
const USER = 'github-username';

test.beforeAll(async ({ request }) => {
  // Cria um novo repositório.
  const response = await request.post('/user/repos', {
    data: {
      name: REPO
    }
  });
  expect(response.ok()).toBeTruthy();
});

test.afterAll(async ({ request }) => {
  // Remove o repositório.
  const response = await request.delete(`/repos/${USER}/${REPO}`);
  expect(response.ok()).toBeTruthy();
});
```

### Boas práticas

- Nunca versione tokens; leia de `process.env` e use um `.env` (via `dotenv`) em local dev.
- Valide sempre `response.ok()` antes de chamar `.json()` para evitar exceções em respostas 4xx/5xx.
- Use `expect.objectContaining` para checar apenas os campos relevantes da resposta.

## Usando o request context manualmente

Nos bastidores, o [`request` fixture](./api-testing-js.md#escrevendo-testes-de-api) chama [`APIRequest.newContext`](./api-testing-js.md#usando-o-request-context-manualmente). Você sempre pode fazer isso manualmente se quiser mais controle. Abaixo, um script autônomo que faz o mesmo que o `beforeAll` e `afterAll` acima.

```ts title="setup.ts"
import { request } from '@playwright/test';

const REPO = 'test-repo-1';
const USER = 'github-username';

(async () => {
  // Cria um contexto que emitirá requisições http.
  const context = await request.newContext({
    baseURL: 'https://api.github.com',
  });

  // Cria um repositório.
  await context.post('/user/repos', {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      // Adiciona o GitHub personal access token.
      'Authorization': `token ${process.env.API_TOKEN}`,
    },
    data: {
      name: REPO
    }
  });

  // Remove um repositório.
  await context.delete(`/repos/${USER}/${REPO}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      // Adiciona o GitHub personal access token.
      'Authorization': `token ${process.env.API_TOKEN}`,
    }
  });

  await context.dispose();
})();
```

## Enviando requisições de API a partir de testes de UI

Ao rodar testes dentro do navegador, você pode querer fazer chamadas à API HTTP da sua aplicação. Isso é útil se precisar preparar o estado do servidor antes de rodar um teste ou checar pós-condições no servidor após ações na UI. Tudo isso pode ser obtido via métodos de [APIRequestContext](./api-testing-js.md#escrevendo-testes-de-api).

### Estabelecendo precondições

O teste a seguir cria uma nova issue via API e então navega para a lista de issues do projeto para verificar que ela aparece no topo da lista.

```ts title="tests/ui-with-api.spec.ts"
import { test, expect } from '@playwright/test';

const REPO = 'test-repo-1';
const USER = 'github-username';

// O request context é reutilizado por todos os testes do arquivo.
let apiContext: import('@playwright/test').APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  apiContext = await playwright.request.newContext({
    // Todas as requisições enviadas vão para este endpoint de API.
    baseURL: 'https://api.github.com',
    extraHTTPHeaders: {
      // Definimos este cabeçalho seguindo as diretrizes do GitHub.
      'Accept': 'application/vnd.github.v3+json',
      // Adiciona o token de autorização a todas as requisições.
      // Assume um personal access token disponível na variável de ambiente.
      'Authorization': `token ${process.env.API_TOKEN}`,
    },
  });
});

test.afterAll(async () => {
  // Libera todas as respostas.
  await apiContext.dispose();
});

test('a última issue criada deve estar no topo da lista', async ({ page }) => {
  const newIssue = await apiContext.post(`/repos/${USER}/${REPO}/issues`, {
    data: {
      title: '[Feature] request 1',
    }
  });
  expect(newIssue.ok()).toBeTruthy();

  await page.goto(`https://github.com/${USER}/${REPO}/issues`);
  const firstIssue = page.locator(`a[data-hovercard-type='issue']`).first();
  await expect(firstIssue).toHaveText('[Feature] request 1');
});
```

### Validando pós-condições

O teste a seguir cria uma nova issue via interface do usuário no navegador e então verifica se ela foi criada via API:

```ts title="tests/ui-with-api.spec.ts"
import { test, expect } from '@playwright/test';

const REPO = 'test-repo-1';
const USER = 'github-username';

// O request context é reutilizado por todos os testes do arquivo.
let apiContext: import('@playwright/test').APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  apiContext = await playwright.request.newContext({
    // Todas as requisições enviadas vão para este endpoint de API.
    baseURL: 'https://api.github.com',
    extraHTTPHeaders: {
      // Definimos este cabeçalho seguindo as diretrizes do GitHub.
      'Accept': 'application/vnd.github.v3+json',
      // Adiciona o token de autorização a todas as requisições.
      // Assume um personal access token disponível na variável de ambiente.
      'Authorization': `token ${process.env.API_TOKEN}`,
    },
  });
});

test.afterAll(async () => {
  // Libera todas as respostas.
  await apiContext.dispose();
});

test('a última issue criada deve estar no servidor', async ({ page }) => {
  await page.goto(`https://github.com/${USER}/${REPO}/issues`);
  await page.getByText('New Issue').click();
  await page.getByRole('textbox', { name: 'Title' }).fill('Bug report 1');
  await page.getByRole('textbox', { name: 'Comment body' }).fill('Bug description');
  await page.getByText('Submit new issue').click();
  const issueId = new URL(page.url()).pathname.split('/').pop();

  const newIssue = await apiContext.get(
      `https://api.github.com/repos/${USER}/${REPO}/issues/${issueId}`
  );
  expect(newIssue.ok()).toBeTruthy();
  expect(await newIssue.json()).toEqual(expect.objectContaining({
    title: 'Bug report 1'
  }));
});
```

## Reutilizando o estado de autenticação

Aplicações Web usam autenticação baseada em cookie ou token, onde o estado autenticado é armazenado como [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies). O Playwright fornece o método [`APIRequestContext.storageState`](./api-testing-js.md#reutilizando-o-estado-de-autenticação) que pode ser usado para recuperar o estado de armazenamento de um contexto autenticado e então criar novos contextos com esse estado.

O estado de armazenamento é intercambiável entre [BrowserContext](./browser-contexts.md) e [APIRequestContext](./api-testing-js.md#escrevendo-testes-de-api). Você pode usá-lo para logar via chamadas de API e então criar um novo contexto já com os cookies presentes. O snippet a seguir recupera o estado de um [APIRequestContext](./api-testing-js.md#escrevendo-testes-de-api) autenticado e cria um novo [BrowserContext](./browser-contexts.md) com esse estado.

```ts title="tests/auth-state.spec.ts"
import { test, expect } from '@playwright/test';

test('reutiliza o storage state da API no navegador', async ({ request, browser }) => {
  const requestContext = await request.newContext({
    httpCredentials: {
      username: 'user',
      password: 'passwd'
    }
  });
  await requestContext.get(`https://api.example.com/login`);
  // Salva o estado de armazenamento em um arquivo.
  await requestContext.storageState({ path: 'state.json' });

  // Cria um novo contexto com o estado de armazenamento salvo.
  const context = await browser.newContext({ storageState: 'state.json' });
  const page = await context.newPage();
  await page.goto('https://api.example.com/dashboard');

  await requestContext.dispose();
  await context.close();
});
```

## Request do contexto vs request global

Existem dois tipos de [APIRequestContext](./api-testing-js.md#escrevendo-testes-de-api):

* associado a um [BrowserContext](./browser-contexts.md)
* instância isolada, criada via [`APIRequest.newContext`](./api-testing-js.md#usando-o-request-context-manualmente)

A principal diferença é que o [APIRequestContext](./api-testing-js.md#escrevendo-testes-de-api) acessível via [`BrowserContext.request`](./api-testing-js.md#request-do-contexto-vs-request-global) e [`Page.request`](./api-testing-js.md#request-do-contexto-vs-request-global) preencherá o cabeçalho `Cookie` da requisição a partir do browser context e atualizará automaticamente os cookies do navegador se a [APIResponse](./api-testing-js.md#escrevendo-testes-de-api) tiver o cabeçalho `Set-Cookie`:

```ts title="tests/context-request.spec.ts"
import { test, expect } from '@playwright/test';

test('o request do contexto compartilha cookies com seu browser context', async ({
  page,
  context,
}) => {
  await context.route('https://www.github.com/', async route => {
    // Envia uma requisição de API que compartilha o armazenamento de cookies com o contexto.
    const response = await context.request.fetch(route.request());
    const responseHeaders = response.headers();

    // A resposta terá o cabeçalho 'Set-Cookie'.
    const responseCookies = new Map(responseHeaders['set-cookie']
        .split('\n')
        .map(c => c.split(';', 2)[0].split('=') as [string, string]));
    // A resposta terá 3 cookies no cabeçalho 'Set-Cookie'.
    expect(responseCookies.size).toBe(3);
    const contextCookies = await context.cookies();
    // O contexto do navegador já conterá todos os cookies da resposta da API.
    expect(new Map(contextCookies.map(({ name, value }) =>
      [name, value] as [string, string])
    )).toEqual(responseCookies);

    await route.fulfill({
      response,
      headers: { ...responseHeaders, foo: 'bar' },
    });
  });
  await page.goto('https://www.github.com/');
});
```

Se você não quer que o [APIRequestContext](./api-testing-js.md#escrevendo-testes-de-api) use e atualize cookies do contexto do navegador, pode criar manualmente uma nova instância com cookies isolados:

```ts title="tests/global-request.spec.ts"
import { test, expect } from '@playwright/test';

test('o request global tem armazenamento de cookies isolado', async ({
  page,
  context,
  browser,
  playwright
}) => {
  // Cria uma nova instância de APIRequestContext com armazenamento de cookies isolado.
  const request = await playwright.request.newContext();
  await context.route('https://www.github.com/', async route => {
    const response = await request.fetch(route.request());
    const responseHeaders = response.headers();

    const responseCookies = new Map(responseHeaders['set-cookie']
        .split('\n')
        .map(c => c.split(';', 2)[0].split('=') as [string, string]));
    // A resposta terá 3 cookies no cabeçalho 'Set-Cookie'.
    expect(responseCookies.size).toBe(3);
    const contextCookies = await context.cookies();
    // O contexto do navegador não terá nenhum cookie da requisição de API isolada.
    expect(contextCookies.length).toBe(0);

    // Exporta manualmente o armazenamento de cookies.
    const storageState = await request.storageState();
    // Cria um novo contexto e o inicializa com os cookies do request global.
    const browserContext2 = await browser.newContext({ storageState });
    const contextCookies2 = await browserContext2.cookies();
    // O novo contexto do navegador já conterá todos os cookies da resposta da API.
    expect(
        new Map(contextCookies2.map(({ name, value }) => [name, value] as [string, string]))
    ).toEqual(responseCookies);

    await route.fulfill({
      response,
      headers: { ...responseHeaders, foo: 'bar' },
    });
  });
  await page.goto('https://www.github.com/');
  await request.dispose();
});
```

### Armadilhas comuns

- `request` (fixture) e `playwright.request.newContext()` têm cookies separados; misturá-los pode causar "não autenticado".
- Sempre chame `dispose()` no contexto de request criado manualmente para liberar recursos.
- `response.json()` só pode ser lido uma vez; se precisar usar várias vezes, armazene em uma variável.

## Exemplo completo

Fluxo completo: cria repositório via `beforeAll`, cria issue via API como precondição, valida na UI e limpa tudo no `afterAll`.

```ts title="tests/github-full.spec.ts"
import { test, expect } from '@playwright/test';

const REPO = 'test-repo-full';
const USER = 'github-username';

let apiContext: import('@playwright/test').APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  apiContext = await playwright.request.newContext({
    baseURL: 'https://api.github.com',
    extraHTTPHeaders: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${process.env.API_TOKEN}`,
    },
  });
  const res = await apiContext.post('/user/repos', { data: { name: REPO } });
  expect(res.ok()).toBeTruthy();
});

test.afterAll(async () => {
  await apiContext.delete(`/repos/${USER}/${REPO}`);
  await apiContext.dispose();
});

test('issue criada via API aparece na UI', async ({ page }) => {
  const newIssue = await apiContext.post(`/repos/${USER}/${REPO}/issues`, {
    data: { title: 'Via API', body: 'criada por teste' },
  });
  expect(newIssue.ok()).toBeTruthy();

  await page.goto(`https://github.com/${USER}/${REPO}/issues`);
  await expect(page.getByText('Via API')).toBeVisible();
});
```

## Boas práticas

- Centralize a criação do `apiContext` no `beforeAll` e chame `dispose()` no `afterAll`.
- Leia tokens de `process.env` e nunca os comite.
- Use `expect.objectContaining` para validar apenas campos relevantes.
- Para isolar cookies entre navegador e API, crie um `request.newContext()` explícito.
