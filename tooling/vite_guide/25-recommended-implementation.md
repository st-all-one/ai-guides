# Implementação Recomendada — Projeto TypeScript + CSS Puro

## 1. Scaffold do Projeto

```bash
npm create vite@latest my-app -- --template vanilla-ts
cd my-app
npm install
```

Remove o boilerplate Vue/React, mantendo apenas TypeScript + CSS puro.

## 2. Estrutura de Diretórios

```
my-app/
├── index.html                    # Entry point único
├── vite.config.ts                # Config Vite otimizada
├── tsconfig.json                 # TypeScript strict
├── package.json
├── public/                       # Assets estáticos (copiados as-is)
│   ├── favicon.ico
│   ├── robots.txt
│   └── manifest.json
├── src/
│   ├── main.ts                   # Entry point JS
│   ├── app.ts                    # Bootstrap da aplicação
│   ├── router.ts                 # Roteamento (se aplicável)
│   ├── types/                    # Definições de tipo compartilhadas
│   │   ├── index.ts
│   │   └── api.ts
│   ├── utils/                    # Funções utilitárias puras
│   │   ├── dom.ts
│   │   ├── format.ts
│   │   └── math.ts
│   ├── components/               # Componentes vanilla
│   │   ├── Button/
│   │   │   ├── Button.ts
│   │   │   └── Button.module.css
│   │   └── Modal/
│   │       ├── Modal.ts
│   │       └── Modal.module.css
│   ├── pages/                    # Páginas (lazy load)
│   │   ├── home/
│   │   │   ├── Home.ts
│   │   │   └── Home.module.css
│   │   └── about/
│   │       ├── About.ts
│   │       └── About.module.css
│   ├── styles/                   # Estilos globais
│   │   ├── global.css
│   │   ├── variables.css
│   │   └── reset.css
│   └── assets/                   # Assets processados pelo Vite
│       ├── fonts/
│       └── images/
├── .env                          # Variáveis de ambiente
├── .env.production
├── .gitignore
└── dist/                         # Output do build
```

## 3. Configuração Otimizada — `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  appType: 'spa',
  base: '/',

  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.json'],
  },

  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[hash:base64:8]',
      scopeBehaviour: 'local',
    },
    transformer: 'lightningcss',
    lightningcss: {
      targets: {
        chrome: 111,
        firefox: 114,
        safari: 16.4,
        ios: 16.4,
        edge: 111,
      },
      drafts: { nesting: true },
      unusedSymbols: [],
    },
    devSourcemap: false,
  },

  build: {
    target: 'baseline-widely-available',
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    minify: 'oxc',
    sourcemap: false,
    reportCompressedSize: false,
    emptyOutDir: true,
    copyPublicDir: true,
    chunkSizeWarningLimit: 300,
    modulePreload: { polyfill: true },

    assetsInlineLimit: (filePath, content) => {
      if (filePath.endsWith('.svg')) return content.length < 10 * 1024
      if (filePath.endsWith('.woff2')) return content.length < 30 * 1024
      if (filePath.match(/\.(png|jpg|webp)$/)) return content.length < 4096
      return undefined
    },

    rolldownOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('date-fns') || id.includes('lodash-es')) return 'vendor-utils'
            return 'vendor'
          }
          if (id.includes('/src/pages/')) {
            const match = id.match(/\/src\/pages\/(.+?)\//)
            if (match) return `page-${match[1]}`
          }
          if (id.includes('/src/utils/')) {
            return 'shared-utils'
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    open: true,
    warmup: {
      clientFiles: [
        './src/main.ts',
        './src/app.ts',
        './src/styles/global.css',
      ],
    },
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
  },

  optimizeDeps: {
    holdUntilCrawlEnd: false,
  },
})
```

### Por que esta config?

| Decisão | Motivo |
|---------|--------|
| `css.transformer: 'lightningcss'` | 10-50× mais rápido que PostCSS, suporta nesting nativo, CSS Modules, minificação |
| `minify: 'oxc'` | 30-90× mais rápido que Terser, suficiente para TS + CSS puro |
| `cssCodeSplit: true` | CSS por chunk assíncrono, sem FOUC |
| `reportCompressedSize: false` | Acelera build em ~30% |
| `chunkSizeWarningLimit: 300` | Mais conservador que o default 500kB |
| `manualChunks` agrupando utils | Evita duplicação em shared components |
| `warmup.clientFiles` | Pré-transforma entrada crítica no cold start |
| `resolve.extensions` mínimo | Menos filesystem checks (6 → 3) |
| `target: 'baseline-widely-available'` | Chrome 111+, Safari 16.4+, sem polyfills desnecessários |

## 4. TypeScript Config — `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "useDefineForClassFields": true,
    "allowImportingTsExtensions": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

