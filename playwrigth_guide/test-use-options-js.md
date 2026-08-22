---
id: test-use-options
title: "Configuração (use)"
---

## Introdução

Além de configurar o test runner, você também pode configurar [emulação](#opções-de-emulação), [rede](#opções-de-rede) e [gravação](#opções-de-gravação) para o [Browser] ou [BrowserContext]. Essas opções são passadas para o objeto `use: {}` no arquivo de configuração do Playwright.

Todo o conteúdo abaixo é TypeScript-first: usamos `@playwright/test` e `playwright.config.ts`. As opções de `use` aceitam tanto valores estáticos quanto sobrescritas por projeto, arquivo ou teste.

### Opções básicas

Defina a `baseURL` e o `storageState` para todos os testes:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Base URL usada em ações como `await page.goto('/')`.
    baseURL: 'http://localhost:3000',

    // Popula o contexto com um storage state salvo (útil para autenticação).
    storageState: 'state.json',
  },
});
```

| Opção | Descrição |
| :- | :- |
| `TestOptions.baseURL` | Base URL usada para todas as páginas do contexto. Permite navegar usando apenas o caminho, por exemplo `page.goto('/settings')`. |
| `TestOptions.storageState` | Popula o contexto com um storage state informado. Útil para autenticação simplificada, [saiba mais](./auth.md). |

### Opções de emulação

Com o Playwright você pode emular um dispositivo real, como um celular ou tablet. Veja nosso [guia de projetos](./test-projects.md) para mais informações sobre emulação de dispositivos. Você também pode emular `geolocation`, `locale` e `timezone` para todos os testes ou para um teste específico, além de definir `permissions` (notificações, etc.) e `colorScheme`. Veja o [guia de emulação](./emulation.md).

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Emula a media feature 'prefers-colors-scheme'.
    colorScheme: 'dark',

    // Geolocation do contexto.
    geolocation: { longitude: 12.492507, latitude: 41.889938 },

    // Emula o locale do usuário.
    locale: 'en-GB',

    // Concede permissões especificadas ao contexto do navegador.
    permissions: ['geolocation'],

    // Emula o timezone do usuário.
    timezoneId: 'Europe/Paris',

    // Viewport usado para todas as páginas do contexto.
    viewport: { width: 1280, height: 720 },
  },
});
```

