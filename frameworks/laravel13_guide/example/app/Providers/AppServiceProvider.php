<?php

namespace App\Providers;

use App\Jobs\ChargePayment;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Roteamento centralizado de filas (novo no 13) — evita onQueue() espalhado.
        Queue::route(ChargePayment::class, connection: 'redis', queue: 'payments');
    }
}
