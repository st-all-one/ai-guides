# Roteamento

> Roteamento do Hono: registra métodos HTTP, path parameters, wildcards, regex,
> submount de sub-apps (`app.route`) e base path (`basePath`). A escolha do
> **router** (`RegExpRouter`, `SmartRouter`, `TrieRouter`, `LinearRouter`,
> `PatternRouter`) define performance de boot/execução e tamanho do bundle.
> Referência: Hono **v4.13.7**.

## Métodos HTTP

Cada verbo é um helper: `app.HTTP_METHOD([path,] handler|middleware...)`. O `path`
é opcional; sem ele, reutiliza o último path encadeado.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('GET /'))
app.post('/', (c) => c.text('POST /'))
app.put('/', (c) => c.text('PUT /'))
app.delete('/', (c) => c.text('DELETE /'))
app.query('/', (c) => c.text('QUERY /'))

// Qualquer método HTTP
app.all('/hello', (c) => c.text('Any Method /hello'))

// Método customizado
app.on('PURGE', '/cache', (c) => c.text('PURGE Method /cache'))

// Múltiplos métodos no mesmo handler
app.on(['PUT', 'DELETE'], '/post', (c) => c.text('PUT or DELETE /post'))

// Múltiplos paths no mesmo handler
app.on('GET', ['/hello', '/ja/hello', '/en/hello'], (c) => c.text('Hello'))
```

Os mesmos helpers existem para `patch`, `options`, `head`, etc. Use `app.all()`
para responder a todos os métodos e `app.on()` para listas/custom.

## Handler encadeado (chaining) e `next()`

Chamar um método sem `path` continua a rota anterior, permitindo encadear
handlers do mesmo endpoint. Handlers recebem `(c, next)`: `next()` (segundo
argumento, historicamente `c.next()`) executa o próximo handler da cadeia e
deve ser `await`-ed.

```ts
import { Hono } from 'hono'

const app = new Hono()

app
  .get('/endpoint', (c) => c.text('GET /endpoint'))
  .post('/endpoint', (c) => c.text('POST /endpoint'))
  .delete('/endpoint', (c) => c.text('DELETE /endpoint'))

// Cadeia de middleware + handler (o handler final retorna um Response)
app.get('/chain', async (c, next) => {
  console.log('antes')
  await next()
  console.log('depois')
}, (c) => c.text('handler'))
```

## Path parameters

Sintaxe `:nome`. Leia um parâmetro com `c.req.param('nome')` ou todos de uma vez
com `c.req.param()` (sem argumento).

```ts
import { Hono } from 'hono'

const app = new Hono()

// Um parâmetro
app.get('/user/:name', async (c) => {
  const name = c.req.param('name')
  return c.text(`User: ${name}`)
})

// Múltiplos parâmetros
app.get('/posts/:id/comment/:comment_id', async (c) => {
  const { id, comment_id } = c.req.param()
  return c.json({ id, comment_id })
})
```

## Params opcionais

`?` após o nome torna o parâmetro opcional. `:type?` casa tanto `/api/animal`
quanto `/api/animal/:type`.

```ts
import { Hono } from 'hono'

const app = new Hono()

// Casa `/api/animal` e `/api/animal/:type`
app.get('/api/animal/:type?', (c) => c.text('Animal!'))
```

## Wildcards

`*` casa um segmento/path coringa. Wildcards nomeados são obtidos combinando um
parâmetro com regex que aceita qualquer caractere.

```ts
import { Hono } from 'hono'

const app = new Hono()

// Wildcard não nomeado
app.get('/wild/*/card', (c) => c.text('GET /wild/*/card'))

// Wildcard nomeado (captura todo o restante, inclusive `/`)
app.get('/files/:path{.*}', (c) => {
  const path = c.req.param('path')
  return c.text(path)
})
```

## Regex em params

Restrinja o valor de um parâmetro com `:nome{regex}`. Em TS, escape `\` dentro da
string do path conforme necessário.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/post/:date{[0-9]+}/:title{[a-z]+}', async (c) => {
  const { date, title } = c.req.param()
  return c.json({ date, title })
})

// Incluir barras no valor capturado (ex.: nome de arquivo .png)
app.get('/posts/:filename{.+\\.png}', async (c) => {
  const filename = c.req.param('filename')
  return c.text(filename)
})
```

