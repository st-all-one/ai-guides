# Migração para Vite 8 — Guia Completo

## Principais Mudanças

| Área              | Vite 5-6          | Vite 8 (Atual)              | Impacto            |
|-------------------|-------------------|-----------------------------|--------------------|
| Bundler           | Rollup (JS)       | Rolldown (Rust)             | Breaking           |
| Transpilador      | esbuild (Go)      | Oxc (Rust)                  | Breaking           |
| Minificador JS    | esbuild/Terser    | Oxc Minifier                | Breaking           |
| Minificador CSS   | esbuild           | Lightning CSS               | Automático         |
| CJS Interop       | Inconsistente     | Consistente                 | Breaking           |
| Plugin Hooks      | `options.ssr`     | `this.environment`          | Deprecado          |
| SSR Load          | `ssrLoadModule`   | `ModuleRunner.import()`     | Deprecado          |
| Hot Update        | `handleHotUpdate` | `hotUpdate`                 | Deprecado          |

## 1. Atualizar Dependências

```bash
# Verificar versão atual
npx vite --version

# Atualizar
npm install -D vite@latest

# Verificar plugins compatíveis
npm ls vite               # Lista todos que dependem de vite
```

## 2. Trocar `build.rollupOptions` → `build.rolldownOptions`

```ts
// ❌ Antigo (Vite 5-6)
build: {
  rollupOptions: {
    input: 'index.html',
    output: {
      manualChunks(id) { /* ... */ },
    },
  },
}

// ✅ Novo (Vite 8)
build: {
  rolldownOptions: {
    input: 'index.html',
    output: {
      manualChunks(id) { /* ... */ },
    },
  },
}
```

**⚠️ Atenção**: `worker.rollupOptions` → `worker.rolldownOptions` também.

## 3. Trocar `esbuild.*` → `oxc.*`

```ts
// ❌ Antigo
esbuild: {
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  jsxImportSource: 'preact',
  jsxInject: `import { h } from 'preact'`,
}

// ✅ Novo
oxc: {
  jsx: {
    runtime: 'classic',
    pragma: 'h',
    pragmaFrag: 'Fragment',
    importSource: 'preact',
  },
  jsxInject: `import { h } from 'preact'`,
}
```

### Mapeamento de Opções esbuild → oxc

| esbuild                     | oxc                           |
|-----------------------------|-------------------------------|
| `esbuild.jsx`               | `oxc.jsx` (runtime/importSource/pragma/pragmaFrag) |
| `esbuild.jsxInject`         | `oxc.jsxInject`               |
| `esbuild.include`           | `oxc.include`                 |
| `esbuild.exclude`           | `oxc.exclude`                 |
| `esbuild.define`            | `oxc.target` (parcial) ou `define` |
| `esbuild.target`            | `oxc.target` (dev) + `build.target` (prod) |
| `esbuild.supported`         | ❌ Não suportado              |

## 4. Trocar `transformWithEsbuild` → `transformWithOxc`

```ts
// ❌ Antigo
import { transformWithEsbuild } from 'vite'
const result = await transformWithEsbuild(code, filename, options)

// ✅ Novo
import { transformWithOxc } from 'vite'
const result = await transformWithOxc(code, filename, options, inMap)
```

`esbuild` se torna dependência dev opcional. Se algum plugin ainda usa `transformWithEsbuild`, instale `esbuild` como dependência dev.

## 5. Minificador

```ts
// ✅ Oxc (padrão, recomendado)
build: { minify: 'oxc' }

// ⚠️ esbuild deprecado
build: { minify: 'esbuild' }  // Ainda funciona mas removerá

// ✅ Terser (alternativa, maior compressão)
build: { minify: 'terser' }

// ❌ cssMinify: 'esbuild' ainda funciona mas migre
build: { cssMinify: 'lightningcss' }
```

## 6. CJS Interop (Breaking)

```ts
// Vite 8: comportamento consistente de CJS default exports
// Se o módulo CJS:
//   - Não tem __esModule → module.exports é o default
//   - Tem __esModule → usa default export

// Se precisar do comportamento antigo:
legacy: {
  inconsistentCjsInterop: true,
}
```

## 7. Plugin Hooks — `this.environment`

```ts
// ❌ Antigo: options.ssr
resolveId(id, importer, options) {
  if (options.ssr) { /* ... */ }
}
transform(code, id, options) {
  if (options.ssr) { /* ... */ }
}

// ✅ Novo: this.environment
resolveId(id, importer) {
  if (this.environment.config.consumer === 'server') { /* ... */ }
  console.log(this.environment.name) // 'client', 'ssr', 'edge'
  console.log(this.environment.config.resolve.conditions)
}
```

