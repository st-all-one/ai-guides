# CLI Reference e Troubleshooting

## CLI — Flags Completas

### vite (dev server)

| Flag                         | Descrição                              |
|------------------------------|----------------------------------------|
| `vite [root]`                | Diretório root (default: cwd)          |
| `--host [host]`              | Hostname (default: localhost)          |
| `--port <port>`              | Porta (default: 5173)                  |
| `--open [path]`              | Abrir browser no path                  |
| `--cors`                     | Habilitar CORS                         |
| `--strictPort`               | Sair se porta em uso                   |
| `--force`                    | Re-bundle deps ignorando cache         |
| `-c, --config <file>`        | Arquivo de config                      |
| `--base <path>`              | Public base path                       |
| `-l, --logLevel <level>`     | info \| warn \| error \| silent        |
| `--clearScreen`              | Limpar tela (boolean)                  |
| `--configLoader <loader>`    | bundle \| runner \| native             |
| `--profile`                  | Iniciar Node.js inspector              |
| `-d, --debug [feat]`         | Debug logs (ex: `vite --debug hmr`)    |
| `-f, --filter <filter>`      | Filtrar debug logs                     |
| `-m, --mode <mode>`          | Modo de ambiente                       |
| `-h, --help`                 | Help                                   |
| `-v, --version`              | Versão                                 |

### vite build

| Flag                         | Descrição                              |
|------------------------------|----------------------------------------|
| `--target <target>`          | Browser target                         |
| `--outDir <dir>`             | Output dir (default: dist)             |
| `--assetsDir <dir>`          | Assets dir (default: assets)           |
| `--assetsInlineLimit <n>`    | Bytes para inline (default: 4096)      |
| `--ssr [entry]`              | SSR build                              |
| `--sourcemap`                | Source maps (boolean\|"inline"\|"hidden") |
| `--minify <minifier>`        | oxc \| terser \| esbuild \| false      |
| `--manifest [name]`          | Gerar manifest.json                    |
| `--ssrManifest [name]`       | Gerar ssr-manifest.json                |
| `--emptyOutDir`              | Forçar esvaziar outDir                 |
| `-w, --watch`                | Watch mode                             |
| `--app`                      | Build multi-environment (experimental) |

### vite preview

| Flag                         | Descrição                              |
|------------------------------|----------------------------------------|
| `--host [host]`              | Hostname                               |
| `--port <port>`              | Porta (default: 4173)                  |
| `--strictPort`               | Sair se porta em uso                   |
| `--open [path]`              | Abrir browser                          |
| `--outDir <dir>`             | Diretório do build (default: dist)     |

## Config — ConfigLoader

```bash
# Default: Rolldown bundleia config em temp file
vite

# Nativo: usa runtime Node.js (planejado default futuro)
vite --configLoader native

# Experimental: on-the-fly
vite --configLoader runner
```

## Debug

```bash
# Debug HMR
vite --debug hmr

# Debug transformações lentas
vite --debug plugin-transform

# Debug geral
vite --debug

# Filtrar por plugin
vite --debug -f "vite:vue"
```

---

## Troubleshooting — Guia Completo

### CLI / Config

| Problema | Causa | Solução |
|---|---|---|
| `Cannot find module` | Path com `&` no Windows | Use pnpm/yarn ou remova `&` do path |
| "This package is ESM only" | `require()` de pacote ESM | Converta config para ESM (`.mjs` ou `"type":"module"`) |

### Dev Server

| Problema | Causa | Solução |
|---|---|---|
| Requests travando | File descriptors insuficientes (Linux) | `ulimit -Sn 10000` |
| `ENOSPC` error | Limite inotify excedido | `sysctl fs.inotify.max_user_watches=524288` |
| Cache SSL ignorado | Certificado autoassinado (Chrome) | Use certificado confiável |
| 431 Header Too Large | Cookies grandes | `--max-http-header-size=...` |
| VS Code Dev Container | IPv6 no port forwarding | `server.host: '127.0.0.1'` |
| WSL2 não detecta mudanças | File watching entre SOs | `server.watch.usePolling: true` |

### HMR

| Problema | Causa | Solução |
|---|---|---|
| HMR não funciona | Case mismatch em imports | Use `./Component.tsx` (case exato) |
| Full reload em vez de HMR | Circular dependency | `vite --debug hmr` para diagnosticar |
| HMR lento | Muitos módulos sem warmup | `server.warmup.clientFiles` |
| HMR não atualiza | Módulo não é self-accepting | Adicione `import.meta.hot.accept()` |

### Build

| Problema | Causa | Solução |
|---|---|---|
| CORS no file:// | HTML aberto com `file:` protocol | Use `vite preview` |
| ENOENT em deploy | Case mismatch (macOS→Linux) | Verifique case de imports |
| Failed to fetch dynamic import | Version skew (chunk antigo deletado) | Handler `vite:preloadError` + reload |
| Bundle muito grande | Barrel files | Importe direto dos módulos |

### Dependências

| Problema | Causa | Solução |
|---|---|---|
| Deps desatualizadas | `npm link` quebra cache | Use `vite --force` ou package overrides |
| Default import é objeto | CJS interop | Use `legacy.inconsistentCjsInterop: true` |

### Profiling

```bash
# Gerar CPU profile
vite --profile --open
# Pressione 'p' + Enter para salvar .cpuprofile
# Analisar em speedscope.app

# Debug transform
vite --debug plugin-transform
vite --debug hmr
```

### Outros

| Problema | Causa | Solução |
|---|---|---|
| Node module no browser | Código depende de `fs`, `path` | Use polyfill ou refatore |
| Erro de strict mode | ESM = strict mode | Não use `with`/`arguments.callee` |
| Ad-blocker bloqueando | Extensão bloqueia request | Desabilite exceções para dev |
| Cross-drive symlink (Windows) | `subst` ou `mklink` | Não suportado |
| Preview lento | Muitos arquivos | Sirva com Nginx em produção |
