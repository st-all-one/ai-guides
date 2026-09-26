# Sintaxe Correta e Tipagem no Laravel 5.5.50

Este dossiê é um guia definitivo e estrito para **Laravel 5.5.50 (LTS)** rodando em **PHP 7.0 / 7.1**. Toda a sintaxe e todos os recursos de tipagem aqui documentados foram conferidos contra o código-fonte real da versão 5.5.50 e contra as limitações do PHP 7.0/7.1. **Não há** menção a recursos de versões posteriores (Laravel 6/7/8/9/10/11/12 ou PHP 7.4+).

> **Aviso de versão (crítico):** Ao contrário de versões mais novas, o Laravel 5.5 **não** possui `Route::whereNumber()`, `Route::whereAlpha()`, `Route::whereAlphaNumeric()`, nem rotas assinadas (`signed`). O único construtor de restrição é `->where()` (e o padrão global `Route::pattern()`). Veja a seção de rotas para detalhes.

---

## 0. Contexto de Tipagem: O que o PHP 7.0/7.1 Permite (e o que NÃO permite)

Laravel 5.5 exige PHP >= 7.0. Na prática, 5.5.50 é comumente executado em **PHP 7.0 ou 7.1**. É fundamental conhecer o limite do motor de tipos para não escrever sintaxe que só funcionaria em versões futuras.

### 0.1 Disponível no PHP 7.0
- **Scalar type hints** em argumentos: `int`, `float`, `string`, `bool`, `array`, `callable`.
- **Return type declarations**: `function foo(): int`, `: string`, `: array`, `: bool`, `: void`(7.1), `: ?Tipo`(7.1), `: self`, `: parent`, `: NomeDeClasse`, `: NomeDeInterface`.
- **Type hints de classe/interface** em argumentos e retorno (sempre disponíveis desde o PHP 5, mas combináveis com escalares).
- **Coercion (conversão) de escalares** por padrão; modo estrito via `declare(strict_types=1)`.

### 0.2 Disponível no PHP 7.1 (importante para 5.5.50)
- **Nullable types** em argumentos e retorno: `?string`, `?int`, `?Tipo`, `?self`. Sintaxe `string $x = null` também funciona, mas `?string $x = null` é a forma explícita e recomendada no 7.1.
- **`void` return type**: `function handle(): void` (a função não pode retornar valor algum; `return;` sem valor é obrigatório, `return null;` é **inválido**).
- **`iterable`** pseudo-tipo (aceita `array` ou `Traversable`): `function colecao(): iterable`.
- **Visibilidade de constante de classe** (`public const`, `protected const`, `private const`).

### 0.3 NÃO disponível (proibido neste dossiê)
| Recurso | Versão que o introduziu | Por que importa |
|---|---|---|
| Arrow functions `fn () =>` | PHP 7.4 | Closures devem usar `function () {}` |
| Typed properties `public int $x;` | PHP 7.4 | Propriedades NÃO podem ter tipo no 7.1 |
| Union types `int|string` | PHP 8.0 | Return/param não pode ter múltiplos tipos |
| `mixed` | PHP 8.0 | Use DocBlock `@param mixed` |
| `object` (param/return) | PHP 7.2 | Não existe no 7.1 |
| Nullable `void` `?void` | — | `void` nunca é anulável |
| `static` return type | PHP 8.0 | Use `self` ou nome concreto |
| Rotas assinadas `signed` | Laravel 5.6+ | Ausente no 5.5 |
| `Route::whereNumber/whereAlpha/whereAlphaNumeric` | Laravel 5.6+ | Ausente no 5.5 |

---

## 1. Sintaxe de Rotas

Todas as rotas ficam em `routes/web.php` (grupo de middleware `web`) ou `routes/api.php` (grupo `api`, prefixo `/api` aplicado automaticamente pelo `RouteServiceProvider`). O arquivo de entrada carrega esses arquivos dentro de um grupo que já define o namespace base `App\Http\Controllers`.

### 1.1 Métodos básicos do router

```php
use Illuminate\Support\Facades\Route;

Route::get($uri, $callback);
Route::post($uri, $callback);
Route::put($uri, $callback);
Route::patch($uri, $callback);
Route::delete($uri, $callback);
Route::options($uri, $callback);

// Responde a múltiplos verbos:
Route::match(['get', 'post'], '/', function () {
    //
});

// Responde a TODOS os verbos HTTP:
Route::any('foo', function () {
    //
});
```

