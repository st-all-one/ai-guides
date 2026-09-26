# Dep Pre-Bundling e Breaking Changes

## Dep Pre-Bundling — Detalhes

### File System Cache

```bash
# Cache em: node_modules/.vite/
# Invalidado automaticamente por:
#   - Mudanças no lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml)
#   - Patches (package.json resolutions, overrides)
#   - Mudanças na config Vite (optimizeDeps.*)
#   - Mudanças em NODE_ENV

# Forçar recache:
vite --force
# Ou deletar manualmente:
rm -rf node_modules/.vite
```

### Browser Cache

```bash
# Deps otimizadas servidas com:
#   Cache-Control: max-age=31536000, immutable
#   Query string: /node_modules/.vite/deps/react.js?v=f3sf2ebd
# O hash do lockfile muda a query → cache busting automático

# Para debug: desabilitar cache no Network tab do DevTools
# (apenas se você entende que isso afeta performance)
```

### Monorepo / Linked Dependencies

```ts
// Linked deps são tratadas como source code (não pre-bundled)
// Requisito: linked dep deve ser ESM (type: module ou .mjs)

// Se linked dep não é ESM, force pre-bundle:
optimizeDeps: {
  include: ['@my-org/my-lib'],
}

// Após mudanças no linked dep:
vite --force
```

### Custom Discovery

```ts
optimizeDeps: {
  // Entradas customizadas (tinyglobby patterns)
  entries: ['./src/**/*.ts', '!./src/**/*.spec.ts'],

  // Desabilitar descoberta automática
  noDiscovery: true,
  include: ['react', 'react-dom'],  // Explícito
}
```

### Interop

```ts
optimizeDeps: {
  // Forçar ESM interop para deps específicas
  // Vite detecta automaticamente, mas declarar acelera cold start
  needsInterop: ['some-cjs-dep'],
}
```

---

## Breaking Changes — Referência

### Vite 8 Breaking Changes

| Mudança | Descrição | Impacto |
|---|---|---|
| Rolldown substitui Rollup | `build.rollupOptions` → `build.rolldownOptions` | Todos |
| Oxc substitui esbuild | `esbuild.*` → `oxc.*` | Todos |
| Oxc Minifier | `build.minify: 'esbuild'` deprecado | Todos |
| Lightning CSS | `build.cssMinify: 'lightningcss'` (padrão) | Todos |
| CJS interop consistente | Default import de CJS muda comportamento | Breaking |
| Module resolution format sniffing | Heurística browser/module field removida | Edge cases |
| `import.meta.url` em UMD/IIFE | Não polyfilado → `undefined` | Library authors |
| `output.manualChunks` object form | Removido (use function) | Plugin authors |
| `bundle[foo]` assignment | Não suportado | Plugin authors |
| Hooks paralelos | Todos sequenciais agora | Plugin authors |
| `plugin-legacy` | Não suportado (ES5) | Legacy users |

### Vite 7 para Vite 8

| Vite 7                     | Vite 8                         |
|----------------------------|--------------------------------|
| `build.rollupOptions`      | `build.rolldownOptions`        |
| `worker.rollupOptions`     | `worker.rolldownOptions`       |
| `transformWithEsbuild`     | `transformWithOxc`             |
| `esbuild.*`                | `oxc.*`                        |
| `build.minify: 'esbuild'`  | `build.minify: 'oxc'`          |
| `handleHotUpdate`          | `hotUpdate`                    |
| `options.ssr` em hooks     | `this.environment`             |
| `ssrLoadModule`            | `moduleRunner.import()`        |

### Planned Changes (ativar warnings)

```ts
future: {
  removeServerModuleGraph: 'warn',
  removeServerReloadModule: 'warn',
  removeServerPluginContainer: 'warn',
  removeServerHot: 'warn',
  removeServerTransformRequest: 'warn',
  removeServerWarmupRequest: 'warn',
  removePluginHookHandleHotUpdate: 'warn',
  removePluginHookSsrArgument: 'warn',
  removeSsrLoadModule: 'warn',
}
```

### Considering Changes (experimental)

- **Per-environment APIs**: métodos de `ViteDevServer` → `DevEnvironment`
- **Shared Plugins During Build**: alinhar pipelines dev/build (`sharedDuringBuild: true`)
