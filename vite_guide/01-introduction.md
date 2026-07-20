# Vite Moderno — Introdução e Arquitetura

## Visão Geral

Vite (francês para "rápido", pronunciado `/viːt/`) é uma ferramenta de build de última geração composta por duas partes principais:

1. **Dev Server** — serve código sobre ESM nativo com HMR
2. **Build Command** — empacota com **Rolldown** (bundler Rust) para produção otimizada

A partir da **Vite 8**, todo o pipeline foi unificado: **Rolldown** (Rust) substituiu Rollup e esbuild, e **Oxc** substituiu esbuild para transpilação e minificação. O resultado é um pipeline único e consistente do desenvolvimento à produção.

## Arquitetura de Dois Estágios

```
                    DEV                               PRODUCTION
    ┌─────────────────────────────┐    ┌─────────────────────────────┐
    │  Native ESM (on-demand)     │    │  Rolldown (Rust bundler)    │
    │                             │    │                             │
    │  • Pre-bundle deps uma vez  │    │  • Tree-shaking             │
    │  • Transforma sob demanda   │    │  • Code splitting           │
    │  • HMR sobre ESM nativo     │    │  • Minificação (Oxc)        │
    │  • Oxc transpiler           │    │  • CSS + Asset otimizados   │
    └─────────────────────────────┘    └─────────────────────────────┘
```

## Stack Tecnológica (Vite 8+)

| Componente    | Tecnologia       | Função                              |
|---------------|------------------|--------------------------------------|
| Bundler       | Rolldown (Rust)  | Empacotamento unificado              |
| Transpilador  | Oxc (Rust)       | TS/JSX → JS, define, alias          |
| Minificador   | Oxc Minifier     | JS minification (30-90× mais rápido) |
| CSS Processor | Lightning CSS    | Minificação e processamento CSS     |
| HMR Transport | WebSocket nativo | Hot Module Replacement              |

## Requisitos

- **Node.js** 20.19+ ou 22.12+
- **package.json** com `"type": "module"` (recomendado)

## Comandos Essenciais

```bash
npm create vite@latest              # Scaffold novo projeto
npx vite                            # Dev server (porta 5173)
npx vite build                      # Build produção
npx vite build --app                # Build multi-environment (experimental)
npx vite preview                    # Preview do build local
```

## index.html como Entry Point

No Vite, `index.html` é o entry point real da aplicação, diferente de ferramentas tradicionais:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- URLs dentro de `index.html` são **automaticamente rebaseadas**
- Múltiplos `.html` funcionam como multi-page apps
- O atributo `vite-ignore` desativa o processamento Vite em elementos específicos

## Estrutura de Projeto Recomendada

```
projeto/
├── index.html                  # Entry point único (ou múltiplos)
├── vite.config.ts              # Configuração Vite
├── tsconfig.json               # TypeScript config
├── public/                     # Assets estáticos (copiados as-is)
│   ├── robots.txt
│   └── favicon.ico
├── src/
│   ├── main.ts                 # Entry point JavaScript
│   ├── App.vue / App.tsx       # Componente raiz
│   ├── assets/                 # Assets processados pelo Vite
│   ├── styles/                 # CSS/SCSS modules
│   ├── components/             # Componentes
│   └── utils/                  # Utilitários
└── dist/                       # Output do build
    ├── assets/
    │   ├── index.abc123.js     # JS com hash
    │   └── index.abc123.css    # CSS com hash
    └── index.html
```

## Filosofia do Projeto

1. **Lean Extendable Core** — Primitivas fortes + API de plugins extensível
2. **Push Modern Web** — Source code ESM nativo, Web Workers com `new Worker`, sem polyfills desnecessários
3. **Pragmatic Performance** — Ferramentas nativas (Oxc, Rolldown) para tarefas pesadas, JS para flexibilidade
4. **Framework Agnostic** — Core agnóstico; plugins específicos para Vue, React, Svelte, etc.

## Diferenças Vite 8 vs Versões Anteriores

| Aspecto               | Vite 5-6              | Vite 8 (Moderno)              |
|-----------------------|-----------------------|-------------------------------|
| Bundler               | Rollup (JS)           | Rolldown (Rust)               |
| Transpilador Dev      | esbuild (Go)          | Oxc (Rust)                    |
| Minificador JS        | esbuild/Terser        | Oxc Minifier                  |
| Minificador CSS       | esbuild               | Lightning CSS                 |
| CJS Interop           | Inconsistente         | Consistente (breaking change) |
| Plugin API            | Rollup-hybrid         | Rolldown nativo               |
| Multi-environment     | Experimental (v6)     | Maduro (v8)                   |
| Config Loader         | esbuild               | Rolldown (ou Node nativo)     |

## Próximos Passos

- [02-configuration.md](02-configuration.md) — Configuração completa
- [03-build-optimization.md](03-build-optimization.md) — Otimização de bundle
- [04-code-splitting.md](04-code-splitting.md) — Code splitting estratégico
- [05-assets-and-css.md](05-assets-and-css.md) — CSS, assets e fontes otimizados