## Tipagem de params (`c.req.param`)

Os tipos são inferidos a partir do path literal registrado:

| Chamada | Tipo de retorno |
|---------|-----------------|
| `c.req.param('date')` em `/:date{[0-9]+}` | `string` |
| `c.req.param('type')` em `/:type?` | `string \| undefined` |
| `c.req.param()` (sem arg) | objeto com os params do path |
| `c.req.param('x')` quando o path é `any` (middleware) | `string \| undefined` |

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/post/:date{[0-9]+}/:title{[a-z]+}', (c) => {
  const { date, title } = c.req.param() // { date: string; title: string }
  return c.json({ date, title })
})

app.get('/api/animal/:type?', (c) => {
  const type = c.req.param('type') // string | undefined
  return c.text(type ?? 'animal')
})
```

## `app.on()` — métodos, paths e handlers

Assinatura: `app.on(method|method[], path|path[], handler|middleware...)`.

```ts
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono/types'

const app = new Hono()
declare const authMiddleware: MiddlewareHandler
declare const rateLimitMiddleware: MiddlewareHandler

app.on(['PUT', 'DELETE'], '/post', (c) => c.text('PUT or DELETE /post'))
app.on('GET', ['/hello', '/ja/hello', '/en/hello'], (c) => c.text('Hello'))

// Vários handlers (middleware + handler final)
app.on('GET', '/guarded', authMiddleware, rateLimitMiddleware, (c) => c.text('ok'))
```

## Agrupamento e `app.route()`

`app.route(path, subApp)` monta uma instância de `Hono` (com suas rotas) sob um
prefixo. É a forma de modularizar: cada sub-app tem seu próprio path e o
`route()` copia as rotas registradas para o app pai.

```ts
import { Hono } from 'hono'

const book = new Hono()

book.get('/', (c) => c.text('List Books')) // GET /book
book.get('/:id', (c) => {
  const id = c.req.param('id')
  return c.text('Get Book: ' + id)
}) // GET /book/:id
book.post('/', (c) => c.text('Create Book')) // POST /book

const app = new Hono()
app.route('/book', book)
```

### Agrupar sem mudar a base

Sub-apps podem já trazer o próprio prefixo e ser montados na raiz:

```ts
import { Hono } from 'hono'

const book = new Hono()
book.get('/book', (c) => c.text('List Books')) // GET /book
book.post('/book', (c) => c.text('Create Book')) // POST /book

const user = new Hono().basePath('/user')
user.get('/', (c) => c.text('List Users')) // GET /user
user.post('/', (c) => c.text('Create User')) // POST /user

const app = new Hono()
app.route('/', book) // Handle /book
app.route('/', user) // Handle /user
```

### Ordem do agrupamento

`route()` copia as rotas do segundo argumento para o receptor **no momento da
chamada**. Montar antes de registrar gera 404.

```ts
import { Hono } from 'hono'

const three = new Hono()
three.get('/hi', (c) => c.text('hi'))

const two = new Hono()

const app = new Hono()

// Correto: monta depois de registrar
two.route('/three', three)
app.route('/two', two)
// GET /two/three/hi ---> `hi`

export default app
```

```ts
// Errado: `two` ainda não tem rotas quando é montado em `app`
app.route('/two', two)
two.route('/three', three)
// GET /two/three/hi ---> 404 Not Found
```

## `basePath()`

Define um prefixo na própria instância. As rotas declaradas são relativas a ele.

```ts
import { Hono } from 'hono'

const api = new Hono().basePath('/api')
api.get('/book', (c) => c.text('List Books')) // GET /api/book
```

> Não confundir `app.basePath(path)` (método do `Hono`) com `basePath(c)` do
> Route Helper (ver abaixo), que retorna a base da requisição atual.

## Ordem de registro, prioridade e fallback

Handlers/middleware executam na **ordem de registro**. O primeiro handler que
casa e retorna `Response` encerra o processamento.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/book/a', (c) => c.text('a')) // registrado antes
app.get('/book/:slug', (c) => c.text('common'))

// GET /book/a ---> `a`
// GET /book/b ---> `common`
```

Quando um handler executa, o processo para — logo, um wildcard registrado antes
vence rotas mais específicas registradas depois:

```ts
app.get('*', (c) => c.text('common'))
app.get('/foo', (c) => c.text('foo'))

// GET /foo ---> `common` (o `/foo` não é despachado)
```

