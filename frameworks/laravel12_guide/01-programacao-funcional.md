# Programação Funcional no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Tudo aqui **existe** no 12.x. Recursos do 13+ são
> marcados como "não existe".

O Laravel expõe um vocabulário funcional muito rico: `Collection`/`LazyCollection`, `Stringable`,
`Arr`, `Str`, `Number` e dezenas de helpers globais. Este arquivo reúne o que você mais usa no
dia a dia, com sintaxe 12.x e PHP moderno (arrow functions, `match`, enums, nullsafe).

---

## 1. Collections (`Illuminate\Support\Collection`)

Coleções são **eager** (avaliação imediata) e imutáveis nos métodos de transformação: quase todo
método retorna uma **nova** coleção (o original não muda), exceto métodos mutáveis internos como
`push`, `put`, `transform`, `splice`, `prepend`.

### 1.1 Criando

```php
use Illuminate\Support\Collection;

$c = collect([1, 2, 3]);            // do array
$c = Collection::make([1, 2, 3]);   // equivalente
$c = collect();                     // vazia
$c = collect(['a' => 1, 'b' => 2]); // assoc
$c = collect(range(1, 10));         // 1..10
$c = Collection::times(5, fn ($i) => $i * 2);   // [2,4,6,8,10]
$c = Collection::wrap($value);      // array|Collection|null -> Collection
$c = Collection::range(1, 10, 2);   // [1,3,5,7,9]
$c = collect([1, 2, 3])->collect(); // reencapsula

// de query Eloquent: ->get() devolve Eloquent\Collection (estende Collection)
```

### 1.2 Transformações essenciais

```php
collect([1, 2, 3, 4])->map(fn ($n) => $n * 2);              // [2,4,6,8]
collect([1, 2, 3])->map(fn ($n, $k) => [$k => $n]);          // callback recebe (value, key)
collect([1, 2, 3, 4])->filter(fn ($n) => $n % 2 === 0);      // [2,4] (reindexa após filter)
collect([1, 2, 3])->reject(fn ($n) => $n === 2);            // [1,3]
collect([1, 2, 3])->reduce(fn ($carry, $n) => $carry + $n, 0); // 6
collect([1, 2, 3, 4])->partition(fn ($n) => $n > 2);        // [Collection[3,4], Collection[1,2]]
collect([[1, 2], [3, 4]])->collapse();                      // [1,2,3,4] (1 nível)
collect([[1, 2], [3, 4]])->flatten();                       // [1,2,3,4] (recursivo)
collect([1, 2, 3])->flatMap(fn ($n) => [$n, $n * 10]);      // [1,10,2,20,3,30]
collect(['a' => 1, 'b' => 2])->mapWithKeys(fn ($v, $k) => [$k => $v * 10]); // ['a'=>10,'b'=>20]
collect([['id' => 1, 'name' => 'A'], ['id' => 2, 'name' => 'B']])->pluck('name', 'id'); // [1=>'A',2=>'B']
collect([1, 2, 3])->push(4)->prepend(0);                    // mutação in-place
collect([1, 2, 3])->transform(fn ($n) => $n * 2);           // mutação in-place
collect([1, 2, 3])->reverse();
collect([1, 2, 3])->sort()->values();                       // reindexa
collect([3, 1, 2])->sortDesc()->values();
collect([1, 2, 3])->shuffle();
collect([1, 2, 2, 3])->unique()->values();                  // [1,2,3]
collect([1, 2, 3, 4])->chunk(2);                            // [Collection[1,2], Collection[3,4]]
collect([1, 2, 3, 4, 5])->chunkWhile(fn ($v, $k, $chunk) => $v === $chunk->last() + 1);
collect([1, 2, 3, 4])->sliding(2);                          // janelas deslizantes
collect([1, 2, 3, 4])->zip([5, 6, 7, 8]);                   // [[1,5],[2,6],...]
collect([[1, 2], [3, 4]])->zipWith([10, 20]);               // ver docs
collect([1, 2, 3, 4])->forPage(2, 2);                       // [3,4] (page, perPage)
collect(['a' => 1, 'b' => 2])->flip();                      // [1=>'a', 2=>'b']
```

### 1.3 Consultas / testes

