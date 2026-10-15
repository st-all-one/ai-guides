{{-- resources/views/components/layouts/app.blade.php — layout component (12.x) --}}
{{-- Recebe $slot e, opcionalmente, $title. O view composer injeta $siteName. --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title ?? $siteName }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-gray-50 text-gray-900">
    <header>
        <nav>
            <a href="{{ route('home') }}">{{ $siteName }}</a>
            <a href="{{ route('posts.index') }}">Posts</a>
            <a href="{{ route('about') }}">Sobre</a>

            @auth
                <a href="{{ route('dashboard') }}">Dashboard</a>
            @else
                <a href="/login">Entrar</a>
            @endauth
        </nav>
    </header>

    <main>
        @if (session('status'))
            <x-alert type="success" :message="session('status')" />
        @endif

        {{ $slot }}
    </main>

    @stack('scripts')
</body>
</html>
