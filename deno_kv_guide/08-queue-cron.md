# 08 — Filas (`enqueue`/`listenQueue`) e Cron

> O KV traz uma **fila de mensagens durável** embutida, ideal para trabalho
> assíncrono (enviar e-mail, sincronizar MTR, gerar CDF). O consumidor é um
> `listenQueue`; o produtor é `enqueue`. Mensagens podem ser adiadas e reentregues.

## 1. Enfileirar

```ts
const kv = await getKv();

await kv.enqueue({ tipo: "sincronizar_mtr", numero: "PE-2026-0001" });
```

Assinatura:

```ts
kv.enqueue(
  value: unknown,
  options?: {
    delay?: number;                // ms antes de entregar
    backoffSchedule?: number[];    // intervalos de reentrega em caso de falha
    keysIfUndelivered?: Deno.KvKey[]; // DLQ: chaves gravadas se esgotar tentativas
  },
): Promise<Deno.KvCommitResult>;
```

- O valor passa pelas mesmas regras de **structured clone** (`02`).
- `enqueue` é durável: sobrevive a restart.
- Use `delay` para agendar algo no futuro (ex.: `delay: 24*3600_000`).

## 2. Processar

Registre **um** listener por processo. Ele recebe cada mensagem; se o handler
lançar, a mensagem é reentregue conforme `backoffSchedule`.

```ts
const kv = await getKv();

kv.listenQueue(async (msg: { tipo: string; numero: string }) => {
  switch (msg.tipo) {
    case "sincronizar_mtr":
      await sincronizarMtr(msg.numero);
      break;
    case "gerar_cdf":
      await gerarCdf(msg.numero);
      break;
    default:
      console.warn("mensagem desconhecida", msg);
  }
});
```

Assinatura:

```ts
kv.listenQueue<T>(handler: (value: T) => void | Promise<void>): Promise<void>;
```

> `listenQueue` retorna `Promise<void>` que serve para **erros de registro**;
> não a aguarde para "esperar o fim". O listener roda pelo tempo de vida do
> processo. Registre **uma vez** no boot: `kv.listenQueue(fn);` (sem `await`).

## 3. Retry (backoff) e DLQ

```ts
await kv.enqueue(
  { tipo: "gerar_cdf", numero },
  {
    backoffSchedule: [1_000, 5_000, 15_000], // 1s, 5s, 15s
    keysIfUndelivered: [["fila_falha", "gerar_cdf", numero]],
  },
);
```

- `backoffSchedule`: array de intervalos entre tentativas. Após a última, se
  ainda falhar, o item vai para as `keysIfUndelivered` (**dead letter queue**).
- Sem `keysIfUndelivered`, a mensagem é descartada após as tentativas.
- Monitore a DLQ: ela é a sua fila de "intervenção manual".

## 4. Idempotência (obrigatório)

Reentrega **é possível**. O consumidor precisa ser **idempotente**: processar a
mesma mensagem duas vezes não pode duplicar efeito. Padrão: **reivindicar** a
mensagem atomicamente numa chave de conclusão (com TTL) antes de processar.

```ts
async function processarSincronizacao(numero: string, mensagemId: string) {
  const kv = await getKv();
  const doneKey = ["fila_concluida", mensagemId] as const;

  // Reivindica a mensagem atomicamente: só um consumidor "ganha".
  const claim = await kv.atomic()
    .check({ key: doneKey, versionstamp: null })
    .set(doneKey, { status: "processando" }, { expireIn: 7 * 24 * 3600_000 })
    .commit();
  if (!claim.ok) return; // já reivindicada/processada por outro consumidor

  await sincronizarMtr(numero);

  await kv.set(doneKey, { status: "ok" }, { expireIn: 7 * 24 * 3600_000 });
}
```

> **Trade-off:** se o processo cair depois de reivindicar e antes de concluir, a
> chave fica como `"processando"` até o TTL. Ajuste o TTL ao tempo máximo do job
> ou adicione um campo de "em andamento desde" para reprocessar jobs presos.

Inclua um `mensagemId` (UUID) na carga para permitir o dedupe.

## 5. Padrão produtor/consumidor no projeto

```ts
type Job = { tipo: "sincronizar_mtr" | "gerar_cdf"; numero: string; jobId: string };

async function enfileirarJob(job: Job, delayMs = 0): Promise<void> {
  const kv = await getKv();
  await kv.enqueue(job, {
    delay: delayMs,
    backoffSchedule: [1_000, 5_000, 15_000],
    keysIfUndelivered: [["fila_falha", job.tipo, job.jobId]],
  });
}
```

- Handler de rota só enfileira e responde (`303`/`202`) — não bloqueia o usuário.
- Processamento pesado (integração open-mtr) fica no consumidor.

## 6. `Deno.cron` — rotinas periódicas

Cron nativo do Deno, separado da fila (mas frequentemente usado com ela):

```ts
Deno.cron("limpar fila falha", "0 * * * *", async () => { // a cada hora
  await reprocessarDlq();
});
```

- Requer flag instável: `"unstable": ["kv", "cron"]` no `deno.json` (ou
  `--unstable-cron`).
- Assinatura: `Deno.cron(name, schedule, handler)` ou
  `Deno.cron(name, schedule, { backoffSchedule?, signal? }, handler)`.
- `schedule` é uma string cron (`"*/5 * * * *"`) ou objeto
  (`{ minute: { every: 5 } }`); o horário é **UTC**.
- O `handler` **não recebe argumentos**. Para parar um cron (shutdown gracioso),
  passe `{ signal: ac.signal }` nas opções e chame `ac.abort()`.
- `backoffSchedule` reexecuta em falha (máx. **5 tentativas**, intervalo máx.
  **1 h**).
- Em Deno Deploy, cron é suportado; em ambientes sem suporte, o registro pode
  falhar — faça feature detection.

```ts
// limpa chaves de rate-limit antigas todo dia às 3h
Deno.cron("limpar ratelimit", "0 3 * * *", async () => {
  const kv = await getKv();
  for await (const e of kv.list({ prefix: ["ratelimit"] })) {
    // TTL já cuida; aqui é só um exemplo de varredura
  }
});
```

## 7. Watch + fila para tempo real

Combine `kv.enqueue` (durabilidade) com `kv.watch` (`09`) quando o cliente
precisa acompanhar o progresso do job em tempo real.

## 8. Checklist

```
[ ] Toda mensagem tem jobId (UUID) para dedupe
[ ] Consumidor idempotente (chave de conclusão com TTL)
[ ] backoffSchedule definido (não default infinito)
[ ] keysIfUndelivered (DLQ) para falhas permanentes
[ ] DLQ monitorada/reprocessada (cron)
[ ] listenQueue registrado UMA vez no boot
[ ] Handler de rota apenas enfileira; trabalho pesado no consumidor
[ ] Validação do payload na entrada do consumidor (input não confiável)
```
