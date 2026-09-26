# Middleware — conceito

> Middleware é código que roda **antes e depois** do Handler, numa pilha em
> cebola (*onion*): o `Request` desce até o Handler e a `Response` sobe de volta
> pela mesma cadeia.
> Versão de referência: **Hono v4.13.7**.

## Handler vs Middleware

- **Handler** — deve retornar um `Response`. Apenas **um** handler é chamado por
  requisição.
- **Middleware** — deve `await next()` e retornar `void` para seguir adiante
  **ou** retornar um `Response` para encerrar a cadeia (*early-exit*).

```ts
type Next = () => Promise<void>
type Middleware = (
  c: Context,
  next: Next
) => Promise<void | Response>
```

O caso canônico: medir o tempo e injetar um header na resposta.

```ts
import { Hono } from 'hono'
const app = new Hono()

app.use(async (c, next) => {
  const start = performance.now()
  await next()
  const end = performance.now()
  c.res.headers.set('X-Response-Time', `${end - start}`)
})
```

Com isso escrevemos middleware próprio, além de usar os **embutidos** (ver
[`06-middleware-embutidos.md`](./06-middleware-embutidos.md)) e os de terceiros.

## `await next()` e execução antes/depois

Tudo antes do `await next()` roda na ida; tudo depois roda na volta. Ignorar o
`await` quebra a ordem (o código pós-`next` dispara antes do Handler terminar).
`next()` **nunca lança**: se o handler ou outro middleware lançar, o Hono captura
e encaminha para `app.onError()` (ou converte em `500`), então **não** é preciso
envolver `next()` em `try/catch/finally`.

## Ordem e composição (onion)

A ordem de execução é a **ordem de registro**: o primeiro `app.use` registrado
roda primeiro na ida e **por último** na volta.

```ts
app.use(async (_, next) => {
  console.log('middleware 1 start')
  await next()
  console.log('middleware 1 end')
})
app.use(async (_, next) => {
  console.log('middleware 2 start')
  await next()
  console.log('middleware 2 end')
})
app.use(async (_, next) => {
  console.log('middleware 3 start')
  await next()
  console.log('middleware 3 end')
})

app.get('/', (c) => {
  console.log('handler')
  return c.text('Hello!')
})
```

```
middleware 1 start
  middleware 2 start
    middleware 3 start
      handler
    middleware 3 end
  middleware 2 end
middleware 1 end
```

## Registrar middleware

`app.use` ou `app.HTTP_METHOD` aceitam middleware e handler, e permitem
restringir path e/ou método. Os padrões combinam com strings, curingas (`*`),
parâmetros (`:id`) e regex.

```ts
// qualquer método, todas as rotas
app.use(logger())

// path específico
app.use('/posts/*', cors())

// método + path
app.post('/posts/*', basicAuth())
```

Se o middleware/handler retornar `Response`, ela é usada e a cadeia **para**:

```ts
app.post('/posts', (c) => c.text('Created!', 201))
```

Para `POST /posts`, quatro camadas rodam antes do handler:

```ts
logger() -> cors() -> basicAuth() -> *handler*
```

### Por path

O path é casado por prefixo quando termina em `*`, ou por segmento exato:

```ts
app.use('/admin/*', adminAuth())
app.use('/api/*', apiKey())
```

### Por método

Aplique middleware apenas a um verbo, encadeando antes do handler:

```ts
app.get('/page', (c) => c.text('Viewing page'))
app.delete(
  '/page',
  basicAuth({ username: 'hono', password: 'acoolproject' }),
  (c) => c.text('Page deleted')
)
```

## Middleware que retorna cedo (auth)

Middleware de autenticação não chama `next()` quando as credenciais falham —
retorna a `Response` de erro e a cadeia termina ali.

```ts
app.use('/admin/*', async (c, next) => {
  const token = c.req.header('x-api-key')
  if (token !== c.env.API_KEY) {
    return c.text('Unauthorized', 401)
  }
  await next()
})
```

## `app.notFound` e `app.onError`

São **handlers especiais**, não middleware. `notFound` responde quando nenhuma
rota casa; `onError` responde quando algo lança. Ambos retornam `Response`.

```ts
import { HTTPException } from 'hono/http-exception'

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})
```

## Middleware customizado

Direto no `app.use` ou separado em arquivo. Para separar sem perder tipagem de
`Context`/`next`, use `createMiddleware()` do `hono/factory` (detalhes em
[`07-helpers.md`](./07-helpers.md), seção *factory*).

