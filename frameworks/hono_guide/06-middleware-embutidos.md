# Middleware embutidos

> Os 24 middlewares nativos do pacote `hono`, importáveis de `hono/<nome>`.
> Sem dependências externas e prontos para produção; a ordem de registro define
> a execução (ver [`05-middleware.md`](./05-middleware.md)).

| Middleware | Import |
|------------|--------|
| `basicAuth` | `hono/basic-auth` |
| `bearerAuth` | `hono/bearer-auth` |
| `bodyLimit` | `hono/body-limit` |
| `cache` | `hono/cache` |
| `some`, `every`, `except` | `hono/combine` |
| `compress` | `hono/compress` |
| `contextStorage` | `hono/context-storage` |
| `cors` | `hono/cors` |
| `csrf` | `hono/csrf` |
| `etag` | `hono/etag` |
| `ipRestriction` | `hono/ip-restriction` |
| `jsxRenderer` | `hono/jsx-renderer` |
| `jwk` | `hono/jwk` |
| `jwt` | `hono/jwt` |
| `languageDetector` | `hono/language` |
| `logger` | `hono/logger` |
| `methodNotAllowed` | `hono/method-not-allowed` |
| `methodOverride` | `hono/method-override` |
| `prettyJSON` | `hono/pretty-json` |
| `requestId` | `hono/request-id` |
| `secureHeaders` | `hono/secure-headers` |
| `timeout` | `hono/timeout` |
| `timing` | `hono/timing` |
| `appendTrailingSlash` / `trimTrailingSlash` | `hono/trailing-slash` |

## basicAuth

Aplica autenticação **Basic** a um path; lida com o esquema
`WWW-Authenticate`/`Authorization` por você.

```ts
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `username` | `string` | — | **obrigatório** — usuário que autentica |
| `password` | `string` | — | **obrigatório** — senha do usuário |
| `realm` | `string` | `"Secure Area"` | domínio do realm no header `WWW-Authenticate` |
| `hashFunction` | `Function` | — | função de hash para comparação segura de senhas |
| `verifyUser` | `(username: string, password: string, c: Context) => boolean \| Promise<boolean>` | — | verifica o usuário; `true` aceita |
| `invalidUserMessage` | `string \| object \| MessageFunction` | — | mensagem custom quando inválido |
| `onAuthSuccess` | `(c: Context, username: string) => void \| Promise<void>` | — | callback após sucesso (evita reparsear o header) |
| `...users` | `{ username: string, password: string }[]` | — | usuários adicionais (2º+ argumentos) |

`MessageFunction` é `(c: Context) => string | object | Promise<string | object>`.

```ts
const app = new Hono()

app.use(
  '/auth/*',
  basicAuth({
    username: 'hono',
    password: 'acoolproject',
    onAuthSuccess: (c, username) => {
      c.set('username', username)
    },
  })
)

// múltiplos usuários — só o 1º objeto define realm/hashFunction etc.
app.use(
  '/admin/*',
  basicAuth(
    { username: 'hono', password: 'acoolproject', realm: 'www.example.com' },
    { username: 'hono-admin', password: 'super-secure' }
  )
)
```

## bearerAuth

Autentica verificando um API token no header `Authorization: Bearer {token}`.

```ts
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
```

> O `token` deve casar com `/[A-Za-z0-9._~+/-]+=*/`, senão retorna `400`. A regex
> aceita Base64 URL-safe e padrão — o token **não** precisa ser JWT.

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `token` | `string \| string[]` | — | **obrigatório** — token(s) válido(s) |
| `realm` | `string` | `""` | domínio do realm no `WWW-Authenticate` |
| `prefix` | `string` | `"Bearer"` | prefixo (schema) do header |
| `headerName` | `string` | `Authorization` | nome do header |
| `hashFunction` | `Function` | — | hash para comparação segura |
| `verifyToken` | `(token: string, c: Context) => boolean \| Promise<boolean>` | — | verifica o token |
| `noAuthenticationHeader` | `object` | — | `{ wwwAuthenticateHeader, message }` — erro sem header |
| `invalidAuthenticationHeader` | `object` | — | `{ wwwAuthenticateHeader, message }` — formato inválido |
| `invalidToken` | `object` | — | `{ wwwAuthenticateHeader, message }` — token inválido |

```ts
const app = new Hono()
const token = 'honoiscool'

