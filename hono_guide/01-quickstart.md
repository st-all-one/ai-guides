# Quickstart

> Do zero ao primeiro request: instalar, criar o app, rodar o dev server. O mesmo
> código Hono roda em Cloudflare Workers, Fastly, Deno, Bun, Vercel, Netlify,
> AWS Lambda, Lambda\@Edge e Node.js — só o **entry point** muda.

## 1. Instalação via `create-hono`

O jeito recomendado é o starter oficial, um por plataforma:

```sh
# npm
npm create hono@latest my-app

# yarn
yarn create hono my-app

# pnpm
pnpm create hono@latest my-app

# bun
bun create hono@latest my-app

# deno
deno init --npm hono@latest my-app
```

O comando pergunta qual template usar:

```
? Which template do you want to use?
    aws-lambda
    bun
    cloudflare-pages
❯   cloudflare-workers
    deno
    fastly
    nextjs
    nodejs
    vercel
```

Entre na pasta e instale as dependências:

```sh
cd my-app
npm i        # bun: bun i | yarn: yarn | pnpm: pnpm i
```

### Flags do `create-hono`

| Argumento | Descrição | Exemplo |
|-----------|-----------|---------|
| `--template <template>` | Seleciona o template e pula o prompt interativo. | `--template cloudflare-workers` |
| `--install` | Instala as dependências automaticamente após criar o template. | `--install` |
| `--pm <packageManager>` | Especifica o package manager para instalar (`npm`, `pnpm`, `yarn`). | `--pm pnpm` |
| `--offline` | Usa o cache local de templates em vez de baixar os remotos (ambientes offline/determinísticos). | `--offline` |

> Com `npm create`/`npx`, as flags do initializer precisam vir **depois de `--`**:
> `npm create hono@latest my-app -- --template vercel --pm npm --install`.
> Com `yarn`/`pnpm`/`bun`/`deno`, passe direto.

Fluxos comuns:

```bash
# interativo mínimo
npm create hono@latest my-app

# não-interativo: template vercel + npm + install
npm create hono@latest my-app -- --template vercel --pm npm --install

# offline (sem rede)
pnpm create hono@latest my-app --template deno --offline
```

### Templates disponíveis

| Template | Runtime/plataforma |
|----------|--------------------|
| `aws-lambda` | AWS Lambda |
| `bun` | Bun |
| `cloudflare-pages` | Cloudflare Pages |
| `cloudflare-workers` | Cloudflare Workers (Wrangler) |
| `cloudflare-workers+vite` | Cloudflare Workers + Vite |
| `deno` | Deno / Deno Deploy |
| `fastly` | Fastly Compute |
| `netlify` | Netlify |
| `nextjs` | Next.js |
| `nodejs` | Node.js (`@hono/node-server`) |
| `vercel` | Vercel |

