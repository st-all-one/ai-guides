# Deploy e Produção — Estratégias Avançadas

## Pipeline de Build para Produção

```bash
# Build padrão
vite build

# Build com análise
vite build -- --output.manualChunks {}

# Build multi-environment
vite build --app

# Build SSR
vite build --outDir dist/client
vite build --outDir dist/server --ssr src/entry-server.ts
```

## Configuração de Base Path

```ts
// vite.config.ts
export default defineConfig({
  // Para deploy em subpath: https://site.com/app/
  base: '/app/',

  // Para deploy em subdiretório CDN:
  base: 'https://cdn.example.com/app/',

  // Para deploy relativo (funciona em qualquer path):
  base: './',

  // Usar em runtime:
  // import.meta.env.BASE_URL → '/app/'
})
```

## Headers HTTP para Cache

### Servidor Estático (Nginx)

```nginx
# /etc/nginx/sites-available/app
server {
    listen 80;
    server_name example.com;
    root /var/www/app/dist;

    # Assets com hash → cache imutável
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
        access_log off;
    }

    # HTML → sempre verificar
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Service Worker → nunca cachear
    location /sw.js {
        expires -1;
        add_header Cache-Control "no-store";
    }
}
```

### Apache (.htaccess)

```apache
<IfModule mod_expires.c>
    ExpiresActive On

    # Assets com hash
    <FilesMatch "\.(js|css|png|jpg|webp|woff2)$">
        ExpiresDefault "access plus 1 year"
        Header set Cache-Control "public, immutable"
    </FilesMatch>

    # HTML
    <FilesMatch "\.html$">
        ExpiresDefault "access plus 0 seconds"
        Header set Cache-Control "no-cache, must-revalidate"
    </FilesMatch>
</IfModule>
```

## Compression

```ts
// vite.config.ts — compressed size reporting
build: {
  reportCompressedSize: false,   // Desabilitar em CI para acelerar
}
```

Configure gzip/brotli no servidor:

```nginx
# Nginx: brotli + gzip
brotli on;
brotli_static on;
brotli_types text/plain text/css application/javascript image/svg+xml;

gzip on;
gzip_types text/plain text/css application/javascript image/svg+xml;
gzip_vary on;
```

## Content Security Policy (CSP)

```ts
// vite.config.ts
export default defineConfig({
  html: {
    cspNonce: 'PLACEHOLDER_NONCE',  // Substituir por nonce real
  },
  build: {
    assetsInlineLimit: 4096,        // Default
    // Para CSP sem data: em script-src:
    // assetsInlineLimit: 0,
  },
})
```

```nginx
# Headers CSP
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'nonce-<NONCE>';
    style-src 'self' 'nonce-<NONCE>';
    img-src 'self' data:;
    font-src 'self' data:;
    connect-src 'self' https://api.example.com;
    frame-ancestors 'none';
    base-uri 'self';
" always;
```

## Manifest e Backend Integration

```ts
build: {
  manifest: true,     // Gera .vite/manifest.json
}
```

```json
// .vite/manifest.json
{
  "src/main.ts": {
    "file": "assets/main.abc123.js",
    "css": ["assets/main.def456.css"],
    "isEntry": true,
    "imports": ["vendor.react.789012.js"],
    "dynamicImports": ["page.about.345678.js"]
  }
}
```

### Backend Integration (Rails, Laravel, Django)

```ts
// Laravel example
class Vite {
    public static function asset(string $path): string {
        $manifest = json_decode(
            file_get_contents(public_path('.vite/manifest.json')),
            true
        );
        return $manifest[$path]['file'] ?? $path;
    }
}
```

## Chunk Import Map (Experimental)

```ts
build: {
  chunkImportMap: true,  // Gera importmap.json
}
```

```html
<script type="importmap">
{
  "imports": {
    "vendor.react.abc123.js": "/assets/vendor.react.abc123.js",
    "main.def456.js": "/assets/main.def456.js"
  }
}
</script>
```

## Error Handling em Produção

```ts
// Tratar erro de preload (chunk obsoleto)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Chunk obsoleto, recarregando...', event)
  window.location.reload()
})
```

```ts
// Tratar dynamic import failure
try {
  const module = await import('./lazy.js')
} catch (err) {
  // Mostrar fallback UI
  showErrorFallback()
}
```

## Estratégia de Deploy

### Rolling Update (sem downtime)

```yaml
# Deploy strategy:
# 1. Build novo
# 2. Upload assets/ com hash novo
# 3. Manter assets/ antigos por 7 dias
# 4. Atualizar index.html (referencia novos hashes)
# 5. Usuários com chunk antigo: recarregam via vite:preloadError
```

### CDN Cache Busting

```ts
// Com CDN, usar versão no base path:
base: 'https://cdn.example.com/v1.2.3/'
```

## Platformas Específicas

### GitHub Pages

```ts
base: '/<REPO>/',  // ex: '/my-app/'
```

```yaml
# .github/workflows/deploy.yml
- run: npm run build
- uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist
```

### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, immutable, max-age=31536000"
```

### Vercel

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, immutable, max-age=31536000" }
      ]
    }
  ]
}
```

### Cloudflare Workers

```ts
import { defineConfig } from 'vite'
import cloudflare from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [cloudflare()],
})
```

## Checklist de Produção

### ✅ Build
- [ ] `build.minify: 'oxc'` (ou terser para compressão máxima)
- [ ] `build.cssMinify: 'lightningcss'`
- [ ] `build.sourcemap: false` (a menos que precise debugar)
- [ ] `build.chunkImportMap: true` (experimental, cache otimizado)
- [ ] `build.manifest: true` (se backend integration)
- [ ] `build.reportCompressedSize: false` (CI mais rápida)

### ✅ Assets
- [ ] `build.assetsInlineLimit` configurado
- [ ] Fontes com `font-display: swap`
- [ ] Imagens com formatos modernos (WebP/AVIF)
- [ ] Lazy loading de imagens

### ✅ Servidor
- [ ] Cache headers configurados (`immutable` para hashed assets)
- [ ] Brotli/gzip compression
- [ ] CSP configurado
- [ ] HTTPS habilitado
- [ ] Error handling para chunks obsoletos

### ✅ Monitoramento
- [ ] `vite:preloadError` handler
- [ ] Dynamic import error handler
- [ ] Performance monitoring (Web Vitals)
- [ ] Bundle analysis periódico

## Config Final de Produção

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  base: '/',

  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[hash:base64:8]',
    },
    transformer: 'lightningcss',
    lightningcss: {
      targets: { chrome: 111, firefox: 114, safari: 16.4, ios: 16.4 },
      drafts: { nesting: true },
    },
  },

  build: {
    target: 'baseline-widely-available',
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    minify: 'oxc',
    sourcemap: false,
    reportCompressedSize: false,
    emptyOutDir: true,
    copyPublicDir: true,
    chunkSizeWarningLimit: 400,
    chunkImportMap: true,
    modulePreload: { polyfill: true },
    manifest: true,
    assetsInlineLimit: (filePath, content) => {
      if (filePath.endsWith('.svg') || filePath.endsWith('.woff2')) {
        return content.length < 50 * 1024
      }
      return content.length < 4096
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react'
            if (id.includes('lodash') || id.includes('date-fns')) return 'vendor-utils'
            return 'vendor'
          }
          if (id.includes('/src/pages/')) {
            const match = id.match(/\/src\/pages\/(.+?)\//)
            if (match) return `page-${match[1]}`
          }
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },

  html: {
    cspNonce: process.env.CSP_NONCE,
  },
})
```
