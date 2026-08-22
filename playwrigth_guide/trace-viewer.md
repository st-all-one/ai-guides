---
id: trace-viewer
title: "Trace Viewer"
---

## Introdução

O **Playwright Trace Viewer** é uma ferramenta GUI que ajuda você a explorar *traces* do Playwright gravados após a execução do script. *Traces* são uma ótima forma de depurar seus testes quando eles falham no CI. Você pode abrir traces [localmente](#abrindo-o-trace-viewer) ou no navegador em [trace.playwright.dev](https://trace.playwright.dev).

## Quando usar

- **Falhas intermitentes (flaky) no CI:** abra o trace da retry para entender exatamente o que aconteceu.
- **Depuração de passos específicos:** inspecione a *DOM snapshot*, o log de ação, o código-fonte e a rede de cada passo.
- **Investigação de tempo:** use a timeline para isolar um intervalo de tempo e filtrar logs/rede.
- **Não use para** desenvolvimento local contínuo — prefira o [UI Mode](./test-ui-mode-js.md), que já traça cada teste automaticamente.

## Abrindo o Trace Viewer

Você pode abrir um trace salvo usando a CLI do Playwright ou no navegador em [trace.playwright.dev](https://trace.playwright.dev). Certifique-se de informar o caminho completo até onde seu arquivo `trace.zip` está localizado.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright show-trace path/to/trace.zip
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright show-trace path/to/trace.zip
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright show-trace path/to/trace.zip
```

</TabItem>
</Tabs>

### Usando [trace.playwright.dev](https://trace.playwright.dev)

[trace.playwright.dev](https://trace.playwright.dev) é uma variante hospedada estaticamente do Trace Viewer. Você pode fazer upload de um arquivo de trace via *drag and drop* ou pelo botão `Select file`.

O Trace Viewer carrega o trace inteiramente no seu navegador e não transmite nenhum dado externamente.

![Drop Playwright Trace to load](../playwrigth_docs/images/getting-started/trace-viewer-failed-test.png)

### Visualizando traces remotos

Você pode abrir traces remotos diretamente usando sua URL. Isso facilita ver o trace remoto sem precisar baixar o arquivo manualmente de runs de CI, por exemplo.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright show-trace https://example.com/trace.zip
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright show-trace https://example.com/trace.zip
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright show-trace https://example.com/trace.zip
```

</TabItem>
</Tabs>

Ao usar [trace.playwright.dev](https://trace.playwright.dev), você também pode passar a URL do seu trace enviado para algum armazenamento acessível (ex.: dentro do seu CI) como um parâmetro de query. Regras de CORS (Cross-Origin Resource Sharing) podem se aplicar.

```txt
https://trace.playwright.dev/?trace=https://demo.playwright.dev/reports/todomvc/data/e6099cadf79aa753d5500aa9508f9d1dbd87b5ee.zip
```

## Gravando um trace

### Tracing localmente

Para gravar um trace em modo de desenvolvimento, defina a flag `--trace` como `on` ao rodar seus testes. Você também pode usar o [UI Mode](./test-ui-mode-js.md) para uma melhor experiência de desenvolvimento, pois ele traça cada teste automaticamente.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright test --trace on
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test --trace on
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright test --trace on
```

</TabItem>
</Tabs>

Você então abre o HTML report e clica no ícone de trace para abrir o trace.

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright show-report
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright show-report
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright show-report
```

</TabItem>
</Tabs>

### Tracing no CI

*Traces* devem ser rodados na integração contínua na primeira retry de um teste que falhou, definindo a opção `trace: 'on-first-retry'` no arquivo de configuração de teste. Isso produzirá um arquivo `trace.zip` para cada teste que foi repetido.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';
export default defineConfig({
  retries: 1,
  use: {
    trace: 'on-first-retry',
  },
});
```

Opções disponíveis para gravar um trace:

- `'on-first-retry'` - Grava um trace apenas na primeira retry de um teste.
- `'on-all-retries'` - Grava traces para todas as retries de teste.
- `'off'` - Não grava trace.
- `'on'` - Grava um trace para cada teste. (não recomendado, é pesado para performance)
- `'retain-on-failure'` - Grava um trace para cada teste, mas o remove de runs de teste bem-sucedidos.

Você também pode usar `trace: 'retain-on-failure'` se não habilitar retries mas ainda quiser traces para testes que falharam.

Há opções mais granulares disponíveis, veja [`TestOptions.trace`](./test-use-options-js.md).

Se você não usa o Playwright como Test Runner, use a API [`BrowserContext.tracing`](./test-configuration-js.md) em vez disso.

#### Gravando um trace via Library API (TypeScript)

Quando você usa a Library API diretamente (fora do test runner), inicie e pare o tracing manualmente no contexto:

```ts
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();

// Inicie o tracing antes de criar/navegar uma página.
await context.tracing.start({ screenshots: true, snapshots: true });

const page = await context.newPage();
await page.goto('https://playwright.dev');

// Pare o tracing e exporte para um arquivo zip.
await context.tracing.stop({ path: 'trace.zip' });
```

## Trace Viewer features

### Actions

Na aba **Actions** você pode ver qual locator foi usado para cada ação e quanto tempo cada uma levou para rodar. Passe o mouse sobre cada ação do seu teste e veja visualmente a mudança na *DOM snapshot*. Volte e avance no tempo e clique em uma ação para inspecionar e depurar. Use as abas **Before** e **After** para ver visualmente o que aconteceu antes e depois da ação.

![actions tab in trace viewer](../playwrigth_docs/images/getting-started/trace-viewer-failed-test.png)

**Selecionar cada ação revela:**

- Action snapshots
- Action log
- Localização do código-fonte

### Screenshots

Quando o tracing é feito com a opção [`Tracing.start.screenshots`](./test-use-options-js.md) ligada (padrão), cada trace grava um *screencast* e o renderiza como uma *film strip*. Você pode passar o mouse sobre a *film strip* para ver uma imagem ampliada de cada ação e estado, o que ajuda a encontrar facilmente a ação que deseja inspecionar.

Clique duas vezes em uma ação para ver o intervalo de tempo daquela ação. Você pode usar o slider na timeline para aumentar as ações selecionadas e elas serão mostradas na aba Actions, e todos os logs de console e de rede serão filtrados para mostrar apenas os logs das ações selecionadas.

### Snapshots

Quando o tracing é feito com a opção [`Tracing.start.snapshots`](./test-use-options-js.md) ligada (padrão), o Playwright captura um conjunto de *DOM snapshots* completos para cada ação. Dependendo do tipo de ação, ele capturará:

| Tipo | Descrição |
|------|-------------|
|Before|Um snapshot no momento em que a ação é chamada.|
|Action|Um snapshot no momento da execução do input. Este tipo de snapshot é especialmente útil para explorar exatamente onde o Playwright clicou.|
|After|Um snapshot após a ação.|

Repare como ele destaca tanto o nó DOM quanto a posição exata do clique.

### Source

Quando você clica em uma ação na barra lateral, a linha de código daquela ação é destacada no painel de código-fonte.

### Call

A aba **Call** mostra informações sobre a ação, como o tempo que levou, qual locator foi usado, se em modo *strict* e qual tecla foi usada.

### Log

Veja um log completo do seu teste para entender melhor o que o Playwright está fazendo nos bastidores, como rolar até a visualização, aguardar elemento ficar visível, habilitado e estável e executar ações como click, fill, press etc.

### Errors

Se seu teste falhar, você verá as mensagens de erro de cada teste na aba **Errors**. A timeline também mostrará uma linha vermelha destacando onde o erro ocorreu. Você também pode clicar na aba source para ver em qual linha do código-fonte o erro está.

### Console

Veja logs de console do navegador assim como do seu teste. Ícones diferentes são exibidos para mostrar se o log veio do navegador ou do arquivo de teste.

Clique duas vezes em uma ação do seu teste na barra lateral de ações. Isso filtrará o console para mostrar apenas os logs feitos durante aquela ação. Clique no botão *Show all* para ver todos os logs de console novamente.

Use a timeline para filtrar ações, clicando em um ponto inicial e arrastando até um ponto final. A aba console também será filtrada para mostrar apenas os logs feitos durante as ações selecionadas.

### Network

A aba **Network** mostra todas as requisições de rede feitas durante o seu teste. Você pode ordenar por diferentes tipos de requisição, status code, método, requisição, content type, duração e tamanho. Clique em uma requisição para ver mais informações sobre ela, como os headers de requisição, headers de resposta, body de requisição e body de resposta.

Clique duas vezes em uma ação do seu teste na barra lateral de ações. Isso filtrará as requisições de rede para mostrar apenas as requisições feitas durante aquela ação. Clique no botão *Show all* para ver todas as requisições de rede novamente.

Use a timeline para filtrar ações, clicando em um ponto inicial e arrastando até um ponto final. A aba network também será filtrada para mostrar apenas as requisições de rede feitas durante as ações selecionadas.

### Metadata

Ao lado da aba Actions você encontrará a aba **Metadata**, que mostra mais informações sobre o seu teste, como o Browser, tamanho da viewport, duração do teste e mais.

### Attachments

A aba **Attachments** permite explorar anexos. Se você estiver fazendo [testes de regressão visual](./test-snapshots-js.md), poderá comparar screenshots examinando o diff da imagem, a imagem atual e a imagem esperada. Ao clicar na imagem esperada, você pode usar o slider para deslizar uma imagem sobre a outra e ver facilmente as diferenças nos seus screenshots.

## Exemplo completo

Configurando traces no CI e abrindo o report:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry', // grava trace apenas na 1ª retry de testes falhos
  },
});
```

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('adiciona item na todo list', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  await page.getByPlaceholder('What needs to be done?').fill('Comprar leite');
  await page.getByPlaceholder('What needs to be done?').press('Enter');
  await expect(page.getByTestId('todo-item')).toHaveText('Comprar leite');
});
```

Ao rodar no CI e um teste falhar na primeira tentativa, um `trace.zip` é gerado. Baixe-o e abra localmente:

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright show-trace trace.zip
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright show-trace trace.zip
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright show-trace trace.zip
```

</TabItem>
</Tabs>

## Armadilhas comuns

- **Trace `on` em todos os testes:** pesa muito a performance. Prefira `on-first-retry` ou `retain-on-failure`.
- **Esperar o trace sem retries:** com `on-first-retry`, se `retries: 0`, nenhum trace é gerado. Garanta `retries >= 1` no CI.
- **Abrir trace de outra máquina sem CORS:** ao usar `trace.playwright.dev/?trace=URL`, o storage remoto deve permitir CORS.
- **Confundir timeline com logs globais:** use duplo-clique ou arraste na timeline para filtrar console/rede por ação.

## Boas práticas

- Habilite `trace: 'on-first-retry'` no CI e `retain-on-failure` localmente quando necessário.
- Use `context.tracing.start({ screenshots: true, snapshots: true })` na Library API para capturar estado completo.
- Aproveite a aba **Attachments** para revisar diffs de regressão visual.
- Combine Trace Viewer com [UI Mode](./test-ui-mode-js.md) no desenvolvimento local para tracing automático por teste.
