---
name: fresh
description: >
  Fresh 2.x + Deno 2 + Vite full-stack web guide: SSR, islands, file-based
  routing, middleware, data fetching, layouts, forms/WebSockets, security,
  error handling, performance, testing, deployment, styling, a11y. Load when
  building, modifying, debugging, or deploying a Fresh project.
category: frameworks
version: 2.0.0
tags: [fresh, deno, preact, islands, ssr, vite, tailwind, fullstack]
license: MIT
deps:
  deno: ">=2.0"
  fresh: "jsr:@fresh/core@^2"
  "@fresh/plugin-vite": "jsr:@fresh/plugin-vite@^1"
  vite: "npm:vite@^7"
  preact: "npm:preact@^10"
  "@preact/signals": "npm:@preact/signals@^2"
---

# Fresh 2.x (Deno 2 + Vite)

Server-rendered Preact with islands. No client bundle unless an island is used.

## Use When
- Building/modifying/debugging/deploying a Fresh app
- Choosing between island, partial, and plain route rendering
- Wiring auth/sessions, forms, WebSockets, or middleware
- Configuring Vite, Tailwind, or Deno deploy

## Core Rules
- `staticFiles()` **before** `.fsRoutes()` in `main.ts`.
- Never import from `static/`.
- Never create module-level `signal()` for per-user state (shared across requests on the server).
- Never pass functions as island props (not serializable).
- Islands only where interactivity is needed; routes render on the server.
- Use `ctx.state` for per-request data; `ctx.render(...)` to respond.
- Validate all external input; set security headers; use CSRF protection on mutations.
- Put secrets in env (`Deno.env`), never in client bundles.
- Prefer `define`d handlers with typed `Handler`/`PageProps`.

## Canonical Structure
```
main.ts              # app + staticFiles() + fsRoutes()
fresh.config.ts      # plugins (vite, tailwind)
deno.json            # tasks, imports, compilerOptions
routes/              # file-based routes (index.tsx, [id].tsx, _app.tsx, _layout.tsx)
islands/             # hydrated interactive components
components/          # server-only components
static/              # served as-is (never imported)
islands/…            # client entrypoints
```

```ts
// main.ts
const app = new App()
  .use(staticFiles())
  .use(fsRoutes())
  .use(render());
await app.listen();

// routes/index.tsx
import type { FreshContext } from "$fresh/server.ts";
export const handler = {
  GET: (req: Request, ctx: FreshContext) => ctx.render({ user: "ana" }),
};
export default function Page({ data }: PageProps<{ user: string }>) {
  return <h1>Olá, {data.user}</h1>;
}
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Overview and map |
| `01-project-setup.md` | create, deno.json, Vite, dirs |
| `02-routing.md` | file routes, dynamic/optional/catch-all, groups |
| `03-middleware-context.md` | middleware, `ctx`, `_middleware` |
| `04-data-fetching.md` | loaders, `ctx.render`, caching |
| `05-layouts-app-wrapper.md` | `_app`, layouts, composition |
| `06-islands-signals.md` | islands, signals, serializable props |
| `07-security.md` | headers, CSRF, sessions, input validation |
| `08-partials-navigation.md` | partials, client navigation |
| `09-forms-websockets.md` | forms, actions, WebSockets |
| `10-error-handling.md` | `_error`, notFound, boundaries |
| `11-performance.md` | streaming, caching, asset tuning |
| `12-testing.md` | unit/integration/e2e |
| `13-deployment.md` | Deno Deploy, containers |
| `14-telemetry-debugging.md` | logs, OTel, debugging |
| `15-api-reference.md` | API surface |
| `16-styling.md` | Tailwind, CSS, theming |
| `17-a11y.md` | accessibility |
| `examples/` | runnable examples |

## Read Order
`00`→`01`→`02`; islands `06`; security `07`; deploy `13`. Use `15` as reference.

## Prereqs
Deno ≥2.0, TypeScript, JSX/Preact basics; basic HTTP/SSR knowledge.
