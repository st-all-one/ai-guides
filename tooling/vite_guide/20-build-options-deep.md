# Build Options — Detalhes Avançados

## cssTarget

```ts
build: {
  // Default: mesmo que build.target
  cssTarget: undefined,

  // Para Android WeChat WebView (não suporta #RGBA hex)
  cssTarget: 'chrome61',
}
```

Útil quando o target CSS precisa ser diferente do target JS.

## emitAssets e ssrEmitAssets

```ts
build: {
  // Forçar emissão de assets em builds não-client
  emitAssets: false,      // Framework deve mergear pós-build

  // Forçar emissão em builds client E SSR
  ssrEmitAssets: false,   // Será substituído por emitAssets
}
```

## write — Build Programático

```ts
build: {
  write: true,             // Escrever no disco (padrão)
  // write: false,         // Apenas bundle em memória (para pós-processamento)
}
```

Uso com JavaScript API:

```ts
import { build } from 'vite'

const result = await build({
  build: { write: false },
})

// result é OutputBundle — processar antes de escrever
for (const [name, chunk] of Object.entries(result.output)) {
  if (chunk.type === 'chunk') {
    // Modificar chunk antes de escrever manualmente
  }
}
```

## modulePreload.resolveDependencies (Experimental)

```ts
build: {
  modulePreload: {
    polyfill: true,
    resolveDependencies(url, deps, { hostId, hostType }) {
      // Controlar granularmente quais chunks preload
      // url: chunk URL sendo carregado
      // deps: dependências diretas do chunk
      // hostId: arquivo que contém o import()
      // hostType: 'js' | 'css' | 'html'

      // Priorizar chunks críticos
      if (url.includes('main')) {
        return deps  // Preload todas as deps
      }

      // Pular preload de chunks grandes
      return deps.filter(dep => !dep.includes('vendor-large'))
    },
  },
}
```

## dynamicImportVarsOptions

```ts
build: {
  dynamicImportVarsOptions: {
    include: [
      '**/src/pages/**',
      /\.page\.[jt]sx?$/,
    ],
    exclude: [
      '**/node_modules/**',
      /\.test\.[jt]sx?$/,
    ],
  },
}
```

Controla transformação de `import()` com variáveis:

```ts
// Vite tenta resolver em build time:
const page = await import(`./pages/${name}.js`)
```

## terserOptions.maxWorkers

```ts
build: {
  minify: 'terser',
  terserOptions: {
    compress: { drop_console: true },
    maxWorkers: 4,  // CPUs - 1 padrão
  },
}
```

## watch — Rebuild Automático

```ts
build: {
  watch: {
    // Opções do WatcherOptions do Rolldown
    include: ['src/**'],
    exclude: ['node_modules/**'],
    skipWrite: false,
  },
}
```

```bash
# CLI
vite build --watch
```

## build.cssMinify com Lightning CSS

```ts
build: {
  cssMinify: 'lightningcss',
  // 'lightningcss' (padrão) | 'esbuild' (deprecado) | false
}
```

Se `build.minify` for `false`, `cssMinify` também é `false` para client build.

## build.minify em Library Mode

```ts
build: {
  lib: { /* ... */ },
  minify: 'oxc',
  // Em lib mode 'es', minify NÃO minifica whitespaces
  // (remove pure annotations que quebram tree-shaking)
}
```

## build.sourcemap — Opções

```ts
build: {
  // false: sem sourcemap (padrão)
  sourcemap: false,

  // true: arquivo .map separado
  sourcemap: true,

  // 'inline': data URI no próprio bundle
  sourcemap: 'inline',

  // 'hidden': arquivo .map mas sem comentário no bundle
  sourcemap: 'hidden',
}
```

## build.reportCompressedSize

```ts
build: {
  reportCompressedSize: true,  // padrão: reporta gzip size
  // Desabilitar em CI para acelerar build:
  reportCompressedSize: false,
}
```

## build.chunkSizeWarningLimit

```ts
build: {
  chunkSizeWarningLimit: 500,  // kB (padrão)
}
```

Comparado contra **uncompressed** chunk size.