app.use('/api/*', bearerAuth({ token }))

// múltiplos tokens: leitura com qualquer um, escrita só com o privilegiado
const readToken = 'read'
const privilegedToken = 'read+write'
app.on('GET', '/api/page/*', (c, next) =>
  bearerAuth({ token: [readToken, privilegedToken] })(c, next)
)
app.on('POST', '/api/page/*', (c, next) =>
  bearerAuth({ token: privilegedToken })(c, next)
)
```

## bodyLimit

Limita o tamanho do corpo da requisição. Usa `Content-Length`; se ausente, lê o
stream e dispara `onError` ao exceder.

```ts
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `maxSize` | `number` | `100 * 1024` (100kb) | **obrigatório** — tamanho máximo em bytes |
| `onError` | `OnError` | — | handler chamado ao exceder |

```ts
const app = new Hono()

app.post(
  '/upload',
  bodyLimit({
    maxSize: 50 * 1024, // 50kb
    onError: (c) => c.text('overflow :(', 413),
  }),
  async (c) => {
    const body = await c.req.parseBody()
    if (body['file'] instanceof File) {
      console.log(`Got file sized: ${body['file'].size}`)
    }
    return c.text('pass :)')
  }
)
```

> No Bun, o limite de `Bun.serve` é `128MiB` por padrão e corta antes do Hono
> (o `onError` não roda). Para corpos maiores, ajuste `maxRequestBodySize`.

## cache

Cacheia respostas usando a [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache).
Suportado em Cloudflare Workers (domínios custom) e Deno 1.26+/Deno Deploy.

```ts
import { Hono } from 'hono'
import { cache } from 'hono/cache'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `cacheName` | `string \| (c: Context) => string \| Promise<string>` | — | **obrigatório** — nome do cache |
| `wait` | `boolean` | `false` | aguarda `cache.put` resolver (**obrigatório `true` no Deno**) |
| `cacheControl` | `string` | — | diretivas do header `Cache-Control`; sem valor, não adiciona header |
| `vary` | `string \| string[]` | — | header `Vary`; mescla com o existente; `*` gera erro |
| `keyGenerator` | `(c: Context) => string \| Promise<string>` | `c.req.url` | gera chaves no store |
| `maxQueryBodySize` | `number` | `65536` (64 KiB) | corpo máx. de QUERY cacheável; acima disso bypassa |
| `cacheableStatusCodes` | `number[]` | `[200]` | status que podem ser cacheados |
| `onCacheNotAvailable` | `((reason: string) => void \| Promise<void>) \| false` | log via `console.log` | comportamento quando a Cache API não existe |

```ts
app.get(
  '*',
  cache({
    cacheName: 'my-app',
    cacheControl: 'max-age=3600',
    wait: true, // obrigatório no Deno
    cacheableStatusCodes: [200, 404, 412],
  })
)
```

> QUERY requests usam chave interna `/.hono/cache?__hono_cache_key=...`; purge
> via `caches.delete()` precisa considerar isso.

## combine

Combina vários middlewares em um. Expõe `some`, `every` e `except`.

```ts
import { Hono } from 'hono'
import { some, every, except } from 'hono/combine'
```

| Helper | Comportamento |
|--------|---------------|
| `some(...mws)` | roda o **primeiro** que passar; se um sai com sucesso, os seguintes não rodam |
| `every(...mws)` | roda **todos** em ordem; para se algum falhar |
| `except(condition, ...mws)` | roda os middlewares **exceto** quando a condição casa (string/array/function) |

```ts
import { bearerAuth } from 'hono/bearer-auth'
import { ipRestriction } from 'hono/ip-restriction'
import { rateLimit } from '@/my-rate-limit'

app.use(
  '*',
  some(
    every(
      ipRestriction(getConnInfo, { allowList: ['192.168.0.2'] }),
      bearerAuth({ token })
    ),
    // se as duas condições acima passarem, rateLimit não executa
    rateLimit()
  )
)

