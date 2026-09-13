# Eta 4.x — Guia de Implementação (Otimizado para IA)

> Motor de templates JS leve e rápido (EJS-like), **ESM-only**, roda em Node, Deno e browser.
> Versão de referência: **4.6.0** (`jsr:@bgub/eta`, `npm:eta`).
> Objetivo: guia denso de **COMO fazer**, cobrindo toda a doc oficial em português.

## Exemplo canônico (ponto de partida na raiz do projeto)

Estrutura mínima:

```
meu-projeto/
├── templates/
│   └── simple.eta     # "Hi <%= it.name %>!"
└── main.js
```

`templates/simple.eta`:

```eta
Hi <%= it.name %>!
```

`main.js` (Node ESM):

```js
import { Eta } from "eta"
import path from "node:path"

const eta = new Eta({ views: path.join(import.meta.dirname, "templates") })

const res = eta.render("./simple", { name: "Ben" })
console.log(res) // Hi Ben!
```

Variante Deno (`main.ts`):

```ts
import { Eta } from "jsr:@bgub/eta"

const eta = new Eta({ views: `${Deno.cwd()}/templates/` })
console.log(eta.render("simple", { name: "Ben" }))
```

Variante browser (sem filesystem):

```html
<script type="module">
  import { Eta } from "eta/core"
  const eta = new Eta()
  document.body.innerHTML = eta.renderString("Hi <%= it.name %>!", { name: "Ben" })
</script>
```

Esse exemplo é a base de **todos** os tópicos deste guia. As seções seguintes só
adicionam sintaxe, helpers, layouts, configuração e API sobre ele.

## Navegação

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [quickstart.md](./01-quickstart.md) | Instalação, estrutura, `new Eta`, primeiro render (sync/async) |
| 02 | [02-sintaxe.md](./02-sintaxe.md) | `<%=` escape, `<%~` raw, `<%` JS, comentários, whitespace, `it` |
| 03 | [03-partials.md](./03-partials.md) | `include()`, `includeAsync()`, resolução de nomes, prefixo `@` |
| 04 | [04-helpers.md](./04-helpers.md) | `output()`, `capture()`, `captureAsync()` e quando usar |
| 05 | [05-layouts-blocks.md](./05-layouts-blocks.md) | `layout()`, `block()`, `blockAsync()`, fallback, `it.body` |
| 06 | [06-custom-tags.md](./06-custom-tags.md) | `customTags`, tags de tradução/comentário, restrições de prefixo |
| 07 | [07-configuracao.md](./07-configuracao.md) | Tipo `config` completo, `tags`, `parse`, `autoTrim`, `rmWhitespace` |
| 08 | [08-api.md](./08-api.md) | `render`, `renderAsync`, `renderString*`, `loadTemplate`, `readFile`/`resolvePath` |
| 09 | [09-seguranca.md](./09-seguranca.md) | Templates são código, XSS, `autoEscape`, sandbox |
| 10 | [10-deno-browser.md](./10-deno-browser.md) | JSR/Deno, `eta/core`, ESM-only, diferenças de runtime |
| 11 | [11-cheatsheet.md](./11-cheatsheet.md) | Cheatsheet completo (tags + API + opções) |
| 12 | [12-faq-troubleshooting.md](./12-faq-troubleshooting.md) | Erros, async não renderiza, cache, paths, pitfalls |
| 13 | [13-padroes-avancados.md](./13-padroes-avancados.md) | Composição, i18n, performance, integração HTTP, tipagem |
| 14 | [14-integracoes.md](./14-integracoes.md) | Express, Fastify, Deno, bundlers, ferramentas de terceiros |

## Modelo mental (leia antes de escrever templates)

1. **Template = função JS.** `eta.render` compila a string para uma função e a
   executa. Por isso templates **nunca** devem vir de usuários (ver `09-seguranca.md`).
2. **Dados ficam em `it`.** Todo objeto passado como 2º argumento é acessível via
   `it.xxx` dentro da template (customizável com `varName`).
3. **Três tags de output:**
   - `<%= expr %>` → interpola **com escape HTML** (padrão seguro)
   - `<%~ expr %>` → interpola **sem escape** (HTML cru, use para partials/blocks)
   - `<% code %>` → executa JS, **não** emite nada
4. **Composição = helpers globais:** `include`, `layout`, `block`, `capture`, `output`.
5. **Async é explícito:** `renderAsync`/`renderStringAsync` + `await includeAsync()`
   / `await captureAsync()` / `await blockAsync()`.

## Ordem prática de implementação

1. `npm install eta`
2. Criar `templates/` com `.eta` (ex.: `simple.eta`)
3. `new Eta({ views, cache: true, debug: <dev> })`
4. Escrever a página com `<%=` / `<%~`
5. Extrair partes repetidas para `include()`
6. Adicionar `layout()` + `block()` para o shell HTML
7. Se houver i18n/comentário custom, configurar `customTags`
8. Em produção: `cache: true`, `debug: false`, `autoEscape: true`
