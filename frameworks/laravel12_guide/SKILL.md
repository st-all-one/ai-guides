---
name: laravel-12
description: Author correct Laravel 12.x code/config/architecture. Use when generating or reviewing Laravel 12 files (controllers, models, routes, Blade, migrations, providers, bootstrap/app.php, config). Enforces framework boundaries (PHP 8.2-8.5, bootstrap/app.php config, Eloquent attributes) and the 12.x feature set.
category: frameworks
version: "12.x"
tags: [laravel, php, eloquent, blade, service-container, facades, sanctum, vite, octane, lts]
license: MIT
---

# SKILL: Laravel 12.x — Correct Dev / Config / Structure

Runs on **PHP 8.2, 8.3, 8.4 and 8.5**. Bug fixes until 2026-08-13; security until 2027-02-24.
Code below is version-true for the 12.x branch. Laravel 12 is a low-breakage "maintenance"
release over 11 — the big architectural changes (bootstrap/app.php, no kernels) are 11+.

## FILE MAP (numbered files — load only what the task needs)

| Foco | Arquivo |
|---|---|
| Programação funcional (Collections, helpers, Lazy) | `01-programacao-funcional.md` |
| POO/arquitetura (Container, Facades, Contracts, Providers, lifecycle) | `02-poo-arquitetura.md` |
| Segurança (Auth, Authz, Crypt, Hash, CSRF, Validation, sessão) | `03-seguranca.md` |
| Logs & erros (logging, `withExceptions`, Pail) | `04-logs-erros.md` |
| Performance (eager loading, cache, filas, `optimize`) | `05-performance.md` |
| Boas práticas | `06-boas-praticas.md` |
| Configurabilidade estrutural (env/config, providers, maintenance, Vite) | `07-configurabilidade-estrutural.md` |
| Sintaxe & tipagem (rotas, controllers, requests, middleware, CLI) | `08-sintaxe-tipagem.md` |
| Blade | `09-blade.md` |
| Database (Query Builder, Eloquent, migrations, Resources) | `10-database.md` |
| Proxy (TrustProxies/TrustHosts) | `11-proxy.md` |
| Lint/fmt/qualidade (Pint, PHPStan/Larastan, Rector) | `12-qualidade-e-pint.md` |
| Testes (feature/http/db/console/mocking/Dusk) | `13-testes.md` |
| API & auth avançada (Sanctum, Fortify, Passport, Socialite, Pennant, Precognition) | `14-api-e-autenticacao.md` |
| Comunicação (Mail, Notifications, Broadcasting/Reverb, HTTP client, Process) | `15-comunicacao.md` |
| Observabilidade & cache avançado (Horizon, Pulse, Telescope, Redis) | `16-observabilidade-e-cache.md` |
| Busca & Eloquent avançado (full-text, vetorial, Scout, collections, serialização) | `17-busca-e-eloquent-avancado.md` |
| Ferramentas & starter kits (Sail, Valet, Envoy, Folio, pacotes, Vite, kits) | `18-ferramentas-e-starter-kits.md` |
| Deploy & escala (optimize, Octane, Concurrency, filas) | `19-deploy-e-escala.md` |
| IA & billing (AI SDK, Boost/MCP, Prompts, Cashier) | `20-ia-e-billing.md` |

## PHP TYPING MATRIX (what you may use)

| Feature | PHP | Use in 12 |
|---|---|---|
| named args, constructor promotion, `match`, nullsafe | 8.0 | ✅ |
| enums, `readonly` props, `never`, first-class callable `f(...)` | 8.1 | ✅ |
| `readonly` classes, DNF `(A&B)\|C`, `true`/`false`/`null` types | 8.2 | ✅ (min) |
| typed class constants, `#[\Override]`, `json_validate()`, `Randomizer` | 8.3 | ✅ if target 8.3 |
| property hooks, asymmetric visibility `public private(set)`, `new` w/o parens | 8.4 | ✅ if target 8.4 |
| pipe `\|>`, clone-with, `#[\NoDiscard]` | 8.5 | ✅ if target 8.5 |
| **Removed:** `each()`, dynamic properties on non-#[AllowDynamicProperties] | 8.2 | ❌ |

Write to the **floor** of your target (8.2 unless you know otherwise).

## HARD VERSION BOUNDARIES (do NOT emit)

| Look for | 12 reality | Do |
|---|---|---|
| `app/Http/Kernel.php` | **removed (11+)** | configure in `bootstrap/app.php` |
| `app/Console/Kernel.php` | **removed (11+)** | `routes/console.php` / `withSchedule` |
| `app/Exceptions/Handler.php` | **removed (11+)** | `withExceptions` in `bootstrap/app.php` |
| providers in `config/app.php` | **moved** | `bootstrap/providers.php` |
| `routes/api.php` by default | only after `install:api` | run `php artisan install:api` |
| `routes/channels.php` by default | only after `install:broadcasting` | `php artisan install:broadcasting` |
| `$this->middleware()` in controllers | **removed (11+)** | implement `HasMiddleware::middleware()` |
| base `Controller` with AuthorizesRequests/ValidatesRequests | **empty base** | add traits yourself or use `Gate`/`can()` |
| `Fideloper\Proxy\TrustProxies` | **in framework** | `Illuminate\Http\Middleware\TrustProxies` via `trustProxies(at:)` |
| local scope `scopeX($q)` | still works | `#[Scope]` attribute (12+) preferred |
| `Breeze`/`Jetstream` | no new updates | 12 starter kits (React/Vue/Svelte/Livewire) |
| **Exists in 12 ✅** | | `#[Scope]`, `#[ScopedBy]`, `#[ObservedBy]`, `#[UseFactory]`, `#[UsePolicy]`, `#[UseResource]`, `#[UseResourceCollection]`, `#[CollectedBy]`, `#[Bind]`, `#[Singleton]`, `#[Scoped]`, `#[CurrentUser]`, contextual attributes, `Cache::flexible`, `Cache::memo`, `Pipeline` facade, `Concurrency`, `defer`/`once`, `Config::string()`, `env:encrypt`, `Route::whereNot`, `--isolated` migrations, `Model::shouldBeStrict()` |

