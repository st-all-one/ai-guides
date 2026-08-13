# WebMCP — Rust (axum como backend das ferramentas)

O WebMCP roda no navegador (JS). O Rust (axum) participa de duas formas:

1. **Servindo a página estática** (`static/index.html`) que contém o script que registra as ferramentas.
2. **Endpoint JSON** (`GET /api/products`) chamado pelo `execute()` da ferramenta — mesmo origin, com a sessão do visitante.

## Como rodar

```bash
cargo run
```

Acesse `http://localhost:3000` no Chrome 149+ (flag `enable-webmcp-testing`).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `Cargo.toml` | Dependências (axum, tokio, serde, tower-http) |
| `src/main.rs` | Servidor axum + endpoint JSON das ferramentas |
| `static/index.html` | Página com o registro das ferramentas (JS) |
