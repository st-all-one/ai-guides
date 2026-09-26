## 5. Layouts & App Wrapper

### 5.1 App Wrapper — `routes/_app.tsx`

Outermost HTML shell. ONE per app. Wraps `<html>` / `<head>` / `<body>`.

```tsx
// routes/_app.tsx
import { define } from "../utils.ts";

export default define.page(({ Component, url, state }) => {
  return (
    <html lang="en" data-theme={state.theme ?? "light"}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My App</title>
        <meta property="og:url" content={url.href} />
        <link rel="canonical" href={url.href} />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
```

Props:
- `Component` — the page content to render inside `<body>`
- `url` — `URL` instance of current request
- `state` — `AppState` from middleware (typed via `define.page<AppState>`, optional)
- `data` — if handler set data via `page({...})`
- `params` — dynamic route params
- `route` — matched route name
- `renderTimeout` — ms before render aborts (default 10000)

### 5.2 Programmatic app wrapper

Set `_app.tsx` alternative without the file:

```ts
// main.ts
import { App } from "fresh";
import { AppWrapper } from "@/components/AppWrapper.tsx";

const app = new App();
app.appWrapper(AppWrapper);
```

Use when conditionally swapping app wrapper at runtime (e.g., A/B test layout).

### 5.3 Render hierarchy

```
_app.tsx
  └── root _layout.tsx
        └── nested _layout.tsx
              └── page component
```

For route `/blog/my-post`:
```
_app.tsx → routes/_layout.tsx → routes/blog/_layout.tsx → routes/blog/my-post.tsx
```

Layouts nest by directory depth. Deeper layouts wrap inner content.

### 5.4 File-based Layouts — `routes/_layout.tsx`

Layout wraps `<Component />` — the inner layout or page.

```tsx
// routes/_layout.tsx — root layout, wraps ALL pages
import { define } from "../utils.ts";

export default define.layout(({ Component, state, url }) => {
  return (
    <div class="layout">
      <nav>
        <a href="/" class={url.pathname === "/" ? "active" : ""}>Home</a>
        {state.user && <span>Hi, {state.user.name}</span>}
      </nav>
      <main>
        <Component />
      </main>
      <footer>&copy; 2026</footer>
    </div>
  );
});
```

```tsx
// routes/blog/_layout.tsx — scoped to /blog/* routes
import { define } from "../../utils.ts";

export default define.layout(({ Component }) => {
  return (
    <section class="blog-layout">
      <aside><a href="/blog">← All posts</a></aside>
      <article><Component /></article>
    </section>
  );
});
```

- `define.layout(...)` — layout component; same props as pages
- `_layout.tsx` applies to its directory and all subdirectories
- `<Component />` renders the next layer (child layout or page)

### 5.5 Async layouts

Fetch data before rendering. Same async signature as pages.

```tsx
// routes/_layout.tsx
export default define.layout(async (ctx) => {
  const categories = await db.categories.list();

  return (
    <div>
      <aside>
        <ul>
          {categories.map((c) => (
            <li><a href={`/blog?cat=${c.slug}`}>{c.name}</a></li>
          ))}
        </ul>
      </aside>
      <article><ctx.Component /></article>
    </div>
  );
});
```

Promise rejects propagate to error boundary (`_error.tsx` or `app.onError()`).

### 5.6 `skipInheritedLayouts` — Route level

Skip root + all parent layouts for a specific page.

```tsx
// routes/login.tsx
import { RouteConfig } from "fresh";
import { define } from "../utils.ts";

export const config: RouteConfig = {
  skipInheritedLayouts: true,
};

export default define.page(({ Component }) => {
  return (
    <div class="login-fullscreen">
      <Component />
    </div>
  );
});
```

`/login` render: `_app.tsx → login page` (no layouts).

Typical for login, register, 404, embedded widgets.

### 5.7 `skipInheritedLayouts` — Layout level

Layout declares itself as the new root — skips parent layouts above it.

