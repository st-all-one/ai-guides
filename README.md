# ai-guides

**Guias técnicos otimizados para consumo por IA**, com foco em implementação prática de ferramentas e projetos.

Repositório bilíngue (português/inglês) que reúne referências densas e diretas sobre tecnologias modernas de desenvolvimento *web* e sistemas — cada guia é projetado para ser usado como contexto por modelos de linguagem durante tarefas de programação.

## Estrutura

Os guias estão organizados por **categoria semântica**, para facilitar a busca:

| Pasta | Conteúdo |
|---|---|
| [`languages/`](./languages/) | Linguagens de programação e formatos de marcação |
| [`frameworks/`](./frameworks/) | Frameworks full-stack e web |
| [`libraries/`](./libraries/) | Bibliotecas de UI, templates, query builder e TUI |
| [`runtimes/`](./runtimes/) | Servidores e runtimes de execução |
| [`databases/`](./databases/) | Bancos de dados e persistência |
| [`protocols/`](./protocols/) | Protocolos, especificações e APIs |
| [`tooling/`](./tooling/) | Ferramentas de desenvolvimento, build, teste e agentes |
| [`web/`](./web/) | Temas transversais da plataforma web |
| [`ai/`](./ai/) | IA, agentes e modelos |

> Consulte também o [`INDEX.md`](./INDEX.md) para a lista completa de skills com nome, categoria, versão e caminho.

## Guias por categoria

### languages

| Guia | Versão | Descrição |
|---|---|---|
| [CSS](./languages/css_guide/) | Moderno (2026) | Grid, Subgrid, Flexbox, animações, seletores, tipografia, responsivo, performance |
| [HTML](./languages/html_guide/) | Living Standard (2025) | Tags, semântica, Web Components, formulários, acessibilidade, performance |
| [JavaScript](./languages/javascript_guide/) | ES2025 | ES6+, async/await, módulos, classes, metaprogramação, coleções |
| [PHP 7.2](./languages/php72_guide/) | 7.2 | Dossiê isolado — tipagem, POO, segurança, performance (somente ≤ 7.2) |
| [PHP 7.4](./languages/php74_guide/) | 7.4 | Dossiê isolado — arrow fns, typed properties, preloading (≤ 7.4) |
| [PHP 8.4](./languages/php84_guide/) | 8.4 | Dossiê isolado — enums, readonly, property hooks, JIT (≤ 8.4) |
| [Rust](./languages/rust_guide/) | 1.97.0 (Ed. 2024) | Ownership, async, concorrência, macros, FFI, testing, Cargo |
| [XML](./languages/web_xml_guide/) | 1.0 (2025) | XML, XPath, XSLT, EXSLT, OpenSearch, segurança, parsing |

### frameworks

| Guia | Versão | Descrição |
|---|---|---|
| [Fresh](./frameworks/fresh_guide/) | 2.x | Full-stack Deno — SSR, islands, routing, Vite, segurança |
| [Hono](./frameworks/hono_guide/) | 4.13.7 | Web Standards — roteamento, middleware, validação, RPC, JSX, deploy |
| [Laravel 5.5](./frameworks/laravel55_guide/) | 5.5.50 (LTS) | Eloquent, Blade, Service Container, segurança, performance |
| [Leptos](./frameworks/leptos_guide/) | 0.8 | Full-stack Rust — reatividade fina, SSR, islands, server functions |

### libraries

| Guia | Versão | Descrição |
|---|---|---|
| [Alpine.js](./libraries/alpine_js_guide/) | 3.15.12 | Reatividade, transições, plugins, integração com Rust |
| [Askama](./libraries/askama_guide/) | 0.16.0 | Templates type-safe para Rust, filtros, integração web |
| [daisyUI](./libraries/daisy_guide/) | 5 | Componentes, cores, layout — HTML e Leptos |
| [Eta](./libraries/eta_guide/) | 4.6.0 | Templates JS ESM — sintaxe, partials, layouts/blocks, segurança |
| [htmx 4](./libraries/htmx4_guide/) | 4 | Atributos, formulários, multi-target, migração v2, Rust/Axum |
| [Kysely](./libraries/kysely_guide/) | 0.29.5 | Query builder SQL type-safe para TypeScript |
| [Lit](./libraries/lit_guide/) | 3 | Web Components — Shadow DOM, reatividade, SSR, diretivas |
| [Ratatui](./libraries/ratatui_guide/) | 0.30 | TUIs em Rust — renderização, eventos, async, cache SQLite |

