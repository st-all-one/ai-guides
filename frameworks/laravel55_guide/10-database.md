# Integração com Database no Laravel 5.5.50

Este dossiê cobre, de forma detalhada e restrita ao **Laravel 5.5.50 (LTS)**, toda a camada de
acesso a dados: configuração de conexões, Query Builder, Eloquent ORM, Migrations, Seeds/Factories,
relacionamentos, mutators/casts, API Resources, serialização, paginação, soft deletes e testes de
banco de dados.

> **Nota de versão:** Todo o conteúdo abaixo foi validado contra a documentação oficial do Laravel 5.5
> e limitado estritamente a recursos existentes em 5.5.50. Recursos de versões posteriores
> (**não** presentes em 5.5) foram deliberadamente omitidos: `upsert` (8+), `insertOrIgnore` (8+),
> `lazy` (6+), `fromSub` (6+), `afterCommit` (8+), paginação por cursor (`cursorPaginate`, 8+),
> e o formato de configuração via `DB_URL`/`url` (introduzido em 5.7). O método `dd`/`dump` **não**
> existe no Query Builder em 5.5 (existe apenas na `Collection`). `toBase()` existe, mas é usado com
> cuidado. `whereKey` e `chunkById` **existem** em 5.5 e são documentados aqui.

---

## 1. Configuração de Conexões (`config/database.php`)

O arquivo `config/database.php` define todas as conexões e qual delas é a padrão (`default`).
O Laravel 5.5 suporta oficialmente quatro bancos:

- MySQL
- PostgreSQL
- SQLite
- SQL Server

### 1.1 Exemplos de drivers

```php
// config/database.php (trechos representativos)

'connections' => [

    'mysql' => [
        'driver'    => 'mysql',
        'host'      => env('DB_HOST', '127.0.0.1'),
        'port'      => env('DB_PORT', '3306'),
        'database'  => env('DB_DATABASE', 'forge'),
        'username'  => env('DB_USERNAME', 'forge'),
        'password'  => env('DB_PASSWORD', ''),
        'unix_socket' => env('DB_SOCKET', ''),
        'charset'   => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix'    => '',
        'strict'    => true,
        'engine'    => null,
    ],

    'pgsql' => [
        'driver'   => 'pgsql',
        'host'     => env('DB_HOST', '127.0.0.1'),
        'port'     => env('DB_PORT', '5432'),
        'database' => env('DB_DATABASE', 'forge'),
        'username' => env('DB_USERNAME', 'forge'),
        'password' => env('DB_PASSWORD', ''),
        'charset'  => 'utf8',
        'prefix'   => '',
        'schema'   => 'public',
        'sslmode'  => 'prefer',
    ],

    'sqlite' => [
        'driver'   => 'sqlite',
        'database' => env('DB_DATABASE', database_path('database.sqlite')),
        'prefix'   => '',
    ],

    'sqlsrv' => [
        'driver'   => 'sqlsrv',
        'host'     => env('DB_HOST', 'localhost'),
        'port'     => env('DB_PORT', '1433'),
        'database' => env('DB_DATABASE', 'forge'),
        'username' => env('DB_USERNAME', 'forge'),
        'password' => env('DB_PASSWORD', ''),
        'charset'  => 'utf8',
        'prefix'   => '',
    ],

],
```

### 1.2 SQLite

Após criar o arquivo (`touch database/database.sqlite`), aponte o `.env` para o caminho absoluto:

```dotenv
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database.sqlite
```

### 1.3 Read / Write Connections (split de leitura e escrita)

É possível usar uma conexão para `SELECT` e outra para `INSERT/UPDATE/DELETE`. As chaves `read`,
`write` e `sticky` são adicionadas ao array de conexão. Os demais valores são herdados do array
principal.

```php
'mysql' => [
    'read'  => [
        'host' => '192.168.1.1',
    ],
    'write' => [
        'host' => '196.168.1.2',
    ],
    'sticky'    => true,
    'driver'    => 'mysql',
    'database'  => 'database',
    'username'  => 'root',
    'password'  => '',
    'charset'   => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix'    => '',
],
```

- `read` / `write`: apenas sobrescrevem `host` (e quaisquer chaves neles presentes); o restante é
  mesclado do array principal.
- `sticky` (opcional): se `true` e uma escrita ocorreu no ciclo da requisição atual, leituras
  subsequentes usam a conexão de escrita, garantindo leitura imediata do que acabou de ser gravado.

### 1.4 Múltiplas conexões

Acesse cada conexão nomeada via `connection()` no facade `DB`:

```php
$users = DB::connection('foo')->select(...);

// PDO bruto subjacente:
$pdo = DB::connection()->getPdo();
```

### 1.5 Sobre `DB_URL` / configuração via URL

No Laravel 5.5.50 **não existe** o parâmetro `url` em `config/database.php` nem a variável
`DB_URL`. A configuração é feita campo a campo (`host`, `database`, `username`, etc.). Isso foi
introduzido apenas em versões posteriores (5.7+). Não utilize esse formato em 5.5.

### 1.6 Prefixo de tabela por conexão

O `prefix` em `config/database.php` aplica um prefixo a todas as tabelas daquela conexão. Um model
também pode declarar seu próprio prefixo via propriedade (ver seção Eloquent). O prefixo do
`Schema`/`DB` segue o da conexão em uso.

---

## 2. Query Builder

O Query Builder oferece uma interface fluente, independente do banco, e usa *parameter binding* (PDO)
para proteger contra SQL injection. Não é necessário "limpar" strings passadas como bindings.

### 2.1 Recuperando resultados

```php
// Todos os registros (retorna Illuminate\Support\Collection de StdClass)
$users = DB::table('users')->get();

foreach ($users as $user) {
    echo $user->name;
}

// Uma única linha
$user = DB::table('users')->where('name', 'John')->first();
echo $user->name;

// Um único valor de coluna
$email = DB::table('users')->where('name', 'John')->value('email');

// Lista de valores de uma coluna
$titles = DB::table('roles')->pluck('title');

// Com chave customizada
$roles = DB::table('roles')->pluck('title', 'name');
```

### 2.2 Chunking (processamento em blocos)

Para milhares de registros, use `chunk` para economizar memória. Retorna `false` dentro do closure
para parar os próximos blocos.

```php
DB::table('users')->orderBy('id')->chunk(100, function ($users) {
    foreach ($users as $user) {
        //
    }
});

// Parar:
DB::table('users')->orderBy('id')->chunk(100, function ($users) {
    return false;
});
```

> **Armadilha — reindex:** Ao usar `chunk` em cima de um `orderBy('id')` e deletar/atualizar linhas
> durante o processamento, o offset pode "pular" registros. Para evitar, prefira
> `chunkById` (disponível em 5.5), que pagina por chave primária em vez de `LIMIT/OFFSET`:

```php
DB::table('users')->where('active', 0)->chunkById(100, function ($users) {
    foreach ($users as $user) {
        DB::table('users')->where('id', $user->id)->delete();
    }
});
```

### 2.3 Aggregates

```php
$users  = DB::table('users')->count();
$price  = DB::table('orders')->max('price');
$avg    = DB::table('orders')->where('finalized', 1)->avg('price');
$total  = DB::table('orders')->sum('price');
$min    = DB::table('orders')->min('price');
```

