# 15 — Renderização no Servidor (SSR)

## Introdução ao `cargo-leptos`

Ferramenta de build que coordena a compilação para dois targets:
- **Server**: código nativo (ex: x86_64) com feature `ssr`
- **Client**: WebAssembly com feature `hydrate`

```bash
cargo install --locked cargo-leptos
cargo leptos new --git https://github.com/leptos-rs/start-axum
cd my-app
cargo leptos watch
```

## Ciclo de Vida de uma Página SSR

### No servidor

1. Browser faz `GET` para a URL
2. Server verifica rotas via `.leptos_routes()`
3. Leptos renderiza o componente raiz para HTML
4. HTML inclui `<script>` para carregar WASM
5. Server retorna HTML completo (não empty body)

### No browser

1. Browser renderiza o HTML recebido (já visível!)
2. Carrega JS + WASM em paralelo
3. WASM hidrata o HTML: adiciona event listeners e reatividade
4. Navegações seguintes são client-side (SPA)

### Navegação Client-Side

Após hidratação, clicar em links **não** faz round-trip ao servidor.
O app "upgrade" de MPA para SPA.

## SSR Modes

Leptos suporta 4 modos de renderização assíncrona, configuráveis
por rota:

### Synchronous

Serve HTML shell com fallbacks de `<Suspense/>`. Dados carregam
no cliente. TTFB rápido, mas sem SEO para dados async.

### Async

Aguarda **todos** os resources carregarem no servidor antes de
enviar HTML. Melhor para metadados (title, meta), mas TTFB mais lento.

```rust
<Route path=path!("/post/:id") view=BlogPost ssr=SsrMode::Async/>
```

### In-Order Streaming

Streaming em ordem: renderiza até encontrar `<Suspense/>`, envia
o HTML parcial, espera o resource, continua.
Mostra conteúdo progressivamente mas bloqueia hidratação até o fim.

### Out-of-Order Streaming (padrão)

Envia HTML shell imediatamente com fallbacks, e "streama" fragments
de `<Suspense/>` conforme resolvem. Melhor equilíbrio entre TTFB
e loading total.

### Partially Blocked

Combina OOO streaming com bloqueio seletivo:

```rust
let post_data = Resource::new_blocking(/* ... */);
let comments_data = Resource::new(/* ... */);

view! {
    <Suspense fallback=|| ()>
        {move || Suspend::new(async move {
            let data = post_data.await;
            view! {
                <Title text=data.title/>
                <Meta name="description" content=data.excerpt/>
                <article>...</article>
            }
        })}
    </Suspense>
    <Suspense fallback=|| "Loading comments...">
        {move || Suspend::new(async move {
            let comments = comments_data.await;
            // não bloqueia o stream
        })}
    </Suspense>
}
```

Route:

```rust
<Route path=path!("/post/:id") view=BlogPost ssr=SsrMode::PartiallyBlocked/>
```

### Resource Blocking

`Resource::new_blocking` bloqueia o HTML stream até que o `Suspense` resolva.
Útil para SEO (title, meta tags precisam estar no HTML inicial).

## Hidratação e Hydration Bugs

### Hidratação

O WASM não recria elementos DOM — caminha sobre o HTML existente,
"pegando" elementos e adicionando interatividade.

### Bugs comuns de hidratação

**HTML inválido**: `<div>` dentro de `<p>` é ilegal — browser fecha o `<p>`
antes do `<div>`, causando mismatch.

```rust
// ❌ Causa hydration error
view! { <p><div>"texto"</div></p> }
```

**`<table>` sem `<tbody>`**: browser insere `<tbody>` automaticamente.

```rust
// ✅ Sempre inclua <tbody>
view! {
    <table>
        <tbody>
            <tr><td>"dado"</td></tr>
        </tbody>
    </table>
}
```

**Código server-only no cliente**: Use `Effect::new` para código
que só roda no browser:

```rust
// ❌ Panic no SSR
let storage = gloo_storage::LocalStorage::raw();

// ✅ OK — só roda no cliente
Effect::new(move |_| {
    let storage = gloo_storage::LocalStorage::raw();
});
```

**Código client-only no servidor**: Marque dependências como
`optional = true` e ative apenas na feature `ssr`.
