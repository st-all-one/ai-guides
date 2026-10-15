# Configurabilidade Estrutural no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. `.env`, `config()`, providers, package discovery,
> `bootstrap/app.php`, maintenance mode, assets/Vite e health check.

---

## 1. Ambiente (`.env`) e `env()`

- Arquivo raiz `.env` (não commitado) gerado a partir de `.env.example`.
- `APP_ENV` determina o ambiente; pode carregar **`.env.{APP_ENV}`** se existir.
- Variáveis do `.env` são strings; valores reservados têm tipo:

| `.env` | resultado do `env()` |
|---|---|
| `true` / `(true)` | `(bool) true` |
| `false` / `(false)` | `(bool) false` |
| `empty` / `(empty)` | `''` |
| `null` / `(null)` | `null` |

```ini
APP_NAME="Minha App"
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost
```

```php
// SOMENTE dentro de config/*.php
'debug' => (bool) env('APP_DEBUG', false),

use Illuminate\Support\Facades\App;
App::environment();                  // 'local'
App::environment('local');
App::environment(['local', 'staging']);
```

### 1.1 Criptografia de `.env` (11+)

```bash
php artisan env:encrypt                 # gera .env.encrypted + chave
php artisan env:encrypt --key=...       # usa chave própria
php artisan env:encrypt --readable      # nomes visíveis, valores cifrados
php artisan env:encrypt --env=staging

php artisan env:decrypt                 # chave em LARAVEL_ENV_ENCRYPTION_KEY
php artisan env:decrypt --force
```

Isso permite commitar `.env.encrypted` com segurança.

---

## 2. `config()` e `Config`

```php
// ler
config('app.timezone');
config('app.timezone', 'Asia/Seoul');   // default
Config::get('app.timezone');

// escrever em runtime (não persiste)
config(['app.timezone' => 'America/Chicago']);
Config::set('app.timezone', 'America/Chicago');

// getters tipados (11+/12) — lançam se o tipo não casar
use Illuminate\Support\Facades\Config;
Config::string('app.name');
Config::integer('app.port');
Config::float('x.y');
Config::boolean('app.debug');
Config::array('database.connections');
Config::collection('x.list');
```

### 2.1 Comandos

```bash
php artisan about                    # visão geral de config/drivers/ambiente
php artisan about --only=environment
php artisan config:show database     # valores de um arquivo
php artisan config:cache             # cache único (produção)
php artisan config:clear
php artisan config:publish           # publica configs omitidas (cors, view, hashing...)
php artisan config:publish
php artisan config:publish --all
```

> **Regra de ouro:** após `config:cache`, **não** use `env()` no runtime (retorna `null`); use
> `config()`. `env()` só dentro dos arquivos de `config/`.

---

## 3. Service Providers e registro

Todos os providers do app em **`bootstrap/providers.php`**:

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
];
```

```php
// AppServiceProvider
public function register(): void
{
    // apenas bindings no container
    $this->app->singleton(PaymentGateway::class, fn () => new StripeGateway(config('services.stripe')));
}

public function boot(): void
{
    // macros, view composers, eventos, rotas, gates...
    Model::shouldBeStrict(! $this->app->isProduction());
}
```

Deferred providers: implemente `DeferrableProvider` + `provides()` para carregar só quando
necessário (ver `02-poo-arquitetura.md`).

---

## 4. Package Auto-Discovery

Pacotes declaram providers/facades no `extra.laravel` do `composer.json`; o Laravel registra
automaticamente:

```json
{
    "extra": {
        "laravel": {
            "providers": ["Barryvdh\\Debugbar\\ServiceProvider"],
            "aliases": { "Debugbar": "Barryvdh\\Debugbar\\Facade" }
        }
    }
}
```

Para desabilitar (no app consumidor):

```json
{
    "extra": {
        "laravel": {
            "dont-discover": ["barryvdh/laravel-debugbar"]
        }
    }
}
```

Ou:
```json
{ "extra": { "laravel": { "dont-discover": ["*"] } } }
```

> **12.x:** package discovery continua igual e é a forma recomendada de distribuir pacotes.

---

## 5. `bootstrap/app.php` — configuração do framework

```php
<?php

