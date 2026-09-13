# Validação

> Hono traz apenas um `validator` fino (`hono/validator`); a força vem de combiná-lo com bibliotecas como Zod, Valibot, TypeBox ou ArkType, preservando tipos para o RPC.

## Modelo mental

- `validator` é **middleware**: valida, retorna os dados validados (ou uma `Response`) e o handler lê via `c.req.valid(target)`.
- Assinatura do callback: `(value, c) => ...` — `value` é o dado bruto do target, `c` é o `Context`.
- O callback deve **retornar** o valor validado (objeto) no caminho de sucesso, ou uma `Response` no caminho de erro.
- O retorno é armazenado no request; `c.req.valid(target)` recupera com o tipo inferido.
- Um mesmo handler pode encadear **múltiplos** validators, um por parte da request.

### Targets suportados

| Target | Origem | `value` bruto |
|--------|--------|---------------|
| `json` | body JSON | objeto parseado |
| `form` | body de formulário | campos do form |
| `query` | querystring | `Record<string, string \| string[]>` |
| `header` | headers | `Record<string, string>` (chaves **minúsculas**) |
| `param` | path params | `Record<string, string>` |
| `cookie` | cookies | `Record<string, string>` |

## Validador manual

Importe `validator` de `hono/validator`:

```ts
import { Hono } from 'hono'
import { validator } from 'hono/validator'

const app = new Hono()

app.post(
  '/posts',
  validator('form', (value, c) => {
    const body = value['body']
    if (!body || typeof body !== 'string') {
      return c.text('Invalid!', 400)
    }
    return {
      body: body,
    }
  }),
  (c) => {
    const { body } = c.req.valid('form')
    // ... do something
    return c.json(
      {
        message: 'Created!',
      },
      201
    )
  }
)
```

### `content-type` obrigatório para `json`/`form`

Quando você valida `json` ou `form`, a request **precisa** conter o `content-type` correspondente (ex.: `Content-Type: application/json` para `json`). Caso contrário o body não é parseado e o callback recebe `{}` (objeto vazio).

```ts
const app = new Hono()
app.post(
  '/testing',
  validator('json', (value, c) => {
    // pass-through validator
    return value
  }),
  (c) => {
    const body = c.req.valid('json')
    return c.json(body)
  }
)
```

Isso também vale nos testes com `app.request()`, que precisam montar o header:

```ts
// errado: não funciona: data vira {}
const res = await app.request('/testing', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' }),
})
const data = await res.json()
console.log(data) // {}

// correto: funciona: content-type presente
const res2 = await app.request('/testing', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' }),
  headers: new Headers({ 'Content-Type': 'application/json' }),
})
const data2 = await res2.json()
console.log(data2) // { key: 'value' }
```

### Chaves de `header` em minúsculas

Ao validar `header`, use o nome em **lowercase**. Para `Idempotency-Key`, a chave é `idempotency-key`:

```ts
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

// errado: não funciona: idempotencyKey sempre undefined -> 400
app.post(
  '/api',
  validator('header', (value, c) => {
    const idempotencyKey = value['Idempotency-Key']
    if (idempotencyKey == undefined || idempotencyKey === '') {
      throw new HTTPException(400, {
        message: 'Idempotency-Key is required',
      })
    }
    return { idempotencyKey }
  }),
  (c) => {
    const { idempotencyKey } = c.req.valid('header')
    // ...
  }
)

// correto: funciona: chave lowercase
app.post(
  '/api',
  validator('header', (value, c) => {
    const idempotencyKey = value['idempotency-key']
    if (idempotencyKey == undefined || idempotencyKey === '') {
      throw new HTTPException(400, {
        message: 'Idempotency-Key is required',
      })
    }
    return { idempotencyKey }
  }),
  (c) => {
    const { idempotencyKey } = c.req.valid('header')
    // ...
  }
)
```

### Múltiplos validators

Valide partes distintas da request em sequência:

```ts
app.post(
  '/posts/:id',
  validator('param', (value, c) => value),
  validator('query', (value, c) => value),
  validator('json', (value, c) => value),
  (c) => {
    const id = c.req.valid('param')['id']
    const page = c.req.valid('query')['page']
    const body = c.req.valid('json')
    return c.json({ id, page, body })
  }
)
```

