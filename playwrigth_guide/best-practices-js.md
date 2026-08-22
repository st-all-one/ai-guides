---
id: best-practices
title: "Boas práticas"
---

## Introdução

Este guia ajuda você a seguir as boas práticas do Playwright e a escrever testes mais resilientes.

## Filosofia de teste

### Teste o comportamento visível ao usuário

Testes automatizados devem verificar que o código da aplicação funciona para o usuário final e evitar depender de detalhes de implementação — coisas que o usuário tipicamente não usa, vê ou sabe, como o nome de uma função, se algo é um array ou a classe CSS de um elemento. O usuário vê/interage com o que é renderizado na página; seu teste deve, em geral, ver/interagir apenas com essa mesma saída renderizada.

### Torne os testes o mais isolados possível

Cada teste deve ser completamente isolado de outro e rodar independentemente, com seu próprio local storage, session storage, dados e cookies. O [isolamento de testes](./browser-contexts.md) melhora a reprodutibilidade, facilita o debug e previne falhas em cascata.

Para evitar repetição, use [hooks before/after](./test-annotations.md). Em seu arquivo de teste, adicione um hook `before` para rodar uma parte do teste antes de cada teste, como ir para uma URL ou fazer login. Isso mantém os testes isolados. Também é aceitável uma pequena duplicação quando os testes são simples o bastante para permanecer claros.

```ts
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Roda antes de cada teste e faz login em cada página.
  await page.goto('https://github.com/login');
  await page.getByLabel('Username or email address').fill('username');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
});

test('primeiro', async ({ page }) => {
  // page está logado.
});

test('segundo', async ({ page }) => {
  // page está logado.
});
```

