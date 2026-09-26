# HMR API — Client-Side Completa

## O objeto `import.meta.hot`

```ts
interface ViteHotContext {
  readonly data: any

  accept(): void
  accept(cb: (mod: ModuleNamespace | undefined) => void): void
  accept(dep: string, cb: (mod: ModuleNamespace | undefined) => void): void
  accept(deps: readonly string[], cb: (mods: Array<ModuleNamespace | undefined>) => void): void

  dispose(cb: (data: any) => void): void
  prune(cb: (data: any) => void): void
  invalidate(message?: string): void

  on<T extends CustomEventName>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void
  ): void
  off<T extends CustomEventName>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void
  ): void
  send<T extends CustomEventName>(
    event: T,
    data?: InferCustomEventPayload<T>
  ): void
}
```

## Required Guard (Tree-Shaking)

```ts
if (import.meta.hot) {
  // Bloco removido em produção (tree-shakeado)
  import.meta.hot.accept()
}
```

## hot.accept(cb) — Self-Accepting Module

Módulo se torna HMR boundary — atualiza sem recarregar importers:

```ts
export function setupCounter(element: HTMLButtonElement) {
  let counter = 0

  element.addEventListener('click', () => {
    counter++
    element.innerHTML = `count is ${counter}`
  })
}

if (import.meta.hot) {
  import.meta.hot.accept((updatedModule) => {
    // updatedModule é undefined em caso de SyntaxError
    if (updatedModule) {
      // Re-renderizar
      setupCounter(document.getElementById('counter')!)
    }
  })
}
```

## hot.accept(deps, cb) — Aceitar Dependências

Re-renderizar quando dependências específicas mudam:

```ts
import { foo } from './foo.js'
import { bar } from './bar.js'

if (import.meta.hot) {
  import.meta.hot.accept(['./foo.js', './bar.js'], ([newFoo, newBar]) => {
    if (newFoo) foo = newFoo.foo
    if (newBar) bar = newBar.bar
    render()
  })
}
```

## hot.dispose(cb) — Cleanup

Para self-accepting modules: limpar side effects antes do update:

```ts
const intervalId = setInterval(() => { /* ... */ }, 1000)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearInterval(intervalId)
    window.removeEventListener('resize', handler)
  })
}
```

## hot.prune(cb) — Remoção

Chamado quando o módulo não é mais importado por ninguém:

```ts
if (import.meta.hot) {
  import.meta.hot.prune(() => {
    // Cleanup final (diferente de dispose: só quando removido)
    cleanupResource()
  })
}
```

## hot.data — Estado Cross-Update

Estado que persiste entre atualizações do módulo:

```ts
if (import.meta.hot) {
  // ✅ Mutate properties
  import.meta.hot.data.counter = (import.meta.hot.data.counter || 0) + 1

  // ❌ Não reassign — perde estado!
  // import.meta.hot.data = {}
}
```

## hot.invalidate(message?) — Forçar Propagação

Invalida o módulo e propaga para importers:

```ts
if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (!mod || mod.invalid) {
      import.meta.hot.invalidate('Module is no longer valid')
    }
  })
}
```

## Eventos Automáticos

```ts
// Antes de aplicar update
import.meta.hot.on('vite:beforeUpdate', (event) => {
  // event.updates: Array<{ type: 'js-update' | 'css-update', path, acceptedPath, timestamp }>
  console.log('Updating:', event.updates.map(u => u.path))
})

// Após aplicar update
import.meta.hot.on('vite:afterUpdate', () => {
  console.log('Update applied')
})

// Full reload prestes a ocorrer
import.meta.hot.on('vite:beforeFullReload', (event) => {
  console.log('Full reload')
})

// Módulos sendo removidos
import.meta.hot.on('vite:beforePrune', (event) => {
  console.log('Pruning modules:', event.modules)
})

// Módulo invalidado via hot.invalidate()
import.meta.hot.on('vite:invalidate', (event) => {
  console.log('Invalidated:', event.path)
})

// Erro no HMR
import.meta.hot.on('vite:error', (event) => {
  console.error('HMR error:', event.err)
})

// WebSocket desconectado
import.meta.hot.on('vite:ws:disconnect', () => {
  console.warn('HMR WebSocket disconnected')
})

// WebSocket reconectado
import.meta.hot.on('vite:ws:connect', () => {
  console.log('HMR WebSocket reconnected')
})
```

## Custom Events (Client ↔ Server)

```ts
// Client → Server
import.meta.hot.send('custom:log', { message: 'hello from client' })

// Server → Client (via plugin: server.ws.send('custom:event', data))
import.meta.hot.on('custom:event', (payload) => {
  console.log(payload.data)
})
```

### TypeScript para Custom Events

```ts
// vite-env.d.ts
import 'vite/types/customEvent'

declare module 'vite/types/customEvent' {
  interface CustomEventMap {
    'custom:log': { message: string }
    'custom:event': { data: string }
  }
}
```

## Boas Práticas

1. **Sempre** use `if (import.meta.hot)` — permite tree-shaking em produção
2. **Limpe** timers/listeners em `dispose` para evitar memory leaks
3. Use `hot.data` para preservar estado entre HMR cycles
4. Para debugging: `vite --debug hmr` mostra o que está acontecendo
5. Full reload em vez de HMR geralmente indica dependência circular
