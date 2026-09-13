# 15 — Padrões Avançados

> Receitas prontas para problemas recorrentes em KV: contadores distribuídos,
> locks, cache, outbox, feature flags, soft delete, multi-tenant, busca e
> grandes valores.

## 1. Contadores distribuídos (hot key)

Uma única chave `["stats","visitas"]` vira gargalo sob alta concorrência
(retries de OCC). **Shardize**:

```ts
const SHARDS = 16;
const shardKey = (n = Math.floor(Math.random() * SHARDS)) => ["stats", "visitas", n];

async function incrementar(): Promise<void> {
  const kv = await getKv();
  const key = shardKey();
  for (let i = 0; i < 5; i++) {
    const cur = await kv.get<Deno.KvU64>(key);
    const res = await kv.atomic()
      .check({ key, versionstamp: cur.versionstamp })
      .sum(key, 1n)
      .commit();
    if (res.ok) return;
  }
  throw new Error("conflito no shard");
}

async function total(): Promise<bigint> {
  const kv = await getKv();
  const keys = Array.from({ length: SHARDS }, (_, n) => ["stats", "visitas", n]);
  let soma = 0n;
  for (let i = 0; i < keys.length; i += 10) {
    const entries = await kv.getMany<Deno.KvU64[]>(keys.slice(i, i + 10));
    for (const e of entries) soma += e.value?.value ?? 0n;
  }
  return soma;
}
```

## 2. Lock distribuído (lease)

Não há lock nativo; use uma chave de posse com TTL. O vencedor é quem cria com
`versionstamp: null`:

```ts
async function adquirirLock(recurso: string, ttlMs: number): Promise<string | null> {
  const kv = await getKv();
  const token = crypto.randomUUID();
  const key = ["lock", recurso] as const;
  const res = await kv.atomic()
    .check({ key, versionstamp: null })
    .set(key, token, { expireIn: ttlMs })
    .commit();
  return res.ok ? token : null;
}

async function liberarLock(recurso: string, token: string): Promise<void> {
  const kv = await getKv();
  const key = ["lock", recurso] as const;
  const cur = await kv.get<string>(key);
  if (cur.value === token) {
    await kv.atomic().check(cur).delete(key).commit();
  }
}
```

Renove o lease antes do TTL para trabalhos longos; valide a posse ao concluir.

## 3. Idempotência / dedupe de requisição

Para evitar processar duas vezes (retry de cliente, fila):

```ts
async function umaVez(idempotencyKey: string, fn: () => Promise<unknown>) {
  const kv = await getKv();
  const key = ["idem", idempotencyKey] as const;
  const res = await kv.atomic()
    .check({ key, versionstamp: null })
    .set(key, { status: "processando", em: new Date().toISOString() }, { expireIn: 24 * 3600_000 })
    .commit();
  if (!res.ok) return { deduplicado: true };
  await fn();
  await kv.set(key, { status: "ok", em: new Date().toISOString() }, { expireIn: 24 * 3600_000 });
  return { deduplicado: false };
}
```

## 4. Outbox (evento + efeito atômico)

Grave o evento **na mesma transação** do dado e processe a outbox depois. Garante
que nenhum efeito se perde:

```ts
async function criarMtrComEvento(m: Mtr) {
  const kv = await getKv();
  const eventoId = crypto.randomUUID();
  const res = await kv.atomic()
    .check({ key: ["mtr", m.numero], versionstamp: null })
    .set(["mtr", m.numero], { v: 1, ...m })
    .set(["outbox", eventoId], { tipo: "mtr.criado", numero: m.numero })
    .commit();
  if (!res.ok) throw new Error("MTR já existe");
  await kv.enqueue({ tipo: "processar_outbox", eventoId });
}
```

## 5. Soft delete + índices

Não apague fisicamente quando precisa de histórico/auditoria; marque `deletadoEm`
e filtre na leitura:

```ts
interface Registro { v: 1; id: string; deletadoEm: string | null }

async function softDelete(kv: Deno.Kv, id: string) {
  for (let i = 0; i < 5; i++) {
    const cur = await kv.get<Registro>(["itens", id]);
    if (!cur.value) return;
    const res = await kv.atomic()
      .check(cur)
      .set(["itens", id], { ...cur.value, deletadoEm: new Date().toISOString() })
      .delete(["itens_ativos", id])
      .commit();
    if (res.ok) return;
  }
}
```

Mantenha um índice `itens_ativos` e remova dele no soft delete.

## 6. Feature flags

```ts
async function flagAtiva(nome: string, padrao = false): Promise<boolean> {
  const kv = await getKv();
  const r = await kv.get<boolean>(["flag", nome], { consistency: "eventual" });
  return r.value ?? padrao;
}

// rollout por percentual
async function flagParaUsuario(nome: string, userId: string): Promise<boolean> {
  const kv = await getKv();
  const pct = (await kv.get<number>(["flag_pct", nome])).value ?? 0;
  const bucket = Number.parseInt(userId.slice(0, 8), 16) % 100;
  return bucket < pct;
}
```

## 7. Busca textual simples (índice normalizado)

