# RPC tipado e Hono Client

> `hc` lê o tipo da aplicação no servidor e gera um cliente HTTP type-safe: os mesmos schemas de validação definem entrada e saída, sem duplicar contratos no frontend.

## Conceito

O recurso de RPC compartilha a especificação da API entre servidor e cliente através de tipos.

- Exporte o `typeof` do app Hono (comumente `AppType`) — ou apenas as rotas que devem ficar disponíveis ao cliente.
- Ao aceitar `AppType` como parâmetro genérico, o Hono Client infere tanto os *input types* dos Validators quanto os *output types* dos handlers que retornam `c.json()`.

> [!NOTE]
> Para os tipos de RPC funcionarem corretamente em um monorepo, defina `"strict": true` em `compilerOptions` nos `tsconfig.json` do cliente **e** do servidor.

## Server

No servidor, escreva um validator e crie a variável `route`. O exemplo usa o Zod Validator:

```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'

const app = new Hono()

const route = app.post(
  '/posts',
  zValidator(
    'form',
    z.object({
      title: z.string(),
      body: z.string(),
    })
  ),
  (c) => {
    // ...
    return c.json(
      {
        ok: true,
        message: 'Created!',
      },
      201
    )
  }
)

export type AppType = typeof route
```

> O [Standard Schema Validator](https://github.com/honojs/middleware/tree/main/packages/standard-validator) também funciona, então é possível usar qualquer biblioteca compatível (ex.: Valibot).

## Client com `hc`

No cliente, importe `hc` e `AppType`:

```ts
import type { AppType } from '.'
import { hc } from 'hono/client'

const client = hc<AppType>('http://localhost:8787/')
```

Chame `client.{path}.{method}` passando os dados como argumento:

```ts
const res = await client.posts.$post({
  form: {
    title: 'Hello',
    body: 'Hono is a cool project',
  },
})
```

O `res` é compatível com o `Response` do fetch. Recupere os dados com `res.json()`:

```ts
if (res.ok) {
  const data = await res.json()
  console.log(data.message)
}
```

### `ClientResponse`

O retorno de uma chamada `hc` é um `ClientResponse` — uma resposta compatível com `fetch` cujo `json()` tem o tipo inferido do handler. O tipo concreto de cada rota pode ser extraído com `InferResponseType` (ver seção **Infer**).

### Cookies

Para o cliente enviar cookies em toda request, adicione `init.credentials: 'include'` na criação do client:

```ts
// client.ts
const client = hc<AppType>('http://localhost:8787/', {
  init: {
    credentials: 'include',
  },
})

// This request will now include any cookies you might have set
const res = await client.posts.$get({
  query: {
    id: '123',
  },
})
```

## Status code

Se você especificar explicitamente o status code (ex.: `200` ou `404`) em `c.json()`, ele entra como tipo disponível ao cliente:

```ts
// server.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'

type Post = { title: string; body: string }
declare function getPost(id: string): Promise<Post | undefined>

const app = new Hono().get(
  '/posts',
  zValidator(
    'query',
    z.object({
      id: z.string(),
    })
  ),
  async (c) => {
    const { id } = c.req.valid('query')
    const post: Post | undefined = await getPost(id)

    if (post === undefined) {
      return c.json({ error: 'not found' }, 404) // Specify 404
    }

    return c.json({ post }, 200) // Specify 200
  }
)

export type AppType = typeof app
```

O cliente acessa o dado por status code e por tipo inferido:

```ts
// client.ts
import type { AppType } from './server'
import { hc } from 'hono/client'
import type { InferResponseType } from 'hono/client'

const client = hc<AppType>('http://localhost:8787/')

const res = await client.posts.$get({
  query: {
    id: '123',
  },
})

if (res.status === 404) {
  const data: { error: string } = await res.json()
  console.log(data.error)
}

if (res.ok) {
  const data: { post: Post } = await res.json()
  console.log(data.post)
}

// { post: Post } | { error: string }
type ResponseType = InferResponseType<typeof client.posts.$get>

// { post: Post }
type ResponseType200 = InferResponseType<
  typeof client.posts.$get,
  200
>
```

## Global Response (`ApplyGlobalResponse`)

O cliente de RPC **não** infere automaticamente respostas de error handlers globais como `app.onError()` ou middleware global. Use `ApplyGlobalResponse` para mesclar os tipos de erro globais em todas as rotas:

```ts
import { Hono } from 'hono'
import { hc } from 'hono/client'
import type { ApplyGlobalResponse, InferResponseType } from 'hono/client'

const app = new Hono()
  .get('/api/users', (c) => c.json({ users: ['alice', 'bob'] }, 200))
  .onError((err, c) => c.json({ error: err.message }, 500))

type AppWithErrors = ApplyGlobalResponse<
  typeof app,
  {
    500: { json: { error: string } }
  }
>

const client = hc<AppWithErrors>('http://localhost')

const res = await client.api.users.$get()

if (res.ok) {
  const data = await res.json() // { users: string[] }
}

// InferResponseType includes the global error type
type ResType = InferResponseType<typeof client.api.users.$get>
// { users: string[] } | { error: string }
```

Vários status de erro globais de uma vez:

```ts
type AppWithErrors = ApplyGlobalResponse<
  typeof app,
  {
    401: { json: { error: string; message: string } }
    500: { json: { error: string; message: string } }
  }
>
```

## Not Found

Se você vai usar o client, **não** use `c.notFound()` para o Not Found — o dado retornado não é inferido corretamente:

```ts
// server.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'

export const routes = new Hono().get(
  '/posts',
  zValidator(
    'query',
    z.object({
      id: z.string(),
    })
  ),
  async (c) => {
    const { id } = c.req.valid('query')
    const post: Post | undefined = await getPost(id)

    if (post === undefined) {
      return c.notFound() // errado
    }

    return c.json({ post })
  }
)

// client.ts
import { hc } from 'hono/client'

const client = hc<typeof routes>('/')

const res = await client.posts[':id'].$get({
  param: {
    id: '123',
  },
})

const data = await res.json() // data is unknown
```

Use `c.json()` com status code explícito:

```ts
export const routes = new Hono().get(
  '/posts',
  zValidator(
    'query',
    z.object({
      id: z.string(),
    })
  ),
  async (c) => {
    const { id } = c.req.valid('query')
    const post = await getPost(id)

    if (!post) {
      return c.json({ error: 'not found' }, 404) // Specify 404
    }

    return c.json({ post }, 200) // Specify 200
  }
)
```

Alternativamente, faça *module augmentation* da interface `NotFoundResponse` para que `c.notFound()` retorne um tipo conhecido:

```ts
// server.ts
import { Hono, TypedResponse } from 'hono'

declare module 'hono' {
  interface NotFoundResponse
    extends Response,
      TypedResponse<{ error: string }, 404, 'json'> {}
}

const app = new Hono()
  .get('/posts/:id', async (c) => {
    const post = await getPost(c.req.param('id'))
    if (!post) {
      return c.notFound()
    }
    return c.json({ post }, 200)
  })
  .notFound((c) => c.json({ error: 'not found' }, 404))

export type AppType = typeof app
```

## Path parameters

Path params e query values devem ser passados como `string`, mesmo que o valor real seja de outro tipo. Use `param` para o caminho e `query` para a querystring; o validator converte (ex.: `z.coerce.number()`):

```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'

const app = new Hono()

const route = app.get(
  '/posts/:id',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().optional(), // coerce to convert to number
    })
  ),
  (c) => {
    // ...
    return c.json({
      title: 'Night',
      body: 'Time to sleep',
    })
  }
)
```

```ts
const res = await client.posts[':id'].$get({
  param: {
    id: '123',
  },
  query: {
    page: '1', // `string`, converted by the validator to `number`
  },
})
```

### Múltiplos parâmetros

```ts
const route = app.get(
  '/posts/:postId/:authorId',
  zValidator(
    'query',
    z.object({
      page: z.string().optional(),
    })
  ),
  (c) => {
    // ...
    return c.json({
      title: 'Night',
      body: 'Time to sleep',
    })
  }
)
```

No cliente, adicione múltiplos `['']` para cada param do path:

```ts
const res = await client.posts[':postId'][':authorId'].$get({
  param: {
    postId: '123',
    authorId: '456',
  },
  query: {},
})
```

### Incluir slashes

`hc` **não** faz URL-encode dos valores de `param`. Para incluir slashes, use regexp no path:

```ts
// client.ts

// Requests /posts/123/456
const res = await client.posts[':id'].$get({
  param: {
    id: '123/456',
  },
})
```

```ts
// server.ts
const route = app.get(
  '/posts/:id{.+}',
  zValidator(
    'param',
    z.object({
      id: z.string(),
    })
  ),
  (c) => {
    // id: 123/456
    const { id } = c.req.valid('param')
    // ...
  }
)
```

> Path params sem regexp não correspondem a slashes. Se passar um `param` com slashes via `hc`, a rota pode não funcionar como esperado. O recomendado é codificar com `encodeURIComponent`.

## Headers

Headers por request:

```ts
const res = await client.search.$get(
  {
    //...
  },
  {
    headers: {
      'X-Custom-Header': 'Here is Hono Client',
      'X-User-Agent': 'hc',
    },
  }
)
```

Header comum a todas as requests, passado ao `hc`:

```ts
const client = hc<AppType>('/api', {
  headers: {
    Authorization: 'Bearer TOKEN',
  },
})
```

## Opção `init`

Passe um `RequestInit` do fetch como `init` — útil para abortar requests:

```ts
import { hc } from 'hono/client'

const client = hc<AppType>('http://localhost:8787/')

const abortController = new AbortController()
const res = await client.api.posts.$post(
  {
    json: {
      // Request body
    },
  },
  {
    // RequestInit object
    init: {
      signal: abortController.signal,
    },
  }
)

// ...

abortController.abort()
```

> Um `RequestInit` definido por `init` tem a **maior prioridade**; ele pode sobrescrever coisas definidas por outras opções como `body | method | headers`.

## `$url()`

`$url()` devolve um objeto `URL` para o endpoint. Exige uma URL **absoluta**:

```ts
import { Hono } from 'hono'
import { hc } from 'hono/client'

const app = new Hono()
const route = app
  .get('/api/posts', (c) => c.json({ posts: [] }))
  .get('/api/posts/:id', (c) => c.json({ post: null }))

const client = hc<typeof route>('http://localhost:8787/')

let url = client.api.posts.$url()
console.log(url.pathname) // `/api/posts`

url = client.api.posts[':id'].$url({
  param: {
    id: '123',
  },
})
console.log(url.pathname) // `/api/posts/123`
```

```ts
// errado: lança Uncaught TypeError: Failed to construct 'URL': Invalid URL
const badClient = hc<AppType>('/')
badClient.api.post.$url()

// correto: funciona
const goodClient = hc<AppType>('http://localhost:8787/')
goodClient.api.post.$url()
```

### Typed URL

Passe a base URL como segundo parâmetro de tipo de `hc` para obter tipos de URL precisos (protocol, host e path) — útil como chave type-safe para libs como SWR:

```ts
const client = hc<typeof route, 'http://localhost:8787'>(
  'http://localhost:8787/'
)

const url = client.api.posts.$url()
// url is TypedURL with precise type information
// including protocol, host, and path
```

## `$path()`

`$path()` é similar a `$url()`, mas retorna uma **string** de path (sem a origin), funcionando independentemente da base URL passada ao `hc`:

```ts
import { Hono } from 'hono'
import { hc } from 'hono/client'

const app = new Hono()
const route = app
  .get('/api/posts', (c) => c.json({ posts: [] }))
  .get('/api/posts/:id', (c) => c.json({ post: null }))

const client = hc<typeof route>('http://localhost:8787/')

let path = client.api.posts.$path()
console.log(path) // `/api/posts`

path = client.api.posts[':id'].$path({
  param: {
    id: '123',
  },
})
console.log(path) // `/api/posts/123`
```

Também aceita query:

```ts
const path = client.api.posts.$path({
  query: {
    page: '1',
    limit: '10',
  },
})
console.log(path) // `/api/posts?page=1&limit=10`
```

## File Uploads

Upload via form body:

```ts
// client
const res = await client.user.picture.$put({
  form: {
    file: new File([fileToUpload], filename, {
      type: fileToUpload.type,
    }),
  },
})
```

```ts
// server
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'

const app = new Hono()

const route = app.put(
  '/user/picture',
  zValidator(
    'form',
    z.object({
      file: z.instanceof(File),
    })
  )
  // ...
)
```

## Custom `fetch` method

É possível definir o método `fetch` customizado. No exemplo, usa-se o `fetch` do Service Binding do Cloudflare Worker em vez do padrão:

```toml
# wrangler.toml
services = [
  { binding = "AUTH", service = "auth-service" },
]
```

```ts
// src/client.ts
const client = hc<CreateProfileType>('http://localhost', {
  fetch: c.env.AUTH.fetch.bind(c.env.AUTH),
})
```

## Custom query serializer (`buildSearchParams`)

Personalize a serialização de query params — útil para bracket notation de arrays:

```ts
const client = hc<AppType>('http://localhost', {
  buildSearchParams: (query) => {
    const searchParams = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) {
        continue
      }
      if (Array.isArray(v)) {
        v.forEach((item) => searchParams.append(`${k}[]`, item))
      } else {
        searchParams.set(k, v)
      }
    }
    return searchParams
  },
})
```

## Infer (`InferRequestType` / `InferResponseType`)

Use os helpers para saber o tipo do objeto enviado e o tipo do objeto retornado:

```ts
import { hc } from 'hono/client'
import type { InferRequestType, InferResponseType } from 'hono/client'

const client = hc<AppType>('http://localhost:8787/')

// InferRequestType
const $post = client.todo.$post
type ReqType = InferRequestType<typeof $post>['form']

// InferResponseType
type ResType = InferResponseType<typeof $post>
```

## Parsing a Response com type-safety (`parseResponse`)

`parseResponse()` lê o body conforme o `Content-Type` e **lança automaticamente** se a response não for `ok`:

```ts
import { hc } from 'hono/client'
import { parseResponse, DetailedError } from 'hono/client'

const client = hc<AppType>('http://localhost:8787/')

const result = await parseResponse(client.hello.$get()).catch(
  (e: DetailedError) => {
    console.error(e)
  }
)
// parseResponse automatically throws an error if response is not ok
```

## Hono Stacks (Zod + RPC + `hc`)

O conjunto abaixo é chamado de **Hono Stack**:

- **Hono** — API Server
- **Zod** — Validator
- **Zod Validator Middleware** — integração
- **`hc`** — HTTP Client

### API + validação

```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'

const app = new Hono()

const route = app.get(
  '/hello',
  zValidator(
    'query',
    z.object({
      name: z.string(),
    })
  ),
  (c) => {
    const { name } = c.req.valid('query')
    return c.json({
      message: `Hello! ${name}`,
    })
  }
)

export type AppType = typeof route
```

### Client

```ts
import type { AppType } from './server'
import { hc } from 'hono/client'

const client = hc<AppType>('/api')
const res = await client.hello.$get({
  query: {
    name: 'Hono',
  },
})

const data = await res.json()
console.log(`${data.message}`)
```

### Stacks com React

Servidor (Cloudflare Workers):

```ts
// src/index.ts
import { Hono } from 'hono'
import * as z from 'zod'
import { zValidator } from '@hono/zod-validator'

const schema = z.object({
  id: z.string(),
  title: z.string(),
})

type Todo = z.infer<typeof schema>

const todos: Todo[] = []

const api = new Hono()
  .post('/todo', zValidator('form', schema), (c) => {
    const todo = c.req.valid('form')
    todos.push(todo)
    return c.json({
      message: 'created!',
    })
  })
  .get('/todo', (c) => {
    return c.json({
      todos,
    })
  })

export type AppType = typeof api

const app = new Hono()
app.route('/api', api)

export default app
```

Cliente com React Query:

```tsx
// src/App.tsx
import {
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import type { AppType } from '../functions/api/[[route]]'
import { hc } from 'hono/client'
import type { InferResponseType, InferRequestType } from 'hono/client'

const queryClient = new QueryClient()
const client = hc<AppType>('/api')

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Todos />
    </QueryClientProvider>
  )
}

const Todos = () => {
  const query = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const res = await client.todo.$get()
      return await res.json()
    },
  })

  const $post = client.todo.$post

  const mutation = useMutation<
    InferResponseType<typeof $post>,
    Error,
    InferRequestType<typeof $post>['form']
  >({
    mutationFn: async (todo) => {
      const res = await $post({
        form: todo,
      })
      return await res.json()
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
    onError: (error) => {
      console.log(error)
    },
  })

  return (
    <div>
      <button
        onClick={() => {
          mutation.mutate({
            id: Date.now().toString(),
            title: 'Write code',
          })
        }}
      >
        Add Todo
      </button>

      <ul>
        {query.data?.todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

## Hooks de dados: SWR

```tsx
import useSWR from 'swr'
import { hc } from 'hono/client'
import type { InferRequestType } from 'hono/client'
import type { AppType } from '../functions/api/[[route]]'

const App = () => {
  const client = hc<AppType>('/api')
  const $get = client.hello.$get

  const fetcher =
    (arg: InferRequestType<typeof $get>) => async () => {
      const res = await $get(arg)
      return await res.json()
    }

  const { data, error, isLoading } = useSWR(
    'api-hello',
    fetcher({
      query: {
        name: 'SWR',
      },
    })
  )

  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>

  return <h1>{data?.message}</h1>
}

export default App
```

## Aplicações maiores: agrupar rotas para RPC

Para inferência correta com vários `app`s, use `app.route()` passando o **retorno** de `app.get()`/`app.post()` no segundo argumento e encadeie tudo:

```ts
import { Hono } from 'hono'
import { hc } from 'hono/client'

const authorsApp = new Hono()
  .get('/', (c) => c.json({ result: 'list authors' }))
  .post('/', (c) => c.json({ result: 'create an author' }, 201))
  .get('/:id', (c) => c.json({ result: `get ${c.req.param('id')}` }))

const booksApp = new Hono()
  .get('/', (c) => c.json({ result: 'list books' }))
  .post('/', (c) => c.json({ result: 'create a book' }, 201))
  .get('/:id', (c) => c.json({ result: `get ${c.req.param('id')}` }))

const app = new Hono()
  .route('/authors', authorsApp)
  .route('/books', booksApp)

type AppType = typeof app
```

Importe os sub-routers e encadeie os handlers; como o topo agora é `app`, esse é o tipo exportado:

```ts
// index.ts
import { Hono } from 'hono'
import authors from './authors'
import books from './books'

const app = new Hono()

const routes = app.route('/authors', authors).route('/books', books)

export default app
export type AppType = typeof routes
```

> Para o RPC inferir rotas corretamente, todos os métodos incluídos devem estar encadeados e o tipo do endpoint/app deve ser inferido de uma variável declarada.

## Runtimes (Bun, Deno, Workers)

`hc` é apenas um wrapper sobre a Web Fetch API, então funciona em qualquer runtime com `fetch` (Node 18+, Bun, Deno, Cloudflare Workers). Do lado servidor, exponha o app Hono como entry point padrão:

```ts
// Bun e Cloudflare Workers usam o default export
export default app
```

```ts
// Deno (ex.: serve via Deno.serve) importa o app do módulo
import app from './server.ts'

Deno.serve(app.fetch)
```

O `AppType` continua sendo importado como tipo no cliente:

```ts
// client.ts (Deno/Bun)
import type { AppType } from './server'
import { hc } from 'hono/client'

const client = hc<AppType>('http://localhost:8787/')
```

## Known issues

### IDE performance

Quanto mais rotas, mais lento o IDE fica: a inferência de tipos gera enormes instanciações. Para uma rota:

```ts
export const app = new Hono().get('foo/:id', (c) =>
  c.json({ ok: true }, 200)
)
```

Hono infere implicitamente:

```ts
export const app = Hono<BlankEnv, BlankSchema, '/'>().get<
  'foo/:id',
  'foo/:id',
  JSONRespondReturn<{ ok: boolean }, 200>,
  BlankInput,
  BlankEnv
>('foo/:id', (c) => c.json({ ok: true }, 200))
```

O `tsserver` executa essa tarefa custosa a cada uso. Mitigações:

#### Hono version mismatch

Se backend e frontend vivem em diretórios separados, garanta que as versões do Hono sejam iguais. Versões diferentes causam erros como *“Type instantiation is excessively deep and possibly infinite”*.

#### TypeScript project references

Para acessar código do backend (`AppType`, por exemplo) no frontend separado, use [project references](https://www.typescriptlang.org/docs/handbook/project-references.html).

#### Compile your code before using it (recomendado)

Deixe o `tsc` calcular a instanciação em compile time, assim o `tsserver` não repete o trabalho:

```ts
import { app } from './app'
import { hc } from 'hono/client'

// this is a trick to calculate the type when compiling
const client = hc<typeof app>('')
export type Client = typeof client

export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<typeof app>(...args)
```

Use `hcWithType` no lugar de `hc`:

```ts
const client = hcWithType('http://localhost:8787/')
const res = await client.posts.$post({
  form: {
    title: 'Hello',
    body: 'Hono is a cool project',
  },
})
```

Em monorepo, ferramentas como `turborepo`, `concurrently` ou `npm-run-all` ajudam a coordenar o build.

#### Specify type arguments manually

Evite a instanciação especificando o argumento de tipo do path:

```ts
const app = new Hono().get<'foo/:id'>('foo/:id', (c) =>
  c.json({ ok: true }, 200)
)
```

#### Split your app and client into multiple files

Crie um client por app, para o `tsserver` não instanciar todas as rotas de uma vez:

```ts
// authors-cli.ts
import { app as authorsApp } from './authors'
import { hc } from 'hono/client'

const authorsClient = hc<typeof authorsApp>('/authors')

// books-cli.ts
import { app as booksApp } from './books'
import { hc } from 'hono/client'

const booksClient = hc<typeof booksApp>('/books')
```

### Handlers que retornam promise chain

Um handler que retorna uma cadeia `.then()` diretamente perde o tipo de resposta; o cliente infere `unknown`:

```ts
const app = new Hono().get('/', (c) =>
  Promise.resolve({ hello: 'world' }).then((d) => c.json(d))
)

const client = hc<typeof app>('')
const res = await client.index.$get()
const data = await res.json() // unknown
```

Use `async`/`await`:

```ts
const app = new Hono().get('/', async (c) => {
  const d = await Promise.resolve({ hello: 'world' })
  return c.json(d)
})

const client = hc<typeof app>('')
const res = await client.index.$get()
const data = await res.json() // { hello: string }
```

Se não puder evitar a cadeia, anote o `then()`:

```ts
import type { TypedResponse } from 'hono/types'

const app = new Hono().get('/', (c) =>
  Promise.resolve({ hello: 'world' }).then<
    TypedResponse<{ hello: string }, 200, 'json'>
  >((d) => c.json(d, 200))
)
```

## Próximos passos

- [`08-validacao.md`](./08-validacao.md) — schemas que alimentam os tipos do RPC
- [`13-melhores-praticas.md`](./13-melhores-praticas.md) — organização de apps e RPC em monorepos
- [`04-request-response.md`](./04-request-response.md) — handlers, `c.json()` e status codes
- [`11-testing.md`](./11-testing.md) — testar rotas e clients
