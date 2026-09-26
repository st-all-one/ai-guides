# 16 — Styling

> Tailwind v4, design tokens, dark mode, conditional classes, responsive, CSS Modules, animations, typography, view transitions — tudo que você precisa para estilizar Fresh.

---

## 1. Tailwind CSS v4 Setup

Fresh 2 + Vite usa o plugin oficial `@tailwindcss/vite`. Já configurado no scaffold do `deno run -Ar jsr:@fresh/init`.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [fresh(), tailwindcss()],
});
```

```css
/* assets/styles.css */
@import "tailwindcss";
```

```ts
// client.ts
import "@/assets/styles.css";
```

**Plugin order:** `fresh()` → `tailwindcss()` → rest. O Tailwind deve vir DEPOIS do Fresh.

---

## 2. Design Tokens — `@theme`

Tailwind v4 usa o bloco `@theme` para definir design tokens customizados. Substitui `tailwind.config.ts` do v3.

```css
/* assets/styles.css */
@import "tailwindcss";

@theme {
  /* Colors */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;
  --color-brand-950: #172554;

  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui;
  --font-mono: "JetBrains Mono", ui-monospace;
  --font-display: "Cal Sans", ui-sans-serif;

  /* Spacing */
  --spacing-section: 5rem;
  --spacing-gutter: 1.5rem;

  /* Border radius */
  --radius-card: 0.75rem;
  --radius-button: 0.5rem;

  /* Shadows */
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-elevated: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}
```

**Uso:**

```tsx
<button class="bg-brand-500 hover:bg-brand-600 text-white rounded-button">
  CTA
</button>
<section class="py-section px-gutter">
  <h2 class="font-display text-2xl">Title</h2>
</section>
<div class="bg-white rounded-card shadow-card p-6">
  <p>Card content</p>
</div>
```

**Tokens built-in do Tailwind mantidos:** `text-sm`, `p-4`, `bg-white`, `max-w-7xl` etc. continuam funcionando. Seus tokens customizados são adicionados, não substituem.

---

## 3. Conditional Classes

### 3.1 Ternary simples

```tsx
function NavLink({ href, isActive }: { href: string; isActive: boolean }) {
  return (
    <a
      href={href}
      class={isActive ? "text-brand-600 font-semibold" : "text-gray-600"}
    >
      Link
    </a>
  );
}
```

### 3.2 Template literal concat

```tsx
function Button({ variant }: { variant: "primary" | "secondary" }) {
  const base = "px-4 py-2 rounded font-medium transition-colors";

  const variants: Record<string, string> = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  };

  return (
    <button class={`${base} ${variants[variant]}`}>
      Click
    </button>
  );
}
```

### 3.3 Utility function `cn()` — clsx + twMerge

Para combinar classes condicionalmente evitando conflitos Tailwind:

```ts
// utils/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```sh
deno add npm:clsx npm:tailwind-merge
```

```tsx
import { cn } from "@/utils/cn.ts";

function Button({ class: extraClass, variant, size, disabled }: ButtonProps) {
  return (
    <button
      class={cn(
        "px-4 py-2 rounded font-medium transition-colors",
        {
          "bg-brand-500 text-white hover:bg-brand-600": variant === "primary",
          "bg-gray-100 text-gray-800 hover:bg-gray-200": variant === "secondary",
          "text-sm px-3 py-1.5": size === "sm",
          "text-lg px-6 py-3": size === "lg",
          "opacity-50 cursor-not-allowed": disabled,
        },
        extraClass,
      )}
      disabled={disabled}
    />
  );
}
```

### 3.4 Tailwind arbitrary values

```tsx
<div class="w-[calc(100%-2rem)] mt-[3px] bg-[#bada55]">
  Arbitrary values
</div>
```

### 3.5 Tailwind variants + modifiers

```tsx
<a
  href="/"
  class="
    text-gray-600
    hover:text-brand-600
    aria-[current]:text-brand-700
    aria-[current]:font-semibold
    dark:text-gray-300
    dark:hover:text-brand-400
  "
