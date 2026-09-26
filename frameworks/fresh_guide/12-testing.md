# 12 — Testing

> app.handler(), middleware/route/layout/island tests, Vite builder, Deno.test

## 1. `app.handler()` — Request → Response

`.handler()` retorna uma função `(Request) => Promise<Response>` pronta para testes:

```ts
import { App } from "fresh";

const app = new App().get("/", () => new Response("hello"));
const handler = app.handler();
const response = await handler(new Request("http://localhost"));
console.log(await response.text()); // "hello"
```

Sem servidor, sem porta. Testes rodam isolados e rápidos.

## 2. Testing Middlewares

```ts
// tests/middleware.test.ts
import { expect } from "@std/expect";
import { App } from "fresh";
import { define, type State } from "../utils.ts";

const middleware = define.middleware((ctx) => {
  ctx.state.text = "middleware text";
  return ctx.next();
});

Deno.test("My middleware - sets ctx.state.text", async () => {
  const handler = new App<State>()
    .use(middleware)
    .get("/", (ctx) => new Response(ctx.state.text || ""))
    .handler();

  const res = await handler(new Request("http://localhost"));
  const text = await res.text();
  expect(text).toEqual("middleware text");
});
```

**Padrão:** `.use(middleware)` → `.get("/", handler)` → `.handler()` → `await handler(new Request(...))`.

Para testar middleware que modifica headers:

```ts
const auth = define.middleware(async (ctx) => {
  if (!ctx.url.searchParams.has("token")) {
    return new Response("Unauthorized", { status: 401 });
  }
  ctx.state.user = { id: 1 };
  return await ctx.next();
});

Deno.test("Auth middleware - blocks unauthenticated", async () => {
  const handler = new App<State>()
    .use(auth)
    .get("/", () => new Response("ok"))
    .handler();

  const res = await handler(new Request("http://localhost"));
  expect(res.status).toEqual(401);
});
```

## 3. Testing `appWrapper`

```tsx
// tests/appWrapper.test.tsx
import { expect } from "@std/expect";
import { App } from "fresh";
import { define, type State } from "../utils.ts";

const AppWrapper = define.layout(function AppWrapper({ Component }) {
  return (
    <html lang="en">
      <head><meta charset="utf-8" /><title>My App</title></head>
      <body><Component /></body>
    </html>
  );
});

Deno.test("App Wrapper - renders title and content", async () => {
  const handler = new App<State>()
    .appWrapper(AppWrapper)
    .get("/", (ctx) => ctx.render(<h1>hello</h1>))
    .handler();

  const res = await handler(new Request("http://localhost"));
  const text = await res.text();
  expect(text).toContain("My App");
  expect(text).toContain("hello");
});
```

**Nota:** `appWrapper` e layout são tipos diferentes. `appWrapper` sempre envolve tudo (é o `_app.tsx`). Use `.appWrapper()` para o shell HTML, `.layout()` para nesting.

## 4. Testing Layouts

```tsx
const MyLayout = define.layout(function MyLayout({ Component }) {
  return <div><h1>My Layout</h1><Component /></div>;
});

Deno.test("MyLayout", async () => {
  const handler = new App<State>()
    .layout(MyLayout)
    .get("/", (ctx) => ctx.render(<h1>hello</h1>))
    .handler();

  const res = await handler(new Request("http://localhost"));
  const text = await res.text();
  expect(text).toContain("My Layout");
  expect(text).toContain("hello");
});
```

**Layout nesting:**

```tsx
const Outer = define.layout(({ Component }) => (
  <div data-outer><Component /></div>
));
const Inner = define.layout(({ Component }) => (
  <nav data-inner><Component /></nav>
));

Deno.test("Nested layouts", async () => {
  const handler = new App<State>()
    .layout(Outer)
    .layout(Inner)
    .get("/", (ctx) => ctx.render(<p>page</p>))
    .handler();

  const html = await (await handler(new Request("http://localhost"))).text();
  expect(html).toContain(`data-outer`);
  expect(html).toContain(`data-inner`);
  expect(html).toContain("page");
});
```

## 5. Testing Routes & Handlers

Importe o handler real do arquivo de rota para testar isoladamente:

```ts
// tests/routes.test.ts
import { expect } from "@std/expect";
import { App } from "fresh";
import { type State } from "../utils.ts";
import { handler as apiHandler } from "../routes/api/[name].tsx";

Deno.test("API route returns name", async () => {
  const app = new App<State>()
    .get("/api/:name", apiHandler.GET)
    .handler();

  const response = await app(new Request("http://localhost/api/joe"));
  const text = await response.text();
  expect(text).toEqual("Hello, Joe!");
});
```

**Handler com state e middlewares reais:**

```ts
import { handler as protectedRoute } from "../routes/dashboard.tsx";
import { authMiddleware } from "../routes/_middleware.ts";

Deno.test("Protected route with real middleware", async () => {
  const app = new App<State>()
    .use(authMiddleware)
    .get("/dashboard", protectedRoute.GET)
    .handler();

  const res = await app(
    new Request("http://localhost/dashboard", {
      headers: { Cookie: "session=valid-token" },
    })
  );
  expect(res.status).toEqual(200);
});
```

## 6. Testing Islands — SSR

Arquivo **deve** ser `.tsx` (JSX envolvendo island):

