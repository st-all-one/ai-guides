# Preview, Worker, Deploy e Edge Cases

## Preview Server — Opções Completas

```ts
preview: {
  host: undefined,           // Herda de server.host
  allowedHosts: undefined,   // Herda de server.allowedHosts
  port: 4173,                // Auto-fallback se em uso
  strictPort: false,
  https: undefined,          // Herda de server.https
  open: false,               // Abrir browser
  proxy: {},
  cors: undefined,           // Herda de server.cors
  headers: {},
}
```

```bash
# CLI preview
vite preview                   # Porta 4173
vite preview --port 3000       # Porta customizada
vite preview --host 0.0.0.0    # Acesso LAN
vite preview --open            # Abrir browser
```

⚠️ **`vite preview` é exclusivamente para teste local. Não use em produção.**

## Worker Options — Detalhes

```ts
worker: {
  format: 'iife',             // 'es' | 'iife'
  plugins: () => [],          // Plugins devolvem NOVAS instâncias
  rolldownOptions: {
    output: {
      entryFileNames: 'workers/[name].[hash].js',
      chunkFileNames: 'workers/[name].[hash].js',
    },
  },
}

// worker.rollupOptions (deprecado) → worker.rolldownOptions
```

```ts
// Uso no código
const worker = new Worker(new URL('./heavy-task.ts', import.meta.url), {
  type: 'module',
})

// Ou via query suffix:
import MyWorker from './worker.ts?worker'
const worker = new MyWorker()
```

### Padrão Recomendado

```ts
// Sempre use new URL + import.meta.url para Workers
// Vite detecta e processa automaticamente:
// 1. Worker vira chunk separado na build
// 2. URL é substituído pelo hash correto

const worker = new Worker(
  new URL('./workers/processor.ts', import.meta.url),
  { type: 'module' }
)
```

**⚠️ A detecção exige que `new URL()` esteja diretamente dentro de `new Worker()`.** Não funciona com:
```ts
const url = new URL('./worker.ts', import.meta.url)
const worker = new Worker(url)  // ❌ Não detectado
```

## Deploy Cloudflare Workers

```bash
npm i -D @cloudflare/vite-plugin
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import cloudflare from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [cloudflare()],
  environments: {
    client: {
      build: { outDir: 'dist/client' },
    },
    ssr: {
      resolve: { conditions: ['module', 'node'] },
      build: {
        outDir: 'dist/worker',
        ssr: 'src/entry-worker.ts',
      },
    },
  },
})
```

Usa Environment API para corretamente isolar o runtime Cloudflare Workers.

## Static Deploy Edge Cases

### Azure Static Web Apps

```json
// swa-cli.config.json
{
  "build": {
    "appLocation": ".",
    "outputLocation": "dist",
    "appBuildCommand": "npm run build"
  }
}
```

### Google Firebase

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

### Surge

```bash
surge dist
```

## Estratégias de Version Skew

Quando um novo deploy remove chunks antigos, usuários com a versão anterior quebram:

```ts
// Estratégia 1: Recarregar
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

// Estratégia 2: Fallback UI
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  showUpdateBanner()
})

// Estratégia 3: Service Worker (cache primeiro)
// Manter chunks antigos no cache do SW
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  )
})
```

**Servidor**: Configure `Cache-Control: no-cache` no HTML para evitar referências a chunks antigos.

## WebAssembly — RunTime Compatibility

```ts
// SSR com WASM
import wasmModule from './module.wasm'

// ⚠️ Em SSR: funciona apenas em runtimes compatíveis com Node.js
// (usa node:fs internamente)
// Cloudflare Workers, Deno, Bun: verificar compatibilidade
```

## CSS Preprocessor — Sass Engine

```ts
css: {
  preprocessorOptions: {
    scss: {
      // api: 'modern-compiler' → usa sass-embedded (mais rápido)
      // api: 'modern' → usa sass package
      // api: 'legacy' → API antiga (deprecada)
      api: 'modern-compiler',
      silenceDeprecations: ['legacy-js-api'],
      charset: false,
    },
  },
}
```

## Troubleshooting Adicional

| Problema | Causa | Solução |
|----------|-------|---------|
| Sass deprecation warnings | API antiga | `api: 'modern-compiler'` + `silenceDeprecations` |
| Worker não funciona em produção | Formato errado | `worker.format: 'es'` (se browser suporta) |
| Preview lento | Muitos arquivos | Sirva com Nginx em vez de vite preview |
| Deploy quebra links | Base path errado | Verifique `base` config + servidor |
| Chunk import map não funciona | Browser antigo | Verifique suporte a `import.meta.resolve` |
| Lightning CSS sem efeito | Config errada | `css.transformer: 'lightningcss'` (não só `css.lightningcss`) |
