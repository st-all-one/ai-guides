# Helpers

> Helpers nativos do Hono: funções puras importadas de subpaths `hono/*` para négociação de conteúdo, cookies, JWT, streaming, WebSocket, SSG, CSS-in-JS e utilitários de build/dev. Não são middleware — são chamados dentro de handlers.

Helpers não alteram o pipeline sozinhos; você os invoca no handler (ou os usa como middleware/factory, no caso de `factory` e SSG). O `route` helper está coberto em [`02-roteamento.md`](./02-roteamento.md), o `testing` em [`11-testing.md`](./11-testing.md) e o JSX em [`10-jsx.md`](./10-jsx.md).

---

### accepts

Negociação de header `Accept`. Examina headers como `Accept-Language` e `Accept-Encoding` e retorna o valor suportado que melhor casa.

Implementação de [`hono/accepts`](official+docs/docs/helpers/accepts.md):

```ts
import { accepts } from 'hono/accepts'
```

Tipo auxiliar:

```ts
export type AcceptHeader =
  | 'Accept'
  | 'Accept-Charset'
  | 'Accept-Encoding'
  | 'Accept-Language'
  | 'Accept-Patch'
  | 'Accept-Post'
  | 'Accept-Ranges'
```

| Opção | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `header` | `AcceptHeader` | sim | Header accept alvo. |
| `supports` | `string[]` | sim | Valores que a aplicação suporta. |
| `default` | `string` | sim | Valor default. |
| `match` | `(accepts: Accept[], config: acceptsConfig) => string` | não | Função de match customizada. |

```ts
import { Hono } from 'hono'
import { accepts } from 'hono/accepts'

const app = new Hono()

app.get('/', (c) => {
  const accept = accepts(c, {
    header: 'Accept-Language',
    supports: ['en', 'ja', 'zh'],
    default: 'en',
  })
  return c.json({ lang: accept })
})

export default app
```

---

### adapter

Interface unificada para acessar plataformas. Expõe `env()` (variáveis de ambiente por runtime, inclusive Bindings do Cloudflare) e `getRuntimeKey()` (identificador do runtime atual).

Implementação de [`hono/adapter`](official+docs/docs/helpers/adapter.md):

```ts
import { env, getRuntimeKey } from 'hono/adapter'
```

`env(c)` retorna os bindings/variáveis do runtime corrente. O segundo argumento opcional força um runtime específico (`env<{ NAME: string }>(c, 'workerd')`).

Runtimes suportados: Cloudflare Workers (`wrangler.toml`/`wrangler.jsonc`), Deno (`Deno.env`/`.env`), Bun (`Bun.env`/`process.env`), Node.js (`process.env`), Vercel, AWS Lambda, Fastly Compute, Netlify. Lambda@Edge não suporta env vars (use o evento Lambda@Edge).

Chaves de `getRuntimeKey()`: `workerd`, `deno`, `bun`, `node`, `edge-light` (Vercel Edge), `fastly`, `other`.

```ts
import { Hono } from 'hono'
import { env, getRuntimeKey } from 'hono/adapter'

const app = new Hono()

app.get('/env', (c) => {
  const { NAME } = env<{ NAME: string }>(c)
  return c.text(NAME)
})

app.get('/runtime', (c) => {
  if (getRuntimeKey() === 'workerd') {
    return c.text('You are on Cloudflare')
  } else if (getRuntimeKey() === 'bun') {
    return c.text('You are on Bun')
  }
  return c.text(getRuntimeKey())
})

export default app
```

Para o endereço remoto do cliente use o helper `conninfo` (abaixo), não `adapter`.

---

### conninfo

Obtém informação de conexão, como o endereço remoto do cliente. O `getConnInfo` é exportado por adapters de cada runtime.

Import por runtime (de [`hono/conninfo`](official+docs/docs/helpers/conninfo.md)):

