# Exemplos e Receitas

> Receitas oficiais de Hono v4.13.7: cada padrão com objetivo, instalação e código copiável. Fontes em `official+docs/examples/`.

| Problema | Exemplo oficial | Seção |
|----------|-----------------|-------|
| Upload de arquivos via `multipart/form-data` | `file-upload` | [Upload](#upload-de-arquivos) |
| Expor um servidor como reverse proxy | `proxy` + `hono/proxy` | [Proxy](#reverse-proxy) |
| Restaurar `x-forwarded-proto` atrás de proxy | `behind-reverse-proxy` | [Proxy](#reverse-proxy) |
| Receber webhook assinado (Stripe) | `stripe-webhook` | [Stripe webhook](#stripe-webhook) |
| Respostas HTML/partials para htmx | `htmx` | [htmx](#htmx) |
| Autenticação (Auth.js, Better Auth, Stytch) | `hono-authjs`, `better-auth`, `better-auth-on-cloudflare`, `stytch-auth` | [Autenticação](#autenticacao) |
| Gerar/ servir OpenAPI (Zod, Valibot, Swagger, Scalar) | `zod-openapi`, `hono-openapi`, `hono-docs`, `swagger-ui`, `scalar` | [OpenAPI](#openapi-e-docs) |
| ORM em Workers/edges | `prisma` | [Prisma](#prisma) |
| Estado por objeto com RPC | `cloudflare-durable-objects` | [Durable Objects](#cloudflare-durable-objects) |
| Processamento assíncrono em fila | `cloudflare-queue` | [Queues](#cloudflare-queues) |
| Serialização binária eficiente | `cbor` | [CBOR](#cbor) |
| API REST clássica (CORS, auth básica, JSON) | `web-api` | [Web API](#web-api) |
| GraphQL code-first | `pylon` | [Pylon](#pylon) |
| Injeção de dependência tipada por request | `inferdi` | [InferDI](#inferdi) |
| Monitoramento e analytics de API | `apitally` | [Apitally](#apitally) |
| Full-stack (Remix/Next.js) | `with-remix` | [Remix e Next.js](#remix-e-nextjs) |
| Erros de validação e grupos para RPC | `validator-error-handling`, `grouping-routes-rpc` | ver [`./08-validacao.md`](./08-validacao.md), [`./09-rpc-client.md`](./09-rpc-client.md) |

## Upload de arquivos

**Objetivo:** receber arquivos com `multipart/form-data`; os campos ficam disponíveis em `c.req.parseBody()`. Sempre valide `instanceof File`, nome, MIME e tamanho antes de persistir (disco, R2, S3).

Instalação: nenhuma (embutido em `hono`). Limite de tamanho usa `hono/body-limit`.

```ts
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

const app = new Hono()

app.post(
  '/upload',
  bodyLimit({
    maxSize: 5 * 1024 * 1024, // 5 MiB
    onError: (c) => c.text('File too large', 413),
  }),
  async (c) => {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!(file instanceof File)) {
      return c.text('File is required', 400)
    }

    return c.json({ name: file.name, size: file.size, type: file.type })
  }
)
```

Múltiplos arquivos: `c.req.parseBody({ all: true })` devolve `string | File | (string | File)[]`.

```ts
app.post('/upload', async (c) => {
  const body = await c.req.parseBody({ all: true })
  const value = body['file']

  const files = Array.isArray(value)
    ? value.filter((item): item is File => item instanceof File)
    : value instanceof File
      ? [value]
      : []

  if (files.length === 0) return c.text('At least one file is required', 400)
  return c.json({
    count: files.length,
    files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
  })
})
```

## Reverse proxy

**Objetivo:** repassar requisições a um origin server usando `proxy()`, um wrapper de `fetch` que ajusta `Accept-Encoding`, remove headers desnecessários e devolve um `Response` pronto.

```ts
import { Hono } from 'hono'
import { proxy } from 'hono/proxy'

const app = new Hono()

app.get('/proxy/:path', (c) => {
  return proxy(`http://${originServer}/${c.req.param('path')}`)
})
```

Repassando headers com cuidado (evite propagar `Authorization` a menos que necessário):

```ts
app.get('/proxy/:path', async (c) => {
  const res = await proxy(`http://${originServer}/${c.req.param('path')}`, {
    headers: {
      ...c.req.header(),
      'X-Forwarded-For': '127.0.0.1',
      'X-Forwarded-Host': c.req.header('host'),
      Authorization: undefined, // não propaga o Authorization de entrada
    },
  })
  res.headers.delete('Set-Cookie')
  return res
})
```

`proxy()` ignora o header `Connection` por padrão (mitiga Hop-by-Hop Header Injection). RFC 9110 estrito só em ambientes confiáveis:

```ts
app.get('/internal-proxy/:path', (c) => {
  return proxy(`http://${internalServer}/${c.req.param('path')}`, {
    ...c.req,
    strictConnectionProcessing: true,
  })
})
```

`ProxyFetch` também aceita `raw?: Request` e `customFetch?: (request: Request) => Promise<Response>`.

**Atrás de reverse proxy** (`x-forwarded-proto`), crie um novo `Request` antes de `app.fetch` para que `c.req.url` tenha o protocolo original:

```ts
import { Hono } from 'hono'

const app = new Hono()

export default {
  fetch: (req: Request) => {
    const url = new URL(req.url)
    url.protocol = req.headers.get('x-forwarded-proto') ?? url.protocol
    return app.fetch(new Request(url, req))
  },
}
```

Em Node.js (`@hono/node-server`), a mesma reescrita vai no `fetch` de `serve({ fetch: ... })`. Sem `proxy()`, o `fetch` puro devolve headers imutáveis; clone com `new Response(response.body, response)` antes de modificar.

## Stripe webhook

**Objetivo:** validar a assinatura de webhooks Stripe. A verificação exige o **raw body** — use `context.req.text()` e nunca consuma/parseie o body antes.

```bash
npm install stripe
```

```ts
import Stripe from 'stripe'
import { Hono } from 'hono'
import { env } from 'hono/adapter'

const app = new Hono()

app.post('/webhook', async (context) => {
  const { STRIPE_SECRET_API_KEY, STRIPE_WEBHOOK_SECRET } = env(context)
  const stripe = new Stripe(STRIPE_SECRET_API_KEY)
  const signature = context.req.header('stripe-signature')

  try {
    if (!signature) return context.text('', 400)

    const body = await context.req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )

    switch (event.type) {
      case 'payment_intent.created':
        console.log(event.data.object)
        break
      default:
        break
    }
    return context.text('', 200)
  } catch (err) {
    const message = `Webhook signature verification failed. ${
      err instanceof Error ? err.message : 'Internal server error'
    }`
    return context.text(message, 400)
  }
})

export default app
```

`.dev.vars`: `STRIPE_API_KEY=sk_test_xxx` e `STRIPE_WEBHOOK_SECRET=whsec_xxx`.

## htmx

**Objetivo:** usar htmx com JSX tipado. Handlers htmx tipicamente retornam HTML/partials (não JSON); tipagem evita erros de atributos.

```sh
npm i -D typed-htmx
```

`src/global.d.ts`:

```ts
import 'typed-htmx'

declare module 'hono/jsx' {
  namespace JSX {
    interface HTMLAttributes extends HtmxAttributes {}
  }
}
```

## Autenticação

### Auth.js (`@hono/auth-js`)

Suporta apenas React no client-side. Instalação: `npm install hono @hono/auth-js @auth/core @auth/drizzle-adapter`.

```ts
import { Hono } from 'hono'
import { initAuthConfig, verifyAuth, authHandler } from '@hono/auth-js'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import GitHub from '@auth/core/providers/github'
import { db } from './db'
import { users, accounts, sessions, verificationTokens } from './schema'

const v1Router = new Hono()
  .use(
    '*',
    initAuthConfig((c) => ({
      adapter: DrizzleAdapter(c.get('db'), {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      }),
      secret: c.env.AUTH_SECRET,
      providers: [
        GitHub({ clientId: c.env.GITHUB_ID, clientSecret: c.env.GITHUB_SECRET }),
      ],
      session: { strategy: 'jwt' },
    }))
  )
  .use('*', verifyAuth())
  .use('/auth/*', authHandler())

export default new Hono().route('/api/v1', v1Router)
```

Rotas protegidas leem `c.get('authUser')`; retorne `c.json({ error: 'Unauthorized' }, 401)` se ausente.

### Better Auth

```ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from '@/db/index'
import env from '@/env'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  trustedOrigins: ['http://localhost:5173'],
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  },
})

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}
```

Monte o handler em `/api/auth/*` (todos os métodos) e, no app principal, use `strict: false` + `app.basePath('/api').route('/', route)`.

```ts
router.on(['POST', 'GET'], '/auth/*', (c) => auth.handler(c.req.raw))
```

**Better Auth em Cloudflare Workers:** a instância recebe as bindings (`env.DATABASE_URL`, `env.BETTER_AUTH_URL`, `env.BETTER_AUTH_SECRET`) e usa Drizzle + Neon; monte com

```ts
app.on(['GET', 'POST'], '/api/*', (c) => auth(c.env).handler(c.req.raw))
```

Gere schema (`@better-auth/cli generate`), migrations (`drizzle-kit generate/migrate`) e tipos (`wrangler types --env-interface CloudflareBindings`).

### Stytch

Backend: `npm install @hono/stytch-auth stytch`. Middleware valida o session JWT localmente (rápido) ou remotamente (user completo).

```ts
import { Hono } from 'hono'
import { Consumer } from '@hono/stytch-auth'

const app = new Hono()

app.get('/api/local', Consumer.authenticateSessionLocal(), (c) => {
  const session = Consumer.getStytchSession(c)
  return c.json({ message: 'Protected data', sessionId: session.session_id })
})

app.get('/api/remote', Consumer.authenticateSessionRemote(), (c) => {
  const session = Consumer.getStytchSession(c)
  const user = Consumer.getStytchUser(c)
  return c.json({ sessionId: session.session_id, firstName: user.name.first_name })
})

export default app
```

Env no `.dev.vars`: `STYTCH_PROJECT_ID`, `STYTCH_PROJECT_SECRET`. Frontend usa `@stytch/react` + `@stytch/vanilla-js` com `VITE_STYTCH_PUBLIC_TOKEN`.

## OpenAPI e docs

| Biblioteca | Import | Papel |
|------------|--------|-------|
| Zod OpenAPI Hono | `@hono/zod-openapi` | classe `OpenAPIHono`, `createRoute`, `app.doc()` (detalhado em [`./08-validacao.md`](./08-validacao.md)) |
| hono-openapi | `hono-openapi` | middleware `describeRoute` + `openAPIRouteHandler` |
| Hono Docs | `@rcmade/hono-docs` | gera OpenAPI a partir dos tipos das rotas |
| Swagger UI | `@hono/swagger-ui` | UI sobre um documento OpenAPI |
| Scalar | `@scalar/hono-api-reference` | UI moderna + Markdown para LLMs |

**hono-openapi** (Valibot, também aceita Zod, ArkType, TypeBox e Standard Schema):

```bash
npm install hono-openapi @hono/standard-validator
npm install valibot @valibot/to-json-schema
```

```ts
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import * as v from 'valibot'

const app = new Hono()
const querySchema = v.object({ name: v.optional(v.string()) })
const responseSchema = v.string()

app.get(
  '/',
  describeRoute({
    description: 'Say hello to the user',
    responses: {
      200: { description: 'Successful response', content: { 'text/plain': { schema: resolver(responseSchema) } } },
    },
  }),
  validator('query', querySchema),
  (c) => {
    const query = c.req.valid('query')
    return c.text(`Hello ${query?.name ?? 'Hono'}!`)
  }
)
```

Request schemas de `query`/`json`/`param`/`form` entram automaticamente no documento; não os repita em `describeRoute()`. Sirva o spec com `openAPIRouteHandler(app, { documentation: { info, servers } })`.

**Swagger UI:**

```ts
import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'

const app = new Hono()
app.get('/doc', (c) => c.json(openApiDoc)) // openapi: '3.0.0'
app.get('/ui', swaggerUI({ url: '/doc' }))
```

**Scalar:**

```ts
import { Scalar } from '@scalar/hono-api-reference'

app.get('/scalar', Scalar({ url: '/doc', theme: 'purple', pageTitle: 'Awesome API' }))
```

`Scalar((c) => ({ url, proxyUrl }))` permite config dinâmica. Temas: `alternate`, `default`, `moon`, `purple`, `solarized`, `bluePlanet`, `deepSpace`, `saturn`, `kepler`, `mars`, `laserwave`, `none`. Para Markdown de LLMs instale `@scalar/openapi-to-markdown` e sirva `/llms.txt` via `createMarkdownFromOpenApi(content)`.

**Hono Docs:** crie `hono-docs.ts` com `defineConfig({ tsConfigPath, openApi, outputs, apis })`, exporte `export type AppType = typeof yourRoutesVariable` e rode `npx @rcmade/hono-docs generate --config ./hono-docs.ts`.

## Prisma

**Objetivo:** usar Prisma ORM no edge. Duas abordagens: Prisma Postgres (managed, pooling, zero cold start) e driver adapters (ex.: D1).

```bash
npm i prisma --save-dev
npm i @prisma/extension-accelerate
npx prisma@latest init --db
```

```ts
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

export const getPrisma = (database_url: string) => {
  const prisma = new PrismaClient({ datasourceUrl: database_url }).$extends(withAccelerate())
  return prisma
}
```

Driver adapter para Cloudflare D1:

```bash
npm install prisma --save-dev
npx prisma init
npm install @prisma/client @prisma/adapter-d1
```

`prisma/schema.prisma`: `previewFeatures = ["driverAdapters"]` e `provider = "sqlite"`. Cliente:

```ts
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

const prismaClients = {
  async fetch(db: D1Database) {
    const adapter = new PrismaD1(db)
    return new PrismaClient({ adapter })
  },
}

export default prismaClients
```

```ts
const app = new Hono<{ Bindings: { DB: D1Database } }>()

app.get('/', async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB)
  return c.json(await prisma.user.findMany())
})
```

## Cloudflare Durable Objects

**Objetivo:** rotear HTTP no Worker e falar com o Durable Object via RPC (a partir de `compatibility_date` `2024-04-03`). A classe estende `DurableObject` de `cloudflare:workers`.

```ts
import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'

export class Counter extends DurableObject {
  value = 0

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      this.value = (await ctx.storage.get('value')) || 0
    })
  }

  async getCounterValue() {
    return this.value
  }

  async increment(amount = 1): Promise<number> {
    this.value += amount
    await this.ctx.storage.put('value', this.value)
    return this.value
  }
}

type Bindings = { COUNTER: DurableObjectNamespace<Counter> }
const app = new Hono<{ Bindings: Bindings }>()

app.post('/counter/increment', async (c) => {
  const id = c.env.COUNTER.idFromName('counter')
  const stub = c.env.COUNTER.get(id)
  return c.text((await stub.increment()).toString())
})

export default app
```

`wrangler.jsonc` precisa de `migrations` (`new_sqlite_classes: ["Counter"]`) e `durable_objects.bindings` (`class_name: "Counter"`, `name: "COUNTER"`).

## Cloudflare Queues

**Objetivo:** enfileirar erros no handler HTTP e consumi-los em `queue()`, persistindo em R2.

```ts
import { Hono } from 'hono'

type Environment = {
  readonly ERROR_QUEUE: Queue<Error>
  readonly ERROR_BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Environment }>()

app.onError(async (err, c) => {
  await c.env.ERROR_QUEUE.send(err)
  return c.text(err.message, { status: 500 })
})

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<Error>, env: Environment) {
    let file = ''
    for (const message of batch.messages) {
      const error = message.body
      file += error.stack || error.message || String(error)
      file += '\r\n'
    }
    await env.ERROR_BUCKET.put(`errors/${Date.now()}.log`, file)
  },
}
```

`wrangler.toml`: `[[queues.producers]]` (binding `ERROR_QUEUE`), `[[queues.consumers]]` (`max_batch_size`, `max_batch_timeout`) e `[[r2_buckets]]`.

## CBOR

**Objetivo:** responder em CBOR (RFC 8949, binário compatível com JSON) registrando um renderer customizado com `c.setRenderer`. O mesmo padrão serve para qualquer formato (ex.: transformação de HTML com `HTMLRewriter`).

```bash
npm install cbor2
```

```ts
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { encode } from 'cbor2'

const app = new Hono()

declare module 'hono' {
  interface ContextRenderer {
    (content: any): Response | Promise<Response>
  }
}

const cborRenderer = createMiddleware(async (c, next) => {
  c.header('Content-Type', 'application/cbor')
  c.setRenderer((content) => c.body(encode(content)))
  await next()
})

app.use(cborRenderer)
app.get('/', (c) => c.render({ message: 'hello CBOR!' }))

export default app
```

## Web API

**Objetivo:** API REST clássica com `cors`, `basicAuth`, `prettyJSON` e `notFound`, com bindings tipadas.

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { basicAuth } from 'hono/basic-auth'
import { prettyJSON } from 'hono/pretty-json'
import { getPosts, getPost, createPost, type Post } from './model'

const app = new Hono()
app.use(prettyJSON())
app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404))

type Bindings = { USERNAME: string; PASSWORD: string }
const api = new Hono<{ Bindings: Bindings }>()
api.use('/posts/*', cors())

api.get('/posts', (c) => {
  const { limit, offset } = c.req.query()
  return c.json({ posts: getPosts({ limit, offset }) })
})

api.post(
  '/posts',
  async (c, next) => {
    const auth = basicAuth({ username: c.env.USERNAME, password: c.env.PASSWORD })
    return auth(c, next)
  },
  async (c) => c.json({ ok: createPost({ post: await c.req.json<Post>() }) })
)

app.route('/api', api)
export default app
```

## Pylon

**Objetivo:** API GraphQL code-first construída sobre Hono; o schema é gerado em runtime a partir dos tipos TS.

```bash
npm create pylon my-pylon@latest
```

```ts
import { app, getContext } from '@getcronit/pylon'

export const graphql = {
  Query: {
    sum: (a: number, b: number) => a + b,
    hello: () => `Hello, ${getContext().req.headers.get('user-agent')}`,
  },
  Mutation: {
    divide: (a: number, b: number) => a / b,
  },
}

// Rotas Hono extras podem coexistir no mesmo app
app.get('/hello', () => new Response('Hello, world!'))

export default app
```

Playground em `http://localhost:3000/graphql` (`bun run dev`).

## InferDI

**Objetivo:** container de injeção de dependência sem decorators/reflection, com request scope exposto em `c.var.di` e disposal automático.

```bash
npm install @inferdi/inferdi @inferdi/hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoScopeEnv } from '@inferdi/hono'
import { root, openRequestScope, type RequestScope } from './container'

type AppEnv = InferdiHonoScopeEnv<RequestScope>
const app = new Hono<AppEnv>()

app.use(
  '*',
  inferdiHono({
    container: root,
    createScope: (_root, c) =>
      openRequestScope({ requestId: crypto.randomUUID(), userId: c.req.header('x-user-id') }),
  })
)

app.get('/users/:id', async (c) => {
  const request = c.var.di.get('request') // síncrono
  const users = await c.var.di.getAsync('users') // async (depende de db)
  return c.json({ requestId: request.requestId, user: await users.profile(c.req.param('id')) })
})

export default app
```

`key` troca o nome da variável de contexto; `skipInferdiDispose(c)` adia o disposal em `stream`/`streamText`/`streamSSE`.

## Apitally

**Objetivo:** monitoramento e analytics de API. O middleware deve ser o **primeiro** da stack para envolver tudo.

```bash
npm install apitally
```

```ts
import { Hono } from 'hono'
import { useApitally, setConsumer } from 'apitally/hono'

const app = new Hono()

useApitally(app, {
  clientId: 'your-client-id',
  env: 'dev',
  requestLogging: {
    enabled: true,
    logRequestHeaders: true,
    logRequestBody: true,
    logResponseBody: true,
    captureLogs: true,
  },
})

app.use(async (c, next) => {
  const payload = c.get('jwtPayload')
  if (payload) setConsumer(c, { identifier: payload.sub, name: payload.name, group: payload.group })
  await next()
})

app.get('/', (c) => c.text('Hello Hono!'))
export default app
```

## Remix e Next.js

**Objetivo:** integrar frameworks full-stack via Fetch API. Remix entra como middleware Hono:

```ts
import * as build from '@remix-run/dev/server-build'
import { remix } from 'remix-hono/handler'

app.use('*', remix({ build, mode: process.env.NODE_ENV }))
```

Next.js não possui exemplo oficial entre as fontes; o mesmo adaptador baseado em Web Standards (`app.fetch` / handler `fetch`) se aplica — ver [`./14-deploy-runtimes.md`](./14-deploy-runtimes.md).

## Próximos passos

- [`./08-validacao.md`](./08-validacao.md) — validator, Zod OpenAPI e tratamento de erros
- [`./09-rpc-client.md`](./09-rpc-client.md) — grupos de rotas e cliente RPC tipado
- [`./14-deploy-runtimes.md`](./14-deploy-runtimes.md) — runtimes, bindings e deploy
- [`./07-helpers.md`](./07-helpers.md) — helpers como `proxy`, `html` e `stream`
