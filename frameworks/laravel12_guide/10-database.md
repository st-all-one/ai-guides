# Integração com Database no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Query Builder, transações, Eloquent, relacionamentos,
> mutators/casts, scopes, migrations, factories/seeds, paginação, API Resources, soft deletes e
> testes de banco.

---

## 1. Configuração de conexões

`config/database.php`. O driver padrão é `DB_CONNECTION`. Conexões suportadas: `sqlite`, `mysql`,
`mariadb`, `pgsql`, `sqlsrv`. Read/write splitting e múltiplas conexões são suportados.

```php
DB::connection('mysql2')->table('users')->get();
Model::on('mysql2')->find(1);
```

---

## 2. Query Builder

### 2.1 Select

```php
use Illuminate\Support\Facades\DB;

$users = DB::table('users')->get();
$user  = DB::table('users')->where('name', 'John')->first();
$names = DB::table('users')->pluck('name');
$email = DB::table('users')->where('id', 1)->value('email');
$chunk = DB::table('users')->orderBy('id')->chunk(100, fn ($rows) => /* ... */);
DB::table('users')->orderBy('id')->lazy()->each(...);           // LazyCollection
DB::table('users')->orderBy('id')->cursor()->each(...);
DB::table('users')->select('id', 'name')->distinct()->get();
DB::table('users')->selectRaw('count(*) as total')->groupBy('team')->get();
```

### 2.2 Where

```php
->where('votes', '>', 100)
->orWhere('name', 'John')
->whereBetween('votes', [1, 100])
->whereNotBetween(...)
->whereIn('id', [1, 2, 3])->whereNotIn(...)
->whereNull('deleted_at')->whereNotNull('email')
->whereDate('created_at', '2026-01-01')
->whereMonth/whereDay/whereYear/whereTime
->whereColumn('updated_at', '>', 'created_at')
->whereExists(fn ($q) => $q->select(...)->from('orders')->whereColumn('orders.user_id', 'users.id'))
->where('active', true)->where('legacy', false)->whereNull('x')
->whereNot(fn ($q) => $q->where('clearance', true)->orWhere('price', '<', 10)) // nega grupo
->whereJsonContains('options->languages', 'en')
->whereJsonLength('options->languages', '>', 1)
->when($request->input('role'), fn ($q, $role) => $q->where('role', $role))
->unless($request->boolean('archived'), fn ($q) => $q->whereNull('archived_at'))
->where(function ($q) { $q->where('a', 1)->orWhere('b', 2); });   // agrupamento lógico
```

### 2.3 Joins, unions, ordering

```php
->join('contacts', 'users.id', '=', 'contacts.user_id')
->leftJoin/rightJoin/crossJoin
->joinSub($subquery, 'sub', fn ($join) => $join->on('users.id', '=', 'sub.user_id'))
->union($other)->unionAll($other)
->orderBy('name', 'desc')->orderByRaw('updated_at - created_at DESC')
->groupBy('account_id')->having('count', '>', 100)
->limit(10)->offset(5)
->latest()->oldest()->inRandomOrder()
->reorder() // remove todos os order by
```

### 2.4 Inserir / atualizar / apagar

```php
DB::table('users')->insert(['email' => 'a@x.com', 'votes' => 0]);
$id = DB::table('users')->insertGetId([...]);
DB::table('users')->insertOrIgnore([...]);
DB::table('users')->upsert([...], ['email'], ['votes']);   // unique-by, update cols
DB::table('users')->update(['votes' => 1]);
DB::table('users')->upsert([...], uniqueBy: ['email'], update: ['votes']);
DB::table('users')->increment('votes'); DB::table('users')->incrementEach(['votes' => 5]);
DB::table('users')->delete();
DB::table('users')->where('id', 1)->update([...]);
```

### 2.5 Transações e locking

```php
DB::transaction(function () {
    DB::table('users')->update(['votes' => 1]);
    DB::table('posts')->delete();
});

DB::transaction(function () { /* ... */ }, $attempts = 5);   // retry em deadlock
DB::beginTransaction(); /* ... */ DB::commit();  DB::rollBack();

DB::table('users')->where('id', 1)->sharedLock()->get();
DB::table('users')->where('id', 1)->lockForUpdate()->get();

// callbacks/efeitos externos só após o commit:
ProcessPodcast::dispatch($job)->afterCommit();
event(new OrderShipped($order)); // ou listener/job com ->afterCommit()
```

### 2.6 Raw e debug

