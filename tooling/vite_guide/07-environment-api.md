# Environment API — Ambientes Múltiplos

## Conceito

A partir do Vite 6, o conceito de **Environment** foi formalizado. Cada ambiente (client, SSR, edge, worker) tem seu próprio pipeline de transformação, seu próprio module graph, e suas próprias configurações.

```
ViteDevServer
  ├── environments.client
  │     ├── moduleGraph
  │     ├── pluginContainer
  │     ├── transformRequest(url)
  │     └── hot (WebSocket)
  │
  ├── environments.ssr
  │     ├── moduleGraph
  │     ├── pluginContainer
  │     ├── runner (ModuleRunner)
  │     └── hot
  │
  └── environments.edge (custom)
        ├── moduleGraph
        ├── pluginContainer
        ├── dispatchFetch(Request) → Response
        └── hot
```

## Configuração de Ambientes

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  // Config global aplica a TODOS ambientes
  resolve: {
    conditions: ['module', 'browser', 'development|production'],
  },

  // Config específica por ambiente
  environments: {
    client: {
      resolve: { conditions: ['module', 'browser', 'development|production'] },
      build: {
        outDir: 'dist/client',
        minify: 'oxc',
      },
    },

    ssr: {
      resolve: {
        conditions: ['module', 'node', 'development|production'],
        externalConditions: ['node'],
      },
      build: {
        outDir: 'dist/server',
        minify: false,
        ssr: true,
      },
    },

    edge: {
      consumer: 'server',
      resolve: {
        conditions: ['module', 'edge', 'development|production'],
        noExternal: true,   // Tudo bundado para edge
      },
      dev: {
        createEnvironment(name, config) {
          return createEdgeDevEnvironment(name, config, {
            hot: true,
            transport: customHotChannel(),
          })
        },
      },
      build: {
        outDir: 'dist/edge',
        minify: false,
        rollupOptions: {
          output: { format: 'es' },
        },
      },
    },
  },
})
```

## Acessando Ambientes

```ts
import { createServer } from 'vite'

const server = await createServer({ /* config */ })

// Acessar ambientes
const clientEnv = server.environments.client
const ssrEnv = server.environments.ssr

// Transformar requisição em ambiente específico
const result = await clientEnv.transformRequest('/src/main.ts')
// result.code, result.map, result.etag

// Warmup de arquivos
await clientEnv.warmupRequest('/src/main.ts')
```

## ModuleRunner — SSR Moderno

Substitui `server.ssrLoadModule()`.

```ts
const serverEnv = server.environments.ssr

// Verificar se é Runnable (mesmo processo)
if (isRunnableDevEnvironment(serverEnv)) {
  const runner = serverEnv.runner
  const { render } = await runner.import('/src/entry-server.js')
  const html = render(url)
}
```

### Para Runtimes Diferentes (Fetchable)

```ts
if (isFetchableDevEnvironment(edgeEnv)) {
  const response = await edgeEnv.dispatchFetch(new Request('https://localhost/'))
  const html = await response.text()
}
```

### ModuleRunner API

```ts
import { ModuleRunner, ESModulesEvaluator } from 'vite/module-runner'

const runner = new ModuleRunner(
  {
    transport: {
      invoke(data) {
        return fetch('http://localhost:5173/module', {
          method: 'POST',
          body: JSON.stringify(data),
        }).then(r => r.json())
      },
    },
    hmr: true,
  },
  new ESModulesEvaluator(),
)

const { render } = await runner.import('/src/entry-server.js')
```

## Build Multi-Environment

```bash
vite build --app    # Experimental: build de todos ambientes
```

Ou programaticamente:

```ts
import { createBuilder } from 'vite'

const builder = await createBuilder({
  configFile: './vite.config.ts',
})

// Build todos ambientes (padrão: série)
await builder.buildApp()

// Build paralelo customizado
builder.buildApp = async (builder) => {
  const environments = Object.values(builder.environments)
  await Promise.all(environments.map(env => builder.build(env)))
}
```

### Config de Build por Ambiente

```ts
builder: {
  buildApp: async (builder) => {
    // Controle de ordem de build
    await builder.build(builder.environments.client)
    await builder.build(builder.environments.ssr)
    await builder.build(builder.environments.edge)
  },
}
```

## Transformações com this.environment

Em hooks de plugin, `this.environment` substitui o velho `options.ssr`:

```ts
// ❌ Antigo (Vite 5)
resolveId(id, importer, { ssr }) {
  if (ssr) { /* ... */ }
}

