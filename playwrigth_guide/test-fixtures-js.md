---
id: test-fixtures
title: "Fixtures"
---

## Introdução

O Playwright Test é baseado no conceito de **fixtures**. Fixtures servem para estabelecer o ambiente de cada teste, entregando a ele tudo o que precisa e nada além disso. Fixtures são **isoladas entre testes**. Com fixtures, você agrupa testes pelo seu significado, em vez de pelo setup em comum.

Ao contrário de `beforeEach`/`afterEach` tradicionais, fixtures:
- **Encapsulam** setup e teardown no mesmo lugar.
- São **reutilizáveis** entre arquivos de teste.
- São **on-demand**: só são montadas se o teste as usar.
- São **componíveis**: podem depender umas das outras.
- São **flexíveis** e simplificam o **agrupamento**.

### Fixtures nativas (built-in)

Você já usou fixtures no seu primeiro teste. O argumento `{ page }` diz ao Playwright Test para montar a fixture `page` e entregá-la à sua função de teste.

```ts
import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});
```

Principais fixtures pré-definidas que você usará na maior parte do tempo:

| Fixture | Tipo | Descrição |
| :- | :- | :- |
| `page` | `Page` | Página isolada para esta execução de teste. |
| `context` | `BrowserContext` | Contexto isolado para esta execução. A fixture `page` pertence a este contexto. Veja como [configurar o context](./test-configuration.md). |
| `browser` | `Browser` | Navegadores são compartilhados entre testes para otimizar recursos. Veja como [configurar navegadores](./test-configuration.md). |
| `browserName` | `string` | Nome do navegador rodando o teste: `chromium`, `firefox` ou `webkit`. |
| `request` | `APIRequestContext` | Instância isolada de `APIRequestContext` para esta execução. Veja [API testing](./api-testing.md). |

### Sem fixtures (estilo tradicional)

Veja como o setup tradicional com `beforeEach`/`afterEach` e um [Page Object](./pom.md) se compara ao estilo baseado em fixtures. `TodoPage` é uma classe que encapsula a interação com a página de "todo list" da aplicação.

```ts title="todo-page.ts"
import type { Page, Locator } from '@playwright/test';

export class TodoPage {
  private readonly inputBox: Locator;
  private readonly todoItems: Locator;

  constructor(public readonly page: Page) {
    this.inputBox = this.page.locator('input.new-todo');
    this.todoItems = this.page.getByTestId('todo-item');
  }

  async goto() {
    await this.page.goto('https://demo.playwright.dev/todomvc/');
  }

  async addToDo(text: string) {
    await this.inputBox.fill(text);
    await this.inputBox.press('Enter');
  }

  async remove(text: string) {
    const todo = this.todoItems.filter({ hasText: text });
    await todo.hover();
    await todo.getByLabel('Delete').click();
  }

  async removeAll() {
    while ((await this.todoItems.count()) > 0) {
      await this.todoItems.first().hover();
      await this.todoItems.getByLabel('Delete').first().click();
    }
  }
}
```

```ts title="todo.spec.ts"
import { test } from '@playwright/test';
import { TodoPage } from './todo-page';

test.describe('todo tests', () => {
  let todoPage: TodoPage;

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.addToDo('item1');
    await todoPage.addToDo('item2');
  });

  test.afterEach(async () => {
    await todoPage.removeAll();
  });

  test('should add an item', async () => {
    await todoPage.addToDo('my item');
    // ...
  });

  test('should remove an item', async () => {
    await todoPage.remove('item1');
    // ...
  });
});
```

### Com fixtures

A mesma lógica, reescrita como uma fixture `todoPage`. Note como setup e teardown ficam juntos e o teste só declara o que precisa.

```ts title="example.spec.ts"
import { test as base } from '@playwright/test';
import { TodoPage } from './todo-page';

// Estende o teste base fornecendo a fixture "todoPage".
const test = base.extend<{ todoPage: TodoPage }>({
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.addToDo('item1');
    await todoPage.addToDo('item2');

    // Entrega o valor da fixture ao teste.
    await use(todoPage);

    // Teardown da fixture.
    await todoPage.removeAll();
  },
});

test('should add an item', async ({ todoPage }) => {
  await todoPage.addToDo('my item');
  // ...
});

test('should remove an item', async ({ todoPage }) => {
  await todoPage.remove('item1');
  // ...
});
```

