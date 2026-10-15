# Sintaxe & Tipagem no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Rotas, controllers, requests, responses, middleware,
> commands, scheduling, eventos e o que a linguagem permite.

---

## 0. PHP 8.2–8.5 — o que usar

| Recurso | Versão PHP | Uso no 12 |
|---|---|---|
| Named arguments, constructor promotion, match, nullsafe | 8.0 | ✅ |
| Enums, readonly properties, `never`, first-class callable syntax `f(...)` | 8.1 | ✅ |
| `readonly` classes, DNF types `(A&B)\|C`, `true`/`false`/`null` tipos | 8.2 | ✅ |
| Typed class constants, `#[\Override]`, `json_validate()`, `Randomizer::getBytes` | 8.3 | ✅ se alvo 8.3 |
| Property hooks, asymmetric visibility `public private(set)`, `new` sem parênteses | 8.4 | ✅ se alvo 8.4 |
| Pipe `\|>`, clone with, `#[\NoDiscard]` | 8.5 | ✅ se alvo 8.5 |

```php
// Enums
enum Status: string {
    case Draft = 'draft';
    case Published = 'published';
}

// Readonly + promotion
final readonly class Money {
    public function __construct(public int $cents, public string $currency = 'BRL') {}
}

// DNF
function handle((Countable&ArrayAccess)|null $bag): void {}

// First-class callable
$names = collect($users)->map($this->normalize(...))->all();

// Property hooks (8.4)
class User {
    public string $fullName {
        get => "{$this->first} {$this->last}";
    }
    public private(set) string $status = 'active';
}
```

> Como o 12.x roda em 8.2–8.5, escreva para o **piso** do seu alvo. Propriedades `readonly` e
> enums são seguros em 8.2; property hooks exigem 8.4.

Tipagem de retorno nos controllers é obrigatória na prática:

```php
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

public function index(): View {}
public function store(StoreRequest $r): RedirectResponse {}
public function api(): JsonResponse {}
```

---

## 1. Rotas (`routes/web.php`)

```php
use Illuminate\Support\Facades\Route;

Route::get('/greeting', fn () => 'Hello World');
Route::post('/posts', [PostController::class, 'store']);
Route::match(['get', 'post'], '/x', ...);
Route::any('/y', ...);
Route::view('/welcome', 'welcome', ['name' => 'Taylor']);
Route::redirect('/here', '/there');            // 302
Route::permanentRedirect('/here', '/there');   // 301
```

### 1.1 Parâmetros

```php
Route::get('/user/{id}', fn (string $id) => $id);
Route::get('/posts/{post}/comments/{comment}', fn (string $p, string $c) => ...);
Route::get('/user/{name?}', fn (?string $name = null) => $name);

Route::get('/user/{id}', ...)->where('id', '[0-9]+');
Route::get('/user/{id}/{name}', ...)->whereNumber('id')->whereAlpha('name');
->whereAlphaNumeric('name')->whereUuid('id')->whereUlid('id')
->whereIn('category', ['movie', 'song'])
->whereIn('category', CategoryEnum::cases())
->where('search', '.*');                       // permite "/"
```

Patterns globais em `AppServiceProvider::boot()`:

```php
Route::pattern('id', '[0-9]+');
```

### 1.2 Nomes e URLs

```php
Route::get('/user/profile', ...)->name('profile');
route('profile');
route('profile', ['id' => 1]);
route('profile', ['id' => 1, 'photos' => 'yes']);   // query string
return to_route('profile');
redirect()->route('profile');
Route::current(); Route::currentRouteName(); Route::currentRouteAction();
```

### 1.3 Grupos

```php
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', ...);
});

Route::controller(OrderController::class)->group(function () {
    Route::get('/orders/{id}', 'show');
    Route::post('/orders', 'store');
});

Route::prefix('admin')->group(fn () => Route::get('/users', ...));
Route::name('admin.')->group(fn () => Route::get('/users', ...)->name('users'));
Route::domain('{account}.example.com')->group(...);

// grupo aninhado mescla middleware/where, concatena prefix/name
```

### 1.4 Fallback

```php
Route::fallback(fn () => view('errors.404'));
// closures de rota NÃO podem ser cacheadas com route:cache — prefira controller
```

### 1.5 Rate limiting

