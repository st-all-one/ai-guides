---
id: getting-started-mcp
title: "Playwright MCP"
---

## Introdução

O servidor Playwright MCP fornece capacidades de automação de navegador via [Model Context Protocol](https://modelcontextprotocol.io), permitindo que LLMs interajam com páginas web usando snapshots de acessibilidade estruturados. Funciona com VS Code, Cursor, Windsurf, Claude Desktop e qualquer outro cliente MCP — sem necessidade de modelos de visão. Todo o conteúdo desta documentação assume **TypeScript** como linguagem de suporte (quando você roda o servidor via `npx`).

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) 20 ou mais recente
- Um cliente MCP: VS Code, Cursor, Windsurf, Claude Code, Claude Desktop ou similar

## Começando

### Instalação

Adicione o servidor Playwright MCP ao seu cliente usando a configuração padrão:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

#### VS Code

Clique em um dos botões abaixo para instalar diretamente:

[<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code" />](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522playwright%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540playwright%252Fmcp%2540latest%2522%255D%257D) [<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5" />](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522playwright%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540playwright%252Fmcp%2540latest%2522%255D%257D)

Ou instale via CLI do VS Code:

```bash
code --add-mcp '{"name":"playwright","command":"npx","args":["@playwright/mcp@latest"]}'
```

#### Cursor

[<img src="https://cursor.com/deeplink/mcp-install-dark.svg" alt="Install in Cursor" />](https://cursor.com/en/install-mcp?name=Playwright&config=eyJjb21tYW5kIjoibnB4IEBwbGF5d3JpZ2h0L21jcEBsYXRlc3QifQ%3D%3D)

Ou vá em `Cursor Settings` → `MCP` → `Add new MCP Server` e use o tipo command com `npx @playwright/mcp@latest`.

#### Claude Code

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

#### Claude Desktop

Siga o [guia de instalação](https://modelcontextprotocol.io/quickstart/user) do MCP e use a configuração padrão acima.

#### Outros clientes

A configuração padrão funciona com a maioria dos clientes MCP, incluindo Windsurf, Cline, Goose, Kiro, Codex, Copilot CLI e outros. Consulte a documentação de MCP do seu cliente sobre onde colocar a configuração.

### Primeira interação

Assim que o servidor estiver conectado, peça à sua assistente de IA para interagir com uma página web:

```txt
Navigate to https://demo.playwright.dev/todomvc and add a few todo items.
```

A assistente usará as ferramentas do Playwright MCP para abrir o navegador, navegar até a página e interagir com os elementos — tudo via snapshots de acessibilidade estruturados, em vez de screenshots.

## Recursos centrais

### Snapshots de acessibilidade

O Playwright MCP opera sobre a árvore de acessibilidade da página, não sobre pixels. Quando uma ferramenta roda, ela retorna um snapshot estruturado mostrando os elementos, seus roles e o conteúdo textual. A LLM usa as refs dos snapshots para interagir com a página:

```txt
- heading "todos" [level=1]
- textbox "What needs to be done?" [ref=e5]
- listitem:
  - checkbox "Toggle Todo" [ref=e10]
  - text: "Buy groceries"
```

A LLM lê esse snapshot e usa `ref=e5` para digitar no textbox ou `ref=e10` para marcar o checkbox.

### Interagindo com páginas

O Playwright MCP fornece ferramentas para todas as interações comuns de navegador:

-   **Navegação**: abrir URLs, voltar/avançar, recarregar páginas.
-   **Clicar e digitar**: clicar em elementos, digitar texto, preencher formulários, selecionar dropdowns.
-   **Screenshots**: capturar a página atual ou elementos específicos para verificação visual.
-   **Teclado e mouse**: pressionar teclas, hover, arrastar e soltar.
-   **Dialogs**: aceitar ou dispensar diálogos do navegador.
-   **Abas**: criar, fechar e alternar entre abas do navegador.

### Rodando código Playwright

Para interações complexas que vão além de chamadas individuais de ferramenta, use a ferramenta `browser_run_code_unsafe` para executar scripts Playwright diretamente. Esta ferramenta roda JavaScript arbitrário no processo do servidor Playwright e é equivalente a RCE — habilite-a apenas para clientes MCP confiáveis:

```txt
Run this Playwright code to verify the todo count:
async (page) => {
  const count = await page.getByTestId('todo-count').textContent();
  return count;
}
```

### Monitoramento e mock de rede

Inspecione o tráfego de rede e faça mock de respostas de API:

-   **Ver requisições de rede**: liste todas as requisições feitas desde o carregamento.
-   **Mock de rotas**: configure casamento de padrões de URL para retornar respostas customizadas.
-   **Mensagens de console**: acesse a saída do console do navegador para depuração.

### Storage state

Salve e restaure o estado do navegador, incluindo cookies e localStorage:

-   **Salvar estado**: persiste autenticação e dados de sessão em um arquivo.
-   **Restaurar estado**: carrega estado salvo anteriormente em uma nova sessão.
-   **Gerenciamento de cookies**: lista, obtém, define e apaga cookies individuais.

## Configuração

### Modo headed

Por padrão, o Playwright MCP roda o navegador em modo headed para que você veja o que está acontecendo. Para rodar em headless:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headless"
      ]
    }
  }
}
```

### Seleção de navegador

Escolha qual navegador usar:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser=firefox"
      ]
    }
  }
}
```

