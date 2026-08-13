# Guia WebMCP — Web Model Context Protocol

Coleção de guias instrutivos (em pt-br) sobre o **WebMCP (Web Model Context Protocol)**, uma proposta de padrão web em fase experimental no Google Chromium (origin trial desde o Chrome 149) que permite que páginas da web exponham "ferramentas" (tools) estruturadas para agentes de IA.

> **Status**: experimental. Especificação em fase de rascunho no W3C Web Machine Learning Community Group. Tudo aqui pode mudar com feedback do ecossistema.

## Índice

| # | Guia | Conteúdo |
|---|------|----------|
| 01 | [Introdução ao WebMCP](01-introducao.md) | O que é, visão geral, `document.modelContext`, tipos de agente, o que resolve |
| 02 | [Motivação: atuação vs ferramentas](02-motivacao-atuacao-vs-tools.md) | Por que "clicar no DOM" é frágil, backend MCP vs WebMCP, objetivos e não-objetivos |
| 03 | [Conceitos fundamentais e glossário](03-conceitos-glossario.md) | Tool, descoberta, JSON Schema, estado, CUJ, annotations, agente, atuação |
| 04 | [Como começar](04-como-comecar.md) | Origin trial, flag local, requisitos (origin isolation, permissions policy), limitações |
| 05 | [API Imperativa](05-api-imperativa.md) | `registerTool`, `getTools`, `executeTool`, `AbortSignal`, eventos, `exposedTo`, `fromOrigins`, React/Angular |
| 06 | [API Declarativa](06-api-declarativa.md) | Atributos HTML (`toolname`, `tooldescription`, `toolparamdescription`, `toolautosubmit`), síntese de JSON Schema, `SubmitEvent.respondWith`, pseudo-classes |
| 07 | [Especificação técnica](07-especificacao-tecnica.md) | Detalhes do rascunho (IDL, algoritmo de registro, observação, integração com event loop) |
| 08 | [Casos de uso e jornadas críticas (CUJ)](08-casos-de-uso.md) | Compras, formulários, filtros, viagens, design gráfico, e-commerce, dev workflows |
| 09 | [Segurança e privacidade](09-seguranca.md) | Prompt injection (3 vetores), misrepresentação de intenção, over-parameterization, mitigações, orçamentos de caracteres |
| 10 | [Testes e avaliações (evals)](10-testes-e-avaliacoes.md) | Modos de falha, testes determinísticos vs probabilísticos, `expectedCall`, testes e2e |
| 11 | [Cloudflare WebMCP e ecossistema](11-cloudflare-webmcp.md) | Implementação da Cloudflare: bridge, packs, Content Credentials (C2PA), MCP Server Client, BrowserRun |
| 12 | [Service workers e direções futuras](12-service-workers-e-futuro.md) | WebMCP em background, session ID, descoberta, status de implementação nos browsers, perguntas em aberto |
| — | [Exemplos de implementação](examples/) | Demos em TypeScript, PHP, Python, Rust e Dart (loja "Example Shoppe") |

## Fontes

Este guia foi compilado a partir da leitura cuidadosa de:

- **Documentação Google/web.dev**: `google_webmcp_1..8.md`, `google_ux_ai*.md` (publicados em web.dev/developer.chrome.com, 2026)
- **Especificação oficial**: `webmcp_offical_specs/` (`index.bs`, `README.md`, `declarative-api-explainer.md`, `docs/service-workers.md`, `implementation-status.md`, `security-privacy-questionnaire.md`)
- **Cloudflare blog**: `cloudflare_webmcp.md` (developer preview)
- **Documentação extraída ao vivo** de `developer.chrome.com/docs/ai/webmcp/{imperative-api,declarative-api}`

Referências principais: [Explainer WebMCP](https://github.com/webmachinelearning/webmcp), [Especificação](https://webmachinelearning.github.io/webmcp), [Chrome Status #5117755740913664](https://chromestatus.com/feature/5117755740913664), [Origin Trial 4163014905550602241](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241).

> **Aviso de acurácia**: WebMCP é um padrão em evolução. Os exemplos de código refletem o estado da proposta no momento da coleta (Chrome 146–150). Verifique sempre a documentação oficial antes de usar em produção.
