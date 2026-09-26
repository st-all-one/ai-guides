# 13 — Cheatsheet

> Referência rápida. Todas as operações assumem `const kv = await getKv()`.

## Abrir / fechar

```ts
const kv = await Deno.openKv();            // local (caminho padrão) / Deploy
const kv = await Deno.openKv(":memory:");  // testes
const kv = await Deno.openKv(url);         // remoto
kv.close();
using kv = await Deno.openKv();            // Disposable
kv.commitVersionstamp();                   // symbol p/ usar como parte de chave
```

## Chaves

```ts
["mtr", numero]                       // parte string
["mtr", 123]                          // number
["members", 1n]                       // bigint
["files", new Uint8Array([1,2,3])]    // Uint8Array
["flag", true]                        // boolean
// ordem de tipo: Uint8Array < string < number < bigint < boolean (symbol no tipo da API)
// max key 2 KiB
```

## Ler

```ts
kv.get<T>(key)                                   // KvEntryMaybe<T>
kv.get<T>(key, { consistency: "eventual" })
kv.getMany<[A, B]>([k1, k2])                     // ≤ 10, mesma ordem
```

`KvEntry = { key, value, versionstamp }`; inexistente → `value`/`versionstamp`
`null`.

## Listar

```ts
kv.list<T>({ prefix: ["mtr"] })
kv.list<T>({ prefix: ["mtr"], start: ["mtr", "A"] })          // start inclusive
kv.list<T>({ prefix: ["mtr"], end: ["mtr", "Z"] })            // end exclusive
kv.list<T>({ start: ["mtr", "A"], end: ["mtr", "N"] })        // range puro
kv.list<T>(sel, { limit: 50, cursor, batchSize: 500, reverse: true, consistency: "eventual" })
```

Iterator: `for await (const e of iter)`; `iter.cursor` para retomar.

## Escrever

```ts
kv.set(key, value)
kv.set(key, value, { expireIn: 60_000 })   // TTL ms
kv.delete(key)
```

## Atômico (OCC)

```ts
const res = await kv.atomic()
  .check(entry)                            // versionstamp deve bater
  .check({ key, versionstamp: null })      // não pode existir
  .check(otherEntry)
  .set(k, v)
  .delete(k2)
  .sum(k3, 1n)                             // atalho: operando bigint
  .min(k4, 0n)
  .max(k5, 999n)
  .commit();                               // { ok: true, versionstamp } | { ok: false }

// atalho genérico
kv.atomic().mutate({ type: "sum", key, value: new Deno.KvU64(1n) }).commit();
```

Retry padrão:

```ts
for (let i = 0; i < 5; i++) {
  const cur = await kv.get<T>(key);
  const res = await kv.atomic().check({ key, versionstamp: cur.versionstamp }).set(key, novo).commit();
  if (res.ok) break;
}
```

## Watch

```ts
const stream = kv.watch([["a"], ["b"]]);        // ≤ 10 chaves
for await (const [a, b] of stream) { /* a.value, a.versionstamp */ }
kv.watch(keys, { raw: true });                  // emite em toda mutação (verboso)
```

## Fila / Cron

```ts
await kv.enqueue(valor, { delay: 0, backoffSchedule: [1000, 5000], keysIfUndelivered: [["dlq", id]] });
// → Promise<Deno.KvCommitResult>
kv.listenQueue<T>(async (msg) => { /* idempotente */ }); // roda pela vida do processo
Deno.cron("nome", "*/5 * * * *", async () => { /* ... */ }); // handler sem args; UTC
Deno.cron("nome", "0 3 * * *", { signal: ac.signal }, async () => { /* ... */ });
```

## Deno.KvU64

```ts
new Deno.KvU64(42n);         // valor de topo apenas
(await kv.get<Deno.KvU64>(key)).value?.value; // bigint
```

## Tipos

```ts
type KvKeyPart = Uint8Array | string | number | bigint | boolean;
type KvKey = readonly KvKeyPart[];
type KvEntry<T> = { key: KvKey; value: T; versionstamp: string };
type KvEntryMaybe<T> = { key: KvKey; value: T | null; versionstamp: string | null };
type KvCommitResult = { ok: true; versionstamp: string };
type KvCommitError = { ok: false };
```

## Limites

| Item | Limite |
|------|--------|
| Chave | 2 KiB |
| Valor | 64 KiB |
| `getMany` | 10 chaves |
| `list` batch | default = `limit` (ou 100); máx. 500 |
| Atômico: checks | 100 |
| Atômico: mutações | 1000 |
| Atômico: total | 800 KiB |
| Atômico: chaves | 90 KiB |
| `watch` | 10 chaves |

## Erros comuns

```ts
// chave inexistente NÃO lança:
const { value } = await kv.get(key);        // value: T | null

// commit conflitante NÃO lança:
const res = await kv.atomic()...commit();   // res.ok === false

// sum/min/max só em Deno.KvU64 (topo)
// valor não-plain-object (classe) e função NÃO serializam
// Deno.openKv exige unstable kv
```

## Frases de ouro

- Chave namespaced: `["mtr", numero, "residuos"]` — nunca `"mtr:" + numero`.
- Read-modify-write ⟹ `atomic().check()` + retry com limite.
- Cache/sessão/rate-limit ⟹ `expireIn`.
- Índice secundário ⟹ ponteiro + transação atômica com o primário.
- KV é **server-only**; islands nunca importam `utils/kv.ts`.
