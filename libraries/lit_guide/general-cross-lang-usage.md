# Uso Cross-Language de Componentes Lit via CDN

Componentes Lit são **HTML custom elements** — elementos nativos do browser. Isso significa que qualquer linguagem que produza HTML pode consumi-los. O backend vira puramente uma API; a UI fica completamente no frontend.

---

## Conceito

```
                         ┌──────────────────────┐
                         │   CDN (jsdelivr,     │
                         │   unpkg, próprio)    │
                         └──────┬──────────────-┘
                                │ <script type="module" src="...">
                                ▼
┌──────────────┐      ┌──────────────────┐      ┌──────────────┐
│  Servidor    │      │  Browser         │      │  Componentes │
│  (Rust/Go/   │──────▶  renderiza HTML  │──────▶  Lit         │
│   PHP/TS)    │      │  com tags        │      │  reativos    │
└──────────────┘      └──────────────────┘      └──────────────┘
     │                                                     │
     │ API JSON / REST / GraphQL                           │ interatividade
     └─────────────────────────────────────────────────────┘
```

### Vantagens

- **UI una, N backends** — escreve os componentes uma vez em Lit, usa de Rust, Go, PHP, TypeScript
- **Zero coupling** — backend não precisa saber que existe Shadow DOM, reactive properties, etc.
- **Troca de linguagem** sem trocar de UI — migre o backend sem tocar no frontend
- **Alternativa real a templates server-side** (Blade, Twig, Tera, html/template) — a UI vive no cliente, o backend só serve dados

---

## Publicação no CDN

```bash
# Build com Vite (formato ES module)
npm run build

# Publica no npm
npm publish

# Disponível via CDN:
# https://cdn.jsdelivr.net/npm/@my-ui/button@1/dist/button.js
# https://unpkg.com/@my-ui/button@1/dist/button.js
```

### Estrutura de Módulos

```
@my-ui/components/
├── dist/
│   ├── button.js
│   ├── dialog.js
│   ├── data-table.js
│   └── styles.css          # CSS global (tokens, reset, tipografia)
├── package.json
└── README.md
```

### Import Map Centralizado

```html
<script type="importmap">
{
  "imports": {
    "lit": "https://cdn.jsdelivr.net/npm/lit@3/+esm",
    "@my-ui/components/": "https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/"
  }
}
</script>
```

---

## TypeScript / JavaScript

Uso nativo — Lit foi feito para isso:

```typescript
// app.ts
import '@my-ui/components/dist/button.js';
import '@my-ui/components/dist/dialog.js';

const user = { name: 'Alice', role: 'admin' };

document.body.innerHTML = `
  <my-button variant="primary" @click=${() => console.log('click')}>
    Save
  </my-button>
  <my-dialog open>
    <p>Welcome, ${user.name}</p>
  </my-dialog>
`;
```

### Com Framework (React, Vue, Angular)

```tsx
// React 19+ (nativo)
function App() {
  return <my-button variant="primary" onchange={(e) => console.log(e.detail)}>Click</my-button>;
}
```

```vue
<!-- Vue 3 -->
<template>
  <my-button :variant="variant" @change="onChange">{{ label }}</my-button>
</template>
```

---

## PHP

### Sem Framework — Server-Side HTML

```php
<?php
// index.php
function render_page($user, $items) {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <script type="importmap">
        {
            "imports": {
                "lit": "https://cdn.jsdelivr.net/npm/lit@3/+esm",
                "@my-ui/": "https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/"
            }
        }
        </script>
        <script type="module" src="https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/button.js"></script>
        <script type="module" src="https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/data-table.js"></script>
    </head>
    <body>
        <my-navbar>
            <span slot="title">Dashboard</span>
            <my-button slot="actions" variant="primary" id="btn-new">
                + New Item
            </my-button>
        </my-navbar>

        <my-data-table
            id="table"
            data="<?= htmlspecialchars(json_encode($items), ENT_QUOTES, 'UTF-8') ?>"
        ></my-data-table>

        <script type="module">
            const btn = document.getElementById('btn-new');
            btn.addEventListener('click', () => {
                // interatividade puramente no cliente
                console.log('new item');
            });
        </script>
    </body>
    </html>
    <?php
}
```

### Laravel (Alternativa ao Blade)

Em vez de componentes Blade com PHP puro, use componentes Lit + API JSON:

```blade
{{-- resources/views/dashboard.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    @vite(['resources/js/app.ts'])  {{-- Vite carrega os componentes Lit --}}
</head>
<body>
    <my-app>
        <my-sidebar slot="sidebar">
            @foreach ($menus as $menu)
                <my-nav-item label="{{ $menu['label'] }}" icon="{{ $menu['icon'] }}"></my-nav-item>
            @endforeach
        </my-sidebar>

        <main slot="content">
            <my-data-table
                :items="{{ json_encode($users) }}"
                @change="handleChange"
            ></my-data-table>
        </main>
    </my-app>

    <script>
        // Os componentes Lit cuidam de toda a interatividade
        // O backend Laravel só precisa servir os dados iniciais e a API REST
    </script>
</body>
</html>
```