```ts
import { createMiddleware } from 'hono/factory'

const logger = createMiddleware(async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
})
```

Generics em `createMiddleware`:

```ts
createMiddleware<{ Bindings: Bindings }>(async (c, next) => { /* ... */ })
```

### Modificar a Response após `next`

```ts
const stripRes = createMiddleware(async (c, next) => {
  await next()
  c.res = undefined
  c.res = new Response('New Response')
})
```

### Acessar o Context dentro dos argumentos do middleware

Use o `c` fornecido pelo `app.use` para construir middleware dependente de env:

```ts
import { cors } from 'hono/cors'

app.use('*', async (c, next) => {
  const middleware = cors({
    origin: c.env.CORS_ORIGIN,
  })
  return middleware(c, next)
})
```

### Estender o Context em middleware

`c.set` com `Variables` tipadas via `createMiddleware`:

```ts
import { createMiddleware } from 'hono/factory'

const echoMiddleware = createMiddleware<{
  Variables: {
    echo: (str: string) => string
  }
}>(async (c, next) => {
  c.set('echo', (str) => str)
  await next()
})

app.get('/echo', echoMiddleware, (c) => {
  return c.text(c.var.echo('Hello!'))
})
```

### Inferência de tipos na cadeia de middleware

Cada `.use()` retorna uma nova instância com o tipo mesclado, então o handler
seguinte enxerga todas as variáveis tipadas sem declarar um `Env` combinado:

```ts
const authMiddleware = createMiddleware<{
  Variables: { user: { id: string; name: string } }
}>(async (c, next) => {
  c.set('user', { id: '123', name: 'Alice' })
  await next()
})

const dbMiddleware = createMiddleware<{
  Variables: { db: { query: (sql: string) => Promise<unknown> } }
}>(async (c, next) => {
  c.set('db', {
    query: async (sql) => {
      /* ... */
    },
  })
  await next()
})

const app = new Hono()
  .use(authMiddleware)
  .use(dbMiddleware)
  .get('/', (c) => {
    const user = c.var.user // { id: string; name: string }
    const db = c.var.db // { query: (sql: string) => Promise<unknown> }
    return c.json({ user })
  })
```

## Middleware de terceiros

Middleware embutido **não** depende de módulos externos; o de terceiros costuma
depender de bibliotecas externas. Repositório oficial:
<https://github.com/honojs/middleware> — docs em
<https://hono.dev/docs/middleware/third-party>.

