# SKILL: TUI com Ratatui (Rust)

## Description
Referência prática para construir interfaces TUI (terminal) em Rust com Ratatui + Crossterm, com arquitetura assíncrona (tokio), consumindo integrações HTTP (reqwest) e cache local (SQLite). Baseada no caso real do projeto `redmine-tui`/`my-redmine`.

## When to Use
- Construir CLIs interativas / dashboards / gerenciadores em terminal
- Aplicações com listas, formulários, popups e navegação por teclado
- TUIs que consomem APIs REST e precisam de cache offline
- Quando a UI não pode travar em I/O de rede

## Files
| File | Covers |
|------|--------|
| 00-introducao.md | Modelo de loop da TUI, stack recomendada, visão geral |
| 01-arquitetura.md | Organização de módulos, estado central `App`, enums Screen/Mode/InputTarget |
| 02-renderizacao.md | Layout/Constraint, List+ListState, scroll seguro, popups, tema, markdown |
| 03-eventos.md | Polling de teclado, modos, handlers por tela, padrão de confirmação |
| 04-integracao-async.md | Executor tokio em background, canais mpsc, ApiAction/ApiResult, consumo de APIs |
| 05-cache-persistencia.md | SQLite WAL, versionamento, cache offline, merge local+API |
| 06-estabilidade-seguranca.md | Lints, erro defensivo, parsing, confirmações, feedback de status |

## How to Read
Comece por 00-introducao.md para o modelo mental do loop. Depois leia 01-arquitetura.md e 02-renderizacao.md para UI, 03-eventos.md para interação, 04-integracao-async.md para I/O. Cada arquivo é autocontido; use o índice para pular direto ao tópico.

## Prerequisites
- Rust 1.85+ (edition 2024)
- Noções de `ratatui`/`crossterm` (widgets, Layout) e `tokio` (async)

## Related Guides
- rust_guide/ (Rust, async, Cargo)
- redmine_guide/ (API REST consumida pelo exemplo)
- sqlite_guide/ (SQLite/WAL usado no cache)
