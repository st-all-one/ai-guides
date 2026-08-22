---
id: test-assertions
title: "Assertions"
---

## Introdução

O Playwright inclui assertions na forma da função `expect`. Para fazer uma asserção, chame `expect(valor)` e escolha um matcher que reflita a expectativa. Existem muitos [matchers genéricos](#assertions-sem-retry) como `toEqual`, `toContain`, `toBeTruthy` que podem ser usados para qualquer condição.

```ts
expect(success).toBeTruthy();
```

O Playwright também inclui [matchers assíncronos](#assertions-com-retry) específicos para a web que aguardam até que a condição esperada seja atendida. Veja o exemplo:

```ts
await expect(page.getByTestId('status')).toHaveText('Submitted');
```

O Playwright re-testará o elemento com `testid="status"` até que ele tenha o texto `"Submitted"`. Ele buscará o elemento e o verificará repetidamente, até que a condição seja atendida ou o timeout seja atingido. Você pode passar esse timeout por asserção ou configurá-lo uma vez via a opção `expect` no `playwright.config.ts`.

Por padrão, o timeout das assertions é de **5 segundos**. Saiba mais sobre os [diversos timeouts](./test-timeouts.md).

## Assertions com retry

As assertions a seguir tentam novamente até que passem ou até o timeout ser atingido. Como são assíncronas, você **deve** usar `await`.

| Assertion | Descrição |
| :- | :- |
| `await expect(locator).toBeAttached()` | Elemento está anexado ao DOM |
| `await expect(locator).toBeChecked()` | Checkbox está marcado |
| `await expect(locator).toBeDisabled()` | Elemento está desabilitado |
| `await expect(locator).toBeEditable()` | Elemento é editável |
| `await expect(locator).toBeEmpty()` | Container está vazio |
| `await expect(locator).toBeEnabled()` | Elemento está habilitado |
| `await expect(locator).toBeFocused()` | Elemento está focado |
| `await expect(locator).toBeHidden()` | Elemento não está visível |
| `await expect(locator).toBeInViewport()` | Elemento intercepta o viewport |
| `await expect(locator).toBeVisible()` | Elemento está visível |
| `await expect(locator).toContainText()` | Elemento contém o texto |
| `await expect(locator).toContainClass()` | Elemento tem as classes CSS especificadas |
| `await expect(locator).toHaveAccessibleDescription()` | Elemento tem a [accessible description](https://w3c.github.io/accname/#dfn-accessible-description) correspondente |
| `await expect(locator).toHaveAccessibleName()` | Elemento tem o [accessible name](https://w3c.github.io/accname/#dfn-accessible-name) correspondente |
| `await expect(locator).toHaveAttribute()` | Elemento tem um atributo DOM |
| `await expect(locator).toHaveClass()` | Elemento tem a propriedade de classe CSS especificada |
| `await expect(locator).toHaveCount()` | Lista tem a quantidade exata de filhos |
| `await expect(locator).toHaveCSS()` | Elemento tem a propriedade CSS |
| `await expect(locator).toHaveId()` | Elemento tem um ID |
| `await expect(locator).toHaveJSProperty()` | Elemento tem uma propriedade JavaScript |
| `await expect(locator).toHaveRole()` | Elemento tem um [ARIA role](https://www.w3.org/TR/wai-aria-1.2/#roles) específico |
| `await expect(locator).toHaveScreenshot()` | Elemento tem um screenshot |
| `await expect(locator).toHaveText()` | Elemento corresponde ao texto |
| `await expect(locator).toHaveValue()` | Input tem um valor |
| `await expect(locator).toHaveValues()` | Select tem opções selecionadas |
| `await expect(locator).toMatchAriaSnapshot()` | Elemento corresponde ao Aria snapshot |
| `await expect(page).toMatchAriaSnapshot()` | Página corresponde ao Aria snapshot |
| `await expect(page).toHaveScreenshot()` | Página tem um screenshot |
| `await expect(page).toHaveTitle()` | Página tem um título |
| `await expect(page).toHaveURL()` | Página tem uma URL |
| `await expect(response).toBeOK()` | Resposta tem status OK |

**Exemplo completo:**

```ts title="tests/assertions.spec.ts"
import { test, expect } from '@playwright/test';

test('verifica a página de produto', async ({ page }) => {
  await page.goto('/produto/1');

  await expect(page.getByRole('heading', { name: 'Produto' })).toBeVisible();
  await expect(page.getByTestId('preco')).toHaveText('R$ 99,90');
  await expect(page.getByRole('button', { name: 'Comprar' })).toBeEnabled();
  await expect(page.getByRole('img').first()).toHaveAttribute('alt', /produto/i);
  await expect(page).toHaveURL(/\/produto\//);
});
```

### Quando usar assertions com retry

Use sempre que a UI muda de forma assíncrona (a grande maioria dos casos em testes E2E). Elas eliminam a necessidade de `waitForTimeout` arbitrários e reduzem flakiness.

## Assertions sem retry

Essas assertions permitem testar qualquer condição, mas **não** tentam novamente. Na maior parte do tempo, páginas web mostram informações de forma assíncrona, e usar assertions sem retry pode gerar testes flaky.

Prefira as [assertions com retry](#assertions-com-retry) sempre que possível. Para asserções mais complexas que precisem de retry, use [`expect.poll`](#expectpoll) ou [`expect.toPass`](#expecttopass).

| Assertion | Descrição |
| :- | :- |
| `expect(value).toBe()` | Valor é idêntico (strict equality) |
| `expect(value).toBeCloseTo()` | Número é aproximadamente igual |
| `expect(value).toBeDefined()` | Valor não é `undefined` |
| `expect(value).toBeFalsy()` | Valor é falsy (`false`, `0`, `null`, etc.) |
| `expect(value).toBeGreaterThan()` | Número é maior que |
| `expect(value).toBeGreaterThanOrEqual()` | Número é maior ou igual |
| `expect(value).toBeInstanceOf()` | Objeto é instância de uma classe |
| `expect(value).toBeLessThan()` | Número é menor que |
| `expect(value).toBeLessThanOrEqual()` | Número é menor ou igual |
| `expect(value).toBeNaN()` | Valor é `NaN` |
| `expect(value).toBeNull()` | Valor é `null` |
| `expect(value).toBeTruthy()` | Valor é truthy |
| `expect(value).toBeUndefined()` | Valor é `undefined` |
| `expect(string).toContain()` | String contém uma substring |
| `expect(array).toContain()` | Array ou set contém um elemento |
| `expect(array).toContainEqual()` | Array ou set contém um elemento similar |
| `expect(value).toEqual()` | Valor é similar — igualdade profunda e pattern matching |
| `expect(array).toHaveLength()` | Array ou string tem tamanho |
| `expect(object).toHaveProperty()` | Objeto tem uma propriedade |
| `expect(string).toMatch()` | String corresponde a uma regex |
| `expect(object).toMatchObject()` | Objeto contém as propriedades especificadas |
| `expect(value).toStrictEqual()` | Valor é similar, incluindo os tipos de propriedade |
| `expect(fn).toThrow()` | Função lança um erro |

> **Armadilha comum (gotcha):** `toEqual` faz igualdade profunda, enquanto `toBe` usa `Object.is`. Para números e strings simples, ambos funcionam; para objetos, prefira `toEqual`.

### Quando usar assertions sem retry

Use para valores já resolvidos fora do DOM: respostas de API já aguardadas, variáveis JavaScript, contagens de arrays, resultados de `evaluate`, etc. Nunca as use para checar estado da UI que pode mudar.

## Matchers assimétricos

Essas expressões podem ser aninhadas em outras asserções para permitir um *match* mais flexível contra uma condição.

| Matcher | Descrição |
| :- | :- |
| `expect.any()` | Casa com qualquer instância de uma classe/primitivo |
| `expect.anything()` | Casa com qualquer coisa |
| `expect.arrayContaining()` | Array contém elementos específicos |
| `expect.arrayOf()` | Array contém elementos de um tipo específico |
| `expect.closeTo()` | Número é aproximadamente igual |
| `expect.objectContaining()` | Objeto contém propriedades específicas |
| `expect.stringContaining()` | String contém uma substring |
| `expect.stringMatching()` | String corresponde a uma regex |

Exemplo:

```ts
await expect(page.getByTestId('usuario')).toHaveText(expect.stringContaining('admin'));
expect({ id: 1, nome: 'Maria' }).toEqual(expect.objectContaining({ nome: 'Maria' }));
```

## Negando matchers

Em geral, esperamos o oposto adicionando `.not` antes dos matchers:

```ts
expect(value).not.toEqual(0);
await expect(locator).not.toContainText('algum texto');
```

## Soft assertions

Por padrão, uma assertion falha encerra a execução do teste. O Playwright também suporta *soft assertions*: falhas em soft assertions **não** encerram o teste, mas o marcam como falho.

```ts
// Faz algumas verificações que não param o teste ao falhar...
await expect.soft(page.getByTestId('status')).toHaveText('Success');
await expect.soft(page.getByTestId('eta')).toHaveText('1 day');

// ... e continua o teste para checar mais coisas.
await page.getByRole('link', { name: 'next page' }).click();
await expect.soft(page.getByRole('heading', { name: 'Make another order' })).toBeVisible();
```

A qualquer momento durante a execução, você pode checar se houve falhas de soft assertion:

```ts
// Faz algumas verificações que não param o teste ao falhar...
await expect.soft(page.getByTestId('status')).toHaveText('Success');
await expect.soft(page.getByTestId('eta')).toHaveText('1 day');

// Evita rodar adiante se houve falhas de soft assertion.
expect(test.info().errors).toHaveLength(0);
```

> **Nota:** soft assertions funcionam apenas com o runner de testes do Playwright (`@playwright/test`).

**Quando usar:** para validar vários campos de uma mesma tela em um único teste, sem parar no primeiro erro — útil em testes de regressão visual/contratual.

## Mensagem customizada no expect

Você pode especificar uma mensagem customizada como segundo argumento da função `expect`:

```ts
await expect(page.getByText('Name'), 'deve estar logado').toBeVisible();
```

Essa mensagem aparece nos reporters, tanto para expects que passam quanto para os que falham, dando mais contexto.

Quando passa, você vê algo assim:

```txt
✅ deve estar logado    @example.spec.ts:18
```

Quando falha, o erro fica assim:

```bash
     Error: deve estar logado

     Call log:
       - expect.toBeVisible with timeout 5000ms
       - waiting for "getByText('Name')"


       2 |
       3 | test('example test', async({ page }) => {
     > 4 |   await expect(page.getByText('Name'), 'deve estar logado').toBeVisible();
         |                                                                  ^
       5 | });
       6 |
```

Soft assertions também suportam mensagem customizada:

```ts
expect.soft(value, 'minha soft assertion').toBe(56);
```

## expect.configure

Você pode criar sua própria instância `expect` pré-configurada, com defaults como `timeout` e `soft`.

```ts
const slowExpect = expect.configure({ timeout: 10_000 });
await slowExpect(locator).toHaveText('Submit');

// Sempre faz soft assertions.
const softExpect = expect.configure({ soft: true });
await softExpect(locator).toHaveText('Submit');
```

**Exemplo completo com config global:**

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

const slowExpect = expect.configure({ timeout: 15_000 });

test('carregamento lento', async ({ page }) => {
  await page.goto('/dashboard');
  // Aguarda até 15s sem precisar passar timeout em cada assert.
  await slowExpect(page.getByTestId('grafico')).toBeVisible();
});
```

## expect.poll

Você pode converter qualquer `expect` síncrono em um *polling* assíncrono usando `expect.poll`.

O método a seguir consulta uma função até que ela retorne status HTTP 200:

```ts
await expect.poll(async () => {
  const response = await page.request.get('https://api.example.com');
  return response.status();
}, {
  // Mensagem customizada para o report, opcional.
  message: 'garante que a API eventualmente sucede',
  // Poll por 10s; padrão é 5s. Use 0 para desabilitar o timeout.
  timeout: 10_000,
}).toBe(200);
```

Você também pode especificar intervalos de polling customizados:

```ts
await expect.poll(async () => {
  const response = await page.request.get('https://api.example.com');
  return response.status();
}, {
  // Probe, espera 1s, probe, espera 2s, probe, espera 10s, probe, espera 10s, probe
  // ... Padrão é [100, 250, 500, 1000].
  intervals: [1_000, 2_000, 10_000],
  timeout: 60_000,
}).toBe(200);
```

Você pode combinar `expect.soft` com `expect.poll` para fazer soft assertions dentro da lógica de polling:

```ts
await expect.soft.poll(async () => {
  const response = await page.request.get('https://api.example.com');
  return response.status();
}).toBe(200);
```

`expect.configure({ soft: true })` também encadeia com `expect.poll`:

```ts
const softExpect = expect.configure({ soft: true });
await softExpect.poll(async () => {
  const response = await page.request.get('https://api.example.com');
  return response.status();
}).toBe(200);
```

## expect.toPass

Você pode repetir blocos de código até que passem com sucesso.

```ts
await expect(async () => {
  const response = await page.request.get('https://api.example.com');
  expect(response.status()).toBe(200);
}).toPass();
```

Você também pode especificar timeout e intervalos customizados:

```ts
await expect(async () => {
  const response = await page.request.get('https://api.example.com');
  expect(response.status()).toBe(200);
}).toPass({
  // Probe, espera 1s, probe, espera 2s, probe, espera 10s, probe, espera 10s, probe
  // ... Padrão é [100, 250, 500, 1000].
  intervals: [1_000, 2_000, 10_000],
  timeout: 60_000,
});
```

> **Nota:** por padrão, `toPass` tem timeout 0 e não respeita o [expect timeout](./test-timeouts.md#expect-timeout) customizado.

**Quando usar `toPass` vs `poll`:** use `toPass` quando quiser repetir um bloco contendo múltiplas asserções; use `poll` para um único valor derivado de uma função.

## Adicionar matchers customizados com expect.extend

Você pode estender as assertions do Playwright fornecendo matchers customizados. Eles ficarão disponíveis no objeto `expect`.

Neste exemplo adicionamos uma função `toHaveAmount`. O matcher customizado deve retornar uma flag `pass` indicando se a asserção passou, e um callback `message` usado quando ela falha.

```ts title="fixtures.ts"
import { expect as baseExpect } from '@playwright/test';
import type { Locator } from '@playwright/test';

export { test } from '@playwright/test';

export const expect = baseExpect.extend({
  async toHaveAmount(locator: Locator, expected: number, options?: { timeout?: number }) {
    const assertionName = 'toHaveAmount';
    let pass: boolean;
    let matcherResult: any;
    try {
      const expectation = this.isNot ? baseExpect(locator).not : baseExpect(locator);
      await expectation.toHaveAttribute('data-amount', String(expected), options);
      pass = true;
    } catch (e: any) {
      matcherResult = e.matcherResult;
      pass = false;
    }

    if (this.isNot) {
      pass = !pass;
    }

    const message = pass
      ? () => this.utils.matcherHint(assertionName, undefined, undefined, { isNot: this.isNot }) +
          '\n\n' +
          `Locator: ${locator}\n` +
          `Expected: not ${this.utils.printExpected(expected)}\n` +
          (matcherResult ? `Received: ${this.utils.printReceived(matcherResult.actual)}` : '')
      : () =>  this.utils.matcherHint(assertionName, undefined, undefined, { isNot: this.isNot }) +
          '\n\n' +
          `Locator: ${locator}\n` +
          `Expected: ${this.utils.printExpected(expected)}\n` +
          (matcherResult ? `Received: ${this.utils.printReceived(matcherResult.actual)}` : '');

    return {
      message,
      pass,
      name: assertionName,
      expected,
      actual: matcherResult?.actual,
    };
  },
});
```

Agora podemos usar `toHaveAmount` no teste:

```ts title="example.spec.ts"
import { test, expect } from './fixtures';

test('quantidade', async ({ page }) => {
  await expect(page.locator('.cart')).toHaveAmount(4);
});
```

### Compatibilidade com a biblioteca expect

> **Nota:** não confunda o `expect` do Playwright com a [biblioteca `expect`](https://jestjs.io/docs/expect) do Jest. Esta última não é totalmente integrada ao runner do Playwright, então use sempre o `expect` próprio do Playwright.

### Combinar matchers customizados de múltiplos módulos

Você pode combinar matchers customizados de vários arquivos ou módulos.

```ts title="fixtures.ts"
import { mergeTests, mergeExpects } from '@playwright/test';
import { test as dbTest, expect as dbExpect } from 'database-test-utils';
import { test as a11yTest, expect as a11yExpect } from 'a11y-test-utils';

export const expect = mergeExpects(dbExpect, a11yExpect);
export const test = mergeTests(dbTest, a11yTest);
```

```ts title="test.spec.ts"
import { test, expect } from './fixtures';

test('passa', async ({ database }) => {
  await expect(database).toHaveDatabaseUser('admin');
});
```

## Boas práticas

- Sempre use `await expect(...)` para a UI. Nunca `expect(await locator.isVisible()).toBe(true)`.
- Prefira assertions com retry; use `expect.poll`/`toPass` para condições derivadas de código/funções.
- Use `expect.configure` para evitar repetir `timeout` em testes de carregamento lento.
- Use `expect.soft` para validar múltiplos campos em um único teste sem parar no primeiro erro.
- Configure o timeout padrão uma vez no `playwright.config.ts` via `expect: { timeout: 10_000 }`.
