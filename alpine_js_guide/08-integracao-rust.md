# Integração com Rust/Leptos

## Princípios

Em projetos Rust com Leptos (SSR), Alpine.js atua como camada de interatividade no cliente. O servidor renderiza HTML com atributos Alpine, e o navegador hidrata a interatividade.

**Regra de ouro:** Alpine roda no navegador. Rust/Leptos roda no servidor (e opcionalmente no WASM). A comunicação entre eles se dá por:

1. **HTML renderizado no servidor** com atributos Alpine embutidos
2. **Server Functions** (chamadas HTTP do Alpine para endpoints Rust)
3. **Alpine.morph()** para atualizações parciais de DOM sem perder estado
4. **Islands Architecture** (Leptos 0.8+ com Alpine dentro de componentes `#[island]`)

---

## Abordagem 1: HTML SSR com Alpine (mais comum)

O servidor Rust gera HTML completo com diretivas Alpine. Funciona com qualquer template engine (Askama, Tera, Handlebars) ou Leptos SSR.

### Exemplo com Askama

```rust
// templates/index.html
<div x-data="{ count: 0 }">
    <button @click="count++">Increment</button>
    <span x-text="count"></span>
    <p>{{ message }}</p>  {# variável do servidor #}
</div>

<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/cdn.min.js"></script>
```

### Exemplo com Leptos SSR

```rust
#[component]
fn Counter() -> impl IntoView {
    view! {
        <div x-data="{ count: 0 }">
            <button @click="count++">"Increment"</button>
            <span x-text="count"></span>
        </div>
    }
}
```

> **Nota:** Em Leptos 0.8+, use `view!` normalmente. Atributos como `x-data` e `@click` são passados como strings literais. O `x-text` não conflita com Leptos porque Alpine opera no DOM do cliente após o SSR.

---

## Abordagem 2: Server Functions com Alpine

Alpine chama endpoints Rust via `fetch`:

```rust
// server_fns.rs
#[server]
pub async fn get_todos() -> Result<Vec<Todo>, ServerFnError> {
    let pool = expect_context::<PgPool>();
    Ok(sqlx::query_as("SELECT * FROM todos").fetch_all(&pool).await?)
}
```

```html
<div x-data="{ todos: [], loading: false }"
     x-init="loading = true;
             todos = await (await fetch('/api/todos')).json();
             loading = false">
    <template x-for="todo in todos" :key="todo.id">
        <div>
            <span x-text="todo.title"></span>
        </div>
    </template>
</div>
```

### POST com csrf

```html
<form @submit.prevent="
    await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ title: newTodo })
    })
">
    <input type="text" x-model="newTodo">
    <button type="submit">Add</button>
</form>
```

---

## Abordagem 3: Alpine.morph() com Respostas HTML do Servidor

Ideal para atualizações parciais sem perder estado Alpine:

```rust
// Em Rust, retorne HTML parcial:
async fn get_todos_partial() -> impl IntoResponse {
    Html(todo_list_partial().await)
}
```

```html
<div x-data="{ todos: $persist([]) }"
     x-init="todos = await (await fetch('/api/todos')).json()">
    <ul>
        <template x-for="todo in todos" :key="todo.id">
            <li x-text="todo.title"></li>
        </template>
    </ul>
    <button @click="
        // Fetch novo HTML do servidor e faz morph
        let newHtml = await (await fetch('/api/todos/partial')).text();
        Alpine.morph($el, newHtml);
    ">Refresh</button>
</div>
```

---

## Abordagem 4: Islands com Leptos 0.8+

Leptos 0.8+ suporta componentes `#[island]` que são hidratados seletivamente no cliente. Alpine pode ser usado dentro ou fora de islands:

```rust
// island — hidrata só este componente no cliente
#[island]
fn ClientCounter() -> impl IntoView {
    // Estado Leptos local (não servidor)
    let (count, set_count) = signal(0);

    view! {
        <div>
            <p>"Count (Leptos island): " {count}</p>
            <button on:click=move |_| set_count.update(|c| *c += 1)>"+ (Leptos)"</button>
        </div>
    }
}

#[component]
fn Page() -> impl IntoView {
    view! {
        <h1>"Minha Página"</h1>

        // Componente Leptos hidratado no cliente
        <ClientCounter/>

        // Componente Alpine (sem hidratação Leptos)
        <div x-data="{ count: 0 }">
            <button @click="count++">"+ (Alpine)"</button>
            <span x-text="count"></span>
        </div>
    }
}
```

### Alpine dentro de um island

```rust
#[island]
fn AlpineWrapper() -> impl IntoView {
    view! {
        <div x-data="{ open: false }">
            <button @click="open = ! open">"Toggle"</button>
            <div x-show="open" x-transition>
                "Conteúdo do island com Alpine"
            </div>
        </div>
    }
}
```

---

## Abordagem 5: Estado Compartilhado entre Leptos e Alpine

Use `window` como ponte para compartilhar estado:

```rust
#[component]
fn ShareState() -> impl IntoView {
    view! {
        <script>
            window.__INITIAL_STATE__ = {
                user: { name: "John", id: 1 },
                csrf: "token-123"
            };
        </script>

        <div x-data="app">
            <p x-text="'Welcome, ' + $store.user.name"></p>
        </div>

        <script>
            document.addEventListener('alpine:init', () => {
                Alpine.store('user', window.__INITIAL_STATE__.user);
            })
        </script>
    }
}
```

---

## Padrões para Projetos Rust + Alpine

### Estrutura de diretórios

```
src/
├── main.rs              # entrypoint Axum
├── lib.rs               # app router
├── components/
│   ├── mod.rs
│   └── alpine_components.rs  # componentes que usam Alpine
├── pages/
│   ├── mod.rs
│   └── home.rs
├── server_fns.rs        # #[server] functions
└── templates/           # (se usar Askama/Tera)
    ├── base.html
    └── components/
        └── counter.html
```

### Layout base (Askama)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="csrf-token" content="{{ csrf_token }}">
    <style>[x-cloak] { display: none !important; }</style>
    {% block head %}{% endblock %}
</head>
<body>
    {% block content %}{% endblock %}

    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/cdn.min.js"></script>
</body>
</html>
```

### Configuração de Cache Rust

Para evitar que o servidor Rust faça cache de respostas que incluem Alpine (já que Alpine opera no cliente), use `Cache-Control: no-store` em páginas com estado Alpine:

```rust
async fn page() -> impl IntoResponse {
    ([(header::CACHE_CONTROL, "no-store")], Html(include_str!("page.html")))
}
```

---

## Considerações de Performance

1. **SSR com Alpine é rápido** — o servidor envia HTML pronto, Alpine só adiciona interatividade
2. **Carregamento assíncrono** — Alpine com `defer` não bloqueia renderização
3. **Mínimo JavaScript** — Alpine (~30KB gzipado) substitui React/Vue para interatividade simples
4. **Morph para updates** — `Alpine.morph()` atualiza DOM sem perder estado, ideal para respostas parciais do servidor
5. **Evite re-renderização Leptos + Alpine** — não misture sinais Leptos com estado Alpine no mesmo elemento para evitar conflitos

## Pipeline de Build Recomendado

```toml
# Cargo.toml
[dependencies]
axum = "0.8"
leptos = "0.8"
leptos_axum = "0.8"
tower-http = { version = "0.6", features = ["cors", "compression"] }
askama = "0.12"  # ou tera, ou leptos-view
```

```html
<!-- Em templates Askama: inclua Alpine no final do body -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/cdn.min.js"></script>
```

Ou baixe e sirva localmente:

```bash
# No Dockerfile ou script de build
curl -o static/js/alpine.min.js https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/cdn.min.js
```

```html
<script defer src="/static/js/alpine.min.js"></script>
```
