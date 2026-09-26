# Práticas Recomendadas

## Estrutura de Componentes

### Prefira Alpine.data() a objetos inline complexos

```js
// ✅ Bom — reutilizável e testável
Alpine.data('counter', () => ({
    count: 0,
    increment() { this.count++ },
    decrement() { this.count-- }
}))
```

```html
<!-- ✅ Limpo -->
<div x-data="counter">
    <button @click="decrement">-</button>
    <span x-text="count"></span>
    <button @click="increment">+</button>
</div>
```

```html
<!-- ❌ Evite para lógica complexa -->
<div x-data="{
    count: 0,
    increment() { this.count++ },
    decrement() { this.count-- },
    // mais métodos...
}">
```

### Separe estado local de global

- Use `x-data` para estado de componente (dropdowns, modais, tabs)
- Use `Alpine.store()` para estado cross-componente (tema, usuário logado, preferências)
- Use `$persist` para estado que deve sobreviver a refresh (filtros, aba ativa)

---

## Performance

### Evite expressions caras em loops

```html
<!-- ❌ Filtra toda vez que qualquer dado mudar -->
<template x-for="item in items.filter(i => i.active)" :key="item.id">

<!-- ✅ Filtra no getter — mais eficiente -->
<div x-data="{
    items: [...],
    get activeItems() { return this.items.filter(i => i.active) }
}">
    <template x-for="item in activeItems" :key="item.id">
```

### Use `:key` em x-for

Sempre adicione `:key` para listas dinâmicas, especialmente se itens podem ser reordenados:

```html
<template x-for="item in items" :key="item.id">
```

### x-cloak para evitar flash

```css
[x-cloak] { display: none !important; }
```

```html
<span x-cloak x-text="heavyData"></span>
```

### Debounce em inputs de busca

```html
<input type="text" x-model.debounce.500ms="search">
```

---

## Segurança

### Nunca use x-html com dados do usuário

```html
<!-- ❌ XSS vulnerability -->
<div x-html="userInput"></div>

<!-- ✅ Use x-text para dados do usuário -->
<div x-text="userInput"></div>
```

### CSP-friendly

Se seu projeto tem CSP restritivo:
- Use o build `@alpinejs/csp`
- Extraia toda lógica complexa para `Alpine.data()`
- Evite globais (`document`, `window`, `console`) em expressions inline

### CSRF em Server Functions

Sempre envie token CSRF em requisições POST para endpoints Rust:

```html
<form @submit.prevent="
    await fetch('/api/todos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name=csrf-token]').content
        },
        body: JSON.stringify({ title: newTodo })
    })
">
```

---

## Padrões Comuns

### Dropdown

```html
<div x-data="{ open: false }" @click.outside="open = false">
    <button @click="open = ! open">Toggle</button>
    <div x-show="open" x-transition>
        Conteúdo do dropdown
    </div>
</div>
```

### Modal

```html
<div x-data="{ open: false }">
    <button @click="open = true">Open Modal</button>

    <template x-teleport="body">
        <div x-show="open" x-trap.noscroll="open"
             @keyup.escape.window="open = false"
             class="fixed inset-0 flex items-center justify-center">
            <div class="bg-white p-8 rounded shadow-lg">
                <button @click="open = false">X</button>
                <p>Conteúdo do modal</p>
            </div>
        </div>
    </template>
</div>
```

### Tabs

```html
<div x-data="{ tab: 'first' }">
    <div class="tabs">
        <button @click="tab = 'first'" :class="{ active: tab === 'first' }">First</button>
        <button @click="tab = 'second'" :class="{ active: tab === 'second' }">Second</button>
    </div>
    <div x-show="tab === 'first'">Conteúdo First</div>
    <div x-show="tab === 'second'">Conteúdo Second</div>
</div>
```

### Toast / Notificação

```html
<div x-data="{ toasts: [] }"
     @notify.window="toasts.push($event.detail)">
    <template x-for="(toast, i) in toasts" :key="i">
        <div x-show="true"
             x-transition:enter.duration.300ms
             x-transition:leave.duration.500ms
             x-init="setTimeout(() => toasts.splice(i, 1), 3000)"
             x-text="toast.message">
        </div>
    </template>
</div>

<button @click="$dispatch('notify', { message: 'Salvo com sucesso!' })">Save</button>
```

### Dark Mode (com persist)

```js
document.addEventListener('alpine:init', () => {
    Alpine.store('darkMode', {
        init() {
            this.on = Alpine.$persist(false).as('darkMode').get()
        },
        on: false,
        toggle() { this.on = ! this.on }
    })
})
```

```html
<body :class="$store.darkMode.on && 'dark'">
    <button @click="$store.darkMode.toggle()">
        <span x-text="$store.darkMode.on ? '🌙' : '☀️'"></span>
    </button>
</body>
```

---

## Migração V2 → V3

| Mudança | V2 (antigo) | V3 (novo) |
|---|---|---|
| `$el` | Elemento root | Elemento atual (use `$root` para root) |
| `init()` | Chamada manual `x-init="init()"` | Automática se `init()` existir no objeto |
| NPM | `import 'alpinejs'` | `import Alpine from 'alpinejs'` + `Alpine.start()` |
| `x-show.transition` | `x-show.transition="open"` | `x-show="open" x-transition` |
| `x-if.transition` | Suportava | Não suporta; use `x-show` |
| Escopo `x-data` | Filhos **não** viam props do pai | Filhos **veem** props do pai |
| `x-init` callback | `x-init="() => { ... }"` | Use `$nextTick(() => { ... })` |
| `return false` em eventos | `preventDefault` automático | Não faz mais; use `e.preventDefault()` |
| `x-spread` | `x-spread="obj"` | `x-bind="obj"` |
| `.away` | `@click.away` | `@click.outside` |
| Funções globais | `function foo()` no HTML | `Alpine.data('foo', () => ({}))` |
| `Alpine.deferLoadingAlpine()` | Hook global | `alpine:init` / `alpine:initialized` eventos |

---

## Debug e DevTools

### Console

```js
// Inspecionar estado de um componente
Alpine.$data(document.querySelector('[x-data]'))

// Acessar store
Alpine.store('darkMode')
```

### Estrutura HTML

```html
<!-- Adicione data attributes para debug -->
<div x-data="counter" data-component="counter">
```

### Verificação de Versão

```js
console.log(Alpine.version) // "3.15.12"
```

### Erros Comuns

| Sintoma | Causa | Solução |
|---|---|---|
| Alpine não funciona | Falta `x-data` no pai | Adicione `<div x-data>` |
| Conteúdo pisca antes de esconder | Falta `x-cloak` | Adicione CSS `[x-cloak]` |
| `$refs` retorna `undefined` | Elemento é dinâmico (x-for) | Use `x-data` + `$root` ou querySelector |
| Transições não funcionam | Usou `x-if` em vez de `x-show` | Mude para `x-show` |
| Plugin não funciona | Plugin carregado depois do core | Mova plugin para antes do Alpine |
| `$store` undefined | Store registrada depois de `Alpine.start()` | Registre stores antes de `start()` |
