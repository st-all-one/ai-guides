---
id: intro
title: "Instalação"
---

## Introdução

O Playwright Test é um framework de testes end-to-end para aplicações web modernas. Ele já traz, nativamente, o test runner, as assertions, o isolamento entre testes, a paralelização e um conjunto rico de ferramentas (trace, codegen, UI mode etc.). O Playwright suporta Chromium, WebKit e Firefox no Windows, Linux e macOS — localmente ou em CI, em modo headless ou headed, com emulação nativa de dispositivos móveis para Chrome (Android) e Mobile Safari.

Todo o código desta documentação é **TypeScript puro** utilizando `@playwright/test`. Recomendamos fortemente o uso de TypeScript, pois ele habilita autocompletar, checagem de tipos e refatoração segura nos seus testes.

**O que você vai aprender**

- [Como instalar o Playwright](./intro-js.md#instalando-o-playwright)
- [O que é instalado](./intro-js.md#o-que-é-instalado)
- [Como executar o teste de exemplo](./intro-js.md#executando-o-teste-de-exemplo)
- [Como abrir o relatório HTML de testes](./intro-js.md#relatório-html-de-testes)

## Instalando o Playwright

Comece instalando o Playwright usando um dos métodos abaixo.

### Usando npm, yarn ou pnpm

O comando abaixo inicializa um novo projeto ou adiciona o Playwright a um projeto existente.

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'}
  ]
}>
<TabItem value="npm">

```bash
npm init playwright@latest
```

</TabItem>

<TabItem value="yarn">

```bash
yarn create playwright
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm create playwright
```

</TabItem>

</Tabs>

Quando solicitado, escolha / confirme:

- TypeScript ou JavaScript (padrão: **TypeScript**)
- Nome da pasta de testes (padrão: `tests`, ou `e2e` caso `tests` já exista)
- Adicionar um workflow do GitHub Actions (recomendado para CI)
- Instalar os navegadores do Playwright (padrão: sim)

Você pode rodar o comando novamente no futuro; ele **não sobrescreve** os testes existentes.

> **Dica de implementação:** sempre escolha TypeScript. O arquivo `playwright.config.ts` gerado usa `defineConfig`, que oferece autocompletar e checagem de tipos para toda a configuração.

### Usando a extensão do VS Code

Você também pode criar e executar testes com a [Extensão do VS Code](./getting-started-vscode-js.md).

## O que é instalado

O Playwright baixa os binários dos navegadores necessários e cria a estrutura inicial abaixo.

```bash
playwright.config.ts         # Configuração dos testes
package.json
package-lock.json            # Ou yarn.lock / pnpm-lock.yaml
tests/
  example.spec.ts            # Teste de exemplo mínimo
```

O [playwright.config](./test-configuration-js.md) centraliza a configuração: navegadores alvo, timeouts, retries, projects, reporters e muito mais. Em projetos existentes, as dependências são adicionadas ao seu `package.json` atual.

A pasta `tests/` contém um teste inicial mínimo. Veja como ele é, em TypeScript:

```ts title="tests/example.spec.ts"
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
```

## Executando o teste de exemplo

Por padrão, os testes rodam em modo headless e em paralelo nos navegadores Chromium, Firefox e WebKit (configurável no [playwright.config](./test-configuration-js.md)). A saída e os resultados agregados são exibidos no terminal.

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'}
  ]
}>
<TabItem value="npm">

```bash
npx playwright test
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test
```

</TabItem>

</Tabs>

![tests running in command line](./images/getting-started/run-tests-cli.png)

Dicas:

- Ver a janela do navegador: adicione `--headed`.
- Rodar um único project/navegador: `--project=chromium`.
- Rodar um único arquivo: `npx playwright test tests/example.spec.ts`.
- Abrir a UI de testes: `--ui`.

Veja [Executando testes](./running-tests-js.md) para detalhes sobre filtragem, modo headed, sharding e retries.

### Quando usar cada opção

