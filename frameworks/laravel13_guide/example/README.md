# Exemplo — Laravel 13.x

Aplicação mínima de exemplo que materializa os padrões do guia. Consulte
[`../00-indice.md`](../00-indice.md) para o índice completo e as fontes verificadas.

## Arquivos

| Arquivo | O que demonstra |
|---|---|
| `bootstrap/app.php` | `withRouting` + `withMiddleware` + `withExceptions` no 13 |
| `app/Http/Middleware/AssignRequestContext.php` | correlação `request_id`/`tenant_id` via `Context` |
| `app/Http/Controllers/PostController.php` | `#[Middleware]` + `#[Authorize]` (13+) e `JsonApiResource` |
| `app/Jobs/ChargePayment.php` | `#[Tries]`, `#[Backoff]`, `#[Timeout]`, `#[UniqueFor]` |
| `app/Providers/AppServiceProvider.php` | `Queue::route(...)` centralizado |
| `app/Ai/Agents/SalesCoach.php` | agente do AI SDK |
| `routes/web.php`, `routes/console.php` | rotas HTTP/comando sem `Kernel.php` |

## Uso

```bash
cp bootstrap/app.php /seu-app/bootstrap/app.php   # conferir antes de copiar
php artisan route:list
php artisan test
```

Os trechos são **ilustrativos e derivados** das APIs documentadas; não são samples
verbatim e, por isso, não carregam citações `:linha`. A verificação de fatos vive nos
capítulos e em `samples/`.
