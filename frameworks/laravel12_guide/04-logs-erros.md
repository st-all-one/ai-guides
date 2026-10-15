# Logs & Tratamento de Erros no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. `config/logging.php`, canais, stacks, Pail,
> `withExceptions` e exceções renderable/reportable.

---

## 1. Logging

O Laravel usa **Monolog** e organiza tudo em **canais**. A configuração fica em
`config/logging.php`. O canal padrão é o `stack`, que agrega outros canais.

### 1.1 Drivers de canal

| Driver | Descrição |
|---|---|
| `single` | Um único arquivo (`StreamHandler`). |
| `daily` | Rotação diária (`RotatingFileHandler`). |
| `errorlog` | `error_log` do PHP. |
| `syslog` | Syslog do sistema. |
| `papertrail` | `SyslogUdpHandler` (Papertrail). |
| `slack` | Webhook do Slack. |
| `monolog` | Qualquer handler Monolog. |
| `custom` | Fábrica customizada. |
| `stack` | Combina múltiplos canais. |

### 1.2 Configuração típica

```php
// config/logging.php
'default' => env('LOG_CHANNEL', 'stack'),

'channels' => [
    'stack' => [
        'driver' => 'stack',
        'channels' => ['single', 'slack'],
        'ignore_exceptions' => false,
    ],

    'single' => [
        'driver' => 'single',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'debug'),
        'replace_placeholders' => true,
    ],

    'daily' => [
        'driver' => 'daily',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'debug'),
        'days' => env('LOG_DAILY_DAYS', 14),   // retenção em DIAS
        'replace_placeholders' => true,
    ],

    'slack' => [
        'driver' => 'slack',
        'url' => env('LOG_SLACK_WEBHOOK_URL'),
        'username' => 'Laravel Log',
        'emoji' => ':boom:',
        'level' => env('LOG_LEVEL', 'critical'),
    ],
],
```

- `level` define o **mínimo** de severidade do canal.
- `days` é a retenção do canal `daily` (`LOG_DAILY_DAYS`).
- `single`/`daily` ainda aceitam `bubble`, `permission`, `locking`.
- Depreciações: `LOG_DEPRECATIONS_CHANNEL` ou um canal chamado `deprecations`.

### 1.3 Níveis (RFC 5424, do mais grave ao menos)

`emergency`, `alert`, `critical`, `error`, `warning`, `notice`, `info`, `debug`.

```php
use Illuminate\Support\Facades\Log;

Log::emergency($m); Log::alert($m); Log::critical($m);
Log::error($m); Log::warning($m); Log::notice($m);
Log::info($m); Log::debug($m);

Log::info('Usuário {id} falhou no login.', ['id' => $user->id]); // interpolação de contexto
Log::channel('slack')->critical('Sistema fora do ar!');
Log::stack(['single', 'slack'])->info('mensagem');

logger()->info('x');            // helper
info('x');                      // helper global
```

### 1.4 Contexto persistente

```php
use Illuminate\Support\Facades\Log;

// adiciona contexto a todas as mensagens seguintes deste request
Log::withContext(['request_id' => (string) Str::uuid()]);

// via Context (propaga para logs e jobs)
use Illuminate\Support\Facades\Context;
Context::add('request_id', (string) Str::uuid());
```

### 1.5 Customização Monolog

```php
// handler via array (driver 'monolog')
'channels' => [
    'custom' => [
        'driver' => 'monolog',
        'handler' => Monolog\Handler\NullHandler::class,
        'level' => 'debug',
    ],
],

// processor/tap para ajustar o handler
'channels' => [
    'single' => [
        'driver' => 'single',
        'path' => storage_path('logs/laravel.log'),
        'tap' => [App\Logging\CustomizeFormatter::class],
    ],
],
```

```php
// Fábrica para canal 'custom'
namespace App\Logging;

use Monolog\Logger;

class CreateCustomLogger
{
    public function __invoke(array $config): Logger
    {
        return new Logger('custom', [/* handlers */]);
    }
}
```

Registre a fábrica no provider com
`Log::extend('custom', fn (Application $app, array $config) => /* driver */)`.

### 1.6 Pail (tail de logs)

```bash
composer require laravel/pail --dev
php artisan pail
php artisan pail --timeout=0 --filter=error
```

---

## 2. Tratamento de Exceções

Toda a configuração migrou de `app/Exceptions/Handler.php` para **`bootstrap/app.php`** com
`->withExceptions(function (Exceptions $exceptions) { ... })`.

### 2.1 Debug

`config/app.php` `debug` segue `APP_DEBUG`. **Produção: sempre `false`** — caso contrário,
detalhes sensíveis vazam.

