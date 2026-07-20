# Templates e Renderização

## Fundamentos

Lit usa **tagged template literals** — não string interpolation, não virtual DOM. O browser passa ao Lit um array de strings estáticas e um array de expressões dinâmicas. Lit faz o parsing HTML uma vez e nas re-renderizações só atualiza as expressões modificadas.

```typescript
html`<h1>Hello ${name}</h1>`
// strings: ['<h1>Hello ', '</h1>']  (estático, parseado 1x)
// values:  [name]                    (dinâmico, atualizado a cada render)
```

## Tipos de Expressão

| Prefixo | Tipo | Exemplo |
|---------|------|---------|
| (nenhum) | Atributo | `<div class=${myClass}>` |
| `?` | Boolean attribute | `<div ?hidden=${!visible}>` |
| `.` | Property | `<input .value=${text}>` |
| `@` | Event listener | `<button @click=${handler}>` |
| `${}` | Child content | `<p>${text}</p>` |
| `${directive}` | Element directive | `<div ${ref(elRef)}>` |

### Child Expressions — Valores Aceitos

- Primitivos (string, number, boolean) — convertidos para texto
- `TemplateResult` — templates aninhados
- DOM Nodes — inseridos diretamente
- `nothing` — não renderiza nada (remove conteúdo)
- `noChange` — não altera o valor existente (para directives)
- `null` / `undefined` — equivalente a `nothing`
- Arrays/iterables de qualquer valor acima

## Conditional Rendering

```typescript
// Ternary operator (mais comum)
render() {
  return html`
    ${this.user
      ? html`Welcome ${this.user.name}`
      : html`Please log in`}
  `;
}
```

```typescript
// If statement
render() {
  let message;
  if (this.user) {
    message = html`Welcome ${this.user.name}`;
  } else {
    message = html`Please log in`;
  }
  return html`<p>${message}</p>`;
}
```

```typescript
// Função separada
render() {
  return html`<p>${this._renderMessage()}</p>`;
}
private _renderMessage() {
  if (this.user) return html`Welcome ${this.user.name}`;
  return html`Please log in`;
}
```

### Conditionally Rendering Nothing

```typescript
html`<p>${this.userName ?? nothing}</p>`;
html`<button aria-label="${this.ariaLabel || nothing}"></button>`;
html`<img src="/img/${ifDefined(this.imagePath)}/${ifDefined(this.imageFile)}">`;
```

- `nothing` remove o atributo inteiro se qualquer expressão no valor avaliar para `nothing`
- `ifDefined(value)` é açúcar para `value ?? nothing`
- `null` e `undefined` em child expressions também renderizam nada

## Lists

```typescript
// map (recomendado para a maioria dos casos)
render() {
  return html`
    <ul>
      ${this.items.map((item, i) => html`
        <li class=${item.active ? 'active' : ''}>${item.name}</li>`)}
    </ul>
  `;
}
```

```typescript
// Looping statement
render() {
  const templates = [];
  for (const item of this.items) {
    templates.push(html`<li>${item.name}</li>`);
  }
  return html`<ul>${templates}</ul>`;
}
```

```typescript
// repeat directive — DOM keyed (reordenação eficiente)
import { repeat } from 'lit/directives/repeat.js';

render() {
  return html`
    <ul>
      ${repeat(this.items, (item) => item.id, (item, i) => html`
        <li>${i}: ${item.name}</li>`)}
    </ul>
  `;
}
```

### Quando usar `map` vs `repeat`

| Situação | `map` | `repeat` |
|----------|-------|----------|
| Lista pequena ou estática | ✅ | ❌ |
| Reordenação frequente | ❌ | ✅ |
| DOM tem estado não-controlado (ex: checkbox) | ❌ | ✅ |
| Performance crítica, lista grande | ❌ | ✅ |
| Simplicidade | ✅ | ❌ |

## Built-in Directives Essenciais

### classMap

```typescript
import { classMap } from 'lit/directives/class-map.js';

render() {
  return html`<div class=${classMap({
    active: this.active,
    disabled: this.disabled,
    highlighted: this.isHighlighted
  })}>Content</div>`;
}
// Deve ser única expressão no atributo class, mas aceita classes estáticas:
html`<div class="base ${classMap(dynamic)}">Content</div>`;
```

### styleMap

```typescript
import { styleMap } from 'lit/directives/style-map.js';

render() {
  return html`<div style=${styleMap({
    backgroundColor: this.bgColor,
    color: this.textColor,
    '--custom-prop': this.customValue,
    fontFamily: 'Roboto, sans-serif'
  })}>Content</div>`;
}
```

