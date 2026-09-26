# Plugins Oficiais

## Persist (`@alpinejs/persist`)

Persiste estado em `localStorage`:

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.x.x/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

```html
<div x-data="{ count: $persist(0) }">
    <button @click="count++">Increment</button>
    <span x-text="count"></span>
</div>
```

### Chave customizada

```html
<div x-data="{ count: $persist(0).as('other-count') }">
```

### Storage customizado

```html
<div x-data="{ count: $persist(0).using(sessionStorage) }">
```

```js
// Cookie storage customizado
window.cookieStorage = {
    getItem(key) {
        let cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].split("=");
            if (key == cookie[0].trim()) return decodeURIComponent(cookie[1]);
        }
        return null;
    },
    setItem(key, value) { document.cookie = key+' = '+encodeURIComponent(value) }
}
```

```html
<div x-data="{ count: $persist(0).using(cookieStorage) }">
```

### Com Alpine.data (usar function, não arrow)

```js
Alpine.data('dropdown', function () {
    return { open: this.$persist(false) }
})
```

### Com Alpine.store

```js
Alpine.store('darkMode', {
    on: Alpine.$persist(true).as('darkMode_on')
})
```

---

## Focus (`@alpinejs/focus`)

Foco e trapping de foco.

### x-trap

```html
<div x-data="{ open: false }">
    <button @click="open = true">Open Dialog</button>
    <div x-show="open" x-trap="open">
        <p>Foco preso aqui</p>
        <button @click="open = false">Close</button>
    </div>
</div>
```

### Modificadores

- `.inert` — adiciona `aria-hidden` aos outros elementos
- `.noscroll` — remove scroll da página
- `.noreturn` — não retorna foco ao fechar
- `.noautofocus` — não foca automaticamente o primeiro elemento

### $focus

```html
<div @keydown.right="$focus.next()" @keydown.left="$focus.previous()">
    <button>First</button>
    <button>Second</button>
    <button>Third</button>
</div>
```

| Método | Descrição |
|---|---|
| `$focus.next()` | Foca próximo elemento focável |
| `$focus.previous()` | Foca anterior |
| `$focus.first()` | Primeiro focável |
| `$focus.last()` | Último focável |
| `$focus.within(el)` | Escopo para elemento específico |
| `$focus.wrap()` | Wrap around (volta ao início no fim) |
| `$focus.focus(el)` | Foca elemento específico |

---

## Intersect (`@alpinejs/intersect`)

Observa quando elemento entra no viewport:

```html
<div x-data="{ shown: false }" x-intersect="shown = true">
    <div x-show="shown" x-transition>No viewport!</div>
</div>
```

### Modificadores

| Modificador | Efeito |
|---|---|
| `.once` | Executa apenas na primeira intersecção |
| `.half` | Threshold de 0.5 |
| `.full` | Threshold de 0.99 |
| `.threshold.50` | Threshold customizado (0-100) |
| `.margin.200px` | Root margin (como CSS margin) |
| `.parent` | Observa visibilidade dentro do pai |

### :enter e :leave

```html
<div x-intersect:enter="shown = true" x-intersect:leave="shown = false">
```

---

## Resize (`@alpinejs/resize`)

Observa mudanças de tamanho de elementos:

```html
<div x-data="{ width: 0, height: 0 }"
     x-resize="width = $width; height = $height">
    <p x-text="'Width: ' + width + 'px'"></p>
</div>
```

### .document

Observa o documento inteiro:

```html
<div x-resize.document="width = $width; height = $height">
```

---

## Mask (`@alpinejs/mask`)

Mascara inputs de texto:

```html
<input x-mask="99/99/9999" placeholder="MM/DD/YYYY">
```

| Wildcard | Descrição |
|---|---|
| `*` | Qualquer caractere |
| `a` | Apenas letras (a-z, A-Z) |
| `9` | Apenas números (0-9) |

### Máscara Dinâmica

```html
<input x-mask:dynamic="
    $input.startsWith('34') || $input.startsWith('37')
        ? '9999 999999 99999' : '9999 9999 9999 9999'
">
```

### $money()

```html
<input x-mask:dynamic="$money($input)">
<input x-mask:dynamic="$money($input, ',')">         <!-- vírgula decimal -->
<input x-mask:dynamic="$money($input, '.', ' ')">    <!-- separador milhar espaço -->
<input x-mask:dynamic="$money($input, '.', ',', 4)"> <!-- 4 casas decimais -->
```

---

## Anchor (`@alpinejs/anchor`)

Ancora elemento a outro (Floating UI):

```html
<div x-data="{ open: false }">
    <button x-ref="button" @click="open = ! open">Toggle</button>
    <div x-show="open" x-anchor="$refs.button">Dropdown</div>
</div>
```

### Posicionamento

`.bottom`, `.bottom-start`, `.bottom-end`, `.top`, `.top-start`, `.top-end`, `.left`, `.left-start`, `.left-end`, `.right`, `.right-start`, `.right-end`.

### Modificadores

```html
<div x-anchor.fixed="$refs.button">        <!-- position: fixed -->
<div x-anchor.offset.10="$refs.button">    <!-- offset de 10px -->
<div x-anchor.noflip="$refs.button">       <!-- não flipa posição -->
<div x-anchor.no-style="$refs.button">     <!-- sem estilo automático -->
```

### $anchor (com no-style)

```html
<div x-anchor.no-style="$refs.button"
     x-bind:style="{ position: 'absolute', top: $anchor.y+'px', left: $anchor.x+'px' }">
```

---

## Morph (`@alpinejs/morph`)

Transforma DOM existente em novo HTML preservando estado:

```js
Alpine.morph(el, newHtml)
```

```js
document.querySelector('button').addEventListener('click', () => {
    Alpine.morph(el, `<div x-data="{ message: '...' }">
        <h2>Novo conteúdo</h2>
        <input type="text" x-model="message">
        <span x-text="message"></span>
    </div>`)
})
```

### Lifecycle Hooks

```js
Alpine.morph(el, newHtml, {
    updating(el, toEl, childrenOnly, skip) { },
    updated(el, toEl) { },
    removing(el, skip) { },
    removed(el) { },
    adding(el, skip) { },
    added(el) { },
    key(el) { return el.id }, // default: key=""
    lookahead: true,
})
```

### Keys (para listas)

```html
<li key="1">Mark</li>
<li key="2">Tom</li>
<li key="3">Travis</li>
```

### Alpine.morphBetween()

Morph entre dois marcadores:

```js
Alpine.morphBetween(startComment, endComment, newHtml, options)
```

---

## Sort (`@alpinejs/sort`)

Arrastar e soltar para reordenar (SortableJS):

```html
<ul x-sort>
    <li x-sort:item="1">foo</li>
    <li x-sort:item="2">bar</li>
    <li x-sort:item="3">baz</li>
</ul>
```

### Handler

```html
<ul x-sort="alert($item + ' - ' + $position)">
```

### Grupos

```html
<ul x-sort x-sort:group="todos">
```

### Drag Handle

```html
<li x-sort:item>
    <span x-sort:handle> ⠿ </span>foo
</li>
```

### Ignorar elementos

```html
<li x-sort:item>
    foo
    <button x-sort:ignore>Edit</button>
</li>
```

### Ghost (mostra elemento fantasma)

```html
<ul x-sort.ghost>
```

### Config customizada

```html
<ul x-sort x-sort:config="{ animation: 0 }">
```

### CSS hover bug workaround

```html
<li class="[body:not(.sorting)_&]:hover:border">
```