| Opção | Descrição |
| :- | :- |
| `TestOptions.colorScheme` | [Emula](./emulation.md#color-scheme-and-media) a media feature `'prefers-colors-scheme'`, valores suportados: `'light'` e `'dark'`. |
| `TestOptions.geolocation` | [Geolocation](./emulation.md#geolocation) do contexto. |
| `TestOptions.locale` | [Emula](./emulation.md#locale--timezone) o locale do usuário, por exemplo `en-GB`, `de-DE`. |
| `TestOptions.permissions` | Lista de [permissões](./emulation.md#permissions) concedidas para todas as páginas do contexto. |
| `TestOptions.timezoneId` | Altera o [timezone](./emulation.md#locale--timezone) do contexto. |
| `TestOptions.viewport` | [Viewport](./emulation.md#viewport) usado para todas as páginas do contexto. |

### Opções de rede

Opções disponíveis para configurar a rede:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Se deve baixar automaticamente todos os anexos.
    acceptDownloads: false,

    // Objeto com headers HTTP adicionais enviados em cada requisição.
    extraHTTPHeaders: {
      'X-My-Header': 'value',
    },

    // Credenciais para autenticação HTTP.
    httpCredentials: {
      username: 'user',
      password: 'pass',
    },

    // Se deve ignorar erros HTTPS durante a navegação.
    ignoreHTTPSErrors: true,

    // Se deve emular a rede como offline.
    offline: true,

    // Configurações de proxy usadas para todas as páginas do teste.
    proxy: {
      server: 'http://myproxy.com:3128',
      bypass: 'localhost',
    },
  },
});
```

| Opção | Descrição |
| :- | :- |
| `TestOptions.acceptDownloads` | Se deve baixar automaticamente todos os anexos, padrão `true`. [Saiba mais](./downloads.md) sobre downloads. |
| `TestOptions.extraHTTPHeaders` | Objeto com headers HTTP adicionais enviados em cada requisição. Todos os valores devem ser strings. |
| `TestOptions.httpCredentials` | Credenciais para [autenticação HTTP](./network.md#http-authentication). |
| `TestOptions.ignoreHTTPSErrors` | Se deve ignorar erros HTTPS durante a navegação. |
| `TestOptions.offline` | Se deve emular a rede como offline. |
| `TestOptions.proxy` | [Configurações de proxy](./network.md#http-proxy) usadas para todas as páginas do teste. |

:::note
Você não precisa configurar nada para mockar requisições de rede. Basta definir uma [Route] customizada que faz o mock da rede para um contexto de navegador. Veja o [guia de mocking de rede](./network.md).
:::

### Opções de gravação

Com o Playwright você pode capturar screenshots, gravar vídeos e traces dos seus testes. Por padrão, tudo isso está desligado, mas você pode ativá-los definindo as opções `screenshot`, `video` e `trace` no `playwright.config.ts`.

Arquivos de trace, screenshots e vídeos aparecem no diretório de saída dos testes, tipicamente `test-results`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Captura screenshot após cada falha de teste.
    screenshot: 'only-on-failure',

    // Grava trace apenas na primeira retry.
    trace: 'on-first-retry',

    // Grava vídeo apenas na primeira retry.
    video: 'on-first-retry',
  },
});
```

| Opção | Descrição |
| :- | :- |
| `TestOptions.screenshot` | Captura [screenshots](./screenshots.md) do teste. Opções: `'off'`, `'on'` e `'only-on-failure'`. |
| `TestOptions.trace` | O Playwright pode produzir traces durante a execução. Depois, você pode inspecioná-los no [Trace Viewer](./trace-viewer.md). Opções: `'off'`, `'on'`, `'retain-on-failure'` e `'on-first-retry'`. |
| `TestOptions.video` | O Playwright pode gravar [vídeos](./videos.md) dos testes. Opções: `'off'`, `'on'`, `'retain-on-failure'` e `'on-first-retry'`. |

#### Modos de trace

A opção `trace` suporta vários modos que diferem em **quais execuções são gravadas** e **quais gravações são mantidas** após o teste terminar. A execução inicial é a "first run"; execuções subsequentes causadas por [retries](./test-retries.md) são "retries".

| Modo | Grava trace em | Mantém o trace quando |
| :- | :- | :- |
| `'off'` | nunca | — |
| `'on'` | toda execução | sempre |
| `'retain-on-failure'` | toda execução | aquela execução falhou |
| `'retain-on-first-failure'` | apenas primeira execução | a primeira execução falhou |
| `'retain-on-failure-and-retries'` | toda execução | aquela execução falhou, ou é uma retry |
| `'on-first-retry'` | apenas primeira retry | sempre |
| `'on-all-retries'` | toda retry | sempre |

Tabela de quais traces são mantidos em cenários comuns, assumindo `retries: 2`:

| Modo | Passa na primeira execução | Falha, depois passa na retry | Falha em toda execução |
| :- | :- | :- | :- |
| `'off'` | — | — | — |
| `'on'` | primeira execução | primeira execução + retry | todas as três execuções |
| `'retain-on-failure'` | — | primeira execução | todas as três execuções |
| `'retain-on-first-failure'` | — | primeira execução | primeira execução |
| `'retain-on-failure-and-retries'` | — | primeira execução + retry | todas as três execuções |
| `'on-first-retry'` | — | primeira retry | primeira retry |
| `'on-all-retries'` | — | primeira retry | ambas as retries |

#### Modos de vídeo

A opção `video` suporta os mesmos modos do `trace`, gravando e mantendo as gravações pelas mesmas regras.

| Modo | Grava vídeo em | Mantém o vídeo quando |
| :- | :- | :- | :- |
| `'off'` | nunca | — |
| `'on'` | toda execução | sempre |
| `'retain-on-failure'` | toda execução | aquela execução falhou |
| `'retain-on-first-failure'` | apenas primeira execução | a primeira execução falhou |
| `'retain-on-failure-and-retries'` | toda execução | aquela execução falhou, ou é uma retry |
| `'on-first-retry'` | apenas primeira retry | sempre |
| `'on-all-retries'` | toda retry | sempre |

Tabela de quais vídeos são mantidos em cenários comuns, assumindo `retries: 2`:

| Modo | Passa na primeira execução | Falha, depois passa na retry | Falha em toda execução |
| :- | :- | :- | :- |
| `'off'` | — | — | — |
| `'on'` | primeira execução | primeira execução + retry | todas as três execuções |
| `'retain-on-failure'` | — | primeira execução | todas as três execuções |
| `'retain-on-first-failure'` | — | primeira execução | primeira execução |
| `'retain-on-failure-and-retries'` | — | primeira execução + retry | todas as três execuções |
| `'on-first-retry'` | — | primeira retry | primeira retry |
| `'on-all-retries'` | — | primeira retry | ambas as retries |

### Outras opções

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Tempo máximo de cada ação como `click()`. Padrão 0 (sem limite).
    actionTimeout: 0,

    // Nome do navegador que roda os testes. Ex.: `chromium`, `firefox`, `webkit`.
    browserName: 'chromium',

    // Alterna a bypass de Content-Security-Policy.
    bypassCSP: true,

    // Canal a usar, ex.: "chrome", "chrome-beta", "msedge", "msedge-beta".
    channel: 'chrome',

    // Roda o navegador em modo headless.
    headless: false,

    // Altera o atributo data-testid padrão.
    testIdAttribute: 'pw-test-id',
  },
});
```

| Opção | Descrição |
| :- | :- |
| `TestOptions.actionTimeout` | Timeout de cada ação do Playwright em milissegundos. Padrão `0` (sem timeout). Saiba mais sobre [timeouts](./test-timeouts.md). |
| `TestOptions.browserName` | Nome do navegador que roda os testes. Padrão `'chromium'`. Opções: `chromium`, `firefox`, `webkit`. |
| `TestOptions.bypassCSP` | Alterna a bypass de Content-Security-Policy. Útil quando o CSP inclui a origem de produção. Padrão `false`. |
| `TestOptions.channel` | Canal do navegador a usar. [Saiba mais](./browsers.md) sobre navegadores e canais. |
| `TestOptions.headless` | Se roda o navegador em modo headless (sem janela visível). Padrão `true`. |
| `TestOptions.testIdAttribute` | Altera o [atributo `data-testid`](./locators.md#locate-by-test-id) padrão usado pelos locators do Playwright. |

### Mais opções de browser e contexto

Quaisquer opções aceitas por [`method: BrowserType.launch`], [`method: Browser.newContext`] ou [`method: BrowserType.connect`] podem ser colocadas em `launchOptions`, `contextOptions` ou `connectOptions`, respectivamente, na seção `use`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    launchOptions: {
      slowMo: 50,
    },
  },
});
```

