{{-- resources/views/home.blade.php --}}
<x-layouts.app :title="$siteName">
    <h1>{{ $siteName }}</h1>
    <p>{{ $tagline }}</p>

    <section>
        <h2>Últimos posts</h2>

        @forelse ($posts as $post)
            <article>
                <h3>
                    <a href="{{ route('posts.show', $post) }}">{{ $post->title }}</a>
                    @if ($post->is_featured)
                        <span @class(['badge', 'badge-featured' => $post->is_featured])>destaque</span>
                    @endif
                </h3>
                <p>{{ $post->excerpt }}</p>
                <small>
                    Publicado em {{ $post->published_at?->format('d/m/Y') }}
                    @if (! $loop->last) · ({{ $loop->iteration }}/{{ $loop->count }}) @endif
                </small>
            </article>
        @empty
            <x-alert type="warning" message="Ainda não há posts publicados." />
        @endforelse
    </section>
</x-layouts.app>