O `$callback` pode ser uma `Closure` ou uma string `"Controller@metodo"`.

### 1.2 Redirect Routes e View Routes (adicionados no Laravel 5.5)

Estes dois atalhos foram **introduzidos no Laravel 5.5** e existem na 5.5.50:

```php
// Redireciona /here -> /there com status 301 (padrão)
Route::redirect('/here', '/there', 301);

// Retorna uma view diretamente, sem controller
Route::view('/welcome', 'welcome');

// Com dados passados para a view
Route::view('/welcome', 'welcome', ['name' => 'Taylor']);
```

> No 5.5, `Route::redirect()` e `Route::view()` são atalhos válidos. Antes do 5.5 eles não existiam.

### 1.3 Parâmetros de rota

```php
// Obrigatório
Route::get('user/{id}', function ($id) {
    return 'User '.$id;
});

// Vários parâmetros (ordem importa, não o nome da variável)
Route::get('posts/{post}/comments/{comment}', function ($postId, $commentId) {
    //
});

// Opcional: o "?" na rota exige valor padrão na Closure/controller
Route::get('user/{name?}', function ($name = null) {
    return $name;
});

Route::get('user/{name?}', function ($name = 'John') {
    return $name;
});
```

Regras de parâmetros no 5.5:
- Sempre entre chaves `{}`.
- Apenas caracteres alfabéticos; **não** use `-`. Use `_`.
- A injeção nos callbacks/controllers é **por ordem posicional**, não por nome.

### 1.4 Restrições de parâmetros (Regular Expression Constraints)

No 5.5 **só existe** `->where()` (e o padrão global). **Não** existem `whereNumber`, `whereAlpha`, `whereAlphaNumeric` (esses vieram no 5.6).

```php
Route::get('user/{name}', function ($name) {
    //
})->where('name', '[A-Za-z]+');

Route::get('user/{id}', function ($id) {
    //
})->where('id', '[0-9]+');

// Múltiplos parâmetros de uma vez
Route::get('user/{id}/{name}', function ($id, $name) {
    //
})->where(['id' => '[0-9]+', 'name' => '[a-z]+']);
```

**Restrição global** (definida no `boot()` do `RouteServiceProvider`):

```php
use Illuminate\Support\Facades\Route;

public function boot()
{
    Route::pattern('id', '[0-9]+');

    parent::boot();
}

// Agora toda rota com {id} é automaticamente numérica
Route::get('user/{id}', function ($id) {
    // Só executa se {id} for numérico
});
```

### 1.5 Named Routes e geração de URL

```php
Route::get('user/profile', function () {
    //
})->name('profile');

Route::get('user/profile', 'UserController@showProfile')->name('profile');

// Gerando URL
$url = route('profile');

// Com parâmetros
Route::get('user/{id}/profile', function ($id) {
    //
})->name('profile');

$url = route('profile', ['id' => 1]);

// Redirecionando
return redirect()->route('profile');
```

Verificação em middleware de rota:

```php
public function handle($request, Closure $next)
{
    if ($request->route()->named('profile')) {
        //
    }

    return $next($request);
}
```

### 1.6 Route Groups

Atributos compartilhados são passados como array (ou encadeados) no primeiro argumento de `Route::group`.

#### Middleware
```php
Route::middleware(['first', 'second'])->group(function () {
    Route::get('/', function () {
        // usa first & second
    });
});
```

#### Namespace (forma fluente, 5.5)
```php
Route::namespace('Admin')->group(function () {
    // Controllers em App\Http\Controllers\Admin
});
```

> Por padrão o `RouteServiceProvider` já envolve os arquivos de rota num grupo com namespace `App\Http\Controllers`. Portanto você registra o controller **sem** o prefixo completo: `'UserController@show'`, e não `'App\Http\Controllers\UserController@show'`.

#### Sub-domain / Domain routing
```php
Route::domain('{account}.myapp.com')->group(function () {
    Route::get('user/{id}', function ($account, $id) {
        //
    });
});
```
Parâmetros de subdomínio são injetados **antes** dos parâmetros da URI.

#### Prefixo de URI
```php
Route::prefix('admin')->group(function () {
    Route::get('users', function () {
        // /admin/users
    });
});
```

#### Prefixo de nome
```php
Route::name('admin.')->group(function () {
    Route::get('users', function () {
        //
    })->name('users'); // nome final: "admin.users"
});
```

