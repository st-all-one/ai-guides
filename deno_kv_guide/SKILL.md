# SKILL: Deno KV — Uso Correto em Projeto Real

## Description
Deno KV — banco chave-valor embutido no runtime Deno (`Deno.Kv`), instável
(`--unstable-kv` / `deno.json » unstable`). Chaves são arrays hierárquicos;
valores são structured-clone. Local = SQLite; produção = FoundationDB. Este guia
é prescritivo: siga os passos e regras abaixo ao implementar no projeto
`mtr-site-atr` (Fresh 2.x).

## When to Use
- Persistir/consultar dados por chave exata, prefixo ou range
- Modelar entidades com chaves namespaced (`["mtr", numero]`)
- Consultar por atributo (status, e-mail, CNPJ) com índices secundários
- Executar transações atômicas com controle de concorrência otimista (OCC)
- Cache, sessão, rate-limit com TTL (`expireIn`)
- Filas de trabalho (`enqueue`/`listenQueue`), tempo real (`watch`), cron
- Testar com banco efêmero (`:memory:`)

## Regras de Ouro (sempre seguir)
1. **SEMPRE** `getKv()` singleton server-only (`utils/kv.ts`); **NUNCA** `Deno.openKv()` por request.
2. **NUNCA** importe `utils/kv.ts` em `islands/` ou `client.ts` — KV é server-only.
3. **SEMPRE** chaves como **array namespaced**; **NUNCA** string concatenada.
4. **SEMPRE** `atomic().check()` + loop de retry em read-modify-write; **NUNCA** ler e sobrescrever.
5. `check({ key, versionstamp: null })` = "só se **não** existir" (idempotência/criação única).
6. **SEMPRE** trate `value === null` e `res.ok === false`; nenhum dos dois lança.
7. **SEMPRE** `expireIn` em cache/sessão/rate-limit; reaplique em updates de chaves efêmeras.
8. **SEMPRE** índices primário+secundário na **mesma** transação atômica.
9. **SEMPRE** `limit`/`cursor` em `list`; hidrate índices com `getMany` em chunks ≤ 10.
10. **SEMPRE** `":memory:"` nos testes; **NUNCA** toque KV de produção.
11. **SEMPRE** versione o schema no valor (`{ v: 1, ... }`) e trate migração na leitura.
12. **SEMPRE** idempotência em consumidores de fila (reentrega at-least-once).
13. `sum`/`min`/`max`: o valor **armazenado** é `Deno.KvU64` (topo); nos atalhos o **operando** é `bigint`.
14. Respeite os limites: chave ≤ 2 KiB, valor ≤ 64 KiB, `getMany` ≤ 10, `list` batch ≤ 500, atômico ≤ 800 KiB.

## Setup (copie)
```ts
// utils/kv.ts
import { IS_BROWSER } from "fresh/runtime";

let promise: Promise<Deno.Kv> | null = null;

export function getKv(): Promise<Deno.Kv> {
  if (IS_BROWSER) throw new Error("Deno KV é server-only");
  promise ??= Deno.openKv(Deno.env.get("KV_URL") ?? undefined);
  return promise;
}

export async function closeKv(): Promise<void> {
  await promise?.then((kv) => kv.close());
  promise = null;
}
```
```json
// deno.json
{ "unstable": ["kv", "cron"] }
```

## API essencial
| Operação | Assinatura | Nota |
|----------|------------|------|
| Ler | `kv.get<T>(key, { consistency })` | default `"strong"` |
| Ler vários | `kv.getMany([[...]])` | ≤ 10; mesma ordem |
| Listar | `kv.list<T>(selector, { limit, cursor, reverse, batchSize, consistency })` | prefixo/range |
| Escrever | `kv.set(key, value, { expireIn? })` | TTL em ms |
| Deletar | `kv.delete(key)` | no-op se inexistente |
| Transação | `kv.atomic().check(...).set/delete/sum/min/max(...).commit()` | `{ ok, versionstamp }` |
| Observar | `kv.watch(keys)` → `ReadableStream` | ≤ 10; estado mais recente |
| Fila | `kv.enqueue(v, { delay, backoffSchedule, keysIfUndelivered })` → `KvCommitResult` / `kv.listenQueue(fn)` | at-least-once |
| Cron | `Deno.cron(nome, schedule, fn)` | instável |
| U64 | `new Deno.KvU64(1n)` + `sum/min/max` | só topo |

## Transação OCC (copie)
```ts
for (let i = 0; i < 5; i++) {
  const cur = await kv.get<T>(key);
  const res = await kv.atomic()
    .check({ key, versionstamp: cur.versionstamp })
    .set(key, transform(cur.value))
    .commit();
  if (res.ok) return;
}
throw new Error("conflito persistente");
```

## Índice secundário (copie)
```ts
const primaryKey = ["users", user.id] as const;
const byEmailKey = ["users_by_email", user.email.toLowerCase()] as const;
const res = await kv.atomic()
  .check({ key: primaryKey, versionstamp: null })
  .check({ key: byEmailKey, versionstamp: null })
  .set(primaryKey, user)
  .set(byEmailKey, user.id) // ponteiro, não cópia
  .commit();
if (!res.ok) throw new TypeError("usuário/e-mail já existe");
```

## Mapa do Guia (tarefa → arquivo)
| Tarefa | Arquivo |
|--------|---------|
| Visão geral e exemplo canônico | `00-index.md` |
| Habilitar, abrir/fechar, CRUD | `01-quickstart.md` |
| Chaves, ordem, valores, KvU64, versionstamp, ULID | `02-keyspace.md` |
| get/getMany/list/set/delete + consistência | `03-operations.md` |
| OCC, atomic, checks, sum/min/max, limites | `04-transactions.md` |
| Índices únicos/não-únicos, ponteiro, migração | `05-secondary-indexes.md` |
| TTL e expiração atômica | `06-expiration-ttl.md` |
| Tipos TS, service layer, DTOs, schema version | `07-modeling-typescript.md` |
| Fila e cron (DLQ, idempotência) | `08-queue-cron.md` |
| Watch, WebSocket, SSE | `09-watch-realtime.md` |
| Integração Fresh (getKv, handlers, sessão) | `10-fresh-integration.md` |
| Testes com `:memory:` | `11-testing.md` |
| Produção, Deploy, backup, limites | `12-production-deploy.md` |
| Referência rápida | `13-cheatsheet.md` |
| Erros comuns | `14-faq-troubleshooting.md` |
| Padrões avançados (lock, cache, outbox) | `15-padroes-avancados.md` |

## Anti-padrões (NUNCA)
- `Deno.openKv()` por request; importar KV em island/client.
- Chave string plana (`"mtr:" + id`) — use array.
- Read-modify-write sem `check`; ignorar `res.ok`.
- Loop de retry sem limite.
- `sum`/`min`/`max` sobre valor que não é `Deno.KvU64` (ou aninhado).
- Guardar instância de classe/função/Symbol; valor > 64 KiB.
- Cache sem `expireIn`; índice fora da transação do primário.
- Testar contra KV real; confiar no TTL como segurança.

## Prerequisites
- Deno ≥ 2.9 com `unstable: ["kv"]` (e `"cron"` para `Deno.cron`)
- Fresh 2.x + `fresh/runtime` (`IS_BROWSER`) no projeto

## Related Guides
- `ai-guides/fresh_guide/` — handlers, SSR, islands, segurança
- `ai-guides/eta_guide/` — templates em apps que consultam o KV
- `ai-guides/kysely_guide/` — alternativa relacional quando KV não basta
- `ai-guides/web_api_guide/` — desenho dos endpoints `/api/*`
