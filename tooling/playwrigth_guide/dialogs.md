---
id: dialogs
title: "Diálogos (alert, confirm, prompt, beforeunload)"
---

## Introdução

O Playwright consegue interagir com diálogos da página web, como [`alert`](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert), [`confirm`](https://developer.mozilla.org/en-US/docs/Web/API/Window/confirm), [`prompt`](https://developer.mozilla.org/en-US/docs/Web/API/Window/prompt), bem como a confirmação [`beforeunload`](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event). Para diálogos de impressão, veja [Diálogos de impressão](#diálogos-de-impressão).

## Diálogos alert(), confirm(), prompt()

Por padrão, os diálogos são automaticamente dispensados (dismissed) pelo Playwright, então você não precisa tratá-los. Porém, você pode registrar um handler de diálogo **antes** da ação que a dispara para `dialog.accept()` ou `dialog.dismiss()`.

```ts
import { test, expect } from '@playwright/test';

test('aceitar diálogo automaticamente', async ({ page }) => {
  await page.goto('https://example.com');

  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button').click();
});
```

> :::note
> O listener de `dialog` **deve tratar** o diálogo. Caso contrário, sua ação trava — seja `locator.click()` ou qualquer outra. Isso ocorre porque diálogos web são modais e bloqueiam a execução da página até serem tratados.
> :::

Como resultado, o snippet a seguir **nunca resolve** (está incorreto):

:::warning[ERRADO!]
```ts
page.on('dialog', dialog => console.log(dialog.message()));
await page.getByRole('button').click(); // Vai travar aqui
```
:::

```ts
import { test } from '@playwright/test';

test('exemplo ERRADO que trava', async ({ page }) => {
  await page.goto('https://example.com');

  page.on('dialog', dialog => console.log(dialog.message())); // não trata!
  await page.getByRole('button').click(); // Vai travar aqui
});
```

Formas corretas de tratar:

```ts
import { test } from '@playwright/test';

test('tratar confirm e prompt', async ({ page }) => {
  await page.goto('https://example.com');

  // Accept com valor (útil para prompt).
  page.on('dialog', async dialog => {
    if (dialog.type() === 'prompt') {
      await dialog.accept('meu texto');
    } else {
      await dialog.accept();
    }
  });

  await page.getByRole('button', { name: 'Confirmar' }).click();
});
```

> :::note
> Se não houver listener para `dialog`, todos os diálogos são automaticamente dispensados.
> :::

### Quando usar

- **Testes que não dependem do diálogo:** não registre handler; o Playwright dispensa automaticamente.
- **Validar texto do diálogo:** registre handler, afirme `dialog.message()` e chame `accept()`/`dismiss()`.
- **Preencher `prompt`:** passe o valor para `dialog.accept('valor')`.

### Armadilhas comuns

- Registrar handler que apenas `console.log` e não chama `accept()`/`dismiss()` → ação trava para sempre.
- Registrar o handler **depois** da ação que dispara o diálogo → o diálogo pode já ter sido dispensado/perdido.
- Esquecer que `prompt` retorna `null` quando dispensado; para capturar o valor digitado, use `dialog.accept('valor')`.

## Diálogo beforeunload

Quando `page.close()` é invocado com a opção `runBeforeUnload` verdadeira, a página executa seus handlers de unload. Este é o único caso em que `page.close()` não aguarda a página fechar de fato, pois ela pode permanecer aberta ao final da operação.

Você pode registrar um handler de diálogo para tratar o `beforeunload` manualmente:

```ts
import { test, expect } from '@playwright/test';

test('tratar diálogo beforeunload', async ({ page }) => {
  await page.goto('https://example.com');

  page.on('dialog', async dialog => {
    expect(dialog.type()).toBe('beforeunload');
    await dialog.dismiss();
  });

  await page.close({ runBeforeUnload: true });
});
```

> :::note
> Ao usar `runBeforeUnload: true`, o Playwright não garante que a página feche. Combine com o handler de diálogo para controlar o comportamento.
> :::

## Diálogos de impressão

Para afirmar que um diálogo de impressão via [`window.print`](https://developer.mozilla.org/en-US/docs/Web/API/Window/print) foi disparado, use o snippet a seguir:

```ts
import { test } from '@playwright/test';

test('afirmar abertura do diálogo de impressão', async ({ page }) => {
  await page.goto('https://example.com');

  // Substitui window.print por uma promise antes de qualquer clique.
  await page.evaluate(() => {
    (window as unknown as { waitForPrintDialog?: Promise<void> }).waitForPrintDialog =
      new Promise(resolve => ((window as unknown as { print?: () => void }).print = resolve));
  });

  await page.getByText('Print it!').click();

  // Aguarda a promise de impressão ser resolvida.
  await page.waitForFunction(() => (window as unknown as { waitForPrintDialog?: Promise<void> }).waitForPrintDialog);
});
```

> :::note
> Certifique-se de avaliar o script **antes** de clicar no botão / após a página carregar. O snippet aguarda o diálogo de impressão ser aberto depois do clique.
> :::

## Exemplo completo

Arquivo `tests/dialogs.spec.ts` cobrindo os três tipos de diálogo e validação de mensagem:

```ts
import { test, expect } from '@playwright/test';

test('valida mensagem de confirm e aceita', async ({ page }) => {
  await page.goto('https://example.com');

  const messages: string[] = [];
  page.on('dialog', async dialog => {
    messages.push(dialog.message());
    await dialog.accept();
  });

  await page.getByRole('button', { name: 'Excluir' }).click();

  expect(messages[0]).toContain('Tem certeza');
});

test('preenche prompt e valida resultado', async ({ page }) => {
  await page.goto('https://example.com');

  page.on('dialog', async dialog => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept('Playwright');
  });

  await page.getByRole('button', { name: 'Digite seu nome' }).click();
  await expect(page.getByText('Olá, Playwright')).toBeVisible();
});
```

## Boas práticas

- Sempre chame `dialog.accept()` ou `dialog.dismiss()` dentro do handler; nunca apenas logue.
- Registre o handler de `dialog` **antes** da ação que dispara o diálogo.
- Use `dialog.type()` (`alert`, `confirm`, `prompt`, `beforeunload`) para ramificar o tratamento.
- Para `prompt`, passe o valor em `dialog.accept('valor')` para simular entrada do usuário.
- Se o teste não depende do diálogo, não registre handler — o Playwright dispensa automaticamente.
