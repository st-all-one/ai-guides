# Padrões Avançados

> Composição modular, tipagem global, middleware reutilizável, erros,
> streaming/caching, RPC ponta a ponta e a integração com o projeto raiz
> **Deno + Fresh 2** (que roda sobre o Hono).

## 1. Organização modular com `app.route()`

Cada domínio vira um sub-app isolado; o app raiz apenas monta os módulos. Assim
os tipos continuam fluindo e cada arquivo tem uma responsabilidade.

```ts
// routes/posts.ts
import { Hono } from 'hono'

export const posts = new Hono()

posts.get('/', (c) => c.json({ posts: [] }))
posts.get('/:id', (c) => c.json({ id: c.req.param('id') }))

// routes/index.ts
import { Hono } from 'hono'
import { posts } from './posts.ts'
import { users } from './users.ts'

export const app = new Hono()
  .route('/posts', posts)
  .route('/users', users)

export type AppType = typeof app
```

Regras úteis:

- Monte sub-apps **sem** `basePath` e passe o prefixo no `.route()`.
- Não repita o prefixo dentro do sub-app — evita `"/posts/posts/:id"`.
- `app.route()` preserva os tipos, então `AppType` continua completo para o RPC.

## 2. Tipagem de `Env` (Bindings + Variables)

`Bindings` são valores do runtime (secrets, bancos, KV); `Variables` são valores
por request criados por middleware.

```ts
type Bindings = {
  DATABASE_URL: string
  KV: KVNamespace
}

type Variables = {
  requestId: string
  user: { id: string; role: 'admin' | 'user' }
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use(async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  await next()
})

app.get('/me', (c) => {
  const user = c.get('user')
  const id = c.var.requestId
  return c.json({ user, id, db: c.env.DATABASE_URL })
})
```

Para variáveis globais entre arquivos, estenda `ContextVariableMap`:

```ts
declare module 'hono' {
  interface ContextVariableMap {
    user: { id: string; role: 'admin' | 'user' }
  }
}
```

## 3. Middleware reutilizável com `createMiddleware`/`createFactory`

`createMiddleware` dá inferência de tipos sem repetir generics. `createFactory`
permite escrever uma vez e reutilizar o contexto tipado.

```ts
import { createMiddleware, createFactory } from 'hono/factory'

const auth = createMiddleware<{
  Variables: { user: { id: string } }
}>(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('user', { id: token })
  await next()
})

// factory: contexto já tipado
const factory = createFactory<{ Variables: { user: { id: string } } }>()

const onlyAdmin = factory.createMiddleware(async (c, next) => {
  if (c.var.user.id !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
})
```

Aplicação em cadeia:

```ts
app.get('/admin', auth, onlyAdmin, (c) => c.json({ ok: true }))
```

## 4. Tratamento de erro centralizado

`HTTPException` para erros esperados; `app.onError` como rede de segurança;
`app.notFound` para 404.

```ts
import { HTTPException } from 'hono/http-exception'

app.get('/posts/:id', (c) => {
  const post = findPost(c.req.param('id'))
  if (!post) {
    throw new HTTPException(404, { message: 'Post not found' })
  }
  return c.json(post)
})

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})
```

Com validação de formulário, retorne cedo com a resposta tipada em vez de lançar:

```ts
validator('json', (value, c) => {
  if (!value.title) return c.json({ error: 'title is required' }, 400)
  return { title: value.title as string }
})
```

## 5. Streaming e SSE

Use `stream` para respostas grandes (evita bufferizar) e `streamSSE` para eventos.

```ts
import { stream, streamSSE } from 'hono/streaming'

app.get('/download', (c) => {
  c.header('Content-Disposition', 'attachment; filename="export.txt"')
  return stream(c, async (s) => {
    c.header('X-Content-Type-Options', 'nosniff')
    await s.write('linha 1\n')
    await s.pipe(readableStream)
  })
})

app.get('/events', (c) => {
  return streamSSE(c, async (s) => {
    let id = 0
    while (true) {
      await s.writeSSE({ data: `tick ${id++}`, event: 'tick', id: `${id}` })
      await s.sleep(1000)
    }
  })
})
```

Combine com `timeout`/`streamTimeout` (ver `06-middleware-embutidos.md`) para não
deixar conexões abertas indefinidamente.

## 6. Cache e ETag

```ts
import { cache } from 'hono/cache'
import { etag } from 'hono/etag'

app.use('*', etag())
app.get(
  '/static-data',
  cache({
    cacheName: 'my-app',
    wait: true,
    cacheControl: 'max-age=3600',
  }),
  (c) => c.json(getData())
)
```

- `etag()` → 304 quando o cliente já tem a versão (economiza banda).
- `cache()` → cache de borda via Cache API (disponível em Workers/Deno/Cloudflare).
- Para dados por usuário, nunca cacheie sem `Vary`/chave correta.

## 7. RPC ponta a ponta

