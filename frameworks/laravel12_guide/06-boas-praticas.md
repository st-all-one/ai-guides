# Boas Práticas no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Padrões de arquitetura, organização, tipagem, testabilidade
> e os anti-patterns que mais aparecem em code review.

---

## 1. Camadas e responsabilidades

### 1.1 Controllers finos ("thin controllers")

Controller deve só: receber a request, delegar, devolver resposta. Sem regra de negócio.

```php
namespace App\Http\Controllers;

use App\Http\Requests\StorePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Services\PostService;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class PostController extends Controller
{
    public function __construct(private readonly PostService $posts) {}

    public function index(): View
    {
        return view('posts.index', [
            'posts' => Post::published()->latest()->paginate(15),
        ]);
    }

    public function store(StorePostRequest $request): RedirectResponse
    {
        $post = $this->posts->create($request->validated());

        return redirect()->route('posts.show', $post);
    }

    public function show(Post $post): PostResource
    {
        return new PostResource($post->load('author', 'tags'));
    }
}
```

### 1.2 Serviços / Actions

Regra de negócio em classes dedicadas (injetáveis, testáveis):

```php
namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\DB;

final class PostService
{
    public function create(array $data): Post
    {
        return DB::transaction(function () use ($data) {
            $post = Post::create($data);
            $post->tags()->sync($data['tags'] ?? []);
            return $post;
        });
    }
}
```

- **Service** agrupa operações de um domínio.
- **Action** (classe com `__invoke`) para um caso de uso único.
- Prefira **injeção de dependência** a resolver manualmente via `app()`.

### 1.3 Fat models? Com moderação

- Regras de negócio do **modelo** ficam em scopes, casts, accessors e métodos de domínio.
- Consultas complexas → **scopes** (`#[Scope]`) ou **query objects**.
- Lógica orquestrada/transacional → serviços.

```php
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;

class Post extends Model
{
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }
}
```

### 1.4 Form Requests para validação/autorização

Nunca valide no controller. Um Form Request por operação (Store/Update), com `authorize()` e
`rules()` (ver `03-seguranca.md`).

### 1.5 Policies para autorização

Autorize no controller (`Gate::authorize`/`$request->user()->can`, ou `$this->authorize` após adicionar
`AuthorizesRequests` ao Controller base), não com `if`s espalhados.
Form Requests também podem autorizar em `authorize()`.

### 1.6 API Resources para serialização

Nunca devolva models crus em APIs. Use `JsonResource`/`ResourceCollection` para controlar o
contrato JSON (ver `10-database.md`).

```php
return new PostResource($post);
return PostResource::collection($posts);
```

---

## 2. Organização por domínio (apps grandes)

Em vez de inflar `app/`, agrupe por contexto:

```
app/
├── Domain/
│   ├── Billing/
│   │   ├── Actions/  Data/  Events/  Listeners/  Models/  Policies/
│   └── Catalog/
├── Http/
└── Support/
```

- Registre listeners fora do padrão com `->withEvents(discover: [__DIR__.'/../app/Domain/*/Listeners'])`.
- Providers por domínio em `bootstrap/providers.php`.
- Mantenha Contracts próximos do domínio e bindings em providers.

---

## 3. Tipagem e estilo (PHP 8.2+)

- Declare **tipos de parâmetros e retorno** em tudo: controllers, serviços, jobs, closures.
- Use **`readonly`** em dependências e DTOs; **enums** para estados; **value objects** para dinheiro/IDs.
- `final` em serviços e classes que não devem ser estendidas.
- Use **constructor property promotion** para reduzir boilerplate.
- Evite arrays associativos soltos; prefira DTOs (com `spatie/laravel-data` ou classes próprias).

```php
final class CreatePostData
{
    public function __construct(
        public readonly string $title,
        public readonly string $body,
        /** @var array<int, string> */
        public readonly array $tags = [],
    ) {}
}
```

---

## 4. Configuração

- **`env()` somente em `config/*.php`**. No código, sempre `config('chave.git')`.
- Após `config:cache`, `env()` retorna `null` no runtime.
- Nunca commite `.env`; use `.env.example` e, se necessário, `env:encrypt`.
- Segredos sensíveis → variáveis de ambiente do servidor/secret manager.

---

## 5. Eloquent: disciplina

- Defina `$fillable` (whitelist) e use `validated()`.
- Scopes nomeados (`#[Scope]`) em vez de repetir `where`.
- Use casts (`casts()`), accessors/mutators com `Attribute::make`.
- Evite `Model::all()` em produção; pagine/selecione.
- Ative `Model::shouldBeStrict()` em dev.
- Use **database transactions** para operações compostas e `afterCommit()` para jobs/eventos:

```php
DB::transaction(function () {
    $order = Order::create(...);
    ProcessPayment::dispatch($order)->afterCommit();
});
```

- Use `upsert`, `updateOrCreate`, `firstOrCreate`, `insertOrIgnore` conforme o caso.
- Soft deletes apenas quando o negócio realmente exige.

---

## 6. Eventos e listeners

- Eventos desacoplam efeitos colaterais; listeners podem ser **queued** (`ShouldQueue`).
- Discovery automático funciona; para pastas alternativas, `->withEvents(discover: [...])`.
- Prefira eventos para notificações/side-effects; use serviços para o fluxo principal.

```php
OrderShipped::dispatch($order);
// listener queued
class SendShipmentNotification implements ShouldQueue { /* ... */ }
```

---

## 7. Filas e jobs

- Jobs pequenos e idempotentes; passe **IDs/modelos** (serializados por chave), não dados gigantes.
- Use `WithoutRelations` / `withoutRelations()` para não explodir o payload.
- Defina `tries`, `timeout`, `backoff`, `uniqueId` conscientemente.
- Chains/batches para orquestração (ver `05-performance.md`).

---

## 8. Testes

- **Feature tests** cobrem rotas/HTTP; **Unit tests** cobrem serviços/lógica.
- Use `RefreshDatabase`; factories com states; `assertDatabaseHas/Missing`.
- Mock apenas o que cruza fronteiras (HTTP, mail, filas, eventos).
- Rode `php artisan test` (+ `--parallel` em suites grandes).
- `Http::fake()`, `Mail::fake()`, `Queue::fake()`, `Event::fake()`, `Notification::fake()`,
  `Storage::fake()`, `Bus::fake()`, `Exceptions::fake()` (11+).

```php
use Illuminate\Foundation\Testing\RefreshDatabase;

class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_posts(): void
    {
        $posts = Post::factory()->count(3)->create();
        $this->get('/posts')->assertOk()->assertSee($posts[0]->title);
    }
}
```

---

## 9. Frontend

- **Vite** para bundling/HMR; `@vite([...])` no layout.
- **Blade + Livewire** ou **Inertia + React/Vue/Svelte** (starter kits do 12).
- Evite lógica de negócio no Blade; use components, view models ou presenters.
- Validação client-side com **Precognition** quando fizer sentido.

---

## 10. Segurança — checklist

- [ ] `APP_DEBUG=false` em produção.
- [ ] `APP_KEY` forte e **nunca** commitado.
- [ ] CSRF em todos os formulários web (`@csrf`).
- [ ] Escaping `{{ }}`; nunca `{!! !!}` com input do usuário.
- [ ] `$fillable` + `validated()` (nunca `$request->all()`).
- [ ] Policies/Gates em toda ação sensível.
- [ ] Senhas com hashing forte (bcrypt/argon2id).
- [ ] Rate limiting em login/upload/APIs.
- [ ] HTTPS + `TrustProxies`/`TrustHosts` configurados.
- [ ] Dependências atualizadas (`composer audit`, `npm audit`).

---

## 11. Anti-patterns (não faça)

- ❌ `env()` fora de `config/` → ✅ `config('x.y')`.
- ❌ Regra de negócio em rota/Blade/controller → ✅ serviço/action/model.
- ❌ `Model::all()` + filtro em PHP → ✅ query/scopes/paginação.
- ❌ N+1 → ✅ `with()`/`withCount()`.
- ❌ `$request->all()` no `create/update` → ✅ `$request->validated()`.
- ❌ `{!! $userInput !!}` → ✅ `{{ }}` + sanitização.
- ❌ SQL concatenado → ✅ bindings (`?` / `whereRaw('x = ?', [$v])`).
- ❌ Lógica duplicada em vários controllers → ✅ serviço/action.
- ❌ `singleton` para estado por request (Octane) → ✅ `scoped`.
- ❌ Deixar `console.log`/`dd()` em produção.
- ❌ Ignorar migrações destrutivas sem backup.

---

## Resumo de Pontos-Chave

- Controllers finos, **serviços/actions** para regra de negócio, **Form Requests** para validação e
  **Policies** para autorização.
- **API Resources** para contrato JSON; **DTOs** para transporte tipado.
- `env()` só em config; `$fillable` + `validated()` sempre.
- **Scopes** e **casts** mantêm o modelo expressivo; `shouldBeStrict()` em dev.
- Eventos/listeners e jobs para desacoplar e escalar.
- Testes com `RefreshDatabase` + fakes; `php artisan test --parallel`.
- Siga o checklist de segurança e evite os anti-patterns listados.
