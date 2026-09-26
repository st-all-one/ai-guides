# Exemplo: Rust + Axum + htmx com HTTP/3

Stack moderna: **Rust** (Axum) + **htmx** + **SQLx/PostgreSQL** + **Caddy HTTP/3**.

Arquitetura: Caddy faz terminação TLS/QUIC, proxy reverso para o backend Rust, e serve arquivos estáticos. htmx roda no frontend com mínima JS.

## Estrutura

```
rust-htmx-project/
├── docker-compose.yml
├── caddy/
│   ├── Dockerfile
│   └── Caddyfile
├── backend/
│   ├── Cargo.toml
│   ├── Dockerfile
│   └── src/
│       ├── main.rs
│       ├── routes.rs
│       ├── templates.rs
│       └── db.rs
├── static/
│   ├── css/
│   │   └── app.css
│   └── js/
│       └── htmx.min.js
├── templates/                 # Templates HTML com htmx (server-side rendering)
│   ├── base.html
│   ├── index.html
│   └── components/
└── prometheus/
    └── prometheus.yml
```

## 1. Caddyfile

```caddy
# ── Global ──────────────────────────────────────────────────
{
    email admin@example.com
    key_type ed25519

    servers {
        protocols h1 h2 h3               # HTTP/3 (QUIC)
        trusted_proxies static private_ranges
        trusted_proxies_strict

        timeouts {
            read_body   10s
            read_header 5s
            write       30s
            idle        120s
        }

        max_header_size 64KB             # Axum headers geralmente pequenos
    }

    ocsp_interval 30m

    metrics {
        per_host
    }
}

# ── APP ─────────────────────────────────────────────────────
*.rust-htmx.example.com, rust-htmx.example.com {
    # ── Arquivos estáticos (com cache agressivo) ──────────
    root * /var/www/static

    header {
        # htmx.js versionado é imutável
        ~\.(css|js|mjs)$ {
            Cache-Control "public, max-age=31536000, immutable"
        }
        ~\.(ico|svg|png|jpg|webp)$ {
            Cache-Control "public, max-age=31536000, immutable"
        }
        # HTML nunca em cache (server-side rendering dinâmico)
        ~\.html$ {
            Cache-Control "no-cache, no-store, must-revalidate"
        }

        # Security headers para htmx + Axum
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"

        # CSP compatível com htmx e HTMXBoost
        Content-Security-Policy "
            default-src 'self';
            script-src 'self' 'unsafe-inline';   # htmx usa inline handlers
            style-src 'self' 'unsafe-inline';
            img-src 'self' data:;
            connect-src 'self';
            form-action 'self';
            frame-ancestors 'none';
        "

        # htmx headers de segurança (impedir caching de respostas htmx)
        ~^/api/ {
            Cache-Control "no-store"
        }

        -Server
    }

    # ── Compressão (zstd + gzip) ──────────────────────────
    encode zstd gzip {
        minimum_length 256
        match {
            header Content-Type text/html*
            header Content-Type text/css*
            header Content-Type application/javascript*
            header Content-Type application/json*
            header Content-Type image/svg+xml*
        }
    }

    # ── Static Files ───────────────────────────────────────
    file_server {
        precompressed br zstd gzip
    }

    # ── Reverse Proxy para Axum ────────────────────────────
    handle_path /api/* {
        reverse_proxy backend:3000 {
            transport http {
                dial_timeout 3s
                read_timeout 30s
                write_timeout 30s
                response_header_timeout 30s
                keepalive 2m
                keepalive_idle_conns_per_host 64
            }

            header_up X-Real-IP {remote_host}
            header_up X-Request-ID {uuid}

            @error status 500 502 503 504
            handle_response @error {
                respond "{\"error\":\"internal\"}" {rp.status_code}
            }
        }
    }

    # ── Proxy para respostas htmx (HTML parcial) ─────────
    handle_path /htmx/* {
        reverse_proxy backend:3000 {
            transport http {
                dial_timeout 3s
                read_timeout 10s
                keepalive 2m
            }

            header_up HX-Request "true"
        }
    }

    # ── WebSocket (se necessário para htmx WebSocket) ────
    handle_path /ws/* {
        reverse_proxy backend:3000 {
            flush_interval -1
            stream_timeout 24h
        }
    }

    # ── Server-Sent Events (para htmx SSE) ──────────────
    handle_path /events/* {
        reverse_proxy backend:3000 {
            flush_interval -1
        }
    }

    # ── Health Check ───────────────────────────────────────
    handle /health {
        @shutting_down vars {http.shutting_down} true
        respond @shutting_down "shutting down" 503
        respond "ok" 200
    }

    # ── Logging ─────────────────────────────────────────────
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 14
        }
        format json
    }
}
```

