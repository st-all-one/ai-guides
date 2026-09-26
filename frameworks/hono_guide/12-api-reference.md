# Referência da API

> `Hono` é o objeto primário do framework; toda aplicação começa importando-o e
> termina exportando-o. A API é composta por objetos estendidos dos Web Standards.

## Estrutura geral da API

Segundo a documentação de `api/index.md`, a API do Hono é simples e é composta por
objetos estendidos dos Web Standards, dividida em quatro áreas:

- Objeto **Hono**
- **Roteamento** (routing)
- Objeto **Context**
- **Middleware**

```ts
import { Hono } from 'hono'

const app = new Hono()
//...

export default app // for Cloudflare Workers or Bun
```

## Classe `Hono`

### Construtor

`new Hono()` aceita um objeto de opções opcional. As opções cobertas pela doc são
`strict` e `router` (ver seções abaixo). O construtor também aceita generics para
tipar `Bindings` e `Variables`.

```ts
import { Hono } from 'hono'

const app = new Hono()
```

### Métodos

Uma instância de `Hono` possui os seguintes métodos:

- `app.HTTP_METHOD([path,] handler|middleware...)`
- `app.all([path,] handler|middleware...)`
- `app.on(method|method[], path|path[], handler|middleware...)`
- `app.use([path,] middleware)`
- `app.route(path, [app])`
- `app.basePath(path)`
- `app.notFound(handler)`
- `app.onError(err, handler)`
- `app.mount(path, anotherApp, [options])`
- `app.fire()`
- `app.fetch(request, env, event)`
- `app.request(path, options)`

A primeira parte deles é usada para **routing** (veja `02-roteamento.md`).

### Properties

| Property | Descrição |
|----------|-----------|
| `app.routes` | Lista de rotas registradas na aplicação |
| `app.router` | Instância do router em uso (ex.: `SmartRouter`, `RegExpRouter`) |

### `app.fetch`

`app.fetch` é o **entry point** da sua aplicação. Para Cloudflare Workers:

```ts
import { Hono } from 'hono'

const app = new Hono()

type Env = any
type ExecutionContext = any

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx)
  },
}
```

Ou apenas:

```ts
import { Hono } from 'hono'

const app = new Hono()

export default app
```

Bun:

```ts
export default {
  port: 3000,
  fetch: app.fetch,
}
```

### `app.request`

`app.request` é um método útil para **testing**. Aceita uma URL ou pathname para
enviar um request GET, e retorna um objeto `Response`.

```ts
import { Hono } from 'hono'

const app = new Hono()

test('GET /hello is ok', async () => {
  const res = await app.request('/hello')
  expect(res.status).toBe(200)
})
```

Também aceita um objeto `Request`:

```ts
test('POST /message is ok', async () => {
  const req = new Request('Hello!', {
    method: 'POST',
  })
  const res = await app.request(req)
  expect(res.status).toBe(201)
})
```

### `app.fire`

> **`app.fire()` está deprecated**. Use `fire()` de `hono/service-worker`. Veja a
> documentação de Service Worker para detalhes.

`app.fire()` adiciona automaticamente um listener global de evento `fetch`. É útil
para ambientes que seguem a Service Worker API, como Cloudflare Workers no modo
não-ES module.

```ts
addEventListener('fetch', (event: FetchEventLike): void => {
  event.respondWith(this.dispatch(...))
})
```

### `app.notFound`

`app.notFound` permite customizar a resposta de Not Found.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.notFound((c) => {
  return c.text('Custom 404 Message', 404)
})
```

> O método `notFound` é chamado **apenas** a partir do app top-level (`/docs/api/hono`).

### `app.onError`

`app.onError` permite tratar erros não capturados e retornar uma Response
customizada.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.onError((err, c) => {
  console.error(`${err}`)
  return c.text('Custom Error Message', 500)
})
```

> Se tanto um app pai quanto suas rotas tiverem handlers `onError`, os handlers
> **nível de rota** têm prioridade.