### when e choose

```typescript
import { when } from 'lit/directives/when.js';
import { choose } from 'lit/directives/choose.js';

// when — ternário mais legível
html`${when(this.user, () => html`Welcome ${this.user.name}`, () => html`Sign In`)}`;

// choose — switch como expressão
html`${choose(this.status, [
  ['loading', () => html`<spinner-element>`],
  ['error', () => html`<error-view>`],
  ['ready', () => html`<data-view>`],
], () => html`<p>Unknown state</p>`)}`;
```

### cache

```typescript
import { cache } from 'lit/directives/cache.js';

render() {
  return html`${cache(this.view === 'list'
    ? html`<list-view .items=${this.items}></list-view>`
    : html`<grid-view .items=${this.items}></grid-view>`)
  }`;
}
// cache preserva DOM dos templates não renderizados, evitando recriação
```

### ref

```typescript
import { ref } from 'lit/directives/ref.js';

class MyElement extends LitElement {
  private _inputRef: Ref<HTMLInputElement> = createRef();

  render() {
    return html`<input ${ref(this._inputRef)}>`;
  }

  firstUpdated() {
    this._inputRef.value?.focus();
  }
}
```

### unsafeHTML

```typescript
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// ⚠️ APENAS para conteúdo confiável! Risco de XSS.
render() {
  return html`<div>${unsafeHTML(this.trustedHtml)}</div>`;
}
```

### unsafeSVG

```typescript
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

// ⚠️ APENAS para SVG confiável!
render() {
  return html`<svg>${unsafeSVG(this.trustedSvgContent)}</svg>`;
}
```

### ifDefined

```typescript
import { ifDefined } from 'lit/directives/if-defined.js';

// Remove o atributo se o valor for null/undefined
html`<img src="${ifDefined(this.imageUrl)}">`;
html`<input aria-label="${ifDefined(this.ariaLabel)}">`;
// Equivalente a: value ?? nothing
```

### join

```typescript
import { join } from 'lit/directives/join.js';

// Junta TemplateResults com um separador
html`<p>${join(
  this.items.map(i => html`<a href="/${i}">${i}</a>`),
  html`<span> | </span>`
)}</p>`;
// Output: <a href="/a">a</a><span> | </span><a href="/b">b</a>...
```

### range

```typescript
import { range } from 'lit/directives/range.js';

// Gera sequência numérica sem criar array
html`<ul>
  ${range(1, 11).map(i => html`<li>Item ${i}</li>`)}
</ul>`;
// range(stop) ou range(start, stop, step)
```

### live

```typescript
import { live } from 'lit/directives/live.js';

// Sempre reavalia contra o valor atual do DOM (não o valor em memória)
// Útil quando o DOM pode ter sido alterado externamente
html`<input .value=${live(this.value)}>`;
// Sem live, Lit só atualiza se this.value !== valorAnteriorEmMemória
// Com live, Lit verifica this.value !== input.value atual
```

### keyed

```typescript
import { keyed } from 'lit/directives/keyed.js';

// Força recriação completa do DOM filho quando a key muda
html`<div ${keyed(this.userId)}>
  <user-profile .userId=${this.userId}></user-profile>
</div>`;
```

### guard

```typescript
import { guard } from 'lit/directives/guard.js';

// Só reavalia a expressão quando as dependências mudam
render() {
  return html`
    <div>${guard([this.items, this.filter], () =>
      this._expensiveRender(this.items, this.filter)
    )}</div>
  `;
}
```

### templateContent

```typescript
import { templateContent } from 'lit/directives/template-content.js';

// Renderiza o conteúdo de um <template> HTML
const tmpl = document.querySelector('template#my-template')!;
render() {
  return html`${templateContent(tmpl)}`;
}
```

## Async Rendering Directives

### until

```typescript
import { until } from 'lit/directives/until.js';

// Renderiza placeholder até a Promise resolver
render() {
  return html`
    <p>${until(
      fetch('/api/data').then(r => r.json()),
      html`<span>Loading...</span>`,
      html`<span>Error loading</span>`
    )}</p>
  `;
}
```

### asyncAppend

```typescript
import { asyncAppend } from 'lit/directives/async-append.js';

// Renderiza valores de um AsyncIterable conforme chegam (append)
async function* timedItems() {
  yield html`<li>First</li>`;
  await new Promise(r => setTimeout(r, 1000));
  yield html`<li>Second</li>`;
}

render() {
  return html`<ul>${asyncAppend(timedItems())}</ul>`;
}
```

