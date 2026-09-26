# Custom Directives

Directives são funções que estendem a sintaxe de templates do Lit, permitindo controle fino sobre como valores são renderizados e quando o DOM é atualizado.

---

## 1. Simple Function Directives

Para lógica simples que só precisa ser reavaliada a cada render:

```typescript
import { html } from 'lit';
import { DirectiveResult, directive } from 'lit/directive.js';

// Directive como função pura
const hello = (name: string) => html`<b>Hello, ${name}!</b>`;

// Directive com directive() wrapper — recebe os valores como argumentos
const addStyles = directive((styles: Record<string, string>) => (part: ElementPart) => {
  for (const [prop, value] of Object.entries(styles)) {
    (part.element as HTMLElement).style.setProperty(prop, value);
  }
});

// Uso:
render() {
  return html`<div ${addStyles({ color: 'red', fontSize: '14px' })}>Content</div>`;
}
```

### Limitações de Simple Directives

- Executam **a cada render** — não podem pular updates
- Não têm acesso ao lifecycle do update
- Ideais para transformações de valor, não para manipulação de DOM com estado

---

## 2. Class-based Directives

Para directives com estado interno, lifecycle e controle fino de updates:

```typescript
import { Directive, PartType, directive } from 'lit/directive.js';
import { noChange } from 'lit';
import type { Part, ChildPart, AttributePart, ElementPart, BooleanAttributePart, EventPart } from 'lit';

class ResizeTextDirective extends Directive {
  private _fontSize = 16;

  render(text: string, minSize = 12, maxSize = 48) {
    return html`<span style="font-size: ${this._fontSize}px">${text}</span>`;
  }

  update(part: ChildPart, [text, minSize, maxSize]: [string, number, number]) {
    const length = text.length;
    const newSize = Math.max(minSize, Math.min(maxSize, 200 / length));
    if (newSize !== this._fontSize) {
      this._fontSize = newSize;
      return this.render(text, minSize, maxSize);
    }
    return noChange; // não re-renderiza se o tamanho não mudou
  }
}

const resizeText = directive(ResizeTextDirective);
```

### Lifecycle de Class Directives

| Hook | Quando executa | Uso |
|------|---------------|-----|
| `constructor()` | 1ª vez que a directive é encontrada no template | Inicializar estado |
| `render(...args)` | Todo ciclo de update | Retornar valor a renderizar |
| `update(part, [...args])` | Todo ciclo de update | Controle: retornar valor ou `noChange` |
| `disconnected()` | Quando o nó host é removido do DOM | Cleanup |
| `reconnected()` | Quando o nó host é reinserido no DOM | Re-setup |

```typescript
class ClockDirective extends Directive {
  private _timer: number | null = null;
  private _startTime = 0;

  render(format: Intl.DateTimeFormatOptions = {}) {
    return new Intl.DateTimeFormat('pt-BR', format).format(new Date());
  }

  update(part: ChildPart, [format]: [Intl.DateTimeFormatOptions]) {
    if (!this._timer) {
      this._startTime = Date.now();
      this._timer = window.setInterval(() => {
        this.setValue(this.render(format));
        (part as ChildPart).host?.requestUpdate();
      }, 1000);
    }
    return this.render(format);
  }

  disconnected() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  reconnected() {
    // Timer será recriado no próximo update
  }
}

const clock = directive(ClockDirective);

// Uso:
// html`<p>${clock({ hour: '2-digit', minute: '2-digit' })}</p>`
```

### `noChange` vs `nothing`

| Valor | Efeito |
|-------|--------|
| `noChange` | Não altera o DOM existente — o valor anterior permanece |
| `nothing` | Remove o nó do DOM (child) ou remove o atributo |

```typescript
class LogDirective extends Directive {
  render(value: unknown, logPrefix = 'Value:') {
    return html`<span>${value}</span>`;
  }

  update(part: ChildPart, [value, logPrefix]: [unknown, string]) {
    console.log(logPrefix, value);
    // Retornar this.render() ou o resultado do update
    return this.render(value, logPrefix);
  }
}
```

---

## 3. Part Types

Cada tipo de expressão no template recebe um tipo de `Part` diferente:

| Expressão | Part Type | Uso |
|-----------|-----------|-----|
| Child (`${...}`) | `ChildPart` | Conteúdo dentro do elemento |
| Attribute (`attr=${...}`) | `AttributePart` | Valor de atributo |
| Boolean (`?attr=${...}`) | `BooleanAttributePart` | Atributo booleano |
| Property (`.prop=${...}`) | `AttributePart` (com `type: PROPERTY`) | Propriedade JS |
| Event (`@event=${...}`) | `EventPart` | Event listener |
| Element (`${directive}`) | `ElementPart` | Referência ao elemento |

```typescript
import { PartType } from 'lit/directive.js';

class TypedDirective extends Directive {
  render() {
    return html`<p>directive content</p>`;
  }

  update(part: Part, [value]: [unknown]) {
    switch (part.type) {
      case PartType.CHILD:
        // É um ChildPart
        break;
      case PartType.ATTRIBUTE:
        // É um AttributePart — part.element, part.name disponíveis
        break;
      case PartType.ELEMENT:
        // É um ElementPart — part.element é o elemento host
        break;
      case PartType.BOOLEAN_ATTRIBUTE:
        // Atributo booleano
        break;
      case PartType.PROPERTY:
        // Property binding
        break;
      case PartType.EVENT:
        // Event listener
        break;
    }
    return this.render();
  }
}
```

