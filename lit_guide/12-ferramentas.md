# Ferramentas, Testes e Publicação

---

## 1. Setup de Projeto

### npm

```bash
npm init -y
npm i lit
npm i -D typescript
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

---

## 2. Build Tooling

### Vite

```bash
npm i -D vite
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['lit', 'lit/decorators.js', 'lit/directives/*'],
    }
  }
});
```

### Lit Compiler (para otimização)

```bash
npm i -D @lit-labs/compiler
```

```typescript
// vite.config.ts
import lit from '@lit-labs/compiler/vite.js';

export default {
  plugins: [lit()]
};
```

### Rollup

```typescript
// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import lit from '@lit-labs/compiler/rollup.js';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: { dir: 'dist', format: 'es' },
  plugins: [
    lit(),
    typescript(),
    nodeResolve()
  ],
  external: id => id.startsWith('lit')
};
```

---

## 3. Development Server

### Vite Dev Server

```typescript
// vite.config.js (para dev)
import { defineConfig } from 'vite';

export default defineConfig({
  // Hot reload funciona nativamente com Lit
  // Suporte a import maps opcional
});
```

```bash
npx vite
```

### Web Dev Server (Modern Web)

```bash
npm i -D @web/dev-server
```

```javascript
// web-dev-server.config.mjs
export default {
  open: true,
  watch: true,
  nodeResolve: true,
  appIndex: 'index.html'
};
```

---

## 4. IDE e Linting

### VS Code Extensions

- **lit-plugin** — syntax highlighting, autocomplete, type-checking para templates
- **Custom Elements Language Server** — suporte a `custom-elements.json`
- **ESLint** + `eslint-plugin-lit` — linting de templates

### ESLint

```bash
npm i -D eslint eslint-plugin-lit @typescript-eslint/parser
```

```javascript
// .eslintrc.cjs
module.exports = {
  plugins: ['lit'],
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended'],
  rules: {
    'lit/no-legacy-template-syntax': 'error',
    'lit/no-duplicate-template-bindings': 'error',
    'lit/no-template-map': 'warn',
  }
};
```

---

## 5. Testes

### Web Test Runner (@web/test-runner)

```bash
npm i -D @web/test-runner @web/test-runner-playwright
```

```javascript
// web-test-runner.config.mjs
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  files: 'src/**/*.test.ts',
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
  ],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '5000'
    }
  }
};
```

```bash
# Rodar testes
npx web-test-runner
```

### Escrevendo Testes

```typescript
// my-element.test.ts
import { html, fixture, expect } from '@open-wc/testing';

import './my-element.js';
import type { MyElement } from './my-element.js';

describe('MyElement', () => {
  let element: MyElement;

  beforeEach(async () => {
    element = await fixture<MyElement>(html`
      <my-element name="Test"></my-element>
    `);
  });

  it('renders greeting', () => {
    const paragraph = element.shadowRoot!.querySelector('p');
    expect(paragraph?.textContent).to.equal('Hello, Test!');
  });

  it('updates when name changes', async () => {
    element.name = 'World';
    await element.updateComplete;
    const paragraph = element.shadowRoot!.querySelector('p');
    expect(paragraph?.textContent).to.equal('Hello, World!');
  });

  it('dispatches custom event', () => {
    const spy = sinon.spy();
    element.addEventListener('my-event', spy);
    const button = element.shadowRoot!.querySelector('button');
    button?.click();
    expect(spy).to.have.been.calledOnce;
  });
});
```

### Testando Eventos e Acessibilidade

```typescript
import { a11ySnapshot, fixture, html } from '@open-wc/testing';

it('passes accessibility check', async () => {
  const el = await fixture(html`
    <my-button aria-label="Close">X</my-button>
  `);
  await expect(el).to.be.accessible();
});

it('emits events with composed path', async () => {
  const el = await fixture<MyElement>(html`<my-element></my-element>`);
  const handler = sinon.spy();
  el.addEventListener('my-event', handler);

  const innerButton = el.shadowRoot!.querySelector('button')!;
  innerButton.click();

  expect(handler).to.have.been.calledOnce;
  expect(handler.firstCall.args[0]).to.have.property('composed', true);
});
```

---

## 6. Publicação

### package.json

```json
{
  "name": "@my-scope/my-component",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": [
    "dist/",
    "custom-elements.json"
  ],
  "customElements": "custom-elements.json",
  "scripts": {
    "build": "tsc && lit-analyzer --outFile custom-elements.json",
    "test": "web-test-runner",
    "prepublishOnly": "npm run build"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### Publicar no npm

```bash
npm run build
npm publish
```

### Publicação como Bundle CDN

```typescript
// vite.config.ts (para bundle CDN)
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MyComponent',
      formats: ['es', 'iife'],
      fileName: (format) => `my-component.${format}.js`
    },
    minify: 'esbuild'
  }
});
```

---

## 7. Documentação

### Custom Elements Manifest

```bash
npm i -D @lit-labs/analyzer
npx lit-analyzer "src/**/*.ts" --outFile custom-elements.json
```

```json
// custom-elements.json
{
  "schemaVersion": "1.0.0",
  "tags": [
    {
      "name": "my-element",
      "description": "A Lit web component",
      "attributes": [
        { "name": "name", "type": "string", "description": "The name to greet" }
      ],
      "properties": [
        { "name": "name", "type": "string" },
        { "name": "count", "type": "number" }
      ],
      "events": [
        { "name": "my-event", "description": "Fired when action occurs" }
      ],
      "cssProperties": [
        { "name": "--my-color", "description": "Primary color" }
      ],
      "slots": [
        { "name": "", "description": "Default slot content" }
      ]
    }
  ]
}
```

### Storybook

```bash
npx storybook@latest init --type web_components
```

```typescript
// Button.stories.ts
import { html } from 'lit';

export default {
  title: 'Button',
  component: 'my-button',
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
    disabled: { control: 'boolean' }
  }
};

export const Primary = {
  render: ({ variant, disabled }: any) => html`
    <my-button variant=${variant} ?disabled=${disabled}>
      Click me
    </my-button>
  `,
  args: { variant: 'primary', disabled: false }
};
```

---

## 8. Performance em Produção

### Minificação

```bash
# Vite minifica por padrão (esbuild)
# Ou use Terser para mais agressividade:
npm i -D terser
```

### Import Map para CDN

```html
<script type="importmap">
{
  "imports": {
    "lit": "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js",
    "lit/decorators.js": "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js",
    "lit/directives/class-map.js": "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js",
    "lit/directives/style-map.js": "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js"
  }
}
</script>
```

### Module Preload

```html
<link rel="modulepreload" href="/dist/my-component.js">
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js">
```

---

## Resumo: Pipeline Completo

```
src/*.ts
    │
    ├── Dev: Vite / Web Dev Server (HMR)
    │
    ├── Lint: ESLint + lit-plugin
    │
    ├── Test: Web Test Runner + Playwright
    │
    ├── Build: TypeScript + Vite/Rollup (+ Lit Compiler)
    │
    ├── Analyze: lit-analyzer → custom-elements.json
    │
    ├── Document: Storybook
    │
    └── Publish: npm / CDN
```
