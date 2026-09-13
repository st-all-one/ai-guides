# Objeto Context

> O `Context` (`c`) é instanciado por request e mantido até a resposta ser retornada; nele você lê `HonoRequest`/`Response`, define headers, status, variáveis e renderização.

## Ciclo de vida

O `Context` existe do início do dispatch até o retorno da resposta — um objeto por requisição.
Ele dá acesso a:

| Membro | Tipo | Papel |
|--------|------|-------|
| `c.req` | `HonoRequest` | Wrapper do `Request` Web Standard |
| `c.res` | `Response` | Resposta que será retornada |
| `c.event` | `FetchEvent` | Evento Cloudflare Workers (Service Worker, não recomendado) |
| `c.env` | `Bindings` | Bindings do runtime (KV, D1, R2, secrets) |
| `c.executionCtx` | `ExecutionContext` | `waitUntil`/`passThroughOnException` (Cloudflare) |
| `c.error` | `Error \| undefined` | Erro lançado por um handler |
| `c.var` | `Variables` | Acesso tipado às variáveis da requisição |

`c.set()`/`c.get()` guardam valores **apenas durante a mesma request**; não há compartilhamento nem persistência entre requests.

## c.req

`req` é uma instância de `HonoRequest`. Detalhes em [`04-request-response.md`](./04-request-response.md).

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/hello', (c) => {
  const userAgent = c.req.header('User-Agent')
  return c.text(`Hello, ${userAgent}`)
})
```

## c.res

`c.res` é o objeto `Response` que será devolvido. É útil em middleware para inspecionar ou mutar headers depois de `await next()`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.use('/', async (c, next) => {
  await next()
  c.res.headers.append('X-Debug', 'Debug message')
})
```

## c.event

Acesso ao `FetchEvent` específico de Cloudflare Workers. Era usado na sintaxe "Service Worker"; atualmente **não é recomendado**. Só é definido nesse modo.

```ts
import { Hono } from 'hono'

type KVNamespace = any
type Bindings = { MY_KV: KVNamespace }

const app = new Hono<{ Bindings: Bindings }>()
declare const key: string
declare const data: string

app.get('/foo', async (c) => {
  c.event.waitUntil(c.env.MY_KV.put(key, data))
})
```

## Métodos de resposta

Todos constroem o `Response` Web Standard que o Hono retorna.

| Método | Descrição |
|--------|-----------|
| `c.text(body, status?, headers?)` | Corpo como `Content-Type: text/plain` |
| `c.json(object, status?, headers?)` | Corpo como `Content-Type: application/json` |
| `c.html(html, status?, headers?)` | Corpo como `Content-Type: text/html` |
| `c.body(body, status?, headers?)` | Corpo bruto; você define o `Content-Type` |
| `c.redirect(location, status?)` | Redirect, padrão `302` |
| `c.notFound()` | Resposta `Not Found` (customizável via `app.notFound()`) |

### c.text()

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/say', (c) => {
  return c.text('Hello!')
})
```

### c.json()

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/api', (c) => {
  return c.json({ message: 'Hello!' })
})
```

### c.html()

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.html('<h1>Hello! Hono!</h1>')
})
```

### c.body()

Retorna uma resposta HTTP. Para texto/HTML prefira `c.text()` ou `c.html()` — com `c.body()` o `Content-Type` é responsabilidade sua.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/welcome', (c) => {
  c.header('Content-Type', 'text/plain')
  return c.body('Thank you for coming')
})
```

`c.body()` aceita status e headers e produz o mesmo `Response` abaixo:

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/welcome', (c) => {
  return c.body('Thank you for coming', 201, {
    'X-Message': 'Hello!',
    'Content-Type': 'text/plain',
  })
})
```

Equivalente Web Standard:

```ts
new Response('Thank you for coming', {
  status: 201,
  headers: {
    'X-Message': 'Hello!',
    'Content-Type': 'text/plain',
  },
})
```

### c.redirect()

Status padrão `302`; passe `301` para permanente.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/redirect', (c) => {
  return c.redirect('/')
})

app.get('/redirect-permanently', (c) => {
  return c.redirect('/', 301)
})
```

### c.notFound()

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/notfound', (c) => {
  return c.notFound()
})
```

## c.status()

Define o código HTTP. O padrão é `200`, então `c.status()` só é necessário quando o código difere.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.post('/posts', (c) => {
  c.status(201)
  return c.text('Your post is created!')
})
```

## c.header()

Define headers da resposta.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  c.header('X-Message', 'My custom message')
  return c.text('Hello!')
})
```

## c.set() / c.get()

Pares chave-valor arbitrários com escopo da request atual. Servem para passar valores entre middlewares e handlers.

```ts
import { Hono } from 'hono'

const app = new Hono<{ Variables: { message: string } }>()

app.use(async (c, next) => {
  c.set('message', 'Hono is cool!!')
  await next()
})

app.get('/', (c) => {
  const message = c.get('message')
  return c.text(`The message is "${message}"`)
})
```

Torne type-safe passando `Variables` como generic do construtor:

```ts
import { Hono } from 'hono'

type Variables = {
  message: string
}

const app = new Hono<{ Variables: Variables }>()
```

## c.var

Acesso direto ao objeto de variáveis. Aceita acesso aninhado, por exemplo `c.var.client.oneMethod()`.

```ts
import type { Context } from 'hono'

