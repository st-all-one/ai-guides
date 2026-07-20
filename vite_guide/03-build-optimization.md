# Otimização de Bundle — JS + CSS + Fontes

## Pipeline de Build (Vite 8)

```
Source Code
    │
    ▼
┌──────────────────────┐
│   Oxc Transpiler     │  TS/JSX → JS, define, alias
│   (Rust, paralelo)   │
└──────────────────────┘
    │
    ▼
┌──────────────────────┐
│   Rolldown Bundler   │  Tree-shaking, code splitting,
│   (Rust)             │  chunking, asset hash
└──────────────────────┘
    │
    ├──► JS  ──► Oxc Minifier ──► .js
    ├──► CSS ──► Lightning CSS ──► .css
    └──► Assets ──► hash + inline or file
```

## Minificação JS — Oxc vs Terser

```ts
// vite.config.ts — comparativo
build: {
  // PADRÃO (recomendado) — 30-90× mais rápido
  minify: 'oxc',

  // Alternativa com compressão máxima (mais lento)
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,         // remove console.log
      drop_debugger: true,
      pure_funcs: ['console.log'], // remove chamadas específicas
    },
    mangle: {
      properties: { regex: /^_/ }, // mangla props privadas
    },
    format: {
      comments: false,
    },
    maxWorkers: 4,                // CPUs - 1 padrão
  },

  // Desabilitado
  minify: false,
}
```

**⚠️ Aviso**: Oxc Minifier não suporta `mangleProps`. Use Terser se precisar.

## Minificação CSS

```ts
build: {
  // PADRÃO: Lightning CSS (recomendado)
  cssMinify: 'lightningcss',

  // Fallback
  cssMinify: 'esbuild',           // Deprecado em Vite 8

  // Desabilitado (se minify for false, cssMinify também é false)
  cssMinify: false,
}
```

Lightning CSS também pode ser usado como transpiler completo:

```ts
css: {
  transformer: 'lightningcss',    // Experimental
  lightningcss: {
    targets: { chrome: 111, firefox: 114 },
    drafts: { nesting: true },
    include: Features.Nesting,     // Habilita CSS nesting
    unusedSymbols: [],             // Remove classes não usadas
  },
}
```

## Tree-Shaking — Técnicas Avançadas

### 1. Named Imports de JSON
```ts
// ❌ Import inteiro
import data from './data.json'
// ✅ Apenas o campo usado (tree-shakeable)
import { field } from './data.json'
```

### 2. Glob Import com Named Export
```ts
// ❌ Importa módulos inteiros
const modules = import.meta.glob('./locales/*.json', { eager: true })

// ✅ Importa apenas o campo 'default' de cada módulo
const modules = import.meta.glob('./locales/*.json', {
  eager: true,
  import: 'default',  // tree-shakeable
})
```

### 3. Dynamic Import com Variáveis
```ts
// ❌ Evitar: força Vite a incluir todos os matches
const page = await import(`./pages/${route}.vue`)

// ✅ Melhor: explícito
const pages = {
  home: () => import('./pages/home.vue'),
  about: () => import('./pages/about.vue'),
}
const page = await pages[route]()
```

### 4. Evitar Barrel Files
```ts
// ❌ barrel/index.ts — carrega TUDO
export * from './utils/foo'
export * from './utils/bar'
export * from './utils/baz'

// ✅ Import direto — tree-shaking funciona
import { foo } from './utils/foo'
```

### 5. Guardas `import.meta.hot` para Tree-Shaking
```ts
if (import.meta.hot) {
  // Este bloco é removido em produção
  import.meta.hot.accept()
}
```

## Asset Inlining — Controle Fino

```ts
build: {
  assetsInlineLimit: 4096,  // 4KB padrão
  // assetsInlineLimit: 0   // Desabilita inlining (útil para CSP)

  // Ou controle por arquivo
  assetsInlineLimit: (filePath, content) => {
    if (filePath.endsWith('.svg')) return true     // sempre inline
    if (filePath.endsWith('.woff2')) return content.length < 1024 * 10  // < 10KB
    return undefined  // default: 4KB
  },
}
```