```php
collect([1, 2, 3])->contains(2);                            // true
collect([1, 2, 3])->contains(fn ($n) => $n > 2);            // true
collect([1, 2, 3])->every(fn ($n) => $n > 0);               // true
collect([1, 2, 3])->some(fn ($n) => $n > 2);                // true (alias de contains com closure)
collect([1, 2, 3])->isEmpty();
collect([1, 2, 3])->isNotEmpty();
collect([1, 2, 3])->search(2);                              // 1 (índice)
collect([1, 2, 3])->first(fn ($n) => $n > 1);               // 2
collect([1, 2, 3])->firstOrFail(fn ($n) => $n > 9);         // lança ItemNotFoundException
collect([1, 2, 3])->last();
collect([1, 2, 3])->sole(fn ($n) => $n === 2);              // exatamente 1 item satisfaz
collect([1, 2, 3])->count();
collect([1, 2, 3])->sum();
collect([1, 2, 3])->avg();
collect([1, 2, 3])->median();
collect([1, 2, 2, 3])->mode();
collect([1, 2, 3])->min(); collect([1, 2, 3])->max();
collect([1, 2, 3])->doesntContain(4);
collect([1, 2, 3])->has(1);                                  // por índice/key
collect([1, 2, 3])->hasAny([1, 9]);
collect([1, 2, 3])->diff([2, 3]);                            // [1]
collect([1, 2, 3])->intersect([2, 3, 4]);                    // [2,3]
```

### 1.4 Agrupar, ordenar, agregar por chave

```php
collect([
    ['team' => 'a', 'pts' => 3],
    ['team' => 'b', 'pts' => 5],
    ['team' => 'a', 'pts' => 2],
])->groupBy('team');                            // ['a'=>Collection, 'b'=>Collection]
->groupBy(fn ($row) => $row['pts'] > 2 ? 'high' : 'low');
collect(...)->keyBy('id');                      // associa por coluna
collect(...)->sortBy('pts')->values();
collect(...)->sortByDesc('pts');
collect(...)->sortBy([['pts', 'desc'], ['name', 'asc']]); // multi-critério (12)
collect([1, 2, 3])->sum(fn ($n) => $n * 2);
collect([1, 2, 3])->countBy(fn ($n) => $n % 2 === 0 ? 'even' : 'odd');
collect([1, 2, 3])->duplicates();
collect([1, 2, 3])->duplicatesStrict();
collect([1, 2, 3])->median('score');            // em coleção de objetos
collect(...)->average('score');
```

### 1.5 "Quando", condicionais e tapping

```php
collect([1, 2, 3])
    ->when($user->isAdmin(), fn ($c) => $c->merge([4]))
    ->unless($user->isGuest(), fn ($c) => $c->push(5))
    ->whenNotEmpty(fn ($c) => $c->push(6))
    ->whenEmpty(fn ($c) => $c->push(0))
    ->whenContains('admin', fn ($c) => $c->push('x'));

collect([1, 2, 3])->tap(function ($c) {
    // efeito colateral; retorna a mesma coleção
});

// pipe: passa a coleção e retorna QUALQUER coisa
$sum = collect([1, 2, 3])->pipe(fn ($c) => $c->sum());          // 6
// through: aplica uma transformação na coleção e devolve a collection
$doubled = collect([1, 2, 3])->through(fn ($c) => $c->map(fn ($n) => $n * 2)); // [2,4,6]

// Condicional inline (12): if/else funcionais
$c = collect([1, 2, 3])->when(true)->map(...); // sempre retorna Collection
```

### 1.6 Higher-Order Messages

Acesso dinâmico a métodos do item — evita closures triviais:

```php
$users->each->markAsVip();                 // $users->each(fn ($u) => $u->markAsVip())
$users->sum->votes;                        // soma a propriedade/método votes
$users->map->name->all();                  // pluck('name')
$users->filter->isActive()->values();      // filtra onde ->isActive() é truthy
$users->reject->trashed();
$users->groupBy->team;                     // agrupa por propriedade
$users->sortBy->name;
$users->unique->email;
$users->contains->isAdmin();
$users->first->isAdmin();
$users->partition->isAdmin();
$users->every->active;
$users->avg->score;
```

