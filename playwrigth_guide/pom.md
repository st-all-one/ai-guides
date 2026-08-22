---
id: pom
title: "Page Object Models"
---

## Introdução

Suítes de teste grandes podem ser estruturadas para otimizar a facilidade de autoria e manutenção. Page Object Models (POM) são uma dessas abordagens para estruturar sua suíte de testes.

Um page object representa uma parte da sua aplicação web. Uma aplicação de e-commerce pode ter uma home page, uma página de listagem e uma página de checkout. Cada uma pode ser representada por um page object model.

Page objects **simplificam a autoria** criando uma API de mais alto nível adequada à sua aplicação e **simplificam a manutenção** capturando os seletores de elemento em um único lugar e criando código reutilizável para evitar repetição.

## Implementação

Vamos criar uma classe auxiliar `PlaywrightDevPage` para encapsular operações comuns na página `playwright.dev`. Internamente, ela usará o objeto `page`.

```ts title="playwright-dev-page.ts"
import { expect, type Locator, type Page } from '@playwright/test';

export class PlaywrightDevPage {
  readonly page: Page;
  readonly getStartedLink: Locator;
  readonly gettingStartedHeader: Locator;
  readonly pomLink: Locator;
  readonly tocList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getStartedLink = page.locator('a', { hasText: 'Get started' });
    this.gettingStartedHeader = page.locator('h1', { hasText: 'Installation' });
    this.pomLink = page.locator('li', {
      hasText: 'Guides',
    }).locator('a', {
      hasText: 'Page Object Model',
    });
    this.tocList = page.locator('article div.markdown ul > li > a');
  }

  async goto() {
    await this.page.goto('https://playwright.dev');
  }

  async getStarted() {
    await this.getStartedLink.first().click();
    await expect(this.gettingStartedHeader).toBeVisible();
  }

  async pageObjectModel() {
    await this.getStarted();
    await this.pomLink.click();
  }
}
```

Agora podemos usar a classe `PlaywrightDevPage` nos nossos testes.

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';
import { PlaywrightDevPage } from './playwright-dev-page';

test('getting started should contain table of contents', async ({ page }) => {
  const playwrightDev = new PlaywrightDevPage(page);
  await playwrightDev.goto();
  await playwrightDev.getStarted();
  await expect(playwrightDev.tocList).toHaveText([
    `How to install Playwright`,
    `What's installed`,
    `How to run the example test`,
    `How to open the HTML test report`,
    `Write tests using web-first assertions, fixtures and locators`,
    `Run single or multiple tests; headed mode`,
    `Generate tests with Codegen`,
    `View a trace of your tests`,
  ]);
});

test('should show Page Object Model article', async ({ page }) => {
  const playwrightDev = new PlaywrightDevPage(page);
  await playwrightDev.goto();
  await playwrightDev.pageObjectModel();
  await expect(page.locator('article')).toContainText('Page Object Model is a common pattern');
});
```

## Quando usar

- **Suítes grandes ou multi-equipe:** quando muitos testes tocam as mesmas telas, centralizar seletores evita "seletor espalhado" e refatorações dolorosas.
- **Fluxos reutilizáveis:** login, navegação entre menus e checkout aparecem em dezenas de testes; um page object evita duplicação.
- **API de domínio:** exponha métodos como `addToCart()`, `loginAs(user)` em vez de cliques e seletores crus, tornando os testes legíveis.

## Armadilhas comuns

- **Page object com assertions espalhadas e também cliques:** mantenha o objeto focado em ações e consultas; deixe `expect()` no teste para mensagens de erro claras.
- **`Locator` resolvido no construtor de forma frágil:** prefira locators relativos e estáveis (texto, role, testid) em vez de seletores de CSS profundos e quebadiços.
- **Estado compartilhado entre testes:** instancie o page object dentro de cada `test` e deixe as fixtures cuidarem do isolation.
- **Page objects muito granulares ou muito gerais:** equilibre — um por tela/componente coeso, não um por elemento.

## Exemplo completo

Um page object de autenticação reutilizável em TypeScript:

```ts title="pages/LoginPage.ts"
import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

```ts title="login.spec.ts"
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('logs in with valid credentials', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login('john', 'secret');
  await login.expectLoggedIn();
});

test('shows error with invalid credentials', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login('john', 'wrong');
  await login.expectError('Invalid username or password');
});
```

## Boas práticas

- Use `type Locator` e `type Page` do `@playwright/test` para tipagem completa.
- Declare os locators como `readonly` no construtor e reaproveite-os entre métodos.
- Prefira Locators baseados em role/text/testid (`getByRole`, `getByLabel`, `getByTestId`).
- Mantenha page objects próximos aos testes (ex.: `pages/` ou `fixtures/`) e os trate como código de produção.
- Combine POM com [fixtures customizadas](./test-fixtures.md) para injetar page objects prontos nos testes.
