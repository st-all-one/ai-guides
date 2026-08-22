---
id: actionability
title: "Auto-waiting (Capacidade de ação)"
---

## Introdução

O Playwright executa uma série de verificações de *actionability* nos elementos antes de realizar ações, garantindo que elas se comportem como esperado. Ele auto-aguarda (auto-wait) que todas as checagens relevantes passem e só então executa a ação solicitada. Se as checagens necessárias não passarem dentro do `timeout`, a ação falha com `TimeoutError`.

Por exemplo, para `locator.click()`, o Playwright garante que:
- o locator resolve para exatamente um elemento
- o elemento está [Visible](#visible) (visível)
- o elemento está [Stable](#stable) (estável, sem animação em andamento)
- o elemento [Receives Events](#receives-events) (recebe eventos, não está obscurecido)
- o elemento está [Enabled](#enabled) (habilitado)

Abaixo está a lista completa de checagens de actionability por ação:

| Ação | [Visible] | [Stable] | [Receives Events] | [Enabled] | [Editable] |
| :- | :-: | :-: | :-: | :-: | :-: |
| `locator.check()` | Sim | Sim | Sim | Sim | - |
| `locator.click()` | Sim | Sim | Sim | Sim | - |
| `locator.dblclick()` | Sim | Sim | Sim | Sim | - |
| `locator.setChecked()` | Sim | Sim | Sim | Sim | - |
| `locator.tap()` | Sim | Sim | Sim | Sim | - |
| `locator.uncheck()` | Sim | Sim | Sim | Sim | - |
| `locator.hover()` | Sim | Sim | Sim | - | - |
| `locator.dragTo()` | Sim | Sim | Sim | - | - |
| `locator.screenshot()` | Sim | Sim | - | - | - |
| `locator.fill()` | Sim | - | - | Sim | Sim |
| `locator.clear()` | Sim | - | - | Sim | Sim |
| `locator.selectOption()` | Sim | - | - | Sim | - |
| `locator.selectText()` | Sim | - | - | - | - |
| `locator.scrollIntoViewIfNeeded()` | - | Sim | - | - | - |
| `locator.blur()` | - | - | - | - | - |
| `locator.dispatchEvent()` | - | - | - | - | - |
| `locator.focus()` | - | - | - | - | - |
| `locator.press()` | - | - | - | - | - |
| `locator.pressSequentially()` | - | - | - | - | - |
| `locator.setInputFiles()` | - | - | - | - | - |

## Forcing actions

Algumas ações como `locator.click()` suportam a opção `force`, que desabilita checagens de actionability não essenciais. Por exemplo, passar `force: true` para `locator.click()` não verificará se o elemento alvo realmente recebe eventos de clique.

```ts
await page.getByRole('button', { name: 'Sign in' }).click({ force: true });
```

> **Armadilha comum (gotcha):** `force: true` deve ser usado com cautela. Desabilitar as checagens esconde problemas reais de UI (overlay cobrindo o botão, animação em andamento) e torna o teste frágil. Use apenas quando souber exatamente o motivo.

## Assertions

O Playwright inclui assertions com auto-retry que removem a flakiness ao aguardar até que a condição seja atendida, de forma semelhante ao auto-wait antes das ações.

| Assertion | Descrição |
| :- | :- |
| `expect(locator).toBeAttached()` | Elemento está anexado |
| `expect(locator).toBeChecked()` | Checkbox está marcado |
| `expect(locator).toBeDisabled()` | Elemento está desabilitado |
| `expect(locator).toBeEditable()` | Elemento é editável |
| `expect(locator).toBeEmpty()` | Container está vazio |
| `expect(locator).toBeEnabled()` | Elemento está habilitado |
| `expect(locator).toBeFocused()` | Elemento está focado |
| `expect(locator).toBeHidden()` | Elemento não está visível |
| `expect(locator).toBeInViewport()` | Elemento intercepta o viewport |
| `expect(locator).toBeVisible()` | Elemento está visível |
| `expect(locator).toContainText()` | Elemento contém texto |
| `expect(locator).toHaveAttribute()` | Elemento tem um atributo DOM |
| `expect(locator).toHaveClass()` | Elemento tem a propriedade de classe |
| `expect(locator).toHaveCount()` | Lista tem número exato de filhos |
| `expect(locator).toHaveCSS()` | Elemento tem propriedade CSS |
| `expect(locator).toHaveId()` | Elemento tem um ID |
| `expect(locator).toHaveJSProperty()` | Elemento tem uma propriedade JavaScript |
| `expect(locator).toHaveText()` | Elemento corresponde ao texto |
| `expect(locator).toHaveValue()` | Input tem um valor |
| `expect(locator).toHaveValues()` | Select tem opções selecionadas |
| `expect(page).toHaveTitle()` | Página tem um título |
| `expect(page).toHaveURL()` | Página tem uma URL |
| `expect(response).toBeOK()` | Resposta tem status OK |

Saiba mais no [guia de assertions](./test-assertions.md).

## Visible

Um elemento é considerado visível quando tem um bounding box não vazio e não tem o estilo computado `visibility:hidden`.

Note que, segundo esta definição:
* Elementos de tamanho zero **não** são considerados visíveis.
* Elementos com `display:none` **não** são considerados visíveis.
* Elementos com `opacity:0` **são** considerados visíveis.

```ts
await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
```

## Stable

Um elemento é considerado estável quando manteve o mesmo bounding box por pelo menos dois frames de animação consecutivos.

> **Quando usar:** se o Playwright reclama que o elemento "is not stable", há uma animação (ex.: transição de opacidade, spinner) e o clique está sendo adiado. Aguarde a estabilização ou remova a animação em ambiente de teste.

## Enabled

Um elemento é considerado habilitado quando **não está desabilitado**.

Um elemento está **desabilitado** quando:
- é um `<button>`, `<select>`, `<input>`, `<textarea>`, `<option>` ou `<optgroup>` com atributo `[disabled]`;
- é um `<button>`, `<select>`, `<input>`, `<textarea>`, `<option>` ou `<optgroup>` que faz parte de um `<fieldset>` com atributo `[disabled]`;
- é descendente de um elemento com atributo `[aria-disabled=true]`.

```ts
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
```

## Editable

Um elemento é considerado editável quando está [enabled](#enabled) e **não é readonly**.

Um elemento é **readonly** quando:
- é um `<select>`, `<input>` ou `<textarea>` com atributo `[readonly]`;
- tem um atributo `[aria-readonly=true]` e um role ARIA que [suporta isso](https://w3c.github.io/aria/#aria-readonly).

```ts
await expect(page.getByRole('textbox', { name: 'Nome' })).toBeEditable();
```

## Receives Events

Um elemento é considerado receptor de eventos de ponteiro quando é o alvo do evento no ponto de ação. Por exemplo, ao clicar no ponto `(10;10)`, o Playwright verifica se algum outro elemento (geralmente um overlay) capturará o clique em `(10;10)`.

Por exemplo, considere um cenário onde o Playwright clicará no botão `Sign Up` independentemente de quando `locator.click()` foi chamado:
- a página está verificando que o nome de usuário é único e o botão `Sign Up` está desabilitado;
- após a verificação com o servidor, o botão `Sign Up` desabilitado é substituído por outro que agora está habilitado.

```ts
await page.getByRole('button', { name: 'Sign up' }).click();
```

> **Exemplo completo de diagnóstico:** se um clique falha por "element is not receiving events", inspecione overlays ou spinners cobrindo o alvo. No UI Mode ou Playwright Inspector, o log de actionability mostra exatamente qual checagem falhou.

[Visible]: #visible "Visible"
[Stable]: #stable "Stable"
[Enabled]: #enabled "Enabled"
[Editable]: #editable "Editable"
[Receives Events]: #receives-events "Receives Events"
