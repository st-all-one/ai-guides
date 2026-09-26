# Estado e Reatividade

## Estado Local com `x-data`

`x-data` define um componente Alpine e seu estado reativo:

```html
<div x-data="{ open: false, count: 0 }">
    <button @click="count++">+</button>
    <span x-text="count"></span>
</div>
```

### Regras

- `x-data` é **obrigatório** em um elemento pai para que outras diretivas funcionem
- O valor é um objeto JavaScript literal
- Propriedades ficam disponíveis para todos os filhos
- `x-data` vazio é válido: `<div x-data>`

### Escopo em Cascata

Dados do pai são acessíveis nos filhos. Filhos podem sobrescrever:

```html
<div x-data="{ foo: 'bar' }">
    <span x-text="foo"><!-- "bar" --></span>

    <div x-data="{ foo: 'bob' }">
        <span x-text="foo"><!-- "bob" --></span>
    </div>
</div>
```

### Métodos e Getters

```html
<div x-data="{
    open: false,
    get isOpen() { return this.open },
    toggle() { this.open = ! this.open },
}">
    <button @click="toggle">Toggle</button>
    <div x-show="isOpen">conteúdo</div>
</div>
```

> **Importante:** dentro de `x-data`, use `this.propriedade` para acessar outras propriedades.

### init() Automático

Se o objeto `x-data` contém um método `init()`, ele é chamado automaticamente:

```html
<div x-data="{
    init() {
        console.log('inicializado')
    }
}">
```

---

## Estado Reutilizável com `Alpine.data()`

Registre componentes globais para reuso:

```js
document.addEventListener('alpine:init', () => {
    Alpine.data('dropdown', () => ({
        open: false,
        toggle() { this.open = ! this.open }
    }))
})
```

```html
<div x-data="dropdown">
    <button @click="toggle">Toggle</button>
    <div x-show="open">conteúdo</div>
</div>
```

### Com Parâmetros

```js
Alpine.data('dropdown', (initialOpen = false) => ({
    open: initialOpen,
    toggle() { this.open = ! this.open }
}))
```

```html
<div x-data="dropdown(true)">
```

### init e destroy

```js
Alpine.data('timer', () => ({
    counter: 0,
    timer: null,
    init() {
        this.timer = setInterval(() => this.counter++, 1000)
    },
    destroy() {
        clearInterval(this.timer)
    }
}))
```

O método `destroy()` é chamado quando o componente é removido do DOM (ex: dentro de `x-if`).

---

## Estado Global com `Alpine.store()`

### Registro

```js
document.addEventListener('alpine:init', () => {
    Alpine.store('darkMode', {
        on: false,
        toggle() { this.on = ! this.on }
    })
})
```

### Acesso via `$store`

```html
<button @click="$store.darkMode.toggle()">Toggle Dark Mode</button>
<div :class="$store.darkMode.on && 'bg-black'">...</div>
```

### Store com init()

```js
Alpine.store('darkMode', {
    init() {
        this.on = window.matchMedia('(prefers-color-scheme: dark)').matches
    },
    on: false,
    toggle() { this.on = ! this.on }
})
```

### Stores de valor único

```js
Alpine.store('darkMode', false)
```

```html
<button @click="$store.darkMode = ! $store.darkMode">Toggle</button>
```

---

## Reatividade com `Alpine.bind()`

Reutiliza objetos de atributos/diretivas:

```js
Alpine.bind('SomeButton', () => ({
    type: 'button',
    ['@click']() { this.doSomething() },
    [':disabled']() { return this.shouldDisable }
}))
```

```html
<button x-bind="SomeButton"></button>
```

---

## Reatividade Baixo Nível

### Alpine.reactive()

```js
let data = Alpine.reactive({ count: 1 })
```

### Alpine.effect()

```js
Alpine.effect(() => {
    console.log(data.count) // loga e reage a mudanças
})
```

Essas duas funções são a base de toda reatividade em Alpine. `x-effect` no template é um wrapper para `Alpine.effect()`.

```html
<div x-data="{ label: 'Hello' }" x-effect="console.log(label)">
    <button @click="label += ' World!'">Change</button>
</div>
```
