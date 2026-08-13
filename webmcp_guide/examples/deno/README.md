# WebMCP — Deno 2 + Hono (front e back integrados)

Exemplo completo de uma loja ("Example Shoppe") com **front e back totalmente integrados ao WebMCP**:

- **Backend (Deno 2 + Hono)** serve a página e os endpoints JSON que as ferramentas chamam.
- **Front (JS na página)** registra as ferramentas em `document.modelContext`; o callback `execute` de cada ferramenta chama o backend **no mesmo origin**, reutilizando a sessão do visitante.
- Também inclui um **formulário declarativo** (`toolname`/`toolautosubmit`) cuja resposta via JSON-LD volta ao agente.

Ferramentas registradas:

| Ferramenta | Tipo | Endpoint chamado pelo `execute` |
|---|---|---|
| `search_products(query, maxPrice?)` | leitura | `GET /api/products` |
| `get_order_status(orderId)` | leitura (`readOnlyHint`) | `GET /api/orders/:id/status` |
| `add_to_cart(productId, quantity?)` | mutação | `POST /api/cart` |

## 1. Instalar o Deno 2

```bash
curl -fsSL https://deno.land/install.sh | sh
deno --version   # v2.0+
```

## 2. Rodar o servidor

```bash
cd webmcp_guide/examples/deno
deno task start      # primeiro acesso baixa as dependências (jsr:@hono/hono)
```

Saída esperada:

```
Example Shoppe (WebMCP) em  http://localhost:8000
Habilite a flag:  chrome://flags/#enable-webmcp-testing
```

## 3. Testar no Chromium

### 3.1 Habilite o WebMCP no navegador

1. Abra `chrome://flags/#enable-webmcp-testing`.
2. Mude para **Enabled** e relance o Chromium.

> `http://localhost` é um contexto seguro (SecureContext), então a porta de `[SecureContext]` está OK. Se o `getTools()`/`registerTool()` retornar `SecurityError`, confirme que o *agent cluster* está **origin-keyed** (padrão no Chrome recente para localhost; evite `document.domain`/`Origin-Agent-Cluster: ?0`).

### 3.2 Abra a página e registre as ferramentas

1. Acesse **http://localhost:8000**.
2. No painel da página, clique em **Registrar ferramentas**. O log confirma:
   `Ferramentas registradas: search_products, get_order_status, add_to_cart`.
3. Clique em **Listar (getTools)** — o `<select>` será populado com os nomes.

### 3.3 Teste pelo console do navegador (DevTools)

Abra o DevTools (F12) e rode no console:

```js
// 1. A API existe?
document.modelContext !== undefined;
// → true

// 2. Descobrir ferramentas registradas
const tools = await document.modelContext.getTools();
console.table(tools.map(t => ({ name: t.name, origin: t.origin, schema: t.inputSchema })));

// 3. Chamar uma ferramenta de leitura (args = string JSON)
const statusTool = tools.find(t => t.name === 'get_order_status');
const r = await document.modelContext.executeTool(statusTool, '{"orderId":"ORD-123"}');
console.log(r);
// → { orderId: "ORD-123", status: "shipped", location: "CD São Paulo" }

// 4. Ferramenta de mutação (add_to_cart)
const cartTool = tools.find(t => t.name === 'add_to_cart');
await document.modelContext.executeTool(cartTool, '{"productId":"JACKET002","quantity":2}');
```

### 3.4 Teste pela UI da página

Use o **Console do agente (in-page)**:
1. Selecione `search_products` no `<select>`.
2. Mantenha os argumentos `{ "query": "jaqueta" }` e clique **Executar (executeTool)**.
3. Veja o resultado estruturado no **Log** (lista de produtos em JSON).

### 3.5 Teste com um agente real (opcional)

Instale a [Model Context Tool Inspector Extension](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) e converse em linguagem natural:
- *"Busque produtos com 'jeans'."* → deve chamar `search_products`.
- *"Qual o status do pedido ORD-456?"* → deve chamar `get_order_status`.
- *"Adicione a jaqueta preta ao carrinho."* → deve chamar `add_to_cart` (idealmente pedindo confirmação antes, por ser mutação).

### 3.6 Valide o backend diretamente (sem navegador)

```bash
curl -s 'http://localhost:8000/api/products?q=jaqueta'
# → [{"id":"JACKET002","name":"Jaqueta preta","price":89.9}]

curl -s http://localhost:8000/api/orders/ORD-123/status
# → {"orderId":"ORD-123","status":"shipped","location":"CD São Paulo"}

curl -s -X POST http://localhost:8000/api/cart \
  -H 'content-type: application/json' \
  -d '{"productId":"JEANS001","quantity":1}'
# → {"ok":true,"cartSize":1}
```

## 4. Diagnóstico de erros

| Sintoma no console | Causa | Solução |
|---|---|---|
| `document.modelContext === undefined` | API não habilitada | Flag `enable-webmcp-testing` + relançar Chromium |
| `NotAllowedError` | Permissions Policy `tools` bloqueada | Só acontece em iframes cross-origin sem `allow="tools"` |
| `SecurityError` | Agent cluster não é origin-keyed | Não usar `document.domain` nem `Origin-Agent-Cluster: ?0` |
| `InvalidStateError` | Nome duplicado / name ou descrição vazios | Nomeie unicamente e preencha description |

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `deno.json` | Import map (`jsr:@hono/hono`) + tasks `start`/`dev` |
| `main.ts` | Backend Hono: páginas + endpoints das ferramentas + `Deno.serve` |
| `static/index.html` | Front: formulário declarativo, registro imperativo e console do agente |