### 2.4 Selects

```php
$users = DB::table('users')->select('name', 'email as user_email')->get();

$users = DB::table('users')->distinct()->get();

// Adicionar coluna a um builder já existente:
$query = DB::table('users')->select('name');
$users = $query->addSelect('age')->get();
```

### 2.5 Raw Expressions

`DB::raw` injeta a expressão como string — **cuidado com SQL injection**.

```php
$users = DB::table('users')
    ->select(DB::raw('count(*) as user_count, status'))
    ->where('status', '<>', 1)
    ->groupBy('status')
    ->get();
```

Métodos raw específicos (prefira estes a `DB::raw`):

```php
// selectRaw
$orders = DB::table('orders')
    ->selectRaw('price * ? as price_with_tax', [1.0825])
    ->get();

// whereRaw / orWhereRaw
$orders = DB::table('orders')
    ->whereRaw('price > IF(state = "TX", ?, 100)', [200])
    ->get();

// havingRaw / orHavingRaw
$orders = DB::table('orders')
    ->select('department', DB::raw('SUM(price) as total_sales'))
    ->groupBy('department')
    ->havingRaw('SUM(price) > 2500')
    ->get();

// orderByRaw
$orders = DB::table('orders')
    ->orderByRaw('updated_at - created_at DESC')
    ->get();
```

### 2.6 Joins

```php
// Inner join
DB::table('users')
    ->join('contacts', 'users.id', '=', 'contacts.user_id')
    ->join('orders', 'users.id', '=', 'orders.user_id')
    ->select('users.*', 'contacts.phone', 'orders.price')
    ->get();

// Left join
DB::table('users')
    ->leftJoin('posts', 'users.id', '=', 'posts.user_id')
    ->get();

// Cross join (produto cartesiano)
DB::table('sizes')->crossJoin('colours')->get();

// Advanced join clauses (Closure recebe JoinClause)
DB::table('users')
    ->join('contacts', function ($join) {
        $join->on('users.id', '=', 'contacts.user_id')->orOn(...);
    })
    ->get();

// where dentro do join (compara coluna com valor, não com coluna)
DB::table('users')
    ->join('contacts', function ($join) {
        $join->on('users.id', '=', 'contacts.user_id')
             ->where('contacts.user_id', '>', 5);
    })
    ->get();
```

### 2.7 Unions

```php
$first = DB::table('users')->whereNull('first_name');
$users = DB::table('users')->whereNull('last_name')->union($first)->get();

// unionAll também disponível
```

### 2.8 Where Clauses

```php
// Simples
DB::table('users')->where('votes', '=', 100)->get();
DB::table('users')->where('votes', 100)->get(); // igualdade implícita
DB::table('users')->where('votes', '>=', 100)->get();
DB::table('users')->where('name', 'like', 'T%')->get();

// Array de condições (AND)
DB::table('users')->where([
    ['status', '=', '1'],
    ['subscribed', '<>', '1'],
])->get();

// OR
DB::table('users')->where('votes', '>', 100)->orWhere('name', 'John')->get();

// whereBetween / whereNotBetween
DB::table('users')->whereBetween('votes', [1, 100])->get();
DB::table('users')->whereNotBetween('votes', [1, 100])->get();

// whereIn / whereNotIn
DB::table('users')->whereIn('id', [1, 2, 3])->get();
DB::table('users')->whereNotIn('id', [1, 2, 3])->get();

// whereNull / whereNotNull
DB::table('users')->whereNull('updated_at')->get();
DB::table('users')->whereNotNull('updated_at')->get();

// Datas
DB::table('users')->whereDate('created_at', '2016-12-31')->get();
DB::table('users')->whereMonth('created_at', '12')->get();
DB::table('users')->whereDay('created_at', '31')->get();
DB::table('users')->whereYear('created_at', '2016')->get();
DB::table('users')->whereTime('created_at', '=', '11:20')->get();

// whereColumn (compara colunas)
DB::table('users')->whereColumn('first_name', 'last_name')->get();
DB::table('users')->whereColumn('updated_at', '>', 'created_at')->get();
DB::table('users')->whereColumn([
    ['first_name', '=', 'last_name'],
    ['updated_at', '>', 'created_at'],
])->get();
```

**whereKey** (5.5): atalho para `where('id', $id)` / `whereIn('id', $ids)`:

```php
DB::table('users')->whereKey(1)->get();
DB::table('users')->whereKey([1, 2, 3])->get();
```

**Parameter grouping (parênteses):**

```php
DB::table('users')
    ->where('name', '=', 'John')
    ->orWhere(function ($query) {
        $query->where('votes', '>', 100)
              ->where('title', '<>', 'Admin');
    })
    ->get();
// select * from users where name = 'John' or (votes > 100 and title <> 'Admin')
```

**Where exists:**

```php
DB::table('users')
    ->whereExists(function ($query) {
        $query->select(DB::raw(1))
              ->from('orders')
              ->whereRaw('orders.user_id = users.id');
    })
    ->get();
```

**JSON where clauses** (MySQL 5.7+ / PostgreSQL): use o operador `->`:

```php
$users = DB::table('users')->where('options->language', 'en')->get();
$users = DB::table('users')->where('preferences->dining->meal', 'salad')->get();
```

### 2.9 Ordenação, Agrupamento, Limite e Offset

```php
DB::table('users')->orderBy('name', 'desc')->get();

DB::table('users')->latest()->first();        // ordena por created_at desc
DB::table('users')->oldest()->first();
DB::table('users')->oldest('updated_at')->first();

DB::table('users')->inRandomOrder()->first(); // ordenação aleatória

DB::table('users')
    ->groupBy('account_id')
    ->having('account_id', '>', 100)
    ->get();

DB::table('users')->groupBy('first_name', 'status')->having(...)->get();

// Limit/offset
DB::table('users')->skip(10)->take(5)->get();
DB::table('users')->offset(10)->limit(5)->get();
```

### 2.10 Conditional Clauses (`when`)

```php
$role = $request->input('role');

$users = DB::table('users')
    ->when($role, function ($query) use ($role) {
        return $query->where('role_id', $role);
    })
    ->get();

// with default fallback (terceiro Closure executado se falso)
$users = DB::table('users')
    ->when($sortBy,
        function ($query) use ($sortBy) { return $query->orderBy($sortBy); },
        function ($query) { return $query->orderBy('name'); }
    )
    ->get();
```

### 2.11 Inserts

```php
DB::table('users')->insert(
    ['email' => 'john@example.com', 'votes' => 0]
);

// Múltiplos
DB::table('users')->insert([
    ['email' => 'taylor@example.com', 'votes' => 0],
    ['email' => 'dayle@example.com', 'votes' => 0],
]);

// Auto-increment id
$id = DB::table('users')->insertGetId(
    ['email' => 'john@example.com', 'votes' => 0]
);
// PostgreSQL: o insertGetId espera coluna 'id'; passe o nome da sequence como 2º arg se necessário.
```

### 2.12 Updates

```php
DB::table('users')->where('id', 1)->update(['votes' => 1]);

// JSON columns (MySQL 5.7+ / PG)
DB::table('users')->where('id', 1)->update(['options->enabled' => true]);
```

