# Dossiê Laravel 12.x — Uso Efetivo

Dossiê técnico, em português, otimizado para o uso **EFETIVO** do Laravel, com foco estrito na
série **12.x**. Todo o conteúdo foi derivado da documentação oficial do branch `12.x`
(`@laravel12/`) e revisado para **não** incluir recursos de versões posteriores (13+).

> **Regra de ouro deste dossiê:** o que não existe no 12.x está marcado como "não existe no 12" e
> serve apenas como contra-exemplo. Não use esses recursos em código 12.x.

## Requisitos e política de suporte

- **PHP 8.2, 8.3, 8.4 e 8.5**. O framework segue SemVer; use `^12.0` no Composer.
- Lançamento: 24/02/2025 · Bug fixes até 13/08/2026 · Security fixes até 24/02/2027.
- Laravel 12 é uma "maintenance release" sobre o 11: poucas quebras, foco em novos starter kits
  (React, Svelte, Vue, Livewire) e em melhorias contínuas de DX.

## Mapa dos tópicos pedidos → arquivos

| Foco solicitado | Arquivo | Conteúdo central |
|---|---|---|
| Programação funcional | [`01-programacao-funcional.md`](01-programacao-funcional.md) | Collections, higher-order messages, `LazyCollection`/`cursor()`, helpers globais (`data_get`, `tap`, `value`, `retry`, `defer`, `once`, `rescue`), `Pipeline`, `Str`/`Stringable`/`Arr`/`Number`, `Lottery`, `Sleep`, `Timebox`, `Uri` |
| POO / Arquitetura | [`02-poo-arquitetura.md`](02-poo-arquitetura.md) | Service Container, DI, atributos de container, Facades, Contracts, Service Providers, `bootstrap/app.php`, estrutura de diretórios, request lifecycle |
| Segurança | [`03-seguranca.md`](03-seguranca.md) | Auth (guards/providers), Sanctum (tokens + SPA), Authorization (Gates/Policies), Encryption (AES-256-CBC + rotação `APP_PREVIOUS_KEYS`), Hashing (bcrypt/argon), CSRF, Validation, Mass assignment, Session, rate limiting, trusted hosts/proxies |
| Logs & Erros | [`04-logs-erros.md`](04-logs-erros.md) | `config/logging.php`, canais/stacks/levels, Pail, `withExceptions` (`report`/`render`/`context`/`dontReport`/`respond`), exceções renderable/reportable, error pages |
| Performance | [`05-performance.md`](05-performance.md) | Eager loading, `withCount`, `cursor()`/`lazy()`, Cache (`flexible`, `memo`, tags, locks), Queues (chains, batches, rate limit, unique), Octane, `optimize`/cache de deploy |
| Boas-práticas | [`06-boas-praticas.md`](06-boas-praticas.md) | Fat models / thin controllers, serviços/ações, Form Requests, Policies, API Resources, Events/Jobs, strictness do Eloquent, organização e testabilidade |
| Configurabilidade estrutural | [`07-configurabilidade-estrutural.md`](07-configurabilidade-estrutural.md) | `config()`, `.env`/`env()`, `env:encrypt`/`env:decrypt`, provider registration, **Package Auto-Discovery**, `bootstrap/app.php`, maintenance mode, Vite |
| Sintaxe / Tipagem | [`08-sintaxe-tipagem.md`](08-sintaxe-tipagem.md) | PHP 8.2–8.5 (readonly, enums, union/intersection/DNF, property hooks), rotas, controllers, requests, responses, middleware, groups, commands, scheduling |
| Blade | [`09-blade.md`](09-blade.md) | Herança, diretivas, loops/`$loop`, components & slots (classe e anônimos), `@class`/`@style`/`@checked`, stacks, `@inject`, `@can`, `@error`, XSS, custom directives, fragments |
| Integração com Database | [`10-database.md`](10-database.md) | Query Builder, transações, Eloquent, relacionamentos (incl. polimórficos), mutators/casts, scopes (`#[Scope]`), **API Resources**, paginação (incl. cursor), migrations, seeds/factories, soft deletes, testes |
| Proxy | [`11-proxy.md`](11-proxy.md) | `Illuminate\Http\Middleware\TrustProxies`, `trustProxies(at:, headers:)`, `TrustHosts`, `$request->ip()`/`isSecure()` correto atrás de LB |
| Lint / fmt / qualidade | [`12-qualidade-e-pint.md`](12-qualidade-e-pint.md) | **Pint** (presets, `pint.json`, `--test`/`--dirty`/`--diff`, CI), `.editorconfig`, **Larastan/PHPStan**, Rector, IDE Helper |
| Testes | [`13-testes.md`](13-testes.md) | Feature/unit, HTTP/JSON, banco/factories, console, mocking/fakes/tempo, **Dusk** (browser) |
| API & auth avançada | [`14-api-e-autenticacao.md`](14-api-e-autenticacao.md) | **Sanctum** (tokens + SPA), **Fortify** (2FA), **Passport**, **Socialite**, verificação de e-mail, reset de senha, **Precognition**, **Pennant** |
| Comunicação | [`15-comunicacao.md`](15-comunicacao.md) | **Mail**, **Notifications** (multicanal), **Broadcasting/Reverb**, **HTTP Client**, **Process** |
| Observabilidade & cache avançado | [`16-observabilidade-e-cache.md`](16-observabilidade-e-cache.md) | **Horizon**, **Pulse**, **Telescope**, **Redis**, `Cache::flexible`/`memo`/tags/locks/failover |
| Busca & Eloquent avançado | [`17-busca-e-eloquent-avancado.md`](17-busca-e-eloquent-avancado.md) | Full-text (`whereFullText`), vetorial (pgvector + AI SDK), **Scout**, Eloquent Collections, serialização, URLs, MongoDB |
| Ferramentas & starter kits | [`18-ferramentas-e-starter-kits.md`](18-ferramentas-e-starter-kits.md) | **Sail**, Valet, Homestead, **Envoy**, **Folio**, pacotes, **Vite**, starter kits (React/Vue/Svelte/Livewire/Inertia) |
| Deploy & escala | [`19-deploy-e-escala.md`](19-deploy-e-escala.md) | `optimize`/`reload`, health check, **Octane** (FrankenPHP), **Concurrency**, operação de filas, escala horizontal |
| IA & billing | [`20-ia-e-billing.md`](20-ia-e-billing.md) | **AI SDK** (agentes/embeddings), **Boost/MCP**, **Prompts**, **Cashier** (Stripe/Paddle) |

