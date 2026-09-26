# 03 — Operações

> Duas operações de **leitura** (`get`, `list`) e três de **escrita** (`set`,
> `delete`, mutações atômicas via `sum`/`min`/`max`). Leituras: strong (default)
> ou eventual. Escritas: **sempre strong**.

Assinaturas de referência:

```ts
kv.get<T>(key, options?)                          // Promise<KvEntryMaybe<T>>
kv.getMany<T extends readonly unknown[]>(keys, options?) // Promise<KvEntryMaybe<T[K]>[]>
kv.list<T>(selector, options?)                    // KvListIterator<T>
kv.set(key, value, options?)                      // Promise<KvCommitResult>
kv.delete(key)                                    // Promise<void>
kv.atomic()                                       // AtomicOperation
```

## 1. `get` — ler uma chave

Retorna `{ key, value, versionstamp }`; se não existir, `value`/`versionstamp`
são `null`:

```ts
const res = await kv.get<string>(["config"]);
// { key: ["config"], value: "value", versionstamp: "000002fa526aaccb0000" }
// ou { key: ["config"], value: null, versionstamp: null }

const res2 = await kv.get<string>(["config"], { consistency: "eventual" });
```

`get` (e `getMany`) é sempre um **snapshot read** — consistente entre as chaves
retornadas.

**Projeto:**

```ts
const kv = await getKv();
const { value } = await kv.get<Mtr>(["mtr", numero]);
if (value === null) throw new HttpError(404, "MTR não encontrado");
```

## 2. `getMany` — ler N chaves (máx. 10)

Recebe um array de chaves e retorna um array de `KvEntryMaybe` na **mesma
ordem**. Snapshot consistente entre todas:

```ts
const [res1, res2, res3] = await kv.getMany<[string, string, string]>([
  ["users", "sam"],
  ["users", "taylor"],
  ["users", "alex"],
]);
// res1.value === "sam" (ou null se não existir)
```

**Projeto — hidratar índice não-único sem N+1 sequencial:**

```ts
const ids = ["PE-0001", "PE-0002", "PE-0003"];
const entries = await kv.getMany<Mtr[]>(
  ids.map((id) => ["mtr", id] as const),
);
const mtrs = entries.map((e) => e.value).filter((v): v is Mtr => v !== null);
```

> Limite: **10 chaves** por `getMany`. Para lotes maiores, divida em chunks.

## 3. `list` — por prefixo ou range

Retorna um **`Deno.KvListIterator`** (async iterável) de `KvEntry`:

```ts
const iter = kv.list<string>({ prefix: ["users"] });
for await (const res of iter) {
  res.key;          // ["users", "alex"]
  res.value;        // "alex"
  res.versionstamp; // "00a44a3c3e53b9750000"
}
```

### Seletores

| Seletor | Casa | Observação |
|---------|------|------------|
| `{ prefix: ["users"] }` | todas as chaves que começam com `["users", ...]` | prefixo deve ter partes inteiras; não inclui o match exato |
| `{ prefix, start }` | prefixo **e** `>= start` | `start` é **inclusive** |
| `{ prefix, end }` | prefixo **e** `< end` | `end` é **exclusive** |
| `{ start, end }` | range lexicográfico puro | ambos podem vir sem prefixo |

```ts
// a partir de "taylor"
kv.list({ prefix: ["users"], start: ["users", "taylor"] });

// antes de "taylor"
kv.list({ prefix: ["users"], end: ["users", "taylor"] });

// entre "a" e "n"
kv.list({ start: ["users", "a"], end: ["users", "n"] });
```

### Opções

```ts
interface KvListOptions {
  limit?: number;        // nº máx. de chaves
  cursor?: string;       // retomar de onde parou
  batchSize?: number;    // default = limit (ou 100); máx. 500, clamped
  consistency?: "strong" | "eventual";
  reverse?: boolean;     // ordem lexicográfica decrescente
}
```

> **Nota:** a referência da API do Deno 2.x define `batchSize` máximo em **500**
> (valores maiores são truncados) e default igual ao `limit` (ou 100). Alguns
> trechos do manual citam 1000, comportamento de versões anteriores; use ≤ 500.