**Increment & Decrement:**

```php
DB::table('users')->increment('votes');
DB::table('users')->increment('votes', 5);
DB::table('users')->decrement('votes');
DB::table('users')->decrement('votes', 5);
DB::table('users')->increment('votes', 1, ['name' => 'John']); // cols extras
```

### 2.13 Deletes e Truncate

```php
DB::table('users')->delete();
DB::table('users')->where('votes', '>', 100)->delete();
DB::table('users')->truncate(); // remove tudo e zera auto-increment
```

### 2.14 Pessimistic Locking

```php
DB::table('users')->where('votes', '>', 100)->sharedLock()->get();
DB::table('users')->where('votes', '>', 100)->lockForUpdate()->get();
```

### 2.15 Paginação no Query Builder

```php
$users = DB::table('users')->paginate(15);        // LengthAwarePaginator
$users = DB::table('users')->simplePaginate(15);  // Paginator (mais leve)
```

> **Armadilha — groupBy + paginate:** paginação com `groupBy` não é eficiente no Laravel 5.5.
> Recomenda-se consultar e criar o paginador manualmente (`LengthAwarePaginator`).

### 2.16 SQL cru (Raw SQL)

```php
// SELECT com bindings posicionais (?) — protege contra injection
$users = DB::select('select * from users where active = ?', [1]);

// Bindings nomeados
$results = DB::select('select * from users where id = :id', ['id' => 1]);

DB::insert('insert into users (id, name) values (?, ?)', [1, 'Dayle']);
$affected = DB::update('update users set votes = 100 where name = ?', ['John']);
$deleted  = DB::delete('delete from users');
DB::statement('drop table users');
```

### 2.17 DB::raw vs toBase

- `DB::raw($expression)` injeta SQL cru em qualquer parte da consulta.
- `toBase()` (5.5) retorna um Query Builder sem as capacidades de Eloquent (útil para evitar
  hidratação de model em consultas pesadas). **Não** confunda com `fromSub`, que **não** existe no 5.5.

---

## 3. Database Transactions

```php
// Closure: rollback automático em exceção, commit automático se sucesso
DB::transaction(function () {
    DB::table('users')->update(['votes' => 1]);
    DB::table('posts')->delete();
});

// Segundo argumento = nº de tentativas em deadlock
DB::transaction(function () {
    DB::table('users')->update(['votes' => 1]);
    DB::table('posts')->delete();
}, 5);

// Manual
DB::beginTransaction();
try {
    DB::table('users')->update(['votes' => 1]);
    DB::table('posts')->delete();
    DB::commit();
} catch (\Exception $e) {
    DB::rollBack();
    throw $e;
}
```

- **Aninhamento / savepoints:** `DB::transaction()` aninhado cria *savepoints*; o rollback do
  interno afeta apenas aquele ponto. O commit externo consolida tudo.
- **`afterCommit`:** **não existe** no Laravel 5.5 (introduzido em versões muito posteriores).
  Não utilize esse hook em 5.5.
- `DB::transaction()` controla transações tanto do Query Builder quanto do Eloquent.

---

## 4. Eloquent ORM — Definição de Models

```php
<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Flight extends Model
{
    //
}
```

```bash
php artisan make:model User
php artisan make:model User --migration   # ou -m
```

### 4.1 Convenções

- **Tabela:** plural em snake_case do nome da classe (`Flight` → `flights`). Sobrescreva com `$table`.
- **Primary key:** `id` por padrão. Sobrescreva com `$primaryKey`.
- **Incrementing / key type:** se a PK não é inteiro auto-incremento, defina `$incrementing = false`;
  se não é `int`, defina `$keyType = 'string'`.
- **Timestamps:** `created_at`/`updated_at` gerenciados automaticamente; desative com
  `$timestamps = false`.

```php
class Flight extends Model
{
    protected $table = 'my_flights';
    protected $primaryKey = 'flight_id';
    public $incrementing = false;       // PK não incremental
    protected $keyType = 'string';      // PK não-inteira
    public $timestamps = false;
    protected $dateFormat = 'U';        // formato de armazenamento/serialização
    const CREATED_AT = 'creation_date'; // nomes customizados
    const UPDATED_AT = 'last_update';
}
```

### 4.2 Connection por model e prefixo

```php
class Flight extends Model
{
    protected $connection = 'connection-name';
}
```

> **Prefixo de tabela:** em 5.5 o prefixo vem da conexão (`config/database.php` → `prefix`). Não há
> propriedade mágica `$prefix` no model; para prefixar manualmente, informe o nome completo em
> `$table` (ex.: `'prefix_tabela'`).

### 4.3 Mass Assignment

Todos os models protegem contra mass assignment por padrão.

```php
class Flight extends Model
{
    protected $fillable = ['name'];   // whitelist
    // ou
    protected $guarded = ['price'];   // blacklist (tudo menos price)
    // ou todos atributos: protected $guarded = [];
}

$flight = App\Flight::create(['name' => 'Flight 10']);
$flight->fill(['name' => 'Flight 22']);
```

> **Armadilha:** `create`/`fill` respeitam `$fillable`/`$guarded`. `save()` com atribuição direta
> (`$flight->name = ...`) **não** é afetado por mass assignment, mas o `create`/`fill` sim.
> Nunca passe `Request->all()` para `create` sem proteção adequada (vulnerabilidade clássica de
> escalonamento, ex.: `is_admin`).

### 4.4 `$attributes` (valores padrão)

```php
class Flight extends Model
{
    protected $attributes = [
        'votes' => 0,
        'active' => true,
    ];
}
```

### 4.5 `$casts` e `$dates` (ver seção Mutators)

---

## 5. Recuperando Models

```php
// Todos
$flights = App\Flight::all();

// Com constraints
$flights = App\Flight::where('active', 1)
    ->orderBy('name', 'desc')
    ->take(10)
    ->get();

// Por PK
$flight = App\Flight::find(1);
$flights = App\Flight::find([1, 2, 3]); // Collection

// Primeiro / falha
$flight = App\Flight::where('active', 1)->first();
$flight = App\Flight::findOrFail(1);          // ModelNotFoundException → 404
$flight = App\Flight::where('legs', '>', 100)->firstOrFail();

// Aggregates
$count = App\Flight::where('active', 1)->count();
$max   = App\Flight::where('active', 1)->max('price');
```

### 5.1 Collections e Chunking/Cursor

- `all()`/`get()` retornam `Illuminate\Database\Eloquent\Collection`.
- `chunk(200, fn($flights) => ...)` — múltiplas queries, economiza memória.
- **`cursor()` (novo no 5.5):** itera com um **único** SELECT usando um gerador, reduzindo muito a
  memória em grandes volumes.

```php
foreach (Flight::where('foo', 'bar')->cursor() as $flight) {
    //
}
```

### 5.2 Outros métodos de criação

```php
// firstOrCreate: acha por atributos ou cria
$flight = App\Flight::firstOrCreate(['name' => 'Flight 10']);
$flight = App\Flight::firstOrCreate(
    ['name' => 'Flight 10'], ['delayed' => 1]
);

// firstOrNew: acha ou instancia (precisa de save)
$flight = App\Flight::firstOrNew(['name' => 'Flight 10']);

// updateOrCreate: atualiza ou cria (persiste automaticamente)
$flight = App\Flight::updateOrCreate(
    ['departure' => 'Oakland', 'destination' => 'San Diego'],
    ['price' => 99]
);
```

