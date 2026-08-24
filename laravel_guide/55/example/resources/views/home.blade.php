@extends('layouts.app')

@section('title', ' · Início')

@section('content')
    <h1>{{ $siteName }}</h1>

    {{-- Componente Blade 5.5 --}}
    @component('components.alert', ['type' => 'success', 'message' => 'Renderizado com Blade 5.5'])
        Conteúdo opcional do slot.
    @endcomponent

    <h2>Últimos posts</h2>

    {{-- Loop com $loop (5.5): $loop->first, $loop->last, $loop->index, etc. --}}
    @forelse($posts as $post)
        <article>
            <h3><a href="{{ route('posts.show', $post) }}">{{ $post->title }}</a></h3>
            <p>{{ $post->excerpt }}</p>
            <small>Publicado em {{ $post->published_at->format('d/m/Y') }}</small>
        </article>
    @empty
        <p>Nenhum post publicado ainda.</p>
    @endforelse
@endsection
