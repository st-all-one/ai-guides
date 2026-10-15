<?php

// bootstrap/providers.php — providers do aplicativo (Laravel 11/12).
// Diferente do 5.x: NÃO se registra providers em config/app.php.

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\SiteServiceProvider::class,
];