### 5.3 Inserindo e Atualizando

```php
$flight = new Flight;
$flight->name = $request->name;
$flight->save();                 // created_at/updated_at automáticos

$flight = App\Flight::find(1);
$flight->name = 'New Flight Name';
$flight->save();

// Mass update (NÃO dispara eventos saved/updated)
App\Flight::where('active', 1)
    ->where('destination', 'San Diego')
    ->update(['delayed' => 1]);

// Deletar
$flight = App\Flight::find(1);
$flight->delete();

App\Flight::destroy(1);
App\Flight::destroy([1, 2, 3]);
App\Flight::destroy(1, 2, 3);

// Mass delete (NÃO dispara eventos deleting/deleted)
$deletedRows = App\Flight::where('active', 0)->delete();
```

---

## 6. Soft Deletes

```php
<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Flight extends Model
{
    use SoftDeletes;

    protected $dates = ['deleted_at'];
}

// migration:
Schema::table('flights', function ($table) {
    $table->softDeletes();
});
```

- `delete()` define `deleted_at` (não remove a linha); queries excluem soft-deleted automaticamente.
- `trashed()`: verifica se está soft-deleted.
- `withTrashed()`, `onlyTrashed()`, `restore()`, `forceDelete()`.

```php
$flights = App\Flight::withTrashed()->where('account_id', 1)->get();
$flights = App\Flight::onlyTrashed()->where('airline_id', 1)->get();

$comment->restore();
App\Flight::withTrashed()->where('airline_id', 1)->restore();

$flight->forceDelete();
$flight->history()->forceDelete();
```

> O `SoftDeletes` aplica um **global scope** automaticamente (exclui `deleted_at IS NULL`).

---

## 7. Query Scopes

### 7.1 Local Scopes

```php
class User extends Model
{
    public function scopePopular($query)
    {
        return $query->where('votes', '>', 100);
    }

    public function scopeActive($query)
    {
        return $query->where('active', 1);
    }

    public function scopeOfType($query, $type) // dinâmico com parâmetro
    {
        return $query->where('type', $type);
    }
}

$users = App\User::popular()->active()->orderBy('created_at')->get();
$users = App\User::ofType('admin')->get();
```

### 7.2 Global Scopes

```php
// Classe
namespace App\Scopes;

use Illuminate\Database\Eloquent\Scope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class AgeScope implements Scope
{
    public function apply(Builder $builder, Model $model)
    {
        $builder->where('age', '>', 200);
    }
}

// Aplicação no model
class User extends Model
{
    protected static function boot()
    {
        parent::boot();
        static::addGlobalScope(new AgeScope);
        // anônimo:
        static::addGlobalScope('age', function (Builder $builder) {
            $builder->where('age', '>', 200);
        });
    }
}

User::withoutGlobalScope(AgeScope::class)->get();
User::withoutGlobalScopes()->get();
User::withoutGlobalScopes([FirstScope::class, SecondScope::class])->get();
```

> Dica: se o global scope adiciona colunas ao `select`, use `addSelect` em vez de `select` para não
> sobrescrever o select existente.

---

## 8. Relacionamentos (Eloquent Relationships)

### 8.1 One To One

```php
class User extends Model
{
    public function phone()
    {
        return $this->hasOne('App\Phone');                 // foreign key: user_id
        // return $this->hasOne('App\Phone', 'foreign_key');
        // return $this->hasOne('App\Phone', 'foreign_key', 'local_key');
    }
}

class Phone extends Model
{
    public function user()
    {
        return $this->belongsTo('App\User');
        // ->belongsTo('App\User', 'foreign_key', 'other_key')
    }
}

$phone = User::find(1)->phone;
$user  = Phone::find(1)->user;
```

**Default models (Null Object):**

```php
public function user()
{
    return $this->belongsTo('App\User')->withDefault();
    // ->withDefault(['name' => 'Guest Author'])
    // ->withDefault(function ($user) { $user->name = 'Guest Author'; });
}
```

### 8.2 One To Many

```php
class Post extends Model
{
    public function comments()
    {
        return $this->hasMany('App\Comment');
        // ->hasMany('App\Comment', 'foreign_key', 'local_key')
    }
}

class Comment extends Model
{
    public function post()
    {
        return $this->belongsTo('App\Post');
    }
}

$comments = App\Post::find(1)->comments;
$comment = App\Comment::find(1)->post->title;
```

### 8.3 Many To Many

```php
class User extends Model
{
    public function roles()
    {
        return $this->belongsToMany('App\Role');
        // ->belongsToMany('App\Role', 'role_user');
        // ->belongsToMany('App\Role', 'role_user', 'user_id', 'role_id');
    }
}

class Role extends Model
{
    public function users()
    {
        return $this->belongsToMany('App\User');
    }
}

$user = App\User::find(1);
foreach ($user->roles as $role) {
    echo $role->pivot->created_at;  // tabela intermediária
}
```

- `withPivot('column1', 'column2')` — expõe colunas extras do pivot.
- `withTimestamps()` — mantém `created_at`/`updated_at` do pivot.
- `as('subscription')` — renomeia o acessor `pivot` (ex.: `->subscription->created_at`).
- `wherePivot('approved', 1)` / `wherePivotIn('priority', [1, 2])` — filtra pelo pivot.

**Custom pivot model (5.5, via `using`):**

```php
class Role extends Model
{
    public function users()
    {
        return $this->belongsToMany('App\User')->using('App\UserRole');
    }
}

// O model do pivot estende Illuminate\Database\Eloquent\Relations\Pivot
namespace App;

use Illuminate\Database\Eloquent\Relations\Pivot;

class UserRole extends Pivot
{
    //
}
```

### 8.4 Has Many Through

```php
class Country extends Model
{
    public function posts()
    {
        return $this->hasManyThrough('App\Post', 'App\User');
        // ->hasManyThrough('App\Post','App\User',
        //      'country_id', // FK em users
        //      'user_id',    // FK em posts
        //      'id',         // local em countries
        //      'id');        // local em users
    }
}
```

### 8.5 Polymorphic Relations

```php
// comments: commentable_id (int), commentable_type (string/classe)

class Comment extends Model
{
    public function commentable()
    {
        return $this->morphTo();
    }
}

class Post extends Model
{
    public function comments()
    {
        return $this->morphMany('App\Comment', 'commentable');
    }
}

class Video extends Model
{
    public function comments()
    {
        return $this->morphMany('App\Comment', 'commentable');
    }
}

$post = App\Post::find(1);
foreach ($post->comments as $comment) { /* */ }

$comment = App\Comment::find(1);
$owner = $comment->commentable; // Post ou Video

// Morph map (desacoplar DB da estrutura de classes)
use Illuminate\Database\Eloquent\Relations\Relation;

Relation::morphMap([
    'posts'  => 'App\Post',
    'videos' => 'App\Video',
]);
```

### 8.6 Many To Many Polymorphic

