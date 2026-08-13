# 05 — API Imperativa

A API Imperativa do WebMCP permite definir **muitos tipos de ferramentas com JavaScript padrão**. Suas ferramentas podem executar diferentes funções, como entrada de formulário, navegação no site e gerenciamento de estado.

> **Nota**: `navigator.modelContext` está **deprecado no Chrome 150**. Use `document.modelContext`.

## Registrando uma ferramenta

Use `document.modelContext.registerTool()` para adicionar uma ferramenta ao model context. O registro exige: **nome**, **descrição** e **input schema** (com as propriedades relevantes).

### Exemplo 1 — alternar camadas de pizza (WebMCP zaMaker)

```js
await document.modelContext.registerTool({
  name: 'toggle_layer',
  description: 'Control pizza layers (sauce, cheese). Use "add", "remove", or "toggle".',
  inputSchema: {
    type: 'object',
    properties: {
      layer: { type: 'string', enum: ['sauce-layer', 'cheese-layer'] },
      action: { type: 'string', enum: ['add', 'remove', 'toggle'] },
    },
    required: ['layer'],
  },
  execute: async ({ layer, action }) => {
    await toggleLayer(layer, action);
    return `Performed ${action || 'toggle'} on layer: ${layer}`;
  },
});
```

### Exemplo 2 — status de pedido (com enum/oneOf para oferecer opções amigáveis ao LLM)

```js
await document.modelContext.registerTool({
  name: 'get_order_status',
  description: 'Search orders in a given timeframe. Returns order number, shipping status and location',
  inputSchema: {
    "type": "object",
    "properties": {
      "timeframe": {
        "type": "string",
        "oneOf": [
          { "type": "string", "const": "today", "title": "Today" },
          { "type": "string", "const": "yesterday", "title": "Yesterday" },
          { "type": "string", "const": "last_7_days", "title": "Last 7 Days" },
          { "type": "string", "const": "last_30_days", "title": "Last 30 Days" },
          { "type": "string", "const": "last_6_months", "title": "Last 6 Months" }
        ],
        "enum": [ "today", "yesterday", "last_7_days", "last_30_days", "last_6_months" ],
        "description": "Timeframe for the order lookup."
      }
    },
    "required": [ "timeframe" ]
  },
  execute: async ({ timeframe }) => {
    // Sua lógica de API/banco aqui; retorne os dados do pedido como string.
  },
});
```

> **Dica**: use `enum`/`const` + `title` nos parâmetros para dar opções discretas e bem descritas ao LLM, reduzindo alucinação.

### Registrando com annotations e ciclo de vida

Você pode remover uma ferramenta com um `AbortSignal` passado como parâmetro opcional:

```js
const addTodoTool = {
  name: "addTodo",
  description: "Add a new item to the to-do list",
  inputSchema: {
    type: "object",
    properties: { text: { type: "string" } },
  },
  execute: async ({ text }) => {
    // Lógica de persistência aqui (omitida no demo)
    return `Added to-do: ${text}`;
  },
  annotations: {
    readOnlyHint: false,
    untrustedContentHint: true
  },
};

const controller = new AbortController();
await document.modelContext.registerTool(addTodoTool, { signal: controller.signal });

// Para desregistrar a ferramenta depois:
// controller.abort();
```

## Descobrindo ferramentas

Use `document.modelContext.getTools()` para obter as ferramentas disponíveis. É um método assíncrono que retorna uma lista **ordenada alfabeticamente** de ferramentas que o documento chamador está autorizado a acessar.

```js
const [tool] = await document.modelContext.getTools();
console.log(tool);

// {
//   annotations: { readOnlyHint: false, untrustedContentHint: true },
//   description: "Add a new item to the to-do list",
//   inputSchema: '{"type":"object","properties":{"text":{"type":"string"}}}',
//   name: "addTodo",
//   origin: "https://example.com",
//   window: Window {window: Window, self: Window, ...},
// }
```

### Filtragem por origins (`fromOrigins`)

Por padrão, `getTools()` retorna apenas ferramentas **same-origin** registradas pelo documento chamador ou outros documentos same-origin na árvore de frames. Para obter ferramentas cross-origin, liste explicitamente as origins na opção `fromOrigins` (só aceita origins seguras).

Ferramentas de documentos cross-origin só são incluídas se **ambas** as condições valerem:

1. A origin hospedeira está listada em `fromOrigins`.
2. A ferramenta foi explicitamente **exposta à sua origin** (via `exposedTo`).

