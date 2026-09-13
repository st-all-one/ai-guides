# Request/Response

> `HonoRequest` (`c.req`) encapsula o `Request` Web Standard; os helpers de `Context` produzem o `Response` Web Standard que o Hono retorna.

## Visão geral

`c.req` é uma instância de `HonoRequest`, obtida do `Context`. Ela **envolve** um objeto `Request` (`c.req.raw`) e expõe parses e leituras convenientes.

| Membro | Retorno | Descrição |
|--------|---------|-----------|
| `c.req.raw` | `Request` | Objeto `Request` cru |
| `c.req.url` | `string` | URL completa da requisição |
| `c.req.method` | `string` | Método HTTP |
| `c.req.path` | `string` | Pathname da requisição |
| `c.req.routePath` | `string` | Path registrado (deprecated) |
| `c.req.matchedRoutes` | `Route[]` | Rotas casadas (deprecated) |
| `c.req.param()` | `string \| Record` | Path params |
| `c.req.query()` | `string \| Record` | Query params |
| `c.req.queries()` | `string[]` | Valores múltiplos de query |
| `c.req.header()` | `string \| Record` | Headers |
| `c.req.parseBody()` | `Promise<...>` | `multipart/form-data` ou `x-www-form-urlencoded` |
| `c.req.json()` | `Promise<any>` | Body `application/json` |
| `c.req.text()` | `Promise<string>` | Body `text/plain` |
| `c.req.arrayBuffer()` | `Promise<ArrayBuffer>` | Body binário |
| `c.req.blob()` | `Promise<Blob>` | Body como `Blob` |
| `c.req.formData()` | `Promise<FormData>` | Body como `FormData` |
| `c.req.valid()` | validado | Dado validado por target |
| `cloneRawRequest(c.req)` | `Promise<Request>` | Clone do `Request` após consumo |

## c.req.raw

O objeto `Request` Web Standard cru. Em Cloudflare Workers dá acesso a extensões como `cf`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/', async (c) => {
  const metadata = c.req.raw.cf?.hostMetadata
})
```

## c.req.url

String da URL da requisição.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/about/me', async (c) => {
  const url = c.req.url // `http://localhost:8787/about/me`
})
```

## c.req.method

Nome do método HTTP.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/about/me', async (c) => {
  const method = c.req.method // `GET`
})
```

## c.req.path

O pathname da requisição.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/about/me', async (c) => {
  const pathname = c.req.path // `/about/me`
})
```

## c.req.routePath

> **Deprecated em v4.8.0:** use `routePath()` do [Route Helper](/docs/helpers/route).

Retorna o path registrado dentro do handler:

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/posts/:id', (c) => {
  return c.json({ path: c.req.routePath })
})
```

Acessando `/posts/123`, retorna `{ "path": "/posts/:id" }`.

## c.req.matchedRoutes

> **Deprecated em v4.8.0:** use `matchedRoutes()` do [Route Helper](/docs/helpers/route).

Retorna as rotas casadas no handler; útil para debug.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.use(async function logger(c, next) {
  await next()
  c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
    const name =
      handler.name ||
      (handler.length < 2 ? '[handler]' : '[middleware]')
    console.log(
      method,
      ' ',
      path,
      ' '.repeat(Math.max(10 - path.length, 0)),
      name,
      i === c.req.routeIndex ? '<- respond from here' : ''
    )
  })
})
```

## c.req.param()

Valores de path parameters. Sem argumento, retorna todos de uma vez.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/entry/:id', async (c) => {
  const id = c.req.param('id')
})

app.get('/entry/:id/comment/:commentId', async (c) => {
  const { id, commentId } = c.req.param()
})
```

## c.req.query()

Parâmetros de querystring. Sem argumento, retorna todos.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/search', async (c) => {
  const query = c.req.query('q')
})

app.get('/search', async (c) => {
  const { q, limit, offset } = c.req.query()
})
```

## c.req.queries()

Valores múltiplos de um mesmo parâmetro, ex.: `/search?tags=A&tags=B`. Retorna `string[]`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/search', async (c) => {
  const tags = c.req.queries('tags')
})
```

## c.req.header()

Valor de um header de requisição.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  const userAgent = c.req.header('User-Agent')
  return c.text(`Your user agent is ${userAgent}`)
})
```

> **Atenção:** sem argumentos, todas as chaves do record retornado são **minúsculas**. Para pegar um header com nome maiúsculo, use `c.req.header('X-Foo')`.

```ts
// ❌ Não funciona
const headerRecord = c.req.header()
const foo = headerRecord['X-Foo']

// ✅ Funciona
const foo = c.req.header('X-Foo')
```

## c.req.parseBody()

Faz parse de body `multipart/form-data` ou `application/x-www-form-urlencoded`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/entry', async (c) => {
  const body = await c.req.parseBody()
})
```

