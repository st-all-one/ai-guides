# Glob Imports e Environment Variables

## Glob Imports — Detalhes Completos

### Patterns Múltiplos

```ts
// Múltiplos diretórios
const modules = import.meta.glob(['./dir/*.js', './another/*.js'])

// Negative patterns (excluir)
const modules = import.meta.glob([
  './dir/**/*.js',
  '!./dir/**/excluded.js',
])
```

### Opções Completas

```ts
interface GlobOptions<Eager extends boolean, AsIs extends boolean> {
  eager?: Eager                              // false: lazy (default) | true: import direto
  import?: 'default' | string                // Named export específico (tree-shakeable)
  query?: string | Record<string, string>   // Query params ex: '?raw', { foo: 'bar' }
  base?: string                              // Base URL para os imports
  caseSensitive?: boolean                    // Case-sensitive matching (default: true)
  as?: string                                // 'relative' (default) | 'absolute' | 'path'
}
```

### Named Imports Específicos

```ts
// Importar apenas o export 'setup' de cada módulo
const modules = import.meta.glob('./components/*.vue', {
  eager: true,
  import: 'setup',
})
// { './Comp.vue': setupFunction }
```

```ts
// Importar apenas o default
const modules = import.meta.glob('./locales/*.json', {
  eager: true,
  import: 'default',
})
```

### Custom Queries

```ts
// Como string
const rawFiles = import.meta.glob('./data/*.json', {
  query: '?raw',        // Importa como string
  eager: true,
})

// Como objeto (útil para plugins)
const wasmModules = import.meta.glob('./wasm/*.wasm', {
  query: { init: true },
  eager: true,
})
```

### Base Path

```ts
const modules = import.meta.glob('./locales/*.json', {
  base: '/i18n',
  eager: true,
})
```

### Restrições Importantes

```ts
// ❌ Argumento deve ser literal (não variável)
const pattern = './dir/*.js'
const modules = import.meta.glob(pattern)

// ✅ String literal
const modules = import.meta.glob('./dir/*.js')

// Patterns devem ser: relativos (./), absolutos (/), ou alias (@/)
const modules = import.meta.glob('@/components/*.vue')

// Devem terminar com extensão (análise estática)
// Usa tinyglobby internamente
```

---

## Environment Variables e Modes

### Built-in Constants

```ts
import.meta.env.MODE       // 'development' | 'production'
import.meta.env.BASE_URL   // '/' | '/app/'
import.meta.env.PROD       // boolean (NODE_ENV === 'production')
import.meta.env.DEV        // boolean (oposto de PROD)
import.meta.env.SSR        // boolean (server-side rendering)
```

### NODE_ENV vs Modes

| Comando                          | NODE_ENV        | Mode            |
|----------------------------------|-----------------|-----------------|
| `vite build`                     | `"production"`  | `"production"`  |
| `vite build --mode development`  | `"production"`  | `"development"` |
| `NODE_ENV=development vite build`| `"development"` | `"production"`  |
| `vite dev`                       | `"development"` | `"development"` |
| `vite dev --mode staging`        | `"development"` | `"staging"`     |

### .env File Priority (Maior → menor)

1. `process.env` existentes (maior prioridade)
2. `.env.[mode].local` (gitignored)
3. `.env.[mode]`
4. `.env.local`
5. `.env` (menor prioridade)

### HTML Constant Replacement

```html
<title>%MODE%</title>
<link rel="icon" href="%VITE_APP_ICON%">
```

Variáveis inexistentes são ignoradas.

### TypeScript IntelliSense

```ts
// vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Modo estrito:
```json
{ "compilerOptions": { "types": ["vite/client"] } }
// type ViteTypeOptions = { strictImportMetaEnv: unknown }
```

### dotenv-expand

```env
DB_URL=localhost:5432
DATABASE_URL=postgres://${DB_URL}
```

```env
# Escapar $ com \
PASSWORD=pa\$\$word
```

⚠️ Expandidas em **reverse order** (mais específica primeiro).

### ⚠️ Segurança

`VITE_*` são **bundados no client**. Nunca coloque secrets (API keys, tokens) em variáveis `VITE_*`.
