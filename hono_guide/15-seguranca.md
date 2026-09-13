# Segurança

> Segurança no Hono é **ordem de middleware + defaults seguros**: registre os guards
> antes das rotas, trate toda entrada como não confiável e devolva erros que **não
> vazem** internos. Para a referência completa de opções de cada middleware, consulte
> [`06-middleware-embutidos.md`](./06-middleware-embutidos.md).

## Modelo mental de ameaças no edge

No edge cada requisição cruza uma fronteira de confiança: headers, body, cookies,
path params e querystring chegam de fora. O papel do app é **negar por padrão** e
só abrir o necessário. Os pontos de controle são:

| Superfície | Vetor | Defesa |
|------------|-------|--------|
| Headers de resposta | clickjacking, MIME sniffing, XSS, downgrade p/ HTTP | `secureHeaders` |
| Cross-origin | leitura indevida de respostas e envio de credenciais | `cors` |
| Form POST | CSRF | `csrf` |
| `Authorization` | token roubado, forjado ou replay | `basicAuth` / `bearerAuth` / `jwt` / `jwk` |
| Cookies | roubo via JS, MITM, tamper | `hono/cookie` (`httpOnly`, `secure`, `sameSite`, signed, prefixos) |
| Body | payload gigante, exaustão de memória/tempo | `bodyLimit` |
| IP de origem | acesso a `/admin`, `/internal` | `ipRestriction` |
| Dados de entrada | shape/tipo inválidos, injection | `validator` (ver [`08-validacao.md`](./08-validacao.md)) |
| Resposta de erro | stack trace, mensagem interna, segredo | `app.onError` |

Regras que valem para todas as seções:

1. **Ordem define execução.** Middleware registrado primeiro roda primeiro; guards
   precisam vir **antes** das rotas (`05-middleware.md`).
2. **Segredos vêm do ambiente**, nunca hardcoded: `c.env.JWT_SECRET`, `c.env.CORS_ORIGIN`.
3. **Defaults são o ponto de partida**, não o fim: revise CSP, origens e limites
   por rota.

## Ordem de registro recomendada

```ts
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { csrf } from 'hono/csrf'
import { cors } from 'hono/cors'
import { bodyLimit } from 'hono/body-limit'
import { bearerAuth } from 'hono/bearer-auth'
import { ipRestriction } from 'hono/ip-restriction'
import { getConnInfo } from 'hono/bun'

const app = new Hono()

app.use(secureHeaders())
app.use(csrf())
app.use('/api/*', cors({ origin: 'https://app.example.com', credentials: true }))
app.use('/upload', bodyLimit({ maxSize: 5 * 1024 * 1024 }))
app.use('/admin/*', ipRestriction(getConnInfo, { allowList: ['10.0.0.0/8'] }))
app.use('/api/*', bearerAuth({ token: 'honoiscool' }))
```

## Headers de segurança (`secureHeaders`)

`secureHeaders()` aplica o conjunto ótimo por padrão (inspirado no Helmet). Cada
opção liga/desliga (`false`) ou sobrescreve um header com string/objeto. Opções de
CSP e `permissionsPolicy` estão detalhadas em `06-middleware-embutidos.md`.

Headers com impacto direto de segurança:

| Header | Default do middleware | Por que importa |
|--------|----------------------|-----------------|
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | força HTTPS e bloqueia downgrade |
| `X-Frame-Options` | `SAMEORIGIN` | impede clickjacking; `DENY` bloqueia qualquer iframe |
| `Content-Security-Policy` | não definido | restringe origens de script/style/frame |
| `X-Content-Type-Options` | `nosniff` | impede MIME sniffing |
| `Referrer-Policy` | `no-referrer` | evita vazar URL de origem |
| `Cross-Origin-Opener-Policy` | `same-origin` | isola contextos de browsing |
| `Cross-Origin-Resource-Policy` | `same-origin` | impede carregamento cross-origin |
| `Permissions-Policy` | não definido | desliga câmera/microfone/geolocation etc. |
| `X-Powered-By` | remove | não expõe stack/tecnologia |

> A ordem importa quando outro middleware mexe no mesmo header: `secureHeaders()`
> **antes** de `poweredBy()` remove o `X-Powered-By`; depois, o mantém.

Exemplo completo com CSP restritiva, HSTS com `preload`, `X-Frame-Options: DENY`
e `Permissions-Policy` negando features:

```ts
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

const app = new Hono()

app.use(
  '*',
  secureHeaders({
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
    xFrameOptions: 'DENY',
    xXssProtection: '0',
    referrerPolicy: 'no-referrer',
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      frameSrc: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https:'],
      upgradeInsecureRequests: [],
      workerSrc: ["'self'"],
    },
    permissionsPolicy: {
      camera: false,
      microphone: false,
      geolocation: false,
      payment: ['self', 'https://example.com'],
    },
  })
)
```

### CSP com `nonce`

Adicione `NONCE` a `scriptSrc`/`styleSrc` e leia o valor em `c.get('secureHeadersNonce')`
(tipado por `SecureHeadersVariables`). Para gerar você mesmo, passe um
`ContentSecurityPolicyOptionHandler`.

```tsx
import { Hono } from 'hono'
import { secureHeaders, NONCE } from 'hono/secure-headers'
import type { SecureHeadersVariables } from 'hono/secure-headers'

const app = new Hono<{ Variables: SecureHeadersVariables }>()

app.use(
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

## CORS seguro

`cors()` deve ser registrado **antes** das rotas. O default de `origin` é `*`;
para APIs autenticadas use **allowlist explícita** (`string`, `string[]`) ou uma
função que só devolva origens conhecidas. A doc associa `credentials: true` a uma
`origin` explícita — **nunca** combine credenciais com `origin: '*'`.

| Necessidade | Opção | Padrão |
|-------------|-------|--------|
| Quem pode ler a resposta | `origin` | `*` |
| Métodos aceitos no preflight | `allowMethods` | `['GET','HEAD','PUT','POST','DELETE','PATCH','QUERY']` |
| Headers aceitos | `allowHeaders` | `[]` |
| Cache do preflight | `maxAge` | — |
| Enviar cookies/credenciais | `credentials` | — |
| Headers legíveis pelo cliente | `exposeHeaders` | `[]` |

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use(
  '/api/*',
  cors({
    origin: ['https://app.example.com', 'https://admin.example.com'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
  })
)

app.all('/api/abc', (c) => c.json({ success: true }))
```

Origem dinâmica validada por sufixo (note o **match ancorado**, não forward):

```ts
app.use(
  '/api2/*',
  cors({
    origin: (origin) =>
      origin.endsWith('.example.com') ? origin : 'https://app.example.com',
  })
)
```

Configuração dependente de ambiente, sem o app conhecer o runtime:

```ts
app.use('*', async (c, next) => {
  const corsMiddlewareHandler = cors({
    origin: c.env.CORS_ORIGIN,
  })
  return corsMiddlewareHandler(c, next)
})
```

> Com Vite, desative o CORS embutido (`server: { cors: false }` em
> `vite.config.ts`) para não conflitar com o middleware do Hono.

## CSRF

`csrf()` protege checando `Origin` **e** `Sec-Fetch-Site` — basta uma validação
passar. Ele só valida requests de **métodos inseguros** (não GET/HEAD/OPTIONS) com
content types de form (`application/x-www-form-urlencoded`, `multipart/form-data`
ou `text/plain`).

- `origin` aceita `string | string[] | Function`. Default: **mesma origem** da URL.
- `secFetchSite` aceita `string | string[] | Function`. Default: `'same-origin'`.
- Valores de `Sec-Fetch-Site`: `same-origin`, `same-site`, `cross-site`, `none`.
- **Nunca** faça forward match no `origin`; ancore o protocolo e o fim da string.
- Browsers antigos que não enviam `Origin`, ou proxies que removem o header, podem
  falhar — nesses ambientes use método por **token CSRF**.

```ts
import { Hono } from 'hono'
import { csrf } from 'hono/csrf'

const app = new Hono()

app.use(csrf())

app.use(
  '*',
  csrf({
    origin: (origin) => /https:\/\/(\w+\.)?myapp\.example\.com$/.test(origin),
  })
)

app.use(
  csrf({
    secFetchSite: (secFetchSite, c) => {
      if (secFetchSite === 'same-origin') return true
      if (secFetchSite === 'cross-site' && c.req.path.startsWith('/webhook/')) {
        return true
      }
      return false
    },
  })
)
```

## Autenticação

Fluxo comum: o cliente envia o header `Authorization` (ou o cookie configurado),
o middleware valida **antes** do handler e disponibiliza dados no `Context`.

### Basic (`basicAuth`)

Para `/auth/*`; use `verifyUser` para checar credenciais dinamicamente,
`hashFunction` para comparação segura e `onAuthSuccess` para gravar no contexto
sem reparsear o header. Múltiplos usuários: apenas o 1º objeto define
`realm`/`hashFunction`.