Métodos com higher-order: `average avg contains each every filter first flatMap groupBy keyBy
map max min partition reject skipUntil skipWhile some sortBy sortByDesc sum takeUntil takeWhile
unique`.

### 1.7 Serialização / interop

```php
$c->all();                  // array com chaves preservadas
$c->toArray();              // objetos aninhados viram arrays
$c->toJson();
$c->jsonSerialize();
$c->implode(', ');
$c->join(', ', ' e ');      // elemento final com conjunção
$c->toPrettyJson();         // 11+
$c->collect();
$c->lazy();                 // -> LazyCollection
$c->eachSpread(fn ($a, $b) => ...); // desestrutura itens
$c->mapSpread(fn ($a, $b) => ...);
$c->mapInto(Money::class);  // cria instâncias
```

### 1.8 Lazy Collections e `cursor()`

`LazyCollection` usa geradores do PHP e mantém memória baixa para grandes volumes. `cursor()`
do query builder/Éloquent retorna `LazyCollection` **sem** passar todas as linhas pela memória.

```php
use Illuminate\Support\LazyCollection;

LazyCollection::make(function () {
    $handle = fopen('log.txt', 'r');
    while (($line = fgets($handle)) !== false) {
        yield $line;
    }
    fclose($handle);
})->chunk(4)->map(fn (array $lines) => LogEntry::fromLines($lines))->each(fn ($e) => ...);

// Eloquent: 1 query, 1 modelo em memória por vez
User::cursor()->filter(fn (User $u) => $u->id > 500)->each(fn (User $u) => echo $u->id);

User::query()->lazy()->each(...);            // LazyCollection (query builder)
User::query()->lazyById(100)->each(...);     // estável com alterações concorrentes
```

> **12.x:** `LazyCollection` existe e é a forma idiomática de streaming. Não confunda com
> `cursor()` do 5.5, que devolvia `Generator` cru.

---

## 2. Strings — `Str`, `Stringable`, fluent

```php
use Illuminate\Support\Str;

Str::of('  Hello World  ')->trim()->lower()->title(); // "Hello World"
(string) Str::of('laravel')->upper()->append(' 12');  // "LARAVEL 12"

Str::slug('Olá Mundo!');                 // "ola-mundo"
Str::ulid(); Str::uuid(); Str::uuid7();  // ULID / UUID v4 / UUID v7
Str::random(40);
Str::password(16);                       // senha forte
Str::is('foo*', 'foobar');               // true
Str::isUuid($v); Str::isUlid($v);
Str::isAscii($v); Str::isUrl($v); Str::isJson($v);
Str::isMatch('/^\d+$/', $v);             // 11/12
Str::limit('long text here', 10, '…');   // "long text …"
Str::words('long text here', 2, '…');
Str::markdown('# Olá');
Str::inlineMarkdown('**bold**');
Str::headline('user_profile_photo');     // "User Profile Photo"
Str::studly('user_profile');             // UserProfile
Str::camel('user_profile');              // userProfile
Str::snake('UserProfile');               // user_profile
Str::kebab('UserProfile');               // user-profile
Str::plural('child'); Str::singular('children');
Str::padLeft('7', 3, '0');               // "007"
Str::before('a.b.c', '.');               // "a"
Str::after('a.b.c', '.');
Str::between('[a]', '[', ']');
Str::containsAll('abc', ['a', 'b']);
Str::swap(['8' => 'oito'], '8 bits');
Str::squish('  a   b  ');                // "a b"
Str::wrap('value', '"');
Str::mask('secret@mail.com', '*', 3);    // "sec***@mail.com"
Str::transliterate('Olá');               // "Ola"
Str::deduplicate('the the the', ' ');    // 12
Str::take('Hello', 3);                   // "Hel" (12)
Str::chopStart('prefix_x', 'prefix_');   // 12
Str::chopEnd('x_suffix', '_suffix');     // 12
Str::trim($v); Str::ltrim($v); Str::rtrim($v);
Str::of($v)->when(...)->unless(...);
```

`Stringable` implementa `Stringable`, `JsonSerializable` e é encadeável com `->value()` no fim.

```php
$slug = Str::of($title)->slug()->limit(60, '')->value();
```

