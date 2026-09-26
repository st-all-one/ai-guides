# Cheatsheet

> Referência rápida de rotas, `Context`, middleware, helpers e API. Volte ao guia
> para detalhes e opções completas.

## Setup

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

export default app
```

Deno: `Deno.serve(app.fetch)`. Node: `serve(app)` de `@hono/node-server`.
Bun: `export default { port: 3000, fetch: app.fetch }`.

## Rotas

```ts
app.get('/posts', handler)
app.post('/posts', handler)
app.put('/posts/:id', handler)
app.patch('/posts/:id', handler)
app.delete('/posts/:id', handler)
app.options('/posts', handler)
app.all('/posts/*', handler)

app.get('/posts/:id', (c) => c.text(c.req.param('id')))
app.get('/posts/:id{[0-9]+}', handler)     // regex
app.get('/posts/:id?', handler)            // opcional
app.get('/posts/*', handler)               // wildcard
app.get('/posts/:type/:id{.+}', handler)   // named wildcard

app.route('/api', apiRoutes)               // submount
const api = new Hono().basePath('/api')    // base path
```

## Context (respostas)

```ts
c.text('ok')                  // text/plain
c.text('Created', 201)        // com status
c.json({ ok: true })
c.json({ ok: true }, 200)
c.html('<h1>Hi</h1>')
c.html(<View />)
c.body(data, status, headers)
c.redirect('/login')
c.redirect('/login', 302)
c.notFound()                  // 404
c.status(201)
c.header('X-Message', 'Hi!')
c.header('Cache-Control', 'no-store')
```

## Context (estado e ambiente)

```ts
c.set('user', user)
const user = c.get('user')
const { user } = c.var

type Env = {
  Bindings: { DB: D1Database }
  Variables: { user: User }
}
const app = new Hono<Env>()
c.env.DB
c.executionCtx.waitUntil(task())

app.notFound((c) => c.text('404 Not Found', 404))
app.onError((err, c) => {
  console.error(err)
  return c.text('Internal Server Error', 500)
})
```

## Request (`c.req`)

```ts
c.req.raw                     // Request original
c.req.url                     // URL completa
c.req.method                  // 'GET'...
c.req.path                    // pathname
c.req.routePath               // padrão da rota (/posts/:id)
c.req.header('X-Foo')         // header
c.req.query('page')           // ?page=1
c.req.queries('tag')          // ?tag=a&tag=b
c.req.param('id')             // path param
c.req.param()                 // todos os params
await c.req.json()            // body JSON
await c.req.text()            // body texto
await c.req.parseBody()       // form-urlencoded/multipart
await c.req.formData()        // FormData
await c.req.arrayBuffer()     // binário
await c.req.blob()            // Blob
c.req.valid('json')           // dados validados
```

## Middleware

```ts
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'

app.use(logger())
app.use('/api/*', cors())

app.use(async (c, next) => {
  const start = performance.now()
  await next()
  c.header('Server-Timing', `total;dur=${performance.now() - start}`)
})

app.use(async (c, next) => {
  if (!c.req.header('Authorization')) return c.text('Unauthorized', 401)
  await next()
})
```

## Middleware nativos (`hono/<nome>`)

| Import | Para |
|--------|------|
| `hono/basic-auth` | `basicAuth({ username, password })` |
| `hono/bearer-auth` | `bearerAuth({ token })` |
| `hono/body-limit` | `bodyLimit({ maxSize })` |
| `hono/cache` | `cache({ cacheName, wait, cacheControl })` |
| `hono/combine` | `some`, `every`, `except` |
| `hono/compress` | `compress()` |
| `hono/context-storage` | `contextStorage()`, `getContext()` |
| `hono/cors` | `cors({ origin, allowMethods, ... })` |
| `hono/csrf` | `csrf()` |
| `hono/etag` | `etag()` |
| `hono/ip-restriction` | `ipRestriction(...)` |
| `hono/jsx-renderer` | `jsxRenderer()`, `c.render()` |
| `hono/jwk` | `jwk({ jwks_uri })` |
| `hono/jwt` | `jwt({ secret })` |
| `hono/language` | `languageDetector(...)` |
| `hono/logger` | `logger()` |
| `hono/method-not-allowed` | `methodNotAllowed()` |
| `hono/method-override` | `methodOverride()` |
| `hono/pretty-json` | `prettyJSON()` |
| `hono/request-id` | `requestId()` |
| `hono/secure-headers` | `secureHeaders()` |
| `hono/timeout` | `timeout()`, `streamTimeout()` |
| `hono/timing` | `timing()` |
| `hono/trailing-slash` | `trailingSlash()` |

## Helpers (`hono/<nome>`)

```ts
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify, decode } from 'hono/jwt'
import { html, raw } from 'hono/html'
import { stream, streamSSE } from 'hono/streaming'
import { proxy } from 'hono/proxy'
import { getConnInfo } from 'hono/deno'
import { toSSG } from 'hono/ssg'
import { upgradeWebSocket } from 'hono/deno'
import { createFactory, createMiddleware } from 'hono/factory'
import { accepts } from 'hono/accepts'
```

```ts
setCookie(c, 'token', 'value', { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 3600 })
const token = getCookie(c, 'token')
deleteCookie(c, 'token')

