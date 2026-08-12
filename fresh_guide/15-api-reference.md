# 15 — API Reference

> Quick reference for all public exports from `fresh`, `fresh/runtime`, and `fresh/dev`.

---

## `fresh` — Server-side entry point

```ts
import { App, createDefine, HttpError, page, staticFiles } from "fresh";
```

| Export | Kind | Description |
|--------|------|-------------|
| `App` | Class | Main application class |
| `staticFiles` | Function | Middleware for serving static files |
| `createDefine` | Function | Create type-safe `define.*` helpers (`createDefine<State>()`) |
| `page` | Function | Return data from handler to page component (replaces `ctx.render()`) |
| `HttpError` | Class | Throw HTTP errors with status codes |
| `cors` | Function | CORS middleware |
| `csrf` | Function | CSRF protection middleware |
| `csp` | Function | Content Security Policy middleware |
| `trailingSlashes` | Function | Trailing slash enforcement middleware |
| `ipFilter` | Function | IP allow/deny list middleware |

### Types

| Export | Kind | Description |
|--------|------|-------------|
| `Context` / `FreshContext` | Interface | Request context passed to all middlewares and handlers |
| `PageProps` | Type | Props received by page components (`data`, `url`, `params`, `state`, etc.) |
| `Middleware` / `MiddlewareFn` | Type | Middleware function type |
| `HandlerFn` | Type | Single handler function type |
| `HandlerByMethod` | Type | Object with per-method handler functions (`{ GET, POST, ... }`) |
| `RouteHandler` | Type | Union of `HandlerFn` and `HandlerByMethod` |
| `PageResponse` | Type | Return type of `page()` |
| `RouteConfig` | Interface | Route configuration (`routeOverride`, `skipInheritedLayouts`, `skipAppWrapper`, `css`) |
| `LayoutConfig` | Interface | Layout configuration (`skipInheritedLayouts`, `skipAppWrapper`, `routeOverride`, `hasExplicitPathParameter`, `staticPaths`) |
| `Define` | Interface | Type of object returned by `createDefine()` |
| `FreshConfig` / `ResolvedFreshConfig` | Interface | App configuration types (`basePath`, `trustProxy`, `manifest`) |
| `ListenOptions` | Interface | Options for `app.listen()` (`port`, `hostname`) |
| `Island` | Type | Island component type |
| `Method` | Type | HTTP method union type (`"GET" \| "POST" \| "PUT" \| "DELETE" \| "PATCH" \| "HEAD" \| "OPTIONS"`) |
| `RouteData` | Type | Data type returned by route handlers via `page()` |
| `Lazy` / `MaybeLazy` | Type | Utility types for lazily-loaded routes and middleware |
| `CORSOptions` | Interface | Options for `cors()` |
| `CsrfOptions` | Interface | Options for `csrf()` |
| `CSPOptions` | Interface | Options for `csp()` |

---

## `fresh/runtime` — Shared server + client utilities

Safe to import in islands. No server-only code.

```ts
import { asset, assetSrcSet, Head, HttpError, IS_BROWSER, Partial } from "fresh/runtime";
```

| Export | Kind | Description |
|--------|------|-------------|
| `IS_BROWSER` | Constant | `true` in browser, `false` on server — guard browser-only APIs |
| `asset` | Function | Add `?__frsh_c=<hash>` cache-busting query param to URLs |
| `assetSrcSet` | Function | Apply `asset()` to all URLs in a `srcset` string |
| `Partial` | Component | Mark a region for partial page updates (`<Partial name="...">`) |
| `Head` | Component | Add/modify elements in `<head>` from any route or island |
| `HttpError` | Class | HTTP error class (re-exported — same as from `fresh`) |

---

## `fresh/dev` — Build tools (legacy)

Used in `dev.ts` (pre-Vite projects). Not needed for Vite-based Fresh 2.

```ts
import { Builder } from "fresh/dev";
```

| Export | Kind | Description |
|--------|------|-------------|
| `Builder` | Class | Pre-Vite build system (legacy). Use `vite build` instead. |

### Builder types

| Export | Kind | Description |
|--------|------|-------------|
| `BuildOptions` | Interface | Options for `new Builder()` |
| `ResolvedBuildConfig` | Interface | Resolved build configuration |
| `OnTransformArgs` / `OnTransformOptions` / `TransformFn` | Type | Build plugin hook types |

---

## FreshContext `<State>` — Full properties

Available in all handlers, middleware, pages, and layouts:

```ts
interface FreshContext<State = Record<string, unknown>> {
  req: Request;           // Incoming HTTP request
  url: URL;               // Parsed request URL (respects trustProxy)
  params: Record<string, string | undefined>;  // Dynamic route params
  state: State;           // Shared state from middleware
  config: ResolvedFreshConfig;  // Resolved app config (basePath, etc.)
  route: string;          // Matched route pattern
  render: () => Response;  // Call handler, render page (handler context)
  renderNotFound: () => Response;  // Trigger 404
  next: () => Promise<Response>;   // Continue to next middleware (middleware only)
  error?: unknown;        // Caught error (onError context only)
  component?: ComponentType;  // Page component (handler context; use page() instead)
  renderTimeout: number;  // ms before render aborts (default 10000)
  info: Deno.ServeHandlerInfo;  // Connection info (remoteAddr)
}
```

## PageProps `<T>` — Props received by page components

```ts
interface PageProps<T = unknown> {
  data: T;                          // Data from handler via page()
  url: URL;                         // Request URL
  params: Record<string, string | undefined>;  // Dynamic params
  state: State;                     // App state from middleware
  route: string;                    // Matched route pattern
  renderTimeout: number;            // ms before render aborts
}
```

---

## Imports cheat sheet

| What | From |
|------|------|
| `App`, `page`, `staticFiles`, `HttpError` | `"fresh"` |
| `createDefine`, `cors`, `csrf`, `csp`, `ipFilter`, `trailingSlashes` | `"fresh"` |
| `Context`, `FreshContext`, `PageProps`, `RouteConfig`, `LayoutConfig`, `HandlerFn`, etc. | `"fresh"` |
| `IS_BROWSER`, `asset`, `assetSrcSet`, `Partial`, `Head` | `"fresh/runtime"` |
| `Builder` | `"fresh/dev"` |
| `define` (your typed instance) | `"@/utils.ts"` |
| Preact hooks, `ComponentChildren`, `JSX`, `render` | `"preact"` |
| `useSignal`, `useComputed`, `signal`, `computed`, `Signal` | `"@preact/signals"` |