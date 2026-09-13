# Deploy e Runtimes

> O mesmo `app` roda em qualquer plataforma: só mudam o **adapter/entry point** e o
> comando de deploy. Hono é Web-standard (`Request`/`Response`/`fetch`).

## Tabela-resumo

| Runtime | Adapter / import | Serviço de dev | Deploy |
|---------|------------------|----------------|--------|
| Deno | `Deno.serve(app.fetch)`; `serveStatic` de `hono/deno` | `deno task start` (`:8000`) | Deno Deploy / `deno deploy` |
| Node.js | `import { serve } from '@hono/node-server'`; `serve(app)` | `npm run dev` (`:3000`) | build + Docker/imagem |
| Bun | `export default app` (ou `{ port, fetch: app.fetch }`); `serveStatic` de `hono/bun` | `bun run dev` (`:3000`) | runtime Bun |
| Cloudflare Workers | `export default app`; `@cloudflare/workers-types` | `npm run dev` (Wrangler, `:8787`) | `npm run deploy` |
| Cloudflare Workers + Vite | `@cloudflare/vite-plugin` + `vite-ssr-components`; `export default app` | `npm run dev` (`:5173`) | `npm run deploy` |
| Cloudflare Pages | `export default app`; `handle`/`handleMiddleware` de `hono/cloudflare-pages` | `npm run dev` (`:5173`) | `npm run deploy` / dashboard |
| Vercel | `export default app` (zero-config) | `vercel dev` (`:3000`) | `vercel deploy` |
| Netlify | `handle` de `jsr:@hono/hono/netlify` | `netlify dev` (`:8888`) | `netlify deploy --prod` |
| AWS Lambda | `handle` de `hono/aws-lambda` | `cdk deploy` | `cdk deploy` |
| Lambda@Edge | `handle` de `hono/lambda-edge` | `cdk deploy` | `cdk deploy` |
| Fastly Compute | `fire`/`buildFire` de `@fastly/hono-fastly-compute` | `npm run start` (`:7676`) | `npm run deploy` |
| Azure Functions | `azureHonoHandler` de `@marplex/hono-azurefunc-adapter` | `npm run start` (`:7071`) | `func azure functionapp publish` |
| Google Cloud Run | `@hono/node-server` (porta `8080`) | `npm run dev` (`:8080`) | `gcloud run deploy --source .` |
| Service Worker | `handle`/`fire` de `hono/service-worker` | `vite dev` (`:5173`) | hospedar bundle |
| WebAssembly (WASI) | `fire` + `incomingHandler` de `@bytecodealliance/jco-std/.../hono/server` | `jco serve` (`:8000`) | runtime WASI (`wasmtime`) |
| Supabase Edge Functions | `Deno.serve(app.fetch)` | `supabase functions serve` | `supabase functions deploy` |
| Next.js | `handle` de `hono/vercel` (App Router) / `getRequestListener` (Pages) | `npm run dev` (`:3000`) | Vercel (via Git) |
| Tencent CloudBase | `@hono/node-server` (porta `9000`) + `scf_bootstrap` | `npm run dev` (`:9000`) | `tcb fn deploy --httpFn` |
| Alibaba Function Compute | `handle` de `hono-alibaba-cloud-fc3-adapter` | `npm run build`/`npm run deploy` | `s deploy -y` |

## Deno

Runtime V8, não Node. Hono está no npm **e** no JSR. Starter:

```sh
deno init --npm hono --template=deno my-app
cd my-app
```

`main.ts`:

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Deno!'))

Deno.serve(app.fetch)
```

Trocar porta:

```ts
Deno.serve(app.fetch) // [!code --]
Deno.serve({ port: 8787 }, app.fetch) // [!code ++]
```

Rodar: `deno task start` → `http://localhost:8000`. Deploy: **Deno Deploy**.

### Static files

```ts
import { Hono } from 'hono'
import { serveStatic } from 'hono/deno'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }))
app.get('/', (c) => c.text('You can access: /static/hello.txt'))
app.get('*', serveStatic({ path: './static/fallback.txt' }))

Deno.serve(app.fetch)
```

Opções: `rewriteRequestPath`, `mimes`, `onFound`, `onNotFound`, `precompressed`
(prioriza Brotli, depois Zstd, depois Gzip).

