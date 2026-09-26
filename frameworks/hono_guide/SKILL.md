---
name: hono
description: >
  Hono v4.13.7 — minimal, ultrafast web framework on Web Standards
  (Request/Response/fetch). Routing, Context, middleware, built-in helpers,
  validation, typed RPC (hc), JSX, testing, multi-runtime deploy, security.
  Load when building portable APIs/apps for edge, Deno, Bun, or Node.
category: frameworks
version: "4.13.7"
tags: [hono, web-standards, routing, middleware, validation, rpc, jsx, edge, deno, bun, cloudflare]
license: MIT
---

# Hono 4.13.7

Same code runs on Cloudflare Workers, Deno, Bun, Node, Vercel, Netlify, AWS Lambda.

## Use When
- Building HTTP/JSON APIs or web apps on the edge
- Routing with params/wildcards/regex/sub-apps
- Composing middleware (auth, CORS, logger, cache, security headers)
- Validating input (Zod/Valibot/TypeBox) and sharing types
- End-to-end typed client with `hono/client` (`hc`)
- Rendering HTML with JSX or the `html` tagged template
- Porting an Express app to portable Web Standards

## Core Rules
- Return `Response`/`c.json`/`c.html`; never mutate global state.
- Group routes with `app.route()` and chains: `new Hono().get(...).post(...)`.
- Always order middleware before routes it protects.
- Use `c.req.valid()` with a validator; never trust unparsed body/query.
- Reuse `c.env` for bindings/secrets; `c.executionCtx.waitUntil()` for background work.
- Add `secureHeaders()` + explicit CORS origins; never `*` with credentials.
- Throw `HTTPException`; centralize with `app.onError` / `app.notFound`.
- Prefer `hc<AppType>` for typed clients; test with `app.request()`.

## Key APIs
```ts
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

type Bindings = { KV: KVNamespace };
const app = new Hono<{ Bindings: Bindings }>();

app.use("*", logger(), secureHeaders());
app.use("/api/*", cors({ origin: ["https://app.example"] }));

app.get("/users/:id", async (c) => {
  const id = c.req.param("id");
  return c.json({ id });
});

app.post("/users", zValidator("json", z.object({ name: z.string() })), (c) => {
  const { name } = c.req.valid("json");
  return c.json({ name }, 201);
});

app.onError((err, c) => c.json({ error: err.message }, 500));
app.notFound((c) => c.json({ error: "not found" }, 404));

const route = new Hono().get("/", (c) => c.text("hi"));
app.route("/sub", route);

export default app;
export type AppType = typeof app;
// client: const client = hc<AppType>("https://api"); await client.users.$get();
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Canonical example and mental model |
| `01-quickstart.md` | Install, scaffold, entrypoints |
| `02-roteamento.md` | Methods, params, wildcards, regex, `app.route`, routers |
| `03-contexto.md` | `c.req`, `c.res`, `c.env`, `c.var`, executionCtx |
| `04-request-response.md` | Request/Response, body parsing, streaming |
| `05-middleware.md` | Middleware ordering and composition |
| `06-middleware-embutidos.md` | logger, cors, csrf, etag, basicAuth, jwt, secureHeaders |
| `07-helpers.md` | cookie, jwt, html, stream, ssg, proxy, websocket, factory |
| `08-validacao.md` | zValidator, valibot, typebox-datavalidator |
| `09-rpc-client.md` | `hc` typed client, `$url`, `$ws` |
| `10-jsx.md` | JSX render, fragments, async components |
| `11-testing.md` | `app.request`, mocks |
| `12-api-reference.md` | Full API surface |
| `13-melhores-praticas.md` | Best practices |
| `14-deploy-runtimes.md` | Workers, Deno, Bun, Node, Lambda |
| `15-seguranca.md` | Headers, CORS, CSRF, auth |
| `16-exemplos.md` | Complete examples |
| `17-cheatsheet.md` | Quick reference |
| `18-faq-troubleshooting.md` | FAQ and pitfalls |
| `19-padroes-avancados.md` | Advanced patterns |

## Read Order
`00`→`01`→`02`→`03`; middleware `05`+`06`; validation/RPC `08`+`09`; deploy `14`.

## Prereqs
TypeScript/JS and Web Standards (`Request`/`Response`/`fetch`).
