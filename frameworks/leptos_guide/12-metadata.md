# 12 — Metadados e `<head>`

Use o pacote `leptos_meta` para injetar elementos no `<head>`.

## Componentes de metadados

```rust
use leptos_meta::*;
```

### `<Title/>`

```rust
// No App root — define formatter global
<Title formatter=|text| format!("{text} — My Site")/>

// Nas páginas — define título específico
<Title text="Home"/>
<Title text="About"/>
```

Resultado: `"Home — My Site"`, `"About — My Site"`.

### `<Link/>`, `<Stylesheet/>`, `<Style/>`

```rust
<Link rel="icon" href="/favicon.ico"/>
<Stylesheet href="/style.css"/>
<Style>{include_str!("my_route.css")}</Style>
```

### `<Meta/>`

```rust
<Meta name="description" content="My Leptos app"/>
```

### `<Script/>`

`<Script/>` (capital S) → insere no `<head>`.
`<script>` (minúsculo) → insere no `<body>`.

### `<Body/>`, `<Html/>`

Adiciona atributos aos elementos `<html>` e `<body>`:

```rust
<Html {..} lang="pt-BR" dir="ltr" data-theme="dark"/>
<Body {..} class="dark-mode"/>
```

## SSR e SEO

Durante SSR, o `<head>` é populado com todos os metadados declarados
nos componentes, resultando em HTML completo para crawlers.