- Middleware deve ser escrito **acima** do handler.
- Fallback (`*`) deve ser escrito **abaixo** dos demais handlers.

## Roteamento por hostname

O path pode incluir o hostname. Personalize `getPath` no construtor para decidir
como o path é extraído da `Request`.

```ts
import { Hono } from 'hono'

const app = new Hono({
  getPath: (req) => req.url.replace(/^https?:\/([^?]+).*$/, '$1'),
})

app.get('/www1.example.com/hello', (c) => c.text('hello www1'))
app.get('/www2.example.com/hello', (c) => c.text('hello www2'))
```

### Roteamento pelo header `host`

```ts
import { Hono } from 'hono'

const app = new Hono({
  getPath: (req) =>
    '/' +
    req.headers.get('host') +
    req.url.replace(/^https?:\/\/[^/]+(\/[^?]*).*/, '$1'),
})

app.get('/www1.example.com/hello', (c) => c.text('hello www1'))

// new Request('http://www1.example.com/hello', {
//   headers: { host: 'www1.example.com' },
// })
```

Isso permite, por exemplo, variar o roteamento por `User-Agent`.

## Routers

Hono tem cinco routers. O `router` é escolhido na construção de `Hono` ou via
preset.

| Router | Algoritmo | Suporta todos os patterns | Característica |
|--------|-----------|---------------------------|----------------|
| `RegExpRouter` | transforma o conjunto de rotas em **uma grande regex** (sem `path-to-regexp`) | Não | O mais rápido em execução; registro de rotas um pouco lento |
| `TrieRouter` | Trie-tree | Sim | Ótimo geral, mais rápido que router Express |
| `SmartRouter` | infere e escolhe o melhor router dentre os informados | — | Usado por padrão com `RegExpRouter` + `TrieRouter` |
| `LinearRouter` | abordagem linear, sem compilar strings | Sim | Registro muito rápido — ideal para "one shot" (boot por request) |
| `PatternRouter` | — | Sim | O menor de todos; app inteiro < 15KB |

O default do core é:

```ts
// Inside the core of Hono.
readonly defaultRouter: Router = new SmartRouter({
  routers: [new RegExpRouter(), new TrieRouter()],
})
```

O `SmartRouter` detecta o router mais rápido no boot e continua usando-o. Para
forçar um router específico:

```ts
import { Hono } from 'hono'
import { RegExpRouter } from 'hono/router/reg-exp-router'

const app = new Hono({ router: new RegExpRouter() })
```

Benchmark de registro (quanto menor, melhor):

```console
• GET /user/lookup/username/hey
LinearRouter     1.82 µs/iter
MedleyRouter     4.44 µs/iter
KoaTreeRouter    3.81 µs/iter
TrekRouter       5.84 µs/iter
FindMyWay       60.36 µs/iter

summary for GET /user/lookup/username/hey
  LinearRouter
   2.1x faster than KoaTreeRouter
   2.45x faster than MedleyRouter
   3.21x faster than TrekRouter
   33.24x faster than FindMyWay
```

## Presets

Presets fornecem o mesmo `Hono`, mudando só o `router`.

| Preset | Import | Router configurado |
|--------|--------|--------------------|
| `hono` | `import { Hono } from 'hono'` | `SmartRouter({ routers: [RegExpRouter, TrieRouter] })` |
| `hono/quick` | `import { Hono } from 'hono/quick'` | `SmartRouter({ routers: [LinearRouter, TrieRouter] })` |
| `hono/tiny` | `import { Hono } from 'hono/tiny'` | `PatternRouter` |

```ts
import { Hono } from 'hono'          // padrão
import { Hono } from 'hono/quick'    // boot por request
import { Hono } from 'hono/tiny'     // menor bundle
```

**Qual usar?**

- `hono` — recomendado para a maioria dos casos. Boot um pouco mais lento, mas
  alto desempenho em execução. Ideal para servidores long-lived (Deno, Bun,
  Node.js), Fastly Compute e ambientes v8 isolate (Cloudflare Workers, Deno
  Deploy), nos quais os isolates persistem após o boot.
- `hono/quick` — para ambientes em que a aplicação é inicializada a cada request.
- `hono/tiny` — o menor pacote; ambientes com recursos limitados.

