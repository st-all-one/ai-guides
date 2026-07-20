# Transições e Animações

## x-transition

Funciona **apenas** com `x-show` (não com `x-if`).

### Uso básico

```html
<div x-data="{ open: false }">
    <button @click="open = ! open">Toggle</button>
    <div x-show="open" x-transition>
        Hello 👋
    </div>
</div>
```

`x-transition` sem modificadores aplica fade + scale com 150ms enter / 75ms leave.

### Modificadores de Helper

```html
<!-- Duração -->
<div x-show="open" x-transition.duration.500ms>

<!-- Enter e Leave com durações diferentes -->
<div x-show="open"
     x-transition:enter.duration.500ms
     x-transition:leave.duration.400ms>

<!-- Delay -->
<div x-show="open" x-transition.delay.50ms>

<!-- Apenas opacity (sem scale) -->
<div x-show="open" x-transition.opacity>

<!-- Apenas scale -->
<div x-show="open" x-transition.scale>
<div x-show="open" x-transition.scale.80>

<!-- Origin do scale -->
<div x-show="open" x-transition.scale.origin.top>
```

### Classes CSS Customizadas

Para controle fino, use classes CSS em fases específicas:

```html
<div x-show="open"
     x-transition:enter="transition ease-out duration-300"
     x-transition:enter-start="opacity-0 scale-90"
     x-transition:enter-end="opacity-100 scale-100"
     x-transition:leave="transition ease-in duration-300"
     x-transition:leave-start="opacity-100 scale-100"
     x-transition:leave-end="opacity-0 scale-90">
```

| Diretiva | Quando é aplicada |
|---|---|
| `:enter` | Durante toda a fase de entrada |
| `:enter-start` | Antes do elemento ser inserido; removido 1 frame após |
| `:enter-end` | 1 frame após inserção; removido quando transição termina |
| `:leave` | Durante toda a saída |
| `:leave-start` | Imediatamente quando a saída é acionada; removido 1 frame após |
| `:leave-end` | 1 frame após início da saída; removido quando termina |

---

## x-collapse (Plugin)

Plugin para animações de collapse/expand suaves.

### Instalação

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

### Uso

```html
<div x-data="{ expanded: false }">
    <button @click="expanded = ! expanded">Toggle</button>
    <div x-show="expanded" x-collapse>
        <p>Conteúdo que expande/colapsa com animação.</p>
    </div>
</div>
```

### Modificadores

```html
<!-- Duração customizada -->
<div x-show="expanded" x-collapse.duration.1000ms>

<!-- Mínimo (não esconde completamente, apenas "corta") -->
<div x-show="expanded" x-collapse.min.50px>
```
