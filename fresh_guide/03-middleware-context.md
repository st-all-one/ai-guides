# 03 — Middleware, Context API & Architecture

> Onion model, define.middleware(), file-based middleware, ctx.* API completa, request lifecycle

## 0. Fresh Architecture — Request Lifecycle

Fresh is a **server-first** web framework. Pages are fully rendered on the server. Only `islands/` components ship JavaScript to the browser.

```
Incoming Request
  │
  ▼
┌─────────────────────────────────────────────┐
│  Global Middleware                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │
│  │staticFiles│→│ security │→│  session    │→ │
│  └─────────┘  └─────────┘  └─────────────┘  │
│              ctx.next() chain (onion)       │
│                   │                         │
├───────────────────▼─────────────────────────┤
│  Route Matching                              │
│  ┌─────────────┐  ┌──────────────┐          │
│  │ Scoped MW   │→│ Route Handler │          │
│  │(/admin/*)   │  │ GET/POST/... │          │
│  └─────────────┘  └──────┬───────┘          │
│                          │                  │
├──────────────────────────▼──────────────────┤
│  Rendering                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ _app.tsx │→│_layout   │→│  page.tsx  │  │
│  │(HTML/head│ │  (*.tsx) │  │ (SSR HTML) │  │
│  │ /body)   │  │          │  │           │  │
│  └──────────┘  └──────────┘  └─────┬─────┘  │
│                                    │        │
├────────────────────────────────────▼────────┤
│  Response                                    │
│  ┌──────────────────────────────────────┐    │
│  │ Full HTML document                   │    │
│  │ + island hydration markers           │    │
│  │ + <script> for island JS             │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                   │
                   ▼
              Browser receives full HTML
                   │
                   ▼
          Islands hydrate (only interactive parts)
```

**Key principles:**

- **Server-first rendering:** Pages fully rendered to HTML before browser receives them. Immediate visibility (no blank loading screens), complete SEO content, works without JS.
- **Islands architecture:** Only `islands/` components ship JS to client. A page with a single button ships JS for that button only — not the entire page.
- **Middleware chain:** Executes in registration order. Each middleware calls `ctx.next()` to pass control — onion pattern where code runs before AND after the handler.
- **Layout inheritance:** Layouts nest by directory depth. `routes/blog/post.tsx` gets `routes/_layout.tsx` → `routes/blog/_layout.tsx` → page. `_app.tsx` wraps everything.
- **Build pipeline:** `deno task build` → Vite discovers islands + deps → bundles with code splitting → generates `_fresh/server.js` → hashes assets for cache busting.
- **Production:** `deno serve -A _fresh/server.js`. Dev: Vite HMR via Prefresh.

---

## 1. Middleware Pattern — Onion Model

```ts
// routes/_middleware.ts — logging example
app.use(async (ctx) => {
  console.log("Before:", ctx.url.pathname);         // execute before next
  const t0 = performance.now();
  const response = await ctx.next();                 // call next in chain
  const ms = performance.now() - t0;
  console.log("After:", response.status, `${ms.toFixed(2)}ms`);
  return response;                                   // must return response
});
```

**Golden rule:** Always `return await ctx.next()` (or `return ctx.next()` without `await`). Middlewares closer to the request wrap middlewares further down.

```
Request  -->  M1 (before) -->  M2 (before) -->  Route Handler
           <-- M1 (after)  <-- M2 (after)  <--
```

## 2. define.middleware() — Type-Safe Helper

```ts
import { define } from "fresh";

const middleware = define.middleware(async (ctx) => {
  // ctx is fully typed (state, params, route, etc.)
  const resp = await ctx.next();
  resp.headers.set("X-Powered-By", "Fresh");
  return resp;
});

export default middleware;
```

## 3. File-Based Middleware — routes/_middleware.ts

### Single middleware (default export)

```ts
// routes/admin/_middleware.ts
import { define } from "fresh";

export default define.middleware(async (ctx) => {
  const auth = ctx.req.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });
  return await ctx.next();
});
```

### Array of middlewares (default export array)

```ts
// routes/admin/_middleware.ts
import { define } from "fresh";

const log = define.middleware(async (ctx) => {
  console.log("[admin]", ctx.url.pathname);
  return await ctx.next();
});

const auth = define.middleware(async (ctx) => {
  const token = ctx.req.headers.get("Authorization");
  if (token !== "Bearer secret") return new Response("Forbidden", { status: 403 });
  return await ctx.next();
});

export default [log, auth];  // order: log → auth → route
```

