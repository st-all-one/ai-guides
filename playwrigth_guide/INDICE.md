---
id: indice
title: "Índice do Dossiê Playwright (TypeScript)"
---

# Dossiê Playwright — TypeScript

Dossiê enriquecido e orientado à implementação, focado exclusivamente em **TypeScript** (`@playwright/test`).
Cada arquivo contém exemplos completos e executáveis, configurações íntegras e seções práticas
(*Quando usar*, *Armadilhas comuns*, *Exemplo completo*, *Boas práticas*).

> Documentação de referência original preservada em `../playwrigth_docs/` (não foi alterada).

## 0. Mapa de aprendizagem (ordem recomendada)

1. [Instalação](./intro-js.md) → [TypeScript](./test-typescript-js.md) → [VS Code](./getting-started-vscode-js.md)
2. [Escrevendo testes](./writing-tests-js.md) → [Locators](./locators.md) → [Assertions](./test-assertions-js.md)
3. [Rodando e depurando testes](./running-tests-js.md) → [Debug](./debug.md) → [UI Mode](./test-ui-mode-js.md)
4. [Configuração](./test-configuration-js.md) → [Fixtures](./test-fixtures-js.md) → [Projects](./test-projects-js.md)
5. [Autenticação](./auth.md) → [Rede e Mock](./network.md) → [Testes de API](./api-testing-js.md)
6. [CI](./ci-intro.md) / [CI avançado](./ci.md) → [Docker](./docker.md)

## 1. Fundamentos e instalação

| Arquivo | Assunto |
| :- | :- |
| [intro-js.md](./intro-js.md) | Instalação, `npm init playwright@latest`, estrutura criada, exemplo e HTML report |
| [test-typescript-js.md](./test-typescript-js.md) | TypeScript em Playwright: tipagem, `tsconfig.json`, sem compilação manual |
| [getting-started-cli.md](./getting-started-cli.md) | Agentes de código (`playwright-cli`) |
| [getting-started-vscode-js.md](./getting-started-vscode-js.md) | Extensão VS Code: gravar, rodar e depurar |
| [getting-started-mcp.md](./getting-started-mcp.md) | Playwright MCP (Model Context Protocol) |
| [library-js.md](./library-js.md) | Playwright Library vs Playwright Test: quando usar cada um |
| [languages.md](./languages.md) | Visão geral de linguagens suportadas (foco TS) |
| [canary-releases-js.md](./canary-releases-js.md) | Releases canary e como instalá-los |

## 2. Escrevendo testes

| Arquivo | Assunto |
| :- | :- |
| [writing-tests-js.md](./writing-tests-js.md) | Estrutura de um teste: ações, assertions, isolamento, hooks |
| [running-tests-js.md](./running-tests-js.md) | CLI, filtros, headed, UI Mode, HTML report |
| [best-practices-js.md](./best-practices-js.md) | Filosofia e boas práticas (locators, web-first, debug, CI) |
| [actionability.md](./actionability.md) | Auto-waiting e checagens de capacidade de ação (actionability) |

## 3. Locators e Assertions

| Arquivo | Assunto |
| :- | :- |
| [locators.md](./locators.md) | Localizadores recomendados (role, text, testid), filtros, strict mode, `By` |
| [other-locators.md](./other-locators.md) | CSS/XPath, parent/legacy e quando evitá-los |
| [test-assertions-js.md](./test-assertions-js.md) | Matchers web-first, soft assertions, `expect.poll`/`toPass`/`extend` |

## 4. Runner e configuração

| Arquivo | Assunto |
| :- | :- |
| [test-configuration-js.md](./test-configuration-js.md) | `playwright.config.ts`: browsers, timeouts, retries, projects, reporters |
| [test-use-options-js.md](./test-use-options-js.md) | Opção `use` e fixtures de configuração |
| [test-cli-js.md](./test-cli-js.md) | Linha de comando (`test`, `codegen`, `show-report`, etc.) |
| [test-fixtures-js.md](./test-fixtures-js.md) | Fixtures: built-in, custom, `test.extend`, sequenciamento |
| [test-parallel-js.md](./test-parallel-js.md) | Paralelismo, workers e `describe.configure` |
| [test-projects-js.md](./test-projects-js.md) | Projects: múltiplos browsers/dispositivos e dependências |
| [test-parameterize-js.md](./test-parameterize-js.md) | Testes parametrizados (matrix de projetos) |
| [test-annotations-js.md](./test-annotations-js.md) | Anotações (`test.info().annotations`) |
| [test-retries-js.md](./test-retries-js.md) | Retentativas de testes flaky |
| [test-sharding-js.md](./test-sharding-js.md) | Sharding entre máquinas + merge de blob report |
| [test-timeouts-js.md](./test-timeouts-js.md) | Timeouts (test/expect/global/action/fixture) |
| [test-reporters-js.md](./test-reporters-js.md) | Reporters embutidos e custom |
| [test-ui-mode-js.md](./test-ui-mode-js.md) | UI Mode: watch, trace e time travel |
| [test-global-setup-teardown-js.md](./test-global-setup-teardown-js.md) | `globalSetup`/`globalTeardown` e setup via project deps |
| [test-webserver-js.md](./test-webserver-js.md) | `webServer`: sobe a app antes dos testes |

