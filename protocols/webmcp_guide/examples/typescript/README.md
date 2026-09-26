# WebMCP — TypeScript (API nativa)

Exemplo com **Vite** mostrando o uso direto de `document.modelContext` com TypeScript tipado.

## O que este exemplo cobre

- `registerTool()` — imperativo, com `inputSchema`, `annotations` e `AbortSignal`.
- `getTools()` — descoberta (same-origin e `fromOrigins`).
- `executeTool()` — execução manual de uma ferramenta.
- Evento `toolchange`.

## Como rodar

```bash
npm install
npm run dev
```

Abra a URL do Vite no Chrome 149+ (com origin trial ou flag `enable-webmcp-testing`). Abra o console para ver a descoberta e a execução.

> Para tipos completos e atualizados, instale o pacote oficial: `npm i webmcp-types`.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `src/webmcp.d.ts` | Declarações de tipo mínimas da API WebMCP |
| `src/tools.ts` | Registro das ferramentas da loja |
| `src/agent.ts` | Descoberta e execução (perspectiva do agente in-page) |
| `src/main.ts` | Bootstrap + evento `toolchange` |
| `index.html` | Página de teste |
