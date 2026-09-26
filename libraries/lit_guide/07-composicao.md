# Composição e Reuso de Código

## Três Estratégias de Composição

| Estratégia | Relação | Uso principal |
|------------|---------|---------------|
| Component Composition | Host → child (has-a) | Montar UIs complexas de componentes menores |
| Reactive Controllers | Host → controller (has-a) | Encapsular estado e lógica reutilizável |
| Class Mixins | Classe → mixin (is-a) | Adicionar API pública ou lifecycle interceptação fina |

---

## 1. Component Composition

### Propriedades pra baixo, Eventos pra cima

```typescript
@customElement('my-form')
class MyForm extends LitElement {
  @property() userData = { name: '', email: '' };

  render() {
    return html`
      <my-input
        label="Name"
        .value=${this.userData.name}
        @change=${this._onNameChange}>
      </my-input>
      <my-input
        label="Email"
        .value=${this.userData.email}
        @change=${this._onEmailChange}>
      </my-input>
      <my-button @click=${this._onSubmit}>Submit</my-button>
    `;
  }

  private _onNameChange(e: CustomEvent) {
    this.userData = { ...this.userData, name: e.detail.value };
  }
  private _onEmailChange(e: CustomEvent) {
    this.userData = { ...this.userData, email: e.detail.value };
  }
}
```

### Mediator Pattern

```typescript
@customElement('mediator-element')
class MediatorElement extends LitElement {
  @property() items: string[] = [];
  @state() private _selectedId: string | null = null;

  render() {
    return html`
      <item-list
        .items=${this.items}
        .selectedId=${this._selectedId}
        @select=${this._onItemSelect}>
      </item-list>
      <item-detail .itemId=${this._selectedId}></item-detail>
    `;
  }

  private _onItemSelect(e: CustomEvent) {
    this._selectedId = e.detail.id;
  }
}
```

### Slot-based Composition

```typescript
@customElement('my-dialog')
class MyDialog extends LitElement {
  static styles = css`
    .overlay { /* ... */ }
    .header { /* ... */ }
    .body { /* ... */ }
    .footer { /* ... */ }
  `;

  render() {
    return html`
      <div class="overlay" ?hidden=${!this.open} @click=${this._onBackdrop}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="header"><slot name="header"></slot></div>
          <div class="body"><slot></slot></div>
          <div class="footer"><slot name="footer"></slot></div>
        </div>
      </div>
    `;
  }
}
```

```html
<my-dialog>
  <h2 slot="header">Confirm Action</h2>
  <p>Are you sure you want to proceed?</p>
  <div slot="footer">
    <button @click=${confirm}>Confirm</button>
    <button @click=${cancel}>Cancel</button>
  </div>
</my-dialog>
```

---

## 2. Reactive Controllers

### Estrutura Básica

```typescript
import type { ReactiveController, ReactiveControllerHost } from 'lit';

class MouseController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _x = 0;
  private _y = 0;

  get pos() { return { x: this._x, y: this._y }; }

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
  }

  hostConnected() {
    window.addEventListener('mousemove', this._onMouseMove);
  }

  hostDisconnected() {
    window.removeEventListener('mousemove', this._onMouseMove);
  }

  hostUpdate() {
    // Executa antes do render() do host
  }

  hostUpdated() {
    // Executa depois do render() do host
  }

  private _onMouseMove = (e: MouseEvent) => {
    if (this._x !== e.clientX || this._y !== e.clientY) {
      this._x = e.clientX;
      this._y = e.clientY;
      this._host.requestUpdate();
    }
  };
}
```

### Usando um Controller

```typescript
@customElement('my-mouse-tracker')
class MyMouseTracker extends LitElement {
  private _mouse = new MouseController(this);

  render() {
    return html`
      <p>Mouse: ${this._mouse.pos.x}, ${this._mouse.pos.y}</p>
    `;
  }
}
```

### Ciclo de Vida do Controller

```
Host connectedToDOM
  → hostConnected() do controller  (após criação do renderRoot)
  → connectedCallback() do host

Host update
  → hostUpdate() do controller  (antes de render())
  → willUpdate() do host
  → update() / render() do host
  → hostUpdated() do controller  (após DOM atualizado)
  → updated() do host

Host disconnectedFromDOM
  → hostDisconnected() do controller
  → disconnectedCallback() do host
```

### Controller com Configuração

```typescript
class ResizeController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _observer: ResizeObserver;
  private _size: { width: number; height: number } = { width: 0, height: 0 };

  get contentRect() { return this._size; }

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
    this._observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (this._size.width !== width || this._size.height !== height) {
          this._size = { width, height };
          this._host.requestUpdate();
        }
      }
    });
  }

  hostConnected() {
    this._observer.observe(this._host as HTMLElement);
  }

  hostDisconnected() {
    this._observer.disconnect();
  }
}
```

