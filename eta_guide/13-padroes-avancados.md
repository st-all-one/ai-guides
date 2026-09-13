# Padrões Avançados

> Como estruturar projetos reais com Eta: organização, composição, i18n,
> performance, integração HTTP e tipagem.

## Organização de diretórios

```
meu-projeto/
├── templates/
│   ├── layouts/
│   │   └── base.eta
│   ├── partials/
│   │   ├── header.eta
│   │   └── footer.eta
│   └── pages/
│       ├── home.eta
│       └── about.eta
├── src/
│   └── server.ts
└── package.json
```

- `views` aponta para `templates/`.
- Páginas chamam `layout("../layouts/base")` e `include("../partials/header")`.
- Partial de página pode ser registrada programaticamente (`@nome`) para
  hot-reload sem tocar o filesystem.

## Composição em camadas

```
home.eta  ──layout──▶  layouts/base.eta
   │                         ▲
   ├─ include partials/header
   ├─ block("head")
   └─ block("scripts")
```

Fluxo recomendado:

1. `layout("./layouts/base")` no topo da página.
2. Blocks para `<head>`, scripts e sidebars.
3. `include()` para cabeçalho, footer, breadcrumbs.
4. `capture()` para fragmentos usados mais de uma vez.
5. `it.body` no layout para o conteúdo principal.

## i18n

### Com customTags (sintaxe própria)

```js
const eta = new Eta({
  customTags: {
    "*": (key, data) => data.t(key.trim()),
  },
})
```

```eta
<p><%* greeting %></p>
```

### Com função no `it` (recomendado — participa do escape)

```js
eta.renderString("<p><%= it.t('greeting') %></p>", {
  t: (k) => translations[lang][k],
})
```

`customTags` **não** escapa; `it.t()` com `<%=` escapa. Prefira a segunda forma
se o texto vier de fonte externa.

## Performance

| Prática | Efeito |
|---------|--------|
| `cache: true` em produção | compila cada template 1x |
| `debug: false` | remove custo de formatação de erro |
| Evitar `useWith: true` | acesso a `it` é mais rápido que with-scope |
| `functionHeader` para campos | menos lookups em `it` |
| `capture()` em vez de re-`include` | renderiza 1x |
| Evitar recalcular em loops | mova cálculo para o código JS |
| `autoEscape` ligado | segurança > micro-ganho |

### Evite recomputar no template

```eta
<% /* RUIM: calcula a cada iteração */ %>
<% it.items.forEach(i => { %><li><%= it.format(i) %></li><% }) %>

<% /* BOM: pré-computa no JS */ %>
<% const items = it.items.map(i => it.format(i)) %>
```

## Integração HTTP

> Exemplos detalhados de Express e Fastify em
> [`14-integracoes.md`](./14-integracoes.md).

### Deno (`Deno.serve`)

```ts
import { Eta } from "jsr:@bgub/eta"

const eta = new Eta({ views: `${Deno.cwd()}/templates/`, cache: true })

Deno.serve((req) => {
  const url = new URL(req.url)

  if (url.pathname === "/") {
    const html = eta.render("pages/home", { title: "Início" })
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }

  return new Response("Not found", { status: 404 })
})
```

### Node (http/express/fastify)

```js
import { Eta } from "eta"
import path from "node:path"

const eta = new Eta({
  views: path.join(import.meta.dirname, "templates"),
  cache: process.env.NODE_ENV === "production",
})

app.get("/", (req, res) => {
  res.type("html").send(eta.render("pages/home", { title: "Início" }))
})
```

### HTML assíncrono com dados remotos

```ts
const html = await eta.renderAsync("pages/dashboard", {
  fetchData: () => fetch("https://api.example/data").then((r) => r.json()),
})
```

```eta
<% const data = await captureAsync(async () => { %>
  <%~ JSON.stringify(await it.fetchData()) %>
<% }) %>
<pre><%= data %></pre>
```

### Cuidados

- Sempre defina `content-type: text/html; charset=utf-8`.
- Nunca passe `req.query` como template (ver [`09-seguranca.md`](./09-seguranca.md)).
- Em produção, `cache: true`; em dev, `cache: false`.
- Trate erro de template como 500 sem vazar stack para o cliente.

## Tipagem (TypeScript)

### Tipar o objeto de dados

```ts
interface HomeData {
  title: string
  user: { name: string }
}

const html = eta.render("pages/home", {
  title: "Início",
  user: { name: "Ben" },
} satisfies HomeData)
```

### Wrapper tipado

```ts
function renderPage<T extends Record<string, unknown>>(
  name: string,
  data: T,
): string {
  return eta.render(name, data)
}
```

> Interpolações em templates são `unknown` para o TS — valide/normalize antes de
> passar para `it`, pois a template só executa em runtime.

## Pré-compilação / build

- Registre templates em build com `loadTemplate("@nome", source)` e distribua
  apenas o JS gerado/registrado.
- Isso evita FS em runtime (útil em serverless/edge) e permite usar `eta/core`.
- Combine `cache: true` com templates registradas para custo previsível.

## Testes

- Renderize com dados fixos e compare strings.
- Teste partials isoladamente com `renderString`.
- Cubra os caminhos async (`renderAsync`, `includeAsync`, `captureAsync`).
- Teste escaping: passe `<script>` e garanta que a saída com `<%=` está escapada.

```js
import { assertEquals } from "@std/assert"

const eta = new Eta()
assertEquals(
  eta.renderString("Hi <%= it.name %>", { name: "<b>Ben</b>" }),
  "Hi &lt;b&gt;Ben&lt;/b&gt;",
)
```

## Referências cruzadas

- [`ai-guides/fresh_guide/`](../fresh_guide/) — SSR com Deno
- [`ai-guides/javascript_guide/`](../javascript_guide/) — JS usado nas templates
- [`ai-guides/html_guide/`](../html_guide/) — HTML gerado
- [`ai-guides/web_security_guide/`](../web_security_guide/) — XSS/CSP
