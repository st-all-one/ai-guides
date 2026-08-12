# Fresh 2.x — Guia de Implementação

Guia denso e otimizado para consumo por IA, cobrindo ≥95% da documentação oficial do
[Fresh](https://fresh.deno.dev) (v2.x). Foco em **COMO** implementar, com exemplos
de código prontos para copiar, voltado para SSR, segurança, performance,
estabilidade e testabilidade.

## Stack

| Componente          | Versão                        |
|---------------------|-------------------------------|
| Deno                | ≥2.0                          |
| Fresh               | 2.x (`jsr:@fresh/core@^2`)    |
| Vite (Fresh plugin) | 7.x (`jsr:@fresh/plugin-vite@^1`) |
| Preact              | 10.x                          |
| @preact/signals     | 2.x                           |
| Tailwind CSS        | 4.x (via `@tailwindcss/vite`) |

## Estrutura do Guia (15 arquivos, ~5.000 linhas)

| # | Arquivo | Tópicos |
|---|---------|---------|
| 00 | [index.md](./00-index.md) | Navegação + checklist de implementação |
| 01 | [project-setup.md](./01-project-setup.md) | `deno init`, estrutura de diretórios, `deno.json`, `vite.config.ts`, `main.ts`, `client.ts`, `utils.ts` |
| 02 | [routing.md](./02-routing.md) | File routing, programmatic, URLPattern, dynamic params, route groups, `routeOverride`, handlers por método |
| 03 | [middleware-context.md](./03-middleware-context.md) | Onion pattern, `define.middleware()`, `ctx.*` API completa, state tipado, redirect, padrões comuns |
| 04 | [data-fetching.md](./04-data-fetching.md) | `handler` + `page()`, `define.page<T>`, async components, `ctx.state` flow, query params, form data |
| 05 | [layouts-app-wrapper.md](./05-layouts-app-wrapper.md) | `_app.tsx`, `_layout.tsx` nesting, async layouts, `skipInheritedLayouts`, `skipAppWrapper`, programmatic |
| 06 | [islands-signals.md](./06-islands-signals.md) | Islands, serialização, signals (`useSignal`, `computed`, `signal`), shared state, `IS_BROWSER`, custom elements |
| 07 | [security.md](./07-security.md) | CSRF, CSP (nonce-based), CORS, IP filter (CIDR), `trailingSlashes`, XSS, cookies `httpOnly`/`secure`, `trustProxy` |
| 08 | [partials-navigation.md](./08-partials-navigation.md) | `f-client-nav`, `<Partial>`, `f-partial`, `mode append/prepend`, `_freshIndicator`, View Transitions API |
| 09 | [forms-websockets.md](./09-forms-websockets.md) | `<form>` POST, `multipart/form-data` upload, `app.ws()`, `ctx.upgrade()` (managed/bare), chat rooms |
| 10 | [error-handling.md](./10-error-handling.md) | `HttpError`, `app.onError()`, `app.notFound()`, `_error.tsx`, status codes |
| 11 | [performance.md](./11-performance.md) | `staticFiles()`, cache busting (`asset()`, `assetSrcSet()`), imagetools, lazy islands, ETag |
| 12 | [testing.md](./12-testing.md) | `app.handler()`, middleware test, layout test, route/handler import test, island SSR test, full-build test |
| 13 | [deployment.md](./13-deployment.md) | Deno Deploy, Docker (`DENO_DEPLOYMENT_ID`), `deno compile`, Cloudflare Workers |
| 14 | [telemetry-debugging.md](./14-telemetry-debugging.md) | OpenTelemetry, `OTEL_DENO`, Jaeger, console exporter, troubleshooting, Fresh 1→2 migration |

## Como usar este guia

1. **Novo projeto**: siga o checklist em [00-index.md](./00-index.md)
2. **Implementar feature**: vá direto ao arquivo do tópico — cada um é autocontido
3. **Debug/erro**: [14-telemetry-debugging.md](./14-telemetry-debugging.md) tem troubleshooting e debug
4. **Deploy**: [13-deployment.md](./13-deployment.md) cobre 4 ambientes

## Convenções do guia

- Todo exemplo de código é **copiável** (imports explícitos, types corretos)
- Foco em **COMO** fazer, não em PORQUÊ
- Estrutura densa: tópico → código → explicação mínima
- Cobertura dos 51 arquivos da documentação oficial do Fresh 2.x