declare const c: Context

const result = c.var.client.oneMethod()
```

Middleware que provê um método custom com tipo:

```ts
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'

type Env = {
  Variables: {
    echo: (str: string) => string
  }
}

const app = new Hono()

const echoMiddleware = createMiddleware<Env>(async (c, next) => {
  c.set('echo', (str) => str)
  await next()
})

app.get('/echo', echoMiddleware, (c) => {
  return c.text(c.var.echo('Hello!'))
})
```

Reutilizando o middleware via `app.use()`, passe `Env` no generic do `Hono`:

```ts
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono/types'

declare const echoMiddleware: MiddlewareHandler
type Env = {
  Variables: {
    echo: (str: string) => string
  }
}

const app = new Hono<Env>()

app.use(echoMiddleware)

app.get('/echo', (c) => {
  return c.text(c.var.echo('Hello!'))
})
```

## ContextVariableMap

Alternativa global ao generic `Variables`. Faça module augmentation:

```ts
declare module 'hono' {
  interface ContextVariableMap {
    result: string
  }
}
```

Uso no middleware — `result` é inferido como `string`:

```ts
import { createMiddleware } from 'hono/factory'

const mw = createMiddleware(async (c, next) => {
  c.set('result', 'some values')
  await next()
})
```

No handler, o tipo é inferido:

```ts
import { Hono } from 'hono'

const app = new Hono<{ Variables: { result: string } }>()

app.get('/', (c) => {
  const val = c.get('result')
  return c.json({ result: val })
})
```

> **Atenção:** `ContextVariableMap` adiciona tipos **globalmente** a todos os contexts, independentemente de o middleware que define a variável ter rodado. Assim `c.get('result')` parece type-safe até em handlers onde o middleware não foi registrado, podendo esconder `undefined` em runtime.

```ts
declare module 'hono' {
  interface ContextVariableMap {
    result: string
  }
}

const mw = createMiddleware(async (c, next) => {
  c.set('result', 'some values')
  await next()
})

const app = new Hono()

app.get('/foo', mw, (c) => {
  const val = c.get('result') // ✅ string
})

app.get('/bar', (c) => {
  const val = c.get('result') // ❌ undefined em runtime, tipado como string
})
```

Use `ContextVariableMap` quando a variável é definida por middleware aplicado **app-wide** e garantidamente presente.

## c.env

Bindings do runtime (env vars, secrets, KV, D1, R2 etc.) acessados por `c.env.BINDING_KEY`. Passe o tipo via generic `Bindings` para inferência.

```ts
import { Hono } from 'hono'

type KVNamespace = any
type Bindings = {
  MY_KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  c.env.MY_KV.get('my-key')
})
```

## c.executionCtx

`ExecutionContext` do Cloudflare Workers. Contém `waitUntil` (e `exports`).

```ts
import { Hono } from 'hono'

const app = new Hono<{
  Bindings: {
    KV: any
  }
}>()
declare const key: string
declare const data: string

app.get('/foo', async (c) => {
  c.executionCtx.waitUntil(c.env.KV.put(key, data))
})
```

Para autocomplete de `exports` com os tipos gerados pelo Wrangler:

```ts
import 'hono'

declare module 'hono' {
  interface ExecutionContext {
    readonly exports: Cloudflare.Exports
  }
}
```

## c.error

Se um handler lança erro, o objeto do erro fica em `c.error` — acessível no middleware.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.use(async (c, next) => {
  await next()
  if (c.error) {
    // do something...
  }
})
```

## c.setRenderer() / c.render()

`c.setRenderer()` define um layout via middleware custom; depois `c.render()` gera a resposta dentro dele.

```tsx
/** @jsx jsx */
/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'

const app = new Hono()

app.use(async (c, next) => {
  c.setRenderer((content) => {
    return c.html(
      <html>
        <body>
          <p>{content}</p>
        </body>
      </html>
    )
  })
  await next()
})

app.get('/', (c) => {
  return c.render('Hello!')
})
```

Saída:

```html
<html>
  <body>
    <p>Hello!</p>
  </body>
</html>
```

Argumentos adicionais podem ser tipados fazendo augmentation de `ContextRenderer`:

```ts
declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      head: { title: string }
    ): Response | Promise<Response>
  }
}
```

Exemplo com `head`:

```ts
app.use('/pages/*', async (c, next) => {
  c.setRenderer((content, head) => {
    return c.html(
      <html>
        <head>
          <title>{head.title}</title>
        </head>
        <body>
          <header>{head.title}</header>
          <p>{content}</p>
        </body>
      </html>
    )
  })
  await next()
})

app.get('/pages/my-favorite', (c) => {
  return c.render(<p>Ramen and Sushi</p>, {
    title: 'My favorite',
  })
})

app.get('/pages/my-hobbies', (c) => {
  return c.render(<p>Watching baseball</p>, {
    title: 'My hobbies',
  })
})
```

## Próximos passos

- [`04-request-response.md`](./04-request-response.md) — `HonoRequest` e `Response`
- [`05-middleware.md`](./05-middleware.md) — `next()`, composição e ordem
- [`10-jsx.md`](./10-jsx.md) — `c.render()` com JSX
- [`02-roteamento.md`](./02-roteamento.md) — handlers e rotas
