# Library Mode — Guia Completo

## Conceito

Library Mode é um preset do Vite para publicar bibliotecas JS/CSS. Otimizado para distribuição via npm.

## Configuração Básica

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'lib/main.ts',
      name: 'MyLib',
      fileName: 'my-lib',
      formats: ['es', 'umd'],  // Single entry: ['es', 'umd']; Multiple: ['es', 'cjs']
      cssFileName: 'styles',   // Nome do CSS (default: mesmo que fileName)
    },
    rolldownOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
})
```

## Output Formatos

| Entries         | Default Formats | Output Files         |
|-----------------|-----------------|----------------------|
| Single entry    | `['es', 'umd']` | `my-lib.js` + `my-lib.umd.cjs` |
| Multiple entries| `['es', 'cjs']` | `my-lib.js` + `my-lib.cjs` (por entry) |

## CSS em Library Mode

```ts
build: {
  lib: {
    cssFileName: 'my-lib-styles',  // Personalizar nome do CSS
  },
}
```

```json
// package.json — exportar CSS
{
  "exports": {
    ".": {
      "import": "./dist/my-lib.js",
      "require": "./dist/my-lib.umd.cjs"
    },
    "./style.css": "./dist/my-lib.css"
  }
}
```

**Regras importantes:**
- `cssCodeSplit` default: `false` (todo CSS em um arquivo)
- `assetsInlineLimit` é **ignorado** (assets sempre inlined como base64)
- `modulePreload.polyfill` não se aplica

## package.json para Publicação

```json
// Single entry — com type: module
{
  "name": "my-lib",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/my-lib.umd.cjs",
  "module": "./dist/my-lib.js",
  "exports": {
    ".": {
      "import": "./dist/my-lib.js",
      "require": "./dist/my-lib.umd.cjs"
    }
  }
}
```

```json
// Multiple entries
{
  "name": "my-lib",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/my-lib.cjs",
  "module": "./dist/my-lib.js",
  "exports": {
    ".": {
      "import": "./dist/my-lib.js",
      "require": "./dist/my-lib.cjs"
    },
    "./secondary": {
      "import": "./dist/secondary.js",
      "require": "./dist/secondary.cjs"
    }
  }
}
```

### File Extensions

Se `package.json` **não** tem `"type": "module"`:
- `.js` → `.mjs`
- `.cjs` → `.js`

Vite ajusta automaticamente as extensões para compatibilidade Node.js.

## Environment Variables em Library Mode

```ts
// ✅ import.meta.env.* → statically replaced na build
import.meta.env.VITE_API_URL  // substituído por valor literal

// ❌ process.env.* → NÃO substituído (consumer pode mudar)
process.env.NODE_ENV  // permanece como runtime reference

// Para substituir process.env também:
define: {
  'process.env.NODE_ENV': '"production"',
}
```

Ou use [`esm-env`](https://github.com/benmccann/esm-env) para melhor compatibilidade com bundlers.

## Advanced Usage Warning

Library Mode é opinionado para bibliotecas browser-oriented. Para casos avançados:

```bash
# Usar tsdown para bibliotecas TypeScript
npx tsdown

# Usar Rolldown diretamente
npx rolldown -c rolldown.config.ts
```

## Dicas

1. **Externalize** frameworks (react, vue) — nunca bundle-os na lib
2. **Forneça globals** para UMD/IIFE builds
3. **Exporte CSS** separadamente se sua lib tem estilos
4. **Use `type: "module"`** no package.json para extensões corretas
5. **Teste** a lib com um app Vite antes de publicar
