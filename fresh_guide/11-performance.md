# 11 — Performance & Asset Pipeline

> staticFiles, cache busting, image optimization, lazy-loading islands, server-first rendering

## 1. staticFiles() — Serve Static Assets

```ts
// main.ts
import { App, staticFiles } from "fresh";

const app = new App()
  .use(staticFiles());  // serves static/ at root URL

await app.listen({ port: 8000 });
```

- **Required** for islands to work — client-side JS chunks are served from here.
- Streams files from disk with `ETag` headers for conditional requests.
- Files in `static/` are mapped to root URL: `static/favicon.ico` → `/favicon.ico`.

## 2. static/ — What Goes Here

| Directory | Purpose | Access |
|-----------|---------|--------|
| `static/` | Files referenced by URL (favicon.ico, fonts, robots.txt, PDFs, images) | Served as-is at root URL |
| `assets/` | Files **imported** in code (CSS, icons, JS) | Processed by Vite (hashed, optimized) |

```tsx
// DO: use root-relative URLs in HTML
<img src="/image/photo.png" />        // ✅ absolute path
<link rel="icon" href="/favicon.ico" /> // ✅

// DON'T
<img src="image/photo.png" />         // ❌ relative — breaks in nested routes
import logo from "../static/logo.svg"; // ❌ duplicates file in build
```

**NEVER import from `static/`**. Vite processes it as module → duplicate in bundle, no ETag, wrong caching.

## 3. Multiple Static Directories

```ts
// vite.config.ts
import { defineConfig } from "vite";
import fresh from "@fresh/plugin-vite";

export default defineConfig({
  plugins: [fresh({ staticDir: ["static", "generated"] })],
});
```

- First directory wins on name conflict.
- `generated/` useful for build-time generated assets (OG images, sitemaps).

## 4. Cache Busting — asset()

```tsx
import { asset } from "fresh/runtime";

export default function About() {
  return <a href={asset("/brochure.pdf")}>View brochure</a>;
}
```

Adds `?__frsh_c=` + content hash query param → **1-year cache lifetime** in browser.

```html
<!-- Rendered output -->
<a href="/brochure.pdf?__frsh_c=a1b2c3d4">View brochure</a>
```

## 5. Cache Busting — assetSrcSet()

```tsx
import { assetSrcSet } from "fresh/runtime";

export default function Gallery() {
  return (
    <img
      src="/photo.jpg"
      srcset={assetSrcSet("/photo-640.jpg 640w, /photo-1280.jpg 1280w")}
    />
  );
}
```

Formats:
- `"url descriptor, url descriptor, ..."` (whitespace-separated)
- Array of strings: `["/img.jpg 1x", "/img@2x.jpg 2x"]`
- Mixed: `"/img.jpg, /img@2x.jpg 2x"` (comma-separated for same descriptor)

```html
<!-- Rendered output -->
<img src="/photo.jpg?__frsh_c=a1b2" srcset="/photo-640.jpg?__frsh_c=c3d4 640w, /photo-1280.jpg?__frsh_c=e5f6 1280w" />
```

## 6. Automatic Cache Headers on `<img>` and `<source>`

Fresh **auto-adds** `?__frsh_c=` to `src` and `srcset` on `<img>` and `<source>` tags.

```tsx
// Auto-cache-busted — no asset() needed
<img src="/hero.jpg" />
// Renders: <img src="/hero.jpg?__frsh_c=abc123" />

<picture>
  <source srcset="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" />
</picture>
// Both srcset and src get cache-busted
```

**Opt-out** per tag with `data-fresh-disable-lock`:

```tsx
<img src="/user-avatar.png" data-fresh-disable-lock />
// Renders: <img src="/user-avatar.png" />   (no cache bust)
```

## 7. Image Optimization — vite-imagetools

Build-time optimization. Zero runtime overhead.

```bash
deno add -D npm:vite-imagetools
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import fresh from "@fresh/plugin-vite";
import { imagetools } from "vite-imagetools";

export default defineConfig({
  plugins: [fresh(), imagetools()],
});
```

```tsx
// Import optimized images directly
import heroAvif from "../static/hero.jpg?format=avif&w=800";
import heroWebp from "../static/hero.jpg?format=webp&w=800";

export default function Page() {
  return (
    <picture>
      <source srcset={heroAvif} type="image/avif" />
      <source srcset={heroWebp} type="image/webp" />
      <img src={heroWebp} alt="Hero" width={800} height={400} />
    </picture>
  );
}
```

Common `imagetools` directives:

| Directive | Example | Effect |
|-----------|---------|--------|
| `?w=800` | `?w=800` | Resize width (maintains ratio) |
| `?h=600` | `?h=600` | Resize height |
| `?format=avif` | `?format=avif` | Convert to AVIF |
| `?format=webp` | `?format=webp` | Convert to WebP |
| `?quality=80` | `?quality=80` | Compression quality (0–100) |
| `?blur=10` | `?blur=10` | Gaussian blur |
| `?&as=metadata` | `?w=800&as=metadata` | Return JSON `{width,height,src}` |

```tsx
// metadata mode — useful for width/height
import heroMeta from "../static/hero.jpg?w=800&as=metadata";
// heroMeta = { width: 800, height: 600, src: "/static/hero.jpg?..." }
```

**CDN services** (runtime optimization):
- Cloudflare Images / imgix / Cloudinary
- Transform via URL params: `cdn.com/img.jpg?w=800&fm=webp`
- Use `asset()` for cache-busted URLs pointing to CDN.

## 8. Image Best Practices

