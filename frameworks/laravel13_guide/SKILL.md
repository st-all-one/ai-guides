---
name: laravel-13
description: Author correct Laravel 13.x code/config/architecture. Use when generating or reviewing Laravel 13 files (controllers, models, routes, Blade, migrations, providers, bootstrap/app.php, config, queues, AI agents). Enforces framework boundaries (PHP 8.3-8.5, Request Forgery protection, allow-listed cache serialization, JSON:API resources, vector search, queue attributes) and the 13.x feature set, including the 12→13 upgrade.
category: frameworks
version: "13.x"
tags: [laravel, php, eloquent, blade, service-container, facades, sanctum, jsonapi, ai-sdk, vector-search, octane, observability]
license: MIT
---

# SKILL: Laravel 13.x — Correct Dev / Config / Structure

Runs on **PHP 8.3, 8.4 and 8.5**. Released 2026-03-17; bug fixes until Q3 2027;
security fixes until 2028-03-17. Laravel 13 is a low-breakage annual release:
most applications upgrade with little application-code change, but defaults
were hardened (request forgery, cache/session serialization) and new first-party
primitives landed (AI SDK, JSON:API resources, vector search). All code below is
version-true for the 13.x branch; do not emit 12-only or 14+ APIs.

## FILE MAP (numbered files — load only what the task needs)

| Foco | Arquivo |
|---|---|
| Installation, PHP/Composer floor, skeleton, `composer.json`, local dev | `01-instalacao-e-fundamentos.md` |
| Application lifecycle, container, providers, attributes, `bootstrap/app.php` | `02-arquitetura-e-ciclo-de-vida.md` |
| `config/*`, `.env`, caches, env errors, directory config | `03-configuracao-e-ambiente.md` |
| Auth, authorization, CSRF/`PreventRequestForgery`, crypto, hashing, sessions, validation | `04-seguranca.md` |
| Logging channels/stacks, context, exceptions, error rendering | `05-logs-e-erros.md` |
| Horizon, Pulse, Telescope, tracing/correlation, instrumentation design | `06-telemetria-e-instrumentacao.md` |
| Eager loading, N+1, Octane, health, maintenance, timeouts, budgets | `07-performance-e-estabilidade.md` |
| Cache stores, `flexible`/`memo`/`touch`, queues, `Queue::route`, worker flags, jobs | `08-cache-e-filas.md` |
| Query Builder, Eloquent, migrations, relationships, transactions, strictness | `09-banco-e-eloquent.md` |
| JSON:API resources, relationships, sparse fieldsets, links, headers | `10-jsonapi-e-recursos.md` |
| AI SDK agents/tools/embeddings, Image/Audio, pgvector semantic search | `11-busca-semantica-e-ia.md` |
| Blade, components, Vite, `@context`, XSS, pagination views in 13 | `12-blade-e-frontend.md` |
| Sanctum, Fortify, Passport, Socialite, API versioning, throttling | `13-api-e-autenticacao.md` |
| PHPUnit 12 / Pest 4, HTTP/DB/console tests, fakes, Pint, Larastan | `14-testes-e-qualidade.md` |
| `optimize`, deploy, zero-downtime, Horizon/Octane supervision, runbooks | `15-deploy-e-operacao.md` |
| Complete 12→13 upgrade: dependencies, breaking changes, contracts, migration plan | `16-migracao-12-para-13.md` |
| Recipes and anti-patterns, decision tables, production checklists | `17-receitas-e-antipadroes.md` |

## PHP TYPING MATRIX (what you may use)

| Feature | PHP | Use in 13 |
|---|---|---|
| named args, constructor promotion, `match`, nullsafe | 8.0 | ✅ |
| enums, `readonly` props, `never`, first-class callable `f(...)` | 8.1 | ✅ |
| `readonly` classes, DNF `(A&B)|C`, `true`/`false`/`null` types | 8.2 | ✅ (still valid, but not the floor) |
| typed class constants, `#[\Override]`, `json_validate()`, `Randomizer` | 8.3 | ✅ (min) |
| property hooks, asymmetric visibility `public private(set)`, `new` w/o parens | 8.4 | ✅ if target 8.4 |
| pipe `|>`, `clone-with`, `#[\NoDiscard]` | 8.5 | ✅ if target 8.5 |
| **Removed:** `each()`, dynamic properties on non-`#[AllowDynamicProperties]` | 8.2 | ❌ |
| `symfony/polyfill-php85` defines `array_first`/`array_last` below 8.5 | — | prefer `Arr::first`/`Arr::last` |

Write to the **floor of your target** (8.3 unless you know otherwise).

## HARD VERSION BOUNDARIES (do NOT emit)

