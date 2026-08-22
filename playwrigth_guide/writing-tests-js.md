---
id: writing-tests
title: "Escrevendo testes"
---

## Introdução

Os testes do Playwright são simples: eles **executam ações** e **fazem asserções** sobre o estado da página, comparando-o com as expectativas.

O Playwright aguarda automaticamente as verificações de [actionability](./actionability.md) (capacidade de ação) antes de executar cada ação. Você não precisa adicionar esperas manuais nem lidar com condições de corrida (race conditions). As assertions do Playwright são projetadas para descrever expectativas que serão atendidas *eventualmente*, eliminando timeouts frágeis e verificações incertas.

**O que você vai aprender**

- [Como escrever o primeiro teste](#primeiro-teste)
- [Como executar ações](#ações)
- [Como usar assertions](#assertions)
- [Como os testes rodam em isolamento](#isolamento-de-testes)
- [Como usar hooks de teste](#usando-hooks-de-teste)

## Primeiro teste

Veja abaixo um exemplo completo e executável de um arquivo de teste. Salve-o como `tests/example.spec.ts`:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('possui o título correto', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Espera que o título "contém" uma substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('link de get started', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Clica no link "Get started".
  await page.getByRole('link', { name: 'Get started' }).click();

  // Espera que a página tenha um heading com o nome "Installation".
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
```

> **Dica de ambiente:** teste este arquivo com o comando `npx playwright test`. Para checagem de tipos automática no VS Code, nomeie o arquivo com a extensão `.ts`; o suporte a TypeScript funciona imediatamente com `@playwright/test`, sem configuração extra.

### Estrutura mínima de um projeto

Para que o exemplo acima funcione, você precisa de um projeto Playwright mínimo:

```bash
npm init playwright@latest
```

Esse comando cria `playwright.config.ts`, a pasta `tests/` e instala os navegadores. Um `playwright.config.ts` mínimo útil:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'https://playwright.dev/',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

Com `baseURL` configurado, você pode usar caminhos relativos: `await page.goto('/');`.

## Ações

### Navegação

A maioria dos testes começa navegando para uma URL. Depois disso, o teste interage com os elementos da página.

```ts
await page.goto('https://playwright.dev/');
```

O Playwright aguarda a página atingir o estado de *load* antes de continuar. Veja as opções de [`page.goto`](./locators.md) para controlar o estado de espera (`waitUntil`), timeout, etc.

### Interações

Toda ação começa localizando elementos. O Playwright usa a [Locators API](./locators.md) para isso. Locators representam uma forma de encontrar elemento(s) na página a qualquer momento. O Playwright aguarda que o elemento esteja [actionable](./actionability.md) antes de executar a ação — ou seja, você não precisa esperar que ele fique disponível.

```ts
// Cria um locator.
const getStarted = page.getByRole('link', { name: 'Get started' });

// Clica nele.
await getStarted.click();
```

Na maioria dos casos, isso é escrito em uma linha:

```ts
await page.getByRole('link', { name: 'Get started' }).click();
```

> **Boa prática:** armazene locators reutilizáveis em constantes quando for interagir com o mesmo elemento várias vezes, em vez de encadear chamadas longas e repetidas.

### Ações básicas

Aqui estão as ações mais comuns do Playwright. Para a lista completa, consulte o guia de [locators](./locators.md):

| Ação | Descrição |
| :- | :- |
| `locator.check()` | Marca um checkbox |
| `locator.click()` | Clica no elemento |
| `locator.uncheck()` | Desmarca um checkbox |
| `locator.hover()` | Passa o mouse sobre o elemento |
| `locator.fill()` | Preenche um campo de formulário (texto) |
| `locator.focus()` | Foca o elemento |
| `locator.press()` | Pressiona uma tecla |
| `locator.setInputFiles()` | Seleciona arquivos para upload |
| `locator.selectOption()` | Seleciona uma opção em um `<select>` |
| `locator.dragTo()` | Arrasta para outro elemento |
| `locator.scrollIntoViewIfNeeded()` | Rola até o elemento, se necessário |

**Exemplo completo de formulário:**

```ts title="tests/form.spec.ts"
import { test, expect } from '@playwright/test';

test('preenche e envia um formulário', async ({ page }) => {
  await page.goto('/contact');

  await page.getByLabel('Nome').fill('Maria');
  await page.getByLabel('E-mail').fill('maria@example.com');
  await page.getByPlaceholder('Digite sua mensagem').fill('Olá!');
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.getByText('Mensagem enviada')).toBeVisible();
});
```

## Assertions

O Playwright inclui [assertions](./test-assertions.md) na forma da função `expect`. Para fazer uma asserção, chame `expect(valor)` e escolha um matcher que reflita a expectativa.

As assertions do Playwright são *async* e aguardam até que a condição esperada seja atendida. Usar esses matchers torna os testes não flaky (sem falsos negativos) e resilientes. Por exemplo, este código espera até que a página tenha o título contendo "Playwright":

```ts
await expect(page).toHaveTitle(/Playwright/);
```

Aqui estão as assertions assíncronas mais populares. Para a lista completa, veja o [guia de assertions](./test-assertions.md):

| Assertion | Descrição |
| :- | :- |
| `expect(locator).toBeChecked()` | Checkbox está marcado |
| `expect(locator).toBeEnabled()` | Controle está habilitado |
| `expect(locator).toBeVisible()` | Elemento está visível |
| `expect(locator).toContainText()` | Elemento contém o texto |
| `expect(locator).toHaveAttribute()` | Elemento possui o atributo |
| `expect(locator).toHaveCount()` | Lista de elementos tem o tamanho dado |
| `expect(locator).toHaveText()` | Elemento corresponde ao texto |
| `expect(locator).toHaveValue()` | Input possui o valor |
| `expect(page).toHaveTitle()` | Página possui o título |
| `expect(page).toHaveURL()` | Página possui a URL |

O Playwright também inclui matchers genéricos como `toEqual`, `toContain`, `toBeTruthy` que podem ser usados para qualquer condição. Essas assertions **não** usam `await`, pois fazem verificações síncronas e imediatas sobre valores já disponíveis.

```ts
expect(success).toBeTruthy();
```

> **Armadilha comum (gotcha):** nunca faça `expect(await locator.isVisible()).toBe(true)`. Isso verifica o estado *agora* e não espera. Use sempre `await expect(locator).toBeVisible()`. Veja mais em [best practices](./best-practices.md#use-web-first-assertions).

### Quando usar cada tipo de assertion

- **Assertions web-first (async):** use para qualquer coisa relacionada ao DOM, texto, visibilidade, atributos — porque a UI muda de forma assíncrona.
- **Matchers genéricos (sync):** use para valores obtidos fora do DOM (respostas de API já resolvidas, variáveis JS, contagem de um array, etc.).

## Isolamento de testes

O Playwright Test é baseado no conceito de [fixtures](./test-fixtures.md), como o fixture `page` embutido, que é passado para o seu teste. As páginas são **isoladas entre testes** por conta do Browser Context, que equivale a um perfil de navegador totalmente novo. Cada teste recebe um ambiente limpo, mesmo quando vários testes rodam no mesmo navegador.

```ts title="tests/example.spec.ts"
import { test } from '@playwright/test';

test('exemplo de teste', async ({ page }) => {
  // "page" pertence a um BrowserContext isolado, criado para este teste específico.
});

test('outro teste', async ({ page }) => {
  // O "page" deste segundo teste é completamente isolado do primeiro.
});
```

**Por que importa:** o isolamento melhora a reprodutibilidade, facilita o debug e evita falhas em cascata (um teste que quebra não derruba os outros).

## Usando hooks de teste

Você pode usar diversos [hooks](./test-annotations.md) como `test.describe` para declarar um grupo de testes e `test.beforeEach` / `test.afterEach`, executados antes/depois de cada teste. Outros hooks incluem `test.beforeAll` / `test.afterAll`, executados uma vez por *worker* antes/depois de todos os testes.

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test.describe('navegação', () => {
  test.beforeEach(async ({ page }) => {
    // Vai para a URL inicial antes de cada teste.
    await page.goto('https://playwright.dev/');
  });

  test('navegação principal', async ({ page }) => {
    // As asserções usam a API expect.
    await expect(page).toHaveURL('https://playwright.dev/');
  });
});
```

> **Quando usar `beforeEach` vs `beforeAll`:** use `beforeEach` para estado que deve ser fresco em cada teste (ex.: navegar para a home). Use `beforeAll` para setup caro que pode ser compartilhado (ex.: login único com [reuso de estado autenticado](./best-practices.md)). Nunca compartilhe `page` entre testes via `beforeAll` — isso quebra o isolamento.

## Exemplo completo

Um teste realista combinando navegação, locator, ação e assertion:

```ts title="tests/login.spec.ts"
import { test, expect } from '@playwright/test';

test.describe('fluxo de login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login com credenciais válidas', async ({ page }) => {
    await page.getByLabel('Usuário').fill('admin');
    await page.getByLabel('Senha').fill('secret');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Web-first assertion: aguarda o dashboard aparecer.
    await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('mostra erro com credenciais inválidas', async ({ page }) => {
    await page.getByLabel('Usuário').fill('admin');
    await page.getByLabel('Senha').fill('errada');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Credenciais inválidas')).toBeVisible();
  });
});
```

## Boas práticas

- Prefira sempre [locators voltados ao usuário](./locators.md) (`getByRole`, `getByLabel`, `getByText`, `getByTestId`) em vez de CSS/XPath frágeis.
- Use `await expect(...)` para tudo que envolva a UI.
- Mantenha cada teste isolado; reaproveite setup via `beforeEach` ou fixtures, não via estado global compartilhado.
- Nomeie arquivos e testes de forma descritiva (português ou inglês, mas consistente).

## Próximos passos

- [Rodar um teste, vários testes ou modo headed](./running-tests.md)
- [Gerar testes com o Codegen](./codegen-intro.md)
- [Ver o trace dos seus testes](./trace-viewer-intro.md)
- [Explorar o UI Mode](./test-ui-mode.md)
- [Rodar testes em CI com GitHub Actions](./ci-intro.md)
