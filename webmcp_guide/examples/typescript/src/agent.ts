/**
 * Descoberta e execução de ferramentas (perspectiva do agente in-page).
 * Um agente que vive na página (ou em um iframe) usa estas APIs.
 */

export async function listTools(): Promise<void> {
  const tools = await document.modelContext.getTools();
  console.table(
    tools.map((t) => ({
      name: t.name,
      origin: t.origin,
      readOnly: t.annotations?.readOnlyHint ?? false,
      schema: t.inputSchema,
    })),
  );
}

export async function listCrossOriginTools(): Promise<void> {
  // Só retorna ferramentas cross-origin se o dono as expôs via exposedTo
  // E se a origin estiver listada aqui.
  const tools = await document.modelContext.getTools({
    fromOrigins: ['https://partner.org'],
  });
  console.log('Cross-origin tools:', tools);
}

export async function runOrderStatus(orderId: string): Promise<unknown> {
  const tools = await document.modelContext.getTools();
  const tool = tools.find((t) => t.name === 'get_order_status');
  if (!tool) throw new Error('get_order_status não registrada');

  // executeTool recebe os argumentos como string JSON.
  const result = await document.modelContext.executeTool(
    tool,
    JSON.stringify({ orderId }),
  );
  console.log('Resultado:', result);
  return result;
}

export async function runCancellable(): Promise<void> {
  const tools = await document.modelContext.getTools();
  const tool = tools.find((t) => t.name === 'search_products');
  if (!tool) return;

  const controller = new AbortController();
  const pending = document.modelContext.executeTool(
    tool,
    JSON.stringify({ query: 'jaqueta' }),
    { signal: controller.signal },
  );

  setTimeout(() => controller.abort(), 100);
  try {
    await pending;
  } catch (err) {
    console.log('Execução cancelada:', err);
  }
}