// exceto em rotas públicas, exige token
app.use('/api/*', except('/api/public/*', bearerAuth({ token })))
```

## compress

Comprime o corpo da resposta conforme `Accept-Encoding`.

```ts
import { Hono } from 'hono'
import { compress } from 'hono/compress'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `encoding` | `'gzip' \| 'deflate'` | ambos (gzip priorizado) | esquema permitido |
| `threshold` | `number` | `1024` | tamanho mínimo (bytes) para comprimir |
| `contentTypeFilter` | `RegExp \| (contentType: string) => boolean` | lista interna | decide pelo `Content-Type` |

```ts
import {
  compress,
  COMPRESSIBLE_CONTENT_TYPE_REGEX,
} from 'hono/compress'

app.use(compress({ threshold: 1024 }))

// só JSON
app.use(compress({ contentTypeFilter: /^application\/json/ }))

// default + tipo custom
app.use(
  compress({
    contentTypeFilter: (type) =>
      COMPRESSIBLE_CONTENT_TYPE_REGEX.test(type) ||
      type === 'application/x-myformat',
  })
)
```

> Em Cloudflare Workers e Deno Deploy a compressão é automática — o middleware é
> desnecessário.

## contextStorage

Guarda o `Context` no `AsyncLocalStorage` para acesso global, fora do handler.

```ts
import { Hono } from 'hono'
import {
  contextStorage,
  getContext,
  tryGetContext,
} from 'hono/context-storage'
```

Sem opções. `getContext()` retorna o `Context` atual (ou lança);
`tryGetContext()` retorna `undefined` se indisponível. Em Cloudflare Workers,
habilite a flag `nodejs_compat`/`nodejs_als`.

```ts
type Env = {
  Variables: {
    message: string
  }
}

const app = new Hono<Env>()

app.use(contextStorage())

app.use(async (c, next) => {
  c.set('message', 'Hello!')
  await next()
})

const getMessage = () => getContext<Env>().var.message

app.get('/', (c) => c.text(getMessage()))
```

## cors

Habilita CORS. Deve ser registrado **antes** das rotas.

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `origin` | `string \| string[] \| (origin: string, c: Context) => string` | `*` | `Access-Control-Allow-Origin` |
| `allowMethods` | `string[] \| (origin: string, c: Context) => string[]` | `['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'QUERY']` | `Access-Control-Allow-Methods` |
| `allowHeaders` | `string[]` | `[]` | `Access-Control-Allow-Headers` |
| `maxAge` | `number` | — | `Access-Control-Max-Age` |
| `credentials` | `boolean` | — | `Access-Control-Allow-Credentials` |
| `exposeHeaders` | `string[]` | `[]` | `Access-Control-Expose-Headers` |

```ts
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

// múltiplas origens / callback dinâmico
app.use(
  '/api3/*',
  cors({
    origin: (origin) => (origin.endsWith('.example.com') ? origin : 'http://example.com'),
  })
)
```

> Com Vite, desative o CORS embutido: `server: { cors: false }` no `vite.config.ts`.

## csrf

Protege contra CSRF checando `Origin` **e** `Sec-Fetch-Site` (basta um validar).
Só valida métodos inseguros (não GET/HEAD/OPTIONS) com content types de form
(`application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`).

```ts
import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `origin` | `string \| string[] \| Function` | mesma origem da request | origens permitidas; `Function` = `(origin, c) => boolean` |
| `secFetchSite` | `string \| string[] \| Function` | `'same-origin'` | valores permitidos de `Sec-Fetch-Site`; `Function` = `(secFetchSite, c) => boolean` |

Valores de `Sec-Fetch-Site`: `same-origin`, `same-site`, `cross-site`, `none`.

```ts
app.use(csrf())
app.use(csrf({ origin: ['https://myapp.example.com', 'https://dev.myapp.example.com'] }))
app.use(csrf({ secFetchSite: ['same-origin', 'none'] }))

app.use(
  '*',
  csrf({
    origin: (origin) => /https:\/\/(\w+\.)?myapp\.example\.com$/.test(origin),
  })
)
```

> Nunca use forward match no `origin`. Browsers antigos sem `Origin` podem falhar;
> nesse caso use tokens CSRF.

## etag

Adiciona headers `ETag` e trata respostas `304`.

```ts
import { Hono } from 'hono'
import { etag } from 'hono/etag'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `weak` | `boolean` | `false` | se `true`, prefixa o valor com `w/` (weak validation) |
| `retainedHeaders` | `string[]` | `RETAINED_304_HEADERS` | headers mantidos na resposta `304` |
| `generateDigest` | `(body: Uint8Array) => ArrayBuffer \| Promise<ArrayBuffer>` | SHA-1 | gera o digest |

