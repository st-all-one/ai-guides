---
id: auth
title: "Autenticação"
---

## Introdução

O Playwright executa testes em ambientes isolados chamados [browser contexts](./browser-contexts.md). Esse modelo de isolamento melhora a reprodutibilidade e evita falhas em cascata. Os testes podem carregar um estado autenticado existente. Isso elimina a necessidade de autenticar em cada teste e acelera a execução.

### Quando usar

- **Compartilhar uma conta** para testes que não alteram estado no servidor.
- **Uma conta por worker paralelo** para testes que modificam estado no servidor.
- **Múltiplos papéis** (admin/usuário) no mesmo teste.
- **Autenticação via API** quando é mais rápida que a UI.

## Conceitos centrais

Independentemente da estratégia de autenticação escolhida, você provavelmente armazenará o estado autenticado do navegador no sistema de arquivos.

Recomendamos criar o diretório `playwright/.auth` e adicioná-lo ao seu `.gitignore`. Sua rotina de autenticação produzirá o estado autenticado e o salvará em um arquivo nesse diretório. Depois, os testes reutilizarão esse estado e iniciarão já autenticados.

:::danger
O arquivo de estado do navegador pode conter cookies e cabeçalhos sensíveis que poderiam ser usados para se passar por você ou pela sua conta de teste. Desencorajamos fortemente versioná-los em repositórios privados ou públicos.
:::

```bash
mkdir -p playwright/.auth
echo $'\nplaywright/.auth' >> .gitignore
```

## Básico: conta compartilhada em todos os testes

Esta é a abordagem **recomendada** para testes **sem estado no servidor**. Autentique uma vez no **setup project**, salve o estado de autenticação e reutilize-o para inicializar cada teste já autenticado.

**Quando usar**

- Quando você consegue imaginar todos os seus testes rodando ao mesmo tempo com a mesma conta, sem afetar uns aos outros.

**Quando não usar**

- Seus testes modificam estado no servidor. Por exemplo, um teste verifica a renderização da página de configurações, enquanto outro teste está alterando a configuração e você roda os testes em paralelo. Nesse caso, os testes devem usar contas diferentes.
- Sua autenticação é específica do navegador.

**Detalhes**

Crie `tests/auth.setup.ts` que preparará o estado autenticado do navegador para todos os outros testes.

```ts title="tests/auth.setup.ts"
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Execute as etapas de autenticação. Substitua estas ações pelas suas próprias.
  await page.goto('https://github.com/login');
  await page.getByLabel('Username or email address').fill('username');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Aguarda até que a página receba os cookies.
  //
  // Às vezes o fluxo de login define cookies durante vários redirects.
  // Aguarde a URL final para garantir que os cookies estejam efetivamente definidos.
  await page.waitForURL('https://github.com/');
  // Alternativamente, você pode aguardar até que a página atinja um estado onde todos os cookies foram definidos.
  await expect(page.getByRole('button', { name: 'View profile and more' })).toBeVisible();

  // Fim das etapas de autenticação.

  await page.context().storageState({ path: authFile });
});
```