O servidor exporta o **tipo** do app; o cliente infere caminhos, params, bodies e
respostas. Não há duplicação de contrato.

```ts
// server.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const schema = z.object({ title: z.string() })

const app = new Hono()
  .get('/posts/:id', (c) => c.json({ id: c.req.param('id'), title: 'Hi' }))
  .post('/posts', zValidator('json', schema), (c) => {
    const { title } = c.req.valid('json')
    return c.json({ id: '1', title }, 201)
  })

export type AppType = typeof app

// client.ts
import { hc } from 'hono/client'
import type { AppType } from './server.ts'

const client = hc<AppType>('http://localhost:8787')

const res = await client.posts.$post({ json: { title: 'Novo' } })
if (res.ok) {
  const post = await res.json() // { id: string; title: string }
}
```

Para respostas não-2xx, inspecione `res.status` e `res.error` (ou configure um
`onError` no servidor que preserve o schema). Ver `09-rpc-client.md`.

## 8. Observabilidade

```ts
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { timing } from 'hono/timing'
import { contextStorage, getContext } from 'hono/context-storage'

app.use(requestId())
app.use(logger())
app.use(timing())
app.use(contextStorage())

app.use(async (c, next) => {
  const id = c.get('requestId')
  console.log(`[${id}] ${c.req.method} ${c.req.path}`)
  await next()
})

// getContext() funciona em qualquer função chamada durante o request
function audit(message: string) {
  const c = getContext()
  console.log(c.get('requestId'), message)
}
```

`context-storage` usa `AsyncLocalStorage` (Node/Deno/Bun) ou equivalente; em
runtimes edge verifique a disponibilidade.

## 9. Performance e escolha de router

| Cenário | Escolha |
|---------|---------|
| App tradicional, muitas rotas | `hono` (RegExpRouter + SmartRouter) |
| Bundle mínimo no edge | `hono/tiny` |
| Runtime que inicializa a cada request | `hono/quick` (LinearRouter) |
| Rotas com muitos patterns dinâmicos | padrão `hono` |

Boas práticas de runtime edge:

- Evite I/O bloqueante e trabalho pesado no handler; delegue com `c.executionCtx.waitUntil()`.
- Prefira streaming a acumular grandes corpos.
- Use `cache()`/`etag()` para respostas idempotentes.
- Mantenha o bundle enxuto: importe só os middleware/helpers usados.

## 10. Integração com Fresh 2 (projeto raiz Deno)

Fresh 2 expõe `new App()` com API no estilo Hono. O `main.ts` do projeto na raiz
registra middleware, rotas e rotas por sistema de arquivos:

```ts
import { App, staticFiles } from 'fresh'
import { define, type State } from './utils.ts'

export const app = new App<State>()

app.use(staticFiles())

app.use(async (ctx) => {
  ctx.state.shared = 'hello'
  return await ctx.next()
})

app.get('/api2/:name', (ctx) => {
  const name = ctx.params.name ?? ''
  return new Response(`Hello, ${name}!`)
})

app.use(define.middleware((ctx) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`)
  return ctx.next()
}))

app.fsRoutes()
```

Equivalências conceituais:

| Hono | Fresh 2 (`App`) |
|------|-----------------|
| `c` (Context) | `ctx` |
| `c.req.param('name')` | `ctx.params.name` |
| `c.req` | `ctx.req` |
| `await next()` | `await ctx.next()` |
| `c.set('key', v)` / `c.get('key')` | `ctx.state.key` |
| `app.get(path, handler)` | `app.get(path, handler)` |
| `app.route(prefix, sub)` | rotas por arquivo em `routes/` + `app.fsRoutes()` |
| `app.use(mw)` | `app.use(mw)` / `define.middleware(...)` |

Ao trabalhar em `routes/`, `islands/` e `main.ts` do projeto raiz, consulte
`ai-guides/fresh_guide/` para detalhes de SSR, islands e convenções; os
conceitos de HTTP, middleware e contexto deste guia continuam válidos.

## 11. Checklist de arquitetura

- [ ] App raiz só monta módulos; lógica nos sub-apps
- [ ] `Env` tipado (`Bindings`/`Variables`) e declarado uma vez
- [ ] Middleware cross-cutting registrado antes das rotas
- [ ] Erros previstos como `HTTPException`; `onError` como fallback
- [ ] Entrada sempre validada (`c.req.valid`) antes do handler
- [ ] Contratos compartilhados via `hc` em vez de tipos duplicados
- [ ] Streaming/cache/ETag para respostas grandes ou idempotentes
- [ ] Testes com `app.request()`/`testClient` cobrindo 200 e 4xx

## Próximos passos

- [`09-rpc-client.md`](./09-rpc-client.md) — tipos compartilhados e `hc`
- [`13-melhores-praticas.md`](./13-melhores-praticas.md) — regras de código
- [`14-deploy-runtimes.md`](./14-deploy-runtimes.md) — entry points por runtime
- [`15-seguranca.md`](./15-seguranca.md) — guards e produção
