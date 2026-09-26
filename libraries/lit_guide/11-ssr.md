# Server-Side Rendering (SSR)

**Status: Lit Labs** — `@lit-labs/ssr` (em desenvolvimento ativo)

---

## Conceitos

SSR gera HTML dos componentes no servidor, incluindo Shadow DOM, antes do JavaScript carregar. Benefícios:

- **First Contentful Paint** mais rápido
- **SEO** para crawlers que não executam JS
- **Resiliência** — conteúdo visível mesmo sem JS
- **Progress Enhancement** — HTML estático que hidrata

### Lit SSR Flow

```
Servidor:
  Template → render() → HTML string com Declarative Shadow DOM

Browser:
  HTML renderizado → JavaScript carrega → Hydration →
  Componentes tornam-se interativos
```

---

## Instalação

```bash
npm i @lit-labs/ssr
```

## Uso Básico

```typescript
import { render } from '@lit-labs/ssr';
import { html } from 'lit';

// Renderizar template para string HTML
const result = render(html`
  <my-counter value="5"></my-counter>
  <my-button>Click</my-button>
`);

// Coletar resultados (stream ou buffer)
const htmlString = '';
for await (const chunk of result) {
  htmlString += chunk;
}
```

### Streaming

```typescript
import { render } from '@lit-labs/ssr';
import { Readable } from 'stream';

// Server HTTP (Node)
http.createServer(async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });

  const result = render(html`<my-page></my-page>`);
  for await (const chunk of result) {
    res.write(chunk);
  }
  res.end();
});
```

### Output com Declarative Shadow DOM

```html
<!-- Lit SSR gera HTML assim: -->
<my-counter>
  <template shadowroot="open">
    <style>
      :host { display: inline-block; }
      /* ... estilos encapsulados ... */
    </style>
    <span class="value">5</span>
    <button>Increment</button>
  </template>
</my-counter>
```

---

## Authoring para SSR

### Regras para Componentes SSR-friendly

1. **Renderização pura** — `render()` deve ser função apenas de propriedades
2. **Sem dependências de browser** — evite `window`, `document`, `localStorage`
3. **`connectedCallback` assíncrono** — adie setup de browser APIs
4. **Estilos em `static styles`** — funcionam automaticamente no SSR

```typescript
@customElement('ssr-safe-component')
class SsrSafeComponent extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; }
    .title { font-size: 24px; }
  `;

  @property() title = '';
  @property() items: string[] = [];

  // ✅ Puro — só depende de props
  render() {
    return html`
      <h2 class="title">${this.title}</h2>
      <ul>${this.items.map(i => html`<li>${i}</li>`)}</ul>
    `;
  }

  // ❌ Não usar em render():
  // window.innerWidth, localStorage, document.querySelector
}
```

### SSR e Event Listeners

```typescript
@customElement('ssr-button')
class SsrButton extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    // Adie listeners que dependem de DOM/browser
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onResize);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._onResize);
    }
  }
}
```

### SSR e Context

Context API `@lit/context` funciona no SSR porque é baseada em eventos (que são disparados e capturados durante a renderização SSR).

```typescript
// SSR: O provider emite context-request events durante render()
// O consumer recebe o valor durante a renderização SSR
```

---

## Hydration

Hydration é o processo de tornar o HTML estático interativo.

### Client Hydration

```typescript
// client.js (carregado no browser)
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import './my-counter.js';

// Lit detecta automaticamente o DOM pré-renderizado e hidrata
// sem recriar o DOM, apenas anexando event listeners
```

### Considerações de Hydration

1. **DOM existente não é recriado** — Lit attaches ao shadow root existente
2. **`firstUpdated`** é chamado após hydration
3. **Event listeners** são adicionados, não executam `render()` desnecessário
4. **Assuma que propriedades podem vir do servidor**

---

## SSR em Node.js (Exemplo Completo)

```typescript
// server.ts
import { render } from '@lit-labs/ssr';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import express from 'express';

// Import components (precisa ser registrado)
import './components/my-page.js';

const app = express();

app.get('/', async (req, res) => {
  const pageTitle = 'Hello SSR';
  const items = ['A', 'B', 'C'];

  const template = html`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${pageTitle}</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <my-page title=${pageTitle}></my-page>
      <my-list .items=${items}></my-list>
      <script type="module" src="/client.js"></script>
    </body>
    </html>
  `;

  for await (const chunk of render(template)) {
    res.write(chunk);
  }
  res.end();
});
```

---

## Integrações com Frameworks

| Framework/SSG | Pacote |
|--------------|--------|
| Eleventy | `@lit-labs/eleventy-plugin-lit` |
| Astro | Integração nativa |
| Next.js | `@lit-labs/nextjs` (pages router) |
| Nuxt 3 | `nuxt-ssr-lit` |
| Rocket | Suporte nativo |
| Koa | Manual (exemplo no repo) |

### Astro (exemplo)

```astro
---
// page.astro
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
---

<html>
  <body>
    <my-counter value="5" client:visible />
    <script type="module" src="/client.js"></script>
  </body>
</html>
```

---

## Limitações Atuais (Lit Labs)

- **`@query` decorator** — pode não funcionar corretamente no SSR pois o DOM não está presente
- **Animations** — `@lit-labs/motion` não suporta SSR
- **`updateComplete`** — pode não resolver durante SSR
- **`connectedCallback` com dependências de browser** — precisa de guard checks

### Checklist SSR

- [ ] `static styles` definidos (não `style` dinâmico)
- [ ] `render()` puro, sem side effects
- [ ] `connectedCallback` protegido com `typeof window !== 'undefined'`
- [ ] Componentes importados e registrados no servidor
- [ ] Client-side hydration configurado
- [ ] CSS Custom Properties para theming (funciona em SSR)
- [ ] Testar com e sem JavaScript
