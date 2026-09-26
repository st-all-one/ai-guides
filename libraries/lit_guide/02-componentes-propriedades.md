# Definição de Componentes e Propriedades

## Definindo um Componente

```typescript
// TypeScript com decorators
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('my-element')
export class MyElement extends LitElement {
  @property({ type: String })
  name = 'World';

  render() {
    return html`<p>Hello, ${this.name}!</p>`;
  }
}

// Necessário para type-checking em createElement
declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement;
  }
}
```

```javascript
// JavaScript sem decorators
import { LitElement, html } from 'lit';

class MyElement extends LitElement {
  static properties = {
    name: { type: String }
  };

  constructor() {
    super();
    this.name = 'World';
  }

  render() {
    return html`<p>Hello, ${this.name}!</p>`;
  }
}
customElements.define('my-element', MyElement);
```

## TypeScript — Configuração Essencial

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

> **Atenção:** `useDefineForClassFields: false` é crítico. Com `true` (default ES2022+), class fields sobrescrevem os getters/setters reativos, quebrando a reatividade.

### Auto-accessors (TypeScript ≥4.9)

```typescript
@customElement('my-element')
export class MyElement extends LitElement {
  @property()
  accessor name = 'World';
}
```

Auto-accessors com `accessor` keyword criam getter/setter automaticamente e funcionam com `useDefineForClassFields: true`. Útil para migração gradual para standard decorators.

## JavaScript — Atenção com Class Fields

```javascript
// ERRADO — class field sobrescreve accessor reativo
class MyElement extends LitElement {
  static properties = {
    name: { type: String }
  };
  name = 'World'; // ❌ quebra a reatividade!
}

// CORRETO — inicializar no constructor
class MyElement extends LitElement {
  static properties = {
    name: { type: String }
  };
  constructor() {
    super();
    this.name = 'World';
  }
}
```

## Propriedades Reativas — Tipos e Conversão

| `type` | Atributo → Propriedade | Propriedade → Atributo |
|--------|------------------------|------------------------|
| `String` | Valor do atributo | `String(valor)` |
| `Number` | `Number(valor)` | `String(valor)` |
| `Boolean` | `true` se presente | Vazio se truthy, removido se falsy |
| `Object` | `JSON.parse(valor)` | `JSON.stringify(valor)` |
| `Array` | `JSON.parse(valor)` | `JSON.stringify(valor)` |

### Boolean Properties — Regra Essencial

Propriedades booleanas **devem** default para `false`:

```typescript
@property({ type: Boolean })
disabled = false; // ✅ correto
// Se disabled = true, nunca será possível desabilitar via HTML
```

### Converter Customizado

```typescript
@property({
  converter: {
    fromAttribute: (value) => value?.split(',') ?? [],
    toAttribute: (value) => value.join(',')
  }
})
tags: string[] = [];
```

## Internal Reactive State

```typescript
@state()
private _isOpen = false;

// Equivalente sem decorator:
static properties = {
  _isOpen: { state: true }
};
```

- Dispara update reativo como `@property`
- **Não** cria observed attribute
- **Não** reflete para atributo
- Ideal para estado interno do componente

## Attribute Reflection

```typescript
@property({ reflect: true })
variant = 'primary';

@property({ reflect: true, useDefault: true })
id = '';
```

- `reflect: true` — sincroniza propriedade → atributo
- `useDefault: true` — não reflete o valor inicial, mas reflete mudanças subsequentes
- Match com comportamento nativo (ex: `id` property não gera `id` attribute até ser modificada)

### Boas Práticas de Reflection

- Refletir **apenas** propriedades que precisam ser visíveis em CSS (`[attr]`) ou querySelector
- Evitar refletir objetos/arrays grandes — serialização cara
- Preferir `:state()` pseudo-class (CustomStateSet) para estados visuais

## Propriedades Mutáveis (Objetos e Arrays)

```typescript
// Padrão Imutável (recomendado)
this.items = [...this.items, newItem];
this.config = { ...this.config, theme: 'dark' };

// Mutação direta com requestUpdate manual
this.items.push(newItem);
this.requestUpdate(); // não recomendado para dados compartilhados
```

## Validação com Custom Setters

```typescript
private _quantity = 0;

@property({ type: Number })
set quantity(val: number) {
  this._quantity = Math.max(0, Math.floor(val));
}
get quantity() { return this._quantity; }
```

## Change Detection Customizada

```typescript
@property({
  hasChanged(newVal: string, oldVal: string) {
    return newVal?.toLowerCase() !== oldVal?.toLowerCase();
  }
})
searchTerm = '';
```

## Propriedades sem Accessor Gerado

```typescript
static properties = {
  myProp: { type: Number, noAccessor: true }
};
```

Raro: usado quando uma superclasse já define accessors e você só quer adicionar options.

## Dica de Performance: Evitar Re-renders

```typescript
shouldUpdate(changedProperties: Map<string, unknown>) {
  // Só atualiza se 'name' ou 'items' mudaram
  return changedProperties.has('name') || changedProperties.has('items');
}
```

```typescript
willUpdate(changedProperties: Map<string, unknown>) {
  // Computar valores derivados sem causar novo update
  if (changedProperties.has('items')) {
    this._total = this.items.reduce((s, i) => s + i.price, 0);
  }
}
```
