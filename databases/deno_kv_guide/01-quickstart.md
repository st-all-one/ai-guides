# 01 — Quick Start

> Primeiros passos: habilitar, abrir/fechar, gravar, ler, listar, deletar,
> testar e ir para produção. Tudo com foco no `getKv()` do projeto.

## 1. Habilitar

`Deno.Kv` é **instável**. Habilite uma única vez no `deno.json` (dispensa
`--unstable-kv` na CLI):

```json
{
  "unstable": ["kv"]
}
```

Sem isso, `Deno.openKv` lança erro de "unstable API". Com `deno task dev` /
`deno test` o flag é herdado do `deno.json`.

## 2. Abrir e fechar

`Deno.openKv(path?)` devolve `Promise<Deno.Kv>`:

```ts
const kv = await Deno.openKv();          // local: SQLite (caminho padrão)
kv.close();                              // libera recursos
```

- Sem argumento, o Deno usa um caminho **padrão persistente**, associado à
  origem do script (não necessariamente a pasta atual).
- Com string, aponta o arquivo: `Deno.openKv("/tmp/app.db")`.
- `":memory:"` → banco **efêmero** (perfeito para testes, seção 5).
- `Kv` implementa `Disposable`: `using kv = await Deno.openKv()` fecha no escopo.

No projeto, **nunca** chame `Deno.openKv()` direto no handler. Use o singleton
`getKv()` (`10-fresh-integration.md`):

```ts
// utils/kv.ts
import { IS_BROWSER } from "fresh/runtime";

let promise: Promise<Deno.Kv> | null = null;

export function getKv(): Promise<Deno.Kv> {
  if (IS_BROWSER) throw new Error("Deno KV é server-only");
  promise ??= Deno.openKv(Deno.env.get("KV_URL") ?? undefined);
  return promise;
}
```

## 3. Criar / atualizar / ler um par chave-valor

Chaves são **arrays** de `string | number | bigint | boolean | Uint8Array`.
Valores são objetos JavaScript _structured-clone_:

```ts
import { getKv } from "@/utils/kv.ts";

const kv = await getKv();

const prefs = { username: "ada", theme: "dark", language: "en-US" };

await kv.set(["preferences", "ada"], prefs);

const entry = await kv.get(["preferences", "ada"]);
console.log(entry.key);          // ["preferences", "ada"]
console.log(entry.value);        // { username: "ada", ... }
console.log(entry.versionstamp); // "00000000000000010000" | null
```

- `set` cria **ou** sobrescreve. Toda escrita muda o `versionstamp`.
- `get` de chave inexistente → `{ value: null, versionstamp: null }`.

## 4. Ler vários, listar e deletar

### `getMany` — N chaves de uma vez (snapshot consistente, máx. 10)

```ts
const result = await kv.getMany([
  ["preferences", "ada"],
  ["preferences", "grace"],
]);
// result[0].value → objeto | null
// result[1].value → null (não existe)
```

`getMany` retorna na **mesma ordem** das chaves. Valores/versionstamps podem ser
`null`.

### `list` — por prefixo ou range

```ts
for await (const entry of kv.list({ prefix: ["preferences"] })) {
  console.log(entry.key, entry.value, entry.versionstamp);
}
```

- Ordenado lexicograficamente pela parte seguinte ao prefixo.
- `{ prefix: ["preferences"] }` casa `["preferences", "ada"]` mas **não**
  `["preferences"]` (o prefixo não é inclusivo do match exato).
- Prefixo deve ser de partes **inteiras**: `["f"]` **não** casa `["foo","bar"]`.

Com limites e ranges:

```ts
// primeiros 2
for await (const e of kv.list({ prefix: ["preferences"] }, { limit: 2 })) { /* ... */ }

// a partir de "taylor" (inclusive)
kv.list({ prefix: ["users"], start: ["users", "taylor"] });

// antes de "taylor" (exclusive)
kv.list({ prefix: ["users"], end: ["users", "taylor"] });

// range puro entre "a" e "n"
kv.list({ start: ["users", "a"], end: ["users", "n"] });
```

Detalhes de `cursor`, `reverse`, `batchSize` e consistência em `03-operations.md`.

### `delete`

```ts
await kv.delete(["preferences", "alan"]); // no-op se não existir
```

## 5. Consistência de leitura

| Modo | Garantia | Uso |
|------|----------|-----|
| `"strong"` (default) | retorna o último valor escrito | leitura de negócio/validação |
| `"eventual"` | pode retornar valor defasado; mais rápida/barata | listagens, cache, relatórios |

```ts
const r = await kv.get(["config"], { consistency: "eventual" });
```

**Escritas são sempre strong.** `getMany`/`list` fazem _snapshot read_ dentro de
cada lote (valores coerentes entre si), mas entre lotes de `list` não há
consistência global.

## 6. Transação atômica (primeiro contato)

Só cria se ainda não existir:

```ts
const key = ["preferences", "alan"];
const value = { username: "alan", theme: "light", language: "en-GB" };

const res = await kv.atomic()
  .check({ key, versionstamp: null }) // null = "não pode existir"
  .set(key, value)
  .commit();

if (res.ok) console.log("inserido!");
else console.error("já existia");
```

`commit()` retorna `{ ok: true, versionstamp }` ou `{ ok: false }`. Aprofunde em
`04-transactions.md`.

## 7. Testes com banco efêmero

Use `":memory:"` para um KV descartável por teste (nunca toque o KV real):

```ts
import { assertEquals } from "jsr:@std/assert";

Deno.test("preferências", async (t) => {
  const kv = await Deno.openKv(":memory:");

  await t.step("salva e lê displayname", async () => {
    await kv.set(["preferences", "example", "displayname"], "Exemplary User");
    const r = await kv.get(["preferences", "example", "displayname"]);
    assertEquals(r.value, "Exemplary User");
  });

  kv.close();
});
```

Vários stores `":memory:"` coexistem sem interferência. Em testes de rota,
passe o KV de memória ao handler (detalhes em `11-testing.md`).

## 8. Produção

- **Deno Deploy**: `Deno.openKv()` sem argumento usa o KV gerenciado
  (FoundationDB) automaticamente.
- **Fora do Deploy**: aponte `KV_URL` para a URL remota do KV e use
  `Deno.openKv(Deno.env.get("KV_URL"))` — exatamente o que `getKv()` já faz.
- Local de desenvolvimento: SQLite em disco. Não é o mesmo back-end de produção;
  evite depender de comportamentos específicos de SQLite.

Detalhes, limites e backup em `12-production-deploy.md`.

## 9. Próximos passos

1. `02-keyspace.md` — modele chaves e entenda `KvU64`/versionstamp.
2. `03-operations.md` — domine `list` (cursor, reverse, batch).
3. `04-transactions.md` — OCC, `check`, `sum`/`min`/`max`.
4. `10-fresh-integration.md` — ligue o KV ao Fresh sem vazar para o cliente.