**⚠️ CSP**: Se usar CSP, `data:` não pode ser permitido em `script-src`. Configure `assetsInlineLimit: 0` ou permita `data:` em `img-src` e `font-src`.

## Import Queries — Controle Explícito

```ts
import url from './image.png?url'           // URL explícita
import raw from './file.txt?raw'             // String crua
import inline from './image.svg?inline'      // Base64 inline forçado
import noInline from './image.svg?no-inline'  // Previne inlining
import worker from './worker.js?worker'       // Web Worker separado
import sharedWorker from './worker.js?sharedworker' // SharedWorker
import workerInline from './worker.js?worker&inline' // Worker inline
```

## Chunk Import Map (Experimental)

```ts
build: {
  chunkImportMap: true,
  // Cria importmap.json mapeando chunk IDs → URLs
  // Previne cache invalidation em cascata
}
```

Requer suporte a `import.meta.resolve` no browser. O import map é gerado no `importmap.json` e deve ser injetado no HTML:

```html
<script type="importmap">
{
  "imports": {
    "chunk-abc123.js": "/assets/chunk-abc123.js",
    "chunk-def456.js": "/assets/chunk-def456.js"
  }
}
</script>
```

## Module Preload — Configuração

```ts
build: {
  modulePreload: {
    polyfill: true,  // Auto-injetado no index.html

    // Experimental: controle granular de preload
    resolveDependencies(url, deps, { hostId, hostType }) {
      // Priorizar preload de chunks críticos
      return deps.filter(dep => dep.includes('main'))
    },
  },
}
```

## Define — Substituição em Build Time

```ts
define: {
  __APP_VERSION__: JSON.stringify('1.0.0'),
  __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  __DEV__: "process.env.NODE_ENV === 'development'",
}
```

Valores são substituídos literalmente pelo Oxc durante transpilação.

## License Generation

```ts
build: {
  license: {
    fileName: 'licenses.md',      // ou .json
  },
  // Gera .vite/license.md ou caminho customizado
}
```

## Config Otimizada para Bundle Pequeno

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',                   // Melhor compressão (mais lento)
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.warn'],
      },
      format: { comments: false },
    },
    cssMinify: 'lightningcss',
    cssCodeSplit: true,
    assetsInlineLimit: 8192,           // Inline até 8KB
    chunkSizeWarningLimit: 300,
    reportCompressedSize: false,
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'vendor-react-dom'
            if (id.includes('react')) return 'vendor-react'
            return 'vendor'
          }
          if (id.includes('src/pages/')) {
            return 'pages'
          }
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
})
```

## Análise de Bundle

```bash
# Visualizar bundle analysis
npx vite build -- --rollupOptions output.manualChunks {}

# Usar vite-plugin-inspect
npm i -D vite-plugin-inspect

# Adicionar ao config
import inspect from 'vite-plugin-inspect'
plugins: [inspect()]

# Acessar /__inspect/ durante dev ou build
```

## Métricas de Otimização

| Técnica                        | Redução Potencial | Esforço |
|--------------------------------|-------------------|---------|
| Tree-shaking (named imports)   | 20-60%           | Baixo   |
| Code splitting por rota        | 30-50%           | Médio   |
| Drop console/debugger          | 2-5%             | Baixo   |
| CSS Code Splitting             | 10-30%           | Nenhum  |
| Asset Inlining (≤4KB)          | Reduz requests   | Nenhum  |
| Chunk Import Map               | Melhora cache    | Médio   |
| Lightning CSS transformer      | 5-10% CSS menor  | Baixo   |
| Terser (vs Oxc)                | 0.5-2% menor JS  | Custo build |
| Evitar barrel files            | 10-40%           | Baixo   |
| Dynamic imports com lazy       | 20-50%           | Médio   |
