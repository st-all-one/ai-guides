# Fresh Project Setup

## 1. Init

```bash
deno run -Ar jsr:@fresh/init my-project
```

Prompts:
1. **Project name** — defaults to folder name
2. **Tailwind CSS** — y/n, sets up tailwind plugin in vite.config.ts
3. **VS Code** — y/n, generates `.vscode/settings.json` + `extensions.json`

Flags:
- `--force` — overwrite existing dir
- `--tailwind` — skip prompt, enable tailwind
- `--vscode` — skip prompt, enable vscode

Output: scaffolds a complete Fresh project.

## 2. Project Structure

```
my-project/
├── components/        # Non-island Preact components (server-rendered only)
├── islands/           # Interactive components — hydrated client-side after SSR
├── routes/            # File-system routes (deno-fresh-kit style)
│   ├── api/           # API routes — files with NO default export = API endpoint
│   │   └── users.ts   # → GET/POST /api/users (handler export named by method)
│   ├── _app.tsx       # Outer HTML shell (<html>/<head>/<body>) — ONCE per app
│   ├── _layout.tsx    # Layouts wrap page content — nested by directory
│   ├── _middleware.ts # Route middleware (runs before handler)
│   ├── index.tsx      # → /
│   └── blog/
│       ├── _layout.tsx# Layout scoped to /blog/* routes
│       └── [slug].tsx # → /blog/:slug
├── static/            # Static assets served at root — NOT processed by Vite
│   ├── favicon.ico    # → /favicon.ico
│   ├── robots.txt     # → /robots.txt
│   └── images/        # → /images/*
├── assets/            # Imported assets (processed by Vite: hashed, optimized)
│   ├── tailwind.css   # @tailwind base/components/utilities directives
│   └── logo.svg       # import logo from "@/assets/logo.svg"
├── fresh.config.ts    # Fresh framework config (replaces some deno.json roles)
├── client.ts          # Client entry — import CSS here for HMR
├── main.ts            # Server entry — create App, attach middleware, start
├── deno.json          # Dependencies, tasks, path aliases, compilerOptions
├── vite.config.ts     # Vite + Fresh plugin configuration
└── dev.ts             # Dev server entry (optional — deno task dev)
```

## 3. deno.json

```json
{
  "lock": false,
  "tasks": {
    "dev": "deno run -A --watch=src/ dev.ts",
    "build": "deno run -A dev.ts build",
    "start": "deno run -A main.ts",
    "preview": "deno run -A build && deno run -A main.ts"
  },
  "imports": {
    "@/": "./",
    "$fresh/": "https://deno.land/x/fresh@2.0.0-alpha.32/",
    "$viz/": "https://deno.land/x/fresh_charts@0.4.5/",
    "preact": "https://esm.sh/preact@10.26.5",
    "preact/": "https://esm.sh/preact@10.26.5/",
    "@preact/signals": "https://esm.sh/@preact/signals@2.1.0?external=preact",
    "@preact/icons": "https://esm.sh/@preact-icons/all?external=preact",
    "tailwindcss": "npm:tailwindcss@4.0.0-alpha.12",
    "@tailwindcss/typography": "npm:@tailwindcss/typography@0.5.13",
    "@tailwindcss/vite": "npm:@tailwindcss/vite@4.0.0-alpha.12",
    "@fresh/plugin-vite": "https://deno.land/x/fresh@2.0.0-alpha.32/src/dev/plugin_vite.ts",
    "vite": "npm:vite@5.4.0",
    "@deno/vite-plugin": "npm:@deno/vite-plugin@1.0.0",
    "@std/": "https://deno.land/std@0.224.0/"
  },
  "nodeModulesDir": "manual",
  "compilerOptions": {
    "jsx": "precompile",
    "jsxImportSource": "preact",
    "types": ["vite/client"],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "lint": {
    "rules": {
      "tags": ["fresh", "recommended"]
    }
  }
}
```

