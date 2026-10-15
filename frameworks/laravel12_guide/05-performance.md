# Performance no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Eager loading, streaming, cache, filas, Octane e
> cache de deploy. Foco no que dá ganho real de produção.

---

## 1. Banco de dados: elimine N+1

### 1.1 Eager loading

```php
// ❌ N+1: 1 query + N queries
foreach (Book::all() as $book) {
    echo $book->author->name;
}

// ✅ 2 queries no total
$books = Book::with('author')->get();
foreach ($books as $book) {
    echo $book->author->name;
}

// múltiplas relações e aninhamento
Book::with(['author', 'publisher'])->get();
Book::with('author.contacts')->get();
Book::with(['author' => ['contacts', 'publisher']])->get();

// colunas específicas (sempre inclua id + FK)
Book::with('author:id,name,book_id')->get();

// eager load por padrão
protected $with = ['author'];
```

### 1.2 `morphTo` com filhos

```php
$activities = ActivityFeed::query()
    ->with(['parentable' => function (MorphTo $morphTo) {
        $morphTo->morphWith([
            Event::class => ['calendar'],
            Photo::class => ['tags'],
            Post::class => ['author'],
        ]);
    }])->get();
```

### 1.3 Agregações sem carregar tudo

```php
Post::withCount('comments')->get();                 // comments_count
Post::withCount(['comments', 'likes'])->get();
Post::withSum('comments', 'votes')->get();
Post::withAvg('comments', 'rating')->get();
Post::withMin/withMax('comments', 'rating');
$post->loadCount('comments');                       // lazy eager loading
```

### 1.4 Rigidez contra N+1

```php
// AppServiceProvider::boot()
use Illuminate\Database\Eloquent\Model;

Model::preventLazyLoading(! app()->isProduction());
// ou tudo:
Model::shouldBeStrict(! app()->isProduction());
```

### 1.5 Streaming de grandes volumes

```php
User::cursor()                    // LazyCollection: 1 query, 1 modelo em memória
    ->filter(fn (User $u) => $u->id > 500)
    ->each(fn (User $u) => /* ... */);

User::query()->lazy()->each(...);          // LazyCollection (query builder)
User::query()->lazyById(100)->each(...);   // seguro com alterações concorrentes
User::chunk(100, fn ($users) => ...);      // chunks
User::chunkById(100, fn ($users) => ...);  // estável
```

> Nunca carregue "tudo" com `->get()` para processar em lote. Prefira `cursor`/`lazy`/`chunk`.

### 1.6 Índices e queries

- Indexe colunas de `where`, `order by`, `join` e chaves estrangeiras.
- Selecione só o necessário: `Post::select('id', 'title')->get()`.
- Evite `whereRaw` sem bindings; use `whereRaw('x = ?', [$v])`.
- Use `DB::listen()`/`toSql()` para inspecionar queries.

---

## 2. Cache

### 2.1 Uso básico

```php
use Illuminate\Support\Facades\Cache;

Cache::put('key', $value, 60);                 // 60 segundos
Cache::put('key', $value, now()->addMinutes(10));
Cache::put('key', $value);                      // forever
Cache::get('key', 'default');
Cache::get('key', fn () => compute());          // default lazy
Cache::has('key');
Cache::add('key', $value, 60);                  // só se não existir (atômico)
Cache::forever('key', $value);
Cache::forget('key');
Cache::increment('key'); Cache::decrement('key');
$v = Cache::pull('key');                        // get + forget
Cache::flush();                                 // cuidado: ignora prefixo
Cache::store('redis')->put('k', 'v', 600);      // store específico
cache('key'); cache(['k' => 'v'], 60);
```

### 2.2 remember / flexible / memo

```php
// remember
Cache::remember('users', 3600, fn () => DB::table('users')->get());
Cache::rememberForever('users', fn () => DB::table('users')->get());

// stale-while-revalidate (12)
Cache::flexible('users', [5, 10], function () {
    return DB::table('users')->get();
});  // 5s frescos, até 10s servindo stale enquanto recalcula em background

// memoização por request/job (12)
$value = Cache::memo()->get('key');       // 1º hit no store, depois memória
Cache::memo('redis')->get('key');
```

### 2.3 Tags e locks

```php
// tags só em redis/memcached (NÃO em file/database/dynamodb)
Cache::tags(['people', 'artists'])->put('John', $john, 3600);
Cache::tags(['people', 'artists'])->get('John');
Cache::tags(['people', 'authors'])->flush();

// locks atômicos distribuídos
$lock = Cache::lock('foo', 10);
if ($lock->get()) {
    // ...
    $lock->release();
}
Cache::lock('foo', 10)->get(fn () => /* auto-release */);
$lock->block(5);                          // espera até 5s
Cache::restoreLock('foo', $owner)->release();
```

### 2.4 Redis

```php
config('database.redis.default');
Redis::set('k', 'v'); Redis::get('k');
Redis::connection('cache');
Redis::eval($script, 1, 'key');
// use pipeline/transaction para lotes
```

> Escolha o cache driver em `config/cache.php`. Em produção, Redis é o padrão de performance.

---

## 3. Filas (Queues)

### 3.1 Job

```php
namespace App\Jobs;

use App\Models\Podcast;
use App\Services\AudioProcessor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessPodcast implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 120;
    public int $maxExceptions = 3;

    public function __construct(public Podcast $podcast) {}

    public function handle(AudioProcessor $processor): void
    {
        // trabalho
    }

    public function retryUntil(): \DateTime { return now()->addMinutes(10); }
    public function backoff(): array { return [1, 5, 10]; }
    public function uniqueId(): string { return (string) $this->podcast->id; }
}
```

### 3.2 Despacho

