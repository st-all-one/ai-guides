# Melhores práticas e DX

> O Hono é muito flexível — você pode escrever sua app como quiser. Porém, há
> práticas que é melhor seguir. Esta página reúne as regras das fontes oficiais.

## Não crie "Controllers" quando possível

Quando possível, **não** crie controllers no estilo Ruby on Rails.

```ts
// 🙁
// A RoR-like Controller
const booksList = (c: Context) => {
  return c.json('list books')
}

app.get('/books', booksList)
```

O problema é relacionado a **tipos**. Por exemplo, o path parameter não pode ser
inferido no controller sem escrever generics complexos.

```ts
// 🙁
// A RoR-like Controller
const bookPermalink = (c: Context) => {
  const id = c.req.param('id') // Can't infer the path param
  return c.json(`get ${id}`)
}
```

Portanto, você não precisa criar controllers estilo RoR e deve escrever handlers
**diretamente após as definições de path**:

```ts
// 😃
app.get('/books/:id', (c) => {
  const id = c.req.param('id') // Can infer the path param
  return c.json(`get ${id}`)
})
```

### `factory.createHandlers()` em `hono/factory`

Se ainda quiser criar um controller estilo RoR, use `factory.createHandlers()` de
`hono/factory`. Com ele, a inferência de tipo funciona corretamente.

```ts
import { createFactory } from 'hono/factory'
import { logger } from 'hono/logger'

// ...

const factory = createFactory()

const middleware = factory.createMiddleware(async (c, next) => {
  c.set('foo', 'bar')
  await next()
})

const handlers = factory.createHandlers(logger(), middleware, (c) => {
  return c.json(c.var.foo)
})

app.get('/api', ...handlers)
```

## Construindo uma aplicação maior

Use `app.route()` para construir uma aplicação maior sem criar controllers estilo
RoR. Se sua aplicação tem endpoints `/authors` e `/books` e você quer separar
arquivos de `index.ts`, crie `authors.ts` e `books.ts`.

```ts
// authors.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json('list authors'))
app.post('/', (c) => c.json('create an author', 201))
app.get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
```

```ts
// books.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json('list books'))
app.post('/', (c) => c.json('create a book', 201))
app.get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
```

Depois, importe-os e monte nos paths `/authors` e `/books` com `app.route()`:

```ts
// index.ts
import { Hono } from 'hono'
import authors from './authors'
import books from './books'

const app = new Hono()

app.route('/authors', authors)
app.route('/books', books)

export default app
```

### Se quiser usar recursos de RPC

O código acima funciona bem para casos de uso normais. Porém, se quiser usar o
recurso de `RPC`, você obtém o tipo correto **encadeando** as chamadas:

```ts
// authors.ts
import { Hono } from 'hono'

const app = new Hono()
  .get('/', (c) => c.json('list authors'))
  .post('/', (c) => c.json('create an author', 201))
  .get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
export type AppType = typeof app
```

Se você passar o tipo do `app` para `hc`, ele obterá o tipo correto:

```ts
import type { AppType } from './authors'
import { hc } from 'hono/client'

const client = hc<AppType>('http://localhost') // Typed correctly
```

## HEAD requests

### Entendendo o tratamento de HEAD no Hono

O Hono trata automaticamente requisições HEAD convertendo-as em requisições GET e
removendo o body da resposta. Esse comportamento está na camada de dispatch do
framework e acontece **antes** do route matching.

### Faça: use rotas GET para HEAD

```ts
// GOOD: This GET route automatically handles HEAD requests
app.get('/api/users', async (c) => {
  const users = await getUsers()
  c.header('X-Total-Count', users.length.toString())
  return c.json(users)
})

// HEAD /api/users will return:
// - Same headers as GET (including X-Total-Count)
// - Status 200
// - No body (null)
```

### Faça: use middleware para lógica específica de HEAD

```ts
// GOOD: Use middleware when HEAD needs different behavior
app.use('/api/resource', async (c, next) => {
  await next()

  // Add HEAD-specific headers after the handler
  if (c.req.method === 'HEAD') {
    c.header('X-HEAD-Processed', 'true')
    // Don't compute expensive body content for HEAD
    c.res = new Response(null, c.res)
  }
})
```

### Não faça: handlers dedicados a HEAD

```ts
// BAD: This won't work as expected
app.head('/api/users', (c) => {
  // This handler will NEVER be called
  c.header('X-Custom', 'value')
  return c.text('ignored')
})

// BAD: Using on() also won't work
app.on('HEAD', '/api/users', (c) => {
  // Still converted to GET before route matching
})
```

### Considerações de performance

- **Evite operações caras em handlers GET se você espera muitos requests HEAD**:
  use middleware para detectar HEAD e pular a geração de body.
- **Headers de cache funcionam identicamente**: respostas HEAD respeitam as mesmas
  regras de cache que GET.
- **Compatibilidade de middleware**: a maioria dos middleware funciona com HEAD,
  mas middleware que processa body (como compressão) pula automaticamente requests
  HEAD.

### Testando requests HEAD

```ts
// Always test both GET and HEAD responses
it('handles HEAD requests correctly', async () => {
  const getRes = await app.request('/api/users')
  const headRes = await app.request('/api/users', { method: 'HEAD' })

  expect(headRes.status).toBe(getRes.status)
  expect(headRes.headers.get('X-Total-Count')).toBe(
    getRes.headers.get('X-Total-Count')
  )
  expect(headRes.body).toBe(null)
})
```

### Notas

- A conversão automática de HEAD garante headers consistentes entre GET e HEAD.
- Esse comportamento é consistente em todos os runtimes do Hono (Cloudflare Workers,
  Deno, Bun, Node.js).
- Se você precisa de lógica completamente diferente entre HEAD e GET, considere usar
  endpoints distintos em vez de tentar sobrescrever o tratamento de HEAD do
  framework.

## DX: Context e tipos literais

### Developer Experience

Para criar uma ótima aplicação, precisamos de ótima experiência de
desenvolvimento. Felizmente, é possível escrever aplicações para Cloudflare
Workers, Deno e Bun em TypeScript sem transpilar para JavaScript. O Hono é escrito
em TypeScript e torna as aplicações **type-safe**.

### Context

O objeto **Context** é a ponte tipada entre request e handler. Combinado com
generics de `Env` (`Bindings`/`Variables`), ele permite tipar `c.env`, `c.set` e
`c.get` (ver `03-contexto.md` e `12-api-reference.md`).

### Tipos literais

Escrever handlers **inline**, logo após o path, preserva os tipos literais dos
parâmetros de rota — diferente de controllers separados. É o mesmo princípio da
regra "não crie Controllers": `app.get('/books/:id', (c) => { c.req.param('id') })`
infere `id`, enquanto um controller genérico não.

### RPC

Para propagar os tipos da aplicação até um client tipado, exporte `AppType` e use
`hc<AppType>()`:

```ts
import type { AppType } from './authors'
import { hc } from 'hono/client'

const client = hc<AppType>('http://localhost') // Typed correctly
```

Para mais detalhes, veja `09-rpc-client.md` e a página de RPC da documentação.

## Próximos passos

- [`09-rpc-client.md`](./09-rpc-client.md) — RPC e `hc<AppType>`
- [`05-middleware.md`](./05-middleware.md) — middleware e cross-cutting concerns
- [`11-testing.md`](./11-testing.md) — `app.request` em testes
- [`12-api-reference.md`](./12-api-reference.md) — referência completa da API
