# 11 — Testes

> Teste KV **sempre** com banco efêmero: `Deno.openKv(":memory:")`. Nunca toque
> o KV de produção. Em testes de rota, use `app.handler()` (sem subir porta).

## 1. Banco efêmero por teste

```ts
import { assertEquals } from "jsr:@std/assert";

Deno.test("preferências", async (t) => {
  const kv = await Deno.openKv(":memory:");

  await t.step("salva e lê displayname", async () => {
    await kv.set(["preferences", "example", "displayname"], "Exemplary User");
    const r = await kv.get(["preferences", "example", "displayname"]);
    assertEquals(r.value, "Exemplary User");
  });

  await t.step("exclui", async () => {
    await kv.delete(["preferences", "example", "displayname"]);
    const r = await kv.get(["preferences", "example", "displayname"]);
    assertEquals(r.value, null);
  });

  kv.close();
});
```

- Cada `":memory:"` é isolado; vários coexistem sem interferência.
- Backed por SQLite em memória (mesmo comportamento de transações/OCC).
- **SEMPRE** `kv.close()` ao fim (ou `using kv = await Deno.openKv(":memory:")`).

## 2. Testar funções que usam o singleton `getKv()`

O singleton lê `KV_URL` na primeira chamada. Aponte para `:memory:` no setup e
reinicie entre testes:

```ts
import { assertEquals, assertRejects } from "jsr:@std/assert";
import { closeKv } from "@/utils/kv.ts";
import { obterMtr, salvarMtr } from "@/utils/mtr.ts";

Deno.test("repositório MTR", async (t) => {
  Deno.env.set("KV_URL", ":memory:");
  await closeKv(); // garante que o próximo getKv abre um banco novo

  const mtr = { numero: "PE-0001", status: "rascunho", /* ... */ };

  await t.step("salva e lê", async () => {
    await salvarMtr(mtr);
    assertEquals((await obterMtr("PE-0001"))?.numero, "PE-0001");
  });

  await t.step("não duplica", async () => {
    await assertRejects(() => salvarMtr(mtr), Error); // check versionstamp:null
  });

  await closeKv();
  Deno.env.delete("KV_URL");
});
```

> **Alternativa melhor em código novo:** injetar o `Deno.Kv` como parâmetro
> (`salvarMtr(kv, mtr)`). Facilita testes e desacopla do singleton.

```ts
export async function salvarMtr(kv: Deno.Kv, mtr: Mtr): Promise<void> {
  await kv.atomic().check({ key: ["mtr", mtr.numero], versionstamp: null })
    .set(["mtr", mtr.numero], mtr).commit();
}

// no teste:
const kv = await Deno.openKv(":memory:");
await salvarMtr(kv, mtr);
```

## 3. Teste de rota com `app.handler()`

```ts
// routes/api/mtr_test.ts
import { expect } from "jsr:@std/expect";
import { app } from "@/main.ts";
import { closeKv } from "@/utils/kv.ts";

Deno.test("GET /api/mtr responde 200", async () => {
  Deno.env.set("KV_URL", ":memory:");
  await closeKv();

  const handler = app.handler();
  const res = await handler(new Request("http://localhost/api/mtr?status=emitido"));
  expect(res.status).toBe(200);

  await closeKv();
  Deno.env.delete("KV_URL");
});
```

- `app.handler()` devolve uma `(req) => Promise<Response>` — sem sockets,
  sem `AddrInUse`.
- Popule o KV antes da chamada para testar os caminhos de dados.
- Verifique status, `content-type` e o corpo JSON.

## 4. Testar OCC/concorrência

Force um conflito alterando a chave entre a leitura e o commit e valide que o
retry converge:

```ts
Deno.test("incremento concorrente converge", async () => {
  const kv = await Deno.openKv(":memory:");
  await kv.set(["stats", "x"], new Deno.KvU64(0n));

  await Promise.all(
    Array.from({ length: 50 }, () =>
      (async () => {
        for (let i = 0; i < 10; i++) {
          const cur = await kv.get<Deno.KvU64>(["stats", "x"]);
          const res = await kv.atomic()
            .check({ key: ["stats", "x"], versionstamp: cur.versionstamp })
            .sum(["stats", "x"], 1n)
            .commit();
          if (res.ok) return;
        }
        throw new Error("retry esgotado");
      })()
    ),
  );

  const final = await kv.get<Deno.KvU64>(["stats", "x"]);
  assertEquals(final.value?.value, 50n);
  kv.close();
});
```

## 5. Testar TTL

TTL é assíncrono/eventual; não confie em relógio exato. Valide o campo de
expiração no valor e, se possível, use `delay`/fakes. Um teste simples:

```ts
Deno.test("sessão com campo de expiração", async () => {
  const kv = await Deno.openKv(":memory:");
  await kv.set(["sessao", "s1"], { expiraEm: "2000-01-01T00:00:00Z" }, { expireIn: 1 });
  // A validação de negócio (obterSessao) deve rejeitar pelo campo, não só pelo TTL
});
```

## 6. Convenções de teste no projeto

```bash
deno test -A                # todos
deno test -A --filter "MTR" # por nome
deno test -A --coverage=coverage
deno task check             # fmt --check + lint + check (gate)
```

- Nome do arquivo: `*_test.ts` ao lado do módulo.
- **NUNCA** deixe `deno lint`/`check`/`test` vermelho antes de fechar.
- Teste unitário para funções puras, rota para handlers, e2e para fluxos
  críticos (criar/receber MTR, gerar CDF).

## 7. Checklist

```
[ ] Todo teste de KV usa ":memory:"
[ ] kv.close() ao fim (ou `using`)
[ ] closeKv() + env KV_URL em testes do singleton
[ ] Teste de rota via app.handler() (sem porta)
[ ] Concorrência testada (loop de retry converge)
[ ] Nenhum teste toca KV remoto/produção
```
