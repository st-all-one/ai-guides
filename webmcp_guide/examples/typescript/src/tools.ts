/**
 * Registro das ferramentas WebMCP da loja (perspectiva do site).
 */

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface OrderStatus {
  orderId: string;
  status: string;
  location: string;
}

/** Garante disponibilidade e loga quando a API está ausente. */
function context(): ModelContext | null {
  if (!document.modelContext) {
    console.warn('WebMCP indisponível: habilite a flag ou o origin trial.');
    return null;
  }
  return document.modelContext;
}

export async function registerStoreTools(): Promise<void> {
  const ctx = context();
  if (!ctx) return;

  await ctx.registerTool({
    name: 'search_products',
    title: 'Buscar produtos',
    description:
      'Search the product catalog and return matching listings with id, name and price.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text search term.' },
        maxPrice: {
          type: 'number',
          description: 'Optional upper price filter.',
        },
      },
      required: ['query'],
    },
    execute: async ({ query, maxPrice }) => {
      const url = new URL('/api/products', location.origin);
      url.searchParams.set('q', query);
      if (maxPrice != null) url.searchParams.set('max', String(maxPrice));

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const products = (await res.json()) as Product[];

      // Saída enxuta: apenas o que o LLM precisa para a próxima decisão.
      return products.map((p) => ({ id: p.id, name: p.name, price: p.price }));
    },
  });

  // Ferramenta somente leitura: o agente pode chamar sem pedir confirmação.
  await ctx.registerTool({
    name: 'get_order_status',
    description:
      'Returns order number, shipping status and current location for a given order.',
    inputSchema: {
      type: 'object',
      properties: { orderId: { type: 'string', description: 'Order identifier.' } },
      required: ['orderId'],
    },
    annotations: { readOnlyHint: true },
    execute: async ({ orderId }) => {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`);
      if (!res.ok) throw new Error(`Order lookup failed: ${res.status}`);
      return (await res.json()) as OrderStatus;
    },
  });
}

/**
 * Exemplo de ferramenta vinculada a um ciclo de vida de componente:
 * só fica registrada enquanto um "modo edição" está ativo.
 */
export async function registerScopedTool(active: AbortController): Promise<void> {
  const ctx = context();
  if (!ctx) return;

  await ctx.registerTool(
    {
      name: 'undo_last_edit',
      description: 'Reverts the last edit made to the open document.',
      annotations: { readOnlyHint: false },
      execute: async () => {
        undoLastEdit();
        return { ok: true, undone: true };
      },
    },
    // Quando o "modo edição" termina, abort() desregistra a ferramenta.
    { signal: active.signal },
  );
}

function undoLastEdit(): void {
  // Lógica real da aplicação aqui.
  console.log('[demo] undo_last_edit executado');
}