### asyncReplace

```typescript
import { asyncReplace } from 'lit/directives/async-replace.js';

// Renderiza valores de um AsyncIterable substituindo a cada novo valor
async function* countUp() {
  for (let i = 1; i <= 5; i++) {
    await new Promise(r => setTimeout(r, 1000));
    yield i;
  }
}

render() {
  return html`<p>Count: ${asyncReplace(countUp())}</p>`;
}
```

## Static Expressions

Para casos onde expressões normais não funcionam (nomes de tag, nomes de atributo):

```typescript
import { html, literal } from 'lit/static-html.js';

class MyButton extends LitElement {
  tag = literal`button`;
  render() {
    return html`<${this.tag} @click=${this.handleClick}>Click</${this.tag}>`;
  }
}

class MyAnchor extends MyButton {
  tag = literal`a`;
}
```

> ⚠️ **Performance**: Mudar valores `literal` cria um novo template do zero. Use apenas para configurações que raramente mudam.

## Boolean Attributes Dinâmicos

```typescript
html`<div ?hidden=${!this.visible}>Visible content</div>`;
html`<option ?selected=${this.isSelected}>Option</option>`;
html`<input ?disabled=${this.readOnly}>`;
```

## Property Binding vs. Attribute Binding

```typescript
// Attribute binding — string sempre
html`<div title=${this.tooltip}>Hover me</div>`;

// Property binding — qualquer tipo JavaScript
html`<my-element .config=${this.configObject}></my-element>`;

// Boolean attribute
html`<div ?hidden=${!this.show}>Content</div>`;

// Event listener
html`<button @click=${this._handleClick}>Click</button>`;
```

## Expressões em Atributos com Múltiplas Partes

Um único atributo pode conter múltiplas expressões misturadas com texto estático:

```typescript
html`<a href="/${this.lang}/users/${this.userId}/profile">Profile</a>`
// strings: ['<a href="/', '/users/', '/profile">Profile</a>']
// values:  [this.lang, this.userId]

html`<div class="btn ${this.variant} ${this.size} active">`
```

Regras:
- Expressões são separadas por texto estático
- Se **qualquer** expressão avaliar para `nothing`/`null`/`undefined`, o atributo **inteiro** é removido
- `ifDefined` protege contra isso em atributos com parte estática

## Expressões Inválidas — Locais Onde Não Usar

```typescript
// ❌ Inválido — não pode estar dentro de uma tag (nome de tag dinâmico)
html`<${this.tagName}></${this.tagName}>`

// ❌ Inválido — nome de atributo dinâmico
html`<div ${this.attrName}=${value}></div>`

// ❌ Inválido — dentro de <style> no template
html`<style> .${this.className} { color: red; } </style>`

// ✅ Use static expressions para nomes de tag/atributo
import { html, literal } from 'lit/static-html.js';

// ✅ Use styleMap ou CSS custom properties para estilos
html`<div style=${styleMap({ color: this.textColor })}>`
```

## Well-Formed HTML

Lit requer HTML **bem formado** no template. Tags não fechadas ou mal aninhadas causam erro:

```typescript
// ❌ Inválido — tag não fechada
html`<div><span>text`

// ❌ Inválido — mal aninhado
html`<div><span>text</div></span>`

// ✅ Correto
html`<div><span>text</span></div>`

// ✅ Self-closing tags são OK
html`<input type="text"> <br> <img src="...">`

// ✅ Expressões podem estar em atributos de self-closing tags
html`<input .value=${this.text} @input=${this._onInput}>`
```

## Fora do LitElement (Standalone lit-html)

```typescript
import { html, render } from 'lit-html';

const template = (name: string) => html`<h1>Hello ${name}</h1>`;

// Renderizar em container
render(template('World'), document.getElementById('app')!);

// Renderizar antes de um nó específico
render(template('World'), container, { renderBefore: container.querySelector('footer')! });
```

## Dicas de Performance

1. **Evite criar funções no template** — referencie métodos da classe
2. **Use `cache` para alternar entre templates grandes**
3. **Prefira `map` sobre `repeat` a menos que precise de keyed DOM**
4. **Evite static expressions em props que mudam frequentemente**
5. **Use `noChange` em custom directives para pular updates**
6. **Renderize fora do Shadow DOM (return this) se não precisar de encapsulamento**