## STRUCTURE
```
app/Models/             Eloquent (App\Models\X; FQCN for binding)
app/Services/ app/Actions/  business logic (DI targets)
app/Http/Controllers/   thin
app/Http/Requests/      Form Requests
app/Http/Middleware/    middleware
app/Providers/          ServiceProviders
app/Console/Commands/   commands
app/Events/ app/Listeners/ app/Jobs/ app/Mail/ app/Notifications/ app/Policies/ app/Rules/  (created on demand)
app/View/Components/    class components
config/  *.php  (env() ONLY here)
bootstrap/app.php       framework config (routing/middleware/exceptions/schedule/events)
bootstrap/providers.php app providers
routes/{web,console}.php (+ api.php/channels.php after install:*)
resources/{css,js,views}/
database/{migrations,seeders,factories}/
public/index.php        entry point
tests/{Feature,Unit}/
```

## BOOTSTRAP (`bootstrap/app.php`)
```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up', apiPrefix: 'api',
        then: function () { /* extra routes */ },
    )
    ->withMiddleware(function (Middleware $m): void {
        $m->web(append: [EnsureUserIsSubscribed::class]);
        $m->api(prepend: [EnsureTokenIsValid::class]);
        $m->alias(['subscribed' => EnsureUserIsSubscribed::class]);
        $m->trustProxies(at: ['10.0.0.0/8']);
        $m->trustHosts(at: ['^example\.com$']);
        $m->redirectGuestsTo('/login'); $m->redirectUsersTo('/panel');
        $m->validateCsrfTokens(except: ['stripe/*']);
        $m->throttleWithRedis();
    })
    ->withExceptions(function (Exceptions $e): void { /* report/render */ })
    ->withSchedule(function (Schedule $s): void { $s->command('emails:send')->daily(); })
    ->withEvents(discover: [__DIR__.'/../app/Domain/*/Listeners'])
    ->withProviders([App\Providers\DomainServiceProvider::class])
    ->create();
```

## CONFIG & ENV
```php
// config/site.php — env() ONLY inside config files
return ['name' => env('SITE_NAME', 'Demo'), 'social' => ['gh' => env('SITE_GH')]];
```
```php
config('site.name'); config('site.social.gh');       // dot notation
config(['app.timezone' => 'UTC']);                    // runtime set
Config::string('app.name'); Config::integer('x'); Config::boolean('app.debug');
App::environment(); App::environment(['local', 'staging']);
// env: php artisan env:encrypt / env:decrypt / --readable / --env=staging
```
RULE: after `config:cache`, `env()` returns `null` outside config → never `env()` in code.

## SERVICE CONTAINER & PROVIDERS
```php
$this->app->bind(I::class, Impl::class); $this->app->bind(Transistor::class, fn($app)=>new Transistor($app->make(Parser::class)));
$this->app->bindIf(...); $this->app->singleton(X::class, fn($a)=>new X); $this->app->singletonIf(...);
$this->app->scoped(X::class, fn($a)=>new X); $this->app->scopedIf(...);   // 1 per request/job (Octane!)
$this->app->instance(X::class, $obj);
$this->app->when(C::class)->needs(Filesystem::class)->give(fn()=>Storage::disk('s3'));
$this->app->when(C::class)->needs('$apiKey')->give('secret');
$this->app->tag([A::class, B::class], 'reports'); $this->app->tagged('reports');
$this->app->extend(X::class, fn($x,$app)=>new Decorated($x));
app(X::class); resolve(X::class); app()->makeWith(X::class, ['k'=>'v']);
app()->call([$obj,'m']); app()->callMethod([$obj,'m']); app()->invoke($obj);
$this->app->resolving(X::class, fn($x,$app)=>...); $this->app->afterResolving(...); $this->app->rebinding(...);
```
```php
// attributes (11+)
use Illuminate\Container\Attributes\{Bind,Singleton,Scoped,Storage,Auth,Cache,Config,Context,DB,Give,Log,RouteParameter,Tag,CurrentUser};
#[Bind(RedisEventPusher::class)] #[Bind(FakePusher::class, environments:['local','testing'])] #[Singleton] interface EventPusher {}
public function __construct(#[Storage('local')] Filesystem $fs, #[CurrentUser] User $user) {}
```
```php
class SiteServiceProvider extends ServiceProvider {
    public array $bindings = [ServerProvider::class => DigitalOceanServerProvider::class];
    public array $singletons = [DowntimeNotifier::class => PingdomDowntimeNotifier::class];
    public function register(): void { /* bind only */ }
    public function boot(): void { /* events, routes, macros, composers */ }
    // deferred: implements \Illuminate\Contracts\Support\DeferrableProvider + provides()
}
```
Prefer **Contracts** over facades for testability. Facades mockable: `Cache::shouldReceive('get')->andReturn(...)`.

## FACADES & MACROS
```php
// custom facade: bind 'payment' in provider + class extends Facade { getFacadeAccessor(): string { return 'payment'; } }
// real-time facade: \Facades\App\Services\Publisher::publish($x);
// Macroable: Collection, Request, Response, Route, Str, Arr, DB, Cache, ...
Str::macro('part', fn($s,$n) => explode('-', $s)[$n]);
Response::macro('caps', fn($v) => Response::make(strtoupper($v)));
```

