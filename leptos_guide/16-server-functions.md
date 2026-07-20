# 16 — Server Functions e Extractors

Server Functions permitem chamar código do servidor diretamente do
cliente como se fossem funções Rust comuns.

## Definição

```rust
#[server]
pub async fn add_todo(title: String) -> Result<(), ServerFnError> {
    let mut conn = db().await?;
    sqlx::query("INSERT INTO todos (title, completed) VALUES ($1, false)")
        .bind(title)
        .execute(&mut conn)
        .await?;
    Ok(())
}
```

### Características

- Anotadas com `#[server]`
- Sempre `async`
- Retornam `Result<T, ServerFnError>`
- Argumentos e retorno devem ser serializáveis
- São **top-level functions** (`fn`, não closures)
- Co-localizadas com o código do componente
- Isomórficas: no servidor executam; no cliente fazem fetch HTTP

### Uso no cliente

```rust
spawn_local(async {
    add_todo("Buy milk".to_string()).await;
});
```

## Integração com Resources e Actions

```rust
// Como Resource
let todos = Resource::new(|| (), |_| list_todos());

// Como Action
let add_todo = ServerAction::<AddTodo>::new();
```

## Customização

- Input encoding: `serde_qs` (default, compatível com `<form>`)
- Output encoding: `serde_json` (default)
- Endpoints: URLs hasheadas para evitar colisão

## Custom Errors

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppError {
    ServerFnError(ServerFnErrorErr),
    DbError(String),
}

impl FromServerFnError for AppError {
    type Encoder = JsonEncoding;
    fn from_server_fn_error(value: ServerFnErrorErr) -> Self {
        AppError::ServerFnError(value)
    }
}

#[server]
pub async fn create_user(name: String) -> Result<User, AppError> {
    // ...
}
```

## ⚠️ Segurança

Server Functions são **açúcar sintático para APIs públicas**.
O corpo da função nunca é exposto, mas o endpoint é publicamente
acessível. Não retorne informação não-pública sem autenticação.

## Quirks

- Evite `isize`/`usize` (32-bit WASM vs 64-bit server)
- `serde_qs` pode ter limitações com Option e enum tuple variants

## Extractors

Accesse dados da requisição HTTP dentro de server functions.

### Actix

```rust
#[server]
pub async fn actix_extract() -> Result<String, ServerFnError> {
    use actix_web::dev::ConnectionInfo;
    use actix_web::web::Query;
    use leptos_actix::extract;

    let (Query(search), connection): (Query<MyQuery>, ConnectionInfo) = extract().await?;
    Ok(format!("{search:?}, {connection:?}"))
}
```

### Axum

```rust
#[server]
pub async fn axum_extract() -> Result<String, ServerFnError> {
    use axum::{extract::Query, http::Method};
    use leptos_axum::extract;

    let (method, query): (Method, Query<MyQuery>) = extract().await?;
    Ok(format!("{method:?} {query:?}"))
}
```

### Axum State + `extract_with_state`

```rust
#[derive(FromRef, Debug, Clone)]
pub struct AppState {
    pub leptos_options: LeptosOptions,
    pub pool: SqlitePool,
}

#[server]
pub async fn uses_state() -> Result<(), ServerFnError> {
    let state = expect_context::<AppState>();
    let (data,) = extract_with_state(&state).await?;
    Ok(())
}
```

### Axum `FromRef` Pattern

Para usar State em server functions:

```rust
let app_state = AppState { leptos_options, pool };

Router::new()
    .leptos_routes_with_context(
        &app_state,
        routes,
        move || provide_context(app_state.clone()),
        App,
    )
    .with_state(app_state);
```

## Responses e Redirects

### `ResponseOptions`

```rust
#[server]
pub async fn set_cookie() -> Result<(), ServerFnError> {
    let response = expect_context::<ResponseOptions>();
    response.set_status(StatusCode::OK);

    let cookie = Cookie::build("session", "xyz").finish();
    if let Ok(h) = HeaderValue::from_str(&cookie.to_string()) {
        response.insert_header(header::SET_COOKIE, h);
    }
    Ok(())
}
```

### `redirect`

```rust
#[server]
pub async fn login(/* ... */) -> Result<(), ServerFnError> {
    // autenticar...
    leptos_axum::redirect("/dashboard");
    Ok(())
}
```

Funciona com `<ActionForm/>`: sem JS, o redirect HTTP é seguido;
com JS, o `<ActionForm/>` detecta e faz navegação client-side.

## Tabela de Comportamento Async

| Contexto | SSR | Hidratação | CSR |
|----------|-----|------------|-----|
| Server Function (Server) | Executa normal, contexto reativo disponível | — | Responde HTTP |
| Server Function (Client) | — | Não executa | Faz HTTP request |
| Resource (Server) | Paralelo, resultados em `<script>` | — | — |
| Resource (Client) | — | Lê de `<script>` | Executa fetcher |
| LocalResource (Client) | — | Não executa (executa após hidratação) | Executa fetcher |
| Suspend (Server) | Paralelo, depende do SsrMode | — | — |
| Suspend (Client) | — | Executa de novo para hidratação | Executa quando necessário |
