# 10 — Integração com Fresh 2.x

> Como usar Deno KV no projeto `mtr-site-atr` (Fresh 2.x, SSR + islands) sem
> vazar o banco para o cliente e mantendo segurança de tipos.

## 1. Princípio fundamental

**O KV vive apenas no servidor.** Só `routes/`, `main.ts`, `utils/*.ts` e
layouts/handlers server-side podem tocá-lo. **Islands e `client.ts` jamais**
importam `utils/kv.ts`.

```
routes/  ✅  server (handler/SSR)
utils/   ✅  server
components/ ✅  server (SSR)
islands/ ❌  client (hidratado)
client.ts ❌ client
```

## 2. `utils/kv.ts` — singleton server-only

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

Regras:
- **SEMPRE** `getKv()`; **NUNCA** `Deno.openKv()` por request.
- O guard `IS_BROWSER` falha cedo se alguém importar o módulo no cliente.
- `KV_URL` ausente → SQLite local; presente → remoto (Deploy/self-host).
- `closeKv()` em testes/`deno run` que precisa encerrar limpo.

## 3. Handler que lê do KV (tipo-seguro)

```tsx
// routes/mtr/[numero].tsx
import { HttpError, page } from "fresh";
import { define } from "@/utils/define.ts";
import { obterMtr } from "@/utils/mtr.ts";

interface Data { mtr: { numero: string; status: string; qtd: number } }

export const handler = define.handlers({
  async GET(ctx) {
    const numero = ctx.params.numero ?? "";
    const mtr = await obterMtr(numero);
    if (!mtr) throw new HttpError(404, "MTR não encontrado");
    return page<Data>({
      mtr: { numero: mtr.numero, status: mtr.status, qtd: mtr.residuos.length },
    });
  },
});

export default define.page<typeof handler>(({ data }) => (
  <article>
    <h1>MTR {data.mtr.numero}</h1>
    <p>Status: {data.mtr.status}</p>
    <p>Resíduos: {data.mtr.qtd}</p>
  </article>
));
```

- `define.page<typeof handler>` liga o tipo do retorno do handler ao prop `data`.
- `page(data, { status, headers })` para controlar status/cache.
- **NUNCA** devolva o objeto cru do KV direto na página se ele tiver campos
  internos; mapeie para um DTO de view.

## 4. Formulário → KV (PRG + validação)

```ts
// routes/mtr/[numero]/obs.ts
import { page } from "fresh";
import { define } from "@/utils/define.ts";
import { getKv } from "@/utils/kv.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const form = await ctx.req.formData();
    const numero = ctx.params.numero ?? "";
    const obs = String(form.get("obs") ?? "").trim();

    if (obs.length > 500) {
      return page({ erro: "Observação muito longa" }, { status: 422 });
    }

    const kv = await getKv();
    await kv.set(["mtr", numero, "obs"], { v: 1, texto: obs, em: new Date().toISOString() });

    return new Response(null, { status: 303, headers: { Location: `/mtr/${numero}` } });
  },
});
```

- **SEMPRE** valide no servidor (`415` para content-type errado, `422` para
  validação).
- POST de sucesso → **303** + `Location` (PRG). Erro → `page(..., { status: 422 })`.
- CSRF já é aplicado por `app.use(csrf())` (`main.ts`).

## 5. API JSON

```ts
// routes/api/mtr.ts
import { define } from "@/utils/define.ts";
import { listarMtrsPorStatus } from "@/utils/mtr.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const status = ctx.url.searchParams.get("status") ?? "emitido";
    if (!["rascunho", "emitido", "recebido", "cancelado"].includes(status)) {
      return Response.json({ erro: "status inválido" }, { status: 422 });
    }
    return Response.json(await listarMtrsPorStatus(status));
  },
});
```

Exporta `handler` **sem** default export. Métodos não definidos → 405.

## 6. Sessão de usuário (cookie + KV)