Headers retidos por padrão (`RETAINED_304_HEADERS`): `Cache-Control`,
`Content-Location`, `Date`, `ETag`, `Expires`, `Vary`.

```ts
import { etag, RETAINED_304_HEADERS } from 'hono/etag'

app.use('/etag/*', etag())
app.use(
  '/etag2/*',
  etag({ weak: true, retainedHeaders: ['x-message', ...RETAINED_304_HEADERS] })
)
```

## ipRestriction

Limita acesso por IP. O 1º argumento é o `getConnInfo` do runtime; o 3º é um
handler de erro opcional.

```ts
import { Hono } from 'hono'
import { ipRestriction } from 'hono/ip-restriction'
```

| Parâmetro/Opção | Tipo | Padrão | Descrição |
|-----------------|------|--------|-----------|
| `getConnInfo` | helper do runtime | — | ex.: `hono/bun`, `hono/deno` |
| `denyList` | `string[]` | — | regras a **negar** |
| `allowList` | `string[]` | — | regras a **permitir** |
| erro (3º arg) | `(remote, c) => Response` | `403` | customiza a resposta de bloqueio |

Regras: IP estático (`192.168.2.0`, `::1`), CIDR (`192.168.2.0/24`, `::1/10`) e
`*` (todos).

```ts
import { getConnInfo } from 'hono/bun'

app.use(
  '*',
  ipRestriction(getConnInfo, {
    denyList: [],
    allowList: ['127.0.0.1', '::1'],
  })
)

app.use(
  '*',
  ipRestriction(
    getConnInfo,
    { denyList: ['192.168.2.0/24'] },
    async (remote, c) => c.text(`Blocking access from ${remote.addr}`, 403)
  )
)
```

## jsxRenderer

Configura o layout do `c.render()` sem `c.setRenderer()`, expõe `useRequestContext()`
e suporta layouts aninhados e streaming.

```ts
import { Hono } from 'hono'
import { jsxRenderer, useRequestContext } from 'hono/jsx-renderer'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `docType` | `boolean \| string` | `'<!DOCTYPE html>'` | `false` remove; string define o DOCTYPE |
| `stream` | `boolean \| Record<string, string>` | `false` | renderiza com streaming; Record customiza headers |

Também aceita uma função `(c: Context) => Options` para opções dinâmicas.

Headers adicionados com `stream: true`:
`Transfer-Encoding: chunked`, `Content-Type: text/html; charset=UTF-8`,
`Content-Encoding: Identity`.

```jsx
app.use(
  '/page/*',
  jsxRenderer(({ children }) => {
    return (
      <html>
        <body>
          <header>Menu</header>
          <div>{children}</div>
        </body>
      </html>
    )
  })
)

app.get('/page/about', (c) => c.render(<h1>About me!</h1>))
```

Layouts aninhados via `Layout`, e `useRequestContext()` dentro de componentes:

```tsx
blog.use(
  jsxRenderer(({ children, Layout }) => (
    <Layout>
      <nav>Blog Menu</nav>
      <div>{children}</div>
    </Layout>
  ))
)