```ts
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'

const app = new Hono()

app.use(
  '/auth/*',
  basicAuth({
    realm: 'www.example.com',
    verifyUser: async (username, password, c) =>
      username === 'hono' && password === c.env.BASIC_PASSWORD,
    onAuthSuccess: (c, username) => {
      c.set('username', username)
    },
  })
)

app.get('/auth/page', (c) => c.text('You are authorized'))
```

### Bearer (`bearerAuth`)

O token deve casar com `/[A-Za-z0-9._~+/-]+=*/`, senão retorna `400`. Aceita
`token: string | string[]`; `verifyToken` valida dinamicamente. Para separar
leitura de escrita, monte middlewares por método.

```sh
curl -H 'Authorization: Bearer honoiscool' http://localhost:8787/auth/page
```

```ts
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'

const app = new Hono()

const readToken = 'read'
const privilegedToken = 'read+write'
const privilegedMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

app.on('GET', '/api/page/*', (c, next) =>
  bearerAuth({ token: [readToken, privilegedToken] })(c, next)
)
app.on(privilegedMethods, '/api/page/*', (c, next) =>
  bearerAuth({ token: privilegedToken })(c, next)
)

app.get('/api/page', (c) => c.json({ message: 'You are authorized' }))
```

### JWT (`jwt`)

O header precisa ter schema (`Bearer my.token.value` ou `Basic my.token.value`).
O middleware checa `Authorization` (ou o cookie/`headerName` configurado), valida a
assinatura e expõe o payload em `c.get('jwtPayload')`. `alg` é obrigatório.

Claims validados por padrão em `verification`: `nbf` (`true`), `iat` (`true`) e
`exp` (`true`). `iss` só é checado se definido; `aud`, se definido, **exige** um
`aud` no token com ao menos um valor casando.

| Claim | Verificação | Default |
|-------|-------------|---------|
| `exp` | expiração | `true` |
| `nbf` | not before | `true` |
| `iat` | issued at (não no futuro) | `true` |
| `iss` | emissor confiável | só se definido |
| `aud` | audiência aceita | só se definido |

```ts
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import type { JwtVariables } from 'hono/jwt'

type Variables = JwtVariables

const app = new Hono<{ Variables: Variables }>()

app.use(
  '/auth/*',
  jwt({
    secret: 'it-is-very-secret',
    alg: 'HS256',
    verification: {
      iss: 'my-trusted-issuer',
      aud: 'my-api',
    },
  })
)

app.get('/auth/page', (c) => {
  const payload = c.get('jwtPayload')
  return c.json(payload)
})
```

Segredo vindo do ambiente (o middleware é uma função comum):

```ts
app.use('/auth2/*', (c, next) =>
  jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next)
)
```

**Emissão e `exp`.** Use o helper `sign` para gerar tokens com expiração curta:

```ts
import { sign, verify, decode } from 'hono/jwt'

const payload = {
  sub: 'user123',
  role: 'admin',
  exp: Math.floor(Date.now() / 1000) + 60 * 5, // expira em 5 minutos
}
const token = await sign(payload, 'mySecretKey')

const decodedPayload = await verify(token, 'mySecretKey', 'HS256')
const { header, payload: inspected } = decode(token)
```

Tipos de erro do módulo (úteis para não vazar detalhes): `JwtAlgorithmNotImplemented`,
`JwtTokenInvalid`, `JwtTokenNotBefore`, `JwtTokenExpired`, `JwtTokenIssuedAt`,
`JwtTokenIssuer`, `JwtPayloadRequiresAud`, `JwtTokenAudience`,
`JwtTokenSignatureMismatched`.

**Rotação.** Como `verify` recebe um único `secret`, a rotação limpa de chaves é
feita com **chaves assimétricas + `kid`** via `jwk`: o emissor publica múltiplas
chaves no JWKS e o middleware seleciona a chave pelo `kid` do header, permitindo
sobrepor a chave nova à antiga durante a transição.

### JWK (`jwk`) para JWKS remoto

Valida tokens com JWK; para cada token:

- parseia/valida o formato do header JWT;
- **exige `kid`** e acha a chave correspondente por `kid`;
- **rejeita algoritmos simétricos** (`HS256`, `HS384`, `HS512`);
- exige que o `alg` do header esteja na allowlist `alg`;
- se a JWK tiver `alg`, ele precisa casar com o do header;
- verifica a assinatura com a chave encontrada;
- valida `nbf`, `exp` e `iat` por padrão; `iss`/`aud` se configurados.

`alg` aceita apenas assimétricos: `RS256/384/512`, `PS256/384/512`,
`ES256/384/512`, `EdDSA`. O 2º argumento de `jwk()` é um `RequestInit` usado **só**
no fetch do JWKS.

