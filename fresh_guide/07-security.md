# 07 — Security & Cross-Cutting

> CSRF, CSP, CORS, IP Filtering, cookies, headers, env vars, raw HTML, markdown, daisyUI

## 1. CSRF Protection — `csrf()` Middleware

```ts
import { csrf } from "fresh";

// Basic: checks Sec-Fetch-Site + Origin headers
app.use(csrf());

// Single origin
app.use(csrf({ origin: "https://example.com" }));

// Multiple origins
app.use(csrf({ origin: ["https://example.com", "https://trusted.example.com"] }));

// Dynamic origin — function returning boolean
app.use(csrf({
  origin: (origin) => /^https:\/\/(foo|bar)\.example\.com$/.test(origin),
}));
```

**How it works:** Verifies state-changing requests (POST, PUT, DELETE, PATCH) come from your own site. Checks `Sec-Fetch-Site` header first, falls back to `Origin` header. GET/HEAD/OPTIONS are never checked.

**When it blocks:** Responds 403 if neither header matches the allowed origin(s).

## 2. CSP — Content-Security-Policy

```ts
import { csp } from "fresh";

// Report-only mode — violations logged, policy NOT enforced
app.use(csp({ reportOnly: true }));

// Full policy with reporting endpoint
app.use(csp({
  reportTo: "/api/csp-reports",
  csp: [
    "script-src 'self' 'unsafe-inline' https://example.com",
    "style-src 'self' 'unsafe-inline'",
    "default-src 'self'",
    "img-src 'self' data: https:",
  ],
}));
```

- `reportTo: "/api/csp-reports"` sets both `report-to` and `report-uri` headers and registers a route handler for POST-based violation reports
- `reportOnly: true` sets `Content-Security-Policy-Report-Only` header instead of enforcing

## 3. CSP with Nonce — Strict Mode (No unsafe-inline)

```ts
app.use(csp({ useNonce: true }));
```

**What Fresh does automatically:**
- Generates a fresh random nonce per request
- Injects `nonce="..."` on **every** inline `<script>` and `<style>` tag in your JSX output
- CSP header uses `'nonce-{value}'` instead of `'unsafe-inline'`
- Non-rendered responses (JSON API, redirects, etc.) fall back to `'unsafe-inline'` since there's no HTML to instrument

**Important warnings:**
- Do NOT set explicit `nonce` attributes yourself — Fresh handles it
- If you manually set a nonce that doesn't match the CSP header, the browser **blocks** the tag
- Each request gets a unique nonce → attacker cannot predict it

## 4. CORS — Cross-Origin Resource Sharing

```ts
import { cors } from "fresh";

app.use(cors({
  origin: "http://example.com",
  allowHeaders: ["X-Custom-Header", "Upgrade-Insecure-Requests"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
  maxAge: 600,
  credentials: true,
}));
```

**All options:**

| Option             | Type                     | Default         |
|--------------------|--------------------------|-----------------|
| `origin`           | `string`                 | `"*"`           |
| `allowHeaders`     | `string[]`               | `*` (reflect)   |
| `allowMethods`     | `string[]`               | `*` (reflect)   |
| `exposeHeaders`    | `string[]`               | `[]`            |
| `maxAge`           | `number`                 | `5` (seconds)   |
| `credentials`      | `boolean`                | `false`         |

## 5. IP Filter — Allow / Deny IP Ranges

```ts
import { ipFilter } from "fresh";

// Blocklist
app.use(ipFilter({ denyList: ["192.168.1.10", "10.0.0.0/8"] }));

// Allowlist — only these IPs can access
app.use(ipFilter({ allowList: ["203.0.113.0/24", "2001:db8::/32"] }));

// Combined — deny takes precedence over allow
app.use(ipFilter({
  denyList: ["192.168.1.10"],
  allowList: ["192.168.1.0/24"],
}));
// Result: entire /24 subnet allowed, except .10 is blocked
```

