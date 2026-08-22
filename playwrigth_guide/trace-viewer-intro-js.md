---
id: trace-viewer-intro
title: "Trace Viewer (Introdução)"
---

## Introdução

O **Playwright Trace Viewer** é uma ferramenta GUI que permite explorar *traces* do Playwright gravados dos seus testes, ou seja, você pode voltar e avançar através de cada ação do seu teste e ver visualmente o que estava acontecendo durante cada ação.

**Você vai aprender**

- [Como gravar um trace](./trace-viewer-intro-js.md#gravando-um-trace)
- [Como abrir o HTML report](./trace-viewer-intro-js.md#abrindo-o-html-report)
- [Como abrir e visualizar o trace](./trace-viewer-intro-js.md#abrindo-o-trace)

## Gravando um Trace

Por padrão, o arquivo [playwright.config](./trace-viewer.md#gravando-um-trace) contém a configuração necessária para criar um arquivo `trace.zip` para cada teste. Os traces são configurados para rodar `on-first-retry`, ou seja, rodam na primeira retry de um teste falho. Além disso, `retries` é definido como 2 quando rodando no CI e 0 localmente. Isso significa que os traces são gravados na primeira retry de um teste falho, mas não na primeira execução e nem na segunda retry.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';
export default defineConfig({
  retries: process.env.CI ? 2 : 0, // define 2 ao rodar no CI
  // ...
  use: {
    trace: 'on-first-retry', // grava traces na primeira retry de cada teste
  },
});
```

Para saber mais sobre as opções disponíveis para gravar um trace, consulte nosso guia detalhado em [Trace Viewer](./trace-viewer.md).

Traces normalmente rodam em um ambiente de Continuous Integration (CI), porque localmente você pode usar o [UI Mode](./test-ui-mode-js.md) para desenvolver e depurar testes. Porém, se você quiser rodar traces localmente sem usar o [UI Mode](./test-ui-mode-js.md), pode forçar o tracing com `--trace on`.

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

## Quando usar

- **Primeiro contato com traces:** antes de mergulhar nas opções avançadas, este fluxo ensino a gravar e abrir um trace com o mínimo de configuração.
- **Depuração rápida no CI:** quando um teste falha na pipeline, este é o caminho para inspecionar o que aconteceu.

## Abrindo o HTML report

O HTML report mostra um relatório de todos os seus testes que rodaram, em quais browsers, e quanto tempo levaram. Os testes podem ser filtrados por testes que passaram, falharam, flaky ou foram pulados. Você também pode buscar por um teste específico. Clicar em um teste abre a visão detalhada onde você pode ver mais informações, como os erros, os passos do teste e o trace.

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

## Abrindo o trace

No HTML report, clique no ícone de trace ao lado do nome do arquivo de teste para abrir diretamente o trace do teste requerido.

![playwright html report](../playwrigth_docs/images/getting-started/html-report-failed-tests.png)

Você também pode clicar para abrir a visão detalhada do teste e rolar até a aba `'Traces'` e abrir o trace clicando no screenshot do trace.

![playwright html report detailed view](../playwrigth_docs/images/getting-started/html-report-trace.png)

Para saber mais sobre reporters, consulte nosso guia detalhado sobre reporters, incluindo o [HTML Reporter](./test-reporters-js.md#html-reporter).

## Visualizando o trace

Veja traces do seu teste clicando através de cada ação ou passando o mouse usando a timeline e veja o estado da página antes e depois da ação. Inspecione o log, o código-fonte e a rede, erros e console durante cada passo do teste. O trace viewer cria uma *DOM snapshot* para que você possa interagir com ela totalmente e abrir o DevTools do navegador para inspecionar o HTML, CSS, etc.

![playwright trace viewer](../playwrigth_docs/images/getting-started/trace-viewer-failed-test.png)

Para saber mais sobre traces, consulte nosso guia detalhado em [Trace Viewer](./trace-viewer.md).

## Exemplo completo

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
  },
});
```

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
npx playwright test --trace on
npx playwright show-report
```

</TabItem>
<TabItem value="yarn">

```bash
yarn playwright test --trace on
yarn playwright show-report
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm playwright test --trace on
pnpm playwright show-report
```

</TabItem>
</Tabs>

## Armadilhas comuns

- **Esquecer `retries` no CI:** sem retries, `on-first-retry` nunca dispara e nenhum trace é gerado.
- **Abrir report sem ter gerado trace:** o ícone de trace só aparece para testes que efetivamente gravaram um.

## Boas práticas

- Mantenha `trace: 'on-first-retry'` no CI para obter traces só quando necessário, economizando recursos.
- Use o HTML report como ponto de entrada para abrir traces de falhas específicas.
- No desenvolvimento local, prefira o [UI Mode](./test-ui-mode-js.md), que já traça cada teste automaticamente.

## What's next

- [Rodar testes no CI com GitHub Actions](./ci-intro-js.md)
- [Saiba mais sobre Trace Viewer](./trace-viewer.md)
