# Cheatsheet

> Referência rápida de sintaxe, helpers e API. Volte ao guia para detalhes.

## Setup

```js
import { Eta } from "eta"
import path from "node:path"

const eta = new Eta({
  views: path.join(import.meta.dirname, "templates"),
  cache: true,
  debug: false,
})
```

## Tags

### Output escapado (seguro)

```eta
<%= it.name %>
```

### Output cru (HTML)

```eta
<%~ it.htmlContent %>
```

### Executar JavaScript

```eta
<% let x = 1 + 2 %>
```

### Comentário

```eta
<% /* isto é um comentário */ %>
```

### Condicional

```eta
<% if (it.show) { %>
  Visível!
<% } else { %>
  Escondido
<% } %>
```

### Loop em array

```eta
<% it.users.forEach(function(user) { %>
  <%= user.first %> <%= user.last %>
<% }) %>
```

### Loop em objeto

```eta
<% Object.keys(it.obj).forEach(function(key) { %>
  <%= it.obj[key] %>
<% }) %>
```

### Loop com `output()`

```eta
<% for (const item of it.items) { output("<li>" + item + "</li>") } %>
```

## Partials

```eta
<%~ include("./header") %>
<%~ include("./header", { title: "Home" }) %>
<%~ await includeAsync("./header") %>
```

## Layout

```eta
<% layout("./base") %>
<% layout("./base", { title: "Home" }) %>
```

## Blocks

```eta
<% /* filha: define */ %>
<% block("sidebar", () => { %>
  <nav>Minha sidebar</nav>
<% }) %>

<% /* layout: renderiza + fallback */ %>
<%~ block("sidebar", () => { %>
  <nav>Sidebar padrão</nav>
<% }) %>

<% /* async */ %>
<% blockAsync("data", async () => { %>...<% }) %>
<%~ await blockAsync("data") %>
```

## Capture

```eta
<% const fragment = capture(() => { %>
  <p>Conteúdo reutilizável</p>
<% }) %>
<%= fragment %>
<%= fragment %>
```

```eta
<% const data = await captureAsync(async () => { %>
  <%= await it.fetchData() %>
<% }) %>
<%~ data %>
```

## Custom tags

```js
// Config: customTags: { "#": () => "", "*": (key, data) => data[key.trim()] }
```

```eta
<%# comentário %>
<%* name %>
```

## Logging

```eta
<% console.log("Debug: " + it.value) %>
```

## Whitespace

```eta
<% /* remove 1 newline antes da tag */ %>
<%- = it.myname %>

<% /* remove 1 newline depois da tag */ %>
<%= it.name -%>

<% /* _ remove TODO o whitespace ao redor */ %>
<%_ _%>
```

## API

```js
eta.render("page", { title: "Home" })            // sync, arquivo
await eta.renderAsync("page", { title: "Home" }) // async, arquivo
eta.renderString("Hi <%= it.n %>", { n: "Ben" }) // sync, string
await eta.renderStringAsync("Hi <%= await it.f() %>", { f }) // async, string
eta.loadTemplate("@part", "<p><%= it.x %></p>")  // registra programática
eta.configure({ debug: true })                   // muta config atual
eta.withConfig({ cache: false })                 // nova instância derivada
```

## Erros

```ts
import { EtaError, EtaParseError, EtaRuntimeError,
         EtaFileResolutionError, EtaNameResolutionError } from "eta"
```

## Opções (resumo)

| Opção | Padrão | Nota |
|-------|--------|------|
| `views` | — | dir das templates |
| `cache` | `false` | `true` em prod |
| `debug` | `false` | `true` em dev |
| `autoEscape` | `true` | segurança |
| `autoFilter` | `false` | filtro global |
| `filterFunction` | `String(val)` | usado com `autoFilter` |
| `outputFunctionName` | `"output"` | nome da função de output |
| `tags` | `["<%","%>"]` | delimitadores |
| `varName` | `"it"` | nome dos dados |
| `useWith` | `false` | evite |
| `functionHeader` | `""` | extrai campos |
| `autoTrim` | `[false,"nl"]` | whitespace |
| `rmWhitespace` | `false` | remove linhas vazias |
| `customTags` | `{}` | prefixos custom |
| `defaultExtension` | `".eta"` | extensão |
| `cacheFilepaths` | `true` | cache de paths |
| `plugins` | `[]` | hooks |

## Helpers

| Helper | Retorna | Emite | Async |
|--------|---------|-------|-------|
| `output(str)` | `void` | sim | não |
| `capture(fn)` | `string` | não | não |
| `captureAsync(fn)` | `Promise<string>` | não | sim |
| `include(name[, data])` | `string` | via tag | não |
| `includeAsync(name[, data])` | `Promise<string>` | via tag | sim |
| `layout(name[, data])` | — | captura | não |
| `block(name[, fn])` | `string` | via tag | não |
| `blockAsync(name[, fn])` | `Promise<string>` | via tag | sim |
