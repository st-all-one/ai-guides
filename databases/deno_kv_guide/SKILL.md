---
name: deno-kv
description: >
  Deno KV (Deno 2.9.x): hierarchical keyspace, operations, OCC transactions,
  secondary indexes, TTL, TypeScript modeling, queue/cron, watch/realtime,
  Fresh 2 integration, testing, production deploy. Load when persisting
  key-value data inside the Deno runtime.
category: databases
version: "Deno 2.9.x (unstable)"
tags: [deno, deno-kv, key-value, transactions, occ, ttl, queue, watch, fresh]
license: MIT
---

# Deno KV (Deno 2.9.x)

Embedded key-value store. Local backend = SQLite; production = FoundationDB (Deno Deploy) or remote via `KV_URL`. APIs are unstable: `--unstable-kv` / `deno.json` `"unstable": ["kv"]` (cron: `"cron"`).

## Use When
- Persisting/querying by exact key, prefix, or range
- Modeling entities with namespaced keys (`["app", id]`)
- Querying by attribute with secondary indexes
- Atomic transactions with optimistic concurrency (OCC)
- Cache/session/rate-limit with TTL (`expireIn`)
- Work queues (`enqueue`/`listenQueue`), realtime (`watch`), cron
- Testing with an ephemeral `:memory:` DB

## Core Rules
- One `getKv()` singleton, server-only (`utils/kv.ts`); never `Deno.openKv()` per request.
- Design keys hierarchically; never store unbounded values.
- All multi-step writes go through `kv.atomic()` (OCC: check `versionstamp`).
- Secondary indexes are explicit keys `["idx", attr, value, id]`; keep them in the same atomic commit.
- Structured-clone values only; no classes/functions.
- Watch supports ≤10 keys; use prefix `list` for bounded scans.
- `listenQueue()` has no `AbortSignal`; runs for the process lifetime.
- Limits: key 2 KiB · value 64 KiB · `getMany` 10 · list batch max 500 · atomic 100 checks/1000 mutations/800 KiB.

## Core Patterns
```ts
const kv = await Deno.openKv();

// Read/write
await kv.set(["user", "42", "name"], "Ana");
const { value, versionstamp } = await kv.get<string>(["user", "42", "name"]);

// Prefix scan
for await (const e of kv.list({ prefix: ["orders", "user-42"] })) console.log(e.key, e.value);

// OCC transaction
await kv.atomic()
  .check({ key: ["stats", "visits"], versionstamp })
  .set(["stats", "visits"], (value as number) + 1)
  .commit();

// Secondary index (same commit as the primary write)
const id = crypto.randomUUID();
await kv.atomic()
  .set(["user", id], { email })
  .set(["idx", "email", email, id], id)
  .commit();

// TTL
await kv.set(["session", token], data, { expireIn: 3_600_000 });

// Queue + cron
await kv.enqueue({ task: "email", to });
kv.listenQueue(async (msg) => { await handle(msg); });
Deno.cron("cleanup", "0 3 * * *", { backoffSchedule: [1_000, 5_000, 30_000] }, async () => {
  await cleanup();
});

// Watch
const stream = kv.watch([["config"]]);
for await (const [entry] of stream) apply(entry.value);
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Overview, limits, navigation |
| `01-quickstart.md` | Open, set/get, first flow |
| `02-keyspace.md` | Keys, values, versionstamp, ULID, KvU64 |
| `03-operations.md` | get/getMany/list/set/delete |
| `04-transactions.md` | Atomic operations, OCC |
| `05-secondary-indexes.md` | Index design and maintenance |
| `06-expiration-ttl.md` | TTL and cleanup |
| `07-modeling-typescript.md` | Typed repositories |
| `08-queue-cron.md` | Queues and cron |
| `09-watch-realtime.md` | Watch streams |
| `10-fresh-integration.md` | Fresh 2 handlers/SSR |
| `11-testing.md` | `:memory:` tests |
| `12-production-deploy.md` | Deploy and `KV_URL` |
| `13-cheatsheet.md` | Quick reference |
| `14-faq-troubleshooting.md` | FAQ and pitfalls |
| `15-padroes-avancados.md` | Advanced patterns |
| `official_guide/` | Official reference extracts |

## Read Order
`00`→`01`→`02`→`03`; transactions `04`; indexes `05`; TTL `06`; queues/watch `08`+`09`.

## Prereqs
Deno 2.x and TypeScript.