```php
ProcessPodcast::dispatch($podcast);
ProcessPodcast::dispatch($podcast)->onQueue('audio')->onConnection('redis');
ProcessPodcast::dispatch($podcast)->delay(now()->addMinutes(5));
ProcessPodcast::dispatchAfterResponse($podcast);   // após enviar a resposta
dispatch(new ProcessPodcast($podcast));
dispatch_sync(new ProcessPodcast($podcast));

// aplica dispatch() dentro de transação só após commit
ProcessPodcast::dispatch($podcast)->afterCommit();
```

### 3.3 Chaining e batching

```php
use Illuminate\Support\Facades\Bus;

Bus::chain([
    new ProcessPodcast($podcast),
    new OptimizePodcast($podcast),
])->catch(fn (Throwable $e) => /* ... */)->dispatch();

Bus::batch([
    new ImportRow($row1),
    new ImportRow($row2),
])
    ->then(fn (Batch $batch) => /* sucesso */)
    ->catch(fn (Batch $batch, Throwable $e) => /* falha */)
    ->finally(fn (Batch $batch) => /* sempre */)
    ->name('import')
    ->dispatch();

$batch = Bus::findBatch($batchId);
$batch->progress(); $batch->finished();
```

### 3.4 Rate limiting e middleware de job

```php
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\Middleware\WithoutOverlapping;

public function middleware(): array
{
    return [
        new WithoutOverlapping($this->podcast->id),
        new RateLimited('podcasts'),
    ];
}

// AppServiceProvider::boot()
RateLimiter::for('podcasts', fn (object $job) => Limit::perMinute(5)->by($job->podcast->id));
```

Outros middlewares úteis: `Skip`, `FailOnException`, `ThrottlesExceptions`,
`ThrottlesExceptionsWithRedis`, `WithoutOverlapping`. Unique jobs: implements `ShouldBeUnique`
(+ `uniqueFor`), ou use `WithoutOverlapping`.

### 3.5 Worker

```bash
php artisan queue:work --queue=high,default --tries=3 --timeout=120
php artisan queue:listen
php artisan queue:restart        # recarrega workers após deploy
php artisan queue:failed
php artisan queue:retry all
php artisan queue:prune-failed --hours=48
```

- Use **Supervisor** (ou Horizon) para manter `queue:work` vivo.
- **Horizon** para métricas/auto-scaling com Redis.
- Em produção, `queue:work` (daemon) é mais eficiente que `queue:listen`.

---

## 4. Octane (opcional, alto ganho)

Mantém a aplicação em memória (Swoole/RoadRunner/FrankenPHP), evitando bootstrap por request.

```bash
composer require laravel/octane
php artisan octane:install
php artisan octane:start --workers=8 --task-workers=4
```

Cuidados:

- Use bindings **`scoped`** (não `singleton`) para estado por request.
- Evite guardar estado mutável em propriedades estáticas de serviços.
- Monitore **memory leaks** (Octane reinicia workers após N requests).
- Tarefas concorrentes: `Octane::concurrently([...])`.
- `octane:tick`/intervals e cache em memória (`Cache::store('octane')`).

---

## 5. Deploy: cache de otimização

```bash
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan event:cache
php artisan route:cache
php artisan view:cache

# atalho que faz tudo acima:
php artisan optimize

# limpar:
php artisan optimize:clear
```

- **`config:cache`**: `env()` só funciona dentro de `config/`. Nunca chame `env()` no runtime.
- **`route:cache`**: rotas são serializadas; closures de rota **não** podem ser cacheadas.
  Prefira controllers. Se precisar de closures, use `route:clear` (sem cache).
- **`view:cache`**: pré-compila Blade.
- **`event:cache`**: manifesto de listeners descobertos.
- Após deploy, recarregue serviços de longa duração:

```bash
php artisan reload           # workers, Reverb, Octane
php artisan queue:restart
```

- Health check em `/up` (configurável em `bootstrap/app.php`) reporta status.

---

## 6. Concorrência (11+)

```php
use Illuminate\Support\Facades\Concurrency;

[$users, $posts] = Concurrency::run([
    fn () => User::all(),
    fn () => Post::all(),
]);

// adiado (após a resposta)
Concurrency::defer([fn () => ..., fn () => ...]);
```

Útil para operações independentes e I/O-bound. Em Octane, aproveita melhor os workers.

---

## 7. Outras alavancas

- **Vite**: HMR rápido em dev; build otimizado em prod. `@vite(['resources/js/app.js'])`.
- **HTTP Client** com `->pool()` para requisições concorrentes.
- **`Cache::flexible`** para páginas/dados com tolerância a staleness.
- **Paginação** em vez de carregar tudo (`simplePaginate`/`cursorPaginate`).
- **Compressão/brotli** no servidor web (Nginx/FrankenPHP) e **OPcache** no PHP.
- **`Route::view`/`Route::redirect`** para páginas estáticas (cacheáveis).
- **`php artisan about`** e **Telescope/Pulse** para diagnóstico.

---

## Resumo de Pontos-Chave

- **Eager loading** + `withCount` eliminam N+1; ative `preventLazyLoading`/`shouldBeStrict` em dev.
- **`cursor`/`lazy`/`chunk`** para grandes volumes sem estourar memória.
- **Cache**: `remember`, **`flexible`** (SWR) e **`memo`**; tags só em Redis/Memcached; locks atômicos.
- **Filas**: `onQueue`, `delay`, chains, **batches**, `WithoutOverlapping`, `RateLimited`,
  `queue:work` sob Supervisor/Horizon.
- **Octane** reduz bootstrap — use `scoped` e cuidado com estado/leaks.
- Deploy: **`php artisan optimize`** (config/event/route/view) + `composer install
  --optimize-autoloader --no-dev`; depois `php artisan reload`.
- `env()` nunca no runtime após `config:cache`.