```php
// taggables: tag_id, taggable_id, taggable_type

class Post extends Model
{
    public function tags()
    {
        return $this->morphToMany('App\Tag', 'taggable');
    }
}

class Tag extends Model
{
    public function posts()
    {
        return $this->morphedByMany('App\Post', 'taggable');
    }

    public function videos()
    {
        return $this->morphedByMany('App\Video', 'taggable');
    }
}
```

### 8.7 Querying Relationship Existence / Absence

```php
// exists
$posts = App\Post::has('comments')->get();
$posts = App\Post::has('comments', '>=', 3)->get();
$posts = App\Post::has('comments.votes')->get();     // aninhado (dot)
$posts = App\Post::whereHas('comments', function ($q) {
    $q->where('content', 'like', 'foo%');
})->get();
$posts = App\Post::orWhereHas(...)->get();

// absence
$posts = App\Post::doesntHave('comments')->get();
$posts = App\Post::whereDoesntHave('comments', function ($q) {
    $q->where('content', 'like', 'foo%');
})->get();
```

### 8.8 Counting Related Models (`withCount`)

```php
$posts = App\Post::withCount('comments')->get();
foreach ($posts as $post) {
    echo $post->comments_count;
}

// Múltiplos + constraints
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
```

### 8.9 Eager Loading (evitar N+1)

```php
// N+1 problem: 1 query p/ books + 1 por author
$books = App\Book::all();
foreach ($books as $book) { echo $book->author->name; }

// Eager loading: apenas 2 queries
$books = App\Book::with('author')->get();

// Múltiplos
$books = App\Book::with(['author', 'publisher'])->get();

// Aninhado (dot)
$books = App\Book::with('author.contacts')->get();

// Colunas específicas (sempre inclua o id)
$users = App\Book::with('author:id,name')->get();

// Constraining eager loads
$users = App\User::with(['posts' => function ($query) {
    $query->where('title', 'like', '%first%')->orderBy('created_at', 'desc');
}])->get();

// Lazy eager loading (após recuperar o model)
$books = App\Book::all();
if ($someCondition) {
    $books->load('author', 'publisher');
    $books->load(['author' => function ($query) {
        $query->orderBy('published_date', 'asc');
    }]);
}
$book->loadMissing('author'); // só se ainda não carregado
```

### 8.10 Inserindo/Atualizando Relacionamentos

```php
// save / saveMany
$comment = new App\Comment(['message' => 'A new comment.']);
$post = App\Post::find(1);
$post->comments()->save($comment);
$post->comments()->saveMany([ new App\Comment([...]), new App\Comment([...]) ]);

// create / createMany
$comment = $post->comments()->create(['message' => 'A new comment.']);
$post->comments()->createMany([ ['message' => '...'], ['message' => '...'] ]);

// belongsTo: associate / dissociate
$account = App\Account::find(10);
$user->account()->associate($account);
$user->save();
$user->account()->dissociate();
$user->save();

// Many-to-many: attach / detach / sync / toggle
$user->roles()->attach($roleId);
$user->roles()->attach($roleId, ['expires' => $expires]);
$user->roles()->detach($roleId);
$user->roles()->detach();                       // todos
$user->roles()->detach([1, 2, 3]);
$user->roles()->attach([ 1 => ['expires' => $e], 2 => ['expires' => $e] ]);
$user->roles()->sync([1, 2, 3]);               // remove os ausentes
$user->roles()->sync([1 => ['expires' => true], 2, 3]);
$user->roles()->syncWithoutDetaching([1, 2, 3]);
$user->roles()->toggle([1, 2, 3]);
$user->roles()->save($role, ['expires' => $expires]);         // pivot extra
$user->roles()->updateExistingPivot($roleId, $attributes);     // atualiza pivot
```

### 8.11 Touching Parent Timestamps

```php
class Comment extends Model
{
    protected $touches = ['post'];

    public function post()
    {
        return $this->belongsTo('App\Post');
    }
}

// ao salvar Comment, o updated_at do Post é tocado automaticamente
```

---

## 9. Mutators, Accessors, Casts e Appends

### 9.1 Accessors

```php
class User extends Model
{
    public function getFirstNameAttribute($value)
    {
        return ucfirst($value);
    }

    public function getFullNameAttribute()   // valor computado
    {
        return "{$this->first_name} {$this->last_name}";
    }
}

$user = App\User::find(1);
echo $user->first_name;
echo $user->full_name;
```

### 9.2 Mutators

```php
class User extends Model
{
    public function setFirstNameAttribute($value)
    {
        $this->attributes['first_name'] = strtolower($value);
    }
}

$user = App\User::find(1);
$user->first_name = 'Sally'; // aplica strtolower
```

### 9.3 Date Mutators (`$dates`)

`created_at` e `updated_at` viram `Carbon` automaticamente. Customize com `$dates`:

```php
class User extends Model
{
    protected $dates = ['created_at', 'updated_at', 'deleted_at'];
}

$user = App\User::find(1);
$user->deleted_at = now();  // aceita timestamp, string Y-m-d, DateTime/Carbon
$user->save();
return $user->deleted_at->getTimestamp(); // Carbon
```

> **Armadilha `$dates` vs `$casts`:** use `$dates` para datas (Carbon). Se usar `$casts` com
> `'date'`/`'datetime'` também gera Carbon, mas `$dates` é a abordagem clássica. Não liste a mesma
> coluna em ambos de formas conflitantes. Em 5.5 ambos coexistem; prefira `$casts` para tudo exceto
> soft deletes (que exigem `$dates` pela trait `SoftDeletes`).

### 9.4 Attribute Casting (`$casts`)

Tipos suportados em 5.5: `integer`, `real`, `float`, `double`, `string`, `boolean`, `object`,
`array`, `collection`, `date`, `datetime`, `timestamp`.

```php
class User extends Model
{
    protected $casts = [
        'is_admin' => 'boolean',
        'options'  => 'array',
    ];
}

$user = App\User::find(1);
if ($user->is_admin) { /* */ }   // sempre bool

// array/json casting: desserializa de JSON ao ler, serializa ao gravar
$options = $user->options;        // array PHP
$options['key'] = 'value';
$user->options = $options;        // re-serializa p/ JSON
$user->save();
```

> **Armadilha JSON:** o cast `array` funciona bem com colunas `JSON`/`TEXT` no MySQL 5.7+/PG.
> No SQLite e MySQL antigo, armazene como TEXT; o Laravel faz `json_encode`/`decode`.

### 9.5 Appends

```php
class User extends Model
{
    public function getIsAdminAttribute()
    {
        return $this->attributes['admin'] == 'yes';
    }

    protected $appends = ['is_admin']; // incluído em array/JSON
}

// em runtime:
return $user->append('is_admin')->toArray();
return $user->setAppends(['is_admin'])->toArray();
```

---

## 10. API Resources (novidade do Laravel 5.5)

Camada de transformação entre model e JSON de API. Estende `Resource` / `ResourceCollection`.

```bash
php artisan make:resource UserResource
php artisan make:resource Users --collection   # ou UserCollection
```

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\Resource;