> **Dica 12:** prefira `Str::of()`/`str()` encadeado a chamadas aninhadas; o encadeamento lê melhor.

---

## 3. `Arr`, `Number`, `Js`, `Uri`

```php
use Illuminate\Support\Arr;

Arr::get($a, 'user.name', 'fallback');       // dot notation
Arr::set($a, 'user.name', 'X');
Arr::has($a, 'user.name'); Arr::hasAny($a, ['a', 'b']);
Arr::forget($a, 'user.name');
Arr::only($a, ['a', 'b']); Arr::except($a, ['c']);
Arr::first($a, fn ($v) => $v > 1, $default);
Arr::pluck($a, 'name', 'id');
Arr::flatten($a, 2);
Arr::dot($a); Arr::undot($a);
Arr::isList($a); Arr::isAssoc($a);
Arr::isList($a);
Arr::wrap($v);                                // garante array
Arr::random($a); Arr::shuffle($a);
Arr::keyBy($a, 'id');
Arr::partition($a, fn ($v) => $v > 0);
Arr::join($a, ', ', ' e ');
Arr::map($a, fn ($v) => $v * 2);
Arr::mapWithKeys($a, fn ($v, $k) => [$k => $v]);
Arr::where($a, fn ($v) => $v > 0);
Arr::accessible($v);
Arr::query(['a' => 1]);                       // "a=1"
Arr::crossJoin([1, 2], ['a', 'b']);
```

```php
use Illuminate\Support\Number;

Number::format(1234.5678);                 // "1,234.57"
Number::currency(99.9, 'BRL');             // "R$ 99,90"
Number::percentage(12.5);                  // "12.5%"
Number::fileSize(1024);                    // "1 KB"
Number::ordinal(3);                        // "3rd"
Number::spell(123);                        // "one hundred twenty-three"
Number::abbreviate(1234567);               // "1M"
Number::clamp($n, 0, 10);                  // 11/12
Number::pairs(5, 10, 2);                   // sequências de pares (11+)
Number::forHumans(1_000_000);              // "1 million"
```

```php
use Illuminate\Support\Js;
Js::from($array);           // JSON seguro para interpolar em HTML (evita XSS de fechamento)
```

```php
use Illuminate\Support\Uri;
Uri::of('https://example.com/a?x=1')
    ->withPath('/b')
    ->withQuery(['page' => 2])
    ->withFragment('top');
Uri::to('/local')->withQuery(['q' => 'x'])->value();
```

---

## 4. Helpers globais essenciais

### Acesso a dados

```php
data_get($target, 'user.address.city', 'n/a'); // arrays, objetos, ArrayAccess, Collection
data_set($target, 'user.name', 'Ana');
data_fill($target, 'user.age', 30);            // só define se ausente
data_forget($target, 'user.name');

// optional(): evita "null pointer" — prefira nullsafe (?->)
optional($user)->name;
optional($user, fn ($u) => $u->name);
$user?->profile?->city;                        // PHP 8.0+ (preferido)
```

### Valores e pipelines

```php
$v = value(fn () => 1 + 1);                    // resolve closures
$v = value('hi');
with($user, fn ($u) => $u->name);              // aplica callback ao valor
tap($user, fn ($u) => $u->update(['seen' => true])); // retorna o valor original
$result = retry(3, fn () => $api->call(), sleepMilliseconds: 100, when: fn ($e) => $e instanceof TimeoutException);
$result = retry(5, fn () => fetch(), 200);     // until truthy
$value = rescue(fn () => risky());             // retorna null (ou fallback) em Throwable
$value = rescue(fn () => risky(), 'fallback', report: true);

throw_if($cond, Exception::class, 'msg');
throw_unless($cond, Exception::class);
```

### Execução adiada e memoização

```php
defer(fn () => Mail::send(...));       // executa após a resposta ser enviada
defer(fn () => ..., 'my-key');         // deduplica por chave (12)

$expensive = once(fn () => computeOnce()); // executa 1x por request/job/objeto
```

### Aleatoriedade, tempo, debug