Ative warnings para migração:
```ts
future: {
  removePluginHookSsrArgument: 'warn',
}
```

## 8. HMR — `hotUpdate` Hook

```ts
// ❌ Antigo: handleHotUpdate({ file, modules, read, server })
handleHotUpdate(ctx) {
  ctx.modules = ctx.modules.filter(m => m.id?.includes('src'))
  return ctx.modules
}

// ✅ Novo: hotUpdate({ type, file, modules, read, server })
hotUpdate({ file, type, modules, read }) {
  if (file.endsWith('.css')) {
    return modules.filter(m => m.type === 'css')
  }
}
```

```ts
future: {
  removePluginHookHandleHotUpdate: 'warn',
}
```

## 9. SSR — ModuleRunner API

```ts
// ❌ Antigo
const { render } = await server.ssrLoadModule('/src/entry-server.ts')
server.ssrFixStacktrace(err)

// ✅ Novo
const serverEnv = server.environments.ssr
const runner = serverEnv.runner
const { render } = await runner.import('/src/entry-server.ts')
// ssrFixStacktrace não é mais necessário com sourcemapInterceptor
```

```ts
future: {
  removeSsrLoadModule: 'warn',
}
```

## 10. Per-Environment APIs

```ts
// ❌ Antigo (ViteDevServer)
server.moduleGraph
server.reloadModule(module)
server.pluginContainer
server.transformRequest(url, ssr)
server.hot

// ✅ Novo (DevEnvironment)
environment.moduleGraph
environment.reloadModule(module)
environment.pluginContainer
environment.transformRequest(url)
environment.hot
```

```ts
future: {
  removeServerModuleGraph: 'warn',
  removeServerReloadModule: 'warn',
  removeServerPluginContainer: 'warn',
  removeServerHot: 'warn',
  removeServerTransformRequest: 'warn',
}
```

## 11. Outras Mudanças

### `bundle` Object

```ts
// ❌ Não suportado
generateBundle(_, bundle) {
  bundle['new-file.js'] = { /* ... */ }  // Assignment não funciona
  bundle['vendor.js'].code += '\n// custom'  // shared reference não funciona
}

// ✅ Use emitFile ou transforme no writeBundle
generateBundle(_, bundle) {
  this.emitFile({ type: 'asset', fileName: 'custom.js', source: '...' })
}
```

### Formatos Removidos

- `format: 'system'` ❌
- `format: 'amd'` ❌
- `plugin-legacy` (ES5) ❌ — use outro polyfill

### Hooks Removidos

- `resolveImportMeta` ❌
- `renderDynamicImport` ❌
- `resolveFileUrl` ❌
- `shouldTransformCachedModule` ❌
- `parseAst` / `parseAstAsync` ❌ (use `parseSync` / `parse`)

## Tabela de Migração Rápida

| Se você usa                           | Substitua por                       |
|---------------------------------------|-------------------------------------|
| `build.rollupOptions`                 | `build.rolldownOptions`             |
| `worker.rollupOptions`                | `worker.rolldownOptions`            |
| `optimizeDeps.esbuildOptions`         | `optimizeDeps.rolldownOptions`      |
| `esbuild.*`                           | `oxc.*`                             |
| `transformWithEsbuild()`              | `transformWithOxc()`                |
| `build.minify: 'esbuild'`             | `build.minify: 'oxc'`               |
| `build.cssMinify: 'esbuild'`          | `build.cssMinify: 'lightningcss'`   |
| `options.ssr` em hooks                | `this.environment`                  |
| `handleHotUpdate`                     | `hotUpdate`                         |
| `server.ssrLoadModule()`              | `runner.import()`                   |
| `server.moduleGraph`                  | `environment.moduleGraph`           |
| `server.transformRequest(url, ssr)`   | `environment.transformRequest(url)` |

## Script de Migração

```bash
# 1. Atualizar Vite
npm install -D vite@latest

# 2. Verificar breaking changes no código
grep -r "rollupOptions" --include="*.ts" --include="*.js" .
grep -r "esbuild\." --include="*.ts" --include="*.js" .
grep -r "transformWithEsbuild" --include="*.ts" --include="*.js" .
grep -r "handleHotUpdate" --include="*.ts" --include="*.js" .
grep -r "ssrLoadModule" --include="*.ts" --include="*.js" .
grep -r "options\.ssr" --include="*.ts" --include="*.js" .

# 3. Build para verificar erros
vite build 2>&1 | head -50

# 4. Verificar warnings de deprecação
vite build --future.removeServerModuleGraph=warn
```
