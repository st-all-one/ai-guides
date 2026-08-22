---
id: test-configuration
title: "Configuração"
---

## Introdução

O Playwright Test oferece inúmeras opções para configurar como seus testes são executados. Todas elas são declaradas no arquivo de configuração (`playwright.config.ts`). É importante notar que as opções do test runner ficam no **nível superior** do objeto — não as coloque dentro da seção `use`.

O arquivo de configuração é um módulo TypeScript normal que exporta um objeto criado por `defineConfig()`. Usar `defineConfig` traz autocompletar e checagem de tipos no seu editor.

## Configuração básica

Veja abaixo um exemplo completo e realista de `playwright.config.ts` com as opções mais comuns. Salve este arquivo na raiz do projeto.

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Diretório onde ficam os arquivos de teste, relativo a este arquivo de configuração.
  testDir: 'tests',

  // Roda todos os testes em paralelo (dentro e entre arquivos).
  fullyParallel: true,

  // Falha a build no CI caso você deixe um test.only sem querer no código-fonte.
  forbidOnly: !!process.env.CI,

  // Tenta novamente (retries) apenas no CI, onde flakiness é mais nociva.
  retries: process.env.CI ? 2 : 0,

  // Desliga o paralelismo no CI para facilitar a leitura de logs (ou por limite de recursos).
  // `undefined` usa o padrão local (50% dos cores).
  workers: process.env.CI ? 1 : undefined,

  // Reporter padrão. 'html' gera um relatório interativo.
  reporter: 'html',

  use: {
    // baseURL usada em ações como `await page.goto('/')`.
    baseURL: 'http://localhost:3000',

    // Coleta trace apenas na primeira tentativa falha (otimiza tempo/espaço).
    trace: 'on-first-retry',
  },

  // Configura projetos para os principais navegadores.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Sobe o servidor de desenvolvimento local antes de iniciar os testes.
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    // Reaproveita um servidor já em execução localmente; no CI sempre sobe um novo.
    reuseExistingServer: !process.env.CI,
  },
});
```

| Opção | Descrição |
| :- | :- |
| `testDir` | Diretório onde ficam os arquivos de teste. |
| `fullyParallel` | Faz com que todos os testes de todos os arquivos rodem em paralelo. Veja [Paralelismo](./test-parallel.md) e [Sharding](./test-sharding.md) para mais detalhes. |
| `forbidOnly` | Se deve sair com erro caso existam testes marcados com `test.only`. Útil no CI. |
| `projects` | Roda os testes em múltiplas configurações ou em múltiplos navegadores. Veja [Projetos](./test-projects.md). |
| `reporter` | Reporter a ser usado. Veja [Test Reporters](./test-reporters.md) para conhecer os disponíveis. |
| `retries` | Número máximo de tentativas (retries) por teste. Veja [Test Retries](./test-retries.md). |
| `use` | Opções aplicadas via `use{}` (ex.: `baseURL`, `headless`, `viewport`). |
| `webServer` | Para subir um servidor durante os testes, use a opção `webServer`. Veja [Web Server](./test-webserver.md). |
| `workers` | Número máximo de processos worker concorrentes para paralelizar os testes. Também pode ser definido como porcentagem dos cores lógicos, ex.: `'50%'`. Veja [Paralelismo](./test-parallel.md) e [Sharding](./test-sharding.md). |

## Filtragem de testes

Filtre quais arquivos de teste serão executados por meio de padrões glob ou expressões regulares.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Padrões glob ou expressões regulares de arquivos a IGNORAR.
  testIgnore: '*test-assets',

  // Padrões glob ou expressões regulares que CASAM com arquivos de teste.
  testMatch: '*todo-tests/*.spec.ts',
});
```

| Opção | Descrição |
| :- | :- |
| `testIgnore` | Padrões glob ou expressões regulares que devem ser ignorados ao procurar arquivos de teste. Ex.: `'*test-assets'`. |
| `testMatch` | Padrões glob ou expressões regulares que casam com arquivos de teste. Ex.: `'*todo-tests/*.spec.ts'`. Por padrão, o Playwright roda arquivos `.*(test\|spec)\.(js\|ts\|mjs)`. |