| Categoria | Middleware |
|-----------|------------|
| Authentication | [Auth.js (Next Auth)](https://github.com/honojs/middleware/tree/main/packages/auth-js), [Casbin](https://github.com/honojs/middleware/tree/main/packages/casbin), [Clerk Auth](https://github.com/honojs/middleware/tree/main/packages/clerk-auth), [Cloudflare Access](https://github.com/honojs/middleware/tree/main/packages/cloudflare-access), [OAuth Providers](https://github.com/honojs/middleware/tree/main/packages/oauth-providers), [OIDC Auth](https://github.com/honojs/middleware/tree/main/packages/oidc-auth), [Firebase Auth](https://github.com/honojs/middleware/tree/main/packages/firebase-auth), [Verify RSA JWT (JWKS)](https://github.com/wataruoguchi/verify-rsa-jwt-cloudflare-worker), [SSOJet Auth](https://github.com/ssojet/ssojet-hono), [Stytch Auth](https://github.com/honojs/middleware/tree/main/packages/stytch-auth), [Shopify Auth](https://github.com/besart-k/hono-shopify-auth) |
| Validators | [Ajv](https://github.com/honojs/middleware/tree/main/packages/ajv-validator), [ArkType](https://github.com/honojs/middleware/tree/main/packages/arktype-validator), [Class Validator](https://github.com/honojs/middleware/tree/main/packages/class-validator), [Conform](https://github.com/honojs/middleware/tree/main/packages/conform-validator), [Effect Schema](https://github.com/honojs/middleware/tree/main/packages/effect-validator), [Standard Schema](https://github.com/honojs/middleware/tree/main/packages/standard-validator), [TypeBox](https://github.com/honojs/middleware/tree/main/packages/typebox-validator), [Typia](https://github.com/honojs/middleware/tree/main/packages/typia-validator), [unknownutil](https://github.com/ryoppippi/hono-unknownutil-validator), [Valibot](https://github.com/honojs/middleware/tree/main/packages/valibot-validator), [Zod](https://github.com/honojs/middleware/tree/main/packages/zod-validator) |
| OpenAPI | [Zod OpenAPI](https://github.com/honojs/middleware/tree/main/packages/zod-openapi), [Scalar](https://github.com/scalar/scalar/tree/main/integrations/hono), [Swagger UI](https://github.com/honojs/middleware/tree/main/packages/swagger-ui), [Swagger Editor](https://github.com/honojs/middleware/tree/main/packages/swagger-editor), [Hono OpenAPI](https://github.com/rhinobase/hono-openapi), [hono-zod-openapi](https://github.com/paolostyle/hono-zod-openapi) |
| Development | [ESLint Config](https://github.com/honojs/middleware/tree/main/packages/eslint-config), [SSG Plugin Essential](https://github.com/honojs/middleware/tree/main/packages/ssg-plugins-essential) |
| Monitoring / Tracing | [Apitally](https://docs.apitally.io/frameworks/hono), [Highlight.io](https://www.highlight.io/docs/getting-started/backend-sdk/js/hono), [LogTape](https://logtape.org/manual/integrations#hono), [OpenTelemetry](https://github.com/honojs/middleware/tree/main/packages/otel), [Prometheus Metrics](https://github.com/honojs/middleware/tree/main/packages/prometheus), [Sentry](https://github.com/honojs/middleware/tree/main/packages/sentry), [Pino logger](https://github.com/maou-shonen/hono-pino) |
| Server / Adapter | [GraphQL Server](https://github.com/honojs/middleware/tree/main/packages/graphql-server), [oRPC](https://orpc.dev/docs/adapters/hono), [tRPC Server](https://github.com/honojs/middleware/tree/main/packages/trpc-server), [mcp-use (MCP Server)](https://github.com/mcp-use/mcp-use) |
| Transpiler | [Bun Transpiler](https://github.com/honojs/middleware/tree/main/packages/bun-transpiler), [esbuild Transpiler](https://github.com/honojs/middleware/tree/main/packages/esbuild-transpiler) |
| UI / Renderer | [Qwik City](https://github.com/honojs/middleware/tree/main/packages/qwik-city), [React Compatibility](https://github.com/honojs/middleware/tree/main/packages/react-compat), [React Renderer](https://github.com/honojs/middleware/tree/main/packages/react-renderer) |
| Queue / Job Processing | [GlideMQ (Message Queue REST API + SSE)](https://github.com/avifenesh/glidemq-hono) |
| Internationalization | [Intlayer i18n](https://intlayer.org/doc/environment/hono) |
| Utilities | [Bun Compress](https://github.com/honojs/middleware/tree/main/packages/bun-compress), [Cap Checkpoint](https://capjs.js.org/guide/middleware/hono.html), [Event Emitter](https://github.com/honojs/middleware/tree/main/packages/event-emitter), [Geo](https://github.com/ktkongtong/hono-geo-middleware/tree/main/packages/middleware), [Hono Rate Limiter](https://github.com/rhinobase/hono-rate-limiter), [Hono Problem Details (RFC 9457)](https://github.com/paveg/hono-problem-details), [Hono Simple DI](https://github.com/maou-shonen/hono-simple-DI), [InferDI](https://github.com/inferdi/inferdi/tree/main/packages/hono), [Idempotency (Stripe-style)](https://github.com/paveg/hono-idempotency), [idempot-js](https://js.idempot.dev), [jsonv-ts (Validator, OpenAPI, MCP)](https://github.com/dswbx/jsonv-ts), [MCP](https://github.com/honojs/middleware/tree/main/packages/mcp), [RONIN (Database)](https://github.com/ronin-co/hono-client), [Session](https://github.com/honojs/middleware/tree/main/packages/session), [StitchAPI (Typed API calls + SSE)](https://github.com/rejifald/StitchAPI/tree/main/packages/hono), [tsyringe](https://github.com/honojs/middleware/tree/main/packages/tsyringe), [User Agent based Blocker](https://github.com/honojs/middleware/tree/main/packages/ua-blocker) |

## Próximos passos

- [`06-middleware-embutidos.md`](./06-middleware-embutidos.md) — todos os 24 nativos
- [`07-helpers.md`](./07-helpers.md) — `factory`, `createMiddleware`, `createFactory`
- [`04-request-response.md`](./04-request-response.md) — `Context`, `c.res`, `next`
- [`15-seguranca.md`](./15-seguranca.md) — auth, CSRF, secure headers