### 1.7 Route Model Binding

#### Implícito (type-hint do model na assinatura)
```php
use App\User;

Route::get('api/users/{user}', function (App\User $user) {
    return $user->email;
});
```
O nome da variável tipada deve bater com o segmento `{user}`. Se não encontrar, 404 automático.

Customizar a coluna de busca no model:
```php
public function getRouteKeyName(): string
{
    return 'slug';
}
```

#### Explícito (RouteServiceProvider boot)
```php
public function boot()
{
    parent::boot();

    // Liga {user} à classe App\User
    Route::model('user', App\User::class);

    // Ou lógica de resolução customizada
    Route::bind('user', function ($value) {
        return App\User::where('name', $value)->first() ?? abort(404);
    });
}
```

### 1.8 Fallback Route (5.5)

Executada quando nenhuma rota corresponde. Deve ser definida por último:

```php
Route::fallback(function () {
    return response()->view('errors.404', [], 404);
});
```

### 1.9 Rate Limiting (throttle)

O middleware `throttle` é nativo (`Illuminate\Routing\Middleware\ThrottleRequests`), registrado como `'throttle'` no `app/Http/Kernel.php`.

```php
// máximo 60 requisições por 1 minuto
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/api/users', function () {
        //
    });
});

// Por rota individual
Route::get('/api/profile', function () {
    //
})->middleware('throttle:10,1');
```

O grupo `api` já vem com `'throttle:60,1'` por padrão.

### 1.10 API Resource Routes (5.5)

Adicionados no 5.5: `apiResource`/`apiResources` excluem automaticamente as rotas `create` e `edit` (que servem templates HTML).

```php
Route::apiResource('photo', 'PhotoController');

Route::apiResources([
    'photos' => 'PhotoController',
    'posts'  => 'PostController',
]);
```

---

## 2. Controllers

### 2.1 Definição e Namespacing (regra do 5.5)

Controllers ficam em `app/Http/Controllers`. O namespace base é `App\Http\Controllers`. O `RouteServiceProvider` carrega os arquivos de rota dentro de um grupo que contém esse namespace, portanto **não** se especifica o namespace completo ao registrar a rota.

```php
<?php

namespace App\Http\Controllers;

use App\User;
use App\Http\Controllers\Controller;

class UserController extends Controller
{
    /**
     * Show the profile for the given user.
     *
     * @param  int  $id
     * @return \Illuminate\View\View
     */
    public function show($id)
    {
        return view('user.profile', ['user' => User::findOrFail($id)]);
    }
}
```

Registro:
```php
Route::get('user/{id}', 'UserController@show');
```

Controllers aninhados (ex.: `App\Http\Controllers\Photos\AdminController`):
```php
Route::get('foo', 'Photos\AdminController@method');
```

> **Armadilha 5.5:** estender o `Controller` base dá acesso a `middleware()`, `validate()`, `dispatch()`. Não é obrigatório estender, mas sem ele esses atalhos somem.

### 2.2 Single Action Controllers (`__invoke`)

```php
<?php

namespace App\Http\Controllers;

use App\User;
use App\Http\Controllers\Controller;

class ShowProfile extends Controller
{
    /**
     * @param  int  $id
     * @return \Illuminate\View\View
     */
    public function __invoke($id)
    {
        return view('user.profile', ['user' => User::findOrFail($id)]);
    }
}

// Registro (sem @metodo)
Route::get('user/{id}', 'ShowProfile');
```

### 2.3 Controller Middleware

```php
class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('log')->only('index');
        $this->middleware('subscribed')->except('store');

        // Closure inline (sem criar classe de middleware)
        $this->middleware(function ($request, $next) {
            // ...
            return $next($request);
        });
    }
}
```

### 2.4 Resource Controllers

```php
// Gera PhotoController com index/show/store/update/destroy/create/edit
php artisan make:controller PhotoController --resource

Route::resource('photos', 'PhotoController');
```

Ações geradas:

| Verbo | URI | Action | Nome |
|---|---|---|---|
| GET | `/photos` | index | photos.index |
| GET | `/photos/create` | create | photos.create |
| POST | `/photos` | store | photos.store |
| GET | `/photos/{photo}` | show | photos.show |
| GET | `/photos/{photo}/edit` | edit | photos.edit |
| PUT/PATCH | `/photos/{photo}` | update | photos.update |
| DELETE | `/photos/{photo}` | destroy | photos.destroy |