```tsx
// tests/island-ssr.test.tsx
import { expect } from "@std/expect";
import { App } from "fresh";
import { useSignal } from "@preact/signals";
import { type State } from "../utils.ts";
import Counter from "../islands/Counter.tsx";

function CounterPage() {
  const count = useSignal(3);
  return <div><h1>Counter Test Page</h1><Counter count={count} /></div>;
}

Deno.test("Counter page renders island", async () => {
  const app = new App<State>()
    .get("/counter", (ctx) => ctx.render(<CounterPage />))
    .handler();

  const response = await app(new Request("http://localhost/counter"));
  const html = await response.text();
  expect(html).toContain("Counter Test Page");
  expect(html).toContain("3");
});
```

**Testando hidratação do sinal:**

```tsx
import { IS_BROWSER } from "$fresh/runtime.ts";

Deno.test("Signal serialization in HTML", async () => {
  const app = new App<State>()
    .get("/", (ctx) => {
      const count = useSignal(42);
      return ctx.render(<Counter count={count} />);
    })
    .handler();

  const html = await (await app(new Request("http://localhost"))).text();
  expect(html).toContain(`"value":42`); // signal serializado no JSON de estado
});
```

## 7. Testing Islands — Full Build (Client Interactivity)

Para testar interatividade client-side (event listeners, DOM mutations), faça build completo:

```tsx
// tests/test-utils.ts
import { createBuilder, type InlineConfig } from "vite";
import * as path from "@std/path";

export const FRESH_BUILD_CONFIG: InlineConfig = {
  logLevel: "error",
  root: "./",
  build: { emptyOutDir: true },
  environments: {
    ssr: { build: { outDir: path.join("_fresh", "server") } },
    client: { build: { outDir: path.join("_fresh", "client") } },
  },
};

export async function buildFreshApp(config: InlineConfig = FRESH_BUILD_CONFIG) {
  const builder = await createBuilder(config);
  await builder.buildApp();
  return await import("../_fresh/server.js");
}

export function startTestServer(app: {
  default: { fetch: (req: Request) => Promise<Response> };
}) {
  const server = Deno.serve({ port: 0, handler: app.default.fetch });
  const { port } = server.addr as Deno.NetAddr;
  const address = `http://localhost:${port}`;
  return { server, address };
}
```

```tsx
// tests/island-client.test.tsx
import { expect } from "@std/expect";
import { buildFreshApp, startTestServer } from "./test-utils.ts";

const app = await buildFreshApp();

Deno.test("Counter island", async () => {
  const { server, address } = startTestServer(app);
  try {
    const response = await fetch(`${address}/`);
    const html = await response.text();
    expect(html).toContain("3");
  } finally {
    await server.shutdown();
  }
});
```

> **Na prática:** Testes SSR cobrem ~90% dos casos. Use full build apenas para lógica complexa de islands (event handlers, WebSocket interativo, custom elements).

## 8. Legacy Builder Tests (pre-Vite)

Para projetos que ainda usam o Builder antigo:

```ts
const builder = new Builder();
const applySnapshot = await builder.build({ snapshot: "memory" });

function testApp() {
  const app = new App().get("/", () => new Response("hello")).fsRoutes();
  applySnapshot(app);
  return app;
}

Deno.test("My Test", async () => {
  const handler = testApp().handler();
  const response = await handler(new Request("http://localhost"));
  expect(await response.text()).toEqual("hello");
});
```

**Snapshot file (reuso entre testes):**

```ts
const builder = new Builder();
const applySnapshot = await builder.build({ snapshot: "path/to/snapshot.json" });
// mesma lógica acima
```

## 9. Testing Checklist

| Item | Detalhe |
|------|---------|
| Assertions | `@std/expect` — `.toEqual()`, `.toContain()`, `.toBe()`, `.toMatch()` |
| Runner | `Deno.test()` nativo. `deno test --allow-net --allow-read` |
| JSX | Extensão **`.tsx`** obrigatória para qualquer teste com JSX |
| Typed state | `new App<State>()` para `ctx.state` tipado |
| Handler | Sempre `.handler()` no fim da chain, retorna `(Request) => Promise<Response>` |
| Build | `createBuilder()` + `builder.buildApp()`, importa `_fresh/server.js` |
| Performance | Faça build uma vez por suite (top-level `await`), reutilize entre testes |
| Cleanup | `server.shutdown()` no `finally` para testes com servidor real |
| Headers | `new Request("http://localhost", { headers: { Cookie: "..." } })` |
| POST body | `new Request("http://localhost", { method: "POST", body: formData })` |

## 10. Exemplo Completo — Suite de Testes

```tsx
// tests/app.test.tsx
import { expect } from "@std/expect";
import { App } from "fresh";
import { define, type State } from "../utils.ts";
import { handler as indexHandler } from "../routes/index.tsx";

const testMiddleware = define.middleware((ctx) => {
  ctx.state.title = "Test App";
  return ctx.next();
});

const testLayout = define.layout(({ Component }) => (
  <html><body><Component /></body></html>
));

Deno.test("GET / returns 200 with layout", async () => {
  const handler = new App<State>()
    .layout(testLayout)
    .use(testMiddleware)
    .get("/", indexHandler.GET!)
    .handler();

  const res = await handler(new Request("http://localhost"));
  expect(res.status).toEqual(200);
  expect(res.headers.get("content-type")).toContain("text/html");
});

Deno.test("POST /api returns 405 if no handler", async () => {
  const handler = new App<State>()
    .get("/", indexHandler.GET!)
    .handler();

  const res = await handler(
    new Request("http://localhost", { method: "POST" })
  );
  expect(res.status).toEqual(405);
});

Deno.test("404 on unknown route", async () => {
  const handler = new App<State>()
    .get("/", () => new Response("ok"))
    .handler();

  const res = await handler(new Request("http://localhost/nope"));
  expect(res.status).toEqual(404);
});
```