## Route Helper (`hono/route`)

Fornece informações de roteamento em runtime (debug e middleware).

```ts
import { Hono } from 'hono'
import {
  matchedRoutes,
  routePath,
  baseRoutePath,
  basePath,
} from 'hono/route'
```

### Uso básico

```ts
const app = new Hono()

app.get('/posts/:id', (c) => {
  const currentPath = routePath(c) // '/posts/:id'
  const routes = matchedRoutes(c) // Array de rotas que casaram

  return c.json({
    path: currentPath,
    totalRoutes: routes.length,
  })
})
```

### Sub-applications

```ts
const app = new Hono()
const apiApp = new Hono()

apiApp.get('/posts/:id', (c) => {
  return c.json({
    routePath: routePath(c), // '/posts/:id'
    baseRoutePath: baseRoutePath(c), // '/api'
    basePath: basePath(c), // '/api' (com params reais)
  })
})

app.route('/api', apiApp)
```

### `matchedRoutes(c)`

Retorna todas as rotas que casaram com a requisição, **incluindo middleware**.

```ts
app.all('/api/*', (c, next) => {
  console.log('API middleware')
  return next()
})

app.get('/api/users/:id', (c) => {
  const routes = matchedRoutes(c)
  // [
  //   { method: 'ALL', path: '/api/*', handler: [Function] },
  //   { method: 'GET', path: '/api/users/:id', handler: [Function] }
  // ]
  return c.json({ routes: routes.length })
})
```

### `routePath(c, index?)`

Pattern de rota registrado para o handler atual. Aceita índice como
`Array.prototype.at()`.

```ts
app.all('/api/*', (c, next) => {
  return next()
})

app.get('/api/users/:id', (c) => {
  console.log(routePath(c, 0)) // '/api/*' (primeira rota que casou)
  console.log(routePath(c, -1)) // '/api/users/:id' (última)
  return c.text('User details')
})
```

### `baseRoutePath(c, index?)`

Pattern da base da rota atual, como declarado no roteamento.

```ts
const app = new Hono()
const subApp = new Hono()

subApp.get('/posts/:id', (c) => {
  return c.text(baseRoutePath(c)) // '/:sub'
})

app.route('/:sub', subApp)
```

```ts
app.all('/api/*', (c, next) => {
  return next()
})

const subApp = new Hono()
subApp.get('/users/:id', (c) => {
  console.log(baseRoutePath(c, 0)) // '/' (primeira)
  console.log(baseRoutePath(c, -1)) // '/api' (última)
  return c.text('User details')
})

app.route('/api', subApp)
```

### `basePath(c)`

Retorna a base com os parâmetros resolvidos da requisição real.

```ts
const app = new Hono()
const subApp = new Hono()

subApp.get('/posts/:id', (c) => {
  return c.text(basePath(c)) // '/api' para request em '/api/posts/123'
})

app.route('/:sub', subApp)
```

## Dev Helper: `showRoutes()`

Para inspecionar as rotas registradas, use `showRoutes()` de `hono/dev` (o antigo
`app.showRoutes()` é obsoleto). Opções: `verbose` e `colorize`.

```ts
import { Hono } from 'hono'
import { getRouterName, showRoutes, inspectRoutes } from 'hono/dev'

const app = new Hono().basePath('/v1')

app.get('/posts', (c) => c.text('list'))
app.get('/posts/:id', (c) => c.text('one'))
app.post('/posts', (c) => c.text('create'))

showRoutes(app, { verbose: true })
// GET   /v1/posts
// GET   /v1/posts/:id
// POST  /v1/posts

console.log(getRouterName(app)) // nome do router em uso
console.log(inspectRoutes(app)) // [{ path, method, name, isMiddleware }, ...]
```

> `showRoutesDetailed()` não faz parte da API documentada na v4.13.7. Para a saída
> detalhada use `showRoutes(app, { verbose: true })` ou `inspectRoutes(app)`.

## Próximos passos

- [`03-contexto.md`](./03-contexto.md) — `Context`, `c.req`, `c.res`, `c.set/get`
- [`05-middleware.md`](./05-middleware.md) — `app.use()`, ordem e `next()`
- [`04-request-response.md`](./04-request-response.md) — corpo, headers e status
- [`17-cheatsheet.md`](./17-cheatsheet.md) — referência rápida de roteamento