Rotas parciais e nomeadas:
```php
Route::resource('photo', 'PhotoController', ['only' => [
    'index', 'show'
]]);

Route::resource('photo', 'PhotoController', ['except' => [
    'create', 'store', 'update', 'destroy'
]]);

// Renomear ações
Route::resource('photo', 'PhotoController', ['names' => [
    'create' => 'photo.build'
]]);

// Parâmetro customizado
Route::resource('user', 'AdminUserController', ['parameters' => [
    'user' => 'admin_user'
]]);
```

Supplementar rotas **antes** do `resource`:
```php
Route::get('photos/popular', 'PhotoController@popular');
Route::resource('photos', 'PhotoController');
```

### 2.5 Dependency Injection & Controllers

#### Injeção no construtor
```php
<?php

namespace App\Http\Controllers;

use App\Repositories\UserRepository;

class UserController extends Controller
{
    protected $users;

    public function __construct(UserRepository $users)
    {
        $this->users = $users;
    }
}
```

#### Injeção no método (method / action injection)
```php
use Illuminate\Http\Request;

public function store(Request $request)
{
    $name = $request->name;
}

// Parâmetro de rota DEPOIS das dependências (ordem posicional)
Route::put('user/{id}', 'UserController@update');

public function update(Request $request, $id)
{
    //
}
```

> **Armadilha:** ao misturar type-hint (Request/Model) com parâmetros de rota, o type-hint vai **primeiro** e o parâmetro de rota **depois**, na ordem em que aparece na URI.

---

## 3. Requests (Form Request)

### 3.1 Form Request Classes

```php
php artisan make:request StoreBlogPost
```

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBlogPost extends FormRequest
{
    /**
     * Autorização.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return true; // ou: return $this->user()->can('create', Post::class);
    }

    /**
     * Regras de validação.
     *
     * @return array
     */
    public function rules(): array
    {
        return [
            'title' => 'required|unique:posts|max:255',
            'body'  => 'required',
        ];
    }

    /**
     * Mensagens customizadas.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'title.required' => 'A title is required',
            'body.required'  => 'A message is required',
        ];
    }

    /**
     * Nomes de atributos amigáveis.
     *
     * @return array
     */
    public function attributes(): array
    {
        return [
            'body' => 'message body',
        ];
    }
}
```

Uso no controller (validado antes de entrar no método):
```php
use App\Http\Requests\StoreBlogPost;

public function store(StoreBlogPost $request)
{
    $validated = $request->validated(); // array dos campos validados
    $all = $request->all();             // todos os inputs
}
```

`validated()` está presente na 5.5.50 (`Illuminate\Foundation\Http\FormRequest::validated()`).

### 3.2 Validação direta no controller (base `ValidatesRequests`)

```php
use Illuminate\Http\Request;

public function store(Request $request)
{
    $validatedData = $request->validate([
        'title' => 'required|unique:posts|max:255',
        'body'  => 'required',
    ]);

    // Campo opcional que pode ser null:
    $request->validate([
        'publish_at' => 'nullable|date',
    ]);
}
```

> **Armadilha:** como `TrimStrings` e `ConvertEmptyStringsToNull` rodam globalmente, campos opcionais que podem vir vazios devem receber a regra `nullable`, senão o `null` é rejeitado.

### 3.3 Validator manual

```php
use Validator;

$validator = Validator::make($request->all(), [
    'title' => 'required|unique:posts|max:255',
    'body'  => 'required',
]);

if ($validator->fails()) {
    return redirect('post/create')
        ->withErrors($validator)
        ->withInput();
}

// Ou aproveitar o redirecionamento automático:
Validator::make($request->all(), $rules)->validate();
```

---

## 4. Responses

### 4.1 Respostas básicas
```php
// String vira Response automaticamente
Route::get('/', function () {
    return 'Hello World';
});

// Array vira JSON automaticamente
Route::get('/', function () {
    return [1, 2, 3];
});

// Response explícita (status + headers)
return response('Hello World', 200)
    ->header('Content-Type', 'text/plain');

// Múltiplos headers
return response($content)
    ->withHeaders([
        'Content-Type' => $type,
        'X-Header-One' => 'Valor',
    ]);
```

### 4.2 JSON
```php
return response()->json([
    'name' => 'Abigail',
    'state' => 'CA',
]);

// JSONP
return response()
    ->json(['name' => 'Abigail', 'state' => 'CA'])
    ->withCallback($request->input('callback'));
