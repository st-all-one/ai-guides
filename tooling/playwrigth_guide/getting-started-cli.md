---
id: getting-started-cli
title: "Agentes de código (playwright-cli)"
---

## Introdução

O Playwright traz o `playwright-cli`, uma interface de linha de comando para automação de navegador projetada para **coding agents** (agentes de código). Ela oferece controle do navegador eficiente em tokens por meio de comandos CLI concisos e skills instaláveis, sendo ideal para agentes que precisam equilibrar automação de navegador com grandes codebases e raciocínio dentro de janelas de contexto limitadas.

### `playwright-cli` vs Playwright MCP

- **`playwright-cli`** é melhor para **coding agents** (Claude Code, GitHub Copilot etc.) que preferem fluxos de trabalho baseados em skills e eficientes em tokens. Os comandos CLI evitam carregar grandes schemas de ferramentas e árvores de acessibilidade verbosas no contexto do modelo.
- **MCP** é melhor para loops agenticos especializados que se beneficiam de estado persistente e raciocínio iterativo sobre a estrutura da página, como automação exploratória ou workflows autônomos de longa duração. Veja o [guia de introdução ao MCP](./getting-started-mcp.md).

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- O Playwright para sua linguagem, **ou** [Node.js](https://nodejs.org/) 20+ para o pacote autônomo `@playwright/cli`
- Um coding agent: Claude Code, GitHub Copilot ou similar

## Instalação

Instale a CLI autônoma globalmente (funciona com qualquer linguagem):

```bash
npm install -g @playwright/cli@latest
playwright-cli --help
```

Ou use a CLI que já vem com a sua instalação do Playwright (JavaScript / TypeScript):

```bash
npx playwright cli --help
```

Quando usar um entry point embutido, substitua `playwright-cli` por `npx playwright cli` nos comandos abaixo.

### Instalando skills

Coding agents como Claude Code e GitHub Copilot podem usar skills instaladas localmente para obter contexto mais rico sobre os comandos disponíveis:

```bash
playwright-cli install --skills
```

Para compartilhar as skills em todos os seus projetos, adicione a flag `-g` para instalá-las no diretório home (`~/.claude/skills` ou, com `--skills=agents`, `~/.agents/skills`):

```bash
playwright-cli install --skills -g
```

### Operação sem skills

Você também pode apontar seu agente diretamente para a CLI e deixá-lo descobrir os comandos sozinho:

```txt
Test the "add todo" flow on https://demo.playwright.dev/todomvc using playwright-cli.
Check playwright-cli --help for available commands.
```

## Primeiros passos

### Demo interativa

Tente pedir ao seu coding agent:

```txt
Use playwright skills to test https://demo.playwright.dev/todomvc/.
Take screenshots for all successful and failing scenarios.
```

### Passo a passo manual

Você também pode rodar os comandos manualmente para ver como a CLI funciona:

```bash
playwright-cli open https://demo.playwright.dev/todomvc/ --headed
playwright-cli type "Buy groceries"
playwright-cli press Enter
playwright-cli type "Water flowers"
playwright-cli press Enter
playwright-cli check e21
playwright-cli screenshot
```

Após cada comando, a CLI emite um snapshot do estado atual da página:

```txt
### Page
- Page URL: https://demo.playwright.dev/todomvc/#/
- Page Title: React • TodoMVC
### Snapshot
[Snapshot](.playwright-cli/page-2026-02-14T19-22-42-679Z.yml)
```

## Comandos principais

### Interagindo com páginas

```bash
playwright-cli open [url]               # abre o navegador, opcionalmente navega para a url
playwright-cli goto <url>               # navega para uma url
playwright-cli click <ref> [button]     # clica em um elemento
playwright-cli type <text>              # digita texto em um elemento editável
playwright-cli fill <ref> <text>        # preenche texto em um elemento editável
playwright-cli select <ref> <value>     # seleciona uma opção em um dropdown
playwright-cli check <ref>              # marca um checkbox ou radio button
playwright-cli uncheck <ref>            # desmarca um checkbox
playwright-cli hover <ref>              # passa o mouse sobre um elemento
playwright-cli drag <startRef> <endRef> # arrasta e solta entre elementos
playwright-cli upload <files...>        # faz upload de um ou mais arquivos
playwright-cli close                    # fecha a página
```

### Selecionando elementos

Use as refs dos snapshots para selecionar elementos:

```bash
playwright-cli snapshot                 # obtém um snapshot com refs de elementos
playwright-cli click e15                # clica usando uma ref
```

Você também pode usar seletores CSS ou por role:

```bash
playwright-cli click "#main > button.submit"
playwright-cli click "role=button[name=Submit]"
playwright-cli click "#footer >> role=button[name=Submit]"
```

### Screenshots e snapshots

```bash
playwright-cli snapshot                 # captura um snapshot da página
playwright-cli snapshot --filename=f    # salva o snapshot em um arquivo específico
playwright-cli screenshot               # screenshot da página atual
playwright-cli screenshot [ref]         # screenshot de um elemento específico
playwright-cli screenshot --filename=f  # salva com um nome de arquivo específico
playwright-cli screenshot --hires       # captura usando pixels do dispositivo
playwright-cli pdf                      # salva a página como PDF
```

### Navegação

```bash
playwright-cli go-back                  # volta
playwright-cli go-forward               # avança
playwright-cli reload                   # recarrega a página
```

### Teclado e mouse

```bash
playwright-cli press <key>              # pressiona uma tecla (ex.: Enter, ArrowLeft)
playwright-cli keydown <key>            # tecla pressionada (down)
playwright-cli keyup <key>              # tecla solta (up)
playwright-cli mousemove <x> <y>        # move o mouse
playwright-cli mousedown [button]       # botão do mouse pressionado
playwright-cli mouseup [button]         # botão do mouse solto
playwright-cli mousewheel <dx> <dy>     # rola a página
```

### Abas (tabs)

```bash
playwright-cli tab-list                 # lista todas as abas
playwright-cli tab-new [url]            # cria uma nova aba
playwright-cli tab-select <index>       # seleciona uma aba
playwright-cli tab-close [index]        # fecha uma aba
```

### Rede

```bash
playwright-cli requests                 # lista requisições de rede desde o carregamento
playwright-cli request <num>            # mostra detalhes de uma requisição
playwright-cli route <pattern> [opts]   # faz mock de requisições de rede
playwright-cli route-list               # lista rotas ativas
playwright-cli unroute [pattern]        # remove rotas
```

### Armazenamento (storage)

```bash
playwright-cli state-save [filename]    # salva o storage state (cookies, localStorage)
playwright-cli state-load <filename>    # carrega o storage state

# Cookies
playwright-cli cookie-list [--domain]   # lista cookies
playwright-cli cookie-get <name>        # obtém um cookie
playwright-cli cookie-set <name> <val>  # define um cookie
playwright-cli cookie-delete <name>     # apaga um cookie
playwright-cli cookie-clear             # limpa todos os cookies

# localStorage
playwright-cli localstorage-list        # lista entradas
playwright-cli localstorage-get <key>   # obtém um valor
playwright-cli localstorage-set <k> <v> # define um valor
playwright-cli localstorage-delete <k>  # apaga uma entrada
playwright-cli localstorage-clear       # limpa tudo
```

### DevTools

```bash
playwright-cli console [min-level]      # lista mensagens de console
playwright-cli eval <func> [ref]        # avalia JavaScript na página
playwright-cli run-code <code>          # roda um snippet de código Playwright
playwright-cli tracing-start            # inicia a gravação de trace
playwright-cli tracing-stop             # para a gravação de trace
playwright-cli video-start              # inicia a gravação de vídeo
playwright-cli video-chapter <title>    # adiciona um marcador de capítulo ao vídeo
playwright-cli video-stop --filename=f  # para a gravação de vídeo
```

## Sessions

A CLI mantém o perfil do navegador em memória por padrão — cookies e storage state são preservados entre chamadas dentro de uma session, mas perdidos quando o navegador fecha. Use `--persistent` para salvar o perfil em disco.

### Sessions nomeadas

Rode múltiplas instâncias de navegador para projetos diferentes:

```bash
playwright-cli open https://playwright.dev
playwright-cli -s=example open https://example.com --persistent
playwright-cli list                     # lista todas as sessions
```

Você pode configurar seu coding agent para usar uma session específica:

```bash
PLAYWRIGHT_CLI_SESSION=todo-app claude .
```

### Gerenciamento de sessions

```bash
playwright-cli list                     # lista todas as sessions
playwright-cli close-all                # fecha todos os navegadores
playwright-cli kill-all                 # encerra à força todos os processos de navegador
playwright-cli -s=name delete-data      # apaga os dados de usuário de uma session nomeada
```

## Monitoramento

Use `playwright-cli show` para abrir um dashboard visual para observar e controlar todas as sessions de navegador em execução:

```bash
playwright-cli show
```

O dashboard oferece:

- **Grid de sessions** — todas as sessions ativas agrupadas por workspace, cada uma com uma prévia de screencast ao vivo, nome da session, URL atual e título da página. Clique em uma session para ampliar.
- **Detalhe da session** — uma visão ao vivo da session selecionada com barra de abas, controles de navegação e controle remoto completo. Clique na viewport para assumir o mouse e o teclado; pressione Escape para liberar.

## Configuração

### Modo headed

A CLI roda em headless por padrão. Para ver o navegador:

```bash
playwright-cli open https://playwright.dev --headed
```

### Seleção de navegador

```bash
playwright-cli open --browser=chrome    # usa um navegador específico
playwright-cli open --browser=firefox
playwright-cli open --browser=webkit
playwright-cli open --browser=msedge
```

### Arquivo de configuração

Para configurações avançadas, use um arquivo de configuração JSON:

```bash
playwright-cli --config path/to/config.json open example.com
```

A CLI também carrega automaticamente `.playwright/cli.config.json`, se presente. O arquivo de configuração suporta opções de navegador, opções de contexto, regras de rede, timeouts e mais. Rode `playwright-cli --help` para a lista completa de opções.

Exemplo de `cli.config.json`:

```json title=".playwright/cli.config.json"
{
  "browser": "chromium",
  "headless": false,
  "contextOptions": {
    "viewport": { "width": 1280, "height": 720 },
    "locale": "pt-BR"
  },
  "timeout": 30000
}
```

### Extensão do navegador

Conecte-se às abas do seu navegador existente em vez de lançar um novo navegador:

```bash
playwright-cli attach --extension
```

Isso requer que a [Playwright Extension](https://github.com/microsoft/playwright/blob/main/packages/extension/README.md) esteja instalada.

## Depurando testes

Coding agents podem pausar um teste no início, conectar-se com o `playwright-cli` e explorar o navegador ao vivo — útil para diagnosticar e corrigir falhas.

```bash
# JavaScript / TypeScript
PLAYWRIGHT_HTML_OPEN=never npx playwright test --debug=cli
# → Instruções de depuração com o nome da session, ex.: tw-abcdef
playwright-cli attach tw-abcdef
```

Mantenha o teste rodando em segundo plano enquanto você se conecta. A skill instalada documenta esse fluxo para agents.

> **Boas práticas:** combine `--debug=cli` com `playwright-cli show` para monitorar visualmente a session enquanto o agente a controla por linha de comando.

## Referência rápida

| Ação                    | Comando                                             |
| ----------------------- | --------------------------------------------------- |
| **Instalar a CLI**      | `npm install -g @playwright/cli@latest`             |
| **Usar a CLI embutida** | `npx playwright cli …`                              |
| **Instalar skills**     | `playwright-cli install --skills`                   |
| **Abrir uma página**    | `playwright-cli open https://example.com`           |
| **Clicar em elemento**  | `playwright-cli click e15`                          |
| **Digitar texto**       | `playwright-cli type "hello world"`                 |
| **Screenshot**          | `playwright-cli screenshot`                         |
| **Snapshot da página**  | `playwright-cli snapshot`                           |
| **Modo headed**         | `playwright-cli open https://example.com --headed`  |
| **Usar Firefox**        | `playwright-cli open --browser=firefox`             |
| **Monitorar sessions**  | `playwright-cli show`                               |
| **Depurar teste JS**    | `npx playwright test --debug=cli`                   |

## Próximos passos

- [Escrever testes usando web-first assertions, fixtures de página e locators](./writing-tests-js.md)
- [Rodar seus testes em CI](./ci-intro.md)
- [Saiba mais sobre o Trace Viewer](./trace-viewer.md)
