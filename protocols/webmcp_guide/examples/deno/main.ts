/**
 * Example Shoppe — WebMCP com Deno 2 + Hono.
 *
 * Front e back totalmente integrados:
 *  - O backend (Hono) serve a página e os endpoints JSON que as ferramentas chamam.
 *  - O front (JS na página) registra as ferramentas em document.modelContext;
 *    o callback `execute` de cada ferramenta chama o backend no mesmo origin,
 *    reutilizando a sessão autenticada do visitante.
 *
 * Rode:
 *   deno task start      # ou: deno run --allow-net --allow-read main.ts
 *
 * Abra http://localhost:8000 no Chromium (flag enable-webmcp-testing ativada).
 */
import { Hono } from '@hono/hono';
import { serveStatic } from '@hono/hono/deno';

// ---------------------------------------------------------------------------
// "Banco de dados" em memória (no exemplo; em produção, use o seu storage).
// ---------------------------------------------------------------------------

interface Product {
  id: string;
  name: string;
  price: number;
}

const CATALOG: Product[] = [
  { id: 'JACKET002', name: 'Jaqueta preta', price: 89.9 },
  { id: 'JEANS001', name: 'Jeans', price: 49.9 },
  { id: 'TSHIRT003', name: 'Camiseta estampada', price: 19.9 },
];

const ORDERS = new Map<string, { orderId: string; status: string; location: string }>([
  ['ORD-123', { orderId: 'ORD-123', status: 'shipped', location: 'CD São Paulo' }],
  ['ORD-456', { orderId: 'ORD-456', status: 'out_for_delivery', location: 'Rota para Campinas' }],
]);

const CART: Array<{ productId: string; quantity: number }> = [];

const app = new Hono();

// ---------------------------------------------------------------------------
// Backend: endpoints chamados pelo execute() das ferramentas WebMCP.
// ---------------------------------------------------------------------------

// search_products  →  GET /api/products?q=&max=
app.get('/api/products', (c) => {
  const q = (c.req.query('q') ?? '').toLowerCase();
  const rawMax = c.req.query('max');
  const max = rawMax === undefined ? undefined : Number(rawMax);

  const matches = CATALOG.filter(
    (p) =>
      (q === '' || p.name.toLowerCase().includes(q)) &&
      (max === undefined || p.price <= max),
  );
  // Saída enxuta: apenas o que o LLM precisa para a próxima decisão.
  return c.json(matches);
});

// get_order_status  →  GET /api/orders/:id/status   (somente leitura)
app.get('/api/orders/:id/status', (c) => {
  const order = ORDERS.get(c.req.param('id'));
  if (!order) return c.json({ error: 'order_not_found' }, 404);
  return c.json(order);
});

// add_to_cart  →  POST /api/cart  { "productId", "quantity" }   (mutação)
app.post('/api/cart', async (c) => {
  const body = await c.req.json<{ productId: string; quantity?: number }>();
  if (!CATALOG.some((p) => p.id === body.productId)) {
    return c.json({ error: 'unknown_product' }, 400);
  }
  CART.push({ productId: body.productId, quantity: body.quantity ?? 1 });
  return c.json({ ok: true, cartSize: CART.length });
});

app.get('/api/cart', (c) => c.json(CART));

// ---------------------------------------------------------------------------
// Front: página com o registro das ferramentas + formulário declarativo.
// ---------------------------------------------------------------------------

app.get('/', serveStatic({ path: './static/index.html' }));
app.use('/static/*', serveStatic({ root: './' }));

// Destino do formulário DECLARATIVO (toolautosubmit). Após a navegação, o
// navegador usa o primeiro <script type="application/ld+json"> como resposta
// estruturada da ferramenta ao agente. (Mecanismo em discussão na spec — Issue #135.)
app.post('/search', async (c) => {
  const form = await c.req.formData();
  const carType = form.get('car_type')?.toString() ?? '';
  const seats = Number(form.get('seats') ?? 0);

  const results: Array<{ name: string; seats: number; fuel: string }> = [];
  if (carType === 'family' || seats >= 7) {
    results.push({ name: 'Minivan 2022', seats: 7, fuel: 'gasolina' });
  }
  if (carType === 'suv') {
    results.push({ name: 'SUV 2021', seats: 5, fuel: 'gasolina' });
  }
  if (carType === 'sedan') {
    results.push({ name: 'Sedan 2020', seats: 5, fuel: 'gasolina' });
  }

  return c.html(`<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Resultados — Example Shoppe</title></head>
<body>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "query": { "carType": ${JSON.stringify(carType)}, "seats": ${seats} },
    "results": ${JSON.stringify(results)}
  }
  </script>
  <h1>Resultados da busca de carros</h1>
  <ul>${results.map((r) => `<li>${r.name} — ${r.seats} lugares</li>`).join('')}</ul>
</body>
</html>`);
});

// ---------------------------------------------------------------------------

const PORT = Number(Deno.env.get('PORT') ?? 10222);
Deno.serve({ port: PORT, hostname: '127.0.0.1' }, app.fetch);

console.log(`Example Shoppe (WebMCP) em  http://localhost:${PORT}`);
console.log('Habilite a flag:  chrome://flags/#enable-webmcp-testing');