### Acessando Element e Propriedades

```typescript
class AttributeDirective extends Directive {
  render(value: string) {
    return value;
  }

  update(part: AttributePart, [value]: [string]) {
    // part.element — o elemento HTML
    // part.name — nome do atributo
    // part.strings — array de strings estáticas
    // part.options — opções do template (host, etc.)

    // Exemplo: adicionar dataset
    (part.element as HTMLElement).dataset.directive = 'active';

    return this.render(value);
  }
}
```

---

## 4. Async Directives

Para directives que precisam atualizar o DOM assincronamente (fora do ciclo de render):

```typescript
import { AsyncDirective } from 'lit/async-directive.js';

class DelayedRenderDirective extends AsyncDirective {
  private _timeout: number | null = null;

  render(promise: Promise<unknown>, placeholder = html`<p>Loading...</p>`) {
    return placeholder;
  }

  update(part: ChildPart, [promise, placeholder]: [Promise<unknown>, unknown]) {
    if (this._timeout !== null) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }

    // Retorna placeholder imediatamente
    promise.then((value) => {
      // Atualiza o DOM fora do ciclo de update
      this.setValue(html`<span>${String(value)}</span>`);
    });

    return this.render(promise, placeholder);
  }

  disconnected() {
    if (this._timeout !== null) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }
}

const delayed = directive(DelayedRenderDirective);

// Uso:
// html`<p>${delayed(fetch('/api/data').then(r => r.json()))}</p>`
```

### `setValue()` em AsyncDirectives

`setValue()` permite atualizar o DOM fora do ciclo normal de render:

```typescript
class PollingDirective extends AsyncDirective {
  private _interval: number | null = null;

  render(url: string) {
    return html`<p>Fetching ${url}...</p>`;
  }

  async update(part: ChildPart, [url]: [string]) {
    this._startPolling(url);
    return this.render(url);
  }

  private _startPolling(url: string) {
    this._stopPolling();
    this._interval = window.setInterval(async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        this.setValue(html`<pre>${JSON.stringify(data, null, 2)}</pre>`);
      } catch {
        this.setValue(html`<p class="error">Failed to fetch</p>`);
      }
    }, 5000);
  }

  private _stopPolling() {
    if (this._interval !== null) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  disconnected() {
    this._stopPolling();
  }

  reconnected() {
    // O próximo update vai reiniciar o polling
  }
}
```

---

## 5. Directives com Referência a Elemento (ElementPart)

```typescript
class FocusDirective extends Directive {
  render() {
    return; // ElementPart não renderiza valor
  }

  update(part: ElementPart) {
    (part.element as HTMLElement).focus();
  }
}

const focusOnRender = directive(FocusDirective);

// Uso:
// html`<input ${focusOnRender()}>`
```

---

## 6. Directives que Encapsulam Controllers

Combinando directives com `ReactiveController`:

```typescript
import { Directive, directive } from 'lit/directive.js';
import type { Part } from 'lit';
import type { ReactiveController, ReactiveControllerHost } from 'lit';

class IntersectionDirective extends Directive {
  private _controller: IntersectionController | null = null;

  render(callback: (entry: IntersectionObserverEntry) => void, options?: IntersectionObserverInit) {
    return html`<div>Visible</div>`;
  }

  update(part: ElementPart, [callback, options]: [(entry: IntersectionObserverEntry) => void, IntersectionObserverInit | undefined]) {
    if (!this._controller) {
      // Cria controller vinculado ao host
      const host = (part as any).options?.host as ReactiveControllerHost;
      this._controller = new IntersectionController(host, callback, options);
    }
    return this.render(callback, options);
  }

  disconnected() {
    this._controller?.hostDisconnected();
  }
}

class IntersectionController implements ReactiveController {
  private _observer: IntersectionObserver;

  constructor(
    private _host: ReactiveControllerHost,
    callback: (entry: IntersectionObserverEntry) => void,
    options?: IntersectionObserverInit
  ) {
    this._host = _host;
    this._observer = new IntersectionObserver(([entry]) => callback(entry), options);
  }

  hostConnected() {
    this._observer.observe(this._host as HTMLElement);
  }

  hostDisconnected() {
    this._observer.disconnect();
  }
}

const observeIntersection = directive(IntersectionDirective);
```

---

## 7. Boas Práticas

| Prática | Motivo |
|---------|--------|
| Preferir função simples se não precisar de estado | Menos boilerplate, mais previsível |
| Usar `noChange` para pular updates desnecessários | Performance |
| Sempre implementar `disconnected()` em async directives | Evitar memory leaks e timers órfãos |
| Usar `setValue()` apenas em `AsyncDirective` | Única forma de atualizar fora do ciclo |
| Validar tipo de `Part` no `update()` se a directive for versátil | Robustez |
| Evitar manipular DOM fora do `update()`/`render()` | Pode causar inconsistência |
| Testar com diferentes tipos de binding | Child vs Attribute vs Element têm comportamentos diferentes |
| Preferir `ReactiveController` para lógica complexa | Mais testável e componível que directive |

### Performance: Simple vs Class Directive

```
Simple function directive:  ~0.01µs overhead (nenhum lifecycle)
Class-based directive:      ~0.1µs  overhead (instância + lifecycle)
Async directive:            ~0.3µs  overhead (schedule + setValue)
```

Para a maioria dos casos, a diferença é irrelevante. Use class-based quando precisar de estado ou controle de update.
