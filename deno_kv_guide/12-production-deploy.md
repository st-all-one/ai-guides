# 12 — Produção e Deploy

> Local = SQLite em disco. Produção = FoundationDB (Deno Deploy) ou instância
> remota via `KV_URL`. Entenda limites, backup, consistência e observabilidade.

## 1. Back-ends

| Ambiente | Back-end | Como abrir |
|----------|----------|------------|
| CLI/dev | SQLite local (arquivo) | `Deno.openKv()` (caminho padrão) |
| Testes | SQLite em memória | `Deno.openKv(":memory:")` |
| Deno Deploy | FoundationDB gerenciado | `Deno.openKv()` (automático) |
| Self-host/outro | KV remoto | `Deno.openKv(Deno.env.get("KV_URL"))` |

O `getKv()` do projeto já cobre todos esses casos:

```ts
promise ??= Deno.openKv(Deno.env.get("KV_URL") ?? undefined);
```

- `KV_URL` presente → remoto.
- `KV_URL` ausente → local/Deploy automático.

> **NUNCA** assuma paridade total SQLite ↔ FoundationDB. Evite depender de
> detalhes do arquivo local (ex.: caminho, locks). Teste comportamento no
> ambiente de produção.

## 2. Deploy no Deno Deploy

- O entry de produção é `_fresh/server.js` (**nunca** `main.ts`):

```bash
deno task build      # gera _fresh/
deno task start      # deno serve -A _fresh/server.js
```

- No Deploy, `Deno.openKv()` sem argumento usa o KV gerenciado.
- `Deno.cron` e `kv.listenQueue` são suportados no Deploy (confirme o plano).
- Variáveis server-only via painel do Deploy; **NUNCA** prefixe segredos com
  `FRESH_PUBLIC_`.

## 3. Limites de armazenamento (oficiais)

| Item | Limite |
|------|--------|
| Tamanho máx. de chave | **2 KiB** |
| Tamanho máx. de valor | **64 KiB** |
| Chaves por `getMany` | 10 |
| Batch por `list` | **500** (default = `limit` ou 100) |
| Checks por atômico | 100 |
| Mutações por atômico | 1000 |
| Tamanho total do atômico | 800 KiB |
| Tamanho total de chaves do atômico | 90 KiB |
| Chaves observadas em `watch` | 10 |

Estratégias para valores grandes:
- Divida em **chunks** (chave com índice: `["doc", id, "chunk", 0]`) e recomponha
  na leitura.
- Guarde o binário grande (PDF/XML) em object storage e no KV apenas a
  **referência** (`["doc", id, "url"]`).
- **NUNCA** guarde base64 de arquivo grande como valor.

## 4. Backup e exportação

O KV gerenciado não expõe um dump nativo portável. Padrões:

- **Exportação lógica**: varra o keyspace com `list` (paginado) e escreva
  NDJSON em storage externo. Rode por cron.
- **Replicação defensiva**: ao escrever dados críticos, grave também um log
  append-only (`["backup", "mtr", ulid()]`) — permite reconstruir índices.
- **Restore**: reprocesse o NDJSON com `set`/`atomic` idempotentes.

```ts
async function exportar(prefixo: Deno.KvKey) {
  const kv = await getKv();
  const linhas: string[] = [];
  for await (const e of kv.list({ prefix: prefixo }, { consistency: "eventual" })) {
    linhas.push(JSON.stringify(e));
  }
  return linhas.join("\n"); // envie para S3/R2/filesystem
}
```

## 5. Consistência e latência

- Leituras `"strong"` custam mais; use `"eventual"` em listagens/relatórios.
- Escritas são sempre strong e podem sofrer **contenção** em chaves quentes
  (muitos `atomic` na mesma chave → retries). Distribua contadores quando
  possível (ex.: shard por `["stats", "visitas", shard]`).
- Evite N+1: hidrate índices com `getMany` em chunks de 10.
- Use `limit`/`cursor` em toda listagem; nunca varra o keyspace inteiro em
  request.

## 6. Observabilidade

- Meça a latência do app com `Server-Timing` (já no middleware do projeto).
- Logue conflitos de OCC (frequência de `res.ok === false`) e falhas de fila
  (DLQ). Contenção crescente = sinal para repensar a chave/estratégia.
- Monitore tamanho de valores; perto de 64 KiB = risco de erro de escrita.
- Trace distribuído via `OTEL_DENO=true deno task start`.

## 7. Segurança

- KV é **server-only**; nunca exponha `KV_URL`/credenciais ao cliente.
- **NUNCA** importe `utils/kv.ts` em island/client.
- Chaves não são um mecanismo de segurança: dados sensíveis dependem de
  autorização na aplicação (middleware) e transporte TLS.
- Valide/normalize input antes de montar a chave (evita chaves inesperadas por
  tipos diferentes: `"1"` ≠ `1`).

## 8. Checklist de produção

```
[ ] KV_URL configurado no ambiente de produção (se self-host)
[ ] getKv() singleton; nenhum Deno.openKv por request
[ ] Valores < 64 KiB; grandes via chunk ou object storage
[ ] Listagens com limit/cursor; sem full-scan em request
[ ] índice primário + secundário sempre em transação atômica
[ ] Leituras eventuais onde apropriado
[ ] Exportação/backup agendada (cron)
[ ] DLQ monitorada; OCC sem loop infinito
[ ] Segredos fora do bundle cliente
[ ] `deno task check` e `deno test -A` verdes
```
