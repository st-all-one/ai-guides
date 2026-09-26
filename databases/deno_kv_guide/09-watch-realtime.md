# 09 — Watch e Tempo Real

> `kv.watch(keys)` devolve um `ReadableStream` que emite sempre que o
> `versionstamp` de qualquer chave observada muda. Base para dashboards ao vivo,
> chat, notificações e acompanhamento de jobs — combinado com WebSocket/SSE.

## 1. Uso básico

```ts
const kv = await getKv();

const stream = kv.watch([["foo"], ["bar"]]);
for await (const entries of stream) {
  entries[0].key;          // ["foo"]
  entries[0].value;        // "bar" | null
  entries[0].versionstamp; // "00000000000000010000" | null
  entries[1].key;          // ["bar"]
  entries[1].value;        // null
}
```

Assinatura:

```ts
kv.watch<T extends readonly unknown[]>(
  keys: T,
  options?: { raw?: boolean },
): ReadableStream<[...]>;
```

- O stream emite **arrays** de `Deno.KvEntryMaybe`, na ordem das chaves passadas.
- **Não** entrega todos os estados intermediários: se uma chave muda várias vezes
  rápido, você pode receber apenas o **estado mais recente**. O stream é
  "conflated".
- Máximo de **10 chaves** por watcher.
- `raw: false` (default): emite só quando o valor muda de forma **observável**.
  `raw: true`: emite em **toda mutação** (mesmo que o valor não mude, ex.:
  deletar uma chave inexistente) e pode emitir ocasionalmente sem mutação —
  útil para observar versionstamps brutos/dedupe, mas mais verboso.

## 2. Só o estado mais recente

Não use `watch` para contar eventos — use para refletir o **estado atual**. Se
precisa de cada mudança, grave um log em `list` (append-only) e observe o
ponteiro/cursor.

```ts
// padrão log + cursor
// ["mensagens", roomId, ulid()] → mensagem
// ["ultima_mensagem", roomId] → ulid
```

## 3. Exemplo: chat por `watch` + `list`

Observa `["last_message_id", roomId]` e usa `list` para buscar as novas
mensagens entre o que já viu e o novo id:

```ts
let seen = "";
for await (const [messageId] of kv.watch([["last_message_id", roomId]])) {
  if (messageId === null) continue; // chave ainda não existe
  const newMessages = await Array.fromAsync(kv.list({
    start: ["messages", roomId, seen, ""],
    end: ["messages", roomId, messageId, ""],
  }));
  await websocket.write(JSON.stringify(newMessages));
  seen = messageId;
}
```

## 4. Integração com WebSocket no Fresh

`ctx.upgrade()` (modo gerenciado) ou `Deno.upgradeWebSocket` (controle manual).
Exemplo de controle manual:

```ts
// routes/api/ws/[numero].ts
import { define } from "@/utils/define.ts";
import { getKv } from "@/utils/kv.ts";

export const handler = define.handlers({
  GET(ctx) {
    const numero = ctx.params.numero ?? "";
    const { socket, response } = Deno.upgradeWebSocket(ctx.req);

    const abort = new AbortController();
    socket.onopen = async () => {
      const kv = await getKv();
      const stream = kv.watch([["mtr", numero]], { raw: false })
        .pipeThrough(new TransformStream({
          transform(entries, controller) {
            controller.enqueue(JSON.stringify(entries));
          },
        }));
      const reader = stream.getReader();
      abort.signal.addEventListener("abort", () => reader.cancel());
      while (!abort.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        if (socket.readyState === WebSocket.OPEN) socket.send(value as string);
      }
    };
    socket.onclose = () => abort.abort();

    return response;
  },
});
```

Regras:
- Cheque `socket.readyState === WebSocket.OPEN` antes de `send`.
- Cancele o stream no `close`/`error` (`AbortController`) para não vazar.
- Um watcher por conexão; limite de 10 chaves.

## 5. SSE (Server-Sent Events)

`ctx.stream()` do Fresh também serve para push unidirecional. Mantenha a
referência do stream para cancelar em `cancel()` (o `for await` infinito não
para sozinho).

```ts
export const handler = define.handlers({
  async GET(ctx) {
    const kv = await getKv();
    const body = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        for await (const entries of kv.watch([["stats"]])) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(entries)}\n\n`));
        }
      },
      cancel() { /* abortar watch */ },
    });
    return new Response(body, {
      headers: { "content-type": "text/event-stream", "cache-control": "no-store" },
    });
  },
});
```

## 6. Quando usar cada mecanismo

| Necessidade | Ferramenta |
|-------------|------------|
| "Estado atual mudou" (live) | `kv.watch` |
| "Todas as mudanças em ordem" | log append-only + `kv.list` |
| Trabalho em background durável | `kv.enqueue`/`listenQueue` (`08`) |
| Pull no cliente a cada N s | `list` + polling (simples, menos eficiente) |

## 7. Checklist

```
[ ] ≤ 10 chaves observadas por watcher
[ ] Stream cancelado no close/erro (AbortController)
[ ] socket.readyState checado antes de send
[ ] Watch para estado atual; log+list para histórico
[ ] Nenhum import de utils/kv no client/island
[ ] Tratar entry.value === null (chave pode ser deletada)
```
