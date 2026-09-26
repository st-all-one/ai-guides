# Instalação e Setup

## CDN (recomendado para HTML puro)

A forma mais simples de incluir Alpine em uma página HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/cdn.min.js"></script>
</head>
<body>
    <h1 x-data="{ message: 'I ❤️ Alpine' }" x-text="message"></h1>
</body>
</html>
```

> **Sempre use `defer`** — isso garante que o script execute após o HTML ser parseado.

Para estabilidade em produção, fixe a versão exata (`@3.15.12`). O `@3.x.x` obtém a última 3.x mas pode quebrar inesperadamente.

---

## NPM (para bundles com build step)

```bash
npm install alpinejs
```

```js
import Alpine from 'alpinejs'

window.Alpine = Alpine   // opcional: útil para debug no console

Alpine.start()
```

> Registre **extensões** (`Alpine.data(...)`, `Alpine.plugin(...)`) **entre** `import Alpine` e `Alpine.start()`.

---

## CSP Build (Content-Security Policy)

Se seu projeto exige `'unsafe-eval'` ausente no CSP, use o build CSP:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'nonce-a23gbfz9e'">

<script defer nonce="a23gbfz9e"
    src="https://cdn.jsdelivr.net/npm/@alpinejs/csp@3.x.x/dist/cdn.min.js"></script>
```

**Limitações do CSP build:**
- ❌ Atribuições aninhadas: `user.name = 'John'`
- ❌ Arrow functions inline: `() => console.log('hi')`
- ❌ Template literals: `` `Hello ${name}` ``
- ❌ Spread operator: `{ ...defaults }`
- ❌ Globais (`document`, `window`, `console`, `Math`)
- ✅ Objetos/arrays literais, operações básicas, `x-model`, `x-show`
- ✅ Chamadas de método: `items.push('c')`, `count++`

**Estratégia CSP:** extraia lógica complexa para `Alpine.data()`:

```html
<div x-data="userManager" x-show="hasActiveAdmins">

<script nonce="...">
    document.addEventListener('alpine:init', () => {
        Alpine.data('userManager', () => ({
            users: [],
            get hasActiveAdmins() {
                return this.users.filter(u => u.active).length > 0
            }
        }))
    })
</script>
```

---

## Ordem de Carregamento (com plugins)

Plugins CDN devem vir **antes** do core Alpine:

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.x.x/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/cdn.min.js"></script>
```

---

## Inicialização Manual (NPM + plugins)

```js
import Alpine from 'alpinejs'
import persist from '@alpinejs/persist'
import collapse from '@alpinejs/collapse'
import intersect from '@alpinejs/intersect'

Alpine.plugin(persist)
Alpine.plugin(collapse)
Alpine.plugin(intersect)

window.Alpine = Alpine
Alpine.start()
```

---

## Boas Práticas

1. **Sempre use `defer`** no CDN para não bloquear renderização
2. **Fixe a versão** em produção (`@3.15.12`)
3. **Plugins antes do core** na ordem do `<script>`
4. **`Alpine.start()` chamado uma única vez** — múltiplas chamadas criam instâncias concorrentes
5. **`x-cloak`** para evitar flash de conteúdo não inicializado:

```css
[x-cloak] { display: none !important; }
```

```html
<span x-cloak x-text="message">carregando...</span>
```

Alternativa sem CSS global (usa `<template x-if>`):

```html
<template x-if="true">
    <span x-text="message"></span>
</template>
```
