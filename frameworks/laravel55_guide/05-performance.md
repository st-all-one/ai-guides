# Performance no Laravel 5.5.50

> **Nota de versão (crítica):** Este dossiê é estritamente sobre o **Laravel 5.5.50 (LTS)** e baseia‑se na documentação oficial 5.5 contida em `/home/one/p/one/ai-guides/TMP/laravel5.5/`. Recursos de versões posteriores **não** são aplicáveis e, quando relevantes, são explicitamente marcados como indisponíveis nesta versão.

Pontos de versão confirmados para 5.5.50:

- `cursor()` do Eloquent **FOI** adicionado no Laravel 5.5 — pode e deve ser usado para iteração de memória reduzida (`eloquent.md:211`).
- `php artisan optimize` **FOI REMOVIDO** no Laravel 5.5. Não o cite como comando válido. Em seu lugar, use `route:cache`, `config:cache` e `view:cache`.
- **Lazy Collections NÃO existem** (introduzidas no Laravel 6). O `cursor()` em 5.5 retorna um `Generator` do PHP, não uma `LazyCollection`.
- **Atomic Locks (`Cache::lock`) NÃO existem** no 5.5 (introduzidos no 5.6, apenas para Redis). No 5.5, o bloqueio disponível é o de *rate limiting* de filas via `Redis::throttle`/`Redis::funnel`.
- `event:cache` / `event:clear` **NÃO existem** no 5.5 (chegaram no 5.8). Para performance de eventos em 5.5, não há cache de listeners via Artisan.
- **Job batching NÃO existe** (introduzido no Laravel 8). Em 5.5 use *job chaining* (`withChain`).

---

## 1. Eager Loading e o problema N+1

### 1.1 O problema N+1

Quando você acessa uma relação como propriedade dinâmica, ela é **lazy loaded** — carregada apenas no momento do acesso (`eloquent-relationships.md:688`). Isso gera o clássico problema N+1.

```php
// Modelo: Book belongsTo Author
$books = App\Book::all(); // 1 query: select * from books

foreach ($books as $book) {
    echo $book->author->name; // 1 query POR livro para buscar o autor
}
// Com 25 livros => 1 + 25 = 26 queries
```

### 1.2 `with()` — eager loading básico

Use `with()` para carregar a relação junto com o modelo pai, reduzindo para **2 queries** (`eloquent-relationships.md:793`):

```php
$books = App\Book::with('author')->get();

// SQL gerado (aprox.):
// select * from books
// select * from authors where id in (1, 2, 3, 4, 5, ...)
```

#### Múltiplas relações de uma vez

```php
$books = App\Book::with(['author', 'publisher'])->get();
```

#### Eager loading aninhado (dot syntax)

```php
$books = App\Book::with('author.contacts')->get();
```

### 1.3 `withCount` — contar sem carregar

Para obter a contagem de uma relação sem carregar os modelos relacionados, use `withCount`, que adiciona a coluna `{relacao}_count` ao resultado (`eloquent-relationships.md:731`):

```php
$posts = App\Post::withCount('comments')->get();

foreach ($posts as $post) {
    echo $post->comments_count;
}

// Múltiplas contagens + restrição na query da contagem
$posts = App\Post::withCount([
    'votes',
    'comments' => function ($query) {
        $query->where('content', 'like', 'foo%');
    },
])->get();

// Alias para múltiplas contagens da mesma relação
$posts = App\Post::withCount([
    'comments',
    'comments as pending_comments_count' => function ($query) {
        $query->where('approved', false);
    },
])->get();

echo $posts[0]->comments_count;
echo $posts[0]->pending_comments_count;
```

### 1.4 Lazy eager loading — `load()` e `loadCount()`

Quando o modelo pai já foi recuperado e você precisa decidir dinamicamente se carrega a relação, use `load()` (`eloquent-relationships.md:843`):

```php
$books = App\Book::all();

if ($someCondition) {
    $books->load('author', 'publisher');
}

// Com restrições na query de carregamento
$books->load(['author' => function ($query) {
    $query->orderBy('published_date', 'asc');
}]);

// Carregar apenas se ainda não foi carregado (evita re-query desnecessária)
$book->loadMissing('author');
```

`loadCount()` segue a mesma ideia para contagens:

```php
$posts = App\Post::all();
$posts->loadCount('comments');
```