| Look for | 13 reality | Do |
|---|---|---|
| `app/Http/Kernel.php`, `app/Console/Kernel.php`, `app/Exceptions/Handler.php` | removed (11+) | `bootstrap/app.php` (`withRouting`/`withMiddleware`/`withExceptions`) |
| providers in `config/app.php` | moved (11+) | `bootstrap/providers.php` |
| `VerifyCsrfToken` / `ValidateCsrfToken` in new code | deprecated aliases in 13 | `PreventRequestForgery`; `preventRequestForgery(...)` |
| `$request->session()->put($obj)` with arbitrary objects | `serialization => 'json'` default | store arrays/scalars or allow-list classes |
| cache storing arbitrary PHP objects | `serializable_classes => false` default | list classes explicitly or cache arrays |
| `Queue::route` absent | new in 13 | central class→connection/queue routing |
| `#[Middleware]`, `#[Authorize]`, `#[Tries]`, `#[Backoff]`, `#[Timeout]`, `#[FailOnTimeout]` | new in 13 | declarative controllers/queue jobs |
| `Cache::touch`, `whereVectorSimilarTo`, `Str::toEmbeddings` | new in 13 | use for TTL extension / semantic search |
| `Cache::flexible`, `Cache::memo`, `#[Scope]`, `Concurrency`, `defer`/`once` | exist in 12+ | still valid in 13 |
| `routes/api.php` by default | only after `install:api` | `php artisan install:api` |
| `pagination::default` / `pagination::simple-default` view names | renamed in 13 | `pagination::bootstrap-3` / `pagination::simple-bootstrap-3` |
| `JobAttempted::$exceptionOccurred`, `QueueBusy::$connection` | renamed in 13 | `$exception`, `$connectionName` |
| `Container::call` resolving nullable class defaults | changed in 13 | `?Carbon $date = null` resolves to `null` |
| nested `withoutGlobalScope` inside `where()` closure | changed in 13 | call on outer builder; inner now removes globally |
| `AppServiceProvider::boot` instantiating a model during boot | disallowed in 13 | move logic outside boot cycle |
| PHP 8.2 target | unsupported in 13 | raise to 8.3+ |

## STRUCTURE

```
app/Models/             Eloquent models
app/Ai/Agents/          AI SDK agents (13+)
app/Services/ app/Actions/  business logic (DI targets)
app/Http/Controllers/   thin controllers; #[Middleware]/#[Authorize] (13+)
app/Http/Requests/      Form Requests
app/Http/Middleware/    middleware (PreventRequestForgery is framework-level)
app/Providers/          service providers
app/Console/Commands/   commands
app/Events/ app/Listeners/ app/Jobs/ app/Mail/ app/Notifications/
app/Policies/ app/Rules/ app/View/Components/
config/                 *.php — env() ONLY here
bootstrap/app.php       framework config (routing/middleware/exceptions/schedule/events)
bootstrap/providers.php app providers
routes/{web,console}.php (+ api.php/channels.php after install:*)
resources/{css,js,views}/ database/{migrations,seeders,factories}/
public/index.php tests/{Feature,Unit}/
samples/                byte-for-byte sources for every cited claim
```

## BOOTSTRAP (`bootstrap/app.php` — 13.x skeleton)

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // $middleware->preventRequestForgery(...); // 13+
        // $middleware->trustProxies(at: [...]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api', 'api/*') || $request->expectsJson(),
        );
    })->create();
```

## SECURITY DEFAULTS TO PRESERVE

- `session.serialization = 'json'`, `cache.serializable_classes = false` — do not flip to
  `'php'`/allow-all without a migration plan; see `16-migracao-12-para-13.md`.
- `PreventRequestForgery` verifies origin via `Sec-Fetch-Site` plus token; keep aliases only
  for legacy code being migrated.
- Secrets stay in `.env` and `config/*`; never log `APP_KEY`, tokens, or raw webhook bodies.
- Encryption: AES-256-CBC with `APP_KEY`; rotate with `APP_PREVIOUS_KEYS`.
- Hashing: bcrypt/argon2id; `Hash::check` validates algorithm (configurable).

## OBSERVABILITY DESIGN (see `05`/`06`/`07`)

- Structured logs with `Context` (request id, tenant, job id) on every entry.
- `withExceptions` for classification; JSON rendering for API routes; no stack traces in production responses.
- Pulse for aggregate SLIs, Telescope for local/staging diagnostics, Horizon for queue health.
- Budgets: query count, cache hit ratio, p95 latency, queue depth, failed-job rate.
- Never enable Telescope/Horizon dashboards publicly without auth middleware.

## DEPENDENCY FLOOR (composer.json — 13.x skeleton)

`php ^8.3`, `laravel/framework ^13.x`, `laravel/tinker ^3`, `pestphp/pest ^4` (if used),
`phpunit/phpunit ^12`, `laravel/boost ^2` (optional, upgrade tooling), `laravel/pint ^1`,
`laravel/pail ^1`. See `01-instalacao-e-fundamentos.md` and `16-migracao-12-para-13.md`.

See `00-indice.md` for the topic map and `17-receitas-e-antipadroes.md` for the
production checklist. Every factual claim in these files resolves to `samples/`
via `path:line` citations; `verify.py` checks them mechanically.
