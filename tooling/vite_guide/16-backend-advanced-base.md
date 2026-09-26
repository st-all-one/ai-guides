# Backend Integration e Advanced Base Options

## Backend Integration (Non-SSR)

### Development

```ts
// vite.config.ts
export default defineConfig({
  server: {
    cors: { origin: 'http://my-backend.example.com' },
    origin: 'http://localhost:5173',  // Asset URLs corretas
  },
  build: {
    manifest: true,
  },
})
```

Template HTML do backend (dev):

```html
<!-- Injetado pelo backend server -->
<script type="module" src="http://localhost:5173/@vite/client"></script>
<script type="module" src="http://localhost:5173/src/main.ts"></script>
```

Para React, o @react-refresh preamble é injetado automaticamente pelo Vite quando detecta React.

### Production (Manifest)

```json
// .vite/manifest.json
interface ManifestChunk {
  src?: string                // Source file path
  file: string                // Output file path (hashed)
  css?: string[]              // CSS files associados
  assets?: string[]           // Asset files associados
  isEntry?: boolean           // É entry chunk
  name?: string               // Nome do chunk
  isDynamicEntry?: boolean    // É dynamic entry
  imports?: string[]          // Static imports
  dynamicImports?: string[]   // Dynamic imports
}
```

### Algoritmo de Renderização (Backend)

```php
// PHP — exemplo para Laravel/Rails/Django
function renderViteAssets(string $entry): string {
    $manifest = json_decode(
        file_get_contents('.vite/manifest.json'), true
    );
    $chunk = $manifest[$entry];
    $html = '';

    // 1. CSS recursivo (entry + imports)
    $allCss = collectCssFromImports($chunk, $manifest);
    foreach ($allCss as $css) {
        $html .= '<link rel="stylesheet" href="/'.$css.'">';
    }

    // 2. Script entry
    $html .= '<script type="module" src="/'.$chunk['file'].'"></script>';

    // 3. Module preload
    foreach ($chunk['imports'] ?? [] as $import) {
        $html .= '<link rel="modulepreload" href="/'
                 .$manifest[$import]['file'].'">';
    }

    return $html;
}
```

### Chunk Import Map (Experimental)

```ts
build: {
  chunkImportMap: true,
  // Gera importmap.json com mapeamento chunk ID → URL
  // Injetar no HTML:
  // <script type="importmap" src="/importmap.json"></script>
}
```

## Advanced Base Options (Experimental)

Útil quando assets hasheados e arquivos `public/` ficam em paths diferentes (CDN, cache strategies).

```ts
experimental: {
  renderBuiltUrl(
    filename: string,
    { hostType, hostId, type }: {
      hostType: 'js' | 'css' | 'html',
      hostId: string,
      type: 'public' | 'asset',
    }
  ): { relative: boolean } | { runtime: string } | { url: string } {
    // Assets com hash → CDN runtime
    if (type === 'asset') {
      return {
        runtime: `window.__toCdnUrl(${JSON.stringify(filename)})`
      }
    }
    // Arquivos public → relativos
    if (type === 'public') {
      return { relative: true }
    }
    // URL absoluta
    return { url: `https://cdn.example.com/${filename}` }
  },
}
```

### Caso de Uso: CDN + Local

```ts
experimental: {
  renderBuiltUrl(filename, { hostId, hostType, type }) {
    if (type === 'public') {
      // public/ → servidor próprio
      return 'https://www.domain.com/' + filename
    } else if (path.extname(hostId) === '.js') {
      // Assets referenciados em JS → runtime
      return {
        runtime: `window.__assetsPath(${JSON.stringify(filename)})`
      }
    } else {
      // CSS/assets → CDN
      return 'https://cdn.domain.com/assets/' + filename
    }
  },
}
```

⚠️ `filename` é URL decodada. Se retornar URL string, deve ser decodada. Se retornar `{ runtime }`, encoding é responsabilidade sua.

### Dicas

1. **Dev**: Use `server.origin` para asset URLs corretas durante desenvolvimento
2. **Cache**: Assets hasheados → `Cache-Control: immutable`. HTML → `no-cache`
3. **Module Preload Polyfill**: Para backends que não usam HTML do Vite, importe manualmente:
   ```ts
   import 'vite/modulepreload-polyfill'
   ```
