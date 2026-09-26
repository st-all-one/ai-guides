---
name: vite
description: >
  Vite 8: config, Rolldown/Oxc build optimization, code-splitting, assets/CSS,
  plugins, Environment API, SSR, HMR, deployment, library mode, advanced options,
  v8 migration. Load when configuring, optimizing, or debugging front-end builds
  with Vite.
category: tooling
version: "8"
tags: [vite, rolldown, oxc, build, hmr, ssr, plugins, code-splitting, deployment]
license: MIT
---

# Vite 8

## Use When
- Configuring/organizing `vite.config.ts`
- Optimizing builds (Rolldown/Oxc, chunking, minification)
- Writing plugins or using the Environment API
- SSR, HMR, library mode, deployment
- Migrating from Vite 7 → 8

## Core Rules
- Vite 8 uses **Rolldown** (Rust bundler) and **Oxc**; Lightning CSS for CSS.
- `vite` (dev) vs `vite build` vs `vite preview`; keep `mode` and `.env.*` files distinct.
- Env vars: only `VITE_`-prefixed are exposed to client code; never expose secrets.
- Use dynamic `import()` for route-level code-splitting; `manualChunks` for vendor splitting.
- Prefer `resolve.alias` and `optimizeDeps` tuning over ad-hoc hacks.
- SSR: separate client/server entries; externalize deps appropriately.
- Asset handling: `import` for hashed URLs; `public/` for verbatim files.
- Plugins: implement the minimal hooks; avoid mutating others' transforms.
- Library mode: set `build.lib` + `rollupOptions.external`; emit types separately.
- CI/deploy: reproducible lockfile, `base` correct, precompress (brotli/gzip).

## Core Patterns
```ts
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: "/",
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  build: {
    target: "es2022",
    sourcemap: mode !== "production",
    rollupOptions: {
      output: {
        manualChunks: { vendor: ["preact", "@preact/signals"] },
      },
    },
  },
  server: { port: 5173, proxy: { "/api": "http://localhost:8080" } },
}));
```

```ts
// lazy route
const Page = () => import("./routes/Page");
// glob import
const modules = import.meta.glob("./features/*/index.ts", { eager: true });
```

## File Map
| File | Content |
|---|---|
| `01-introduction.md` | Vite 8, Rolldown, Oxc, Lightning CSS |
| `02-configuration.md` | Config file, define, env, modes |
| `03-build-optimization.md` | Pipeline, minify, tree-shake, chunking |
| `04-code-splitting.md` | Dynamic imports, manual chunks, lazy loading |
| `05-assets-and-css.md` | Assets, CSS, preprocessors |
| `06-plugin-development.md` | Plugin API and hooks |
| `07-environment-api.md` | Environment API (client/ssr/custom) |
| `08-performance.md` | Dev/build performance tuning |
| `09-migration-v8.md` | Upgrading to Vite 8 |
| `10-ssr.md` | SSR setup and externalization |
| `11-deployment.md` | Build output, CDN, precompression |
| `12-javascript-api.md` | `createServer`/`build` JS API |
| `13-hmr-api.md` | HMR API |
| `14-glob-imports-env.md` | `import.meta.glob`, env handling |
| `15-cli-troubleshooting.md` | CLI and diagnostics |
| `16-backend-advanced-base.md` | Backends and `base` edge cases |
| `17-dep-breaking-changes.md` | Dependency/breaking changes |
| `18-library-mode.md` | Library build |
| `19-server-options-deep.md` | Server options deep dive |
| `20-build-options-deep.md` | Build options deep dive |
| `21-config-edge-cases.md` | Config edge cases |
| `22-css-svg-performance.md` | CSS/SVG performance |
| `23-plugin-supplements.md` | Plugin supplements |
| `24-preview-worker-deploy.md` | Preview/worker deploy |
| `25-recommended-implementation.md` | Reference implementation |

## Read Order
`01`→`02`→`03`; splitting `04`; plugins `06`; SSR `10`; migration `09`.

## Prereqs
Node.js and modern JS/TS; basic bundler concepts.
