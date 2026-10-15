# POO & Arquitetura no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Container, Facades, Contracts, Service Providers,
> estrutura de diretórios e o request lifecycle. Nada aqui é exclusivo do 13+.

---

## 1. Service Container

O container (IoC) resolve dependências por reflexão e é o coração do framework.

### 1.1 Zero configuration resolution

Se uma classe só depende de classes concretas, o container a resolve sozinho — sem registro:

```php
class Service { /* ... */ }

Route::get('/', function (Service $service) {
    return $service::class;      // resolvido automaticamente
});
```

Controllers, listeners, middleware, jobs e closures de rota recebem dependências assim.

### 1.2 Quando interagir manualmente

- Você tipa uma **interface** no construtor → precisa dizer ao container qual implementação usar.
- Você escreve um **pacote** e precisa registrar serviços.

### 1.3 Binding

```php
use App\Services\Transistor;
use App\Services\PodcastParser;
use Illuminate\Contracts\Foundation\Application;

// bind simples
$this->app->bind(Transistor::class, function (Application $app) {
    return new Transistor($app->make(PodcastParser::class));
});

// inferindo o tipo pelo retorno da closure (11+)
$this->app->bind(function (Application $app): Transistor {
    return new Transistor($app->make(PodcastParser::class));
});

// bindIf — só registra se ainda não houver binding
$this->app->bindIf(Transistor::class, fn (Application $app) => new Transistor(...));

// singleton — mesma instância sempre
$this->app->singleton(Transistor::class, fn (Application $app) => new Transistor(...));
$this->app->singletonIf(Transistor::class, fn (Application $app) => new Transistor(...));

// scoped — uma instância por request/job (flush a cada ciclo; ideal p/ Octane e filas)
$this->app->scoped(Transistor::class, fn (Application $app) => new Transistor(...));
$this->app->scopedIf(Transistor::class, fn (Application $app) => new Transistor(...));

// instância existente
$service = new Transistor(new PodcastParser);
$this->app->instance(Transistor::class, $service);

// interface -> implementação
$this->app->bind(EventPusher::class, RedisEventPusher::class);
```

### 1.4 Atributos de container (11+)

```php
use Illuminate\Container\Attributes\{Bind, Singleton, Scoped};

#[Bind(RedisEventPusher::class)]
#[Bind(FakeEventPusher::class, environments: ['local', 'testing'])]
#[Singleton]              // ou #[Scoped]
interface EventPusher {}
```

`#[Bind]` registra automaticamente — sem tocar em service provider. `#[Singleton]`/`#[Scoped]`
controlam o ciclo de vida.

### 1.5 Contextual binding

```php
use App\Http\Controllers\{PhotoController, UploadController, VideoController};
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

$this->app->when(PhotoController::class)
    ->needs(Filesystem::class)
    ->give(fn () => Storage::disk('local'));

$this->app->when([VideoController::class, UploadController::class])
    ->needs(Filesystem::class)
    ->give(fn () => Storage::disk('s3'));
```

Atributos contextuais injetam sem registrar binding:

```php
use Illuminate\Container\Attributes\{
    Auth, Cache, Config, Context, DB, Give, Log, RouteParameter, Storage, Tag, CurrentUser
};

public function __construct(
    #[Storage('local')] protected Filesystem $filesystem,
    #[Auth('web')] protected Guard $auth,
    #[Cache('redis')] protected Repository $cache,
    #[Config('app.timezone')] protected string $timezone,
    #[Context('uuid')] protected string $uuid,
    #[DB('mysql')] protected Connection $connection,
    #[Give(DatabaseRepository::class)] protected UserRepository $users,
    #[Log('daily')] protected LoggerInterface $log,
    #[RouteParameter('photo')] protected Photo $photo,
    #[Tag('reports')] protected iterable $reports,
) {}

Route::get('/user', fn (#[CurrentUser] User $user) => $user);
```

### 1.6 Primitivos, variadics, tagging, extend

```php
$this->app->when(ReportGenerator::class)
    ->needs('$apiKey')->give(config('services.reports.key'));

$this->app->when(Handler::class)
    ->needs(Filter::class)->giveTagged('reports');   // typed variadic

$this->app->tag([SpeedReport::class, MemoryReport::class], 'reports');
$this->app->tagged('reports');                        // iterável

$this->app->extend(Service::class, fn ($service, $app) => new DecoratedService($service));
```

