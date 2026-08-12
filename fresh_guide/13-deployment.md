# 13 — Deployment

> Production build, Deno Deploy, Docker, deno compile, Cloudflare Workers, reverse proxy, basePath, pre-deploy checklist

## 1. Production Build

```sh
deno install --allow-scripts
deno task build    # vite build → _fresh/
```

Output is `_fresh/server.js` — the **only** entry point in production. `main.ts` is for development only.

```sh
deno task start   # deno serve -A _fresh/server.js
```

`_fresh/` **must** be in `.gitignore`:

```gitignore
_fresh/
```

### deno.json tasks

```json
{
  "tasks": {
    "dev": "vite",
    "build": "vite build",
    "start": "deno serve -A _fresh/server.js",
    "preview": "deno serve -A _fresh/server.js"
  }
}
```

`start` and `preview` are identical — both serve `_fresh/server.js`. Use `start` as the canonical production task.

---

## 2. Deno Deploy (Recommended)

Deploy via the [Deno Deploy dashboard](https://dash.deno.com):

| Step | Action |
|------|--------|
| 1 | Log in at dash.deno.com |
| 2 | Create new project |
| 3 | Link GitHub repository |
| 4 | Select **"Fresh" preset** |

### What the Fresh preset does

- Runs `deno task build` during deployment
- Entry point: `_fresh/server.js` (NOT `main.ts`)
- Auto-collects **OpenTelemetry traces**, **request metrics**, and **HTTP metrics**

### Environment variables

Set in **Settings > Environment Variables** in the dashboard. Accessible via `Deno.env.get("KEY")`.

**For islands (client-side):** prefix with `FRESH_PUBLIC_`:

```
FRESH_PUBLIC_API_URL=https://api.example.com
```

Access in islands:

```ts
// islands/Counter.tsx
const apiUrl = Deno.env.get("FRESH_PUBLIC_API_URL");
```

These are inlined at build time into client bundles.

### Custom domains

**Settings > Domains** → add domain → update DNS CNAME → auto-TLS via Let's Encrypt.

### Branch previews

Every PR gets an automatic preview deployment. URL pattern: `{branch}--{project}.deno.dev`.

---

## 3. Docker

```dockerfile
FROM denoland/deno:latest

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

WORKDIR /app

COPY . .
RUN deno install --allow-scripts
RUN deno task build

EXPOSE 8000

CMD ["deno", "serve", "-A", "_fresh/server.js"]
```

### Build & run

```sh
docker build --build-arg GIT_REVISION=$(git rev-parse HEAD) -t my-fresh-app .
docker run -t -i -p 80:8000 my-fresh-app
```

### CRITICAL: DENO_DEPLOYMENT_ID

`DENO_DEPLOYMENT_ID` **must change** whenever **any** file changes. Use git commit hash or a hash of the file tree:

```sh
# Git hash (recommended)
GIT_REVISION=$(git rev-parse HEAD)

# Alternative: file tree hash
FILE_HASH=$(find . -type f -not -path './.git/*' -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)
```

Without a unique `DENO_DEPLOYMENT_ID` per deployment, stale caches **will** break your app — old JS/CSS bundles reference removed chunks, hydration fails silently.

### Why `deno install --allow-scripts` first

NPM packages (e.g., Tailwind CSS via `@tailwindcss/vite`) depend on `node_modules/`. Running `deno install --allow-scripts` populates `node_modules/` **before** `vite build` runs. If skipped, the build fails with `ERR_MODULE_NOT_FOUND` or Tailwind classes produce no CSS.

---

## 4. `deno compile` (Self-Contained Binary)

```sh
deno task build
deno compile --output my-app --include _fresh -A _fresh/compiled-entry.js
```

Produces a single binary (~50–130 MB; includes Deno runtime) with everything baked in.

### Entry point

After `deno task build`, `_fresh/compiled-entry.js` is generated. This is a wrapper that registers all routes and starts the server. Use it for `deno compile`, **not** `_fresh/server.js`.

### Runtime configuration

Environment variables only (no CLI flags in the compiled binary):

```sh
PORT=4000 HOSTNAME=0.0.0.0 ./my-app
```

### Cross-compilation

```sh
deno compile --target x86_64-unknown-linux-gnu --output my-app --include _fresh -A _fresh/compiled-entry.js
```

| Target | OS |
|--------|----|
| `x86_64-unknown-linux-gnu` | Linux x64 |
| `aarch64-unknown-linux-gnu` | Linux ARM64 |
| `x86_64-pc-windows-msvc` | Windows x64 |

### Limitations

- Dynamic imports (`import(path)`) may not be discovered at compile time → missing routes at runtime. Use static imports.
- Native NPM packages (`@img/sharp`, `better-sqlite3`) require a target matching the host — cross-compile on the same architecture or in CI.

---

## 5. Cloudflare Workers

### Setup

```sh
deno install --allow-scripts npm:@cloudflare/vite-plugin npm:wrangler
```

### vite.config.ts

```ts
import { defineConfig } from "$fresh/vite-config";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflare()],
});
```

### Worker entry — `server.js`

```js
// server.js — Cloudflare worker entry point
import server from "./_fresh/server.js";

export default {
  fetch: server.fetch,
};
```

### wrangler.jsonc

```jsonc
{
  "name": "my-fresh-app",
  "main": "./server.js",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"]
}
```

### Deploy

```sh
deno task build
npx wrangler deploy
```

---

## 6. Port Configuration

### Development

```ts
// vite.config.ts
import { defineConfig } from "$fresh/vite-config";

export default defineConfig({
  server: { port: 3000 },
});
```

`deno task dev` picks up `server.port` from this config.

### Production

```sh
deno serve --port 4000 -A _fresh/server.js
```

### `app.listen()` — only for `deno run main.ts`

```ts
// main.ts — dev entry only, NOT used in production
app.listen({ port: 4000 });
```

This bypasses `deno serve` and its multi-worker benefits. **Never** use `app.listen()` with `start`/`preview`/`deno serve` tasks. Only use it when running directly: `deno run -A main.ts`.

---

## 7. Reverse Proxy (nginx, Caddy)

Enable proxy trust so `ctx.url` reflects the client-facing URL:

```ts
const app = new App({ trustProxy: true });
```

This reads `X-Forwarded-Proto` and `X-Forwarded-Host` headers, so:
- `ctx.url` returns `https://example.com/foo` instead of `http://localhost:8000/foo`
- Redirects use the correct scheme and host

**WARNING:** Only enable behind a trusted proxy. Exposing it directly allows clients to spoof headers (IP/log spoofing).

### Example nginx config

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 8. `basePath` — Mount Under a Path Prefix

Host the app under a subdirectory like `/my-app`:

```ts
const app = new App({ basePath: "/my-app" });
```

Effects:
- Route `/about` → served at `/my-app/about`
- `<a href="/about">` → rewritten to `<a href="/my-app/about">`
- `ctx.config.basePath` available in handlers

```ts
export const handler = define.handlers({
  GET(ctx) {
    const basePath = ctx.config.basePath; // "/my-app"
    // ...
  },
});
```

---

## 9. Pre-Deploy Checklist

Before shipping to production, verify:

```sh
deno task build    # must succeed with exit 0
deno task start    # must serve correctly on localhost
```

- [ ] `deno task build` succeeds (no errors, all assets generated in `_fresh/`)
- [ ] `_fresh/` in `.gitignore`
- [ ] `deno task start` works locally — visit pages, test islands, check console
- [ ] `DENO_DEPLOYMENT_ID` set (Docker) or managed by platform (Deno Deploy auto-handles)
- [ ] Environment variables configured (check `FRESH_PUBLIC_` prefix for islands)
- [ ] Entry point is `_fresh/server.js` (NOT `main.ts`)
- [ ] `trustProxy: true` if behind nginx/Caddy/load balancer
- [ ] Custom domain DNS and TLS verified (Deno Deploy: Settings > Domains)
