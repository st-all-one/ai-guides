# SKILL: HTML Moderno — Boas Práticas (para IA)

## Perfil

Especialista em HTML Living Standard (WHATWG 2025). Gera HTML semântico, acessível, seguro e performático. Nunca produz HTML legado ou deprecado. Conhece todas as tags, atributos globais, ARIA, microdata, web components e padrões modernos.

## Regras Obrigatórias

### 1. DOCTYPE e Modo
- SEMPRE começar com `<!DOCTYPE html>` (ativa no-quirks mode)
- `<html lang="pt-BR">` — `lang` obrigatório para acessibilidade

### 2. Estrutura Mínima
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>...</title>
</head>
<body>
</body>
</html>
```

### 3. Semântica (NUNCA usar div quando existe elemento semântico)

| Função | Elemento Correto |
|--------|-----------------|
| Navegação | `<nav aria-label="...">` |
| Conteúdo principal | `<main>` (1 por página) |
| Seção temática | `<section>` (SEMPRE com heading) |
| Conteúdo autocontido | `<article>` |
| Conteúdo tangencial | `<aside>` |
| Cabeçalho da página | `<header>` |
| Rodapé da página | `<footer>` |
| Busca | `<search>` |
| Agrupamento de formulário | `<fieldset>` + `<legend>` |
| Lista de descrição | `<dl>` + `<dt>` + `<dd>` |
| Citação em bloco | `<blockquote cite="...">` |
| Figura com legenda | `<figure>` + `<figcaption>` |
| Container sem semântica | `<div>` (último recurso) |

### 4. Headings
- **UM** `<h1>` por página
- Não pular níveis (`h1` → `h3` é erro)
- Usar níveis para profundidade, não para estilo
- Só usar `<hgroup>` para título + subtítulo

### 5. Acessibilidade (WCAG AA mínimo)
- **Toda `<img>` precisa de `alt`** — string descritiva ou vazio (`alt=""`) para decorativas
- **Formulários**: `<label for="id">` explícito em todo campo
- **Erros**: `aria-describedby` + `role="alert"` + `aria-live="polite"`
- **Skip link**: `<a href="#main-content" class="skip-link">` antes do `<nav>`
- **ARIA**: usar só quando HTML nativo é insuficiente. NUNCA adicionar ARIA redundante (ex: `<button role="button">`)
- **Tabelas**: `<caption>` + `<th scope="col/row">`
- **Links**: texto descritivo (NUNCA "clique aqui", "leia mais")
- **target="_blank"**: SEMPRE com `rel="noopener noreferrer"` + indicação textual
- **`aria-current="page"`** no link de navegação ativo
- **`aria-expanded`** em controles que expandem/recolhem
- **Tabindex**: NUNCA usar `>0`. Só `0` (natural) ou `-1` (via JS)

### 6. Performance
- **Imagens**: SEMPRE `width` + `height` (previne CLS)
- **`loading="lazy"`** em imagens/iframes abaixo da dobra
- **`fetchpriority="high"`** na hero image, `"low"` em decorativas
- **`decoding="async"`** em imagens
- **Responsive images**: `srcset` + `sizes` para resolução; `<picture>` para art direction
- **Scripts**: `defer` para scripts DOM-dependentes; `async` para analytics/widgets; `type="module"` para ES Modules
- **CSS crítico**: inline no `<head>`; CSS não-crítico carregado async
- **Preload**: fontes e hero image
- **Preconnect**: origins third-party
- **`font-display: swap`** em todo `@font-face` (evita FOIT)
- **`preload="metadata"`** em vídeos

### 7. Segurança
- **CSP**: `default-src 'self'` + diretivas específicas. NUNCA `'unsafe-inline'` em script-src em produção
- **SRI**: `integrity` + `crossorigin="anonymous"` em todo recurso de CDN
- **`rel="noopener noreferrer"`** em todo `target="_blank"`
- **`sandbox`** em iframes com conteúdo não confiável (mínimo privilégio)
- **`frame-ancestors 'none'`** contra clickjacking
- **Base URI**: `base-uri 'self'` no CSP
- Validação client-side NUNCA substitui server-side

### 8. Padrões Modernos

| Recurso | Como Usar |
|---------|-----------|
| Dialog | `<dialog>` + `showModal()` / `show()` / `close()` + `::backdrop` |
| Popover | `popover="auto|hint|manual"` + `popovertarget` |
| Details/Summary | `<details name="grupo">` para accordion |
| Web Components | Declarative Shadow DOM: `<template shadowrootmode="open">` |
| Slots | `<slot name="x">` + elemento com `slot="x"` |
| Output | `<output for="ids">` para resultados de cálculo |
| Progress | `<progress value="..." max="...">` |
| Meter | `<meter min="..." max="..." value="...">` |
| Search | `<search>` (role="search" implícito) |
| Contenteditable | `contenteditable="plaintext-only"` |
| Datalist | `<input list="id">` + `<datalist id="id">` |
| Microdata | `itemscope itemtype="https://schema.org/..."` + `itemprop` |
| Data attributes | `data-*` + acesso via `element.dataset.*` |
| Import Map | `<script type="importmap">` para bare module specifiers |
| Speculation Rules | `<script type="speculationrules">` para pré-renderização |

### 9. Formulários
- **Sempre** associar `<label for="id">` com o `<input>`
- **Agrupar** com `<fieldset>` + `<legend>`
- **Input types**: usar o mais específico (`email`, `tel`, `url`, `search`, `number`, `date`, etc.)
- **`autocomplete`**: sempre configurar (`given-name`, `email`, `current-password`, `new-password`, `tel`, `street-address`, `country`, `cc-number`, etc.)
- **`inputmode`**: configurar para teclado virtual correto (`numeric`, `email`, `tel`, `url`, `decimal`, `search`)
- **`enterkeyhint`**: dica para tecla Enter (`go`, `search`, `done`, `send`, `next`)
- **Validação**: `required`, `minlength`, `maxlength`, `pattern`, `min`, `max`, `step`
- **Custom validation**: `setCustomValidity()` + `ValidityState`
- **CSS**: `:valid`, `:invalid`, `:user-invalid`, `:user-valid`, `:in-range`, `:out-of-range`

### 10. Metadados Essenciais (no `<head>`)
```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Descrição | Site</title>
<meta name="description" content="..." />
<link rel="canonical" href="..." />
<meta name="robots" content="index, follow" />
<!-- Open Graph -->
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />
<meta property="og:url" content="..." />
<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<!-- Icons -->
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<!-- PWA -->
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="..." />
```

### 11. Formatos de Data (ISO 8601 — HTML)
- Date: `YYYY-MM-DD` (ex: `2025-07-21`)
- Time: `HH:MM` ou `HH:MM:SS` (ex: `14:30:00`)
- Week: `YYYY-Www` (ex: `2025-W30`)
- Month: `YYYY-MM` (ex: `2025-07`)
- Datetime-local: `YYYY-MM-DDTHH:MM` (ex: `2025-07-21T14:30`)
- Global: `YYYY-MM-DDTHH:MM:SSZ` ou com offset `±HH:MM`

### 12. Caracteres Especiais (escapar SEMPRE)
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `&` → `&amp;`

### 13. Atributos Globais Relevantes
- `lang`, `dir` (text direction)
- `hidden` / `hidden="until-found"`
- `inert` (desabilita interatividade + acessibilidade)
- `spellcheck`, `translate`
- `autocapitalize`, `autocorrect`
- `inputmode`, `enterkeyhint`
- `popover`, `anchor` (CSS anchor positioning)
- `slot`, `exportparts`
- `is` (customized built-in elements)
- `elementtiming` (PerformanceObserver)
- `itemscope`, `itemtype`, `itemprop`, `itemid`, `itemref`

### 14. Elementos PROIBIDOS (NUNCA gerar)
`<font>`, `<center>`, `<big>`, `<tt>`, `<strike>`, `<marquee>`, `<blink>`, `<frame>`, `<frameset>`, `<noframes>`, `<applet>`, `<acronym>`, `<isindex>`, `<dir>`, `<listing>`, `<plaintext>`, `<xmp>`, `<nobr>`, `<spacer>`, `<keygen>`, `<menuitem>`, `<shadow>`, `<content>`, `<param>`, `<rb>`, `<rtc>`, `<image>`, `<basefont>`, `<command>`, `<nextid>`, `<noembed>`

### 15. Atributos PROIBIDOS (usar CSS)
`align`, `bgcolor`, `background`, `border` (em img/object/table), `color`, `clear`, `compact`, `height` (em div/td/th), `hspace`, `vspace`, `noshade`, `nowrap`, `rules`, `size` (em hr/font), `text` (em body), `type` (em li/ol/ul), `valign`, `width` (em div/td/th/hr/pre), `link`, `alink`, `vlink` (em body)

## Fluxo de Decisão

### Qual elemento usar para container?
```
ConteúDO tem agrupamento temático?
├── SIM → Tem heading?
│   ├── SIM → É autocontido/distribuível?
│   │   ├── SIM → <article>
│   │   └── NÃO → <section>
│   └── NÃO → <div>
└── NÃO → É tangencial ao conteúdo principal?
    ├── SIM → <aside>
    └── NÃO → <div>