**Custom blocked response:**

```ts
import { ipFilter } from "fresh";

ipFilter({ denyList: ["10.0.0.0/8"] }, {
  onBlocked: (remote, ctx) => {
    console.log(`Blocked ${remote.addr} from ${ctx.url.pathname}`);
    return new Response("Access denied", { status: 401 });
  },
});
```

- Supports IPv4 and IPv6 (CIDR notation)
- Deny **always wins** when both lists are provided
- Reads `X-Forwarded-For` if `trustProxy` is enabled

## 6. Trailing Slashes — URL Consistency

```ts
import { trailingSlashes } from "fresh";

// Never trailing slash: /about/ → 301 redirect to /about
app.use(trailingSlashes("never"));

// Always trailing slash: /about → 301 redirect to /about/
app.use(trailingSlashes("always"));
```

- Only redirects GET/HEAD requests — state-changing methods get a warning log
- Prevents duplicate content SEO issues from `/about` vs `/about/`

## 7. Security Headers — Manual Middleware

```ts
import { define } from "fresh";

export default define.middleware(async (ctx) => {
  const response = await ctx.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains",
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  return response;
});
```

**Quick reference:**

| Header                       | Value                                 | Purpose                          |
|------------------------------|---------------------------------------|----------------------------------|
| `X-Frame-Options`            | `DENY`                                | Prevent clickjacking             |
| `X-Content-Type-Options`     | `nosniff`                             | Block MIME sniffing              |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains` | Enforce HTTPS (2 years)          |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`     | Limit referrer leakage           |
| `Permissions-Policy`         | `camera=(), microphone=()`            | Disable browser features         |

## 8. XSS Prevention

**JSX auto-escapes text content — server AND client (islands):**

```tsx
// SAFE — user input is escaped automatically
<div>{userInput}</div>

// DANGEROUS — raw HTML insertion
<div dangerouslySetInnerHTML={{ __html: sanitize(userInput) }} />
```

- Text children in JSX are **always** HTML-escaped
- `dangerouslySetInnerHTML` — only use with DOMPurify or similar sanitizer
- Markdown: sanitize before rendering (e.g., `marked` + `sanitize-html`)

## 9. Cookie Security — `@std/http`

```ts
import { setCookie } from "@std/http";

setCookie(response.headers, {
  name: "session",
  value: crypto.randomUUID(),
  path: "/",
  httpOnly: true,    // JavaScript cannot read (XSS protection)
  secure: true,      // Only sent over HTTPS (enable in production)
  sameSite: "Lax",   // CSRF protection — blocks cross-site POST
  maxAge: 60 * 60 * 24,  // 1 day
});
```

**Preset for production (set `secure: Deno.env.get("DENO_ENV") === "production"`):**

```ts
const isProd = Deno.env.get("DENO_ENV") === "production";

setCookie(response.headers, {
  name: "session",
  value: crypto.randomUUID(),
  path: "/",
  httpOnly: true,
  secure: isProd,
  sameSite: "Strict",
  maxAge: 60 * 60 * 24,
});
```

**`sameSite` modes:**

| Value     | Behavior                                                    |
|-----------|-------------------------------------------------------------|
| `Strict`  | Cookie never sent on cross-site requests (strictest)        |
| `Lax`     | Sent on top-level GET navigations, blocked on POST (default)|
| `None`    | Sent on all cross-site requests (requires `secure: true`)    |

## 10. trustProxy — Behind Reverse Proxy

```ts
const app = new App({ trustProxy: true });
```

- Reads `X-Forwarded-Proto` to determine if request is HTTPS
- Reads `X-Forwarded-Host` for the original host
- Reads `X-Forwarded-For` for IP filtering (`ipFilter` uses this)

**WARNING:** Only enable behind a **trusted** reverse proxy (nginx, Caddy, Cloudflare, etc.). If exposed directly to the internet, clients can spoof these headers.

## 11. basePath — Serve from Sub-Path