Você também pode reusar o estado autenticado nos testes com um [setup project](./auth.md#basic-shared-account-in-all-tests), logando uma vez e pulando o login nos demais testes.

### Evite testar dependências de terceiros

Teste apenas o que você controla. Não tente testar links para sites externos ou servidores de terceiros que você não controla — além de consumir tempo, você não controla o conteúdo da página, banners de cookie ou overlays que possam fazer o teste falhar.

Em vez disso, use a [Playwright Network API](./network.md#handle-requests) e garanta a resposta necessária.

```ts
await page.route('**/api/fetch_data_third_party_dependency', route => route.fulfill({
  status: 200,
  body: testData,
}));
await page.goto('https://example.com');
```

### Testando com um banco de dados

Se trabalha com banco de dados, controle os dados. Teste contra um ambiente de staging e garanta que ele não muda. Para testes de regressão visual, garanta que o sistema operacional e as versões de navegador sejam iguais.

## Boas práticas

### Use locators

Para escrever testes E2E, primeiro precisamos encontrar elementos na página. Use os [locators](./locators.md) embutidos do Playwright. Locators trazem auto-wait e retry-ability. Auto-wait significa que o Playwright executa checagens de actionability (como garantir que o elemento está visível e habilitado antes de clicar). Para tornar os testes resilientes, priorize atributos voltados ao usuário e contratos explícitos.

```ts
// 👍
page.getByRole('button', { name: 'submit' });
```

#### Use encadeamento e filtros

Locators podem ser [encadeados](./locators.md#matching-inside-a-locator) para restringir a busca a uma parte específica da página.

```ts
const product = page.getByRole('listitem').filter({ hasText: 'Product 2' });
```

Você também pode [filtrar locators](./locators.md#filtering-locators) por texto ou por outro locator.

```ts
await page
    .getByRole('listitem')
    .filter({ hasText: 'Product 2' })
    .getByRole('button', { name: 'Add to cart' })
    .click();
```

#### Prefira atributos voltados ao usuário a XPath ou CSS

Seu DOM pode mudar facilmente; depender da estrutura do DOM leva a testes que quebram. Por exemplo, selecionar um botão por suas classes CSS: se o designer mudar algo, a classe muda e o teste quebra.

```ts
// 👎
page.locator('button.buttonIcon.episode-actions-later');
```

Use locators resilientes a mudanças de DOM:

```ts
// 👍
page.getByRole('button', { name: 'submit' });
```

### Gere locators

O Playwright tem um [test generator](./codegen.md) que gera testes e escolhe locators para você, priorizando role, text e test id. Se o gerador encontrar múltiplos elementos, ele melhora o locator para identificar unicamente o alvo.

#### Use `codegen` para gerar locators

Para escolher um locator, rode o comando `codegen` seguido da URL.

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
npx playwright codegen playwright.dev
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright codegen playwright.dev
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright codegen playwright.dev
```

</TabItem>

</Tabs>

Isso abre uma nova janela do navegador e o Playwright Inspector. Para escolher um locator, clique no botão "Record" para parar a gravação. Com a gravação parada, o botão "Pick Locator" fica disponível. Passe o mouse sobre qualquer elemento e veja o locator destacado; clicar adiciona o locator ao Inspector, de onde você pode copiar ou editar.

<img height="1274" width="2788" alt="gerando locators com codegen" loading="lazy" src="https://user-images.githubusercontent.com/13063165/212103268-e7d8ee8b-d307-4cba-be13-831f3fbb1f40.png" />

#### Use a extensão do VS Code para gerar locators

Você também pode usar a [VS Code Extension](./getting-started-vscode.md) para gerar locators e gravar testes. Ela oferece ótima experiência ao escrever, rodar e depurar.

<img height="1684" width="2788" alt="gerando locators no vs code com codegen" loading="lazy" src="https://user-images.githubusercontent.com/13063165/212269873-aca04043-16ce-4627-906f-7351d09740ab.png" />

### Use web first assertions

Assertions verificam se o resultado esperado e o atual coincidem. Com [web first assertions](./test-assertions.md), o Playwright aguarda até que a condição seja atendida. Por exemplo, ao testar uma mensagem de alerta, o teste clica em um botão que faz a mensagem aparecer e verifica que ela está lá; se demorar meio segundo, `toBeVisible()` aguarda e tenta novamente.

```ts
// 👍
await expect(page.getByText('welcome')).toBeVisible();

// 👎
expect(await page.getByText('welcome').isVisible()).toBe(true);
```

#### Não use assertions manuais

Não use assertions manuais que não aguardam o `expect`. No código abaixo o `await` está dentro do `expect`, não antes. Com `isVisible()`, o teste não espera — apenas verifica e retorna imediatamente.

```ts
// 👎
expect(await page.getByText('welcome').isVisible()).toBe(true);
```

Use web first assertions como `toBeVisible()`:

```ts
// 👍
await expect(page.getByText('welcome')).toBeVisible();
```

> **Armadilha comum (gotcha):** a regra de ouro é "await na frente do expect". `await expect(locator).toBeVisible()` espera; `expect(await locator.isVisible()).toBe(true)` não. Essa diferença é a causa nº 1 de testes flaky.

### Configure a depuração

#### Depuração local

Para depuração local, recomendamos [depurar testes ao vivo no VS Code](./getting-started-vscode.md#debugging-your-tests) instalando a [VS Code extension](./getting-started-vscode.md). Você roda em modo debug clicando com o botão direito na linha ao lado do teste, o que abre o navegador e pausa no breakpoint.

<img height="1240" width="2676" alt="depurado testes no vscode" loading="lazy" src="https://user-images.githubusercontent.com/13063165/212274675-5c6e1647-2aab-40fd-9804-8680c1ac2d16.png" />

Você pode depurar ao vivo editando locators no VS Code, que os destacam na janela do navegador e mostram outros matches encontrados.

<img height="1404" width="2788" alt="depuração ao vivo de locators no vscode" loading="lazy" src="https://user-images.githubusercontent.com/13063165/212273189-da271dc4-0f59-4138-92a8-10e719066cbe.png" />

Também é possível depurar com o Playwright Inspector usando a flag `--debug`.

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
npx playwright test --debug
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test --debug
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test --debug
```

</TabItem>

</Tabs>

Você avança passo a passo, vê logs de actionability e edita o locator ao vivo, vendo quantos matches existem.

<img height="1736" width="2700" alt="depurado com o playwright inspector" loading="lazy" src="https://user-images.githubusercontent.com/13063165/212276296-4f5b18e7-2bd7-4766-9aa5-783517bd4aa2.png" />

Para depurar um teste específico, adicione o nome do arquivo e o número da linha do teste, seguido de `--debug`.

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
npx playwright test example.spec.ts:9 --debug
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test example.spec.ts:9 --debug
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test example.spec.ts:9 --debug
```

</TabItem>

</Tabs>

#### Depuração em CI

Para falhas em CI, use o [trace viewer](./trace-viewer.md) em vez de vídeos e screenshots. O trace viewer dá um trace completo como um PWA local que pode ser compartilhado. Você vê a timeline, inspeciona snapshots DOM de cada ação com dev tools, vê requisições de rede e mais.

<img height="1920" width="3032" alt="trace viewer do playwright" loading="lazy" src="https://user-images.githubusercontent.com/13063165/212277895-c63d94c2-bd06-4881-864e-62790a072ca3.png" />

Traces são configurados no `playwright.config.ts` e rodam por padrão no primeiro retry de um teste falho. Não recomendamos `on` para todos os testes (é pesado). Porém, você pode rodar um trace localmente durante o desenvolvimento com `--trace`.

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
npx playwright test --trace on
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test --trace on
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test --trace on
```

</TabItem>

</Tabs>

Após o comando, os traces são gravados e podem ser vistos diretamente do HTML report.

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
npx playwright show-report
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright show-report
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright show-report
```

</TabItem>

</Tabs>

<img height="1920" width="3032" alt="HTML report do Playwright" loading="lazy" src="https://user-images.githubusercontent.com/13063165/212279022-d929d4c0-2271-486a-a75f-166ac231d25f.png" />

Os traces podem ser abertos clicando no ícone ao lado do nome do arquivo de teste ou abrindo cada relatório e rolando até a seção de traces.

<img height="2242" width="3032" alt="seção de traces no report" loading="lazy" src="https://user-images.githubusercontent.com/13063165/212279699-c9eb134f-4f4e-4f19-805c-37596d3272a6.png" />

### Use as ferramentas do Playwright

O Playwright traz várias ferramentas para ajudar a escrever testes:
- A [VS Code extension](./getting-started-vscode.md) oferece ótima experiência ao escrever, rodar e depurar.
- O [test generator](./codegen.md) gera testes e escolhe locators.
- O [trace viewer](./trace-viewer.md) dá um trace completo como PWA local.
- O [UI Mode](./test-ui-mode.md) permite explorar, rodar e depurar com experiência de time travel e watch mode.
- [TypeScript](./test-typescript.md) funciona imediatamente e melhora a integração com a IDE. Basta criar testes com extensão `.ts`.

### Teste em todos os navegadores

O Playwright facilita testar seu site em todos os [navegadores](./test-projects.md#configure-projects-for-multiple-browsers). No config, adicione projetos com nome e navegador/dispositivo.

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

### Mantenha a dependência do Playwright atualizada

Manter o Playwright atualizado permite testar nas versões mais recentes de navegadores e pegar falhas antes do lançamento público.

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
npm install -D @playwright/test@latest
```

</TabItem>

<TabItem value="yarn">

```bash
yarn add --dev @playwright/test@latest
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm install --save-dev @playwright/test@latest
```

</TabItem>

</Tabs>

Consulte as release notes oficiais do Playwright para ver a versão mais recente e as mudanças.

Você pode ver sua versão com:

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
npx playwright --version
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright --version
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright --version
```

</TabItem>

</Tabs>

### Rode testes em CI

Configure CI/CD e rode os testes com frequência — idealmente a cada commit e pull request. O Playwright traz um [GitHub actions workflow](./ci-intro.md) pronto. Ele também pode ser configurado no [CI de sua escolha](./ci.md).

Use Linux em CI (mais barato). Considere [Sharding](./test-sharding.md) para acelerar.

#### Otimize downloads de navegadores em CI

Instale apenas os navegadores necessários. Se testa só com Chromium, instale só Chromium.

```bash title=".github/workflows/playwright.yml"
# Em vez de instalar todos
npx playwright install --with-deps

# Instala apenas Chromium
npx playwright install chromium --with-deps
```

### Faça lint dos seus testes

Recomendamos TypeScript e lint com ESLint para pegar erros cedo. Use a regra [`@typescript-eslint/no-floating-promises`](https://typescript-eslint.io/rules/no-floating-promises/) para garantir que não faltam `await` antes de chamadas assíncronas da API. No CI, rode `tsc --noEmit` para checar assinaturas.

### Use paralelismo e sharding

O Playwright roda testes em [paralelo](./test-parallel.md) por padrão. Testes de um mesmo arquivo rodam em ordem, no mesmo worker. Se há muitos testes independentes em um arquivo, rode-os em paralelo:

```ts
import { test } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test('roda em paralelo 1', async ({ page }) => { /* ... */ });
test('roda em paralelo 2', async ({ page }) => { /* ... */ });
```

O Playwright pode fazer [shard](./test-parallel.md#shard-tests-between-multiple-machines) de uma suíte para rodar em múltiplas máquinas.

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
npx playwright test --shard=1/3
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test --shard=1/3
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test --shard=1/3
```

</TabItem>

</Tabs>

## Dicas de produtividade

### Use Soft assertions

Se um teste falha, o Playwright mostra a mensagem de erro (no VS Code, terminal, HTML report ou trace viewer). Você também pode usar [soft assertions](./test-assertions.md#soft-assertions), que não encerram a execução imediatamente, mas compilam e exibem a lista de falhas ao final.

```ts
// Faz algumas verificações que não param o teste ao falhar...
await expect.soft(page.getByTestId('status')).toHaveText('Success');

// ... e continua o teste para checar mais coisas.
await page.getByRole('link', { name: 'next page' }).click();
```

## Exemplo completo de configuração e teste

Um `playwright.config.ts` que reúne boas práticas (multi-navegador, trace no retry, lint-friendly) e um teste correspondente:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

```ts title="tests/signup.spec.ts"
import { test, expect } from '@playwright/test';

test('cadastro com sucesso mostra saudação', async ({ page }) => {
  await page.goto('/signup');

  await page.getByLabel('Nome').fill('Maria');
  await page.getByLabel('E-mail').fill('maria@example.com');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  // Web-first: aguarda a saudação aparecer.
  await expect(page.getByText('Bem-vinda, Maria!')).toBeVisible();
});
```

## Resumo das boas práticas

- Teste comportamento visível ao usuário; evite detalhes de implementação.
- Isole cada teste (Browser Context); reutilize setup via `beforeEach`/fixtures.
- Não teste dependências de terceiros; simule com `page.route`.
- Use locators voltados ao usuário (`getByRole`, `getByLabel`, `getByText`, `getByTestId`).
- Sempre `await expect(...)` (web first); nunca assertions manuais síncronas.
- Depure com UI Mode/`--debug` localmente e trace viewer em CI.
- Mantenha o Playwright atualizado e rode em CI com frequência.
- Use paralelismo/sharding para acelerar suítes grandes.
