# Exemplos de implementação WebMCP

Demonstrações de implementação do WebMCP em diferentes linguagens. Cada exemplo usa o mesmo cenário fictício — uma loja online ("Example Shoppe") com ferramentas de busca de produtos e consulta de pedidos — para facilitar a comparação.

## Arquitetura: onde cada linguagem entra

> **WebMCP é uma API de navegador.** A superfície `document.modelContext` só existe no JavaScript que roda na página. Portanto, o registro de ferramentas acontece sempre **no navegador (JS)**; as demais linguagens participam de duas formas:

1. **Backend das ferramentas** — o callback `execute` de uma ferramenta faz `fetch()` para um endpoint (mesmo origin, com a sessão do visitante) escrito em PHP, Python ou Rust. O resultado é devolvido ao agente.
2. **Servidor de páginas** — serve o HTML/JS que registra as ferramentas (inclusive formulários **declarativos** via `toolname`/`toolautosubmit`).

| Linguagem | Papel | API usada | Como rodar |
|---|---|---|---|
| [TypeScript](typescript/) | Registro nativo no navegador | Imperativa (`registerTool`, `getTools`, `executeTool`) + eventos | `npm install && npm run dev` (Vite) |
| [PHP](php/) | Backend + página; formulário declarativo | Declarativa + Imperativa + resposta JSON-LD | `php -S localhost:8000` |
| [Python](python/) | Backend FastAPI servindo página e endpoint | Imperativa (JS na página) + endpoint JSON | `uvicorn main:app --reload` |
| [Rust](rust/) | Backend axum servindo estáticos e endpoint JSON | Imperativa (JS na página) + endpoint JSON | `cargo run` |
| [Dart](dart/) | Flutter web (compila para JS no navegador) | Imperativa via `dart:js_interop` | `flutter run -d chrome` |

## Requisitos comuns para testar

- Chrome 149+ com o **origin trial** registrado (ou flag `chrome://flags/#enable-webmcp-testing`).
- A página precisa estar em **origin isolada** e com a permissions policy `tools` liberada (default `self` é suficiente para páginas top-level same-origin).

## Estrutura

```
examples/
├── README.md          ← este arquivo
├── typescript/        ← API nativa com Vite + tipos do WebMCP
├── php/               ← renderização declarativa + endpoint PHP
├── python/            ← FastAPI: página + endpoint das tools
├── rust/              ← axum: estáticos + endpoint das tools
└── dart/              ← Flutter web via dart:js_interop
```

> **Nota**: estes exemplos refletem o estado experimental da API (Chrome 146–150). Verifique a [especificação](https://webmachinelearning.github.io/webmcp) e o pacote `webmcp-types` (npm) para tipos atualizados.