> A lista exata é mantida pelo projeto [`create-hono`](https://github.com/honojs/create-hono).

## 2. Instalação manual

Hono tem **zero dependências**. Em um projeto já existente, basta adicioná-lo:

```sh
npm i hono        # yarn add hono | pnpm add hono | bun add hono
```

No Deno, Hono está no npm **e** no JSR. Escolha o registry pelo `deno.json`:

```sh
deno add jsr:@hono/hono   # equivalente a "hono": "jsr:@hono/hono"
```

```json
{
  "imports": {
    "hono": "jsr:@hono/hono"
  }
}
```

Para usar `npm:hono`, troque o mapeamento:

```json
{
  "imports": {
    "hono": "npm:hono",
    "hono/": "npm:/hono/"
  }
}
```

> Ao usar middleware de terceiros, mantenha Hono no **mesmo registry** do middleware
> para inferência de tipos correta (ex.: `npm:hono` + `npm:@hono/zod-validator`, ou
> `jsr:@hono/hono` + `jsr:@hono/zod-validator`).

## 3. Estrutura de projeto típica

```
my-app/
├── src/
│   └── index.ts        # entry point (app + export default/handler)
├── package.json
├── tsconfig.json
└── wrangler.toml       # só em templates Cloudflare; cada runtime tem seu config
```

Em Deno usa-se `main.ts` na raiz e `deno.json`/`deno.jsonc`. O arquivo principal
também pode ser `.tsx` quando se usa JSX.

## 4. Hello World

`src/index.ts`:

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
```

Acesse `http://localhost:8787` (Cloudflare) ou a porta padrão do seu runtime.

## 5. Rodar o dev server por runtime

| Runtime | Comando | URL padrão |
|---------|---------|------------|
| Cloudflare Workers/Pages | `npm run dev` (Wrangler) | `http://localhost:8787` |
| Node.js | `npm run dev` | `http://localhost:3000` |
| Bun | `bun run dev` | `http://localhost:3000` |
| Deno | `deno task start` | `http://localhost:8000` |
| Vercel/Netlify/outros | `npm run dev` ou `vercel dev`/`netlify dev` | conforme ferramenta |

Templates usam `dev` no `package.json`; ex.: Bun `bun run --hot src/index.ts`.
Para trocar a porta: `serve({ fetch: app.fetch, port: 8787 })` (Node),
`Deno.serve({ port: 8787 }, app.fetch)` (Deno),
`export default { port: 3000, fetch: app.fetch }` (Bun), ou `wrangler.toml`
(Cloudflare).

## 6. Exemplos básicos

### Return JSON

Handler de `GET /api/hello` retornando `application/json`:

```ts
app.get('/api/hello', (c) => {
  return c.json({
    ok: true,
    message: 'Hello Hono!',
  })
})
```

### Path param e query

```ts
app.get('/posts/:id', (c) => {
  const page = c.req.query('page')
  const id = c.req.param('id')
  c.header('X-Message', 'Hi!')
  return c.text(`You want to see ${page} of ${id}`)
})
```

### POST, PUT e DELETE

```ts
app.post('/posts', (c) => c.text('Created!', 201))
app.delete('/posts/:id', (c) =>
  c.text(`${c.req.param('id')} is deleted!`)
)
```

### HTML com JSX

Renomeie para `src/index.tsx` e configure o `tsconfig.json`:

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

const Layout: FC = (props) => {
  return (
    <html>
      <body>{props.children}</body>
    </html>
  )
}

const Top: FC<{ messages: string[] }> = (props: {
  messages: string[]
}) => {
  return (
    <Layout>
      <h1>Hello Hono!</h1>
      <ul>
        {props.messages.map((message) => {
          return <li>{message}!!</li>
        })}
      </ul>
    </Layout>
  )
}

app.get('/', (c) => {
  const messages = ['Good Morning', 'Good Evening', 'Good Night']
  return c.html(<Top messages={messages} />)
})

export default app
```

> Para Deno, configure `deno.json` com `"jsx": "precompile"` e
> `"jsxImportSource": "@hono/hono/jsx"`. Detalhes em [`./10-jsx.md`](./10-jsx.md).

### Return raw Response

```ts
app.get('/', () => {
  return new Response('Good morning!')
})
```

## 7. Middleware

Middleware executa antes/depois do handler. Exemplo com Basic Auth:

```ts
import { basicAuth } from 'hono/basic-auth'

app.use(
  '/admin/*',
  basicAuth({
    username: 'admin',
    password: 'secret',
  })
)

app.get('/admin', (c) => {
  return c.text('You are authorized!')
})
```

Múltiplos middlewares embutidos encadeiam direto:

```ts
import { Hono } from 'hono'
import { etag } from 'hono/etag'
import { logger } from 'hono/logger'

const app = new Hono()
app.use(etag(), logger())
```

> Há middleware embutido (Bearer, JWT, CORS, ETag, Logger, Secure Headers…),
> de terceiros e custom. Ver [`./05-middleware.md`](./05-middleware.md) e
> [`./06-middleware-embutidos.md`](./06-middleware-embutidos.md).

## 8. Adapter

Adapters cobrem funções dependentes de plataforma (arquivos estáticos, WebSocket,
etc.). Exemplo de WebSocket em Cloudflare Workers:

```ts
import { upgradeWebSocket } from 'hono/cloudflare-workers'

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    // ...
  })
)
```

## 9. Entry point por runtime

Só o `import` do adapter e a exportação final mudam; o `app` (rotas) é idêntico.

| Runtime | Entry point |
|---------|-------------|
| Cloudflare Workers / Pages / Vercel | `export default app` |
| Bun | `export default app` (ou `export default { port, fetch: app.fetch }`) |
| Deno | `Deno.serve(app.fetch)` |
| Node.js | `import { serve } from '@hono/node-server'; serve(app)` |
| AWS Lambda | `import { handle } from 'hono/aws-lambda'; export const handler = handle(app)` |
| Netlify | `import { handle } from 'hono/netlify'; export default handle(app)` |
| Next.js | `import { handle } from 'hono/vercel'; export const GET = handle(app); export const POST = handle(app)` |
| Fastly Compute | `import { fire } from '@fastly/hono-fastly-compute'; fire(app)` |

Exemplos:

```ts
// Node.js
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Node.js!'))

serve(app)
```

```ts
// Deno
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Deno!'))

Deno.serve(app.fetch)
```

```ts
// AWS Lambda
import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'

const app = new Hono()
app.get('/', (c) => c.text('Hello Lambda!'))

export const handler = handle(app)
```

```ts
// Netlify
import { Hono } from 'jsr:@hono/hono'
import { handle } from 'jsr:@hono/hono/netlify'

const app = new Hono()
app.get('/', (c) => c.text('Hello Netlify!'))

export default handle(app)
```

> O mesmo app roda em qualquer plataforma alterando apenas esse bloco. Deploy e
> configuração específicos: [`./14-deploy-runtimes.md`](./14-deploy-runtimes.md).

## Próximos passos

- [`./02-roteamento.md`](./02-roteamento.md) — rotas, params, wildcards, grupos
- [`./03-contexto.md`](./03-contexto.md) — objeto `Context` (`c`)
- [`./04-request-response.md`](./04-request-response.md) — Request/Response helpers
- [`./05-middleware.md`](./05-middleware.md) — middleware do zero ao avançado