## Fronteiras de versão que mais causam confusão (memorize)

- **Bootstrap**: não existe mais `app/Http/Kernel.php`, `app/Console/Kernel.php` nem
  `app/Exceptions/Handler.php`. Tudo é configurado em **`bootstrap/app.php`** via
  `withRouting`, `withMiddleware`, `withProviders`, `withEvents`, `withSchedule` e `withExceptions`.
- **Providers**: registrados em **`bootstrap/providers.php`** (não em `config/app.php`).
- **Rotas**: por padrão só `routes/web.php` e `routes/console.php`. `routes/api.php` só existe após
  `php artisan install:api` (instala Sanctum); `routes/channels.php` após `install:broadcasting`.
- **Middleware**: o grupo `web`/`api` e aliases são declarados em `bootstrap/app.php`, não em
  `Kernel.php`. `TrustProxies` vive em `Illuminate\Http\Middleware\TrustProxies`.
- **Scheduling**: tarefas agendadas ficam em `routes/console.php` (facade `Schedule`) ou via
  `withSchedule` no `bootstrap/app.php` — não existe `app/Console/Kernel.php::schedule()`.
- **Eloquent atributos (12+)**: `#[Scope]`, `#[ScopedBy]`, `#[ObservedBy]`, `#[UseFactory]`,
  `#[UsePolicy]`, `#[UseResource]`, `#[UseResourceCollection]`, `#[CollectedBy]`.
- **Container atributos (11+)**: `#[Bind]`, `#[Singleton]`, `#[Scoped]`, `#[Storage]`, `#[Auth]`,
  `#[Cache]`, `#[Config]`, `#[Context]`, `#[DB]`, `#[Give]`, `#[Log]`, `#[RouteParameter]`,
  `#[Tag]`, `#[CurrentUser]`.
- **Hashing**: bcrypt **e** argon/argon2id; `HASH_DRIVER`, `config/hashing.php`; `Hash::check`
  valida o algoritmo (desligue com `HASH_VERIFY=false`).
- **Criptografia**: AES-256-CBC (chave `APP_KEY`) + rotação graciosa via `APP_PREVIOUS_KEYS`.
- **Cache**: `Cache::remember`, `Cache::flexible` (stale-while-revalidate) e `Cache::memo`
  (memoização por request/job) existem; tags não funcionam em `file`/`database`/`dynamodb`.
- **Blade**: `@csrf`, `@error`, `@canany`, `@class`, `@style`, `@checked`, `@selected`
  existem. `@use`, `@context`, `@session`, `@includeIsolated`, `@pushOnce` também.
- **`php artisan optimize`** existe e agrega `config:cache`, `event:cache`, `route:cache`,
  `view:cache`. `optimize:clear` limpa tudo.
- **Deploy**: `php artisan reload` recarrega serviços de longa duração; health check em `/up`.
- **Delete após 12**: *não* use APIs do 13+; *não* procure `web.php` com `Route::apiResource`
  mágico sem `install:api`.

## Como usar este dossiê

1. Comece pelo arquivo do tópico que você vai tocar no dia. Cada um tem "Resumo de Pontos-Chave" no fim.
2. Antes de copiar qualquer snippet, confira a nota de versão no topo do arquivo.
3. Para dúvidas transversais (ex.: "como tipar um controller que usa eager loading e autorização?"),
   cruze `08-sintaxe-tipagem.md` + `10-database.md` + `03-seguranca.md`.
4. Em produção, aplique `05-performance.md` (cache de rotas/config/views + `optimize`) e
   `07-configurabilidade-estrutural.md` (cuidado com `env()` após `config:cache`).

## Estrutura de pastas deste dossiê

```
laravel12_guide/
├── 00-indice.md                         (este arquivo)
├── 01-programacao-funcional.md
├── 02-poo-arquitetura.md
├── 03-seguranca.md
├── 04-logs-erros.md
├── 05-performance.md
├── 06-boas-praticas.md
├── 07-configurabilidade-estrutural.md
├── 08-sintaxe-tipagem.md
├── 09-blade.md
├── 10-database.md
├── 11-proxy.md
├── 12-qualidade-e-pint.md
├── 13-testes.md
├── 14-api-e-autenticacao.md
├── 15-comunicacao.md
├── 16-observabilidade-e-cache.md
├── 17-busca-e-eloquent-avancado.md
├── 18-ferramentas-e-starter-kits.md
├── 19-deploy-e-escala.md
├── 20-ia-e-billing.md
├── SKILL.md
├── VERSION
└── example/                             (amostra de app Laravel 12)
```

> Fonte: documentação oficial Laravel 12.x (`@laravel12/`). Toda afirmação de API foi conferida
> contra essa base; recursos de versões posteriores foram deliberadamente excluídos ou sinalizados.