## ROUTING (`routes/web.php`)
```php
Route::get('/posts', [PostController::class, 'index'])->name('posts.index');
Route::get('/posts/{post}', [PostController::class, 'show']);            // implicit binding
Route::get('/posts/{post:slug}', ...);                                   // custom key
Route::get('/users/{user}/posts/{post:slug}', ...);                      // scoped child binding
Route::get('/user/{name?}', fn (?string $name = null) => $name);
Route::get('/user/{id}', ...)->whereNumber('id')->whereAlpha('name')->whereUuid('id')->whereIn('cat', CategoryEnum::cases());
Route::view('/about', 'about')->name('about');                           // cacheable
Route::redirect('/old', '/', 301); Route::permanentRedirect('/here','/there'); // cacheable
Route::resource('photos', PhotoController::class);
Route::apiResource('photos', PhotoController::class);                    // no create/edit
Route::resources([...]); Route::apiResources([...]);
Route::resource('photos.comments', CommentController::class)->shallow()->scoped();
Route::resource('photos', PhotoController::class)->withTrashed(['show'])->missing(fn($r)=>Redirect::route('photos.index'));
Route::softDeletableResources([...]);
Route::singleton('profile', ProfileController::class); Route::apiSingleton('profile', ProfileController::class);
// groups
Route::middleware(['auth','verified'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index']);
});
Route::controller(OrderController::class)->group(function () { Route::get('/orders/{id}','show'); });
Route::domain('{account}.example.com')->group(...);
Route::fallback(fn()=>view('errors.404'));   // NOTE: closure breaks route:cache -> use a controller
Route::get('/api','ApiController@index')->middleware('throttle:60,1');
// enum binding: fn (Category $category) => ... (404 if invalid)
```
Rate limiters in `AppServiceProvider::boot()`:
```php
RateLimiter::for('api', fn(Request $r) => Limit::perMinute(60)->by($r->user()?->id ?: $r->ip()));
RateLimiter::for('login', fn(Request $r) => [Limit::perMinute(500), Limit::perMinute(3)->by($r->input('email'))]);
RateLimiter::for('x', fn(Request $r) => Limit::perMinute(10)->after(fn(Response $res) => $res->status() === 404));
```
API routes: `php artisan install:api` creates `routes/api.php` (Sanctum, `/api` prefix, `api` group).
Route caching: `route:cache` serializes routes → **closures cannot be cached**. Use controllers.

## MIDDLEWARE
```php
namespace App\Http\Middleware;
use Closure; use Illuminate\Http\Request; use Symfony\Component\HttpFoundation\Response;
class EnsureTokenIsValid {
    public function handle(Request $request, Closure $next): Response {
        if ($request->input('token') !== 'my-secret-token') return redirect('/home');
        return $next($request);
    }
    public function terminate(Request $request, Response $response): void { /* after response */ }
}
// register in bootstrap/app.php: append/prepend, group append/prepend/replace/remove, alias, use([...])
```
Default groups: `web` = EncryptCookies, AddQueuedCookiesToResponse, StartSession, ShareErrorsFromSession,
ValidateCsrfToken, SubstituteBindings. `api` = SubstituteBindings.
Exclude on route/group: `->withoutMiddleware([M::class])`.
Redirects: `$m->redirectGuestsTo('/login'); $m->redirectUsersTo('/panel');`

## CONTROLLERS (thin, typed)
```php
namespace App\Http\Controllers;
use App\Models\Post; use App\Services\PostService; use Illuminate\View\View; use Illuminate\Http\RedirectResponse;
class PostController extends Controller {
    public function __construct(private readonly PostService $posts) {}
    public function index(): View { return view('posts.index', ['posts' => Post::published()->latest()->paginate(15)]); }
    public function show(Post $post): View { return view('posts.show', compact('post')); }
    public function store(StorePostRequest $r): RedirectResponse { $p = $this->posts->create($r->validated()); return redirect()->route('posts.show', $p); }
}
// single-action: class X extends Controller { public function __invoke(): void {} }
// middleware: implements HasMiddleware { public static function middleware(): array { return ['auth', new Middleware('log', only:['index']), fn($r,$n)=>$n($r)]; } }
// action injection: public function show(Post $post, Request $r)
```
Generate: `make:controller PhotoController --resource --model=Photo --requests`, `--api`, `--invokable`.

## FORM REQUESTS & VALIDATION
```php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest; use Illuminate\Validation\Validator;
class StorePostRequest extends FormRequest {
    public function authorize(): bool { return $this->user()->can('create', Post::class); }
    public function rules(): array {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug'  => ['required', 'string', 'unique:posts,slug'],
            'body'  => ['required', 'string', 'min:10'],
            'cover' => ['nullable', 'image', 'max:2048'],
            'tags'  => ['array'], 'tags.*' => ['string', 'distinct'],
            'role'  => ['required', \Illuminate\Validation\Rule::in(['writer','admin'])],
            'email' => ['required', \Illuminate\Validation\Rule::unique('users')->ignore($this->id)],
            'password' => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::min(8)->letters()->numbers()->uncompromised()],
        ];
    }
    protected function prepareForValidation(): void { $this->merge(['slug' => Str::slug($this->title)]); }
    public function after(): array { return [fn (Validator $v) => $v->errors()->add('field','msg')]; }
    public function messages(): array { return ['title.required' => 'Informe um título.']; }
    public function attributes(): array { return ['body' => 'corpo']; }
}
// custom Rule (12): implements \Illuminate\Contracts\Validation\ValidationRule { validate(string $a, mixed $v, Closure $fail): void {} }
// controller: $data = $request->validated();  $request->safe()->only([...]);  old('x'); $errors->first('x')
```
Rules exist: accepted, after, alpha_dash, array, bail, boolean, confirmed, current_password, date,
decimal, dimensions, distinct, email, enum, exists, file, image, in, json, mimes, nullable, numeric,
password, prohibited, required_if/unless/with/without, same, size, unique, url, uuid, ulid.
CSRF auto-disabled during tests.

