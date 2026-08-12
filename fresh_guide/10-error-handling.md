# 10 — Error Handling

> HttpError, onError(), _error.tsx, notFound(), migration from 1.x

---

## 1. HttpError — Throw HTTP Status

```ts
import { HttpError } from "fresh";

throw new HttpError(404);                              // Not found
throw new HttpError(401);                              // Unauthorized
throw new HttpError(403);                              // Forbidden
throw new HttpError(403, "Admin access required");     // Custom message
throw new HttpError(418, "I'm a teapot");              // Any status + message
```

`.status` and `.message` available on instance:

```ts
const err = new HttpError(403, "Nope");
err.status;   // 403
err.message;  // "Nope"
```

Works everywhere — middleware, handlers, async components:

```ts
// middleware
export default define.middleware(async (ctx) => {
  const user = ctx.state.user;
  if (!user) throw new HttpError(401);
  return await ctx.next();
});

// handler
export const handler = define.handlers({
  async POST(req, ctx) {
    const post = await db.find(ctx.params.id);
    if (!post) throw new HttpError(404);
    return ctx.render({ post });
  },
});

// async component
export default define.page(async function Page({ data }) {
  const items = await db.list();
  if (!items.length) throw new HttpError(404);
  return <List items={items} />;
});
```

Also available in browser code via `fresh/runtime`:

```ts
import { HttpError } from "fresh/runtime";
```

---

## 2. Generic Error Pages — app.onError()

```ts
import { App } from "fresh";

const app = new App()
  .onError("*", (ctx) => {
    console.error(`Error: ${ctx.error}`);
    return new Response("Oops!", { status: 500 });
  })
  .get("/thrower", () => { throw new Error("fail"); });
```

`ctx.error` contains the thrown value (the error object or string). Use `"*"` as the path to match all routes.

---

## 3. Nested (Scoped) Error Pages

```ts
const app = new App()
  .onError("*", (ctx) => new Response("Oops!", { status: 500 }))          // top-level fallback
  .onError("/foo/bar", (ctx) => new Response("nested error!", { status: 500 }))  // scoped
  .get("/foo/bar/thrower", () => { throw new Error("fail"); })
  .get("/baz/thrower", () => { throw new Error("fail") });
```

- `/foo/bar/thrower` → hits the nested `/foo/bar` handler
- `/baz/thrower` → no scoped handler, falls through to `"*"`

Paths follow the same URLPattern rules as routes (`*` wildcards, `:param` segments).

```ts
// Scoped to entire /api/* subtree
app.onError("/api/:path*", (ctx) => {
  return Response.json({ error: String(ctx.error) }, { status: 500 });
});
```

---

## 4. Error Page with Component

Use `ctx.render()` in `onError` to render a Preact component:

```tsx
app.onError("*", (ctx) => {
  return ctx.render(<ErrorPage error={ctx.error} />);
});

function ErrorPage({ error }: { error: unknown }) {
  return (
    <main>
      <h1>Oops!</h1>
      <pre>{String(error)}</pre>
    </main>
  );
}
```

Or use the `component` property shorthand:

```tsx
app.onError("*", {
  component: (ctx) => <h1>Oops! {String(ctx.error)}</h1>,
});
```

With HttpError inspection:

```tsx
app.onError("*", {
  component: (ctx) => {
    if (ctx.error instanceof HttpError) {
      return <h1>Error {ctx.error.status} — {ctx.error.message}</h1>;
    }
    return <h1>Internal Server Error</h1>;
  },
});
```

---

## 5. Not Found Pages — app.notFound()

Global-only (cannot be scoped). Returns 404 for unmatched routes:

```ts
app.notFound(() => new Response("Not found", { status: 404 }));

// With component via ctx.render:
app.notFound((ctx) => ctx.render(<NotFoundPage />));

function NotFoundPage() {
  return <h1>Page not found</h1>;
}
```