## Configuração avançada

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Pasta para artefatos de teste como screenshots, vídeos, traces etc.
  outputDir: 'test-results',

  // Caminho para o arquivo de global setup.
  globalSetup: require.resolve('./global-setup'),

  // Caminho para o arquivo de global teardown.
  globalTeardown: require.resolve('./global-teardown'),

  // Cada teste tem 30 segundos de timeout.
  timeout: 30000,
});
```

| Opção | Descrição |
| :- | :- |
| `globalSetup` | Caminho para o arquivo de global setup. Ele será requerido e executado antes de todos os testes. Deve exportar uma única função. Veja [Global Setup e Teardown](./test-global-setup-teardown.md). |
| `globalTeardown` | Caminho para o arquivo de global teardown. Executado depois de todos os testes. Deve exportar uma única função. |
| `outputDir` | Pasta para artefatos de teste como screenshots, vídeos, traces etc. |
| `timeout` | O Playwright impõe um [timeout](./test-timeouts.md) para cada teste, 30 segundos por padrão. O tempo gasto pela função de teste, fixtures de teste e hooks `beforeEach` está incluso no timeout do teste. |

## Opções do expect

Configuração para a biblioteca de assertions `expect`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    // Tempo máximo que expect() deve aguardar até a condição ser atendida.
    timeout: 5000,

    toHaveScreenshot: {
      // Quantidade aceitável de pixels diferentes, indefinido por padrão.
      maxDiffPixels: 10,
    },

    toMatchSnapshot: {
      // Proporção aceitável de pixels diferentes em relação ao total, entre 0 e 1.
      maxDiffPixelRatio: 0.1,
    },
  },
});
```

| Opção | Descrição |
| :- | :- |
| `expect` | [Web-first assertions](./test-assertions.md) como `expect(locator).toHaveText()` têm um timeout separado de 5 segundos por padrão. É o tempo máximo que `expect()` deve aguardar. Saiba mais sobre [timeouts de teste e expect](./test-timeouts.md) e como defini-los para um único teste. |
| `expect.toHaveScreenshot` | Configuração para o método `expect(locator).toHaveScreenshot()`. |
| `expect.toMatchSnapshot` | Configuração para o método `expect(locator).toMatchSnapshot()`. |

## Quando usar cada opção

- **`fullyParallel: true`** — use em quase todos os projetos; seus testes devem ser independentes. Desligue apenas se houver estado compartilhado difícil de isolar.
- **`retries`** — deixe `0` localmente (falha rápido) e ative no CI (`2` ou `3`) para absorver flakiness da infraestrutura.
- **`workers`** — use o padrão (`'50%'`) localmente; reduza no CI se houver concorrência por recursos externos (banco de dados, APIs de terceiros).
- **`webServer`** — essencial para testes E2E contra a aplicação; combine com `reuseExistingServer` para não subir servidor duas vezes em dev.
- **`forbidOnly`** — sempre `true` no CI para evitar que `test.only` passe despercebido e esconda regressões.

## Armadilhas comuns (gotchas)

- **Opções no lugar errado:** `baseURL`, `headless`, `viewport`, `actionTimeout` etc. vão em `use`, não no nível superior. Já `testDir`, `workers`, `retries` ficam no topo.
- **`testMatch` sobrescreve o padrão:** se você definir `testMatch`, os arquivos padrão `*.spec.ts` deixam de ser automaticamente inclusos se não casarem com seu padrão.
- **`timeout` vs `expect.timeout`:** o timeout do teste (padrão 30s) engloba tudo; o do `expect` (padrão 5s) vale só para a asserção. Se uma asserção precisa de mais tempo, aumente `expect.timeout` em vez do timeout do teste inteiro.
- **`workers: 1` esconde paralelismo quebrado:** se usar `workers: 1` para "estabilizar" testes, isso mascara testes que não são isolados. Corrija o isolamento em vez de desligar o paralelismo.

## Exemplo completo

Um `playwright.config.ts` de produção, com múltiplos navegadores, trace habilitado e servidor web:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

## Boas práticas

- Mantenha o `playwright.config.ts` na raiz e versionado no git.
- Use `defineConfig` sempre — ele dá autocompletar e valida tipos.
- Prefira configurar `baseURL` no `use` e usar `page.goto('/caminho')` nos testes (caminhos relativos).
- Ative `trace: 'on-first-retry'` no CI para diagnosticar falhas sem pagar o custo de trace em todos os testes.
- Separe configurações por ambiente usando [projetos](./test-projects.md) em vez de mexer na configuração manualmente.
