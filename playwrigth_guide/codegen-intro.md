---
id: codegen-intro
title: "Gerando testes (Introdução)"
---

## Introdução

O Playwright pode gerar testes automaticamente, fornecendo uma forma rápida de começar com testes. O Codegen abre uma janela de navegador para interação e o Playwright Inspector para gravar, copiar e gerenciar seus testes gerados.

**Você vai aprender**

- [Como gravar um teste](./codegen.md#gravando-um-teste)
- [Como gerar locators](./codegen.md#gerando-locators)

## Quando usar

- **Primeiro teste da aplicação:** gere o esqueleto de um fluxo sem escrever código manualmente.
- **Descoberta de bons locators:** deixe o gerador priorizar role/text/testid e ajuste conforme necessário.

## Running Codegen

Use o comando `codegen` para rodar o test generator seguido da URL do site para o qual deseja gerar testes. A URL é opcional e pode ser adicionada diretamente na janela do navegador se omitida.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright codegen demo.playwright.dev/todomvc
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright codegen demo.playwright.dev/todomvc
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright codegen demo.playwright.dev/todomvc
```

</TabItem>
</Tabs>

### Recording a test

Rode o `codegen` e realize ações no navegador. O Playwright gera código para suas interações automaticamente. O Codegen analisa a página renderizada e recomenda o melhor locator, priorizando role, text e test id locators. Quando múltiplos elementos correspondem a um locator, o gerador o melhora para identificar unicamente o elemento alvo, reduzindo falhas e flakiness.

Com o test generator você pode gravar:

- Ações como click ou fill interagindo com a página
- Asserções clicando em um ícone da barra de ferramentas e então em um elemento da página para asserir. Você pode escolher:
  - `'assert visibility'` para asserir que um elemento está visível
  - `'assert text'` para asserir que um elemento contém um texto específico
  - `'assert value'` para asserir que um elemento tem um valor específico

![Recording a test](../playwrigth_docs/images/getting-started/record-test-js.png)

Quando terminar de interagir com a página, pressione o botão `'record'` para parar a gravação e use o botão `'copy'` para copiar o código gerado para seu editor.

Use o botão `'clear'` para limpar o código e começar a gravar novamente. Uma vez terminado, feche a janela do Playwright Inspector ou pare o comando no terminal.

Para saber mais sobre gerar testes, consulte nosso guia detalhado em [Codegen](./codegen.md).

### Generating locators

Você pode gerar [locators](./locators.md) com o test generator.

- Pressione o botão `'Record'` para parar a gravação e o botão `'Pick Locator'` aparecerá
- Clique no botão `'Pick Locator'` e passe o mouse sobre elementos na janela do navegador para ver o locator destacado abaixo de cada elemento
- Clique no elemento que deseja localizar e o código para aquele locator aparecerá no locator playground ao lado do botão Pick Locator
- Edite o locator no locator playground para ajustá-lo finamente e veja o elemento correspondente destacado na janela do navegador
- Use o botão copy para copiar o locator e colá-lo em seu código

![picking a locator](../playwrigth_docs/images/getting-started/pick-locator-js.png)

### Emulation

Você pode gerar testes usando emulação para viewports, devices, color schemes, geolocalização, idioma ou timezone específicos. O test generator também pode preservar o estado autenticado. Consulte o guia [Test Generator](./codegen.md#emulation) para saber mais.

## Exemplo completo

```bash
npx playwright codegen demo.playwright.dev/todomvc
```

No navegador, digite "Estudar Playwright" no campo e pressione Enter; o Inspector gera:

```ts
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  await page.getByPlaceholder('What needs to be done?').click();
  await page.getByPlaceholder('What needs to be done?').fill('Estudar Playwright');
  await page.getByPlaceholder('What needs to be done?').press('Enter');
});
```

## Armadilhas comuns

- **Achar que o código gerado é final:** sempre revise locators e adicione asserções fortes após copiar.
- ** Não usar emulação quando necessário:** se o fluxo depende de viewport/device, passe `--device`/`--viewport` já na gravação.

## Boas práticas

- Use o `codegen` como ponto de partida e não como substituto de testes bem estruturados.
- Prefira `Pick Locator` para obter locators resilientes antes de copiar para o código.
- Combine com o guia completo [Codegen](./codegen.md) para emulação e autenticação.

## What's Next

- [Veja um trace dos seus testes](./trace-viewer-intro-js.md)