| Runtime | Import |
|---------|--------|
| Cloudflare Workers | `import { getConnInfo } from 'hono/cloudflare-workers'` |
| Deno | `import { getConnInfo } from 'hono/deno'` |
| Bun | `import { getConnInfo } from 'hono/bun'` |
| Vercel | `import { getConnInfo } from 'hono/vercel'` |
| AWS Lambda | `import { getConnInfo } from 'hono/aws-lambda'` |
| Netlify | `import { getConnInfo } from 'hono/netlify'` |
| Lambda@Edge | `import { getConnInfo } from 'hono/lambda-edge'` |
| Node.js | `import { getConnInfo } from '@hono/node-server/conninfo'` |

Tipos retornados:

```ts
type AddressType = 'IPv6' | 'IPv4' | undefined

type NetAddrInfo = {
  transport?: 'tcp' | 'udp'
  port?: number
  address?: string
  addressType?: AddressType
} & ({ address: string; addressType: AddressType } | {})

interface ConnInfo {
  remote: NetAddrInfo
}
```

```ts
import { Hono } from 'hono'
import { getConnInfo } from 'hono/cloudflare-workers'

const app = new Hono()

app.get('/', (c) => {
  const info = getConnInfo(c) // info is `ConnInfo`
  return c.text(`Your remote address is ${info.remote.address}`)
})

export default app
```

---

### cookie

Interface para setar, ler e apagar cookies. Suporta cookies assinados (HMAC SHA-256 via WebCrypto — operações assíncronas).

Implementação de [`hono/cookie`](official+docs/docs/helpers/cookie.md):

```ts
import {
  deleteCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
  generateCookie,
  generateSignedCookie,
} from 'hono/cookie'
```

Funções:

| Função | Assinatura / retorno |
|--------|----------------------|
| `setCookie` | `(c, name, value, opts?) => void` |
| `getCookie` | `(c, name?) => value \| undefined` (sem `name`, retorna todos) |
| `deleteCookie` | `(c, name, opts?) => deletedValue` |
| `setSignedCookie` | `async (c, name, value, secret, opts?) => Promise<void>` |
| `getSignedCookie` | `async (c, secret, name?, prefix?) => Promise<value \| false \| undefined>` |
| `generateCookie` | `(name, value, opts?) => string` (não escreve headers) |
| `generateSignedCookie` | `async (name, value, secret, opts?) => Promise<string>` |

`getSignedCookie` distingue dois casos: assinatura presente mas inválida → `false`; sem formato de assinatura válido → `undefined` (igual a cookie ausente). Como ambos são falsy, `if (!value)` cobre os dois.

Options de `setCookie`/`setSignedCookie`: `domain: string`, `expires: Date`, `httpOnly: boolean`, `maxAge: number`, `path: string`, `secure: boolean`, `sameSite: 'Strict' | 'Lax' | 'None'`, `priority: 'Low' | 'Medium' | 'High'`, `prefix: 'secure' | 'host'`, `partitioned: boolean`.
Options de `deleteCookie`: `path`, `secure`, `domain`.

Prefixo `__Secure-`/`__Host-`: passe `prefix` no get/set para validar. Boas práticas (RFC6265bis-13 / CHIPS-01) — o helper lança `Error` quando: nome começa com `__Secure-` sem `secure`; `__Host-` sem `secure`; `__Host-` com `path` ≠ `/`; `__Host-` com `domain`; `maxAge` > 400 dias; `expires` > 400 dias no futuro.

```ts
import { Hono } from 'hono'
import {
  setCookie,
  getCookie,
  deleteCookie,
  setSignedCookie,
  getSignedCookie,
  generateCookie,
  generateSignedCookie,
} from 'hono/cookie'

const app = new Hono()

app.get('/cookie', (c) => {
  setCookie(c, 'cookie_name', 'cookie_value', {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Strict',
  })
  const value = getCookie(c, 'cookie_name')
  const allCookies = getCookie(c)
  deleteCookie(c, 'cookie_name', { path: '/', secure: true })
  return c.json({ value, allCookies })
})

app.get('/signed-cookie', async (c) => {
  const secret = 'secret' // use uma string longa o suficiente
  await setSignedCookie(c, 'cookie_name0', 'cookie_value', secret)
  const fortuneCookie = await getSignedCookie(c, secret, 'cookie_name0')
  const allSignedCookies = await getSignedCookie(c, secret)
  deleteCookie(c, 'cookie_name0')
  return c.json({ fortuneCookie, allSignedCookies })
})

app.get('/generate', async (c) => {
  const cookie = generateCookie('delicious_cookie', 'macha', {
    path: '/',
    secure: true,
    httpOnly: true,
    domain: 'example.com',
  })
  const signed = await generateSignedCookie(
    'delicious_cookie',
    'macha',
    'secret chocolate chips',
    { path: '/', secure: true, httpOnly: true }
  )
  return c.text(`${cookie}\n${signed}`)
})

export default app
```

