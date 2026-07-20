# Plugin Supplements — Utility Functions e Detalhes

## createFilter

```ts
import { createFilter } from 'vite'

// Cria função de filtro include/exclude (picomatch)
const filter = createFilter(
  ['**/*.ts', '**/*.tsx'],          // include
  ['**/*.spec.ts', '**/*.test.tsx'], // exclude
)

// Uso em hooks:
transform(code, id) {
  if (!filter(id)) return
  // Processar...
}
```

## normalizePath

```ts
import { normalizePath } from 'vite'

normalizePath('C:\\project\\src\\main.ts')
// → 'C:/project/src/main.ts'

normalizePath('project\\src\\main.ts')
// → 'project/src/main.ts'
```

Sempre use ao comparar paths de arquivos (cross-platform).

## this.meta.rolldownVersion

```ts
transform(code, id) {
  // Detectar se está rodando em Vite 8+ (Rolldown)
  if (this.meta.rolldownVersion) {
    // Comportamento específico para Rolldown
  } else {
    // Fallback para Rollup
  }
}
```

## Output Bundle Metadata

```ts
generateBundle(_, bundle) {
  for (const [name, chunk] of Object.entries(bundle)) {
    if (chunk.type === 'chunk') {
      const meta = chunk.viteMetadata
      if (meta) {
        console.log(`Chunk: ${name}`)
        console.log(`  CSS imports: ${[...meta.importedCss].join(', ')}`)
        console.log(`  Asset imports: ${[...meta.importedAssets].join(', ')}`)
      }
    }
  }
}
```

Disponível em `RenderedChunk`, `OutputChunk`, `OutputAsset`.

## transformIndexHtml — injectTo

```ts
transformIndexHtml(html, ctx) {
  return [
    // Antes de tudo no <head>
    {
      tag: 'meta',
      attrs: { charset: 'utf-8' },
      injectTo: 'head-prepend',
    },
    // No final do <head>
    {
      tag: 'link',
      attrs: { rel: 'preconnect', href: 'https://api.example.com' },
      injectTo: 'head',
    },
    // Antes de tudo no <body>
    {
      tag: 'script',
      children: 'console.log("start")',
      injectTo: 'body-prepend',
    },
    // No final do <body>
    {
      tag: 'script',
      attrs: { src: '/analytics.js' },
      injectTo: 'body',
    },
  ]
}
```

## Hook Filters (Rolldown) — Performance

```ts
// Rolldown-introduced: reduz comunicação Rust↔JS

const myPlugin: Plugin = {
  name: 'optimized-plugin',

  // Filter no resolveId
  resolveId: {
    filter: { id: /^virtual:/ },
    handler(id, importer, options) {
      // Só chamado para ids começando com 'virtual:'
    },
  },

  // Filter no transform
  transform: {
    filter: { id: /\.vue\?.*type=style/ },
    handler(code, id) {
      // Só chamado para .vue com type=style
    },
  },
}

// Backward compatibility (se filter não for suportado):
transform(code, id) {
  if (!/\.vue\?.*type=style/.test(id)) return  // fallback
}
```

## Plugin Compatibility (Rolldown)

Plugins Rolldown funcionam como Vite plugins se:

- **Não** usam `moduleParsed` hook (evita AST parse)
- **Não** dependem de `transform.inject` (Rolldown-specific)
- **Não** têm acoplamento forte bundle-phase ↔ output-phase

Hooks **não suportados** no pipeline Rolldown:
- `resolveImportMeta`
- `renderDynamicImport`
- `resolveFileUrl`
- `shouldTransformCachedModule`
- `parseAst` / `parseAstAsync` (use `parseSync` / `parse`)

## Chunk Import Map para Plugins

```ts
// Quando build.chunkImportMap: true
// Chunks usam IDs únicos em vez de file paths

buildStart() {
  this.meta.chunkImportMap = true
}

renderChunk(code, chunk) {
  // chunk.id = ID único (não file path)
  // Access import map via:
}

generateBundle(_, bundle) {
  // Import map disponível durante writeBundle/generateBundle
  for (const [name, chunk] of Object.entries(bundle)) {
    if (chunk.type === 'chunk') {
      console.log(chunk.id, chunk.fileName)
    }
  }
}
```

## Migration v6→v7 (Referência Rápida)

| Vite 6                     | Vite 7                        |
|----------------------------|--------------------------------|
| Rollup (build)             | Rolldown (build, experimental) |
| esbuild (dev)              | Oxc (dev, experimental)        |
| `build.rollupOptions`      | `build.rolldownOptions` (compat)|
| `optimizeDeps.esbuildOptions` | `optimizeDeps.rolldownOptions` |
| esbuild minifier           | Oxc minifier (opt-in)          |
| `transformWithEsbuild`     | `transformWithOxc` (opt-in)    |

**Vite 7** foi uma transição com backward compatibility. **Vite 8** removeu as opções antigas.
