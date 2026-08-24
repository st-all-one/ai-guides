@extends('layouts.app')

@section('title', ' · ' . $post->title)

@section('content')
    <article>
        <h1>{{ $post->title }}</h1>

        {{-- {{ }} escapa HTML automaticamente (previne XSS). Use {!! !!} só com conteúdo confiável. --}}
        <div>{{ $post->body }}</div>

        <p><a href="{{ route('posts.index') }}">Voltar</a></p>
    </article>
@endsection