## 2. Backend Rust (Axum + htmx)

### Cargo.toml

```toml
[package]
name = "rust-htmx-app"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = { version = "0.7", features = ["macros", "ws"] }
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace", "compression-gzip"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres", "uuid"] }
uuid = { version = "1", features = ["v4", "serde"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
askama = "0.12"                    # Server-side templates
htmx = "0.1"                       # htmx response headers helpers
chrono = { version = "0.4", features = ["serde"] }
```

### src/main.rs

```rust
use axum::{
    extract::{Path, Query, State, WebSocketUpgrade, ws},
    http::StatusCode,
    response::{Html, IntoResponse, Json},
    routing::{get, post, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

mod routes;
mod templates;
mod db;

#[derive(Clone)]
struct AppState {
    db: sqlx::PgPool,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env()
            .add_directive("rust_htmx_app=debug".parse().unwrap()))
        .json()
        .init();

    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://app:password@db:5432/app".into());

    let pool = PgPoolOptions::new()
        .max_connections(50)
        .connect(&db_url)
        .await
        .expect("Failed to connect to database");

    sqlx::migrate!().run(&pool).await.unwrap();

    let state = Arc::new(AppState { db: pool });

    let app = Router::new()
        // ── htmx endpoints (retornam HTML parcial) ──────
        .route("/htmx/todos", get(routes::todo_list))
        .route("/htmx/todos", post(routes::todo_create))
        .route("/htmx/todos/:id", delete(routes::todo_delete))
        .route("/htmx/todos/:id/toggle", post(routes::todo_toggle))

        // ── API REST ────────────────────────────────────
        .route("/api/health", get(health))
        .route("/api/todos", get(routes::api_list_todos))
        .route("/api/todos", post(routes::api_create_todo))

        // ── Server-Sent Events ─────────────────────────
        .route("/events/updates", get(routes::sse_handler))

        // ── WebSocket ──────────────────────────────────
        .route("/ws/live", get(routes::ws_handler))

        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Axum listening on :3000");
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({"status": "ok", "service": "rust-htmx"}))
}
```

### src/routes.rs