## MODELS / ELOQUENT
```php
namespace App\Models;
use Illuminate\Database\Eloquent\Model; use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Attributes\{Scope, ScopedBy, ObservedBy, UseFactory, UsePolicy};
use Illuminate\Database\Eloquent\Casts\Attribute;

#[ObservedBy([UserObserver::class])]
class Post extends Model {
    use SoftDeletes;
    protected $table='posts'; protected $primaryKey='id'; public $timestamps=true;
    protected $fillable=['title','slug','body','published_at','user_id'];
    protected $hidden=['secret']; protected $appends=['excerpt'];
    protected $attributes=['is_featured'=>false];
    protected function casts(): array {
        return ['published_at'=>'datetime','is_featured'=>'boolean','meta'=>'array','amount'=>'decimal:2','status'=>Status::class,'secret'=>'encrypted'];
    }
    protected function excerpt(): Attribute { return Attribute::make(get: fn($v,$attrs)=>Str::limit(strip_tags($attrs['body']),160)); }
    protected function slug(): Attribute { return Attribute::make(set: fn(string $v)=>Str::slug($v)); }
    #[Scope] protected function published(\Illuminate\Database\Eloquent\Builder $q): void { $q->whereNotNull('published_at')->where('published_at','<=',now()); }
    #[Scope] protected function ofType(\Illuminate\Database\Eloquent\Builder $q, string $t): void { $q->where('type',$t); }
}
// retrieve
Post::find(1); Post::findOrFail(1); Post::firstOrFail();
Post::firstOrCreate(['slug'=>$s],['title'=>$t]); Post::updateOrCreate(['email'=>$e],['active'=>1]);
$post->fill($a); $post->save(); $post->update([...]); $post->refresh(); $post->fresh();
$post->delete(); Post::destroy([1,2]); $post->forceDelete(); // soft
Post::withTrashed()->...; Post::onlyTrashed()->...; $post->restore();
Post::upsert([...], ['email'], ['votes']); DB::table('u')->insertOrIgnore([...]);
Post::popular()->active()->orderBy('created_at')->get();   // #[Scope]
Post::popular()->orWhere->active()->get();                 // higher-order orWhere
// strictness (dev): Model::shouldBeStrict(! app()->isProduction()); // lazy load / missing / discards
```

## RELATIONSHIPS
```php
public function phone(): HasOne { return $this->hasOne(Phone::class); }
public function user(): BelongsTo { return $this->belongsTo(User::class)->withDefault(); }
public function posts(): HasMany { return $this->hasMany(Post::class); }
public function roles(): BelongsToMany { return $this->belongsToMany(Role::class)->withPivot('active')->withTimestamps(); }
public function comments(): HasManyThrough { return $this->hasManyThrough(Comment::class, Post::class); }
public function carOwner(): HasOneThrough { return $this->hasOneThrough(Owner::class, Car::class); }
public function image(): MorphOne { return $this->morphOne(Image::class,'imageable'); }
public function images(): MorphMany { return $this->morphMany(Image::class,'imageable'); }
public function tags(): MorphToMany { return $this->morphToMany(Tag::class,'taggable'); }
public function commentable(): MorphTo { return $this->morphTo(); }
public function currentOrder(): HasOne { return $this->hasOne(Order::class)->latestOfMany(); }
public function largestOrder(): HasOne { return $this->hasOne(Order::class)->ofMany('price','max'); }
// access: $user->posts; $user->posts()->where('active',1)->get();
// save: $user->posts()->save($p); ->create([...]); ->createMany([...]);
// pivot: $u->roles()->attach($id,['active'=>true]); sync([1,2]); syncWithoutDetaching([...]); toggle([...]); detach($id); updateExistingPivot($id,[...]);
// associate/dissociate: $post->user()->associate($u); $post->user()->dissociate();
// existence: Post::has('comments'); Post::doesntHave('comments'); Post::whereHas('comments',fn($q)=>$q->where('ok',1)); Post::whereRelation('user','active',1); Post::whereBelongsTo($user);
```

## EAGER LOADING & N+1
```php
$books = Book::with('author')->get();                              // avoids N+1
$books = Book::with(['author','publisher' => fn($q) => $q->where('active',1)])->get();
$books = Book::with('author.profile')->get();                      // nested
$books = Book::with('author:id,name,book_id')->get();              // columns (include id + FK!)
Book::with(['parentable' => fn (MorphTo $m) => $m->morphWith([Event::class=>['calendar'], Post::class=>['author']])])->get();
Book::withCount('comments')->withSum('comments','votes')->withAvg('comments','rating')->get();
$book->load('author'); $book->loadMissing('author'); $book->loadCount('comments');  // lazy
protected $with = ['author'];                                      // always eager
Model::preventLazyLoading(! app()->isProduction());
```

## QUERY BUILDER & TRANSACTIONS
```php
use Illuminate\Support\Facades\DB;
DB::table('users')->where('age','>',18)->orderBy('name')->limit(10)->get();
DB::table('u')->whereIn('id',[1,2,3])->whereNull('x')->whereNotNull('y')->whereBetween('age',[18,65])->whereColumn('a','b')->get();
DB::table('u')->whereDate('created_at', today())->whereMonth('created_at','12')->get();
DB::table('u')->whereJsonContains('options->langs','en')->get();
DB::table('u')->when($role, fn($q,$role)=>$q->where('role',$role))->unless($archived, fn($q)=>$q->whereNull('archived_at'));
DB::table('u')->where(fn($q)=>$q->where('a',1)->orWhere('b',2))->get();     // grouping
DB::table('u')->join('p','u.id','=','p.user_id')->leftJoin('c',...)->select('u.*','p.name')->get();
DB::table('u')->joinSub($sub,'sub',fn($j)=>$j->on('u.id','=','sub.user_id'))->get();
DB::table('u')->selectRaw('count(*) as c')->whereRaw('age > ?',[18])->groupBy('x')->having('c','>',1)->get();
// insert/update/delete
DB::table('u')->insert([['name'=>'a'],['name'=>'b']]); $id=DB::table('u')->insertGetId([...]);
DB::table('u')->upsert([...], ['email'], ['votes']); DB::table('u')->insertOrIgnore([...]);
DB::table('u')->increment('visits'); DB::table('u')->decrement('visits',2); DB::table('u')->update(['x'=>1]); DB::table('u')->delete();
// transactions
DB::transaction(function () { /* ... */ }, attempts: 5);
DB::beginTransaction(); try { /* ... */ DB::commit(); } catch (\Throwable $e) { DB::rollBack(); throw $e; }
// efeitos externos só após commit: ->afterCommit() em jobs/eventos/notificações
DB::table('u')->where('id',1)->lockForUpdate()->get();                      // pessimistic
// streaming
DB::table('u')->orderBy('id')->chunk(100, fn($rows) => /* ... */);
User::cursor()->each(fn($u) => /* ... */);                                  // LazyCollection
User::query()->lazyById(100)->each(...);
DB::table('u')->toSql(); DB::table('u')->dd();
```
ALWAYS bind raw values: `whereRaw('x = ?', [$v])`. Never interpolate.