const RequestUrlBadge: FC = () => {
  const c = useRequestContext()
  return <b>{c.req.url}</b>
}
```

> `useRequestContext()` exige a opção JSX `react-jsx` (não funciona com
> `precompile` do Deno). Para passar props extras, estenda `ContextRenderer`.

## jwk

Autentica verificando tokens com JWK (JSON Web Key). Aceita `Authorization` ou
cookie configurado, valida `kid`, rejeita algoritmos simétricos e checa `nbf`,
`exp`, `iat` (e opcionalmente `iss`, `aud`).

```ts
import { Hono } from 'hono'
import { jwk } from 'hono/jwk'
import { verifyWithJwks } from 'hono/jwt'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `alg` | `AsymmetricAlgorithm[]` | — | **obrigatório** — `RS256/384/512`, `PS256/384/512`, `ES256/384/512`, `EdDSA` |
| `keys` | `HonoJsonWebKey[] \| (c: Context) => Promise<HonoJsonWebKey[]>` | — | chaves públicas ou função |
| `jwks_uri` | `string \| (c: Context) => Promise<string>` | — | busca JWKs (`keys`) nessa URI |
| `allow_anon` | `boolean` | `false` | permite request sem token válido |
| `cookie` | `string` | — | nome do cookie de onde extrair o token |
| `headerName` | `string` | `Authorization` | header do token |
| `realm` | `string` | URL da request | realm do `WWW-Authenticate` (401) |
| `verification` | `VerifyOptions` | — | validação de claims |

`VerifyOptions`: `iss: string | RegExp` (só checa se definido);
`aud: string | string[] | RegExp` (exige `aud` se definido);
`nbf: boolean` (`true`), `iat: boolean` (`true`), `exp: boolean` (`true`).
O 2º argumento de `jwk()` é um `RequestInit` usado só no fetch do JWKS.

```ts
app.use(
  '/auth/*',
  jwk({
    jwks_uri: `https://${backendServer}/.well-known/jwks.json`,
    alg: ['RS256'],
  })
)

app.get('/auth/page', (c) => {
  const payload = c.get('jwtPayload')
  return c.json(payload) // { sub, name, iat, ... }
})
```

Uso fora do middleware:

```ts
const id_payload = await verifyWithJwks(
  id_token,
  {
    jwks_uri: 'https://your-auth-server/.well-known/jwks.json',
    allowedAlgorithms: ['RS256'],
  },
  { cf: { cacheEverything: true, cacheTtl: 3600 } }
)
```

## jwt

Autentica verificando um token JWT. Checa `Authorization` (ou o cookie/header
configurado). O header do cliente deve ter schema (`Bearer ...`).

```ts
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import type { JwtVariables } from 'hono/jwt'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `secret` | `string` | — | **obrigatório** — chave secreta |
| `alg` | `string` | — | **obrigatório** — `HS256/384/512`, `RS256/384/512`, `PS256/384/512`, `ES256/384/512`, `EdDSA` |
| `cookie` | `string` | — | cookie de onde extrair o token |
| `headerName` | `string` | `Authorization` | header do token |
| `realm` | `string` | URL da request | realm do `WWW-Authenticate` (401) |
| `verification` | `VerifyOptions` | — | `iss`, `aud`, `nbf` (`true`), `iat` (`true`), `exp` (`true`) |

```ts
type Variables = JwtVariables
const app = new Hono<{ Variables: Variables }>()

app.use(
  '/auth/*',
  jwt({
    secret: 'it-is-very-secret',
    alg: 'HS256',
    verification: { iss: 'my-trusted-issuer', aud: 'my-api' },
  })
)

app.get('/auth/page', (c) => c.json(c.get('jwtPayload')))

// secret vindo do ambiente
app.use('/auth2/*', (c, next) =>
  jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next)
)
```

## language

Detecta o idioma preferido do usuário e disponibiliza em `c.get('language')`.
Fontes: querystring, cookie, header e segmento de path.

```ts
import { Hono } from 'hono'
import { languageDetector } from 'hono/language'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `supportedLanguages` | `string[]` | `['en']` | **obrigatório** — códigos permitidos (inclui o fallback) |
| `fallbackLanguage` | `string` | `'en'` | **obrigatório** — idioma padrão |
| `order` | `DetectorType[]` | `['querystring', 'cookie', 'header']` | sequência de detecção |
| `debug` | `boolean` | `false` | loga os passos |
| `lookupQueryString` | `string` | `'lang'` | nome do parâmetro de query |
| `lookupCookie` | `string` | `'language'` | nome do cookie |
| `lookupFromHeaderKey` | `string` | `'accept-language'` | nome do header |
| `lookupFromPathIndex` | `number` | `0` | índice do segmento de path |
| `caches` | `CacheType[] \| false` | `['cookie']` | cache da detecção (`false` desliga) |
| `ignoreCase` | `boolean` | `true` | matching case-insensitive |
| `convertDetectedLanguage` | `(lang: string) => string` | — | transforma o código detectado |
| `cookieOptions.path` | `string` | `'/'` | path do cookie |
| `cookieOptions.sameSite` | `'Strict' \| 'Lax' \| 'None'` | `'Strict'` | SameSite |
| `cookieOptions.secure` | `boolean` | `true` | só HTTPS |
| `cookieOptions.maxAge` | `number` | `31536000` | expiração em segundos (1 ano) |
| `cookieOptions.httpOnly` | `boolean` | `true` | inacessível via JS |
| `cookieOptions.domain` | `string` | `undefined` | domínio do cookie |

```ts
app.use(
  languageDetector({
    supportedLanguages: ['en', 'ar', 'ja'], // deve incluir o fallback
    fallbackLanguage: 'en',
    order: ['path', 'cookie', 'querystring', 'header'],
    lookupFromPathIndex: 0, // /en/profile → 'en'
  })
)

