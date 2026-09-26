# Diretivas Fundamentais

## x-text

Define o `textContent` de um elemento:

```html
<span x-data="{ username: 'calebporzio' }" x-text="username"></span>
```

Aceita qualquer expressão JS: `x-text="count * 2"`

---

## x-html

Define o `innerHTML` de um elemento:

```html
<div x-data="{ title: '<h1>Start Here</h1>' }" x-html="title"></div>
```

> ⚠️ **Apenas em conteúdo confiável.** `x-html` com dados de usuário causa XSS.

---

## x-show

Toggle de visibilidade via `display: none`:

```html
<div x-data="{ open: false }">
    <button @click="open = ! open">Toggle</button>
    <div x-show="open">Conteúdo</div>
</div>
```

### .important

Para sobrescrever `!important` em CSS externo:

```html
<div x-show.important="open">...</div>
```

### x-show + x-cloak

Para evitar flash de elementos que iniciam ocultos:

```css
[x-cloak] { display: none !important; }
```

```html
<div x-show="false" x-cloak>nunca aparece antes do Alpine carregar</div>
```

---

## x-if

Remove/adiciona DOM completamente (não apenas esconde):

```html
<div x-data="{ open: false }">
    <button @click="open = ! open">Toggle</button>
    <template x-if="open">
        <div>Conteúdo removido/adicionado do DOM</div>
    </template>
</div>
```

> **Regras:** `x-if` deve estar em `<template>` e o template deve conter **apenas um** elemento raiz.
> `x-if` **não suporta** `x-transition`.

---

## x-for

Loop em arrays ou objetos:

```html
<ul x-data="{ items: ['foo', 'bar', 'baz'] }">
    <template x-for="(item, index) in items" :key="index">
        <li>
            <span x-text="index + ': '"></span>
            <span x-text="item"></span>
        </li>
    </template>
</ul>
```

### Regras

1. `x-for` **deve** estar em `<template>`
2. O `<template>` deve conter **apenas um** elemento raiz
3. Use `:key` para performance quando a lista for reordenada

### Loop em objeto

```html
<template x-for="(value, key) in car">
    <li><span x-text="key"></span>: <span x-text="value"></span></li>
</template>
```

### Range

```html
<template x-for="i in 10">
    <li x-text="i"></li>
</template>
```

---

## x-on / @eventos

Escuta eventos DOM:

```html
<button x-on:click="console.log('clicked')">Click</button>
<button @click="console.log('shorthand')">Shorthand</button>
```

### Modificadores de Evento

| Modificador | Efeito |
|---|---|
| `.prevent` | `event.preventDefault()` |
| `.stop` | `event.stopPropagation()` |
| `.outside` | Clique fora do elemento |
| `.window` | Listener no objeto `window` |
| `.document` | Listener no `document` |
| `.once` | Executa apenas uma vez |
| `.debounce` | Debounce de 250ms |
| `.debounce.500ms` | Debounce customizado |
| `.throttle` | Throttle de 250ms |
| `.self` | Apenas se o evento originou no próprio elemento |
| `.capture` | Fase de captura |
| `.passive` | Otimização de scroll |
| `.camel` | Evento camelCase |
| `.dot` | Evento com pontos no nome |

### Teclas Específicas

```html
<input @keyup.enter="submit">
<input @keyup.shift.enter="submit">
<input @keyup.escape="clear">
<input @keyup.page-down="scroll">
```

Tabela de modificadores de tecla: `.enter`, `.space`, `.escape`, `.tab`, `.up`, `.down`, `.left`, `.right`, `.ctrl`, `.cmd`, `.meta`, `.alt`, `.shift`, `.caps-lock`, `.equal`, `.period`, `.comma`, `.slash`.

### Event Object

```html
<button @click="$event.target.remove()">Remove Me</button>
```

---

## x-bind / :atributos

Vincula atributos HTML dinamicamente:

```html
<div x-data="{ placeholderText: 'Type here...' }">
    <input type="text" :placeholder="placeholderText">
</div>
```

### Classes

```html
<!-- String condicional -->
<div :class="open ? '' : 'hidden'">

<!-- Object syntax (preserva classes existentes) -->
<div class="static-class" :class="{ 'hidden': !open }">

<!-- Short-circuit -->
<div :class="open || 'hidden'">
```

> `x-bind:class` **preserva** classes existentes no atributo `class`. Object syntax também.

### Styles

```html
<div :style="{ color: 'red', display: 'flex' }">
```

