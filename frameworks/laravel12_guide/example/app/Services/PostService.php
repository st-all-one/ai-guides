<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Camada de serviço: concentra regra de negócio fora do controller.
 * Injeção de dependência via Service Container (o Laravel resolve o Cache Repository).
 */
final class PostService
{
    public function __construct(
        private readonly CacheRepository $cache,
    ) {}

    /**
     * EAGER/limite + CACHE + tipagem de retorno.
     * Usa Cache::remember para evitar queries repetidas.
     */
    public function latestPublished(int $perPage = 10): Collection
    {
        return $this->cache->remember("posts.latest.{$perPage}", 60, function () use ($perPage): Collection {
            return Post::query()
                ->published()
                ->latest('published_at')
                ->limit($perPage)
                ->get();
        });
    }

    /**
     * Paginação tipada (LengthAwarePaginator) para a listagem.
     */
    public function paginated(int $perPage = 10): LengthAwarePaginator
    {
        return Post::query()
            ->published()
            ->latest('published_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * PROGRAMACAO FUNCIONAL com Collections: pipe + reduce + where.
     * (Compare com o exemplo 5.5, que usava function () {} sem arrow functions.)
     *
     * @return array{total:int, featured:int, words:int}
     */
    public function stats(): array
    {
        return Post::all()->pipe(fn (Collection $posts): array => [
            'total'    => $posts->count(),
            'featured' => $posts->where('is_featured', true)->count(),
            'words'    => $posts->reduce(
                fn (int $carry, Post $post): int => $carry + str_word_count(strip_tags($post->body)),
                0
            ),
        ]);
    }

    /**
     * Cria um post (chamado pelo controller com dados JÁ validados).
     *
     * @param array<string, mixed> $data
     */
    public function create(array $data): Post
    {
        $post = Post::create($data);

        $this->cache->forget('posts.latest.10');

        return $post;
    }
}