```ts
import { Hono } from 'hono'
import { jwk } from 'hono/jwk'
import { verifyWithJwks } from 'hono/jwt'

const app = new Hono()

app.use(
  '/auth/*',
  jwk(
    {
      jwks_uri: (c) => `https://${c.env.authServer}/.well-known/jwks.json`,
      alg: ['RS256'],
      verification: { iss: 'https://auth.example.com', aud: 'my-api' },
    },
    {
      headers: { Authorization: 'Bearer TOKEN' },
    }
  )
)

app.get('/auth/page', (c) => c.json(c.get('jwtPayload')))
```

Acesso anônimo opcional com `allow_anon: true` (cheque `c.get('jwtPayload')`):

```ts
app.use(
  '/auth-optional/*',
  jwk({
    jwks_uri: `https://${backendServer}/.well-known/jwks.json`,
    alg: ['RS256'],
    allow_anon: true,
  })
)

app.get('/auth-optional/page', (c) => {
  const payload = c.get('jwtPayload')
  return c.json(payload ?? { message: 'hello anon' })
})
```

Fora do middleware (SSR, outros runtimes), use `verifyWithJwks`:

```ts
const id_payload = await verifyWithJwks(
  id_token,
  {
    jwks_uri: 'https://your-auth-server/.well-known/jwks.json',
    allowedAlgorithms: ['RS256'],
  },
  {
    cf: { cacheEverything: true, cacheTtl: 3600 },
  }
)
```

## Cookies seguros

O helper `hono/cookie` segue as best practices de `RFC6265bis-13` e `CHIPS-01`.
Para segurança, sempre combine `httpOnly` (bloqueia acesso via JS), `secure`
(só HTTPS) e um `sameSite` restritivo.

| Opção | Uso de segurança |
|-------|------------------|
| `httpOnly: true` | cookie inacessível a `document.cookie` |
| `secure: true` | só trafega em HTTPS |
| `sameSite: 'Strict' \| 'Lax' \| 'None'` | limita envio cross-site |
| `prefix: 'secure' \| 'host'` | exige `__Secure-`/`__Host-` |
| `maxAge` / `expires` | validade limitada |
| `signed` (via `setSignedCookie`) | detecta tamper com HMAC SHA-256 |
| `partitioned: true` | isolamento CHIPS |

```ts
import { Hono } from 'hono'
import {
  setCookie,
  getCookie,
  deleteCookie,
  setSignedCookie,
  getSignedCookie,
  generateSignedCookie,
} from 'hono/cookie'

const app = new Hono()

app.get('/cookie', async (c) => {
  const secret = c.env.COOKIE_SECRET // string longa o suficiente para ser segura

  setCookie(c, 'session', 'value', {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Strict',
    maxAge: 60 * 60,
  })

  await setSignedCookie(c, 'fortune_cookie', 'lots-of-money', secret, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Strict',
    prefix: 'host', // vira __Host-fortune_cookie
  })

  const value = getCookie(c, 'session')
  const signed = await getSignedCookie(c, secret, 'fortune_cookie', 'host')
  if (!signed) {
    // `false` = assinatura inválida; `undefined` = formato/ausência
  }

  const raw = await generateSignedCookie('cookie', 'value', secret, {
    secure: true,
    httpOnly: true,
  })

  deleteCookie(c, 'session', { path: '/', secure: true })
  return c.json({ value, raw })
})
```

> O helper **lança `Error`** ao parsear/setar cookies quando: nome começa com
> `__Secure-` sem `secure`; `__Host-` sem `secure`; `__Host-` com `path !== '/'`;
> `__Host-` com `domain` definido; `maxAge` maior que 400 dias; ou `expires` mais
> de 400 dias no futuro. `setSignedCookie`/`getSignedCookie` são **assíncronos**.

## Limitação de corpo (`bodyLimit`) e DoS

`bodyLimit` limita o tamanho do body. Ele usa primeiro o `Content-Length`; se
ausente, lê o stream e chama `onError` ao exceder `maxSize` (default `100 * 1024`
= 100kb). Aplique em toda rota que lê body, com limites menores onde o caso de uso
permite.

```ts
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

const app = new Hono()

