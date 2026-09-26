# Assets, CSS e Fontes — Otimização Completa

## Asset Import — Comportamento

```ts
import imgUrl from './img.png'
// Dev:  /src/img.png
// Prod: /assets/img.2d8efhg.png
```

Assets referenciados no código são processados:
- `<img src="./image.png">` em templates Vue/Svelte
- `url('./font.woff2')` em CSS
- `new URL('./asset.png', import.meta.url)` em JS

## Formatos de Asset Reconhecidos Automaticamente

O Vite reconhece centenas de extensões (veja `constants.ts`). Para adicionar mais:

```ts
assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.wasm']
```

## Controle de Asset por Query

| Query             | Efeito                                |
|-------------------|---------------------------------------|
| `?url`            | URL explícita (sem hash)              |
| `?raw`            | String crua do arquivo                |
| `?inline`         | Força inline como base64              |
| `?no-inline`      | Previne inlining                      |
| `?worker`         | Web Worker como chunk separado        |
| `?sharedworker`   | SharedWorker                          |
| `?worker&inline`  | Worker inline como base64             |
| `?worker&url`     | Worker como URL                       |

### Casos de Uso

```ts
// SVG como string (útil para ícones)
import icon from './icon.svg?raw'

// Imagem como URL (forçar não-inline)
import bg from './bg.jpg?url'

// Worker personalizado
import MyWorker from './worker.ts?worker'
const worker = new MyWorker()

// Texto/JSON como string
import schema from './schema.graphql?raw'
```

## The `public` Directory

```ts
publicDir: 'public',   // ou false para desabilitar
```

Assets em `public/`:
- Servidos em `/` durante dev
- Copiados as-is para `dist/` (sem hash)
- Devem ser referenciados por URL absoluta: `/robots.txt`
- Úteis para: `robots.txt`, `favicon.ico`, `manifest.json`, assets que precisam de nome fixo

## Fontes — Otimização

### 1. Font Face Declaration

```css
/* Em CSS Modules ou CSS global */
@font-face {
  font-family: 'Inter';
  src: url('/src/assets/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;  /* ⚠️ CRÍTICO: evita FOIT */
}

@font-face {
  font-family: 'Inter';
  src: url('/src/assets/fonts/Inter-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

### 2. Configuração de Fontes no Build

```ts
build: {
  assetsInlineLimit: (filePath, content) => {
    // WOFF2 pequenos (até 50KB): inline como data URI
    if (filePath.endsWith('.woff2') && content.length < 50 * 1024) {
      return true
    }
    // Fontes maiores: arquivo separado
    return undefined
  },
}
```

### 3. Preload de Fontes Críticas

```ts
// Plugin para adicionar preload
plugins: [{
  name: 'preload-fonts',
  transformIndexHtml(html) {
    return [{
      tag: 'link',
      attrs: {
        rel: 'preload',
        href: '/assets/Inter-Regular.woff2',
        as: 'font',
        type: 'font/woff2',
        crossorigin: true,
      },
      injectTo: 'head-prepend',
    }]
  },
}]
```

### 4. Subset de Fontes (Redução de Tamanho)

```bash
# Usar glyphanger ou fonttools para subset
pyftsubset Inter-Regular.woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --output-file=Inter-Regular-subset.woff2
```

## Imagens — Otimização

### 1. Formatos Modernos

```ts
// Use WebP ou AVIF quando possível
import hero from './hero.webp'
import heroAvif from './hero.avif?url'
```

### 2. Responsive Images com Vite

```ts
// src/assets/image.js
import small from './image-small.webp'
import medium from './image-medium.webp'
import large from './image-large.webp'

export { small, medium, large }
```

### 3. SVG Optimization

```ts
// SVG como componente (se necessário)
// Ou melhor: import como string/URL
import iconUrl from './icon.svg?url'
import iconRaw from './icon.svg?raw'

// Inline no HTML via plugin
plugins: [{
  name: 'svg-inline',
  transform(code, id) {
    if (id.endsWith('.svg?inline')) {
      const svg = fs.readFileSync(id.replace('?inline', ''), 'utf-8')
      return `export default ${JSON.stringify(svg)}`
    }
  },
}]
```

## CSS — Processamento e Otimização

### 1. CSS Modules

```css
/* Button.module.css */
.button {
  composes: base from './base.module.css';  /* Composição */
  padding: 1rem;
  color: var(--primary);
}