```

### 4.3 Redirects
```php
return redirect('home/dashboard');
return back()->withInput();
return redirect()->route('login');
return redirect()->route('profile', ['id' => 1]);
return redirect()->action('UserController@profile', ['id' => 1]);
return redirect()->away('https://www.google.com');
return redirect('dashboard')->with('status', 'Profile updated!');
```

### 4.4 View, Download e File
```php
return response()
    ->view('hello', $data, 200)
    ->header('Content-Type', $type);

return response()->download($pathToFile);
return response()->download($pathToFile, $name, $headers);
return response()->download($pathToFile)->deleteFileAfterSend(true);

return response()->file($pathToFile);
return response()->file($pathToFile, $headers);
```

### 4.5 Response Macros
```php
namespace App\Providers;

use Illuminate\Support\Facades\Response;
use Illuminate\Support\ServiceProvider;

class ResponseMacroServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Response::macro('caps', function ($value) {
            return Response::make(strtoupper($value));
        });
    }

    public function register(): void
    {
        //
    }
}

// Uso
return response()->caps('foo');
```

---

## 5. Middleware

### 5.1 Definição
```php
<?php

namespace App\Http\Middleware;

use Closure;

class CheckAge
{
    /**
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if ($request->age <= 200) {
            return redirect('home');
        }

        return $next($request);
    }
}
```

Formas de execução:
```php
// Before
public function handle($request, Closure $next)
{
    // ação antes
    return $next($request);
}

// After
public function handle($request, Closure $next)
{
    $response = $next($request);
    // ação depois
    return $response;
}
```

### 5.2 Registro (`app/Http/Kernel.php`)
```php
protected $middleware = [
    // global (toda requisição)
];

protected $routeMiddleware = [
    'auth'       => \Illuminate\Auth\Middleware\Authenticate::class,
    'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
    'bindings'   => \Illuminate\Routing\Middleware\SubstituteBindings::class,
    'can'        => \Illuminate\Auth\Middleware\Authorize::class,
    'guest'      => \App\Http\Middleware\RedirectIfAuthenticated::class,
    'throttle'   => \Illuminate\Routing\Middleware\ThrottleRequests::class,
];

protected $middlewareGroups = [
    'web' => [
        \App\Http\Middleware\EncryptCookies::class,
        \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        \App\Http\Middleware\VerifyCsrfToken::class,
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ],
    'api' => [
        'throttle:60,1',
        'auth:api',
    ],
];
```

Uso em rotas:
```php
Route::get('admin/profile', function () {
    //
})->middleware('auth');

Route::get('/', function () {
    //
})->middleware('first', 'second');

use App\Http\Middleware\CheckAge;
Route::get('admin/profile', function () {
    //
})->middleware(CheckAge::class);
```

### 5.3 Parâmetros de middleware
```php
public function handle($request, Closure $next, string $role)
{
    if (! $request->user()->hasRole($role)) {
        // ...
    }

    return $next($request);
}

// Rota
Route::put('post/{id}', function ($id) {
    //
})->middleware('role:editor');
```

### 5.4 Terminable Middleware
```php
public function handle($request, Closure $next)
{
    return $next($request);
}

public function terminate($request, $response): void
{
    // executado APÓS a resposta ser enviada
}

// Registrar como singleton no container se quiser a MESMA instância
// em handle() e terminate():
app()->singleton(CheckAge::class);
```

---

## 6. Tipagem: Aplicação Correta no Laravel 5.5.50

Esta é a seção central. O objetivo é tipar ao máximo respeitando o PHP 7.0/7.1.

### 6.1 Scalar type hints em argumentos

Válido no 5.5 (PHP 7.0+):
```php
public function atualizar(int $id, string $nome, float $preco, bool $ativo, array $tags): void
{
    //
}

public function processar(callable $callback): void
{
    $callback();
}
```

### 6.2 Return type declarations

```php
public function total(): int
{
    return 42;
}

public function nome(): string
{
    return 'Taylor';
}

public function itens(): array
{
    return [1, 2, 3];
}

public function repositorio(): UserRepository
{
    return $this->users;
}

public function colecao(): iterable
{
    return collect([1, 2, 3]);
}
```

**Regra crítica para controllers:** Como o Laravel converte automaticamente `string`, `array`, `View`, `RedirectResponse` etc. em `Response`, **não se pode declarar um union type** (proibido no PHP 7.1). Opções:

1. **Omitir o return type** (mais comum e seguro no 5.5).
2. Declarar `: \Illuminate\Http\Response` apenas se o método **sempre** retornar uma instância de `Response` explícita.
3. Usar **DocBlock** `@return` para documentar os múltiplos tipos possíveis.

```php
/**
 * @param  \Illuminate\Http\Request  $request
 * @return \Illuminate\Http\RedirectResponse
 */
public function store(Request $request)
{
    // retorna RedirectResponse => return type seguro:
    return redirect()->route('posts.index');
}

/**
 * @param  \Illuminate\Http\Request  $request
 * @return \Illuminate\View\View|\Illuminate\Http\RedirectResponse
 */
public function edit(Request $request, int $id)
{
    // retorna View OU RedirectResponse => sem union type, use DocBlock
}
```

### 6.3 Nullable types (PHP 7.1) — `?Tipo` e `?string`

```php
// Argumento que aceita string OU null
public function setEmail(?string $email): void
{
    $this->email = $email;
}

// Retorno que pode ser null
public function findUser(int $id): ?User
{
    return User::find($id); // null se não achar
}
```

Equivalente (válido no 7.0 também, mas menos explícito):
```php
public function setEmail(string $email = null)
{
    //
}
```

> **Armadilha:** se um parâmetro de rota opcional `{name?}` não recebe `?Tipo` nem valor padrão, ocorre erro de type mismatch quando a URI não traz o segmento. Sempre combine `{param?}` com `?Tipo $param = null` **ou** `$param = 'default'`.

```php
// Correto para rota user/{name?}
Route::get('user/{name?}', function (?string $name = null) {
    return $name ?? 'guest';
});
```

### 6.4 `void` (PHP 7.1)

```php
public function __construct(UserRepository $users)
{
    $this->users = $users;
}

public function terminate($request, $response): void
{
    // NÃO pode retornar nada; use "return;" ou omita o return
}
```

Restrições:
- `void` **não** pode ser anulável (`?void` é inválido).
- `return null;` dentro de `: void` é **erro** de compilação.

### 6.5 Type-hint de dependências via Service Container

O container do Laravel resolve automaticamente qualquer tipo (classe concreta, interface, contract). Basta tipar:

```php
use Illuminate\Http\Request;
use App\Contracts\PaymentGateway;

class CheckoutController extends Controller
{
    public function __construct(PaymentGateway $gateway)
    {
        $this->gateway = $gateway;
    }