## MIGRATIONS & SCHEMA
```php
use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('posts', function (Blueprint $t) {
            $t->id(); $t->ulid('code')->unique();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignIdFor(Airline::class)->nullable();
            $t->string('title'); $t->string('slug')->unique(); $t->text('body');
            $t->boolean('is_featured')->default(false); $t->decimal('price',8,2)->nullable();
            $t->enum('status',['draft','published'])->default('draft');
            $t->json('meta')->nullable(); $t->timestamp('published_at')->nullable();
            $t->morphs('taggable'); $t->rememberToken();
            $t->timestamps(); $t->softDeletes();
            $t->index(['user_id','published_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('posts'); }
};
// alter: Schema::table('posts', fn(Blueprint $t) => $t->string('foo')->nullable()->after('title'));
// modifiers: ->nullable()->default()->unique()->index()->comment()->constrained()->nullOnDelete()->restrictOnDelete()
// commands: migrate --force --isolated | migrate:rollback --step=5 | migrate:fresh --seed | migrate --pretend
```

## FACTORIES & SEEDING
```php
class UserFactory extends \Illuminate\Database\Eloquent\Factories\Factory {
    protected $model = User::class;
    public function definition(): array { return ['name'=>fake()->name(),'email'=>fake()->unique()->safeEmail(),'password'=>'password']; }
    public function admin(): static { return $this->state(fn()=>['role'=>'admin']); }
}
User::factory()->create(); User::factory()->count(3)->create(); User::factory()->admin()->create();
User::factory()->has(Post::factory()->count(3))->create();
```
Seeder: `$this->call([UserSeeder::class]); User::factory(10)->create();` → `php artisan db:seed`.

## API RESOURCES
```php
namespace App\Http\Resources;
use Illuminate\Http\Request; use Illuminate\Http\Resources\Json\JsonResource;
class UserResource extends JsonResource {
    public function toArray(Request $request): array {
        return [
            'id'=>$this->id,'name'=>$this->name,
            'posts'=>PostResource::collection($this->whenLoaded('posts')),
            'email'=>$this->when($request->user()?->isAdmin(), $this->email),
            'count'=>$this->whenCounted('posts'),
        ];
    }
}
// collection: class UserCollection extends \Illuminate\Http\Resources\Json\ResourceCollection { public $collects = Member::class; }
return new UserResource($user); return UserResource::collection($users);
return User::findOrFail($id)->toResource();            // convention (12)
return User::all()->toResourceCollection();
UserResource::withoutWrapping();
```

## COLLECTIONS (eager) & LAZY
```php
collect([1,2,3])->map(fn($x)=>$x*2)->filter(fn($x)=>$x>2)->values();
 ->reject(fn($x)=>...) ->each(fn($x)=>...) ->flatMap(fn($x)=>[$x,$x]) ->transform(fn($x)=>...) // transform mutates
 ->reduce(fn($c,$x)=>$c+$x, 0) ->pipe(fn($c)=>$c->sum()) ->tap(fn($c)=>...) ->through(fn($c)=>...)
 ->when($cond, fn($c)=>..., fn($c)=>...) ->unless($cond, fn($c)=>...) ->whenNotEmpty(...) ->whenEmpty(...)
 ->sortBy('name')->sortByDesc('x')->groupBy('type')->keyBy('id')->unique('id')
 ->partition(fn($i)=>$i%2===0) ->chunk(3) ->collapse() ->flatten() ->pluck('name','id')
 ->where('x',1)->whereIn('id',[1,2])->contains(fn($x)=>...) ->every(fn($x)=>...)
 ->sum('amt') ->avg('amt') ->min('amt') ->max('amt') ->implode('name',', ') ->toArray() ->toJson()
 ->mapWithKeys(fn($v,$k)=>[$k=>$v]) ->mapSpread(fn($a,$b)=>...) ->eachSpread(...)
 ->sliding(2) ->zip([...]) ->forPage(2,2) ->pipe(...)
// higher-order: ->each->method()  ->sum->votes  ->filter->isActive()  ->map->name  ->groupBy->team
// lazy: User::cursor(), User::query()->lazy(), LazyCollection::make(function(){ yield ...; })
```
RULE: `filter()` keeps keys → call `->values()` before `->toArray()` for 0-based.

## BLADE
```blade
<x-layouts.app :title="$t"> ... {{ $slot }} ... </x-layouts.app>
@include('partial',['x'=>1]) @includeIf @includeWhen($c,'partial') @includeUnless @includeFirst(['a','b']) @includeIsolated('p',['u'=>$u])
@each('view.name', $jobs, 'job', 'view.empty')
@if($x) @elseif($y) @else @endif @unless($x) @isset($x) @empty($x)
@auth ... @endauth @guest ... @endguest @production @env(['staging','production']) @endenv
@can('update',$post) @cannot @canany(['update','delete'],$post) @endcanany
@switch($i) @case(1) @break @default @endswitch
@foreach($items as $i) {{ $loop->index }} {{ $loop->first }} {{ $loop->last }} {{ $loop->iteration }} {{ $loop->parent->first }} @endforeach
@forelse($items as $i) @empty vazio @endforelse @for @while @continue @break
{{ $x }}          {{-- ESCAPES (XSS-safe) --}}
{!! $safe !!}     {{-- NEVER untrusted --}}
{{ Illuminate\Support\Js::from($array) }}   {{-- safe JSON for JS --}}
@class(['p-4','font-bold'=>$active]) @style(['color:red'=> $active])
@checked(old('a',$u->a)) @selected(old('v')==$v) @disabled($errors->isNotEmpty()) @readonly($x) @required($x)
@csrf @method('PUT')
@push('scripts') <script>@endpush @stack('scripts') @prepend @pushOnce('scripts','id') @endPushOnce
@inject('metrics','App\Services\Metrics') @php $x=1; @endphp @use('App\Models\Flight') @verbatim @{{ literal }} @endverbatim
@session('status') {{ $value }} @endsession @context('canonical') {{ $value }} @endcontext
@error('title') {{ $message }} @enderror
@fragment('user-list') ... @endfragment    {{-- return view(...)->fragment('user-list') --}}
{{-- components: @props(['type'=>'info','message']) ; @aware(['color'=>'gray']) ; $attributes->merge(['class'=>...]) --}}
{{-- custom: Blade::directive('datetime', fn($e)=>"<?php echo ($e)->format('d/m/Y'); ?>"); Blade::if('prod', fn()=>app()->environment('production')); --}}
```