**Note:** `notFound()` is a top-level handler for routes that don't match anything. For per-handler 404s (e.g. dynamic route where a DB record is missing), use `throw new HttpError(404)`.

---

## 6. File-Based Error Page — routes/_error.tsx

Single file replaces both Fresh 1.x `_404.tsx` and `_500.tsx`:

```tsx
// routes/_error.tsx
import { HttpError } from "fresh";
import { define } from "../utils.ts";

export default define.page((props) => {
  const error = props.error;

  if (error instanceof HttpError) {
    if (error.status === 404) {
      return (
        <main>
          <h1>404 — Page not found</h1>
          <p>The page you requested does not exist.</p>
          <a href="/">Go home</a>
        </main>
      );
    }
    if (error.status === 403) {
      return <h1>403 — Forbidden</h1>;
    }
    if (error.status === 401) {
      return <h1>401 — Unauthorized</h1>;
    }
    return <h1>HTTP {error.status} — {error.message}</h1>;
  }

  return <h1>Oops! Something went wrong...</h1>;
});
```

`props` available in `_error.tsx`:

```ts
interface ErrorPageProps {
  error: unknown;             // The thrown value (HttpError, Error, string, etc.)
  url: URL;                   // Request URL
  route: string | undefined;  // Matched route pattern
  params: Record<string, string>;
  data: unknown;              // Any data from handler (may be partial)
  state: Record<string, unknown>;
}
```

### Migration: Fresh 1.x → 2.x

| Fresh 1.x | Fresh 2.x |
|-----------|-----------|
| `routes/_404.tsx` | `routes/_error.tsx` — check `error instanceof HttpError && error.status === 404` |
| `routes/_500.tsx` | Same `_error.tsx` — catch-all else branch |
| `ctx.renderNotFound()` | `throw new HttpError(404)` |
| `ctx.renderNotFound(data?)` | `throw HttpError(404)` then access from `props.error` |

---

## 7. Checking HttpError in onError Handler

```ts
app.onError("*", (ctx) => {
  if (ctx.error instanceof HttpError) {
    const status = ctx.error.status;
    const message = ctx.error.message;

    // Log only server errors, don't clutter with 404s
    if (status >= 500) {
      console.error(`[${status}] ${ctx.url.pathname}:`, ctx.error);
    }

    return new Response(message || `Error ${status}`, { status });
  }

  // Unexpected error — log it
  console.error(`Unhandled error at ${ctx.url.pathname}:`, ctx.error);

  // In production, don't leak error details
  return new Response("Internal Server Error", { status: 500 });
});
```

---

## 8. HTTP Status Code Usage Guide

| Code | Constant | When to use |
|------|----------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST that creates a resource |
| 204 | No Content | Successful DELETE, or POST with no response body |
| 301 | Moved Permanently | Permanent URL redirect |
| 302 | Found | Temporary redirect (default for `ctx.redirect`) |
| **303** | **See Other** | **After form POST — redirect to GET page** |
| 304 | Not Modified | Conditional requests (ETag/If-None-Match) |
| 400 | Bad Request | Invalid user input, validation failure |
| **401** | **Unauthorized** | **Not authenticated (no valid session/token)** |
| **403** | **Forbidden** | **Authenticated but no permission** |
| **404** | **Not Found** | **Resource does not exist** |
| **405** | **Method Not Allowed** | **Auto-returned by Fresh for unsupported HTTP methods** |
| 409 | Conflict | Duplicate resource, optimistic lock failure |
| 422 | Unprocessable Entity | Semantic validation failure |
| 429 | Too Many Requests | Rate limiting |
| **500** | **Internal Server Error** | **Unexpected/unhandled errors** |
| 503 | Service Unavailable | Maintenance, upstream timeout |

Usage:

