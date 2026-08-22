---
id: getting-started-vscode
title: "VS Code"
---

import LiteYouTube from '@site/src/components/LiteYouTube';

## Introdução

A extensão do Playwright para o VS Code traz todo o poder do Playwright Test diretamente para o seu editor, permitindo rodar, depurar e gerar testes com uma experiência fluida baseada em UI. Este guia vai te conduzir pela configuração da extensão e pelo uso de seus recursos centrais para turbinar seu fluxo de testes end-to-end. Toda a documentação aqui assume **TypeScript** com `@playwright/test`.

<LiteYouTube
    id="WvsLGZnHmzw"
    title="Getting Started with Playwright in VS Code"
/>

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- [Visual Studio Code](https://code.visualstudio.com/)

## Começando

### Instalação e configuração

1.  **Instale a extensão**: abra a visão de Extensions no VS Code (`Ctrl+Shift+X` ou `Cmd+Shift+X`) e procure por "Playwright". [Instale a extensão oficial da Microsoft](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright).

![install playwright extension](./images/getting-started/vscode-extension.png)

2.  **Instale o Playwright**: após instalar a extensão, abra a Command Palette (`Ctrl+Shift+P` ou `Cmd+Shift+P`) e rode o comando **Test: Install Playwright**.

![install playwright](./images/getting-started/install-playwright.png)

3.  **Selecione os navegadores**: escolha os navegadores para seus testes (ex.: Chromium, Firefox, WebKit). Você também pode adicionar um workflow do GitHub Actions para rodar os testes em CI. Essas configurações podem ser alteradas depois no seu `playwright.config.ts`.

![install browsers](./images/getting-started/install-browsers.png)

### Abrindo a sidebar de testes

Clique no ícone de **Testing** na Activity Bar do VS Code para abrir o Test Explorer. Aqui você encontrará seus testes, além da sidebar do Playwright para gerenciar projects, ferramentas e configurações.

![Testing Sidebar](./images/getting-started/testing-sidebar.png)

## Recursos centrais

### Rodando seus testes

<LiteYouTube
    id="mQmcIBMsc38"
    title="Running Playwright Tests in VS Code"
/>

-   **Rodar um único teste**: clique no ícone verde de "play" ao lado de qualquer teste para executá-lo. O botão muda para um check verde se o teste passar ou um X vermelho se falhar. Você verá o tempo de execução ao lado do nome do teste. O painel Test Results abre automaticamente na parte inferior, mostrando um resumo da execução.

![run a single test](./images/getting-started/run-single-test.png)

-   **Rodar todos os testes**: você pode rodar todos os testes em diferentes níveis. Clique no play ao lado de um arquivo de teste para rodar todos os testes daquele arquivo, ou clique no play no topo do Test Explorer para rodar todos os testes do projeto.

![run all tests](./images/getting-started/run-all-tests.png)

-   **Rodar em múltiplos navegadores**: na sidebar do Playwright, marque as caixas dos projects (navegadores) que deseja testar. Projects no Playwright representam configurações diferentes de navegador — cada project tipicamente corresponde a um navegador (Chromium, Firefox ou WebKit) com suas próprias opções, como viewport, emulação de dispositivo etc. Quando você roda um teste, ele executa em todos os projects selecionados.

![Selecting projects to run tests on](./images/getting-started/select-projects.png)

-   **Mostrar o navegador (Show Browser)**: para assistir aos testes executando em uma janela de navegador ao vivo, habilite a opção **Show Browser** na sidebar. Desabilite-a para rodar em modo headless.

![show browsers while running tests](./images/getting-started/show-browser.png)

### Depurando seus testes

<LiteYouTube
    id="tJF7UhA59Gc"
    title="Debugging Playwright tests in VS Code"
/>

A extensão oferece ferramentas poderosas de depuração. Você pode definir breakpoints, inspecionar variáveis, ver mensagens de erro detalhadas, obter sugestões de correção com IA e usar o trace viewer para analisar a execução passo a passo.

-   **Usando breakpoints**: defina um breakpoint clicando na gutter ao lado do número da linha. Clique com o botão direito no teste e selecione **Debug Test**. O teste pausa no breakpoint, permitindo inspecionar variáveis e avançar pelo código.

    ![setting debug mode](./images/getting-started/debug-mode.png)

-   **Depuração ao vivo (Live Debugging)**: com o **Show Browsers** habilitado, clique em um locator no seu código. O Playwright destacará o elemento correspondente no navegador, facilitando a verificação de locators.

  ![live debugging in vs code](./images/getting-started/live-debugging.png)

-   **Vendo mensagens de erro**: se um teste falha, a extensão exibe mensagens de erro detalhadas, incluindo valores esperados vs. recebidos e um call log completo, diretamente no editor.

![error messaging in vs code](./images/getting-started/error-messaging.png)

-   **Corrigir com IA (Fix with AI)**: quando um teste falha, clique no ícone de estrela ao lado do erro para obter uma sugestão de correção com IA do Copilot. O Copilot analisa o erro e sugere uma alteração de código.

![fix with ai in vs code](./images/getting-started/fix-with-ai.png)

-   **Depurando com o Trace Viewer**: para depuração abrangente, habilite a opção **Show Trace Viewer** na sidebar do Playwright. Quando o teste terminar, um trace detalhado abre automaticamente, fornecendo uma linha do tempo completa da execução. O trace viewer é especialmente útil para:
    - **Análise passo a passo**: navegue por cada ação com timestamps precisos
    - **Inspeção de DOM**: veja snapshots do DOM em qualquer ponto da execução
    - **Monitoramento de rede**: examine todas as requisições e respostas
    - **Logs de console**: acesse todas as mensagens e erros do console do navegador
    - **Source mapping**: pule direto para o código-fonte que executou cada ação
    - **Depuração visual**: veja screenshots e entenda o que o usuário veria em cada step

    O trace viewer é valioso especialmente ao depurar testes flaky ou interações complexas.

![trace viewer debugging](./images/getting-started/trace-viewer-debug.png)

Para saber mais, veja nosso [guia do Trace Viewer](./trace-viewer.md).

### Gerando testes com o CodeGen

O CodeGen é a ferramenta de geração de testes do Playwright que cria código automaticamente gravando suas interações com a página. Em vez de escrever testes do zero, você navega pela aplicação enquanto o CodeGen captura suas ações e as converte em código de teste confiável, com locators e assertions adequados.

<LiteYouTube
    id="5XIZPqKkdBA"
    title="Generating Playwright tests in VS Code"
/>

-   **Gravar um novo teste (Record new)**: clique em **Record new** na sidebar. Uma janela de navegador abre. Conforme você interage com a página, o Playwright gera o código do teste automaticamente. Você também pode gerar assertions a partir da toolbar de gravação.

![record a new test](./images/getting-started/record-new-test.png)

-   **Gravar na posição do cursor (Record at cursor)**: posicione o cursor dentro de um teste existente e clique em **Record at cursor** para adicionar novas ações naquele ponto.
![record at cursor](./images/getting-started/record-at-cursor.png)

-   **Pegar um locator (Pick a Locator)**: use a ferramenta **Pick locator** para clicar em qualquer elemento no navegador aberto. O Playwright determina o melhor locator e o copia para a área de transferência, pronto para colar no seu código.

![pick locators](./images/getting-started/pick-locator.png)

Para saber mais, veja nosso [guia do CodeGen](./codegen.md).

## Recursos avançados

### Dependências de project

Use [dependências de project](./test-projects-js.md) para definir testes de setup que rodam antes de outros testes. Por exemplo, você pode criar um teste de login que roda primeiro e reutilizar aquele estado autenticado em múltiplos testes, sem logar de novo em cada um. No VS Code, você vê esses testes de setup no Test Explorer e pode rodá-los independentemente.

![setup tests in vscode](./images/getting-started/setup-tests.png)

Para saber mais, veja nosso [guia de Dependências de Project](./test-projects-js.md).

### Global Setup

Para tarefas que precisam rodar uma única vez antes de todos os testes (como popular um banco de dados), use o **Global Setup**. Você pode disparar o global setup e o teardown manualmente a partir da sidebar do Playwright.

![running global setup](./images/getting-started/global-setup.png)

### Múltiplas configurações

Se você tem múltiplos arquivos `playwright.config.ts`, pode alternar entre eles usando o ícone de engrenagem na sidebar do Playwright. Isso permite trabalhar facilmente com diferentes suítes de teste ou ambientes.

![Selecting a configuration file](./images/getting-started/selecting-configuration.png)

## Boas práticas

-   **Mantenha o `playwright.config.ts` versionado** e defina nele os projects de navegador, timeouts e retries — assim o VS Code e a linha de comando ficam consistentes.
-   **Use `Record new` para prototipar, mas revise o código gerado**: o CodeGen gera locators resilientes (baseados em role/text/testid), mas valide se eles refletem a semântica real da sua página.
-   **Habilite o Trace Viewer em falhas** (`trace: 'on-first-retry'` no config) para investigar testes flaky diretamente do editor.

## Referência rápida

| Ação                  | Como fazer no VS Code                                     |
| --------------------- | -------------------------------------------------------- |
| **Instalar Playwright** | Command Palette → `Test: Install Playwright`            |
| **Rodar um teste**      | Clique no ícone de "play" ao lado do teste              |
| **Depurar um teste**    | Defina um breakpoint, clique com botão direito → `Debug Test` |
| **Mostrar navegador ao vivo** | Habilite `Show Browsers` na sidebar do Playwright  |
| **Gravar um novo teste** | Clique em `Record new` na sidebar do Playwright         |
| **Pegar um locator**    | Clique em `Pick locator` na sidebar do Playwright        |
| **Ver o trace do teste** | Habilite `Show Trace Viewer` na sidebar do Playwright   |

## Próximos passos

-   [Escrever testes usando web-first assertions, fixtures de página e locators](./writing-tests-js.md)
-   [Rodar seus testes em CI](./ci-intro.md)
-   [Saiba mais sobre o Trace Viewer](./trace-viewer.md)