### runtimes

| Guia | Versão | Descrição |
|---|---|---|
| [Caddy](./runtimes/caddy_guide/) | 2.x | HTTPS automático, Caddyfile, proxy reverso, observabilidade |
| [NGINX](./runtimes/nginx_guide/) | 1.27.x | Config, HTTP/2-3, proxy, FastCGI, stream, hardening, tuning |

### databases

| Guia | Versão | Descrição |
|---|---|---|
| [Deno KV](./databases/deno_kv_guide/) | Deno 2.9.x | Chave-valor, transações OCC, índices, TTL, filas, watch |
| [PostgreSQL](./databases/postgres_guide/) | 18.4 | DDL, DML, MVCC, RLS, replicação, índices, backup, tuning |
| [SQLite](./databases/sqlite_guide/) | 3.53.0 | Compilação, WAL, FTS5, extensões, performance, migração |

### protocols

| Guia | Versão | Descrição |
|---|---|---|
| [HTTP + URI](./protocols/http_uri_guide/) | RFC 9110–9114 (2026) | HTTP/2, HTTP/3, caching, CORS, autenticação, cookies, segurança |
| [Redmine](./protocols/redmine_guide/) | API v5.0+ | API REST — issues, projetos, usuários, time entries, wiki |
| [WebMCP](./protocols/webmcp_guide/) | Experimental | Tools para agentes de IA na web — APIs imperativa e declarativa |

### tooling

| Guia | Versão | Descrição |
|---|---|---|
| [Git](./tooling/git_guide/) | — | Fluxo, bisect/debug, segurança, performance, workflow otimizado |
| [PI](./tooling/pi_guide/) | — | Configuração e extensão do agente PI — providers, skills, SDK |
| [Playwright](./tooling/playwrigth_guide/) | 1.x | Testes E2E em TypeScript (cenários administrativos) |
| [sniffCSS](./tooling/sniff_guide/) | 1.0.0 | Captura, diff e checks de estilo/acessibilidade (MCP + CLI) |
| [Vite](./tooling/vite_guide/) | 8 | Configuração, plugins, SSR, HMR, build, deployment |

### web

| Guia | Versão | Descrição |
|---|---|---|
| [PWA](./web/pwa_guide/) | Pós-2023 | Service Worker, manifest, offline, notificações, instalação |
| [Web Accessibility](./web/web_accessibility_guide/) | WCAG 2.2 AA + ARIA 1.2 | HTML semântico, ARIA, teclado, contraste, leitores de tela |
| [Web API](./web/web_api_guide/) | MDN v2.0 (2026) | Documentação de APIs — templates, macros, interdependências, padrões |
| [Web Performance](./web/web_performance_guide/) | 2.0.0 | Core Web Vitals, CRP, caching, lazy loading, RAIL |
| [Web Security](./web/web_security_guide/) | 2.0.0 (2026) | CSP, CORS, HSTS, WebAuthn, cookies, Privacy Sandbox, TLS 1.3 |

### ai

| Guia | Versão | Descrição |
|---|---|---|
| [RLM](./ai/rlm_guide/) | 1.0 | Recursive Language Model — contextos quase infinitos via REPL e sub-LLMs |

## Convenções de cada guia

Cada guia contém:

- um arquivo [`SKILL.md`](./USAGE.md#skillmd) otimizado para carregamento rápido por IA, com **frontmatter YAML** (`name`, `description`, `category`, `version`, `tags`, `license`);
- um arquivo [`VERSION`](./USAGE.md#version) com a versão de referência;
- arquivos numerados (`00-*`, `01-*`, …) que formam uma progressão lógica de consulta.

## Licença

MIT © 2026 st-all-one