## SECURITY
```php
// Auth (guards web/api/sanctum; providers eloquent/database)
Auth::attempt(['email'=>$e,'password'=>$p], $remember=true);
Auth::attemptWhen([...], fn(User $u)=>$u->isNotBanned());
Auth::login($u); Auth::loginUsingId(1); Auth::once($creds); Auth::guard('admin')->attempt($creds);
Auth::user(); Auth::id(); Auth::check(); Auth::guest(); $request->user();
Auth::logout(); $request->session()->invalidate(); $request->session()->regenerateToken();
if (Auth::attempt($creds)) { $request->session()->regenerate(); }
// Sanctum (php artisan install:api)
$user->createToken('name', ['ability'])->plainTextToken; $user->tokenCan('ability');
Route::get('/user', fn(Request $r)=>$r->user())->middleware('auth:sanctum');
$request->user()->currentAccessToken()->delete();
// Authorization
Gate::define('update-post', fn(User $u, Post $p)=>$u->id===$p->user_id);
Gate::authorize('update-post', $post); Gate::allows/denies/forUser/any/none;
Gate::allowIf(fn(User $u)=>$u->isAdmin()); Gate::denyIf(fn(User $u)=>$u->banned());
// Policy: make:policy PostPolicy --model=Post ; auto-discovery ; #[UsePolicy(OrderPolicy::class)] ; Gate::policy(Model::class, Policy::class)
$request->user()->can('update', $post); Gate::authorize('update', $post); ->middleware('can:update,post');
// NOTE: base Controller (11/12) is empty; `$this->authorize()` needs `use AuthorizesRequests;`
// Hashing (bcrypt default; argon/argon2id supported)
Hash::make($pw); Hash::make($pw, ['rounds'=>12]); Hash::check($pw,$hash); Hash::needsRehash($hash); // HASH_VERIFY=false bypass
// Encryption (AES-256-CBC + MAC; APP_KEY; rotate with APP_PREVIOUS_KEYS)
Crypt::encryptString($v); Crypt::decryptString($v); // DecryptException
// CSRF: @csrf ; validateCsrfTokens(except:['stripe/*']) ; X-CSRF-TOKEN / XSRF-TOKEN
// Mass assignment: $fillable/$guarded ; always $request->validated() (never $request->all())
// Session: regenerate() after login, invalidate() on logout, flash()/reflash(), drivers file|cookie|database|redis|memcached|dynamodb|array
// XSS: {{ }} only ; e($v) ; never {!! $userInput !!}
// Rate limit: RateLimiter::for(...) + ->middleware('throttle:uploads') ; throttleWithRedis()
// Model strictness: Model::shouldBeStrict(! app()->isProduction());
```

## CACHE / QUEUES / PERFORMANCE
```php
Cache::put('k',$v,60); Cache::get('k'); Cache::remember('k',60,fn()=>Post::all());
Cache::rememberForever('k', fn()=>...); Cache::flexible('k',[5,10], fn()=>...);  // SWR (12)
Cache::memo()->get('k');                       // memoized per request/job (12)
Cache::forever('k',$v); Cache::forget('k'); Cache::add('k',$v,60); Cache::pull('k'); Cache::increment('k');
Cache::tags(['a','b'])->remember(...); ->flush();     // redis/memcached only
Cache::lock('foo',10)->get(fn()=>...); Cache::lock('foo',10)->block(5);
// Queues (queue:work; supervisor/horizon)
class SendMail implements \Illuminate\Contracts\Queue\ShouldQueue { use \Illuminate\Foundation\Queue\Queueable;
    public int $tries=3; public int $timeout=60; public int $maxExceptions=3;
    public function backoff(): array { return [1,5,10]; } public function retryUntil(): \DateTime { return now()->addMinutes(5); }
    public function middleware(): array { return [new \Illuminate\Queue\Middleware\WithoutOverlapping($this->id)]; }
    public function handle(): void {}
}
SendMail::dispatch($m); SendMail::dispatch($m)->onQueue('emails')->delay(now()->addMinutes(5))->afterCommit();
Bus::chain([new A, new B])->catch(fn($e)=>...)->dispatch();
Bus::batch([new A, new B])->then(...)->catch(...)->finally(...)->dispatch();
Bus::findBatch($id)->progress();
// deploy cache (12)
php artisan optimize        // config + event + route + view cache
php artisan optimize:clear
composer install --optimize-autoloader --no-dev
php artisan reload          // reload workers/reverb/octane
// no route/event: use `php artisan queue:restart` after deploy
```
N+1, cursor/lazy, chunk, indexes, withCount = main wins. Octane: use `scoped` bindings, watch leaks.

## LOGS & ERRORS (12 = `config/logging.php` + `withExceptions`)
```php
// config/logging.php
'default'=>env('LOG_CHANNEL','stack'),
'channels'=>['stack'=>['driver'=>'stack','channels'=>['single','slack']],
  'daily'=>['driver'=>'daily','path'=>storage_path('logs/laravel.log'),'days'=>env('LOG_DAILY_DAYS',14)], ...];
Log::debug('msg',['ctx'=>1]); logger()->info('x'); info('x'); Log::channel('slack')->critical('x');
Log::withContext(['request_id'=>(string) Str::uuid()]);
// bootstrap/app.php
->withExceptions(function (Exceptions $e): void {
    $e->report(fn(InvalidOrderException $ex)=>{ /* notify */ })->stop();
    $e->dontReport([InvalidOrderException::class]); $e->dontReportWhen(fn(Throwable $x)=>...);
    $e->dontReportDuplicates(); $e->context(fn()=>['foo'=>'bar']);
    $e->level(PDOException::class, \Psr\Log\LogLevel::CRITICAL);
    $e->render(fn(InvalidOrderException $ex, Request $r)=>response()->view('errors.x',[],500));
    $e->shouldRenderJsonWhen(fn(Request $r, Throwable $x)=>$r->expectsJson());
    $e->respond(fn(Response $r)=>$r->getStatusCode()===419 ? back()->with('message','expired') : $r);
    $e->throttle(fn(Throwable $x)=>Lottery::odds(1,1000));
});
// reportable/renderable on the exception class: report(): bool ; render(Request $r): Response|bool
abort(404); abort_if(!$x,403); abort_unless($x,403);
report($e); rescue(fn()=>risky(), 'fallback');
// error pages: resources/views/errors/404.blade.php, 500.blade.php (503 = maintenance)
// Pail: php artisan pail
```