    public function pay(Request $request, PaymentGateway $gateway)
    {
        // $gateway resolvido pelo container
    }
}
```

Para vincular uma interface a uma implementação (em um service provider):
```php
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            \App\Contracts\PaymentGateway::class,
            \App\Services\StripeGateway::class
        );

        // singleton (instância única)
        $this->app->singleton(\App\Repositories\UserRepository::class);
    }

    public function boot(): void
    {
        //
    }
}
```

### 6.6 DocBlocks quando o tipo do PHP é insuficiente

O PHP 7.1 não suporta union types, generics, ou `Collection<Model>`. Use DocBlocks:

```php
/**
 * @param  \Illuminate\Http\Request  $request
 * @param  int  $id
 * @return \App\User|null
 */
public function show(Request $request, int $id): ?User
{
    return User::find($id);
}

/**
 * @return \Illuminate\Database\Eloquent\Collection|\App\Post[]
 */
public function recent(): iterable
{
    return Post::latest()->take(10)->get();
}
```

### 6.7 Typed exceptions

**Não existe** "typed exception" em nenhuma versão do PHP (exceções são sempre objetos de uma classe que estende `Throwable`). No 5.5 você simplesmente lança e tipa o catch:

```php
use App\Exceptions\CustomException;

try {
    //
} catch (CustomException $e) {
    //
}
```

Não há sintaxe de tipo para a cláusula `throw` (isso veio no PHP 8.0 e não se aplica aqui).

### 6.8 Armadilhas de tipagem no 5.5.50

1. **`declare(strict_types=1)` é por arquivo.** Se um controller usa strict e recebe um `int` vindo de route param que vem como `string` ("42"), ocorre `TypeError`. Em ambientes Laravel, geralmente usa-se o modo coercivo (padrão) para evitar falhas com dados de rota/request que chegam como string.
2. **Parâmetro de rota opcional sem `?` ou default** → erro. Combine `{id?}` com `?int $id = null`.
3. **Conflito de route model binding:** se o nome da variável tipada não bater com o segmento `{user}`, o binding implícito não acontece e você recebe o ID como string. O nome deve ser idêntico ao do segmento.
4. **Namespace de controller no 5.5:** registrar `'App\Http\Controllers\UserController@show'` (FQCN completo) funciona, mas a convenção (e o grupo do `RouteServiceProvider`) já aplica `App\Http\Controllers`, então use apenas `'UserController@show'`. Usar FQCN dentro de string funciona, mas misturar com o grupo de namespace pode gerar duplo prefixo se usado em `Route::namespace()` aninhado.
5. **`validated()` vs `all()`:** `validated()` retorna apenas campos validados (5.5.50 suporta); `all()` retorna todos os inputs.
6. **Return type em controller com múltiplos retornos:** declarar `: Response` e depois retornar `redirect()` (que é `RedirectResponse`, subtipo aceito) funciona por covariância? `RedirectResponse` estende `Response`? Não exatamente — `RedirectResponse` estende `Response` sim (`Illuminate\Http\RedirectResponse extends Illuminate\Http\Response`). Mas retornar `view(...)` retorna `View`, que **não** estende `Response`, causando `TypeError`. Portanto evite `: Response` quando houver `return view(...)`.
7. **`void` em `handle()` de middleware?** O `handle` deve retornar `$next($request)` (um `Response`), logo **não** use `: void` no `handle`. Use `: void` apenas em `terminate` (que não retorna nada útil) e em métodos auxiliares.

---

## 7. Exemplos Reais Bem Tipados (5.5.50 / PHP 7.1)

### 7.1 Controller totalmente tipado
```php
<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Repositories\UserRepository;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class UserController extends Controller
{
    /** @var UserRepository */
    protected $users;

    public function __construct(UserRepository $users)
    {
        $this->users = $users;
    }

    /**
     * @return \Illuminate\View\View
     */
    public function index(): View
    {
        return view('users.index', [
            'users' => $this->users->paginate(15),
        ]);
    }

    /**
     * @param  int  $id
     * @return \Illuminate\View\View
     */
    public function show(int $id): View
    {
        return view('users.show', [
            'user' => $this->users->findOrFail($id),
        ]);
    }

    /**
     * @param  \App\Http\Requests\StoreUserRequest  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        $this->users->create($request->validated());

        return redirect()
            ->route('users.index')
            ->with('status', 'Usuário criado!');
    }

    /**
     * @param  \App\Http\Requests\StoreUserRequest  $request
     * @param  int  $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(StoreUserRequest $request, int $id): RedirectResponse
    {
        $this->users->update($id, $request->validated());

        return redirect()->route('users.show', ['id' => $id]);
    }
}
```

### 7.2 Form Request tipado
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\User::class);
    }

    public function rules(): array
    {
        return [
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users',
            'password' => 'required|string|min:6',
            'age'      => 'nullable|integer|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'Este e-mail já está cadastrado.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nome',
            'age'  => 'idade',
        ];
    }
}
```

### 7.3 Service tipado (injeção no container)
```php
<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\User;

class CheckoutService
{
    /** @var PaymentGateway */
    protected $gateway;

    public function __construct(PaymentGateway $gateway)
    {
        $this->gateway = $gateway;
    }

    /**
     * @param  \App\User  $user
     * @param  array  $items
     * @return string  ID da transação
     */
    public function checkout(User $user, array $items): string
    {
        return $this->gateway->charge($user, $items);
    }

    /**
     * @param  int  $userId
     * @return \App\User|null
     */
    public function find(int $userId): ?User
    {
        return User::find($userId);
    }
}
```

### 7.4 Job tipado (fila)
```php
<?php