```rust
use axum::{
    extract::{Path, State, ws::{Message, WebSocket}},
    http::StatusCode,
    response::{Html, IntoResponse, Json, Sse},
    Form,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;
use tokio_stream::wrappers::IntervalStream;
use tokio_stream::StreamExt;

use crate::templates;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateTodo {
    pub title: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Todo {
    pub id: uuid::Uuid,
    pub title: String,
    pub completed: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// ── htmx: Lista de todos (HTML parcial) ─────────────────
pub async fn todo_list(
    State(state): State<Arc<AppState>>,
) -> Result<Html<String>, StatusCode> {
    let todos = sqlx::query_as::<_, Todo>(
        "SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let html = templates::TodoList { todos }.render()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Html(html))
}

// ── htmx: Criar todo ────────────────────────────────────
pub async fn todo_create(
    State(state): State<Arc<AppState>>,
    Form(input): Form<CreateTodo>,
) -> Result<Html<String>, StatusCode> {
    if input.title.trim().is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    let todo = sqlx::query_as::<_, Todo>(
        "INSERT INTO todos (id, title) VALUES ($1, $2) RETURNING id, title, completed, created_at"
    )
    .bind(uuid::Uuid::new_v4())
    .bind(&input.title)
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let html = templates::TodoItem { todo }.render()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // htmx: retorna o HTML do item + HX-Trigger para refresh
    Ok(Html(html))
}

// ── htmx: Deletar todo ──────────────────────────────────
pub async fn todo_delete(
    State(state): State<Arc<AppState>>,
    Path(id): Path<uuid::Uuid>,
) -> StatusCode {
    sqlx::query("DELETE FROM todos WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map(|_| StatusCode::OK)
        .unwrap_or(StatusCode::NOT_FOUND)
}

// ── htmx: Toggle todo ──────────────────────────────────
pub async fn todo_toggle(
    State(state): State<Arc<AppState>>,
    Path(id): Path<uuid::Uuid>,
) -> Result<Html<String>, StatusCode> {
    let todo = sqlx::query_as::<_, Todo>(
        "UPDATE todos SET completed = NOT completed WHERE id = $1
         RETURNING id, title, completed, created_at"
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    let html = templates::TodoItem { todo }.render()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Html(html))
}

// ── API REST ────────────────────────────────────────────
pub async fn api_list_todos(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Todo>>, StatusCode> {
    let todos = sqlx::query_as::<_, Todo>(
        "SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(todos))
}

pub async fn api_create_todo(
    State(state): State<Arc<AppState>>,
    Json(input): Json<CreateTodo>,
) -> Result<(StatusCode, Json<Todo>), StatusCode> {
    let todo = sqlx::query_as::<_, Todo>(
        "INSERT INTO todos (id, title) VALUES ($1, $2) RETURNING id, title, completed, created_at"
    )
    .bind(uuid::Uuid::new_v4())
    .bind(&input.title)
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(todo)))
}

// ── Server-Sent Events ─────────────────────────────────
pub async fn sse_handler(
    State(state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = Result<String, Infallible>>> {
    let stream = IntervalStream::new(tokio::time::interval(Duration::from_secs(30)))
        .map(|_| Ok("data: heartbeat\n\n".to_string()));

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("ping"),
    )
}

// ── WebSocket ──────────────────────────────────────────
pub async fn ws_handler(
    State(state): State<Arc<AppState>>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(|mut socket| async move {
        while let Some(Ok(msg)) = socket.recv().await {
            if let Message::Text(text) = msg {
                let _ = socket.send(Message::Text(
                    format!("Echo: {}", text)
                )).await;
            }
        }
    })
}
```

### src/templates.rs (Askama)

```rust
use askama::Template;
use crate::routes::Todo;

#[derive(Template)]
#[template(path = "base.html")]
pub struct Base {
    pub title: String,
    pub content: String,
}

#[derive(Template)]
#[template(path = "todo_list.html")]
pub struct TodoList {
    pub todos: Vec<Todo>,
}

#[derive(Template)]
#[template(path = "todo_item.html")]
pub struct TodoItem {
    pub todo: Todo,
}
```

### templates/todo_list.html (htmx)

```html
<ul id="todo-list" class="space-y-2">
{% for todo in todos %}
    {% include "todo_item.html" %}
{% endfor %}
</ul>
{% if todos.is_empty() %}
<p class="text-gray-500" id="empty-state">Nenhum item pendente.</p>
{% endif %}
```

### templates/todo_item.html

```html
<li id="todo-{{ todo.id }}" class="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm
    {% if todo.completed %}opacity-60{% endif %}">

    <input type="checkbox"
           hx-post="/htmx/todos/{{ todo.id }}/toggle"
           hx-target="#todo-{{ todo.id }}"
           hx-swap="outerHTML"
           {% if todo.completed %}checked{% endif %}
           class="w-5 h-5 cursor-pointer">

    <span class="flex-1 {% if todo.completed %}line-through text-gray-400{% endif %}">
        {{ todo.title }}
    </span>

    <button hx-delete="/htmx/todos/{{ todo.id }}"
            hx-target="#todo-{{ todo.id }}"
            hx-swap="delete"
            hx-confirm="Remover item?"
            class="text-red-500 hover:text-red-700 px-2">
        ✕
    </button>
</li>
```

