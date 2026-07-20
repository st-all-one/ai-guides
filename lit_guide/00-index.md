# Lit Guide — Índice da Documentação

Guia completo e orientado a IA para construção de Web Components com Lit v3, cobrindo arquitetura, performance, estilos, Shadow DOM, interoperabilidade e muito mais.

## Estrutura dos Guias

| #  | Arquivo | Foco |
|----|---------|------|
| 01 | `01-arquitetura-fundamentos.md` | Reactive update cycle, LitElement, ReactiveElement, HTMLElement |
| 02 | `02-componentes-propriedades.md` | Definição, decorators, reactive properties, atributos |
| 03 | `03-templates-renderizacao.md` | Template literals, expressões, conditionals, lists, directives |
| 04 | `04-estilos-css.md` | **CSS com e sem Shadow DOM, compartilhado, isolado, performance** |
| 05 | `05-shadow-dom.md` | Shadow DOM, slots, composição, open vs closed |
| 06 | `06-eventos.md` | Event listeners, custom events, event options, bubbling |
| 07 | `07-composicao.md` | Reactive controllers, mixins, component composition |
| 08 | `08-gerenciamento-dados.md` | Context API, Signals, Task (async data) |
| 09 | `09-performance.md` | Otimização de updates, lazy loading, compiler, bundling |
| 10 | `10-interoperabilidade.md` | React, Angular, Vue, frameworks, design systems |
| 11 | `11-ssr.md` | Server-side rendering, hydration, streaming |
| 12 | `12-ferramentas.md` | Tooling, testing, build, publicação |
| 13 | `13-custom-directives.md` | Custom directives, lifecycle, Part types, async directives |
| 14 | `14-localizacao.md` | Localização, `@lit/localize`, runtime/transform mode |

## Princípios Centrais do Lit

- **Componentes são elementos HTML nativos** — zero lock-in, máxima interoperabilidade
- **Reatividade via propriedades** — `@property`, `@state`, ciclo de update reativo
- **Templates declarativos** — tagged template literals (`html\`...\``), sem virtual DOM
- **Shadow DOM por padrão** — encapsulamento de estilo e DOM, mas configurável
- **Atualizações precisas** — apenas expressões modificadas são re-renderizadas

## Como Usar Este Guia

Cada arquivo é autocontido e pode ser lido independentemente. Para IA, recomendamos:

1. Começar por `01-arquitetura-fundamentos.md` para entender o ciclo de update
2. Para foco em CSS, vá direto para `04-estilos-css.md`
3. Para otimização, leia `09-performance.md` em conjunto com `04-estilos-css.md`
