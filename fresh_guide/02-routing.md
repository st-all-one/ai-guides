# 02 — Routing

> File-based + programmatic routing, URLPattern, handlers, dynamic params, `.fsRoutes()`.

---

## 1. File-based routing (`routes/`)

Every file in `routes/` becomes a route. File name → URL pattern:

| File | Pattern | Matches |
|------|---------|---------|
| `index.ts` | `/` | `/` |
| `about.ts` | `/about` | `/about` |
| `blog/index.ts` | `/blog` | `/blog` |
| `blog/[slug].ts` | `/blog/:slug` | `/blog/foo`, `/blog/bar` |
| `blog/[slug]/comments.ts` | `/blog/:slug/comments` | `/blog/foo/comments` |
| `old/[...path].ts` | `/old/:path*` | `/old/foo`, `/old/bar/baz` |
| `docs/[[version]]/index.ts` | `/docs{/:version}?` | `/docs`, `/docs/latest` |
| `[[name]].ts` | `/{:name}?` | `/`, `/foo`, `/bar` |

Rules:
- `[param]` — required dynamic segment → `:param`
- `[...param]` — catch-all (0+ segments) → `:param*`
- `[[param]]` — optional dynamic segment → `{:param}?`

### File contents for each route type

**Static page with default export (component):**

```ts
// routes/about.ts
import { define } from "@/utils.ts";

export default define.page<typeof handler>(function AboutPage() {
  return (
    <main>
      <h1>About</h1>
    </main>
  );
});
```

**Dynamic segment — no extra config needed:**

```ts
// routes/blog/[slug].ts
import { define } from "@/utils.ts";
import type { Handlers, PageProps } from "$fresh/server.ts";

interface Data { post: { title: string; body: string }; }

export const handler: Handlers<Data> = {
  GET(_req, ctx) {
    const { slug } = ctx.params;
    const post = db.get(slug);
    return ctx.render({ post });
  },
};

export default define.page<typeof handler>(function BlogPost({ data }: PageProps<Data>) {
  return <Article post={data.post} />;
});
```

**Catch-all:**

```ts
// routes/old/[...path].ts
import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET(_req, ctx) {
    const path = ctx.params.path; // string (e.g. "foo/bar")
    return ctx.render({ path });
  },
});

export default define.page<typeof handler>(function CatchAll({ data }) {
  return <pre>{data.path}</pre>;
});
```

**Optional param:**

```ts
// routes/docs/[[version]]/index.ts
import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET(_req, ctx) {
    const version = ctx.params.version ?? "main"; // undefined if omitted
    return ctx.render({ version });
  },
});

export default define.page<typeof handler>(function Docs({ data }) {
  return <span>{data.version}</span>;
});
```

**Root optional catch-all:**

```ts
// routes/[[name]].ts
import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET(_req, ctx) {
    const name = ctx.params.name; // undefined for "/", "foo" for "/foo"
    return ctx.render({ name });
  },
});

export default define.page<typeof handler>(function RootOptional({ data }) {
  if (!data.name) return <Home />;
  return <UserProfile name={data.name} />;
});
```

---

## 2. Route Groups (`(group-name)/`)

Group routes under separate layouts. Parentheses prevent the folder name from becoming a route segment.

```
routes/
  (marketing)/
    _layout.tsx    → marketing-specific layout
    index.ts       → /
    pricing.ts     → /pricing
  (info)/
    _layout.tsx    → info-specific layout
    about.ts       → /about
    contact.ts     → /contact
```

```ts
// routes/(marketing)/_layout.tsx
import { define } from "@/utils.ts";

export default define.page(function MarketingLayout({ Component }) {
  return (
    <div class="marketing-shell">
      <MarketingNav />
      <Component />
    </div>
  );
});
```

**WARNING:** A route (e.g. `/about`) must exist in only ONE group. If `(marketing)/about.ts` and `(info)/about.ts` both exist, build fails.

---

## 3. Special directories in `routes/`

| Directory | Behavior |
|-----------|----------|
| `routes/(_islands)/` | Treated as islands (same as top-level `islands/`) |
| `routes/(_components)/` | Non-island components, parentheses prevent routing |

```ts
// routes/(_components)/Button.ts — component, NOT a route
export function Button(props: { label: string }) {
  return <button>{props.label}</button>;
}

// routes/(_islands)/Cart.ts — island, NOT a route
import { useSignal } from "@preact/signals";

export default function Cart() {
  const count = useSignal(0);
  return <button onClick={() => count.value++}>{count}</button>;
}
```

---

## 4. `routeOverride` — Custom URLPattern

Override the file-derived pattern with a custom URLPattern string:

```ts
// routes/x/[...path].ts
import type { RouteConfig } from "$fresh/server.ts";

export const config: RouteConfig = {
  routeOverride: "/x/:module@:version/:path*",
};

export const handler = define.handlers({
  GET(_req, ctx) {
    const { module, version, path } = ctx.params;
    // /x/react@18/hooks/useState → module="react", version="18", path="hooks/useState"
    return ctx.render({ module, version, path });
  },
});
```

