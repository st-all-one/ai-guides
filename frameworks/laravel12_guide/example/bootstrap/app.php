<?php

// bootstrap/app.php — ponto central de configuração do Laravel 11/12.
// NÃO existe mais app/Http/Kernel.php, app/Console/Kernel.php nem app/Exceptions/Handler.php.

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        // api: __DIR__.'/../routes/api.php',          // habilitado por `php artisan install:api`
        commands: __DIR__.'/../routes/console.php',
        // channels: __DIR__.'/../routes/channels.php', // habilitado por `install:broadcasting`
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Middleware global extra (roda em toda request).
        // $middleware->append(App\Http\Middleware\EnsureTokenIsValid::class);

        // Grupo 'web'/'api': ajuste fino.
        // $middleware->web(append: [App\Http\Middleware\TrackVisits::class]);
        // $middleware->api(prepend: [App\Http\Middleware\EnsureTokenIsValid::class]);

        // Aliases de middleware de rota.
        $middleware->alias([
            // 'subscribed' => App\Http\Middleware\EnsureUserIsSubscribed::class,
        ]);

        // Proxy atrás de load balancer / Cloudflare / ELB (ver 11-proxy.md).
        // Em produção, liste IPs/CIDR confiáveis — evite '*'.
        if ($proxies = config('site.trusted_proxies')) {
            $middleware->trustProxies(at: $proxies, headers: Request::HEADER_X_FORWARDED_FOR |
                Request::HEADER_X_FORWARDED_HOST |
                Request::HEADER_X_FORWARDED_PORT |
                Request::HEADER_X_FORWARDED_PROTO);
        }

        // Restringe hostnames respondidos (proteção contra Host header injection).
        if ($hosts = config('site.trusted_hosts')) {
            $middleware->trustHosts(at: $hosts);
        }

        // CSRF: exclui webhooks (URIs que não passam pelo formulário web).
        $middleware->validateCsrfTokens(except: [
            // 'stripe/*',
        ]);

        // Redirecionamentos de auth.
        $middleware->redirectGuestsTo('/login');
        $middleware->redirectUsersTo('/dashboard');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Exemplo: render JSON para rotas de API.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $e) => $request->is('api/*') || $request->expectsJson()
        );
    })
    ->withSchedule(function (Illuminate\Console\Scheduling\Schedule $schedule): void {
        // Tarefas agendadas também podem ficar em routes/console.php.
        // $schedule->command('emails:send')->daily();
    })
    ->withEvents(discover: [
        // __DIR__.'/../app/Domain/*/Listeners',
    ])
    ->create();