```ts
const app = new App({ basePath: "/my-app" });
```

- Route file `routes/about.tsx` responds at `/my-app/about`
- All generated links and redirects auto-prefix with `basePath`
- Available in context: `ctx.config.basePath`

```ts
// routes/_middleware.ts
app.use(async (ctx) => {
  console.log(ctx.config.basePath); // "/my-app"
  return ctx.next();
});
```

## 12. Environment Variables — `FRESH_PUBLIC_` Prefix

```ts
// CORRECT — static access, Fresh inlines at build time
Deno.env.get("FRESH_PUBLIC_FOO");
process.env.FRESH_PUBLIC_FOO;

// WRONG — dynamic access, cannot inline
const name = "FRESH_PUBLIC_FOO";
Deno.env.get(name);   // not analyzable by Fresh compiler
```

- `FRESH_PUBLIC_*` vars are **inlined at build time** into island bundles
- Available in client-side code (islands) and server-side code (routes)
- Non-prefixed vars (`API_KEY`, `DATABASE_URL`) are **server-only**
- Never expose secrets with `FRESH_PUBLIC_` prefix

```ts
// Use in islands safely:
export default function MyIsland() {
  const apiUrl = Deno.env.get("FRESH_PUBLIC_API_URL"); // inlined at build
  return <div>{apiUrl}</div>;
}

// Server-only (routes, middleware):
const dbUrl = Deno.env.get("DATABASE_URL");            // never exposed to client
```

## 13. `dangerouslySetInnerHTML` — Raw HTML Rendering

All text content in Fresh is **always** HTML-escaped (both SSR and islands). To render raw HTML, use Preact's `dangerouslySetInnerHTML`:

```tsx
<div dangerouslySetInnerHTML={{ __html: "<h1>This is raw HTML</h1>" }} />
// Outputs: <div><h1>This is raw HTML</h1></div>
```

**Use cases:** syntax highlighting, markdown rendering, CMS content.

**Security warning:** The naming is intentional — rendering user-supplied HTML enables XSS. Always sanitize first:

```tsx
import DOMPurify from "dompurify";

const clean = DOMPurify.sanitize(userHtml);
<div dangerouslySetInnerHTML={{ __html: clean }} />
```

**Lint suppression required:**

```tsx
{/* deno-lint-ignore react-no-danger */}
<div dangerouslySetInnerHTML={{ __html: safe }} />
```

## 14. Markdown Rendering — `@deno/gfm`

```sh
deno install jsr:@deno/gfm
```

```tsx
// routes/markdown.tsx
import { define } from "@/utils.ts";
import { CSS, render as renderMarkdown } from "@deno/gfm";

export default define.page(async () => {
  const content = await Deno.readTextFile("./content/example.md");
  const html = renderMarkdown(content);

  return (
    <div>
      <h1>Blog Post</h1>
      {/* deno-lint-ignore react-no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* deno-lint-ignore react-no-danger */}
      <div class="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
});
```

**Alternative libraries:** `marked` (npm) + DOMPurify, `remark` (npm).

**For more elaborate markdown systems:** See [Fresh docs website source code](https://github.com/denoland/fresh/tree/main/www).

## 15. daisyUI Setup

daisyUI is a Tailwind CSS component library providing semantic classes (btn, card, modal, etc.).

```sh
deno i -D npm:daisyui@latest
```

```css
/* assets/styles.css */
@import "tailwindcss";
@plugin "daisyui";
```

**Usage:**

```tsx
function Button({ children }: { children: ComponentChildren }) {
  return <button class="btn btn-primary">{children}</button>;
}

function Card() {
  return (
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Title</h2>
        <p>Content</p>
        <div class="card-actions">
          <button class="btn btn-primary">Action</button>
        </div>
      </div>
    </div>
  );
}
```

**Compatibility with `aria-current`:** daisyUI tabs manage their own `aria-current` — Fresh leaves manually-set `aria-current` untouched.
