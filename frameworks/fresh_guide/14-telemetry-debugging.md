# 14 — Telemetry & Debugging

> OpenTelemetry tracing, OTEL_DENO, Jaeger, console exporter, Vite debugging, troubleshooting, Fresh 1→2 migration

---

## 1. OpenTelemetry — O Que Está Instrumentado

Fresh gera spans automaticamente sob o tracer `fresh` (nome inclui versão do Fresh). Nenhum código adicional necessário.

**Spans gerados por requisição:**

| Span | Descrição |
|------|-----------|
| **Root** | Requisição HTTP completa. Atributo `http.route` (ex: `GET /blog/:slug`) |
| **Middleware** | Cada middleware na chain (ordem de execução preservada) |
| **Route handler** | Execução do handler da rota |
| **SSR render** | Server-side rendering (inclui componentes async) |
| **Static file** | Lookup no filesystem, cache check, resposta |
| **Lazy route load** | Dynamic import no primeiro acesso à rota |

**Atributos de span:**

| Atributo | Span | Descrição |
|----------|------|-----------|
| `http.route` | Root | Pattern da rota `GET /blog/:slug` |
| `fresh.span_type` | Vários | Classificação interna (`render`, etc.) |
| `fresh.cache` | Static file | `immutable`, `not_modified`, `no_cache`, `invalid_bust_key` |
| `fresh.cache_key` | Static file | Cache bust key do asset |

**Erros:** registrados com `span.recordException()`, span status = `ERROR`.

---

## 2. Ativando OpenTelemetry (Built-in Deno)

```sh
OTEL_DENO=true deno task start
```

- Zero mudanças de código — spans criados automaticamente pelo runtime Deno
- Sem exporter configurado: spans são descartados silenciosamente (zero overhead de performance)

---

## 3. OTLP Exporter (padrão gRPC)

```sh
OTEL_DENO=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 \
deno task start
```

Envia spans via gRPC para qualquer coletor compatível com OTLP.

Variantes de protocolo:
```sh
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf   # HTTP/Protobuf (padrão)
OTEL_EXPORTER_OTLP_PROTOCOL=http/json       # HTTP/JSON
OTEL_EXPORTER_OTLP_PROTOCOL=grpc            # gRPC
```

---

## 4. Console Exporter (Mais Rápido, Deno 2.7+)

```sh
OTEL_DENO=true \
OTEL_TRACES_EXPORTER=console \
deno task start
```

Imprime spans diretamente no stderr — breakdown completo de timings middleware/handler/render.

Output de exemplo:
```
{
  "name": "GET /blog/my-post",
  "traceId": "abc123...",
  "spanId": "def456...",
  "startTime": [1739000000, 123456789],
  "endTime":   [1739000000, 123489012],
  "attributes": { "http.route": "GET /blog/:slug", "http.status_code": 200 },
  "parentSpanId": "0000000000000000",
  "status": { "code": 0 }
}
```

---

## 5. Jaeger (Visual Explorer)

```sh
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4317:4317 \
  jaegertracing/all-in-one:latest
```

```sh
OTEL_DENO=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 \
deno task start
```

Abra `http://localhost:16686` → selecione serviço `unknown_service` → busque traces.

---

## 6. Custom Exporter (Qualquer Backend OTLP)

```ts
// main.ts — antes de criar App
import { registerOtel } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "https://your-collector.example.com/v1/traces",
    headers: { "api-key": Deno.env.get("OTEL_API_KEY")! },
  }),
  serviceName: "my-fresh-app",
});
sdk.start();
```

Compatível com: **Jaeger, Zipkin, Honeycomb, Grafana Tempo, Datadog, New Relic, SigNoz**.

Alternativa via deno.json:
```json
{
  "tasks": {
    "start": "OTEL_DENO=true OTEL_EXPORTER_OTLP_ENDPOINT=https://collector.example.com:4317 OTEL_SERVICE_NAME=my-app deno task serve"
  }
}
```

---

## 7. Deno Deploy

Traces coletados automaticamente ao usar Fresh preset — **nenhuma configuração necessária**.

Os spans aparecem no dashboard do Deploy na aba "Observability" sem qualquer env var ou código extra.

---

## 8. Client-Side Trace Correlation (W3C Trace Context)

Quando exporter está ativo, Fresh injeta no `<head>`:

```html
<meta name="traceparent" content="00-abc123def4567890abc123def4567890-0123456789abcdef-01">
```

Isso conecta traces do browser aos spans do servidor. Combine com:

```ts
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
```

Para visibilidade end-to-end browser ↔ servidor.

---

## 9. Troubleshooting — Checklist Rápida

### Atualizar dependências
```sh
deno upgrade                              # Deno mais recente
deno install --allow-scripts              # reinstalar npm deps
deno install --allow-scripts -r           # força reinstall
```

### Fresh versão
Verifique `jsr.io/@fresh/core/versions` — muitas issues de tracing corrigidas em versões recentes.

### Não use esm.sh
Em Fresh 2, use `npm:package` no lugar de `esm.sh/*`. Versões duplicadas de Preact vindas do esm.sh causam erros JS bizarros.

### Deploy não sobe
1. Rode `deno task build` — build é obrigatório antes do deploy
2. Entry deve ser `_fresh/server.js`, **não** `main.ts`
3. `ISOLATE_INTERNAL_FAILURE` = provável entry errada

