# Performance e estabilidade — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Foco: N+1, Octane, health check,
> maintenance mode, timeouts, orçamentos e comportamento de processos long-lived.

---

## 1. Orçamentos antes de otimizações

Meça antes de mudar. Em cada endpoint, registre: número de queries, tempo total, p95,
taxa de cache hit, alocação de memória e profundidade de fila. Use Telescope em
staging (`samples/doc-telescope.md:301-467`) e Pulse em produção
(`samples/doc-pulse.md:176-257`). Optimizações sem medição são troca de gargalo, não
redução de latência.

Regras estáveis:

1. **Eager loading explícito** para relações usadas em loops; `withCount()` para contagens.
2. **Projeção**: selecione só colunas necessárias (`select([...])`) em listagens grandes.
3. **Paginação por cursor** para datasets enormes; `cursor()` / `lazy()` para streaming.
4. **`Cache::memo()`** quando o mesmo acesso ao store acontece várias vezes no request
   (`samples/doc-cache.md:380-421`).
5. **Nunca** carregar collection inteira para «contar» — use `count()` / `exists()`.

---

```php
// Padrão de listagem sem N+1: seleção estreita + contagem agregada + paginação por cursor
$posts = Post::query()
    ->select(['id', 'author_id', 'title', 'published_at'])
    ->with('author:id,name')
    ->withCount('comments')
    ->latest()
    ->cursorPaginate(25);

// Revalidação em segundo plano: o usuário não espera o recálculo do cache
$stats = Cache::flexible('dashboard.stats', [30, 300], fn () =>
    DB::table('orders')->selectRaw('count(*) as total, sum(amount) as revenue')->first()
);
```

```php
// Octane: estado por request, nunca acumulado em singleton
Context::add('request_id', $request->header('X-Request-Id', (string) Str::uuid()));
Config::set('app.locale', $request->user()?->locale ?? config('app.fallback_locale'));
```

```bash
php artisan octane:start --server=frankenphp --workers=8 --max-requests=500
php artisan queue:work redis --queue=payments --tries=3 --backoff=10 --max-jobs=500 --sleep=0
```

## 2. Octane: ganho de velocidade com responsabilidade

Octane suporta FrankenPHP, RoadRunner e Swoole (`samples/doc-octane.md:50-218`). A
aplicação é bootada uma vez e permanece em memória; isso elimina custo de bootstrap por
request, mas cria **estado compartilhado**.

Pontos críticos:

- **Injeção de container/request/config**: leia as seções de DI em
  `samples/doc-octane.md:438-572`. Não guarde `$request` em singleton.
- **Memory leaks**: evite acumular arrays em propriedades de singletons; use
  `Octane::table()` ou serviços com escopo explícito (`samples/doc-octane.md:573-597`).
- **`--max-requests`** e **`--max-execution-time`** reciclam workers
  (`samples/doc-octane.md:388-410`); configure para limitar degradação gradual.
- **`php artisan octane:reload`** após deploy (`samples/doc-octane.md:411-419`);
  supervisione com `octane:start --supervisor` em produção
  (`samples/doc-octane.md:266-282`).
- **`Context` por request**: limpe/redefina `request_id`, `tenant_id` no middleware —
  o `Context` sobrevive entre requests no mesmo worker.

> Regra: se um objeto é mutável e vive mais que um request, ele é um bug em potencial.
> Prefira `scoped` bindings, `defer`/`once` e dados imutáveis.

---

## 3. Estabilidade de deploy

- `health: '/up'` já configurado no skeleton (`samples/samples-bootstrap-app.php:8-13`).
- Use `php artisan down --retry=60` antes de mudanças incompatíveis e
  `php artisan up` depois; mantenha o health check atrás do load balancer.
- `php artisan optimize` agrega `config:cache`, `event:cache`, `route:cache` e
  `view:cache`; `optimize:clear` desfaz. Não use `env()` fora de `config/*` quando
  `config:cache` está ativo.
- Workers de fila devem ser reiniciados no deploy: processos `queue:work` mantêm código
  antigo em memória (`samples/doc-queues.md:2580-2607`).
- Em Octane, `octane:reload` é obrigatório (`samples/doc-octane.md:411-419`).

---

## 4. Timeouts, retries e circuit breaking

| Camada | Controle | Valor inicial sugerido | Racional |
|---|---|---|---|
| HTTP client | `timeout(10)->retry(3, 100)` | 10s / 3 tentativas | evita espera infinita |
| DB | statement timeout no driver | 5–30s por query | impede query corrida travar worker |
| Job | `#[Timeout(120)]` + `#[Tries(3)]` | 120s / 3 | `samples/doc-queues.md:1595-1606`, `samples/doc-queues.md:1780` |
| Fila | `#[Backoff([10, 30, 60])]` | backoff exponencial | `samples/doc-queues.md:2023` |
| Cache | TTL + `flexible` | janela curta de stale | `samples/doc-cache.md:264-277` |

Use `retry` apenas em operações **idempotentes**. Para operações de pagamento, use
chave de idempotência e `#[UniqueFor(...)]` (`samples/doc-queues.md:386`), não retry
cego. `#[FailOnTimeout]` torna timeout explicitamente falho
(`samples/doc-queues.md:1793-1804`), alimentando failed-job alerts.

---

## 5. Sinais de degradação e ações

| Sinal | Causa provável | Ação |
|---|---|---|
| p95 sobe, CPU estável | N+1 / cache miss | eager loading; `Cache::flexible`; índice |
| Fila cresce sem worker livre | job lento / timeout alto | `#[Timeout]`, escalar workers, separar fila |
| Memória sobe continuamente em Octane | singleton mutável | reciclar worker; revisar DI |
| `5xx` com `419` | CSRF em API ou HTTPS ausente | verificar `PreventRequestForgery` (`samples/doc-csrf.md:92-93`) |
| Cache hit ratio cai | mudança de prefixo no upgrade | definir `CACHE_PREFIX` (`samples/doc-upgrade-13.md:103-117`) |

---

## 6. Anti-padrões

- Otimizar com `config:cache` ativo em dev e esquecer que `env()` está congelado.
- Rodar `optimize` e esquecer de invalidar cache de views após deploy de Blade.
- Usar `queue:listen` em produção "porque recarrega sozinho" — é menos eficiente
  (`samples/doc-queues.md:2608-2619`).
- Deixar `APP_DEBUG=true` em produção: expõe stack traces e dados de exceção.
- Confiar em lock local em ambiente multi-nó (`samples/doc-cache.md:496-499`).

## Resumo de Pontos-Chave

- **Meça antes: queries, p95, hit ratio, fila, memória** — Telescope/Pulse dão a base.
- **Octane troca bootstrap por estado compartilhado**: nunca armazene request/tenant em singleton.
- **Recicle workers** com `--max-requests`/`--max-execution-time` e `octane:reload`.
- **Restart de `queue:work` no deploy** é obrigatório; código antigo fica em memória.
- **Timeouts e backoff explícitos** por job; retry só com idempotência.
- **`/up`, `down`/`up`, `optimize`** formam o ciclo de deploy estável.
- **Mudança de prefixo de cache no upgrade** é causa comum de queda de hit ratio.
