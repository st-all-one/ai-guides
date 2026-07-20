# CSS, SVG e Performance — Casos de Borda

## SVG url() em JS

```ts
import imgUrl from './image.svg'

// ⚠️ Quando usar url() em JS, envolva em double quotes:
const style = { backgroundImage: `url("${imgUrl}")` }
// Não funciona: `url(${imgUrl})`
```

## CSS @import Inlining e Rebasing

Vite configura `postcss-import` automaticamente. Isso significa:

```css
/* @import é inlinado automaticamente */
@import '@/styles/variables.css';

/* url() é rebaseado */
background: url('../images/bg.png');
/* Produção: background: url(/assets/bg.abc123.png) */

/* Aliases do resolve funcionam em @import */
@import 'my-lib/styles.css';
```

⚠️ Para Sass/Less, `@import` aliases também funcionam via `additionalData` ou `resolve.alias`.

## CSS Preprocessor — additionalData

```ts
css: {
  preprocessorOptions: {
    scss: {
      // String simples
      additionalData: `@use "@/styles/variables" as *;\n`,

      // Função (recomendado para evitar duplicação)
      additionalData: (source: string, filename: string) => {
        // Não injetar em partials (começam com _)
        if (filename.includes('_variables.scss')) return source
        return `@use "@/styles/variables" as *;\n${source}`
      },
    },
  },
}
```

## Lightning CSS — Recursos Avançados

```ts
css: {
  transformer: 'lightningcss',
  lightningcss: {
    targets: { chrome: 111 },
    include: Features.Nesting | Features.CustomMedia,
    exclude: Features.LogicalProperties,
    drafts: {
      nesting: true,
      customMedia: true,
    },
    nonStandard: {
      deepSelectorCombinator: true,  // /deep/ compat
    },
    pseudoClasses: {
      hover: ':hover',              // Alternativas para pseudo-classes
      active: ':active',
      focus: ':focus-visible',
    },
    unusedSymbols: ['.legacy-class'],  // Remove classes específicas
    cssModules: {
      pattern: '[hash]_[local]',
    },
  },
}
```

## CSS Critical Path

Para extrair CSS crítico (above the fold):

```ts
// Plugin example
function criticalCSS(): Plugin {
  return {
    name: 'critical-css',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Extrair CSS crítico e inline no head
        const critical = extractCriticalFromHTML(html)
        return {
          html,
          tags: [{
            tag: 'style',
            children: critical,
            injectTo: 'head',
          }],
        }
      },
    },
  }
}
```

## Git LPS Placeholder — Exclusão Automática

```ts
build: {
  assetsInlineLimit: 4096,
  // Arquivos com Git LPS (filter=lfs no .gitattributes)
  // são automaticamente excluídos de inlining,
  // mesmo que abaixo do limite.
}
```

## Performance — Diagnóstico Detalhado

### Browser Setup

```bash
# Para testes de performance realísticos:
# 1. Use perfil de navegação sem extensões
# 2. Modo incógnito
# 3. NÃO habilite "Disable Cache" no DevTools
#    (Vite usa HTTP cache para deps e módulos)
```

### Audit de Plugins

```bash
# Slow server starts? Verifique:
# 1. Dependências grandes carregadas em buildStart
#    → Use dynamic import: `const heavy = await import('heavy')`
vite --debug plugin-transform

# 2. Hooks config/configResolved lentos
# 3. resolveId/load/transform sem filtro
#    → Verifique extensão/pattern antes de processar
```

### Warm Up — Detalhes

```ts
server: {
  warmup: {
    clientFiles: [
      './src/main.ts',
      // Use tinyglobby patterns:
      './src/components/**/*.tsx',
      './src/pages/**/*.tsx',
    ],
  },
}
```

```bash
# Visualizar warmup candidates:
vite --debug transform
# Logs mostram transform times → adicione ao warmup os mais lentos

# Auto-warmup via server.open ou --open:
server: { open: true }
# A página inicial é transformada automaticamente
```

### Prefira Ferramentas Nativas

```ts
// ✅ CSS > SCSS (menos processamento)
// Use nesting nativo (Lightning CSS ou PostCSS)
css: {
  transformer: 'lightningcss',
  lightningcss: { drafts: { nesting: true } },
}

// ✅ SVG como string/URL > componente
import icon from './icon.svg?raw'
import iconUrl from './icon.svg?url'

// ❌ Evite transformar SVGs em componentes framework
// (custa processamento e aumenta bundle)
```

### Evitar Barrel Files — Detalhado

```ts
// ❌ Barrel file: src/utils/index.ts
export { foo } from './foo'
export { bar } from './bar'
export { baz } from './baz'

// Quando outro módulo importa:
import { foo } from '@/utils'
// → Rolldown precisa resolver os 3 exports
// → Se algum export depende de lib grande, toda lib é incluída

// ✅ Import direto:
import { foo } from '@/utils/foo'
// → Tree-shaking funciona perfeitamente
```

## Worker Options

```ts
worker: {
  format: 'iife',             // 'es' | 'iife' (padrão: iife)
  plugins: () => [            // Plugins específicos para worker
    // Devem retornar NOVAS instâncias (workers build em paralelo)
    myPlugin(),
  ],
  rolldownOptions: {          // Opções Rolldown para worker
    output: {
      entryFileNames: 'workers/[name].[hash].js',
    },
  },
}
```

**⚠️ `config.plugins` só se aplica a workers em dev.** Use `worker.plugins` para build.

## Preview Options

```ts
preview: {
  host: undefined,          // Default: server.host
  allowedHosts: undefined,  // Default: server.allowedHosts
  port: 4173,               // Porta padrão (auto-fallback se em uso)
  strictPort: false,        // Sair se porta em uso
  https: undefined,         // Default: server.https
  open: false,
  proxy: {},                // http-proxy-3
  cors: undefined,          // Default: server.cors
  headers: {},              // Response headers
}
```

> ⚠️ `vite preview` é para **teste local** — não use em produção.

## Module Preload Polyfill — Detalhes

```ts
build: {
  modulePreload: {
    polyfill: true,
  },
}

// O polyfill é auto-injetado no proxy module de cada index.html
// Para non-HTML custom entries, importe manualmente:
import 'vite/modulepreload-polyfill'
```

**Library Mode**: polyfill **não** se aplica.

**Deprecação**: `build.polyfillModulePreload` → usar `build.modulePreload.polyfill`.
