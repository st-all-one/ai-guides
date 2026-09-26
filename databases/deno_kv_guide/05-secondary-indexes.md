# 05 — Índices Secundários

> KV só busca por chave. Para consultar por **atributo** (status, e-mail, cor,
> CNPJ), mantenha uma segunda chave que aponta para a chave primária. Melhor
> prática: guardar o **ponteiro** (chave primária), não uma cópia do valor.

## 1. Por que ponteiro (e não cópia)

| Ponteiro (recomendado) | Cópia do valor |
|------------------------|----------------|
| Menos storage e write amplification | Duplica dados |
| Menos atualizações quando campos não-indexados mudam | Precisa sincronizar tudo |
| Atualização transacional clara | Mais chance de divergência |

**Custo:** leitura dupla (`índice → primário`). Vale a pena na maioria dos casos.

Regra de ouro: **SEMPRE** atualize primário e índice na **mesma** transação
atômica. Se o valor do índice muda (ex.: e-mail), delete o índice antigo e crie
o novo no mesmo commit.

## 2. Índice único (um-para-um)

Cada chave do índice aponta para **exatamente um** primário. Use para buscar por
atributo único (e-mail, CNPJ) e para **impor unicidade**.

```ts
interface User {
  id: string;
  name: string;
  email: string;
}

async function insertUser(user: User) {
  const kv = await getKv();
  const primaryKey = ["users", user.id] as const;
  const byEmailKey = ["users_by_email", user.email.toLowerCase()] as const;

  const res = await kv.atomic()
    .check({ key: primaryKey, versionstamp: null })
    .check({ key: byEmailKey, versionstamp: null })
    .set(primaryKey, user)
    .set(byEmailKey, user.id) // ponteiro, não o usuário inteiro
    .commit();

  if (!res.ok) throw new TypeError("User with ID or email already exists");
}
```

Leitura por ID (primário) e por e-mail (dupla):

```ts
async function getUser(id: string): Promise<User | null> {
  const kv = await getKv();
  return (await kv.get<User>(["users", id])).value;
}

async function getUserByEmail(email: string): Promise<User | null> {
  const kv = await getKv();
  const idRes = await kv.get<string>(["users_by_email", email.toLowerCase()]);
  if (!idRes.value) return null;
  return (await kv.get<User>(["users", idRes.value])).value;
}
```

Deleção com retry (remove primário **e** índice; e-mail pode ter mudado):

```ts
async function deleteUser(id: string) {
  const kv = await getKv();
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const cur = await kv.get<User>(["users", id]);
    if (cur.value === null) return;
    const res = await kv.atomic()
      .check(cur)
      .delete(["users", id])
      .delete(["users_by_email", cur.value.email.toLowerCase()])
      .commit();
    if (res.ok) return;
  }
  throw new Error("conflito persistente ao deletar usuário");
}
```

> O `check(cur)` evita corrida: se o e-mail mudou entre leitura e delete, o
> índice antigo não seria o correto. O loop relê e tenta de novo.

## 3. Índice não-único (um-para-muitos)

Vários primários compartilham o mesmo valor indexado. O índice inclui o **ID do
primário** na chave para evitar colisão:

```ts
interface User {
  id: string;
  name: string;
  favoriteColor: string;
}

async function insertUser(user: User) {
  const kv = await getKv();
  const primaryKey = ["users", user.id] as const;
  const byColorKey = ["users_by_favorite_color", user.favoriteColor, user.id] as const;

  const res = await kv.atomic()
    .check({ key: primaryKey, versionstamp: null })
    .set(primaryKey, user)
    .set(byColorKey, user.id) // ponteiro
    .commit();
  if (!res.ok) throw new TypeError("User already exists");
}

async function getUsersByFavoriteColor(color: string): Promise<User[]> {
  const kv = await getKv();
  const ids: string[] = [];
  for await (const { value: id } of kv.list<string>({
    prefix: ["users_by_favorite_color", color],
  })) {
    ids.push(id);
  }
  if (ids.length === 0) return [];
  const results = await kv.getMany<User>(ids.map((id) => ["users", id] as const));
  return results.map((r) => r.value).filter((v): v is User => v !== null);
}
```