```ts
app.get(
  '/static/*',
  serveStatic({
    root: './',
    rewriteRequestPath: (path) => path.replace(/^\/static/, '/statics'),
    mimes: {
      m3u8: 'application/vnd.apple.mpegurl',
      ts: 'video/mp2t',
    },
    onFound: (_path, c) => {
      c.header('Cache-Control', `public, immutable, max-age=31536000`)
    },
    onNotFound: (path, c) => {
      console.log(`${path} is not found, you access ${c.req.path}`)
    },
    precompressed: true,
  })
)
```

### Import maps (npm vs JSR)

```json
{
  "imports": {
    "hono": "jsr:@hono/hono"
  }
}
```

Para usar `npm:hono`:

```json
{
  "imports": {
    "hono": "npm:hono",
    "hono/": "npm:/hono/"
  }
}
```

Use Hono do **mesmo registry** do middleware de terceiros:

```json
{
  "imports": {
    "hono": "npm:hono",
    "zod": "npm:zod",
    "@hono/zod-validator": "npm:@hono/zod-validator"
  }
}
```

### Testing

```sh
deno add jsr:@std/assert
```

```ts
import { Hono } from 'hono'
import { assertEquals } from '@std/assert'

Deno.test('Hello World', async () => {
  const app = new Hono()
  app.get('/', (c) => c.text('Please test me'))

  const res = await app.request('http://localhost/')
  assertEquals(res.status, 200)
})
```

```sh
deno test hello.ts
```

## Node.js

Requer Node.js `18.14.1+` (18.x), `19.7.0+` (19.x), `20.0.0+` (20.x).

`src/index.ts`:

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Node.js!'))

serve(app)
```

`serve()` embrulha `node:http` e retorna o server — shutdown é responsabilidade sua:

```ts
const server = serve(app)

// graceful shutdown
process.on('SIGINT', () => {
  server.close()
  process.exit(0)
})
process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})
```

Rodar: `npm run dev` → `http://localhost:3000`.

Trocar porta:

```ts
serve({
  fetch: app.fetch,
  port: 8787,
})
```

### WebSocket

`@hono/node-ws` está deprecado. O suporte é nativo em `@hono/node-server` (instale `ws` e `@types/ws`):

```ts
import { serve, upgradeWebSocket } from '@hono/node-server'
import { Hono } from 'hono'
import { WebSocketServer } from 'ws'

const app = new Hono()

app.get(
  '/ws',
  upgradeWebSocket(() => ({
    onMessage(event, ws) {
      ws.send(event.data)
    },
  }))
)

const wss = new WebSocketServer({ noServer: true })

serve({
  fetch: app.fetch,
  websocket: { server: wss },
})
```

### APIs cruas do Node

```ts
import { Hono } from 'hono'
import { serve, type HttpBindings } from '@hono/node-server'
// or `Http2Bindings` if you use HTTP2

type Bindings = HttpBindings & {
  /* ... */
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.json({
    remoteAddress: c.env.incoming.socket.remoteAddress,
  })
})

serve(app)
```

### Static files

```ts
import { serveStatic } from '@hono/node-server/serve-static'

app.use('/static/*', serveStatic({ root: './' }))
```

`root` resolve relativo a `process.cwd()`. Para caminho estável via `import.meta.url`:

```ts
import { fileURLToPath } from 'node:url'
import { serveStatic } from '@hono/node-server/serve-static'

app.use(
  '/static/*',
  serveStatic({ root: fileURLToPath(new URL('./', import.meta.url)) })
)
```

```ts
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }))
app.use('*', serveStatic({ root: './static' }))
app.get(
  '/static/*',
  serveStatic({
    root: './',
    rewriteRequestPath: (path) => path.replace(/^\/static/, '/statics'),
  })
)
```

### HTTP/2

```ts
import { createServer } from 'node:http2'

const server = serve({
  fetch: app.fetch,
  createServer,
})
```

```ts
import { createSecureServer } from 'node:http2'
import { readFileSync } from 'node:fs'

const server = serve({
  fetch: app.fetch,
  createServer: createSecureServer,
  serverOptions: {
    key: readFileSync('localhost-privkey.pem'),
    cert: readFileSync('localhost-cert.pem'),
  },
})
```

### Build & deploy

```sh
npm run build
```

`Dockerfile` de exemplo:

```Dockerfile
FROM node:22-alpine AS base

FROM base AS builder

RUN apk add --no-cache gcompat
WORKDIR /app

COPY package*json tsconfig.json src ./

RUN npm ci && \
    npm run build && \
    npm prune --production

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/dist /app/dist
COPY --from=builder --chown=hono:nodejs /app/package.json /app/package.json

USER hono
EXPOSE 3000

CMD ["node", "/app/dist/index.js"]
```

## Bun

```sh
bun create hono@latest my-app
cd my-app
bun install
```

Projeto existente: `bun add hono` e `"dev": "bun run --hot src/index.ts"`.

```ts
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Bun!'))

export default app
```

Trocar porta exportando `port`:

```ts
export default {
  port: 3000,
  fetch: app.fetch,
}
```

Rodar: `bun run dev` → `http://localhost:3000`.

### Static files

```ts
import { serveStatic } from 'hono/bun'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }))
app.get('/', (c) => c.text('You can access: /static/hello.txt'))
app.get('*', serveStatic({ path: './static/fallback.txt' }))
```

Aceita `rewriteRequestPath`, `mimes`, `onFound`, `onNotFound` e `precompressed`
(igual ao Deno).

### Testing

```ts
import { describe, expect, it } from 'bun:test'
import app from '.'

describe('My first test', () => {
  it('Should return 200 Response', async () => {
    const req = new Request('http://localhost/')
    const res = await app.fetch(req)
    expect(res.status).toBe(200)
  })
})
```

```sh
bun test index.test.ts
```

## Cloudflare Workers

Edge runtime no CDN da Cloudflare. Dev e publish via **Wrangler**.

```ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hello Cloudflare Workers!'))

export default app
```

Rodar: `npm run dev` → `http://localhost:8787`. Porta via `wrangler.toml`/`wrangler.json`/`wrangler.jsonc`.
Deploy: `npm run deploy`.

### Outros event handlers (Module Worker mode)

Exporte `app.fetch` como `fetch` e implemente os demais:

```ts
const app = new Hono()

export default {
  fetch: app.fetch,
  scheduled: async (batch, env) => {},
}
```

### Static Assets

Em `wrangler.jsonc`:

```jsonc
"assets": { "directory": "public" }
```

`./public/static/hello.txt` vira `/static/hello.txt`.

### Types

```sh
npm i --save-dev @cloudflare/workers-types
```

### Bindings

```ts
type Bindings = {
  MY_BUCKET: R2Bucket
  USERNAME: string
  PASSWORD: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.put('/upload/:key', async (c, next) => {
  const key = c.req.param('key')
  await c.env.MY_BUCKET.put(key, c.req.body)
  return c.text(`Put ${key} successfully!`)
})
```

Gerar tipos a partir do `wrangler.toml`:

```sh
wrangler types --env-interface CloudflareBindings
```

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

### Variables em middleware

```ts
import { basicAuth } from 'hono/basic-auth'

type Bindings = {
  USERNAME: string
  PASSWORD: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/auth/*', async (c, next) => {
  const auth = basicAuth({
    username: c.env.USERNAME,
    password: c.env.PASSWORD,
  })
  return auth(c, next)
})
```

### Deploy via GitHub Actions

Crie secret `CLOUDFLARE_API_TOKEN` e `.github/workflows/deploy.yml`:

```yml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Adicione em `wrangler.jsonc` após `compatibility_date`:

```jsonc
"main": "src/index.ts",
"minify": true
```

### Env local e secrets

`.dev.vars` ou `.env` no root (sintaxe dotenv):

```
SECRET_KEY=value
API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

```ts
type Bindings = {
  SECRET_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/env', (c) => {
  const SECRET_KEY = c.env.SECRET_KEY
  return c.text(SECRET_KEY)
})
```

> `process.env` não existe por padrão; use `c.env`. Para habilitar, ative o flag
> `nodejs_compat_populate_process_env` (ou importe `env` de `cloudflare:workers`).

## Cloudflare Workers + Vite

Forma recomendada para novos full-stacks: Vite dev server + SSR com JSX + client bundling.

`vite.config.ts`:

```ts
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin()],
})
```

`src/index.tsx`:

```tsx
import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  return c.render(<h1>Hello, Cloudflare Workers!</h1>)
})

export default app
```

`src/renderer.tsx`:

