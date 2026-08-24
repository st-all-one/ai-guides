<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePostRequest;
use App\Models\Post;
use App\Services\PostService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

// Controller "magro" (thin controller): delega regra de negócio ao PostService.
// Namespace raiz em 5.5 é App\Http\Controllers (sem prefixo obrigatório no Route::group).
class PageController extends Controller
{
    /** @var PostService */
    protected $posts;

    // Injeção de dependência no construtor (container resolve PostService + Cache).
    public function __construct(PostService $posts)
    {
        $this->posts = $posts;
        // Middleware aplicado só a 'dashboard' (auth é um middleware nativo do 5.5).
        $this->middleware('auth')->only(['dashboard']);
    }

    // Rota GET /  -> view 'home' com posts recentes.
    public function home(): View
    {
        return view('home', [
            'siteName' => config('site.name'),
            'posts'    => $this->posts->latestPublished((int) config('site.posts_per_page')),
        ]);
    }

    // Rota GET /posts  -> paginação (exemplo de listagem).
    public function index(): View
    {
        $posts = Post::query()->published()->paginate((int) config('site.posts_per_page'));

        return view('posts.index', compact('posts'));
    }

    // Rota GET /posts/{post} -> ROUTE MODEL BINDING IMPLÍCITO (tipo Post $post).
    public function post(Post $post): View
    {
        // 5.5: abort_unless($condicao, $codigo)
        abort_unless((bool) $post->published_at, 404);

        return view('posts.show', compact('post'));
    }

    // Rota GET /dashboard (protegida por auth no construtor).
    public function dashboard(Request $request): View
    {
        return view('dashboard', [
            'stats' => $this->posts->stats(),
            'user'  => $request->user(),
        ]);
    }

    // Rota POST /posts — StorePostRequest valida+autoriza ANTES de chegar aqui.
    // Referência de controller (e não closure) mantém a rota compatível com route:cache.
    public function store(StorePostRequest $request): RedirectResponse
    {
        $post = Post::create($request->validated());   // mass assignment seguro via $fillable

        return redirect()->route('posts.show', $post);
    }
}