### Benefício sobre Blade

| Aspecto | Blade | Lit Components |
|---------|-------|----------------|
| Interatividade | Precisa de Alpine/Livewire/Vue | Nativa (eventos, props reativas) |
| Reuso entre projetos | Só PHP | Qualquer linguagem |
| Estado | Server-side (requer request) | Client-side (instantâneo) |
| Complexidade backend | Template engine + controllers | Só API JSON |
| Testes | PHPUnit + Laravel Dusk | Playwright/Cypress (qualquer backend) |

---

## Go

### Com `html/template` Padrão

```go
// main.go
package main

import (
    "html/template"
    "net/http"
    "encoding/json"
)

type PageData struct {
    Users []User
    Title string
}

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
    Role string `json:"role"`
}

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        users := []User{
            {ID: 1, Name: "Alice", Role: "admin"},
            {ID: 2, Name: "Bob", Role: "editor"},
        }
        usersJSON, _ := json.Marshal(users)

        tmpl := template.Must(template.ParseFiles("index.html"))
        tmpl.Execute(w, map[string]interface{}{
            "Title":     "Dashboard",
            "UsersJSON": string(usersJSON),
        })
    })
    http.ListenAndServe(":8080", nil)
}
```

```html
{{-- index.html --}}
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
    {
        "imports": {
            "lit": "https://cdn.jsdelivr.net/npm/lit@3/+esm",
            "@my-ui/": "https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/"
        }
    }
    </script>
</head>
<body>
    <my-app>
        <my-navbar slot="header">
            <span slot="title">{{.Title}}</span>
        </my-navbar>

        <my-data-table
            id="users-table"
            data='{{.UsersJSON}}'
        ></my-data-table>
    </my-app>

    <script type="module">
        import '@my-ui/components/dist/data-table.js';
        import '@my-ui/components/dist/button.js';

        document.getElementById('users-table').addEventListener('row-click', (e) => {
            console.log('Selected:', e.detail.row);
        });
    </script>
</body>
</html>
```

### Go + HTMX + Lit Components

HTMX para navegação, Lit para componentes complexos:

```go
// Rota HTMX — devolve HTML parcial com componentes Lit
http.HandleFunc("/users/list", func(w http.ResponseWriter, r *http.Request) {
    users := fetchUsers()
    usersJSON, _ := json.Marshal(users)

    // HTMX troca o conteúdo de #main com este HTML
    // Os componentes Lit hidratam automaticamente
    w.Write([]byte(fmt.Sprintf(`
        <my-data-table
            data='%s'
            page="%s"
        ></my-data-table>
    `, usersJSON, r.URL.Query().Get("page"))))
})
```

### Com `templ` (Componentes Go)

```go
// dashboard.templ
package pages

templ Dashboard(usersJSON string) {
    <!DOCTYPE html>
    <html>
        <head>
            <script type="importmap">
            {
                "imports": {
                    "lit": "https://cdn.jsdelivr.net/npm/lit@3/+esm",
                    "@my-ui/": "https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/"
                }
            }
            </script>
        </head>
        <body>
            <my-data-table data={ usersJSON }></my-data-table>
        </body>
    </html>
}
```

---

## Rust

### Com Tauri + Leptos / Dioxus / Yew

Componentes Lit vivem no HTML — qualquer framework Rust que renderize HTML pode usá-los:

```rust
// Tauri + Leptos
use leptos::*;

#[component]
fn App() -> impl IntoView {
    let users = vec![
        serde_json::json!({"id": 1, "name": "Alice"}),
        serde_json::json!({"id": 2, "name": "Bob"}),
    ];
    let users_json = serde_json::to_string(&users).unwrap();

    view! {
        <script type="importmap">
        {r#"{
            "imports": {
                "lit": "https://cdn.jsdelivr.net/npm/lit@3/+esm",
                "@my-ui/": "https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/"
            }
        }"#}
        </script>
        <script type="module" src="https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/data-table.js"></script>

        <my-data-table data={users_json}></my-data-table>
    }
}
```

```rust
// Tauri + Dioxus
use dioxus::prelude::*;

fn App(cx: Scope) -> Element {
    let users = serde_json::json!([
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"},
    ]);

    cx.render(rsx! {
        script { "type": "importmap", r#"{"imports":{"lit":"https://cdn.jsdelivr.net/npm/lit@3/+esm"}}"# }
        script { "type": "module", "src": "https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/data-table.js" }
        my_data_table { data: "{users}" }
    })
}
```

### Rust Servidor (Actix / Axum) + HTML