### 1.5 Restringir colunas carregadas (`with`)

Você raramente precisa de todas as colunas da relação. Especifique as colunas — **incluindo sempre a chave primária/id** (`eloquent-relationships.md:819`):

```php
// CERTO: inclui o id usado para o join
$books = App\Book::with('author:id,name')->get();

// ERRADO: omitir o id quebra o relacionamento
$books = App\Book::with('author:name')->get(); // evite
```

### 1.6 Constraining eager loads (fechamentos)

Para aplicar restrições à query da relação, passe um `Closure`. **Observação de versão:** o Laravel 5.5 roda em PHP 7.1, então use `function ($query)` — as *arrow functions* `fn () =>` **não existem** nesta versão.

```php
$users = App\User::with(['posts' => function ($query) {
    $query->where('title', 'like', '%first%');
}])->get();

$users = App\User::with(['posts' => function ($query) {
    $query->orderBy('created_at', 'desc');
}])->get();
```

### 1.7 `when` NÃO é eager loading — não confunda

O `when()` é para **cláusulas condicionais** no query builder/Eloquent (`queries.md:516`), não para carregar relações. Ele executa o `Closure` apenas quando o primeiro argumento é "verdadeiro":

```php
$role = $request->input('role');

$users = DB::table('users')
    ->when($role, function ($query) use ($role) {
        return $query->where('role_id', $role);
    })
    ->get();

// Com fallback (executado quando o 1º param é falso)
$sortBy = null;
$users = DB::table('users')
    ->when($sortBy,
        function ($query) use ($sortBy) {
            return $query->orderBy($sortBy);
        },
        function ($query) {
            return $query->orderBy('name');
        }
    )
    ->get();
```

**Não confunda:** `when()` adia/adiciona `where`/ordenção; para adiar o *carregamento de relações* use `loadMissing()` ou `load()`.

### 1.8 Exemplo real combinando tudo

```php
// Controller de listagem de pedidos com N relações
$orders = App\Order::query()
    ->with([
        'customer:id,name,email',
        'customer.addresses' => function ($q) {
            $q->where('primary', true);
        },
        'items.product:id,title,sku',
    ])
    ->withCount('items')
    ->where('created_at', '>=', now()->subDays(30))
    ->orderBy('created_at', 'desc')
    ->paginate(25);

// Acesso nas views não gera queries extras
foreach ($orders as $order) {
    echo $order->customer->name;          // eager loaded
    echo $order->items_count;             // withCount
}
```

**Armadilha:** `with('author:id,name')` sem o `id` gera relação nula/incorreta. **Armadilha:** chamar `$book->author` (propriedade) dentro de um loop sem `with` é a causa #1 de lentidão em listagens.

---

## 2. Otimização de Queries

### 2.1 `select()` enxuto

Não use `select *` em tabelas largas. Selecione apenas o necessário (`queries.md:130`):

```php
$users = DB::table('users')->select('name', 'email as user_email')->get();

// Adicionar coluna a um query builder já existente (não substituir)
$query = DB::table('users')->select('name');
$users = $query->addSelect('age')->get();

// DISTINCT
$users = DB::table('users')->distinct()->get();
```

No Eloquent, prefira `select` + `addSelect` quando houver global scopes que já adicionam colunas (ver `eloquent.md:565`).

```php
Flight::select('id', 'name')->where('active', 1)->get();
```

### 2.2 Índices via migrations

Índices são fundamentais e devem ser criados na migração, não "depois". Use `index()`, `unique()`, e índices compostos (`migrations.md` adaptado):

```php
Schema::create('orders', function ($table) {
    $table->increments('id');
    $table->unsignedInteger('customer_id');
    $table->string('status');
    $table->timestamp('created_at');

    $table->index('customer_id');                 // FK lookup rápido
    $table->index(['status', 'created_at']);      // índice composto p/ filtros comuns
    $table->unique('order_number');
});

// Adicionar índice depois
Schema::table('users', function ($table) {
    $table->index('email');
});
```

Regra prática em 5.5: qualquer coluna usada em `where`, `orderBy`, `join` ou chave estrangeira deve ter índice.

### 2.3 `chunk()` e `chunkById()`

Processar milhares de registros de uma vez estoura a memória. Use `chunk()` (`eloquent.md:199`, `queries.md:96`):