```ts
// primeiros 2
for await (const r of kv.list({ prefix: ["users"] }, { limit: 2 })) { /* ... */ }

// invertido, terminando em "sam"
const iter = kv.list<string>(
  { prefix: ["users"], start: ["users", "sam"] },
  { reverse: true },
);
// 1º "taylor", 2º "sam"
```

> **Atenção (reverse):** `start`/`end` são **sempre interpretados em ordem
> ascendente**, mesmo com `reverse: true`. No exemplo, `start = ["users","sam"]`
> e o primeiro item devolvido é `"taylor"`.

### Paginação com `cursor`

O iterator expõe `.cursor` (string) após consumir um lote. Passe-o de volta em
`{ cursor }` para retomar:

```ts
const pagina = async (cursor?: string) => {
  const kv = await getKv();
  const itens: Mtr[] = [];
  const iter = kv.list<Mtr>({ prefix: ["mtr"] }, { limit: 50, cursor });
  for await (const e of iter) itens.push(e.value);
  return { itens, next: iter.cursor }; // cursor é do iterator, não da entry
};
```

> **SEMPRE** use `limit` em listagens expostas ao usuário. Sem limite, o
> iterator pode percorrer o keyspace inteiro.

### Consistência por lote

`list` lê em **lotes**. Cada lote é um snapshot consistente; **entre** lotes não
há consistência global. O tamanho do lote é `batchSize` (**default** = `limit`,
ou **100** se `limit` não for informado; **máximo 500** — valores maiores são
truncados). Use `consistency: "eventual"` para listagens tolerantes a defasagem.

## 4. `set` — criar/sobrescrever

```ts
const res = await kv.set(["users", "alex"], "alex");
res.versionstamp; // "00a44a3c3e53b9750000"
```

Sempre strong. Opções:

```ts
kv.set(key, value, { expireIn: 60_000 }); // TTL de 60s (ver 06)
```

## 5. `delete` — remover

```ts
await kv.delete(["users", "alex"]); // no-op se não existir
```

Sempre strong. Para "deletar se a versão conferir", use
`kv.atomic().check(entry).delete(key).commit()` (`04`).

## 6. Mutações atômicas (`sum`/`min`/`max`)

**Só** existem dentro de `kv.atomic()`, sobre valores `Deno.KvU64` (ver `04` e
`02`):

```ts
await kv.atomic()
  .mutate({ type: "sum", key: ["accounts", "alex"], value: new Deno.KvU64(100n) })
  .commit();
```

Há atalhos: `.sum(key, 100n)`, `.min(key, 100n)`, `.max(key, 100n)`.

## 7. Consistência — resumo

| Operação | Modos | Default |
|----------|-------|---------|
| `get` / `getMany` | strong, eventual | strong |
| `list` (por lote) | strong, eventual | strong |
| `set` / `delete` / atomic | **strong** | — |

- **Strong**: garante o último valor escrito. Mais caro. Use em decisões de
  negócio, validação e leitura após escrita.
- **Eventual**: pode vir defasado, mais rápido/barato. Use em relatórios,
  listagens e cache.

## 8. Erros e valores ausentes

- `get` de chave inexistente **não lança** — devolve `value: null`.
- `getMany` pode misturar existentes e `null`.
- `list` de prefixo vazio devolve iterator vazio (não lança).
- Chave/valor acima do limite → exceção na escrita (`12-production-deploy.md`).
- `atomic().commit()` retorna `{ ok: false }` em conflito **sem** lançar — trate
  com retry (`04`).

## 9. Receita: busca por prefixo + dedup

```ts
async function listarMtrsPorStatus(status: string): Promise<Mtr[]> {
  const kv = await getKv();
  const ids: string[] = [];
  for await (const { value } of kv.list<string>({
    prefix: ["mtr_por_status", status],
  }, { limit: 200, consistency: "eventual" })) {
    ids.push(value);
  }
  const entries = await kv.getMany<Mtr[]>(ids.map((id) => ["mtr", id] as const));
  return entries.map((e) => e.value).filter((v): v is Mtr => v !== null);
}
```