### Bind de Diretivas Inteiras

```html
<button x-bind="trigger">Open</button>

<script>
Alpine.data('dropdown', () => ({
    open: false,
    trigger: {
        ['x-ref']: 'trigger',
        ['@click']() { this.open = true }
    }
}))
</script>
```

---

## x-model

Two-way binding para inputs:

```html
<div x-data="{ message: '' }">
    <input type="text" x-model="message">
    <span x-text="message"></span>
</div>
```

### Tipos de Input

```html
<!-- Text / Textarea -->
<input type="text" x-model="message">
<textarea x-model="message"></textarea>

<!-- Checkbox (booleano) -->
<input type="checkbox" x-model="accepted">

<!-- Checkbox (array) -->
<input type="checkbox" value="red" x-model="colors">
<input type="checkbox" value="blue" x-model="colors">

<!-- Radio -->
<input type="radio" value="yes" x-model="answer">
<input type="radio" value="no" x-model="answer">

<!-- Select -->
<select x-model="color">
    <option value="" disabled>Select</option>
    <option>Red</option>
</select>

<!-- Range -->
<input type="range" x-model="range" min="0" max="1" step="0.1">
```

### Modificadores

| Modificador | Efeito |
|---|---|
| `.lazy` / `.change` | Sincroniza no blur |
| `.blur` | Sincroniza no blur (mesmo sem mudança) |
| `.enter` | Sincroniza ao pressionar Enter |
| `.number` | Converte para Number |
| `.boolean` | Converte para Boolean |
| `.debounce` | Debounce (250ms default) |
| `.throttle` | Throttle (250ms default) |
| `.fill` | Usa `value` do HTML se propriedade estiver vazia |

```html
<input type="text" x-model.debounce.500ms="search">
<input type="text" x-model.number="age">
<select x-model.boolean="isActive">
```

---

## x-ref / $refs

Referência a elementos DOM:

```html
<button @click="$refs.text.remove()">Remove</button>
<span x-ref="text">Hello</span>
```

> Em V3, `x-ref` só funciona com elementos estáticos (não dinâmicos dentro de `x-for`).

---

## x-init

Hook de inicialização:

```html
<div x-init="console.log('initializing')">
```

### Async init

```html
<div x-data="{ posts: [] }" x-init="posts = await (await fetch('/posts')).json()">
```

### $nextTick

```html
<div x-init="$nextTick(() => { console.log('after render') })">
```

### init() automático vs x-init

```html
<div x-data="{
    init() { console.log('called first') }
}" x-init="console.log('called second')">
```

---

## x-effect

Reage a qualquer dependência usada na expressão:

```html
<div x-data="{ label: 'Hello' }" x-effect="console.log(label)">
    <button @click="label += ' World!'">Change</button>
</div>
```

Diferenças de `$watch`:
- `x-effect` executa **imediatamente** E quando dados mudam (não é lazy)
- `x-effect` não fornece o valor anterior

---

## x-cloak

Esconde elemento até Alpine ser inicializado:

```html
<style>[x-cloak] { display: none !important; }</style>

<span x-cloak x-text="message">carregando...</span>
```

---

## x-teleport

Move um elemento para outra parte do DOM:

```html
<template x-teleport="body">
    <div x-show="open">
        Modal contents
    </div>
</template>
```

Útil para modais que precisam quebrar z-index. O seletor pode ser qualquer CSS selector (`body`, `#my-id`, `.my-class`).

### Event forwarding

```html
<template x-teleport="body" @click="open = false">
    <div x-show="open">Modal (click to close)</div>
</template>
```

---

## x-ignore

Impede Alpine de processar uma subárvore:

```html
<div x-data="{ label: 'From Alpine' }">
    <div x-ignore>
        <span x-text="label"><!-- não será processado --></span>
    </div>
</div>
```

---

## x-id / $id

Geração de IDs únicos para acessibilidade:

```html
<div x-id="['text-input']">
    <label :for="$id('text-input')">Username</label>
    <input type="text" :id="$id('text-input')">
</div>
```

---

## x-modelable

Expõe uma propriedade interna para `x-model` externo:

```html
<div x-data="{ number: 5 }">
    <div x-data="{ count: 0 }" x-modelable="count" x-model="number">
        <button @click="count++">Increment</button>
    </div>
    Number: <span x-text="number"></span>
</div>
```

Útil para componentes encapsulados em templates server-side (Blade, Askama, etc.).