> `list` tem `batchSize` default = `limit` (ou 100) e **máximo 500**; para listas
> grandes pagine com `cursor` (`03`) e hidrate em chunks de 10 (`getMany`).

## 4. Mapeamento para o domínio MTR

| Consulta | Chave primária | Índice | Valor do índice |
|----------|----------------|--------|-----------------|
| MTR por número | `["mtr", numero]` | — | objeto MTR |
| MTRs por status | `["mtr", numero]` | `["mtr_por_status", status, numero]` | `numero` |
| MTRs por gerador | `["mtr", numero]` | `["mtr_por_gerador", gerador, numero]` | `numero` |
| MTRs por período | `["mtr", numero]` | `["mtr_por_data", "2026-09", numero]` | `numero` |
| MTR por chave de acesso | `["mtr", numero]` | `["mtr_por_chave", chave]` (único) | `numero` |

Exemplo de criação atômica de MTR + índice de status + índice de gerador:

```ts
async function criarIndicesMtr(m: Mtr): Promise<void> {
  const kv = await getKv();
  const res = await kv.atomic()
    .check({ key: ["mtr", m.numero], versionstamp: null })
    .set(["mtr", m.numero], { v: 1, ...m })
    .set(["mtr_por_status", m.status, m.numero], m.numero)
    .set(["mtr_por_gerador", m.gerador, m.numero], m.numero)
    .commit();
  if (!res.ok) throw new Error("MTR já existe");
}
```

Atualização que move o índice de status (atômica):

```ts
async function atualizarStatusMtr(numero: string, de: string, para: string) {
  const kv = await getKv();
  for (let i = 0; i < 5; i++) {
    const cur = await kv.get<Mtr>(["mtr", numero]);
    if (!cur.value) throw new Error("não encontrado");
    const res = await kv.atomic()
      .check(cur)
      .set(["mtr", numero], { ...cur.value, status: para })
      .delete(["mtr_por_status", de, numero])
      .set(["mtr_por_status", para, numero], numero)
      .commit();
    if (res.ok) return;
  }
  throw new Error("conflito ao atualizar status");
}
```

## 5. Estrutura de chave do índice

- **Único**: `[nome_índice, valor_indexado] → chave_primária`
- **Não-único**: `[nome_índice, valor_indexado, chave_primária] → chave_primária`
  (a terceira parte garante unicidade e ordem estável)
- **Range por tempo**: `[nome_índice, YYYY-MM, chave_primária]` permite `list`
  com `start`/`end` para um mês/intervalo.

## 6. Migração de índice com valor duplicado → ponteiro

1. **Backfill:** varra as chaves primárias e sobrescreva o valor do índice com a
   chave primária (ex.: `numero`).
2. **Cutover:** passe os caminhos de escrita a manter o índice-ponteiro; mantenha
   o índice antigo para leitura por um tempo.
3. **Cleanup:** troque os leitores para o índice-ponteiro e remova as entradas
   duplicadas.

```ts
// Backfill (idempotente): roda uma vez, em lotes
async function backfillIndicePonteiro() {
  const kv = await getKv();
  for await (const e of kv.list<Mtr>({ prefix: ["mtr"] })) {
    await kv.set(["mtr_por_status", e.value.status, e.value.numero], e.value.numero);
  }
}
```

## 7. Checklist

```
[ ] Índice guarda ponteiro, não cópia
[ ] Primário + índice escritos na MESMA transação
[ ] Índice não-único tem a chave primária como última parte
[ ] Mudança de atributo indexado: delete índice antigo + set novo (atômico)
[ ] Delete faz check(cur) para evitar corrida com update
[ ] Leitura por índice usa getMany em chunks ≤ 10
[ ] Índices temporais usam prefixo ordenável (YYYY-MM, ULID)
```