**Key points:**
- `@/` alias maps to project root — configure in both `imports` AND `compilerOptions.paths`
- `nodeModulesDir: "manual"` — run `deno install` to create `node_modules/` (needed for npm: specifiers)
- `tasks` require explicit `--watch=src/` so Deno watches the actual source dir, not `./`
- `compilerOptions.types: ["vite/client"]` enables Vite type hints (HMR, import.meta)

## 4. vite.config.ts

```ts
import { defineConfig } from "vite";
import fresh from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import deno from "@deno/vite-plugin";

export default defineConfig({
  plugins: [
    deno(),
    fresh({
      // --- Required ---
      serverEntry: "./main.ts",       // Server entry point (App creation)
      clientEntry: "./client.ts",     // Client-side entry (CSS imports, hydration bootstrap)

      // --- Optional directory overrides ---
      islandsDir: "./islands/",       // Default: "./islands/"
      routeDir: "./routes/",          // Default: "./routes/"
      staticDir: [                    // Default: ["./static/"], always an array
        "./static/",
        "./public/",                  // Extra static dirs OK
      ],

      // --- Advanced ---
      ignore: ["./_ignored/"],        // Paths to exclude entirely from route/island scanning
      islandSpecifiers: [             // Bare specifiers that export islands (monorepo, external libs)
        "@my-org/ui-kit",
      ],
    }),
    tailwindcss(),                    // Must come AFTER fresh()
    // Other Vite plugins here (svg, imagemin, glsl, ...)
  ],
  server: {
    port: 3000,                       // Dev server port (only affects `vite dev`)
  },
});
```

**Plugin order matters:** `deno()` → `fresh()` → `tailwindcss()` → rest.

### 4.1 What the fresh() plugin does automatically