const jwt = await sign({ sub: 'u1', exp: 3600 + Math.floor(Date.now() / 1000) }, secret)
const payload = await verify(jwt, secret)

return stream(c, async (s) => {
  await s.write('chunk 1')
  await s.sleep(1000)
  await s.write('chunk 2')
})

return streamSSE(c, async (s) => {
  await s.writeSSE({ data: 'hello' })
})
```

## JSX

```tsx
import { Hono } from 'hono'
import type { FC } from 'hono/jsx'

const app = new Hono()

const View: FC = () => (
  <html>
    <body><h1>Hello Hono!</h1></body>
  </html>
)

app.get('/page', (c) => c.html(<View />))
```

```ts
import { html, raw } from 'hono/html'
const layout = html`<h1>${raw('<em>Hi</em>')}</h1>`
```

## Validação

```ts
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const schema = z.object({ title: z.string().min(1) })

app.post('/posts', zValidator('json', schema), (c) => {
  const { title } = c.req.valid('json')
  return c.json({ title })
})
```

```ts
import { validator } from 'hono/validator'

app.post(
  '/posts',
  validator('json', (value, c) => {
    if (typeof value.title !== 'string') return c.json({ error: 'invalid' }, 400)
    return { title: value.title }
  }),
  (c) => {
    const { title } = c.req.valid('json')
    return c.json({ title })
  }
)
```

## RPC / Client

```ts
// server
const route = app
  .get('/posts/:id', (c) => c.json({ id: c.req.param('id') }))
  .post('/posts', zValidator('json', schema), (c) => c.json({ ... }))

export type AppType = typeof route

// client
import { hc } from 'hono/client'
import type { AppType } from './server'

const client = hc<AppType>('http://localhost:8787')

const res = await client.posts[':id'].$get({ param: { id: '1' } })
const data = await res.json()
```

## Testing

```ts
import { testClient } from 'hono/testing'

it('GET /', async () => {
  const res = await app.request('/')
  expect(res.status).toBe(200)

  const client = testClient(app)
  const res2 = await client.posts.$get()
})
```

## Deploy (entry point)

```ts
// Node
import { serve } from '@hono/node-server'
serve(app)

// Deno
Deno.serve(app.fetch)

// Bun
export default { port: 3000, fetch: app.fetch }

// Cloudflare Workers
export default app

// Vercel
import { handle } from 'hono/vercel'
export const GET = handle(app)
```

## Presets

```ts
import { Hono } from 'hono'        // RegExpRouter + SmartRouter (padrão)
import { Hono } from 'hono/tiny'   // menor bundle (~14KB)
import { Hono } from 'hono/quick'  // LinearRouter (bom p/ edge que reinicia)
```

## Tipagem de Env

```ts
type Bindings = { SUPABASE_URL: string; SUPABASE_KEY: string }
type Variables = { user: { id: string } }

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
```

## HTTPException

```ts
import { HTTPException } from 'hono/http-exception'

throw new HTTPException(401, { message: 'Unauthorized' })

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  return c.text('Internal Server Error', 500)
})
```
