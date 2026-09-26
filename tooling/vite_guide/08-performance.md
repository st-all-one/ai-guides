# Performance — Otimização Avançada

## Diagnóstico de Performance

### 1. Profile do Dev Server

```bash
# Gerar CPU profile
vite --profile --open

# No terminal, pressione 'p' + Enter para salvar .cpuprofile
# Menu interativo: 'p' (profile), 'd' (debug), 'q' (quit)

# Analisar em speedscope.app
# Ou gerar durante build:
vite build --profile
```

### 2. Debug de Transformações

```bash
# Log de durações de transform
vite --debug plugin-transform

# Debug específico
vite --debug transform

# Filtrar debug por plugin
vite --debug -f "vite:vue"

# Ver timestamps de HMR
vite --debug hmr
```

### 3. Plugin Inspect

```bash
npm i -D vite-plugin-inspect
```

```ts
// vite.config.ts
import inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [inspect()],
})
```

Acesse `/__inspect/` durante dev ou build para visualizar:
- Transformações por plugin
- Duração de cada hook
- Módulos transformados
- Graph de dependências

### 4. Análise de Bundle

```bash
# Usar -- -- para passar args ao Rolldown
npx vite build -- --output.manualChunks {}
```

## Cold Start — Diagnóstico e Otimização

### Por que está lento?

```bash
# 1. Verificar tamanho das dependências
du -sh node_modules/* | sort -h | tail -20

# 2. Verificar número de módulos
vite --debug resolve

# 3. Verificar tempo de cada seção
vite --profile
```

### Otimizações de Cold Start

```ts
server: {
  warmup: {
    // Pré-transforma arquivos críticos na inicialização
    clientFiles: [
      './src/main.ts',
      './src/router.ts',
      './src/store.ts',
      './src/App.tsx',
      './src/styles/global.css',
    ],
    ssrFiles: [
      './src/entry-server.ts',
    ],
  },
}

// Ou via linha de comando
server.warmup.clientFiles: ['./src/main.ts']
```

```ts
// Configuração para cold start mais rápido
optimizeDeps: {
  holdUntilCrawlEnd: false,   // Mais paralelismo
  needsInterop: ['some-dep'], // Speed up interop detection
}
```

## Otimizações de Resolve

### 1. Extensões Explícitas

```ts
// ❌ Lento: Vite tenta cada extensão (até 7 filesystem checks)
import Component from './Component'

// ✅ Rápido: resolução direta
import Component from './Component.tsx'
```

### 2. `resolve.extensions` Mínimo

```ts
// Menos extensões = menos filesystem checks
resolve: {
  extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  // Remova .mts, .vue, etc se não usar
}
```

### 3. Evitar `resolve.tsconfigPaths`

```ts
resolve: {
  tsconfigPaths: false,  // Mais rápido que true
  // Prefira alias explícito:
  alias: {
    '@': '/src',
    '@components': '/src/components',
  },
}
```

### 4. Evitar Barrel Files

```ts
// ❌ Lento: carrega todo barrel
import { formatDate } from './utils'

// ✅ Rápido: import direto
import { formatDate } from './utils/date.ts'
```

## Otimizações de CSS

### 1. Prefira CSS sobre Pré-processadores

```ts
// PostCSS com nesting é mais rápido que SCSS
css: {
  transformer: 'lightningcss',
  lightningcss: {
    drafts: { nesting: true },
  },
}
```

### 2. Parallel CSS Processing

```ts
css: {
  preprocessorMaxWorkers: true,  // CPUs - 1 worker threads
  // 0 = single thread (lento)
}
```

### 3. Evite SCSS/Less Desnecessários

```css
/* ✅ Nesting nativo (Lightning CSS ou PostCSS) */
.card {
  padding: 1rem;
  & .title {
    font-size: 1.5rem;
  }
}

/* ❌ Desnecessário: SCSS para nesting simples */
```

## Otimizações de Build

### 1. Desabilitar Compressed Size

```ts
build: {
  reportCompressedSize: false,  // Gzip é caro, pula essa etapa
}
```

### 2. Escolha do Minifier

```ts
// ✅ Mais rápido: Oxc (padrão)
build: { minify: 'oxc' }

// Apenas se precisar: Terser (mais compressão, 30-90× mais lento)
build: { minify: 'terser' }
```

### 3. Source Maps Conditionais

```ts
build: {
  sourcemap: process.env.CI ? false : 'hidden',
  // CI: sem sourcemap
  // Dev local: hidden (não polui output, mas tem map para debug)
}
```

## Otimizações de HMR

### Evite Full Reload

```bash
vite --debug hmr   # Diagnosticar por que full reload ocorre
```

Causas comuns:
- Dependência circular
- Módulo não aceita HMR (`import.meta.hot.accept()` ausente)
- Arquivo fora do escopo do module graph

### Config de Watch Otimizada

```ts
server: {
  watch: {
    // Ignorar diretórios desnecessários
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/.vite/**',
      '**/coverage/**',
      '**/__tests__/**',
    ],
    // Para WSL2: pode precisar de polling
    // usePolling: true,
    // interval: 100,
  },
}
```

## Configuração Otimizada Final

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: { '@': '/src' },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    tsconfigPaths: false,
  },

  css: {
    transformer: 'lightningcss',
    preprocessorMaxWorkers: true,
  },

  build: {
    target: 'es2020',
    minify: 'oxc',
    cssMinify: 'lightningcss',
    reportCompressedSize: false,
    sourcemap: false,
    chunkSizeWarningLimit: 400,
  },

  server: {
    warmup: {
      clientFiles: ['./src/main.tsx'],
    },
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    holdUntilCrawlEnd: false,
  },
})
```

## Checklist de Performance

### ✅ Dev Server
- [ ] `server.warmup.clientFiles` configurado
- [ ] `holdUntilCrawlEnd: false` (cold start)
- [ ] Extensões explícitas em imports
- [ ] Sem barrel files grandes
- [ ] `resolve.tsconfigPaths: false`
- [ ] `css.preprocessorMaxWorkers: true`
- [ ] `css.transformer: 'lightningcss'`
- [ ] `vite --debug hmr` para diagnosticar full reloads

### ✅ Build
- [ ] `reportCompressedSize: false`
- [ ] `minify: 'oxc'` (ou terser se precisar de mais compressão)
- [ ] `cssMinify: 'lightningcss'`
- [ ] Source maps desabilitados em produção
- [ ] `chunkImportMap: true` para cache otimizado
- [ ] `manualChunks` bem configurado

### ✅ Infraestrutura
- [ ] `fs.inotify.max_user_watches` configurado (Linux)
- [ ] `ulimit -Sn` aumentado se necessário
- [ ] WSL2: `server.watch.usePolling: true` ou usar apps Linux
- [ ] Browser sem extensões para testes de performance
- [ ] Cache HTTP configurado no servidor

### 📊 Métricas Esperadas

| Operação          | App Pequena | App Média | App Grande |
|-------------------|-------------|-----------|------------|
| Cold start        | < 200ms     | < 1s      | < 3s       |
| HMR               | < 10ms      | < 50ms    | < 200ms    |
| Build (dev)       | < 1s        | < 5s      | < 30s      |
| Build (prod)      | < 2s        | < 10s     | < 60s      |
| Bundle size (JS)  | < 100kB     | < 300kB   | < 500kB    |
| Bundle size (CSS) | < 10kB      | < 50kB    | < 100kB    |
