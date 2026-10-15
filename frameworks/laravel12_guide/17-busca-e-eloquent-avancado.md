# Busca e Eloquent Avançado — Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Foco em **usar/integrar**: busca full-text e vetorial,
> Scout, collections de Eloquent, serialização JSON e URLs.

---

## 1. Busca

### 1.1 Full-text no banco (sem serviço externo)

Funciona em MariaDB, MySQL e PostgreSQL. Adicione um índice full-text e consulte:

```php
Schema::create('articles', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('body');
    $table->timestamps();
    $table->fullText(['title', 'body']);                 // composto
    // PostgreSQL: $table->fullText('body')->language('english');
});
```

```php
$articles = Article::whereFullText('body', 'web developer')->get();
$articles = Article::whereFullText(['title', 'body'], 'web developer')->get();
$articles = Article::query()->whereFullText('body', $q)->orWhereFullText('title', $q)->get();
```

- MySQL/MariaDB ordenam por relevância automaticamente; PostgreSQL filtra mas não ordena.
- Bom para busca por palavra com stemming/relevância, sem infra extra.

### 1.2 Busca semântica / vetorial (pgvector + AI SDK)

Requer PostgreSQL com `pgvector` e o Laravel AI SDK. Gere embeddings e busque por similaridade:

```php
use Illuminate\Support\Str;
use Laravel\Ai\Embeddings;

$embedding = Str::of('Napa Valley tem ótimos vinhos.')->toEmbeddings();

$response = Embeddings::for(['texto 1', 'texto 2'])->generate();
$response->embeddings;                     // [[0.12, 0.45, ...], ...]

// consulta por similaridade (vetor armazenado na coluna)
$articles = Article::whereVectorSimilarTo('embedding', $queryEmbedding)->take(10)->get();
```

Reranking (AI SDK) reordena resultados por relevância semântica após uma busca rápida.

### 1.3 Laravel Scout

Camada que mantém índices de busca sincronizados com os models.

```bash
composer require laravel/scout
php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"
```

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;

class Post extends Model
{
    use Searchable;

    public function toSearchableArray(): array
    {
        return ['id' => $this->id, 'title' => $this->title, 'body' => $this->body];
    }

    public function shouldBeSearchable(): bool
    {
        return $this->published_at !== null;
    }

    public function searchableAs(): string { return 'posts_index'; }   // 3rd-party engines
}
```

Drivers (`SCOUT_DRIVER`):

| Driver | Uso |
|---|---|
| `database` | full-text nativo (MySQL/PostgreSQL); sem indexação externa |
| `collection` | protótipos/testes; filtra em PHP (pequenos volumes) |
| `algolia` / `meilisearch` / `typesense` | externos, com features avançadas |

```php
Post::search('laravel')->get();
Post::search('laravel')->paginate(15);
Post::search('laravel')->where('user_id', 1)->get();
Post::search('laravel')->raw();               // resposta bruta do engine

# indexação
php artisan scout:import "App\Models\Post"
php artisan scout:flush "App\Models\Post"
```

Atributos de estratégia (driver `database`):
`#[SearchUsingPrefix(['id', 'email'])]` e `#[SearchUsingFullText(['bio'])]` no `toSearchableArray()`.

---

## 2. Eloquent Collections

Collections de Eloquent estendem `Collection` e adicionam métodos próprios:

```php
$posts = Post::all();

$posts->load('author');                 // eager load numa coleção existente
$posts->loadMissing('comments');
$posts->loadCount('comments');
$posts->toQuery();                      // vira Builder
$posts->find(1);
$posts->modelKeys();                    // IDs
$posts->fresh();                        // recarrega todos
$posts->contains($post);
$posts->diff($otherPosts);
$posts->intersect($otherPosts);
$posts->unique('slug');
$posts->map->only(['id', 'title']);
$posts->pluck('title', 'id');
$posts->groupBy('user_id');
$posts->each->increment('views');
```

### Collection customizada

```php
// app/Collections/PostCollection.php
namespace App\Collections;

use Illuminate\Database\Eloquent\Collection;

class PostCollection extends Collection
{
    public function published(): static
    {
        return $this->filter->isPublished();
    }
}
```

```php
use App\Collections\PostCollection;

class Post extends Model
{
    public function newCollection(array $models = []): PostCollection
    {
        return new PostCollection($models);
    }
    // ou, no 12+, o atributo #[CollectedBy(PostCollection::class)]
}
```

---

## 3. Serialização (JSON / arrays)

```php
$post->toArray();
$post->toJson();
Post::all()->toJson();
Post::paginate()->toJson();

// controle do que sai no JSON
class Post extends Model
{
    protected $hidden = ['internal_notes'];     // sempre oculto
    protected $visible = ['id', 'title'];       // whitelist (alternativa a hidden)
    protected $appends = ['excerpt'];           // accessor incluído no JSON
}

$post->makeHidden('slug');
$post->makeVisible('internal_notes');
$post->append('excerpt')->toArray();
```

- Datas são serializadas em ISO-8601 por padrão; customize com `serializeDate()`.
- Para **contratos de API**, prefira **API Resources** (`10-database.md`) a `$hidden`/`$appends`.

---

## 4. URLs e roteamento auxiliar

```php
url('/path');                                   // absoluta
url()->current(); url()->full(); url()->previous();
route('posts.show', $post);                     // nomeada
redirect()->route('home');
asset('img/logo.png');                          // public/
secure_asset('img/logo.png');
URL::signedRoute('unsubscribe', ['user' => 1]);
URL::temporarySignedRoute('x', now()->addHour(), ['user' => 1]);
$request->hasValidSignature();
URL::defaults(['locale' => 'pt']);              // parâmetros padrão
URL::forceScheme('https');                       // atrás de proxy (ver 11-proxy.md)
```

Middleware `signed` protege rotas assinadas: `->middleware('signed')`.

---

## 5. MongoDB (drivers alternativos)

O framework suporta Eloquent/query builder em MongoDB via `mongodb/laravel-mongodb`:

```bash
composer require mongodb/laravel-mongodb
```

- Configure a conexão `mongodb` em `config/database.php` e use models normalmente.
- Possui suporte a filas, autenticação de usuário e sessões conforme a documentação oficial do
  pacote. Recursos específicos do SQL (joins relacionais pesados, migrações) podem variar.

> Para a maioria dos projetos, PostgreSQL/MySQL cobrem os casos. MongoDB é útil quando o schema
> é naturalmente documental.

---

## Resumo de Pontos-Chave

- **Full-text** nativo (`whereFullText` + `$table->fullText`) dispensa serviço externo.
- **Busca vetorial** com pgvector + AI SDK (`toEmbeddings`, `whereVectorSimilarTo`) e reranking.
- **Scout** = `Searchable` + `toSearchableArray`; drivers `database` (recomendado) e externos.
- **Eloquent Collections** têm métodos próprios (`load`, `toQuery`, `find`, `modelKeys`);
  personalize com `#[CollectedBy]`.
- **Serialização**: `$hidden`/`$visible`/`$appends`; para API, use Resources.
- **URLs**: `route`, `url`, `asset`, signed routes, `URL::defaults`/`forceScheme`.
- **MongoDB** via `mongodb/laravel-mongodb` quando o modelo de dados for documental.