```ts
// 303 after form POST
export const handler = define.handlers({
  async POST(req, ctx) {
    const form = await req.formData();
    await db.createRoom(form);
    return new Response(null, {
      status: 303,
      headers: { Location: `/rooms` },
    });
  },
});

// 400 for bad input
if (!body.name || body.name.length < 3) {
  return Response.json({ error: "Name too short" }, { status: 400 });
}

// 409 conflict
if (await db.exists(body.slug)) {
  return Response.json({ error: "Slug already taken" }, { status: 409 });
}
```

---

## 9. Error Middleware Pattern

Auth guards that throw HttpError:

```ts
// lib/auth-middleware.ts
import { HttpError } from "fresh";
import { define } from "../utils.ts";

export const authGuard = define.middleware(async (ctx) => {
  const session = ctx.req.headers.get("Cookie")?.match(/session=([^;]+)/)?.[1];

  if (!session) throw new HttpError(401);

  const payload = await verifyJWT(session);
  if (!payload) throw new HttpError(401, "Invalid session");

  ctx.state.user = { id: payload.sub, email: payload.email };
  return await ctx.next();
});

export const adminGuard = define.middleware(async (ctx) => {
  await authGuard(ctx);          // chain auth first
  if (!ctx.state.user?.isAdmin) {
    throw new HttpError(403, "Admin access required");
  }
  return await ctx.next();
});
```

Applied to routes:

```ts
// routes/admin/_middleware.ts
import { adminGuard } from "../../lib/auth-middleware.ts";
export default adminGuard;
```

```ts
// routes/admin/users.ts
import { define } from "../../utils.ts";

export const handler = define.handlers({
  GET(_req, ctx) {
    // ctx.state.user guaranteed by adminGuard
    return Response.json(await db.listUsers());
  },
});
```

---

## 10. Migration: ctx.renderNotFound() → HttpError(404)

Fresh 2.x removes `ctx.renderNotFound()`. Replace all occurrences:

```ts
// ❌ Fresh 1.x
export const handler = define.handlers({
  GET(_req, ctx) {
    const post = db.get(ctx.params.slug);
    if (!post) return ctx.renderNotFound();
    return ctx.render({ post });
  },
});

// ✅ Fresh 2.x
import { HttpError } from "fresh";

export const handler = define.handlers({
  GET(_req, ctx) {
    const post = db.get(ctx.params.slug);
    if (!post) throw new HttpError(404);
    return ctx.render({ post });
  },
});
```

With custom data (data passed to `renderNotFound` in 1.x):

```ts
// ❌ Fresh 1.x
return ctx.renderNotFound({ reason: "deleted" });

// ✅ Fresh 2.x — construct HttpError with data, catch in _error.tsx
const err = new HttpError(404);
err.cause = { reason: "deleted" };
throw err;

// routes/_error.tsx
export default define.page((props) => {
  if (props.error instanceof HttpError && (props.error as any).cause?.reason === "deleted") {
    return <h1>This post has been deleted</h1>;
  }
  // ...
});
```

---

## Cheat sheet

```txt
Task                                        → Approach
─────────────────────────────────────────────────────────────
Bail out with HTTP status                   → throw new HttpError(status, message?)
Auth guard missing session                  → throw new HttpError(401)
Auth guard missing permission               → throw new HttpError(403)
DB record not found                         → throw new HttpError(404)
Generic error page (all routes)             → app.onError("*", handler)
Scoped error page                           → app.onError("/prefix/*", handler)
Error page with Preact component            → app.onError("*", { component: (ctx) => <JSX /> })
Inspect error type in onError               → ctx.error instanceof HttpError
Not found page (unmatched routes)           → app.notFound(handler)
File-based error page                       → routes/_error.tsx
Check HttpError in _error.tsx               → props.error instanceof HttpError
Access HttpError status                     → err.status / ctx.error.status
Fresh 1.x → 2.x renderNotFound alternative  → throw new HttpError(404)
Unused HTTP methods return                  → 405 Method Not Allowed (automatic)
Form POST redirect                          → Response(null, { status: 303, headers: { Location: "/" } })
```