**Scope:** `routes/admin/_middleware.ts` applies to `/admin` and all subdirectories (`/admin/*`). A `routes/_middleware.ts` at root applies globally (same as `app.use()`).

## 4. Scoped Middleware — app.use("/prefix/*", middleware)

```ts
// main.ts
import { App } from "fresh";

const app = new App();

// Only runs for /admin/*
app.use("/admin/*", async (ctx) => {
  const session = ctx.req.headers.get("Cookie");
  if (!session?.includes("auth=1")) {
    return ctx.redirect("/login");
  }
  return await ctx.next();
});

// Only runs for /api/v1/*
app.use("/api/v1/*", define.middleware(async (ctx) => {
  const apiKey = ctx.req.headers.get("X-API-Key");
  if (apiKey !== Deno.env.get("API_KEY")) {
    return new Response("Invalid API key", { status: 401 });
  }
  return await ctx.next();
}));

await app.build();
Deno.serve(app.fetch);
```

**Path matching:** Uses URLPattern under the hood. Supports `*` wildcards and `:param` segments.

## 5. Global Middleware — app.use(middleware)

```ts
const app = new App<{ startedAt: number }>();

// Runs on EVERY request
app.use(async (ctx) => {
  ctx.state.startedAt = Date.now();
  return await ctx.next();
});
```

## 6. Multiple Middlewares & Ordering

```ts
// Order: top to bottom
app.use(m1, m2, m3);  // m1 runs first, then m2, then m3, then route

// Middleware AFTER .get() won't apply to that .get() handler
app.get("/hello", handler);   // m1 runs before handler; m2 does NOT
app.use(m2);                  // m2 only applies to routes defined below it
```

```ts
// Multiple scoped middlewares for the same path
app.use("/api/*", rateLimiter, auth, logger);
// rateLimiter → auth → logger → route → logger (after) → auth (after) → rateLimiter (after)
```

```ts
// Mixing global + scoped
app.use(timingMiddleware);               // global
app.use("/admin/*", adminAuth);          // scoped
app.use("/api/*", apiAuth, apiLogger);   // scoped with multiple
// Request to /admin/dashboard:
//   timing (before) → adminAuth (before) → route → adminAuth (after) → timing (after)
```

## 7. Context (ctx) API Reference

```ts
// Full ctx type (simplified):
interface FreshContext<State = Record<string, unknown>> {
  config: ResolvedFreshConfig;  // basePath, build.target, plugins, etc.
  url: URL;                     // Full request URL
  req: Request;                 // Original HTTP request
  route: string | null;         // Matched route pattern, e.g. "/blog/:slug"
  params: Record<string, string>;  // Route params from URLPattern
  state: State;                 // Typed shared state
  error: unknown | null;        // Caught error (available in error pages)
  locals: Record<string, unknown>; // Locals passed from handlers
  redirect(url: string | URL, status?: number): Response;
  render(jsx: VNode, opts?: RenderOptions): Response;
  next(): Promise<Response>;
  upgrade(handlers?: WebSocketHandlers, opts?: UpgradeOptions): Response;
}
```

### Key patterns:

```ts
// ctx.url — parse query params, pathname, origin
app.use(async (ctx) => {
  const page = ctx.url.searchParams.get("page") ?? "1";
  const locale = ctx.url.pathname.startsWith("/en") ? "en" : "pt";
  return await ctx.next();
});

// ctx.params — route params like :id
// File: routes/users/[id].tsx → ctx.params.id = "42"

// ctx.route — check which route matched
app.use(async (ctx) => {
  if (ctx.route === "/admin/settings") {
    // specific logic for settings page
  }
  return await ctx.next();
});

// ctx.req — raw Request: headers, method, body, signal, etc.
app.use(async (ctx) => {
  const contentType = ctx.req.headers.get("content-type");
  const method = ctx.req.method;
  if (method === "POST" && contentType?.includes("application/json")) {
    const body = await ctx.req.json();  // clone first if downstream also reads body
  }
  return await ctx.next();
});
```

## 8. ctx.state Pattern — Typed Shared State

```ts
// Define State interface
interface State {
  user?: { id: string; email: string; role: "admin" | "user" };
  session?: string;
  requestId: string;
  startedAt: number;
}

// Typed App
const app = new App<State>();

// Auth middleware enriches state
app.use(async (ctx) => {
  const token = ctx.req.headers.get("Authorization");
  if (token) {
    // lookup user from DB / JWT
    ctx.state.user = { id: "1", email: "a@b.com", role: "admin" };
  }
  return await ctx.next();
});

// Later — fully typed
app.get("/dashboard", (ctx) => {
  // ctx.state.user is typed as { id: string; email: string; role: "admin" | "user" } | undefined
  if (!ctx.state.user) return ctx.redirect("/login");
  return ctx.render(<Dashboard user={ctx.state.user} />);
});
```

