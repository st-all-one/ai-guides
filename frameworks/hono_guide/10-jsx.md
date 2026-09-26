# JSX e HTML

> `hono/jsx` renderiza HTML com sintaxe JSX no servidor e no cliente. `c.html()` aceita tanto JSX quanto o tagged template `html`, e o middleware `jsxRenderer` centraliza o layout via `c.render()`.

O JSX do Hono serve principalmente para renderização **server-side**, mas o mesmo runtime funciona no browser. `c.html()` está em [`04-request-response.md`](./04-request-response.md); o helper `html` em [`07-helpers.md`](./07-helpers.md); `css`/`Style` em [`07-helpers.md`](./07-helpers.md).

## Configuração

### `tsconfig.json`

Para usar JSX, altere o `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}
```

Alternativamente, use diretivas pragma no topo do arquivo:

```ts
/** @jsx jsx */
/** @jsxImportSource hono/jsx */
```

### Deno (`deno.json`)

No Deno altera-se o `deno.json` em vez do `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "precompile",
    "jsxImportSource": "@hono/hono/jsx"
  }
}
```

> Para `useRequestContext()` **não** use `"jsx": "precompile"` no Deno; use `"jsx": "react-jsx"` com `"jsxImportSource": "hono/jsx"`.

### Extensão do arquivo

Se você veio do Quick Start, o arquivo principal tem extensão `.ts` — ele **precisa** virar `.tsx`, senão a aplicação não roda. Ajuste também o `package.json` (ou `deno.json`) para refletir a mudança: em vez de `bun run --hot src/index.ts`, use `bun run --hot src/index.tsx`.

### Configuração por runtime

| Runtime / alvo | Onde configurar | Valor |
|----------------|-----------------|-------|
| Node, Bun, Cloudflare Workers (TS) | `tsconfig.json` | `"jsx": "react-jsx"`, `"jsxImportSource": "hono/jsx"` |
| Deno | `deno.json` | `"jsx": "precompile"`, `"jsxImportSource": "@hono/hono/jsx"` |
| Client Components | `tsconfig.json` / `vite.config.ts` | `"jsxImportSource": "hono/jsx/dom"` |

Independentemente do runtime, o entry point precisa ter extensão `.tsx` e o script de dev/build deve apontar para ele.

## Uso com `c.html()`

`c.html()` define `Content-Type: text/html` e aceita um componente JSX ou string. Componentes são funções; `FC` tipa a assinatura.

```tsx
import { Hono } from 'hono'
import type { FC } from 'hono/jsx'

const app = new Hono()

const Layout: FC = (props) => {
  return (
    <html>
      <body>{props.children}</body>
    </html>
  )
}

const Top: FC<{ messages: string[] }> = (props: {
  messages: string[]
}) => {
  return (
    <Layout>
      <h1>Hello Hono!</h1>
      <ul>
        {props.messages.map((message) => {
          return <li>{message}!!</li>
        })}
      </ul>
    </Layout>
  )
}

app.get('/', (c) => {
  const messages = ['Good Morning', 'Good Evening', 'Good Night']
  return c.html(<Top messages={messages} />)
})

export default app
```

## `PropsWithChildren`

Use `PropsWithChildren` para inferir corretamente o `children` em function components.

```tsx
import { PropsWithChildren } from 'hono/jsx'

type Post = {
  id: number
  title: string
}

function Component({ title, children }: PropsWithChildren<Post>) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  )
}
```

## Fragment

Use `Fragment` para agrupar múltiplos elementos sem adicionar nós extras:

```tsx
import { Fragment } from 'hono/jsx'

const List = () => (
  <Fragment>
    <p>first child</p>
    <p>second child</p>
    <p>third child</p>
  </Fragment>
)
```

Ou com o atalho `<></>`, se estiver configurado corretamente:

```tsx
const List = () => (
  <>
    <p>first child</p>
    <p>second child</p>
    <p>third child</p>
  </>
)
```

## Inserir HTML cru

Para inserir HTML diretamente, use `dangerouslySetInnerHTML`:

```tsx
app.get('/foo', (c) => {
  const inner = { __html: 'JSX &middot; SSR' }
  const Div = <div dangerouslySetInnerHTML={inner} />
})
```

## Metadata hoisting

Tags de metadata como `<title>`, `<link>` e `<meta>` podem ser escritas dentro dos componentes. Elas são automaticamente **hoisted** para a seção `<head>` do documento — útil quando o `<head>` é renderizado longe do componente que determina a metadata.