```php
RateLimiter::for('api', fn (Request $r) => Limit::perMinute(60)->by($r->user()?->id ?: $r->ip()));
Route::middleware(['throttle:uploads'])->group(...);
Route::get('/x', ...)->middleware('throttle:60,1');
```

### 1.6 Method spoofing

```blade
<form method="POST" action="/example">
    @method('PUT')
    @csrf
</form>
```

### 1.7 CORS e cache de rotas

```bash
php artisan config:publish cors     # publica config/cors.php
php artisan route:cache             # serializa rotas (sem closures)
php artisan route:clear
php artisan route:list -vv --except-vendor
```

---

## 2. Route Model Binding

```php
use App\Models\{User, Post};

// implícito (nome do parâmetro == variável tipada)
Route::get('/users/{user}', fn (User $user) => $user->email);

// chave custom
Route::get('/posts/{post:slug}', fn (Post $post) => $post);
public function getRouteKeyName(): string { return 'slug'; }

// scoping (filho do pai)
Route::get('/users/{user}/posts/{post:slug}', fn (User $u, Post $p) => $p);
Route::get('/users/{user}/posts/{post}', ...)->scopeBindings();
Route::scopeBindings()->group(...);
->withoutScopedBindings();

// soft deleted
Route::get('/users/{user}', ...)->withTrashed();

// ausente -> 404; custom:
Route::get('/locations/{location:slug}', ...)->missing(fn (Request $r) => Redirect::route('locations.index'));

// enum binding (string-backed)
enum Category: string { case Fruits = 'fruits'; case People = 'people'; }
Route::get('/categories/{category}', fn (Category $c) => $c->value);

// explícito
Route::model('user', User::class);
Route::bind('user', fn (string $value) => User::where('name', $value)->firstOrFail());
// ou no model: resolveRouteBinding() / resolveChildRouteBinding()
```

---

## 3. Controllers

```php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\View\View;

class UserController extends Controller
{
    public function show(string $id): View
    {
        return view('user.profile', ['user' => User::findOrFail($id)]);
    }
}
```

### 3.1 Single action

```php
class ProvisionServer extends Controller
{
    public function __invoke(): void { /* ... */ }
}
Route::post('/server', ProvisionServer::class);
```

### 3.2 Middleware no controller (HasMiddleware)

> **12.x:** `$this->middleware()` **não existe mais** (o Controller base do 11/12 é vazio).
> Declare middleware no controller implementando `HasMiddleware`.

```php
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UserController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            'auth',
            new Middleware('log', only: ['index']),
            new Middleware('subscribed', except: ['store']),
            function (Request $request, Closure $next) { return $next($request); },
        ];
    }
}
```

### 3.3 Resource controllers

```php
Route::resource('photos', PhotoController::class);
Route::resources(['photos' => PhotoController::class, 'posts' => PostController::class]);
Route::apiResource('photos', PhotoController::class);          // sem create/edit
Route::apiResources([...]);
Route::resource('photos', PhotoController::class)->only(['index', 'show']);
Route::resource('photos', PhotoController::class)->except(['create', 'edit']);
Route::resource('photos', PhotoController::class)->names(['create' => 'photos.build']);
Route::resource('users', AdminUserController::class)->parameters(['users' => 'admin_user']);
Route::resource('photos', PhotoController::class)->missing(fn (Request $r) => Redirect::route('photos.index'));
Route::resource('photos', PhotoController::class)->withTrashed(['show']);
Route::softDeletableResources([...]);
```

| Verb | URI | Action | Name |
|---|---|---|---|
| GET | `/photos` | index | photos.index |
| GET | `/photos/create` | create | photos.create |
| POST | `/photos` | store | photos.store |
| GET | `/photos/{photo}` | show | photos.show |
| GET | `/photos/{photo}/edit` | edit | photos.edit |
| PUT/PATCH | `/photos/{photo}` | update | photos.update |
| DELETE | `/photos/{photo}` | destroy | photos.destroy |

```php
Route::resource('photos.comments', PhotoCommentController::class);       // aninhado
Route::resource('photos.comments', CommentController::class)->shallow(); // shallow
Route::resource('photos.comments', ...)->scoped(['comment' => 'slug']);  // scoping
```

Singleton resources:

```php
Route::singleton('profile', ProfileController::class);          // sem {id}
Route::apiSingleton('profile', ProfileController::class);
Route::singleton('profile', ProfileController::class)->creatable();
```

Gerar com model/requests:

```bash
php artisan make:controller PhotoController --resource --model=Photo --requests
php artisan make:controller PhotoController --api
php artisan make:controller ProvisionServer --invokable
```

---

## 4. Requests

```php
use Illuminate\Http\Request;

public function store(Request $request): RedirectResponse
{
    $name  = $request->input('name');
    $name  = $request->string('name')->trim();   // Stringable
    $all   = $request->all();
    $only  = $request->only(['a', 'b']);
    $safe  = $request->safe()->only(['a', 'b']); // de validated()
    $bool  = $request->boolean('active');
    $date  = $request->date('published_at');
    $enum  = $request->enum('status', Status::class);
    $ip    = $request->ip();
    $ua    = $request->userAgent();
    $url   = $request->fullUrl();
    $path  = $request->path();
    $is    = $request->is('admin/*');
    $ajax  = $request->ajax();
    $json  = $request->expectsJson();
    $method= $request->method();
    $user  = $request->user();
}
```

Files:

```php
$file = $request->file('photo');
if ($request->hasFile('photo')) { /* ... */ }
$file->isValid();
$file->extension(); $file->path();
$path = $request->photo->store('images');            // nome único
$path = $request->photo->store('images', 's3');
$path = $request->photo->storeAs('images', 'a.jpg');
$file->getClientOriginalName();  // inseguro (sanitize)
$file->hashName();
```

Normalização (remove/ajusta):

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->remove([
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
        \Illuminate\Foundation\Http\Middleware\TrimStrings::class,
    ]);
    $middleware->convertEmptyStringsToNull(except: [fn (Request $r) => $r->is('admin/*')]);
    $middleware->trimStrings(except: [fn (Request $r) => $r->is('admin/*')]);
})
```

---

## 5. Responses

```php
return response('Hello', 200)->header('Content-Type', 'text/plain');
return response()->json(['ok' => true], 201);
return response()->json(['ok' => true])->setEncodingOptions(JSON_UNESCAPED_UNICODE);
return view('posts.show', compact('post'));
return redirect('/home');
return redirect()->route('home');
return redirect()->action([HomeController::class, 'index']);
return back()->withInput()->with('status', 'Salvo!');
return redirect()->away('https://example.com');
return response()->download($path, 'name.pdf', $headers);
return response()->file($path);
return response()->streamDownload(fn () => print('...'), 'file.txt');
return response()->stream(fn () => /* chunks */, 200, $headers);
return response()->noContent();          // 204
return response()->make($content);

// macros
Response::macro('caps', fn (string $value) => Response::make(strtoupper($value)));
```

Type-hint: `: \Illuminate\Http\Response` ou `: \Illuminate\Http\JsonResponse` /
`: \Illuminate\Contracts\Routing\ResponseFactory`. Use `: RedirectResponse` em redirects.

---

## 6. Middleware

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenIsValid
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->input('token') !== 'my-secret-token') {
            return redirect('/home');
        }
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void { /* após enviar */ }
}
```

Registro em `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->append(EnsureTokenIsValid::class);       // fim do stack global
    $middleware->prepend(OtherMiddleware::class);         // início
    $middleware->use([...]);                              // stack global manual

    $middleware->appendToGroup('group-name', [First::class, Second::class]);
    $middleware->web(append: [...], prepend: [...], replace: [...], remove: [...]);
    $middleware->api(prepend: [...]);
    $middleware->alias(['subscribed' => EnsureUserIsSubscribed::class]);

    $middleware->redirectGuestsTo('/login');
    $middleware->trustProxies(at: [...]);
})
```

Excluir middleware em rota/grupo:

```php
Route::middleware([M::class])->group(function () {
    Route::get('/', ...)->withoutMiddleware([M::class]);
});
Route::withoutMiddleware([M::class])->group(...);
```

Aliases padrão: `auth`, `auth:sanctum`, `guest`, `can`, `throttle`, `verified`, `signed`,
`password.confirm`, `cache.headers`, `auth.basic`.

---

## 7. Console commands & scheduling