### 1.7 Resolvendo

```php
app(Contract::class);                 // helper global
app()->make(Contract::class);
resolve(Contract::class);
$container->makeWith(Service::class, ['key' => 'value']); // parâmetros
$container->bound(Service::class);
$container->has(Service::class);
```

### 1.8 Method invocation

```php
$this->app->call([$instance, 'method']);
$this->app->call([$instance, 'method'], ['param' => 'value']);
$this->app->invoke($instance);              // chama __invoke
$this->app->callMethod([$obj, 'method']);   // 11+
app()->call([$controller, 'show']);
```

### 1.9 Eventos do container / rebinding

```php
$this->app->resolving(Service::class, fn ($service, $app) => /* ... */);
$this->app->afterResolving(Service::class, fn ($service, $app) => /* ... */);
$this->app->rebinding(Service::class, fn ($app, $service) => /* ... */);
$this->app->forgetInstance(Service::class);
$this->app->forgetInstances();
$this->app->flush();
```

PSR-11: o container implementa `Psr\Container\ContainerInterface`. Use
`$container->get($id)` / `$container->has($id)` quando quiser interoperar.

---

## 2. Facades

Facades dão interface **estática** para serviços do container (`Illuminate\Support\Facades\*`).
São proxies dinâmicos (`__callStatic`) — **testáveis** com `shouldReceive`.

```php
use Illuminate\Support\Facades\{Cache, Route, Log, Auth, Gate, Config, DB, Storage, Event, Queue, Bus, Schedule, RateLimiter, Crypt, Hash, Process, Http, Notification, Validator, Password, Blade, View, URL, Context, ParallelTesting};

Route::get('/cache', fn () => Cache::get('key'));
Log::info('ok');
```

### 2.1 Testando facades

```php
Cache::shouldReceive('get')->with('key')->andReturn('value');
```

### 2.2 Real-time facades

Trate qualquer classe como facade sem registrá-la:

```php
use App\Services\Publisher;

// prefixe o namespace com Facades\
$publisher = \Facades\App\Services\Publisher::publish($podcast);
```

### 2.3 Custom facade

```php
namespace App\Facades;

use Illuminate\Support\Facades\Facade;

class Payment extends Facade
{
    protected static function getFacadeAccessor(): string { return 'payment'; }
}
```

```php
// provider
$this->app->bind('payment', fn () => new \App\Services\PaymentGateway);
// config/app.php 'aliases' (opcional) ou use o FQCN
```

---

## 3. Contracts

Contracts são as interfaces oficiais (`Illuminate\Contracts\*`). Prefira **injetar contracts**
para testabilidade e desacoplamento; use facades para conveniência.

```php
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Validation\Rule;
use Illuminate\Contracts\Encryption\Decrypter;
```

Vantagens: baixo acoplamento, testável com mocks, sem "scope creep" de facades.

---

## 4. Service Providers

Providers fazem o bootstrap da aplicação. `register()` só deve **registrar bindings**;
`boot()` roda depois de todos os `register()` e pode usar qualquer serviço.

```php
namespace App\Providers;

use App\Services\Riak\Connection;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\ServiceProvider;

class RiakServiceProvider extends ServiceProvider
{
    public array $bindings = [
        ServerProvider::class => DigitalOceanServerProvider::class,
    ];

    public array $singletons = [
        DowntimeNotifier::class => PingdomDowntimeNotifier::class,
    ];

    public function register(): void
    {
        $this->app->singleton(Connection::class, fn (Application $app) => new Connection(config('riak')));
    }

    public function boot(): void
    {
        // eventos, rotas, view composers, macros...
    }
}
```

### 4.1 Registro

Todos os providers do app ficam em **`bootstrap/providers.php`**:

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\ComposerServiceProvider::class,
];
```

`php artisan make:provider X` adiciona automaticamente.

### 4.2 Deferred providers

Provider que só registra bindings pode ser adiado:

```php
use Illuminate\Contracts\Support\DeferrableProvider;