KV não faz full-text. Para busca por termo, crie um índice invertido com
normalização:

```ts
const tokenizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/).filter((t) => t.length >= 3);

async function indexarMtr(kv: Deno.Kv, m: Mtr, texto: string) {
  await kv.atomic()
    .set(["mtr_busca", m.numero], texto)
    .commit();
  for (const termo of new Set(tokenizar(texto))) {
    await kv.set(["indice", termo, m.numero], m.numero);
  }
}

async function buscar(termo: string): Promise<string[]> {
  const kv = await getKv();
  const ids: string[] = [];
  for await (const e of kv.list<string>({ prefix: ["indice", termo.toLowerCase()] }, { limit: 100 })) {
    ids.push(e.value);
  }
  return ids;
}
```

Para produção, considere um serviço de busca dedicado; isso serve para catálogos
pequenos/moderados.

## 8. Valores grandes (chunking)

```ts
const CHUNK = 48 * 1024; // < 64 KiB

async function setGrande(kv: Deno.Kv, key: Deno.KvKey, bytes: Uint8Array) {
  const total = Math.ceil(bytes.length / CHUNK);
  await kv.set(key, { v: 1, total, tamanho: bytes.length });
  for (let i = 0; i < total; i++) {
    await kv.set([...key, "chunk", i], bytes.subarray(i * CHUNK, (i + 1) * CHUNK));
  }
}

async function getGrande(kv: Deno.Kv, key: Deno.KvKey): Promise<Uint8Array> {
  const meta = await kv.get<{ total: number }>(key);
  if (!meta.value) return new Uint8Array();
  const partes: Uint8Array[] = [];
  for (let i = 0; i < meta.value.total; i++) {
    const c = await kv.get<Uint8Array>([...key, "chunk", i]);
    if (c.value) partes.push(c.value);
  }
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of partes) { out.set(p, off); off += p.length; }
  return out;
}
```

Melhor ainda: guarde o binário em object storage e no KV apenas a URL/referência.

## 9. Multi-tenant por prefixo

Namespace por tenant na primeira parte da chave, e sempre valide o tenant do
usuário autenticado:

```ts
const tenantKey = (tenantId: string, ...rest: Deno.KvKeyPart[]) =>
  ["t", tenantId, ...rest] as const;

async function listarMtrsTenant(kv: Deno.Kv, tenantId: string) {
  const out: Mtr[] = [];
  for await (const e of kv.list<Mtr>({ prefix: tenantKey(tenantId, "mtr") })) {
    out.push(e.value);
  }
  return out;
}
```

**NUNCA** construa a chave com `tenantId` vindo do usuário sem verificar a
autorização.

## 10. Cache de token JWT (open-mtr)

```ts
async function tokenSistema(sistema: string): Promise<string> {
  const kv = await getKv();
  const key = ["cache", "mtr", "token", sistema] as const;
  const hit = await kv.get<string>(key, { consistency: "eventual" });
  if (hit.value) return hit.value;

  const { token, expiraEm } = await autenticar(sistema); // open-mtr
  const ttl = Math.max(0, Date.parse(expiraEm) - Date.now() - 60_000); // margem 60s
  await kv.set(key, token, { expireIn: ttl });
  return token;
}
```

## 11. Log de eventos append-only (auditoria)

```ts
import { ulid } from "jsr:@std/ulid";

async function registrarEvento(tipo: string, payload: unknown) {
  const kv = await getKv();
  const id = ulid();
  await kv.atomic()
    .set(["eventos", tipo, id], { v: 1, em: new Date().toISOString(), payload })
    .set(["eventos_ultimo", tipo], id)
    .commit();
  return id;
}
```

Liste em ordem cronológica com `prefix: ["eventos", tipo]` (ULID ordenável).

## 12. Paginação estável

Evite offset (não existe). Use **cursor** ou "keyset" por chave:

```ts
async function pagina(after?: string) {
  const kv = await getKv();
  const itens: Deno.KvEntry<Mtr>[] = [];
  for await (const e of kv.list<Mtr>({ prefix: ["mtr"] }, { limit: 50, cursor: after })) {
    itens.push(e);
  }
  return { itens, proximo: itens.at(-1)?.value.numero };
}
```

## 13. Relação N:N

Índice não-único dos dois lados:

```ts
// ["user_projetos", userId, projetoId] → projetoId
// ["projeto_users", projetoId, userId] → userId
async function vincular(userId: string, projetoId: string) {
  const kv = await getKv();
  await kv.atomic()
    .set(["user_projetos", userId, projetoId], projetoId)
    .set(["projeto_users", projetoId, userId], userId)
    .commit();
}
```

## 14. Checklist de padrões

```
[ ] Hot keys shardizadas antes de virar gargalo
[ ] Locks com TTL (lease) e validação de posse
[ ] Operações não-idempotentes protegidas por dedupe
[ ] Outbox para efeitos que não podem se perder
[ ] Soft delete mantém índices consistentes
[ ] Multi-tenant com prefixo + checagem de autorização
[ ] Grandes valores via chunk/object storage
[ ] Busca limitada a catálogos pequenos/moderados
[ ] Paginação por cursor/keyset
```
