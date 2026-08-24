# Dossiê Laravel 5.5.50 — Uso Efetivo

Dossiê técnico, em português, otimizado para o uso **EFETIVO** do Laravel, com foco estrito na
versão **5.5.50 (LTS)**. Todo o conteúdo foi derivado da documentação oficial completa de 5.5
(`@laravel5.5/`) e revisado para **não** incluir recursos de versões posteriores (5.6, 5.7, 5.8, 6, 7, 8...).

> **Regra de ouro deste dossiê:** o que não existe no 5.5.50 está marcado como "não existe no 5.5"
> e serve apenas como contra-exemplo. Não use esses recursos em código 5.5.

## Mapa dos tópicos pedidos → arquivos

| Foco solicitado | Arquivo | Conteúdo central |
|---|---|---|
| Programação funcional | [`01-programacao-funcional.md`](01-programacao-funcional.md) | Collections, higher-order messages, helpers funcionais (`optional`, `data_get`, `tap`, `value`, `with`, `retry`), pipes, `when`/`unless` |
| POO / Arquitetura | [`02-poo-arquitetura.md`](02-poo-arquitetura.md) | Service Container, DI, Facades, Contracts, Service Providers (deferrable), estrutura de diretórios |
| Segurança | [`03-seguranca.md`](03-seguranca.md) | Auth (guards), Authorization (Gates/Policies), Encryption (AES-256-CBC), Hashing (bcrypt), CSRF, Validation, Mass Assignment, Session |
| Logs & Erros | [`04-logs-erros.md`](04-logs-erros.md) | Log em `config/app.php` (5.5), níveis, Handler `report()`/`render()`, exceções renderable/reportable, error pages |
| Performance | [`05-performance.md`](05-performance.md) | Eager loading, `cursor()` (Generator), Cache/Redis, Queues (chaining, rate limit), comandos de cache de deploy |
| Boas-práticas | [`06-boas-praticas.md`](06-boas-praticas.md) | Fat models / thin controllers, Form Requests, Service Providers, Contracts, organização, testabilidade |
| Configurabilidade estrutural | [`07-configurabilidade-estrutural.md`](07-configurabilidade-estrutural.md) | `config()`, `.env`/`env()`, providers, **Package Auto-Discovery (5.5)**, estrutura de pastas, maintenance mode |
| Sintaxe correta | [`08-sintaxe-tipagem.md`](08-sintaxe-tipagem.md) | Rotas, controllers (resource/single-action), requests, responses, middleware, groups |
| Tipagem | [`08-sintaxe-tipagem.md`](08-sintaxe-tipagem.md) | Scalar/return types, `?Tipo` e `void` (PHP 7.1), DocBlocks para union types; o que NÃO existe (arrow fns, typed props) |
| Blade | [`09-blade.md`](09-blade.md) | Herança, diretivas, loops/`$loop`, components & slots (5.5), `@each`, stacks, `@inject`, escaping/XSS, custom directives |
| Integração com Database | [`10-database.md`](10-database.md) | Query Builder, transações, Eloquent, relacionamentos (incl. polimórficos), mutators/casts, **API Resources (5.5)**, paginação, migrations, seeds, soft deletes, testes |
| Proxy | [`11-proxy.md`](11-proxy.md) | `TrustProxies` (Fideloper, ship default no 5.5), `$proxies`/`$headers`, `setTrustedProxies`, HTTPS/IP real atrás de LB |

## Fronteiras de versão que mais causam confusão (memorize)

- **Logs:** no 5.5 a config é em `config/app.php` (`log`, `log_level`, `log_max_files`). Não existe
  `config/logging.php` nem *log channels* (isso é 5.6+). Retenção rotativa = `log_max_files`, não `days`.
- **Hashing:** só **bcrypt** no 5.5. Argon2 é 5.6+.
- **Criptografia:** AES-256-CBC (chave `APP_KEY`).
- **Blade:** `@csrf` é 5.6+; no 5.5 use `{{ csrf_field() }}`. `@error` é 5.8+. `@component`/`@slot` e
  `Blade::if` **existem** no 5.5; `Blade::component()` (alias) **não** (5.6+).
- **E-mail:** não há verificação de e-mail nativa no 5.5 (5.7+).
- **Collections:** são **eager** (avaliação imediata). *Lazy Collections* são 6+. `cursor()` retorna
  um `Generator` do PHP, não uma `LazyCollection`.
- **PHP:** 5.5 roda em **PHP 7.0/7.1** → scalar type hints, return types, `?Tipo` (nullable) e `void`
  existem; arrow functions (`fn =>`), typed properties, union types e `mixed` **não** (7.4 / 8.0+).
- **Comandos removidos no 5.5:** `php artisan optimize` foi removido. Use `route:cache`, `config:cache`,
  `view:cache`. `event:cache` não existe no 5.5.
- **Novidades confirmadas do 5.5 presentes no dossiê:** `Route::view`/`Route::redirect`, API Resources
  (`Resource`/`ResourceCollection`), Eloquent `cursor()`, Package Auto-Discovery, `TrustProxies` embutido,
  exceções renderable/reportable, Blade components/slots e `Blade::if`.

## Como usar este dossiê

1. Comece pelo arquivo do tópico que você vai tocar no dia. Cada um tem "Resumo de Pontos-Chave" no fim.
2. Antes de copiar qualquer snippet, confira a nota de versão no topo do arquivo.
3. Para dúvidas transversais (ex.: "como tipar um controller que usa eager loading e autorização?"),
   cruze `08-sintaxe-tipagem.md` + `10-database.md` + `03-seguranca.md`.
4. Em produção, aplique `05-performance.md` (cache de rotas/config/views) e `07-configurabilidade-estrutural.md`
   (cuidado com `env()` após `config:cache`).

## Estrutura de pastas deste dossiê

```
laravel_guide/55/
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
└── 11-proxy.md
```

> Fonte: documentação oficial Laravel 5.5 (`@laravel5.5/`). Toda afirmação de API foi conferida contra
> essa base; recursos de versões posteriores foram deliberadamente excluídos ou sinalizados.