```tsx
import { Hono } from 'hono'

const app = new Hono()

app.use('*', async (c, next) => {
  c.setRenderer((content) => {
    return c.html(
      <html>
        <head></head>
        <body>{content}</body>
      </html>
    )
  })
  await next()
})

app.get('/about', (c) => {
  return c.render(
    <>
      <title>About Page</title>
      <meta name='description' content='This is the about page.' />
      about page content
    </>
  )
})

export default app
```

> No hoisting, elementos existentes **não** são removidos; elementos que aparecem depois são adicionados ao final. Se o `<head>` tem `<title>Default</title>` e um componente renderiza `<title>Page Title</title>`, ambos aparecem no head.

## Memoização (`memo`)

Otimize componentes memoizando as strings computadas com `memo`:

```tsx
import { memo } from 'hono/jsx'

const Header = memo(() => <header>Welcome to Hono</header>)
const Footer = memo(() => <footer>Powered by Hono</footer>)
const Layout = (
  <div>
    <Header />
    <p>Hono is cool!</p>
    <Footer />
  </div>
)
```

## Context (`createContext` / `useContext`)

Com `useContext`, compartilhe dados globalmente em qualquer nível da árvore de componentes sem passar valores por props.

```tsx
import type { FC } from 'hono/jsx'
import { createContext, useContext } from 'hono/jsx'

const themes = {
  light: {
    color: '#000000',
    background: '#eeeeee',
  },
  dark: {
    color: '#ffffff',
    background: '#222222',
  },
}

const ThemeContext = createContext(themes.light)

const Button: FC = () => {
  const theme = useContext(ThemeContext)
  return <button style={theme}>Push!</button>
}

const Toolbar: FC = () => {
  return (
    <div>
      <Button />
    </div>
  )
}

app.get('/', (c) => {
  return c.html(
    <div>
      <ThemeContext.Provider value={themes.dark}>
        <Toolbar />
      </ThemeContext.Provider>
    </div>
  )
})
```

## Async Component

`hono/jsx` suporta Async Component: use `async`/`await` dentro do componente. Ao renderizar com `c.html()`, o valor é aguardado automaticamente.

```tsx
const AsyncComponent = async () => {
  await new Promise((r) => setTimeout(r, 1000)) // sleep 1s
  return <div>Done!</div>
}

app.get('/', (c) => {
  return c.html(
    <html>
      <body>
        <AsyncComponent />
      </body>
    </html>
  )
})
```

## Streaming: `Suspense`, `ErrorBoundary` e `StreamingContext`

> Recursos **experimentais**.

`Suspense` renderiza o `fallback` primeiro e, quando a Promise resolve, mostra o conteúdo aguardado. Use com `renderToReadableStream()`.

```tsx
import { renderToReadableStream, Suspense } from 'hono/jsx/streaming'

app.get('/', (c) => {
  const stream = renderToReadableStream(
    <html>
      <body>
        <Suspense fallback={<div>loading...</div>}>
          <Component />
        </Suspense>
      </body>
    </html>
  )
  return c.body(stream, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Transfer-Encoding': 'chunked',
    },
  })
})
```

`ErrorBoundary` captura erros dos componentes filhos e exibe o `fallback`:

```tsx
import { ErrorBoundary } from 'hono/jsx'

function SyncComponent() {
  throw new Error('Error')
  return <div>Hello</div>
}

app.get('/sync', async (c) => {
  return c.html(
    <html>
      <body>
        <ErrorBoundary fallback={<div>Out of Service</div>}>
          <SyncComponent />
        </ErrorBoundary>
      </body>
    </html>
  )
})
```

Também funciona com componentes async e `Suspense`:

```tsx
async function AsyncComponent() {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  throw new Error('Error')
  return <div>Hello</div>
}

app.get('/with-suspense', async (c) => {
  return c.html(
    <html>
      <body>
        <ErrorBoundary fallback={<div>Out of Service</div>}>
          <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  )
})
```

`StreamingContext` passa configuração para `Suspense` e `ErrorBoundary` — útil para adicionar `nonce` em scripts gerados por esses componentes (Content Security Policy):

```tsx
import { Suspense, StreamingContext } from 'hono/jsx/streaming'

app.get('/', (c) => {
  const stream = renderToReadableStream(
    <html>
      <body>
        <StreamingContext
          value={{ scriptNonce: 'random-nonce-value' }}
        >
          <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        </StreamingContext>
      </body>
    </html>
  )

  return c.body(stream, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Transfer-Encoding': 'chunked',
      'Content-Security-Policy':
        "script-src 'nonce-random-nonce-value'",
    },
  })
})
```