- `:param` — single segment (no `/`)
- `:param*` — zero or more segments (like `[...]`)
- `:param+` — one or more segments
- `{/group}?` — optional group
- `\\d+` etc — regex on segment

---

## 5. `css` export — Route-specific CSS

```ts
// routes/dashboard.ts
import type { RouteConfig } from "$fresh/server.ts";

export const css = ["./assets/dashboard.css"];

export const config: RouteConfig = {
  css: ["./assets/dashboard.css"],
};

export default define.page(function Dashboard() {
  return <div class="dashboard">...</div>;
});
```

CSS is loaded only when the route renders. No runtime JS overhead for pages that never hit the route.

---

## 6. Method-specific handlers (file-based)

Export `handler` object with `define.handlers()`:

```ts
// routes/api/users.ts
import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET(_ctx) {
    return Response.json([{ id: 1, name: "Alice" }]);
  },
  async POST(req) {
    const body = await req.json();
    const user = await db.insert(body);
    return Response.json(user, { status: 201 });
  },
  DELETE(_req, ctx) {
    await db.delete(ctx.params.id);
    return new Response(null, { status: 204 });
  },
});
```

**Single function = catch-all** (handles every HTTP method):

```ts
export const handler = define.handlers((req) => {
  return new Response(`You sent a ${req.method}`);
});
```

**HEAD auto-fallback:** If no `HEAD` handler, Fresh uses `GET` handler (without body).  
**Undefined method → 405 Method Not Allowed.**

**API-only route (no page component):**

```ts
// routes/api/users.ts — handler only, no default export
export const handler = define.handlers({
  GET() { return Response.json(db.list()); },
  async POST(req) {
    const user = await req.json();
    return Response.json(db.add(user), { status: 201 });
  },
});
// No `export default` → pure API endpoint
```

---

## 7. Handler signatures (full)

Every handler method gets `(request, context)`:

```ts
import type { Handlers, FreshContext } from "$fresh/server.ts";

interface State { session: string; db: Database; }

export const handler: Handlers<unknown, State> = {
  POST(req: Request, ctx: FreshContext<State>) {
    // req — native Request
    // ctx.params — { slug: string, ... }
    // ctx.state — { session, db }
    // ctx.render(data) — SSR a page component
    // ctx.renderNotFound() — render _error.tsx with 404
    // ctx.url — URL instance of current request
    // ctx.route — matched URLPattern string
    // ctx.config — RouteConfig from the file
    return new Response(null, { status: 200 });
  },
};
```

---

## 8. Programmatic routing (`App` class methods)

```ts
const app = new App();

app.get("/", homeHandler);
app.get("/about", middlewareA, middlewareB, aboutHandler);
app.post("/submit", csrfMiddleware, submitHandler);
app.put("/api/item/:id", updateHandler);
app.delete("/api/item/:id", deleteHandler);
app.patch("/api/item/:id", patchHandler);
app.options("/api/item/:id", optionsHandler);
app.head("/api/item/:id", headHandler);
app.all("/health", healthHandler); // GET,POST,PUT,... all verbs
```

**Multiple middleware per route:**

```ts
const auth = define.middleware((_req, ctx) => {
  if (!ctx.state.session) return new Response(null, { status: 302, headers: { Location: "/" } });
  return ctx.next();
});

app.get("/admin", auth, adminHandler);
app.get("/dashboard", auth, dashboardHandler);
```

---

## 9. Lazy middleware/handler loading

Dynamic `import()` — code loaded only when the route is hit:

```ts
app.get("/about", async () => {
  const mod = await import("./about-handler.ts");
  return mod.default;
});

app.get("/admin", async () => {
  const { authMiddleware } = await import("./auth.ts");
  const { adminPage } = await import("./admin.ts");
  const ctx = await authMiddleware();
  if (ctx instanceof Response) return ctx;
  return adminPage();
});
```

Lazy `.get()` signature:
```ts
app.get("/path", lazyOrMiddleware, ...)
  // lazyOrMiddleware can be:
  //   - async () => Response | ResponseInit
  //   - define.middleware() result
```

---

## 10. Route matching priority

1. **Static routes first** — exact matches (`/about`, `/posts/featured`)
2. **Dynamic routes** — in registration order

```ts
app.get("/posts/featured", featuredHandler); // always matched first
app.get("/posts/:id", postHandler);          // matched second
app.get("/:slug", catchHandler);             // matched last
```

For file-based routes with `.fsRoutes()`, Fresh auto-sorts: static files before dynamic ones, then within dynamic routes, more specific patterns before less specific.

---

## 11. Dynamic params (`ctx.params`)

Available in every handler method and `define.page()` via handler type:

```ts
export const handler = define.handlers({
  GET(_req, ctx) {
    ctx.params.id;     // string — from /:id
    ctx.params.slug;   // string — from /:slug
    ctx.params.path;   // string — from /:path* (joined with "/")
    ctx.params.version; // string | undefined — from optional [[version]]
    return ctx.render();
  },
});
```

