---
id: test-global-setup-teardown
title: "Global setup e teardown"
---

## Introdução

Existem duas formas de configurar um setup e teardown global: usar um arquivo de global setup definido na config sob [`globalSetup`](#option-2-configure-globalsetup-and-globalteardown) ou usar [dependências de projeto](#option-1-project-dependencies). Com dependências de projeto, você define um projeto que roda antes de todos os outros projetos. Esta é a abordagem recomendada, pois integra melhor com o runner do Playwright Test: seu HTML report incluirá o global setup, traces serão gravados e fixtures podem ser usadas. Para uma comparação detalhada das duas abordagens, veja a tabela abaixo.

| Feature                          | Project Dependencies (recomendado) | `globalSetup` (opção de config)      |
|----------------------------------|-------------------------------------|-----------------------------------|
| Roda antes de todos os testes    | ✅ Sim                              | ✅ Sim         |
| Visibilidade no HTML report      | ✅ Exibido como um projeto separado | ❌ Não exibido                   |
| Gravação de trace                | ✅ Trace completo disponível        | ❌ Não suportado                  |
| Fixtures do Playwright           | ✅ Totalmente suportado             | ❌ Não suportado                  |
| Gerenciamento de browser         | ✅ Via fixture `browser`            | ❌ Manual via `browserType.launch()` |
| Paralelismo e retries            | ✅ Suportado via config padrão      | ❌ Não aplicável                  |
| Opções de config como `headless` ou `testIdAttribute` | ✅ Aplicadas automaticamente | ❌ Ignoradas                  |

## Option 1: Project Dependencies

[Dependências de projeto](./test-projects-js.md) são uma lista de projetos que precisam rodar antes dos testes de outro projeto. Elas são úteis para configurar ações de global setup de forma que um projeto dependa desta execução primeiro. Usar dependências permite que o global setup produza traces e outros artefatos.

### Quando usar

- Você precisa de um setup que apareça no relatório HTML e gere trace para depuração.
- O setup depende de fixtures (ex.: `browser`, `request`) ou de opções de config (`headless`, `baseURL`).
- Você quer que o setup participe de paralelismo e retries como qualquer outro teste.
- O teardown deve rodar depois de todos os projetos dependentes (limpeza de banco, parar serviços).

### Armadilhas comuns

- O arquivo de setup deve ser casado pelo `testMatch` do projeto de setup; se o padrão for muito aberto, testes reais podem cair no projeto errado.
- `teardown` só roda após **todos** os projetos dependentes terminarem; não o use para limpeza por projeto individual.
- `--no-deps` ignora dependências e teardowns; útil para rodar um teste isolado, mas cuidado para não pular setup obrigatório.
- O UI Mode não executa automaticamente projetos de setup/teardown dependentes — rode-os manualmente antes.

### Setup

Primeiro adicionamos um novo projeto com o nome `'setup db'`. Em seguida damos a ele a propriedade `testMatch` para casar o arquivo chamado `global.setup.ts`:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // ...
  projects: [
    {
      name: 'setup db',
      testMatch: /global\.setup\.ts/,
    },
    // {
    //   outro projeto
    // }
  ]
});
```

Depois adicionamos a propriedade `dependencies` aos projetos que dependem do projeto de setup, passando no array o nome do projeto de dependência que definimos na etapa anterior:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // ...
  projects: [
    {
      name: 'setup db',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium with db',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup db'],
    },
  ]
});
```

Neste exemplo o projeto `'chromium with db'` depende do projeto `'setup db'`. Criamos então um setup test, armazenado na raiz do seu projeto (observe que o código de setup e teardown deve ser definido como testes regulares chamando a função `test`):

```ts title="tests/global.setup.ts"
import { test as setup } from '@playwright/test';

setup('create new database', async ({ }) => {
  console.log('creating new database...');
  // Inicializa o banco de dados
});
```

```ts title="tests/menu.spec.ts"
import { test, expect } from '@playwright/test';

test('menu', async ({ page }) => {
  // Seu teste que depende do banco de dados
});
```

### Teardown

Você pode fazer o teardown do setup adicionando a propriedade `teardown` ao seu projeto de setup. Isso rodará depois que todos os projetos dependentes tiverem rodado.

Primeiro adicionamos a propriedade `teardown` ao projeto de setup com o nome `'cleanup db'`, que é o nome que demos ao projeto de teardown na etapa anterior:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // ...
  projects: [
    {
      name: 'setup db',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup db',
    },
    {
      name: 'cleanup db',
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup db'],
    },
  ]
});
```

Depois criamos um arquivo `global.teardown.ts` no diretório de testes do projeto. Ele será usado para deletar os dados do banco após todos os testes terem rodado.

```ts title="tests/global.teardown.ts"
import { test as teardown } from '@playwright/test';

teardown('delete database', async ({ }) => {
  console.log('deleting test database...');
  // Deleta o banco de dados
});
```

### Test filtering

Todas as opções de filtragem de testes, como `--grep`/`--grep-invert`, `--shard`, filtragem direta por localização na linha de comando ou usar `test.only()`, selecionam diretamente os testes primários a serem rodados. Se esses testes pertencem a um projeto com dependências, todos os testes dessas dependências também rodarão.

Você pode passar a opção `--no-deps` na linha de comando para ignorar todas as dependências e teardowns. Apenas os projetos selecionados diretamente rodarão.

## Option 2: Configure globalSetup and globalTeardown

Você pode usar a opção `globalSetup` no [arquivo de configuração](./test-configuration-js.md) para configurar algo uma única vez antes de rodar todos os testes. O arquivo de global setup deve exportar uma única função que recebe um objeto de config. Essa função rodará uma vez antes de todos os testes.

Similarmente, use `globalTeardown` para rodar algo uma vez após todos os testes. Alternativamente, deixe `globalSetup` retornar uma função que será usada como teardown global. Você pode passar dados como número de porta, tokens de autenticação etc. do seu global setup para seus testes usando variáveis de ambiente.

:::note
Cuidado: `globalSetup` e `globalTeardown` não têm alguns recursos — veja a [seção de introdução](#introdução) para uma comparação detalhada. Considere usar [dependências de projeto](#option-1-project-dependencies) em vez disso para obter suporte completo a recursos.
:::

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
});
```

