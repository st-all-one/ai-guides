# 19 — Deploy

## CSR (Trunk)

```bash
trunk build --release
```

O diretório `dist/` contém os artefatos estáticos.

### GitHub Pages

```yaml
# .github/workflows/gh-pages-deploy.yml
- name: Build with Trunk
  run: ./trunk build --release --public-url "${GITHUB_REPOSITORY#*/}"
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: './dist'
- name: Deploy to GitHub Pages
  uses: actions/deploy-pages@v4
```

### Netlify

`netlify.toml`:

```toml
[build]
command = "rustup target add wasm32-unknown-unknown && cargo install trunk --locked && trunk build --release"
publish = "dist"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

`rust-toolchain.toml`:

```toml
[toolchain]
channel = "stable"
targets = ["wasm32-unknown-unknown"]
```

### Vercel

Output directory: `dist`. Build command: vazio (override).

## SSR (cargo-leptos)

### Dockerfile (Debian)

```dockerfile
FROM rustlang/rust:nightly-trixie as builder
RUN apt-get update -y && apt-get install -y clang
RUN cargo binstall cargo-leptos -y
RUN rustup target add wasm32-unknown-unknown
WORKDIR /app
COPY . .
RUN cargo leptos build --release -vv

FROM debian:trixie-slim as runtime
WORKDIR /app
COPY --from=builder /app/target/release/my-app /app/
COPY --from=builder /app/target/site /app/site
COPY --from=builder /app/Cargo.toml /app/
ENV LEPTOS_SITE_ADDR="0.0.0.0:8080"
ENV LEPTOS_SITE_ROOT="site"
EXPOSE 8080
CMD ["/app/my-app"]
```

### Fly.io

```bash
fly launch
fly deploy
```

### Reverse Proxy (Caddy)

```Caddyfile
example.com {
    reverse_proxy leptos-app:8080
}
```

### AWS Lambda

Use o template [leptos-rs/start-aws](https://github.com/leptos-rs/start-aws)
com `cargo-lambda`. Serverless impõe restrições: sem escrita em disco,
sem state extractor entre requests.

### Deno / Cloudflare Workers

Compile para `wasm32-unknown-unknown` no servidor. Requer
`crate-type = ["cdylib"]` e feature `wasm` para `leptos_axum`.

Veja o [exemplo hackernews_js_fetch](https://github.com/leptos-rs/leptos/tree/leptos_0.6/examples/hackernews_js_fetch).

## Non-Root Paths

Configuração para deploy em subdiretório (`/my-app`):

```rust
// Router
<Router base="/my-app">
```

```rust
// HydrationScripts
<HydrationScripts options root="/my-app"/>
```

```rust
// Server functions URL
set_server_url("/my-app");
```

```bash
# Trunk
trunk build --release --public-url /my-app
```

## Otimização de Binário WASM

### Release profile

```toml
[profile.wasm-release]
inherits = "release"
opt-level = 'z'
lto = true
codegen-units = 1

[package.metadata.leptos]
lib-profile-release = "wasm-release"
```

### Compressão

Sempre sirva WASM comprimido (gzip/brotli). WASM comprime para <50%.

### `build-std` (nightly)

```toml
# .cargo/config.toml
[unstable]
build-std = ["std", "panic_abort", "core", "alloc"]
build-std-features = ["panic_immediate_abort"]
```

### Evite

- `regex` com defaults (~500kb no WASM)
- Genéricos excessivos (monomorfização aumenta tamanho)

### Code Splitting

Use `cargo leptos build --split` + `#[lazy]` + `#[lazy_route]`:

```rust
#[lazy]
fn lazy_sync_fn() -> String {
    "Hello, lazy world!".to_string()
}

#[lazy]
async fn lazy_async_fn() -> String {
    "Hello, lazy async world!".to_string()
}
```

### `#[lazy_route]`

```rust
#[derive(Debug)]
struct BlogRoute { titles: Resource<Vec<String>> }

#[lazy_route]
impl LazyRoute for BlogRoute {
    fn data() -> Self {
        Self { titles: Resource::new(|| (), |_| async { vec![] }) }
    }
    fn view(this: Self) -> AnyView {
        // lazy-loaded, concorrente com data()
    }
}
```