class RiakServiceProvider extends ServiceProvider implements DeferrableProvider
{
    public function register(): void { /* bind */ }
    public function provides(): array { return [Connection::class]; }
}
```

---

## 5. Estrutura de diretórios (12.x)

```
app/
├── Broadcasting/        (make:channel)
├── Console/             (make:command)
├── Events/              (make:event)
├── Exceptions/          (make:exception)
├── Http/
│   ├── Controllers/     (make:controller)
│   ├── Middleware/      (make:middleware)
│   └── Requests/        (make:request)
├── Jobs/                (make:job)
├── Listeners/           (make:listener)
├── Mail/                (make:mail)
├── Models/              (make:model)
├── Notifications/       (make:notification)
├── Policies/            (make:policy)
├── Providers/           (make:provider)
├── Rules/               (make:rule)
└── View/Components/     (make:component)
bootstrap/
├── app.php              # configura o framework (routing, middleware, exceptions, ...)
├── providers.php        # providers do app
└── cache/               # caches gerados (routes, services, config, events)
config/*.php             # config (env() APENAS aqui)
database/
├── factories/ migrations/ seeders/
public/index.php         # entry point
resources/
├── css/ js/ views/
routes/
├── web.php console.php  # + api.php/channels.php após install:api / install:broadcasting
storage/
├── app/ framework/ logs/
tests/
vendor/
```

### 5.1 `bootstrap/app.php` — o novo centro de configuração

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
            // rotas adicionais
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // aliases, grupos, trustProxies, trustHosts, redirectGuestsTo...
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // report/render
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('emails:send')->daily();
    })
    ->withEvents(discover: [__DIR__.'/../app/Domain/*/Listeners'])
    ->withProviders([App\Providers\DomainServiceProvider::class])
    ->create();
```

> **12.x:** não existem mais `app/Http/Kernel.php`, `app/Console/Kernel.php` nem
> `app/Exceptions/Handler.php`. Toda essa configuração migrou para `bootstrap/app.php`.

### 5.2 Comandos uteis de scaffolding

```bash
php artisan make:model Post -mfsc          # model + migration + factory + seeder + controller
php artisan make:model Post --all          # tudo (policy, requests, ...)
php artisan make:controller PostController --resource --model=Post --requests
php artisan make:middleware EnsureTokenIsValid
php artisan make:request StorePostRequest
php artisan make:policy PostPolicy --model=Post
php artisan make:job ProcessPodcast
php artisan make:event/ listener/ notification/ mail/ rule/ provider/ component
php artisan install:api                    # cria routes/api.php + Sanctum
php artisan install:broadcasting           # cria routes/channels.php + config/broadcasting.php
php artisan model:show Post
php artisan about
```

---

## 6. Request Lifecycle (visão de 60 segundos)

1. `public/index.php` carrega o autoloader e obtém a aplicação de `bootstrap/app.php`.
2. A aplicação cria o container, os kernels HTTP/console e roda os bootstrappers
   (config, logging, detecção de ambiente, ...).
3. Os **service providers** são instanciados; `register()` em todos e depois `boot()` em todos.
4. A requisição entra no **pipeline de middleware** (sessão, CSRF, manutenção, `TrustProxies`, ...).
5. O **router** faz o dispatch para rota/controller (com route model binding e middlewares de rota).
6. O retorno vira uma `Response`, que atravessa os middlewares de volta e é enviada ao browser
   (`Response::send()`); callbacks adiados (`defer`) rodam depois.

> Providers são o ponto central do bootstrap: binding de serviços, registro de eventos,
> middlewares, rotas e configuração.

---

## Resumo de Pontos-Chave

- Resolva por **injeção/zero-config** sempre que possível; registre bindings só para
  interfaces, primitivos ou pacotes.
- `singleton` = 1 por aplicação; `scoped` = 1 por request/job (use em Octane/filas).
- **Atributos** (`#[Bind]`, `#[Singleton]`, `#[Storage]`, `#[CurrentUser]`…) reduzem boilerplate.
- Facades são convenientes e testáveis, mas cuidado com "scope creep" — prefira **Contracts** em
  classes grandes.
- Providers em `bootstrap/providers.php`; `register()` só faz bindings, `boot()` faz o resto.
- Toda configuração de framework vive em **`bootstrap/app.php`** (routing, middleware,
  exceptions, schedule, events).