app.post(
  '/upload',
  bodyLimit({
    maxSize: 50 * 1024, // 50kb
    onError: (c) => {
      return c.text('overflow :(', 413)
    },
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

> No Bun, `Bun.serve` corta em **128MiB** antes do Hono (o `onError` do middleware
> não roda). Para aceitar mais, ajuste `maxRequestBodySize` no `Bun.serve`; mas
> para defesa contra DoS, mantenha o limite baixo em vez de aumentá-lo.

## `ipRestriction`

Limita acesso por IP. O 1º argumento é o `getConnInfo` **do runtime**
(`hono/bun`, `hono/deno`, …); o 3º é um handler de erro opcional.

- Regras IPv4: `192.168.2.0`, CIDR `192.168.2.0/24`, `*` (todos).
- Regras IPv6: `::1`, CIDR `::1/10`, `*` (todos).

```ts
import { Hono } from 'hono'
import { getConnInfo } from 'hono/bun'
import { ipRestriction } from 'hono/ip-restriction'

const app = new Hono()

app.use(
  '/admin/*',
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

> `denyList` tem precedência de bloqueio; use `allowList` para o default deny.
> Escolha o `getConnInfo` do ambiente de execução correto (Deno usa
> `hono/deno`) — ver [`14-deploy-runtimes.md`](./14-deploy-runtimes.md).

## Validação de entrada como defesa

Nunca confie no shape dos dados: valide e use **somente** o valor retornado. O
`validator` de `hono/validator` é middleware e a leitura continua via
`c.req.valid(target)`. Detalhes e integrações (Zod, Standard Schema, Valibot) em
[`08-validacao.md`](./08-validacao.md).

Pontos críticos de segurança:

- Para `json`/`form`, a request **precisa** do `content-type` correspondente,
  senão o callback recebe `{}`.
- Em `validator('header', ...)`, as chaves vêm em **lowercase**
  (`idempotency-key`, não `Idempotency-Key`).

```ts
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

app.post(
  '/api',
  validator('header', (value, c) => {
    const idempotencyKey = value['idempotency-key']
    if (idempotencyKey == undefined || idempotencyKey === '') {
      throw new HTTPException(400, { message: 'Idempotency-Key is required' })
    }
    return { idempotencyKey }
  }),
  validator('json', (value, c) => {
    const body = value as { body?: unknown }
    if (typeof body.body !== 'string') {
      return c.text('Invalid!', 400)
    }
    return { body: body.body }
  }),
  (c) => {
    const { body } = c.req.valid('json')
    const { idempotencyKey } = c.req.valid('header')
    return c.json({ idempotencyKey, body }, 201)
  }
)
```

## Evitar vazar erros internos (`onError`)

`app.onError` captura erros não tratados e devolve uma `Response` custom. Se um
app pai e as rotas tiverem handlers, os **da rota** têm prioridade. Para
`HTTPException`, use `err.getResponse()` (não ciente do `Context` — reaplique
headers manualmente se precisar). Para qualquer outro erro, **logue e devolva 500
genérico**, sem `err.message`/stack.

```ts
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(err)
  return c.text('Internal Server Error', 500)
})
```

```ts
app.notFound((c) => {
  return c.text('Custom 404 Message', 404)
})
```

## Checklist de produção

- [ ] `secureHeaders()` registrado, com CSP e `Permissions-Policy` revisadas.
- [ ] HSTS ativo e `upgradeInsecureRequests` na CSP.
- [ ] `X-Frame-Options` adequado (`DENY` se não houver iframe legítimo).
- [ ] `cors` com allowlist explícita; `credentials` **nunca** com `origin: '*'`.
- [ ] `csrf()` ativo; webhooks validados por função ancorada ou token CSRF.
- [ ] Segredos em `c.env` (`JWT_SECRET`, `COOKIE_SECRET`, `BASIC_PASSWORD`).
- [ ] `jwt` com `exp` curto e `verification` de `iss`/`aud`; rotação via `jwk`/`kid`.
- [ ] `jwk` com `alg` assimétrico allowlistado e `jwks_uri` em HTTPS.
- [ ] Cookies com `httpOnly`, `secure`, `sameSite` e prefixo `__Host-`/`__Secure-`.
- [ ] `bodyLimit` em toda rota que lê body; limite baixo por padrão.
- [ ] `ipRestriction` em rotas administrativas/internas.
- [ ] `validator` em todas as entradas; só usar o valor validado.
- [ ] `app.onError` devolvendo 500 genérico; sem stack/mensagem interna.
- [ ] `logger`/observabilidade sem logar tokens, cookies ou senhas.

## Próximos passos

- [`06-middleware-embutidos.md`](./06-middleware-embutidos.md) — referência de opções de todos os middlewares
- [`08-validacao.md`](./08-validacao.md) — `validator`, Zod, Standard Schema
- [`14-deploy-runtimes.md`](./14-deploy-runtimes.md) — `getConnInfo` e segredos por runtime
- [`17-cheatsheet.md`](./17-cheatsheet.md) — imports e opções em referência rápida
