<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Database\Eloquent\Collection;

// Camada de serviço (POO / arquitetura): concentra regra de negócio fora do controller.
// Injeção de dependência via Service Container (o Laravel resolve Cache automaticamente).
// PHP 7.1: NÃO existe promotion de construtor (PHP 8.0), então declaramos a propriedade.
class PostService
{
    /** @var Cache */
    protected $cache;

    /** @var int */
    protected $perPage;

    public function __construct(Cache $cache, int $perPage = 10)
    {
        $this->cache  = $cache;
        $this->perPage = $perPage;
    }

    // Exemplo de EAGER LOADING + CACHE + tipagem de retorno (Collection).
    public function latestPublished(int $perPage = null): Collection
    {
        $perPage = $perPage ?? $this->perPage;

        // Cache::remember (5.5) — evita N+1 / queries repetidas.
        return $this->cache->remember('posts.published', 60, function () use ($perPage): Collection {
            return Post::query()
                ->published()
                ->latest('published_at')
                ->limit($perPage)
                ->get();
        });
    }

    // Exemplo de PROGRAMAÇÃO FUNCIONAL com Collections (5.5): pipe, reduce, where.
    public function stats(): array
    {
        return Post::all()->pipe(function (Collection $posts): array {
            return [
                'total'     => $posts->count(),
                'featured'  => $posts->where('is_featured', true)->count(),
                'words'     => $posts->reduce(function (int $carry, Post $post): int {
                    return $carry + str_word_count(strip_tags($post->body));
                }, 0),
            ];
        });
    }
}
