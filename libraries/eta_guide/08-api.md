# API Overview

> Eta é exportado como **classe**. Instancie antes de usar:

```js
import { Eta } from "eta"
const eta = new Eta(options)
```

Node ESM — resolva caminhos com `import.meta.dirname` (Node 20.11+):

```js
import path from "node:path"
const eta = new Eta({ views: path.join(import.meta.dirname, "templates") })
```

`options` é opcional. A opção mais usada é `views` (diretório das templates).
Outras comuns: `debug`, `cache`, `autoEscape` (ver [`07-configuracao.md`](./07-configuracao.md)).

## Métodos de renderização

| Método | Entrada | Async | Retorno |
|--------|---------|-------|---------|
| `render(name \| fn, data?)` | Arquivo ou função | não | `string` |
| `renderAsync(name \| fn, data?)` | Arquivo ou função | sim | `Promise<string>` |
| `renderString(str, data?)` | String | não | `string` |
| `renderStringAsync(str, data?)` | String | sim | `Promise<string>` |
| `loadTemplate(name, str \| fn, opts?)` | String ou função | — | `void` (registra) |

### `render` (síncrono)

```js
const res = eta.render("templateName", { name: "Ben" })
```

- 1º arg: nome da template, **relativo ao `views`** — ou uma `TemplateFunction`
  já compilada.
- 2º arg: dados disponíveis em `it`.
- 3º arg (interno): `{ filepath }`, usado na resolução de includes/layouts.

Se quiser usar templates nomeadas sem resolver do filesystem, nomeie com `@`.
Eta não tentará resolver em disco e buscará no cache.

### `renderAsync`

```js
const res = await eta.renderAsync("templateName", { name: "Ben" })
```

Retorna Promise — use `await` ou `.then()`. Necessário para `includeAsync`,
`captureAsync`, `blockAsync` e `await` dentro das templates.

### `renderString`

```js
const res = eta.renderString("Hello <%= it.name %>", { name: "Ben" })
```

### `renderStringAsync`

```js
const res = await eta.renderStringAsync("Hello <%= await it.someFunction() %>", {
  someFunction: () => Promise.resolve("Ben"),
})
```

## Definir templates programaticamente

```js
const headerPartial = `
  <header>
    <h1><%= it.title %></h1>
  </header>
`

eta.loadTemplate("@header", headerPartial)
```

- Se a template **não** é um arquivo em `views`, nomeie com `@` para o Eta não
  resolver no filesystem.
- 3º argumento: `{ async: boolean }` (padrão `false` = síncrona).

```js
eta.loadTemplate("@data", "x = <%= await it.f() %>", { async: true })
```

Também aceita uma função de template já compilada:

```js
const fn = eta.compile("<p><%= it.name %></p>")
eta.loadTemplate("@card", fn)
```

## Configuração em runtime

### `configure(options)`

Faz merge das opções no config atual (mutação):

```js
eta.configure({ cache: false, debug: true })
```

### `withConfig(options)`

Retorna uma **nova instância** (cópia rasa) com o config mesclado, sem mutar a
original — útil para derivar variantes:

```js
const etaDev = eta.withConfig({ cache: false, debug: true })
```

## Compilação (métodos públicos)

| Método | Retorno | Uso |
|--------|---------|-----|
| `compile(str, options?)` | `TemplateFunction` | Compila string → função reutilizável |
| `compileToString(str, options?)` | `string` | Código JS gerado (debug/inspeção) |
| `compileBody(ast)` | `string` | Gera o corpo a partir da AST |
| `parse(str)` | `AstObject[]` | Produz a AST |

```js
const fn = eta.compile("Hi <%= it.name %>", { async: false })
fn.call(eta, { name: "Ben" }) // "Hi Ben"
```

## Exports do pacote

```ts
import {
  Eta,
  // Erros (todos estendem EtaError)
  EtaError,
  EtaParseError,
  EtaRuntimeError,
  EtaFileResolutionError,
  EtaNameResolutionError,
} from "eta"

import type { EtaConfig, Options, TemplateFunction } from "eta"
```

| Classe | Quando ocorre |
|--------|---------------|
| `EtaError` | Base de todos os erros |
| `EtaParseError` | Sintaxe inválida / tag não fechada |
| `EtaRuntimeError` | Erro ao avaliar o template (com `debug`) |
| `EtaFileResolutionError` | Arquivo não encontrado, `views` ausente ou fora de `views` |
| `EtaNameResolutionError` | Template nomeada não registrada (ex.: `@x` inexistente) |

## Tipos

```ts
type Options = { async?: boolean; filepath?: string }
type TemplateFunction = (data?: object, options?: Partial<Options>) => string
```

## Uso no browser

Importe o build **core**:

```html
<script type="module">
  import { Eta } from "eta/core"
  const eta = new Eta()
  document.body.innerHTML = eta.renderString("Hello <%= it.name %>", { name: "Ben" })
</script>
```

No browser não há filesystem — use `renderString`/`loadTemplate`.

## Casos de uso comuns

### Tags customizadas

```js
const eta = new Eta({ tags: ["{{", "}}"] })
```

### Auto-filtragem de dados

```js
const eta = new Eta({
  autoFilter: true,
  filterFunction: (val) => {
    if (typeof val === "string") return val.toUpperCase()
    return val
  },
})
```

### Livrar-se do `it`

Customizar o nome:

```js
const eta = new Eta({ varName: "data" })
// "Hi <%= data.name %>"
```

Eliminar completamente (não recomendado — colisões/performance):

```js
const eta = new Eta({ useWith: true })
// "Hi <%= name %>"
```

Melhor alternativa: `functionHeader`:

```js
const eta = new Eta({
  functionHeader: "const name = it.name, age = it.age",
})
// "Hi <%= name %>, our records show you are <%= age %> years old"
```

### Customizar leitura de arquivos

Estenda a classe e sobrescreva `readFile` e `resolvePath`:

```js
class CustomEta extends Eta {
  readFile = function (...) { /* ... */ }
  resolvePath = function (...) { /* ... */ }
}
```

Isso permite buscar templates em memória, banco, CDN, etc.

## Resolução de caminhos (comportamento)

Implementado por `resolvePath` + `readFile` (build Node/Deno):

1. Sem `views` → `EtaFileResolutionError("Views directory is not defined")`.
2. `defaultExtension` (padrão `.eta`) é anexada se o caminho não tiver extensão.
3. Se chamado de dentro de outra template (`options.filepath` definido):
   - caminhos começando com `/` ou `\` resolvem a partir de `views`;
   - demais caminhos resolvem relativo ao diretório da template atual.
4. `render` de topo (sem `filepath`) resolve a partir de `views`.
5. Por segurança, o caminho resolvido **precisa estar dentro de `views`**; caso
   contrário, `EtaFileResolutionError("... is not in the views directory")`.

## Erros comuns

- Passar `name` de arquivo inexistente → `EtaFileResolutionError`.
- Esquecer `await` em `renderAsync` → recebe `Promise` em vez de string.
- Usar template com `await` em `renderString` síncrono → erro de sintaxe/execução.
- Esquecer o `@` em template carregada via `loadTemplate` →
  `EtaNameResolutionError` (busca no store, não no filesystem).
- Chamar `render("x")` sem `resolvePath`/`readFile` (build `eta/core`) → nome não
  resolvido; use `renderString` ou `loadTemplate`.
