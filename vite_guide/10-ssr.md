# SSR (Server-Side Rendering) — Vite Moderno

## Arquitetura SSR com Vite

```
                    Browser                         Server (Node.js)
                    ┌─────────┐                     ┌──────────────┐
                    │  SPA     │                     │  Vite Dev     │
                    │  Hydrate │◄────────────────────│  Server       │
                    │          │                     │              │
                    └─────────┘                     │  entry-server │
                                                     │  → render()   │
                    ┌─────────┐                     │              │
                    │  Static  │                     │  HTML String  │
                    │  HTML    │◄────────────────────│  + CSS links  │
                    └─────────┘                     └──────────────┘
```

## Estrutura de Projeto SSR

```
project/
├── index.html                   # Template HTML
├── server.js                    # Servidor Node.js (produção)
├── vite.config.ts
├── src/
│   ├── main.ts                  # Código universal (app)
│   ├── entry-client.tsx         # Hydration no browser
│   └── entry-server.tsx         # Renderização no servidor
└── dist/
    ├── client/                  # Build client
    └── server/                  # Build server
```

## entry-client.tsx

```tsx
import { hydrateRoot } from 'react-dom/client'
import { App } from './App'

hydrateRoot(document.getElementById('root')!, <App />)
```

## entry-server.tsx

```tsx
import { renderToString } from 'react-dom/server'
import { App } from './App'

export function render(url: string) {
  return renderToString(<App />)
}
```

## Dev Server Setup

```ts
// server.dev.js
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
})

const app = express()

app.use(vite.middlewares)

app.use('*', async (req, res) => {
  const url = req.originalUrl

  // 1. Ler template HTML
  const template = fs.readFileSync('index.html', 'utf-8')

  // 2. Aplicar transformações Vite (HMR, etc)
  const html = await vite.transformIndexHtml(url, template)

  // 3. SSR render
  const { render } = await vite.ssrLoadModule('/src/entry-server.ts')
  const appHtml = render(url)

  // 4. Inserir HTML renderizado
  const finalHtml = html.replace('<!--ssr-outlet-->', appHtml)

  // 5. Enviar resposta
  res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml)
})

app.listen(5173)
```

## Production Build

```bash
# Build client
vite build --outDir dist/client

# Build server
vite build --outDir dist/server --ssr src/entry-server.ts
```

```json
{
  "scripts": {
    "build:ssr": "npm run build:client && npm run build:server",
    "build:client": "vite build --outDir dist/client",
    "build:server": "vite build --outDir dist/server --ssr src/entry-server.ts",
    "serve": "node server.prod.js"
  }
}
```

## Production Server

```ts
// server.prod.js
import express from 'express'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

// Servir assets estáticos
app.use('/assets', express.static('dist/client/assets', {
  maxAge: '1y',
  immutable: true,
}))

app.use('/', express.static('dist/client', {
  maxAge: 0,
}))

// SSR handler
app.use('*', async (req, res) => {
  const { render } = await import('./dist/server/entry-server.js')
  const template = fs.readFileSync('dist/client/index.html', 'utf-8')
  const appHtml = render(req.originalUrl)
  const html = template.replace('<!--ssr-outlet-->', appHtml)
  res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
})

app.listen(4173)
```

## SSR com ModuleRunner (Vite 8+)

```ts
// Dev server moderno (Vite 8)
app.use('*', async (req, res) => {
  const url = req.originalUrl

  // 1. Template
  const template = fs.readFileSync('index.html', 'utf-8')

  // 2. Transform HTML com Vite
  const html = await vite.transformIndexHtml(url, template)

  // 3. SSR com ModuleRunner
  const serverEnv = vite.environments.ssr
  const { render } = await serverEnv.runner.import('/src/entry-server.ts')
  const appHtml = render(url)

  // 4. Montar HTML final
  const finalHtml = html.replace('<!--ssr-outlet-->', appHtml)

  res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml)
})
```

