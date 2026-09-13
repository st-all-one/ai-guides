# Deno e Browser

> Eta v4 é **ESM-only** e roda sem ajustes em Node, Deno e browsers modernos.

## Deno

Prefira importar do JSR:

```ts
import { Eta } from "jsr:@bgub/eta"
```

Configuração típica:

```ts
const viewpath = `${Deno.cwd()}/views/`
const eta = new Eta({ views: viewpath, cache: true })
```

Uso em resposta HTTP:

```ts
res.send(eta.render("home", { title: "that's my title" }))
```

### Com `Deno.serve`

```ts
import { Eta } from "jsr:@bgub/eta"

const eta = new Eta({ views: `${Deno.cwd()}/views/`, cache: true })

Deno.serve((req) => {
  const url = new URL(req.url)
  if (url.pathname === "/") {
    return new Response(eta.render("home", { title: "Início" }), {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }
  return new Response("Not found", { status: 404 })
})
```

### Permissões

Ler templates do disco exige `--allow-read` (ou `-A` em dev). Se usar
templates programáticas (`loadTemplate`), nenhuma permissão de leitura é
necessária.

## Node

```js
import { Eta } from "eta"
import path from "node:path"

const eta = new Eta({ views: path.join(import.meta.dirname, "templates") })
```

- `import.meta.dirname` requer Node 20.11+.
- Em versões antigas: `path.dirname(fileURLToPath(import.meta.url))`.
- `require("eta")` **não** funciona (ESM-only); use `import`.

## Browser

Importe o build **core** (`eta/core`), que não depende de filesystem:

```html
<script type="module">
  import { Eta } from "eta/core"
  const eta = new Eta()
  document.body.innerHTML = eta.renderString("Hi <%= it.name %>!", { name: "Ben" })
</script>
```

- Use `renderString` / `renderStringAsync` / `loadTemplate`.
- `render` com arquivos não se aplica (não há FS); para templates embutidas,
  compile-as no bundle ou registre via `loadTemplate` com `@nome`.
- Cuidado com CSP: templates compilam para `new Function` — pode exigir
  `'unsafe-eval'` em CSP restritiva. Prefira render pré-compilado ou SSR.

### Template no browser via `loadTemplate`

```html
<script type="module">
  import { Eta } from "eta/core"
  const eta = new Eta()
  eta.loadTemplate("@hello", "Hi <%= it.name %>!")
  document.body.innerHTML = eta.render("@hello", { name: "Ben" })
</script>
```

## Matriz de compatibilidade

| Runtime | Import | FS (`views`) | Observação |
|---------|--------|--------------|------------|
| Node ≥ 20.11 (ESM) | `eta` | sim | `import.meta.dirname` |
| Deno | `jsr:@bgub/eta` | sim | precisa `--allow-read` |
| Bun | `eta` | sim | ESM |
| Browser | `eta/core` | não | use `renderString`/`loadTemplate` |

## Diferenças de API por build

| Build | Exports | Uso |
|-------|---------|-----|
| `eta` | `Eta` (Node/Deno) | FS + strings |
| `eta/core` | `Eta` (browser) | strings + `loadTemplate` |

> Evite importar `eta/core` no servidor se precisar de `views`; e evite `eta`
> no browser se não houver bundler/polyfill de FS.

## Referência

- Docs oficiais Deno: `/docs/4.x.x/resources/deno`
- Pacote JSR: `jsr:@bgub/eta`
