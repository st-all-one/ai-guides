---
name: laravel-55
description: Author correct Laravel 5.5.50 code/config/architecture. Use when generating or reviewing Laravel 5.5 files (controllers, models, routes, Blade, migrations, providers, config). Enforces version boundaries (PHP 7.0-7.2) and the 5.5 feature set.
---

# SKILL: Laravel 5.5.50 — Correct Dev / Config / Structure

LTS. Runs on **PHP 7.0, 7.1, 7.2** (7.2 OK in 5.5.50 patches). Code below is version-true.

## PHP TYPING MATRIX (what you may use)

| Feature | PHP | Use in 5.5 |
|---|---|---|
| scalar hints `int string bool float array callable` | 7.0 | ✅ params & return |
| `return` type declarations | 7.0 | ✅ `: View`, `: array`, `: Builder` |
| `iterable`, `void` | 7.1 | ✅ |
| nullable `?Type`, `?string` | 7.1 | ✅ |
| `object` param hint | **7.2** | ✅ if target runs 7.2 |
| trailing comma in fn calls / grouped `use` | **7.2** | ✅ if 7.2 |
| arrow fns `fn()=>` | 7.4 | ❌ |
| typed properties `public int $x` | 7.4 | ❌ |
| union `int\|string`, `mixed` | 8.0 | ❌ |
| constructor property promotion | 8.0 | ❌ (declare props explicitly) |

DocBlocks (`@var Collection|Post[]`) cover union/generic needs.

## HARD VERSION BOUNDARIES (do NOT emit)

| Want | 5.5 reality | Do |
|---|---|---|
| cache config / log channels | `config/logging.php` is **5.6+** | `config/app.php`: `log`,`log_level`,`log_max_files` (no `days`) |
| `php artisan optimize` | **removed** | `route:cache`+`config:cache`+`view:cache` |
| `@csrf` | 5.6+ | `{{ csrf_field() }}` |
| `@error` | 5.8+ | `@if($errors->has('x'))` |
| Argon hash | 5.6+ | `Hash::make` (bcrypt) |
| native email verify | 5.7+ | custom |
| `upsert`/`insertOrIgnore`/`fromSub`/`cursorPaginate` | 8+ | `updateOrCreate`/`insert`/`cursor()`(Generator) |
| Lazy Collections / `lazy()` | 6+ | `cursor()` = Generator; `->get()` |
| `Blade::component()` alias, `@canany`, `@prepend` | 5.6+ | `@component('v')`+`@slot` |
| `Route::apiResource` | 5.6+ | `Route::resource` + policy |
| **Exists in 5.5 ✅**: `Route::view`/`redirect`, API Resources, Package Auto-Discovery, `TrustProxies` shipped, renderable/reportable exceptions, Blade `@component`/`@slot`/`Blade::if`, signed URLs, `down --allow`, `tap()`/`retry()` helpers, `cursor()`, `RefreshDatabase`, rule objects (`Illuminate\Contracts\Validation\Rule`), `Route::resource`, `loadCount` | | use freely |

## STRUCTURE
```
app/Models/         Eloquent (App\Models\X; FQCN for binding)
app/Services/       business logic (DI target)
app/Http/Controllers/   thin; root ns App\Http\Controllers (no forced prefix)
app/Http/Requests/      Form Requests
app/Http/Middleware/    incl TrustProxies
app/Providers/         ServiceProviders
app/Console/            Kernel + Commands
config/  *.php  (env() ONLY here)
routes/{web,api,console,channels}.php
resources/views/{layouts,components}/
database/{migrations,seeds,factories}/
```
Register providers → `config/app.php` `providers`; middleware → `app/Http/Kernel.php`.

## CONFIG & ENV
```php
// config/site.php — env() ONLY inside config files
return ['name'=>env('SITE_NAME','Demo'),'social'=>['gh'=>env('SITE_GH')]];
```
```php
config('site.name'); config('site.social.gh');      // dot notation
config(['app.timezone'=>'UTC']);                      // runtime set (non-persistent)
```
RULE: after `config:cache`, `env()` returns `null` outside config → never `env()` in code.