O valor de `scriptNonce` é adicionado automaticamente a qualquer `<script>` gerado por `Suspense` e `ErrorBoundary`.

## Integração com o helper `html`

Combine JSX e o tagged template `html` para templating. `html` interpola com escape; `raw()` insere conteúdo sem escape (a responsabilidade é sua).

```tsx
import { Hono } from 'hono'
import { html } from 'hono/html'

const app = new Hono()

interface SiteData {
  title: string
  children?: any
}

const Layout = (props: SiteData) =>
  html`<!doctype html>
    <html>
      <head>
        <title>${props.title}</title>
      </head>
      <body>
        ${props.children}
      </body>
    </html>`

const Content = (props: { siteData: SiteData; name: string }) => (
  <Layout {...props.siteData}>
    <h1>Hello {props.name}</h1>
  </Layout>
)

app.get('/:name', (c) => {
  const { name } = c.req.param()
  const props = {
    name: name,
    siteData: {
      title: 'JSX with html sample',
    },
  }
  return c.html(<Content {...props} />)
})

export default app
```

## JSX Renderer Middleware (`jsxRenderer`)

O `jsxRenderer` configura o layout para `c.render()` **sem** precisar de `c.setRenderer()` e permite acessar o `Context` dentro de componentes com `useRequestContext()`.

```ts
import { Hono } from 'hono'
import { jsxRenderer, useRequestContext } from 'hono/jsx-renderer'
```

Uso básico:

```tsx
const app = new Hono()

app.get(
  '/page/*',
  jsxRenderer(({ children }) => {
    return (
      <html>
        <body>
          <header>Menu</header>
          <div>{children}</div>
        </body>
      </html>
    )
  })
)

app.get('/page/about', (c) => {
  return c.render(<h1>About me!</h1>)
})
```

### Opção `docType`

Para **não** adicionar DOCTYPE no início do HTML, defina `docType: false`:

```tsx
app.use(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <html>
          <body>{children}</body>
        </html>
      )
    },
    { docType: false }
  )
)
```

E é possível especificar o DOCTYPE:

```tsx
app.use(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <html>
          <body>{children}</body>
        </html>
      )
    },
    {
      docType:
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">',
    }
  )
)
```

### Opção `stream`

Com `true` (ou um `Record<string, string>`), a resposta é renderizada em streaming:

```tsx
const AsyncComponent = async () => {
  await new Promise((r) => setTimeout(r, 1000)) // sleep 1s
  return <div>Hi!</div>
}

app.get(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <html>
          <body>
            <h1>SSR Streaming</h1>
            {children}
          </body>
        </html>
      )
    },
    { stream: true }
  )
)

app.get('/', (c) => {
  return c.render(
    <Suspense fallback={<div>loading...</div>}>
      <AsyncComponent />
    </Suspense>
  )
})
```

Com `true`, os seguintes headers são adicionados:

```ts
{
  'Transfer-Encoding': 'chunked',
  'Content-Type': 'text/html; charset=UTF-8',
  'Content-Encoding': 'Identity'
}
```

Os headers podem ser customizados passando valores `Record`.

### Opções baseadas em função

Em vez de um objeto estático, passe uma função que recebe o `Context` — permite definir opções dinamicamente conforme a request (env vars, parâmetros etc.):

```tsx
app.use(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <html>
          <body>{children}</body>
        </html>
      )
    },
    (c) => ({
      stream: c.req.header('X-Enable-Streaming') === 'true',
    })
  )
)
```

Como exemplo concreto, desabilite streaming ao gerar sites estáticos (SSG) com `<Suspense>`, usando o helper `isSSGContext`:

```tsx
app.use(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <div>
          <Suspense fallback={'loading...'}>
            <Component />
          </Suspense>
        </div>
      )
    },
    (c) => ({
      stream: !isSSGContext(c),
    })
  )
)
```

### Nested Layouts

O componente `Layout` recebido pelo renderizador permite aninhar layouts:

```tsx
app.use(
  jsxRenderer(({ children }) => {
    return (
      <html>
        <body>{children}</body>
      </html>
    )
  })
)

const blog = new Hono()
blog.use(
  jsxRenderer(({ children, Layout }) => {
    return (
      <Layout>
        <nav>Blog Menu</nav>
        <div>{children}</div>
      </Layout>
    )
  })
)

app.route('/blog', blog)
```

### `useRequestContext()`

Retorna uma instância de `Context`:

```tsx
import { useRequestContext, jsxRenderer } from 'hono/jsx-renderer'

const app = new Hono()
app.use(jsxRenderer())

const RequestUrlBadge: FC = () => {
  const c = useRequestContext()
  return <b>{c.req.url}</b>
}

app.get('/page/info', (c) => {
  return c.render(
    <div>
      You are accessing: <RequestUrlBadge />
    </div>
  )
})
```

### Estender `ContextRenderer`

Definindo `ContextRenderer`, você passa conteúdo adicional ao renderer — útil, por exemplo, para mudar o conteúdo do `<head>` por página:

```tsx
declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props: { title: string }
    ): Response
  }
}

const app = new Hono()

app.get(
  '/page/*',
  jsxRenderer(({ children, title }) => {
    return (
      <html>
        <head>
          <title>{title}</title>
        </head>
        <body>
          <header>Menu</header>
          <div>{children}</div>
        </body>
      </html>
    )
  })
)

app.get('/page/favorites', (c) => {
  return c.render(
    <div>
      <ul>
        <li>Eating sushi</li>
        <li>Watching baseball games</li>
      </ul>
    </div>,
    {
      title: 'My favorites',
    }
  )
})
```

## `c.render()` e `c.setRenderer()`

Sem o `jsxRenderer`, defina o layout manualmente com `c.setRenderer()` dentro de um middleware e responda com `c.render()`:

```tsx
import { Hono } from 'hono'

const app = new Hono()

app.use(async (c, next) => {
  c.setRenderer((content) => {
    return c.html(
      <html>
        <body>
          <p>{content}</p>
        </body>
      </html>
    )
  })
  await next()
})

app.get('/', (c) => {
  return c.render('Hello!')
})
```

Saída:

```html
<html>
  <body>
    <p>Hello!</p>
  </body>
</html>
```

Para tipar argumentos extras, estenda `ContextRenderer`:

```ts
declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      head: { title: string }
    ): Response | Promise<Response>
  }
}
```

```ts
app.use('/pages/*', async (c, next) => {
  c.setRenderer((content, head) => {
    return c.html(
      <html>
        <head>
          <title>{head.title}</title>
        </head>
        <body>
          <header>{head.title}</header>
          <p>{content}</p>
        </body>
      </html>
    )
  })
  await next()
})

app.get('/pages/my-favorite', (c) => {
  return c.render(<p>Ramen and Sushi</p>, {
    title: 'My favorite',
  })
})
```

## `hono/jsx/dom` (Client Components)

`hono/jsx` também funciona no cliente: são os **Client Components** ou `hono/jsx/dom`. O runtime é pequeno e rápido — o contador em `hono/jsx/dom` ocupa 2.8KB com compressão Brotli, contra 47.8KB do React.

### Configuração do runtime

Especifique `hono/jsx/dom` no `tsconfig.json` (ou no `deno.json`, no Deno):

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx/dom"
  }
}
```

Alternativamente, especifique `hono/jsx/dom` nas opções de transform do esbuild no `vite.config.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxImportSource: 'hono/jsx/dom',
  },
})
```

### `render()`

Use `render()` para inserir componentes JSX dentro de um elemento HTML:

```tsx
render(<Component />, container)
```

Exemplo completo de contador (o mesmo código funciona em React):

```tsx
import { useState } from 'hono/jsx'
import { render } from 'hono/jsx/dom'

function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}

function App() {
  return (
    <html>
      <body>
        <Counter />
      </body>
    </html>
  )
}

const root = document.getElementById('root')
render(<App />, root)
```

### Hooks compatíveis com React

`hono/jsx/dom` traz Hooks compatíveis (ou parcialmente compatíveis) com React:

| Hooks / APIs |
|--------------|
| `useState()` |
| `useEffect()` |
| `useRef()` |
| `useCallback()` |
| `use()` |
| `startTransition()` |
| `useTransition()` |
| `useDeferredValue()` |
| `useMemo()` |
| `useLayoutEffect()` |
| `useReducer()` |
| `useDebugValue()` |
| `createElement()` |
| `memo()` |
| `isValidElement()` |
| `useId()` |
| `createRef()` |
| `forwardRef()` |
| `useImperativeHandle()` |
| `useSyncExternalStore()` |
| `useInsertionEffect()` |
| `useFormStatus()` |
| `useActionState()` |
| `useOptimistic()` |

### `startViewTransition()` family

Família de hooks/funções originais para lidar com a View Transitions API.

**1. Exemplo simples**, com `startViewTransition()`:

```tsx
import { useState, startViewTransition } from 'hono/jsx'
import { css, Style } from 'hono/css'