---

### css

CSS-in-JS(X) nativo do Hono (`hono/css`). Escreve CSS em template literal JSX e retorna o class name. O componente `<Style />` injeta o conteúdo CSS. JSX em si é coberto em [`10-jsx.md`](./10-jsx.md).

Implementação de [`hono/css`](official+docs/docs/helpers/css.md):

```ts
import { css, cx, keyframes, Style, createCssContext } from 'hono/css'
```

- `css` (Experimental): tagged template; retorna o class name. Suporta nesting selector `&` para pseudo-classes.
- `keyframes` (Experimental): escreve `@keyframes`; retorna o nome da animação.
- `cx` (Experimental): compõe dois class names (ou strings simples).
- `Style`: componente que contém o CSS gerado.
- `createCssContext` (Experimental): cria `css`, `cx`, `keyframes`, `viewTransition`, `Style` com contexto customizado (`id`, `classNameSlug`, `onInvalidSlug`).

Estender CSS embutindo o class name (`${baseClass}`) ou aninhar classes (`${baseClass} {}`). Estilos globais via pseudo-seletor `:-hono-global`, ou dentro de `<Style>{css\`...\`}</Style>`.

`classNameSlug(hash, label, css) => string` customiza o nome gerado (`css-1234567890` por padrão); `label` vem de um `/* comentário */` no início do template. `onInvalidSlug(slug) => void` define o comportamento se o slug for inválido.

Segurança: valores interpolados entram como **CSS cru**. Breakout para HTML é bloqueado (aspas, backslashes, `</`), mas `{`, `}` e `;` passam. Trate como outros raw sinks (`html`, `raw`, `rawCssString`) e valide contra allowlist.

```tsx
import { Hono } from 'hono'
import { css, cx, keyframes, Style, createCssContext } from 'hono/css'

const app = new Hono()

const { css: appCss } = createCssContext({
  id: 'my-app',
  classNameSlug: (hash, label) => (label ? `h-${label}` : hash),
})

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

app.get('/', (c) => {
  const headerClass = appCss`
    /* hero-section */
    background-color: orange;
    color: white;
    padding: 1rem;
    animation-name: ${fadeIn};
    animation-duration: 2s;
    &:hover { background-color: red; }
  `
  const primaryClass = appCss`
    background: orange;
  `
  return c.html(
    <html>
      <head>
        <Style />
      </head>
      <body>
        <h1 class={cx(headerClass, primaryClass)}>Hello!</h1>
      </body>
    </html>
  )
})

export default app
```

Com `secureHeaders`, adicione `nonce` ao `<Style nonce={c.get('secureHeadersNonce')} />` e configure `styleSrc: [NONCE]` para evitar bloqueio de CSP.

---

### dev

Métodos úteis em desenvolvimento.

Implementação de [`hono/dev`](official+docs/docs/helpers/dev.md):

```ts
import { getRouterName, showRoutes } from 'hono/dev'
```

- `getRouterName(app)`: retorna o nome do router em uso.
- `showRoutes(app, options?)`: imprime as rotas registradas no console.

| Opção | Tipo | Descrição |
|-------|------|-----------|
| `verbose` | `boolean` | Quando `true`, exibe informação detalhada. |
| `colorize` | `boolean` | Quando `false`, a saída não é colorida. |

