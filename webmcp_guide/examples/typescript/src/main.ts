/**
 * Bootstrap da página de exemplo.
 */
import { listTools, runOrderStatus } from './agent.js';
import { registerScopedTool, registerStoreTools } from './tools.js';

// Reage a mudanças na lista de ferramentas (ex.: iframes vizinhos).
document.modelContext?.addEventListener('toolchange', () => {
  console.log('[toolchange] Ferramentas da página mudaram');
  listTools();
});

await registerStoreTools();

// Ferramenta "escopada": desregistrada quando o controller é abortado.
const editSession = new AbortController();
await registerScopedTool(editSession);

// UI de demonstração.
const out = (text: string) => {
  const el = document.querySelector<HTMLDivElement>('#output')!;
  el.textContent += text + '\n';
};

document.querySelector('#list-tools')?.addEventListener('click', async () => {
  const tools = await document.modelContext.getTools();
  out(tools.map((t) => t.name).join(', '));
});

document.querySelector('#run-order-status')?.addEventListener('click', async () => {
  const result = await runOrderStatus('ORD-123');
  out(JSON.stringify(result));
});

document.querySelector('#unregister')?.addEventListener('click', () => {
  // Encerra o "modo edição": undo_last_edit é desregistrada.
  editSession.abort();
  out('Modo edição encerrado → undo_last_edit desregistrada');
});

out('Ferramentas registradas. Consulte o console.');