>
  Home
</a>
```

---

## 4. Dark Mode & Theme Switching

### 4.1 daisyUI themes (mais simples)

daisyUI inclui 30+ temas built-in. Alterna via `data-theme` no `<html>`:

```tsx
// routes/_app.tsx
export default define.page(({ Component, state }) => (
  <html lang="en" data-theme={state.theme ?? "light"}>
    <head>...</head>
    <body>
      <Component />
    </body>
  </html>
));
```

```tsx
// islands/ThemeToggle.tsx
import { useSignal, useComputed } from "@preact/signals";
import { IS_BROWSER } from "fresh/runtime";

const themes = ["light", "dark", "cupcake", "dracula", "corporate", "synthwave"];

export default function ThemeToggle() {
  const theme = useSignal(
    IS_BROWSER ? localStorage.getItem("theme") ?? "light" : "light",
  );

  const nextTheme = useComputed(() => {
    const idx = themes.indexOf(theme.value);
    return themes[(idx + 1) % themes.length];
  });

  function toggle() {
    theme.value = nextTheme.value;
    if (IS_BROWSER) localStorage.setItem("theme", nextTheme.value);
  }

  return <button onClick={toggle} class="btn btn-ghost">{nextTheme}</button>;
}
```

daisyUI temas disponíveis: `light`, `dark`, `cupcake`, `bumblebee`, `emerald`, `corporate`, `synthwave`, `retro`, `cyberpunk`, `valentine`, `halloween`, `garden`, `forest`, `aqua`, `lofi`, `pastel`, `fantasy`, `wireframe`, `black`, `luxury`, `dracula`, `cmyk`, `autumn`, `business`, `acid`, `lemonade`, `night`, `coffee`, `winter`, `dim`, `nord`, `sunset`.

### 4.2 Tailwind manual dark mode (sem daisyUI)

```css
/* assets/styles.css */
@import "tailwindcss";
@variant dark (&:where(.dark, .dark *));
```

```tsx
// islands/ThemeToggle.tsx
export default function ThemeToggle() {
  const isDark = useSignal(
    IS_BROWSER ? document.documentElement.classList.contains("dark") : false,
  );

  function toggle() {
    isDark.value = !isDark.value;
    if (IS_BROWSER) {
      document.documentElement.classList.toggle("dark", isDark.value);
      localStorage.setItem("theme", isDark.value ? "dark" : "light");
    }
  }

  return <button onClick={toggle}>{isDark.value ? "🌙" : "☀️"}</button>;
}
```

```tsx
// Componente — dark: prefix funciona automaticamente
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <h1 class="text-2xl font-bold">Content</h1>
</div>
```

### 4.3 prefers-color-scheme (automático)

Tailwind v4 respeita `prefers-color-scheme` nativamente com `@media (prefers-color-scheme: dark)`:

```css
:root {
  --color-bg: #ffffff;
  --color-text: #111827;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #111827;
    --color-text: #f9fafb;
  }
}

body {
  background: var(--color-bg);
  color: var(--color-text);
}
```

### 4.4 Theme via cookie (server-side persist)

```ts
// routes/_middleware.ts
export default define.middleware(async (ctx) => {
  const theme = ctx.req.headers.get("cookie")
    ?.match(/theme=([^;]+)/)?.[1] ?? "light";
  ctx.state.theme = theme;
  return ctx.next();
});
```

Server-side cookie approach dá zero flash (theme correto no primeiro render, sem FOUC).

---

## 5. Responsive Design

### 5.1 Tailwind breakpoints

| Prefix | Width | Dispositivo |
|--------|-------|-------------|
| *(none)* | 0px | Mobile first (base) |
| `sm:` | 640px | Phone landscape |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Wide |

```tsx
<main class="
  px-4
  sm:px-6
  lg:px-8
  max-w-7xl
  mx-auto
