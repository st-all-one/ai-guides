# Plugin API — Desenvolvimento de Plugins Vite

## Arquitetura de Plugins

Os plugins Vite estendem a interface de plugins do Rolldown com adições específicas do Vite. Funcionam tanto em dev quanto em build com uma única implementação.

### Estrutura Básica

```ts
import type { Plugin } from 'vite'

function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    enforce: 'pre',  // 'pre' | undefined | 'post'
    apply: 'build',  // 'serve' | 'build' | ((config, env) => boolean)

    // Hooks globais (uma vez)
    config(config, env) {},
    configResolved(config) {},
    configureServer(server) {},
    configurePreviewServer(server) {},

    // Hooks por ambiente
    buildStart() {},
    resolveId(id, importer, options) {},
    load(id, options) {},
    transform(code, id, options) {},
    buildEnd() {},
    closeBundle() {},
    renderChunk(code, chunk, options) {},
    generateBundle() {},
    writeBundle() {},

    // Hooks específicos Vite
    transformIndexHtml(html, ctx) {},
    handleHotUpdate(ctx) {},  // Deprecado → usar hotUpdate
    hotUpdate(options) {},
    configEnvironment(name, config, env) {},
    applyToEnvironment(environment) {},
  }
}
```

## Ordem de Execução dos Hooks

```
Config Phase (global):
  config → configEnvironment (por env) → configResolved

Server Phase (global):
  configureServer / configurePreviewServer

Module Processing (por ambiente):
  buildStart → resolveId → load → transform → (repete)

HMR (por ambiente):
  hotUpdate

Build Output (por ambiente):
  renderChunk → generateBundle → writeBundle

Teardown:
  buildEnd → closeBundle
```

## Ordem dos Plugins (enforce)

| Ordem | Fase                   |
|-------|------------------------|
| 1     | Alias (Vite core)      |
| 2     | `enforce: 'pre'`       |
| 3     | Vite core plugins      |
| 4     | Sem enforce            |
| 5     | Vite build plugins     |
| 6     | `enforce: 'post'`      |
| 7     | Vite post-build plugins |

## Hook Filters (Performance)

Rolldown introduziu filtros para reduzir comunicação Rust↔JS:

```ts
transform: {
  filter: { id: /\.vue\?.*type=style/ },
  handler(code, id) {
    // Só é chamado para arquivos .vue com type=style
  },
}
```

```ts
resolveId: {
  filter: { id: /^virtual:/ },
  handler(id, importer, options) {
    // Só chamado para ids começando com 'virtual:'
  },
}
```

## Hooks Detalhados

### config

```ts
config(config: UserConfig, env: {
  mode: string,
  command: 'build' | 'serve',
  isSsrBuild?: boolean,
  isPreview?: boolean,
}): UserConfig | null | void
```

Use para modificar a config. **Não** injete plugins aqui (já foram resolvidos):

```ts
config(config) {
  return {
    define: { __MY_FLAG__: JSON.stringify(true) },
    resolve: {
      alias: { '@my-lib': path.resolve(__dirname, 'src') },
    },
  }
}
```

### configResolved

```ts
configResolved(config: ResolvedConfig): void | Promise<void>
```

Guarde a config final para uso em outros hooks:

```ts
let resolvedConfig: ResolvedConfig

configResolved(config) {
  resolvedConfig = config
}
```

### configureServer

```ts
configureServer(server: ViteDevServer): (() => void) | void | Promise<(() => void) | void>
```

Para adicionar middlewares customizados. Retorne uma função para injetar **após** middlewares internos:

```ts
configureServer(server) {
  // Middleware que roda ANTES dos internos
  server.middlewares.use((req, res, next) => {
    if (req.url === '/custom') {
      res.end('custom response')
      return
    }
    next()
  })

  // Função retornada roda DEPOIS dos internos (post middleware)
  return () => {
    server.middlewares.use((req, res, next) => {
      // Fallback handler
      next()
    })
  }
}
```

### transformIndexHtml

```ts
transformIndexHtml: {
  order: 'pre', // 'pre' | 'post'
  handler(html: string, ctx: {
    path: string,
    filename: string,
    server?: ViteDevServer,
    bundle?: OutputBundle,
    chunk?: OutputChunk,
    originalUrl?: string,
  }): IndexHtmlTransformResult | void
}
```

### hotUpdate (Vite 8+)

```ts
hotUpdate(options: HotUpdateOptions): Array<EnvironmentModuleNode> | void | Promise<...>

interface HotUpdateOptions {
  type: 'create' | 'update' | 'delete'
  file: string
  timestamp: number
  modules: Array<EnvironmentModuleNode>
  read: () => string | Promise<string>
  server: ViteDevServer
}
```

```ts
hotUpdate({ file, modules, read }) {
  // Filtrar módulos para evitar HMR desnecessário
  if (file.endsWith('.css')) {
    return modules.filter(m => m.type === 'css')
  }

  // Forçar full reload se necessário
  if (file.includes('config')) {
    return []  // Array vazio = full reload
  }
}
```