```tsx
import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <ViteClient />
        <Link href='/src/style.css' rel='stylesheet' />
      </head>
      <body>{children}</body>
    </html>
  )
})
```

Rodar: `npm run dev` → `http://localhost:5173`. Deploy: `npm run deploy` (build com Vite + publish com Wrangler).

### Bindings

`wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-app",
  "compatibility_date": "2025-08-03",
  "main": "./src/index.tsx",
  "vars": {
    "MY_NAME": "Hono",
  },
}
```

```sh
npm run cf-typegen
```

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

### Client-side

```tsx
import { jsxRenderer } from 'hono/jsx-renderer'
import { Script, ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <ViteClient />
        <Script src='/src/client.ts' />
      </head>
      <body>{children}</body>
    </html>
  )
})
```

## Cloudflare Pages

> Para projetos novos, prefira **Cloudflare Workers**; Pages é legado e usa Vite.

```tsx
import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()

app.get('*', renderer)

app.get('/', (c) => {
  return c.render(<h1>Hello, Cloudflare Pages!</h1>)
})

export default app
```

Rodar: `npm run dev` → `http://localhost:5173`. Deploy: `npm run deploy`.

Build via dashboard: Production branch `main`, Build command `npm run build`, Build directory `dist`.

### Bindings

`wrangler.toml`:

```toml
[vars]
MY_NAME = "Hono"
```

```sh
wrangler kv namespace create MY_KV --preview
```

```toml
[[kv_namespaces]]
binding = "MY_KV"
id = "abcdef"
```

```ts
type Bindings = {
  MY_NAME: string
  MY_KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()
```

```tsx
app.get('/', async (c) => {
  await c.env.MY_KV.put('name', c.env.MY_NAME)
  const name = await c.env.MY_KV.get('name')
  return c.render(<h1>Hello! {name}</h1>)
})
```

### Middleware e `handle`

Cloudflare Pages tem middleware próprio; `_middleware.ts` exporta `onRequest`. Use
`handleMiddleware` para reutilizar middleware Hono:

```ts
// functions/_middleware.ts
import { handleMiddleware } from 'hono/cloudflare-pages'

export const onRequest = handleMiddleware(async (c, next) => {
  console.log(`You are accessing ${c.req.url}`)
  await next()
})
```

```ts
// functions/_middleware.ts
import { handleMiddleware } from 'hono/cloudflare-pages'
import { basicAuth } from 'hono/basic-auth'

export const onRequest = handleMiddleware(
  basicAuth({
    username: 'hono',
    password: 'acoolproject',
  })
)
```

Múltiplos:

```ts
export const onRequest = [
  handleMiddleware(middleware1),
  handleMiddleware(middleware2),
  handleMiddleware(middleware3),
]
```

Render como Pages Function com `handle`:

```ts
// functions/api/[[route]].ts
import type { EventContext } from 'hono/cloudflare-pages'
import { handle } from 'hono/cloudflare-pages'

type Env = {
  Bindings: {
    eventContext: EventContext
  }
}

const app = new Hono<Env>().basePath('/api')

app.get('/hello', (c) => {
  return c.json({
    message: `Hello, ${c.env.eventContext.data.user}!`, // 'Joe'
  })
})

export const onRequest = handle(app)
```

### Client-side no Vite

```ts
import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      build: {
        rollupOptions: {
          input: './src/client.ts',
          output: {
            entryFileNames: 'static/client.js',
          },
        },
      },
    }
  } else {
    return {
      plugins: [
        pages(),
        devServer({
          entry: 'src/index.tsx',
        }),
      ],
    }
  }
})
```

```sh
vite build --mode client && vite build
```

## Vercel

Zero-configuration. Exporte o app como default em `index.ts`/`src/index.ts`:

```ts
import { Hono } from 'hono'

const app = new Hono()

const welcomeStrings = [
  'Hello Hono!',
  'To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/backend/hono',
]

app.get('/', (c) => {
  return c.text(welcomeStrings.join('\n\n'))
})

export default app
```

Rodar: `vercel dev` → `localhost:3000`. Deploy: `vercel deploy` (ou `vc deploy`).

## Netlify

Edge Functions em Deno/TypeScript. Usa JSR.

`netlify/edge-functions/index.ts`:

```ts
import { Hono } from 'jsr:@hono/hono'
import { handle } from 'jsr:@hono/hono/netlify'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default handle(app)
```

