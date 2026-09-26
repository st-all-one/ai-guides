<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $siteName ?? config('site.name') }} @yield('title')</title>
    @stack('head')   {{-- Blade stacks (5.5): empilha assets de views filhas --}}
</head>
<body>
    <header>
        <nav>
            <a href="{{ route('home') }}">{{ $siteName ?? config('site.name') }}</a>
            <a href="{{ route('posts.index') }}">Posts</a>
            <a href="{{ route('about') }}">Sobre</a>

            {{-- Diretivas de autenticação (5.5) --}}
            @auth
                <a href="{{ route('dashboard') }}">Painel</a>
            @else
                <a href="{{ route('login') }}">Entrar</a>
            @endauth
        </nav>
    </header>

    <main>
        @yield('content')
    </main>

    <footer>
        <p>&copy; {{ date('Y') }} {{ config('site.owner') }}</p>
        @stack('scripts')
    </footer>
</body>
</html>
