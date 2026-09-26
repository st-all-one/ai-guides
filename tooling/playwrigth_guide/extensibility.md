---
id: extensibility
title: "Extensibilidade"
---

## Introdução

O Playwright oferece pontos de extensão para adaptar o comportamento dos testes à sua aplicação. O mecanismo mais comum é registrar **custom selector engines**, mas a extensibilidade também abrange fixtures, browser args e integração com o `playwright`/`@playwright/test`.

Todos os exemplos abaixo usam TypeScript com `@playwright/test` e `playwright`.

### Quando usar

- Você precisa selecionar elementos por critérios que os seletores nativos não cobrem (ex.: por tag name, por atributo de negócio, por texto customizado).
- Deseja isolar o seletor do JavaScript da página para evitar interferência.
- Precisa de um ponto único de registro de seletores reutilizável em toda a suíte.

## Custom selector engines

O Playwright suporta custom selector engines, registrados com [`Selectors.register`](./extensibility.md#custom-selector-engines).

O engine de seletor deve ter as seguintes propriedades:

- função `query` para consultar o primeiro elemento que casa com `selector` relativo ao `root`.
- função `queryAll` para consultar todos os elementos que casam com `selector` relativo ao `root`.

Por padrão o engine roda diretamente no contexto JavaScript do frame e, por exemplo, pode chamar uma função definida pela aplicação. Para isolar o engine de qualquer JavaScript do frame, mas deixar acesso ao DOM, registre o engine com a opção `{ contentScript: true }`. Um engine content script é mais seguro porque é protegido de qualquer adulteração de objetos globais, por exemplo alterando métodos de `Node.prototype`. Todos os engines de seletor nativos rodam como content scripts. Note que rodar como content script não é garantido quando o engine é usado em conjunto com outros engines customizados.

Os seletores devem ser registrados antes de criar a página.

Um exemplo de registro de um engine de seletor que consulta elementos baseado em um tag name:

```ts title="baseTest.ts"
import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

// Deve ser uma função que avalia para uma instância de selector engine.
const createTagNameEngine = () => ({
  // Retorna o primeiro elemento que casa com o seletor dado na subárvore do root.
  query(root, selector) {
    return root.querySelector(selector);
  },

  // Retorna todos os elementos que casam com o seletor dado na subárvore do root.
  queryAll(root, selector) {
    return Array.from(root.querySelectorAll(selector));
  }
});

export const test = base.extend<{}, { selectorRegistration: void }>({
  // Registra seletores uma vez por worker.
  selectorRegistration: [async ({ playwright }, use) => {
    // Registra o engine. Os seletores serão prefixados com "tag=".
    await playwright.selectors.register('tag', createTagNameEngine);
    await use();
  }, { scope: 'worker', auto: true }],
});
```

```ts title="example.spec.ts"
import { test, expect } from './baseTest';

test('selector engine test', async ({ page }) => {
  // Agora podemos usar seletores 'tag='.
  const button = page.locator('tag=button');
  await button.click();

  // Podemos combiná-lo com locators nativos.
  await page.locator('tag=div').getByText('Click me').click();

  // Podemos usar em qualquer método que suporte seletores.
  await expect(page.locator('tag=button')).toHaveCount(3);
});
```

### Boas práticas

- Registre engines em um fixture de escopo `worker` com `auto: true` para garantir que estejam disponíveis antes de qualquer página ser criada.
- Prefira `{ contentScript: true }` quando o engine não precisar chamar funções da aplicação — isso o protege de adulterações no `Node.prototype`.
- Dê prefixos claros (ex.: `tag=`, `data-testid=`) para evitar colisão com seletores nativos.

## Exemplo completo

Engine customizado que seleciona por um atributo de negócio `data-testid`, combinável com locators encadeados:

```ts title="baseTest.ts"
import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

const createTestIdEngine = () => ({
  query(root: Document | Element, selector: string) {
    return root.querySelector(`[data-testid="${selector}"]`);
  },
  queryAll(root: Document | Element, selector: string) {
    return Array.from(root.querySelectorAll(`[data-testid="${selector}"]`));
  },
});

export const test = base.extend<{}, { selectorRegistration: void }>({
  selectorRegistration: [async ({ playwright }, use) => {
    await playwright.selectors.register('tid', createTestIdEngine);
    await use();
  }, { scope: 'worker', auto: true }],
});
```

```ts title="tests/widget.spec.ts"
import { test, expect } from './baseTest';

test('usa seletor customizado tid=', async ({ page }) => {
  await page.setContent(`
    <div data-testid="card">
      <button data-testid="submit">Enviar</button>
    </div>
  `);

  await page.locator('tid=submit').click();
  await expect(page.locator('tid=card')).toContainText('Enviar');
});
```

## Armadilhas comuns

- Registrar seletores **depois** de criar a página não tem efeito — registre antes (`scope: 'worker'`, `auto: true`).
- Se o engine depender de funções da aplicação, não use `contentScript: true`, ou ele não terá acesso a essas funções.
- `query`/`queryAll` devem retornar `null`/array vazio quando não houver correspondência; nunca lance exceção.