## 9. createDefine with State

```ts
// lib/define.ts — shared definition file, importable from any module
import { createDefine } from "fresh";

export interface State {
  user?: { id: string; email: string };
  csrfToken: string;
}

export const define = createDefine<State>();
```

```ts
// routes/profile.tsx
import { define } from "../lib/define.ts";

define.page((ctx) => {
  // ctx.state.user is typed — no need to cast
  return <h1>Welcome, {ctx.state.user?.email}</h1>;
});

// routes/_middleware.ts
import { define } from "../lib/define.ts";

export default define.middleware(async (ctx) => {
  // ctx.state.csrfToken is typed
  ctx.state.csrfToken = crypto.randomUUID();
  return await ctx.next();
});
```

## 10. Common Middleware Patterns

### Auth Guard

```ts
import { define } from "fresh";
import type { State } from "../lib/define.ts";

export default define.middleware(async (ctx) => {
  const session = ctx.req.headers.get("Cookie")?.match(/session=([^;]+)/)?.[1];
  if (!session) return ctx.redirect("/login");

  const payload = await verifyJWT(session);
  if (!payload) return ctx.redirect("/login");

  ctx.state.user = { id: payload.sub, email: payload.email };
  return await ctx.next();
});
```

### Timing Middleware (Server-Timing header)

```ts
app.use(async (ctx) => {
  const t0 = performance.now();
  const tName = `route=${ctx.url.pathname}`;

  const response = await ctx.next();
  const dur = performance.now() - t0;

  response.headers.set("Server-Timing", `${tName};dur=${dur.toFixed(2)}`);
  return response;
});
```

### Security Headers

```ts
app.use(async (ctx) => {
  const response = await ctx.next();

  const headers: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
  };

  // Only set Strict-Transport-Security in production (prevents localhost issues)
  if (ctx.url.protocol === "https:") {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }

  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
});
```

### Request ID

```ts
app.use(async (ctx) => {
  const requestId = ctx.req.headers.get("X-Request-Id") ?? crypto.randomUUID();
  ctx.state.requestId = requestId;

  const response = await ctx.next();
  response.headers.set("X-Request-Id", requestId);
  return response;
});
```

### Redirect Old URLs

```ts
const redirectMap: Record<string, string> = {
  "/old-blog": "/blog",
  "/v1/api": "/api/v2",
  "/contact-us": "/contact",
};

app.use(async (ctx) => {
  const target = redirectMap[ctx.url.pathname];
  if (target) return ctx.redirect(target, 301);  // permanent redirect
  return await ctx.next();
});
```

### Subdomain Routing

```ts
app.use(async (ctx) => {
  const host = ctx.url.hostname;

  if (host === "app.example.com") {
    ctx.state.tenant = "app";
  } else if (host === "admin.example.com") {
    ctx.state.tenant = "admin";
  } else {
    ctx.state.tenant = "main";
  }

  return await ctx.next();
});
```

## 11. ctx.redirect() — Open Redirect Protection

```ts
// Redirect to external URL with protection
app.get("/out", (ctx) => {
  const target = ctx.url.searchParams.get("to");

  // ❌ Vulnerable — attacker can set to=https://evil.com
  // return ctx.redirect(target);

  // ✅ Safe — ctx.redirect() rejects protocol-relative URLs (//evil.com)
  if (target) return ctx.redirect(target);

  // ✅ Explicit external redirect
  return new Response(null, { status: 302, headers: { Location: "https://external.com" } });
});

// Default is 302 (temporary). Use 301 for permanent:
ctx.redirect("/new-location", 301);
```

**Protection:** `ctx.redirect()` internally checks for `//` prefix (protocol-relative URLs) and throws — preventing open redirect attacks. Always use `ctx.redirect()` over manual `Response` for internal redirects.

## 12. Lazy Middleware

```ts
// Heavy middleware loaded only when /foo/bar is hit
app.use("/foo/bar", async (ctx) => {
  const mod = await import("./middleware/heavy-auth.ts");
  const mw = mod.default;  // or mod.myNamedMiddleware
  return await mw(ctx);    // delegate to dynamically imported middleware
});
```

```ts
// Type-safe lazy middleware with define
app.use("/admin/*", async (ctx) => {
  const { adminGuard } = await import("./middleware/admin.ts");
  return await adminGuard(ctx);
});
```