## PROXY (behind LB / Cloudflare / Nginx)
```php
use Illuminate\Http\Request;
->withMiddleware(function (Middleware $m): void {
    $m->trustProxies(at: ['192.168.1.1', '10.0.0.0/8']);   // NEVER '*' in prod (unless ELB/Cloudflare)
    $m->trustProxies(headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PORT | Request::HEADER_X_FORWARDED_PROTO | Request::HEADER_X_FORWARDED_AWS_ELB);
    $m->trustHosts(at: ['^example\.com$'], subdomains: false);
});
// then $request->ip() / isSecure() / getScheme() / url() are correct
// URL::forceScheme('https') fixes links but NOT client IP
```

## TESTING (12)
```php
namespace Tests\Feature;
use Tests\TestCase; use Illuminate\Foundation\Testing\RefreshDatabase; use App\Models\User;
class PostTest extends TestCase {
    use RefreshDatabase;                                  // prefer over DatabaseMigrations
    public function test_list(): void {
        $u = User::factory()->create();
        $p = Post::factory()->count(3)->create(['user_id' => $u->id]);
        $this->actingAs($u)->get('/posts')->assertOk()->assertSee($p[0]->title);
        $this->assertDatabaseHas('posts', ['id' => $p[0]->id]);
        $this->assertDatabaseMissing('posts', ['id' => 999]);
    }
    public function test_auth(): void { $this->get('/dashboard')->assertRedirect('/login'); }
}
// fakes: Http::fake(); Mail::fake(); Queue::fake(); Event::fake(); Notification::fake(); Storage::fake(); Bus::fake(); Exceptions::fake();
// test runner: php artisan test [--parallel] [--coverage --min=80]
// Pest also supported; WithCachedConfig for faster suites
```

## SCHEDULING
```php
// routes/console.php (or withSchedule in bootstrap/app.php)
use Illuminate\Support\Facades\Schedule;
Schedule::call(fn()=>DB::table('recent_users')->delete())->daily();
Schedule::command('emails:send Taylor --force')->daily();
Schedule::command(SendEmailsCommand::class, ['Taylor','--force'])->daily();
Schedule::job(new \App\Jobs\Heartbeat, 'heartbeats', 'sqs')->everyFiveMinutes();
Schedule::exec('node script.js')->daily();
// frequencies: everySecond..everyThirtySeconds, everyMinute, hourly(At), daily(At), twiceDaily, daysOfMonth, weekly(On), monthly, quarterly, yearly, timezone('...')
// modifiers: withoutOverlapping(), onOneServer(), runInBackground(), evenInMaintenanceMode(), when(fn()=>...), onSuccess/onFailure
php artisan schedule:list
// cron: * * * * * php /path/artisan schedule:run >> /dev/null 2>&1
```

## STORAGE / FILES
```php
use Illuminate\Support\Facades\Storage;
$request->file('avatar')->store('avatars');           // unique name, returns path
$request->file('avatar')->store('avatars','s3');
$request->file('avatar')->storeAs('avatars', 'a.jpg');
Storage::disk('public')->put('x.png', $content); Storage::url('x.png'); Storage::temporaryUrl('x.png', now()->addMinutes(5));
Storage::get('x'); Storage::exists('x'); Storage::delete('x'); Storage::copy/move/makeDirectory/files/directories;
php artisan storage:link                                // public/storage -> storage/app/public
// disks in config/filesystems.php: local, public, s3, ...
```

## LOCALIZATION
```php
// resources/lang/en/messages.php  (or lang/ in app root)
__('messages.welcome'); trans('messages.welcome'); @lang('messages.welcome')
__('messages.apples', ['count' => $n]); trans_choice('messages.apples', $n);
App::setLocale('pt_BR'); app()->getLocale(); app()->isLocale('en');
```

## HELPERS (quick)
`config env`(config-only) `app auth route url asset secure_url` `abort abort_if abort_unless`
`optional data_get data_set data_fill data_forget value with retry rescue tap collect`
`defer once transform throw_if throw_unless report rescue` `now today blank filled class_basename e`
`old session cache csrf_field method_field request response redirect view bcrypt encrypt decrypt`
`dd dump logger info` `Str Arr Number Js Uri Context Sleep Lottery Pipeline Benchmark Timebox`

## LINT / FMT / QUALITY
```bash
./vendor/bin/pint                       # fix style (official)
./vendor/bin/pint --test                # CI check (non-zero on diff)
./vendor/bin/pint --dirty --parallel
./vendor/bin/pint --preset psr12        # laravel|per|psr12|symfony|empty
```
`pint.json`: `{"preset":"laravel","rules":{...},"exclude":[...],"notName":[...],"notPath":[...]}`.
Ecosystem: Larastan/PHPStan (`phpstan analyse`), Rector (`rector process`), IDE Helper. Use `.editorconfig`.
See `12-qualidade-e-pint.md`.

