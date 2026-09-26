---
id: locators
title: "Locators (Localizadores)"
---

## Introdução

Os **locators** são a peça central do auto-waiting e da retry-ability do Playwright. Em resumo, locators representam uma forma de encontrar elemento(s) na página a qualquer momento.

### Quick Guide

Estes são os locators embutidos recomendados:

- `page.getByRole()` para localizar por atributos de acessibilidade explícitos e implícitos.
- `page.getByText()` para localizar por conteúdo de texto.
- `page.getByLabel()` para localizar um controle de formulário pela label associada.
- `page.getByPlaceholder()` para localizar um input pelo placeholder.
- `page.getByAltText()` para localizar um elemento, geralmente imagem, pelo texto alternativo.
- `page.getByTitle()` para localizar um elemento pelo atributo `title`.
- `page.getByTestId()` para localizar um elemento baseado no atributo `data-testid` (outros atributos podem ser configurados).

```ts
await page.getByLabel('User Name').fill('John');

await page.getByLabel('Password').fill('secret-password');

await page.getByRole('button', { name: 'Sign in' }).click();

await expect(page.getByText('Welcome, John!')).toBeVisible();
```

## Locating elements

O Playwright traz diversos locators embutidos. Para tornar os testes resilientes, recomendamos priorizar atributos voltados ao usuário e contratos explícitos, como `page.getByRole()`.

Por exemplo, considere a seguinte estrutura DOM:

```html card
<button>Sign in</button>
```

Localize o elemento pelo seu role de `button` com o nome "Sign in":

```ts
await page.getByRole('button', { name: 'Sign in' }).click();
```

> **Dica:** use o [code generator](./codegen.md) para gerar um locator e então edite-o como quiser.

Toda vez que um locator é usado para uma ação, um elemento DOM atualizado é localizado na página. No trecho abaixo, o elemento DOM subjacente é localizado duas vezes, uma antes de cada ação. Isso significa que, se o DOM mudar entre as chamadas (por re-render), o novo elemento correspondente ao locator será usado.

```ts
const locator = page.getByRole('button', { name: 'Sign in' });

await locator.hover();
await locator.click();
```

Note que todos os métodos que criam um locator, como `page.getByLabel()`, também estão disponíveis nas classes `Locator` e `FrameLocator`, então você pode encadear e refinar progressivamente o locator.

```ts
const locator = page
    .frameLocator('#my-frame')
    .getByRole('button', { name: 'Sign in' });

await locator.click();
```

### Locate by role

O locator `page.getByRole()` reflete como usuários e tecnologias assistivas percebem a página — por exemplo, se um elemento é um botão ou um checkbox. Ao localizar por role, você geralmente deve passar também o *accessible name*, para que o locator aponte exatamente o elemento.

Considere a estrutura:

```html card
<h3>Sign up</h3>
<label>
  <input type="checkbox" /> Subscribe
</label>
<br/>
<button>Submit</button>
```

Você pode localizar cada elemento pelo seu role implícito:

```ts
await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();

await page.getByRole('checkbox', { name: 'Subscribe' }).check();

await page.getByRole('button', { name: /submit/i }).click();
```