### Quando usar

- Setup muito simples que não precisa de browser nem fixtures do Playwright (ex.: subir um container, limpar uma fila).
- Compartilhar um segredo/estado via `process.env` para todos os testes sem aparecer no relatório.
- Você já tem um script Node legado e quer reutilizá-lo sem convertê-lo em projeto de testes.

### Armadilhas comuns

- `globalSetup` roda fora do modelo de fixtures do Playwright: você não tem `page`, `browser` ou `request` prontos; precisa lançar o browser manualmente.
- Opções de config como `headless` e `testIdAttribute` **não** são aplicadas dentro do `globalSetup`.
- Não há trace nem presença no HTML report — falhas de setup são mais difíceis de depurar.
- `globalTeardown` retornado de `globalSetup` deve lidar com erros para não mascarar a falha original.

### Example

Aqui está um exemplo de global setup que autentica uma vez e reutiliza o estado de autenticação nos testes. Ele usa as opções `baseURL` e `storageState` do arquivo de configuração.

```ts title="global-setup.ts"
import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseURL!);
  await page.getByLabel('User Name').fill('user');
  await page.getByLabel('Password').fill('password');
  await page.getByText('Sign in').click();
  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default globalSetup;
```

Especifique `globalSetup`, `baseURL` e `storageState` no arquivo de configuração.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  use: {
    baseURL: 'http://localhost:3000/',
    storageState: 'state.json',
  },
});
```

Os testes já iniciam autenticados porque especificamos `storageState` que foi populado pelo global setup.

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('/');
  // Você já está logado!
});
```

Você pode disponibilizar dados arbitrários nos seus testes a partir do seu arquivo de global setup definindo-os como variáveis de ambiente via `process.env`.

```ts title="global-setup.ts"
import type { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  process.env.FOO = 'some data';
  // Ou uma estrutura de dados mais complexa como JSON:
  process.env.BAR = JSON.stringify({ some: 'data' });
}

export default globalSetup;
```

Os testes têm acesso às propriedades `process.env` definidas no global setup.

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // variáveis de ambiente definidas no globalSetup só estão disponíveis dentro de test()
  const { FOO, BAR } = process.env;

  // propriedades FOO e BAR estão populadas
  expect(FOO).toEqual('some data');

  const complexData = JSON.parse(BAR!);
  expect(complexData).toEqual({ some: 'data' });
});
```

### Capturando trace de falhas durante o global setup

Em alguns casos, pode ser útil capturar um trace das falhas encontradas durante o global setup. Para isso, você deve [iniciar o tracing](./test-configuration-js.md) no seu setup e garantir que [pare o tracing](./test-configuration-js.md) se um erro ocorrer antes que esse erro seja lançado. Isso pode ser feito envolvendo seu setup em um bloco `try...catch`. Aqui está um exemplo que expande o global setup anterior para capturar um trace.

```ts title="global-setup.ts"
import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await context.tracing.start({ screenshots: true, snapshots: true });
    await page.goto(baseURL!);
    await page.getByLabel('User Name').fill('user');
    await page.getByLabel('Password').fill('password');
    await page.getByText('Sign in').click();
    await context.storageState({ path: storageState as string });
    await context.tracing.stop({
      path: './test-results/setup-trace.zip',
    });
    await browser.close();
  } catch (error) {
    await context.tracing.stop({
      path: './test-results/failed-setup-trace.zip',
    });
    await browser.close();
    throw error;
  }
}

export default globalSetup;
```

## Exemplo completo

Abaixo um exemplo executável completo usando a abordagem recomendada (dependências de projeto) para um setup de banco de dados + autenticação, com teardown:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
```

```ts title="tests/global.setup.ts"
import { test as setup } from '@playwright/test';

setup('seed do banco', async ({ request }) => {
  // cria dados iniciais via API, por exemplo
  await request.post('/api/seed', { data: { scenario: 'default' } });
});
```

```ts title="tests/global.teardown.ts"
import { test as teardown } from '@playwright/test';

teardown('limpeza do banco', async ({ request }) => {
  await request.delete('/api/seed');
});
```

```ts title="tests/smoke.spec.ts"
import { test, expect } from '@playwright/test';

test('usa os dados do seed', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bem-vindo')).toBeVisible();
});
```

## Boas práticas

- Prefira **dependências de projeto** (Option 1) em vez de `globalSetup` sempre que precisar de browser, fixtures, trace ou visibilidade no relatório.
- Dê nomes claros e estáveis aos projetos de setup/teardown (`setup`, `cleanup`) e referencie-os exatamente em `dependencies`/`teardown`.
- Use `testMatch` restrito (regex) para que apenas o arquivo de setup caia no projeto de setup.
- No `globalSetup` manual, sempre feche o browser e capture trace no `catch` para não esconder a causa da falha.
- Use `process.env` para passar apenas dados serializáveis (strings) do setup para os testes.
