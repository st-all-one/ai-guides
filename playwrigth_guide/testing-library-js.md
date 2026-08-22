---
id: testing-library
title: "Migrando do Testing Library"
---

## Princípios de migração

Este guia descreve a migração para o [teste de componentes](./test-components) do Playwright a partir do [DOM Testing Library](https://testing-library.com/docs/dom-testing-library/intro/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) e [Vue Testing Library](https://testing-library.com/docs/vue-testing-library/intro/).

:::note
Se você usa DOM Testing Library no navegador (por exemplo, empacota testes end-to-end com webpack), pode migrar diretamente para o Playwright Test. Os exemplos abaixo focam em component tests, mas para um teste end-to-end basta substituir `await mount` por `await page.goto('http://localhost:3000/')` para abrir a página sob teste.
:::

O Playwright renderiza um componente através de um **story** — um pequeno wrapper que embute o componente em um cenário específico — servido de uma página de **gallery** pelo seu próprio dev server. Onde o Testing Library chama `render()` inline no teste, o Playwright move esse setup para o story e referencia-o por id a partir do teste. Veja [Teste de componentes](./test-components) para configurar a gallery.

## Folha de cola (cheat sheet)

| Testing Library | Playwright |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [screen](https://testing-library.com/docs/queries/about#screen) | [page](./pages.md) e [component](./locators.md) |
| [queries](https://testing-library.com/docs/queries/about) | [locators](./locators) |
| [async helpers](https://testing-library.com/docs/dom-testing-library/api-async) | [assertions](./test-assertions) |
| [user events](https://testing-library.com/docs/user-event/intro) | [actions](./locators.md) |
| `await user.click(screen.getByText('Click me'))` | `await component.getByText('Click me').click()` |
| `await user.click(await screen.findByText('Click me'))` | `await component.getByText('Click me').click()` |
| `await user.type(screen.getByLabelText('Password'), 'secret')` | `await component.getByLabel('Password').fill('secret')` |
| `expect(screen.getByLabelText('Password')).toHaveValue('secret')` | `await expect(component.getByLabel('Password')).toHaveValue('secret')` |
| `screen.getByRole('button', { pressed: true })` | `component.getByRole('button', { pressed: true })` |
| `screen.getByLabelText('...')` | `component.getByLabel('...')` |
| `screen.queryByPlaceholderText('...')` | `component.getByPlaceholder('...')` |
| `screen.findByText('...')` | `component.getByText('...')` |
| `screen.getByTestId('...')` | `component.getByTestId('...')` |
| `render(<Component />);` | um export de story + `await mount('Component/Default');` |
| `const { unmount } = render(<Component />);` | `const component = await mount('...'); await component.unmount();` |
| `const { rerender } = render(<Component />);` | `const component = await mount('...'); await component.update(props);` |

## Exemplo

Testing Library:

```ts
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('sign in', async () => {
  // Setup the page.
  const user = userEvent.setup();
  render(<SignInPage />);

  // Perform actions.
  await user.type(screen.getByLabelText('Username'), 'John');
  await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));

  // Verify signed in state by waiting until "Welcome" message appears.
  expect(await screen.findByText('Welcome, John')).toBeInTheDocument();
});
```

Migração linha a linha para o Playwright Test. Primeiro, o cenário sai do teste e vira um story ao lado do componente:

```ts title="src/pages/SignInPage.story.tsx"
import { SignInPage } from './SignInPage';

export const Default = () => <SignInPage />; // 1
```

Depois, o teste monta esse story por id:

```ts title="sign-in.spec.ts"
import { test, expect } from '@playwright/test'; // 2

test('sign in', async ({ mount }) => { // 3
  // Setup the page.
  const component = await mount('pages/SignInPage/Default'); // 4

  // Perform actions.
  await component.getByLabel('Username').fill('John'); // 5
  await component.getByLabel('Password').fill('secret');
  await component.getByRole('button', { name: 'Sign in' }).click();

  // Verify signed in state by waiting until "Welcome" message appears.
  await expect(component.getByText('Welcome, John')).toBeVisible(); // 6
});
```

Destaques da migração (veja comentários inline acima):

1. Tudo o que o `render()` costumava montar inline — props, providers, dados mock — vira um export de story. Stories rodam no navegador, então objetos vivos não precisam mais cruzar para o teste.
2. Importe tudo de `@playwright/test`, tanto para testes de componente quanto end-to-end.
3. A função de teste recebe um `page` isolado de outros testes, e `mount` que renderiza um story nessa página. Essas são duas das [fixtures úteis](./test-fixtures-js.md) do Playwright Test.
4. Substitua `render` por [`method: Fixtures.mount`], que recebe um story id e retorna um [component locator](./locators) escopado à raiz da gallery.
5. Use locators criados com [`method: Locator.locator`] ou [`method: Page.locator`] para realizar a maioria das ações.
6. Use [assertions](./test-assertions) para verificar o estado.

## Migrando queries

Todas as queries como `getBy...`, `findBy...`, `queryBy...` e suas contrapartes multi-elemento são substituídas por locators `component.getBy...`. Locators sempre fazem auto-wait e retry quando necessário, então você não precisa se preocupar em escolher o método certo. Quando quiser fazer uma [operação de lista](./locators#lists), ex.: afirmar uma lista de textos, o Playwright executa automaticamente operações multi-elemento.

## Substituindo `waitFor`

O Playwright inclui [assertions](./test-assertions) que aguardam automaticamente pela condição, então você normalmente não precisa de uma chamada explícita `waitFor`/`waitForElementToBeRemoved`.

```ts
// Testing Library
await waitFor(() => {
  expect(getByText('the lion king')).toBeInTheDocument();
});
await waitForElementToBeRemoved(() => queryByText('the mummy'));

// Playwright
await expect(page.getByText('the lion king')).toBeVisible();
await expect(page.getByText('the mummy')).toBeHidden();
```

Quando não houver uma assertion adequada, use [`expect.poll`](./test-assertions#expectpoll) em vez disso.

```ts
await expect.poll(async () => {
  const response = await page.request.get('https://api.example.com');
  return response.status();
}).toBe(200);
```

## Substituindo `within`

Você pode criar um locator dentro de outro locator com o método [`method: Locator.locator`].

```ts
// Testing Library
const messages = screen.getByTestId('messages');
const helloMessage = within(messages).getByText('hello');

// Playwright
const messages = component.getByTestId('messages');
const helloMessage = messages.getByText('hello');
```

## Super poderes do Playwright Test

Uma vez no Playwright Test, você ganha muito!

- Suporte completo a TypeScript zero-config
- Rode testes em **todos os motores web** (Chrome, Firefox, Safari) em **qualquer sistema operacional popular** (Windows, macOS, Ubuntu)
- Suporte completo a múltiplas origens, [(i)frames](./frames.md), [tabs e contexts](./pages.md)
- Rode testes em isolamento em paralelo em múltiplos navegadores
- Coleta embutida de [artefatos de teste](./test-use-options.md#opções-de-gravação)

Você também ganha todas essas ✨ ferramentas incríveis ✨ que vêm com o Playwright Test:

- [Integração com Visual Studio Code](./getting-started-vscode.md)
- [UI Mode](./test-ui-mode.md) para depurar testes com experiência de time travel e watch mode
- [Playwright Inspector](./debug.md#playwright-inspector)
- [Code generation do Playwright Test](./codegen-intro.md)
- [Playwright Tracing](./trace-viewer.md) para depuração pós-morte

## Quando usar

- **Migração de RTL/VTL para component tests:** converta `render()` em export de story e `screen.getBy*` em `component.getBy*`.
- **Migração de DTL em E2E:** apenas troque `render`/`screen` por `page` e `page.goto`, mantendo as mesmas asserções web-first.
- **Substituir `waitFor`:** use `expect(...).toBeVisible()` / `toBeHidden()` / `expect.poll()` para eliminar sondagem manual.

## Armadilhas comuns

- **`findBy*` vira `getBy*`:** no Playwright, `getByText` já faz auto-wait/retry; não há `findBy` separado.
- **`toBeInTheDocument()` não existe:** use `toBeVisible()`, `toBeAttached()` ou `toHaveCount()` do Playwright.
- **`within()` vira `.locator()`:** encadeie locators em vez de usar `within`.
- **Callbacks/state via `userEvent`:** no Playwright, registre estado no story (input `data-testid`) e afirme com `toHaveValue()`; não tente cruzar funções do Node.js.

## Exemplo completo

Migração de um teste RTL para Playwright component test:

```ts title="src/components/SignInPage.story.tsx"
import { SignInPage } from './SignInPage';

export const Default = () => <SignInPage />;
```

```ts title="tests/components/sign-in.spec.ts"
import { test, expect } from '@playwright/test';

test('sign in', async ({ mount }) => {
  const component = await mount('components/SignInPage/Default');

  await component.getByLabel('Username').fill('John');
  await component.getByLabel('Password').fill('secret');
  await component.getByRole('button', { name: 'Sign in' }).click();

  await expect(component.getByText('Welcome, John')).toBeVisible();
  await expect(component.getByRole('button', { name: 'Sign out' })).toBeVisible();
});
```

## Boas práticas

- Converta um `render()` por vez, validando o story antes de portar o teste.
- Prefira locators semânticos (`getByRole`, `getByLabel`) aos baseados em testid.
- Use `expect.poll` para condições que não têm assertion direta (ex.: status de rede).
- Aproveite traces e UI Mode do Playwright para depurar a migração.
- Para E2E, mantenha a mesma estrutura: `page.goto` + locators + web-first assertions.

## Leitura adicional

- [Getting Started](./intro)
- [Component testing](./test-components)
- [Locators](./locators.md)
- [Assertions](./test-assertions)
- [Auto-waiting](./actionability)