```js
// https://example.com

// Somente ferramentas same-origin
const sameOriginTools = await document.modelContext.getTools();

// Ferramentas same-origin + ferramentas de documentos cross-origin específicos
const allTools = await document.modelContext.getTools({
  fromOrigins: ['https://partner.org']
});
```

## Executando uma ferramenta

Para executar manualmente uma ferramenta descoberta em `getTools()`, chame `document.modelContext.executeTool()` com os argumentos de entrada como **string JSON válida**. O método é assíncrono e retorna o resultado da execução, ou **`null` quando dispara uma navegação**.

```js
const result = await document.modelContext.executeTool(tool, '{"text": "Buy milk"}');
console.log(result);

// 'Added to-do: Buy milk'
```

Você pode cancelar uma execução pendente com `AbortSignal`, passado como parâmetro opcional:

```js
const controller = new AbortController();
document.modelContext.executeTool(tool, '{"text": "Buy milk"}', {
  signal: controller.signal,
});

// Cancelar a execução depois:
controller.abort();
```

> **Uso típico**: o demo "Page Agent" (https://github.com/GoogleChromeLabs/webmcp-tools/tree/main/demos/page-agent) mostra como recuperar ferramentas de um iframe e executá-las dentro de uma interface de chat web.

## Eventos

Frames podem ouvir o evento `toolchange` em `document.modelContext` para serem notificados quando a lista de ferramentas disponíveis mudar:

```js
document.modelContext.addEventListener("toolchange", (event) => {
  // Ferramentas mudaram.
});
```

## Cross-origin: iframes

O WebMCP suporta iframes cross-origin combinando **permissions policy** e **gating explícito por origin**.

### Permissions Policy

O registro de ferramentas é desabilitado por padrão em iframes cross-origin. A página deve delegar acesso usando a Permissions Policy `tools`:

```html
<iframe src="https://example.com" allow="tools"></iframe>
```

### Exposição por origin (`exposedTo`)

Ferramentas ficam indisponíveis para documentos cross-origin por padrão. Use a opção `exposedTo` em `registerTool` para listar origins específicas autorizadas a visualizar e executar a ferramenta. A opção **só aceita origins seguras**.

```js
// https://partner.org

await document.modelContext.registerTool({
  name: 'my_shared_tool',
  description: 'Shared across origins',
  // ...
}, {
  exposedTo: ['https://example.com']
});
```

> **Importante**: mesmo que uma ferramenta seja exposta à sua origin, você ainda precisa **solicitá-la explicitamente à origin hospedeira** usando a opção `fromOrigins` em `getTools()`.

### Recomendações de exposição

Exponha ferramentas **apenas a origins de confiança**, especialmente quando elas gerenciam dados de usuário ou impactam o usuário:

- **Somente leitura** (ex.: `getFavoriteProducts`) pode revelar informações sobre o usuário. Só exponha a sites com os quais você compartilharia esses dados diretamente.
- **Leitura e escrita** agem em nome do usuário. Só exponha a origins que você decide serem confiáveis para agir em nome do seu usuário (ex.: exponha `postComment` a `trustedExample.com`, nunca a `evilExample.com`).

## Suporte a frameworks

### React

O pacote [usewebmcp](https://www.npmjs.com/package/usewebmcp) oferece suporte experimental. Se a aplicação já usa React, você pode registrar ferramentas com hooks independentes atados ao ciclo de vida de mount/unmount dos componentes. O hook `useWebMCP` também fornece **inferência de tipos guiada por schema** e expõe o estado local de execução.

### Angular

O Angular tem suporte experimental ([angular.dev/ai/webmcp](https://angular.dev/ai/webmcp)): registre ferramentas atadas ao ciclo de vida de injeção de dependência e transforme **Signal Forms** em ferramentas WebMCP.

## Resumo da superfície (IDL)

```webidl
[Exposed=Window, SecureContext]
interface ModelContext : EventTarget {
  Promise<undefined> registerTool(ModelContextTool tool, optional ModelContextRegisterToolOptions options = {});
  Promise<sequence<RegisteredTool>> getTools(optional ModelContextGetToolOptions options = {});
  attribute EventHandler ontoolchange;
};
```

Referência completa de dicionários e semântica de cada método no **[guia 07 — Especificação técnica](07-especificacao-tecnica.md)**.

---

Próximo: **[06 — API Declarativa](06-api-declarativa.md)**.