### `c.req.addValidatedData`

Internamente, cada validator grava o resultado no request. Em validators/middleware customizados você pode fazer o mesmo manualmente para que `c.req.valid(target)` enxergue o dado:

```ts
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'

const app = new Hono()

const injectUser: MiddlewareHandler = async (c, next) => {
  const user = { id: '1', name: 'Hono' }
  c.req.addValidatedData('json', user)
  await next()
}

app.post('/entry', injectUser, (c) => {
  const user = c.req.valid('json')
  return c.json({ user })
})
```

## Validação com Zod (manual)

Instale Zod e use `safeParse` dentro do `validator`:

| npm | yarn | pnpm | bun |
|-----|------|------|-----|
| `npm i zod` | `yarn add zod` | `pnpm add zod` | `bun add zod` |

```ts
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import * as z from 'zod'

const app = new Hono()

const schema = z.object({
  body: z.string(),
})

const route = app.post(
  '/posts',
  validator('form', (value, c) => {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      return c.text('Invalid!', 401)
    }
    return parsed.data
  }),
  (c) => {
    const { body } = c.req.valid('form')
    // ... do something
    return c.json(
      {
        message: 'Created!',
      },
      201
    )
  }
)
```

## Zod Validator Middleware (`@hono/zod-validator`)

| npm | yarn | pnpm | bun |
|-----|------|------|-----|
| `npm i @hono/zod-validator` | `yarn add @hono/zod-validator` | `pnpm add @hono/zod-validator` | `bun add @hono/zod-validator` |

Importe `zValidator`:

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
      body: z.string(),
    })
  ),
  (c) => {
    const validated = c.req.valid('form')
    // ... use your validated data
    return c.json({ ok: true, validated })
  }
)
```

### Hook de erro customizado

O terceiro argumento de `zValidator` é um hook `(result, c) => ...` chamado quando a validação falha; retorne uma `Response` para encerrar:

```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'

const app = new Hono()

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
})

app.post(
  '/users/new',
  zValidator('json', userSchema, (result, c) => {
    if (!result.success) {
      return c.text('Invalid!', 400)
    }
  }),
  async (c) => {
    const user = c.req.valid('json')
    console.log(user.name) // string
    console.log(user.age) // number
    return c.json({ ok: true })
  }
)
```

## Standard Schema Validator (`@hono/standard-validator`)

[Standard Schema](https://standardschema.dev/) é uma especificação de interface comum para bibliotecas de validação em TypeScript, criada pelos mantenedores de Zod, Valibot e ArkType para permitir integração sem adaptadores dedicados. O `@hono/standard-validator` aceita qualquer lib compatível.

| npm | yarn | pnpm | bun |
|-----|------|------|-----|
| `npm i @hono/standard-validator` | `yarn add @hono/standard-validator` | `pnpm add @hono/standard-validator` | `bun add @hono/standard-validator` |

```ts
import { Hono } from 'hono'
import { sValidator } from '@hono/standard-validator'

const app = new Hono()
```

### Standard Schema + Zod

```ts
import { Hono } from 'hono'
import * as z from 'zod'
import { sValidator } from '@hono/standard-validator'

const app = new Hono()

const schema = z.object({
  name: z.string(),
  age: z.number(),
})

app.post('/author', sValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json({
    success: true,
    message: `${data.name} is ${data.age}`,
  })
})
```

### Standard Schema + Valibot

```ts
import { Hono } from 'hono'
import * as v from 'valibot'
import { sValidator } from '@hono/standard-validator'

const app = new Hono()

const schema = v.object({
  name: v.string(),
  age: v.number(),
})

app.post('/author', sValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json({
    success: true,
    message: `${data.name} is ${data.age}`,
  })
})
```

### Standard Schema + ArkType

```ts
import { Hono } from 'hono'
import { type } from 'arktype'
import { sValidator } from '@hono/standard-validator'

const app = new Hono()

const schema = type({
  name: 'string',
  age: 'number',
})

