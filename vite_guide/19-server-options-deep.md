# Server Options — Referência Profunda

## host e allowedHosts

```ts
server: {
  host: 'localhost',          // Padrão
  // host: '0.0.0.0',        // Acesso LAN/rede
  // host: true,             // Mesmo que 0.0.0.0

  allowedHosts: [
    '.example.com',          // Permite example.com + subdomínios
  ],
  // allowedHosts: true,     // ⚠️ PERIGOSO: permite qualquer host (DNS rebinding)
}
```

⚠️ **Segurança**: `allowedHosts: true` expõe a ataque DNS rebinding (GHSA-vg6x-rcgg-rjx6).

## HTTPS

```bash
npm i -D @vitejs/plugin-basic-ssl
```

```ts
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  server: {
    https: {},                // TLS + HTTP/2 habilitado
  },
  plugins: [basicSsl()],     // Gera certificado autoassinado
})
```

⚠️ Chrome pode ignorar cache com certificado autoassinado.

## Proxy

```ts
server: {
  proxy: {
    // String simples
    '/api': 'http://localhost:3000',

    // Objeto com opções
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },

    // Regex (prefixo ^)
    '^/fallback/.*': {
      target: 'http://localhost:4000',
    },

    // WebSocket
    '/ws': {
      target: 'ws://localhost:3000',
      ws: true,
    },

    // Proxy com configuração avançada
    '/api': {
      target: 'http://localhost:3000',
      configure: (proxy, options) => {
        proxy.on('error', (err, req, res) => {
          console.error('proxy error', err)
        })
        proxy.on('proxyReq', (proxyReq, req, res) => {
          proxyReq.setHeader('x-custom', 'value')
        })
      },
    },
  },
}
```

Usa [`http-proxy-3`](https://github.com/sagemathinc/http-proxy-3) internamente.

## CORS

```ts
server: {
  // Padrão: permite localhost, 127.0.0.1, ::1
  cors: {
    origin: ['http://localhost:3000', 'https://myapp.com'],
    credentials: true,
  },

  // ⚠️ PERIGOSO: permite qualquer origem
  // cors: true,
}
```

## WebSocket (HMR)

```ts
server: {
  ws: {
    protocol: undefined,      // Auto-detected
    host: undefined,
    port: undefined,
    path: undefined,
    timeout: 30000,           // 30s default
    clientPort: undefined,    // Se atrás de reverse proxy com porta diferente
    server: undefined,        // Custom HTTP server para WebSocket
  },

  // Desabilitar HMR
  hmr: false,
  // ou só o overlay
  hmr: { overlay: false },
}
```

Se o WebSocket falhar, o client tenta conexão direta bypassando reverse proxies.

## forwardConsole (Experimental)

```ts
server: {
  forwardConsole: true,
  // ou configurar níveis:
  forwardConsole: {
    unhandledErrors: true,
    logLevels: ['error', 'warn', 'info'],  // 'error' | 'warn' | 'info' | 'log' | 'debug'
  },
}
```

- Default: `true` se detecta AI coding agent (via `@vercel/detect-agent`)
- Útil para debugar erros no terminal do servidor com code frame

## middlewareMode

```ts
import { createServer } from 'vite'
import express from 'express'

const app = express()

const vite = await createServer({
  server: {
    middlewareMode: true,
    appType: 'custom',
    ws: { server: app },       // WebSocket via servidor Express
  },
})

app.use(vite.middlewares)
app.listen(3000)
```

## File System (fs) — Segurança

```ts
server: {
  fs: {
    strict: true,                    // Restringe arquivos fora do workspace root
    allow: [
      '.',                           // Workspace root (auto-detectado)
      '/path/to/shared/deps',
    ],
    deny: [
      '.env',
      '.env.*',
      '*.{crt,pem,key,p12,pfx,cer,der}',
      '.npmrc',
      '.yarnrc.yml',
      '**/.git/**',
    ],
  },
}
```

- `server.fs.allow` auto-detecta workspace root (package.json workspaces, lerna.json, pnpm-workspace.yaml)
- `server.fs.deny` tem prioridade sobre `allow`
- Não se aplica a `publicDir`
- Use `searchForWorkspaceRoot(process.cwd())` para customização

## origin

```ts
server: {
  origin: 'http://localhost:5173',
  // Define a origem das URLs de assets geradas durante dev
  // Útil para backend integration (Laravel, Rails)
}
```

## sourcemapIgnoreList

```ts
server: {
  sourcemapIgnoreList: (sourcePath: string, sourcemapPath: string) => {
    // Default: exclude node_modules
    return sourcePath.includes('node_modules')
  },
  // false para desabilitar
  sourcemapIgnoreList: false,
}
```

Popula `x_google_ignoreList` no sourcemap — browsers ignoram esses arquivos no debugger.

## WSL2 — Dicas

```ts
server: {
  host: '0.0.0.0',            // Necessário para LAN
  watch: {
    usePolling: true,          // WSL2 não detecta mudanças de apps Windows
    interval: 100,
  },
}
```
