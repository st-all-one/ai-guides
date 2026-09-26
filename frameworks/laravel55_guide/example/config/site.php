<?php

// Configuração PERSONALIZADA do "site".
// Regra 5.5: env() SÓ deve ser usado DENTRO de arquivos de configuração
// (nunca em código após `php artisan config:cache`, senão retorna null).
// Acesse em qualquer lugar via config('site.name'), config('site.social.github'), etc.

return [

    /*
    |--------------------------------------------------------------------------
    | Nome e identidade
    |--------------------------------------------------------------------------
    */
    'name'    => env('SITE_NAME', 'Laravel 5.5 Demo'),
    'owner'   => env('SITE_OWNER', 'ACME Ltda'),

    /*
    |--------------------------------------------------------------------------
    | Paginação e listagens
    |--------------------------------------------------------------------------
    */
    'posts_per_page' => env('SITE_POSTS_PER_PAGE', 10),

    /*
    |--------------------------------------------------------------------------
    | Mensagem de manutenção (php artisan down)
    |--------------------------------------------------------------------------
    */
    'maintenance_message' => env('SITE_MAINTENANCE_MESSAGE', 'Voltamos em breve.'),

    /*
    |--------------------------------------------------------------------------
    | Redes sociais (array aninhado — acessível via "dot notation")
    |--------------------------------------------------------------------------
    */
    'social' => [
        'github'   => env('SITE_GITHUB_URL'),
        'twitter'  => env('SITE_TWITTER_URL'),
    ],

];
