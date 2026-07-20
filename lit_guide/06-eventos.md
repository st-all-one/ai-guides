# Eventos no Lit

## Event Listeners Declarativos

```typescript
render() {
  return html`
    <button @click=${this._handleClick}>Click</button>
    <input @input=${this._handleInput} @focus=${this._handleFocus}>
    <my-element @my-event=${this._handleCustom}></my-element>
  `;
}

_handleClick(e: PointerEvent) {
  e.preventDefault();
  // ...
}
```

### Vantagens

- `this` é automaticamente bound ao componente
- Lit gerencia `addEventListener`/`removeEventListener` no update cycle
- Event listeners são atualizados eficientemente (só mudam se a referência da função mudar)

## Event Options Decorator

```typescript
import { eventOptions } from 'lit/decorators.js';

class MyElement extends LitElement {
  @eventOptions({ passive: true, capture: false })
  private _handleTouch(e: TouchEvent) {
    // passive: true — não chama preventDefault(), melhor performance em scroll
  }

  @eventOptions({ once: true })
  private _handleFirstClick(e: Event) {
    console.log('This runs only once');
  }
}
```

Equivalente a: `el.addEventListener('touchstart', handler, { passive: true })`

## Disparando Eventos Customizados

```typescript
_dispatchChange() {
  this.dispatchEvent(new CustomEvent('change', {
    detail: {
      value: this.value,
      oldValue: this._oldValue
    },
    bubbles: true,
    composed: true,   // atravessa Shadow DOM boundary
    cancelable: true
  }));
}
```

### Eventos que Atravessam Shadow DOM

```typescript
// ⚠️ Sem composed: true, o evento não sai do Shadow Root
this.dispatchEvent(new CustomEvent('internal-event', {
  bubbles: true,
  composed: false  // default — não atravessa
}));

// ✅ Com composed: true, o evento é ouvido fora do componente
this.dispatchEvent(new CustomEvent('external-event', {
  bubbles: true,
  composed: true
}));
```

### Quando usar `composed: true`

| Tipo de Evento | composed | Motivo |
|----------------|----------|--------|
| Evento de interação do usuário | `true` | O dono do componente precisa saber |
| Evento de mudança de estado | `true` | Padrão do web platform (ex: `change`, `input`) |
| Evento interno de rendering | `false` | Só o componente precisa saber |
| Evento de lifecycle | `false` | Interno do componente |

## Host Listening

```typescript
connectedCallback() {
  super.connectedCallback();
  // Listeners globais que NÃO são parte do template
  window.addEventListener('resize', this._onResize);
  document.addEventListener('keydown', this._onKeydown);
}

disconnectedCallback() {
  super.disconnectedCallback();
  window.removeEventListener('resize', this._onResize);
  document.removeEventListener('keydown', this._onKeydown);
}

// ⚠️ Não esquecer .bind() ou arrow function para manter this
private _onResize = () => {
  // ...
};
```

## Controllers para Eventos Globais

```typescript
class ResizeController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _handler: () => void;

  constructor(host: ReactiveControllerHost, handler: () => void) {
    this._host = host;
    this._handler = handler;
    host.addController(this);
  }

  hostConnected() {
    window.addEventListener('resize', this._handler);
  }

  hostDisconnected() {
    window.removeEventListener('resize', this._handler);
  }
}
```

## Keyboard Events

```typescript
@customElement('my-menu-item')
class MyMenuItem extends LitElement {
  @property() disabled = false;

  render() {
    return html`
      <div
        role="menuitem"
        tabindex=${this.disabled ? -1 : 0}
        @click=${this._onActivate}
        @keydown=${this._onKeydown}
        aria-disabled=${ifDefined(this.disabled ? 'true' : undefined)}
      >
        <slot></slot>
      </div>
    `;
  }

  private _onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._onActivate();
    }
  }

  private _onActivate() {
    if (!this.disabled) {
      this.dispatchEvent(new CustomEvent('activate', {
        bubbles: true,
        composed: true
      }));
    }
  }
}
```

## Event Delegation Pattern

```typescript
// Em vez de listeners individuais em cada item:
render() {
  return html`
    <ul @click=${this._onListClick}>
      ${this.items.map(item => html`
        <li data-id=${item.id}>${item.name}</li>
      `)}
    </ul>
  `;
}

private _onListClick(e: Event) {
  const li = (e.target as HTMLElement).closest('li');
  if (li?.dataset.id) {
    this.dispatchEvent(new CustomEvent('item-selected', {
      detail: { id: li.dataset.id },
      bubbles: true,
      composed: true
    }));
  }
}
```

## Boas Práticas

1. **Prefira `@event` declarativo** a `addEventListener` no template
2. **Use `eventOptions` para `passive`, `once`, `capture`**
3. **Sempre faça cleanup** em `disconnectedCallback` para listeners globais
4. **`bubbles: true` + `composed: true`** para eventos que precisam ser ouvidos externamente
5. **Nomes de eventos em kebab-case** para consistência com eventos nativos (ex: `item-selected`)
6. **`detail` para dados** — nunca adicione propriedades customizadas no `Event`
7. **Evite criar funções no template** — isso recria o listener a cada render:
   ```typescript
   // ❌ Ruim
   html`<button @click=${() => this.handleClick(id)}>`
   // ✅ Bom
   html`<button @click=${this._handleClick} data-id=${id}>`
   ```
