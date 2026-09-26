# Testes

> `app.request()` monta uma `Request` e devolve a `Response` sem subir servidor. O helper `testClient` de `hono/testing` adiciona tipagem e autocomplete; Vitest no Cloudflare e `Deno.test` cobrem os runtimes.

Testar aplicações Hono é simples: o modo de preparar o ambiente varia por runtime, mas os passos básicos são os mesmos. O `app.request` está em [`12-api-reference.md`](./12-api-reference.md); os tipos de rota que alimentam o cliente tipado vêm de [`09-rpc-client.md`](./09-rpc-client.md); respostas e status em [`04-request-response.md`](./04-request-response.md).

## `app.request()`

`request` é o método útil para testes. Aceita uma URL, um pathname ou uma instância de `Request`, e retorna um objeto `Response`.

```ts
request(
  input: Request | string | URL,
  requestInit?: RequestInit,
  Env?: Env['Bindings'],
  executionCtx?: ExecutionContext
): Response | Promise<Response>
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `input` | `Request \| string \| URL` | Pathname/URL (GET) ou `Request` completa. |
| `requestInit` | `RequestInit` | `method`, `body`, `headers` etc. |
| `Env` | `Env['Bindings']` | Valores de `c.env` (bindings/mock). |
| `executionCtx` | `ExecutionContext` | `c.executionCtx` (ex.: `waitUntil`). |

Considere uma aplicação com a seguinte REST API:

```ts
app.get('/posts', (c) => {
  return c.text('Many posts')
})

app.post('/posts', (c) => {
  return c.json(
    {
      message: 'Created',
    },
    201,
    {
      'X-Custom': 'Thank you',
    }
  )
})
```

### GET

```ts
describe('Example', () => {
  test('GET /posts', async () => {
    const res = await app.request('/posts')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Many posts')
  })
})
```

### POST e leitura de headers

```ts
test('POST /posts', async () => {
  const res = await app.request('/posts', {
    method: 'POST',
  })
  expect(res.status).toBe(201)
  expect(res.headers.get('X-Custom')).toBe('Thank you')
  expect(await res.json()).toEqual({
    message: 'Created',
  })
})
```

### POST com body JSON

```ts
test('POST /posts', async () => {
  const res = await app.request('/posts', {
    method: 'POST',
    body: JSON.stringify({ message: 'hello hono' }),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  })
  expect(res.status).toBe(201)
  expect(res.headers.get('X-Custom')).toBe('Thank you')
  expect(await res.json()).toEqual({
    message: 'Created',
  })
})
```

### POST com `multipart/form-data`

```ts
test('POST /posts', async () => {
  const formData = new FormData()
  formData.append('message', 'hello')
  const res = await app.request('/posts', {
    method: 'POST',
    body: formData,
  })
  expect(res.status).toBe(201)
  expect(res.headers.get('X-Custom')).toBe('Thank you')
  expect(await res.json()).toEqual({
    message: 'Created',
  })
})
```

### Instância de `Request`

Também é possível passar uma instância da classe `Request`:

```ts
test('POST /posts', async () => {
  const req = new Request('http://localhost/posts', {
    method: 'POST',
  })
  const res = await app.request(req)
  expect(res.status).toBe(201)
  expect(res.headers.get('X-Custom')).toBe('Thank you')
  expect(await res.json()).toEqual({
    message: 'Created',
  })
})
```

Assim, o teste se comporta quase como um End-to-End.

### Passar `env`

Para definir `c.env` nos testes, passe o valor como **3º parâmetro** de `app.request`. Útil para mockar bindings do Cloudflare Workers:

```ts
const MOCK_ENV = {
  API_HOST: 'example.com',
  DB: {
    prepare: () => {
      /* mocked D1 */
    },
  },
}

test('GET /posts', async () => {
  const res = await app.request('/posts', {}, MOCK_ENV)
})
```

### Passar `executionCtx`

O **4º parâmetro** é o `ExecutionContext`, acessível no handler via `c.executionCtx`:

```ts
const ctx = {
  waitUntil: (promise: Promise<unknown>) => {
    /* aguarda a promise fora do ciclo da response */
  },
  passThroughOnException: () => {},
} as ExecutionContext

test('GET /posts', async () => {
  const res = await app.request('/posts', {}, MOCK_ENV, ctx)
  expect(res.status).toBe(200)
})
```

## `testClient` (app tipado)

O Testing Helper (`hono/testing`) torna os testes type-safe. `testClient()` recebe uma instância de `Hono` e devolve um objeto tipado conforme as rotas da aplicação, semelhante ao Hono Client.

```ts
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
```

> **Importante:** para o `testClient` inferir os tipos e dar autocomplete, as rotas precisam ser definidas com **métodos encadeados diretamente na instância `Hono`**. Se você cria o `const app = new Hono()` e depois chama `app.get(...)` separadamente, o tipo não flui e os recursos type-safe não funcionam.

`index.ts` — o `.get()` é encadeado direto no `new Hono()`:

```ts
const app = new Hono().get('/search', (c) => {
  const query = c.req.query('q')
  return c.json({ query: query, results: ['result1', 'result2'] })
})