Porém, as mais comuns como `headless` ou `viewport` já estão disponíveis diretamente na seção `use` — veja [opções básicas](#opções-básicas), [emulação](#opções-de-emulação) ou [rede](#opções-de-rede).

### Criação explícita de contexto e herança de opções

Se usar a fixture embutida `browser`, chamar [`method: Browser.newContext`] criará um contexto com opções herdadas da configuração:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    userAgent: 'some custom ua',
    viewport: { width: 100, height: 100 },
  },
});
```

Exemplo de teste mostrando que as opções iniciais do contexto são aplicadas:

```ts
import { test, expect } from '@playwright/test';

test('should inherit use options on context when using built-in browser fixture', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  expect(await page.evaluate(() => navigator.userAgent)).toBe('some custom ua');
  expect(await page.evaluate(() => window.innerWidth)).toBe(100);
  await context.close();
});
```

### Escopos de configuração

Você pode configurar o Playwright globalmente, por projeto ou por teste. Por exemplo, defina `locale` globalmente em `use`, sobrescreva para um projeto específico e, por fim, para um teste específico com `test.use({})`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    locale: 'en-GB',
  },
});
```

Sobrescreva opções para um projeto específico:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'de-DE',
      },
    },
  ],
});
```

Sobrescreva opções para um arquivo de teste com `test.use()`:

```ts
import { test, expect } from '@playwright/test';

test.use({ locale: 'fr-FR' });