| Cenário | Comando |
| ------- | ------- |
| Rodar tudo em paralelo (padrão) | `npx playwright test` |
| Ver o navegador executando | `npx playwright test --headed` |
| Rodar só no Chromium | `npx playwright test --project=chromium` |
| Rodar um arquivo específico | `npx playwright test tests/example.spec.ts` |
| Rodar um teste pelo nome | `npx playwright test -g "has title"` |
| Depurar passo a passo | `npx playwright test --debug` |

## Relatório HTML de testes

Após uma execução, o [HTML Reporter](./test-reporters-js.md#html-reporter) fornece um dashboard filtrável por navegador, passed, failed, skipped, flaky e muito mais. Clique em um teste para inspecionar erros, anexos e steps. Ele abre automaticamente apenas quando há falhas; abra manualmente com o comando abaixo.

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'}
  ]
}>
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
pnpm exec playwright show-report
```

</TabItem>

</Tabs>

![HTML Report](./images/getting-started/html-report-basic.png)

> **Boas práticas:** gere o relatório HTML em CI e faça o upload como artifact. Ele é auto-contido (um únário `.html` + assets) e pode ser aberto por qualquer pessoa sem o Playwright instalado.

## Executando o teste de exemplo em UI Mode

Execute os testes com o [UI Mode](./test-ui-mode-js.md) para obter watch mode, visualização de steps em tempo real, depuração por "time travel" e muito mais.

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'}
  ]
}>

<TabItem value="npm">

```bash
npx playwright test --ui
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright test --ui
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright test --ui
```

</TabItem>

</Tabs>

![UI Mode](./images/getting-started/ui-mode.png)

Veja o [guia detalhado sobre o UI Mode](./test-ui-mode-js.md) para filtros de watch, detalhes de steps e integração com trace.

## Atualizando o Playwright

Atualize o Playwright e baixe novos binários de navegadores e suas dependências:

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'}
  ]
}>
<TabItem value="npm">

```bash
npm install -D @playwright/test@latest
npx playwright install --with-deps
```

</TabItem>

<TabItem value="yarn">

```bash
yarn add --dev @playwright/test@latest
yarn playwright install --with-deps
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm install --save-dev @playwright/test@latest
pnpm exec playwright install --with-deps
```

</TabItem>

</Tabs>

Verifique a versão instalada:

<Tabs
  groupId="js-package-manager"
  defaultValue="npm"
  values={[
    {label: 'npm', value: 'npm'},
    {label: 'yarn', value: 'yarn'},
    {label: 'pnpm', value: 'pnpm'}
  ]
}>
<TabItem value="npm">

```bash
npx playwright --version
```

</TabItem>

<TabItem value="yarn">

```bash
yarn playwright --version
```

</TabItem>

<TabItem value="pnpm">

```bash
pnpm exec playwright --version
```

</TabItem>

</Tabs>

## Requisitos de sistema

- Node.js: versões estáveis mais recentes (22.x, 24.x ou 26.x).
- Windows 11+, Windows Server 2019+ ou Windows Subsystem for Linux (WSL).
- macOS 14 (Sonoma) ou posterior.
- Debian 12 / 13, Ubuntu 22.04 / 24.04 / 26.04 (x86-64 ou arm64).

> **Armadilhas comuns (gotchas):**
> - Rodar `npm install @playwright/test` (sem o `@latest` ou sem o `init`) instala o pacote mas **não** cria o `playwright.config.ts` nem instala os navegadores. Prefira `npm init playwright@latest` para scaffolding completo.
> - Em CI, lembre-se de instalar os navegadores (`npx playwright install --with-deps`) ou o comando `test` falhará com erro de navegador ausente.

## Próximos passos

- [Escrever testes usando web-first assertions, fixtures e locators](./writing-tests-js.md)
- [Executar testes únicos ou múltiplos; modo headed](./running-tests-js.md)
- [Gerar testes com o Codegen](./codegen-intro.md)
- [Visualizar o trace dos seus testes](./trace-viewer-intro-js.md)
