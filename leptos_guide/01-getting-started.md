# 01 — Getting Started com Leptos

Há dois caminhos básicos para começar com Leptos:

## 1. Client-Side Rendering (CSR) com Trunk

Ideal para SPAs simples. Compila para WASM e roda no navegador.

```bash
cargo install trunk
cargo init leptos-tutorial
cd leptos-tutorial
cargo add leptos --features=csr
rustup target add wasm32-unknown-unknown
```

Crie `index.html`:

```html
<!DOCTYPE html>
<html>
  <head></head>
  <body></body>
</html>
```

E `src/main.rs`:

```rust
use leptos::prelude::*;

fn main() {
    leptos::mount::mount_to_body(|| view! { <p>"Hello, world!"</p> })
}
```

```bash
trunk serve --open
```

## 2. Full-Stack SSR com `cargo-leptos`

Usa server-side rendering + hidratação. Requer Actix-web ou Axum.

```bash
cargo install --locked cargo-leptos
cargo leptos new --git https://github.com/leptos-rs/start-axum
# ou
cargo leptos new --git https://github.com/leptos-rs/start-actix
cd my-app
rustup target add wasm32-unknown-unknown
cargo leptos watch
```

Abra `http://localhost:3000`.

## Pré-requisitos comuns

- Rust instalado e atualizado
- `wasm32-unknown-unknown` adicionado como target
- Trunk (para CSR) ou cargo-leptos (para SSR)

## Melhorias na DX

### `console_error_panic_hook`

```bash
cargo add console_error_panic_hook
```

```rust
console_error_panic_hook::set_once();
```

### `leptosfmt` (formatador do `view!`)

```bash
cargo install leptosfmt
leptosfmt ./**/*.rs
```

### `--cfg=erase_components` em desenvolvimento

Acelera compilação:

```bash
RUSTFLAGS="--cfg erase_components" trunk serve
```

No `.cargo/config.toml`:

```toml
[target.wasm32-unknown-unknown]
rustflags = ["--cfg", "erase_components"]
```

### Configuração do rust-analyzer

Ignore `#[server]` para melhor autocomplete:

```json
"rust-analyzer.procMacro.ignored": {
    "leptos_macro": ["server"]
}
```

Ative todas as features:

```json
"rust-analyzer.cargo.features": "all"
```