### Flags Críticas para Bundle Pequeno

- **`verbatimModuleSyntax: true`** — Força `import type`/`export type`, removendo tipos do bundle
- **`noUnusedLocals` + `noUnusedParameters`** — Erro em código morto antes do tree-shaking
- **`isolatedModules: true`** — Alinhado com o Vite (cada arquivo é transformado isoladamente)

## 5. Otimização de Código TypeScript

### 5.1 Sempre Use `import type`

```ts
// ❌ Ruim: 'SomeType' vai para o bundle como export
import { SomeType, helper } from './utils'

// ✅ Bom: tipo é 100% removido no bundle
import type { SomeType } from './utils'
import { helper } from './utils'

// ✅ Melhor: syntax única (TS 5.0+)
import { type SomeType, helper } from './utils'
```

### 5.2 `export type` para Re-exports

```ts
// ❌ Re-export misturado — arrasta tudo
export { Foo, type Bar } from './types'

// ✅ Separe type exports
export { Foo } from './types'
export type { Bar } from './types'
```

### 5.3 Prefira Funções Puras a Classes

```ts
// ❌ Classe — maior bundle, `this` context, não tree-shakeável parcialmente
class Formatter {
  static date(d: Date) { /* ... */ }
  static currency(n: number) { /* ... */ }
}

// ✅ Funções puras — tree-shakeáveis individualmente, menores
export function formatDate(d: Date) { /* ... */ }
export function formatCurrency(n: number) { /* ... */ }
```

### 5.4 Evite Barrel Files

```ts
// ❌ src/utils/index.ts — arrasta módulos não usados
export { formatDate } from './date'
export { formatCurrency } from './currency'
export { capitalize } from './string'
export { debounce } from './performance'
// → import { formatDate } from '@/utils' puxa TUDO

// ✅ Importe direto — tree-shaking funciona perfeitamente
import { formatDate } from '@/utils/date'
```

### 5.5 Dynamic Imports com Mapa Explícito

```ts
// ❌ Vite não consegue analisar em build time
const page = await import(`./pages/${route}.ts`)

// ✅ Mapa explícito — code splitting funciona
const pages: Record<string, () => Promise<unknown>> = {
  home: () => import('./pages/home/Home.ts'),
  about: () => import('./pages/about/About.ts'),
  contact: () => import('./pages/contact/Contact.ts'),
}

const page = await pages[route]?.()
```

### 5.6 Evite Bibliotecas Grandes para Pouco Uso

```ts
// ❌ date-fns inteiro importado
import { format, parse, differenceInDays } from 'date-fns'

// ✅ Só o necessário (date-fns é tree-shakeável)
// Mas: ainda melhor é implementar funções simples manualmente

// ✅ Função própria — 5 linhas vs 15kB+ de biblioteca
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR')
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
```

### 5.7 Guardas `import.meta.hot` para Tree-Shaking

```ts
// Bloco inteiro removido em produção
if (import.meta.hot) {
  import.meta.hot.accept()
  console.log('HMR enabled')
}
```

### 5.8 Lazy Load de Módulos Pesados

```ts
// ❌ Chart.js carregado na entrada
import { Chart } from 'chart.js'

// ✅ Carregado sob demanda quando usuário interage
async function showChart() {
  const { Chart } = await import('chart.js')
  new Chart(canvas, { /* ... */ })
}

button.addEventListener('click', showChart)
```

### 5.9 Prefira `Array`/`Map`/`Set` Nativos a Polyfills

