# Magicas e Globais

## Magics (propriedades `$`)

### $el

O elemento DOM atual onde a expressão é executada:

```html
<button @click="$el.innerHTML = 'Hello World!'">Replace me</button>
```

> Em V3, `$el` é **sempre o elemento atual**, não o root do componente. Use `$root` para o root.

### $root

Elemento raiz do componente (o mais próximo com `x-data`):

```html
<div x-data data-message="Hello World!">
    <button @click="alert($root.dataset.message)">Say Hi</button>
</div>
```

### $refs

Acessa elementos marcados com `x-ref`:

```html
<button @click="$refs.text.remove()">Remove</button>
<span x-ref="text">Hello 👋</span>
```

> **Limitação V3:** `$refs` só funciona com elementos estáticos (não em `x-for`).

### $watch

Observa mudanças em uma propriedade:

```html
<div x-data="{ open: false }"
     x-init="$watch('open', (value, oldValue) => console.log(value, oldValue))">
    <button @click="open = ! open">Toggle</button>
</div>
```

Aceita notação por ponto para propriedades aninhadas:

```html
<div x-data="{ foo: { bar: 'baz' }}"
     x-init="$watch('foo.bar', value => console.log(value))">
```

### $store

Acessa stores globais registradas com `Alpine.store()`:

```html
<div :class="$store.darkMode.on && 'bg-black'">
    <button @click="$store.darkMode.toggle()">Toggle</button>
</div>
```

Para stores de valor único:

```html
<button @click="$store.darkMode = ! $store.darkMode">Toggle</button>
```

### $dispatch

Dispara eventos DOM customizados:

```html
<div @notify="alert($event.detail.message)">
    <button @click="$dispatch('notify', { message: 'Hello World!' })">Notify</button>
</div>
```

**Comunicação entre componentes** (use `.window`):

```html
<div x-data @set-title.window="title = $event.detail">
    <h1 x-text="title"></h1>
</div>

<div x-data>
    <button @click="$dispatch('set-title', 'Hello World!')">Click</button>
</div>
```

**Eventos canceláveis:**

```html
<button @click="if($dispatch('open')){ open = true; }">Open</button>
```

**Override de opções** (terceiro parâmetro):

```html
<button @click="$dispatch('update-title', 'Hello', {bubbles: false})">Click</button>
```

### $nextTick

Executa código após atualização do DOM:

```html
<button @click="
    title = 'Hello World!';
    $nextTick(() => { console.log($el.innerText) });
" x-text="title">
</button>
```

Retorna Promise:

```html
<button @click="
    title = 'Hello World!';
    await $nextTick();
    console.log($el.innerText);
" x-text="title">
</button>
```

### $data

Objeto encapsulando todo o escopo atual:

```html
<div x-data="{ greeting: 'Hello' }">
    <div x-data="{ name: 'Caleb' }">
        <button @click="sayHello($data)">Say Hello</button>
    </div>
</div>
<script>
    function sayHello({ greeting, name }) {
        alert(greeting + ' ' + name + '!')
    }
</script>
```

### $id

Gera IDs únicos na página:

```html
<input type="text" :id="$id('text-input')">
<!-- id="text-input-1" -->

<input type="text" :id="$id('text-input')">
<!-- id="text-input-2" -->
```

Com `x-id` para agrupar:

```html
<div x-id="['text-input']">
    <label :for="$id('text-input')">Username</label>
    <input type="text" :id="$id('text-input')">
</div>
```

Com segundo parâmetro (key em loops):

```html
<ul x-id="['list-item']" :aria-activedescendant="$id('list-item', activeItem.id)">
    <template x-for="item in items" :key="item.id">
        <li :id="$id('list-item', item.id)">...</li>
    </template>
</ul>
```

---

## Globais (Alpine.*)

### Alpine.data()

Registra componentes reutilizáveis:

```js
Alpine.data('dropdown', () => ({
    open: false,
    toggle() { this.open = ! this.open }
}))
```

### Alpine.store()

Armazena estado global:

```js
Alpine.store('darkMode', {
    on: false,
    toggle() { this.on = ! this.on }
})
```

### Alpine.bind()

Reutiliza objetos de atributos/diretivas:

```js
Alpine.bind('SomeButton', () => ({
    type: 'button',
    ['@click']() { this.doSomething() },
}))
```

### Alpine.plugin()

Registra plugins:

```js
import persist from '@alpinejs/persist'
Alpine.plugin(persist)
```

### Alpine.reactive() / Alpine.effect()

APIs de reatividade de baixo nível:

```js
let data = Alpine.reactive({ count: 1 })
Alpine.effect(() => console.log(data.count))
```

### Alpine.version / Alpine.start()

```js
console.log(Alpine.version) // "3.15.12"
Alpine.start()               // inicia o observer DOM
```