## SERVICE CONTAINER & PROVIDERS
```php
// bind
$this->app->bind(InvoiceCalculator::class, function($app){ return new InvoiceCalculator(); });
$this->app->singleton(Cache::class, fn($a)=>new RedisCache);   // NO arrow fn on 7.1
$this->app->instance(X::class, $obj);
$this->app->bind(Contract::class, Impl::class);     // interface→impl
// resolve
app(Contract::class); app()->make(Contract::class); resolve(Contract::class);
// contextual
$this->app->when(Controller::class)->needs(Logger::class)->give(FileLogger::class);
```
```php
class SiteServiceProvider extends ServiceProvider {
    public function register(): void { /* bind only; nothing unregistered */ }
    public function boot(): void {
        View::composer('layouts.app', function($v){ $v->with('name',config('site.name')); });
        // macros: Collection::macro('toUpper',fn($c)=>$c->map->upper()); (Blade::directive too)
    }
    // deferrable (5.5): protected $defer=true; public function provides(){return [X::class];}
}
```
Prefer **Contracts** over facades for testability. Facades are mockable via `X::shouldReceive('m')->andReturn(...)` in tests.

## FACADES & MACROS
```php
// custom facade: 1) bind in provider 2) class extends Facade { protected static function getFacadeAccessor(){return 'payment';} }
// 3) alias in config/app.php 'aliases'
// Macroable traits: Collection, Request, Response, Route, Arr, Str support ::macro()
Str::macro('part', function($s,$n){ return explode('-',$s)[$n]; });
```

## ROUTING (`routes/web.php`)
```php
Route::view('/sobre','about')->name('about');                 // 5.5  (cacheable)
Route::redirect('/old','/',301);                               // 5.5  (cacheable)
Route::get('/posts','PostController@index')->name('posts.index');
Route::get('/posts/{post}','PostController@show');            // {post} => implicit model binding
Route::post('/posts','PostController@store');
Route::resource('photos','PhotoController');                  // index/show/store/update/destroy/create/edit
Route::apiResource('api/photos','PhotoController');           // NO (5.6) -> use resource + middleware
// groups
Route::prefix('admin')->middleware('auth','can:admin')->namespace('Admin')->group(function(){
    Route::get('/', 'DashController@index');
});
Route::middleware('auth')->group(function(){                   // closure OK ONLY if you never run route:cache
    Route::post('/posts', 'PostController@store');             // controller ref = cacheable
});
// constraints
Route::get('/u/{id}','UserController@show')->where('id','[0-9]+'); // whereNumber('id'), whereAlpha, whereUuid(5.5)
// signed URLs (5.5)
URL::signedRoute('post.show',['post'=>1]); URL::temporarySignedRoute('x',now()->addHour(),['post'=>1]);
// in route: ->middleware('signed'); in ctrl: abort_unless($request->hasValidSignature(),403);
// fallback, throttle  (NOTE: fallback CLOSURE breaks route:cache -> use a controller)
Route::fallback('ErrorController@notFound');
Route::get('/api','ApiController@index')->middleware('throttle:60,1');   // 60 req/min

// ⚠ ROUTE CACHING CONSTRAINT (php artisan route:cache)
//   route:cache serializes routes to a PHP array — CLOSURES CANNOT be serialized.
//   => cached routes MUST reference controllers: 'Ctrl@method' | [Ctrl::class,'method']
//   => cacheable: Route::view, Route::redirect, Route::resource, controller routes.
//   => NOT cacheable: Route::get('/x', function(){}) and Route::fallback(function(){}).
//   If you must keep closure/fallback routes, run `php artisan route:clear` (no cache) instead.
```
Route model binding: implicit by param name+type-hint; explicit via `Route::bind('post',fn($id)=>Post::where('slug',$id)->firstOrFail())` in `RouteServiceProvider::boot()`.

## MIDDLEWARE
```php
namespace App\Http\Middleware;
use Closure;
class CheckAge {
    public function handle($request, Closure $next, $min=18) {
        abort_unless($request->user() && $request->user()->age>=$min, 403);
        return $next($request);
    }
    public function terminate($request, $response){ /* after response sent */ }
}
// register $routeMiddleware['age'=>CheckAge::class]; $middleware global stack.
```