namespace App\Jobs;

use App\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var User */
    protected $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function handle(): void
    {
        // envia e-mail; não retorna valor
        mail($this->user->email, 'Bem-vindo', '...');
    }
}
```

### 7.5 Middleware tipado
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  $role
     * @return mixed
     */
    public function handle(Request $request, Closure $next, string $role)
    {
        if (! $request->user()->hasRole($role)) {
            return redirect('home');
        }

        return $next($request);
    }

    public function terminate(Request $request, $response): void
    {
        // pós-resposta
    }
}
```

### 7.6 Rota com binding implícito + constraint global tipada
```php
// RouteServiceProvider boot:
public function boot(): void
{
    Route::pattern('id', '[0-9]+');

    parent::boot();
}

// routes/web.php
Route::get('users/{user}', function (App\User $user): Illuminate\View\View {
    return view('users.show', compact('user'));
})->name('users.show');
```

---

## 8. Notas Específicas da Versão 5.5.50

- **Adicionado no 5.5:** `Route::redirect()`, `Route::view()`, `Route::fallback()`, `Route::apiResource()` / `Route::apiResources()`.
- **Ausente no 5.5:** `Route::whereNumber()`, `Route::whereAlpha()`, `Route::whereAlphaNumeric()`, rotas assinadas (`signed`), `Route::middleware(['throttle'])` de forma "macro" além do padrão.
- **PHP:** use `?Tipo` e `void` (PHP 7.1). Se o servidor rodar PHP 7.0, `?Tipo` e `void` **não** compilam — nesse caso use valores padrão (`= null`) e omita `void`.
- **RouteServiceProvider** aplica `$namespace = 'App\Http\Controllers'` automaticamente; registre controllers pelo nome relativo.
- **`validated()`** disponível em `FormRequest` desde o 5.5.
- **`iterable`** disponível (PHP 7.1) para retornos de coleções.

