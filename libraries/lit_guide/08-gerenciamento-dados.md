# Gerenciamento de Dados no Lit

Três abordagens principais para compartilhar e gerenciar estado em aplicações Lit:

1. **Context API** — dados contextuais em subárvores (tema, usuário, serviços)
2. **Signals** — estado observável compartilhado (reatividade fina)
3. **Task** — dados assíncronos (fetch, API calls)

---

## 1. Context API (@lit/context)

### Quando usar
- Dados que muitas componentes precisam (tema, usuário, locale)
- Dependency injection (serviços, loggers, stores)
- Dados que precisam ser tree-scoped

### Instalação

```bash
npm i @lit/context
```

### Definindo um Contexto

```typescript
// theme-context.ts
import { createContext } from '@lit/context';

export interface Theme {
  primary: string;
  background: string;
  text: string;
  spacing: number;
}

export const themeContext = createContext<Theme>(Symbol('theme'));
```

### Provider

```typescript
import { provide } from '@lit/context';
import { themeContext, type Theme } from './theme-context.js';

@customElement('theme-provider')
class ThemeProvider extends LitElement {
  @provide({ context: themeContext })
  @property({ attribute: false })
  theme: Theme = {
    primary: '#0066cc',
    background: '#ffffff',
    text: '#1a1a1a',
    spacing: 8
  };

  render() {
    return html`<slot></slot>`;
  }
}
```

### Consumer

```typescript
import { consume } from '@lit/context';
import { themeContext, type Theme } from './theme-context.js';

@customElement('themed-button')
class ThemedButton extends LitElement {
  @consume({ context: themeContext, subscribe: true })
  @property({ attribute: false })
  theme?: Theme;

  static styles = css`
    :host { display: inline-block; }
    button {
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
      font: inherit;
    }
  `;

  render() {
    return html`
      <button style=${styleMap({
        background: this.theme?.primary ?? '#0066cc',
        color: this.theme?.text ?? 'white',
        padding: `${this.theme?.spacing ?? 8}px ${(this.theme?.spacing ?? 8) * 2}px`
      })}>
        <slot></slot>
      </button>
    `;
  }
}
```

### ContextProvider Controller (sem decorators)

```typescript
import { ContextProvider } from '@lit/context';

@customElement('logger-provider')
class LoggerProvider extends LitElement {
  private _provider = new ContextProvider(this, {
    context: loggerContext,
    initialValue: new Logger()
  });

  // Atualizar valor
  setLogger(logger: Logger) {
    this._provider.setValue(logger);
  }
}
```

### ContextConsumer Controller (sem decorators)

```typescript
import { ContextConsumer } from '@lit/context';

@customElement('logging-consumer')
class LoggingConsumer extends LitElement {
  private _logger = new ContextConsumer(this, {
    context: loggerContext,
    subscribe: true
  });

  render() {
    return html`<p>Logger available: ${!!this._logger.value}</p>`;
  }
}
```

### ContextRoot — Providers tardios

Quando providers são adicionados ao DOM **depois** dos consumers:

```typescript
import { ContextRoot } from '@lit/context';

const root = new ContextRoot();
root.attach(document.body);

// Agora, se um provider for adicionado depois, o ContextRoot
// vai re-despachar context-request para ele
```

### Exemplo: Tema com Context + CSS Custom Properties

```typescript
@customElement('theme-provider')
class ThemeProvider extends LitElement {
  @provide({ context: themeContext })
  @property({ attribute: false })
  theme: Theme = defaultTheme;

  // Sincroniza com CSS custom properties no host
  protected updated() {
    const t = this.theme;
    (this as HTMLElement).style.setProperty('--theme-primary', t.primary);
    (this as HTMLElement).style.setProperty('--theme-bg', t.background);
    (this as HTMLElement).style.setProperty('--theme-text', t.text);
  }
}
```

---

## 2. Signals (@lit-labs/signals)

### Quando usar
- Estado compartilhado entre múltiplos componentes não-relacionados
- Updates de UI extremamente granulares (pinpoint updates)
- Estado que cruza boundaries de Shadow DOM frequentemente

### Instalação

```bash
npm i @lit-labs/signals
```

### SignalWatcher Mixin (auto-watch)

```typescript
import { LitElement, html } from 'lit';
import { SignalWatcher, signal } from '@lit-labs/signals';

const count = signal(0);

@customElement('shared-counter')
class SharedCounter extends SignalWatcher(LitElement) {
  render() {
    return html`
      <p>Count: ${count.get()}</p>
      <button @click=${() => count.set(count.get() + 1)}>+</button>
    `;
  }
}
// Múltiplas instâncias compartilham o mesmo estado
```

### Pinpoint Updates com watch()

```typescript
import { SignalWatcher, watch, signal } from '@lit-labs/signals';

const count = signal(0);

@customElement('pinpoint-counter')
class PinpointCounter extends SignalWatcher(LitElement) {
  render() {
    return html`
      <!-- Apenas este binding atualiza quando count muda -->
      <p>Count: ${watch(count)}</p>
      <!-- O resto do template não re-renderiza -->
      <button @click=${() => count.set(count.get() + 1)}>+</button>
      <heavy-static-content></heavy-static-content>
    `;
  }
}
```

### Auto-pinpoint com `html` tag especial

```typescript
import { LitElement } from 'lit';
import { SignalWatcher, html, signal } from '@lit-labs/signals';

const count = signal(0);

class AutoCounter extends SignalWatcher(LitElement) {
  render() {
    // Signals são detectados e wrapped automaticamente com watch()
    return html`<p>Count: ${count}</p>`;
  }
}
```