## CONTROLLERS (thin, typed)
```php
namespace App\Http\Controllers;
use App\Models\Post; use App\Services\PostService; use Illuminate\Http\Request; use Illuminate\View\View;
class PostController extends Controller {
    protected $posts;
    public function __construct(PostService $posts){ $this->posts=$posts; }   // NO 8.0 promotion
    public function index(): View { $p=Post::published()->paginate(10); return view('posts.index',compact('p')); }
    public function show(Post $post): View { abort_unless((bool)$post->published_at,404); return view('posts.show',compact('post')); }
    public function store(Request $r): \Illuminate\Http\RedirectResponse { /* use Form Request instead */ }
}
// single-action: class XController extends Controller { public function __invoke(){ } }
// resource: --resource; api: return Resource::collection(...)
// action injection: public function show(Post $post, Request $r)
// middleware in ctor: $this->middleware('auth')->only(['store']); $this->middleware('log')->except(['index']);
```

## FORM REQUESTS & VALIDATION
```php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class StorePost extends FormRequest {
    public function authorize(): bool { return (bool) $this->user(); }
    public function rules(): array {
        return [
            'title'=>'required|string|max:255',
            'slug'=>'required|string|unique:posts,slug',
            'body'=>'required|string|min:10',
            'cover'=>'nullable|image|max:2048',
            'tags'=>'array','tags.*'=>'string',          // array validation
        ];
    }
    public function messages(): array { return ['slug.unique'=>'Slug em uso.']; }
    public function attributes(): array { return ['body'=>'corpo']; }
    // hooks
    protected function prepareForValidation(): void { $this->merge(['slug'=>Str::slug($this->title)]); }
    public function withValidator($validator): void { $validator->after(fn($v)=>/* ... */); } // 7.1 fn in closure? NO -> function(){}
}
// custom RULE OBJECT (5.5): implements Illuminate\Contracts\Validation\Rule
class Uppercase implements \Illuminate\Contracts\Validation\Rule {
    public function passes($attr,$val): bool { return strtoupper($val)===$val; }
    public function message(): string { return 'The :attribute must be uppercase.'; }
}
// usage: 'name'=>['required', new Uppercase]
// fluent Rule::unique('users')->ignore($id)->where('team_id',$tid)
```
Controller: `$data=$request->validated();` (5.5) or `$request->only([...])`. Blade errors: `@if($errors->has('title')) {{ $errors->first('title') }} @endif`.

## MODELS / ELOQUENT
```php
namespace App\Models;
use Illuminate\Database\Eloquent\Model; use Illuminate\Database\Eloquent\SoftDeletes;
class Post extends Model {
    use SoftDeletes;
    protected $table='posts'; protected $primaryKey='id'; public $timestamps=true;
    protected $fillable=['title','slug','body','published_at'];   // mass-assignment whitelist
    // OR $guarded=['id'];  (blacklist)
    protected $hidden=['secret']; protected $visible=['title']; protected $appends=['excerpt'];
    protected $casts=['published_at'=>'datetime','is_featured'=>'bool','meta'=>'array','amount'=>'float'];
    protected $dates=['published_at','deleted_at'];               // older style; casts ok
    protected $attributes=['is_featured'=>false];                 // defaults

    public function getExcerptAttribute(): string { return Str::limit(strip_tags($this->body),160); }
    public function setSlugAttribute($v): void { $this->attributes['slug']=Str::slug($v); } // mutator
    public function scopePublished(\Illuminate\Database\Eloquent\Builder $q): \Illuminate\Database\Eloquent\Builder {
        return $q->whereNotNull('published_at')->where('published_at','<=',now());
    }
    public function scopeOfType($q,$t){ return $q->where('type',$t); }
}
// retrieve
Post::find(1); Post::findOrFail(1); Post::first(); Post::firstOrFail();
Post::firstOrCreate(['slug'=>$s],['title'=>$t]); Post::firstOrNew([...]);
Post::updateOrCreate(['slug'=>$s],['title'=>$t]);
$post->fill($a); $post->forceFill(['secret'=>$x]); $post->save(); $post->update([...]); $post->delete(); $post->forceDelete();
// soft deletes
Post::withTrashed()->...; Post::onlyTrashed()->...; $post->restore(); $post->trash();
// JSON
$post->toArray(); $post->toJson(); $post->append('excerpt')->toArray();
```

