# Integrações (Express, Fastify e ferramentas)

> Eta não tem integração de engine "nativa" com frameworks, mas a API de render
> é simples o bastante para plugar em qualquer servidor HTTP.
> Fontes oficiais: `resources/express`, `resources/fastify`, `resources/integrations`.

## Express.js

Eta **não** oferece mais o `app.engine()` pronto (removido no v3+), mas o uso
direto é trivial:

```js
import express from "express"
import path from "node:path"
import { Eta } from "eta"

const app = express()

const eta = new Eta({
  views: path.join(import.meta.dirname, "views"), // Deno: `${Deno.cwd()}/views/`
  cache: true,
})

app.get("/", (req, res) => {
  const renderedTemplate = eta.render("index", { title: "Hello", place: "there!" })
  res.status(200).send(renderedTemplate)
})

app.listen(3000, () => console.log("Server listening on port 3000"))
```

> `import.meta.dirname` exige Node 20.11+.

### Recriando o `res.render` (`app.engine`)

Se você quer o comportamento de `res.render` em toda a aplicação, registre um
engine que lê o arquivo e renderiza a string:

```js
import express from "express"
import path from "node:path"
import { Eta } from "eta"

const app = express()
const eta = new Eta({ views: path.join(import.meta.dirname, "views") })

app.engine("eta", buildEtaEngine())
app.set("view engine", "eta")

app.get("/", (req, res) => {
  res.render("home", { message: "Hello world !" })
})

app.listen(3000, () => console.log("Server listening on port 3000"))

function buildEtaEngine() {
  return (path, opts, callback) => {
    try {
      const fileContent = eta.readFile(path)
      const renderedTemplate = eta.renderString(fileContent, opts)
      callback(null, renderedTemplate)
    } catch (error) {
      callback(error)
    }
  }
}
```

> `eta.readFile` só existe no build Node/Deno (`eta`), não no `eta/core`.

## Fastify

Via plugin `@fastify/view`:

```js
import fastify from "fastify"
import fastifyView from "@fastify/view"
import { Eta } from "eta"
import path from "node:path"

const eta = new Eta()
const server = fastify()

server.register(fastifyView, {
  engine: { eta },
  templates: path.join(import.meta.dirname, "my-views"),
})

server.get("/", (req, res) => {
  // home route
})

server.listen({ port: 8888 }).then(() => {
  console.log("Example app listening on port 8888")
})
```

> Aqui o `Eta` é criado sem `views`; o plugin passa o caminho completo do
> template a cada render.

## Deno / `Deno.serve`

Ver [`10-deno-browser.md`](./10-deno-browser.md) para o exemplo completo com
`Deno.serve` e permissões.

## Frameworks e ferramentas de terceiros

As integrações abaixo **não** são oficialmente suportadas, verificadas para
segurança nem garantidas — podem estar desatualizadas em relação ao v4:

| Tipo | Integração |
|------|-----------|
| Framework | Opine |
| Framework | Alosaur |
| Framework | Fastify (`@fastify/view` / point-of-view) |
| Ferramenta | Rollup Plugin |
| Editor | Extensão VSCode |
| Lint | ESLint Plugin |
| Automação | Node-RED Flow |
| Middleware | Koa Middleware |

## Bundlers / pré-compilação

Sem loader dedicado, duas abordagens funcionam bem:

1. **Registrar em build** com `loadTemplate("@nome", source)` e distribuir
   apenas o bundle — evita filesystem e permite usar `eta/core` em
   edge/serverless.
2. **Loader genérico** (ex.: Webpack `html-loader` com `preprocessor`) que chama
   `eta.render(content, {}, { filename })` no momento do build.

```js
eta.loadTemplate("@home", "<h1><%= it.title %></h1>")
const html = eta.render("@home", { title: "Início" })
```

## Tutoriais e artigos

- ["I built a JS template engine 3x faster than EJS"](https://dev.to/nebrelbug/i-built-a-js-template-engine-3x-faster-than-ejs-lj8)
- Tutorial de plugins da série 2.x (código precisa de pequenos ajustes)

## Resumo de decisão

| Cenário | Abordagem |
|---------|-----------|
| Express simples | `eta.render()` direto no handler |
| Express com `res.render` | engine custom com `readFile` + `renderString` |
| Fastify | `@fastify/view` com `engine: { eta }` |
| Deno puro | `Deno.serve` + `eta.render` (ver arquivo 10) |
| Serverless/Edge | `loadTemplate` + `renderString` (`eta/core`) |
