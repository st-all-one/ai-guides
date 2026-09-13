# Deno KV — Guia de Implementação (Otimizado para IA)

> Banco **chave-valor** embutido no runtime Deno (`Deno.Kv`). Chaves são
> **arrays hierárquicos**; valores são objetos _structured-clone_. Sem servidor,
> sem schema, sem SQL. Local = SQLite; produção (Deno Deploy) = FoundationDB.
> Versão de referência: **Deno 2.9.6** (`--unstable-kv` / `deno.json » unstable`).
> Objetivo: guia denso de **COMO fazer**, cobrindo toda a doc oficial.

## Exemplo canônico (ponto de partida na raiz do projeto)

Todos os tópicos deste guia evoluem a partir do uso real no projeto
`mtr-site-atr` (Fresh 2.x + Deno KV). Estrutura mínima:

```
mtr-site-atr/
├── utils/
│   ├── kv.ts          # getKv(): singleton server-only (SEMPRE abrir uma vez)
│   ├── define.ts      # createDefine<State>() (ctx.state tipado)
│   └── mtr.ts         # repositório de domínio sobre KV (chaves namespaced)
├── routes/
│   ├── mtr/[numero].tsx   # handler lê do KV → page() → SSR
│   └── api/mtr.ts         # endpoint JSON
├── main.ts            # App + fsRoutes
└── deno.json          # "unstable": ["kv"]
```

`utils/kv.ts` — **o único lugar** que chama `Deno.openKv()`. Server-only:

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

`utils/mtr.ts` — repositório de domínio (chave **namespaced** + índice secundário):

```ts
// utils/mtr.ts
import { getKv } from "@/utils/kv.ts";

export interface Mtr {
  numero: string;
  status: "rascunho" | "emitido" | "recebido" | "cancelado";
  gerador: string;
  transportador: string;
  destinador: string;
  residuos: Array<{ classe: string; quantidade: number; unidade: "kg" | "t" }>;
  atualizadoEm: string; // ISO 8601
}

const key = (numero: string) => ["mtr", numero] as const;

export async function salvarMtr(mtr: Mtr): Promise<void> {
  const kv = await getKv();
  const res = await kv.atomic()
    .check({ key: key(mtr.numero), versionstamp: null }) // cria só se não existir
    .set(key(mtr.numero), { v: 1, ...mtr })
    .set(["mtr_por_status", mtr.status, mtr.numero], mtr.numero)
    .commit();
  if (!res.ok) throw new Error(`MTR ${mtr.numero} já existe`);
}

export async function obterMtr(numero: string): Promise<Mtr | null> {
  const kv = await getKv();
  const { value } = await kv.get<Mtr & { v: number }>(key(numero));
  return value;
}

export async function listarMtrsPorStatus(status: Mtr["status"]): Promise<Mtr[]> {
  const kv = await getKv();
  const ids: string[] = [];
  for await (const { value: numero } of kv.list<string>({
    prefix: ["mtr_por_status", status],
  }, { limit: 100 })) { // 100 primeiros; pagine com `cursor` para além disso
    ids.push(numero);
  }
  const out: Mtr[] = [];
  for (let i = 0; i < ids.length; i += 10) { // getMany aceita ≤ 10
    const entries = await kv.getMany<Mtr[]>(ids.slice(i, i + 10).map(key));
    for (const e of entries) if (e.value) out.push(e.value);
  }
  return out;
}
```

`routes/mtr/[numero].tsx` — handler tipo-seguro + SSR (detalhe em `10`):

```tsx
import { HttpError, page } from "fresh";
import { define } from "@/utils/define.ts";
import { obterMtr } from "@/utils/mtr.ts";

interface Data { mtr: { numero: string; status: string; qtd: number } }

export const handler = define.handlers({
  async GET(ctx) {
    const mtr = await obterMtr(ctx.params.numero ?? "");
    if (!mtr) throw new HttpError(404, "MTR não encontrado");
    return page<Data>({ mtr: { numero: mtr.numero, status: mtr.status, qtd: mtr.residuos.length } });
  },
});

export default define.page<typeof handler>(({ data }) => (
  <h1>MTR {data.mtr.numero}</h1>
));
```

Esse exemplo é a base de **todos** os tópicos. As seções seguintes só adicionam
modelagem de chave, operações, transações, índices, TTL, filas e integração.