app.post('/author', sValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json({
    success: true,
    message: `${data.name} is ${data.age}`,
  })
})
```

## Validators dedicados (Valibot, TypeBox e outros)

Além do Standard Schema, existem middlewares dedicados por biblioteca. A doc oficial referencia:

| Biblioteca | Pacote |
|-----------|--------|
| Valibot | [`@hono/valibot-validator`](https://github.com/honojs/middleware/tree/main/packages/valibot-validator) |
| TypeBox | [`@hono/typebox-validator`](https://github.com/honojs/middleware/tree/main/packages/typebox-validator) |
| Zod | [`@hono/zod-validator`](https://github.com/honojs/middleware/blob/main/packages/zod-validator) |
| Typia | [`@hono/typia-validator`](https://github.com/honojs/middleware/tree/main/packages/typia-validator) |

A doc de error handling indica que a mesma abordagem de callback de resultado se aplica a qualquer biblioteca de validação suportada. A leitura continua via `c.req.valid(target)`.

## Zod OpenAPI (`@hono/zod-openapi`)

`Zod OpenAPI Hono` é uma classe Hono estendida que valida valores/tipos com Zod e gera documentação Swagger. O `z` deve ser importado de `@hono/zod-openapi`:

```ts
import { z } from '@hono/zod-openapi'

const ParamsSchema = z.object({
  id: z
    .string()
    .min(3)
    .openapi({
      param: {
        name: 'id',
        in: 'path',
      },
      example: '1212121',
    }),
})

const UserSchema = z
  .object({
    id: z.string().openapi({
      example: '123',
    }),
    name: z.string().openapi({
      example: 'John Doe',
    }),
    age: z.number().openapi({
      example: 42,
    }),
  })
  .openapi('User')
```

Defina a rota com `createRoute`:

```ts
import { createRoute } from '@hono/zod-openapi'

const route = createRoute({
  method: 'get',
  path: '/users/{id}',
  request: {
    params: ParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
      description: 'Retrieve the user',
    },
  },
})
```

Monte o app e exponha a doc em `/doc`:

```ts
import { OpenAPIHono } from '@hono/zod-openapi'

const app = new OpenAPIHono()

app.openapi(route, (c) => {
  const { id } = c.req.valid('param')
  return c.json({
    id,
    age: 20,
    name: 'Ultra-man',
  })
})

// The OpenAPI documentation will be available at /doc
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'My API',
  },
})
```

Entry point para Cloudflare Workers e Bun:

```ts
export default app
```

## Tratamento de erros e tipagem

- **Caminho de erro no callback:** retorne uma `Response` (`c.text(...)`, `c.json(...)`) ou lance `HTTPException` (`hono/http-exception`).
- **Hook de biblioteca:** `zValidator(target, schema, (result, c) => ...)` recebe o `SafeParseReturnType`; `result.success` discrimina o fluxo.
- **Tipagem:** em `zValidator`/`sValidator`, `c.req.valid(target)` já vem tipado pelo schema; com Zod use `z.infer<typeof schema>` para reutilizar o tipo no cliente e no servidor.

## Resumo das bibliotecas

| Lib | Import | Uso |
|-----|--------|-----|
| Manual | `import { validator } from 'hono/validator'` | `validator('form', (value, c) => ...)` |
| Zod | `import { zValidator } from '@hono/zod-validator'` | `zValidator('form', schema, hook?)` |
| Standard Schema | `import { sValidator } from '@hono/standard-validator'` | `sValidator('json', schema)` |
| Valibot | pacote `@hono/valibot-validator` | mesmo padrão do `zValidator` |
| TypeBox | pacote `@hono/typebox-validator` | mesmo padrão do `zValidator` |
| Zod OpenAPI | `import { OpenAPIHono } from '@hono/zod-openapi'` | `app.openapi(route, handler)` + `app.doc()` |

## Próximos passos

- [`09-rpc-client.md`](./09-rpc-client.md) — compartilhar tipos de validação com o cliente via RPC
- [`04-request-response.md`](./04-request-response.md) — `c.req.valid()`, body e leitura da request
- [`05-middleware.md`](./05-middleware.md) — validators como middleware e encadeamento
- [`13-melhores-praticas.md`](./13-melhores-praticas.md) — organização de schemas e RPC
