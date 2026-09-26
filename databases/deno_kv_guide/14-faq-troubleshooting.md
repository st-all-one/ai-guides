# 14 — FAQ e Troubleshooting

> Erros mais comuns ao usar Deno KV e como corrigir.

## `Deno.openKv is not a function` / "unstable API"

**Causa:** flag instável ausente.

**Correção:** habilite no `deno.json`:

```json
{ "unstable": ["kv"] }
```

ou rode com `deno run --unstable-kv ...`. Com `deno task` o flag vem do
`deno.json`.

## `Deno.openKv` abre o banco errado

**Causa:** sem argumento, o Deno usa um caminho **padrão** associado à origem do
script; rodar de outro contexto/script abre/cria outro arquivo.

**Correção:** centralize no `getKv()` e defina `KV_URL` explicitamente quando
necessário.

## `value` é `null` mas eu escrevi antes

Causas comuns:
- Chave com **tipo** diferente: `"1"` ≠ `1` ≠ `1n`. A chave é comparada por tipo.
- Prefixo/parte diferente: `["mtr", numero]` ≠ `["mtrs", numero]`.
- Leitura **eventual** logo após a escrita: use `"strong"` (default) para
  read-after-write.
- Você deletou por TTL (`expireIn`) ou outro fluxo removeu.

## `atomic().commit()` retorna `{ ok: false }`

**Causa:** controle otimista — um `versionstamp` mudou desde a leitura.

**Correção:** releia e repita (loop com limite). Não ignore `res.ok`.

```ts
for (let i = 0; i < 5; i++) {
  const cur = await kv.get<T>(key);
  const res = await kv.atomic().check({ key, versionstamp: cur.versionstamp })
    .set(key, transform(cur.value)).commit();
  if (res.ok) break;
}
```

## Erro de tamanho: key/value too large

- Chave > **2 KiB** ou valor > **64 KiB**.
- Divida o valor em chunks (`["doc", id, "chunk", 0]`) ou guarde binário grande em
  object storage e referencie.
- Cuidado com overhead de serialização (strings grandes, objetos aninhados).

## Valor não serializa / vira `{}`

**Causa:** instância de classe, função, `Symbol` ou objeto de Web API.

**Correção:** converta para **objeto plano** antes de `set`:

```ts
await kv.set(key, { ...instancia }); // ou mapeie explicitamente
```

## `sum`/`min`/`max` lançam erro

**Causa:** o valor **armazenado** não é `Deno.KvU64`, ou está aninhado dentro de
objeto/array. (Nos atalhos `.sum`/`.min`/`.max` o **operando** é um `bigint`.)

**Correção:** armazene `new Deno.KvU64(n)` como **valor de topo**:

```ts
await kv.atomic().sum(["stats", "x"], 1n).commit(); // atalho: operando bigint
// ou explicitamente:
await kv.atomic()
  .mutate({ type: "sum", key: ["stats", "x"], value: new Deno.KvU64(1n) })
  .commit();
```

## `list` retorna vazio mesmo com chaves

- Prefixo precisa ser de **partes inteiras**: `["f"]` **não** casa
  `["foo","bar"]`.
- Prefixo **não** inclui o match exato: `["mtr"]` não devolve a chave `["mtr"]`.
- Verifique o tipo das partes do prefixo (string vs number).
- O cursor pode estar posicionado além do fim.

## Listagem muito lenta / memoria estourando

**Causa:** `for await` sem `limit` varrendo o keyspace.

**Correção:** pagine com `limit` + `cursor`, hidrate com `getMany` em chunks ≤
10, e use `consistency: "eventual"` quando tolerável.

## `read-modify-write` perde atualizações

**Causa:** `get` + `set` sem `check`.

**Correção:** sempre `atomic().check(entry)` e retry. Para contadores puros, use
`sum` (`Deno.KvU64`).

## Watch não emite nada / emite pouco

- `watch` mantém apenas o **estado mais recente** (conflated): mudanças rápidas
  podem colapsar.
- Máximo de **10 chaves** por watcher.
- Se precisa de cada evento, use log append-only + `list`.

## Fila reentrega a mesma mensagem

**Causa:** comportamento normal (at-least-once). O handler lançou ou demorou.

**Correção:** torne o consumidor **idempotente** (chave de conclusão com TTL +
`jobId`). Veja `08-queue-cron.md`.

## TTL não removeu a chave

**Causa:** TTL é "a partir de quando **pode** ser removida" — a remoção pode ser
posterior. E um `set`/`update` sem `expireIn` removeu o TTL.

**Correção:** se a expiração é crítica, grave `expiraEm` no valor e valide na
leitura. Reaplique `expireIn` em updates de chaves efêmeras.

## `Redis-like` keys não funcionam

KV não tem wildcards/patterns arbitrários. Busca é por **prefixo** ou **range**.
Para outros acessos, crie índice secundário (`05`).

## Importei KV no island e quebrou

**Causa:** `Deno.Kv` não existe no browser; o módulo lança `"Deno KV é
server-only"`.

**Correção:** islands só recebem primitivos via props e buscam dados por
endpoint (`/api/...`). Nunca importe `utils/kv.ts` no client.

## Testes interferem entre si / tocam produção

**Causa:** uso do banco local compartilhado.

**Correção:** use `Deno.openKv(":memory:")`; em testes do singleton, defina
`KV_URL=":memory:"` e chame `closeKv()` no setup/teardown.

## `AddrInUse` ao subir o servidor

Não é problema de KV, mas de Fresh: **nunca** chame `app.listen()` junto de
`deno task dev`/`deno task start` (só sob `import.meta.main`). Veja
`fresh_guide`.

## Diagnóstico rápido

```bash
deno check          # tipos (Deno.Kv global disponível com unstable)
deno lint
deno test -A        # KV :memory:
deno task check     # gate completo
```

| Sintoma | Provável causa |
|---------|----------------|
| `openKv is not a function` | flag `unstable` ausente |
| `ok: false` | conflito OCC → retry |
| `value null` após escrita | tipo de chave / consistência eventual / TTL |
| valor `{}` | classe não serializável |
| erro em `sum` | valor não é `Deno.KvU64` |
| list vazio | prefixo parcial / tipo / cursor |
| lento | full scan sem limit |
| island quebra | import de KV no client |