## Navegação

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [01-quickstart.md](./01-quickstart.md) | Habilitar, abrir/fechar, CRUD, `:memory:`, produção |
| 02 | [02-keyspace.md](./02-keyspace.md) | Chaves, partes, ordenação, valores, `KvU64`, versionstamp, ULID |
| 03 | [03-operations.md](./03-operations.md) | `get`, `getMany`, `list`, `set`, `delete`, consistência |
| 04 | [04-transactions.md](./04-transactions.md) | OCC, `atomic()`, `check`, mutações, retry, limites |
| 05 | [05-secondary-indexes.md](./05-secondary-indexes.md) | Índices únicos, não-únicos, ponteiro, migração |
| 06 | [06-expiration-ttl.md](./06-expiration-ttl.md) | `expireIn`, expiração atômica, caveats |
| 07 | [07-modeling-typescript.md](./07-modeling-typescript.md) | Interfaces, genéricos, service layer, DTOs |
| 08 | [08-queue-cron.md](./08-queue-cron.md) | `enqueue`, `listenQueue`, DLQ, `Deno.cron` |
| 09 | [09-watch-realtime.md](./09-watch-realtime.md) | `watch`, streams, WebSocket/SSE |
| 10 | [10-fresh-integration.md](./10-fresh-integration.md) | `getKv`, handlers, `page()`, middleware, islands |
| 11 | [11-testing.md](./11-testing.md) | `Deno.openKv(":memory:")`, `app.handler()` |
| 12 | [12-production-deploy.md](./12-production-deploy.md) | Deno Deploy, FoundationDB, `KV_URL`, limites |
| 13 | [13-cheatsheet.md](./13-cheatsheet.md) | Referência rápida de toda a API |
| 14 | [14-faq-troubleshooting.md](./14-faq-troubleshooting.md) | Erros comuns e correções |
| 15 | [15-padroes-avancados.md](./15-padroes-avancados.md) | Rate limit, sessão, cache, contadores, paginação |

## Modelo mental (leia antes de codar)

1. **KV é um mapa, não um banco relacional.** Não há joins, `WHERE`, índices
   automáticos nem transações interativas. Você busca por **chave exata** ou por
   **prefixo/range**; para outros acessos, cria índices secundários (`05`).
2. **Chave = array de partes.** `["mtr", 123]` é hierárquico e à prova de
   injection de delimitador. A ordem lexicográfica das partes define a listagem.
3. **Valor = structured clone.** Objeto/array/Map/Set/Date/RegExp/Uint8Array/
   BigInt/null/bool/number/string. **NUNCA** função, `Symbol`, classe com
   protótipo custom (`02`).
4. **`Deno.KvU64` é especial.** Inteiro de 64 bits sem sinal, usado por
   `sum`/`min`/`max`; só pode ser valor de topo (não dentro de objeto/array).
5. **Toda leitura/escrita é assíncrona** e retorna um `KvEntry` com `key`,
   `value` e `versionstamp`.
6. **Escritas são sempre strong.** Leituras podem ser `"strong"` (default, mais
   recente) ou `"eventual"` (mais rápida, pode vir defasada).
7. **Concorrência é otimista (OCC).** Read-modify-write precisa de
   `atomic().check()` + loop de retry; nunca sobrescreva às cegas (`04`).
8. **O KV é server-only.** `Deno.openKv()` só no servidor; islands/client jamais
   importam `utils/kv.ts` (`10`).
9. **`openKv` é singleton.** Abrir por request vaza recursos e derruba latência;
   use `getKv()`.

## Ordem prática de implementação

1. Habilitar `"unstable": ["kv"]` no `deno.json` (`01`).
2. Criar `utils/kv.ts` com `getKv()`/`closeKv()` singleton (`10`).
3. Modelar as chaves namespaced do domínio (ex.: `["mtr", numero, "obs"]`) (`02`).
4. Escrever o repositório (`utils/mtr.ts`) com `get`/`set`/`list` (`03`).
5. Para índices por atributo: `["mtr_por_status", status, numero] → numero` (`05`).
6. Envolver mutações relacionadas em `kv.atomic()` com `check` (`04`).
7. Adicionar TTL (`expireIn`) em cache/sessão/rate-limit (`06`).
8. Integrar no Fresh via `define.handlers` + `page()` (`10`).
9. Testar sempre com `Deno.openKv(":memory:")` (`11`).
10. Produção/Deno Deploy + `KV_URL` (`12`).

## Regras de ouro (resumo)

| SEMPRE | NUNCA |
|--------|-------|
| `getKv()` singleton server-only | `Deno.openKv()` por request |
| Chaves namespaced (`["mtr", id]`) | chave string plana (`"mtr:" + id`) |
| `atomic().check()` em read-modify-write | ler e sobrescrever sem check |
| Tratar `value === null`/`versionstamp === null` | assumir que a chave existe |
| Paginar `list` com `limit`/`cursor` | `for await` sem limite em dataset grande |
| `":memory:"` nos testes | tocar o KV de produção em teste |
| Idempotência em filas/consumidores | processar mensagem sem dedupe |
| TTL em cache/sessão (`expireIn`) | cache sem expiração |
| Versionar schema no valor (`{ v: 1, ... }`) | ler valor sem checar versão |
