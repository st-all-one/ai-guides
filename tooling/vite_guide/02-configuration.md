# Configuração Vite — Referência Completa e Otimizada

## Estrutura da Config

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import type { UserConfig } from 'vite'

export default defineConfig({
  // === Shared Options (dev + build) ===
  root: process.cwd(),
  base: '/',
  mode: 'development',     // ou 'production'
  define: {},
  plugins: [],
  publicDir: 'public',
  cacheDir: 'node_modules/.vite',
  resolve: { /* ... */ },
  css: { /* ... */ },
  json: { /* ... */ },
  oxc: { /* ... */ },
  assetsInclude: [],
  envDir: 'root',
  envPrefix: 'VITE_',
  appType: 'spa',          // 'spa' | 'mpa' | 'custom'

  // === Build Options ===
  build: { /* ... */ },

  // === Server Options ===
  server: { /* ... */ },

  // === Preview Options ===
  preview: { /* ... */ },

  // === SSR Options ===
  ssr: { /* ... */ },

  // === Worker Options ===
  worker: { /* ... */ },

  // === Dep Optimization ===
  optimizeDeps: { /* ... */ },

  // === Experimental ===
  experimental: { /* ... */ },
  future: {},
  devtools: false,
})
```

## Config Condicional (Função)

```ts
export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  return {
    // command === 'serve' | 'build'
    // mode === 'development' | 'production'
    base: command === 'serve' ? '/' : '/app/',
    build: {
      sourcemap: mode === 'development',
    },
  }
})
```

## Resolve — Configuração de Módulos

```ts
resolve: {
  alias: {
    '@': '/src',
    '@components': '/src/components',
  },
  dedupe: ['react', 'react-dom'],           // Forçar versão única em monorepo
  conditions: ['module', 'browser', 'development|production'],  // condições de exports
  mainFields: ['browser', 'module', 'jsnext:main', 'jsnext'],
  extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  preserveSymlinks: false,
  tsconfigPaths: false,                      // Habilita paths do tsconfig (custo perf)
}
```

## CSS — Configuração Otimizada

```ts
css: {
  modules: {
    localsConvention: 'camelCaseOnly',      // .my-class → styles.myClass
    scopeBehaviour: 'local',                 // 'local' | 'global'
    generateScopedName: '[name]__[local]__[hash:base64:5]',
    hashPrefix: 'vite',
  },
  postcss: {                                 // ou postcss.config.js
    plugins: [autoprefixer, cssnano],
  },
  preprocessorOptions: {
    scss: {
      additionalData: `@import "@/styles/variables.scss";`,
      api: 'modern-compiler',               // Usar sass-embedded
    },
    less: {},
    styl: {},
  },
  preprocessorMaxWorkers: true,              // CPUs - 1 workers
  devSourcemap: false,                        // Experimental
  transformer: 'postcss',                     // 'postcss' | 'lightningcss'
  lightningcss: {                             // Experimental
    targets: { chrome: 111 },
    drafts: { nesting: true },
    cssModules: {},
  },
}
```

## JSON

```ts
json: {
  namedExports: true,        // Habilita named imports tree-shakeable
  stringify: 'auto',         // Stringify automático > 10kB
}
```

## Oxc — Transpilador

```ts
oxc: {
  target: 'esnext',                         // Dev target
  jsx: {
    runtime: 'automatic',                   // 'automatic' | 'classic'
    importSource: 'react',                  // ou 'preact', 'solid'
    pragma: 'React.createElement',
    pragmaFrag: 'React.Fragment',
  },
  jsxInject: `import React from 'react'`,   // Auto-inject
  include: /\.(ts|jsx|tsx)$/,
  exclude: /node_modules/,
}
```

## Build — Configuração Essencial

```ts
build: {
  target: 'baseline-widely-available',      // Chrome 111+, Edge 111+, Firefox 114+, Safari 16.4+
  outDir: 'dist',
  assetsDir: 'assets',
  assetsInlineLimit: 4096,                  // 4KB, 0 = desabilita
  cssCodeSplit: true,
  cssTarget: undefined,                     // Default: mesmo que build.target
  cssMinify: 'lightningcss',               // Default otimizado
  sourcemap: false,                         // true | 'inline' | 'hidden'
  minify: 'oxc',                            // 'oxc' (padrão) | 'terser' | false
  chunkSizeWarningLimit: 500,              // kB
  chunkImportMap: false,                    // Experimental
  reportCompressedSize: true,
  emptyOutDir: true,
  copyPublicDir: true,
  modulePreload: { polyfill: true },
  license: false,
  manifest: false,

  rolldownOptions: {
    input: {
      main: 'index.html',
    },
    output: {
      // codeSplitting: ... (ver 04-code-splitting.md)
    },
  },

  watch: null,
}
```

## Server — Dev Server

```ts
server: {
  host: 'localhost',
  port: 5173,
  strictPort: false,
  https: false,                              // ou https.ServerOptions
  open: false,
  proxy: {},                                 // Record<string, string | ProxyOptions>
  cors: { origin: ['http://localhost:3000'] },
  headers: {},
  hmr: { overlay: true },                    // false para desabilitar
  ws: { timeout: 30000 },
  warmup: {
    clientFiles: ['./src/main.ts'],
    ssrFiles: [],
  },
  watch: {
    ignored: ['**/node_modules/**', '**/.git/**'],
  },
  middlewareMode: false,
  fs: {
    strict: true,
    allow: ['.'],
    deny: ['.env', '.env.*', '*.{crt,pem,key}'],
  },
  origin: '',
  sourcemapIgnoreList: (sourcePath) =>
    sourcePath.includes('node_modules'),
}
```

## SSR

```ts
ssr: {
  external: [],                              // ou true para externalizar tudo
  noExternal: [],                            // ou true para bundar tudo
  target: 'node',                            // 'node' | 'webworker'
  resolve: {
    conditions: ['module', 'node', 'development|production'],
    externalConditions: ['node', 'module-sync'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
}
```

## Worker

```ts
worker: {
  format: 'iife',                            // 'es' | 'iife'
  plugins: () => [],
  rolldownOptions: {},
}
```

## Dep Optimization (Dev)

```ts
optimizeDeps: {
  entries: [],                               // tinyglobby patterns
  include: ['vue', '@vueuse/core'],
  exclude: ['large-dep-only-some-files'],
  rolldownOptions: {},
  force: false,
  noDiscovery: false,
  holdUntilCrawlEnd: true,
  needsInterop: [],
}
```

## Config Otimizada para Bundle JS + CSS + Fontes

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  // Base
  base: '/',
  appType: 'spa',

  // Resolve
  resolve: {
    alias: { '@': '/src' },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },

  // CSS otimizado
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[hash:base64:8]',
    },
    preprocessorOptions: {
      scss: { api: 'modern-compiler' },
    },
    transformer: 'lightningcss',
  },

  // Build otimizado
  build: {
    target: 'baseline-widely-available',
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    minify: 'oxc',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    reportCompressedSize: false,             // acelera build
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react'
            if (id.includes('lodash')) return 'vendor-lodash'
            return 'vendor'
          }
        },
      },
    },
  },

  // Server otimizado
  server: {
    warmup: {
      clientFiles: ['./src/main.ts', './src/router.ts'],
    },
  },
})
```

## .env Files — Ordem de Prioridade

1. `process.env` existentes (maior prioridade)
2. `.env.[mode].local`
3. `.env.[mode]`
4. `.env.local`
5. `.env` (menor prioridade)

**Nunca** coloque secrets em variáveis `VITE_*` — elas são bundadas no client.

## TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "useDefineForClassFields": true,
    "allowImportingTsExtensions": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Dicas de Performance na Config

1. **`resolve.extensions` mínimo** → menos filesystem checks
2. **`reportCompressedSize: false`** → acelera build
3. **`server.warmup.clientFiles`** → pré-transforma arquivos críticos
4. **`css.transformer: 'lightningcss'`** → processamento CSS nativo mais rápido
5. **`optimizeDeps.holdUntilCrawlEnd: false`** → mais paralelismo em cold start
6. **Use `resolve.alias` instead of `tsconfigPaths`** → melhor performance