### applyToEnvironment

```ts
applyToEnvironment(environment: PartialEnvironment): boolean | PluginOption | Promise<boolean | PluginOption>
```

Controle granular de quais ambientes o plugin se aplica:

```ts
applyToEnvironment(environment) {
  if (environment.name === 'ssr') {
    return false  // Não aplica em SSR
  }
  if (environment.name === 'client') {
    return true   // Aplica em client
  }
  // Retorna um novo plugin para ambientes customizados
  return {
    name: `plugin-${environment.name}`,
    transform(code, id) { /* ... */ },
  }
}
```

### configEnvironment

```ts
configEnvironment(name: string, config: EnvironmentOptions, env: {
  mode: string,
  command: string,
}): EnvironmentOptions | null | void
```

Configure cada ambiente individualmente:

```ts
configEnvironment(name, config) {
  if (name === 'ssr') {
    config.resolve.conditions = ['node', 'module']
  }
  if (name === 'edge') {
    config.resolve.noExternal = true
  }
}
```

## Plugin Context

```ts
transform(code: string, id: string, options?: TransformOptions) {
  // Meta informações
  console.log(this.meta.viteVersion)     // Versão do Vite
  console.log(this.environment.name)     // Nome do ambiente atual
  console.log(this.environment.config)   // Config do ambiente

  // Resolver módulos
  const resolved = await this.resolve('./dep', id)

  // Emitir arquivos
  this.emitFile({ type: 'asset', name: 'custom.css', source: '...' })

  // Warn
  this.warn('deprecated feature used in ' + id)
}
```

## Client-Server Communication

### Server → Client

```ts
// No plugin (server)
server.ws.send('custom:event', { message: 'hello' })

// No client
import.meta.hot.on('custom:event', (data) => {
  console.log(data.message)
})
```

### Client → Server

```ts
// No client
import.meta.hot.send('custom:event', { type: 'action' })

// No plugin (server)
server.ws.on('custom:event', (data, client) => {
  console.log('received from client:', data)
})
```

### Tipagem TypeScript

```ts
// types/customEvent.d.ts
import 'vite/types/customEvent'

declare module 'vite/types/customEvent' {
  interface CustomEventMap {
    'custom:my-event': { value: number }
  }
}
```

## Per-Environment State

```ts
import { perEnvironmentState } from 'vite'

const stateMap = perEnvironmentState(() => new Map())

transform(code, id) {
  const state = stateMap(this.environment)
  state.set(id, { transformed: true })
}
```

Com flag:

```ts
perEnvironmentStartEndDuringDev: true,  // buildStart/buildEnd chamados por ambiente

// Em dev, usar:
buildStart() {
  const state = new Map()
  // estado por ambiente
}
```

## Compatibilidade com Plugins Rolldown/Rollup

Plugins Rolldown funcionam como plugins Vite se:
- Não usam `moduleParsed` hook
- Não dependem de `transform.inject`
- Não têm acoplamento forte entre bundle-phase e output-phase hooks

## Plugins Úteis para Bundle Otimizado

```ts
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'
import legacy from '@vitejs/plugin-legacy'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    // Dev tools
    inspect(),             // Visualizar transformações

    // Legacy browsers
    legacy({
      targets: ['defaults', 'not IE 11'],
      modernPolyfills: ['es.global-this'],
    }),

    // SSL para dev
    basicSsl(),

    // Plugin condicional
    process.env.ANALYZE && {
      name: 'analyze',
      generateBundle(_, bundle) {
        for (const [name, chunk] of Object.entries(bundle)) {
          if (chunk.type === 'chunk') {
            console.log(`${name}: ${chunk.code.length} bytes`)
          }
        }
      },
    },
  ],
})
```

## Padrão para Plugin de Otimização

```ts
function optimizatorPlugin(): Plugin {
  let config: ResolvedConfig

  return {
    name: 'optimizator',

    configResolved(cfg) {
      config = cfg
    },

    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return {
          html,
          tags: [
            {
              tag: 'link',
              attrs: {
                rel: 'dns-prefetch',
                href: 'https://api.example.com',
              },
              injectTo: 'head',
            },
          ],
        }
      },
    },

    renderChunk(code, chunk) {
      if (chunk.type === 'chunk' && chunk.isEntry) {
        // Pós-processamento de chunk de entrada
        return code.replace(/__BUILD_TIME__/g, JSON.stringify(Date.now()))
      }
    },

    generateBundle(_, bundle) {
      console.log(`Generated ${Object.keys(bundle).length} files`)
    },
  }
}
```

## Dicas de Performance para Plugins

1. **Use `filter`** para evitar chamadas desnecessárias Rust↔JS
2. **Cacheie resultados** de `resolveId`, `load`, `transform`
3. **Evite operações lentas** em `buildStart`, `config`, `configResolved`
4. **Use `this.meta.viteVersion`** para compatibilidade
5. **State por ambiente** com `perEnvironmentState`
6. **Transforme apenas o necessário** — verifique extensão/pattern antes de processar