## RELATIONSHIPS
```php
// one-to-one
public function phone(){ return $this->hasOne(Phone::class); }      // Phone: belongsTo(User::class)
public function user(){ return $this->belongsTo(User::class)->withDefault(); }  // withDefault avoids null
// one-to-many
public function comments(){ return $this->hasMany(Comment::class); }
// many-to-many
public function roles(){ return $this->belongsToMany(Role::class)->withPivot('expires')->withTimestamps(); }
// custom pivot: belongsToMany(Role::class)->using(RoleUser::class)  (RoleUser extends Pivot)
// hasManyThrough
public function comments(){ return $this->hasManyThrough(Comment::class, Post::class); }
// polymorphic
public function image(){ return $this->morphOne(Image::class,'imageable'); }
public function images(){ return $this->morphMany(Image::class,'imageable'); }
public function commentable(){ return $this->morphTo(); }   // on Image
// many-to-many polymorphic
public function tags(){ return $this->morphToMany(Tag::class,'taggable'); }
// access
$user->posts; $user->posts()->where('active',1)->get(); $post->user()->associate($u); $u->roles()->attach($id,$pivot); sync([1,2]); detach($id);
```

## EAGER LOADING & N+1
```php
$books = Book::with('author')->get();                       // avoids N+1
$books = Book::with(['author','publisher'=>fn($q)=>$q->where('active',1)])->get(); // constraint (closure!)
$books = Book::with('author.profile')->get();               // nested
$book->load('author'); $book->loadMissing('author');        // lazy
Book::withCount('comments')->withCount(['reviews'=>fn($q)=>$q->where('ok',1)])->get();
$book->loadCount('comments');
// existence
Post::has('comments')->with('comments'); Post::whereHas('comments',fn($q)=>$q->where('ok',1));
Post::doesntHave('comments'); Post::whereDoesntHave('comments',...);
// touch parent on save: protected $touches=['post']; on Comment
```

## QUERY BUILDER & TRANSACTIONS
```php
use Illuminate\Support\Facades\DB;
DB::table('users')->where('age','>',18)->orderBy('name')->limit(10)->get();
DB::table('users')->whereIn('id',[1,2,3])->get();
DB::table('u')->whereNull('x')->whereNotNull('y')->whereBetween('age',[18,65])->whereColumn('a','b')->get();
DB::table('u')->whereDate('created_at',today())->whereMonth('created_at','12')->get();
DB::table('u')->join('p','u.id','=','p.user_id')->leftJoin('c',...)->select('u.*','p.name')->get();
DB::table('u')->join('p',fn($j)=>$j->on('u.id','p.user_id')->where('p.active',1))->get(); // advanced join
// aggregations
DB::table('u')->count(); ->max('age'); ->avg('age'); ->sum('amount'); ->exists(); ->doesntExist();
// raw (bind params!)
DB::select('select * from users where id = ?',[$id]);   // ALWAYS bind
DB::table('u')->selectRaw('count(*) as c')->whereRaw('age > ?',[18])->get();
DB::table('u')->insert([['name'=>'a'],['name'=>'b']]); DB::table('u')->update(['x'=>1]); DB::table('u')->delete();
DB::table('u')->increment('visits'); DB::table('u')->decrement('visits',2);
// transactions
DB::transaction(function(){ /* closure */ DB::table('a')->update([...]); });   // closure = function(){}
DB::transaction(function(){ ... return true; }, 5);     // 5 retries on deadlock
DB::beginTransaction(); try { ...; DB::commit(); } catch (\Exception $e) { DB::rollBack(); throw $e; }
// chunk / cursor (5.5)
DB::table('u')->orderBy('id')->chunk(100, function($rows){ /* function(){} */ foreach($rows as $r){} });
foreach (User::cursor() as $u) { }   // Generator, NOT LazyCollection
```

## MIGRATIONS & SCHEMA
```php
use Illuminate\Support\Facades\Schema; use Illuminate\Database\Schema\Blueprint; use Illuminate\Database\Migrations\Migration;
class CreatePosts extends Migration {
    public function up(): void {
        Schema::create('posts',function(Blueprint $t){
            $t->increments('id');                 // or bigIncrements
            $t->unsignedInteger('user_id');
            $t->string('title'); $t->string('slug')->unique();
            $t->text('body'); $t->boolean('is_featured')->default(false);
            $t->decimal('price',8,2)->nullable();
            $t->json('meta')->nullable();          // jsonb on pgsql
            $t->timestamp('published_at')->nullable();
            $t->timestamps(); $t->softDeletes();
            $t->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $t->index(['user_id','published_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('posts'); }
}
// modifiers: ->nullable()->default(0)->unsigned()->comment('x')->after('col')->first()
// add: Schema::table('posts',fn($t)=>$t->string('foo')->nullable());
// enum: $t->enum('status',['a','b']);   change: ->change() (needs doctrine/dbal)
```

