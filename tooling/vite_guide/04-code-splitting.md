# Code Splitting e Estratégia de Chunks

## Conceitos Fundamentais

O Vite (via Rolldown) faz code splitting automaticamente baseado em:
1. **Dynamic imports** (`import()`)
2. **CSS imports** de chunks assíncronos (separados automaticamente)
3. **Entry points** múltiplos (multi-page app)
4. **manualChunks** (configuração explícita)

## Estratégias de Chunking

### 1. Separação Automática por Vendor

```ts
build: {
  rolldownOptions: {
    output: {
      codeSplitting: {
        // Objeto: agrupa por padrão
        chunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@mui/material', '@emotion/react'],
          utils: ['lodash-es', 'date-fns'],
        },
      },
    },
  },
}
```

### 2. Função manualChunks (Recomendado)

```ts
build: {
  rolldownOptions: {
    output: {
      manualChunks(id: string) {
        // Vendor libraries
        if (id.includes('node_modules')) {
          // React ecosystem
          if (id.includes('react')) return 'vendor-react'
          if (id.includes('react-dom')) return 'vendor-react-dom'

          // UI libraries
          if (id.includes('@mui')) return 'vendor-mui'
          if (id.includes('antd')) return 'vendor-antd'

          // Utilities
          if (id.includes('lodash')) return 'vendor-lodash'
          if (id.includes('date-fns')) return 'vendor-utils'

          // Outros vendors
          return 'vendor'
        }

        // Pages (lazy loaded)
        if (id.includes('/src/pages/')) {
          const match = id.match(/\/src\/pages\/(.+?)\//)
          if (match) return `page-${match[1]}`
        }

        // Shared components (se > 2KB após tree-shake)
        if (id.includes('/src/components/')) {
          if (id.includes('shared') || id.includes('common')) {
            return 'shared-components'
          }
        }
      },
    },
  },
}
```

### 3. Por Tamanho e Frequência de Uso

```ts
// Estratégia híbrida: vendor + shared + pages
build: {
  chunkSizeWarningLimit: 300,  // Alerta em 300kB
  rolldownOptions: {
    output: {
      manualChunks(id, { getModuleInfo }) {
        // Agrupa módulos importados por mais de 2 entry points
        if (id.includes('/src/')) {
          const module = getModuleInfo(id)
          if (module && module.importers.length >= 2) {
            return 'shared'
          }
        }

        // Vendor splitting
        if (id.includes('node_modules')) {
          if (id.includes('react')) return 'vendor-react'
          if (id.includes('react-dom')) return 'vendor-react-dom'
          return 'vendor'
        }
      },
    },
  },
}
```

## CSS Code Splitting

Por padrão, CSS de chunks assíncronos é extraído em arquivos separados:

```ts
build: {
  cssCodeSplit: true,   // PADRÃO — CSS por chunk assíncrono

  // Desabilitar: todo CSS em um arquivo
  cssCodeSplit: false,
}
```

**Benefício**: Previne FOUC (Flash of Unstyled Content) — CSS é carregado via `<link>` junto com o chunk.

## Dynamic Import Pattern

```ts
// ❌ Ineficiente — Vite não consegue analisar
const page = await import(`./pages/${route}.vue`)

// ✅ Eficiente — mapeamento explícito
const pages: Record<string, () => Promise<any>> = {
  home: () => import('./pages/home.vue'),
  about: () => import('./pages/about.vue'),
  contact: () => import('./pages/contact.vue'),
}

const page = await pages[route]()
```

### Dynamic Import com Variáveis (Controlado)

```ts
build: {
  dynamicImportVarsOptions: {
    include: ['/src/pages/**'],
    exclude: ['/src/pages/admin/**'],
  },
}
```

## Multi-Page App (MPA)

```ts
build: {
  rolldownOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      about: resolve(__dirname, 'about/index.html'),
      blog: resolve(__dirname, 'blog/index.html'),
    },
  },
}
```

