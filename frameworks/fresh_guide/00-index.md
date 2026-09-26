# Fresh 2.x — Guia de Implementação (Otimizado para IA)

> Foco: SSR, Segurança, Performance, Estabilidade, Testabilidade
> Runtime: Deno 2.0+, Fresh 2.x + Vite
> Objetivo: Guia denso de **COMO** fazer. Cobertura ≥95% da doc oficial.

## Navegação

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [project-setup.md](./01-project-setup.md) | Init, estrutura de diretórios, deno.json, vite.config (Vite + Builder), main.ts (App API completa), client.ts, createDefine, path aliases, daisyUI |
| 02 | [routing.md](./02-routing.md) | File routing, programmatic, URLPattern, dynamic params, route groups, routeOverride, handlers, active links (aria-current) |
| 03 | [middleware-context.md](./03-middleware-context.md) | Arquitetura (request lifecycle), onion model, define.middleware(), file-based middleware, ctx.* API completa, state, redirect, cookies |
| 04 | [data-fetching.md](./04-data-fetching.md) | Handlers + page(), define.page<T>, async components, ctx.state flow |
| 05 | [layouts-app-wrapper.md](./05-layouts-app-wrapper.md) | _layout.tsx nesting, _app.tsx, skipInheritedLayouts, skipAppWrapper, LayoutConfig, `<Head>` component + dedup |
| 06 | [islands-signals.md](./06-islands-signals.md) | Islands/, serialização, signals, useSignal, computed, shared state, IS_BROWSER, custom elements |
| 07 | [security.md](./07-security.md) | CSRF, CSP (nonce-based), CORS, IP filter, trailingSlashes, cookies, XSS, dangerouslySetInnerHTML, markdown/GFM, daisyUI |
| 08 | [partials-navigation.md](./08-partials-navigation.md) | f-client-nav, Partial, f-partial, mode append/prepend, _freshIndicator, View Transitions |
| 09 | [forms-websockets.md](./09-forms-websockets.md) | Form POST, multipart upload, ctx.upgrade(), app.ws(), bare/managed modes |
| 10 | [error-handling.md](./10-error-handling.md) | HttpError, app.onError(), app.notFound(), _error.tsx, status codes |
| 11 | [performance.md](./11-performance.md) | staticFiles(), cache headers, asset(), image optimization, lazy islands, ETag |
| 12 | [testing.md](./12-testing.md) | app.handler() testing, middleware/route/island SSR tests, Vite builder tests, Deno.test |
| 13 | [deployment.md](./13-deployment.md) | Deno Deploy, Docker (DENO_DEPLOYMENT_ID), deno compile, Cloudflare Workers |
| 14 | [telemetry-debugging.md](./14-telemetry-debugging.md) | OpenTelemetry, OTEL_DENO, Jaeger, console exporter, troubleshooting, 1.x→2.x migration |
| 15 | [api-reference.md](./15-api-reference.md) | Todos os exports de `fresh`, `fresh/runtime`, `fresh/dev`, FreshContext, PageProps, imports cheat sheet |
| 16 | [styling.md](./16-styling.md) | Tailwind v4 design tokens, conditional classes (cn/twMerge), dark mode/theme switching, responsive, animações, typography, CSS Modules, CSS custom properties, view transitions styling, organização, performance |
| 17 | [a11y.md](./17-a11y.md) | Acessibilidade: HTML semântico, landmarks, headings, skip link, teclado, focus trap, forms acessíveis, aria-live, modals, accordions, tabs, reduced motion, color contrast, sr-only, testing com axe-core |

## Checklist de Projeto (ordem prática de implementação)

1. `deno run -Ar jsr:@fresh/init`
2. Configurar `deno.json` (tasks, imports, compilerOptions, nodeModulesDir)
3. `vite.config.ts` — fresh() plugin, tailwindcss se usar
4. `client.ts` — import CSS global aqui
5. `routes/_app.tsx` — html/head/body shell
6. `routes/_layout.tsx` — nav/footer global (se precisar)
7. `routes/_middleware.ts` — state global (session, csrf, csp, ipFilter, timing)
8. Criar páginas em `routes/`
9. Criar `islands/` para interatividade
10. Criar `routes/_error.tsx`
11. `deno task build` e `deno task start` para produção
