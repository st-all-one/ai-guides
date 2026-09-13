# Hono 4.x — Guia de Implementação (Otimizado para IA)

> Framework web **ultrafast**, sem dependências, construído sobre os **Web Standards**
> (`Request`/`Response`/`fetch`). O mesmo código roda no edge (Cloudflare Workers,
> Fastly), Deno, Bun, Node.js e serverless.
> Versão de referência: **4.13.7** (`npm:hono`, `jsr:@hono/hono`).
> Objetivo: guia denso de **COMO fazer**, cobrindo toda a doc oficial em português.

## Exemplo canônico (ponto de partida na raiz do projeto)

Estrutura mínima:

```
meu-app/
├── src/
│   └── index.ts     # app Hono
├── deno.json        # ou package.json
└── (ver entry point por runtime)
```

`src/index.ts`:

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

export default app
```

Esse é o núcleo de **todos** os tópicos deste guia: um `app`, uma rota e um
`Context` (`c`). Tudo o mais (middleware, validação, JSX, RPC) adiciona camadas
sobre esse mesmo formato.

### Entry point por runtime (mesmo `app`, transporte diferente)

Deno:

```ts
import { Hono } from 'jsr:@hono/hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Deno!'))

Deno.serve(app.fetch)
```

Bun:

```ts
export default {
  port: 3000,
  fetch: app.fetch,
}
```

Node.js (`@hono/node-server`):

```ts
import { serve } from '@hono/node-server'

serve(app, (info) => {
  console.log(`Listening on http://localhost:${info.port}`)
})
```

Cloudflare Workers:

```ts
export default app
```

Detalhes e todos os runtimes em [`14-deploy-runtimes.md`](./14-deploy-runtimes.md).

### Uso no projeto raiz (`mtr-site-atr`)

O projeto na raiz é **Deno + Fresh 2**. O `main.ts` usa `new App()` do Fresh, que
é **construído sobre o Hono** — a API de `app.get`, `app.use`, `ctx.next()`,
`ctx.req`/`ctx.state` segue os mesmos conceitos. Os padrões deste guia se aplicam
diretamente ao roteamento e ao middleware do projeto:

```ts
import { App, staticFiles } from 'fresh'
import { define, type State } from './utils.ts'

export const app = new App<State>()

app.use(staticFiles())

app.use(async (ctx) => {
  ctx.state.shared = 'hello'
  return await ctx.next()
})

app.get('/api2/:name', (ctx) => {
  const name = ctx.params.name ?? ''
  return new Response(`Hello, ${name}!`)
})

app.use(define.middleware((ctx) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`)
  return ctx.next()
}))

app.fsRoutes()
```

Ver a integração completa em [`19-padroes-avancados.md`](./19-padroes-avancados.md).

## Navegação

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [01-quickstart.md](./01-quickstart.md) | Instalação, `create-hono`, estrutura, primeiro app, entry points |
| 02 | [02-roteamento.md](./02-roteamento.md) | Métodos, params, wildcards, regex, `app.route`, routers |
| 03 | [03-contexto.md](./03-contexto.md) | `Context` (`c`): respostas, headers, status, `c.set/get`, `c.env` |
| 04 | [04-request-response.md](./04-request-response.md) | `HonoRequest`, body, headers, `Response` Web Standard |
| 05 | [05-middleware.md](./05-middleware.md) | Conceito, onion, `await next()`, middleware custom |
| 06 | [06-middleware-embutidos.md](./06-middleware-embutidos.md) | Os 24 middlewares nativos (`hono/<nome>`) |
| 07 | [07-helpers.md](./07-helpers.md) | `cookie`, `jwt`, `proxy`, `streaming`, `ssg`, `websocket`, `factory`, `html` |
| 08 | [08-validacao.md](./08-validacao.md) | `hono/validator`, Zod, Valibot, TypeBox, ArkType |
| 09 | [09-rpc-client.md](./09-rpc-client.md) | RPC tipado, `hc`, Hono Stacks |
| 10 | [10-jsx.md](./10-jsx.md) | JSX, `html`, `jsxRenderer`, `hono/jsx/dom` |
| 11 | [11-testing.md](./11-testing.md) | `app.request()`, `testClient`, Deno/Vitest |
| 12 | [12-api-reference.md](./12-api-reference.md) | Classe `Hono`, presets, `HTTPException` |
| 13 | [13-melhores-praticas.md](./13-melhores-praticas.md) | Boas práticas e DX |
| 14 | [14-deploy-runtimes.md](./14-deploy-runtimes.md) | Deploy e entry points por runtime |
| 15 | [15-seguranca.md](./15-seguranca.md) | Headers, CORS, CSRF, auth, cookies, limites |
| 16 | [16-exemplos.md](./16-exemplos.md) | Receitas oficiais (upload, webhook, OpenAPI, htmx) |
| 17 | [17-cheatsheet.md](./17-cheatsheet.md) | Referência rápida (rotas + context + API + opções) |
| 18 | [18-faq-troubleshooting.md](./18-faq-troubleshooting.md) | FAQ, armadilhas e erros comuns |
| 19 | [19-padroes-avancados.md](./19-padroes-avancados.md) | Arquitetura, tipagem, Fresh/Deno, performance |

## Modelo mental (leia antes de escrever handlers)

1. **App = roteador + pilha de middleware.** `new Hono()` cria o app; rotas são
   registradas por método (`app.get`, `app.post`, ...) e **a última rota que casa
   vence**, respeitando a ordem de registro.
2. **Web Standards por baixo.** `c.req.raw` é um `Request`; `c.res` e o retorno
   do handler são um `Response`. Hono apenas adiciona helpers por cima.
3. **`Context` (`c`) é por request.** Leia entrada (`c.req`), escreva saída
   (`c.json`/`c.text`/`c.html`) e guarde estado com `c.set`/`c.get`.
4. **Middleware em cebola.** Cada `await next()` executa o próximo da pilha; o
   código após o `next()` roda na volta. Ordem de registro importa.
5. **Tipos são cidadãos de primeira classe.** Params viram literais, `Env`
   (`Bindings`/`Variables`) tipa o contexto e o cliente `hc` infere a API inteira.
6. **Multi-runtime.** O corpo do handler é portável; só o *entry point* muda.

## Ordem prática de implementação

1. `npm create hono@latest` (ou `deno add jsr:@hono/hono`)
2. Escrever `src/index.ts` com `new Hono()` + primeira rota
3. Configurar o *entry point* do runtime (Deno/Node/Bun/Workers)
4. Adicionar rotas e ler `c.req.param/query/json`
5. Encadear middleware (`logger`, `cors`, `secureHeaders`, auth)
6. Validar entrada com `@hono/zod-validator` e usar `c.req.valid()`
7. Tipar bindings/variáveis com `new Hono<{ Bindings, Variables }>()`
8. Expor o tipo do app e consumir com `hc` no cliente
9. Testar com `app.request()` e `testClient`
10. Publicar no runtime alvo (ver `14-deploy-runtimes.md`)

## Convenções deste guia

- Conteúdo em português (pt-BR); termos técnicos em inglês (middleware, router,
  binding, helper).
- Código em TypeScript, com imports explícitos de `hono/<subpath>`.
- Exemplos são trechos reais da documentação oficial, encurtados.
- Use `VERSION` para a versão de referência e `SKILL.md` para metadados.
