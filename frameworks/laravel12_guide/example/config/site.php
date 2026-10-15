<?php

// config/site.php — CONFIGURAÇÃO PERSONALIZADA.
// REGRA: env() só pode ser usado DENTRO de arquivos de config.
// Após `php artisan config:cache`, env() retorna null no runtime → use config('site.*').

return [
    'name'    => env('SITE_NAME', 'Laravel 12 Demo'),
    'tagline' => env('SITE_TAGLINE', 'Dossiê técnico'),

    'posts_per_page' => (int) env('SITE_POSTS_PER_PAGE', 10),

    'social' => [
        'github' => env('SITE_GITHUB', 'https://github.com/laravel/laravel'),
    ],

    // Ver 11-proxy.md: lista de IPs/CIDR confiáveis (null = não configurar TrustProxies).
    'trusted_proxies' => env('TRUSTED_PROXIES')
        ? array_map('trim', explode(',', env('TRUSTED_PROXIES')))
        : null,

    // Hostnames confiados (regex). Ex.: '^example\.com$'.
    'trusted_hosts' => env('TRUSTED_HOSTS')
        ? array_map(fn (string $h): string => '^'.preg_quote(trim($h), '/').'$', explode(',', env('TRUSTED_HOSTS')))
        : null,
];
