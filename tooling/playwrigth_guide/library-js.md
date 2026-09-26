---
id: library
title: "Library (Playwright Library vs Playwright Test)"
---

## Introdução

A **Playwright Library** fornece APIs unificadas para lançar e interagir com navegadores, enquanto o **Playwright Test** (`@playwright/test`) oferece tudo isso mais um Test Runner end-to-end totalmente gerenciado e uma experiência completa de testes.

Na grande maioria dos casos, para testes end-to-end, você vai querer usar `@playwright/test` (Playwright Test) e não `playwright` (Playwright Library) diretamente. Para começar com o Playwright Test, siga o [Guia de Introdução](./intro-js.md).

> **Foco desta documentação:** todos os exemplos abaixo estão em **TypeScript**. Quando o exemplo for da Library, usamos `import { ... } from 'playwright'`; quando for do Test Runner, usamos `import { test, expect } from '@playwright/test'`.

## Diferenças ao usar a Library

### Exemplo com a Library

O exemplo a seguir usa a Playwright Library diretamente para lançar o Chromium, navegar a uma página e verificar seu título:

```ts title="library-example.ts"
import { chromium, devices } from 'playwright';

(async () => {
  // Setup
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['iPhone 11']);
  const page = await context.newPage();

  // A parte interessante
  await context.route('**.jpg', route => route.abort());
  await page.goto('https://example.com/');

  // 👎 não é uma web-first assertion
  if (page.title() !== 'Example Domain') {
    throw new Error('Título inesperado');
  }

  // Teardown
  await context.close();
  await browser.close();
})();
```

Execute com `npx tsx library-example.ts` (ou compile com `tsc` e rode com `node`).

### Exemplo com o Test Runner

Um teste que alcança comportamento similar seria:

```ts title="tests/example.spec.ts"
import { expect, test, devices } from '@playwright/test';

test.use(devices['iPhone 11']);

test('should be titled', async ({ page, context }) => {
  await context.route('**.jpg', route => route.abort());
  await page.goto('https://example.com/');

  await expect(page).toHaveTitle('Example');
});
```

Execute com `npx playwright test`.

### Principais diferenças