```php
// Eloquent
Flight::chunk(200, function ($flights) {
    foreach ($flights as $flight) {
        // processa 200 por vez
    }
});

// Query Builder
DB::table('users')->orderBy('id')->chunk(100, function ($users) {
    foreach ($users as $user) {
        //
    }
});

// Parar o processamento retornando false
DB::table('users')->orderBy('id')->chunk(100, function ($users) {
    return false;
});
```

`chunkById()` (disponível no 5.5) é mais seguro para atualizações em lote, pois pagina pelo ID e evita pular/repetir registros quando a própria query modifica a ordem:

```php
// Recomendado ao fazer UPDATE/DELETE dentro do chunk
App\User::chunkById(200, function ($users) {
    foreach ($users as $user) {
        $user->update(['score' => $user->score + 1]);
    }
});
```

### 2.4 `cursor()` — iteração de baixíssima memória (5.5)

O `cursor()` executa **uma única query** e usa um cursor do banco, reduzindo drasticamente o uso de memória (`eloquent.md:211`):

```php
foreach (Flight::where('foo', 'bar')->cursor() as $flight) {
    //
}
```

> **Nota 5.5:** `cursor()` retorna um `Generator` do PHP. **Lazy Collections não existem no 5.5** — não espere métodos de coleção encadeáveis sobre o resultado do `cursor()`. Para usá-lo com transformações, itere manualmente ou colete numa Collection sob demanda.

### 2.5 `exists()` vs `count()`

Use `exists()` quando só precisa saber *se há* registros — é muito mais barato que `count()` (que conta linhas):

```php
// CERTO: só verifica existência
if (DB::table('users')->where('email', $email)->exists()) {
    //
}

// EVITE contar se só precisa de true/false
if (DB::table('users')->where('email', $email)->count() > 0) {
    //
}
```

```php
// Para contagem real, use count() do builder / withCount do Eloquent
$total = App\Flight::where('active', 1)->count();
$max   = App\Flight::where('active', 1)->max('price');
```

### 2.6 `pluck()` — lista de valores sem modelo completo

Para extrair uma única coluna (ou par chave/valor), `pluck()` evita hidratação de modelo (`queries.md:78`):

```php
$titles = DB::table('roles')->pluck('title');

$roles = DB::table('roles')->pluck('title', 'name'); // chave => valor
```

No Eloquent, prefira `pluck` sobre `get()->map`:

```php
$emails = App\User::where('active', 1)->pluck('email');
```

### 2.7 Agregações

Use os métodos de agregação do builder em vez de carregar tudo e contar em PHP (`queries.md:115`):

```php
$users = DB::table('users')->count();
$price = DB::table('orders')->max('price');
$avg   = DB::table('orders')->where('finalized', 1)->avg('price');
$sum   = DB::table('orders')->sum('total');
```

### 2.8 `whereIn` — evite loops com N queries

Nunca faça uma query dentro de um loop. Colete os IDs e use `whereIn` (`queries.md:326`):

```php
// ERRADO: 1 query por item
foreach ($orderIds as $id) {
    $order = App\Order::find($id);
}

// CERTO: 1 query
$orders = App\Order::whereIn('id', $orderIds)->get();

// Melhor ainda: mantenha a ordem dos IDs se necessário
$orders = App\Order::whereIn('id', $orderIds)->get()->keyBy('id');
foreach ($orderIds as $id) {
    $order = $orders[$id]; // acesso em memória, sem query
}
```

### 2.9 Expressões raw com cuidado

Raw é poderoso mas perigoso (SQL injection). Prefira os métodos `selectRaw`, `whereRaw`, `havingRaw`, `orderByRaw` que aceitam bindings (`queries.md:149`):

```php
$orders = DB::table('orders')
    ->selectRaw('price * ? as price_with_tax', [1.0825])
    ->get();

$orders = DB::table('orders')
    ->whereRaw('price > IF(state = "TX", ?, 100)', [200])
    ->get();
```

> **Cuidado:** `DB::raw()` injeta strings diretamente. Nunca interpole variáveis do usuário em raw sem bindings.

### 2.10 Paginação eficiente

Use a paginação do framework em vez de `offset/limit` manuais em controladores (`pagination.md` conceitual):

```php
$users = App\User::where('active', 1)->paginate(25);

// "Paginador simples" (sem contagem total) é mais barato p/ datasets enormes
$users = App\User::where('active', 1)->simplePaginate(25);
```

