# 06 — Expiração de Chaves (TTL)

> Desde Deno 1.36.2, o KV aceita `expireIn`: um TTL em **milissegundos** após o
> qual a chave pode ser automaticamente deletada. Disponível na CLI e no Deno
> Deploy.

## 1. Uso básico

`expireIn` é uma opção de **escrita**:

```ts
const kv = await getKv();

// `expireIn` = ms até a chave poder ser removida
function addSession(session: Session, expireIn: number) {
  return kv.set(["sessions", session.id], session, { expireIn });
}
```

Também em `set` atômico:

```ts
await kv.atomic()
  .set(["sessions", id], session, { expireIn: 3_600_000 }) // 1h
  .commit();
```

## 2. Expiração atômica de múltiplas chaves

Se várias chaves são gravadas no **mesmo** `atomic()` com o **mesmo**
`expireIn`, a expiração delas é atômica (expiram juntas):

```ts
function addUnverifiedUser(user: User, verificationToken: string, expireIn: number) {
  const kv = getKv();
  return kv.atomic()
    .set(["users", user.id], user, { expireIn })
    .set(["verificationTokens", verificationToken], user.id, { expireIn })
    .commit();
}
```

> Diferentes `expireIn` no mesmo commit expiram de forma independente; apenas o
> mesmo valor compartilha o instante comum.

## 3. Caveats (importante)

- O timestamp é a **hora mais cedo** em que a chave **pode** ser deletada. A
  implementação pode remover depois, **nunca antes**.
- **Não** trate TTL como garantia de segurança. Se a expiração é crítica,
  **também** guarde um campo de expiração no valor e **valide** na leitura:

```ts
interface Sessao {
  id: string;
  usuarioId: string;
  expiraEm: string; // ISO 8601
}

async function obterSessao(id: string): Promise<Sessao | null> {
  const kv = await getKv();
  const { value } = await kv.get<Sessao>(["sessoes", id]);
  if (!value) return null;
  if (Date.parse(value.expiraEm) <= Date.now()) {
    await kv.delete(["sessoes", id]); // limpeza defensiva
    return null;
  }
  return value;
}
```

- A remoção pode ser **lazy**/assíncrona: logo após o vencimento a chave ainda
  pode aparecer por um instante. Sempre valide o campo de expiração.
- `expireIn` é reaplicado a cada `set`; uma atualização sem `expireIn` **remove**
  o TTL (a chave passa a ser permanente).

## 4. Padrões de projeto (MTR/SINIR)

| Uso | Chave | TTL sugerido |
|-----|-------|--------------|
| Sessão de usuário | `["sessao", sessionId]` | 1–8 h |
| Cache de token open-mtr | `["cache", "mtr", "token", sistema]` | < validade do JWT (≈1 h) |
| Cache de tabela de resíduos | `["cache", "tabelas", "residuos"]` | 6–24 h |
| Rate limit | `["ratelimit", ip, janela]` | tamanho da janela (ex.: 60 s) |
| Verificação de e-mail | `["verificacao", token]` | 15–60 min |
| Tema/preferência não-crítica | `["prefs", userId]` | dias |

### Cache com TTL (read-through)

```ts
async function comCache<T>(chave: Deno.KvKey, ttlMs: number, produtor: () => Promise<T>): Promise<T> {
  const kv = await getKv();
  const hit = await kv.get<T>(chave, { consistency: "eventual" });
  if (hit.value !== null) return hit.value;

  const valor = await produtor();
  await kv.set(chave, valor, { expireIn: ttlMs });
  return valor;
}

// uso
const residuos = await comCache(
  ["cache", "tabelas", "residuos"],
  6 * 60 * 60 * 1000,
  () => openMtr.listarResiduos(),
);
```

### Rate limit com TTL

```ts
async function permitir(ip: string, janela: string, limite: number): Promise<boolean> {
  const kv = await getKv();
  const key = ["ratelimit", ip, janela] as const;
  for (let i = 0; i < 5; i++) {
    const atual = await kv.get<Deno.KvU64>(key);
    const nova = (atual.value?.value ?? 0n) + 1n;
    if (nova > BigInt(limite)) return false;
    const res = await kv.atomic()
      .check({ key, versionstamp: atual.versionstamp })
      .set(key, new Deno.KvU64(nova), { expireIn: 60_000 })
      .commit();
    if (res.ok) return true;
  }
  return false;
}
```

## 5. Checklist

```
[ ] TTL em toda chave cache/sessão/rate-limit
[ ] Campo de expiração no valor quando a expiração é crítica
[ ] Validar expiração na leitura (não confiar só no TTL)
[ ] `set` de atualização reaplica `expireIn` se a chave deve continuar efêmera
[ ] Não usar TTL como mecanismo de segurança
```