```php
DB::raw('count(*) as total');
->whereRaw('price > IF(state = "TX", ?, 100)', [200]);
->selectRaw('SUM(amount) as total')->orderByRaw(...)
DB::table('users')->toSql();                 // SQL (com bindings não expandidos)
DB::table('users')->dd(); DB::table('users')->dump();
DB::listen(fn ($query) => logger($query->sql, $query->bindings));
```

---

## 3. Eloquent

### 3.1 Convenções

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Flight extends Model
{
    protected $table = 'my_flights';        // default: snake plural
    protected $primaryKey = 'flight_id';    // default: id
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;             // default: created_at/updated_at
    protected $connection = 'mysql';
    protected $attributes = ['delayed' => false];
    protected $fillable = ['title', 'body'];
    protected $guarded = ['id'];
    protected $hidden = ['password', 'remember_token'];
    protected $appends = ['full_name'];
}
```

- `HasUuids` (UUIDv7) e `HasUlids` (ULID) para chaves não incrementais.
- `HasFactory`, `SoftDeletes`, `Notifiable`, `HasApiTokens` conforme necessário.

### 3.2 Recuperar

```php
Flight::all();
Flight::find(1); Flight::findOrFail(1);
Flight::where('active', 1)->orderBy('name')->limit(10)->get();
Flight::firstOrCreate(['name' => 'x'], ['votes' => 0]);
Flight::firstOrNew([...]);
Flight::updateOrCreate(['email' => $e], ['active' => 1]);
Flight::findOr(1, fn () => abort(404));
$flight->fresh(); $flight->refresh();
Flight::withTrashed()->get(); Flight::onlyTrashed()->get();   // soft deletes
```

### 3.3 Inserir / atualizar / apagar

```php
$flight = new Flight;
$flight->name = 'FR 900';
$flight->save();

Flight::create(['name' => 'FR 900']);       // respeita $fillable
$flight->fill([...])->save();
$flight->update(['name' => 'x']);
$flight->increment('votes'); $flight->increment('votes', 5);
$flight->decrement('votes');
$flight->delete(); Flight::destroy([1, 2, 3]);
$flight->forceDelete();                     // soft deletes
$flight->restore();
```

Mass assignment sem proteção (evite): `Model::unguard()` / `$guarded = []`.

### 3.4 Scopes (`#[Scope]` — atributo 12+)

```php
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;

class User extends Model
{
    #[Scope]
    protected function popular(Builder $query): void
    {
        $query->where('votes', '>', 100);
    }

    #[Scope]
    protected function ofType(Builder $query, string $type): void
    {
        $query->where('type', $type);
    }
}

User::popular()->active()->orderBy('created_at')->get();
User::ofType('admin')->get();
User::popular()->orWhere->active()->get();   // higher order orWhere
```

Scope global via `#[ScopedBy]` no model ou `static::addGlobalScope()`.

### 3.5 Mutators & Casting

```php
use Illuminate\Database\Eloquent\Casts\Attribute;

protected function firstName(): Attribute
{
    return Attribute::make(
        get: fn (string $value) => ucfirst($value),
        set: fn (string $value) => strtolower($value),
    );
}

protected function casts(): array
{
    return [
        'is_admin' => 'boolean',
        'options' => 'array',
        'settings' => 'object',
        'price' => 'decimal:2',
        'status' => Status::class,                 // enum
        'secret' => 'encrypted',
        'published_at' => 'datetime',
        'meta' => 'collection',
        'config' => AsCollection::class,
        'payload' => 'encrypted:array',
    ];
}
```

Casts suportados incluem: `array`, `AsFluent`, `AsStringable`, `AsUri`, `boolean`, `collection`,
`date`, `datetime`, `immutable_date`, `immutable_datetime`, `decimal:<p>`, `double`, `encrypted`,
`encrypted:array|collection|object`, `float`, `hashed`, `integer`, `object`, `real`, `string`,
`timestamp` e classes custom (`CastsAttributes`). `mergeCasts()` para casts temporários.

### 3.6 Serialização

```php
$model->toArray();
$model->toJson();
$model->only(['id', 'name']);
$model->makeHidden('password');
$model->makeVisible('secret');
```

---

## 4. Relacionamentos

### 4.1 Definição

