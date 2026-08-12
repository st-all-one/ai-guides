---
name: fresh-developer
description: |
  Guia para desenvolver projetos web full-stack com Fresh 2.x + Deno 2.0 + Vite.
  Foco em SSR, segurança, performance, estabilidade e testabilidade.
  Use este skill quando o usuário pedir para criar, modificar, debugar ou
  fazer deploy de um projeto Fresh.
version: 2.0.0
deps:
  deno: ">=2.0"
  fresh: "jsr:@fresh/core@^2"
  "@fresh/plugin-vite": "jsr:@fresh/plugin-vite@^1"
  vite: "npm:vite@^7"
  preact: "npm:preact@^10"
  "@preact/signals": "npm:@preact/signals@^2"
---

# Fresh 2.x Developer Skill

## Regras de Ouro (sempre seguir)

1. **NUNCA** importe arquivos de dentro de `static/` — sempre use `assets/` ou outro diretório
2. **NUNCA** crie sinais (`signal()`) no nível de módulo para estado de usuário — são compartilhados entre todas as requisições no servidor
3. **NUNCA** passe funções como props para islands — não são serializáveis
4. **SEMPRE** use `staticFiles()` antes de `.fsRoutes()` no `main.ts`
5. **SEMPRE** valide dados de formulário no servidor e proteja contra CSRF
6. **SEMPRE** use `define.*` helpers para type-safety (`createDefine` + `define.middleware`, `define.page`, `define.handlers`, `define.layout`)
7. **SEMPRE** use root-relative URLs em HTML: `src="/image.png"` NÃO `src="image.png"`
8. **NUNCA** use `app.listen()` com `deno task dev` ou `deno task start` — gera `AddrInUse`
9. **SEMPRE** build antes de produção: `deno task build` → entry é `_fresh/server.js` (NÃO `main.ts`)
10. **SEMPRE** mantenha props de islands pequenas — cada byte vai no HTML serializado

## Quando usar cada arquivo do guia

