---
id: videos
title: "Gravação de vídeos dos testes (TypeScript)"
---

## Introdução

Com o Playwright você pode gravar vídeos dos seus testes. O Playwright Test controla a gravação pela opção `video` no `playwright.config.ts`. Por padrão, os vídeos estão desligados.

Valores possíveis para `video`:

- `'off'` — Não grava vídeo.
- `'on'` — Grava vídeo para cada teste.
- `'retain-on-failure'` — Grava para cada teste, mas remove os vídeos das execuções bem-sucedidas.
- `'on-first-retry'` — Grava vídeo apenas quando um teste está sendo repetido pela primeira vez.

Os arquivos de vídeo aparecem no diretório de saída dos testes, normalmente `test-results`. Veja [`property: TestOptions.video`] para configuração avançada.

Os vídeos são salvos ao fechar o [browser context](./browser-contexts.md), ao final de um teste. Se você criar um browser context manualmente, certifique-se de aguardar `BrowserContext.close`.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    video: 'on-first-retry',
  },
});
```

Você também pode especificar o tamanho do vídeo e anotações:

- O tamanho do vídeo assume por padrão o tamanho do viewport reduzido para caber em 800x800. O vídeo do viewport é posicionado no canto superior esquerdo, reduzido para caber se necessário. Defina o `viewport` coerente com o tamanho de vídeo desejado.
- `show: { actions }` destaca cada ação visualmente com o contorno do elemento e o subtítulo da ação. A propriedade `duration` controla por quanto tempo cada anotação é exibida (padrão `500`ms).
- `show: { test }` anota o vídeo com as informações do teste atual, com `level` configurável.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    video: {
      mode: 'on-first-retry',
      size: { width: 640, height: 480 },
      show: {
        actions: {
          duration: 500,
          position: 'top-right',
          fontSize: 14,
        },
        test: {
          level: 'step',
          position: 'top-left',
          fontSize: 12,
        },
      },
    },
  },
});
```

Para cenários com múltiplas páginas, acesse o arquivo de vídeo associado à página via `Page.video`.

```ts
const path = await page.video()?.path();
```

:::note
O vídeo só está disponível após a página ou o browser context ser fechado.
:::

## Exemplo completo

Arquivo `playwright.config.ts` configurando gravação para a primeira retry e `tests/videos.spec.ts` consumindo o arquivo de vídeo ao final do teste:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    video: {
      mode: 'on-first-retry',
      size: { width: 1280, height: 720 },
    },
  },
});
```

```ts title="tests/videos.spec.ts"
import { test, expect } from '@playwright/test';

test('grava e valida o vídeo da página', async ({ page }, testInfo) => {
  await page.goto('https://example.com');
  await page.getByRole('link').first().click();

  // O vídeo só está disponível após o fechamento do contexto (fim do teste).
  const video = page.video();
  expect(video).toBeTruthy();

  if (testInfo.retry === 0) {
    // Em execuções normais não há vídeo garantido; em retries, sim.
    const path = await video!.path();
    expect(typeof path).toBe('string');
  }
});
```

## Armadilhas comuns

- **Vídeo indisponível durante o teste:** `page.video()?.path()` só retorna o caminho após o contexto ser fechado. Não tente ler o arquivo no meio do teste.
- **Esquecer `context.close()` (library):** em modo library, os vídeos só são gravados ao fechar o contexto.
- **`size` x viewport:** o vídeo assume o tamanho do viewport por padrão; defina `size` e o `viewport` coerentes para evitar letterboxing.
- **Muitos vídeos em `'on'`:** isso consome bastante disco; prefira `'retain-on-failure'` ou `'on-first-retry'` em CI.

## Boas práticas

- Use `'on-first-retry'` em pipelines de CI para obter evidência apenas quando o teste falha e é repetido.
- Combine vídeos com [`Trace Viewer`](./trace-viewer.md) para investigação completa de falhas.
- Em modo library, sempre feche o contexto explicitamente com `await context.close()` para garantir a gravação.
- Mantenha o diretório de vídeos (`test-results/`) fora do controle de versão ou limpe-o entre execuções.