```ts
import { Hono } from 'hono'
import { getRouterName, showRoutes } from 'hono/dev'

const app = new Hono().basePath('/v1')

app.get('/posts', (c) => c.text('index'))
app.get('/posts/:id', (c) => c.text(c.req.param('id')))
app.post('/posts', (c) => c.text('created'))

console.log(getRouterName(app))

showRoutes(app, {
  verbose: true,
  colorize: false,
})

export default app
```

---

### factory

Cria componentes do Hono (middleware, handlers, apps) com tipagem correta, evitando repetir o `Env`.

Implementação de [`hono/factory`](official+docs/docs/helpers/factory.md):

```ts
import { createFactory, createMiddleware } from 'hono/factory'
```

- `createFactory<Env>(options?)`: cria uma instância de Factory. Aceita `defaultAppOptions: HonoOptions` (repassado a `createApp()`) e `initApp: (app) => void` (inicializa o app).
- `createMiddleware()`: atalho de `factory.createMiddleware()`; cria middleware custom.
- `factory.createHandlers(...handlers)`: define handlers fora de `app.get('/')`.
- `factory.createApp()`: cria um `Hono` com os tipos do factory, definindo `Env` só uma vez.

`createMiddleware` (factory) é uma **função** que cria middleware tipado; não confundir com o middleware JWT nem com os middleware embutidos de [`06-middleware-embutidos.md`](./06-middleware-embutidos.md). Middleware em geral é coberto em [`05-middleware.md`](./05-middleware.md).

```ts
import { Hono } from 'hono'
import { createFactory, createMiddleware } from 'hono/factory'
import { logger } from 'hono/logger'

type Env = {
  Variables: {
    foo: string
  }
}

const factory = createFactory<Env>()

const factoryWithOptions = createFactory({
  defaultAppOptions: { strict: false },
})

const messageMiddleware = (message: string) => {
  return createMiddleware<Env>(async (c, next) => {
    await next()
    c.res.headers.set('X-Message', message)
  })
}

const middleware = factory.createMiddleware(async (c, next) => {
  c.set('foo', 'bar')
  await next()
})

const handlers = factory.createHandlers(logger(), middleware, (c) => {
  return c.json(c.var.foo)
})

const app = factory.createApp()

app.use(messageMiddleware('Good evening!'))
app.get('/api', ...handlers)

const appWithOptions = factoryWithOptions.createApp() // strict: false aplicado

export default app
```

`initApp` permite configurar o app criado por `createApp()`:

```ts
import { createFactory } from 'hono/factory'

type Env = {
  Bindings: { MY_DB: D1Database }
  Variables: { db: DrizzleD1Database }
}

export default createFactory<Env>({
  initApp: (app) => {
    app.use(async (c, next) => {
      const db = drizzle(c.env.MY_DB)
      c.set('db', db)
      await next()
    })
  },
})
```

---

### html

Escreve HTML em tagged template `html`; `raw()` insere conteúdo sem escape (escape manual é responsabilidade sua). O `html` retorna `HtmlEscapedString` e pode atuar como componente funcional.

Implementação de [`hono/html`](official+docs/docs/helpers/html.md):

```ts
import { html, raw } from 'hono/html'
```

```tsx
import { Hono } from 'hono'
import { html, raw } from 'hono/html'

const app = new Hono()

app.get('/:username', (c) => {
  const { username } = c.req.param()
  return c.html(
    html`<!doctype html>
      <h1>Hello! ${username}!</h1>`
  )
})

app.get('/', (c) => {
  const name = 'John &quot;Johnny&quot; Smith'
  return c.html(html`<p>I'm ${raw(name)}.</p>`)
})

app.get('/layout', (c) => {
  const Layout = (props: { title: string; children?: any }) => html`
    <html>
      <head><title>${props.title}</title></head>
      <body>${props.children}</body>
    </html>
  `
  return c.html(html`${Layout({ title: 'Home', children: html`<p>Hi</p>` })}`)
})

