# FAQ e Solução de Problemas

> Respostas objetivas para dúvidas reais da documentação oficial: por que Hono é rápido, diferenças para Express, tamanho do bundle, multi-runtime, CORS, arquivos estáticos, streaming, tipagem, erros 404/500, body em PUT/PATCH, além de recursos, links oficiais e armadilhas comuns.

## Por que Hono?

### Por que o Hono é rápido?

O roteador **RegExpRouter** transforma todos os padrões de rota em **uma única expressão regular grande** e obtém o match com **uma única execução** — sem linear loops. Isso é mais rápido que algoritmos baseados em árvore (radix-tree) na maioria dos casos. Referência em Cloudflare Workers:

```
Hono x 402,820 ops/sec ±4.78% (80 runs sampled)
itty-router x 212,598 ops/sec ±3.11% (87 runs sampled)
sunder x 297,036 ops/sec ±4.76% (77 runs sampled)
worktop x 197,345 ops/sec ±2.40% (88 runs sampled)
Fastest is Hono
```

Hono usa por padrão `SmartRouter` com `RegExpRouter` + `TrieRouter`; o SmartRouter detecta o roteador mais rápido no start da aplicação. `RegExpRouter` não suporta todos os padrões, por isso é combinado com outro roteador que suporta.

### Qual a diferença entre Hono e Express?

| Aspecto | Hono | Express |
|---------|------|---------|
| Roteamento | `RegExpRouter` (uma regex, match único) | `path-to-regexp` com linear loops |
| Base | Apenas **Web Standards** (Fetch, `Request`, `Response`, `URL`, `Headers`) | APIs específicas de Node.js |
| Runtimes | Cloudflare Workers, Fastly, Deno, Bun, Vercel, Netlify, AWS Lambda, Lambda\@Edge, Node.js, WebAssembly/WASI | Node.js |
| Dependências | Zero dependências | Ecossistema próprio |
| Tamanho | `hono/tiny` **under 14kB** (minificado) | 572KB |
| Frontend | Sem frontend; similar ao Express | Sem frontend |

Hono é "um framework web simples similar ao Express, sem frontend", porém roda em CDN Edges e cobre Web APIs, proxy de backends, front de CDN, edge apps, base para bibliotecas e full-stack. Com Express, o roteamento faz regex matching em todas as rotas e degrada conforme cresce o número de rotas; o RegExpRouter evita isso.

### Hono funciona em Deno e Bun?

Sim. Hono usa apenas Web Standards, o que permite rodar em qualquer runtime que os suporte: `workerd` (Cloudflare Workers), Deno, Bun, Fastly Compute, AWS Lambda, Node.js (via adapter), Vercel (`edge-light`) e WASM/WASI. Na época em que perguntavam "is there Express for Bun?", a resposta era "no, but there is Hono" (o Express hoje também roda no Bun).

```ts
// Bun: src/index.ts
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Bun!'))

export default app
```

```ts
// Deno: main.ts
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Deno!'))

Deno.serve(app.fetch)
```

Bun: `bun run dev` em `http://localhost:3000`. Deno: `deno task start` em `http://localhost:8000`. Para trocar a porta, exporte `port`/`fetch` (Bun) ou use `Deno.serve({ port }, app.fetch)`.

### Qual é o tamanho do bundle?

O preset `hono/tiny` fica **under 14KB** minificado. Middleware e adapters só entram no bundle **quando usados**. Com `PatternRouter` (o menor roteador) a aplicação fica **under 15KB**:

```
$ npx wrangler deploy --minify ./src/index.ts
Total Upload: 14.68 KiB / gzip: 5.38 KiB
```

### Hono tem dependências?

Não. Hono tem **zero dependências** e usa apenas Web Standards.

## Uso e API

### Como usar com Cloudflare Workers?

```ts
// src/index.ts
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Cloudflare Workers!'))

export default app
```

Rode com Wrangler (`npm run dev`) em `http://localhost:8787` e faça deploy com `npm run deploy`. Bindings (KV, R2, Durable Objects, secrets) ficam em `c.env` e ganham tipos via generics:

```ts
type Bindings = {
  MY_BUCKET: R2Bucket
  USERNAME: string
  PASSWORD: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.put('/upload/:key', async (c) => {
  const key = c.req.param('key')
  await c.env.MY_BUCKET.put(key, c.req.body)
  return c.text(`Put ${key} successfully!`)
})
```

Gere os tipos automaticamente com `wrangler types --env-interface CloudflareBindings` e passe `new Hono<{ Bindings: CloudflareBindings }>()`. Em middleware que dependa de variáveis, leia `c.env.*` dentro do `app.use`:

```ts
import { basicAuth } from 'hono/basic-auth'

app.use('/auth/*', async (c, next) => {
  const auth = basicAuth({
    username: c.env.USERNAME,
    password: c.env.PASSWORD,
  })
  return auth(c, next)
})
```

### Como lidar com CORS?

Use o middleware embutido `cors`, registrado **antes** das rotas:

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/api/*', cors())
app.use(
  '/api2/*',
  cors({
    origin: 'http://example.com',
    allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
  })
)
```

`origin` aceita `string`, `string[]` ou função `(origin, c) => string`. Para configurar por ambiente, crie o middleware dentro do handler:

```ts
app.use('*', async (c, next) => {
  const corsMiddlewareHandler = cors({ origin: c.env.CORS_ORIGIN })
  return corsMiddlewareHandler(c, next)
})
```

Com Vite, desabilite o CORS embutido (`server.cors: false` no `vite.config.ts`) para evitar conflito com o middleware do Hono.

### Como servir arquivos estáticos?

O import muda por runtime:

| Runtime | Import | Exemplo |
|---------|--------|---------|
| Node.js | `@hono/node-server/serve-static` | `app.use('/static/*', serveStatic({ root: './' }))` |
| Bun | `hono/bun` | `app.use('/static/*', serveStatic({ root: './' }))` |
| Deno | `hono/deno` | `app.use('/static/*', serveStatic({ root: './' }))` |
| Cloudflare Workers | Static Assets (Wrangler) | `"assets": { "directory": "public" }` no `wrangler.jsonc` |

```ts
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }))
app.get('*', serveStatic({ path: './static/fallback.txt' }))
```

Opções úteis: `rewriteRequestPath`, `mimes`, `onFound`, `onNotFound` e `precompressed` (serve `.br`/`.gz` conforme `Accept-Encoding`, priorizando Brotli, Zstd e Gzip).

### Como fazer streaming?

Use `stream`, `streamText` ou `streamSSE` de `hono/streaming`:

```ts
import { Hono } from 'hono'
import { stream, streamText, streamSSE } from 'hono/streaming'

const app = new Hono()

app.get('/stream', (c) => {
  return stream(c, async (stream) => {
    stream.onAbort(() => {
      console.log('Aborted!')
    })
    await stream.write(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]))
    await stream.pipe(anotherReadableStream)
  })
})

app.get('/streamText', (c) => {
  return streamText(c, async (stream) => {
    await stream.writeln('Hello')
    await stream.sleep(1000)
    await stream.write('Hono!')
  })
})

app.get('/sse', async (c) => {
  let id = 0
  return streamSSE(c, async (stream) => {
    while (!stream.aborted) {
      await stream.writeSSE({ data: `It is ${new Date()}`, event: 'time-update', id: String(id++) })
      await stream.sleep(1000)
    }
  })
})
```

No Wrangler, se o streaming não funcionar bem, adicione `c.header('Content-Encoding', 'Identity')`. O 3º argumento do helper é um error handler; se a callback lançar erro, o `onError` do Hono **não** é acionado (o stream já começou e não pode ser sobrescrito).

### Como tipar variáveis (`c.set`/`c.get`)?

Use generics em `new Hono<{ Bindings; Variables }>()`:

```ts
import { Hono } from 'hono'

type User = { id: string; name: string }
type Bindings = { TOKEN: string }
type Variables = { user: User }

const app = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

app.use('/auth/*', async (c, next) => {
  const token = c.env.TOKEN // string
  c.set('user', { id: '1', name: 'Alice' })
  await next()
})
```

Em middleware separado, use `createMiddleware` de `hono/factory` e o generic `Variables`; em cadeias `.use()`, o Hono **acumula** os tipos de `Variables` automaticamente:

```ts
import { createMiddleware } from 'hono/factory'

const authMiddleware = createMiddleware<{
  Variables: { user: { id: string; name: string } }
}>(async (c, next) => {
  c.set('user', { id: '123', name: 'Alice' })
  await next()
})
```

Acesse com `c.var.user`. Para não repetir o `Env`, use `createFactory<Env>()` + `factory.createApp()` + `factory.createMiddleware()`.

### Como tratar erros 404 e 500?

`app.notFound` customiza o 404 e `app.onError` captura erros não tratados:

```ts
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

app.notFound((c) => {
  return c.text('Custom 404 Message', 404)
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(err)
  return c.text('Custom Error Message', 500)
})
```

`HTTPException` permite lançar erros com status, `message` ou `res` customizado, além de `cause`:

```ts
import { HTTPException } from 'hono/http-exception'

throw new HTTPException(401, { message: 'Unauthorized' })
```

Regras: `notFound` só é chamado no **top-level app**; se app pai e rota têm `onError`, o da **rota tem prioridade**; `next()` nunca lança, então não é preciso envolver em try/catch.

### Como ler o body em PUT/PATCH?

Igual a POST: os métodos de parsing de `c.req` retornam **Promise** e precisam de `await`.

```ts
import { Hono } from 'hono'

const app = new Hono()

app.put('/posts/:id', async (c) => {
  const body = await c.req.json() // application/json
  return c.json({ id: c.req.param('id'), ...body })
})

app.patch('/posts/:id', async (c) => {
  const body = await c.req.parseBody() // form-data / urlencoded
  return c.json({ ...body })
})
```

Outros métodos: `c.req.text()`, `c.req.arrayBuffer()`, `c.req.blob()`, `c.req.formData()`. O body só pode ser consumido **uma vez**; se um validator já o leu, clone com `cloneRawRequest`:

```ts
import { cloneRawRequest } from 'hono/request'

app.post('/forward', async (c) => {
  const clonedReq = await cloneRawRequest(c.req)
  const data = await clonedReq.json()
  return c.json(data)
})
```

### Como validar dados da requisição?

Use o middleware de terceiros (ex.: `@hono/zod-validator`) e leia com `c.req.valid(...)`. Alvos: `form`, `json`, `query`, `header`, `cookie`, `param`.

```ts
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import * as z from 'zod'

const app = new Hono()

app.get(
  '/hello',
  zValidator('query', z.object({ name: z.string() })),
  (c) => {
    const { name } = c.req.valid('query')
    return c.json({ message: `Hello! ${name}` })
  }
)
```

### Como usar JSX?

Configure o `tsconfig.json` (ou `deno.json`) e use a extensão `.tsx`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}
```

```tsx
import { Hono } from 'hono'
import type { FC } from 'hono/jsx'

const app = new Hono()

const Top: FC<{ messages: string[] }> = (props: { messages: string[] }) => {
  return (
    <ul>
      {props.messages.map((message) => {
        return <li>{message}!!</li>
      })}
    </ul>
  )
}

app.get('/', (c) => {
  const messages = ['Good Morning', 'Good Evening', 'Good Night']
  return c.html(<Top messages={messages} />)
})
```

No Deno: `"jsx": "precompile"` e `"jsxImportSource": "@hono/hono/jsx"`. `hono/jsx` suporta async components (com `c.html()` o await é automático), `Suspense`, `ErrorBoundary`, `Fragment`, `PropsWithChildren`, `memo` e `dangerouslySetInnerHTML`. Para client components, `hono/jsx/dom` gera bundles menores.

### `c.json` ou `new Response`?

Ambos funcionam; o handler deve retornar um `Response`. Prefira os helpers `c.json`/`c.text`/`c.html` porque definem headers e preservam a inferência de tipos do RPC (`hc`). Retornar `c.json(...)` sem `return` faz a rota não responder.

### Como organizar uma aplicação grande?

Use `app.route()` para montar sub-apps, em vez de "controllers" estilo Rails (que quebram a inferência de path params):

```ts
import { Hono } from 'hono'
import authors from './authors'
import books from './books'

const app = new Hono()

app.route('/authors', authors)
app.route('/books', books)

export default app
```

Para manter a tipagem do RPC, **encadeie** os métodos e exporte o tipo:

```ts
const app = new Hono()
  .get('/', (c) => c.json('list authors'))
  .get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export type AppType = typeof app
```

## Ecossistema e recursos

### Onde encontro os recursos oficiais?

- GitHub repository: <https://github.com/honojs>
- npm registry: <https://www.npmjs.com/package/hono>
- JSR: <https://jsr.io/@hono/hono>

### Existe config oficial do Renovate para o Hono?

O time do Hono **não** mantém config oficial do [Renovate](https://github.com/renovatebot/renovate). Use a config de terceiros no `renovate.json`:

```json
// renovate.json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>shinGangan/renovate-config-hono"]
}
```

Detalhes em [renovate-config-hono](https://github.com/shinGangan/renovate-config-hono).

### Como contribuir e patrocinar?

Formas de contribuir: criar Issue (feature/bug), Pull Request (fix/typo/refactor), criar middleware de terceiros, compartilhar (Blog, X/Twitter) e usar Hono em aplicações. Veja o [Contribution Guide](https://github.com/honojs/hono/blob/main/docs/CONTRIBUTING.md). Patrocínio pelo GitHub Sponsors: [@yusukebe](https://github.com/sponsors/yusukebe) e [@usualoma](https://github.com/sponsors/usualoma).

### Como explorar middleware de terceiros?

Middleware embutido não depende de módulos externos; middleware de terceiros pode depender de bibliotecas (GraphQL Server, Sentry, Firebase Auth etc.). A lista fica em [Third-party Middleware](https://hono.dev/docs/middleware/third-party). No Deno, mantenha Hono no **mesmo registry** do middleware para inferência correta (`npm:hono` + `npm:@hono/zod-validator`, ou `jsr:@hono/hono` + `jsr:@hono/zod-validator`).

## Armadilhas comuns

| Armadilha | Correção |
|-----------|----------|
| Esquecer `await` em `c.req.json()`/`parseBody()` | Todo parsing de body retorna Promise; use `await`. O body só pode ser lido uma vez. |
| Ordem de middleware | Middleware executa na ordem de registro; `processo antes do next` roda primeiro e `depois do next` roda por último. |
| Registrar middleware depois da rota | Registre `app.use(...)` **antes** das rotas que ele deve cobrir (ex.: CORS). |
| `return c.json(...)` esquecido | Sem `return`, a rota não retorna `Response`. |
| `c.json` vs `Response` | Prefira helpers para headers + tipos; `new Response` também é válido. |
| `notFound` em sub-app | `notFound` só é chamado a partir do **top-level app**. |
| Múltiplos `onError` | O `onError` da rota tem prioridade sobre o do app pai. |
| `next()` dentro de try/catch | `next()` nunca lança; Hono captura e encaminha ao `onError` ou vira 500. |
| `c.req.header()` sem argumento | As chaves retornadas são **lowercase**; use `c.req.header('X-Foo')` para nomes com maiúsculas. |
| Streaming não funciona no Wrangler | Adicione `c.header('Content-Encoding', 'Identity')`. |
| `onError` com streaming | Após o stream começar, a resposta não pode ser sobrescrita; use o 3º argumento do helper. |
| RPC com handlers soltos | Para inferência correta, encadeie os métodos e exporte `typeof app`. |
| `HEAD` handler dedicado | Hono converte `HEAD` em `GET` e remove o body antes do route matching; trate `HEAD` em middleware. |
| Misturar versões de middleware no Deno | Importe middleware da mesma versão base do Hono. |
| Vite CORS duplicado | Defina `server.cors: false` no `vite.config.ts`. |

## Próximos passos

- [`./13-melhores-praticas.md`](./13-melhores-praticas.md) — organização de app e RPC
- [`./14-deploy-runtimes.md`](./14-deploy-runtimes.md) — entry points e configuração por plataforma
- [`./15-seguranca.md`](./15-seguranca.md) — headers, CORS e boas práticas
- [`./17-cheatsheet.md`](./17-cheatsheet.md) — referência rápida de APIs
