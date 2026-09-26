## 4. Data Fetching, Handlers & Pages

### 4.1 Handler + `page()` — Type-safe pattern

```tsx
// routes/project/[id].tsx
import { HttpError, page } from "fresh";
import { define } from "@/utils.ts";
import { db } from "@/db.ts";

interface Data {
  project: { name: string; stars: number };
}

export const handler = define.handlers({
  async GET(ctx): Promise<Response> {
    const project = await db.projects.findOne(ctx.params.id);
    if (!project) throw new HttpError(404);
    return page({ project });
  },
});

export default define.page<typeof handler>(({ data }) => {
  return (
    <div>
      <h1>{data.project.name}</h1>
      <p>{data.project.stars} stars</p>
    </div>
  );
});
```

`define.page<typeof handler>` links handler return type → `data` prop gets full autocomplete.

### 4.2 `page()` — Custom status & headers

```ts
return page({ project }, {
  status: 201,
  headers: { "Cache-Control": "public, max-age=3600" },
});
```

```ts
// Redirect + flash message pattern
ctx.state.flash = "Saved";
return new Response(null, {
  status: 303,
  headers: { Location: "/dashboard" },
});
```

### 4.3 Async page components — No handler needed

```tsx
// routes/project/[id].tsx
import { HttpError } from "fresh";
import { define } from "@/utils.ts";

export default define.page(async (ctx) => {
  const project = await db.projects.findOne(ctx.params.id);
  if (!project) throw new HttpError(404);
  return (
    <div>
      <h1>{project.name}</h1>
      <p>{project.stars} stars</p>
    </div>
  );
});
```

Trade-off: no handler → no `define.page<typeof handler>` type link. Use for simple loads.

### 4.4 Middleware state → handler + page

```ts
// routes/_middleware.ts
import { define } from "@/utils.ts";

export default define.middleware(async (ctx) => {
  const session = await getSession(ctx.req);
  ctx.state.user = session?.user ?? null;
  return ctx.next();
});
```

```tsx
// routes/dashboard.tsx
import { page } from "fresh";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    if (!ctx.state.user) return ctx.redirect("/login");
    return page();
  },
});

export default define.page((ctx) => {
  return <h1>Welcome, {ctx.state.user.name}</h1>;
});
```

### 4.5 Page props — Full reference

| Prop | Type | Source |
|------|------|--------|
| `data` | `T` | `page<T>(data)` return from handler |
| `url` | `URL` | Request URL (query, pathname, hash) |
| `params` | `Record<string, string>` | `[id]` → `{ id: "42" }` |
| `req` | `Request` | Raw HTTP request |
| `state` | `State` | `ctx.state` from middleware / handlers |
| `config` | `ResolvedFreshConfig` | Fresh config object |
| `route` | `string \| null` | Matched route pattern |
| `info` | `Deno.ServeHandlerInfo` | `{ remoteAddr }` |
| `error` | `unknown \| null` | Caught error (only on `_error.tsx`) |
| `isPartial` | `boolean` | `true` if partial client nav request |
| `Component` | `() => VNode` | Child component (layout pages only) |
| `render` | `() => JSX.Element` | Render slot (layout pages only) |

### 4.6 `define.handlers()` — Method routing

```ts
// Method-specific
export const handler = define.handlers({
  GET(ctx)     { return page({ items: await list() }); },
  POST(ctx)    { return handleForm(ctx); },
  DELETE(ctx)  { return remove(ctx.params.id); },
});

// Catch-all — any method, no routing
export const handler = define.handlers((ctx) => {
  return new Response("ok");
});

// Mixed: GET-specific + catch-all fallback
export const handler = define.handlers({
  GET(ctx) { return page(); },
}, async (ctx) => {
  return new Response("Method not allowed", { status: 405 });
});
```

### 4.7 Query parameters

```ts
// ?q=search&page=2
const q     = ctx.url.searchParams.get("q") ?? "";
const page  = Number(ctx.url.searchParams.get("page")) || 1;
const tags  = ctx.url.searchParams.getAll("tag");  // ["ts", "c++"]
```

### 4.8 Form data

```ts
export const handler = define.handlers({
  async POST(ctx) {
    const form = await ctx.req.formData();
    const email  = form.get("email")?.toString() ?? "";
    const avatar = form.get("avatar") as File | null;
    await Deno.writeFile(`./uploads/${avatar.name}`, avatar.stream());

    // Redirect after POST (PRG pattern)
    return new Response(null, {
      status: 303,
      headers: { Location: "/profile" },
    });
  },
});
```

### 4.9 JSON body

```ts
export const handler = define.handlers({
  async POST(ctx) {
    if (ctx.req.headers.get("content-type") !== "application/json") {
      return Response.json({ error: "Expected JSON" }, { status: 415 });
    }
    const { name, email } = await ctx.req.json() as CreateUser;
    const user = await db.users.create({ name, email });
    return Response.json(user, { status: 201 });
  },
});
```

### 4.10 `Response.json()` — Deno built-in

```ts
return Response.json({ users: [] });
return Response.json({ error: "Not found" }, { status: 404 });
return Response.json(await db.findAll(), {
  status: 200,
  headers: { "X-Total-Count": "42" },
});
```

### 4.11 Error responses

```ts
import { HttpError } from "fresh";

// Thrown in handler → caught by nearest _error.tsx or Fresh default
throw new HttpError(404, "Project not found");
throw new HttpError(403);
throw new HttpError(500, "Database connection failed");

// Or return directly (bypasses _error.tsx):
return new Response("Internal error", { status: 500 });
```

### 4.12 Redirect patterns

```ts
// From handler via ctx
ctx.redirect("/login");                    // 303
ctx.redirect("/login", 301);               // permanent

// From handler returning Response
return new Response(null, {
  status: 303,
  headers: { Location: "/done" },
});
```