export default app
```

---

### jwt

Funções para codificar, decodificar, assinar e verificar JSON Web Tokens. Suporta múltiplos algoritmos criptográficos.

Implementação de [`hono/jwt`](official+docs/docs/helpers/jwt.md):

```ts
import { decode, sign, verify } from 'hono/jwt'
```

| Função | Assinatura |
|--------|------------|
| `sign` | `(payload: unknown, secret: string, alg?: AlgorithmTypes) => Promise<string>` (default `HS256`) |
| `verify` | `(token: string, secret: string, alg: AlgorithmTypes, issuer?: string \| RegExp, aud?: string \| string[] \| RegExp) => Promise<any>` |
| `decode` | `(token: string) => { header: any; payload: any }` (sem verificação) |

Este é o **helper** `jwt`. O **middleware** JWT é outro artefato, coberto em [`06-middleware-embutidos.md`](./06-middleware-embutidos.md); ambos importam de `hono/jwt`.

Validação de payload na verificação: `exp` (não expirado), `nbf` (não usado antes da hora), `iat` (não emitido no futuro), `iss` (issuer confiável), `aud` (audiência aceita quando `aud` é passado).

Erros customizados: `JwtAlgorithmNotImplemented`, `JwtTokenInvalid`, `JwtTokenNotBefore`, `JwtTokenExpired`, `JwtTokenIssuedAt`, `JwtTokenIssuer`, `JwtPayloadRequiresAud`, `JwtTokenAudience`, `JwtTokenSignatureMismatched`.

Algoritmos suportados (`AlgorithmTypes`): `HS256`, `HS384`, `HS512`, `RS256`, `RS384`, `RS512`, `PS256`, `PS384`, `PS512`, `ES256`, `ES384`, `ES512`, `EdDSA`.

```ts
import { Hono } from 'hono'
import { sign, verify, decode } from 'hono/jwt'

const app = new Hono()
const secret = 'mySecretKey'

app.get('/sign', async (c) => {
  const payload = {
    sub: 'user123',
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 60 * 5, // expira em 5 minutos
  }
  const token = await sign(payload, secret)
  return c.json({ token })
})

app.get('/verify/:token', async (c) => {
  try {
    const decodedPayload = await verify(
      c.req.param('token'),
      secret,
      'HS256',
      'https://example.com',
      'urn:example:client'
    )
    return c.json(decodedPayload)
  } catch (e) {
    return c.json({ error: (e as Error).name }, 401)
  }
})

app.get('/decode/:token', (c) => {
  const { header, payload } = decode(c.req.param('token'))
  return c.json({ header, payload })
})

export default app
```

---

### proxy

Funções para usar a aplicação Hono como (reverse) proxy. `proxy()` é um wrapper de `fetch()`; parâmetros e retorno iguais aos de `fetch`, exceto opções específicas.

Implementação de [`hono/proxy`](official+docs/docs/helpers/proxy.md):

```ts
import { proxy } from 'hono/proxy'
```

O header `Accept-Encoding` é substituído por um encoding que o runtime atual suporta; headers desnecessários da resposta são removidos; retorna um `Response` enviável pelo handler.

Tipo:

```ts
interface ProxyRequestInit extends Omit<RequestInit, 'headers'> {
  raw?: Request
  customFetch?: (request: Request) => Promise<Response>
  strictConnectionProcessing?: boolean
  headers?:
    | HeadersInit
    | [string, string][]
    | Record<RequestHeader, string | undefined>
    | Record<string, string | undefined>
}

interface ProxyFetch {
  (input: string | URL | Request, init?: ProxyRequestInit): Promise<Response>
}
```

`customFetch` sobrescreve o `fetch` global. Por padrão o `Connection` header é ignorado (previne Hop-by-Hop Header Injection); `strictConnectionProcessing: true` habilita conformidade estrita com RFC 9110 (use só em ambientes confiáveis).

```ts
import { Hono } from 'hono'
import { proxy } from 'hono/proxy'

const app = new Hono()
const originServer = 'example.com'

app.get('/proxy/:path', (c) => {
  return proxy(`http://${originServer}/${c.req.param('path')}`)
})