// ✅ Novo (Vite 8+)
resolveId(id, importer, options) {
  const isSSR = this.environment.config.consumer === 'server'
  const envName = this.environment.name
  const conditions = this.environment.config.resolve.conditions

  if (conditions.includes('node')) {
    // Tratamento específico para SSR
  }
}
```

## Module Graphs Separados

Cada ambiente tem seu próprio `EnvironmentModuleGraph`:

```ts
const clientGraph = clientEnv.moduleGraph
const ssrGraph = ssrEnv.moduleGraph

// Métodos
clientGraph.getModuleByUrl('/src/main.ts')
clientGraph.getModuleById('file:///src/main.ts')
clientGraph.getModulesByFile('/src/main.ts')
clientGraph.invalidateModule(module)
clientGraph.onFileChange('/src/main.ts')
```

## Custom Runtime Environment

```ts
import { DevEnvironment } from 'vite'

function createEdgeDevEnvironment(name, config, context) {
  const connection = new WebSocket('ws://edge-runtime:8080')
  const transport = {
    on: (listener) => connection.on('message', (data) => listener(JSON.parse(data))),
    send: (data) => connection.send(JSON.stringify(data)),
  }

  return new DevEnvironment(name, config, {
    hot: true,
    transport,
    options: {
      resolve: { conditions: ['edge', 'module'] },
      ...context.options,
    },
    remoteRunner: {
      inlineSourceMap: false,
    },
  })
}
```

## Flags de Futuro (Migração Suave)

```ts
future: {
  removeServerModuleGraph: 'warn',
  removeServerReloadModule: 'warn',
  removeServerPluginContainer: 'warn',
  removeServerHot: 'warn',
  removeServerTransformRequest: 'warn',
  removeServerWarmupRequest: 'warn',
  removePluginHookHandleHotUpdate: 'warn',
  removePluginHookSsrArgument: 'warn',
  removeSsrLoadModule: 'warn',
}
```

## Shared Plugins During Build

Para plugins que precisam de estado compartilhado entre ambientes durante build:

```ts
const myPlugin = (): Plugin => {
  return {
    name: 'shared-state-plugin',
    sharedDuringBuild: true,   // Opt-in para compartilhar estado

    perEnvironmentStartEndDuringDev: true,

    buildStart() {
      // Estado por ambiente
      if (!this.meta.cache) this.meta.cache = new Map()
      this.meta.cache.set(this.environment.name, [])
    },
  }
}

// Ou no projeto inteiro:
builder: {
  sharedConfigBuild: true,
}
```

## Exemplo Completo: App com Client + SSR + Edge

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  environments: {
    client: {
      build: {
        outDir: 'dist/client',
        manifest: true,
      },
    },

    ssr: {
      resolve: {
        conditions: ['module', 'node'],
        externalConditions: ['node'],
      },
      build: {
        outDir: 'dist/server',
        ssr: 'src/entry-server.ts',
        minify: false,
        emitAssets: true,
      },
      dev: {
        // RunnableDevEnvironment para SSR em dev
      },
    },

    edge: {
      consumer: 'server',
      resolve: {
        conditions: ['edge', 'module'],
        noExternal: true,
      },
      build: {
        outDir: 'dist/edge',
        rollupOptions: {
          output: { format: 'es' },
        },
      },
    },
  },

  build: {
    minify: 'oxc',
    cssMinify: 'lightningcss',
  },
})
```

## Quando Usar Cada Nível de Comunicação

| Nível              | Runtime           | Caso de Uso                   |
|--------------------|--------------------|--------------------------------|
| `RunnableDevEnvironment` | Mesmo processo | SSR tradicional (Node.js)    |
| `FetchableDevEnvironment` | HTTP/Fetch API  | Cloudflare Workers, Deno     |
| Raw `DevEnvironment`     | Custom transport  | Runtimes exóticos, embedded  |