> `simplePaginate` (usa `limit/offset` sem `count(*)`) é recomendado para tabelas muito grandes onde a contagem total é irrelevante para a UX.

### 2.11 Pessimistic locking

Para evitar condições de corrida em escritas concorrentes, use locks do banco (`queries.md:619`):

```php
DB::table('users')->where('votes', '>', 100)->sharedLock()->get();
DB::table('users')->where('votes', '>', 100)->lockForUpdate()->get();
```

### 2.12 Query Events para depuração de N+1

Use `DB::listen` para logar cada SQL e seu tempo durante a detecção de gargalos (`database.md:151`):

```php
// Em AppServiceProvider::boot()
DB::listen(function ($query) {
    // $query->sql, $query->bindings, $query->time
    if ($query->time > 100) { // queries > 100ms
        \Log::warning($query->sql, $query->bindings);
    }
});
```

---

## 3. Cache

### 3.1 Drivers disponíveis (5.5)

Configurados em `config/cache.php`. Suportados: `file` (padrão), `database`, `redis`, `memcached`, `array` (`cache.md:23`). APC não é mencionado como driver nativo no 5.5 (use `array` para testes/request-scoped).

- `file`: serializa objetos no filesystem. Ok para pequenas apps, mas I/O de disco.
- `database`: usa tabela `cache` (crie via `php artisan cache:table`).
- `redis` / `memcached`: recomendados para aplicações maiores (`cache.md:25`).
- `array`: não persiste entre requests; ótimo p/ testes e caches de request lifecycle.

```php
// Acessar stores específicos
$value = Cache::store('file')->get('foo');
Cache::store('redis')->put('bar', 'baz', 10);
```

### 3.2 `Cache::remember` / `rememberForever` / `put` / `get`

```php
// Recupera ou executa o Closure e armazena por $minutes
$value = Cache::remember('users', $minutes, function () {
    return DB::table('users')->get();
});

// Armazena "para sempre" (até invalidação manual)
$value = Cache::rememberForever('users', function () {
    return DB::table('users')->get();
});

// Guardar manualmente (minutos como int ou DateTime de expiração)
Cache::put('key', 'value', $minutes);
Cache::put('key', 'value', now()->addMinutes(10));

// Armazenar se não existir
Cache::add('key', 'value', $minutes); // retorna true se adicionado

// Armazenar permanentemente
Cache::forever('key', 'value'); // requer forget() para remover

// Recuperar
$value = Cache::get('key');
$value = Cache::get('key', 'default');
$value = Cache::get('key', function () {
    return DB::table('users')->get(); // Closure deferida
});

// Recuperar e remover
$value = Cache::pull('key');

// Incrementar/decrementar (valores inteiros)
Cache::increment('hits');
Cache::increment('hits', 5);
Cache::decrement('hits');
```

> **Cache de queries nativo?** O Laravel 5.5 **não possui** `Model::cache()` nativo. A forma idiomática é envolver a query em `Cache::remember`/`rememberForever`. Combine com `$model->touch` (veja seção 1.8 / `touches`) para invalidar em updates.

### 3.3 TTL e invalidação

```php
Cache::forget('key');     // remove um item
Cache::flush();           // remove TUDO (não respeita prefixo!)
```

> **Cuidado com `flush()`:** não respeita o prefixo de cache e limpa todo o store compartilhado — use com cautela se o Redis/Memcached for compartilhado entre apps.

**Estratégia de invalidação por chave versionada:**

```php
$key = 'user.' . $userId . '.profile.v1';
$user = Cache::remember($key, 60, function () use ($userId) {
    return App\User::with('posts')->find($userId);
});

// Ao atualizar, simplesmente esqueça a chave (ou mude o sufixo "v1" -> "v2")
Cache::forget($key);
```

### 3.4 Cache Tags (apenas Memcached / Redis)

Tags permitem agrupar itens e limpar por tag. **Importante 5.5:** tags **NÃO** são suportadas pelos drivers `file` e `database` (`cache.md:221`). Funcionam com `memcached`, `redis` (e `array`).

```php
Cache::tags(['people', 'artists'])->put('John', $john, $minutes);
Cache::tags(['people', 'authors'])->put('Anne', $anne, $minutes);

$john = Cache::tags(['people', 'artists'])->get('John');

// Limpa tudo com a tag 'people' OU 'authors'
Cache::tags(['people', 'authors'])->flush();

// Limpa só 'authors'
Cache::tags('authors')->flush();
```

