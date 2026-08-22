---
id: downloads
title: "Downloads"
---

## Introdução

Para todo anexo baixado pela página, o evento `download` é emitido. Todos esses anexos são baixados em uma pasta temporária. Você pode obter a URL de download, o nome do arquivo e o stream de conteúdo usando o objeto `Download` do evento.

Você pode especificar onde persistir os arquivos baixados usando a opção `downloadsPath` em `browserType.launch()` (apenas na biblioteca `playwright` pura).

> :::note
> Arquivos baixados são deletados quando o contexto de navegador que os produziu é fechado.
> :::

A forma mais simples de tratar o download:

```ts
import { test, expect } from '@playwright/test';

test('baixar arquivo e salvar', async ({ page }) => {
  await page.goto('https://example.com');

  // Inicia a espera pelo download ANTES de clicar. Note: sem await.
  const downloadPromise = page.waitForEvent('download');
  await page.getByText('Download file').click();
  const download = await downloadPromise;

  // Aguarda o processo de download concluir e salva o arquivo.
  await download.saveAs('/path/to/save/at/' + download.suggestedFilename());
});
```

Quando usa a biblioteca pura e deseja definir o diretório de destino dos downloads:

```ts
import { chromium } from 'playwright';
import { expect } from '@playwright/test';

const browser = await chromium.launch({ downloadsPath: './downloads' });
const context = await browser.newContext();
const page = await context.newPage();

const downloadPromise = page.waitForEvent('download');
await page.getByText('Download file').click();
const download = await downloadPromise;

// O arquivo já foi salvo em ./downloads com o nome sugerido.
console.log(await download.path());
```

## Variações

Se você não tem ideia do que inicia o download, ainda pode tratar o evento:

```ts
import { test } from '@playwright/test';

test('escutar downloads globais', async ({ page }) => {
  await page.goto('https://example.com');

  page.on('download', async download => {
    console.log(await download.path());
  });
});
```

> :::note
> Tratar o evento bifurca o fluxo de controle e torna o script mais difícil de acompanhar. Seu cenário pode terminar enquanto o arquivo ainda baixa, já que o fluxo principal não aguarda essa operação resolver. Prefira `page.waitForEvent('download')` com `await`.
> :::

### Quando usar

- **Download disparado por clique conhecido:** use `page.waitForEvent('download')` antes do clique (padrão recomendado).
- **Validação de conteúdo:** use `download.path()` para ler o arquivo com `fs` e afirmar seu conteúdo.
- **Persistência:** use `download.saveAs(caminho)` para mover o arquivo da pasta temporária para um destino estável.

### Armadilhas comuns

- **Esquecer de iniciar a espera antes do clique:** o evento `download` pode passar sem ser capturado. Sempre crie a promessa antes da ação.
- **Ler o arquivo antes de concluir:** `download.path()` retorna o caminho assim que o download inicia; para garantir conteúdo completo, use `saveAs()` (que aguarda a conclusão) ou `await download.path()` após o término.
- **Arquivo sumindo:** como o download vive em pasta temporária, salve com `saveAs()` antes de o contexto fechar, senão ele é deletado.

## Exemplo completo

Arquivo `tests/downloads.spec.ts` que baixa um CSV e valida seu conteúdo:

```ts
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('baixa CSV e valida cabeçalho', async ({ page }) => {
  await page.goto('https://example.com/relatorios');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const download = await downloadPromise;

  // Caminho temporário do arquivo baixado.
  const path = await download.path();
  expect(path).toBeTruthy();

  // Lê e valida conteúdo.
  const content = readFileSync(path!, 'utf-8');
  expect(content.startsWith('nome,email,telefone')).toBeTruthy();

  // Persiste o arquivo em local estável.
  await download.saveAs(`./downloads/${download.suggestedFilename()}`);
});
```

## Boas práticas

- Inicie `page.waitForEvent('download')` **antes** da ação que dispara o download.
- Use `download.suggestedFilename()` para nomear o arquivo salvo de forma consistente com a aplicação.
- Para validar conteúdo, leia `download.path()` com APIs de `fs` do Node; para garantir integridade, use `saveAs()` primeiro.
- Em testes que comparam snapshots, salve o arquivo e use `expect().toMatchSnapshot()` sobre ele.
- Lembre-se de que o arquivo é removido ao fechar o contexto — salve antes de `context.close()`.

> :::note
> Para upload de arquivos, veja a seção de [upload de arquivos](./input.md#upload-files).
> :::