## API RESOURCES (5.5 — new layer)
```php
namespace App\Http\Resources;
use Illuminate\Http\Resources\Json\Resource;   // base in 5.5
class UserResource extends Resource {
    public function toArray($request): array {
        return [
            'id'=>$this->id,'name'=>$this->name,
            'posts'=>PostResource::collection($this->whenLoaded('posts')),   // conditional relation
            'email'=> $this->when($this->is_admin, $this->email),            // conditional field
            'pivot'=> $this->whenPivotLoaded('role_user', fn()=>$this->pivot->expires), // NO arrow
        ];
    }
    public function with($request): array { return ['status'=>'ok']; }       // meta wrapper
}
// collection
class UserCollection extends \Illuminate\Http\Resources\Json\ResourceCollection {
    public function toArray($request): array { return ['data'=>$this->collection]; }
}
// usage
return new UserResource($user); return UserResource::collection($users); return new UserCollection($users);
Resource::withoutWrapping();   // in AppServiceProvider::boot (removes outermost 'data')
```

## COLLECTIONS (functional, eager — NOT lazy)
```php
collect([1,2,3])->map(fn...);  // NO arrow: ->map(function($x){ return $x*2; })
 ->filter(fn...)->reject(fn...)->each(fn...)->flatMap(fn...)->transform(fn...)  // transform mutates
 ->reduce(function($c,$x){ return $c+$x; },0)   // initial value
 ->pipe(function($c){ return $c->sum(); })      // pass collection to closure, return anything
 ->tap(function($c){ /* side-effect, returns same collection */ })
 ->when($cond, fn($c)=>$c->sort(), fn($c)=>$c)  // conditional (closures!)
 ->unless($cond, fn($c)=>...)                    // inverted when
 ->sortBy('name')->sortByDesc->groupBy('type')->keyBy('id')
 ->partition(fn($i)=>$i%2===0)                  // [$even,$odd]
 ->chunk(3)->split(2)->zip($keys)->collapse()->flatten()->pluck('name')
 ->where('x',1)->whereIn('id',[1,2])->whereNotNull('y')
 ->contains(fn...)->every(fn...)->first(fn...)->last(fn...)->search(fn...)->containsStrict
 ->sum('amt')->avg('amt')->min('amt')->max('amt')
 ->mapWithKeys(fn($i)=>[$i=>$i*2])              // custom keys
 ->mapToGroups(fn($i)=>[$i%2=>$i])              // group by key
 ->mapSpread(fn($k,$v)=>...)                    // eachSpread likewise
 ->slice(0,2)->take(3)->skip(2)->values()->keys()->flip()->union($b)->intersect($b)->diff($b)
 ->unique('id')->implode('name',', ')->toArray()->toJson()
// helpers
optional($user)->address->city;                 // null-safe (5.5)
data_get($arr,'a.b.c', $default); data_set($arr,'a.b',1); value($maybeClosure); with($x,fn($x)=>...);
retry(3, fn()=>..., 100);                        // 5.5 retry() helper
```
RULE: `filter()` keeps keys → call `->values()` before `->toArray()` if you need 0-based.

## BLADE
```blade
@extends('layouts.app') @section('title','X') @parent @endsection @yield('content')
@include('partial',['x'=>1]) @includeIf @includeWhen($c,'partial') @includeFirst(['a','b'])
@component('components.alert',['type'=>'info','message'=>'Hi']) slot @endcomponent   {{-- 5.5 --}}
@slot('title') ... @endslot
@if($x) @elseif($y) @else @endif  @unless($x) @isset($x) @empty($x)
@auth ... @else ... @endauth   @guest ... @endguest
@can('update',$post) @cannot(...) @endcan       @canany(...)  NO (5.6)
@switch($i) @case(1) @break @default @endswitch
@for($i=0;$i<10;$i++) @foreach($items as $i) {{ $loop->index }} {{ $loop->first }} {{ $loop->last }} {{ $loop->iteration }} @endforeach
@forelse($items as $i) @empty vazio @endforelse  @while($c) @endwhile
{{ $x }}            {{-- ESCAPES (XSS-safe) --}}
{!! $safe !!}       {{-- NEVER untrusted --}}
@json($obj)         {{-- pass to JS --}}
@csrf              NO (5.6) -> {{ csrf_field() }}
@method('PUT')     {{-- spoof method --}}
@push('scripts') <script>@endpush  @stack('scripts')
@inject('metrics','App\Services\Metrics')   {{-- avoid business logic in views --}}
@php $x=1; @endphp  @verbatim @{{ literal }} @endverbatim
// custom directive (5.5): Blade::directive('datetime',fn($e)=>"<?php echo ($e)->format('d/m/Y'); ?>");
// Blade::if('prod',fn()=>app()->environment('production'));  -> @prod ... @endprod
```
Comments: `{{-- blade comment --}}`.