app.all('/proxy-complex/:path', async (c) => {
  const res = await proxy(`http://${originServer}/${c.req.param('path')}`, {
    ...c.req, // opcional; só encaminhe se precisar de todos os dados (incl. credenciais)
    headers: {
      ...c.req.header(),
      'X-Forwarded-For': '127.0.0.1',
      'X-Forwarded-Host': c.req.header('host'),
      Authorization: undefined, // não propague Authorization
    },
  })
  res.headers.delete('Set-Cookie')
  return res
})

export default app
```

---

### ssg

Gera um site estático a partir da aplicação: percorre as rotas registradas e salva o conteúdo como arquivos.

Implementação de [`hono/ssg`](official+docs/docs/helpers/ssg.md):

```ts
import { toSSG } from 'hono/ssg'
```

Assinaturas:

```ts
export interface ToSSGInterface {
  (app: Hono, fsModule: FileSystemModule, options?: ToSSGOptions): Promise<ToSSGResult>
}

export interface FileSystemModule {
  writeFile(path: string, data: string | Uint8Array): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void | string>
}

export interface ToSSGOptions {
  dir?: string
  concurrency?: number
  extensionMap?: Record<string, string>
  plugins?: SSGPlugin[]
}

export interface ToSSGResult {
  success: boolean
  files: string[]
  error?: Error
}
```

| Opção | Default | Descrição |
|-------|---------|-----------|
| `dir` | `./static` | Destino dos arquivos. |
| `concurrency` | `2` | Nº de arquivos gerados simultaneamente. |
| `extensionMap` | — | Mapa `Content-Type → extensão`. |
| `plugins` | `[defaultPlugin]` | Plugins de extensão do processo. |

Deno/Bun: `import { toSSG } from 'hono/deno'` / `'hono/bun'` e chame `toSSG(app, options?)`.

Mapeamento de rota → arquivo: `/` → `./static/index.html`; `/path` → `./static/path.html`; `/path/` → `./static/path/index.html`. Extensão depende do `Content-Type`; caminhos com barra final viram `index.ext`.

Middleware SSG: `ssgParams(promise)` (análogo a `generateStaticParams` do Next.js), `isSSGContext(c)` (retorna `true` em contexto SSG), `disableSSG()` (exclui rota), `onlySSG()` (após `toSSG`, vira `c.notFound()`). Plugins: hooks `beforeRequestHook` (`Request => Request | false`), `afterResponseHook` (`Response => Response | false`), `afterGenerateHook` (`(result) => void | Promise<void>`). `defaultPlugin` pula respostas não-200; `redirectPlugin()` gera páginas HTML de redirect (coloque antes do `defaultPlugin`).

```ts
// build.ts
import app from './index'
import fs from 'node:fs/promises'
import {
  toSSG,
  defaultPlugin,
  redirectPlugin,
  defaultExtensionMap,
  type SSGPlugin,
} from 'hono/ssg'

const getOnlyPlugin: SSGPlugin = {
  beforeRequestHook: (req) => (req.method === 'GET' ? req : false),
}

toSSG(app, fs, {
  dir: './static',
  concurrency: 4,
  extensionMap: {
    'application/x-html': 'html',
    ...defaultExtensionMap,
  },
  plugins: [redirectPlugin(), getOnlyPlugin, defaultPlugin],
}).then((result) => {
  if (!result.success) console.error(result.error)
  else console.log(result.files)
})
```

---

### streaming

Métodos para respostas em streaming.

Implementação de [`hono/streaming`](official+docs/docs/helpers/streaming.md):

```ts
import { stream, streamText, streamSSE } from 'hono/streaming'
```

- `stream(c, cb, onError?)`: streaming simples; `StreamingApi` com `write(Uint8Array)`, `writeln(text)`, `pipe(readable)`, `sleep(ms)`, `onAbort(cb)`, `aborted`.
- `streamText(c, cb, onError?)`: define `Content-Type: text/plain`, `Transfer-Encoding: chunked`, `X-Content-Type-Options: nosniff`.
- `streamSSE(c, cb, onError?)`: Server-Sent Events; `writeSSE({ data, event?, id?, retry? })`.

O terceiro argumento é um error handler opcional `(err, stream) => void`; sem ele, o erro vai para o console. O stream é fechado automaticamente após os callbacks. Se o callback lançar erro, o `onError` do Hono **não** dispara (a resposta já começou e não pode ser sobrescrita).

```ts
import { Hono } from 'hono'
import { stream, streamText, streamSSE } from 'hono/streaming'