### Controller com Directive (Element Reference)

```typescript
class ResizeController implements ReactiveController {
  /* ... */
  private _target: HTMLElement | null = null;

  observe() {
    return ref((el: HTMLElement | null) => {
      this._target = el;
      if (el) this._observer.observe(el);
    });
  }
}

// Uso:
class MyElement extends LitElement {
  private _size = new ResizeController(this);

  render() {
    return html`
      <div ${this._size.observe()}>Width: ${this._size.contentRect.width}</div>
    `;
  }
}
```

### Controllers de Async Data

```typescript
class AsyncDataController<T> implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _promise: Promise<T> | null = null;
  private _value: T | null = null;
  private _error: Error | null = null;

  get value() { return this._value; }
  get error() { return this._error; }

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
  }

  async run(promise: Promise<T>) {
    this._promise = promise;
    this._value = null;
    this._error = null;
    this._host.requestUpdate();

    try {
      const result = await promise;
      if (this._promise === promise) { // evita race condition
        this._value = result;
        this._host.requestUpdate();
      }
    } catch (e) {
      if (this._promise === promise) {
        this._error = e as Error;
        this._host.requestUpdate();
      }
    }
  }
}
```

### Controllers Aninhados (Composição de Controllers)

```typescript
class DualClockController implements ReactiveController {
  private clock1: ClockController;
  private clock2: ClockController;

  constructor(host: ReactiveControllerHost, delay1: number, delay2: number) {
    this.clock1 = new ClockController(host, delay1);
    this.clock2 = new ClockController(host, delay2);
  }

  get time1() { return this.clock1.value; }
  get time2() { return this.clock2.value; }
}
```

---

## 3. Class Mixins

### Mixin Básico

```typescript
type Constructor<T = {}> = new (...args: any[]) => T;

const LoggingMixin = <T extends Constructor<LitElement>>(superClass: T) => {
  class LoggingClass extends superClass {
    constructor(...args: any[]) {
      super(...args);
      console.log(`${this.localName} created`);
    }

    connectedCallback() {
      super.connectedCallback();
      console.log(`${this.localName} connected`);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      console.log(`${this.localName} disconnected`);
    }
  };
  return LoggingClass as T;
};
```

### Mixin com Reactive Properties

```typescript
declare class HighlightableInterface {
  highlight: boolean;
  protected renderHighlight(): unknown;
}

const HighlightableMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class HighlightableClass extends superClass {
    @property({ type: Boolean }) highlight = false;

    static styles = [
      (superClass as typeof LitElement).styles ?? [],
      css`:host([highlight]) { background: yellow; }`
    ];

    protected renderHighlight() {
      return this.highlight ? html`<mark><slot></slot></mark>` : html`<slot></slot>`;
    }
  };
  return HighlightableClass as Constructor<HighlightableInterface> & T;
};
```

### Quando usar Mixin vs Controller

| Critério | Controller | Mixin |
|----------|-----------|-------|
| Adiciona API pública | ❌ (via host) | ✅ |
| Acesso a lifecycle | ✅ | ✅ |
| Múltiplas instâncias | ✅ | ❌ (singleton por classe) |
| Composição | ✅ (aninhamento) | ❌ (herança linear) |
| Simplicidade | ✅ | ⚠️ (mais complexo) |
| Testabilidade | ✅ (fácil mock) | ⚠️ (herança) |

**Regra geral**: Prefira Reactive Controllers a menos que você precise adicionar API pública ao componente.

---

## 4. Padrão: Controller para IntersectionObserver

```typescript
import type { ReactiveController, ReactiveControllerHost } from 'lit';

export class VisibilityController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _observer: IntersectionObserver;
  private _isVisible = false;

  get isVisible() { return this._isVisible; }

  constructor(
    host: ReactiveControllerHost,
    options?: IntersectionObserverInit
  ) {
    this._host = host;
    host.addController(this);
    this._observer = new IntersectionObserver(
      ([entry]) => {
        if (this._isVisible !== entry.isIntersecting) {
          this._isVisible = entry.isIntersecting;
          this._host.requestUpdate();
        }
      },
      options
    );
  }

  hostConnected() {
    this._observer.observe(this._host as HTMLElement);
  }

  hostDisconnected() {
    this._observer.disconnect();
  }
}
```

```typescript
@customElement('lazy-image')
class LazyImage extends LitElement {
  private _visibility = new VisibilityController(this, {
    rootMargin: '200px'
  });

  @property() src = '';
  @property() alt = '';

  render() {
    return html`
      ${this._visibility.isVisible
        ? html`<img src=${this.src} alt=${this.alt} loading="lazy">`
        : html`<div class="placeholder">Loading...</div>`}
    `;
  }
}
```