```php
$lottery = Lottery::odds(1, 100);       // 1 em 100
$lottery->winner(fn () => ...)->loser(fn () => ...);

Sleep::for(2)->seconds();               // mockável em testes
Sleep::sleep(1); Sleep::usleep(500);

// Benchmark: use Illuminate\Support\Benchmark::dd()/value()
[$result, $ms] = \Illuminate\Support\Benchmark::value(fn () => heavy());
\Illuminate\Support\Benchmark::dd(fn () => heavy(), iterations: 10);

// Timebox: garante duração fixa (evita timing attacks)
(new \Illuminate\Support\Timebox)->call(fn ($timebox) => job(), microseconds: 10000);

report($e);                             // reporta exceção sem renderizar
logger()->info('x', ['ctx' => 1]);
```

### Contexto (11+)

```php
use Illuminate\Support\Facades\Context;

Context::add('request_id', (string) Str::uuid());
Context::addHidden('secret', $v);
Context::get('request_id');
Context::push('steps', 'a');
Context::when(fn () => ..., fn ($ctx) => $ctx->add('k', 'v'));
// Propaga automaticamente para logs e para jobs em fila.
```

### Idiomas funcionais diversos

```php
class_basename($obj);                   // "User"
class_uses_recursive($class);
collect([...]);
filled($v); blank($v);                  // inverse
enum_exists(Status::class);
transform($value, fn ($v) => $v * 2);
abort_if(! $user, 403);
now(); today();
```

---

## 5. Pipeline (transformar em etapas nomeadas)

```php
use Illuminate\Support\Facades\Pipeline; // 11+

$result = Pipeline::send($post)
    ->through([
        TrimContent::class,
        ValidateLength::class,
        function ($post, Closure $next) {
            $post->save();
            return $next($post);
        },
    ])
    ->thenReturn();
```

Forma clássica:

```php
use Illuminate\Pipeline\Pipeline;

$value = app(Pipeline::class)
    ->send($input)
    ->through([$stage1, $stage2])
    ->then(fn ($v) => $v);
// ou ->thenReturn();
```

---

## 6. Composição e imutabilidade (PHP 8.2–8.5)

```php
// Arrow functions
$double = fn (int $n): int => $n * 2;

// First-class callable syntax (8.1)
$double = $this->double(...);
$names = collect($users)->map($this->normalize(...))->all();

// match
$label = match (true) {
    $n < 0 => 'neg',
    $n === 0 => 'zero',
    default => 'pos',
};

// Enums (8.1) — ricos, com métodos
enum Status: string {
    case Draft = 'draft';
    case Published = 'published';
    public function label(): string { return ucfirst($this->value); }
    public static function values(): array { return array_column(self::cases(), 'value'); }
}

// Readonly properties / classes (8.2)
final readonly class Money {
    public function __construct(public int $cents, public string $currency = 'BRL') {}
}

// DNF types (8.2): (A&B)|C
function f((Countable&ArrayAccess)|null $x): void {}

// Property hooks + asymmetric visibility (8.4)
class User {
    public string $fullName {
        get => "{$this->first} {$this->last}";
    }
    public private(set) string $status = 'active';
}
```

> **12.x:** property hooks são PHP 8.4 — use apenas se o alvo rodar 8.4. Como o 12.x suporta
> 8.2–8.5, escreva código que funcione na menor versão do seu alvo.

---

## Resumo de Pontos-Chave

- **Collections são imutáveis** por padrão; use `map/filter/reduce/pluck/groupBy/keyBy` e
  `->values()` quando precisar reindexar.
- **Higher-order messages** (`->each->method()`, `->sum->votes`) eliminam closures triviais.
- **`cursor()`/`LazyCollection`** para grandes volumes: 1 query, memória constante.
- **`Str::of()` / `Stringable`** e **`Number`/`Arr`** concentram utilidades sem depender de helpers.
- Helpers funcionais-chave: `data_get`, `value`, `with`, `tap`, `retry`, `rescue`, `defer`,
  `once`, `throw_if`, `throw_unless`, `Benchmark::value`, `Lottery`, `Sleep`, `Timebox`.
- **`Context`** carrega dados transversais (request id) para logs e jobs.
- Use PHP moderno (arrow fn, `match`, enums, readonly, first-class callables) — mas respeite
  o piso de PHP do seu alvo (8.2/8.3/8.4/8.5).