```php
// 1:1
public function phone(): HasOne { return $this->hasOne(Phone::class); }
public function user(): BelongsTo { return $this->belongsTo(User::class); }

// 1:N
public function posts(): HasMany { return $this->hasMany(Post::class); }

// N:N
public function roles(): BelongsToMany
{
    return $this->belongsToMany(Role::class)
        ->withPivot('active')
        ->withTimestamps();
}

// has one through / has many through
public function carOwner(): HasOneThrough { return $this->hasOneThrough(Owner::class, Car::class); }
public function deployments(): HasManyThrough { return $this->hasManyThrough(Deployment::class, Environment::class); }

// polimórficos
public function image(): MorphOne { return $this->morphOne(Image::class, 'imageable'); }
public function images(): MorphMany { return $this->morphMany(Image::class, 'imageable'); }
public function tags(): MorphToMany { return $this->morphToMany(Tag::class, 'taggable'); }
public function commentable(): MorphTo { return $this->morphTo(); }

// default, escopado, "latest of many"
public function user(): BelongsTo { return $this->belongsTo(User::class)->withDefault(); }
public function currentOrder(): HasOne { return $this->hasOne(Order::class)->latestOfMany(); }
public function largestOrder(): HasOne { return $this->hasOne(Order::class)->ofMany('price', 'max'); }
```

### 4.2 Acessar / criar

```php
$user->posts;                       // lazy load
$user->posts()->where('active', 1)->get();
$user->posts()->save($post);
$user->posts()->create([...]);
$user->posts()->createMany([...]);
$user->roles()->attach($roleId, ['active' => true]);
$user->roles()->sync([1, 2, 3]);
$user->roles()->syncWithoutDetaching([...]);
$user->roles()->toggle([...]);
$user->roles()->detach($roleId);
$post->tags()->saveMany([...]);
$post->comments()->associate($comment);
$post->comments()->dissociate();
```

Eventos de pivot: `using(Comment::class)` num modelo pivot; observers `pivotAttaching/pivotAttached/...`.

### 4.3 Consultar relações

```php
User::has('posts')->get();
User::has('posts', '>=', 3)->get();
User::doesntHave('posts')->get();
User::whereHas('posts', fn ($q) => $q->where('active', 1))->get();
User::whereDoesntHave('posts')->get();
User::whereRelation('posts', 'active', 1)->get();
User::withWhereHas('posts', fn ($q) => $q->where('active', 1))->get();
Post::whereBelongsTo($user)->get();
```

### 4.4 Eager loading e agregações

```php
Book::with('author')->get();
Book::with(['author', 'publisher'])->get();
Book::with('author.contacts')->get();
Book::with(['author' => ['contacts', 'publisher']])->get();
Book::with('author:id,name,book_id')->get();
Post::withCount('comments')->get();                 // comments_count
Post::withSum('comments', 'votes')->get();
Post::withAvg('comments', 'rating')->get();
$post->load('comments'); $post->loadMissing('comments'); $post->loadCount('comments');
protected $with = ['author'];                        // sempre eager
```

### 4.5 Touching e observers

```php
protected $touches = ['post'];      // ao salvar o filho, atualiza o pai
```

Observers:

```php
use Illuminate\Database\Eloquent\Attributes\ObservedBy;

#[ObservedBy([UserObserver::class])]
class User extends Model {}
```

### 4.6 Pruning e replicação

```php
use Illuminate\Database\Eloquent\Prunable;

class Post extends Model
{
    use Prunable;
    public function prunable(): Builder { return static::where('created_at', '<', now()->subYear()); }
    protected function pruning(): void { /* ... */ }
}
// php artisan model:prune

$new = $post->replicate();
```

---

## 5. Migrations

```bash
php artisan make:migration create_flights_table
php artisan make:migration add_status_to_flights_table --table=flights
php artisan migrate
php artisan migrate --force
php artisan migrate --isolated          # lock atômico (deploy multi-servidor)
php artisan migrate:rollback --step=5
php artisan migrate:reset
php artisan migrate:refresh --seed
php artisan migrate:fresh --seed
php artisan migrate --pretend
```