### 2.2 Report

```php
use App\Exceptions\InvalidOrderException;

->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->report(function (InvalidOrderException $e) {
        // enviar para Slack/PagerDuty...
    })->stop();                 // interrompe o log padrão

    $exceptions->report(function (InvalidOrderException $e) {
        return false;           // também interrompe o log padrão
    });
})
```

Ignorar tipos:

```php
->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->dontReport([InvalidOrderException::class]);
    $exceptions->dontReportWhen(fn (Throwable $e) => $e instanceof X && $e->reason() === 'y');
    $exceptions->stopIgnoring(HttpException::class);   // volte a reportar 404/419
    $exceptions->dontReportDuplicates();               // evita duplicatas de report()
})
```

Marcar a classe:

```php
use Illuminate\Contracts\Debug\ShouldntReport;

class PodcastProcessingException extends Exception implements ShouldntReport {}
```

### 2.3 Contexto e nível de log

```php
->withExceptions(function (Exceptions $exceptions): void {
    // contexto global em toda exceção
    $exceptions->context(fn () => ['foo' => 'bar']);

    // nível por tipo
    $exceptions->level(PDOException::class, \Psr\Log\LogLevel::CRITICAL);
})
```

```php
class InvalidOrderException extends Exception
{
    public function context(): array          // contexto só desta exceção
    {
        return ['order_id' => $this->orderId];
    }
}
```

### 2.4 Render

```php
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->render(function (InvalidOrderException $e, Request $request) {
        return response()->view('errors.invalid-order', status: 500);
    });

    $exceptions->render(function (NotFoundHttpException $e, Request $request) {
        if ($request->is('api/*')) {
            return response()->json(['message' => 'Record not found.'], 404);
        }
        // sem retorno -> cai no render padrão
    });
})
```

Decisão HTML vs JSON e resposta final:

```php
->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
        return $request->is('admin/*') || $request->expectsJson();
    });

    $exceptions->respond(function (Response $response) {
        if ($response->getStatusCode() === 419) {
            return back()->with('message', 'A página expirou, tente novamente.');
        }
        return $response;
    });
})
```

### 2.5 Exceções renderable/reportable (na própria classe)

```php
namespace App\Exceptions;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvalidOrderException extends Exception
{
    public function report(): bool
    {
        // return false para usar o report padrão também
        return true;
    }

    public function render(Request $request): Response|bool
    {
        if (/* condição */) {
            return response()->view('errors.invalid-order', status: 500);
        }
        return false; // render padrão
    }
}
```

### 2.6 Throttling de exceções reportadas

```php
use Illuminate\Support\Lottery;
use Illuminate\Cache\RateLimiting\Limit;
use Throwable;

->withExceptions(function (Exceptions $exceptions): void {
    // amostragem aleatória
    $exceptions->throttle(fn (Throwable $e) => Lottery::odds(1, 1000));

    // por tipo
    $exceptions->throttle(function (Throwable $e) {
        if ($e instanceof ApiMonitoringException) {
            return Lottery::odds(1, 1000);
        }
    });

    // rate limit (protege contra picos)
    $exceptions->throttle(fn (BroadcastException $e) => Limit::perMinute(10));
})
```

### 2.7 HTTP Exceptions e páginas de erro

```php
abort(404);
abort_if(! $user->active, 403);
abort_unless($post->published, 404, 'Post não publicado.');
throw new HttpException(503);
```

Páginas customizadas: `resources/views/errors/404.blade.php`, `500.blade.php` etc.
A página `503` também serve de template do maintenance mode.

### 2.8 Helpers

```php
report($e);                 // reporta e CONTINUA
rescue(fn () => risky(), $fallback); // captura e devolve fallback
$e->getMessage(); $e->getCode();
```

---

## Resumo de Pontos-Chave

- Logs em **`config/logging.php`** com **canais** e **stacks**; `level` = severidade mínima.
- Canal `daily` usa **`days`** para retenção (`LOG_DAILY_DAYS`).
- Use `Log::withContext()`/`Context::add()` para enriquecer logs.
- **Pail** (`php artisan pail`) para acompanhar logs em dev.
- Erros são configurados **`bootstrap/app.php`** (`withExceptions`), não mais em `Handler.php`.
- Registre `report`/`render`/`context`/`dontReport`/`throttle`/`respond` conforme a necessidade.
- Exceções podem implementar `report()`/`render()` na própria classe.
- **`abort()`/`abort_if()`/`abort_unless()`** e views `resources/views/errors/{code}.blade.php`.
- `APP_DEBUG=false` em produção sempre.