use Illuminate\Foundation\Application;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        apiPrefix: 'api',
        then: function () {
            Route::middleware('api')->prefix('webhooks')->name('webhooks.')
                ->group(base_path('routes/webhooks.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [App\Http\Middleware\EnsureUserIsSubscribed::class]);
        $middleware->api(prepend: [App\Http\Middleware\EnsureTokenIsValid::class]);
        $middleware->alias(['subscribed' => App\Http\Middleware\EnsureUserIsSubscribed::class]);
        $middleware->trustProxies(at: ['10.0.0.0/8']);
        $middleware->trustHosts(at: ['^example\.com$']);
        $middleware->redirectGuestsTo('/login');
        $middleware->redirectUsersTo('/panel');
        $middleware->validateCsrfTokens(except: ['stripe/*']);
        $middleware->throttleWithRedis();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ver 04-logs-erros.md
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('emails:send')->daily();
    })
    ->withEvents(discover: [__DIR__.'/../app/Domain/*/Listeners'])
    ->withProviders([App\Providers\DomainServiceProvider::class])
    ->create();
```

Métodos disponíveis: `withRouting`, `withMiddleware`, `withExceptions`, `withSchedule`,
`withEvents`, `withProviders`, `withCommands`, `configure`.

---

## 6. Maintenance mode

```bash
php artisan down
php artisan down --refresh=15          # header Refresh
php artisan down --retry=60            # header Retry-After
php artisan down --secret="TOKEN"      # bypass via URL /TOKEN
php artisan down --with-secret         # gera token automaticamente
php artisan down --render="errors::503"# pré-renderiza view
php artisan down --redirect=/          # redireciona tudo
php artisan up
```

Multi-servidor via cache:

```ini
APP_MAINTENANCE_DRIVER=cache
APP_MAINTENANCE_STORE=database
```

- Enquanto em manutenção, **nenhum job é processado**.
- View padrão: `resources/views/errors/503.blade.php`.
- Para zero-downtime, prefira plataformas gerenciadas (Laravel Cloud/Forge).

---

## 7. Assets e Vite

- `vite.config.js` na raiz; plugin `laravel-vite-plugin`.
- No layout: `@vite(['resources/css/app.css', 'resources/js/app.js'])`.
- Dev: `npm run dev` (HMR); Prod: `npm run build`.
- `@vite` resolve em produção pelo manifesto `public/build/manifest.json`.
- Vite desabilitado automaticamente em testes quando configurado.

```blade
<!DOCTYPE html>
<html>
<head>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
```

```js
// vite.config.js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [laravel({ input: ['resources/css/app.css', 'resources/js/app.js'], refresh: true })],
});
```

---

## 8. Health route

```php
->withRouting(
    web: __DIR__.'/../routes/web.php',
    commands: __DIR__.'/../routes/console.php',
    health: '/up',           // ou '/status'
)
```

Retorna `200` se a app bootou; a request dispara o evento `DiagnosingHealth`, permitindo checar
banco/cache em um listener (lance exceção se algo estiver errado).

---

## 9. Comandos Artisan (sintaxe)

```php
namespace App\Console\Commands;

use Illuminate\Console\Command;

class SendEmails extends Command
{
    protected $signature = 'emails:send {user} {--queue} {--force}';
    protected $description = 'Envia e-mails';

    public function handle(): int
    {
        $this->info('Enviando...');
        $this->newLine();
        $this->table(['Nome', 'Email'], [['Ana', 'ana@x.com']]);
        $bar = $this->output->createProgressBar(10);
        $bar->start(); /* ... */ $bar->advance(); $bar->finish();

        if ($this->option('queue')) { /* ... */ }
        $user = $this->argument('user');

        return self::SUCCESS;   // self::FAILURE
    }
}
```

```php
$this->call('emails:send', ['user' => 'Ana', '--queue' => true]);
$this->callSilently('emails:send');
```

- Comandos em `app/Console/Commands` são auto-descobertos.
- Closure commands ficam em `routes/console.php`.
- Suporte a **signal handling**: `$this->trap(SIGTERM, fn () => ...)`.
- Customize stubs: `php artisan stub:publish`.

---

## 10. Diretórios gerados sob demanda

`app/Events`, `app/Listeners`, `app/Jobs`, `app/Mail`, `app/Notifications`, `app/Policies`,
`app/Rules`, `app/Console` e `app/View/Components` **não existem** por padrão; são criados pelo
`make:*` correspondente.

---

## Resumo de Pontos-Chave

- `env()` **só** em `config/`; no runtime use `config()` (especialmente após `config:cache`).
- `.env` pode ser cifrado (`env:encrypt`/`env:decrypt`).
- Providers registrados em **`bootstrap/providers.php`**; bindings no `register()`, resto no `boot()`.
- **Package auto-discovery** via `extra.laravel` no Composer; opt-out com `dont-discover`.
- Toda configuração de framework vive em **`bootstrap/app.php`**.
- Maintenance mode: `down`/`up`, secret, render, redirect, driver em cache, view 503.
- **Vite** para assets (`@vite`, `npm run dev`/`build`).
- Health check em `/up` dispara `DiagnosingHealth`.
- Comandos auto-descobertos em `app/Console/Commands`; closure commands em `routes/console.php`.