Os role locators incluem [buttons, checkboxes, headings, links, lists, tables e muitos outros](https://www.w3.org/TR/html-aria/#docconformance) e seguem as especificações W3C para [ARIA role](https://www.w3.org/TR/wai-aria-1.2/#roles), [ARIA attributes](https://www.w3.org/TR/wai-aria-1.2/#aria-attributes) e [accessible name](https://w3c.github.io/accname/#dfn-accessible-name). Note que muitos elementos HTML como `<button>` têm um [role implicitamente definido](https://w3c.github.io/html-aam/#html-element-role-mappings) reconhecido pelo locator de role.

> **Quando usar role locators:** recomendamos priorizar role locators para localizar elementos, pois é a forma mais próxima de como usuários e tecnologias assistivas percebem a página.
>
> **Armadilha comum (gotcha):** role locators **não substituem** auditorias de acessibilidade e testes de conformidade, mas dão feedback rápido sobre as diretrizes ARIA.

### Locate by label

A maioria dos controles de formulário costuma ter labels dedicadas que podem ser usadas para interagir com o formulário. Use `page.getByLabel()` para localizar o controle pela label associada.

```html card
<label>Password <input type="password" /></label>
```

```ts
await page.getByLabel('Password').fill('secret');
```

> **Quando usar label locators:** use este locator ao localizar campos de formulário.

### Locate by placeholder

Inputs podem ter um atributo `placeholder` para sugerir o valor a ser digitado. Use `page.getByPlaceholder()`.

```html card
<input type="email" placeholder="name@example.com" />
```

```ts
await page
    .getByPlaceholder('name@example.com')
    .fill('playwright@microsoft.com');
```

> **Quando usar placeholder locators:** use para elementos de formulário que não têm labels mas têm textos de placeholder.

### Locate by text

Encontre um elemento pelo texto que ele contém. Você pode casar por substring, string exata ou expressão regular com `page.getByText()`.

```html card
<span>Welcome, John</span>
```

```ts
await expect(page.getByText('Welcome, John')).toBeVisible();
```

Match exato:

```ts
await expect(page.getByText('Welcome, John', { exact: true })).toBeVisible();
```

Match com regex:

```ts
await expect(page.getByText(/welcome, [A-Za-z]+$/i)).toBeVisible();
```

> **Nota:** o match por texto sempre normaliza espaços em branco, mesmo no exact match (múltiplos espaços viram um, quebras de linha viram espaços e espaços extremos são ignorados).
>
> **Quando usar text locators:** recomendamos usar text locators para encontrar elementos não interativos como `div`, `span`, `p`, etc. Para elementos interativos como `button`, `a`, `input`, use [role locators](#locate-by-role).

Você também pode [filtrar por texto](#filter-by-text), útil para achar um item específico em uma lista.

### Locate by alt text

Todas as imagens devem ter um atributo `alt` que descreve a imagem. Use `page.getByAltText()`.

```html card
<img alt="playwright logo" src="/img/playwright-logo.svg" width="100" />
```

```ts
await page.getByAltText('playwright logo').click();
```

> **Quando usar alt locators:** use para elementos que suportam alt text, como `img` e `area`.

### Locate by title

Localize um elemento com o atributo `title` correspondente usando `page.getByTitle()`.

```html card
<span title='Issues count'>25 issues</span>
```

```ts
await expect(page.getByTitle('Issues count')).toHaveText('25 issues');
```

> **Quando usar title locators:** use quando o elemento tiver o atributo `title`.

### Locate by test id

Testar por test ids é a forma mais resiliente, pois mesmo que o texto ou role mude, o teste continua passando. QA e desenvolvedores devem definir test ids explícitos e consultá-los com `page.getByTestId()`. No entanto, testar por test id não é voltado ao usuário. Se o role ou texto forem importantes, considere locators voltados ao usuário como [role](#locate-by-role) e [text](#locate-by-text).

```html card
<button data-testid="directions">Itinéraire</button>
```

```ts
await page.getByTestId('directions').click();
```

> **Quando usar test id locators:** use a metodologia de test id, ou quando não conseguir localizar por [role](#locate-by-role) ou [text](#locate-by-text).

#### Set a custom test id attribute

Por padrão, `page.getByTestId()` localiza elementos baseado no atributo `data-testid`, mas você pode configurá-lo no `playwright.config.ts` ou via `selectors.setTestIdAttribute()`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    testIdAttribute: 'data-pw'
  }
});
```

No HTML, use `data-pw` como seu test id:

```html card
<button data-pw="directions">Itinéraire</button>
```

```ts
await page.getByTestId('directions').click();
```

### Locate by CSS or XPath

Se você absolutamente precisar usar seletores CSS ou XPath, use `page.locator()` passando um seletor. O Playwright suporta CSS e XPath, e auto-detecta se você omitir o prefixo `css=` ou `xpath=`.

```ts
await page.locator('css=button').click();
await page.locator('xpath=//button').click();

await page.locator('button').click();
await page.locator('//button').click();
```

XPath e CSS podem estar amarrados à estrutura do DOM. Estes seletores quebram quando o DOM muda. Cadeias longas de CSS/XPath abaixo são **má prática** e levam a testes instáveis:

```ts
await page.locator(
    '#tsf > div:nth-child(2) > div.A8SBwf > div.RNNXgb > div > div.a4bIc > input'
).click();

await page
    .locator('//*[@id="tsf"]/div[2]/div[1]/div[1]/div/div[2]/input')
    .click();
```

> **Quando usar isso:** CSS e XPath não são recomendados, pois o DOM muda com frequência. Em vez disso, use um locator próximo à percepção do usuário, como [role](#locate-by-role) ou [test id](#locate-by-test-id).

## Locate in Shadow DOM

Todos os locators do Playwright **por padrão** funcionam com elementos em Shadow DOM. Exceções:
- Localizar por XPath não penetra shadow roots.
- [Closed-mode shadow roots](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#parameters) não são suportados.

Considere o exemplo com um custom web component:

```html
<x-details role=button aria-expanded=true aria-controls=inner-details>
  <div>Title</div>
  #shadow-root
    <div id=inner-details>Details</div>
</x-details>
```

Você localiza como se o shadow root não existisse. Para clicar em `<div>Details</div>`:

```ts
await page.getByText('Details').click();
```

Para clicar em `<x-details>`:

```ts
await page.locator('x-details', { hasText: 'Details' }).click();
```

Para garantir que `<x-details>` contém o texto "Details":

```ts
await expect(page.locator('x-details')).toContainText('Details');
```

## Filtering Locators

Considere a estrutura onde queremos clicar no botão "Add to cart" do segundo card de produto. Temos algumas opções para filtrar os locators e acertar o certo.

```html card
<ul>
  <li>
    <h3>Product 1</h3>
    <button>Add to cart</button>
  </li>
  <li>
    <h3>Product 2</h3>
    <button>Add to cart</button>
  </li>
</ul>
```

### Filter by text

Locators podem ser filtrados por texto com `locator.filter()`. Ele busca uma string em algum lugar do elemento (possivelmente em um descendente), case-insensitive. Você também pode passar uma regex.

```ts
await page
    .getByRole('listitem')
    .filter({ hasText: 'Product 2' })
    .getByRole('button', { name: 'Add to cart' })
    .click();
```

Com regex:

```ts
await page
    .getByRole('listitem')
    .filter({ hasText: /Product 2/ })
    .getByRole('button', { name: 'Add to cart' })
    .click();
```

### Filter by not having text

Alternativamente, filtre por **não ter** o texto:

```ts
// 5 itens em estoque
await expect(page.getByRole('listitem').filter({ hasNotText: 'Out of stock' })).toHaveCount(5);
```

### Filter by child/descendant

Locators suportam uma opção para selecionar apenas elementos que têm (ou não têm) um descendente que casa com outro locator. Você pode filtrar por qualquer outro locator, como `getByRole`, `getByTestId`, `getByText`, etc.

```ts
await page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Product 2' }) })
    .getByRole('button', { name: 'Add to cart' })
    .click();
```

Podemos também asserir que há apenas um card:

```ts
await expect(page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Product 2' }) }))
    .toHaveCount(1);
```

> **Armadilha comum (gotcha):** o locator de filtro **deve ser relativo** ao locator original e é consultado a partir do match do locator original, não da raiz do documento. Portanto, o seguinte NÃO funciona, pois o locator de filtro começa a casar a partir do `<ul>` que está fora do `<li>`:
>
> ```ts
> // ✖ ERRADO
> await expect(page
>     .getByRole('listitem')
>     .filter({ has: page.getByRole('list').getByText('Product 2') }))
>     .toHaveCount(1);
> ```

### Filter by not having child/descendant

Também podemos filtrar por **não ter** um elemento correspondente dentro:

```ts
await expect(page
    .getByRole('listitem')
    .filter({ hasNot: page.getByText('Product 2') }))
    .toHaveCount(1);
```

Note que o locator interno é casado a partir do externo, não da raiz do documento.

## Locator operators

### Matching inside a locator

Você pode encadear métodos que criam um locator, como `getByText()` ou `getByRole()`, para restringir a busca a uma parte específica da página.

```ts
const product = page.getByRole('listitem').filter({ hasText: 'Product 2' });

await product.getByRole('button', { name: 'Add to cart' }).click();

await expect(product).toHaveCount(1);
```

Você também pode encadear dois locators, por exemplo para achar um botão "Save" dentro de um dialog específico:

```ts
const saveButton = page.getByRole('button', { name: 'Save' });
// ...
const dialog = page.getByTestId('settings-dialog');
await dialog.locator(saveButton).click();
```

### Matching two locators simultaneously

O método `locator.and()` restringe um locator existente casando um locator adicional. Por exemplo, combine `getByRole()` e `getByTitle()` para casar por role e title.

```ts
const button = page.getByRole('button').and(page.getByTitle('Subscribe'));
```

### Matching one of the two alternative locators

Se você quer mirar um de dois (ou mais) elementos e não sabe qual aparecerá, use `locator.or()` para criar um locator que casa qualquer um dos dois.

Por exemplo, clicar em "New email", mas às vezes um dialog de segurança aparece. Você espera por "New email" ou pelo dialog e age conforme.

> **Nota:** se ambos aparecerem, o locator "or" casa ambos, possivelmente lançando o erro de ["strict mode violation"](#strictness). Nesse caso, use `locator.first()` para casar apenas um.

```ts
const newEmail = page.getByRole('button', { name: 'New' });
const dialog = page.getByText('Confirm security settings');
await expect(newEmail.or(dialog).first()).toBeVisible();
if (await dialog.isVisible())
  await page.getByRole('button', { name: 'Dismiss' }).click();
await newEmail.click();
```

### Matching only visible elements

> **Nota:** geralmente é melhor achar uma [forma mais confiável](./locators.md#quick-guide) de identificar unicamente o elemento em vez de checar visibilidade.

Considere uma página com dois botões, o primeiro invisível e o segundo [visível](./actionability.md#visible).

```html
<button style='display: none'>Invisible</button>
<button>Visible</button>
```

* Isso acha ambos e lança erro de [strictness](./locators.md#strictness):

  ```ts
  await page.locator('button').click();
  ```

* Isso acha apenas o segundo (visível) e clica:

  ```ts
  await page.locator('button').filter({ visible: true }).click();
  ```

## Lists

### Count items in a list

Você pode asserir locators para contar itens em uma lista.

```html card
<ul>
  <li>apple</li>
  <li>banana</li>
  <li>orange</li>
</ul>
```

```ts
await expect(page.getByRole('listitem')).toHaveCount(3);
```

### Assert all text in a list

Use `locatorAssertions.toHaveText()` para garantir que a lista tem os textos "apple", "banana" e "orange".

```ts
await expect(page
    .getByRole('listitem'))
    .toHaveText(['apple', 'banana', 'orange']);
```

### Get a specific item

Há várias formas de pegar um item específico em uma lista.

#### Get by text

Use `page.getByText()` para localizar um item por seu conteúdo e então clicar.

```ts
await page.getByText('orange').click();
```

#### Filter by text

Use `locator.filter()` para localizar um item específico.

```ts
await page
    .getByRole('listitem')
    .filter({ hasText: 'orange' })
    .click();
```

#### Get by test id

Use `page.getByTestId()` para localizar um item. Você pode precisar adicionar um test id no HTML.

```html card
<ul>
  <li data-testid='apple'>apple</li>
  <li data-testid='banana'>banana</li>
  <li data-testid='orange'>orange</li>
</ul>
```

```ts
await page.getByTestId('orange').click();
```

#### Get by nth item

Se você tem uma lista de elementos idênticos e a única distinção é a ordem, use `locator.first()`, `locator.last()` ou `locator.nth()`.

```ts
const banana = page.getByRole('listitem').nth(1);
```

> **Armadilha comum (gotcha):** use este método com cautela. Muitas vezes a página muda e o locator aponta para um elemento totalmente diferente. Em vez disso, crie um locator único que passe nos critérios de [strictness](#strictness).

### Chaining filters

Quando você tem elementos com várias similaridades, use `locator.filter()` para selecionar o certo. Você pode encadear múltiplos filtros.

```html card
<ul>
  <li>
    <div>John</div>
    <div><button>Say hello</button></div>
  </li>
  <li>
    <div>Mary</div>
    <div><button>Say hello</button></div>
  </li>
  <li>
    <div>John</div>
    <div><button>Say goodbye</button></div>
  </li>
  <li>
    <div>Mary</div>
    <div><button>Say goodbye</button></div>
  </li>
</ul>
```

Para tirar screenshot da linha com "Mary" e "Say goodbye":

```ts
const rowLocator = page.getByRole('listitem');

await rowLocator
    .filter({ hasText: 'Mary' })
    .filter({ has: page.getByRole('button', { name: 'Say goodbye' }) })
    .screenshot({ path: 'screenshot.png' });
```

### Rare use cases

#### Do something with each element in the list

Iterar elementos:

```ts
for (const row of await page.getByRole('listitem').all())
  console.log(await row.textContent());
```

Com `for` tradicional:

```ts
const rows = page.getByRole('listitem');
const count = await rows.count();
for (let i = 0; i < count; ++i)
  console.log(await rows.nth(i).textContent());
```

#### Evaluate in the page

O código dentro de `locator.evaluateAll()` roda na página; você pode chamar qualquer API DOM lá.

```ts
const rows = page.getByRole('listitem');
const texts = await rows.evaluateAll(
    list => list.map(element => element.textContent));
```

## Strictness

Locators são strict. Isso significa que todas as operações em locators que implicam algum elemento DOM alvo lançarão uma exceção se mais de um elemento casar. Por exemplo, a chamada abaixo lança se houver vários botões no DOM:

```ts
// Lança erro se houver mais de um
await page.getByRole('button').click();
```

Por outro lado, o Playwright entende quando você faz uma operação de múltiplos elementos, então a chamada abaixo funciona bem quando o locator resolve para múltiplos elementos:

```ts
// Funciona bem com múltiplos elementos
await page.getByRole('button').count();
```

Você pode explicitamente optar por sair da checagem de strictness dizendo ao Playwright qual elemento usar quando vários casam, via `locator.first()`, `locator.last()` e `locator.nth()`. Esses métodos **não são recomendados**, pois quando a página muda o Playwright pode clicar em um elemento não intencional. Em vez disso, siga as boas práticas acima para criar um locator que identifique unicamente o elemento alvo.

## Page-free locators

Um `Locator` é vinculado a uma página, então só pode ser criado quando uma página existe. `By` descreve o mesmo elemento sem uma página, o que significa que pode ser definido uma vez no escopo do módulo e compartilhado entre testes. Construa um com o objeto de nível superior `by` e vincule-o com `page.get()`, `frame.get()` ou `locator.get()`.

```ts
// todo-page.ts
import { by } from '@playwright/test';

export const newTodo = by.placeholder('What needs to be done?');
export const todoItems = by.testId('todo-list').role('listitem');
```

```ts
import { expect, test } from '@playwright/test';
import { newTodo, todoItems } from './todo-page';

test('adds a todo', async ({ page }) => {
  await page.get(newTodo).fill('buy milk');
  await page.get(newTodo).press('Enter');
  await expect(page.get(todoItems)).toHaveCount(1);
});
```

Um `By` suporta o mesmo encadeamento, filtragem e operadores de um `Locator`, e resolve exatamente para o mesmo elemento, então `page.get(by.testId('list').text('Row'))` e `page.getByTestId('list').getByText('Row')` são intercambiáveis. Como um `By` é imutável, escopar um nunca muda o original:

```ts
const list = by.testId('todo-list');
const first = list.role('listitem').first();
const active = list.filter({ has: by.get('.active') });
```

Test ids são resolvidos quando o `By` é vinculado a uma página, então um `By` de escopo de módulo ainda honra a opção `testIdAttribute` do config.

## Exemplo completo

Um teste realista usando múltiplos locators e filtros:

```ts title="tests/products.spec.ts"
import { test, expect } from '@playwright/test';

test('adiciona o segundo produto ao carrinho', async ({ page }) => {
  await page.goto('/products');

  const product = page
    .getByRole('listitem')
    .filter({ hasText: 'Product 2' });

  await expect(product).toHaveCount(1);
  await product.getByRole('button', { name: 'Add to cart' }).click();

  await expect(page.getByRole('status')).toHaveText(/1 item no carrinho/i);
});
```

## Boas práticas

- Priorize `getByRole`, `getByLabel`, `getByText`, `getByTestId` — são resilientes a mudanças de implementação.
- Evite CSS/XPath longos e amarrados à estrutura do DOM.
- Prefira filtros (`filter`, `and`, `or`) a `nth()`/`first()` para identificar elementos unicamente.
- Use `strict` mode a seu favor: se um locator casa múltiplos elementos, refine-o em vez de usar `first()`.

## More Locators

Para locators menos comuns, veja o guia de [other locators](./other-locators.md).