## SSR Config Otimizada

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    minify: 'oxc',
    cssMinify: 'lightningcss',
  },

  environments: {
    client: {
      build: {
        outDir: 'dist/client',
        manifest: true,
        ssrManifest: true,     // Gera .vite/ssr-manifest.json
      },
    },

    ssr: {
      resolve: {
        conditions: ['module', 'node'],
        externalConditions: ['node'],
      },
      build: {
        outDir: 'dist/server',
        ssr: 'src/entry-server.ts',
        minify: false,
        sourcemap: true,       // Importante para stack traces
        emitAssets: false,     // Assets ficam no build client
      },
    },
  },
})
```

## SSR Externals

```ts
ssr: {
  // Por padrão, dependências são externalizadas (não bundadas)
  // Para forçar bundar uma dependência:
  noExternal: ['some-esm-only-lib'],

  // ou tudo:
  noExternal: true,

  // Para forçar externalizar linked deps:
  external: ['@my-org/my-lib'],
}
```

## SSR Manifest

```bash
# Gerar durante build client
vite build --outDir dist/client --ssrManifest
```

O `ssr-manifest.json` mapeia módulos → chunks, permitindo:

```ts
// No server, gerar preload directives
const manifest = JSON.parse(
  fs.readFileSync('dist/client/.vite/ssr-manifest.json', 'utf-8')
)

function renderPreloadLinks(url: string): string {
  const deps = manifest[url]
  if (!deps) return ''
  return deps
    .filter((dep: string) => dep.endsWith('.css'))
    .map((css: string) => `<link rel="stylesheet" href="${css}">`)
    .join('\n')
}
```

## Preloading com SSR

```ts
// entry-server.ts
export function render(url: string) {
  const { pipe, injectToStream } = renderToPipeableStream(<App />, {
    onShellReady() {
      // Injetar CSS critical + preload links
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          ${renderPreloadLinks(url)}
        </head>
        <body>
          <div id="root">${appHtml}</div>
        </body>
        </html>
      `
    },
  })
}
```

## Stream SSR (React 18+)

```ts
import { renderToPipeableStream } from 'react-dom/server'

export function render(url: string) {
  return new Promise((resolve, reject) => {
    const stream = renderToPipeableStream(<App />, {
      bootstrapScripts: ['/src/entry-client.tsx'],
      onShellReady() {
        const chunks: string[] = []
        stream.pipe(new Writable({
          write(chunk, encoding, callback) {
            chunks.push(chunk.toString())
            callback()
          },
          final() {
            resolve(chunks.join(''))
          },
        }))
      },
      onError(error) {
        reject(error)
      },
    })
  })
}
```

## SSG (Static Site Generation)

```ts
// prerender.js
import { render } from './dist/server/entry-server.js'
import fs from 'fs'

const routes = ['/', '/about', '/contact']

for (const route of routes) {
  const appHtml = render(route)
  const template = fs.readFileSync('dist/client/index.html', 'utf-8')
  const html = template.replace('<!--ssr-outlet-->', appHtml)

  const dir = `dist/static${route === '/' ? '' : route}`
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(`${dir}/index.html`, html)
}
```

## Dicas de Performance SSR

1. **Source maps** em produção para stack traces
2. **Stream** em vez de `renderToString` para TTFB menor
3. **Cache** de renderizações para rotas públicas
4. **Externalizar** dependências grandes (`ssr.external`)
5. **ModuleRunner** em vez de `ssrLoadModule` (Vite 8+)
6. **SSR Manifest** para preload otimizado de CSS/assets
7. **`build.emitAssets: true`** em SSR se precisar de assets no server

## Tratamento de Erros

```ts
app.use('*', async (req, res) => {
  try {
    const { render } = await serverEnv.runner.import('/src/entry-server.ts')
    const appHtml = render(req.originalUrl)
    // ...
  } catch (err) {
    // Em dev: Vite pode melhorar stack trace
    if (process.env.NODE_ENV === 'development') {
      vite.ssrFixStacktrace(err)
    }
    console.error('SSR Error:', err)
    res.status(500).send('Internal Server Error')
  }
})
```