test('example', async ({ page }) => {
  // ...
});
```

O mesmo funciona dentro de um `describe`:

```ts
import { test, expect } from '@playwright/test';

test.describe('french language block', () => {
  test.use({ locale: 'fr-FR' });

  test('example', async ({ page }) => {
    // ...
  });
});
```

### Resetar uma opção

Você pode resetar uma opção para o valor definido no arquivo de configuração. Considere a configuração abaixo que define `baseURL`:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'https://playwright.dev',
  },
});
```

Configure `baseURL` para um arquivo e opte por desativá-lo em um único teste:

```ts title="intro.spec.ts"
import { test } from '@playwright/test';

// Configura baseURL para este arquivo.
test.use({ baseURL: 'https://playwright.dev/docs/intro' });

test('check intro contents', async ({ page }) => {
  // Usa "https://playwright.dev/docs/intro".
});

test.describe(() => {
  // Reseta o valor para o definido na configuração.
  test.use({ baseURL: undefined });

  test('can navigate to intro from the home page', async ({ page }) => {
    // Usa "https://playwright.dev" da configuração.
  });
});
```

Para resetar completamente para `undefined`, use a notação longa de fixture:

```ts title="intro.spec.ts"
import { test } from '@playwright/test';

// Remove totalmente o baseURL para este arquivo.
test.use({
  baseURL: [async ({}, use) => use(undefined), { scope: 'test' }],
});

test('no base url', async ({ page }) => {
  // Este teste não terá base url.
});
```

## Quando usar

- **`baseURL`** — sempre que os testes apontam para uma mesma origem; use `page.goto('/caminho')` em vez de URLs absolutas.
- **`storageState`** — para reutilizar sessão autenticada entre testes (veja [auth](./auth.md)).
- **Opções de emulação (`locale`, `timezoneId`, `geolocation`, `colorScheme`)** — para validar comportamento regional, temas e permissões sem alterar o código da aplicação.
- **`trace: 'on-first-retry'` / `video: 'retain-on-failure'`** — no CI, para diagnosticar falhas sem custo em todos os testes.
- **`test.use()` no arquivo/teste** — para cenários específicos (ex.: testes em idioma diferente) sem poluir a configuração global.

## Armadilhas comuns

- **Opções no lugar errado:** `baseURL`, `headless`, `viewport`, `actionTimeout` vão em `use`, não no nível superior do `defineConfig`.
- **`headless` padrão:** é `true`. Se o teste depende de foco de janela/visual, lembre-se de definir `headless: false` ou rodar com `--headed`.
- **`actionTimeout: 0` é "sem limite":** isso pode travar um teste indefinidamente. Defina um valor explícito em produção.
- **Sobrescrita de `baseURL` com `undefined`:** `test.use({ baseURL: undefined })` reseta para a config, mas não "remove" totalmente; para remover use a notação longa de fixture.
- **Modo trace/vídeo `'on'`:** grava em todas as execuções e consome espaço/disco; prefira `'on-first-retry'` no CI.

## Exemplo completo

Um `playwright.config.ts` com emulação, rede e gravação configurados:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  use: {
    // Básicas
    baseURL: 'http://localhost:3000',
    storageState: 'state.json',

    // Emulação
    colorScheme: 'dark',
    locale: 'en-GB',
    timezoneId: 'Europe/Paris',
    geolocation: { longitude: 12.492507, latitude: 41.889938 },
    permissions: ['geolocation'],
    viewport: { width: 1280, height: 720 },

    // Rede
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { 'X-My-Header': 'value' },

    // Gravação
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',

    // Outras
    actionTimeout: 10000,
    headless: true,
    testIdAttribute: 'data-testid',
  },
});
```

## Boas práticas

- Centralize opções comuns em `use` na configuração e sobrescreva pontualmente com `test.use()` por arquivo/describe.
- Use `devices` do `@playwright/test` para emular dispositivos de forma consistente em projetos.
- No CI, ative `trace`/`video` apenas em falhas/retries para não inflacionar artefatos.
- Prefira `data-testid` e configure `testIdAttribute` se sua aplicação usa outro atributo de teste.
- Versione `state.json` apenas se fizer parte do fluxo de autenticação esperado; caso contrário, gere-o em um setup.