### VS Code não acha pacotes
1. Instale extensão `denoland.vscode-deno`
2. Cmd/Ctrl+Shift+P → `Deno: Enable`
3. Versão do Deno aparece na status bar

### Traces não aparecem
1. Confirme `OTEL_DENO=true` está setada no mesmo shell
2. Verifique se o endpoint OTLP está acessível: `curl http://localhost:4317`
3. Teste com console exporter primeiro: `OTEL_DENO=true OTEL_TRACES_EXPORTER=console deno task start`
4. Deno < 2.7 não tem suporte a `OTEL_TRACES_EXPORTER=console` — use OTLP ou atualize

---

## 10. Debugging Vite

```sh
deno run -A --inspect npm:vite       # attach debugger (porta 9229)
deno run -A --inspect-brk npm:vite   # break no start
deno run -A npm:vite --debug         # log verbose de resolução
```

### Inspecionar Transformações do Vite

```sh
deno add npm:vite-plugin-inspect
```

```ts
// vite.config.ts
import { defineConfig } from "$fresh/plugin-vite/mod.ts";
import inspect from "vite-plugin-inspect";

export default defineConfig({
  plugins: [inspect()],
});
```

UI em `http://localhost:5173/__inspect` — mostra todas as transformações de módulos.

---

## 11. Deno Extension — VS Code Setup

```jsonc
// .vscode/settings.json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": [],
  "editor.defaultFormatter": "denoland.vscode-deno"
}
```

Instale `denoland.vscode-deno` → `Cmd/Ctrl+Shift+P` → `Deno: Enable`. Status bar mostra a versão do Deno usada.

Se já tem TypeScript extension instalada, ela pode conflitar — desabilite para o workspace ou confie no Deno extension que já faz tudo.

---

## 12. Fresh 1.x → 2.x — Migration Checklist

### Arquivos a deletar
- `dev.ts`
- `fresh.gen.ts`
- `fresh.config.ts`

### Arquivos a criar
- `vite.config.ts` (com `fresh()` plugin)
- `client.ts` (importa CSS global)

### Mudanças de API

| Fresh 1.x | Fresh 2.x |
|-----------|-----------|
| `ctx.renderNotFound()` | `throw new HttpError(404)` |
| `ctx.basePath` | `ctx.config.basePath` |
| `ctx.remoteAddr` | `ctx.info.remoteAddr` |
| `_404.tsx` + `_500.tsx` separados | `_error.tsx` unificado |
| `(req, ctx)` middleware | `(ctx)` — request em `ctx.req` |
| `{ GET(req, ctx) { ctx.render(data) } }` | `{ GET(ctx) { return page(data) } }` |
| `deno run -A main.ts` | `deno serve -A _fresh/server.js` |

### Migration commands
```sh
# Auto-update (tenta automatizar mudanças)
deno run -Ar jsr:@fresh/update

# Iniciar projeto Fresh 2 limpo para comparar
mkdir fresh2-demo && cd fresh2-demo && deno run -Ar jsr:@fresh/init && cd ..
diff -r fresh2-demo/ meu-projeto/  # compara estruturas
```

### deno.json — imports necessários
```json
{
  "imports": {
    "$fresh/": "jsr:@fresh/core/",
    "$fresh/plugin-vite/": "jsr:@fresh/plugin-vite/",
    "vite": "npm:vite@^6",
    "@tailwindcss/vite": "npm:@tailwindcss/vite@^4",
    "@types/babel__core": "npm:@types/babel__core@^7"
  },
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

### Tailwind (se usado)
```ts
// vite.config.ts — trocar @tailwindcss/vite
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({ plugins: [fresh(), tailwindcss()] });
```
Remover `<link rel="stylesheet" href="/styles.css">` do `_app.tsx` — CSS é importado via `client.ts` agora.

### Checklist final
- [ ] `dev.ts` removido, `vite.config.ts` criado
- [ ] `client.ts` existe, importa CSS
- [ ] Stylesheet movido de `static/`, `<link>` removido de `_app.tsx`
- [ ] `deno.json` tasks apontam para `vite` / `vite build`
- [ ] `@fresh/plugin-vite` + `vite` + `@types/babel__core` nos imports
- [ ] `"vite/client"` em compilerOptions.types
- [ ] Tailwind migrado para `@tailwindcss/vite` (se aplicável)
- [ ] Entry de produção: `deno serve -A _fresh/server.js`
- [ ] `deno task build` funciona → `deno task start` sobe produção

---

## Quick Reference

```sh
# Deno
deno upgrade                                  # atualizar Deno
deno install --allow-scripts                  # instalar npm deps
deno install --allow-scripts -r               # reinstalar forçado

# Desenvolvimento
deno task dev                                 # Vite dev server + HMR
deno task build                               # build produção
deno task start                               # servir produção

# Debugging
deno run -A --inspect npm:vite                # debug dev server
deno run -A --inspect-brk npm:vite            # break no start

# OpenTelemetry
OTEL_DENO=true deno task start                # tracing ativo
OTEL_DENO=true OTEL_TRACES_EXPORTER=console deno task start  # traces no stderr
OTEL_DENO=true OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 deno task start  # Jaeger/OTLP

# Migration
deno run -Ar jsr:@fresh/update                # auto-migrar 1.x → 2.x
deno run -Ar jsr:@fresh/init                  # criar projeto Fresh 2 limpo
```