**Arquivo único** — `body['foo']` é `(string | File)`. Com vários arquivos, o último é usado.

```ts
import { Context } from 'hono'

declare const c: Context

const body = await c.req.parseBody()
const data = body['foo'] // (string | File)
```

**Múltiplos arquivos** — use o postfix `[]`; `body['foo[]']` é sempre `(string | File)[]`.

```ts
import { Context } from 'hono'

declare const c: Context

const body = await c.req.parseBody()
body['foo[]']
```

**Múltiplos arquivos/campos com o mesmo nome** — `<input type="file" multiple />` ou checkboxes de mesmo nome. Passe `{ all: true }` (desabilitado por padrão):

```ts
import { Context } from 'hono'

declare const c: Context

const body = await c.req.parseBody({ all: true })
body['foo']
```

- `body['foo']` com múltiplos arquivos → `(string | File)[]`
- `body['foo']` com arquivo único → `(string | File)`

**Dot notation** — com `{ dot: true }`, o retorno é estruturado pela notação de ponto. Dado:

```ts
const data = new FormData()
data.append('obj.key1', 'value1')
data.append('obj.key2', 'value2')
```

```ts
import { Context } from 'hono'

declare const c: Context

const body = await c.req.parseBody({ dot: true })
// body is `{ obj: { key1: 'value1', key2: 'value2' } }`
```

## c.req.json()

Faz parse de body `application/json`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/entry', async (c) => {
  const body = await c.req.json()
})
```

## c.req.text()

Faz parse de body `text/plain`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/entry', async (c) => {
  const body = await c.req.text()
})
```

## c.req.arrayBuffer()

Faz parse do body como `ArrayBuffer`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/entry', async (c) => {
  const body = await c.req.arrayBuffer()
})
```

## c.req.blob()

Faz parse do body como `Blob`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/entry', async (c) => {
  const body = await c.req.blob()
})
```

## c.req.formData()

Faz parse do body como `FormData`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/entry', async (c) => {
  const body = await c.req.formData()
})
```

## c.req.valid()

Obtém os dados já validados. Targets disponíveis:

| Target | Fonte |
|--------|-------|
| `form` | body `form` |
| `json` | body JSON |
| `query` | querystring |
| `header` | headers |
| `cookie` | cookies |
| `param` | path params |

```ts
app.post('/posts', async (c) => {
  const { title, body } = c.req.valid('form')
})
```

Uso completo com validação em [`08-validacao.md`](./08-validacao.md).

## cloneRawRequest()

Clona o `Request` cru a partir de um `HonoRequest`. Funciona **mesmo depois** de o body ter sido consumido por validators ou métodos do `HonoRequest`.

```ts
import { Hono } from 'hono'
import { cloneRawRequest } from 'hono/request'
import { validator } from 'hono/validator'

const app = new Hono()

app.post(
  '/forward',
  validator('json', (data) => data),
  async (c) => {
    // Clone após a validação
    const clonedReq = await cloneRawRequest(c.req)
    // Não lança erro
    await clonedReq.json()
  }
)
```

## Response (Web Standard)

Os helpers do `Context` retornam o mesmo objeto `Response` do Web Standard. Você pode construir respostas diretamente com `new Response`.

```ts
new Response('Thank you for coming', {
  status: 201,
  headers: {
    'X-Message': 'Hello!',
    'Content-Type': 'text/plain',
  },
})
```

Uso via `c.body()` com status e headers explícitos:

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/welcome', (c) => {
  c.header('Content-Type', 'text/plain')
  return c.body('Thank you for coming')
})

app.get('/created', (c) => {
  return c.body('Thank you for coming', 201, {
    'X-Message': 'Hello!',
    'Content-Type': 'text/plain',
  })
})
```

Status codes são definidos com `c.status()` antes de retornar, ou passados como argumento dos helpers (`c.text`, `c.json`, `c.body`, `c.redirect`).

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/posts', (c) => {
  c.status(201)
  return c.text('Your post is created!')
})

app.get('/moved', (c) => {
  return c.redirect('/', 301)
})
```

## Uso com JSON e form data

JSON (`application/json`):

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/api/users', async (c) => {
  const { name, email } = await c.req.json()
  c.status(201)
  return c.json({ id: 1, name, email })
})
```

Form data (`multipart/form-data` ou `x-www-form-urlencoded`):

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const title = body['title'] as string
  const file = body['file'] as File
  return c.json({ title, filename: file.name, size: file.size })
})
```

## Próximos passos

- [`03-contexto.md`](./03-contexto.md) — objeto `Context`
- [`08-validacao.md`](./08-validacao.md) — `valid()` e validators
- [`07-helpers.md`](./07-helpers.md) — helpers de `Response`
- [`02-roteamento.md`](./02-roteamento.md) — `param()`, `query()` e rotas