## SECURITY
```php
// Auth (guards web/api)
Auth::attempt(['email'=>$e,'password'=>$p]); Auth::login($u); Auth::login($u,true); // remember
Auth::user(); Auth::id(); Auth::logout(); $request->user(); $request->guest();
// Authz
Gate::define('update',fn($u,$post)=>$u->id===$post->user_id);   // closure=function(){}
Gate::authorize('update',$post);  $this->authorize('update',$post);  // in controller (AuthorizesRequests)
// Policy: php artisan make:policy PostPolicy --model=Post ; PostPolicy::update($u,$post)
// Hashing (bcrypt ONLY — no Argon in 5.5)
Hash::make($pw); Hash::check($pw,$hash); Hash::needsRehash($hash);
// Encryption (AES-256-CBC, needs APP_KEY)
Crypt::encryptString($v); Crypt::decryptString($v); encrypt($v); decrypt($v);
// CSRF: middleware VerifyCsrfToken; exclude: protected $except=['/webhook']; form -> {{ csrf_field() }}
// Mass assignment: $fillable/$guarded; $request->validated() (Form Request) not raw $request->all()
// Session: regenerate after login: $request->session()->regenerate(); HTTPS via TrustProxies
// XSS: always {{ }} in Blade; e($value) helper; never {!! $userInput !!}
// Rate limit: ->middleware('throttle:60,1')
```

## CACHE / REDIS / QUEUES / PERFORMANCE
```php
Cache::put('k',$v,60); Cache::get('k'); Cache::remember('k',60,function(){ return Post::all(); });
Cache::forever('k',$v); Cache::forget('k'); Cache::add('k',$v,60);
// tags (redis/memcached only): Cache::tags(['a','b'])->remember(...); ->flush();
// Redis
config('database.redis.default'); Redis::set('k',$v); Redis::get('k'); Redis::connection('cache');
// Queues (queue:work; supervisor)
class SendMail implements \Illuminate\Contracts\Queue\ShouldQueue { use \Illuminate\Queue\InteractsWithQueue,\Illuminate\Queue\SerializesModels;
    public $tries=3; public $timeout=60; public $retryAfter=30;
    public function retryUntil(){ return now()->addMinutes(5); }     // 5.5 time-based attempts
    public function handle(){ /* ... */ }
}
SendMail::dispatch($m); SendMail::dispatch($m)->delay(now()->addMinutes(5))->onQueue('emails');
$this->dispatchSync(new SendMail($m));   // run now
// chaining (5.5): Bus::chain([new A,$b])->dispatch();  (job batching is 8+)
// rate limit jobs (5.5): ->throttle(5) on queue connection (Redis)
// on-demand notification (5.5): Notification::route('mail',$email)->notify(new InvoicePaid($inv));
```
Deploy cache (5.5, NO `optimize`, NO `event:cache` — event:cache is 5.8+):
```bash
php artisan route:cache && php artisan config:cache && php artisan view:cache
composer install --optimize-autoloader --no-dev   # classmap-authoritative
```
N+1, `cursor()` generator, chunking, indexes, `withCount` = main wins.

## LOGS & ERRORS (5.5 = `config/app.php`, NOT `config/logging.php`)
```php
// config/app.php
'log'=>'daily','log_level'=>'debug','log_max_files'=>14,   // rotation = log_max_files (no 'days')
Log::debug('msg',['ctx'=>1]); logger()->info('x'); info('x');  // helpers
// Handler: app/Exceptions/Handler.php
public function report(\Exception $e){ if($e instanceof X) { /* notify */ } parent::report($e); }
public function render($request,\Exception $e){ if($e instanceof X) return response()->view('errors.x',[],500); return parent::render($request,$e); }
// custom exception with renderable/reportable (5.5):
class MyException extends \Exception { public function report(){ /* */ } public function render($req){ return response()->json(['e'=>1],500); } }
// errors: abort(404); abort_if(!$x,403); abort_unless($x,403);
// custom pages: resources/views/errors/404.blade.php, 500.blade.php (only when APP_DEBUG=false for 500)
// debug: dd($x); dump($x); (dd is "dump & die")
```

