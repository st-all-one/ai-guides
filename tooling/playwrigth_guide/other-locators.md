---
id: other-locators
title: "Other locators (Outros localizadores)"
---

## Introdução

> **Nota:** consulte o [guia principal de locators](./locators.md) para os locators mais comuns e recomendados.

Além dos locators recomendados como `page.getByRole()` e `page.getByText()`, o Playwright suporta uma variedade de outros locators descritos neste guia.

## CSS locator

> **Nota:** recomendamos priorizar [locators visíveis ao usuário](./locators.md#quick-guide) como texto ou role acessível, em vez de usar CSS amarrado à implementação e que pode quebrar quando a página muda.

O Playwright pode localizar um elemento por seletor CSS.

```ts
await page.locator('css=button').click();
```

O Playwright estende seletores CSS padrão de duas formas:
* Seletores CSS penetram open shadow DOM.
* O Playwright adiciona pseudo-classes customizadas como `:visible`, `:has-text()`, `:has()`, `:is()`, `:nth-match()` e mais.

### CSS: matching by text

O Playwright inclui várias pseudo-classes CSS para casar elementos por conteúdo de texto.

- `article:has-text("Playwright")` - `:has-text()` casa qualquer elemento contendo o texto especificado em algum lugar, possivelmente em um filho ou descendente. O match é case-insensitive, elimina espaços e busca por substring.

  Por exemplo, `article:has-text("Playwright")` casa `<article><div>Playwright</div></article>`.

  Note que `:has-text()` deve ser usado junto com outros especificadores CSS, senão casará todos os elementos contendo o texto, incluindo o `<body>`.

  ```ts
  // Errado: casará muitos elementos, incluindo <body>
  await page.locator(':has-text("Playwright")').click();
  // Correto: casa apenas o elemento <article>
  await page.locator('article:has-text("Playwright")').click();
  ```

- `#nav-bar :text("Home")` - a pseudo-classe `:text()` casa o menor elemento contendo o texto especificado. Case-insensitive, elimina espaços e busca substring.

  ```ts
  await page.locator('#nav-bar :text("Home")').click();
  ```

- `#nav-bar :text-is("Home")` - a pseudo-classe `:text-is()` casa o menor elemento com texto exato. O match exato é case-sensitive, elimina espaços e busca a string completa.

  Por exemplo, `:text-is("Log")` não casa `<button>Log in</button>`, mas casa `<button> Log <span>in</span></button>`.

- `#nav-bar :text-matches("reg?ex", "i")` - a pseudo-classe `:text-matches()` casa o menor elemento com conteúdo de texto casando a [regex estilo JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

  Por exemplo, `:text-matches("Log\s*in", "i")` casa `<button>Login</button>` e `<button>log IN</button>`.

> **Notas:**
> - O match por texto sempre normaliza espaços em branco.
> - Elementos `input` dos tipos `button` e `submit` são casados pelo seu `value` em vez do conteúdo de texto. Por exemplo, `:text("Log in")` casa `<input type=button value="Log in">`.

### CSS: matching only visible elements

O Playwright suporta a pseudo-classe `:visible` em seletores CSS. Por exemplo, `css=button` casa todos os botões, enquanto `css=button:visible` casa apenas os visíveis.

Considere uma página com dois botões, o primeiro invisível e o segundo visível:

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
  await page.locator('button:visible').click();
  ```

### CSS: elements that contain other elements

A pseudo-classe `:has()` é uma [CSS pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:has). Retorna um elemento se qualquer um dos seletores passados, relativos ao `:scope` do elemento dado, casar ao menos um elemento.

O trecho abaixo retorna o conteúdo de texto de um `<article>` que tem um `<div class=promo>` dentro.

```ts
await page.locator('article:has(div.promo)').textContent();
```

### CSS: elements matching one of the conditions

Uma lista de seletores CSS separada por vírgula casa todos os elementos que podem ser selecionados por um dos seletores da lista.

```ts
// Clica em um <button> que tem texto "Log in" OU "Sign in".
await page.locator('button:has-text("Log in"), button:has-text("Sign in")').click();
```

A pseudo-classe `:is()` é uma [CSS pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:is) útil para especificar uma lista de condições extras em um elemento.

### CSS: matching elements based on layout

> **Aviso:** seletores de layout estão descontinuados e podem ser removidos no futuro. O match baseado em layout pode produzir resultados inesperados (por exemplo, um elemento diferente pode ser casado se o layout mudar em 1 pixel). Recomendamos priorizar [locators visíveis ao usuário](./locators.md#quick-guide).

Às vezes é difícil criar um bom seletor para o elemento alvo quando ele não tem características distintivas. Nesse caso, as pseudo-classes de layout CSS do Playwright ajudam. Elas podem ser combinadas com CSS regular para pinpointar uma das múltiplas escolhas.

Por exemplo, `input:right-of(:text("Password"))` casa um campo de input à direita do texto "Password".

Note que pseudo-classes de layout são úteis **em adição** a algo como `input`. Se usar uma pseudo-classe de layout sozinha, provavelmente pegará um elemento vazio entre o texto e o input alvo.

As pseudo-classes de layout usam [bounding client rect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) para calcular distância e posição relativa:
* `:right-of(div > button)` - à direita de qualquer elemento que case o seletor interno, em qualquer posição vertical.
* `:left-of(div > button)` - à esquerda.
* `:above(div > button)` - acima.
* `:below(div > button)` - abaixo.
* `:near(div > button)` - perto (dentro de 50px CSS) de qualquer elemento que case o seletor interno.

Os matches resultantes são ordenados pela distância ao elemento âncora, então você pode usar `locator.first()` para pegar o mais próximo.

```ts
// Preenche um input à direita de "Username".
await page.locator('input:right-of(:text("Username"))').fill('value');

// Clica um botão perto do card promo.
await page.locator('button:near(.promo-card)').click();

// Clica o radio mais próximo de "Label 3".
await page.locator('[type=radio]:left-of(:text("Label 3"))').first().click();
```

Todas as pseudo-classes de layout suportam distância máxima em pixels como último argumento: `button:near(:text("Username"), 120)` casa um botão a no máximo 120px do elemento com texto "Username".

### CSS: pick n-th match from the query result

> **Nota:** geralmente é possível distinguir elementos por algum atributo ou conteúdo de texto, o que é mais resiliente a mudanças.

Quando a página tem vários elementos similares e é difícil selecionar um específico:

```html
<section>
  <button>Buy</button>
</section>
<article>
  <div>
    <button>Buy</button>
  </div>
</article>
<div>
  <div>
    <button>Buy</button>
  </div>
</div>
```

Nesse caso, `:nth-match(:text("Buy"), 3)` seleciona o terceiro botão. O índice é base 1.

```ts
// Clica o terceiro botão "Buy"
await page.locator(':nth-match(:text("Buy"), 3)').click();
```

`:nth-match()` também é útil para esperar até um número especificado de elementos aparecer, usando `locator.waitFor()`:

```ts
// Espera até que os três botões estejam visíveis
await page.locator(':nth-match(:text("Buy"), 3)').waitFor();
```

> **Nota:** diferente de [`:nth-child()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-child), os elementos não precisam ser irmãos; podem estar em qualquer lugar da página.

## N-th element locator

Você pode restringir a consulta ao n-ésimo match usando o locator `nth=` passando um índice base zero.

```ts
// Clica o primeiro botão
await page.locator('button').locator('nth=0').click();

// Clica o último botão
await page.locator('button').locator('nth=-1').click();
```

## Parent element locator

Quando você precisa mirar um elemento pai de outro, na maior parte dos casos deve usar `locator.filter()` pelo locator filho. Considere:

```html
<li><label>Hello</label></li>
<li><label>World</label></li>
```

Para mirar o `<li>` pai de uma label com texto `"Hello"`, `locator.filter()` funciona melhor:

```ts
const child = page.getByText('Hello');
const parent = page.getByRole('listitem').filter({ has: child });
```

Alternativamente, se não encontrar um locator adequado para o pai, use `xpath=..`. Note que este método é menos confiável, pois qualquer mudança na estrutura do DOM quebra seus testes. Prefira `locator.filter()` quando possível.

```ts
const parent = page.getByText('Hello').locator('xpath=..');
```

## XPath locator

> **Aviso:** recomendamos priorizar [locators visíveis ao usuário](./locators.md#quick-guide) como texto ou role acessível, em vez de XPath amarrado à implementação e que quebra facilmente.

Locators XPath equivalem a chamar [`Document.evaluate`](https://developer.mozilla.org/en/docs/Web/API/Document/evaluate).

```ts
await page.locator('xpath=//button').click();
```

> **Notas:**
> - Qualquer string de seletor começando com `//` ou `..` é assumida como seletor xpath. Por exemplo, `'//html/body'` vira `'xpath=//html/body'`.
> - XPath **não** penetra shadow roots.

### XPath union

O operador pipe (`|`) pode ser usado para especificar múltiplos seletores em XPath. Casa todos os elementos selecionáveis por um dos seletores da lista.

```ts
// Espera por dialog de confirmação OU spinner de carregamento.
await page.locator(
    `//span[contains(@class, 'spinner__loading')]|//div[@id='confirmation']`
).waitFor();
```

## Label to form control retargeting

> **Aviso:** recomendamos [localizar por texto de label](./locators.md#locate-by-label) em vez de confiar no retargeting label-to-control.

Ações de input no Playwright distinguem automaticamente entre labels e controles, então você pode mirar a label para executar uma ação no controle associado.

Por exemplo, `<label for="password">Password:</label><input id="password" type="password">`. Você pode mirar a label pelo texto "Password" usando `page.getByText()`. No entanto, as ações abaixo serão executadas no input:
- `locator.click()` clica na label e foca o input;
- `locator.fill()` preenche o input;
- `locator.inputValue()` retorna o valor do input;
- `locator.selectText()` seleciona texto no input;
- `locator.setInputFiles()` define arquivos para o input `type=file`;
- `locator.selectOption()` seleciona uma opção no select.

```ts
// Preenche o input mirando a label.
await page.getByText('Password').fill('secret');
```

No entanto, outros métodos mirarão a label em si; por exemplo `locatorAssertions.toHaveText()` asserirá o conteúdo de texto da label, não do input.

```ts
// Asserção sobre a label, não o input.
await expect(page.locator('label')).toHaveText('Password');
```

## Legacy text locator

> **Aviso:** recomendamos o [text locator moderno](./locators.md#locate-by-text).

O legacy text locator casa elementos que contêm o texto passado.

```ts
await page.locator('text=Log in').click();
```

Variações:
- `text=Log in` - match case-insensitive, elimina espaços, busca substring. `text=Log` casa `<button>Log in</button>`.

  ```ts
  await page.locator('text=Log in').click();
  ```

- `text="Log in"` - o corpo pode ser escapado com aspas simples ou duplas para buscar um nó de texto com conteúdo exato após eliminar espaços. `text="Log"` não casa `<button>Log in</button>`, mas casa `<button> Log <span>in</span></button>`. O modo exato é case-sensitive.

  ```ts
  await page.locator('text="Log in"').click();
  ```

- `/Log\s*in/i` - o corpo pode ser uma [regex estilo JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) entre `/`. `text=/Log\s*in/i` casa `<button>Login</button>` e `<button>log IN</button>`.

  ```ts
  await page.locator('text=/Log\\s*in/i').click();
  ```

> **Notas:**
> - Seletores string começando e terminando com aspas são assumidos como legacy text locators. Por exemplo, `"Log in"` vira `text="Log in"` internamente.
> - O match sempre normaliza espaços em branco.
> - Elementos `input` dos tipos `button` e `submit` são casados pelo `value`.

## id, data-testid, data-test-id, data-test selectors

> **Aviso:** recomendamos [localizar por test id](./locators.md#locate-by-test-id).

O Playwright suporta atalhos para selecionar elementos usando certos atributos. Atualmente, apenas os seguintes são suportados:

- `id`
- `data-testid`
- `data-test-id`
- `data-test`

```ts
// Preenche um input com id "username"
await page.locator('id=username').fill('value');

// Clica um elemento com data-test-id "submit"
await page.locator('data-test-id=submit').click();
```

> **Nota:** seletores de atributo não são seletores CSS, então nada de CSS específico como `:enabled` é suportado. Para mais recursos, use um seletor [css](#css-locator) próprio, ex.: `css=[data-test="login"]:enabled`.

## Chaining selectors

> **Aviso:** recomendamos [encadear locators](./locators.md#matching-inside-a-locator).

Seletores definidos como `engine=body` ou em forma curta podem ser combinados com o token `>>`, ex.: `selector1 >> selector2 >> selectors3`. Quando encadeados, o próximo é consultado relativo ao resultado do anterior.

Por exemplo:

```txt
css=article >> css=.bar > .baz >> css=span[attr=value]
```

equivale a:

```js browser
document
    .querySelector('article')
    .querySelector('.bar > .baz')
    .querySelector('span[attr=value]');
```

Se um seletor precisar incluir `>>` no corpo, ele deve ser escapado dentro de uma string: `text="some >> text"`.

### Intermediate matches

> **Aviso:** recomendamos [filtrar por outro locator](./locators.md#filter-by-childdescendant) para localizar elementos que contêm outros elementos.

Por padrão, seletores encadeados resolvem para o elemento consultado pelo último seletor. Um seletor pode ser prefixado com `*` para capturar elementos consultados por um seletor intermediário.

Por exemplo, `css=article >> text=Hello` captura o elemento com o texto `Hello`, e `*css=article >> text=Hello` (note o `*`) captura o elemento `article` que contém algum elemento com o texto `Hello`.

## Boas práticas

- Prefira sempre os locators voltados ao usuário (`getByRole`, `getByLabel`, `getByText`, `getByTestId`) descritos no [guia principal](./locators.md).
- Use CSS/XPath customizados e pseudo-classes de layout apenas como último recurso; eles são frágeis a mudanças de DOM.
- Evite `nth-match`/`nth=` quando possível; prefira filtros que identificam o elemento de forma única.
