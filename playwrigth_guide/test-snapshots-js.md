---
id: test-snapshots
title: "Comparações visuais"
---

## Introdução

O Playwright Test inclui a capacidade de produzir e comparar visualmente screenshots usando `await expect(page).toHaveScreenshot()`. Na primeira execução, o Playwright gera os screenshots de referência (golden). Execuções subsequentes comparam contra a referência.

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page).toHaveScreenshot();
});
```

:::warning
A renderização do navegador pode variar conforme o SO host, versão, configurações, hardware, fonte de energia (bateria vs. adaptador), modo headless e outros fatores. Para screenshots consistentes, rode os testes no mesmo ambiente onde os baselines foram gerados.
:::

## Gerando screenshots

Na primeira execução, o test runner informará:

```txt
Error: A snapshot doesn't exist at example.spec.ts-snapshots/example-test-1-chromium-darwin.png, writing actual.
```

Isso ocorre porque ainda não havia o arquivo golden. O método tira vários screenshots até que dois consecutivos coincidam e salva o último no sistema de arquivos. Ele está pronto para ser adicionado ao repositório.

O nome da pasta com as expectativas inicia-se com o nome do arquivo de teste:

```bash
drwxr-xr-x  5 user  group  160 Jun  4 11:46 .
drwxr-xr-x  6 user  group  192 Jun  4 11:45 ..
-rw-r--r--  1 user  group  231 Jun  4 11:16 example.spec.ts
drwxr-xr-x  3 user  group   96 Jun  4 11:46 example.spec.ts-snapshots
```

O nome do snapshot `example-test-1-chromium-darwin.png` é composto por:

- `example-test-1.png` — nome auto-gerado do snapshot. Alternativamente, você pode informar o nome como primeiro argumento de `toHaveScreenshot()`:
  ```ts
  await expect(page).toHaveScreenshot('landing.png');
  ```
- `chromium-darwin` — nome do navegador e da plataforma. Screenshots diferem entre navegadores e plataformas devido a renderização, fontes etc., então você precisará de snapshots diferentes para cada um. Se usar múltiplos projetos na [configuração](./test-configuration.md), o nome do projeto será usado em vez de `chromium`.

O nome e o caminho do snapshot podem ser configurados com [`property: TestConfig.snapshotPathTemplate`] no `playwright.config.ts`.

Snapshots são armazenados como PNG por padrão. Dê ao snapshot uma extensão `.webp` para armazená-lo em WebP (também lossless):

```ts
await expect(page).toHaveScreenshot('landing.webp');
```

> `toHaveScreenshot()` também aceita um array de segmentos de caminho para o snapshot, como `expect().toHaveScreenshot(['relative', 'path', 'to', 'snapshot.png'])`. Porém, esse caminho deve permanecer dentro do diretório de snapshots de cada arquivo de teste (ex.: `a.spec.ts-snapshots`), caso contrário lançará erro.

## Atualizando screenshots

Às vezes você precisa atualizar o screenshot de referência, por exemplo quando a página mudou. Faça isso com a flag `--update-snapshots`.

```bash
npx playwright test --update-snapshots
```

## Opções

### maxDiffPixels

O Playwright Test usa a biblioteca [pixelmatch](https://github.com/mapbox/pixelmatch). Você pode passar várias opções para modificar seu comportamento:

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 });
});
```

Para compartilhar o valor padrão entre todos os testes do projeto, especifique-o no `playwright.config.ts`, global ou por projeto:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: { maxDiffPixels: 100 },
  },
});
```

### stylePath

Você pode aplicar uma stylesheet customizada à página ao tirar o screenshot. Isso permite filtrar elementos dinâmicos ou voláteis, melhorando a determinação (determinism) do screenshot.

```css title="screenshot.css"
iframe {
  visibility: hidden;
}
```

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('example test', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page).toHaveScreenshot({ stylePath: path.join(__dirname, 'screenshot.css') });
});
```

Para compartilhar o valor padrão entre todos os testes do projeto:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      stylePath: './screenshot.css',
    },
  },
});
```

## Snapshots não-imagem

Além de screenshots, você pode usar `expect(value).toMatchSnapshot(snapshotName)` para comparar texto ou dados binários arbitrários. O Playwright Test auto-detecta o tipo de conteúdo e usa o algoritmo de comparação apropriado.

Aqui comparamos o conteúdo de texto contra a referência:

```ts title="example.spec.ts"
import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('https://playwright.dev');
  expect(await page.textContent('.hero__title')).toMatchSnapshot('hero.txt');
});
```

Snapshots são armazenados ao lado do arquivo de teste, em um diretório separado. Por exemplo, o arquivo `my.spec.ts` produz e armazena snapshots no diretório `my.spec.ts-snapshots`. Você deve commitar esse diretório no controle de versão (ex.: `git`) e revisar quaisquer mudanças nele.

## Quando usar

- **`toHaveScreenshot()`** — para detectar regressões visuais de componentes/páginas estáveis (ex.: cabeçalho, modo escuro).
- **`maxDiffPixels`** — quando a renderização tem ruído aceitável (antialiasing, fontes) que não deve quebrar o teste.
- **`stylePath`** — para esconder relógios, iframes de terceiros ou animações que tornariam o snapshot não-determinístico.
- **`toMatchSnapshot()`** — para comparar saídas de texto/JSON/HTML geradas pela aplicação (ex.: relatórios, e-mails).

## Armadilhas comuns

- **Ambiente inconsistente:** rodar o baseline em macOS e o CI em Linux gera diferenças de fonte/pixel. Gere e valide no mesmo ambiente.
- **Conteúdo dinâmico:** datetimes, IDs aleatórios e animações quebram screenshots. Use `stylePath` ou estabilize o DOM antes de capturar.
- **`--update-snapshots` sem revisão:** atualizar e commitar cegamente mascara regressões reais. Revise o diff do snapshot no PR.
- **`maxDiffPixels` muito alto:** esconde regressões legítimas. Use o menor valor que ainda absorva o ruído aceitável.
- **Caminho fora do diretório de snapshots:** passar um array de caminho que saia de `*.spec.ts-snapshots` lança erro.

## Exemplo completo

Um teste de comparação visual com tolerância e stylesheet customizada:

```ts title="visual.spec.ts"
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('homepage looks stable', async ({ page }) => {
  await page.goto('/');
  // Espera o carregamento completo antes de capturar.
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 100,
    stylePath: path.join(__dirname, 'hide-dynamic.css'),
  });
});
```

```css title="hide-dynamic.css"
.ad-banner,
.clock {
  visibility: hidden;
}
```

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      stylePath: './hide-dynamic.css',
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
});
```

## Boas práticas

- Versione os diretórios `*.spec.ts-snapshots` no git e revise mudanças neles como código.
- Gere baselines no mesmo sistema operacional/versão do navegador do CI.
- Estabilize o DOM (dados fixos, sem animações) antes de capturar screenshots.
- Use `toMatchSnapshot()` para validar texto/JSON estruturado além de imagens.
- Atualize snapshots com `--update-snapshots` apenas após confirmar que a mudança visual é intencional.