app.get('/', (c) => c.text(`Hello! Your language is ${c.get('language')}`))
```

`fallbackLanguage` precisa estar em `supportedLanguages` (senão lança na
inicialização) e `lookupFromPathIndex` deve ser ≥ 0. Matching progressivo:
`zh-Hant-CN` → tenta `zh-Hant`, depois `zh`.

## logger

Logger simples de requests/response com status colorido e tempo decorrido.

```ts
import { Hono } from 'hono'
import { logger } from 'hono/logger'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `fn` | `PrintFunc(str: string, ...rest: string[])` | `console.log` | função de impressão custom |

Loga method + path na entrada e method + path + status + tempo na saída. Defina
`NO_COLOR` para desabilitar cores.

```ts
app.use(logger())

const customLogger = (message: string, ...rest: string[]) => {
  console.log(message, ...rest)
}
app.use(logger(customLogger))
```

## methodNotAllowed

Retorna `405 Method Not Allowed` com header `Allow` quando o path casa mas o
método não. Sem ele, o Hono devolve `404`.

```ts
import { Hono } from 'hono'
import { methodNotAllowed } from 'hono/method-not-allowed'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `app` | `Hono` | — | **obrigatório** — instância para coletar métodos por path |
| `onMethodNotAllowed` | `(c: Context, allowedMethods: string[]) => Response \| Promise<Response>` | `405` + `Allow` | gera a resposta custom |

```ts
const app = new Hono()

app.use(methodNotAllowed({ app }))

app.get('/hello', (c) => c.text('Hello!'))
app.post('/hello', (c) => c.text('Posted!'))
// PUT /hello -> 405, Allow: GET, HEAD, POST

app.use(
  methodNotAllowed({
    app,
    onMethodNotAllowed: (c, methods) =>
      c.json({ error: 'Method Not Allowed' }, 405, { Allow: methods.join(', ') }),
  })
)
```

## methodOverride

Executa o handler de um método diferente do método real da request, com base em
form, header ou query (útil para forms HTML, que não enviam `DELETE`/`PUT`).

```ts
import { Hono } from 'hono'
import { methodOverride } from 'hono/method-override'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `app` | `Hono` | — | **obrigatório** |
| `form` | `string` | `_method` | chave do form com o nome do método |
| `header` | `string` | — | nome do header com o método |
| `query` | `string` | — | chave de query com o método |

```ts
const app = new Hono()

app.use('/posts', methodOverride({ app }))

app.delete('/posts', () => {
  // ...
})

// variações
app.use('/posts2', methodOverride({ app, form: '_custom_name' }))
app.use('/posts3', methodOverride({ app, header: 'X-METHOD-OVERRIDE' }))
app.use('/posts4', methodOverride({ app, query: '_method' }))
```

```html
<form action="/posts" method="POST">
  <input type="hidden" name="_method" value="DELETE" />
  <input type="text" name="id" />
</form>
```

## prettyJSON

Habilita *pretty print* em respostas JSON com `?pretty` na query.

```ts
import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `space` | `number` | `2` | espaços de indentação |
| `query` | `string` | `pretty` | nome do parâmetro de query |
| `force` | `boolean` | `false` | se `true`, sempre prettifica |

```ts
const app = new Hono()

