# SKILL: Eta — Uso Correto em Projeto Real

## Description
Eta v4.6.0 — engine de templates JS/TS ESM-only, leve e rápido, sintaxe EJS-like.
Compila templates em funções JS com escape HTML automático. Roda em Node ≥20.11,
Deno, Bun e browser (`eta/core`). Este guia é prescritivo: siga os passos e as
regras abaixo ao implementar.

## When to Use
- Renderizar HTML/texto server-side (Node, Deno, Bun) ou no browser
- Gerar strings dinâmicas a partir de templates `.eta`
- Precisar de layouts, blocks, partials e helpers de composição
- Migrar de EJS/Handlebars para um engine mínimo e tipado

## Regras de Ouro (sempre seguir)
1. **SEMPRE** instancie `Eta` **uma vez** no módulo e reutilize (singleton). Nunca `new Eta()` por request.
2. **SEMPRE** defina `views` como caminho **absoluto** (`import.meta.dirname` no Node, `Deno.cwd()` no Deno).
3. **SEMPRE** `cache: true` em produção e `debug: true` apenas em dev.
4. **SEMPRE** use `<%=` para **todo** dado dinâmico/externo; `<%~` só para HTML confiável (partials, `it.body`, blocks).
5. **SEMPRE** passe dados pelo objeto `it`; **NUNCA** interpole string de usuário como template.
6. **SEMPRE** `await` em `renderAsync`, `includeAsync`, `captureAsync`, `blockAsync` (e use `renderAsync` quando a página tiver `await`).
7. **SEMPRE** chame `layout()` no **topo** da página e renderize o filho com `<%~ it.body %>` no layout.
8. **SEMPRE** prefixe templates programáticas com `@` (`loadTemplate("@card", ...)`) para não ir ao filesystem.
9. **SEMPRE** use caminhos relativos (`./`, `../`) dentro de templates; `/nome` só para resolver a partir de `views`.
10. **SEMPRE** trate erros por classe (`instanceof EtaError`/subtipos) e converta em HTTP sem vazar stack.

## Caminho Correto (checklist de projeto)
1. Instale e fixe a versão: `npm install eta` (Node) ou `jsr:@bgub/eta` (Deno). Eta v4 é **ESM-only**.
2. Crie a árvore de `views/` (layouts, partials, pages) — ver estrutura canônica.
3. Crie `src/templates.js` com o **singleton** configurado (setup abaixo).
4. Escreva o layout base com `<%~ it.body %>` e `block()` para seções.
5. Escreva páginas: `layout()` no topo → `block()` → conteúdo.
6. Extraia trechos repetidos para `partials/` e use `<%~ include("./partials/x", {...}) %>`.
7. No servidor, `eta.render("pages/x", data)` (sync) ou `await eta.renderAsync(...)` (dados remotos).
8. Trate erro → 500; defina `content-type: text/html; charset=utf-8`.
9. Em edge/serverless/browser: `loadTemplate` + `renderString` (build `eta/core`), sem FS.

## Estrutura Canônica
```
meu-projeto/
├── views/
│   ├── layouts/base.eta      ← html shell + it.body + blocks
│   ├── partials/header.eta   ← fragmentos reutilizáveis
│   └── pages/home.eta        ← layout() no topo
├── src/
│   ├── templates.js          ← singleton Eta (única instância)
│   └── server.js
└── package.json
```
`views` aponta para `views/`. Páginas usam `layout("../layouts/base")` e `include("../partials/header")`.

## Setup (copie)
```js
// src/templates.js — Node 20.11+
import { Eta } from "eta"
import path from "node:path"

export const eta = new Eta({
  views: path.join(import.meta.dirname, "../views"),
  cache: process.env.NODE_ENV === "production",
  debug: process.env.NODE_ENV !== "production",
})
```
```ts
// Deno
import { Eta } from "jsr:@bgub/eta"
export const eta = new Eta({ views: `${Deno.cwd()}/views/`, cache: true })
```
```html
<!-- Browser (sem FS) -->
<script type="module">
  import { Eta } from "eta/core"
  const eta = new Eta()
  document.body.innerHTML = eta.renderString("Hi <%= it.name %>!", { name: "Ben" })
</script>
```

## Sintaxe: o que DEVE ser usado
| Objetivo | Tag | Exemplo |
|----------|-----|---------|
| Dado dinâmico (escapa) | `<%=` | `<%= it.name %>` |
| HTML confiável (cru) | `<%~` | `<%~ it.body %>`, `<%~ include(...) %>` |
| Lógica (sem output) | `<%` | `<% if (it.ok) { %> ... <% } %>` |
| Comentário | `<%` | `<% /* nota */ %>` |
| Saída via JS | `output()` | `<% for (const x of it.xs) output(x) %>` |
| Fragmento reutilizável | `capture()` | `<% const f = capture(() => { %>...<% }) %>` |

- Dados ficam em `it` (renomeável via `varName`; prefira manter `it`).
- Whitespace: `<%-`/`-%>` remove 1 newline; `<%_`/`_%>` remove todo whitespace ao redor.
- `output()` **não escapa** — não use com dado externo.