## 3. Dockerfile (Rust multi-stage)

```dockerfile
# ---- Builder ----
FROM rust:1.80-slim-bookworm AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true

COPY . .
RUN touch src/main.rs
RUN cargo build --release

# ---- Runtime ----
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/rust-htmx-app /usr/local/bin/app

# Template dir
COPY templates/ /app/templates/

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["app"]
```

## 4. Dockerfile (Caddy)

```dockerfile
FROM caddy:builder AS builder
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:latest
COPY Caddyfile /etc/caddy/Caddyfile
COPY static/ /var/www/static/

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:2019/config/ || exit 1
```

## 5. Docker Compose

```yaml
version: "3.8"

services:
  caddy:
    build:
      context: .
      dockerfile: caddy/Dockerfile
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - caddy_data:/data
      - caddy_config:/config
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./static:/var/www/static:ro
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
    networks:
      - frontend
    depends_on:
      backend:
        condition: service_healthy

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    expose:
      - "3000"
    restart: unless-stopped
    networks:
      - backend
    environment:
      - DATABASE_URL=postgres://app:${DB_PASSWORD}@db:5432/app
      - RUST_LOG=rust_htmx_app=debug,tower_http=info
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 15s
      timeout: 3s
      retries: 5
      start_period: 10s

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - backend
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 10s
      timeout: 3s
      retries: 5

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - frontend
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'

volumes:
  caddy_data:
  caddy_config:
  postgres_data:
  prometheus_data:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

## 6. Prometheus Config

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 10s

scrape_configs:
  - job_name: 'caddy'
    static_configs:
      - targets: ['caddy:2019']

  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
```

## 7. .env

```bash
DB_PASSWORD=changeme_in_production
```

## 8. Migrations SQL

```sql
-- backend/migrations/001_create_todos.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_todos_created_at ON todos(created_at DESC);
```

## 9. Performance Tuning (Rust + Axum)

### Axum (no backend)

- `max_connections=50` no pool SQLx — ajustar conforme CPU/memória disponível
- `tokio` runtime multi-threaded (default)
- `tower-http` TraceLayer + CorsLayer com overhead mínimo
- Compressão já feita pelo Caddy; backend não precisa comprimir

### Caddy

- HTTP/3 via QUIC: UDP 443 exposto
- `flush_interval -1` para SSE (Server-Sent Events)
- `flush_interval -1` para WebSocket streaming
- Static files com `precompressed` e cache `immutable`
- CSP restritiva compatível com htmx

## 10. Deploy

```bash
# Build otimizado (Rust demora na primeira vez)
docker compose build --parallel

# Start
docker compose up -d

# Ver logs
docker compose logs -f caddy backend

# Testar HTTP/3
curl --http3 -I https://rust-htmx.example.com

# Testar htmx endpoint
curl -H "HX-Request: true" https://rust-htmx.example.com/htmx/todos

# Testar API
curl https://rust-htmx.example.com/api/todos

# Reload Caddy
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Benchmark (via hey/wrk)
hey -n 10000 -c 100 https://rust-htmx.example.com/api/health
```

## 11. Arquitetura htmx + Axum

```
Browser ──HTTPS/3──► Caddy ──HTTP/1.1──► Axum (Rust)
                         │
                         ├── /static/*  →  file_server (precompressed)
                         ├── /htmx/*    →  reverse_proxy (HTML parcial)
                         ├── /api/*     →  reverse_proxy (JSON REST)
                         ├── /ws/*      →  reverse_proxy (WebSocket)
                         └── /events/*  →  reverse_proxy (SSE)
```

**Fluxo htmx típico:**
1. Browser carrega página → Caddy serve HTML estático (ou Axum renderiza com Askama)
2. Usuário clica → htmx dispara request para `/htmx/*`
3. Caddy proxy para Axum → processa → retorna HTML parcial
4. htmx substitui DOM com a resposta → zero JS escrito manualmente