">
  <div class="
    grid
    grid-cols-1
    sm:grid-cols-2
    lg:grid-cols-3
    xl:grid-cols-4
    gap-4
  ">
    {items.map((item) => <Card item={item} />)}
  </div>
</main>
```

### 5.2 Container queries (Tailwind v4)

```css
@utility card-grid {
  container-type: inline-size;
}
```

```tsx
<div class="card-grid">
  <div class="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-4">
    {/* Layout adapta ao container, não ao viewport */}
  </div>
</div>
```

### 5.3 CSS custom properties para breakpoints

```tsx
// Responsive via inline style + CSS vars
<div
  class="grid gap-[var(--grid-gap)]"
  style={{
    "--grid-gap": "1rem",
  }}
>
  {/* ... */}
</div>
```

---

## 6. CSS Animations & Transitions

### 6.1 Transition utilities (Tailwind built-in)

```tsx
<button class="
  bg-brand-500
  hover:bg-brand-600
  transition-colors
  duration-200
  ease-in-out
">
  Hover me
</button>

<div class="
  opacity-0 translate-y-4
  group-hover:opacity-100 group-hover:translate-y-0
  transition-all duration-300
">
  Reveal on parent hover
</div>
```

### 6.2 Custom keyframes + `@utility`

```css
/* assets/styles.css */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgb(59 130 246 / 0.4); }
  50% { box-shadow: 0 0 0 8px rgb(59 130 246 / 0); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@utility animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out both;
}

@utility animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

@utility animate-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@utility animate-delay-100 { animation-delay: 100ms; }
@utility animate-delay-200 { animation-delay: 200ms; }
@utility animate-delay-300 { animation-delay: 300ms; }
@utility animate-delay-500 { animation-delay: 500ms; }
```

```tsx
// Stagger animation
{items.map((item, i) => (
  <div
    key={item.id}
    class={`animate-fade-in-up animate-delay-${i * 100}`}
  >
    {item.content}
  </div>
))}

// Skeleton loader
<div class="animate-shimmer rounded-lg h-4 w-3/4" />
```

### 6.3 Motion-safe / motion-reduce

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Tailwind built-in: `motion-safe:` e `motion-reduce:` prefixes.

```tsx
<div class="motion-safe:animate-fade-in-up motion-reduce:opacity-100">
  Content