```tsx
// routes/admin/_layout.tsx
import { LayoutConfig } from "fresh";
import { define } from "../../utils.ts";

export const config: LayoutConfig = {
  skipInheritedLayouts: true,
};

export default define.layout(({ Component }) => {
  return (
    <div class="admin-shell">
      <h1>Admin Panel</h1>
      <Component />
    </div>
  );
});
```

`/admin/dashboard` render: `_app.tsx → admin/_layout → dashboard page` (root `_layout.tsx` skipped, admin layout acts as new root).

Use for sections that need a completely different shell (admin, docs, iframes).

### 5.8 `skipAppWrapper` — Route level

Bypass `_app.tsx` entirely — no `<html>` / `<head>` / `<body>` wrapper.

```tsx
// routes/api/health.ts
import { RouteConfig } from "fresh";

export const config: RouteConfig = {
  skipAppWrapper: true,
};

export function handler(): Response {
  return Response.json({ status: "ok" });
}
```

```tsx
// routes/embed/widget.tsx — standalone embed
import { RouteConfig } from "fresh";
import { define } from "../../utils.ts";

export const config: RouteConfig = {
  skipAppWrapper: true,
};

export default define.page(({ Component }) => {
  return <Component />;
});
```

Use cases:
- API routes (`routes/api/*`) — return JSON, not HTML
- Embeddable widgets — iframe-friendly output
- OEmbed / OpenSearch endpoints
- Raw SVG / XML responses

### 5.9 `skipAppWrapper` — Layout level (programmatic)

```ts
// main.ts
app.layout("/foo/bar", MyComponent, { skipAppWrapper: true });
```

Layout for `/foo/bar` renders raw output — no `<html>` shell. Equivalent to route-level flag but set programmatically.

### 5.10 Programmatic layouts (non-file-based)

Define layouts outside the `routes/` directory tree.

```tsx
// layouts.tsx or main.ts

function PageLayout({ Component }: { Component: ComponentType }) {
  return (
    <div>
      <Component />
      <aside>Sidebar</aside>
    </div>
  );
}

function AdminLayout({ Component }: { Component: ComponentType }) {
  return (
    <div class="admin">
      <nav>Admin Nav</nav>
      <Component />
    </div>
  );
}

const app = new App()
  .layout("*", PageLayout)          // All routes get PageLayout
  .layout("/admin/*", AdminLayout)  // Admin routes get PageLayout → AdminLayout
  .get("/", (ctx) => ctx.render(<h1>hello</h1>));
```

- `"*"` — wildcard, matches all routes
- Specific patterns add layers on top (innermost declared runs closest to page)
- Patterns use Fresh route matching (`/admin/*`, `/blog/:slug`, `/static/**`)

Override inherited layouts for a specific path:

```ts
app.layout("/landing", LandingLayout, { skipInheritedLayouts: true });
```

### 5.11 Layout vs App Wrapper

| | App Wrapper | Layout |
|---|---|---|
| **Count** | ONE per app | Many, nested |
| **File** | `routes/_app.tsx` (optional) | `routes/_layout.tsx` |
| **Scope** | `<html>/<head>/<body>` | Between app wrapper and page |
| **Set via** | file or `app.appWrapper()` | file or `app.layout()` |
| **Skip** | `skipAppWrapper: true` | `skipInheritedLayouts: true` |
| **Renders** | `<Component />` = layout tree | `<Component />` = child layout or page |
| **Typical use** | Document shell, meta tags, theme | Nav, sidebar, footer, section wrapper |

App Wrapper sits outermost. Layouts stack between app wrapper and final page. Both receive `state`, `url`, `params`, `data`.

### 5.12 Combined example

```tsx
// routes/_app.tsx
export default define.page(({ Component, url, state }) => (
  <html lang="en" data-theme={state.theme}>
    <head>
      <meta charset="utf-8" />
      <title>{state.title ?? "My App"}</title>
    </head>
    <body>
      <Component />
    </body>
  </html>
));
```

```tsx
// routes/_layout.tsx
export default define.layout(({ Component, state, url }) => (
  <div class="root-layout">
    <nav>
      <a href="/">Home</a>
      {state.user && <span>{state.user.name}</span>}
    </nav>
    <main><Component /></main>
  </div>
));
```

