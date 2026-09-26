<?php

namespace App\Providers;

use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

// Service Provider customizado: ponto de "configurabilidade estrutural" (5.5).
// Registre em config/app.php -> 'providers' => [ App\Providers\SiteServiceProvider::class ].
class SiteServiceProvider extends ServiceProvider
{
    // register(): NUNCA use outras classes ainda não registradas aqui.
    public function register(): void
    {
        // Se este arquivo de config fosse de um PACOTE, faríamos merge dos defaults:
        // $this->mergeConfigFrom(__DIR__.'/../../config/site.php', 'site');
    }

    // boot(): tudo já está registrado; ideal para view composers, macros, bindings.
    public function boot(): void
    {
        // View composer: injeta $siteName em todos os templates que estendem layouts.app.
        View::composer('layouts.app', function ($view) {
            $view->with('siteName', config('site.name'));
        });
    }
}