| Tarefa | Arquivo |
|--------|---------|
| Criar projeto do zero | [01-project-setup.md](./01-project-setup.md) |
| Adicionar rota/página | [02-routing.md](./02-routing.md) |
| Criar middleware (auth, logging) | [03-middleware-context.md](./03-middleware-context.md) |
| Buscar dados do DB/API | [04-data-fetching.md](./04-data-fetching.md) |
| Criar layout compartilhado | [05-layouts-app-wrapper.md](./05-layouts-app-wrapper.md) |
| Adicionar interatividade (JS) | [06-islands-signals.md](./06-islands-signals.md) |
| Proteger rotas/headers | [07-security.md](./07-security.md) |
| Navegação SPA-like | [08-partials-navigation.md](./08-partials-navigation.md) |
| Formulários ou WebSocket | [09-forms-websockets.md](./09-forms-websockets.md) |
| Páginas de erro | [10-error-handling.md](./10-error-handling.md) |
| Otimizar assets/cache | [11-performance.md](./11-performance.md) |
| Escrever testes | [12-testing.md](./12-testing.md) |
| Deploy | [13-deployment.md](./13-deployment.md) |
| Debug/tracing | [14-telemetry-debugging.md](./14-telemetry-debugging.md) |
| Referência de APIs/types | [15-api-reference.md](./15-api-reference.md) |
| Estilizar (design tokens, dark mode, animações) | [16-styling.md](./16-styling.md) |
| Acessibilidade (a11y, keyboard, screen readers) | [17-a11y.md](./17-a11y.md) |
| Migrar de 1.x para 2.x | [14-telemetry-debugging.md](./14-telemetry-debugging.md#12-fresh-1x--2x--migration-checklist) |
| Migrar de Builder para Vite | [01-project-setup.md](./01-project-setup.md#42-migrating-from-builder-to-vite) |
| Estilizar links ativos (nav) | [02-routing.md](./02-routing.md#15-active-links--aria-current) |
| Alterar `<head>` metadata | [05-layouts-app-wrapper.md](./05-layouts-app-wrapper.md#515-head-component--dynamic-metadata) |
| Renderizar markdown | [07-security.md](./07-security.md#14-markdown-rendering--denogfm) |
| Renderizar HTML bruto | [07-security.md](./07-security.md#13-dangerouslysetinnerhtml--raw-html-rendering) |
| Usar daisyUI | [07-security.md](./07-security.md#15-daisyui-setup) |
| Entender request lifecycle | [03-middleware-context.md](./03-middleware-context.md#0-fresh-architecture--request-lifecycle) |
| Tema escuro / dark mode | [16-styling.md](./16-styling.md#4-dark-mode--theme-switching) |
| Animações CSS | [16-styling.md](./16-styling.md#6-css-animations--transitions) |
| Typography / conteúdo rico | [16-styling.md](./16-styling.md#7-typography) |
| CSS Modules | [16-styling.md](./16-styling.md#9-css-modules) |
| Design tokens customizados | [16-styling.md](./16-styling.md#2-design-tokens--theme) |
| Conditional classes (cn) | [16-styling.md](./16-styling.md#3-conditional-classes) |

## Estrutura canônica de projeto

```
<root>
├── assets/            ← CSS, ícones importados via `import` (NÃO em static/)
│   └── styles.css
├── components/        ← Componentes Preact NÃO interativos (server-only)
│   └── Button.tsx
├── islands/           ← Componentes interativos (hidratados no cliente)
│   └── Counter.tsx
├── routes/            ← File-system routing
│   ├── (marketing)/   ← Route group (não afeta URL)
│   │   ├── _layout.tsx
│   │   └── about.tsx
│   ├── (_components)/ ← Componentes locais da rota (não vira rota)
│   ├── (_islands)/    ← Islands locais da rota (tratados como islands/)
│   ├── api/           ← API endpoints (handler export, sem default export)
│   │   └── users.ts
│   ├── blog/
│   │   ├── _layout.tsx
│   │   └── [slug].tsx
│   ├── _app.tsx       ← Shell HTML externo (<html>/<head>/<body>)
│   ├── _error.tsx     ← Página de erro unificada (404, 500, etc.)
│   ├── _layout.tsx    ← Layout raiz (nav, footer, etc.)
│   ├── _middleware.ts ← Middleware global
│   └── index.tsx      ← Rota /
├── static/            ← Assets servidos por URL (favicon.ico, robots.txt, fonts)
├── utils/             ← Utilitários, DB connections, createDefine
├── client.ts          ← Entry client-side (importa CSS para HMR)
├── main.ts            ← Entry server-side (new App, middleware, fsRoutes)
├── deno.json          ← Dependências, tasks, path aliases
├── vite.config.ts     ← Plugin Fresh + outros plugins Vite
└── .gitignore         ← Incluir _fresh/
```

## Checklist: criar projeto do zero

1. `deno run -Ar jsr:@fresh/init`
2. `deno.json`: tasks (dev= `vite`, build=`vite build`, start=`deno serve -A _fresh/server.js`), imports, `nodeModulesDir: "manual"`, compilerOptions (`jsx: precompile`, `jsxImportSource: preact`, `types: ["vite/client"]`)
3. `vite.config.ts`: `fresh({...})` + tailwindcss se usar
4. `client.ts`: `import "./assets/styles.css"`
5. Criar `utils/define.ts`: `export const define = createDefine<State>()`
6. `routes/_app.tsx`: `<html lang="en"><head>...</head><body><Component /></body></html>`
7. `routes/_middleware.ts`: CSRF, CSP, timing, session
8. `routes/_layout.tsx`: nav + footer
9. `routes/index.tsx`: página inicial
10. `routes/_error.tsx`: error handling
11. `islands/` para componentes interativos
12. `deno task build && deno task start` para testar produção

## Padrões de código obrigatórios

### main.ts
```ts
import { App, staticFiles, csrf, csp } from "fresh";

export const app = new App({ trustProxy: true })
  .use(staticFiles())
  .use(csrf())
  .use(csp({ useNonce: true }))
  .fsRoutes();
```

### utils/define.ts (sempre criar)
```ts
import { createDefine } from "fresh";

export interface State {
  user?: { id: string; name: string };
  session?: string;
}

export const define = createDefine<State>();
```

### Handler + Page (tipo seguro)
```tsx
import { HttpError, page } from "fresh";
import { define } from "@/utils/define.ts";

interface Data { item: { id: string; name: string }; }

export const handler = define.handlers({
  async GET(ctx) {
    const item = await db.find(ctx.params.id);
    if (!item) throw new HttpError(404);
    return page({ item });
  },
});

export default define.page<typeof handler>(({ data }) => (
  <h1>{data.item.name}</h1>
));
```

### Middleware de arquivo
```ts
import { define } from "@/utils/define.ts";

export default define.middleware(async (ctx) => {
  const user = await getSession(ctx.req);
  ctx.state.user = user;
  return ctx.next();
});
```

### Layout de arquivo
```tsx
import { define } from "@/utils/define.ts";

export default define.layout(({ Component, state, url }) => (
  <div>
    <nav>{state.user && <span>Hi, {state.user.name}</span>}</nav>
    <main><Component /></main>
  </div>
));
```

### Island
```tsx
import { useSignal } from "@preact/signals";

export default function Counter() {
  const count = useSignal(0);
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => count.value++}>+</button>
    </div>
  );
}
```

## Tipos serializáveis para props de islands

STRING, NUMBER, BOOLEAN, BIGINT, NULL, UNDEFINED, NAN, INFINITY, ARRAY, PLAIN OBJECT, DATE, URL, REGEXP, SET, MAP, UINT8ARRAY, SIGNAL, COMPUTED, TEMPORAL.*, JSX ELEMENTS

NAO SERIALIZAVEL: functions, class instances, Symbol, WeakMap, WeakSet, Streams, Promises

## Variáveis de ambiente

- Server-only: `Deno.env.get("MY_SECRET")`
- Islands (client): `Deno.env.get("FRESH_PUBLIC_*")` — inlineadas no build
- Build-time: passadas via CLI ou .env

## Comandos essenciais

```sh
deno task dev                    # Dev server + HMR
deno task build                  # Build produção → _fresh/
deno task start                  # Serve produção (_fresh/server.js)
deno test -A                     # Rodar testes
deno install --allow-scripts     # Instalar deps npm
deno upgrade                     # Atualizar Deno
OTEL_DENO=true deno task start   # Tracing em produção
```

## Anti-padrões (NUNCA fazer)

- `import "./static/styles.css"` → usar `assets/` e importar de `client.ts`
- `<MyIsland onClick={fn} />` → função não serializável
- `export const cart = signal([])` em utility file → estado compartilhado entre requests
- `app.listen()` + `deno task dev` → `AddrInUse`
- `deno serve -A main.ts` em produção → usar `_fresh/server.js`
- `<link rel="stylesheet" href="/styles.css">` em `_app.tsx` com Vite → importar CSS em `client.ts`
- `esm.sh` para pacotes npm → usar `npm:` prefix