Rodar: `netlify dev` → `http://localhost:8888`. Deploy: `netlify deploy --prod`.

`Context` via `c.env`:

```ts
import { Hono } from 'jsr:@hono/hono'
import { handle } from 'jsr:@hono/hono/netlify'

import type { Context } from 'https://edge.netlify.com/'

export type Env = {
  Bindings: {
    context: Context
  }
}

const app = new Hono<Env>()

app.get('/country', (c) =>
  c.json({
    'You are in': c.env.context.geo.country?.name,
  })
)

export default handle(app)
```

## AWS Lambda

Node.js 18+. Setup com CDK:

```sh
mkdir my-app
cd my-app
cdk init app -l typescript
npm i hono
npm i -D esbuild
mkdir lambda
touch lambda/index.ts
```

`lambda/index.ts`:

```ts
import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

export const handler = handle(app)
```

`lib/my-app-stack.ts`:

```ts
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'

export class MyAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const fn = new NodejsFunction(this, 'lambda', {
      entry: 'lambda/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
    })
    const fnUrl = fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })
    new cdk.CfnOutput(this, 'lambdaUrl', {
      value: fnUrl.url!,
    })
  }
}
```

Deploy: `cdk deploy`.

### Binary data

Base64 automático quando o `Content-Type` indica binário:

```ts
app.get('/binary', async (c) => {
  c.status(200)
  c.header('Content-Type', 'image/png')
  return c.body(buffer)
})
```

### Event e Context

```ts
import { Hono } from 'hono'
import type { LambdaEvent, LambdaContext } from 'hono/aws-lambda'
import { handle } from 'hono/aws-lambda'

type Bindings = {
  event: LambdaEvent
  lambdaContext: LambdaContext
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/aws-lambda-info/', (c) => {
  return c.json({
    isBase64Encoded: c.env.event.isBase64Encoded,
    awsRequestId: c.env.lambdaContext.awsRequestId,
  })
})

export const handler = handle(app)
```

RequestContext:

```ts
import type { LambdaEvent } from 'hono/aws-lambda'

type Bindings = {
  event: LambdaEvent
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/custom-context/', (c) => {
  const lambdaContext = c.env.event.requestContext
  return c.json(lambdaContext)
})
```

### Response streaming

```diff
fn.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
+  invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
})
```

```ts
import { Hono } from 'hono'
import { streamHandle } from 'hono/aws-lambda'
import { streamText } from 'hono/streaming'

const app = new Hono()

app.get('/stream', async (c) => {
  return streamText(c, async (stream) => {
    for (let i = 0; i < 3; i++) {
      await stream.writeln(`${i}`)
      await stream.sleep(1)
    }
  })
})

export const handler = streamHandle(app)
```

## Lambda@Edge

Node.js 18+. Roda em edge locations do CloudFront.

`lambda/index_edge.ts`:

```ts
import { Hono } from 'hono'
import { handle } from 'hono/lambda-edge'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono on Lambda@Edge!'))

export const handler = handle(app)
```

`lambda/cdk-stack.ts`:

```ts
import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as s3 from 'aws-cdk-lib/aws-s3'

export class MyAppStack extends cdk.Stack {
  public readonly edgeFn: lambda.Function

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    const edgeFn = new NodejsFunction(this, 'edgeViewer', {
      entry: 'lambda/index_edge.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
    })

    const originBucket = new s3.Bucket(this, 'originBucket')

    new cloudfront.Distribution(this, 'Cdn', {
      defaultBehavior: {
        origin: new origins.S3Origin(originBucket),
        edgeLambdas: [
          {
            functionVersion: edgeFn.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
          },
        ],
      },
    })
  }
}
```

Deploy: `cdk deploy`.

Callback (ex.: Basic Auth seguido de processamento):

```ts
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import type { Callback, CloudFrontRequest } from 'hono/lambda-edge'
import { handle } from 'hono/lambda-edge'

type Bindings = {
  callback: Callback
  request: CloudFrontRequest
}

const app = new Hono<{ Bindings: Bindings }>()

app.get(
  '*',
  basicAuth({
    username: 'hono',
    password: 'acoolproject',
  })
)

app.get('/', async (c, next) => {
  await next()
  c.env.callback(null, c.env.request)
})

export const handler = handle(app)
```