export default app
```

`index.test.ts`:

```ts
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import { describe, it, expect } from 'vitest' // Or your preferred test runner
import app from './app'

describe('Search Endpoint', () => {
  // Create the test client from the app instance
  const client = testClient(app)

  it('should return search results', async () => {
    // Call the endpoint using the typed client
    // Notice the type safety for query parameters (if defined in the route)
    // and the direct access via .$get()
    const res = await client.search.$get({
      query: { q: 'hono' },
    })

    // Assertions
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      query: 'hono',
      results: ['result1', 'result2'],
    })
  })
})
```

Para incluir headers, passe-os como **2º parâmetro** da chamada. Esse parâmetro também aceita a propriedade `init` (um `RequestInit`), permitindo definir headers, method, body etc.:

```ts
// index.test.ts
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import { describe, it, expect } from 'vitest' // Or your preferred test runner
import app from './app'

describe('Search Endpoint', () => {
  // Create the test client from the app instance
  const client = testClient(app)

  it('should return search results', async () => {
    // Include the token in the headers and set the content type
    const token = 'this-is-a-very-clean-token'
    const res = await client.search.$get(
      {
        query: { q: 'hono' },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `application/json`,
        },
      }
    )

    // Assertions
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      query: 'hono',
      results: ['result1', 'result2'],
    })
  })
})
```

## Deno (`Deno.test`)

No Deno, escreva com `Deno.test` e use `assert`/`assertEquals` de `@std/assert`:

```sh
deno add jsr:@std/assert
```

```ts [hello.ts]
import { Hono } from 'hono'
import { assertEquals } from '@std/assert'

Deno.test('Hello World', async () => {
  const app = new Hono()
  app.get('/', (c) => c.text('Please test me'))

  const res = await app.request('http://localhost/')
  assertEquals(res.status, 200)
})
```

Execute:

```sh
deno test hello.ts
```

Você também pode importar o `app` de outro módulo e testá-lo:

```ts
import { assertEquals } from '@std/assert'
import app from './app.ts'

Deno.test('GET / reaches the app', async () => {
  const res = await app.request('/')
  assertEquals(res.status, 200)
})
```

## Vitest no Cloudflare (`@cloudflare/vitest-pool-workers`)

O Cloudflare recomenda `@cloudflare/vitest-pool-workers`. O módulo `cloudflare:test` expõe, em runtime, o `env` passado como segundo argumento durante o teste.

`vitest.config.ts`:

```ts
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersProject(() => {
  return {
    test: {
      globals: true,
      poolOptions: {
        workers: { wrangler: { configPath: './wrangler.toml' } },
      },
    },
  }
})
```

`wrangler.toml`:

```toml
compatibility_date = "2024-09-09"
compatibility_flags = [ "nodejs_compat" ]

[vars]
MY_VAR = "my variable"
```

Aplicação com bindings tipados:

```ts
// src/index.ts
import { Hono } from 'hono'

type Bindings = {
  MY_VAR: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/hello', (c) => {
  return c.json({ hello: 'world', var: c.env.MY_VAR })
})

export default app
```

Teste passando o `env` de `cloudflare:test` ao `app.request()`:

```ts
// src/index.test.ts
import { env } from 'cloudflare:test'
import app from './index'

describe('Example', () => {
  it('Should return 200 response', async () => {
    const res = await app.request('/hello', {}, env)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      hello: 'world',
      var: 'my variable',
    })
  })
})
```

## Outros runtimes

| Runtime | Ferramenta | Observação |
|---------|------------|------------|
| Cloudflare Workers | `@cloudflare/vitest-pool-workers` | Recomendado; `env` via `cloudflare:test`. |
| Node/Bun | Vitest (ou runner preferido) | `app.request()` retorna `Response`; import do `app`. |
| Deno | `Deno.test` + `@std/assert` | `deno add jsr:@std/assert`, `deno test`. |

No Cloudflare Workers, o teste mínimo continua sendo `app.request()`:

```ts
describe('Test the application', () => {
  it('Should return 200 response', async () => {
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
  })
})
```

## Próximos passos

- [`09-rpc-client.md`](./09-rpc-client.md) — tipos de rota e cliente tipado que alimentam `testClient`
- [`04-request-response.md`](./04-request-response.md) — como ler body, headers e status
- [`08-validacao.md`](./08-validacao.md) — testar validators com `app.request()` e headers
- [`10-jsx.md`](./10-jsx.md) — testar rotas que retornam HTML/JSX