| | Library (`playwright`) | Test (`@playwright/test`) |
| - | - | - |
| Instalação | `npm install playwright` | `npm init playwright@latest` (note `install` vs. `init`) |
| Instalar navegadores | Instale `@playwright/browser-chromium`, `@playwright/browser-firefox` e/ou `@playwright/browser-webkit` | `npx playwright install` ou `npx playwright install chromium` para apenas um |
| `import` de | `playwright` | `@playwright/test` |
| Inicialização | Precisa explicitamente: <ol><li>Escolher um navegador, ex.: `chromium`</li><li>Lançar com `browserType.launch()`</li><li>Criar um contexto com `browser.newContext()`, **e** passar opções explicitamente, ex.: `devices['iPhone 11']`</li><li>Criar uma página com `browserContext.newPage()`</li></ol> | Um `page` e `context` isolados são fornecidos a cada teste automaticamente, junto com outros [built-in fixtures](./test-fixtures-js.md#built-in-fixtures). Sem criação explícita — se o teste referenciar esses argumentos, o runner os cria sob demanda (lazy-initialization). |
| Assertions | Sem web-first assertions nativas | [Web-first assertions](./test-assertions-js.md) como `pageAssertions.toHaveTitle()` e `pageAssertions.toHaveScreenshot()` que auto-esperam e repetem até a condição ser satisfeita |
| Timeouts | Padrão de 30s para a maioria das operações | A maioria das operações não expira, mas cada teste tem um timeout que o faz falhar (30s por padrão) |
| Limpeza | Precisa explicitamente: <ol><li>Fechar contexto com `browserContext.close()`</li><li>Fechar navegador com `browser.close()`</li></ol> | Sem fechamento explícito dos [built-in fixtures](./test-fixtures-js.md#built-in-fixtures); o runner cuida disso |
| Execução | Com a Library, você roda o código como um script node (possivelmente compilando antes) | Com o Test Runner, usa-se `npx playwright test`. Junto com seu [config](./test-configuration-js.md), o runner cuida da compilação e de escolher o que e como rodar |

Além do acima, o Playwright Test, como um Test Runner completo, inclui:

- [Matriz de configuração e Projects](./test-configuration-js.md): no exemplo da Library, se quiséssemos rodar com um device ou navegador diferente, teríamos que alterar o script. Com o Playwright Test, basta especificar a [matriz de configurações](./test-configuration-js.md) em um lugar e ele criará uma execução do teste sob cada configuração.
- [Paralelização](./test-parallel-js.md)
- [Web-first assertions](./test-assertions-js.md)
- [Reporting](./test-reporters-js.md)
- [Retries](./test-retries-js.md)
- [Tracing facilitado](./trace-viewer-intro-js.md)
- e mais…

## Quando usar a Library (e quando não usar)

**Use a Playwright Library (`playwright`) quando:**

- Você precisa de automação fora do contexto de testes (scripts de scraping, geração de PDF, rotinas de migração, smoke tests pontuais).
- Quer integrar o Playwright em um runner ou orquestrador próprio.
- Precisa de controle fino sobre o ciclo de vida de browser/context/page.

**Use o Playwright Test (`@playwright/test`) quando:**

- Está escrevendo testes end-to-end (o caso mais comum).
- Quer isolamento, paralelização, retries, traces e reporters "de graça".
- Precisa de web-first assertions com auto-wait e retry embutidos.

> **Armadilhas comuns (gotchas):**
> - `npm install playwright` instala a Library, mas **não** cria o `playwright.config.ts` nem registra o comando `playwright test`. Para testes, prefira `npm init playwright@latest`.
> - Na Library, `page.title()` retorna uma Promise e **não** espera — use `await` e evite comparações manuais quando puder usar `expect(page).toHaveTitle(...)`.

## Uso

Use npm, yarn ou pnpm para instalar a Playwright Library em seu projeto Node.js. Veja os [requisitos de sistema](./intro-js.md#requisitos-de-sistema).

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'}
  ]
}>
<TabItem value="npm">

```bash
npm i -D playwright
```

</TabItem>

<TabItem value="yarn">

```bash
yarn add --dev playwright
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm install --save-dev playwright
```

</TabItem>

</Tabs>

Você também precisará instalar os navegadores — manualmente ou adicionando pacotes que fazem isso automaticamente.

```bash
# Baixa os navegadores Chromium, Firefox e WebKit
npx playwright install chromium firefox webkit

# Alternativamente, adicione pacotes que baixam um navegador no npm install
npm i -D @playwright/browser-chromium @playwright/browser-firefox @playwright/browser-webkit
```

Veja [gerenciamento de navegadores](./browsers.md#gerenciando-os-binários-de-navegador) para mais opções.

Uma vez instalada, você pode importar a Playwright em um script TypeScript e lançar qualquer um dos 3 navegadores (`chromium`, `firefox` e `webkit`):

```ts title="script.ts"
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  // Crie páginas, interaja com elementos de UI, faça assertions
  await browser.close();
})();
```

As APIs da Playwright são assíncronas e retornam objetos Promise. Nossos exemplos usam o [padrão async/await](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await) para facilitar a leitura. O código é envolvido em uma função arrow async anônima que se invoca.

```ts
(async () => { // início da arrow function async
  // código da função
  // ...
})(); // fim da função e () para se invocar
```

## Primeiro script

Em nosso primeiro script, vamos navegar até `https://playwright.dev/` e tirar um screenshot no WebKit.

```ts title="first-script.ts"
import { webkit } from 'playwright';

(async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage();
  await page.goto('https://playwright.dev/');
  await page.screenshot({ path: `example.png` });
  await browser.close();
})();
```

Por padrão, a Playwright roda os navegadores em modo headless. Para ver a UI do navegador, passe a flag `headless: false` ao lançar. Você também pode usar `slowMo` para desacelerar a execução. Saiba mais na seção de [ferramentas de debug](./debug.md).

```ts
firefox.launch({ headless: false, slowMo: 50 });
```

## Gerando scripts (record)

[Ferramentas de linha de comando](./test-cli-js.md) podem ser usadas para gravar interações do usuário e gerar código JavaScript/TypeScript.

```bash
npx playwright codegen wikipedia.org
```

## Downloads de navegadores

Para baixar os navegadores da Playwright, rode:

```bash
# Baixa os navegadores explicitamente
npx playwright install
```

Alternativamente, você pode adicionar os pacotes `@playwright/browser-chromium`, `@playwright/browser-firefox` e `@playwright/browser-webkit` para baixar o navegador respectivo automaticamente durante o `npm install`.

```bash
# Usa um pacote auxiliar que baixa um navegador no npm install
npm install @playwright/browser-chromium
```

**Download atrás de firewall ou proxy**

Passe a variável de ambiente `HTTPS_PROXY` para baixar através de um proxy.

```bash
# Manual
HTTPS_PROXY=https://192.0.2.1 npx playwright install

# Via pacotes auxiliares @playwright/browser-chromium, @playwright/browser-firefox, @playwright/browser-webkit
HTTPS_PROXY=https://192.0.2.1 npm install
```

No Windows (PowerShell), use:

```powershell
$Env:HTTPS_PROXY=https://192.0.2.1
npx playwright install
```

**Download a partir de um repositório de artefatos**

Por padrão, a Playwright baixa os navegadores do CDN da Microsoft. Passe a variável de ambiente `PLAYWRIGHT_DOWNLOAD_HOST` para baixar de um repositório de artefatos interno.

```bash
PLAYWRIGHT_DOWNLOAD_HOST=192.0.2.1 npx playwright install
```

No Windows (PowerShell):

```powershell
$Env:PLAYWRIGHT_DOWNLOAD_HOST=192.0.2.1
npx playwright install
```

**Pular o download de navegadores**

Em certos casos, deseja-se evitar o download de navegadores porque os binários são gerenciados separadamente. Isso pode ser feito definindo a variável `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` antes de instalar os pacotes.

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
```

No Windows (PowerShell):

```powershell
$Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm install
```

## Suporte a TypeScript

A Playwright inclui suporte nativo a TypeScript. Os tipos são importados automaticamente. Recomenda-se usar checagem de tipos para melhorar a experiência na IDE.

### Em TypeScript

O suporte a TypeScript funciona nativamente. Os tipos também podem ser importados explicitamente.

```ts
let page: import('playwright').Page;
```

> **Dica:** em projetos Library, prefira checar tipos com `tsc --noEmit` e executar com um runner de TS como [`tsx`](https://github.com/esbuild-kit/tsx) (`npx tsx script.ts`) em vez de compilar manualmente.

## Boas práticas

- Para testes end-to-end, prefira sempre `@playwright/test` — você ganha fixtures, isolamento, retries e traces sem código extra.
- Na Library, encapsule o setup/teardown em funções `async` reutilizáveis e sempre `await` os fechamentos (`context.close()`, `browser.close()`) para não vazar processos de navegador.
- Use `devices[...]` da Library para emular dispositivos móveis tanto na Library quanto no Test (via `test.use(devices[...])`).
- Mantenha scripts de Library fora da pasta `tests/` para que o Playwright Test não tente rodá-los como casos de teste.