Access in page component:

```ts
export default define.page<typeof handler>(function Page({ params }) {
  return <span>{params.slug}</span>;
});
```

---

## 12. `.fsRoutes()` — Inject all file-based routes

```ts
// main.ts
import { App } from "$fresh/server.ts";

const app = new App();

// middleware that runs before all file routes
app.use(authMiddleware);

app.fsRoutes(); // mounts ALL routes from routes/

// OR mount under a prefix:
const adminApp = new App().fsRoutes("/admin");
app.mountApp("/", adminApp);
```

**`.fsRoutes(prefix?)` signature:**
- No arg — routes at root `/`
- With string arg (e.g. `"/app"`) — all routes prefixed by `/app`

---

## 13. `.mountApp()` — Mount entire sub-app

```ts
// main.ts
import { App } from "$fresh/server.ts";
import { staticFiles } from "$fresh/server.ts/runtime";

const someRoutes = (): App => {
  const app = new App();
  app.get("/sitemap.xml", sitemapHandler);
  app.get("/robots.txt", robotsHandler);
  return app;
};

const app = new App()
  .use(staticFiles())
  .mountApp("/", someRoutes())
  .fsRoutes();

await app.listen();
```

**Multiple mounts:**

```ts
const apiApp = new App()
  .get("/status", statusHandler)
  .post("/webhook", webhookHandler);

const app = new App()
  .mountApp("/api/v1", apiApp)
  .fsRoutes();
```

---

## 14. Pattern reference

| Pattern | URLPattern equivalent | Matches |
|---------|----------------------|---------|
| `[slug]` | `:slug` | `/hello`, `/world` |
| `[...path]` | `:path*` | `/a`, `/a/b`, `/a/b/c` |
| `[...path]+` | `:path+` | `/a`, `/a/b` (NOT `/`) |
| `[[lang]]` | `{:lang}?` | `/`, `/en`, `/pt` |
| `[[...rest]]` | `{:rest*}?` | `/`, `/a`, `/a/b` |

**URLPattern shorthand for `routeOverride`:**

```ts
export const config: RouteConfig = {
  routeOverride: "/api/:version/v:major(\\d+)/:path*",
};
// ctx.params.version, ctx.params.major, ctx.params.path
```

---

## Cheat sheet

```txt
Task                                    → Approach
─────────────────────────────────────────────────────────────
Static page                             → routes/about.ts (default export)
Dynamic route                           → routes/blog/[slug].ts
Catch-all                               → routes/[...path].ts
Optional param                          → routes/[[version]]/index.ts
Route-specific CSS                      → export const css = [...]
Custom URLPattern                       → export const config = { routeOverride: "..." }
API endpoint (no page)                  → export handlers, no default export
Method filtering                        → define.handlers({ GET, POST, ... })
Group routes with shared layout         → (group)/_layout.tsx + pages
Island inside routes/                   → ( _islands )/
Component inside routes/ (not routed)   → ( _components )/
Lazy-loaded handler                     → app.get("/", async () => { const m = await import(...); ... })
Mount file routes                       → app.fsRoutes()
Mount sub-app                           → app.mountApp("/prefix", subApp)
Programmatic GET/POST/...               → app.get(...), app.post(...), etc.
All verbs                               → app.all(...)
HEAD fallback                           → automatic (uses GET)
Undefined method                        → 405 Method Not Allowed
Static before dynamic                   → automatic in fsRoutes, manual in App methods
```

---

## 15. Active Links — `aria-current`

Fresh automatically adds the `aria-current` attribute to `<a>` elements that match the current URL, improving accessibility and enabling CSS styling.

| Attribute | Match rule |
|-----------|-----------|
| `aria-current="page"` | Exact path match (e.g., link to `/docs` when on `/docs`) |
| `aria-current="true"` | Ancestor match (e.g., link to `/docs` when on `/docs/intro`) |

**Query parameters:** A link with `?sort=name` only gets `aria-current="page"` when the current URL also has `?sort=name`. Links without query params match regardless of the current URL's query string.

**Preserving custom `aria-current`:** If you set `aria-current` yourself, Fresh leaves it untouched — useful with daisyUI tabs or other component libraries that manage their own active state.

**CSS styling:**

```css
a[aria-current="page"] { color: green; }
a[aria-current="true"] { color: peachpuff; }
```

**Tailwind:**

```tsx
<a href="/foo" class="aria-[current]:text-green-600">Link</a>
```

**Usage in nav:**

```tsx
// components/Nav.tsx
function Nav() {
  return (
    <nav>
      <a href="/">Home</a>            {/* auto-injected aria-current */}
      <a href="/docs">Docs</a>        {/* aria-current="page" on /docs, "true" on /docs/intro */}
      <a href="/blog">Blog</a>
    </nav>
  );
}
```

No config needed — Fresh handles this automatically for every `<a>` element rendered server-side.```
