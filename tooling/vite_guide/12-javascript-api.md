# JavaScript API — Uso Programático

## Funções Exportadas

```ts
import {
  createServer,            // Criar servidor Vite programaticamente
  build,                   // Build programático
  preview,                 // Preview programático
  resolveConfig,           // Resolver config sem iniciar servidor
  mergeConfig,             // Merge deep de duas configs Vite
  searchForWorkspaceRoot,  // Encontrar root do workspace
  loadEnv,                 // Carregar .env files
  normalizePath,           // Normalizar path para POSIX
  transformWithOxc,        // Transformar JS/TS com Oxc Transformer
  loadConfigFromFile,      // Carregar config de arquivo específico
  preprocessCSS,           // Pré-processar CSS (experimental)
  version,                 // Versão do Vite (ex: "8.0.0")
  rolldownVersion,         // Versão do Rolldown
} from 'vite'
```

## createServer

```ts
import { createServer } from 'vite'

const server = await createServer({
  configFile: './vite.config.ts',
  root: process.cwd(),
  server: { port: 3000 },
})

await server.listen()

console.log(server.resolvedUrls)
// {
//   local: ['http://localhost:3000/'],
//   network: ['http://192.168.1.100:3000/'],
// }

server.bindCLIShortcuts({ print: true })
// Pressione 'p' + Enter para salvar CPU profile
```

### ViteDevServer — Interface Completa

```ts
interface ViteDevServer {
  config: ResolvedConfig
  middlewares: Connect.Server              // Express-like middleware stack
  httpServer: http.Server | null
  watcher: FSWatcher                       // Chokidar file watcher
  ws: WebSocketServer                      // WebSocket para HMR
  pluginContainer: PluginContainer
  moduleGraph: ModuleGraph
  resolvedUrls: ResolvedServerUrls | null

  transformRequest(url: string, options?: TransformOptions): Promise<TransformResult | null>
  transformIndexHtml(url: string, html: string, originalUrl?: string): Promise<string>

  // SSR (deprecado — use ModuleRunner)
  ssrLoadModule(url: string, options?: { fixStacktrace?: boolean }): Promise<Record<string, any>>
  ssrFixStacktrace(e: Error): void

  // Reload modules (deprecado — use environment.reloadModule)
  reloadModule(module: ModuleNode): Promise<void>

  listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>
  restart(forceOptimize?: boolean): Promise<void>
  close(): Promise<void>
  bindCLIShortcuts(options?: { print?: boolean }): void
  waitForRequestsIdle(ignoredId?: string): Promise<void>  // experimental
}
```

## build() — Programático

```ts
import { build } from 'vite'

// Build simples
const result = await build({
  root: './app',
  build: { outDir: './dist' },
})

// Com watch
const watcher = await build({
  build: { watch: {} },
})
// watcher.on('event', (event) => { ... })

// Build multi-environment
import { createBuilder } from 'vite'

const builder = await createBuilder({
  configFile: './vite.config.ts',
})
await builder.buildApp()
```

## preview()

```ts
import { preview } from 'vite'

const server = await preview({
  preview: { port: 4173 },
})

server.printUrls()
// ➜  Local:   http://localhost:4173/
// ➜  Network: http://192.168.1.100:4173/
```

## mergeConfig

```ts
import { mergeConfig } from 'vite'

const base = { build: { minify: 'oxc', sourcemap: false } }
const override = { build: { sourcemap: true } }

const merged = mergeConfig(base, override)
// { build: { minify: 'oxc', sourcemap: true } }

// Para sub-configs (build, server, etc), use isRoot = false:
const sub = mergeConfig(base.build, override.build, false)
```

## loadEnv

```ts
import { loadEnv } from 'vite'

// Carregar todas as variáveis (sem prefix filter)
const env = loadEnv('production', process.cwd(), '')

// Carregar apenas VITE_*
const viteEnv = loadEnv('production', process.cwd(), 'VITE_')
```

## searchForWorkspaceRoot

```ts
import { searchForWorkspaceRoot } from 'vite'

const root = searchForWorkspaceRoot(process.cwd())
// Procura package.json workspaces, lerna.json, pnpm-workspace.yaml
```

## normalizePath

```ts
import { normalizePath } from 'vite'

normalizePath('C:\\project\\src\\main.ts')
// → 'C:/project/src/main.ts'
```

## transformWithOxc

```ts
import { transformWithOxc } from 'vite'

const result = await transformWithOxc(code, filename, options, inMap)
// { code: string, map: SourceMap }
```

> Substitui `transformWithEsbuild` (deprecado).

## preprocessCSS (Experimental)

```ts
import { preprocessCSS } from 'vite'

const result = await preprocessCSS(
  `.card { color: red; }`,
  'style.css',
  { /* config */ }
)
// { code: '.card{color:red}', map?, modules?, deps? }
```

## loadConfigFromFile

```ts
import { loadConfigFromFile } from 'vite'

const { path, config } = await loadConfigFromFile(
  { command: 'build', mode: 'production' },
  './vite.config.ts'
)
```
