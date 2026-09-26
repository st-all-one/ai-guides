---
id: emulation
title: "Emulação de dispositivos, locale, geolocalização e mais (TypeScript)"
---

## Introdução

Com o Playwright você pode testar sua aplicação em qualquer navegador e ainda emular um dispositivo real (celular ou tablet). Basta configurar os dispositivos desejados e o Playwright simula o comportamento do navegador: `userAgent`, `screenSize`, `viewport` e `hasTouch`. Você também pode emular `geolocation`, `locale` e `timezone` para todos os testes ou para um teste específico, além de definir `permissions` (notificações) e alterar o `colorScheme`.

> **Importante:** toda configuração abaixo usa `@playwright/test`. As opções de contexto (`viewport`, `locale`, `permissions` etc.) são passadas em `use` no `playwright.config.ts` ou via `test.use()`.

### Quando usar

- Testar responsividade e layout mobile/tablet sem hardware físico.
- Validar comportamento dependente de `locale`/`timezone` (formatação de datas, moedas).
- Validar permissões (notificações, geolocalização) e esquemas de cor (dark/light).
- Simular condições de rede (`offline`) e ausência de JavaScript.

## Dispositivos

O Playwright já vem com um [registro de parâmetros de dispositivos](https://github.com/microsoft/playwright/blob/main/packages/isomorphic/deviceDescriptorsSource.json) acessível via `devices`, cobrindo desktops, tablets e celulares selecionados. Ele simula user agent, tamanho de tela, viewport e `hasTouch`.

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],
});
```

Para configurar manualmente um contexto mobile, passe as mesmas opções ao `use` do projeto:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'Pixel 7',
      use: {
        viewport: { width: 412, height: 839 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 12; Pixel 7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/94.0.4606.71 Mobile Safari/537.36',
      },
    },
  ],
});
```

> **Nota:** os dispositivos pré-configurados assumem uma plataforma específica. Por exemplo, `"Desktop Chrome"` fornece uma string de user agent específica do Windows. Se quiser usar o user agent da plataforma que roda os testes, remova a propriedade `userAgent`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        userAgent: undefined,
      },
    },
  ],
});
```

## Viewport

O viewport já vem incluído no dispositivo, mas você pode sobrescrevê-lo para alguns testes com `test.use` ou via config.

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Defina `viewport` DEPOIS de espalhar `devices`,
        // pois os devices também definem o `viewport`.
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
```

Por teste, no arquivo de teste:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 1600, height: 1200 },
});

test('meu teste', async ({ page }) => {
  // ...
});
```

O mesmo funciona agrupando por `test.describe`:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test.describe('bloco com viewport específico', () => {
  test.use({ viewport: { width: 1600, height: 1200 } });

  test('meu teste', async ({ page }) => {
    // ...
  });
});
```

## isMobile

Define se a meta tag viewport é levada em conta e se eventos de toque estão habilitados.

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        isMobile: false,
      },
    },
  ],
});
```

## Locale & Timezone

Emula o Locale e o Timezone do navegador, definidos globalmente na config e sobrescritos por teste específico.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Emula o locale do navegador.
    locale: 'en-GB',
    // Emula o timezone do navegador.
    timezoneId: 'Europe/Paris',
  },
});
```

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test.use({
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
});

test('meu teste em de lang no timezone de Berlim', async ({ page }) => {
  await page.goto('https://www.bing.com');
  // ...
});
```

> **Nota:** isso afeta apenas o locale e o timezone do navegador, não o timezone do test runner. Para definir o timezone do test runner, use a [variável de ambiente `TZ`](https://nodejs.org/api/cli.html#tz).

## Permissions

Permite que a aplicação mostre notificações do sistema.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    permissions: ['notifications'],
  },
});
```

Permite notificações para um domínio específico:

```ts title="tests/example.spec.ts"
import { test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  // Concede permissão a cada página de https://skype.com
  await context.grantPermissions(['notifications'], { origin: 'https://skype.com' });
});

test('primeiro', async ({ page }) => {
  // a página tem permissão de notificações para https://skype.com.
});
```

Revoga todas as permissões com `BrowserContext.clearPermissions`:

```ts
await context.clearPermissions();
```

## Geolocation

Concede permissão de `"geolocation"` e define a geolocalização para uma área específica.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    geolocation: { longitude: 12.492507, latitude: 41.889938 },
    permissions: ['geolocation'],
  },
});
```

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test.use({
  geolocation: { longitude: 41.890221, latitude: 12.492348 },
  permissions: ['geolocation'],
});

test('meu teste com geolocalização', async ({ page, context }) => {
  // sobrescreve a localização para este teste
  await context.setGeolocation({ longitude: 48.858455, latitude: 2.294474 });
});
```

> **Nota:** você só pode alterar a geolocalização para todas as páginas do contexto.

## Color Scheme e Media

Emula o `"colorScheme"` do usuário (`'light'` ou `'dark'`). Você também pode emular o media type com `Page.emulateMedia`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    colorScheme: 'dark',
  },
});
```

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test.use({
  colorScheme: 'dark', // ou 'light'
});

test('meu teste em modo escuro', async ({ page }) => {
  // ...
});
```

Alterar color scheme/media em runtime:

```ts
// Altera o color scheme da página
await page.emulateMedia({ colorScheme: 'dark' });

// Altera o media da página
await page.emulateMedia({ media: 'print' });
```

## User Agent

O User Agent já vem incluído no dispositivo. Para testar um user agent diferente, sobrescreva com a propriedade `userAgent`:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test.use({ userAgent: 'Meu user agent' });

test('meu teste de user agent', async ({ page }) => {
  // ...
});
```

## Offline

Emula a rede estando offline.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    offline: true,
  },
});
```

## JavaScript habilitado

Emula um cenário onde o JavaScript está desabilitado.

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('teste sem JavaScript', async ({ page }) => {
  // ...
});
```

## Exemplo completo

Arquivo `playwright.config.ts` com múltiplos projetos emulando dispositivos, locale, geolocalização e esquema de cor:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        colorScheme: 'light',
      },
    },
    {
      name: 'iPhone 13',
      use: {
        ...devices['iPhone 13'],
        permissions: ['geolocation'],
        geolocation: { longitude: -46.6333, latitude: -23.5505 },
        colorScheme: 'dark',
      },
    },
  ],
});
```

## Armadilhas comuns

- **Ordem de `viewport`/`isMobile` após `...devices`:** sempre defina essas propriedades **depois** de espalhar o device, senão o valor do device sobrescreve o seu.
- **Conceder permissão sem informar `origin`:** `grantPermissions` sem `origin` aplica ao contexto inteiro; para um domínio específico, passe `{ origin }`.
- **Esperar geolocalização por página:** `setGeolocation` afeta todas as páginas do contexto, não apenas uma.
- **`offline: true` some com a rede:** certifique-se de que recursos locais (ou `webServer`) estejam disponíveis, senão o teste falha ao navegar.

## Boas práticas

- Use projetos (`projects`) no `playwright.config.ts` para cobrir vários dispositivos/locales em paralelo ([Test Projects](./test-projects-js.md)).
- Defina emulações globalmente no `use` e sobrescreva pontualmente com `test.use()` apenas onde necessário.
- Combine emulação com [`test.use`](./test-use-options-js.md) para cenários de teste bem delimitados.
- Prefira `devices[...]` em vez de hardcoded para manter consistência com navegadores reais.