```php
class SendEmails extends Command
{
    protected $signature = 'emails:send {user} {--queue}';
    protected $description = '...';

    public function handle(): int
    {
        if ($this->option('queue')) { /* ... */ }
        $this->info("Enviando para {$this->argument('user')}");
        return self::SUCCESS;
    }
}
```

`routes/console.php` (closure commands + schedule):

```php
use Illuminate\Support\Facades\{Schedule, Artisan, DB};

Schedule::call(fn () => DB::table('recent_users')->delete())->daily();
Schedule::command('emails:send Taylor --force')->daily();
Schedule::command(SendEmailsCommand::class, ['Taylor', '--force'])->daily();
Schedule::job(new Heartbeat, 'heartbeats', 'sqs')->everyFiveMinutes();
Schedule::exec('node script.js')->daily();

Artisan::command('delete:recent-users', fn () => DB::table('recent_users')->delete())
    ->purpose('...')->daily();
```

Frequências: `everySecond`…`everyThirtySeconds`, `everyMinute`…`everyThirtyMinutes`, `hourly`,
`hourlyAt(17)`, `daily`, `dailyAt('13:00')`, `twiceDaily(1, 13)`, `daysOfMonth([1,10])`,
`weekly`, `weeklyOn(1, '8:00')`, `monthly`, `monthlyOn(4, '15:00')`, `lastDayOfMonth('15:00')`,
`quarterly`, `yearly`, `timezone(...)`.

Modificadores: `->withoutOverlapping()`, `->onOneServer()`, `->runInBackground()`,
`->evenInMaintenanceMode()`, `->when(fn () => ...)`, `->onSuccess(...)`, `->onFailure(...)`.

```bash
php artisan schedule:list
* * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1
```

---

## 8. Eventos

```php
php artisan make:event PodcastProcessed
php artisan make:listener SendPodcastNotification --event=PodcastProcessed
```

```php
// event
class PodcastProcessed
{
    use Dispatchable;

    public function __construct(public Podcast $podcast) {}
}

// listener (discovery por type-hint de handle/__invoke)
class SendPodcastNotification
{
    public function handle(PodcastProcessed $event): void { /* ... */ }
}

// manual
Event::listen(PodcastProcessed::class, SendPodcastNotification::class);
Event::listen(fn (PodcastProcessed $e) => ...);
Event::listen(queueable(fn (PodcastProcessed $e) => ...));

// dispatch
PodcastProcessed::dispatch($podcast);
event(new PodcastProcessed($podcast));
broadcast(new OrderShipped($order))->toOthers();

// after commit / deferred
// after commit: implemente ShouldDispatchAfterCommit na classe do evento
// class OrderShipped implements \Illuminate\Contracts\Events\ShouldDispatchAfterCommit {}
Event::defer(fn () => ...);   // adia o dispatch de eventos
```

Listener queued: implements `ShouldQueue` (+ `ShouldQueueAfterCommit`), `retryUntil`, `backoff`,
`middleware`, `ShouldBeUnique`.

---

## 9. Artisan essencial

```bash
php artisan list / help migrate
php artisan tinker
php artisan about
php artisan optimize / optimize:clear
php artisan route:list -vv
php artisan model:show Post
php artisan migrate --force --isolated
php artisan make:model Post -mfsc / --all
php artisan install:api / install:broadcasting
php artisan event:list / event:cache / event:clear
php artisan db:seed / db:wipe
php artisan test --parallel
php artisan queue:work / queue:restart / queue:failed
php artisan down / up
php artisan reload
```

---

## Resumo de Pontos-Chave

- Declare tipos em tudo; use enums, `readonly`, match, first-class callables — respeitando o
  piso de PHP do alvo.
- Rotas: parâmetros com constraints, grupos, model binding implícito/enum/explicito/scoped,
  fallback com controller (para `route:cache`).
- Controllers podem implementar `HasMiddleware`; resources e singletons reduzem boilerplate.
- Requests tipam input (`string()`, `boolean()`, `date()`, `enum()`), arquivos com `store()`.
- Responses com type-hints corretos; macros e streams disponíveis.
- Middleware é registrado em `bootstrap/app.php` (global, grupos, aliases).
- Scheduling em `routes/console.php` (ou `withSchedule`); um único cron `schedule:run`.
- Eventos com discovery automático e listeners queued.