Valores suportados: `chrome`, `firefox`, `webkit`, `msedge`.

### Perfil de usuário

O Playwright MCP suporta três modos de perfil:

-   **Persistente (padrão)**: estado de login e cookies são preservados entre sessões. O perfil é armazenado em `ms-playwright/mcp-{channel}-{workspace-hash}` no diretório de cache da sua plataforma, então projetos diferentes recebem perfis separados automaticamente. Sobrescreva com `--user-data-dir`.
-   **Isolado**: cada sessão começa do zero. passe `--isolated` para habilitar. Você pode carregar estado inicial com `--storage-state`.
-   **Extensão do navegador**: conecte-se às abas do seu navegador existente com a [Playwright Extension](https://github.com/microsoft/playwright/blob/main/packages/extension/README.md). passe `--extension` para habilitar.

### Arquivo de configuração

Para configuração avançada, use um arquivo de configuração JSON:

```bash
npx @playwright/mcp@latest --config path/to/config.json
```

O arquivo de configuração suporta opções de navegador, opções de contexto, regras de rede, timeouts e mais. Veja o [repositório do Playwright MCP](https://github.com/microsoft/playwright-mcp/blob/main/config.d.ts) para o schema completo.

### Servidor autônomo (standalone)

Ao rodar um navegador headed em um sistema sem display ou a partir de processos worker da IDE, inicie o servidor MCP separadamente com transporte HTTP:

```bash
npx @playwright/mcp@latest --port 8931
```

Sessões HTTP usam um heartbeat de cinco segundos. Se o seu cliente MCP ou proxy não responder aos pings iniciados pelo servidor, defina `PLAYWRIGHT_MCP_PING_TIMEOUT_MS` para um timeout maior em milissegundos. Defina como `0` para desabilitar o heartbeat.

Então aponte seu cliente MCP para o endpoint HTTP:

```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/mcp"
    }
  }
}
```

## Referência rápida

| Ação                    | Como fazer                                                     |
| ----------------------- | ------------------------------------------------------------ |
| **Instalar servidor**   | Adicione a configuração padrão ao seu cliente MCP            |
| **Navegar para página** | Peça: "Go to https://example.com"                            |
| **Clicar em elemento**  | Peça: "Click the Submit button"                             |
| **Preencher formulário**| Peça: "Fill in the email field with test@example.com"       |
| **Screenshot**          | Peça: "Take a screenshot of the page"                      |
| **Rodar código Playwright** | Peça: "Run this Playwright code: ..."                   |
| **Mock de API**         | Peça: "Mock the /api/users endpoint to return ..."          |
| **Usar modo headed**    | Padrão. passe `--headless` para desabilitar                  |
| **Escolher navegador**  | passe `--browser=firefox` nos args                           |

## Próximos passos

-   [Escrever testes usando web-first assertions, fixtures de página e locators](./writing-tests-js.md)
-   [Rodar seus testes em CI](./ci-intro.md)
-   [Saiba mais sobre o Trace Viewer](./trace-viewer.md)
