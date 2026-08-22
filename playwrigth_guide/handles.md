---
id: handles
title: "Handles (JSHandle e ElementHandle)"
---

## Introdução

O Playwright pode criar *handles* (referências) para elementos DOM da página ou quaisquer outros objetos dentro da página. Esses handles vivem no processo do Playwright, enquanto os objetos reais vivem no navegador. Existem dois tipos de handles:

- `JSHandle` — referencia qualquer objeto JavaScript na página.
- `ElementHandle` — referencia elementos DOM na página; possui métodos extras que permitem executar ações nos elementos e afirmar suas propriedades.

Como qualquer elemento DOM na página também é um objeto JavaScript, todo `ElementHandle` também é um `JSHandle`.

Os handles são usados para realizar operações sobre esses objetos reais na página. Você pode avaliar sobre um handle, obter propriedades do handle, passá-lo como parâmetro de avaliação, serializar o objeto da página em JSON etc.

### Referência de API

- `JSHandle`
- `ElementHandle`

A forma mais simples de obter um `JSHandle`:

```ts
import { test } from '@playwright/test';

test('obter JSHandle da window', async ({ page }) => {
  await page.goto('https://example.com');

  const jsHandle = await page.evaluateHandle('window');
  // Use jsHandle para avaliações.
  console.log(jsHandle.toString());
});
```

## Element Handles

:::warning[Desencorajado]
O uso de `ElementHandle` é desencorajado. Use objetos `Locator` e web-first assertions em vez disso.
:::

Quando um `ElementHandle` for realmente necessário, recomenda-se obtê-lo com os métodos `page.waitForSelector()` ou `frame.waitForSelector()`. Essas APIs aguardam o elemento estar anexado e visível.

```ts
import { test, expect } from '@playwright/test';

test('obter element handle e afirmar propriedades', async ({ page }) => {
  await page.goto('https://example.com');

  // Obtém o element handle.
  const elementHandle = await page.waitForSelector('#box');

  // Afirma o bounding box do elemento.
  const boundingBox = await elementHandle.boundingBox();
  expect(boundingBox?.width).toBe(100);

  // Afirma o atributo do elemento.
  const classNames = await elementHandle.getAttribute('class');
  expect(classNames?.includes('highlighted')).toBeTruthy();
});
```

> :::note
> `elementHandle.boundingBox()` e `elementHandle.getAttribute()` retornam `null` quando o elemento não está visível/anexado. Use optional chaining (`?.`) para evitar erros de TypeScript.
> :::

## Handles como parâmetros

Handles podem ser passados para `page.evaluate()` e métodos similares. O snippet a seguir cria um novo array na página, o inicializa com dados e retorna um handle para esse array ao Playwright. Ele então usa o handle em avaliações subsequentes:

```ts
import { test } from '@playwright/test';

test('passar handle como parâmetro de evaluate', async ({ page }) => {
  await page.goto('https://example.com');

  // Cria novo array na página.
  const myArrayHandle = await page.evaluateHandle(() => {
    window.myArray = [1];
    return window.myArray;
  });

  // Obtém o comprimento do array.
  const length = await page.evaluate(a => (a as number[]).length, myArrayHandle);

  // Adiciona mais um elemento ao array usando o handle.
  await page.evaluate(
    arg => (arg.myArray as number[]).push(arg.newElement),
    { myArray: myArrayHandle, newElement: 2 },
  );

  // Libera o objeto quando não for mais necessário.
  await myArrayHandle.dispose();
});
```

## Ciclo de vida do handle

Handles podem ser obtidos via métodos da página como `page.evaluateHandle()`, `page.querySelector()` ou `page.$$()` (e seus equivalentes em frame: `frame.evaluateHandle()`, `frame.querySelector()`, `frame.$$()`). Uma vez criados, os handles retêm o objeto da [coleta de lixo](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management) a menos que a página navegue ou o handle seja manualmente liberado via `handle.dispose()`.

### Referência de API

- `JSHandle`
- `ElementHandle`
- `elementHandle.boundingBox()`
- `elementHandle.getAttribute()`
- `elementHandle.innerText()`
- `elementHandle.innerHTML()`
- `elementHandle.textContent()`
- `jsHandle.evaluate()`
- `page.evaluateHandle()`
- `page.$()`
- `page.$$()`

### Armadilhas comuns

- **Vazamento de memória:** handles retidos não são coletados pelo GC. Chame `handle.dispose()` quando não precisar mais do objeto.
- **Handle obsoleto após navegação:** se a página navega, handles antigos apontam para elementos que não existem mais; re-obtenha o handle.
- **`null` em boundingBox/getAttribute:** verifique nulidade antes de usar.

## Locator vs ElementHandle

:::caution
Recomendamos usar `ElementHandle` apenas nos raros casos em que você precisa realizar extensa traversia de DOM em uma página estática. Para todas as ações de usuário e asserções, use `Locator`.
:::

A diferença entre `Locator` e `ElementHandle` é que este último aponta para um elemento particular, enquanto o `Locator` captura a lógica de *como* recuperar aquele elemento.

No exemplo abaixo, o handle aponta para um elemento DOM específico na página. Se aquele elemento mudar de texto ou for usado pelo React para renderizar um componente totalmente diferente, o handle ainda aponta para aquele mesmo DOM obsoleto. Isso pode levar a comportamentos inesperados.

```ts
import { test } from '@playwright/test';

test('handle aponta para DOM obsoleto', async ({ page }) => {
  await page.goto('https://example.com');

  const handle = await page.$('text=Submit');
  // ... algo na página re-renderiza ...
  await handle!.hover();
  await handle!.click(); // Pode agir em elemento obsoleto.
});
```

Com o locator, toda vez que ele é usado, o elemento DOM atualizado é localizado na página usando o seletor. No snippet abaixo, o elemento DOM subjacente é localizado duas vezes.

```ts
import { test, expect } from '@playwright/test';

test('locator localiza elemento atualizado', async ({ page }) => {
  await page.goto('https://example.com');

  const locator = page.getByText('Submit');
  // ... algo na página re-renderiza ...
  await locator.hover();
  await locator.click(); // Localiza o elemento atualizado antes de agir.
});
```

## Exemplo completo

Cenário que mistura locator (para ações) e `evaluateHandle` (para ler estado JS interno), liberando o handle adequadamente:

```ts
import { test, expect } from '@playwright/test';

test('ler estado interno e validar com locator', async ({ page }) => {
  await page.goto('https://example.com');

  // Lê objeto JS interno via handle.
  const stateHandle = await page.evaluateHandle(() => ({
    tema: window.localStorage.getItem('theme'),
    versao: (window as unknown as { APP_VERSION?: string }).APP_VERSION,
  }));

  const state = await stateHandle.jsonValue();
  expect((state as { tema?: string }).tema).toBe('dark');

  // Ação de usuário via locator (resiliente a re-render).
  await page.getByRole('button', { name: 'Alternar tema' }).click();
  await expect(page.getByText('Tema claro')).toBeVisible();

  await stateHandle.dispose();
});
```

## Boas práticas

- Use `Locator` para 100% das ações de usuário e asserções; reserve `ElementHandle`/`JSHandle` para inspeção de estado JS/DOM que locators não cobrem.
- Sempre que usar `page.$()` ou `waitForSelector()`, trate o `null` possível.
- Chame `handle.dispose()` para liberar referências e evitar retenção de memória.
- Prefira `locator` em páginas dinâmicas (React/Vue/etc.) — handles quebram com re-renderização.
- Use `evaluateHandle` + `jsonValue()` para inspecionar objetos complexos do lado do navegador.
