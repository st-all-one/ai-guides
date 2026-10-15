{{-- resources/views/posts/index.blade.php — listagem paginada --}}
<x-layouts.app title="Posts">
    <h1>Posts</h1>

    @forelse ($posts as $post)
        <article>
            <h2><a href="{{ route('posts.show', $post) }}">{{ $post->title }}</a></h2>
            <p>{{ $post->excerpt }}</p>
        </article>
    @empty
        <x-alert type="info" message="Nenhum post encontrado." />
    @endforelse

    {{-- Links de paginação (Tailwind/Bootstrap configurável) --}}
    {{ $posts->links() }}
</x-layouts.app>