class UserResource extends Resource
{
    public function toArray($request)
    {
        return [
            'id'         => $this->id,
            'name'       => $this->name,
            'email'      => $this->email,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

// Uso em controller/route:
use App\User;
use App\Http\Resources\UserResource;

Route::get('/user', function () {
    return new UserResource(User::find(1));
});

// Coleção "ad-hoc":
return UserResource::collection(User::all());
```

### 10.1 Resource Collections

```php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

class UserCollection extends ResourceCollection
{
    public function toArray($request)
    {
        return [
            'data'  => $this->collection,
            'links' => ['self' => 'link-value'],
        ];
    }
}

return new UserCollection(User::all());
```

### 10.2 Data Wrapping

Por padrão, o recurso mais externo é envolvido em `data`. Desabilitar:

```php
use Illuminate\Http\Resources\Json\Resource;

Resource::withoutWrapping(); // em AppServiceProvider::boot (só afeta o mais externo)
```

Paginação sempre inclui `data`, `links` e `meta` (mesmo com `withoutWrapping`).

### 10.3 Paginação em Resources

```php
Route::get('/users', function () {
    return new UserCollection(User::paginate());
});
```

### 10.4 Conditional Attributes

```php
'secret' => $this->when($this->isAdmin(), 'secret-value'),
'secret' => $this->when($this->isAdmin(), function () {
    return 'secret-value';
}),
$this->mergeWhen($this->isAdmin(), [
    'first-secret'  => 'value',
    'second-secret' => 'value',
]),
```

> `mergeWhen` não deve ser usado em arrays com chaves numéricas/não sequenciais misturadas.

### 10.5 Conditional Relationships

```php
'posts' => Post::collection($this->whenLoaded('posts')),  // evita N+1

'expires_at' => $this->whenPivotLoaded('role_users', function () {
    return $this->pivot->expires_at;
}),
```

### 10.6 Meta Data

```php
class UserCollection extends ResourceCollection
{
    public function with($request)
    {
        return ['meta' => ['key' => 'value']];
    }
}

// ou em runtime:
return (new UserCollection(User::all()->load('roles')))
    ->additional(['meta' => ['key' => 'value']]);
```

### 10.7 Resource Responses

```php
return (new UserResource(User::find(1)))
    ->response()
    ->header('X-Value', 'True');

// ou no resource:
public function withResponse($request, $response)
{
    $response->header('X-Value', 'True');
}
```

---

## 11. Serialization

```php
$user = App\User::with('roles')->first();
return $user->toArray();           // recursivo (model + relações)

$user = App\User::find(1);
return $user->toJson();            // recursivo p/ JSON
return (string) $user;             // cast chama toJson automaticamente

Route::get('users', function () {
    return App\User::all();         // convertido p/ JSON automaticamente
});
```

### 11.1 Hiding / Visible

```php
class User extends Model
{
    protected $hidden  = ['password'];          // blacklist
    protected $visible = ['first_name', 'last_name']; // whitelist
}

return $user->makeVisible('attribute')->toArray();
return $user->makeHidden('attribute')->toArray();
```

> Relacionamentos ocultos usam o **nome do método** (ex.: `'posts'`).

### 11.2 Appending (já visto em 9.5)

### 11.3 Date Serialization

```php
use Illuminate\Support\Carbon;

Carbon::serializeUsing(function ($carbon) {
    return $carbon->format('U');
}); // em AppServiceProvider::boot
```

---

## 12. Eloquent Collections

Toda consulta multi-resultado Eloquent retorna `Illuminate\Database\Eloquent\Collection`
(estende a base `Illuminate\Support\Collection`).

```php
$users = App\User::where('active', 1)->get();
foreach ($users as $user) { echo $user->name; }

$names = App\User::all()
    ->reject(fn($u) => $user->active === false)
    ->map(fn($u) => $u->name);
```

- Métodos notáveis: `filter`, `map`, `reject`, `each`, `pluck`, `groupBy`, `sortBy`, `keyBy`,
  `chunk`, `contains`, `where`, `whereIn`, `unique`, `merge`, `diff`, `slice`, `take`, `push`,
  `eachSpread`, `mapWithKeys`, `flatMap`, `partition`, `pipe`, `tap`, `when`, `unless`, etc.
- `pluck`, `keys`, `zip`, `collapse`, `flatten`, `flip` retornam base `Collection` (não Eloquent).
- **Custom collection:**

```php
class User extends Model
{
    public function newCollection(array $models = [])
    {
        return new CustomCollection($models);
    }
}
```

> **`dd`/`dump`:** existem na `Collection` (debug), **não** no Query Builder em 5.5.

---

## 13. Paginação

```php
$users = DB::table('users')->paginate(15);          // LengthAwarePaginator
$users = DB::table('users')->simplePaginate(15);    // Paginator (mais leve)

$users = App\User::paginate(15);
$users = User::where('votes', '>', 100)->simplePaginate(15);

// Manual
use Illuminate\Pagination\LengthAwarePaginator;
$paginator = new LengthAwarePaginator($items, $total, $perPage, $page);
```

### 13.1 Exibição (Blade)

```blade
<div class="container">
    @foreach ($users as $user)
        {{ $user->name }}
    @endforeach
</div>

{{ $users->links() }}
```

- `withPath('custom/url')` — customiza URI dos links.
- `appends(['sort' => 'votes'])` — anexa query string.
- `fragment('foo')` — anexa `#foo`.

### 13.2 JSON

```php
Route::get('users', function () {
    return App\User::paginate();
});
```

JSON inclui `total`, `per_page`, `current_page`, `last_page`, `from`, `to`, `data`, `links`/`meta`.

### 13.3 View customizada

```blade
{{ $paginator->links('view.name') }}
{{ $paginator->links('view.name', ['foo' => 'bar']) }}
```

```bash
php artisan vendor:publish --tag=laravel-pagination
# resources/views/vendor/pagination/default.blade.php
```

> **Bootstrap:** o HTML gerado é compatível com Bootstrap. Em 5.5 o default publicado é
> Bootstrap-compatible; para usar Bootstrap 4 basta publicar e ajustar a view (não há presenter
> "Bootstrap 4" mágico separado por padrão — edite `default.blade.php`).

### 13.4 Métodos do Paginator

`count()`, `currentPage()`, `firstItem()`, `hasMorePages()`, `lastItem()`, `lastPage()` (não em
simple), `nextPageUrl()`, `perPage()`, `previousPageUrl()`, `total()` (não em simple), `url($page)`.

> **Não existe** `cursorPaginate` no 5.5.

---

## 14. Migrations (Schema Builder)

```bash
php artisan make:migration create_users_table
php artisan make:migration create_users_table --create=users
php artisan make:migration add_votes_to_users_table --table=users
php artisan make:migration add_votes_to_users_table --path=...
```

```php
<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateFlightsTable extends Migration
{
    public function up()
    {
        Schema::create('flights', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('airline');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::drop('flights');
    }
}
```

### 14.1 Execução

```bash
php artisan migrate
php artisan migrate --force          # produção sem prompt
php artisan migrate:rollback
php artisan migrate:rollback --step=5
php artisan migrate:reset
php artisan migrate:refresh          # rollback + migrate
php artisan migrate:refresh --seed
php artisan migrate:refresh --step=5
php artisan migrate:fresh            # drop all + migrate
php artisan migrate:fresh --seed
```

### 14.2 Tabelas

```php
Schema::create('users', function (Blueprint $table) {
    $table->increments('id');
});

Schema::table('users', function (Blueprint $table) {
    $table->string('email');
});

if (Schema::hasTable('users')) { /* */ }
if (Schema::hasColumn('users', 'email')) { /* */ }

// conexão específica
Schema::connection('foo')->create('users', function (Blueprint $table) {
    $table->increments('id');
});

// opções de tabela (MySQL)
$table->engine = 'InnoDB';
$table->charset = 'utf8';
$table->collation = 'utf8_unicode_ci';
$table->temporary();

Schema::rename($from, $to);
Schema::drop('users');
Schema::dropIfExists('users');
```

> **Renomear tabela com FK:** dê nome explícito às FKs antes de renomear, senão o nome da constraint
> apontará para o nome antigo.

### 14.3 Tipos de coluna (seleção)

`increments`, `bigIncrements`, `integer`, `bigInteger`, `unsignedInteger`, `unsignedBigInteger`,
`smallInteger`, `tinyInteger`, `mediumInteger`, `boolean`, `string`, `text`, `longText`,
`mediumText`, `char`, `date`, `dateTime`, `dateTimeTz`, `time`, `timeTz`, `timestamp`,
`timestampTz`, `decimal`, `double`, `float`, `unsignedDecimal`, `enum`, `json`, `jsonb`, `binary`,
`uuid`, `ipAddress`, `macAddress`, `year`, `rememberToken`, `softDeletes`, `softDeletesTz`,
`timestamps`, `nullableTimestamps`, `morphs`, `nullableMorphs`, e tipos geométricos
(`point`, `polygon`, `lineString`, etc.), `geometryCollection`, `multiPolygon`, etc.

### 14.4 Modificadores

`->after('col')` (MySQL), `->autoIncrement()`, `->charset()`, `->collation()`, `->comment()`,
`->default($v)`, `->first()` (MySQL), `->nullable()`, `->storedAs()`, `->unsigned()`,
`->useCurrent()`, `->virtualAs()`.

```php
Schema::table('users', function (Blueprint $table) {
    $table->string('email')->nullable()->unique();
    $table->integer('votes')->unsigned()->default(0);
    $table->string('name', 100)->after('id')->comment('Nome');
});
```

### 14.5 Modificando / Renomeando colunas (requer `doctrine/dbal`)

```bash
composer require doctrine/dbal
```

```php
Schema::table('users', function (Blueprint $table) {
    $table->string('name', 50)->change();
    $table->string('name', 50)->nullable()->change();
    $table->renameColumn('from', 'to');
});
```

> Renomear coluna em tabela com `enum` não é suportado. Modificar múltiplas colunas no SQLite não é
> suportado.

### 14.6 Drop de colunas

```php
Schema::table('users', function (Blueprint $table) {
    $table->dropColumn('votes');
    $table->dropColumn(['votes', 'avatar', 'location']);
});
// aliases: dropRememberToken, dropSoftDeletes, dropTimestamps, etc.
```

### 14.7 Índices

```php
$table->string('email')->unique();
$table->unique('email');
$table->unique('email', 'unique_email');
$table->index(['account_id', 'created_at']);
$table->primary('id');
$table->primary(['id', 'parent_id']);
$table->spatialIndex('location'); // exceto SQLite
```

- Lengths / MySQL: `utf8mb4` exige `Schema::defaultStringLength(191)` em `AppServiceProvider::boot`
  para MySQL < 5.7.7 / MariaDB < 10.2.2, ou habilite `innodb_large_prefix`.
- Drop: `dropPrimary('users_id_primary')`, `dropUnique('users_email_unique')`,
  `dropIndex('geo_state_index')`, `dropSpatialIndex(...)`. Ou array: `dropIndex(['state'])`.

### 14.8 Foreign Key Constraints

```php
Schema::table('posts', function (Blueprint $table) {
    $table->integer('user_id')->unsigned();
    $table->foreign('user_id')->references('id')->on('users');
    $table->foreign('user_id')
          ->references('id')->on('users')
          ->onDelete('cascade');
});

$table->dropForeign('posts_user_id_foreign');
$table->dropForeign(['user_id']);

Schema::enableForeignKeyConstraints();
Schema::disableForeignKeyConstraints();
```

> **Armadilha InnoDB:** FKs exigem engine InnoDB (MySQL). MyISAM ignora FKs silenciosamente.

---

## 15. Seeding & Model Factories

```bash
php artisan make:seeder UsersTableSeeder
```

```php
<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        DB::table('users')->insert([
            'name'     => str_random(10),
            'email'    => str_random(10).'@gmail.com',
            'password' => bcrypt('secret'),
        ]);
    }
}
```

> **Mass assignment** é automaticamente desativado durante o seeding.

```php
// Chamar outros seeders
public function run()
{
    $this->call([
        UsersTableSeeder::class,
        PostsTableSeeder::class,
        CommentsTableSeeder::class,
    ]);
}

// Com factories
public function run()
{
    factory(App\User::class, 50)->create()->each(function ($u) {
        $u->posts()->save(factory(App\Post::class)->make());
    });
}
```

Execução:

```bash
composer dump-autoload
php artisan db:seed
php artisan db:seed --class=UsersTableSeeder
php artisan migrate:refresh --seed
```

### 15.1 Factories (5.5, com Faker)

```bash
php artisan make:factory PostFactory
php artisan make:factory PostFactory --model=Post
```

```php
use Faker\Generator as Faker;

$factory->define(App\User::class, function (Faker $faker) {
    return [
        'name'           => $faker->name,
        'email'          => $faker->unique()->safeEmail,
        'password'       => '$2y$10$...', // secret
        'remember_token' => str_random(10),
    ];
});

// States (5.5)
$factory->state(App\User::class, 'delinquent', [
    'account_status' => 'delinquent',
]);
$factory->state(App\User::class, 'address', function ($faker) {
    return ['address' => $faker->address];
});

// Relacionamento via Closure
$factory->define(App\Post::class, function ($faker) {
    return [
        'title'    => $faker->title,
        'content'  => $faker->paragraph,
        'user_id'  => function () {
            return factory(App\User::class)->create()->id;
        },
        'user_type' => function (array $post) {
            return App\User::find($post['user_id'])->type;
        },
    ];
});
```

Uso em testes/seeds:

```php
$user = factory(App\User::class)->make();          // não salva
$users = factory(App\User::class, 3)->make();
$users = factory(App\User::class, 5)->states('delinquent')->make();
$users = factory(App\User::class, 5)->states('premium', 'delinquent')->make();
$user = factory(App\User::class)->make(['name' => 'Abigail']); // override

$user = factory(App\User::class)->create();        // salva
$users = factory(App\User::class, 3)->create();
$user = factory(App\User::class)->create(['name' => 'Abigail']);

// Relacionamentos em massa
$users = factory(App\User::class, 3)
    ->create()
    ->each(function ($u) {
        $u->posts()->save(factory(App\Post::class)->make());
    });
```

---

## 16. Database Testing

```bash
php artisan make:factory PostFactory --model=Post
```

```php
// Resetar banco a cada teste (RefreshDatabase EXISTE no 5.5)
namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function testBasicExample()
    {
        $response = $this->get('/');
        // ...
    }
}
```

> **Nota 5.5:** `RefreshDatabase` já existe no 5.5. Em versões anteriores usava-se
> `DatabaseMigrations`/`DatabaseTransactions`; no 5.5 prefira `RefreshDatabase` (ótimo para
> banco em memória ou tradicional). `DatabaseMigrations` e `DatabaseTransactions` continuam
> disponíveis.

### 16.1 Assertions

```php
$this->assertDatabaseHas('users', ['email' => 'sally@example.com']);
$this->assertDatabaseMissing('users', ['email' => 'sally@example.com']);
$this->assertSoftDeleted('users', ['email' => 'sally@example.com']);
```

### 16.2 Factories em testes (ver 15.1)

`factory(App\User::class)->create()` persiste; `->make()` apenas instancia. Combine com
`assertDatabaseHas` para validar gravação.

---

## 17. Armadilhas e Notas v5.5.50

1. **N+1 queries:** sempre use `with()`/`load()` ao acessar relações em loop.
2. **Mass assignment:** defina `$fillable` ou `$guarded`; nunca passe `Request::all()` cru para
   `create()`.
3. **Raw SQL injection:** `DB::raw`, `selectRaw`, `whereRaw` injetam strings — nunca interpole
   variáveis do usuário; use bindings (`?` ou `:nome`).
4. **`$dates` vs `$casts`:** soft deletes exigem `deleted_at` em `$dates` (via trait); para outras
   datas prefira `$casts` (`date`/`datetime`). Não duplique conflitando os dois.
5. **Foreign keys e InnoDB:** FKs só funcionam em InnoDB (MySQL). MyISAM as ignora.
6. **`chunk` reindex:** ao deletar/atualizar durante `chunk`, registros podem ser pulados; use
   `chunkById`.
7. **`groupBy` + `paginate`:** ineficiente em 5.5; crie o paginador manualmente.
8. **Events em mass update/delete:** `update`/`delete` em massa NÃO disparam eventos de model
   (`saved`, `updated`, `deleting`, `deleted`).
9. **SQLite + doctrine/dbal:** necessário para `dropColumn`/`renameColumn` e modificações múltiplas
   (não suportadas de uma vez no SQLite).
10. **`utf8mb4` + MySQL antigo:** defina `Schema::defaultStringLength(191)` em
    `AppServiceProvider::boot` ou habilite `innodb_large_prefix`.
11. **Boot soft deletes:** o `SoftDeletes` adiciona global scope automaticamente; `withTrashed()`
    anula para a query.
12. **`cursor()` (5.5):** prefira para grandes volumes — única query, baixo uso de memória.
13. **API Resources (5.5):** `whenLoaded`/`whenPivotLoaded` evitam N+1 dentro de resources.
14. **`mergeWhen` em resources:** não use com chaves numéricas mistas/não sequenciais.
15. **`RefreshDatabase` (5.5):** existe; é a forma recomendada de reset em testes.
16. **Não existe em 5.5:** `upsert`, `insertOrIgnore`, `lazy`, `fromSub`, `cursorPaginate`,
    `afterCommit`, config `DB_URL`/`url`. O builder também não tem `dd`/`dump` (só a Collection).

---

## Resumo de Pontos-Chave

- Configuração em `config/database.php`: mysql/pgsql/sqlite/sqlsrv, múltiplas conexões, read/write
  com `sticky`. Sem `DB_URL` em 5.5.
- Query Builder: `select`/`distinct`/`addSelect`, `where*` completo (in, between, null, column,
  date, raw, exists, json), joins (inner/left/right/cross + closure), unions, groupBy/having,
  orderBy/skip-take, aggregates, raw methods, insert/update/delete, increment/decrement, chunk/chunkById,
  **cursor (5.5)**, paginate/simplePaginate, pluck, pessimistic locking, SQL cru via `DB::*`.
- Transações: `DB::transaction` (closure + retry em deadlock), `beginTransaction/commit/rollBack`,
  savepoints por aninhamento. Sem `afterCommit`.
- Eloquent: `$table`, `$primaryKey`, `$incrementing`, `$keyType`, `$timestamps`, `$dateFormat`,
  `CREATED_AT`/`UPDATED_AT`, `$connection`, `$fillable`/`$guarded`, `$attributes`, `$hidden`/`$visible`,
  `$appends`, `$casts`, `$dates`.
- Retrieving: `all/find/findOrFail/first/firstOrFail`, `firstOrCreate/firstOrNew/updateOrCreate`,
  `chunk/cursor`, scopes locais/globais, dynamic where, `destroy`.
- Relacionamentos: hasOne, belongsTo (+withDefault), hasMany, belongsToMany (+withPivot,
  withTimestamps, as, wherePivot, **using pivot model 5.5**), hasManyThrough, morphTo/morphMany/
  morphOne, morphToMany/morphedByMany (+morphMap), eager loading (with/load/loadMissing, constraints,
  nested), exists/absence (has/whereHas/doesntHave/whereDoesntHave), **withCount (com constraints 5.5)**,
  attach/detach/sync/syncWithoutDetaching/toggle, associate/dissociate, touches.
- Mutators/Accessors/Casts: `getXxxAttribute`/`setXxxAttribute`, `$casts` (integer/boolean/array/
  json/date/datetime/...), `$dates` (Carbon), `$appends`.
- API Resources (novo 5.5): `Resource`/`ResourceCollection`, `toArray`, `when`, `mergeWhen`,
  `whenLoaded`, `whenPivotLoaded`, `additional`, `withResponse`, `withoutWrapping`, paginação.
- Serialization: `toArray`/`toJson`/cast string, `$hidden`/`$visible`, `makeVisible`/`makeHidden`,
  `append`/`setAppends`, `Carbon::serializeUsing`.
- Pagination: `paginate`/`simplePaginate`, manual `LengthAwarePaginator`/`Paginator`, `links`,
  `withPath`/`appends`/`fragment`, views publicáveis, JSON meta. Sem `cursorPaginate`.
- Migrations: `Schema::create/table`, tipos e modificadores, índices (primary/unique/index/
  spatial/foreign com onDelete cascade), `defaultStringLength(191)`, `doctrine/dbal` para alterações.
- Seeding/Factories: `DatabaseSeeder` + `call`, `factory()->times()->create()`, states (5.5),
  closures de relacionamento.
- Soft Deletes: trait `SoftDeletes`, `withTrashed/onlyTrashed/restore/forceDelete/trashed`, global
  scope automático.
- Testing: `RefreshDatabase` (5.5), `assertDatabaseHas/Missing/SoftDeleted`, factories `make/create`
  com states e relacionamentos.

## Referências

- Documentação oficial Laravel 5.5 (arquivos locais em `/home/one/p/one/ai-guides/TMP/laravel5.5/`):
  `database.md`, `queries.md`, `migrations.md`, `eloquent.md`, `eloquent-relationships.md`,
  `eloquent-mutators.md`, `eloquent-resources.md`, `eloquent-serialization.md`,
  `eloquent-collections.md`, `seeding.md`, `pagination.md`, `database-testing.md`.
- Versão-alvo: **Laravel 5.5.50 (LTS)** — conteúdo restrito a recursos desta versão; recursos de
  versões 6/8+ deliberadamente omitidos (ver armadilhas e nota de versão no topo).