```ts
// ❌ Lodash — bundle enorme para funções simples
import { debounce, throttle, groupBy } from 'lodash-es'

// ✅ Nativo
const debounced = (fn: Function, ms: number) => {
  let timer: ReturnType<typeof setTimeout>
  return (...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

const grouped = <T, K extends keyof T>(arr: T[], key: K): Map<T[K], T[]> => {
  const map = new Map<T[K], T[]>()
  for (const item of arr) {
    const k = item[key]
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return map
}

// ✅ includes() nativo em vez de Lodash
[1, 2, 3].includes(2)  // em vez de _.includes([1,2,3], 2)
```

### 5.10 Use `satisfies` para Type Safety sem Custo

```ts
// ✅ Zero runtime cost, 100% type-safe
const config = {
  api: 'https://api.example.com',
  timeout: 5000,
} satisfies Record<string, string | number>
```

## 6. Estratégia CSS Otimizada

### 6.1 Por que Lightning CSS + CSS Modules

```ts
// vite.config.ts (trecho relevante)
css: {
  modules: {
    localsConvention: 'camelCaseOnly',
    generateScopedName: '[hash:base64:8]',
  },
  transformer: 'lightningcss',
  lightningcss: {
    targets: { chrome: 111, firefox: 114, safari: 16.4, ios: 16.4 },
    drafts: { nesting: true },
    unusedSymbols: [],
  },
}
```

| Abordagem | Bundle | Build Speed | Features |
|-----------|--------|-------------|----------|
| PostCSS + cssnano | 100% | 1× (Lento) | Plugins ilimitados |
| Lightning CSS | 95-98% do PostCSS | 10-50× mais rápido | Nesting, Modules, Minificação nativos |
| SCSS + PostCSS | 100% | 3-5× mais lento | Variáveis, mixins, nesting |

**Conclusão**: Para TypeScript + CSS puro, Lightning CSS é a escolha ideal. SCSS é desnecessário se você usa nesting nativo e `lightningcss`.

### 6.2 Padrão de CSS Modules

```css
/* src/components/Button/Button.module.css */
.wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.primary {
  background: var(--color-primary);
  color: white;

  &:hover {
    filter: brightness(1.1);
  }
}

.large {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}
```

```ts
// src/components/Button/Button.ts
import styles from './Button.module.css'

export interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'small' | 'large'
  label: string
  onClick?: () => void
}

export function createButton({ variant = 'primary', size = 'small', label, onClick }: ButtonProps): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = [
    styles.wrapper,
    styles[variant],
    styles[size],
  ].join(' ')
  btn.textContent = label
  if (onClick) btn.addEventListener('click', onClick)
  return btn
}
```

### 6.3 CSS Global Organizado

```css
/* src/styles/variables.css */
:root {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-secondary: #64748b;
  --color-bg: #ffffff;
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --transition: 150ms ease;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-text: #f1f5f9;
    --color-text-muted: #94a3b8;
  }
}
```

```css
/* src/styles/global.css */
@import './reset.css';
@import './variables.css';

body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### 6.4 Evite SCSS/Less

Para TypeScript + CSS puro, SCSS adiciona complexidade sem benefício real:

```css
/* ✅ CSS nativo com Lightning CSS — suporta nesting, custom media, etc */
.card {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);

  & .title {
    font-size: 1.25rem;
    font-weight: 600;
  }

  & .description {
    color: var(--color-text-muted);
  }
}