Cada entry point gera seu próprio grafo de módulos e chunks independentes.

## Library Mode

```ts
build: {
  lib: {
    entry: 'src/index.ts',
    name: 'MyLibrary',
    formats: ['es', 'cjs'],     // ou ['es', 'umd']
    fileName: (format) => `my-lib.${format}.js`,
    cssFileName: 'styles',
  },
}
```

**Regras do Library Mode:**
- `cssCodeSplit` default: `false` (tudo em um CSS)
- `assetsInlineLimit` é **ignorado** (assets sempre inlined)
- `modulePreload.polyfill` não se aplica
- Para múltiplos entry points: `formats` default é `['es', 'cjs']`
- Para entry único: `formats` default é `['es', 'umd']`

## Preload Directives

Vite gera automaticamente `<link rel="modulepreload">` para chunks de entrada e imports diretos:

```html
<link rel="modulepreload" href="/assets/index.abc123.js">
<link rel="modulepreload" href="/assets/vendor.def456.js">
```

Isso acelera o carregamento fazendo o browser baixar módulos em paralelo antes de executá-los.

## Async Chunk Loading Optimization

O Vite reescreve chamadas de `import()` dinâmico para incluir **preload step**:

```js
// Antes
const module = await import('./lazy.js')

// Depois (Rolldown transforma)
const module = await __vitePreload(() => import('./lazy.js'), true)
```

Chunks comuns são carregados em paralelo, eliminando roundtrips de rede.

## Estratégia de Nomes de Chunks

```ts
build: {
  rolldownOptions: {
    output: {
      entryFileNames: 'assets/[name].[hash].js',
      chunkFileNames: 'assets/[name].[hash].js',
      assetFileNames: 'assets/[name].[hash][extname]',
    },
  },
}
```

**Hash**: Content hash (muda apenas quando o conteúdo muda), essencial para cache de longa duração.

## Estratégia Recomendada para Apps Grandes

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 400,
    modulePreload: { polyfill: true },
    rolldownOptions: {
      output: {
        manualChunks(id) {
          // 1. Vendor splitting
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-core'
            if (id.includes('lodash') || id.includes('date-fns')) return 'vendor-utils'
            if (id.includes('@mui') || id.includes('antd')) return 'vendor-ui'
            if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n'
            return 'vendor-misc'
          }

          // 2. Pages (cada página é lazy load)
          if (id.includes('/src/pages/')) {
            const pageName = id.match(/\/src\/pages\/(.+?)\//)
            if (pageName) return `page-${pageName[1]}`
          }

          // 3. Shared components (usados por 2+ páginas)
          if (id.includes('/src/components/shared/')) {
            return 'shared'
          }
        },
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      },
    },
  },
})
```

## Cache Invalidation Strategy

```ts
build: {
  // Content hash garante cache busting automático
  // Configurar headers no servidor:
  //     /assets/* → Cache-Control: public, max-age=31536000, immutable
  //     /index.html → Cache-Control: no-cache
}
```

Para evitar que usuários com chunk antigo quebrem quando novos deploys removem chunks:

```ts
// Tratar erro de preload
window.addEventListener('vite:preloadError', (event) => {
  window.location.reload()
})
```

## Comparação de Estratégias

| Estratégia               | Caso de Uso                     | Prós                          | Contras                    |
|--------------------------|----------------------------------|-------------------------------|----------------------------|
| Single bundle            | App pequena (< 50kB)            | Simplicidade                  | Sem lazy loading           |
| Vendor + App             | App média                       | Cache vendor independente     | Vendor pode crescer        |
| Vendor multi-package     | App com várias libs grandes     | Cache granular                | Muitos requests            |
| Vendor + Pages + Shared  | App grande com lazy routes      | Carregamento sob demanda      | Configuração complexa      |
| Entry points per page    | MPA                             | Independência total           | Duplicação de código       |
| Library Mode             | Publicação de biblioteca        | Formatos múltiplos            | Configuração específica    |
