---
id: frames
title: "Frames (iframes)"
---

## Introdução

Uma `Page` pode ter um ou mais objetos `Frame` anexados a ela. Cada página tem um frame principal (main frame), e as interações em nível de página (como `click`) assumem operação no frame principal.

Uma página pode ter frames adicionais anexados via a tag HTML `iframe`. Esses frames podem ser acessados para interação dentro do frame.

A forma recomendada de trabalhar com iframes no Playwright é o `frameLocator()`, que retorna um `Locator` relativo ao frame. Isso mantém os benefícios de auto-wait e web-first assertions.

```ts
import { test, expect } from '@playwright/test';

test('preencher campo dentro de um iframe', async ({ page }) => {
  await page.goto('https://example.com');

  // Localiza elemento dentro do frame via frameLocator.
  const username = page.frameLocator('.frame-class').getByLabel('User Name');
  await username.fill('John');

  // Afirmação web-first.
  await expect(username).toHaveValue('John');
});
```

## Objetos Frame

É possível acessar objetos `Frame` usando a API `page.frame()`:

```ts
import { test } from '@playwright/test';

test('acessar frame por nome ou URL', async ({ page }) => {
  await page.goto('https://example.com');

  // Obtém o frame pelo atributo name do iframe.
  const frame = page.frame('frame-login');

  // Obtém o frame pela URL (RegExp).
  const frameByUrl = page.frame({ url: /.*domain.*/ });

  // Interage com o frame.
  if (frame) {
    await frame.fill('#username-input', 'John');
  }
});
```

> :::note
> `page.frame(name)` e `page.frame({ url })` retornam `Frame | null`. Sempre faça a verificação de nulo (`null`) antes de usar, ou use `frameLocator()` (que nunca retorna nulo e já faz auto-wait) quando possível.
> :::

### Quando usar `frameLocator` vs `page.frame`

- **`frameLocator()` (recomendado):** para ações e asserções de elementos dentro do iframe. Mantém strict mode, auto-wait e retries.
- **`page.frame()`:** quando você precisa executar APIs de nível de frame que não estão expostas via locator (ex.: `frame.evaluate()`, `frame.waitForLoadState()`), ou acessar o frame por nome/URL específico.

### Armadilhas comuns

- **Iframe em sandbox ou cross-origin:** o Playwright ainda consegue acessar o conteúdo se o iframe estiver no mesmo contexto, mas não consegue contornar restrições de cross-origin impostas pelo navegador.
- **Frame ainda não carregado:** `page.frame('name')` pode retornar `null` se o iframe ainda não foi anexado. Prefira `frameLocator()` que aguarda automaticamente.
- **Selector errado:** seletores de `frameLocator` devem casar com o elemento `<iframe>` em si, não com o conteúdo interno.

## Exemplo completo

Arquivo `tests/frames.spec.ts` cobrindo login dentro de iframe e leitura de conteúdo via `frame.evaluate`:

```ts
import { test, expect } from '@playwright/test';

test('login dentro de iframe e validação de conteúdo', async ({ page }) => {
  await page.goto('https://example.com/embed');

  // 1) Preenche formulário de login dentro do iframe (via frameLocator).
  const frameLocator = page.frameLocator('#auth-frame');
  await frameLocator.getByLabel('Usuário').fill('admin');
  await frameLocator.getByLabel('Senha').fill('s3nh4!');
  await frameLocator.getByRole('button', { name: 'Entrar' }).click();

  // 2) Usa page.frame() para ler estado interno do iframe.
  const authFrame = page.frame({ url: /.*auth.*/ });
  expect(authFrame).not.toBeNull();

  if (authFrame) {
    const token = await authFrame.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeTruthy();
  }

  // 3) Continua o fluxo na página principal.
  await expect(page.getByText('Bem-vindo')).toBeVisible();
});
```

## Boas práticas

- Prefira `frameLocator()` para interagir com elementos de iframes; ele herda auto-wait e web-first assertions.
- Use seletores estáveis para o `<iframe>` (atributo `name`, `id`, classe ou `title`).
- Evite misturar `page.$()`/handles dentro de iframes; locators são mais resilientes a re-renderizações.
- Para iframes com URL dinâmica, use `page.frame({ url: /padrão/ })` com `RegExp`.
- Lembre-se de que iframes com `sandbox` ou cross-origin podem limitar o que o Playwright consegue inspecionar.