export default function App() {
  const [showLargeImage, setShowLargeImage] = useState(false)
  return (
    <>
      <Style />
      <button
        onClick={() =>
          startViewTransition(() =>
            setShowLargeImage((state) => !state)
          )
        }
      >
        Click!
      </button>
      <div>
        {!showLargeImage ? (
          <img src='https://hono.dev/images/logo.png' />
        ) : (
          <div
            class={css`
              background: url('https://hono.dev/images/logo-large.png');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              width: 600px;
              height: 600px;
            `}
          ></div>
        )}
      </div>
    </>
  )
}
```

**2. `viewTransition()` com `keyframes()`**: `viewTransition()` devolve o `view-transition-name` único; com `keyframes()`, `::view-transition-old()` é convertido para `::view-transition-old(${uniqueName})`.

```tsx
import { useState, startViewTransition } from 'hono/jsx'
import { viewTransition } from 'hono/jsx/dom/css'
import { css, keyframes, Style } from 'hono/css'

const rotate = keyframes`
  from {
    rotate: 0deg;
  }
  to {
    rotate: 360deg;
  }
`

export default function App() {
  const [showLargeImage, setShowLargeImage] = useState(false)
  const [transitionNameClass] = useState(() =>
    viewTransition(css`
      ::view-transition-old() {
        animation-name: ${rotate};
      }
      ::view-transition-new() {
        animation-name: ${rotate};
      }
    `)
  )
  return (
    <>
      <Style />
      <button
        onClick={() =>
          startViewTransition(() =>
            setShowLargeImage((state) => !state)
          )
        }
      >
        Click!
      </button>
      <div>
        {!showLargeImage ? (
          <img src='https://hono.dev/images/logo.png' />
        ) : (
          <div
            class={css`
              ${transitionNameClass}
              background: url('https://hono.dev/images/logo-large.png');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              width: 600px;
              height: 600px;
            `}
          ></div>
        )}
      </div>
    </>
  )
}
```

**3. `useViewTransition`**: retorna `[boolean, (callback: () => void) => void]` — o flag `isUpdating` e a função `startViewTransition()`. O componente é avaliado: dentro do callback de `startViewTransition()` e quando o promise `finish` é resolvido.

```tsx
import { useState, useViewTransition } from 'hono/jsx'
import { viewTransition } from 'hono/jsx/dom/css'
import { css, keyframes, Style } from 'hono/css'

const rotate = keyframes`
  from {
    rotate: 0deg;
  }
  to {
    rotate: 360deg;
  }
`

export default function App() {
  const [isUpdating, startViewTransition] = useViewTransition()
  const [showLargeImage, setShowLargeImage] = useState(false)
  const [transitionNameClass] = useState(() =>
    viewTransition(css`
      ::view-transition-old() {
        animation-name: ${rotate};
      }
      ::view-transition-new() {
        animation-name: ${rotate};
      }
    `)
  )
  return (
    <>
      <Style />
      <button
        onClick={() =>
          startViewTransition(() =>
            setShowLargeImage((state) => !state)
          )
        }
      >
        Click!
      </button>
      <div>
        {!showLargeImage ? (
          <img src='https://hono.dev/images/logo.png' />
        ) : (
          <div
            class={css`
              ${transitionNameClass}
              background: url('https://hono.dev/images/logo-large.png');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              width: 600px;
              height: 600px;
              position: relative;
              ${isUpdating &&
              css`
                &:before {
                  content: 'Loading...';
                  position: absolute;
                  top: 50%;
                  left: 50%;
                }
              `}
            `}
          ></div>
        )}
      </div>
    </>
  )
}
```

## Override de type definitions

Você pode sobrescrever a type definition para adicionar elementos e atributos customizados:

```ts
declare module 'hono/jsx' {
  namespace JSX {
    interface IntrinsicElements {
      'my-custom-element': HTMLAttributes & {
        'x-event'?: 'click' | 'scroll'
      }
    }
  }
}
```

## Próximos passos

- [`07-helpers.md`](./07-helpers.md) — `html`, `raw`, `css`/`Style`
- [`04-request-response.md`](./04-request-response.md) — `c.html()`, `c.body()` e responses
- [`11-testing.md`](./11-testing.md) — testar rotas que retornam HTML/JSX
- [`06-middleware-embutidos.md`](./06-middleware-embutidos.md) — middleware embutidos, incluindo `jsxRenderer`