```ts
// utils/sessao.ts (server-only)
import { getKv } from "@/utils/kv.ts";

export interface Sessao {
  id: string;
  usuarioId: string;
  nome: string;
  papel: "admin" | "operador" | "leitor";
  expiraEm: string;
}

const TTL = 8 * 60 * 60 * 1000; // 8h

export async function criarSessao(usuarioId: string, nome: string, papel: Sessao["papel"]) {
  const kv = await getKv();
  const id = crypto.randomUUID();
  const sessao: Sessao = {
    id, usuarioId, nome, papel,
    expiraEm: new Date(Date.now() + TTL).toISOString(),
  };
  await kv.set(["sessao", id], sessao, { expireIn: TTL });
  return sessao;
}

export async function obterSessao(id: string): Promise<Sessao | null> {
  const kv = await getKv();
  const { value } = await kv.get<Sessao>(["sessao", id]);
  if (!value) return null;
  if (Date.parse(value.expiraEm) <= Date.now()) {
    await kv.delete(["sessao", id]);
    return null;
  }
  return value;
}
```

Middleware de auth:

```ts
// routes/cms/_middleware.ts
import { HttpError } from "fresh";
import { define } from "@/utils/define.ts";
import { obterSessao } from "@/utils/sessao.ts";

export default define.middleware(async (ctx) => {
  const sid = ctx.req.headers.get("cookie")?.match(/__Host-sess=([^;]+)/)?.[1];
  const user = sid ? await obterSessao(sid) : null;
  if (!user) throw new HttpError(401);
  ctx.state.user = user;        // vem do State em utils/define.ts
  return await ctx.next();
});
```

> Cookies de sessão: `Secure; HttpOnly; SameSite=Strict; __Host-` (ver
> `web_security_guide`). **NUNCA** guarde token em `localStorage`.

## 7. Islands — a fronteira

Islands **não** importam KV. Elas recebem primitivos/IDs por props e buscam dados
via endpoint:

```tsx
// islands/FiltroMtr.tsx (client)
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export default function FiltroMtr({ inicial }: { inicial: string }) {
  const q = useSignal(inicial);
  const itens = useSignal<Array<{ numero: string }>>([]);

  useEffect(() => {
    fetch(`/api/mtr?status=${encodeURIComponent(q.value)}`)
      .then((r) => r.json())
      .then((d) => (itens.value = d));
  }, [q.value]);

  return <input type="search" value={q} onInput={(e) => (q.value = e.currentTarget.value)} />;
}
```

- Props de island < 500 bytes: passe **IDs/primitivos**, nunca dump JSON do KV.
- `Date`/`Map`/`Set` são serializáveis, mas converta para JSON/ISO na fronteira.
- **NUNCA** importe `@/utils/kv.ts` ou `@/utils/mtr.ts` (se ele importar kv) em
  island. Mantenha funções puras (sem KV) separadas se precisar compartilhar.

## 8. Erros

```ts
import { HttpError } from "fresh";
throw new HttpError(404, "MTR não encontrado");
```

- Chave inexistente → `value === null` → `throw new HttpError(404)`.
- Erro de validação → `422`; MIME inválido → `415`; conflito → `409`.
- **NUNCA** vaze stack/detalhes em produção (`routes/_error.tsx` unifica).

## 9. Boot, queue e cron

No `main.ts`/boot do servidor, registre consumidores **uma vez**:

```ts
// main.ts (server)
import { getKv } from "@/utils/kv.ts";
import { processarJob } from "@/utils/fila.ts";

const kv = await getKv();
kv.listenQueue(processarJob);          // registra o consumidor da fila
Deno.cron("dlq-retry", "*/30 * * * *", () => reprocessarDlq());
```

> `listenQueue`/`Deno.cron` só em código server-side de boot, nunca em
> handler/island. Veja `08-queue-cron.md`.

## 10. Checklist de integração

```
[ ] Nenhum import de utils/kv em islands/client
[ ] getKv() singleton usado em todo handler/repositório
[ ] DTO de view separado do objeto persistido
[ ] Input validado no servidor; PRG 303 após POST
[ ] Sessão com cookie HttpOnly + TTL no KV + validação de expiração
[ ] Props de island pequenas (IDs/primitivos)
[ ] listenQueue/cron registrados uma vez no boot
[ ] Testes usam KV :memory: (11-testing.md)
```