</div>
```

---

## 7. Typography

### 7.1 @tailwindcss/typography — Conteúdo rico

```sh
deno add -D npm:@tailwindcss/typography
```

```css
/* assets/styles.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

```tsx
// Blog post ou markdown renderizado
<article class="prose prose-lg prose-brand max-w-none
  prose-headings:font-display
  prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline
  prose-img:rounded-xl prose-img:shadow-card
  prose-code:before:content-none prose-code:after:content-none
  prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
  dark:prose-invert"
>
  <div dangerouslySetInnerHTML={{ __html: renderedMarkdown }} />
</article>
```

**Modifiers comuns:**

| Class | Efeito |
|-------|--------|
| `prose` | Estilo base (16px font) |
| `prose-lg` | 18px font |
| `prose-xl` | 20px font |
| `prose-brand` | Links coloridos com cor brand |
| `dark:prose-invert` | Modo escuro |
| `prose-headings:font-display` | Fonte display nos headings |
| `prose-img:rounded-xl` | Bordas arredondadas em imagens |

### 7.2 Font loading

```css
/* assets/styles.css */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui;
}
```

Fontes locais (melhor para performance):

```css
@font-face {
  font-family: "Cal Sans";
  src: url("/fonts/CalSans-SemiBold.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
```

---

## 8. CSS Custom Properties — Runtime Theming

Para temas calculados dinamicamente no servidor (ex: brand colors por tenant):

```ts
// routes/_middleware.ts
export default define.middleware(async (ctx) => {
  const tenant = ctx.url.hostname.split(".")[0];
  const branding = await getTenantBranding(tenant);
  ctx.state.branding = branding;
  return ctx.next();
});
```

```tsx
// routes/_app.tsx
export default define.page(({ Component, state }) => (
  <html lang="en">
    <head>...</head>
    <body
      style={{
        "--color-brand": state.branding?.primary ?? "#3b82f6",
        "--color-brand-hover": state.branding?.primaryHover ?? "#2563eb",
        "--color-accent": state.branding?.accent ?? "#f59e0b",
      }}
    >
      <Component />
    </body>
  </html>
));
```

```css
/* assets/styles.css */
@theme {
  --color-brand: var(--color-brand, #3b82f6);
  --color-brand-hover: var(--color-brand-hover, #2563eb);
  --color-accent: var(--color-accent, #f59e0b);
}
```

Tailwind v4 `@theme` com fallback via var() — funciona transparentemente.

---

## 9. CSS Modules

Fresh + Vite suportam CSS Modules nativamente:

```css
/* components/Card.module.css */
.card {
  @apply bg-white rounded-card shadow-card p-6;
}

.card:hover {
  @apply shadow-elevated;
  transform: translateY(-2px);
  transition: all 0.2s ease;
}

.title {
  @apply font-display text-lg font-semibold mb-2;
}

.body {
  @apply text-gray-600 text-sm;
}
```

```tsx
// components/Card.tsx
import styles from "./Card.module.css";

export function Card({ title, children }: CardProps) {
  return (
    <div class={styles.card}>
      <h3 class={styles.title}>{title}</h3>
      <p class={styles.body}>{children}</p>
    </div>
  );
}
```

**Quando usar CSS Modules vs Tailwind:**
- **Tailwind:** 95% dos casos — utility-first é mais rápido e mantém consistência
- **CSS Modules:** Componentes complexos com pseudo-selectors (`:hover`, `::before`), animações intrincadas, ou quando precisa de `@apply` para extrair padrões repetitivos

---

## 10. View Transitions Styling

Requere `f-view-transition` no `<body>` (configurado em 08-partials-navigation.md).

```css
/* assets/styles.css */
::view-transition-old(root) {
  animation: fadeOut 0.2s ease-out;
}

::view-transition-new(root) {
  animation: slideUp 0.3s ease-out;
}

@keyframes fadeOut {
  to { opacity: 0; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**View transition com nome customizado** (para transições específicas):

```tsx
// routes/blog/[slug].tsx
export default define.page(({ data }) => (
  <div>
    <img
      src={data.post.image}
      style={{ viewTransitionName: "post-hero" }}
      class="w-full h-64 object-cover rounded-xl"
    />
    <h1>{data.post.title}</h1>
  </div>
));
```

```css
::view-transition-old(post-hero) { animation: none; }
::view-transition-new(post-hero) {
  animation: fadeIn 0.4s ease-out;
}
```

---

## 11. Style Organization

### 11.1 Estrutura de arquivos

```
assets/
├── styles.css              # Entry point — @import + @theme + @utility
├── base/
│   ├── reset.css           # CSS reset (se não usar preflight do Tailwind)
│   └── typography.css      # @font-face, font variables
├── components/
│   ├── button.css           # Estilos component-specific (CSS Modules ou @layer)
│   └── card.css
├── utilities/
│   ├── animations.css       # @keyframes + @utility animate-*
│   └── scrollbar.css        # Custom scrollbar
└── vendors/
    └── third-party.css      # Overrides para libs externas
```

### 11.2 Tailwind `@layer` — Ordem de precedência

```css
/* assets/styles.css */
@import "tailwindcss";

/* 1. Base layer — reset, typography defaults */
@layer base {
  html {
    scroll-behavior: smooth;
    scroll-padding-top: 5rem;
  }

  body {
    @apply antialiased text-gray-900 bg-white;
  }

  h1, h2, h3, h4 {
    @apply font-display;
  }
}

/* 2. Components layer — padrões reutilizáveis */
@layer components {
  .btn {
    @apply px-4 py-2 rounded font-medium transition-colors inline-flex items-center gap-2;
  }

  .btn-primary {
    @apply bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700;
  }

  .btn-secondary {
    @apply bg-gray-100 text-gray-800 hover:bg-gray-200;
  }

  .card {
    @apply bg-white rounded-card shadow-card p-6;
  }
}

/* 3. Utilities layer — utility classes (Tailwind gera automaticamente) */

/* 4. Custom utilities */
@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
```

### 11.3 Route-specific CSS

CSS carregado sob demanda para rotas específicas. Zero overhead para páginas que não usam.

```ts
// routes/dashboard.ts
import type { RouteConfig } from "fresh";

export const config: RouteConfig = {
  css: ["./assets/dashboard.css"],
};

// ou:
export const css = ["./assets/dashboard.css"];
```

CSS é injetado apenas quando a rota `/dashboard` renderiza.

---

## 12. Third-Party CSS Libraries

### 12.1 daisyUI

```sh
deno i -D npm:daisyui@latest
```

```css
@import "tailwindcss";
@plugin "daisyui";
```

Componentes: `btn`, `card`, `modal`, `navbar`, `dropdown`, `table`, `badge`, `alert`, `tabs`, `accordion`, etc.

### 12.2 Preline UI / Flowbite

CSS components puros (sem JS) funcionam diretamente. Componentes com JS precisam ser inicializados dentro de islands:

```tsx
// islands/Dropdown.tsx
import { useEffect, useRef } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";

export default function Dropdown() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (IS_BROWSER) {
      import("preline").then(({ HSDropdown }) => {
        HSDropdown.autoInit();
      });
    }
  }, []);

  return (
    <div ref={ref} data-hs-dropdown>
      <button data-hs-dropdown-toggle>Menu</button>
      <div data-hs-dropdown-menu>
        <a href="#">Item 1</a>
        <a href="#">Item 2</a>
      </div>
    </div>
  );
}
```

### 12.3 Shoelace / Web Components

```tsx
import { useEffect } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";

export default function ShoelaceButton() {
  useEffect(() => {
    if (IS_BROWSER) {
      import("@shoelace-style/shoelace/dist/components/button/button.js");
    }
  }, []);

  return <sl-button variant="primary">Click</sl-button>;
}
```

---

## 13. Fresh-Specific Class Behavior

### 13.1 JSX uses `class`, not `className`

```tsx
// ✅ Preact/Fresh — class (não className)
<div class="flex gap-4 p-6">
  <button class="btn btn-primary">Save</button>
</div>

// ❌ React-style className (não funciona)
<div className="flex gap-4 p-6">
```

### 13.2 Text content is always escaped

```tsx
// SAFE — user input é auto-escapeado
<div>{userInput}</div>            // <script> vira &lt;script&gt;

// RAW — apenas com dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
```

### 13.3 Inline styles

```tsx
<div
  style={{
    backgroundImage: `url(${asset("/hero.jpg")})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
/>
```

CSS custom properties em inline styles:

```tsx
<div
  style={{
    "--avatar-size": "3rem",
    "--badge-color": "#10b981",
  }}
  class="w-[var(--avatar-size)] h-[var(--avatar-size)]"
/>
```

---

## 14. Performance

### 14.1 Tailwind v4 purge é automático

Tailwind v4 analisa seu código e gera apenas as classes usadas. Zero config. CSS final é mínimo.

### 14.2 Critical CSS (above-the-fold)

Tailwind inline critical via `<style>` no `<head>` para first paint instantâneo. Não é automático — use estratégia manual:

```tsx
// routes/_app.tsx
export default define.page(({ Component }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {/* Critical CSS — carregado sincronamente */}
      <link rel="stylesheet" href={asset("/styles.css")} />
    </head>
    <body>
      <Component />
    </body>
  </html>
));
```

### 14.3 Lazy-load non-critical CSS

```tsx
useEffect(() => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/assets/charts.css";
  document.head.appendChild(link);
}, []);
```

### 14.4 CSS cache via `asset()`

```tsx
<link rel="stylesheet" href={asset("/styles.css")} />
// → <link rel="stylesheet" href="/styles.css?__frsh_c=abc123" />
// 1-year cache lifetime
```

### 14.5 Evite @apply excessivo

`@apply` gera CSS maior que utility classes inline. Prefira:

```tsx
// ✅ Utility classes — Tailwind deduplica, purge automático
<button class="px-4 py-2 rounded bg-brand-500 text-white hover:bg-brand-600">
  Save
</button>

// ⚠️ @apply — útil para extrair padrões repetidos em 5+ lugares
// components/Button.tsx
<button class="btn btn-primary">Save</button>
```

---

## 15. Cheat sheet

```txt
Tarefa                                 → Solução
───────────────────────────────────────────────────────────────
Inicializar Tailwind                     → deno run -Ar jsr:@fresh/init --tailwind
Adicionar Tailwind a projeto existente   → deno add @tailwindcss/vite + vite.config.ts + @import
Cores customizadas                       → @theme { --color-brand-*: ... }
Fonte customizada                        → @theme { --font-sans: ... } + @font-face
Tema escuro (daisyUI)                    → data-theme="dark" no <html>
Tema escuro (Tailwind manual)            → @variant dark + .dark class
Alternar tema                            → island com localStorage + data-theme
Tema por tenant                          → CSS var(--color-brand) no <body> inline style
Classes condicionais simples             → class={active ? "ativo" : "inativo"}
Classes condicionais complexas           → cn() com clsx + twMerge
Animação customizada                     → @keyframes + @utility animate-*
Stagger animation                        → animate-delay-{n} utility
Conteúdo markdown/blog                   → @tailwindcss/typography + prose
CSS específico de rota                   → export const css = ["./x.css"]
CSS Modules                              → import styles from "./X.module.css"
Componentes de terceiros                 → init JS em useEffect dentro de island
Reset + defaults globais                 → @layer base { ... }
Componentes reutilizáveis                → @layer components { .btn { ... } }
Estilizar link ativo                     → aria-[current]:text-brand-600
Modo escuro                              → dark:bg-gray-900 dark:text-gray-100
Responsivo                               → sm: md: lg: xl: 2xl: prefixes
Container query                          → @md: @lg: @xl: prefixes
Reduzir animação (accessibility)         → motion-reduce: ou @media prefers-reduced-motion
View transitions                         → ::view-transition-old(new) CSS
Cache bust em CSS                        → asset("/styles.css")
Critical CSS                             → <link> no <head> com asset()
```

---

## Links relacionados

| Tópico | Arquivo |
|--------|---------|
| Setup do projeto + Vite + Tailwind | [01-project-setup.md](./01-project-setup.md) |
| Active links + aria-current | [02-routing.md](./02-routing.md#15-active-links--aria-current) |
| `<Head>` metadata dinâmico | [05-layouts-app-wrapper.md](./05-layouts-app-wrapper.md#515-head-component--dynamic-metadata) |
| daisyUI setup detalhado | [07-security.md](./07-security.md#15-daisyui-setup) |
| Markdown + GFM | [07-security.md](./07-security.md#14-markdown-rendering--denogfm) |
| Partials + View Transitions | [08-partials-navigation.md](./08-partials-navigation.md) |
| IS_BROWSER + islands | [06-islands-signals.md](./06-islands-signals.md) |
| Image optimization + asset() | [11-performance.md](./11-performance.md) |
| CSP nonce for inline styles | [07-security.md](./07-security.md#3-csp-with-nonce--strict-mode-no-unsafe-inline) |