> **Performance de tags "forever":** com múltiplas tags e itens `forever`, prefira Memcached (auto‑purga stale) para melhor desempenho (`cache.md:221`).

### 3.5 Atomic Locks — indisponível no 5.5

`Cache::lock()` (Redis) foi introduzido no **Laravel 5.6**. No 5.5 **não existe**. Alternativas em 5.5:

- Para rate limiting de jobs: `Redis::throttle()` / `Redis::funnel()` (ver seção 5.5).
- Para seções críticas em request único: use transações do banco ou `Cache::add()` (que é atômico "add if not present" — retorna `false` se já existir) como semáforo simples.

```php
// Semáforo simples via add() (não é lock distribuído robusto)
if (Cache::add('lock:report', true, 10)) {
    try {
        // trabalho
    } finally {
        Cache::forget('lock:report');
    }
}
```

### 3.6 Eventos de cache (log/auditoria)

```php
// EventServiceProvider::$listen
protected $listen = [
    'Illuminate\Cache\Events\CacheHit'    => ['App\Listeners\LogCacheHit'],
    'Illuminate\Cache\Events\CacheMissed' => ['App\Listeners\LogCacheMissed'],
    'Illuminate\Cache\Events\KeyForgotten'=> ['App\Listeners\LogKeyForgotten'],
    'Illuminate\Cache\Events\KeyWritten'  => ['App\Listeners\LogKeyWritten'],
];
```

Útil para medir hit/miss ratio e detectar caches ineficazes.

---

## 4. Redis

### 4.1 Configuração

Em `config/database.php`, chave `redis` (`redis.md:25`). `client` pode ser `predis` (pacote `predis/predis ~1.0`) ou `phpredis` (extensão PECL — melhor performance, instalação mais complexa).

```php
'redis' => [
    'client' => 'predis',
    'default' => [
        'host'     => env('REDIS_HOST', 'localhost'),
        'password' => env('REDIS_PASSWORD', null),
        'port'     => env('REDIS_PORT', 6379),
        'database' => 0,
    ],
],
```

Trocar para PhpRedis (`redis.md:99`):

```php
'redis' => [
    'client' => 'phpredis',
    // resto da config
],
```

> Se a extensão PhpRedis estiver instalada, renomeie o alias `Redis` em `config/app.php` para evitar conflito de nome (`redis.md:95`).

### 4.2 Múltiplas connections (cache vs default vs queue)

No 5.5 você pode definir connections nomeadas e usá-las para propósitos distintos (cache, sessão, fila). Exemplo:

```php
'redis' => [
    'client' => 'predis',
    'default' => [ 'host' => '127.0.0.1', 'port' => 6379, 'database' => 0 ],
    'cache'  => [ 'host' => '127.0.0.1', 'port' => 6379, 'database' => 1 ],
    'session'=> [ 'host' => '127.0.0.1', 'port' => 6379, 'database' => 2 ],
],
```

No `config/cache.php` aponte o driver para a connection:

```php
'redis' => [
    'driver' => 'redis',
    'connection' => 'cache',   // usa a connection 'cache' acima
    // ...
],
```

No `config/database.php` da fila (ver seção 5) e em `config/session.php` (`'driver' => 'redis'`, connection `session`).

### 4.3 Uso direto (comandos)

`Redis` facade suporta qualquer comando Redis via magic method (`redis.md:119`):

```php
use Illuminate\Support\Facades\Redis;

Redis::set('name', 'Taylor');
$values = Redis::lrange('names', 5, 10);
$user = Redis::get('user:profile:'.$id);

// Connection específica
$redis = Redis::connection('my-connection');
```

### 4.4 Pipelining — muitos comandos numa só operação

```php
Redis::pipeline(function ($pipe) {
    for ($i = 0; $i < 1000; $i++) {
        $pipe->set("key:$i", $i);
    }
});
```

### 4.5 Clustering

O 5.5 suporta **client-side sharding** via chave `clusters` (`redis.md:44`). Não há *native Redis clustering* por padrão — deve ser ativado com `'cluster' => 'redis'` em `options` (`redis.md:65`). Client-side sharding não trata failover e é voltado a dados em cache (recuperáveis de fonte primária).

