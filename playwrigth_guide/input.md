---
id: input
title: "Ações e entrada de dados (TypeScript)"
---

## Introdução

O Playwright consegue interagir com elementos HTML de entrada — campos de texto, checkboxes, radio buttons, seleção de opções (`<select>`), cliques de mouse, digitação de caracteres e atalhos de teclado, upload de arquivos e foco em elementos.

Todas as ações abaixo são executadas por meio de [Locators](./locators.md) e respeitam automaticamente as verificações de [actionability](./actionability.md) (visibilidade, estabilidade, capacidade de receber eventos de ponteiro etc.), tornando os testes resilientes sem esperas manuais.

> **Importante:** todo exemplo usa `@playwright/test` (TypeScript). Nunca importe de `'playwright'` para testes; use `'@playwright/test'`.

### Quando usar

- Preencher formulários: prefira sempre `Locator.fill`.
- Marcar/desmarcar opções: use `Locator.setChecked` e `Locator.selectOption`.
- Simular cliques e hovers reais: `Locator.click`, `Locator.hover`.
- Digitar caractere a caractere (máscara/autocomplete por tecla): `Locator.pressSequentially`.
- Enviar atalhos de teclado: `Locator.press`.
- Fazer upload de arquivos: `Locator.setInputFiles`.
- Arrastar e soltar: `Locator.dragTo` (ou controle manual com `Mouse`).

## Entrada de texto

`Locator.fill` é a forma mais simples de preencher campos de formulário. Ele foca o elemento e dispara um evento `input` com o texto informado. Funciona com `<input>`, `<textarea>` e `[contenteditable]`.

```ts
import { test } from '@playwright/test';

// Texto simples
await page.getByRole('textbox').fill('Peter');

// Input de data
await page.getByLabel('Data de nascimento').fill('2020-02-02');

// Input de hora
await page.getByLabel('Horário da consulta').fill('13:15');

// Input de data/hora local
await page.getByLabel('Horário local').fill('2020-03-02T05:15');
```

> **Dica de implementação:** use seletores semânticos (`getByRole`, `getByLabel`, `getByTestId`) em vez de seletores CSS frágeis. Veja [Locators](./locators.md).

## Checkboxes e radio buttons

`Locator.setChecked` marca e desmarca uma checkbox ou um radio button. Funciona com `input[type=checkbox]`, `input[type=radio]` e elementos `[role=checkbox]`.

```ts
// Marca a checkbox
await page.getByLabel('Concordo com os termos acima').check();

// Afirma o estado "marcado"
await expect(page.getByLabel('Assinar newsletter')).toBeChecked();

// Seleciona o radio button
await page.getByLabel('XL').check();
```

Você também pode usar `uncheck()` para desmarcar, e a opção `{ force: true }` para ignorar as verificações de actionability quando estritamente necessário.

## Seleção de opções (`<select>`)

Seleciona uma ou várias opções no elemento `<select>` com `Locator.selectOption`. Você pode informar o `value` ou o `label` da opção. Múltiplas opções podem ser selecionadas passando um array.

```ts
// Seleção única por value ou label
await page.getByLabel('Escolha uma cor').selectOption('blue');

// Seleção única pelo label
await page.getByLabel('Escolha uma cor').selectOption({ label: 'Blue' });

// Múltiplas opções
await page.getByLabel('Escolha várias cores').selectOption(['red', 'green', 'blue']);
```

## Clique de mouse

Executa um clique simples, como um usuário real.

```ts
// Clique genérico
await page.getByRole('button').click();

// Duplo clique
await page.getByText('Item').dblclick();

// Clique com o botão direito
await page.getByText('Item').click({ button: 'right' });

// Shift + clique
await page.getByText('Item').click({ modifiers: ['Shift'] });

// Control/Cmd + clique (ControlOrMeta funciona em Windows/Linux e macOS)
await page.getByText('Item').click({ modifiers: ['ControlOrMeta'] });

// Hover (passar o mouse) sobre o elemento
await page.getByText('Item').hover();

// Clica no canto superior esquerdo
await page.getByText('Item').click({ position: { x: 0, y: 0 } });
```

Sob o capô, este e outros métodos relacionados ao ponteiro:

- esperam o elemento com o seletor informado existir no DOM;
- esperam que ele esteja visível (não vazio, sem `display:none`, sem `visibility:hidden`);
- esperam que ele pare de se mover (por exemplo, até que uma transição CSS termine);
- rolam o elemento para a viewport;
- esperam que o ponto de ação possa receber eventos de ponteiro (por exemplo, não está coberto por outro elemento);
- tentam novamente caso o elemento seja desanexado (detached) durante qualquer uma das verificações acima.

### Forçando o clique

Às vezes a aplicação usa lógica não trivial onde, ao passar o mouse, um elemento cobre o alvo e intercepta o clique. Esse comportamento é indistinguível de um bug em que o elemento é coberto e o clique é despachado para outro lugar. Se você sabe que isso está acontecendo, ignore as verificações de [actionability](./actionability.md) e forçe o clique:

```ts
await page.getByRole('button').click({ force: true });
```

> **Cuidado:** use `force: true` apenas quando tiver certeza de que a cobertura é esperada. Ignorar a actionability esconde possíveis bugs de UI.

### Clique programático

Se você não está interessado em testar a aplicação em condições reais e quer simular o clique por qualquer meio, dispare o comportamento de `HTMLElement.click()` simplesmente enviando um evento de clique no elemento com `Locator.dispatchEvent`:

```ts
await page.getByRole('button').dispatchEvent('click');
```

## Digitação de caracteres

:::caution
Na maior parte do tempo, você deve inserir texto com `Locator.fill` (veja [Entrada de texto](#entrada-de-texto)). Você só precisa digitar caractere a caractere se houver tratamento especial de teclado na página (máscara, autocomplete etc.).
:::

Digite no campo caractere por caractere, como um usuário com um teclado real, usando `Locator.pressSequentially`.

```ts
// Pressiona as teclas uma a uma
await page.locator('#area').pressSequentially('Hello World!');

// Digita com 100ms de intervalo entre as teclas
await page.locator('#area').pressSequentially('Hello', { delay: 100 });
```

Este método emite todos os eventos de teclado necessários (`keydown`, `keyup` e `keypress`). O `delay` opcional simula o comportamento de um usuário real.

## Teclas e atalhos

```ts
// Pressiona Enter
await page.getByText('Enviar').press('Enter');

// Dispara Control+Right
await page.getByRole('textbox').press('Control+ArrowRight');

// Pressiona o sinal $ no teclado
await page.getByRole('textbox').press('$');
```

O método `Locator.press` foca o elemento selecionado e produz um único pressionamento de tecla. Ele aceita os nomes lógicos de teclas emitidos na propriedade `keyboardEvent.key` dos eventos de teclado:

```txt
Backquote, Minus, Equal, Backslash, Backspace, Tab, Delete, Escape,
ArrowDown, End, Enter, Home, Insert, PageDown, PageUp, ArrowRight,
ArrowUp, F1 - F12, Digit0 - Digit9, KeyA - KeyZ, etc.
```

- Você também pode especificar um único caractere que deseja produzir, como `"a"` ou `"#"`.
- Modificadores suportados: `Shift`, `Control`, `Alt`, `Meta`.

`"Shift+a"` e `"Shift+A"` produzem resultados diferentes (sensível a maiúsculas/minúsculas). Atenção: você ainda precisa especificar o `A` maiúsculo em `Shift+A` para produzir o caractere maiúsculo; `Shift+a` produz minúsculo (como se `CapsLock` estivesse ativado).

```ts
// <input id=name>
await page.locator('#name').press('Shift+A');

// <input id=name>
await page.locator('#name').press('Shift+ArrowLeft');
```

Atalhos como `"Control+o"` ou `"Control+Shift+T"` também são suportados: o modificador é pressionado e mantido enquanto a tecla subsequente é pressionada.

## Upload de arquivos

Selecione arquivos de entrada para upload usando `Locator.setInputFiles`. Ele espera que o primeiro argumento aponte para um [input element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input) do tipo `"file"`. Vários arquivos podem ser passados em um array. Caminhos relativos são resolvidos em relação ao diretório de trabalho atual. Um array vazio limpa os arquivos selecionados.

```ts
import path from 'path';

// Seleciona um arquivo
await page.getByLabel('Enviar arquivo').setInputFiles(path.join(__dirname, 'myfile.pdf'));

// Seleciona múltiplos arquivos
await page.getByLabel('Enviar arquivos').setInputFiles([
  path.join(__dirname, 'file1.txt'),
  path.join(__dirname, 'file2.txt'),
]);

// Seleciona um diretório
await page.getByLabel('Enviar diretório').setInputFiles(path.join(__dirname, 'mydir'));

// Remove todos os arquivos selecionados
await page.getByLabel('Enviar arquivo').setInputFiles([]);

// Faz upload de um buffer em memória
await page.getByLabel('Enviar arquivo').setInputFiles({
  name: 'file.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('this is test'),
});
```

### Upload via seletor de arquivos dinâmico

Se o elemento `input` é criado dinamicamente, intercepte o evento `filechooser` iniciando a espera **antes** da ação que o dispara:

```ts
// Inicia a espera pelo seletor de arquivos antes do clique. Note: sem await.
const fileChooserPromise = page.waitForEvent('filechooser');
await page.getByLabel('Enviar arquivo').click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles(path.join(__dirname, 'myfile.pdf'));
```

## Foco em elemento

Para páginas dinâmicas que tratam eventos de foco, focue o elemento informado com `Locator.focus`.

```ts
await page.getByLabel('Senha').focus();
```

## Arrastar e soltar (Drag and Drop)

Execute uma operação de arrastar e soltar com `Locator.dragTo`. Este método vai:

- passar o mouse sobre o elemento que será arrastado;
- pressionar o botão esquerdo do mouse;
- mover o mouse até o elemento que receberá o drop;
- soltar o botão esquerdo do mouse.

```ts
await page.locator('#item-to-be-dragged').dragTo(page.locator('#item-to-drop-at'));
```

### Arrastando manualmente

Se quiser controle preciso, use métodos de mais baixo nível: `Locator.hover`, `Mouse.down`, `Mouse.move` e `Mouse.up`.

```ts
await page.locator('#item-to-be-dragged').hover();
await page.mouse.down();
await page.locator('#item-to-drop-at').hover();
await page.mouse.up();
```

:::note
Se a sua página depende do evento `dragover`, você precisa de pelo menos dois movimentos de mouse para dispará-lo em todos os navegadores. Repita o `Mouse.move` ou `Locator.hover` duas vezes: hover no elemento a arrastar, mouse down, hover no destino, hover no destino novamente, mouse up.
:::

## Rolagem (Scroll)

Na maior parte do tempo o Playwright rola automaticamente antes de qualquer ação. Portanto, você não precisa rolar explicitamente.

```ts
// Rola automaticamente para que o botão fique visível
await page.getByRole('button').click();
```

Em casos raros, você pode precisar rolar manualmente — por exemplo, para forçar uma "lista infinita" a carregar mais elementos, ou para posicionar a página para uma captura de tela específica. A forma mais confiável é localizar um elemento que você quer tornar visível e rolá-lo para a viewport.

```ts
// Rola o rodapé para a viewport, forçando uma "lista infinita" a carregar mais conteúdo
await page.getByText('Texto do rodapé').scrollIntoViewIfNeeded();
```

Para controle mais preciso, use `Mouse.wheel` ou `Locator.evaluate`:

```ts
// Posiciona o mouse e rola com a roda
await page.getByTestId('scrolling-container').hover();
await page.mouse.wheel(0, 10);

// Alternativamente, rola programaticamente um elemento específico
await page.getByTestId('scrolling-container').evaluate(e => (e as HTMLElement).scrollTop += 100);
```

## Exemplo completo

Arquivo de teste completo e executável (`tests/input.spec.ts`) cobrindo os principais padrões de entrada:

```ts title="tests/input.spec.ts"
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Formulário de cadastro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com/cadastro');
  });

  test('preenche e envia o formulário', async ({ page }) => {
    // Texto
    await page.getByLabel('Nome').fill('Peter');

    // Data
    await page.getByLabel('Data de nascimento').fill('2020-02-02');

    // Checkbox
    await page.getByLabel('Concordo com os termos').check();
    await expect(page.getByLabel('Concordo com os termos')).toBeChecked();

    // Radio
    await page.getByLabel('Plano Premium').check();

    // Select
    await page.getByLabel('País').selectOption({ label: 'Brasil' });

    // Upload
    await page.getByLabel('Currículo').setInputFiles(path.join(__dirname, 'fixtures/cv.pdf'));

    // Envio
    await page.getByRole('button', { name: 'Enviar' }).click();

    // Asserção pós-envio
    await expect(page.getByText('Cadastro realizado')).toBeVisible();
  });

  test('arrasta um item para a lista de favoritos', async ({ page }) => {
    await page.locator('#item-1').dragTo(page.locator('#favoritos'));
    await expect(page.locator('#favoritos')).toContainText('Item 1');
  });
});
```

## Armadilhas comuns

- **Usar `type`/`pressSequentially` para tudo:** prefira `Locator.fill`. `pressSequentially` só é necessário quando há máscara de input, autocomplete ou outro tratamento por tecla pressionada.
- **`force: true` em excesso:** ignorar a actionability esconde bugs reais de UI (overlay, elemento fora da tela, animação em andamento).
- **Caminhos de upload relativos:** `setInputFiles` resolve caminhos relativos ao diretório de trabalho, não ao arquivo de teste. Use `path.join(__dirname, ...)` para robustez.
- **`dispatchEvent('click')` para validar cliques reais:** isso não executa a verificação de actionability nem simula coordenadas de ponteiro; use apenas para disparar handlers específicos.
- **Esperar `filechooser` depois do clique:** inicie `page.waitForEvent('filechooser')` **antes** de clicar, senão o evento já terá passado.

## Boas práticas

- Use seletores semânticos e estáveis ([Locators](./locators.md)) — evite XPath/CSS baseados em layout.
- Centralize dados de teste e fixtures em `fixtures/` ou use [Test Fixtures](./test-fixtures-js.md).
- Combine ações com asserções (por exemplo, `toBeChecked()`, `toHaveValue()`) para validar o resultado da interação.
- Para formulários complexos, considere o [Page Object Model](./pom.md) para reaproveitar interações.
- Deixe o Playwright cuidar da rolagem/visibility; só role manualmente quando houver necessidade específica (lista infinita, screenshot posicionado).