```tsx
// routes/blog/_layout.tsx
export default define.layout(async (ctx) => {
  const cats = await db.categories.list();
  return (
    <div class="blog-wrap">
      <aside>
        {cats.map((c) => <a href={`/blog?cat=${c.slug}`}>{c.name}</a>)}
      </aside>
      <article><ctx.Component /></article>
    </div>
  );
});
```

```tsx
// routes/login.tsx — standalone, no layouts or app wrapper
export const config: RouteConfig = {
  skipInheritedLayouts: true,
  skipAppWrapper: true,
};

export default define.page(({ Component }) => <Component />);
```

Render results:

| Route | Layers |
|---|---|
| `/` | `_app` → `_layout` → `page` |
| `/blog/my-post` | `_app` → `_layout` → `blog/_layout` → `page` |
| `/login` | `page` (both skips active) |

### 5.13 LayoutConfig — full options

```ts
// routes/_layout.tsx
import type { LayoutConfig } from "fresh";

export const config: LayoutConfig = {
  skipAppWrapper: true,          // Skip <html> shell
  skipInheritedLayouts: true,    // Skip parent layouts
};
```

Available on `LayoutConfig`:
- `skipAppWrapper: boolean`
- `skipInheritedLayouts: boolean`
- `routeOverride: string` — same as `RouteConfig.routeOverride`
- `hasExplicitPathParameter: boolean`
- `staticPaths: string[]`

### 5.14 Troubleshooting

**Layout not applying to children?** Check file name is exactly `_layout.tsx`. Subdirectories inherit layouts from parents unless `skipInheritedLayouts` is set.

**Page renders without layouts unexpectedly?** Check if any ancestor layout or the route itself sets `skipInheritedLayouts: true`. Check if app wrapper exists — Fresh auto-creates minimal app wrapper if `_app.tsx` is missing.

**App Wrapper not wrapping API routes?** By default, only routes with a default export (pages) use the app wrapper. API routes (no default export) don't. If needed, use `routeOverride` on an API route.

**Async layout error not caught?** Ensure `routes/_error.tsx` exists or `app.onError()` is configured. Layout errors in async fetches propagate like page errors.

### 5.15 `<Head>` Component — Dynamic Metadata

Import from `fresh/runtime` to set page metadata from any route or island:

```tsx
// routes/about.tsx
import { Head } from "fresh/runtime";

export default define.page((ctx) => {
  return (
    <div>
      <Head>
        <title>About me</title>
        <meta name="description" content="About this site" />
        <link rel="canonical" href={ctx.url.href} />
      </Head>
      <h1>About me</h1>
    </div>
  );
});
```

**Island dynamic updates:**

```tsx
// islands/MetaUpdater.tsx
import { useState } from "preact/hooks";
import { Head } from "fresh/runtime";

export default function MetaUpdater() {
  const [title, setTitle] = useState("Welcome");
  return (
    <div>
      <Head>
        <title>{title}</title>
      </Head>
      <button onClick={() => setTitle("Updated!")}>Change title</button>
    </div>
  );
}
```

**Deduplication strategy** (when multiple `<Head>` render same element):

1. `<title>` elements set `document.title` directly
2. Match by `key` prop
3. Match by `id` attribute
4. `<meta>` elements: match by `name` attribute
5. `<link>` elements: match by `rel` attribute
6. No match found → create new element, append to `<head>`

When multiple `<Head>` components render an element with the same key, **last one rendered wins**.
Rendering order: `app wrapper → layout → route → page component`.
A route page can override `_app.tsx` head defaults using the same `key` prop.

`<title>` tag is automatically deduplicated **without** a `key` prop.

**vs `_app.tsx` pattern:**

| Scenario | Use |
|----------|-----|
| Same head for all pages | `_app.tsx` + `ctx.state.title` |
| Route-specific title/meta | `<Head>` in route component |
| Dynamic head from island | `<Head>` in island with `useState` |