```rust
// Axum — servidor tradicional com templates
use axum::{response::Html, routing::get, Router};
use serde_json::json;

async fn dashboard() -> Html<String> {
    let users = json!([
        {"id": 1, "name": "Alice", "role": "admin"},
        {"id": 2, "name": "Bob", "role": "user"},
    ]);

    Html(format!(r#"
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
    {{
        "imports": {{
            "lit": "https://cdn.jsdelivr.net/npm/lit@3/+esm",
            "@my-ui/": "https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/"
        }}
    }}
    </script>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/data-table.js"></script>
</head>
<body>
    <my-data-table data='{users}'></my-data-table>
</body>
</html>
"#))
}
```

### Com Askama (Template Engine para Rust)

```rust
// templates/dashboard.html (Askama)
// Só HTML + placeholders — usa os mesmos componentes web

// lib.rs
#[derive(Template)]
#[template(path = "dashboard.html")]
struct DashboardTemplate {
    users_json: String,
}
```

```html
{{-- templates/dashboard.html --}}
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
    {
        "imports": {
            "lit": "https://cdn.jsdelivr.net/npm/lit@3/+esm",
            "@my-ui/": "https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/"
        }
    }
    </script>
</head>
<body>
    <my-data-table data='{{ users_json }}'></my-data-table>
</body>
</html>
```

### Tauri + Vanilla (sem framework Rust de UI)

```rust
// Tauri command — backend Rust puro, frontend Lit puro
#[tauri::command]
fn get_users() -> String {
    let users = vec![
        User { id: 1, name: "Alice".into() },
        User { id: 2, name: "Bob".into() },
    ];
    serde_json::to_string(&users).unwrap()
}
```

```html
<!-- frontend/index.html — Lit components puros -->
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
    {
        "imports": {
            "lit": "https://cdn.jsdelivr.net/npm/lit@3/+esm",
            "@my-ui/": "https://cdn.jsdelivr.net/npm/@my-ui/components@1/dist/"
        }
    }
    </script>
    <script type="module">
        import '@my-ui/components/dist/data-table.js';
        import { invoke } from '@tauri-apps/api/tauri';

        const table = document.getElementById('table');
        invoke('get_users').then(users => {
            table.data = JSON.parse(users);
        });
    </script>
</head>
<body>
    <my-data-table id="table"></my-data-table>
</body>
</html>
```

---

## Padrão Recomendado: Backend como API, Lit como UI

```
Arquitetura:
┌─────────────────────────────────────────────────────┐
│                   CDN (ou bundle estático)           │
│  @my-ui/button.js, @my-ui/data-table.js, ...         │
│  Lit runtime (compartilhado via importmap)            │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│          HTML Host (qualquer linguagem)              │
│                                                      │
│  <my-data-table                                       │
│    data='{ "items": [...] }'                         │
│    @select={handler}                                 │
│  >                                                   │
│    <my-button slot="actions">New</my-button>          │
│  </my-data-table>                                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│        Backend API (Rust / Go / PHP / TS)            │
│                                                      │
│  GET /api/users    → JSON                            │
│  POST /api/users   → JSON                            │
│  PUT /api/users/1  → JSON                            │
│  DELETE /api/users/1 → 204                           │
└─────────────────────────────────────────────────────┘
```

### Checklist para Adoção

1. **Publique os componentes Lit em um CDN** (npm + jsdelivr/unpkg)
2. **Configure importmap** no HTML para compartilhar `lit` runtime
3. **Backend serve HTML inicial** com dados serializados em atributos (`data='...'`)
4. **Backend expõe API REST/GraphQL** para operações CRUD
5. **Componentes Lit consomem dados** via atributos no SSR ou fetch no cliente
6. **Interatividade** — eventos customizados substituem formulários tradicionais

### Quando Usar vs. Template Engines

| Cenário | Template Engine (Blade/Tera/Twig) | Lit Components |
|---------|-----------------------------------|----------------|
| Página estática ou com pouco JS | ✅ | ⚠️ Overhead |
| SPA / Dashboard complexo | ❌ Livewire/HTMX necessário | ✅ Nativo |
| Equipe especializada em backend | ✅ | ⚠️ Requer frontend |
| Multiplos backends (ex: migração) | ❌ Acoplado à linguagem | ✅ Totalmente portável |
| Formulários simples | ✅ | ⚠️ Requer setup |
| Aplicação offline / PWA | ❌ | ✅ |
| Testes E2E | ✅ | ✅ |
| Performance inicial (FCP) | ✅ SSR direto | ⚠️ Depende de JS |

### Caso de Uso Real: Migração de Backend

```
Fase 1: PHP + Blade          →  Adiciona componentes Lit progressivamente
Fase 2: PHP + Blade + Lit    →  UI nova em Lit, legado em Blade
Fase 3: PHP API + Lit        →  Blade removido, backend vira API
Fase 4: Rust/Go + Lit        →  Backend trocado, UI intacta
```

Os componentes Lit **não sabem** nem precisam saber em que linguagem o backend é escrito. Eles só consomem JSON e emitem eventos.
