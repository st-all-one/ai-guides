# 04 — Transações (OCC) e Operações Atômicas

> Deno KV usa **controle de concorrência otimista (OCC)**, não transações
> interativas com locks. Você lê valores+versionstamps, calcula e tenta
> `commit()`; se algum `versionstamp` mudou, o commit falha (`{ ok: false }`) e
> você **repete**.

## 1. Como funciona

1. Leia as chaves e guarde os `versionstamp`s (`get`/`getMany`).
2. Monte a operação atômica com **checks** (pré-condições) + **mutações**.
3. `commit()` aplica tudo **de uma vez** só se todos os checks passarem.
4. Se falhar (outro agente alterou uma chave entre a leitura e o commit),
   **reexecute** o ciclo.

Como não há locks, transações longas/contínuas não travam o banco — mas podem
sofrer mais retries. Mantenha o corpo curto.

## 2. Anatomia de uma operação atômica

```ts
const res = await kv.atomic()
  .check(entryA)                    // pré-condição: versionstamp atual de A
  .check({ key, versionstamp: null }) // pré-condição: NÃO existir
  .set(keyB, valorB)
  .delete(keyC)
  .sum(keyD, 1n)                    // mutações
  .commit();                        // { ok: true, versionstamp } | { ok: false }
```

### Checks

| Forma | Significado |
|-------|-------------|
| `.check(entry)` | a chave deve ter **exatamente** aquele `versionstamp` |
| `.check({ key, versionstamp })` | idem, explícito |
| `.check({ key, versionstamp: null })` | a chave **não pode existir** |
| `.check(checkA, checkB)` | múltiplos pares (variádico) |

Passar o `KvEntry` lido diretamente é o padrão: o `versionstamp` "gruda" no
check.

### Mutações

| Método | Efeito |
|--------|--------|
| `.set(key, value, { expireIn? })` | cria/sobrescreve |
| `.delete(key)` | remove (no-op se não existir) |
| `.sum(key, bigint)` | soma atômica (wrap 2^64) |
| `.min(key, bigint)` | mínimo atômico |
| `.max(key, bigint)` | máximo atômico |
| `.mutate({ type, key, value })` | forma genérica de `sum`/`min`/`max` |

`commit()` retorna `Deno.KvCommitResult` (`{ ok: true, versionstamp }`) ou
`Deno.KvCommitError` (`{ ok: false }`). **Nunca lança** por violação de check.

## 3. Padrão obrigatório: retry de OCC

**SEMPRE** encapsule read-modify-write em loop com limite de tentativas:

```ts
async function incrementarVisitas(numero: string): Promise<void> {
  const kv = await getKv();
  const key = ["mtr", numero, "visitas"] as const;

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const atual = await kv.get<Deno.KvU64>(key);
    const res = await kv.atomic()
      .check({ key, versionstamp: atual.versionstamp })
      .sum(key, 1n)
      .commit();
    if (res.ok) return;
  }
  throw new Error("conflito persistente ao incrementar visitas");
}
```

- **SEMPRE** limite de tentativas + erro claro. **NUNCA** loop infinito.
- `sum`/`min`/`max` são aplicados de forma **atômica no servidor**: para um
  contador puro, `.sum(key, 1n)` sem `check` já evita atualizações perdidas. O
  `check` (com o versionstamp lido) é necessário quando a decisão **depende do
  valor lido** (ex.: validar saldo antes de gravar).
- Se você inclui `check`, releia a cada tentativa: o versionstamp pode ter
  mudado desde a leitura anterior.

## 4. Exemplo completo: `transferFunds`

Ledger em `["account", <id>] → number`. Lê os dois saldos, valida e grava com
check nos dois versionstamps, repetindo até dar certo:

```ts
async function transferFunds(sender: string, receiver: string, amount: number) {
  if (amount <= 0) throw new Error("Amount must be positive");

  const kv = await getKv();
  const senderKey = ["account", sender] as const;
  const receiverKey = ["account", receiver] as const;

  let res: { ok: boolean } = { ok: false };
  for (let tentativa = 0; tentativa < 5 && !res.ok; tentativa++) {
    const [senderRes, receiverRes] = await kv.getMany<[number, number]>([
      senderKey,
      receiverKey,
    ]);
    if (senderRes.value === null) throw new Error(`Account ${sender} not found`);
    if (receiverRes.value === null) throw new Error(`Account ${receiver} not found`);
    if (senderRes.value < amount) {
      throw new Error(`Insufficient funds to transfer ${amount} from ${sender}`);
    }

    res = await kv.atomic()
      .check(senderRes)                        // saldo do sender não mudou
      .check(receiverRes)                      // saldo do receiver não mudou
      .set(senderKey, senderRes.value - amount)
      .set(receiverKey, receiverRes.value + amount)
      .commit();
  }
  if (!res.ok) throw new Error("conflito persistente na transferência");
}
```

> **Projeto:** use o mesmo esqueleto para qualquer par de chaves que precisa
> mudar em conjunto — ex.: `["mtr", numero]` + `["mtr_por_status", status,
> numero]` — garantindo que índice e primário nunca divirjam (`05`).

## 5. Criar apenas se não existir (idempotência)

`versionstamp: null` significa "não pode existir":

```ts
async function criarMtr(mtr: Mtr): Promise<void> {
  const kv = await getKv();
  const res = await kv.atomic()
    .check({ key: ["mtr", mtr.numero], versionstamp: null })
    .set(["mtr", mtr.numero], { v: 1, ...mtr })
    .commit();
  if (!res.ok) throw new Error("MTR já existe");
}
```

## 6. `sum` / `min` / `max`

- Operam **somente** sobre valores armazenados `Deno.KvU64` (de topo, ver `02`);
  nos atalhos `.sum`/`.min`/`.max` o **operando** é um `bigint`.
- Se a chave não existe, é criada com o operando.
- `sum` dá **wrap** em 2^64: `(2^64 - 1) + 1n === 0n`.
- `min`/`max` comparam o valor atual com o operando.

```ts
// contador
await kv.atomic().sum(["stats", "visitas"], 1n).commit();

// maior latência já vista
await kv.atomic()
  .max(["stats", "latencia_max_ms"], 1234n)
  .commit();
```

> Em TS, o tipo do `value` lido é `Deno.KvU64`; use `.value` (bigint) para ler.
> Converta para `Number` só na borda de apresentação e cuide da precisão > 2^53.

## 7. Isolamento e limites (oficial)

Um `commit` é atômico e isolado. Limites:

| Limite | Valor |
|--------|-------|
| Tamanho máx. de chave | **2 KiB** |
| Tamanho máx. de valor | **64 KiB** |
| Chaves por `kv.getMany()` | **10** |
| Batch máx. por `kv.list()` | **500** (default = `limit` ou 100) |
| Checks por operação atômica | **100** |
| Mutações por operação atômica | **1000** |
| Tamanho total da operação atômica | **800 KiB** (checks + mutações + overhead) |
| Tamanho total das chaves da operação | **90 KiB** |
| Chaves observadas por `kv.watch()` | **10** |

Distribua um lote grande em várias transações pequenas e idempotentes.

## 8. Anti-padrões

| NUNCA | Por quê |
|-------|---------|
| Ler e `set` sem `check` | perde atualizações concorrentes (last-write-wins) |
| Ignorar `res.ok` | estado inconsistente silencioso |
| Loop de retry sem limite | pode girar para sempre |
| Transação longa fazendo I/O externo entre check e commit | muitos retries |
| Usar `sum` em valor que não é `Deno.KvU64` | erro de tipo na escrita |
| Confiar em `versionstamp` como timestamp real | é ordem lógica, não relógio |

## 9. Receita: transição de status MTR + índice (atômica)

```ts
async function mudarStatus(numero: string, de: string, para: string) {
  const kv = await getKv();
  for (let i = 0; i < 5; i++) {
    const cur = await kv.get<Mtr>(["mtr", numero]);
    if (!cur.value) throw new Error("MTR não encontrado");
    if (cur.value.status !== de) throw new Error("status divergente");

    const res = await kv.atomic()
      .check(cur)
      .set(["mtr", numero], { ...cur.value, status: para })
      .delete(["mtr_por_status", de, numero])
      .set(["mtr_por_status", para, numero], numero)
      .commit();
    if (res.ok) return;
  }
  throw new Error("conflito persistente ao mudar status");
}
```