Crie um novo projeto `setup` na config e declare-o como uma [dependência](./test-projects.md#dependencies) para todos os seus projetos de teste. Esse projeto sempre rodará e autenticará antes de todos os testes. Todos os projetos de teste devem usar o estado autenticado como `storageState`.

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    // Projeto de setup
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usa o estado de auth preparado.
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Usa o estado de auth preparado.
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

Os testes iniciam já autenticados porque especificamos `storageState` na config.

```ts title="tests/example.spec.ts"
import { test } from '@playwright/test';

test('test', async ({ page }) => {
  // page já está autenticado
});
```

Note que você precisa excluir o estado armazenado quando ele expirar. Se não precisar manter o estado entre execuções de teste, escreva o estado do navegador em [`outputDir` do TestProject](./test-projects.md#testproject-outputdir), que é limpo automaticamente antes de cada execução.

### Autenticando no UI mode

O UI mode não rodará o projeto `setup` por padrão para melhorar a velocidade dos testes. Recomendamos autenticar executando manualmente o `auth.setup.ts` de tempos em tempos, sempre que a autenticação existente expirar.

Primeiro [habilite o projeto `setup` nos filtros](./test-ui-mode-js.md#filtering-tests), depois clique no botão de triângulo ao lado do arquivo `auth.setup.ts` e, em seguida, desabilite o projeto `setup` nos filtros novamente.

## Moderado: uma conta por worker paralelo

Esta é a abordagem **recomendada** para testes que **modificam estado no servidor**. No Playwright, os processos worker rodam em paralelo. Nessa abordagem, cada worker paralelo é autenticado uma vez. Todos os testes rodados pelo worker reutilizam o mesmo estado de autenticação. Precisaremos de várias contas de teste, uma por worker paralelo.

**Quando usar**

- Seus testes modificam estado compartilhado no servidor. Por exemplo, um teste verifica a renderização da página de configurações, enquanto outro teste está alterando a configuração.

**Quando não usar**

- Seus testes não modificam nenhum estado compartilhado no servidor. Nesse caso, todos os testes podem usar uma única conta compartilhada.

**Detalhes**

Vamos autenticar uma vez por [processo worker](./test-parallel-js.md#worker-processes), cada um com uma conta única.

Crie o arquivo `playwright/fixtures.ts` que vai [sobrescrever o fixture `storageState`](./test-fixtures-js.md#overriding-fixtures) para autenticar uma vez por worker. Use [`parallelIndex` de TestInfo](./test-fixtures-js.md) para diferenciar os workers.

```ts title="playwright/fixtures.ts"
import { test as baseTest, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export * from '@playwright/test';
export const test = baseTest.extend<{}, { workerStorageState: string }>({
  // Usa o mesmo storage state para todos os testes deste worker.
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  // Autentica uma vez por worker com um fixture de escopo worker.
  workerStorageState: [async ({ browser }, use) => {
    // Usa parallelIndex como identificador único para cada worker.
    const id = test.info().parallelIndex;
    const fileName = path.resolve(test.info().project.outputDir, `.auth/${id}.json`);

    if (fs.existsSync(fileName)) {
      // Reutiliza o estado de autenticação existente, se houver.
      await use(fileName);
      return;
    }

    // Importante: garanta autenticar em um ambiente limpo desconfigurando o storage state.
    const page = await browser.newPage({ storageState: undefined });

    // Obtém uma conta única, por exemplo criando uma nova.
    // Alternativamente, você pode ter uma lista de contas pré-criadas para teste.
    // Garanta que as contas sejam únicas, para que vários membros do time
    // possam rodar testes ao mesmo tempo sem interferência.
    const account = await acquireAccount(id);

    // Execute as etapas de autenticação. Substitua estas ações pelas suas próprias.
    await page.goto('https://github.com/login');
    await page.getByLabel('Username or email address').fill(account.username);
    await page.getByLabel('Password').fill(account.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Aguarda até que a página receba os cookies.
    await page.waitForURL('https://github.com/');
    await expect(page.getByRole('button', { name: 'View profile and more' })).toBeVisible();

    // Fim das etapas de autenticação.

    await page.context().storageState({ path: fileName });
    await page.close();
    await use(fileName);
  }, { scope: 'worker' }],
});

// Função auxiliar fictícia; implemente conforme sua estratégia de contas de teste.
async function acquireAccount(id: number) {
  return { username: `user-${id}`, password: 'password' };
}
```

Agora, cada arquivo de teste deve importar `test` do nosso arquivo de fixtures em vez de `@playwright/test`. Nenhuma mudança é necessária na config.

```ts title="tests/example.spec.ts"
// Importante: importe nossos fixtures.
import { test, expect } from '../playwright/fixtures';

test('test', async ({ page }) => {
  // page já está autenticado
});
```

## Autenticar via requisição de API

**Quando usar**

- Sua aplicação Web suporta autenticação via API que é mais fácil/rápida que interagir com a UI da aplicação.

**Detalhes**

Vamos enviar a requisição de API com [APIRequestContext](./api-testing-js.md) e então salvar o estado autenticado como de costume.

No [setup project](#básico-conta-compartilhada-em-todos-os-testes):

```ts title="tests/auth.setup.ts"
import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ request }) => {
  // Envia a requisição de autenticação. Substitua pela sua própria.
  await request.post('https://github.com/login', {
    form: {
      'user': 'user',
      'password': 'password'
    }
  });
  await request.storageState({ path: authFile });
});
```

Alternativamente, em um [fixture de worker](#moderado-uma-conta-por-worker-paralelo):

```ts title="playwright/fixtures.ts"
import { test as baseTest, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export * from '@playwright/test';
export const test = baseTest.extend<{}, { workerStorageState: string }>({
  // Usa o mesmo storage state para todos os testes deste worker.
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  // Autentica uma vez por worker com um fixture de escopo worker.
  workerStorageState: [async ({}, use) => {
    // Usa parallelIndex como identificador único para cada worker.
    const id = test.info().parallelIndex;
    const fileName = path.resolve(test.info().project.outputDir, `.auth/${id}.json`);

    if (fs.existsSync(fileName)) {
      // Reutiliza o estado de autenticação existente, se houver.
      await use(fileName);
      return;
    }

    // Importante: garanta autenticar em um ambiente limpo desconfigurando o storage state.
    const context = await request.newContext({ storageState: undefined });

    // Obtém uma conta única, por exemplo criando uma nova.
    const account = await acquireAccount(id);

    // Envia a requisição de autenticação. Substitua pela sua própria.
    await context.post('https://github.com/login', {
      form: {
        'user': account.username,
        'password': account.password
      }
    });

    await context.storageState({ path: fileName });
    await context.dispose();
    await use(fileName);
  }, { scope: 'worker' }],
});

async function acquireAccount(id: number) {
  return { username: `user-${id}`, password: 'password' };
}
```

## Múltiplos papéis autenticados

**Quando usar**

- Você tem mais de um papel nos seus testes end-to-end, mas pode reutilizar contas em todos os testes.

**Detalhes**

Vamos autenticar múltiplas vezes no setup project.

```ts title="tests/auth.setup.ts"
import { test as setup, expect } from '@playwright/test';

const adminFile = 'playwright/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  // Execute as etapas de autenticação. Substitua estas ações pelas suas próprias.
  await page.goto('https://github.com/login');
  await page.getByLabel('Username or email address').fill('admin');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('https://github.com/');
  await expect(page.getByRole('button', { name: 'View profile and more' })).toBeVisible();

  // Fim das etapas de autenticação.
  await page.context().storageState({ path: adminFile });
});

const userFile = 'playwright/.auth/user.json';

setup('authenticate as user', async ({ page }) => {
  // Execute as etapas de autenticação. Substitua estas ações pelas suas próprias.
  await page.goto('https://github.com/login');
  await page.getByLabel('Username or email address').fill('user');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('https://github.com/');
  await expect(page.getByRole('button', { name: 'View profile and more' })).toBeVisible();

  // Fim das etapas de autenticação.
  await page.context().storageState({ path: userFile });
});
```

Depois, especifique `storageState` para cada arquivo de teste ou grupo de testes, **em vez de** defini-lo na config.

```ts title="tests/example.spec.ts"
import { test } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/admin.json' });

test('admin test', async ({ page }) => {
  // page está autenticado como admin
});

test.describe(() => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('user test', async ({ page }) => {
    // page está autenticado como usuário
  });
});
```

Veja também sobre [autenticar no UI mode](#autenticando-no-ui-mode).

### Testando múltiplos papéis juntos

**Quando usar**

- Você precisa testar como múltiplos papéis autenticados interagem juntos, em um único teste.

**Detalhes**

Use múltiplos [BrowserContext](./browser-contexts.md) e [Page](./pages.md) com diferentes storage states no mesmo teste.

```ts title="tests/example.spec.ts"
import { test } from '@playwright/test';

test('admin and user', async ({ browser }) => {
  // adminContext e todas as páginas dentro, incluindo adminPage, estão logadas como "admin".
  const adminContext = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
  const adminPage = await adminContext.newPage();

  // userContext e todas as páginas dentro, incluindo userPage, estão logadas como "user".
  const userContext = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const userPage = await userContext.newPage();

  // ... interaja com adminPage e userPage ...

  await adminContext.close();
  await userContext.close();
});
```

### Testando múltiplos papéis com fixtures POM

**Quando usar**

- Você precisa testar como múltiplos papéis autenticados interagem juntos, em um único teste.

**Detalhes**

Você pode introduzir fixtures que fornecerão uma página autenticada como cada papel.

Abaixo há um exemplo que [cria fixtures](./test-fixtures-js.md#creating-a-fixture) para dois [Page Object Models](./pom.md) — admin POM e user POM. Assume que os arquivos `adminStorageState.json` e `userStorageState.json` foram criados no setup global.

```ts title="playwright/fixtures.ts"
import { test as base, type Page, type Locator } from '@playwright/test';

// Page Object Model para a página "admin".
class AdminPage {
  // Page logada como "admin".
  page: Page;

  // Exemplo de locator apontando para a saudação "Welcome, Admin".
  greeting: Locator;

  constructor(page: Page) {
    this.page = page;
    this.greeting = page.locator('#greeting');
  }
}

// Page Object Model para a página "user".
class UserPage {
  // Page logada como "user".
  page: Page;

  // Exemplo de locator apontando para a saudação "Welcome, User".
  greeting: Locator;

  constructor(page: Page) {
    this.page = page;
    this.greeting = page.locator('#greeting');
  }
}

// Declare os tipos dos seus fixtures.
type MyFixtures = {
  adminPage: AdminPage;
  userPage: UserPage;
};

export * from '@playwright/test';
export const test = base.extend<MyFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    const adminPage = new AdminPage(await context.newPage());
    await use(adminPage);
    await context.close();
  },
  userPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
    const userPage = new UserPage(await context.newPage());
    await use(userPage);
    await context.close();
  },
});
```

```ts title="tests/example.spec.ts"
// Importe o test com nossos novos fixtures.
import { test, expect } from '../playwright/fixtures';

// Use os fixtures adminPage e userPage no teste.
test('admin and user', async ({ adminPage, userPage }) => {
  // ... interaja com adminPage e userPage ...
  await expect(adminPage.greeting).toHaveText('Welcome, Admin');
  await expect(userPage.greeting).toHaveText('Welcome, User');
});
```

### Session storage

A reutilização de estado autenticado cobre autenticação baseada em [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies), [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage), [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) e passkey ([WebAuthn](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)). Raramente, [session storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) é usado para armazenar informações associadas ao estado logado. O session storage é específico de um domínio e não persiste entre recarregamentos de página. O Playwright não fornece API para persistir session storage, mas o snippet a seguir pode ser usado para salvar/carregar session storage.

```ts title="tests/session-storage.spec.ts"
import { test, expect } from '@playwright/test';
import fs from 'fs';

// Obtém o session storage e armazena como arquivo.
const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage));
fs.writeFileSync('playwright/.auth/session.json', sessionStorage, 'utf-8');

// Define o session storage em um novo contexto.
const stored = JSON.parse(fs.readFileSync('playwright/.auth/session.json', 'utf-8'));
await context.addInitScript(storage => {
  if (window.location.hostname === 'example.com') {
    for (const [key, value] of Object.entries(storage))
      window.sessionStorage.setItem(key, value);
  }
}, stored);
```

### Evitar autenticação em alguns testes

Você pode redefinir o storage state em um arquivo de teste para evitar a autenticação que foi configurada para todo o projeto.

```ts title="not-signed-in.spec.ts"
import { test } from '@playwright/test';

// Redefine o storage state deste arquivo para evitar estar autenticado.
test.use({ storageState: { cookies: [], origins: [] } });

test('not signed in test', async ({ page }) => {
  // ...
});
```

### Boas práticas

- Use sempre o `setup` project com `dependencies` para evitar login repetido em cada teste.
- Nunca versione `playwright/.auth/*.json`; adicione o diretório ao `.gitignore`.
- Aguarde a URL final ou um elemento pós-login antes de salvar `storageState` (cookies podem ser definidos após redirects).
- Para testes que mudam estado, prefira uma conta por worker para evitar interferência.

### Armadilhas comuns

- Estado expirado: se o login expirar, os testes falham com "não autenticado"; rode o `auth.setup.ts` manualmente no UI mode.
- `storageState` definido no `test.use` sobrescreve o da config — cuidado ao misturar.
- Não esqueça de `await context.close()`/`dispose()` nos exemplos que criam contextos manualmente.

## Exemplo completo

Setup compartilhado + teste autenticado que valida a presença de um elemento pós-login, reutilizando o `storageState` preparado no projeto `setup`:

```ts title="tests/dashboard.spec.ts"
import { test, expect } from '@playwright/test';

// storageState vem da config (preparado por tests/auth.setup.ts).
test('dashboard mostra painel do usuário', async ({ page }) => {
  await page.goto('https://github.com/');
  await expect(page.getByRole('button', { name: 'View profile and more' })).toBeVisible();
  await expect(page.locator('.dashboard')).toBeVisible();
});
```

```ts title="tests/auth.setup.ts"
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('https://github.com/login');
  await page.getByLabel('Username or email address').fill(process.env.USERNAME!);
  await page.getByLabel('Password').fill(process.env.PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('https://github.com/');
  await expect(page.getByRole('button', { name: 'View profile and more' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```