/* ❌ SCSS desnecessário — mesma coisa, mais lento */
.card {
  padding: spacing(md);
  border-radius: radius(md);

  .title {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .description {
    color: text-muted;
  }
}
```

### 6.5 Font-face Otimizado

```css
/* src/styles/fonts.css */
@font-face {
  font-family: 'Inter';
  src: url('../assets/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
    U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Inter';
  src: url('../assets/fonts/Inter-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
    U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}
```

## 7. Pipeline de Build — O Que Acontece Passo a Passo

```
npm run build
    │
    ▼
1. Oxc transpila TS → JS (paralelo, milissegundos)
    │
    ▼
2. Rolldown constrói o grafo de módulos
    │   ├── Tree-shaking (remove código morto)
    │   ├── Code splitting (dynamic imports → chunks)
    │   └── manualChunks (vendor, page-*, shared-utils)
    │
    ▼
3. Lightning CSS processa CSS
    │   ├── Minificação
    │   ├── Nesting nativo
    │   ├── CSS Modules scoping
    │   └── Vendor prefixing (se necessário)
    │
    ▼
4. Oxc Minifier minifica JS
    │
    ▼
5. Rolldown gera output:
    │   ├── assets/index.abc123.js      (entry)
    │   ├── assets/vendor.def456.js     (node_modules)
    │   ├── assets/shared-utils.789.js  (utils compartilhados)
    │   ├── assets/page-home.012.js     (lazy page)
    │   ├── assets/page-about.345.js    (lazy page)
    │   ├── assets/index.abc123.css     (CSS principal)
    │   └── index.html                  (com hashes)
```

### Métricas Esperadas

| Projeto | Build Time | Bundle JS | Bundle CSS | Chunks |
|---------|-----------|-----------|------------|--------|
| Landing page (~10kB TS) | < 1s | 15-25kB | 3-5kB | 2-3 |
| SPA média (~50kB TS) | < 3s | 80-150kB | 10-20kB | 5-10 |
| SPA grande (~200kB TS) | < 10s | 200-400kB | 30-80kB | 10-20 |

## 8. Simulando o Build — Teste Local

```bash
# Build produção
npm run build

# Preview local do build
npm run preview
```

Compare os resultados:

```bash
# Ver tamanho dos chunks
npx vite build 2>&1 | grep -E "assets/"

# Análise detalhada (use vite-plugin-inspect)
npm i -D vite-plugin-inspect
# Adicione inspection() ao vite.config.ts
# Acesse /__inspect/ durante dev
```

## 9. Deploy em Produção

### 9.1 Nginx — Configuração Ideal

```nginx
server {
    listen 80;
    server_name exemplo.com;
    root /var/www/my-app/dist;
    index index.html;

    # Assets com hash → cache imutável de 1 ano
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
        access_log off;
        add_header X-Content-Type-Options "nosniff";
    }

    # Páginas → sempre fresco
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Brotli compression
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/javascript image/svg+xml;

    # Gzip fallback
    gzip on;
    gzip_types text/plain text/css application/javascript image/svg+xml;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
}
```

### 9.2 Headers de Segurança

```nginx
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self' data:;
    connect-src 'self' https://api.exemplo.com;
    frame-ancestors 'none';
    base-uri 'self';
" always;

add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 9.3 Rolling Update (Sem Downtime)

```bash
# 1. Build
npm run build

# 2. Upload com versão
rsync -avz dist/ server:/var/www/releases/v1.2.3/

# 3. Ativar (symlink swap)
ln -sfn /var/www/releases/v1.2.3 /var/www/my-app

# 4. Manter releases antigos por 7 dias (para usuários com chunks antigos)
```

### 9.4 Error Handling para Version Skew

```ts
// src/main.ts
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  // Tentar recarregar uma vez
  if (!sessionStorage.getItem('reloaded')) {
    sessionStorage.setItem('reloaded', 'true')
    window.location.reload()
  } else {
    // Mostrar fallback amigável
    document.body.innerHTML = `
      <div style="padding:2rem;text-align:center;">
        <h1>Nova versão disponível</h1>
        <p>Recarregue a página para obter a versão mais recente.</p>
        <button onclick="location.reload()">Recarregar</button>
      </div>
    `
  }
})
```

## 10. Recomendações de Código para Bundle Otimizado

### 10.1 Event Delegation em vez de Listeners Múltiplos

```ts
// ❌ Múltiplos listeners — mais código, mais memória
document.querySelectorAll('.item').forEach(el => {
  el.addEventListener('click', handler)
})

// ✅ Event delegation — um listener só
document.addEventListener('click', (e) => {
  const item = (e.target as HTMLElement).closest('.item')
  if (item) handler(item)
})
```

### 10.2 Template Literals em vez de innerHTML Pesado

```ts
// ✅ Template string — leve, sem parsing de HTML complexo
export function createCard(title: string, body: string): string {
  return `
    <div class="${styles.card}">
      <h2 class="${styles.title}">${escapeHtml(title)}</h2>
      <p class="${styles.body}">${escapeHtml(body)}</p>
    </div>
  `
}

// Utilitário pequeno em vez de biblioteca
function escapeHtml(str: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return str.replace(/[&<>"']/g, c => map[c])
}
```

### 10.3 Gerenciamento de Estado Leve

```ts
// Store minimalista — 15 linhas, sem dependências
type Listener<T> = (state: T) => void

export function createStore<T>(initial: T) {
  let state = { ...initial }
  const listeners = new Set<Listener<T>>()

  return {
    get: () => state,
    set: (partial: Partial<T>) => {
      state = { ...state, ...partial }
      listeners.forEach(l => l(state))
    },
    subscribe: (fn: Listener<T>) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
```

### 10.4 Observers Nativos em vez de Bibliotecas

```ts
// ✅ IntersectionObserver nativo — sem lib
export function observeVisibility(
  el: Element,
  onVisible: () => void,
  options?: IntersectionObserverInit
): () => void {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      onVisible()
      observer.disconnect()
    }
  }, options)
  observer.observe(el)
  return () => observer.disconnect()
}

// ✅ ResizeObserver nativo — sem lib
export function observeResize(
  el: Element,
  onResize: (entry: ResizeObserverEntry) => void
): () => void {
  const observer = new ResizeObserver(([entry]) => onResize(entry))
  observer.observe(el)
  return () => observer.disconnect()
}

// ✅ MutationObserver nativo — sem lib
export function observeMutations(
  el: Node,
  onMutate: () => void,
  options?: MutationObserverInit
): () => void {
  const observer = new MutationObserver(onMutate)
  observer.observe(el, options ?? { childList: true, subtree: true })
  return () => observer.disconnect()
}
```

### 10.5 Lazy Loading de Imagens Nativo

```html
<!-- ✅ Nativo — sem biblioteca, sem JS -->
<img src="thumb.webp" data-src="full.webp" loading="lazy" width="400" height="300">
```

```ts
// ✅ Native lazy loading + fallback para browsers antigos
export function setupLazyImages(): void {
  if ('loading' in HTMLImageElement.prototype) return // Browser suporta

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        img.src = img.dataset.src || img.src
        observer.unobserve(img)
      }
    })
  })

  document.querySelectorAll('img[loading="lazy"]').forEach(img => observer.observe(img))
}
```

### 10.6 CSS Animations em vez de JS

```css
/* ✅ CSS animation — GPU acelerada, sem JS */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-enter {
  animation: fadeIn 200ms ease-out;
}
```

```ts
// ✅ Use CSS classes em vez de JS animation libraries
function showModal(modal: HTMLElement) {
  modal.classList.add(styles['modal-enter'])
  modal.style.display = 'block'
}
```

### 10.7 Data Attributes em vez de Classes para Estado

```ts
// ✅ Data attributes — semanticos, sem depender de CSS para estado
element.dataset.active = 'true'
element.dataset.loading = 'true'

// CSS
[data-active="true"] { opacity: 1; }
[data-loading="true"] { cursor: progress; }
```

## 11. Scripts package.json

```json
{
  "name": "my-app",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit && npx oxlint",
    "analyze": "vite build -- --output.manualChunks {}",
    "clean": "rm -rf dist node_modules/.vite"
  },
  "devDependencies": {
    "vite": "^8.0.0",
    "typescript": "^5.7.0",
    "lightningcss": "^1.29.0"
  }
}
```

Nota: `lightningcss` precisa ser instalado explicitamente se usado como transformer. `oxlint` é opcional para linting.

## 12. Checklist Final de Implementação

### ✅ Configuração
- [ ] `vite.config.ts` com `css.transformer: 'lightningcss'` e Lightning CSS instalado
- [ ] `build.minify: 'oxc'` e `build.cssMinify: 'lightningcss'`
- [ ] `build.reportCompressedSize: false`
- [ ] `resolve.extensions` mínimo (`.mjs`, `.js`, `.mts`, `.ts`, `.json`)
- [ ] `resolve.tsconfigPaths: false` (use `resolve.alias`)

### ✅ TypeScript
- [ ] `verbatimModuleSyntax: true` no tsconfig
- [ ] `import type` em todos os tipos
- [ ] Sem barrel files — imports diretos
- [ ] Dynamic imports com mapa explícito
- [ ] Funções puras em vez de classes estáticas

### ✅ CSS
- [ ] Lightning CSS como transformer
- [ ] CSS Modules com `[hash:base64:8]` scoping
- [ ] Nesting nativo (sem SCSS)
- [ ] Variáveis CSS em `:root` no lugar de SCSS variables
- [ ] `font-display: swap` em todas as fontes
- [ ] Fontes subsetadas (apenas caracteres necessários)

### ✅ Build
- [ ] `manualChunks` configurado (vendor, pages, shared-utils)
- [ ] Server warmup configurado
- [ ] Fontes e SVGs com `assetsInlineLimit` customizado
- [ ] Handler `vite:preloadError` para version skew

### ✅ Deploy
- [ ] Nginx com `immutable` cache para hashed assets
- [ ] Brotli + gzip compression
- [ ] CSP configurado
- [ ] Rolling update strategy (symlink swap)

### ✅ Performance Esperada
- [ ] Cold start < 200ms
- [ ] HMR < 10ms
- [ ] Build < 2s (projeto pequeno) / < 10s (projeto médio)
- [ ] Bundle JS < 150kB (projeto médio sem framework)
- [ ] Bundle CSS < 20kB

## 13. Exemplo Completo — main.ts + app.ts

```ts
// src/main.ts
import './styles/global.css'
import { createApp } from './app.ts'

const root = document.getElementById('app')
if (!root) throw new Error('#app not found')

createApp(root)
```

```ts
// src/app.ts
import { router } from './router.ts'
import { observeVisibility } from './utils/dom.ts'

export function createApp(root: HTMLElement): void {
  const main = document.createElement('main')
  root.appendChild(main)

  const { navigate, currentRoute } = router(main)

  // Setup navigation
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-nav]')
    if (link) {
      e.preventDefault()
      navigate(link.dataset.nav!)
    }
  })

  // Lazy load abaixo da dobra
  observeVisibility(
    document.createElement('div'),
    () => import('./pages/about/About.ts'),
  )

  navigate(currentRoute())
}
```

```ts
// src/router.ts
export function router(outlet: HTMLElement) {
  const routes: Record<string, () => Promise<{ render: (el: HTMLElement) => void }>> = {
    home: () => import('./pages/home/Home.ts'),
    about: () => import('./pages/about/About.ts'),
    contact: () => import('./pages/contact/Contact.ts'),
  }

  async function navigate(path: string) {
    const loader = routes[path]
    if (!loader) return navigate('home')

    outlet.innerHTML = '<p aria-busy="true">Carregando...</p>'

    try {
      const page = await loader()
      outlet.innerHTML = ''
      page.render(outlet)
      history.pushState(null, '', `/${path}`)
    } catch {
      outlet.innerHTML = '<p>Erro ao carregar página. <button data-nav="home">Voltar</button></p>'
    }
  }

  function currentRoute(): string {
    return location.pathname.slice(1) || 'home'
  }

  window.addEventListener('popstate', () => navigate(currentRoute()))
  navigate(currentRoute())

  return { navigate, currentRoute }
}
```

Este padrão produz:
- **Bundle inicial**: apenas `main.ts` + `app.ts` + CSS global + utilities compartilhados
- **Chunks lazy**: uma página por chunk, carregadas sob demanda
- **Zero dependências de framework**: TypeScript puro + Web APIs nativas
- **Bundle JS total < 30kB** para um app de 5 páginas com utils

## 14. Resumo — Regras de Ouro

1. **Menos código é melhor código** — cada linha não escrita é 0 bytes no bundle
2. **Web APIs nativas > bibliotecas** — `IntersectionObserver`, `ResizeObserver`, `fetch`, `Map`, `Set`, `Array` métodos nativos
3. **CSS > JS** — animações, transições, layouts responsivos em CSS, não em JS
4. **Tree-shaking só funciona com imports diretos** — barrel files matam tree-shaking
5. **TypeScript types têm custo zero** — use `import type`, mas só se o TS compiler respeitar (`verbatimModuleSyntax`)
6. **Dynamic imports são a ferramenta mais poderosa** — use para páginas, modais pesados, charts, editors
7. **Lightning CSS + CSS Modules elimina SCSS** — nesting, scoping, minificação tudo nativo
8. **Ossos do ofício**: `vite build --profile`, `/__inspect/`, `vite --debug hmr` — aprenda a diagnosticar antes de otimizar