```

### Precisa de ARIA?
```
Existe elemento HTML nativo com a semântica necessária?
├── SIM → Usar HTML nativo (NUNCA adicionar ARIA redundante)
└── NÃO → ARIA é necessário:
    ├── Widget complexo sem equivalente HTML (tabs, tree, combobox)?
    ├── Estado não exposto por HTML nativo (aria-expanded)?
    ├── Atualização dinâmica (aria-live)?
    └── Label visual impossível (aria-label)?
```

## Verificação Final (auto-checklist)

Antes de entregar o HTML, verificar:
- [ ] `<!DOCTYPE html>` presente
- [ ] `<html lang="...">` definido
- [ ] `<meta charset="UTF-8">` + viewport
- [ ] Um `<h1>` por página, headings sem pular níveis
- [ ] `<main>` único
- [ ] Landmarks corretos (header, nav, main, aside, footer, search)
- [ ] Toda `<img>` tem `alt` (vazio se decorativa)
- [ ] Formulários com `<label for="">`
- [ ] Links descritivos (sem "clique aqui")
- [ ] `target="_blank"` com `rel="noopener noreferrer"`
- [ ] Imagens com `width` + `height`
- [ ] Nenhum elemento/atributo deprecado
- [ ] Nenhum `tabindex > 0`
- [ ] Nenhum elemento `<font>`, `<center>`, `<big>`, etc.
- [ ] Nenhum atributo presentacional (`align`, `bgcolor`, etc.)
- [ ] `<table>` só para dados tabulares, NUNCA para layout
