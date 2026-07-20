# Avançado

## Async

Alpine suporta funções assíncronas na maioria dos lugares:

```html
<span x-text="await getLabel()"></span>
```

```js
async function getLabel() {
    let response = await fetch('/api/label')
    return await response.text()
}
```

Sem parênteses, Alpine detecta async automaticamente:

```html
<span x-text="getLabel"></span>
```

---

## Custom Directives

Registre diretivas customizadas com `Alpine.directive()`:

```js
Alpine.directive('uppercase', el => {
    el.textContent = el.textContent.toUpperCase()
})
```

```html
<span x-uppercase>Hello World!</span>
```

### Assinatura

```js
Alpine.directive('[name]', (el, { value, modifiers, expression }, { Alpine, effect, cleanup }) => {})
```

### Avaliando expressões

```js
Alpine.directive('log', (el, { expression }, { evaluate }) => {
    console.log(evaluate(expression))
})
```

Com reatividade (usando `evaluateLater` + `effect`):

```js
Alpine.directive('log', (el, { expression }, { evaluateLater, effect }) => {
    let getThingToLog = evaluateLater(expression)

    effect(() => {
        getThingToLog(thingToLog => {
            console.log(thingToLog)
        })
    })
})
```

### Cleanup

```js
Alpine.directive('...', (el, {}, { cleanup }) => {
    let handler = () => {}
    window.addEventListener('click', handler)
    cleanup(() => window.removeEventListener('click', handler))
})
```

### Ordem Customizada

```js
Alpine.directive('foo', (el, { value, modifiers, expression }) => {
    Alpine.addScopeToNode(el, { foo: 'bar' })
}).before('bind')  // executa ANTES de x-bind
```

---

## Custom Magics

```js
Alpine.magic('now', () => (new Date).toLocaleTimeString())
```

```html
<span x-text="$now"></span>
```

### Magic Functions

```js
Alpine.magic('clipboard', () => subject => {
    navigator.clipboard.writeText(subject)
})
```

```html
<button @click="$clipboard('hello world')">Copy</button>
```

---

## Escrevendo Plugins

### Script Tag

```html
<script src="/js/foo.js" defer></script>
<script src="/js/alpine.js" defer></script>
```

```js
// foo.js
document.addEventListener('alpine:init', () => {
    window.Alpine.directive('foo', ...)
    window.Alpine.magic('foo', ...)
})
```

### Bundle Module

```js
// foo.js
export default function (Alpine) {
    Alpine.directive('foo', ...)
    Alpine.magic('foo', ...)
}
```

```js
// app.js
import foo from 'foo'
Alpine.plugin(foo)
```

---

## Lifecycle

### alpine:init

Antes do Alpine inicializar a página — registre extensões aqui:

```js
document.addEventListener('alpine:init', () => {
    Alpine.data('dropdown', () => ({}))
})
```

### alpine:initialized

Após o Alpine terminar de inicializar:

```js
document.addEventListener('alpine:initialized', () => {
    console.log('Alpine pronto')
})
```

### $watch e x-effect

- `$watch`: lazy (só executa na mudança), recebe valor novo + antigo
- `x-effect`: executa imediatamente + nas mudanças, não recebe valor antigo

### x-init

Executa durante inicialização do elemento.

### init() automático

Método `init()` em objetos `Alpine.data()` ou inline `x-data` é chamado automaticamente.

### destroy()

Método `destroy()` é chamado quando o componente é removido do DOM.

---

## Reactivity System (Baixo Nível)

Alpine usa `@vue/reactivity` internamente.

### Alpine.reactive()

```js
let data = Alpine.reactive({ count: 1 })
```

### Alpine.effect()

```js
Alpine.effect(() => {
    console.log(data.count) // 1, e reage a mudanças
})
```

### Exemplo sem syntax Alpine

```html
<button>Increment</button>
Count: <span></span>
```

```js
let button = document.querySelector('button')
let span = document.querySelector('span')
let data = Alpine.reactive({ count: 1 })

Alpine.effect(() => { span.textContent = data.count })

button.addEventListener('click', () => { data.count++ })
```

---

## CSP Build

Use `@alpinejs/csp` quando `'unsafe-eval'` não é permitido.

**Não suporta:** atribuições aninhadas, arrow functions, template literals, spread, globais (`document`, `window`, `console`, `Math`).

**Solução:** extraia lógica para `Alpine.data()`:

```html
<div x-data="counter">
    <span x-text="count"></span>
    <button @click="increment">+</button>
</div>

<script nonce="...">
    Alpine.data('counter', () => ({
        count: 0,
        increment() { this.count++ }
    }))
</script>
```