## Composição Canônica
**`views/pages/home.eta`**
```eta
<% layout("../layouts/base", { title: it.title }) %>
<% block("head", () => { %>
  <link rel="stylesheet" href="/home.css">
<% }) %>
<h1><%= it.title %></h1>
<%~ include("../partials/card", { item: it.item }) %>
```
**`views/layouts/base.eta`**
```eta
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title><%= it.title %></title>
  <%~ block("head") %>
</head>
<body>
  <%~ include("../partials/header") %>
  <main><%~ it.body %></main>
  <%~ block("scripts", () => { %><script src="/app.js"></script><% }) %>
</body>
</html>
```
Regras: `layout()` antes do conteúdo; `block(nome, fn)` na filha, `block(nome[, fallbackFn])` no layout; **sem layout ativo** `block()` renderiza inline; `it.body` sempre com `<%~`.

## Async
- Página com `await` → renderize com `eta.renderAsync`; no JS, `await eta.renderAsync(name, data)`.
- Templates: `await includeAsync`/`captureAsync`/`blockAsync`/`renderStringAsync`.
- `loadTemplate("@x", src, { async: true })` para template programática assíncrona.
- Esquecer `await` produz `Promise` no output.

## Config Recomendada
| Ambiente | Config |
|----------|--------|
| Produção | `{ views, cache: true, debug: false, autoEscape: true }` |
| Dev | `{ views, cache: false, debug: true }` |
| Browser/edge | `new Eta()` + `renderString`/`loadTemplate` (sem `views`) |
| Variante sem afetar original | `eta.withConfig({ cache: false })` |

Outras opções comuns: `defaultExtension` (`.eta`), `tags` (`["<%","%>"]`), `varName` (`it`), `outputFunctionName` (`output`), `customTags`, `plugins`, `functionHeader`. Evite `useWith: true`. Referência completa em `07-configuracao.md`.

## Segurança (obrigatório)
- Templates são **código**. Nunca `renderString(inputDoUsuario, ...)` — equivale a `eval`.
- `autoEscape: true` sempre; `<%=` para dado externo; `<%~` só para HTML do dev.
- Escape **contextual** adicional para dados em URL, JS inline ou CSS.
- Sanitize HTML de terceiros (ex.: Markdown) antes de `<%~`.
- `resolução de path` valida que o template fica dentro de `views`; ainda assim não monte nomes com input do usuário.
- `autoFilter`/`filterFunction` **não** sanitizam: rodam antes do escape e também no `<%~`.

## Erros → Diagnóstico
| Erro / sintoma | Causa provável | Correção |
|----------------|----------------|----------|
| `Views directory is not defined` | `views` ausente | `new Eta({ views })` |
| `... is not in the views directory` | path fora de `views` | usar caminho relativo à template |
| `Failed to get template '@x'` | programática não registrada | `loadTemplate("@x", ...)` antes |
| `EtaParseError` | sintaxe/tag não fechada | corrigir template |
| `EtaRuntimeError` (com `debug`) | erro ao avaliar `it`/código | validar dados antes de renderizar |
| `Promise` visível no HTML | faltou `await` | `renderAsync` + `await` nos helpers async |
| Template não atualiza em dev | `cache: true` | `cache: false` em dev |
| HTML de dado aparece escapado ("&lt;") | uso correto de `<%=` | se for confiável, use `<%~` |

## Anti-padrões (NUNCA)
- `require("eta")` — v4 é ESM-only; use `import` (ou `await import("eta")`).
- `new Eta()` dentro do handler — quebra cache, recompila a cada request.
- `<%~ it.bio %>` / `output(it.bio)` com dado de usuário — XSS.
- Concatenar input de usuário dentro de uma string de template.
- Usar `autoFilter` como sanitização de segurança.
- `render` sem `views` ou com `views` relativo ao cwd.
- Nomear template programática sem `@` — o Eta tenta resolver no FS e falha.
- `useWith: true` sem necessidade — colisões e menos performance.
- Importar `eta/core` no servidor quando precisa de `views` (ou `eta` no browser sem bundler).

## Mapa do Guia (tarefa → arquivo)
| Tarefa | Arquivo |
|--------|---------|
| Visão geral e exemplo canônico | `00-index.md` |
| Primeiro projeto/render | `01-quickstart.md` |
| Todas as tags e escape | `02-sintaxe.md` |
| `include`/partials e resolução | `03-partials.md` |
| `output`/`capture` | `04-helpers.md` |
| Layouts e blocks | `05-layouts-blocks.md` |
| Tags customizadas | `06-custom-tags.md` |
| Todas as opções | `07-configuracao.md` |
| API JS, erros, tipos | `08-api.md` |
| XSS, path traversal, sandbox | `09-seguranca.md` |
| Deno e browser | `10-deno-browser.md` |
| Referência rápida | `11-cheatsheet.md` |
| Erros comuns | `12-faq-troubleshooting.md` |
| i18n, performance, HTTP, tipos | `13-padroes-avancados.md` |
| Express, Fastify, bundlers | `14-integracoes.md` |

## Prerequisites
- ESM (v4 é ESM-only); Node ≥20.11, Deno ≥1.42 ou browser moderno
- `npm install eta` ou `jsr:@bgub/eta`

## Related Guides
- `ai-guides/fresh_guide/` — SSR com Deno Fresh
- `ai-guides/javascript_guide/` — JS usado nas templates
- `ai-guides/html_guide/` — HTML gerado
- `ai-guides/web_security_guide/` — XSS, CSP e modelagem de ameaças
