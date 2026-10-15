<?php

namespace App\Providers;

use App\Services\PostService;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

/**
 * Service Provider customizado: ponto de "configurabilidade estrutural" (12.x).
 * Registre em bootstrap/providers.php (NÃO em config/app.php como no 5.x).
 */
class SiteServiceProvider extends ServiceProvider
{
    /**
     * register(): apenas bindings no container.
     * Nada de eventos/rotas aqui.
     */
    public function register(): void
    {
        // Exemplo de binding com parâmetro primitivo.
        $this->app->bind(PostService::class, function (Application $app): PostService {
            return new PostService($app->make('cache.store'));
        });

        // Se este config fosse de um PACOTE, faríamos merge dos defaults:
        // $this->mergeConfigFrom(__DIR__.'/../../config/site.php', 'site');
    }

    /**
     * boot(): tudo já está registrado; ideal para view composers, macros, bindings.
     */
    public function boot(): void
    {
        // View composer: injeta $siteName em todo template que usa o layout component.
        View::composer('components.layouts.app', function ($view): void {
            $view->with('siteName', config('site.name'));
        });

        // Exemplos de macro (descomente conforme necessidade):
        // \Illuminate\Support\Str::macro('initials', fn (string $name): string =>
        //     collect(explode(' ', $name))->map(fn ($p) => strtoupper($p[0]))->implode(''));
    // \Illuminate\Support\Facades\Response::macro('caps', fn (string $v) =>
        //     response(strtoupper($v)));
    }
}