## 5. Páginas, contextos e navegação

| Arquivo | Assunto |
| :- | :- |
| [pages.md](./pages.md) | Pages: abas, popups, interação |
| [browser-contexts.md](./browser-contexts.md) | Isolamento com Browser Contexts |
| [navigations.md](./navigations.md) | `goto`, `waitForURL`, hidratação, BFCache |
| [frames.md](./frames.md) | Frames/iframes (`frameLocator`) |
| [handles.md](./handles.md) | `JSHandle`/`ElementHandle` vs Locator |
| [dialogs.md](./dialogs.md) | `alert`/`confirm`/`prompt`/`beforeunload` |
| [downloads.md](./downloads.md) | Downloads e validação de conteúdo |

## 6. Input, emulação e mídia

| Arquivo | Assunto |
| :- | :- |
| [input.md](./input.md) | Ações e entrada (click, fill, keyboard, upload) |
| [emulation.md](./emulation.md) | Emulação de dispositivo, locale, geolocalização |
| [touch-events.md](./touch-events.md) | Eventos de toque (legacy) |
| [screenshots.md](./screenshots.md) | Capturas de tela |
| [videos.md](./videos.md) | Gravação de vídeo |
| [clock.md](./clock.md) | `Clock`: congelar/avançar o tempo |
| [evaluating.md](./evaluating.md) | `evaluate` / `evaluateHandle` |
| [events.md](./events.md) | Escutar eventos da página |

## 7. Rede, mock, auth e API

| Arquivo | Assunto |
| :- | :- |
| [network.md](./network.md) | Rede: interceptação, proxy, HAR, WebSockets |
| [mock.md](./mock.md) | Mock de APIs, HAR e WebSockets |
| [mock-browser-js.md](./mock-browser-js.md) | Mock de APIs do navegador |
| [api-testing-js.md](./api-testing-js.md) | Testes de API com `APIRequestContext` |
| [auth.md](./auth.md) | Autenticação (setup, por worker, múltiplos papéis, API) |
| [service-workers-js-python.md](./service-workers-js-python.md) | Service Workers |
| [chrome-extensions-js-python.md](./chrome-extensions-js-python.md) | Extensões do Chrome |
| [extensibility.md](./extensibility.md) | Selector engines custom e extensibilidade |

## 8. Acessibilidade, trace, debug e codegen

| Arquivo | Assunto |
| :- | :- |
| [accessibility-testing-js.md](./accessibility-testing-js.md) | Testes de acessibilidade |
| [aria-snapshots.md](./aria-snapshots.md) | Snapshot testing com ARIA |
| [trace-viewer.md](./trace-viewer.md) | Trace Viewer (debugging via trace) |
| [trace-viewer-intro-js.md](./trace-viewer-intro-js.md) | Trace Viewer: introdução |
| [debug.md](./debug.md) | Depuração (Inspector, `--debug`, trace) |
| [codegen.md](./codegen.md) | Test generator (Codegen) |
| [codegen-intro.md](./codegen-intro.md) | Gerando testes: introdução |

## 9. Browsers, CI, Docker, infra e migração

| Arquivo | Assunto |
| :- | :- |
| [browsers.md](./browsers.md) | Navegadores suportados e instalação |
| [docker.md](./docker.md) | Docker e imagens oficiais |
| [ci.md](./ci.md) | CI avançado (Linux, sharding, caches) |
| [ci-intro.md](./ci-intro.md) | Configurando CI (GitHub Actions) |
| [selenium-grid.md](./selenium-grid.md) | Selenium Grid (experimental) |
| [protractor-js.md](./protractor-js.md) | Migrando do Protractor |
| [puppeteer-js.md](./puppeteer-js.md) | Migrando do Puppeteer |

## 10. Padrões avançados

| Arquivo | Assunto |
| :- | :- |
| [pom.md](./pom.md) | Page Object Models |
| [test-components-js.md](./test-components-js.md) | Teste de componentes (React/Vue/Svelte) |
| [testing-library-js.md](./testing-library-js.md) | Migrando do Testing Library |
| [test-agents-js.md](./test-agents-js.md) | Agents (Playwright) |

## 11. Exemplos práticos (webapps administrativos)

Subpasta [`exemplos/`](./exemplos/README.md) com specs TypeScript reais:

| Arquivo | Assunto |
| :- | :- |
| [exemplos/README.md](./exemplos/README.md) | Visão geral, setup e autenticação admin |
| [exemplos/com-tags-css-fixas.spec.ts](./exemplos/com-tags-css-fixas.spec.ts) | Admin com `data-testid`/`data-cy` estáveis |
| [exemplos/sem-tags-css-fixas.spec.ts](./exemplos/sem-tags-css-fixas.spec.ts) | Admin sem hooks (role/text/label/filtros) |
| [exemplos/seletores-sem-css-fixo.md](./exemplos/seletores-sem-css-fixo.md) | Guia claro de seletores sem CSS fixo (antes/depois) |
| [exemplos/admin-crud-completo.spec.ts](./exemplos/admin-crud-completo.spec.ts) | Fluxo CRUD completo + fixture de login |
| [exemplos/pages/admin.ts](./exemplos/pages/admin.ts) | Page Object reutilizável (com/sem tags) |