### Computed Signals

```typescript
import { SignalWatcher, signal, computed } from '@lit-labs/signals';

const items = signal<string[]>([]);
const filter = signal('');

// computed — memoizado, re-computa só quando dependências mudam
const filteredItems = computed(() =>
  items.get().filter(i => i.includes(filter.get()))
);
```

### signal-utils (coleções observáveis)

```bash
npm i signal-utils
```

```typescript
import { SignalArray } from 'signal-utils/array';
import { signal } from 'signal-utils';

class TodoStore {
  @signal accessor items = new SignalArray<TodoItem>();
  @signal accessor filter = 'all';

  get filtered() {
    return this.items.filter(item => {
      if (this.filter === 'active') return !item.completed;
      if (this.filter === 'completed') return item.completed;
      return true;
    });
  }

  add(text: string) {
    this.items.push({ id: Date.now(), text, completed: false });
  }

  toggle(id: number) {
    const item = this.items.find(i => i.id === id);
    if (item) item.completed = !item.completed;
  }
}

const store = new TodoStore();

@customElement('todo-list')
class TodoList extends SignalWatcher(LitElement) {
  private _store = store;

  render() {
    return html`
      <ul>
        ${this._store.filtered.map(item => html`
          <li>
            <input type="checkbox" .checked=${item.completed}
              @change=${() => this._store.toggle(item.id)}>
            ${item.text}
          </li>
        `)}
      </ul>
    `;
  }
}
```

---

## 3. Task (@lit/task) — Dados Assíncronos

### Quando usar
- Fetch de API com estados (loading, complete, error)
- Operações assíncronas que dependem de props
- Cache e race condition handling automático

### Instalação

```bash
npm i @lit/task
```

### Uso Básico

```typescript
import { Task } from '@lit/task';

interface Product {
  id: string;
  name: string;
  price: number;
}

@customElement('product-viewer')
class ProductViewer extends LitElement {
  @property() productId = '';

  private _productTask = new Task(this, {
    task: async ([id], { signal }) => {
      const res = await fetch(`/api/products/${id}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Product;
    },
    args: () => [this.productId]
  });

  render() {
    return this._productTask.render({
      initial: () => html`<p>Enter a product ID</p>`,
      pending: () => html`<p>Loading...</p>`,
      complete: (product) => html`
        <h2>${product.name}</h2>
        <p class="price">$${product.price}</p>
      `,
      error: (err) => html`<p class="error">${err.message}</p>`
    });
  }
}
```

### Task com Múltiplos Args

```typescript
private _searchTask = new Task(this, {
  task: async ([query, page], { signal }) => {
    const res = await fetch(
      `/api/search?q=${query}&page=${page}`,
      { signal }
    );
    return res.json();
  },
  args: () => [this.query, this.page]
});
```

### Task Manual (sem auto-run)

```typescript
private _saveTask = new Task(this, {
  task: async ([data]) => {
    const res = await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  args: () => []
}); // args vazio + autoRun default → executa uma vez

// Ou autoRun: false para execução manual
private _manualTask = new Task(this, {
  task: async ([id]) => {
    const res = await fetch(`/api/item/${id}`);
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },
  autoRun: false,
  args: () => []
});

// Disparar manualmente:
this._manualTask.run([this.selectedId]);
```

### Task Chaining

```typescript
private _userTask = new Task(this, {
  task: ([userId]) => fetchUser(userId),
  args: () => [this.userId]
});

private _postsTask = new Task(this, {
  task: ([user]) => fetchPosts(user.id),
  args: () => [this._userTask.value]
});
```

### Abort e Race Conditions

Task gerencia aborts automaticamente: quando novos args são passados antes do task anterior terminar, o `AbortSignal` do task anterior é abortado.

```typescript
private _task = new Task(this, {
  task: async ([id], { signal }) => {
    signal.throwIfAborted();
    const step1 = await doStep1(id);
    signal.throwIfAborted();
    return doStep2(step1);
  },
  args: () => [this.id]
});
```

### Task Status

```typescript
import { TaskStatus } from '@lit/task';

// Acesso direto ao status
if (this._task.status === TaskStatus.INITIAL) { /* nunca rodou */ }
if (this._task.status === TaskStatus.PENDING) { /* rodando */ }
if (this._task.status === TaskStatus.COMPLETE) { /* sucesso */ }
if (this._task.status === TaskStatus.ERROR) { /* erro */ }
```

---

## Comparação: Context vs Signals vs Task

| Característica | Context | Signals | Task |
|----------------|---------|---------|------|
| **Propósito** | Injeção de dependência | Estado observável compartilhado | Dados assíncronos |
| **Escopo** | Árvore DOM | Global/qualquer escopo | Componente |
| **Reatividade** | Subscribe automático | Pinpoint + auto-watch | Baseada em args |
| **Boilerplate** | Médio | Baixo | Baixo |
| **Performance** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **SSR** | ✅ (cuidado) | ✅ | ✅ |
| **Maturidade** | ✅ Estável | ⚠️ Labs | ✅ Estável (@lit/task) |

### Padrão Recomendado

```
App State global (signals)
  ├── Tema (context)
  ├── Usuário logado (context)
  ├── Cache de dados (signals)
  ├── Fetch/data (Task)
  └── Estado local componente (@state)
```
