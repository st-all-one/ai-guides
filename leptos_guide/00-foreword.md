# Leptos 0.8 — Guia Completo

Leptos é um framework web full-stack para Rust baseado em reatividade de grão fino.
Semelhante a SolidJS (JavaScript) e Sycamore (Rust), ele compila para WebAssembly
no cliente e pode renderizar no servidor com hidratação.

## Público-alvo

Este guia assume familiaridade com Rust, HTML, CSS e APIs Web básicas.
Não assume conhecimento de frameworks reativos ou WebAssembly.

## Estrutura

| Capítulo | Tópico |
|----------|--------|
| 01 | Configuração inicial (CSR e SSR) |
| 02 | Sintaxe `view!` e construção de UI |
| 03 | Componentes e Props |
| 04 | Reatividade: Signals, Effects, Memos |
| 05 | Controle de fluxo: `if`, `match`, `<Show/>`, `<For/>` |
| 06 | Formulários e inputs |
| 07 | Comunicação pai-filho e Context API |
| 08 | Async: Resources, Suspense, Transition, Actions |
| 09 | Roteamento |
| 10 | Estado global e Stores |
| 11 | Estilização |
| 12 | Metadados e `<head>` |
| 13 | Integração com JS (`wasm-bindgen`, `web-sys`) |
| 14 | Testes |
| 15 | Renderização no servidor (SSR) |
| 16 | Server Functions e Extractors |
| 17 | Progressive Enhancement e `<ActionForm/>` |
| 18 | Arquitetura Islands |
| 19 | Deploy |
| 20 | Apêndice: Sistema Reativo |
| 21 | Apêndice: Ciclo de Vida de Signals |

## Licença

O conteúdo original do livro Leptos está disponível em
<https://github.com/leptos-rs/book> sob licença MIT.