app.use(prettyJSON()) // ou prettyJSON({ space: 4 })
app.get('/', (c) => c.json({ message: 'Hono!' }))
```

## requestId

Gera um ID único por request, disponível em `c.get('requestId')`.

```ts
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `limitLength` | `number` | `255` | comprimento máximo do ID |
| `headerName` | `string` | `X-Request-Id` | header de entrada/saída; `''` desabilita reaproveitar |
| `generator` | `(c: Context) => string` | `crypto.randomUUID()` | função geradora |

```ts
import type { RequestIdVariables } from 'hono/request-id'

const app = new Hono<{ Variables: RequestIdVariables }>()

app.use('*', requestId())

app.get('/', (c) => c.text(`Your request id is ${c.get('requestId')}`))
```

> Se a request trouxer `X-Request-Id`, o middleware reutiliza o valor. No Node.js
> anterior ao 20, defina `generator` (o adapter Node já expõe `crypto`).

## secureHeaders

Configura headers de segurança, inspirado no Helmet. Cada opção liga/desliga ou
sobrescreve um header; `false` remove/substitui pelo default seguro.

| Opção | Header | Valor | Padrão |
|-------|--------|-------|--------|
| — | `X-Powered-By` | (remove header) | `True` |
| `contentSecurityPolicy` | `Content-Security-Policy` | objeto CSP (ver abaixo) | não definido |
| `contentSecurityPolicyReportOnly` | `Content-Security-Policy-Report-Only` | objeto CSP | não definido |
| `trustedTypes` | `Trusted-Types` (CSP) | diretiva CSP | não definido |
| `requireTrustedTypesFor` | `Require-Trusted-Types-For` (CSP) | diretiva CSP | não definido |
| `crossOriginEmbedderPolicy` | `Cross-Origin-Embedder-Policy` | `require-corp` | `False` |
| `crossOriginResourcePolicy` | `Cross-Origin-Resource-Policy` | `same-origin` | `True` |
| `crossOriginOpenerPolicy` | `Cross-Origin-Opener-Policy` | `same-origin` | `True` |
| `originAgentCluster` | `Origin-Agent-Cluster` | `?1` | `True` |
| `referrerPolicy` | `Referrer-Policy` | `no-referrer` | `True` |
| `reportingEndpoints` | `Reporting-Endpoints` | array de endpoints | não definido |
| `reportTo` | `Report-To` | array de grupos | não definido |
| `strictTransportSecurity` | `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | `True` |
| `xContentTypeOptions` | `X-Content-Type-Options` | `nosniff` | `True` |
| `xDnsPrefetchControl` | `X-DNS-Prefetch-Control` | `off` | `True` |
| `xDownloadOptions` | `X-Download-Options` | `noopen` | `True` |
| `xFrameOptions` | `X-Frame-Options` | `SAMEORIGIN` | `True` |
| `xPermittedCrossDomainPolicies` | `X-Permitted-Cross-Domain-Policies` | `none` | `True` |
| `xXssProtection` | `X-XSS-Protection` | `0` | `True` |
| `permissionPolicy` | `Permissions-Policy` | objeto (ver abaixo) | não definido |

Sub-opções de CSP incluem `defaultSrc`, `baseUri`, `childSrc`, `connectSrc`,
`fontSrc`, `formAction`, `frameAncestors`, `frameSrc`, `imgSrc`, `manifestSrc`,
`mediaSrc`, `objectSrc`, `reportTo`, `reportUri`, `sandbox`, `scriptSrc`,
`scriptSrcAttr`, `scriptSrcElem`, `styleSrc`, `styleSrcAttr`, `styleSrcElem`,
`upgradeInsecureRequests`, `workerSrc`.

```ts
app.use(secureHeaders())

app.use(
  '*',
  secureHeaders({
    xFrameOptions: false,
    xXssProtection: false,
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  })
)

app.use(
  '/test',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
    reportingEndpoints: [
      { name: 'endpoint-1', url: 'https://example.com/reports' },
    ],
  })
)
```

`nonce` com `NONCE` e `SecureHeadersVariables`:

```tsx
import { secureHeaders, NONCE } from 'hono/secure-headers'
import type { SecureHeadersVariables } from 'hono/secure-headers'

const app = new Hono<{ Variables: SecureHeadersVariables }>()

