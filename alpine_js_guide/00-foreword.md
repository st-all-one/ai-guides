# Alpine.js — Guia de Referência

**Versão:** 3.15.12 (Julho 2026)
**Baseado na documentação oficial** (revisada em `ai_guides/ALPINE_JS_DOCS/`)

Este guia cobre a implementação correta de Alpine.js em projetos com **HTML puro** e **Rust** (especialmente Leptos 0.8+), com foco em SSR, islands, e integração fluida entre back-end e front-end.

## Público-alvo

- Desenvolvedores que usam Alpine.js em HTML estático ou templates server-side
- Desenvolvedores Rust que integram Alpine.js com Leptos, Axum ou outros frameworks SSR
- Equipes que precisam de interatividade sem um bundler JS pesado

## Convenções

- `x-data` é o ponto de entrada de todo componente Alpine
- Diretivas: `x-*` (ex: `x-show`, `x-model`)
- Shorthands: `@` para `x-on:`, `:` para `x-bind:`
- Magics: `$*` (ex: `$store`, `$refs`, `$dispatch`)
- Todo componente Alpine precisa de um elemento pai com `x-data`

## Sumário

1. [Instalação e Setup](./01-instalacao.md)
2. [Estado e Reatividade](./02-estado-reatividade.md)
3. [Diretivas Fundamentais](./03-diretivas-fundamentais.md)
4. [Transições e Animações](./04-transicoes-animacoes.md)
5. [Magicas e Globais](./05-magicas-globais.md)
6. [Plugins Oficiais](./06-plugins.md)
7. [Avançado](./07-avancado.md)
8. [Integração com Rust/Leptos](./08-integracao-rust.md)
9. [Práticas Recomendadas](./09-praticas-recomendadas.md)
