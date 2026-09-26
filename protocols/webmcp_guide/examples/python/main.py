"""Example Shoppe — WebMCP com FastAPI.

O WebMCP em si roda no navegador (document.modelContext, JavaScript).
O Python participa como backend das ferramentas e como servidor da página.

Rode com:  uvicorn main:app --reload
"""
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse

app = FastAPI(title="Example Shoppe — WebMCP (Python)")

CATALOG = [
    {"id": "JACKET002", "name": "Jaqueta preta", "price": 89.9},
    {"id": "JEANS001", "name": "Jeans", "price": 49.9},
    {"id": "TSHIRT003", "name": "Camiseta estampada", "price": 19.9},
]

PAGE = """<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Example Shoppe — WebMCP (Python)</title>
</head>
<body>
  <h1>Example Shoppe</h1>
  <p>WebMCP com backend FastAPI. Abra o console e use a
     Model Context Tool Inspector Extension.</p>

  <script type="module">
    document.modelContext.registerTool({
      name: 'search_products',
      description: 'Search the product catalog and return id, name and price.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Free text search term.' },
          maxPrice: { type: 'number', description: 'Optional upper price filter.' }
        },
        required: ['query']
      },
      execute: async ({ query, maxPrice }) => {
        const url = new URL('/api/products', location.origin);
        url.searchParams.set('q', query);
        if (maxPrice != null) url.searchParams.set('max', String(maxPrice));

        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('Search failed: ' + res.status);
        return res.json();
      }
    });

    document.modelContext.registerTool({
      name: 'get_order_status',
      description: 'Returns order number, shipping status and current location.',
      inputSchema: {
        type: 'object',
        properties: { orderId: { type: 'string', description: 'Order identifier.' } },
        required: ['orderId']
      },
      annotations: { readOnlyHint: true },
      execute: async ({ orderId }) => {
        const res = await fetch('/api/orders/' + encodeURIComponent(orderId) + '/status');
        if (!res.ok) throw new Error('Order lookup failed: ' + res.status);
        return res.json();
      }
    });
  </script>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return PAGE


@app.get("/api/products")
def search_products(
    q: str = "",
    max_price: Optional[float] = Query(default=None, alias="max"),
):
    """Endpoint chamado pelo execute() da ferramenta search_products."""
    matches = [
        p
        for p in CATALOG
        if (not q or q.lower() in p["name"].lower())
        and (max_price is None or p["price"] <= max_price)
    ]
    # Saída enxuta: só o essencial para o LLM decidir o próximo passo.
    return matches


@app.get("/api/orders/{order_id}/status")
def order_status(order_id: str):
    """Endpoint chamado pelo execute() da ferramenta get_order_status."""
    return {
        "orderId": order_id,
        "status": "shipped",
        "location": "CD São Paulo",
    }
