@extends('layouts.app')

@section('title', ' · Posts')

@section('content')
    <h1>Posts</h1>

    @foreach($posts as $post)
        <article>
            <h3><a href="{{ route('posts.show', $post) }}">{{ $post->title }}</a></h3>
            <p>{{ $post->excerpt }}</p>
        </article>
    @endforeach

    {{-- Paginação (5.5): $posts é LengthAwarePaginator vindo de Post::paginate() --}}
    {{ $posts->links() }}
@endsection
