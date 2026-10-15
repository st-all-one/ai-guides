<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePostRequest;
use App\Models\Post;
use App\Services\PostService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\View\View;

/**
 * Controller "magro" (thin controller): delega regra de negócio ao PostService.
 * Laravel 12: constructor property promotion + readonly + tipos de retorno.
 *
 * No Laravel 11/12 o controller base NÃO tem mais `$this->middleware()`;
 * para middleware no controller, implemente a interface HasMiddleware (abaixo).
 */
class PageController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly PostService $posts,
    ) {}

    /** Middleware aplicado apenas à ação 'dashboard'. */
    public static function middleware(): array
    {
        return [
            new Middleware('auth', only: ['dashboard']),
        ];
    }

    /** Rota GET / -> view 'home' com posts recentes. */
    public function home(): View
    {
        return view('home', [
            'siteName' => config('site.name'),
            'tagline'  => config('site.tagline'),
            'posts'    => $this->posts->latestPublished((int) config('site.posts_per_page')),
        ]);
    }

    /** Rota GET /posts -> paginação (listagem). */
    public function index(): View
    {
        $posts = $this->posts->paginated((int) config('site.posts_per_page'));

        return view('posts.index', compact('posts'));
    }

    /** Rota GET /posts/{post:slug} -> route model binding por slug. */
    public function post(Post $post): View
    {
        abort_unless((bool) $post->published_at, 404);

        return view('posts.show', compact('post'));
    }

    /** Rota GET /dashboard (protegida por auth no construtor). */
    public function dashboard(Request $request): View
    {
        return view('dashboard', [
            'stats' => $this->posts->stats(),
            'user'  => $request->user(),
        ]);
    }

    /** Rota POST /posts — StorePostRequest valida+autoriza ANTES de chegar aqui. */
    public function store(StorePostRequest $request): RedirectResponse
    {
        $post = $this->posts->create($request->validated());

        return redirect()
            ->route('posts.show', $post)
            ->with('status', 'Post criado com sucesso!');
    }
}
