{{-- resources/views/about.blade.php — usada por Route::view('/sobre', 'about') --}}
<x-layouts.app title="Sobre">
    <h1>Sobre</h1>
    <p>Exemplo didático do dossiê Laravel 12.x deste repositório.</p>

    <p>
        GitHub:
        <a href="{{ config('site.social.github') }}">{{ config('site.social.github') }}</a>
    </p>
</x-layouts.app>