```php
'redis' => [
    'client' => 'predis',
    'clusters' => [
        'default' => [
            ['host' => env('REDIS_HOST', 'localhost'), 'port' => 6379, 'database' => 0],
        ],
    ],
],
```

> **Nota:** filas Redis em cluster exigem que os nomes de fila contenham [key hash tag](https://redis.io/topics/cluster-spec#keys-hash-tags) para manter chaves no mesmo slot (`queues.md:68`).

---

## 5. Queues (trabalho assíncrono)

### 5.1 Por que usar filas para performance

Filas adiam tarefas pesadas (envio de e‑mail, processamento de imagem, integrações) para depois do response HTTP, acelerando drasticamente as requisições web (`queues.md:32`). Drivers: `database`, `beanstalkd`, `sqs`, `redis`, `sync` (imediato, local), `null` (descarta).

### 5.2 Criando e despachando jobs

```php
// app/Jobs/ProcessPodcast.php
class ProcessPodcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $podcast;

    public function __construct(Podcast $podcast)
    {
        $this->podcast = $podcast; // SerializesModels: só o ID é serializado
    }

    public function handle(AudioProcessor $processor)
    {
        // processa o podcast
    }
}

// Dispatch
ProcessPodcast::dispatch($podcast);
```

> `SerializesModels` serializa apenas o ID; o modelo é reidratado do banco quando o job roda (`queues.md:147`). Evita serializar instâncias pesadas.

### 5.3 Delayed dispatching

```php
ProcessPodcast::dispatch($podcast)->delay(now()->addMinutes(10));
```

> SQS tem atraso máximo de 15 minutos (`queues.md:212`).

### 5.4 Job chaining (5.5) — sem batching

```php
ProcessPodcast::withChain([
    new OptimizePodcast,
    new ReleasePodcast,
])->dispatch();
```

> **Batching NÃO existe no 5.5** (Laravel 8+). Para agrupar, use chaining ou múltiplos jobs via `dispatch`/`push`.

### 5.5 Rate limiting de jobs (5.5, requer Redis)

Throttle por tempo (`Redis::throttle`) ou por concorrência (`Redis::funnel`) (`queues.md:356`):

```php
// Máx 10 execuções a cada 60s
Redis::throttle('key')->allow(10)->every(60)->then(function () {
    // lógica do job
}, function () {
    return $this->release(10); // não obteve lock => reenfileira
});

// Máx 1 worker por vez (recurso exclusivo)
Redis::funnel('key')->limit(1)->then(function () {
    // lógica
}, function () {
    return $this->release(10);
});
```

> Combine com `retryUntil` (tempo‑baseado) pois o número de tentativas é imprevisível com throttling (`queues.md:382`).

### 5.6 Tentativas e timeout (5.5)

**Max attempts:**

```php
// Via CLI
php artisan queue:work --tries=3

// Ou na classe (prevalece sobre CLI)
class ProcessPodcast implements ShouldQueue
{
    public $tries = 5;
}
```

**Tentativas baseadas em tempo (`retryUntil`)** — novo no 5.5 (`queues.md:314`):

```php
public function retryUntil()
{
    return now()->addSeconds(5);
}
```

**Timeout** (PHP 7.1+ com `pcntl`) — na classe ou CLI (`queues.md:331`):

```php
public $timeout = 120;
// ou: php artisan queue:work --timeout=30
```

### 5.7 Priorização e múltiplas filas

```php
// Enviar para fila específica
ProcessPodcast::dispatch($podcast)->onQueue('processing');

// Connection + queue
ProcessPodcast::dispatch($podcast)->onConnection('sqs')->onQueue('processing');

// Worker prioriza 'high' antes de 'low'
php artisan queue:work --queue=high,low
```

### 5.8 `retry_after` vs `--timeout`

`retry_after` (em `config/queue.php`) define há quanto tempo um job em processamento é reenfileirado (`queues.md:447`). `--timeout` mata o worker filho congelado (`queues.md:453`).

> **Regra crítica:** `--timeout` deve ser **sempre alguns segundos menor** que `retry_after`. Caso contrário, jobs podem ser processados duas vezes (`queues.md:459`).

### 5.9 Supervisor e workers de longa duração

Use Supervisor para manter `queue:work` vivo (`queues.md:467`):

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /home/forge/app.com/artisan queue:work redis --sleep=3 --tries=3
autostart=true
autorestart=true
user=forge
numprocs=8
redirect_stderr=true
stdout_logfile=/home/forge/app.com/worker.log
```

> Workers são processos longos que guardam estado em memória e **não enxergam mudanças de código** sem restart. Libere recursos pesados (ex.: `imagedestroy`) após cada job (`queues.md:416`).

### 5.10 Deploy de workers e restart

```php
php artisan queue:restart
```

> O sinal de restart usa o **cache** — garanta um driver de cache configurado (`queues.md:440`). Combine com Supervisor para reinício automático.

### 5.11 Failed jobs

```bash
php artisan queue:failed-table   # cria migração da tabela failed_jobs
php artisan migrate
php artisan queue:work redis --tries=3

php artisan queue:failed         # lista falhas
php artisan queue:retry 5        # retry por ID
php artisan queue:retry all
php artisan queue:forget 5
php artisan queue:flush
```

Limpeza específica por job (`queues.md:520`):

```php
public function failed(Exception $exception)
{
    // notifica, reverte ações
}
```

Eventos globais (`queues.md:576`):

```php
Queue::failing(function (JobFailed $event) {
    // $event->connectionName, $event->job, $event->exception
});
```

Eventos `before`/`after`/`looping` (`queues.md:640`):

```php
Queue::before(function (JobProcessing $event) { /* log/stats */ });
Queue::after(function (JobProcessed $event) { /* log/stats */ });
Queue::looping(function () {
    while (DB::transactionLevel() > 0) { DB::rollBack(); }
});
```

---

## 6. Otimizações de Deploy (5.5)

### 6.1 `php artisan optimize` FOI REMOVIDO

No Laravel 5.5 o comando `optimize` **não existe mais**. Não o utilize. Em seu lugar, rode os comandos de cache abaixo durante o deploy:

- `php artisan config:cache` — combina todos os configs num único arquivo serializado (`deployment.md:74`).
- `php artisan route:cache` — reduz o registro de rotas a uma única chamada (`deployment.md:83`).
- `php artisan view:cache` — compila as Blade views (disponível no 5.5).

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Para limpar (útil em rollback/desenvolvimento):

```bash
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

> **Notas 5.5:**
> - `route:cache` **só funciona com rotas baseadas em controllers** (não serializa Closures) (`deployment.md:89`).
> - `event:cache` **NÃO existe no 5.5** (chegou no 5.8). Não tente usá-lo.
> - `optimize:clear` **não existe no 5.5**; use os comandos `*::clear` específicos acima.

### 6.2 Autoloader do Composer

```bash
composer install --optimize-autoloader
```

Opcionalmente, para apps onde nenhum autoload PSR-4 dinâmico é necessário em runtime:

```bash
composer dump-autoload --optimize --classmap-authoritative
```

> `--classmap-authoritative` é mais rápido (não faz fallback ao filesystem) mas **quebra** se houver classes fora do classmap (ex.: geradas em runtime). Use com cautela em produção.

### 6.3 OPcache (conceitual)

Habilite o **OPcache** no PHP (extensão `opcache`) em produção — ele cacheia os opcodes compilados, eliminando re‑parse de arquivos a cada request. Isso é independente do Laravel, mas essencial para a performance de qualquer app 5.5. Exemplo de `php.ini`:

```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.max_accelerated_files=10000
opcache.revalidate_freq=60
opcache.validate_timestamps=0   ; em produção, desligue revalidação
```

> Com `validate_timestamps=0`, lembre‑se de limpar o OPcache no deploy (ex.: `opcache_reset()` ou restart do FPM) para que mudanças de código entrem em vigor.

### 6.4 Evitar debug em produção

- Nunca deixe `APP_DEBUG=true` em produção (`config/app.php` / `.env`). O debugger expõe stack traces e destrói a performance.
- Desligue `APP_LOG` excessivo e queries de log fora de janelas de diagnóstico.
- Remova `DB::listen` de produção ou restrinja a thresholds altos.

### 6.5 Session e compiled views

- Defina `SESSION_DRIVER` adequado: `redis` ou `memcached` em produção (não `file` para alta concorrência).
- Rode `view:cache` para pré‑compilar templates Blade, evitando compilação em runtime.

---

## 7. Detecção de N+1 e más práticas (conceitual)

Além de `DB::listen` (seção 2.12), boas práticas de detecção no 5.5:

- Conte queries por request (log de `DB::enableQueryLog()` em ambiente de teste — não produção).
- Use `withCount`/`with` sempre que for iterar relações em views.
- Desconfie de acessos a propriedades de relação (`$model->relation`) dentro de `@foreach` em Blade sem eager loading prévio.
- Para relações opcionais, prefira `loadMissing()` para não reexecutar queries.
- Em coleções grandes, prefira `cursor()`/`chunkById()` a `->get()` + loop.

---

## 8. Armadilhas comuns (5.5)

1. **`with('rel:id')` sem `id`** — relacionamento quebrado (`eloquent-relationships.md:825`).
2. **`php artisan optimize`** — removido; use `config:cache`, `route:cache`, `view:cache`.
3. **`Cache::flush()`** — limpa tudo, ignorando prefixo; perigoso em Redis compartilhado.
4. **Cache tags em `file`/`database`** — não suportadas no 5.5 (`cache.md:221`).
5. **`Cache::lock`** — inexistente no 5.5; use `Redis::throttle`/`add()`.
6. **`--timeout` >= `retry_after`** — jobs processados duas vezes (`queues.md:459`).
7. **Lazy collections** — não existem; `cursor()` retorna `Generator`.
8. **Arrow functions `fn`** — PHP 7.1 do 5.5 não suporta; use `function ($q)`.
9. **`event:cache`** — indisponível no 5.5.
10. **Não usar índices** em colunas de `where`/`join`/`orderBy` — gargalo silencioso.
11. **Query dentro de loop** — substitua por `whereIn` + `keyBy`.
12. **Workers sem restart no deploy** — código antigo em memória; sempre `queue:restart` + Supervisor.

---

## Resumo de Pontos-Chave

- **Eager loading:** use `with()`, `withCount`, `load()`/`loadMissing()`, restrinja colunas (`rel:id,name` sempre com `id`), use dot syntax para aninhamento e closures (`function ($q)`) para constraints.
- **Queries:** `select` enxuto + índices em migrations; `chunk()`/`chunkById()` e `cursor()` (5.5) para memória; `exists()` em vez de `count()`; `whereIn` no lugar de loops; `pluck`/`simplePaginate` para eficiência; raw só com bindings.
- **Cache:** drivers `redis`/`memcached` em produção; `remember`/`rememberForever`; tags só em memcached/redis; `flush()` com cuidado; `Cache::lock` NÃO existe no 5.5.
- **Redis:** `predis` ou `phpredis`; múltiplas connections (cache/session/queue); `pipeline()`; client-side sharding (sem native clustering por padrão).
- **Queues:** adie trabalho pesado; `withChain` (sem batching 5.5); `Redis::throttle`/`funnel` (rate limit); `tries`/`retryUntil`/`timeout`; priorização `--queue=high,low`; Supervisor + `queue:restart`; `retry_after` > `--timeout`; tabela `failed_jobs`.
- **Deploy 5.5:** `config:cache` + `route:cache` + `view:cache` (NÃO `optimize`); `--optimize-autoloader`/`--classmap-authoritative`; OPcache; `APP_DEBUG=false`; `event:cache` inexistente.
- **Inexistentes no 5.5:** `optimize`, Lazy Collections, `Cache::lock`, job batching, `event:cache`.

---

## Referências

- `cache.md` — drivers, `remember`/`rememberForever`, tags (memcached/redis), eventos.
- `redis.md` — configuração, `predis`/`phpredis`, connections, `pipeline`, clustering client-side.
- `queues.md` — drivers, `withChain`, `delay`, `tries`/`retryUntil`/`timeout`, `throttle`/`funnel`, Supervisor, `retry_after` vs `--timeout`, `failed_jobs`.
- `database.md` — configuração, read/write connections, `DB::listen`, transações.
- `eloquent.md` — `chunk`, `cursor` (5.5), agregações, mass update/delete, observers.
- `eloquent-relationships.md` — N+1, `with`, `withCount`, constraining eager loads, `load`/`loadMissing`, `touches`.
- `queries.md` — `select`, raw, joins, `whereIn`, aggregates, `chunk`, `when`, pessimistic locking, `pluck`.
- `deployment.md` — autoloader, `config:cache`, `route:cache` (5.5), Nginx.
- `artisan.md` — comandos, execução programática (`Artisan::queue`).