---

## Resumo de Pontos-Chave

1. **Rotas:** use `get/post/put/patch/delete/options`, `match`, `any`; `redirect`/`view`/`fallback`/`apiResource` são do 5.5; constraints **só** via `where()` e `pattern()` (sem `whereNumber` etc.).
2. **Route Model Binding:** implícito exige nome de variável tipada igual ao segmento `{user}`; explícito via `Route::model()` / `Route::bind()` no `boot()` do `RouteServiceProvider`.
3. **Controllers:** estendem `Controller`; namespace relativo em rotas; `__invoke` para single action; DI no construtor e no método (Request/Model primeiro, parâmetro de rota depois).
4. **Form Request:** `rules(): array`, `authorize(): bool`, `messages(): array`, `attributes(): array`, `validated(): array`. Campo opcional que recebe null precisa de regra `nullable`.
5. **Responses:** `response()->json/download/file/view`, `redirect()`, `response()->macro()`.
6. **Middleware:** `handle($request, Closure $next)` retorna `$next($request)`; `terminate($request, $response): void`; parâmetros após `$next`.
7. **Tipagem PHP 7.0/7.1:** scalar hints (`int/string/float/bool/array/callable`), return types, `?Tipo` e `void` (7.1), `iterable` (7.1). **Não** use arrow functions, typed properties, union types, `mixed` (versões futuras).
8. **Armadilhas principais:** parâmetro opcional `{x?}` sem `?Tipo`/`default`; `void` não pode retornar valor; `: Response` incompatível com `return view()`; `strict_types` por arquivo; conflito de nome em binding implícito; namespace completo desnecessário em rotas.
9. **DocBlocks** são a forma correta de documentar union types / coleções tipadas (já que union types não existem no 7.1).

---

## Referências

- Documentação oficial Laravel 5.5 (arquivos locais em `/home/one/p/one/ai-guides/TMP/laravel5.5/`):
  - `routing.md` — rotas, grupos, parâmetros, binding, fallback.
  - `controllers.md` — definição, namespace, `__invoke`, resource, DI.
  - `requests.md` — acesso ao `Request`, input, uploads.
  - `responses.md` — respostas, redirects, JSON, macros.
  - `lifecycle.md` — ciclo de vida, kernels, service providers.
  - `middleware.md` — `handle`, grupos, parâmetros, terminable.
  - `validation.md` — Form Request, `validated()`, regras.
- Código-fonte real **Laravel 5.5.50** (`vendor/laravel/framework`):
  - `Illuminate/Routing/Router.php` — confirma `fallback`, `redirect`, `view`, `match`, `any`, `pattern`, `apiResource`, ausência de `whereNumber`.
  - `Illuminate/Routing/Route.php` — confirma `where()` como único construtor de regex.
  - `Illuminate/Foundation/Http/FormRequest.php` — confirma `validated()` na 5.5.50.
  - `Illuminate/Routing/Middleware/ThrottleRequests.php` — middleware `throttle`.
  - `Illuminate/Foundation/Application.php` — `const VERSION = '5.5.50'`.
- Limites do motor de tipos: PHP 7.0 (scalar hints, return types) e PHP 7.1 (nullable `?Tipo`, `void`, `iterable`). Recursos de PHP 7.2+ / 8.0+ explicitamente excluídos deste dossiê.