```tsx
export default function Hero() {
  return (
    <picture>
      <source srcset={asset("/hero.avif")} type="image/avif" />
      <source srcset={asset("/hero.webp")} type="image/webp" />
      <img
        src={asset("/hero.jpg")}
        srcset={assetSrcSet("/hero-640.jpg 640w, /hero-1280.jpg 1280w")}
        sizes="(max-width: 640px) 100vw, 50vw"
        width={1280}
        height={720}
        alt="Hero"
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
```

| Practice | Why |
|----------|-----|
| `<picture>` + WebP/AVIF fallbacks | Modern formats are 30–50% smaller |
| `srcset` + `sizes` | Browser picks optimal resolution for viewport |
| `width` + `height` on `<img>` | Prevents Cumulative Layout Shift (CLS) |
| `loading="lazy"` | Defers below-the-fold images |
| `decoding="async"` | Non-blocking decode for off-screen images |
| `asset()` / `assetSrcSet()` | 1-year cache lifetime |

## 9. Build Process

```bash
deno task build
```

Internally runs Vite build:

1. **Discover** — finds all islands and their dependencies
2. **Bundle** — bundles client JS with code splitting (one chunk per island by default)
3. **Server entry** — generates `_fresh/server.js`
4. **Hash assets** — all imported assets get content-hash filenames

Output:
```
_fresh/
├── server.js            # Production server entry
├── snapshot.js          # Build manifest
└── static/
    └── chunk-abc123.js  # Island chunks + hashed assets
```

**Production deploy:**

```bash
deno serve -A _fresh/server.js
```

Or via `deno.json` task:

```json
{
  "tasks": {
    "start": "deno serve -A _fresh/server.js"
  }
}
```

## 10. Lazy Loading Islands — Code Splitting

Split heavy islands into separate chunks loaded on demand.

```tsx
// islands/HeavyFeature.tsx
import { lazy, Suspense } from "preact/compat";

const Chart = lazy(() => import("../components/Chart.tsx"));
const Map = lazy(() => import("../components/Map.tsx"));

export default function HeavyFeature() {
  return (
    <div>
      <Suspense fallback={<p>Loading chart...</p>}>
        <Chart />
      </Suspense>
      <Suspense fallback={<p>Loading map...</p>}>
        <Map />
      </Suspense>
    </div>
  );
}
```

- `Chart` and `Map` each become separate JS chunks — **not** loaded with initial page.
- Chunks load only when the island hydrates and `Suspense` resolves.
- Use for heavy dependencies (chart libraries, maps, rich text editors).

**Lazy loading route-level islands:**

```tsx
// routes/dashboard.tsx
import { lazy, Suspense } from "preact/compat";

const AnalyticsIsland = lazy(() => import("../islands/Analytics.tsx"));

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading analytics...</div>}>
        <AnalyticsIsland />
      </Suspense>
    </div>
  );
}
```

## 11. Server-First Rendering — Performance Benefits

Fresh renders pages **fully on the server** before sending HTML. Islands hydrate afterwards.

**Advantages:**

| Aspect | Benefit |
|--------|---------|
| **No blank screens** | Full content visible immediately — no client-side rendering flash |
| **SEO** | Search engines see complete content without JS execution |
| **No-JS fallback** | Page works without JavaScript (forms via form actions, links work) |
| **JSX precompile** | Fresh precompiles JSX to raw string concatenation at build time — faster than React's virtual DOM at runtime |

```ts
// Precompile transform (built into Fresh, no config needed)
// Converts JSX to string concat at build time:
// Before: <div class="foo"><span>hello</span></div>
// After:  `<div class="foo"><span>hello</span></div>`
```

## 12. Manual Cache Headers

```ts
// routes/user/_middleware.ts
import { define } from "fresh";

export default define.middleware(async (ctx) => {
  const response = await ctx.next();
  response.headers.set("Cache-Control", "public, max-age=3600, immutable");
  return response;
});
```

Common patterns:

```ts
// Static page — cache aggressively
resp.headers.set("Cache-Control", "public, max-age=86400, immutable");

// API response — short TTL
resp.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");

// Private user data — no shared cache
resp.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
```

## 13. ETag — Built-In

`staticFiles()` auto-generates `ETag` headers based on file content hash.

```
GET /style.css HTTP/1.1
If-None-Match: "abc123"

HTTP/1.1 304 Not Modified     ← server returns 304, no body transferred
ETag: "abc123"
```

No config needed. Fresh handles `If-None-Match` requests and returns `304 Not Modified` when the file hasn't changed.

## 14. Keep Island Props Small

```tsx
// ❌ Large props — every byte serialized into HTML
<ProfileIsland
  user={JSON.stringify(fullUserObject)}       // 2KB in HTML
  posts={JSON.stringify(allPosts)}            // 20KB in HTML
  friends={JSON.stringify(friendsList)}       // 5KB in HTML
/>

// ✅ Pass IDs — fetch rest client-side
<ProfileIsland userId={user.id} />

// islands/ProfileIsland.tsx
export default function ProfileIsland({ userId }: { userId: string }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}/profile`).then(r => r.json()).then(setData);
  }, [userId]);

  return data ? <Profile data={data} /> : <Skeleton />;
}
```

**Rule of thumb:** Props < 500 bytes. If your props look like a JSON dump, create an API endpoint.

## 15. Summary Checklist

| Layer | Action |
|-------|--------|
| **Static files** | `staticFiles()` in `main.ts`; no imports from `static/` |
| **Cache busting** | `asset()` for links, `assetSrcSet()` for images |
| **Images** | WebP/AVIF `<picture>`, `srcset`+`sizes`, `width`+`height` |
| **Build** | `deno task build` → `deno serve -A _fresh/server.js` |
| **Code splitting** | `lazy()` + `Suspense` for heavy islands |
| **Cache headers** | Middleware for custom `Cache-Control`; ETag is automatic |
| **Island props** | Pass IDs, not full objects; keep < 500 bytes |