Estrutura:

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flights', function (Blueprint $table) {
            $table->id();                       // bigIncrements
            $table->ulid('code')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignIdFor(Airline::class)->nullable();
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->decimal('price', 8, 2)->default(0);
            $table->boolean('active')->default(true);
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->json('meta')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['user_id', 'code']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flights');
    }
};
```

Colunas comuns: `id`, `ulid`, `uuid`, `foreignId`, `foreignUlid`, `foreignIdFor`, `string`,
`char`, `text`, `mediumText`, `longText`, `integer`, `bigInteger`, `unsignedBigInteger`, `boolean`,
`decimal`, `float`, `double`, `date`, `dateTime`, `timestamp`, `time`, `year`, `json`, `jsonb`,
`binary`, `enum`, `set`, `morphs`, `nullableMorphs`, `rememberToken`, `softDeletes`, `timestamps`.

Modificadores: `->nullable()`, `->default()`, `->unique()`, `->index()`, `->primary()`,
`->after()`, `->comment()`, `->constrained()`, `->cascadeOnDelete()`, `->nullOnDelete()`,
`->restrictOnDelete()`.

Alterar tabela:

```php
Schema::table('users', function (Blueprint $table) {
    $table->string('phone')->nullable()->after('email');
    $table->dropColumn('legacy');
    $table->renameColumn('from', 'to');
});
Schema::rename($from, $to);
Schema::dropIfExists('users');
Schema::hasTable('users'); Schema::hasColumn('users', 'email');
```

> Migrações destrutivas pedem confirmação em produção (`--force` para pular).

---

## 6. Factories & Seeding

```php
namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password',
        ];
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => 'admin']);
    }

    public function configure(): static
    {
        return $this->afterMaking(fn (User $u) => /* ... */);
    }
}
```

```php
User::factory()->create();
User::factory()->count(3)->create();
User::factory()->admin()->create();
User::factory()->for(Team::class)->create();
User::factory()->has(Post::factory()->count(3))->create();
```

Seeders:

```php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([UserSeeder::class]);
        User::factory(10)->create();
    }
}
```

```bash
php artisan db:seed
php artisan db:seed --class=UserSeeder
php artisan migrate:fresh --seed
```

`use HasFactory;` no model (ou `#[UseFactory(Factory::class)]`).

---

## 7. Paginação

```php
Paginator::useBootstrapFive();   // ou useBootstrapFour(); Tailwind é o padrão

Post::paginate(15);                 // length-aware
Post::simplePaginate(15);           // next/prev
Post::cursorPaginate(15);           // cursor (melhor para grandes/∞ scroll)

$posts->items(); $posts->total(); $posts->currentPage(); $posts->lastPage();
$posts->hasMorePages(); $posts->nextPageUrl(); $posts->previousPageUrl();
$posts->onFirstPage();
$posts->withQueryString();
$posts->through(fn ($p) => /* transformar itens */);
```

```blade
{{ $posts->links() }}
{{ $posts->links('view.paginator') }}
```

---

## 8. API Resources

```bash
php artisan make:resource UserResource
php artisan make:resource UserCollection
```

```php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public $preserveKeys = false;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'posts' => PostResource::collection($this->whenLoaded('posts')),
            'is_admin' => $this->when($request->user()?->isAdmin(), fn () => $this->is_admin),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
```

```php
Route::get('/user/{id}', fn ($id) => new UserResource(User::findOrFail($id)));
return PostResource::collection(Post::all());
return User::findOrFail($id)->toResource();          // convenção (12)
return User::all()->toResourceCollection();
return (new UserCollection(User::all()))->additional(['meta' => ['x' => 1]]);
```

- `whenLoaded`, `when`, `mergeWhen`, `whenHas`, `whenCounted`, `whenNotNull`, `whenNotNull`.
- `#[UseResource]`/`#[UseResourceCollection]` para mapear model→resource por atributo (12).
- Paginação + resources: `UserResource::collection($users->paginate())` já inclui links/meta.

---

## 9. Soft Deletes

```php
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;
}
```

```php
$post->delete();               // define deleted_at
$post->restore();
$post->forceDelete();
Post::withTrashed()->get();
Post::onlyTrashed()->get();
Post::withTrashed()->where('id', 1)->restore();
```

---

## 10. Testes de banco

```php
use Illuminate\Foundation\Testing\RefreshDatabase;   // transação/rollback por teste

class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_create(): void
    {
        $user = User::factory()->create();
        $this->assertDatabaseHas('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('users', ['id' => 999]);
        $this->assertDatabaseCount('users', 1);
    }
}
```

- `DatabaseMigrations` recria o schema; **`RefreshDatabase`** é o recomendado.
- `DatabaseTransactions` quando não quiser migrar.
- `--parallel` cria bancos por processo (`your_db_test_1`, ...).
- Veja `03-seguranca.md` para testes HTTP/validação.

---

## Resumo de Pontos-Chave

- **Query Builder** para consultas diretas; Eloquent para domínio.
- Use **bindings** (nunca interpole valores em SQL); `when()` para condicionais de filtro.
- Transações com `DB::transaction()`; `afterCommit()` para efeitos externos.
- Eloquent: `$fillable`, casts (`casts()`), scopes (`#[Scope]`), relations tipadas.
- **Eager loading** (`with`, `withCount`) evita N+1; `shouldBeStrict` em dev.
- Migrations com `foreignId()->constrained()`, `softDeletes`, índices.
- Factories com `states`; `RefreshDatabase` nos testes.
- **Paginação**: `cursorPaginate` para grandes volumes.
- **API Resources** controlam o JSON; `toResource()`/`toResourceCollection()` por convenção (12).
- **Soft deletes** com `withTrashed`/`onlyTrashed`/`restore`/`forceDelete`.