## Criando uma fixture

Use `test.extend` para criar um novo objeto `test` que inclui a sua fixture. Abaixo criamos duas fixtures, `todoPage` e `settingsPage`, seguindo o [Page Object Model](./pom.md).

```ts title="my-test.ts"
import { test as base } from '@playwright/test';
import { TodoPage } from './todo-page';
import { SettingsPage } from './settings-page';

// Declara os tipos das suas fixtures.
type MyFixtures = {
  todoPage: TodoPage;
  settingsPage: SettingsPage;
};

// Estende o teste base fornecendo "todoPage" e "settingsPage".
// Este novo "test" pode ser usado em vários arquivos de teste.
export const test = base.extend<MyFixtures>({
  todoPage: async ({ page }, use) => {
    // Setup da fixture.
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.addToDo('item1');
    await todoPage.addToDo('item2');

    // Usa o valor da fixture no teste.
    await use(todoPage);

    // Teardown da fixture.
    await todoPage.removeAll();
  },

  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
});

export { expect } from '@playwright/test';
```

:::note
Os nomes de fixtures customizadas devem começar com letra ou `_` e conter apenas letras, números e `_`.
:::

O `SettingsPage` usado acima:

```ts title="settings-page.ts"
import type { Page } from '@playwright/test';

export class SettingsPage {
  constructor(public readonly page: Page) {}

  async switchToDarkMode() {
    // ...
  }
}
```

## Usando uma fixture

Basta mencionar a fixture no argumento da função de teste. As fixtures também estão disponíveis em hooks e em outras fixtures. Com TypeScript, as fixtures são type-safe.

```ts
import { test, expect } from './my-test';

test.beforeEach(async ({ settingsPage }) => {
  await settingsPage.switchToDarkMode();
});

test('basic test', async ({ todoPage, page }) => {
  await todoPage.addToDo('something nice');
  await expect(page.getByTestId('todo-title')).toContainText(['something nice']);
});
```

## Sobrescrevendo fixtures

Além de criar suas próprias fixtures, você pode sobrescrever fixtures existentes. O exemplo a seguir sobrescreve `page` para navegar automaticamente até o `baseURL`:

```ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ baseURL, page }, use) => {
    await page.goto(baseURL);
    await use(page);
  },
});
```

Repare que a fixture `page` depende de outra fixture nativa, `baseURL`. Podemos configurar `baseURL` no arquivo de configuração, ou localmente no arquivo de teste com `test.use`:

```ts title="example.spec.ts"
test.use({ baseURL: 'https://playwright.dev' });
```

Fixtures também podem ser sobrescritas por completo, substituindo a fixture base por outra coisa. Por exemplo, sobrescrever `storageState` para fornecer nossos próprios dados de autenticação:

```ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  storageState: async ({}, use) => {
    const cookie = await getAuthCookie();
    await use({ cookies: [cookie] });
  },
});

## Fixtures com escopo de worker

O Playwright Test usa [processos worker](./test-parallel.md) para rodar arquivos de teste. Assim como as fixtures de teste são montadas por execução de teste, as fixtures de worker são montadas por processo worker. É lá que você sobe serviços, roda servidores etc. O runner reaproveita o worker para quantos arquivos conseguir, desde que suas fixtures de worker coincidam.

Abaixo criamos uma fixture `account` compartilhada por todos os testes do mesmo worker, e sobrescrevemos `page` para logar nessa conta em cada teste. Para gerar contas únicas usamos `workerInfo.workerIndex`. Note a sintaxe de tupla — passamos `{ scope: 'worker' }` para montar a fixture uma vez por worker.

Além de rodar uma vez por worker, fixtures com escopo de worker têm um timeout próprio igual ao timeout do teste. Veja [fixture timeout](#fixture-timeout).

```ts title="my-test.ts"
import { test as base } from '@playwright/test';

type Account = {
  username: string;
  password: string;
};

