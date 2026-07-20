# Config Index, Define, JSON — Casos de Borda

## Config Loading — Entendendo o Processo

```bash
# Default: Vite usa Rolldown para bundle da config em temp file
vite
# node_modules/.vite-temp/vite.config_xxxx.mjs

# Alternativas:
vite --configLoader native    # Usa runtime nativo Node.js (planejado default)
vite --configLoader runner    # Experimental: on-the-fly
```

O arquivo de config deve ser ESM (`.mjs` ou `.js` com `"type": "module"`).

### VS Code Debugging

```json
// .vscode/settings.json
{
  "debug.javascript.terminalOptions": {
    "resolveSourceMapLocations": [
      "${workspaceFolder}/**",
      "!**/node_modules/**",
      "**/node_modules/.vite-temp/**"
    ]
  }
}
```

### Config Intellisense

```ts
// 1. JSDoc
/** @type {import('vite').UserConfig} */
export default { /* ... */ }

// 2. defineConfig
import { defineConfig } from 'vite'
export default defineConfig({ /* ... */ })

// 3. satisfies (TS)
import type { UserConfig } from 'vite'
export default { /* ... */ } satisfies UserConfig
```

### Async Config

```ts
export default defineConfig(async ({ command, mode }) => {
  const data = await fetchConfig()
  return { define: { __DATA__: data } }
})
```

### Usando .env na Config

```ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // .env NÃO é carregado automaticamente na config
  // (só depois da config ser resolvida)
  // Use loadEnv manualmente:
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    server: {
      port: env.APP_PORT ? Number(env.APP_PORT) : 5173,
    },
  }
})
```

## define — Substituição em Build Time

```ts
define: {
  // Valores JSON-serializáveis ou identificador único
  __APP_VERSION__: JSON.stringify('1.0.0'),
  __BUILD_TIME__: JSON.stringify(Date.now()),
  __DEV__: 'process.env.NODE_ENV === "development"',

  // Objetos (Oxc define feature — sem shared reference)
  __CONFIG__: JSON.stringify({ api: 'https://api.example.com' }),

  // Expressões
  __FEATURE_FLAG__: 'true',
}
```

**⚠️ Limitações:**
- Apenas valores JSON-serializáveis (null, boolean, number, string, array, object) ou identificador único
- Valores não-string são auto-convertidos via `JSON.stringify`
- **Não** compartilha referência para objetos (diferente de Rollup)
- TypeScript: declare tipos em `vite-env.d.ts`

```ts
// vite-env.d.ts
declare const __APP_VERSION__: string
declare const __DEV__: boolean
```

## JSON — Opções

```ts
json: {
  // Habilita named imports (tree-shakeable)
  namedExports: true,

  // Stringify automático para JSON grandes
  stringify: 'auto',       // > 10kB stringify como JSON.parse("...")
  // stringify: true,      // Força sempre
  // stringify: false,     // Nunca
}
```

```ts
// namedExports: true → tree-shakeable
import { field } from './data.json'

// stringify: 'auto' → melhor performance para JSON grandes
// Internamente: export default JSON.parse("...")
```

## appType — Detalhes

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  // 'spa' (padrão): HTML middlewares + SPA fallback
  //   - Sirv com single: true no preview
  //   - index.html fallback para rotas não encontradas
  appType: 'spa',

  // 'mpa': apenas HTML middlewares
  //   - Sem SPA fallback
  //   - Cada HTML é seu próprio entry point
  appType: 'mpa',

  // 'custom': sem HTML middlewares
  //   - Útil para SSR ou backend integration
  //   - Framework/responsabilidade do usuário servir HTML
  appType: 'custom',
})
```

## MPA — Detalhe do root

```ts
// MPA com root diferente
export default defineConfig({
  root: 'src',
  input: {
    main: resolve(import.meta.dirname, 'src/index.html'),
    about: resolve(import.meta.dirname, 'src/about/index.html'),
  },
})
```

⚠️ `import.meta.dirname` sempre refere à pasta do `vite.config.js`, não ao `root`. Use `resolve()` com path absoluto.