## Fastly Compute

CLI instalada localmente como parte do template.

```ts
// src/index.ts
import { Hono } from 'hono'
import { fire } from '@fastly/hono-fastly-compute'

const app = new Hono()

app.get('/', (c) => c.text('Hello Fastly!'))

fire(app)
```

> Ao usar `fire`/`buildFire()` no top level, use `Hono` de `'hono'` (não
> `'hono/quick'`), pois o router é construído na inicialização.

Rodar: `npm run start` → `http://localhost:7676`. Deploy: `npm run deploy` (na
primeira vez, cria um serviço).

### Bindings

```ts
// src/index.ts
import { buildFire } from '@fastly/hono-fastly-compute'

const fire = buildFire({
  siteData: 'KVStore:site-data',
})

const app = new Hono<{ Bindings: typeof fire.Bindings }>()

app.put('/upload/:key', async (c, next) => {
  const key = c.req.param('key')
  await c.env.siteData.put(key, c.req.body)
  return c.text(`Put ${key} successfully!`)
})

fire(app)
```

## Azure Functions

Azure Functions **V4** em Node.js 18+ (adapter de terceiros).

```sh
func init --typescript
```

`host.json` (remover prefixo `/api`):

```json
"extensions": {
    "http": {
        "routePrefix": ""
    }
}
```

```sh
npm i @marplex/hono-azurefunc-adapter hono
```

`src/app.ts`:

```ts
// src/app.ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hello Azure Functions!'))

export default app
```

`src/functions/httpTrigger.ts`:

```ts
// src/functions/httpTrigger.ts
import { app } from '@azure/functions'
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter'
import honoApp from '../app'

app.http('httpTrigger', {
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  authLevel: 'anonymous',
  route: '{*proxy}',
  handler: azureHonoHandler(honoApp.fetch),
})
```

Rodar: `npm run start` → `http://localhost:7071`.

```sh
npm run build
func azure functionapp publish <YourFunctionAppName>
```

## Google Cloud Run

Usa containers. Sem `Dockerfile`, usa o buildpack Node.js padrão.

```sh
npm create hono@latest my-app
cd my-app
npm i
```

Porta `8080` em `src/index.ts`:

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 8080
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
```

```sh
npm run dev
gcloud run deploy my-app --source . --allow-unauthenticated
```

Para Deno/Bun/container customizado, adicione um `Dockerfile`.

## Service Worker

Roda no browser como handler de `FetchEvent`. Exemplo com Vite.

`package.json`:

```json
{
  "name": "my-app",
  "private": true,
  "scripts": {
    "dev": "vite dev"
  },
  "type": "module"
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "WebWorker"],
    "moduleResolution": "bundler"
  },
  "include": ["./"],
  "exclude": ["node_modules"]
}
```

```sh
npm i hono
npm i -D vite
```

`sw.ts`:

```ts
declare const self: ServiceWorkerGlobalScope

import { Hono } from 'hono'
import { handle } from 'hono/service-worker'

const app = new Hono().basePath('/sw')
app.get('/', (c) => c.text('Hello World'))

self.addEventListener('fetch', handle(app))
```

Variante concisa com `fire()`:

```ts
import { Hono } from 'hono'
import { fire } from 'hono/service-worker'

const app = new Hono().basePath('/sw')
app.get('/', (c) => c.text('Hello World'))

fire(app)
```

Rodar: `npm run dev` → `http://localhost:5173/` (registra o SW; acesse `/sw`).

## WebAssembly (com WASI)

`wasi:http` + StarlingMonkey: Hono funciona out-of-the-box. Sem starter oficial.

```sh
mkdir my-app
cd my-app
npm init
npm i hono
npm i -D @bytecodealliance/jco @bytecodealliance/componentize-js @bytecodealliance/jco-std
npm i -D rolldown
```

`tsconfig.json`: `compilerOptions.module` = `"nodenext"`. `package.json`: `"type": "module"`.

`rolldown.config.mjs`:

```js
import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/component.ts',
  external: /wasi:.*/,
  output: {
    file: 'dist/component.js',
    format: 'esm',
  },
})
```

`wit/component.wit`:

```txt
package example:hono;

world component {
    export wasi:http/incoming-handler@0.2.6;
}
```

```sh
wkg wit fetch
```

`src/component.ts`:

```ts
import { Hono } from 'hono'
import { fire } from '@bytecodealliance/jco-std/wasi/0.2.6/http/adapters/hono/server'

const app = new Hono()

app.get('/hello', (c) => {
  return c.json({ message: 'Hello from WebAssembly!' })
})

fire(app)

export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.6/http/adapters/hono/server'
```

Build e run:

```sh
npx rolldown -c
npx jco componentize -w wit -o dist/component.wasm dist/component.js
npx jco serve dist/component.wasm
```

Saída: `Server listening @ localhost:8000...`. `jco serve` é só para desenvolvimento;
em produção use um runtime WASI como `wasmtime`.

## Supabase Edge Functions

Funções Deno distribuídas globalmente.

```sh
supabase init
supabase functions new hello-world
```

`supabase/functions/hello-world/index.ts`:

```ts
import { Hono } from 'jsr:@hono/hono'

const functionName = 'hello-world'
const app = new Hono().basePath(`/${functionName}`)

app.get('/hello', (c) => c.text('Hello from hono-server!'))

Deno.serve(app.fetch)
```

```sh
supabase start
supabase functions serve --no-verify-jwt
curl  --location  'http://127.0.0.1:54321/functions/v1/hello-world/hello'
```

```sh
supabase functions deploy
supabase functions deploy hello-world
```

## Next.js

Hono no runtime Node.js. App Router: `app/api/[[...route]]/route.ts`.

```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono().basePath('/api')

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello Next.js!',
  })
})

export const GET = handle(app)
export const POST = handle(app)
```

Rodar: `npm run dev` → `http://localhost:3000`. Deploy na Vercel via repositório Git.

### Pages Router

```sh
npm i @hono/node-server
```

```ts
import { getRequestListener } from '@hono/node-server'
import { Hono } from 'hono'
import type { PageConfig } from 'next'

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
}

const app = new Hono().basePath('/api')

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello Next.js!',
  })
})

export default getRequestListener(app.fetch)
```

Requer desabilitar os helpers do Vercel:

```text
NODEJS_HELPERS=0
```

## Tencent CloudBase

HTTP Cloud Functions rodam como processo Node.js ouvindo na porta `9000`, iniciado
por `scf_bootstrap`. `@hono/node-server` funciona sem adapter extra.

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello CloudBase!'))

serve({
  fetch: app.fetch,
  port: 9000,
})
```

Rodar: `npm run dev` → `http://localhost:9000`.

`scf_bootstrap` (sem extensão, LF, executável):

```sh
#!/bin/bash
/var/lang/node20/bin/node dist/index.js
```

```sh
chmod +x scf_bootstrap
npm run build
tcb fn deploy <function-name> --httpFn
```

## Alibaba Cloud Function Compute

Adapter de terceiros `rwv/hono-alibaba-cloud-fc3-adapter`.

```sh
mkdir my-app
cd my-app
npm i hono hono-alibaba-cloud-fc3-adapter
npm i -D @serverless-devs/s esbuild
mkdir src
touch src/index.ts
```

`src/index.ts`:

```ts
import { Hono } from 'hono'
import { handle } from 'hono-alibaba-cloud-fc3-adapter'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

export const handler = handle(app)
```

```sh
npx s config add
```

`s.yaml`:

```yaml
edition: 3.0.0
name: my-app
access: 'default'

vars:
  region: 'us-west-1'

resources:
  my-app:
    component: fc3
    props:
      region: ${vars.region}
      functionName: 'my-app'
      description: 'Hello World by Hono'
      runtime: 'nodejs20'
      code: ./dist
      handler: index.handler
      memorySize: 1024
      timeout: 300
```

`scripts` do `package.json`:

```json
{
  "scripts": {
    "build": "esbuild --bundle --outfile=./dist/index.js --platform=node --target=node20 ./src/index.ts",
    "deploy": "s deploy -y"
  }
}
```

```sh
npm run build
npm run deploy
```

## Próximos passos

- [`./01-quickstart.md`](./01-quickstart.md) — instalação, templates e entry point
- [`./13-melhores-praticas.md`](./13-melhores-praticas.md) — produção e organização
- [`./15-seguranca.md`](./15-seguranca.md) — CORS, headers, auth
- [`./17-cheatsheet.md`](./17-cheatsheet.md) — referência rápida