// O segundo parâmetro de template recebe os tipos das fixtures de worker.
export const test = base.extend<{}, { account: Account }>({
  account: [async ({ browser }, use, workerInfo) => {
    // Username único por worker.
    const username = 'user' + workerInfo.workerIndex;
    const password = 'verysecure';

    // Cria a conta com o Playwright.
    const page = await browser.newPage();
    await page.goto('/signup');
    await page.getByLabel('User Name').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByText('Sign up').click();
    await expect(page.getByTestId('result')).toHaveText('Success');
    await page.close();

    // Entrega o valor da conta.
    await use({ username, password });
  }, { scope: 'worker' }],

  page: async ({ page, account }, use) => {
    // Loga com a nossa conta.
    const { username, password } = account;
    await page.goto('/signin');
    await page.getByLabel('User Name').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByText('Sign in').click();
    await expect(page.getByTestId('userinfo')).toHaveText(username);

    // Usa a página já logada no teste.
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

## Fixtures automáticas

Fixtures automáticas são montadas para cada teste/worker, **mesmo quando o teste não as lista diretamente**. Use a sintaxe de tupla com `{ auto: true }`.

O exemplo anexa automaticamente logs de debug quando o teste falha, para revisão no reporter. Usa o objeto `TestInfo`, disponível em cada teste/fixture, para obter metadados.

```ts title="my-test.ts"
import debug from 'debug';
import os from 'os';
import fs from 'fs';
import { test as base } from '@playwright/test';

export const test = base.extend<{ saveLogs: void }>({
  saveLogs: [async ({}, use, testInfo) => {
    // Coleta logs durante o teste.
    const logs: string[] = [];
    debug.log = (...args) => logs.push(args.map(String).join(' '));
    debug.enable('myserver');

    await use();

    // Após o teste, verifica se passou ou falhou.
    if (testInfo.status !== testInfo.expectedStatus) {
      // outputPath() garante um nome de arquivo único.
      const logFile = testInfo.outputPath('logs.txt');
      await fs.promises.writeFile(logFile, logs.join(os.EOL), 'utf8');
      testInfo.attachments.push({ name: 'logs', contentType: 'text/plain', path: logFile });
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
```

## Fixture timeout

A fixture é considerada parte do teste, então seu setup e teardown contam para o timeout do teste. Uma fixture lenta pode causar timeout. Defina um timeout maior para a fixture e mantenha o timeout do teste pequeno.

```ts
import { test as base, expect } from '@playwright/test';

const test = base.extend<{ slowFixture: string }>({
  slowFixture: [async ({}, use) => {
    // ... operação lenta ...
    await use('hello');
  }, { timeout: 60000 }],
});

test('example test', async ({ slowFixture }) => {
  // ...
});
```

Ao contrário das fixtures de teste, cada [fixture de worker](#fixtures-com-escopo-de-worker) tem seu próprio timeout, igual ao do teste. Você pode alterá-lo da mesma forma.

## Fixtures como options

O Playwright Test suporta rodar múltiplos projetos de teste configuráveis separadamente. Use fixtures do tipo "option" para tornar suas opções declarativas e type-safe. Veja mais em [Parametrizando testes](./test-parameterize.md).

Criamos a opção `defaultItem` além da fixture `todoPage`. Esta opção é definida no arquivo de configuração. Note a sintaxe de tupla com `{ option: true }`.

```ts title="my-test.ts"
import { test as base } from '@playwright/test';
import { TodoPage } from './todo-page';

// Declara suas opções para checagem de tipos na configuração.
export type MyOptions = {
  defaultItem: string;
};
type MyFixtures = {
  todoPage: TodoPage;
};

// Especifica os tipos de opção e de fixture.
export const test = base.extend<MyOptions & MyFixtures>({
  // Define uma opção com valor padrão. Podemos sobrescrevê-la no config.
  defaultItem: ['Something nice', { option: true }],

  // Nossa fixture "todoPage" depende da opção.
  todoPage: async ({ page, defaultItem }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.addToDo(defaultItem);
    await use(todoPage);
    await todoPage.removeAll();
  },
});

export { expect } from '@playwright/test';
```

E no config:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';
import type { MyOptions } from './my-test';

export default defineConfig<MyOptions>({
  projects: [
    {
      name: 'shopping',
      use: { defaultItem: 'Buy milk' },
    },
    {
      name: 'wellbeing',
      use: { defaultItem: 'Exercise!' },
    },
  ],
});
```

**Array como valor de opção**

Se o valor da opção é um array, ex.: `[{ name: 'Alice' }, { name: 'Bob' }]`, envolva-o em um array extra ao fornecer o valor.

```ts
type Person = { name: string };
const test = base.extend<{ persons: Person[] }>({
  // Declara a opção; valor padrão é um array vazio.
  persons: [[], { option: true }],
});

// Valor da opção é um array de pessoas.
const actualPersons = [{ name: 'Alice' }, { name: 'Bob' }];
test.use({
  // CORRETO: envolva o valor em um array e passe o escopo.
  persons: [actualPersons, { scope: 'test' }],
});

test.use({
  // ERRADO: passar o array diretamente não funciona.
  persons: actualPersons,
});
```

**Resetando uma opção**

Defina a opção como `undefined` para voltar ao valor do config. Considere o config abaixo:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'https://playwright.dev',
  },
});
```

Configuramos `baseURL` num arquivo e optamos por sair dele em um teste:

```ts title="intro.spec.ts"
import { test } from '@playwright/test';

// Configura baseURL para este arquivo.
test.use({ baseURL: 'https://playwright.dev/docs/intro' });

test('check intro contents', async ({ page }) => {
  // Usa "https://playwright.dev/docs/intro".
});

test.describe(() => {
  // Reseta para o valor definido no config.
  test.use({ baseURL: undefined });

  test('can navigate to intro from the home page', async ({ page }) => {
    // Usa "https://playwright.dev" do config.
  });
});
```

Para zerar completamente o valor para `undefined`, use a notação longa de fixture:

```ts title="intro.spec.ts"
import { test } from '@playwright/test';

// Remove totalmente o baseURL para este arquivo.
test.use({
  baseURL: [async ({}, use) => use(undefined), { scope: 'test' }],
});

test('no base url', async ({ page }) => {
  // Este teste não terá baseURL.
});
```

## Ordem de execução

Cada fixture tem fases de setup e teardown antes e depois da chamada `await use()` na fixture. O setup roda antes do teste/hook que a requer; o teardown roda quando a fixture não é mais usada.

Regras para determinar a ordem:
- Quando a fixture A depende da fixture B: B é montada antes de A e destruída depois de A.
- Fixtures não-automáticas são executadas de forma preguiçosa (lazy), só quando o teste/hook precisam delas.
- Fixtures de teste são destruídas após cada teste; fixtures de worker são destruídas apenas quando o processo worker é encerrado.

Considere o exemplo abaixo:

```ts
import { test as base } from '@playwright/test';

const test = base.extend<{
  testFixture: string;
  autoTestFixture: string;
  unusedFixture: string;
}, {
  workerFixture: string;
  autoWorkerFixture: string;
}>({
  workerFixture: [async ({ browser }) => {
    // setup do workerFixture...
    await use('workerFixture');
    // teardown do workerFixture...
  }, { scope: 'worker' }],

  autoWorkerFixture: [async ({ browser }) => {
    // setup do autoWorkerFixture...
    await use('autoWorkerFixture');
    // teardown do autoWorkerFixture...
  }, { scope: 'worker', auto: true }],

  testFixture: [async ({ page, workerFixture }) => {
    // setup do testFixture...
    await use('testFixture');
    // teardown do testFixture...
  }, { scope: 'test' }],

  autoTestFixture: [async () => {
    // setup do autoTestFixture...
    await use('autoTestFixture');
    // teardown do autoTestFixture...
  }, { scope: 'test', auto: true }],

  unusedFixture: [async ({ page }) => {
    // setup do unusedFixture...
    await use('unusedFixture');
    // teardown do unusedFixture...
  }, { scope: 'test' }],
});

test.beforeAll(async () => { /* ... */ });
test.beforeEach(async ({ page }) => { /* ... */ });
test('first test', async ({ page }) => { /* ... */ });
test('second test', async ({ testFixture }) => { /* ... */ });
test.afterEach(async () => { /* ... */ });
test.afterAll(async () => { /* ... */ });
```

Normalmente, se todos os testes passam e nenhum erro é lançado, a ordem de execução é a seguinte:
- setup do worker e seção `beforeAll`:
  - `browser` é montado porque é requerido por `autoWorkerFixture`.
  - `autoWorkerFixture` é montado porque fixtures automáticas de worker são sempre montadas antes de tudo.
  - `beforeAll` roda.
- seção `first test`:
  - `autoTestFixture` é montado (fixtures automáticas de teste são montadas antes do teste e de `beforeEach`).
  - `page` é montado porque é requerido no hook `beforeEach`.
  - `beforeEach` roda, depois `first test`, depois `afterEach`.
  - `page` e `autoTestFixture` são destruídos (escopo de teste).
- seção `second test`:
  - `autoTestFixture` e `page` montados novamente.
  - `workerFixture` é montado porque é requerido por `testFixture`, que o teste requer.
  - `testFixture` montado, roda o teste, depois `afterEach`.
  - `testFixture`, `page` e `autoTestFixture` destruídos.
- seção `afterAll` e teardown do worker:
  - `afterAll` roda.
  - `workerFixture`, `autoWorkerFixture` e `browser` são destruídos (escopo de worker).

Observações:
- `page` e `autoTestFixture` são montados/destruídos por teste.
- `unusedFixture` nunca é montado, pois nenhum teste/hook o usa.
- `testFixture` depende de `workerFixture` e dispara seu setup.
- `workerFixture` é montado preguiçosamente antes do segundo teste, mas destruído uma vez no encerramento do worker.
- `autoWorkerFixture` é montado para o hook `beforeAll`, mas `autoTestFixture` não.

## Combinando fixtures de múltiplos módulos

Você pode mesclar fixtures de teste de vários arquivos ou módulos:

```ts title="fixtures.ts"
import { mergeTests } from '@playwright/test';
import { test as dbTest } from 'database-test-utils';
import { test as a11yTest } from 'a11y-test-utils';

export const test = mergeTests(dbTest, a11yTest);
```

```ts title="test.spec.ts"
import { test } from './fixtures';

test('passes', async ({ database, page, a11y }) => {
  // usa as fixtures database e a11y.
});
```

## Box fixtures

Normalmente, fixtures customizadas aparecem como passos separados no UI mode, Trace Viewer e diversos relatórios. Para fixtures auxiliares pouco interessantes, isso gera ruído. Você pode ocultar os passos "boxeando" a fixture.

```ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  helperFixture: [async ({}, use) => {
    // ...
  }, { box: true }],
});
```

Você também pode marcar a fixture como `box: 'self'` para ocultar apenas aquela fixture, mas incluir os passos internos no relatório.

## Título customizado de fixture

Em vez do nome usual da fixture, você pode dar um título customizado exibido nos relatórios e mensagens de erro.

```ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  innerFixture: [async ({}, use) => {
    // ...
  }, { title: 'my fixture' }],
});
```

## Adicionando hooks globais beforeEach/afterEach

`Test.beforeEach` e `Test.afterEach` rodam antes/depois de cada teste do mesmo arquivo e mesmo bloco `describe`. Para declarar hooks que rodam antes/depois de cada teste **globalmente**, declare-os como fixtures automáticas:

```ts title="fixtures.ts"
import { test as base } from '@playwright/test';

export const test = base.extend<{ forEachTest: void }>({
  forEachTest: [async ({ page }, use) => {
    // Este código roda antes de cada teste.
    await page.goto('http://localhost:8000');
    await use();
    // Este código roda depois de cada teste.
    console.log('Last URL:', page.url());
  }, { auto: true }],  // inicia automaticamente para cada teste.
});
```

E importe as fixtures em todos os seus testes:

```ts title="mytest.spec.ts"
import { test } from './fixtures';
import { expect } from '@playwright/test';

test('basic', async ({ page }) => {
  expect(page).toHaveURL('http://localhost:8000');
  await page.goto('https://playwright.dev');
});
```

## Adicionando hooks globais beforeAll/afterAll

`Test.beforeAll` e `Test.afterAll` rodam antes/depois de todos os testes do mesmo arquivo/describe, uma vez por processo worker. Para declarar hooks que rodam antes/depois de todos os testes de **todo arquivo**, use fixtures automáticas com `scope: 'worker'`:

```ts title="fixtures.ts"
import { test as base } from '@playwright/test';

export const test = base.extend<{}, { forEachWorker: void }>({
  forEachWorker: [async ({}, use) => {
    // Este código roda antes de todos os testes do worker.
    console.log(`Starting test worker ${test.info().workerIndex}`);
    await use();
    // Este código roda depois de todos os testes do worker.
    console.log(`Stopping test worker ${test.info().workerIndex}`);
  }, { scope: 'worker', auto: true }],  // inicia automaticamente para cada worker.
});
```

E importe as fixtures em todos os seus testes:

```ts title="mytest.spec.ts"
import { test } from './fixtures';
import { expect } from '@playwright/test';

test('basic', async () => {
  // ...
});
```

Note que as fixtures ainda rodam uma vez por [processo worker](./test-parallel.md#worker-processes), mas você não precisa redeclará-las em todo arquivo.

## Quando usar fixtures

- **Estado de aplicação reutilizável** (usuário logado, banco semeado): crie uma fixture em vez de repetir `beforeEach`.
- **Dados compartilhados entre testes de um worker** (conta, conexão de DB): use fixtures com `scope: 'worker'`.
- **Configuração declarativa por projeto** (ambiente staging vs produção): use fixtures do tipo `option` + projetos.
- **Logs/telemetria automáticos**: use fixtures `auto: true` para anexar artefatos em falhas sem poluir os testes.

## Armadilhas comuns (gotchas)

- **`use` sem `await use(valor)`:** esqueça o `await use(...)` e o teste trava — a fixture nunca "entrega" o valor nem finaliza o teardown.
- **Compartilhar estado entre testes via fixture de teste:** fixtures de teste são recriadas por teste; para estado por worker, use `scope: 'worker'`.
- **Hook `beforeAll` dentro de fixture automática de teste:** código em fixture de teste roda por teste, não uma vez. Para "uma vez por worker", use `scope: 'worker', auto: true`.
- **Nome de fixture com hífen ou ponto:** não funciona — use apenas letras, números e `_`.
- **Opção array sem array extra:** ao sobrescrever uma option cujo valor é array, envolva em `[valor, { scope: 'test' }]`.

## Exemplo completo

Um módulo de fixtures realista com login automático e isolamento por worker:

```ts title="playwright/fixtures.ts"
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login-page';

type TestFixtures = {
  loginPage: LoginPage;
};
type WorkerFixtures = {
  authToken: string;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Fixture de teste: página de login pronta.
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  // Fixture de worker: token de autenticação criado uma vez por worker.
  authToken: [async ({ request }, use, workerInfo) => {
    const email = `user-${workerInfo.workerIndex}@example.test`;
    const response = await request.post('/api/signup', {
      data: { email, password: 'verysecure' },
    });
    const body = await response.json();
    await use(body.token);
  }, { scope: 'worker' }],

  // Sobrescreve page para injetar o token em cada contexto.
  page: async ({ page, authToken }, use) => {
    await page.context().addInitScript((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

```ts title="tests/auth.spec.ts"
import { test, expect } from '../playwright/fixtures';

test('user can access dashboard', async ({ loginPage }) => {
  await loginPage.signIn('user@example.test', 'verysecure');
  await expect(loginPage.page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

## Boas práticas

- Coloque fixtures customizadas em `playwright/fixtures.ts` e importe `test`/`expect` de lá (nunca misture `import { test } from '@playwright/test'` no teste).
- Prefira fixtures de teste (escopo padrão) sempre que possível; use `scope: 'worker'` só para recursos caros.
- Use `option` fixtures para parametrizar em vez de ler `process.env` direto nos testes.
- Mantenha o teardown dentro da própria fixture, logo após o `await use(...)`.
- Use `box: true` para fixtures utilitárias a fim de reduzir ruído no relatório.
```
