{{-- resources/views/posts/show.blade.php — detalhe (route model binding por slug) --}}
<x-layouts.app :title="$post->title">
    <article>
        <h1>{{ $post->title }}</h1>
        <p>
            <small>
                Slug: <code>{{ $post->slug }}</code> ·
                {{ $post->published_at?->format('d/m/Y H:i') }}
            </small>
        </p>

        <div>{!! nl2br(e($post->body)) !!}</div>
    </article>

    <p><a href="{{ route('posts.index') }}">← Voltar</a></p>

    {{-- Exemplo de form autenticado, com @csrf e @method --}}
    @auth
        <form method="POST" action="{{ route('posts.store') }}">
            @csrf
            <input type="hidden" name="title" value="Réplica de {{ $post->title }}">
            <input type="hidden" name="body" value="Conteúdo da réplica com pelo menos 10 caracteres.">
            <button type="submit">Duplicar post</button>
        </form>
    @endauth
</x-layouts.app>