## TESTING
```php
use Illuminate\Foundation\Testing\RefreshDatabase; use Illuminate\Http\UploadedFile; use Illuminate\Support\Facades\Storage;
class T extends TestCase { use RefreshDatabase;
  public function test_x(): void {
    $u = User::factory()->create();
    $this->actingAs($u)->get('/posts')->assertOk()->assertSee('x');
    $this->postJson('/api/users', ['name'=>'A'])->assertJsonPath('name','A');
    Storage::fake('public'); $this->post('/avatar',['avatar'=>UploadedFile::fake()->image('a.jpg')]);
    $this->artisan('emails:send')->expectsQuestion('Nome?','A')->assertSuccessful();
    $this->travel(5)->minutes(); $this->freezeTime();
  }
}
```
Fakes: `Http Mail Queue Event Bus Notification Storage Cache Exceptions ::fake()`. `php artisan test --parallel`.
Dusk (browser): `composer require laravel/dusk --dev` + `php artisan dusk`. See `13-testes.md`.

## API & AUTH PACKAGES
```php
// Sanctum: install:api ; $user->createToken('n',['ability'])->plainTextToken ; middleware('auth:sanctum')
// SPA: ->withMiddleware(fn($m)=>$m->statefulApi()); axios.withCredentials/withXSRFToken; /sanctum/csrf-cookie
// Fortify: composer require laravel/fortify ; fortify:install ; config/fortify.php features ; Fortify::loginView()
// Passport: composer require laravel/passport ; passport:install ; createToken()->accessToken ; auth:api ; scope:
// Socialite: Socialite::driver('github')->redirect() ; ->user() ; Auth::login($u)
// Verify email: implements MustVerifyEmail ; routes verification.notice/verify/send ; middleware('verified')
// Reset: Password::sendResetLink / Password::reset ; routes password.request/email/reset/update
// Precognition: HandlePrecognitiveRequests middleware + laravel-precognition-* frontend
// Pennant: Feature::define('x', fn($u)=>...); Feature::active('x'); @feature ... @endfeature
```
See `14-api-e-autenticacao.md`.

## MAIL / NOTIFICATIONS / BROADCAST / HTTP / PROCESS
```php
Mail::to($u)->send(new OrderShipped($o)); Mail::to($u)->queue(...); Mail::fake(); Mail::assertSent(...);
$u->notify(new InvoicePaid($i)); Notification::route('mail',$email)->notify(...);
// via(): mail|database|broadcast|vonage|slack ; toMail/toDatabase/toBroadcast/toVonage/toSlack
// broadcasting: implements ShouldBroadcast + broadcastOn() ; routes/channels.php Broadcast::channel(...) ; Echo.private()
Http::get('...')->json(); Http::withToken($t)->retry(3)->post('...'); Http::pool(fn($p)=>[...]); Http::fake();
$r = Process::run('ls -la'); $r->successful(); Process::start('...')->wait(); Process::concurrently(...);
```
See `15-comunicacao.md`.

## OBSERVABILITY / SEARCH / TOOLS
```php
// Horizon (redis queues): composer require laravel/horizon ; horizon:install ; gate viewHorizon ; horizon:terminate on deploy
// Pulse: composer require laravel/pulse ; /pulse ; gate viewPulse ; Telescope: --dev ; /telescope ; local only
// full-text: $table->fullText(['t','b']); Model::whereFullText('b','q')->get();
// vector: Str::of('x')->toEmbeddings(); Model::whereVectorSimilarTo('embedding',$v)->take(10)->get();
// Scout: use Searchable; toSearchableArray(); Post::search('x')->paginate(); SCOUT_DRIVER=database|collection|algolia|meilisearch|typesense
// Sail: sail up -d | artisan | npm | test ; Valet: valet link/secure/share ; Envoy: envoy run deploy
// Folio: pages/*.blade.php -> URIs ; Vite: @vite([...]) ; npm run dev|build
```
See `16-observabilidade-e-cache.md`, `17-busca-e-eloquent-avancado.md`, `18-ferramentas-e-starter-kits.md`.

## DEPLOY / OCTANE / CONCURRENCY
```bash
composer install --optimize-autoloader --no-dev && php artisan optimize && php artisan reload
# granular: config:cache event:cache route:cache view:cache ; optimize:clear
```
```php
// Octane: composer require laravel/octane ; octane:install --server=frankenphp ; octane:start --workers=8 --max-requests=500
// use ->scoped() bindings ; avoid static mutable state ; Octane::concurrently([...]) ; Cache::store('octane')
Concurrency::run([fn()=>..., fn()=>...]); Concurrency::defer([...]);
```
Health check `/up`. See `19-deploy-e-escala.md`.

## AI / PROMPTS / BILLING
```php
// AI SDK: composer require laravel/ai ; php artisan make:agent SalesCoach ; (new SalesCoach)->prompt('...')->text
// Image::of('...')->generate() ; Audio::of('...') ; Transcription::fromPath('x.mp3') ; Embeddings::for([...]) ; Reranking::of([...])->rerank('q') ; SalesCoach::fake()
// Boost: composer require laravel/boost --dev ; boost:install ; MCP servers/tools: make:mcp-tool
// Prompts: use function Laravel\Prompts\{text,select,confirm,progress,spin};
// Cashier: composer require laravel/cashier ; use Billable; $user->newSubscription('default','price')->create($pm);
```
See `20-ia-e-billing.md`.

## ANTI-PATTERNS (never)
- ❌ `env()` in controllers/services → ✅ `config('x.y')`
- ❌ business logic in routes/Blade → ✅ service/action/model
- ❌ N+1 loops → ✅ `with()`/`withCount()`
- ❌ `Kernel.php`/`Handler.php`/providers in `config/app.php` → ✅ `bootstrap/app.php` + `bootstrap/providers.php`
- ❌ untrusted `{!! $x !!}` (XSS) → ✅ `{{ }}`
- ❌ raw SQL concat → ✅ bindings (`?` or `whereRaw('x = ?',[$v])`)
- ❌ `$request->all()` in `create/update` → ✅ `$request->validated()`
- ❌ `Model::all()` then filter in PHP → ✅ query builder / scopes / pagination
- ❌ route closures if you plan to run `route:cache` → ✅ controller routes
- ❌ `singleton` for per-request state under Octane → ✅ `scoped`
- ❌ Breeze/Jetstream for new apps → ✅ 12 starter kits (React/Vue/Svelte/Livewire)
- ❌ PHP 8.4 syntax if target is 8.2 → ✅ respect the floor
