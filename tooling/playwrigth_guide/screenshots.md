---
id: screenshots
title: "Capturas de tela (Screenshots, TypeScript)"
---

## Introdução

Veja abaixo uma forma rápida de capturar uma screenshot e salvá-la em um arquivo:

```ts
await page.screenshot({ path: 'screenshot.png' });
```

A API de Screenshots (método `Page.screenshot`) aceita vários parâmetros para formato de imagem, área de recorte (clip), qualidade etc. Algumas opções úteis: `type` (`'png'` | `'jpeg'`), `quality` (para JPEG), `fullPage`, `clip`, `animations` (`'allow'` | `'disabled'`) e `caret` (`'hide'` | `'initial'`).

### Quando usar

- Gerar evidência visual de um estado da página (relatórios, debug).
- Criar [snapshots visuais](./test-snapshots-js.md) para comparação (`.toHaveScreenshot()`).
- Capturar apenas uma região ou elemento específico.

## Screenshots de página inteira

Uma screenshot de página inteira (full page) é a captura de uma página rolável completa, como se você tivesse uma tela muito alta e a página coubesse nela inteiramente.

```ts
await page.screenshot({ path: 'screenshot.png', fullPage: true });
```

## Capturar em buffer

Em vez de escrever em um arquivo, você pode obter um buffer com a imagem e pós-processá-lo ou passá-lo para uma ferramenta de diff de pixels de terceiros.

```ts
const buffer = await page.screenshot();
console.log(buffer.toString('base64'));
```

## Screenshot de elemento

Às vezes é útil capturar a screenshot de um único elemento. O Playwright rola o elemento para a viewport automaticamente antes de capturar.

```ts
await page.locator('.header').screenshot({ path: 'screenshot.png' });
```

## Exemplo completo

Arquivo `tests/screenshots.spec.ts` demonstrando as três modalidades:

```ts title="tests/screenshots.spec.ts"
import { test, expect } from '@playwright/test';

test('captura a página inteira, um elemento e um buffer', async ({ page }) => {
  await page.goto('https://example.com');

  // Página inteira em arquivo
  await page.screenshot({ path: 'full.png', fullPage: true });

  // Apenas o cabeçalho
  await page.locator('.header').screenshot({ path: 'header.png' });

  // Buffer em memória (ex.: enviar para uma API de diff)
  const buffer = await page.screenshot({ type: 'png' });
  expect(buffer.length).toBeGreaterThan(0);
});
```

> **Comparação visual automatizada:** prefira `expect(locator).toHaveScreenshot()` em vez de salvar arquivos manualmente. O Playwright gerencia o diretório de snapshots, gera o arquivo de referência com `--update-snapshots` e faz o diff pixel a pixel. Veja [Test Snapshots](./test-snapshots-js.md).

## Armadilhas comuns

- **`fullPage` ignora `clip`:** não passe ambos ao mesmo tempo; eles são mutuamente exclusivos.
- **Caminho relativo:** `path` é resolvido em relação ao diretório de trabalho, não ao arquivo de teste. Prefira `path.join(__dirname, '...')` em cenários com `testDir` customizado.
- **Elemento fora da viewport:** `locator.screenshot()` automaticamente rola o elemento para a viewport antes de capturar.
- **Imagens em `base64`:** ao comparar via buffer, lembre-se de que a codificação `base64` não é a imagem em si.

## Boas práticas

- Para comparação visual automatizada, prefira [`Locator.toHaveScreenshot`](./test-assertions-js.md) em vez de salvar arquivos manualmente ([Test Snapshots](./test-snapshots-js.md)).
- Use `fullPage: true` com cuidado em páginas com scroll infinito — a captura pode ficar enorme.
- Combine screenshots com [`Trace Viewer`](./trace-viewer.md) para depuração contextual.
- Mantenha nomes de arquivo determinísticos e versionáveis para facilitar revisão de evidências.