const app = new Hono()
let id = 0

app.get('/stream', (c) => {
  return stream(
    c,
    async (s) => {
      s.onAbort(() => console.log('Aborted!'))
      await s.write(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]))
      await s.pipe(anotherReadableStream)
    },
    (err, s) => {
      s.writeln('An error occurred!')
      console.error(err)
    }
  )
})

app.get('/streamText', (c) => {
  c.header('Content-Encoding', 'Identity') // necessário em Cloudflare Workers/Wrangler
  return streamText(c, async (s) => {
    await s.writeln('Hello')
    await s.sleep(1000)
    await s.write('Hono!')
  })
})

app.get('/sse', async (c) => {
  return streamSSE(c, async (s) => {
    while (!s.aborted) {
      const message = `It is ${new Date().toISOString()}`
      await s.writeSSE({
        data: message,
        event: 'time-update',
        id: String(id++),
      })
      await s.sleep(1000)
    }
  })
})

export default app
```

---

### websocket

Helper para WebSockets server-side. Disponível para Cloudflare Workers/Pages, Deno, Bun e Node.js.

Import por runtime (de [`hono/websocket`](official+docs/docs/helpers/websocket.md)):

```ts
// Cloudflare Workers
import { upgradeWebSocket } from 'hono/cloudflare-workers'

// Deno
import { upgradeWebSocket } from 'hono/deno'

// Bun
import { upgradeWebSocket, websocket } from 'hono/bun'

// Node.js (WebSocket embutido no @hono/node-server; @hono/node-ws está deprecated)
import { serve, upgradeWebSocket } from '@hono/node-server'
import { WebSocketServer } from 'ws'
```

`upgradeWebSocket((c) => handlers)` retorna um handler para WebSocket. Eventos disponíveis: `onOpen` (não suportado no Cloudflare Workers), `onMessage`, `onClose`, `onError`.

Handlers suportam RPC mode: exporte `typeof wsApp` e, no cliente, use `hc<WebSocketApp>(url).ws.$ws()`.

Atenção: se usar middleware que modifica headers (ex.: CORS) na rota do WebSocket, pode ocorrer erro de headers imutáveis — `upgradeWebSocket()` também altera headers internamente.

```ts
// server.ts — Cloudflare Workers
import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/cloudflare-workers'

const app = new Hono()

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`)
        ws.send('Hello from server!')
      },
      onClose: () => {
        console.log('Connection closed')
      },
    }
  })
)

export default app
```

```ts
// Node.js
import { Hono } from 'hono'
import { serve, upgradeWebSocket } from '@hono/node-server'
import { WebSocketServer } from 'ws'

const app = new Hono()

app.get(
  '/ws',
  upgradeWebSocket(() => ({
    onMessage(event, ws) {
      ws.send(event.data)
    },
  }))
)

const wss = new WebSocketServer({ noServer: true })

serve({
  fetch: app.fetch,
  websocket: { server: wss },
})
```

```ts
// server.ts — RPC mode
const wsApp = app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {}
  })
)
export type WebSocketApp = typeof wsApp

// client.ts
import { hc } from 'hono/client'
import type { WebSocketApp } from './server'

const client = hc<WebSocketApp>('http://localhost:8787')
const socket = client.ws.$ws() // WebSocket object para o cliente
```

---

## Próximos passos

- [`06-middleware-embutidos.md`](./06-middleware-embutidos.md) — JWT middleware, CORS, secure headers, logger
- [`10-jsx.md`](./10-jsx.md) — JSX e integração com `css`/`html`
- [`11-testing.md`](./11-testing.md) — testing helper
- [`12-api-reference.md`](./12-api-reference.md) — referência de API do `Context` e `Hono`