### `app.mount`

`mount()` permite montar aplicações construídas com outros frameworks dentro da sua
aplicação Hono.

```ts
import { Router as IttyRouter } from 'itty-router'
import { Hono } from 'hono'

// Create itty-router application
const ittyRouter = IttyRouter()

// Handle `GET /itty-router/hello`
ittyRouter.get('/hello', () => new Response('Hello from itty-router'))

// Hono application
const app = new Hono()

// Mount!
app.mount('/itty-router', ittyRouter.handle)
```

Por padrão, `mount()` passa um novo `Request` com o mount path removido da URL.
Forneça uma função `replaceRequest` para controlar qual `Request` é passado:

```ts
import { Hono } from 'hono'

const app = new Hono()
const handler = (request: Request) => new Response(request.url)

app.mount('/app', handler, {
  replaceRequest: (originalRequest) => originalRequest,
})
```

Para passar o `Request` original sem alteração, defina `replaceRequest` como
`false` (atalho para a função acima):

```ts
app.mount('/app', handler, {
  replaceRequest: false,
})
```

### `app.use` com path

`app.use` registra middleware, opcionalmente escopado a um path:

```ts
app.use('/auth/*', async (c, next) => {
  // ...
  await next()
})
```

### `app.basePath`

`app.basePath(path)` define um prefixo base para as rotas da instância.

### `app.route`

`app.route(path, [app])` monta outra instância de `Hono` sob um path.

### `app.showRoutes` / `app.showRoutesDetailed`

Métodos utilitários que imprimem as rotas registradas na aplicação (visão resumida
e detalhada, respectivamente).

### `app.routes` / `app.router`

- `app.routes` expõe as rotas registradas.
- `app.router` expõe a instância de router em uso.

## Strict mode

Strict mode é `true` por padrão e distingue as seguintes rotas:

- `/hello`
- `/hello/`

`app.get('/hello')` não faz match com `GET /hello/`. Definindo strict mode como
`false`, ambos os paths são tratados igualmente.

```ts
import { Hono } from 'hono'

const app = new Hono({ strict: false })
```

## Router option

A opção `router` especifica qual router usar. O router padrão é `SmartRouter`. Para
usar `RegExpRouter`, passe-o para uma nova instância `Hono`:

```ts
import { Hono } from 'hono'
import { RegExpRouter } from 'hono/router/reg-exp-router'

const app = new Hono({ router: new RegExpRouter() })
```

## Presets

O Hono tem vários routers, cada um projetado para um propósito específico. A opção
`router` no construtor permite escolhê-lo. **Presets** cobrem casos comuns, evitando
especificar o router a cada vez. A classe `Hono` importada de todos os presets é a
mesma — a única diferença é o router — portanto podem ser usados
intercambiavelmente.

### `hono`

```ts
import { Hono } from 'hono'
```

```ts
this.router = new SmartRouter({
  routers: [new RegExpRouter(), new TrieRouter()],
})
```

### `hono/quick`

```ts
import { Hono } from 'hono/quick'
```

```ts
this.router = new SmartRouter({
  routers: [new LinearRouter(), new TrieRouter()],
})
```

### `hono/tiny`

```ts
import { Hono } from 'hono/tiny'
```

```ts
this.router = new PatternRouter()
```

### Qual preset usar?

| Preset | Plataformas adequadas |
|--------|-----------------------|
| `hono` | Recomendado para a maioria dos casos. Embora a fase de registro possa ser mais lenta que `hono/quick`, apresenta alta performance após o boot. Ideal para servidores de vida longa em **Deno**, **Bun** ou **Node.js**. Também adequado para **Fastly Compute** (registro ocorre na fase de build). Para ambientes com v8 isolates, como **Cloudflare Workers** e **Deno Deploy**, também é adequado, pois os isolates persistem por um certo tempo após o boot. |
| `hono/quick` | Projetado para ambientes em que a aplicação é inicializada a cada request. |
| `hono/tiny` | O menor pacote de router; adequado para ambientes com recursos limitados. |

