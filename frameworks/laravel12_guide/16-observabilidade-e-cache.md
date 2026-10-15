# Observabilidade e Cache Avançado — Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Foco em **integrar e operar**: Horizon (filas),
> Pulse e Telescope (monitoração), Redis e padrões de cache de produção.
> Cache básico e filas estão em `05-performance.md`.

---

## 1. Horizon (dashboard de filas Redis)

Requer filas em **Redis** (não compatível com Redis Cluster). Alternativa self-managed ao
Supervisor.

```bash
composer require laravel/horizon
php artisan horizon:install
php artisan horizon                 # inicia (produção: sob supervisão/daemon)
php artisan horizon:pause / :continue / :terminate
php artisan horizon:status
php artisan horizon:clear
php artisan horizon:forget
```

```php
// config/horizon.php
'environments' => [
    'production' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['default', 'emails'],
            'balance' => 'auto',          // simple | auto | false
            'maxProcesses' => 10,
            'balanceMaxShift' => 1,
            'balanceCooldown' => 3,
        ],
    ],
    'local' => [
        'supervisor-1' => ['maxProcesses' => 3],
    ],
    '*' => ['supervisor-1' => ['maxProcesses' => 3]],
],
```

- Dashboard em `/horizon`; autorize com o gate `viewHorizon`
  (`Gate::define('viewHorizon', fn ($user) => $user->isAdmin());`).
- Tags: implemente `tags()` no job para agrupar (`['user:'.$this->user->id]`).
- Notificações de fila longa e métricas configuráveis no `horizon.php`.
- **Deploy**: `php artisan horizon:terminate` (os supervisores reiniciam com o código novo).

---

## 2. Pulse (métricas de aplicação)

Requer MySQL/MariaDB/PostgreSQL.

```bash
composer require laravel/pulse
php artisan vendor:publish --provider="Laravel\Pulse\PulseServiceProvider"
php artisan migrate
```

- Dashboard em `/pulse`; por padrão só em `local`. Autorize com o gate `viewPulse`:

```php
Gate::define('viewPulse', fn (User $user) => $user->isAdmin());
```

- Publique o dashboard para customizar (`--tag=pulse-dashboard`):
  `<x-pulse full-width>`, `<livewire:pulse.slow-queries expand />`, `<livewire:pulse.usage cols="4" rows="2" />`.
- `config/pulse.php` para recorders, retenção e diferentes conexões de banco.

---

## 3. Telescope (debug em desenvolvimento)

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

- Dashboard em `/telescope`. Ideal em `local`.
- **Local-only**: remova o provider de `bootstrap/providers.php` e registre condicionalmente:

```php
public function register(): void
{
    if ($this->app->environment('local') && class_exists(\Laravel\Telescope\TelescopeServiceProvider::class)) {
        $this->app->register(\Laravel\Telescope\TelescopeServiceProvider::class);
        $this->app->register(TelescopeServiceProvider::class);
    }
}
```

- Bloqueie o auto-discovery em `composer.json`:
  `"extra": { "laravel": { "dont-discover": ["laravel/telescope"] } }`.
- Watchers: requests, exceptions, logs, queries, jobs, mail, notifications, cache, schedule,
  views, Redis, HTTP client, gates, models, dumps.

> Use **Telescope** para depurar eventos individuais e **Pulse** para a visão agregada.
> Em produção, proteja ambos com gate e/ou mantenha desabilitados.

---

## 4. Redis

```php
// config/database.php → conexões 'default' e 'cache' (bancos separados)
'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'),   // ou predis
    'options' => ['prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME')).'_')],
    'default' => ['host' => env('REDIS_HOST', '127.0.0.1'), 'port' => env('REDIS_PORT', '6379'), 'database' => env('REDIS_DB', '0')],
    'cache'   => ['host' => env('REDIS_HOST', '127.0.0.1'), 'port' => env('REDIS_PORT', '6379'), 'database' => env('REDIS_CACHE_DB', '1')],
],
```

```php
use Illuminate\Support\Facades\Redis;

Redis::set('k', 'v');
Redis::get('k');
Redis::incr('counter');
Redis::connection('cache')->set('k', 'v');

// pipeline / transaction
Redis::pipeline(fn ($pipe) => $pipe->set('a', 1)->set('b', 2));

// pub/sub
Redis::publish('channel', $payload);
Redis::subscribe(['channel'], fn (string $msg) => /* ... */);
Redis::psubscribe(['chan.*'], fn (string $msg, string $pattern, string $channel) => /* ... */);
```

- Use Redis para **cache**, **sessão**, **filas**, **rate limiting**, **locks** e **broadcasting**.
- `phpredis` (extensão) é mais rápido; `predis` é puro PHP (configure `REDIS_CLIENT`).
- Cluster: `clusters` em `config/database.php`; failover nativo.

---

## 5. Cache de produção: padrões

```php
use Illuminate\Support\Facades\Cache;

// básico
Cache::get('k'); Cache::put('k', $v, 60); Cache::remember('k', 60, fn () => compute());
Cache::add('k', $v, 60); Cache::increment('k'); Cache::pull('k'); Cache::forget('k');

// stale-while-revalidate: serve stale e recalcula em background
Cache::flexible('homepage', [5, 10], fn () => view('home')->render());

// memoização por request/job (evita hits repetidos)
Cache::memo()->get('config');
Cache::memo('redis')->get('config');

// tags (somente redis/memcached)
Cache::tags(['users', 'team:1'])->remember('users.list', 60, fn () => User::all());
Cache::tags(['team:1'])->flush();

// locks distribuídos
$lock = Cache::lock('process:report', 10);
if ($lock->get()) { /* ... */ $lock->release(); }
Cache::lock('x', 10)->block(5, fn () => /* auto-release */);

// failover: se o cache cair, delega ao próximo store
'cache' => ['driver' => 'failover', 'stores' => ['redis', 'database']],
```

Boas práticas:

- Prefixe chaves e invalide por **tags** ou por versão.
- `Cache::flexible` para páginas/dados tolerantes a staleness; `remember` para o resto.
- `memo` para valores lidos várias vezes no mesmo request/job.
- Nunca cachear dados por usuário sem incluir o `user_id` na chave.
- Em deploys, `php artisan cache:clear` (ou invalide por versão de chave).

---

## Resumo de Pontos-Chave

- **Horizon** = filas Redis com dashboard e balanceamento; `horizon:terminate` no deploy.
- **Pulse** = métricas agregadas (`/pulse`, gate `viewPulse`); **Telescope** = debug local.
- **Redis** = cache/sessão/fila/rate-limit/lock/broadcast; separe os bancos (`default` vs `cache`).
- Cache de produção: `remember`, **`flexible`** (SWR), **`memo`**, **tags** (só Redis/Memcached),
  **locks atômicos** e **failover** entre stores.