## PROXY (behind LB / Cloudflare / Nginx) — 5.5 ships `fideloper/proxy`
```php
namespace App\Http\Middleware;
use Fideloper\Proxy\TrustProxies as M; use Illuminate\Http\Request;
class TrustProxies extends M {
    protected $proxies = ['10.0.0.0/8'];        // list IPs/CIDR; NEVER '*' in prod
    protected $headers = Request::HEADER_X_FORWARDED_ALL;
    // also $proxies can read env: config('trustedproxy.proxies')
}
// -> $request->ip() and isSecure()/scheme correct for HTTPS redirect & client IP
```

## TESTING (5.5)
```php
namespace Tests\Feature;
use Tests\TestCase; use Illuminate\Foundation\Testing\RefreshDatabase; use App\Models\User;
class PostTest extends TestCase {
    use RefreshDatabase;                                  // 5.5 (prefer over DatabaseMigrations)
    public function test_list(): void {
        $u = factory(User::class)->create();
        $p = factory(Post::class,3)->create(['user_id'=>$u->id]);   // factory states: ->states('published')
        $this->actingAs($u)->get('/posts')->assertStatus(200)->assertSee($p[0]->title);
        $this->assertDatabaseHas('posts',['id'=>$p[0]->id]);
        $this->assertDatabaseMissing('posts',['id'=>999]);
    }
    public function test_auth(): void { $this->get('/dashboard')->assertRedirect('/login'); }
}
// factories: database/factories/PostFactory.php -> define(Post::class, fn($f)=>[...])
// unit: extends Tests\Unit\TestCase; $this->mock(X::class) for contracts
```

## SCHEDULING
```php
// app/Console/Kernel.php
protected function schedule($s){
    $s->call(function(){ /* function(){} */ })->daily();
    $s->command('emails:send')->dailyAt('13:00')->withoutOverlapping();
    $s->job(new \App\Jobs\Cleanup)->everyFiveMinutes();
}
// cron: * * * * * php /path/artisan schedule:run >> /dev/null 2>&1
```

## STORAGE / FILES
```php
use Illuminate\Support\Facades\Storage;
Storage::disk('public')->put('avatars/1.png',$content);
Storage::url('avatars/1.png'); Storage::get('avatars/1.png'); Storage::exists('x'); Storage::delete('x');
// symlink (5.5): php artisan storage:link   (public/storage -> storage/app/public)
// disks in config/filesystems.php: local, public, s3
```

## LOCALIZATION
```php
// resources/lang/en/messages.php  return ['welcome'=>'Welcome'];
__('messages.welcome'); trans('messages.welcome'); @lang('messages.welcome')
// pluralization: trans_choice('messages.apples', $n)
```

## HELPERS (quick)
`config env`(config-only) `app auth route url asset secure_asset`
`abort abort_if abort_unless optional data_get data_set value with retry tap collect`
`now today blank filled class_basename e old session cache csrf_field method_field`
`response redirect view bcrypt encrypt decrypt dd dump logger info`

## ANTI-PATTERNS (never)
- ❌ `env()` in controllers/services → ✅ `config('x.y')`
- ❌ business logic in routes/Blade → ✅ service/model
- ❌ N+1 loops → ✅ `with()`/`withCount()`
- ❌ `@csrf` (5.6) → ✅ `{{ csrf_field() }}`
- ❌ `{!! $userInput !!}` (XSS) → ✅ `{{ }}`
- ❌ `php artisan optimize` → ✅ explicit `route:cache config:cache view:cache`
- ❌ Argon / `config/logging.php` / `days` → ✅ bcrypt / `config/app.php`
- ❌ raw SQL concat → ✅ bindings (`?` or `whereRaw('x = ?',[$v])`)
- ❌ arrow fns / typed props / union / constructor promotion → ✅ closures, explicit props, DocBlocks
- ❌ `Model::all()` then filter in PHP → ✅ query builder / scopes