app.get(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      scriptSrc: [NONCE, 'https://allowed1.example.com'],
    },
  })
)

app.get('/', (c) =>
  c.html(<script src='/js/client.js' nonce={c.get('secureHeadersNonce')} />)
)
```

`permissionsPolicy`:

```ts
app.use(
  '*',
  secureHeaders({
    permissionsPolicy: {
      fullscreen: ['self'], // fullscreen=(self)
      camera: false, // camera=none
      microphone: true, // microphone=*
      payment: ['self', 'https://example.com'],
    },
  })
)
```

> Ordem importa com middlewares que mexem no mesmo header: `secureHeaders()`
> antes de `poweredBy()` remove o `X-Powered-By`; depois, o mantém.

## timeout

Aplica um tempo máximo à request, com opção de resposta de erro custom.

```ts
import { Hono } from 'hono'
import { timeout } from 'hono/timeout'
```

Assinatura: `timeout(duration: number, exception?: ...)`. Duração em
milissegundos; sem `exception`, lança `HTTPException(408)`.

```ts
import { HTTPException } from 'hono/http-exception'

app.use('/api', timeout(5000))

const customTimeoutException = (context) =>
  new HTTPException(408, {
    message: `Request timeout after waiting ${context.req.headers.get('Duration')} seconds.`,
  })

app.use('/api/long-process', timeout(60000, customTimeoutException))
```

> Não funciona com streaming; use `stream.close` + `setTimeout`. Cuidado com a
> ordem em relação a middlewares de erro/timing.

## timing

Adiciona métricas de performance no header `Server-Timing`.

```ts
import { Hono } from 'hono'
import {
  timing,
  setMetric,
  startTime,
  endTime,
  wrapTime,
} from 'hono/timing'
import type { TimingVariables } from 'hono/timing'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `total` | `boolean` | `true` | mostra o tempo total da resposta |
| `enabled` | `boolean \| (c: Context) => boolean` | `true` | liga/desliga os timings |
| `totalDescription` | `boolean` | `Total Response Time` | descrição do tempo total |
| `autoEnd` | `boolean` | — | encerra timers abertos ao fim da request |
| `crossOrigin` | `boolean \| string \| (c: Context) => boolean \| string` | `false` | origem que pode ler o header |

```ts
const app = new Hono<{ Variables: TimingVariables }>()

app.use(timing())

app.get('/', async (c) => {
  setMetric(c, 'region', 'europe-west3')
  setMetric(c, 'custom', 23.8, 'My custom Metric')

  startTime(c, 'db')
  const data = await db.findMany(/* ... */)
  endTime(c, 'db')

  // ou: await wrapTime(c, 'db', db.findMany(...))
  return c.json({ response: data })
})
```

> Em Cloudflare Workers as métricas podem ser imprecisas (timers refletem a
> última I/O).

## trailing-slash

Trata a barra final em requests `GET`: `appendTrailingSlash` adiciona,
`trimTrailingSlash` remove — via redirect quando o conteúdo não é encontrado
(status `404`).

```ts
import { Hono } from 'hono'
import {
  appendTrailingSlash,
  trimTrailingSlash,
} from 'hono/trailing-slash'
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `alwaysRedirect` | `boolean` | `false` | redireciona antes dos handlers (útil p/ wildcard `*`) |
| `skip` | `(path: string) => boolean` | — | se `true`, pula o redirect para o path |

```ts
const app = new Hono({ strict: true })

app.use(appendTrailingSlash())
app.get('/about/me/', (c) => c.text('With Trailing Slash'))

app.use(trimTrailingSlash({ alwaysRedirect: true }))
app.get('/my-path/*', (c) => c.text('Wildcard route'))

app.use(appendTrailingSlash({ skip: (path) => /\.\w+$/.test(path) }))
```

## Próximos passos

- [`05-middleware.md`](./05-middleware.md) — conceito, ordem e middleware próprio
- [`07-helpers.md`](./07-helpers.md) — `factory`, `createMiddleware`, helpers
- [`15-seguranca.md`](./15-seguranca.md) — auth, CSRF, headers de segurança
- [`17-cheatsheet.md`](./17-cheatsheet.md) — referência rápida de imports/opções