Outros presets citados na documentação: `hono/aws-lambda`.

## `HTTPException`

Quando um erro fatal ocorre, o Hono (e vários middleware do ecossistema) pode
lançar um `HTTPException`. É um `Error` customizado do Hono que simplifica o retorno
de respostas de erro.

### Lançando HTTPExceptions

Especifique um status code e uma `message` ou uma `res` customizada.

#### Custom Message

Para respostas `text` básicas, basta definir a `message` do erro.

```ts
import { HTTPException } from 'hono/http-exception'

throw new HTTPException(401, { message: 'Unauthorized' })
```

#### Custom Response

Para outros tipos de resposta, ou para definir headers, use a opção `res`. O status
passado ao construtor é o usado para criar respostas.

```ts
import { HTTPException } from 'hono/http-exception'

const errorResponse = new Response('Unauthorized', {
  status: 401, // this gets ignored
  headers: {
    Authenticate: 'error="invalid_token"',
  },
})

throw new HTTPException(401, { res: errorResponse })
```

#### Cause

Em ambos os casos, use a opção `cause` para adicionar dados arbitrários ao
`HTTPException`.

```ts
import { Hono, Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

app.post('/login', async (c) => {
  try {
    await authorize(c)
  } catch (cause) {
    throw new HTTPException(401, { message, cause })
  }
  return c.redirect('/')
})
```

### Tratando HTTPExceptions

Erros `HTTPException` não capturados podem ser tratados com `app.onError`. Eles
incluem um método `getResponse` que retorna um novo `Response` criado a partir do
`status` do erro e da `message` ou da resposta customizada definida no lançamento.

```ts
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // Return the error response generated by HTTPException
    return err.getResponse()
  }
  // For any other unexpected errors, log and return a generic 500 response
  console.error(err)
  return c.text('Internal Server Error', 500)
})
```

> **`HTTPException.getResponse` não tem conhecimento do `Context`**. Para incluir
> headers já definidos no `Context`, você deve aplicá-los a um novo `Response`.

### HTTPException customizado

Você pode estender a classe para criar exceções próprias:

```ts
import { HTTPException } from 'hono/http-exception'

class CustomException extends HTTPException {
  constructor(message: string) {
    super(400, { message })
  }
}
```

### API de `HTTPException`

| Membro | Descrição |
|--------|-----------|
| `status` | Status code do erro |
| `getResponse()` | Retorna um novo `Response` criado do status + message/res |
| `res` | Response customizada passada nas options |
| options `message` | Mensagem usada como resposta `text` |
| options `res` | Response customizada (headers, outros tipos) |
| options `cause` | Dados arbitrários anexados ao erro |

### ErrorResponse

`ErrorResponse` é o tipo de resposta de erro associado ao tratamento de exceções,
produzido por `HTTPException.getResponse()`.

## Generics: `Env` (`Bindings` / `Variables`)

Você pode passar generics para especificar os tipos dos Cloudflare Workers Bindings
e das variables usadas em `c.set`/`c.get`.

```ts
import { Hono } from 'hono'

type User = any
declare const user: User

type Bindings = {
  TOKEN: string
}

type Variables = {
  user: User
}

const app = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

app.use('/auth/*', async (c, next) => {
  const token = c.env.TOKEN // token is `string`
  // ...
  c.set('user', user) // user should be `User`
  await next()
})
```

## Próximos passos

- [`02-roteamento.md`](./02-roteamento.md) — routing, `app.on`, `app.route`
- [`03-contexto.md`](./03-contexto.md) — objeto Context e `c.set`/`c.get`
- [`09-rpc-client.md`](./09-rpc-client.md) — tipos e RPC client
- [`13-melhores-praticas.md`](./13-melhores-praticas.md) — boas práticas e DX