- **Configures JSX** for Preact (`jsxImportSource: "preact"`)
- **Aliases React → Preact** — npm packages depending on React work out of the box
- **Enables HMR** via Prefresh (Preact's fast refresh)
- **Discovers islands** by scanning `islands/` directory + `islandSpecifiers`
- **Builds separate client + server bundles** using Vite Environments
- **Generates `_fresh/server.js`** for production deployment
- **Validates imports** — catches Node.js-only modules in browser code

### 4.2 Migrating from Builder to Vite

If your project uses `dev.ts` + `Builder` (pre-Vite Fresh 2 alpha):

**1. Update `deno.json` tasks:**

```diff
- "dev": "deno run -A --watch=static/,routes/ dev.ts",
- "build": "deno run -A dev.ts build",
+ "dev": "vite",
+ "build": "vite build",
```

Add imports: `@fresh/plugin-vite`, `vite`, `@types/babel__core`. Add `"types": ["vite/client"]` to compilerOptions.

**2. Delete `dev.ts`, create `vite.config.ts`:**

Map old `Builder` options to `fresh()` options (names match: `serverEntry`, `islandDir`, `routeDir`, `staticDir`, `ignore`). `builder.registerIsland("specifier")` → `fresh({ islandSpecifiers: ["specifier"] })`.

**3. Add `client.ts`, move CSS:**

Move `static/styles.css` → `assets/styles.css`. Import in `client.ts`. Remove `<link rel="stylesheet">` from `_app.tsx` — Vite injects stylesheets.

**4. Switch Tailwind plugin:**

```diff
- "@fresh/plugin-tailwind": "..."
- "postcss": "..."
+ "@tailwindcss/vite": "npm:@tailwindcss/vite@^4"
```

Stylesheet needs `@import "tailwindcss";` at top.

**5. Verify:** `deno install`, `deno task dev`, `deno task build`, `deno task start`. Output under `_fresh/` is identical — no deploy config changes.

### 4.3 Vite debugging

```sh
deno run -A npm:vite --debug          # verbose resolution logging
```

```ts
// vite.config.ts — inspect plugin transformations
import inspect from "vite-plugin-inspect";

export default defineConfig({
  plugins: [fresh(), inspect()],   // UI at /__inspect
});
```

### 4.4 Hot Module Replacement (HMR)

Changes to components, islands, and CSS reflect **instantly** in browser without full page reload. Powered by Prefresh (Preact's fast refresh). Active during `deno task dev`.

### 4.5 Builder API (Legacy — pre-Vite Fresh 2 alpha)

> **Skip this if using Vite.** Builder class was used in Fresh 2 alpha before `@fresh/plugin-vite`.

```ts
// dev.ts
import { Builder } from "fresh/dev";

const builder = new Builder({
  target: "safari12",           // esbuild target
  root: "." ,                   // project root (default: cwd)
  serverEntry: "./main.ts",     // server entry
  outDir: "./_fresh/",          // output directory
  staticDir: ["static", "generated"],  // static dirs (first match wins)
  islandDir: "./islands",
  routeDir: "./routes",
  ignore: [/\/_/],              // regex patterns to skip
  sourceMap: {                  // production source maps
    kind: "linked",             // linked | inline | external | both
    sourceRoot: ".",
    sourcesContent: true,
  },
});

if (Deno.args.includes("build")) {
  await builder.build();
} else {
  await builder.listen(() => import("./main.ts"));
}
```

**Registering islands:**

```ts
builder.registerIsland("path/to/MyIsland.tsx");
builder.registerIsland("file:///absolute/path/Island.tsx");
builder.registerIsland("jsr:@scope/pkg/Island.tsx");
```

**Build plugins (static file transforms):**

```ts
builder.onTransformStaticFile({
  pluginName: "my-plugin",
  filter: /\.css$/,
}, (args) => {
  return { content: `/* prepended */ ${args.text}`, map: undefined };
});
// Only static files in staticDir are processed
```

**Builder testing:**

```ts
const builder = new Builder();
const applySnapshot = await builder.build({ snapshot: "memory" });

function testApp() {
  const app = new App().get("/", () => new Response("hello")).fsRoutes();
  applySnapshot(app);
  return app;
}
```

**Builder Tailwind:**

```ts
import { tailwind } from "@fresh/plugin-tailwind";
tailwind(builder, { exclude: ["/admin/**"], optimize: true, base: null });
// For Tailwind v3: import { tailwind } from "@fresh/plugin-tailwindcss-v3";
```

---

## 5. main.ts — App API Completa

### 5.1 App constructor + config

```ts
import { App, staticFiles } from "fresh";

const app = new App<State>({
  basePath: "/",        // Serve from sub-path. Route /about → /my-app/about
  trustProxy: true,     // Read X-Forwarded-Proto/Host/For headers
  manifest,             // Generated build manifest
});
```

**`basePath`:** When running behind a reverse proxy path prefix. Available in handlers via `ctx.config.basePath`.

**`trustProxy`:** When behind nginx/Caddy/Cloudflare. Rewrites `ctx.url` to reflect client-facing URL (protocol, host). `X-Forwarded-For` used by `ipFilter`. **Only enable behind trusted proxies.**

### 5.2 Middleware chain (ordering matters)

```ts
const app = new App()
  .use(staticFiles())    // REQUIRED — serves /_frsh/js/* bundles for islands

  // Order: staticFiles first, then security, then session, then fsRoutes.
  // Middlewares placed AFTER .get()/.post() won't apply to those routes.
  .use(async (ctx) => {
    const resp = await ctx.next();
    resp.headers.set("X-Frame-Options", "DENY");
    resp.headers.set("X-Content-Type-Options", "nosniff");
    resp.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    resp.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return resp;
  })
  .use(async (ctx) => {
    const session = await getSession(ctx.req);
    if (session) ctx.state.session = session;
    return ctx.next();
  })

  // Programmatic routes (before fsRoutes — higher priority)
  .get("/health", () => Response.json({ status: "ok" }))

  .fsRoutes();  // File-system routes last — fallback priority
```

### 5.3 App methods reference

| Method | Signature | Description |
|--------|-----------|-------------|
| `.use()` | `use(mw1, mw2, ...)` | Middleware(s) at root |
| `.use("/prefix", mw)` | `use(pattern, mw)` | Scoped middleware |
| `.get("/path", handler)` | `get(pattern, ...mws, handler)` | GET handler |
| `.post("/path", handler)` | `post(pattern, ...mws, handler)` | POST handler |
| `.put("/path", handler)` | `put(pattern, ...mws, handler)` | PUT handler |
| `.delete("/path", handler)` | `delete(pattern, ...mws, handler)` | DELETE handler |
| `.patch("/path", handler)` | `patch(pattern, ...mws, handler)` | PATCH handler |
| `.head("/path", handler)` | `head(pattern, ...mws, handler)` | HEAD handler |
| `.options("/path", handler)` | `options(pattern, ...mws, handler)` | OPTIONS handler |
| `.all("/path", handler)` | `all(pattern, ...mws, handler)` | ALL HTTP verbs |
| `.fsRoutes()` | `fsRoutes(prefix?)` | Inject file-based routes |
| `.route("/path", opts)` | `route(pattern, { component, handler })` | Component + handler route |
| `.appWrapper(Component)` | `appWrapper(Component)` | Set app wrapper programmatically |
| `.layout("/prefix/*", Component)` | `layout(pattern, Component, config?)` | Set programmatic layout |
| `.onError("*", handler)` | `onError(pattern, handler \| { component })` | Error handler |
| `.notFound(handler)` | `notFound(handler \| (ctx) => ctx.render(<App/>))` | 404 handler |
| `.mountApp("/prefix", subApp)` | `mountApp(pattern, app)` | Mount sub-app |
| `.handler()` | `handler(): (req: Request) => Response` | Request→Response for testing |
| `.listen()` | `listen(options?: { port, hostname })` | Start server |

### 5.4 Programmatic routes (all HTTP methods)

```ts
// .get() — multiple middlewares + lazy handler
app.get("/about", authMiddleware, async (ctx) => {
  return new Response(`GET: ${ctx.url.pathname}`);
});

// .post() with dynamic params
app.post("/api/user/:id", validateBody, async (ctx) => {
  await createUser(ctx.params.id);
  return new Response("Created", { status: 201 });
});

// .all() — respond to every HTTP verb
app.all("/api/webhook", async (ctx) => {
  console.log(`${ctx.req.method} webhook received`);
  return new Response("ok");
});

// .head() — explicit HEAD handler (HEAD auto-falls-back to GET otherwise)
app.head("/cache-me", async (ctx) => {
  return new Response(null, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
});

// Lazy loading — defer import until first request
app.get("/lazy", async () => {
  const mod = await import("./lib/heavy-handler.ts");
  return mod.default;
});
```

### 5.5 `.route()` — component + handler

```tsx
app.route("/about", {
  component: (ctx) => <h1>About {ctx.data.name}</h1>,
  handler: {
    GET(ctx) {
      return page({ name: "Fresh" });
    },
  },
});
```

### 5.6 `.mountApp()` — sub-app composition

```ts
const apiRoutes = new App()
  .get("/sitemap.xml", () => new Response("<?xml...>", { headers: { "Content-Type": "application/xml" } }))
  .get("/robots.txt", () => new Response("User-agent: *"));

const app = new App()
  .use(staticFiles())
  .mountApp("/", apiRoutes)   // mounted at root, responds to /sitemap.xml, /robots.txt
  .fsRoutes();
```

### 5.7 `.notFound()` + `.onError()` programmatically

```tsx
// 404 handler
app.notFound((ctx) => {
  return ctx.render(<h1>Page not found</h1>);
});

// Error handler with component
app.onError("*", {
  component: (ctx) => <h1>Oops! {String(ctx.error)}</h1>,
});

// Error handler with middleware
app.onError("*", (ctx) => {
  console.error(ctx.error);
  return new Response(String(ctx.error), { status: 500 });
});
```

### 5.8 JSX in main.ts

To use JSX (e.g., `ctx.render(<h1>Hello</h1>)`) in `main.ts`, rename to `main.tsx` and update:

```ts
// vite.config.ts
fresh({ serverEntry: "./main.tsx" })
```

### 5.9 `.listen()` guard

```ts
// WARNING: .listen() only for `deno run main.ts`.
// `deno task dev` (Vite) and `deno task start` (deno serve) handle their own server.
// Protection pattern:
if (import.meta.main) {
  await app.listen({ port: 8000, hostname: "0.0.0.0" });
}

export default app;
```

**Key rule:** `import.meta.main` guard prevents `listen()` from executing during dev/build. Calling `.listen()` alongside Vite dev or `deno serve` causes `AddrInUse` errors.

### 5.10 Port sources

| Context | Where | Example |
|---------|-------|---------|
| Dev | `vite.config.ts` → `server.port` | `port: 3000` |
| Prod | `deno serve --port 8080 _fresh/server.js` | CLI flag |
| Direct run | `app.listen({ port: 8000 })` | code-level |

## 6. client.ts

```ts
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import "vite/modulepreload-polyfill";

// CSS imports here for HMR support — Vite injects <style> tags in dev,
// extracts to separate file in prod build.
import "@/assets/tailwind.css";

// Any client-side bootstrap logic:
// - Register service workers
// - Initialize analytics
// - Configure error tracking
```

**Do NOT import Preact components or signals here.** Islands are hydrated automatically by Fresh. This file is only for CSS imports and browser-side setup.

## 7. utils.ts — createDefine with State

```ts
import { createDefine } from "fresh";

export interface State {
  user?: {
    id: string;
    name: string;
    email: string;
  };
  session?: string;
  csrfToken?: string;
}

export const define = createDefine<State>();
```

**Usage in routes:**

```ts
// routes/dashboard.tsx
import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    if (!ctx.state.user) return ctx.redirect("/login");
    return ctx.render({});
  },
});

export default define.page<{ stats: number }>(function Dashboard({ data }) {
  return <div>Stats: {data.stats}</div>;
});
```

## 8. Port Configuration

Three separate port settings — they do NOT conflict:

| Context | Where | Example |
|---------|-------|---------|
| Dev server | `vite.config.ts` → `server.port` | `port: 3000` |
| Prod (`deno serve`) | CLI flag | `deno serve --port 8080 main.ts` |
| `app.listen()` | `main.ts` code | `app.listen({ port: 8000 })` |

`app.listen()` port only matters when running directly with `deno run main.ts` (the `if (import.meta.main)` path). During `deno task dev`, Vite's dev server port is used. On Deno Deploy, `Deno.serve()` is used internally and the deploy platform assigns the port.

## 9. @/ Path Alias

Defined in two places in `deno.json`:

```json
{
  "imports": {
    "@/": "./"          // Deno resolution: maps @/foo.ts → ./foo.ts
  },
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]    // TypeScript resolution: enables IDE Go-to-definition
    }
  }
}
```

**Both are required.** LSP/IDE uses `compilerOptions.paths`, Deno uses `imports`.

Usage:

```ts
// Routes
import { define } from "@/utils.ts";
import { Button } from "@/components/Button.tsx";
import { Counter } from "@/islands/Counter.tsx";
import { db } from "@/lib/db.ts";

// Assets
import logo from "@/assets/logo.svg";

// Relative imports also work but @/ is preferred:
// ❌ import { Button } from "../../components/Button.tsx";
// ✅ import { Button } from "@/components/Button.tsx";
```