:global(.dark-mode) .button {
  color: var(--primary-dark);
}
```

```ts
css: {
  modules: {
    localsConvention: 'camelCase',           // my-class → styles.myClass
    generateScopedName: '[name]__[local]__[hash:base64:5]',
    scopeBehaviour: 'local',                  // 'local' (padrão) | 'global'
    hashPrefix: 'myapp',
    globalModulePaths: [/global/],            // Arquivos específicos como global
  },
}
```

### 2. PostCSS

```bash
npm i -D autoprefixer cssnano postcss-preset-env
```

```js
// postcss.config.js
export default {
  plugins: [
    autoprefixer({ flexbox: 'no-2009' }),
    postcssPresetEnv({
      stage: 2,              // Estágio de especificação
      features: {
        'nesting-rules': true,
        'custom-properties': false,  // Não polyfill (muito grande)
      },
    }),
    cssnano({ preset: 'advanced' }),  // Minificação extra
  ],
}
```

### 3. Lightning CSS (Transpilador Completo)

```ts
css: {
  transformer: 'lightningcss',
  lightningcss: {
    targets: {
      chrome: 111,
      firefox: 114,
      safari: 16.4,
      ios: 16.4,
      edge: 111,
    },
    drafts: {
      nesting: true,
      customMedia: true,
    },
    include: Features.Nesting,
    exclude: Features.LogicalProperties,  // Excluir se não precisa
    cssModules: {
      pattern: '[hash]_[local]',
    },
  },
}
```

**Vantagens**: 10-50× mais rápido que PostCSS, nativamente entende CSS Modules, nesting, custom media queries.

### 4. Pré-processadores (SCSS, Less, Stylus)

```ts
css: {
  preprocessorOptions: {
    scss: {
      api: 'modern-compiler',      // Usar sass-embedded (mais rápido)
      silenceDeprecations: ['legacy-js-api'],
      additionalData: `@use "@/styles/variables" as *;\n`,  // Auto-inject
      charset: false,
    },
    less: {
      javascriptEnabled: true,
    },
  },
  preprocessorMaxWorkers: true,     // Paraleliza processamento
}
```

### 5. CSS Critico (Above the Fold)

Para extrair CSS crítico e inline no `<head>`:

```ts
// Plugin para extrair CSS crítico
plugins: [{
  name: 'critical-css',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const criticalCss = extractCriticalCSS(html)
      return {
        html,
        tags: [{
          tag: 'style',
          children: criticalCss,
          injectTo: 'head',
        }],
      }
    },
  },
}]
```

## WebAssembly

```ts
// ESM Integration (Vite lê exports/imports do wasm)
import wasmExports from './module.wasm'
wasmExports.hello()

// Init pattern
import init from './module.wasm?init'
const instance = await init()

// URL pattern
import wasmUrl from './module.wasm?url'
const instance = await WebAssembly.instantiateStreaming(fetch(wasmUrl))
```

**TypeScript**:
```json
{
  "compilerOptions": {
    "allowArbitraryExtensions": true
  }
}
```
```ts
// module.d.wasm.ts
declare const exports: WebAssembly.Module
export default exports
```

## Config Otimizada Final — Assets + CSS + Fontes

```ts
import { defineConfig } from 'vite'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  assetsInclude: ['**/*.glb', '**/*.wasm'],

  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[hash:base64:8]',
    },
    postcss: {
      plugins: [autoprefixer],
    },
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "@/styles/variables" as *;\n`,
      },
    },
    preprocessorMaxWorkers: true,
    transformer: 'lightningcss',
    lightningcss: {
      targets: { chrome: 111, firefox: 114, safari: 16.4, ios: 16.4 },
      drafts: { nesting: true },
    },
  },

  build: {
    assetsInlineLimit: (filePath, content) => {
      if (filePath.endsWith('.svg') || filePath.endsWith('.woff2')) return content.length < 50 * 1024
      return content.length < 4096
    },
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    modulePreload: { polyfill: true },
  },
})
```

## Melhores Práticas

1. **Fontes**: Use `woff2` exclusivamente, `font-display: swap`, subset para caracteres latinos
2. **Imagens**: WebP/AVIF, lazy loading nativo `<img loading="lazy">`
3. **SVG**: Prefira `?raw` ou `?url` em vez de componentes
4. **CSS**: Prefira CSS Modules sobre BEM; use Lightning CSS se possível
5. **SCSS/Less**: Use `sass-embedded` para build mais rápido
6. **Assets Inline**: Balanceie tamanho (4KB padrão) vs requests HTTP
7. **Critical CSS**: Considere extrair CSS crítico para apps grandes
