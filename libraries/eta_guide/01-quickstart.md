# Quickstart

> Do zero ao primeiro render em 2 minutos. Este arquivo acompanha o
> **exemplo canônico** de `00-index.md`.

## 1. Instalação

```bash
npm install eta
```

Deno (JSR, preferido):

```ts
import { Eta } from "jsr:@bgub/eta"
```

> Eta v4 é **ESM-only**. Consumo via `require()` (CJS) não é suportado; use
> `import` ou importação dinâmica `await import("eta")`.

## 2. Estrutura de diretórios

```
meu-projeto/
├── templates/
│   └── simple.eta
└── main.js
```

`templates/simple.eta`:

```eta
Hi <%= it.name %>!
```

## 3. Instanciar o engine

Eta é exportado como **classe**. É obrigatório instanciar antes de usar:

```js
import { Eta } from "eta"
const eta = new Eta(options) // options é opcional
```

Configuração mínima recomendada (Node ESM):

```js
import { Eta } from "eta"
import path from "node:path"

const eta = new Eta({
  views: path.join(import.meta.dirname, "templates"),
})
```

> `import.meta.dirname` exige **Node 20.11+**. Em versões anteriores use
> `new URL(".", import.meta.url)` + `fileURLToPath`, ou `process.cwd()`.

## 4. Renderizar

```js
const res = eta.render("./simple", { name: "Ben" })
console.log(res) // Hi Ben!
```

- 1º argumento = nome/caminho da template, **relativo ao `views`**.
- 2º argumento = dados, disponíveis como `it` dentro da template.

## 5. Async

```js
const res = await eta.renderAsync("simple", { name: "Ben" })
```

`renderAsync` retorna uma Promise — use `await` ou `.then()`.

## 6. Renderizar strings (sem arquivo)

```js
const res = eta.renderString("Hello <%= it.name %>", { name: "Ben" })
// => "Hello Ben"

const res2 = await eta.renderStringAsync(
  "Hello <%= await it.someFunction() %>",
  { someFunction: () => Promise.resolve("Ben") },
)
```

## 7. Templates programáticas (`loadTemplate`)

Use quando a template não é um arquivo em `views`. O nome **precisa** começar
com `@` para o Eta não tentar resolvê-la no filesystem:

```js
const headerPartial = `
  <header>
    <h1><%= it.title %></h1>
  </header>
`

eta.loadTemplate("@header", headerPartial)

// uso posterior:
const out = eta.render("@header", { title: "Home" })
```

Terceiro argumento opcional descreve async:

```js
eta.loadTemplate("@data", "x = <%= await it.f() %>", { async: true })
```

> Por padrão `loadTemplate` assume template **síncrona**.

## 8. Deno

```ts
import { Eta } from "jsr:@bgub/eta"

const viewpath = `${Deno.cwd()}/views/`
const eta = new Eta({ views: viewpath, cache: true })

res.send(eta.render("home", { title: "that's my title" }))
```

## 9. Browser

Importe o build core (sem filesystem):

```html
<script type="module">
  import { Eta } from "eta/core"
  const eta = new Eta()
  document.body.innerHTML = eta.renderString("Hi <%= it.name %>!", { name: "Ben" })
</script>
```

## Opções mais usadas no dia a dia

| Opção | Padrão | Quando mudar |
|-------|--------|--------------|
| `views` | — | **Sempre**, se renderizar arquivos `.eta` |
| `cache` | `false` | `true` em produção (recompila só uma vez) |
| `debug` | `false` | `true` em dev (erros formatados) |
| `autoEscape` | `true` | Manter `true` por segurança |
| `varName` | `"it"` | Se preferir outro nome (ex.: `data`) |
| `tags` | `["<%", "%>"]` | Se as tags colidirem com HTML/framework |

Referência completa: [`07-configuracao.md`](./07-configuracao.md).

## Próximos passos

- [`02-sintaxe.md`](./02-sintaxe.md) — todas as tags
- [`03-partials.md`](./03-partials.md) — `include()`
- [`05-layouts-blocks.md`](./05-layouts-blocks.md) — layout + blocks
- [`08-api.md`](./08-api.md) — API completa
