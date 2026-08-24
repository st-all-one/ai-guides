# Boas-práticas no Laravel 5.5.50

> Documento de referência (dossiê) sobre o uso efetivo e as convenções recomendadas do Laravel **5.5.50** (versão LTS). Todo o conteúdo baseia-se exclusivamente na documentação oficial da série 5.5 e em comportamentos estáveis dessa versão. Não são abordados recursos introduzidos em versões posteriores (ex.: `custom` casts no Eloquent, `RateLimiter` façade, `Invokable` policies automáticas, componentes Blade, etc.).

---

## 1. Filosofia e princípios gerais

O Laravel 5.5 adota convenções fortes porém não restritivas. O framework impõe quase nenhuma restrição sobre **onde** uma classe deve ficar, desde que o Composer consiga autoloadá-la via PSR-4 (structure.md). O objetivo das boas-práticas é, portanto, **organizar a complexidade**, não obedecer a regras arbitrárias do framework.

Princípios norteadores aplicados ao Laravel:

- **Separação de responsabilidades (SRP):** controllers magros, models/model-related logic encorporados (fat models), e todo o resto delegado a serviços, eventos, jobs e policies.
- **Desacoplamento:** depender de *Contracts* (interfaces) em vez de implementações concretas sempre que fizer sentido para testabilidade e troca de implementação (contracts.md).
- **Convenção sobre configuração:** usar os recursos nativos (Form Requests, Resource Controllers, API Resources, Service Providers, Policies) em vez de reinventá-los.
- **Segurança por padrão:** escapar saída, proteger CSRF, usar mass assignment controlado e autorização explícita.
- **Testabilidade:** escrever código que pode ser exercitado por PHPUnit sem o framework inteiro (DI + Contracts).

---

## 2. Organização de código (arquitetura em camadas)

### 2.1 Diretórios e localização de classes

O diretório `app/` é autoloadado via PSR-4 sob o namespace `App` (structure.md). A estrutura padrão separa dois "pontos de entrada" em `app/`:

- `app/Http` — controllers, middleware e **form requests** (a "API HTTP" da aplicação).
- `app/Console` — comandos Artisan e o console kernel.

Ambos são mecanismos de entrada (HTTP e CLI), **não contêm lógica de negócio**. O núcleo da aplicação vive em classes próprias.

Diretórios gerados sob demanda por `make:*`:

| Diretório | Conteúdo | Gerado por |
|---|---|---|
| `app/Events` | Eventos | `event:generate`, `make:event` |
| `app/Listeners` | Ouvintes de eventos | `event:generate`, `make:listener` |
| `app/Jobs` | Jobs (queueáveis ou síncronos) | `make:job` |
| `app/Mail` | Classes de e-mail (Mailable) | `make:mail` |
| `app/Notifications` | Notifications | `make:notification` |
| `app/Policies` | Policies de autorização | `make:policy` |
| `app/Providers` | Service providers | `make:provider` |
| `app/Rules` | Regras de validação customizadas | `make:rule` |
| `app/Http/Requests` | Form Requests | `make:request` |
| `app/Http/Resources` | API Resources | `make:resource` |

> **Não existe diretório `app/Models` por padrão.** Os models Eloquent ficam direto em `app/` (ex.: `App\User`). Isso é intencional — o termo "model" é ambíguo. Você pode criar `app/Models` se preferir, bastando ajustar o namespace e o autoload PSR-4 (structure.md).

### 2.2 Fat models / thin controllers

O controller **não** deve conter regras de negócio, consultas espalhadas, ou orquestração de efeitos colaterais. Ele coordena: recebe a requisição (já validada), chama serviços/modelos, e retorna uma resposta.

**Antipadrão (controller gordo):**

```php
<?php

namespace App\Http\Controllers;

use App\User;
use Illuminate\Support\Facades\Mail;
use App\Http\Controllers\Controller;

class UserController extends Controller
{
    public function store()
    {
        // lógica de negócio dentro do controller
        request()->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users',
        ]);

        $user = new User();
        $user->name = request('name');
        $user->email = request('email');
        $user->password = bcrypt(request('password'));
        $user->save();

        // efeito colateral acoplado
        Mail::to($user->email)->send(new \App\Mail\Welcome($user));

        return redirect('/users');
    }
}
```

**Padrão (controller magro + responsabilidades separadas):**

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Services\UserService;
use Illuminate\Http\RedirectResponse;

class UserController extends Controller
{
    protected $users;

    public function __construct(UserService $users)
    {
        $this->users = $users;
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $user = $this->users->create($request->validated());

        return redirect()->route('users.show', $user);
    }
}
```

Aqui, `StoreUserRequest` cuida de validação + autorização; `UserService` cuida da criação; o e-mail de boas-vindas é disparado por um evento/listener (ver 2.6).

### 2.3 Onde colocar serviços e repositórios

- **Serviços (`app/Services`):** classes que encapsulam regras de negócio que não pertencem naturalmente a um model ou a um evento. Ex.: `App\Services\UserService`, `App\Services\PaymentService`. Não existem por padrão — crie livremente sob PSR-4.
- **Repositórios (opcional):** o Laravel 5.5 **não** inclui uma camada de repositório nativa. Eles são opcionais e recomendados apenas quando há necessidade real de trocar a fonte de dados (ex.: Eloquent ↔ Doctrine) ou de isolar queries complexas. Quando usados, devem depender de **Contracts** (ver contracts.md) e não de implementações concretas de cache/banco, para manter baixo acoplamento.

```php
<?php

namespace App\Repositories;

use Illuminate\Contracts\Cache\Repository as Cache;
use App\User;

class UserRepository
{
    protected $cache;

    // Depende da interface (Contract), não de uma implementação de vendor
    public function __construct(Cache $cache)
    {
        $this->cache = $cache;
    }

    public function find($id)
    {
        return $this->cache->remember("user.{$id}", 60, function () use ($id) {
            return User::findOrFail($id);
        });
    }
}
```

> **Armadilha:** criar repositórios que apenas fazem `User::find($id)` é redundante — adiciona camadas sem valor. Use repositórios para lógica de consulta não-trivial ou para abstração de fonte de dados.

### 2.4 Form Requests para validação centralizada

A validação **não** deve estar espalhada nos controllers (requests.md / validation.md). Use **Form Requests** (`app/Http/Requests`) gerados por `php artisan make:request StoreBlogPost`.

O Form Request concentra:
- as regras (`rules()`),
- a autorização (`authorize()`),
- as mensagens customizadas (`messages()`),
- hooks `withValidator()` para validação extra.

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Post;

class StoreBlogPost extends FormRequest
{
    public function authorize()
    {
        // ex.: apenas usuários com permissão podem criar posts
        return $this->user()->can('create', Post::class);
    }

    public function rules()
    {
        return [
            'title' => 'required|unique:posts|max:255',
            'body'  => 'required',
        ];
    }

    public function messages()
    {
        return [
            'title.required' => 'Um título é obrigatório.',
            'body.required'  => 'O corpo do post é obrigatório.',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->somethingElseIsInvalid()) {
                $validator->errors()->add('field', 'Algo está errado com este campo!');
            }
        });
    }
}
```

No controller, basta tipar o Form Request — a validação ocorre **antes** do método executar, e os dados validados ficam em `$request->validated()`.

```php
public function store(StoreBlogPost $request)
{
    // a requisição JÁ está validada e autorizada
    $post = Post::create($request->validated());
}
```

### 2.5 Policies para autorização

Autorização de ações sobre um recurso/model pertence a **Policies**, não a Gates soltos (exceto ações sem modelo, como "ver dashboard admin", que usam Gates). Policies ficam em `app/Policies` e são geradas por `php artisan make:policy PostPolicy --model=Post` (authorization.md).

```php
<?php

namespace App\Policies;

use App\User;
use App\Post;
use Illuminate\Auth\Access\HandlesAuthorization;

class PostPolicy
{
    use HandlesAuthorization;

    public function view(User $user, Post $post)
    {
        return true;
    }

    public function update(User $user, Post $post)
    {
        return $user->id === $post->user_id;
    }

    public function delete(User $user, Post $post)
    {
        return $user->id === $post->user_id;
    }
}
```

No controller, a autorização é feita com `authorize()` (helpers do base controller) ou diretamente no Form Request (`authorize()`). Em 5.5.x, o helper `authorizeResource` também está disponível para vincular automaticamente os métodos do resource controller às policies:

```php
use App\Post;

class PostController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Post::class, 'post');
    }
}
```

### 2.6 Listeners / Jobs para side-effects

Efeitos colaterais (envio de e-mail, notificações, integrações externas) **não** devem estar acoplados ao fluxo principal do controller. Use:

- **Events + Listeners** (`app/Events`, `app/Listeners`): para reações desacopladas a um fato ocorrido (ex.: `UserRegistered` → `SendWelcomeEmail`).
- **Jobs** (`app/Jobs`): para trabalho demorado ou queueável (processamento, e-mails em fila).
- **Notifications** (`app/Notifications`): para notificar por múltiplos canais.

```php
// No serviço / controller, dispara o evento
event(new \App\Events\UserRegistered($user));

// O listener (desacoplado) cuida do e-mail
class SendWelcomeEmail
{
    public function handle(\App\Events\UserRegistered $event)
    {
        \Mail::to($event->user->email)->send(new \App\Mail\Welcome($event->user));
    }
}
```

> Isso mantém o controller testável e a lógica de e-mail isolada (pode ser mockada/em fila).

---

## 3. Convenções de nomenclatura e PSR-4

- **PSR-4** é o padrão de autoload do `app/` (structure.md). Mantenha namespaces espelhando o caminho do diretório.
- **Controllers:** sufixo `Controller` (ex.: `App\Http\Controllers\PhotoController`), em `app/Http/Controllers`. Ao aninhar pastas (ex.: `app/Http/Controllers/Admin`), registre a rota com o namespace relativo: `Route::get('foo', 'Admin\DashboardController@index')` (controllers.md).
- **Models:** singular, PascalCase (`App\User`, `App\BlogPost`).
- **Form Requests:** nomes que descrevem a intenção (`StoreUserRequest`, `UpdatePostRequest`), em `App\Http\Requests`.
- **Policies:** `<Model>Policy` (`App\Policies\PostPolicy`).
- **Rules customizadas:** em `App\Rules`, implementando `Illuminate\Contracts\Validation\Rule`.
- **Resources:** `<Model>Resource` / `<Model>Collection` em `App\Http\Resources`.
- **Jobs:** em `App\Jobs`; convenção de nome descritivo (`SendWelcomeEmail`).
- **Testes:** classes com sufixo `Test` (testing.md), em `tests/Feature` e `tests/Unit`.

> **Regra de ouro do namespace em rotas:** como o `RouteServiceProvider` carrega os route files dentro de um grupo com o namespace `App\Http\Controllers`, registre controllers **sem** o prefixo completo — apenas a parte após `App\Http\Controllers` (controllers.md/routing.md).

---

## 4. Contracts vs Facades (desacoplamento e testabilidade)

Laravel oferece duas formas de usar serviços: **Facades** (static proxy) e **Contracts** (interfaces). Para a maioria das aplicações, ambos servem (contracts.md). Porém:

- **Contracts** tornam as dependências **explícitas** no construtor, facilitando leitura e testes unitários (basta injetar um mock da interface).
- **Facades** são convenientes, mas usam static proxy; para mockar em testes usa-se `Facade::shouldReceive(...)` (mocking.md), o que acopla o teste à implementação estática.

**Exemplo de acoplamento (Contracts):**

```php
<?php

namespace App\Orders;

use Illuminate\Contracts\Cache\Repository as Cache;

class Repository
{
    protected $cache;

    // dependência explícita e vendor-agnóstica
    public function __construct(Cache $cache)
    {
        $this->cache = $cache;
    }
}
```

Comparado ao antipadrão de depender de uma classe concreta de vendor (ex.: `SomePackage\Cache\Memcached`), que torna a troca de implementação (Memcached → Redis) custosa (contracts.md).

> **Recomendação:** em aplicações "de produto" (app), facades são aceitáveis e produtivas. Em **pacotes** (packages) destinados a terceiros, prefira **Contracts** — são mais fáceis de testar e de substituir (contracts.md, dica).

---

## 5. Validação, autorização e rotas

### 5.1 Validação centralizada

- Sempre que a validação for não-trivial, use **Form Requests** (seção 2.4).
- Para regras simples inline, pode-se usar `$request->validate([...])` (validation.md). Lembre-se do modificador `bail` para parar na primeira falha e `nullable` para campos opcionais (por causa do middleware `ConvertEmptyStringsToNull`).
- Validação de arrays: use "dot notation" (`person.*.email`).
- Regras condicionais: `sometimes`, `required_if`, `required_with`, etc.; ou `$validator->sometimes(...)` para lógicas complexas.
- Regras customizadas: prefira **Rule objects** (`php artisan make:rule Uppercase`, em `app/Rules`, implementando `Illuminate\Contracts\Validation\Rule`) para lógica complexa reutilizável; ou `Validator::extend()` num service provider para regras simples.

```php
<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class Uppercase implements Rule
{
    public function passes($attribute, $value)
    {
        return strtoupper($value) === $value;
    }

    public function message()
    {
        return 'O :attribute deve estar em maiúsculas.';
    }
}
```

### 5.2 Autorização no controller (não nas rotas)

A autorização pertence ao **controller / Form Request / Policy**, não ao arquivo de rotas. Use `authorize()` no Form Request ou `$this->authorize('update', $post)` no controller (authorization.md). O `authorize()` do Form Request retorna `false` → resposta HTTP 403 automática, e o método do controller nem executa (validation.md).

### 5.3 Não colocar lógica de negócio em rotas

Rotas (`routes/web.php`, `routes/api.php`) devem apenas **mapear URI → controller** (ou retornar views/redirects muito simples via `Route::view`/`Route::redirect`). Nunca coloque queries, regras de negócio ou validação dentro de Closures de rota — prejudica testabilidade e rota cache.

```php
// Ruim: lógica na rota
Route::get('/dashboard', function () {
    $users = \App\User::where('active', 1)->orderBy('name')->get();
    return view('dashboard', compact('users'));
});

// Bom: delega ao controller
Route::get('/dashboard', 'DashboardController@index');
```

> **Rota cache:** rotas baseadas em Closures **não** podem ser cacheadas. Para usar `php artisan route:cache`, converta todas as rotas para controllers (controllers.md).

---

## 6. Resource Controllers e API Resources

### 6.1 Resource Controllers

Use `php artisan make:controller PhotoController --resource` para gerar os 7 métodos CRUD, e registre com `Route::resource('photos', 'PhotoController')` (controllers.md). Isso mapeia verbos HTTP e URIs automaticamente (`index`, `create`, `store`, `show`, `edit`, `update`, `destroy`).

- Para APIs, use `Route::apiResource('photos', 'PhotoController')` — exclui automaticamente as rotas `create`/`edit` (que só fazem sentido para HTML).
- Rotas adicionais a um resource devem ser declaradas **antes** de `Route::resource`, senão podem ser sobrepostas (controllers.md).
- Mantenha controllers focados; se precisar de métodos além do CRUD, considere dividir em dois controllers menores (controllers.md, dica).
- Route Model Binding: `php artisan make:controller PhotoController --resource --model=Photo` tipa o model nos métodos automaticamente.

### 6.2 API Resources para respostas consistentes

Para APIs, transforme models/coleções em JSON de forma consistente usando **API Resources** (`php artisan make:resource UserResource`, em `app/Http/Resources`). Eles estendem `Illuminate\Http\Resources\Json\Resource` (modelo único) ou `ResourceCollection` (coleção) (eloquent-resources.md).

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
```

No controller:

```php
use App\Http\Resources\UserResource;
use App\User;

public function show(User $user)
{
    return new UserResource($user);
}

public function index()
{
    return UserResource::collection(User::paginate(15));
}
```

Isso garante uma **forma única e versionável** de serializar a saída, separada do schema do banco. Coleções podem incluir metadados (`links`, `meta`) sobrescrevendo `toArray` num `ResourceCollection`.

---

## 7. Uso correto de `env()` e configuração

- `env()` **só deve ser chamado dentro de arquivos de configuração** (`config/*.php`). Nunca chame `env()` diretamente no código (controllers, services, etc.) (configuration.md).
- Motivo: após `php artisan config:cache`, o `.env` **não é mais carregado** e qualquer `env()` fora de config retorna `null`.
- Acesse configuração em runtime via helper `config('app.timezone')` (configuration.md).
- `config:cache` deve rodar **apenas em produção/deploy**, nunca em desenvolvimento (configuration.md).
- O `.env` **não deve** ir para o controle de versão (risco de expor credenciais); mantenha `.env.example` com placeholders (configuration.md).
- Para testes, use `.env.testing` ou variáveis em `phpunit.xml`; lembre-se de rodar `config:clear` antes de testar se alterou config (testing.md).

```php
// Ruim
$ttl = env('CACHE_TTL', 60);

// Bom (em config/cache.php): 'ttl' => env('CACHE_TTL', 60)
$ttl = config('cache.ttl');
```

---

## 8. Service Providers (bootstrap)

Service providers são o **ponto central de bootstrapping** (providers.md): registram bindings no container, event listeners, middleware, rotas, view composers e macros.

Regras importantes:

- No método `register()`, **apenas** faça bindings no container. Nunca registre event listeners, rotas ou outras funcionalidades aqui — outro provider pode ainda não ter carregado (providers.md).
- No método `boot()`, que é chamado **depois** de todos os providers terem sido registrados, registre view composers, macros e rotas. Você pode usar DI nos parâmetros do `boot()` (ex.: `ResponseFactory $response`) (providers.md).
- Registre seus providers no array `providers` de `config/app.php`.
- Se o provider **só** registra bindings, torne-o **deferred** (`protected $defer = true` + método `provides()`) para não ser carregado a cada request (providers.md).

```php
<?php

namespace App\Providers;

use Riak\Connection;
use Illuminate\Support\ServiceProvider;

class RiakServiceProvider extends ServiceProvider
{
    protected $defer = true;

    public function register()
    {
        $this->app->singleton(Connection::class, function ($app) {
            return new Connection($app['config']['riak']);
        });
    }

    public function provides()
    {
        return [Connection::class];
    }
}
```

Exemplos de uso do `boot()`:

```php
public function boot()
{
    // view composer
    view()->composer('layouts.app', \App\Http\ViewComposers\ProfileComposer::class);

    // macro de resposta
    \Illuminate\Contracts\Routing\ResponseFactory::macro('caps', function ($value) {
        return $this->make(strtoupper($value));
    });
}
```

---

## 9. Injeção de dependência vs Facades

- **Injeção de dependência (DI):** o container resolve controllers, listeners, middleware, jobs e Closures de rota. Tipar a dependência no construtor (constructor injection) ou no método (method injection) faz o container injetá-la (controllers.md). Recomendado para testabilidade e clareza.
- **Method injection:** injete `Illuminate\Http\Request` (ou o Form Request) nos métodos do controller. Parâmetros de rota vêm **depois** das outras dependências (controllers.md, requests.md).

```php
public function update(StoreBlogPost $request, $id)
{
    // $request validado; $id vem da rota
}
```

- **Facades:** convenientes e totalmente testáveis via `shouldReceive` (mocking.md). Use quando a praticidade supera a necessidade de DI explícita. Em pacotes, prefira Contracts (contratos.md).
- **Quando usar cada:** DI + Contracts para lógica de domínio/serviços críticos e testáveis; Facades para acessos pontuais a serviços do framework (Cache, Log, Auth) onde o acoplamento é aceitável.

---

## 10. Views e Blade (evitar queries e lógica de negócio)

- **Nunca execute queries em views.** Carregue os dados no controller e passe via `compact()` / array. Blades com `User::where(...)->get()` são difíceis de manter e testar (views.md/blade.md).
- **Não coloque lógica de negócio em Blade.** Use Blade para apresentação (estrutura, `@if` simples de UI, loops de exibição). Regras de negócio ficam em models/serviços.
- **Escaping por padrão:** `{{ }}` escapa a saída (protege contra XSS). Use `{!! !!}` **somente** para HTML confiável/autorizado (blade.md).
- **Old input:** use o helper `old('username')` em formulários para repopular após erro de validação (requests.md).
- **Trusted proxies:** atrás de load balancers, configure `App\Http\Middleware\TrustProxies` (`$proxies`, `$headers`) para gerar links HTTPS corretos (requests.md).

---

## 11. Tratamento de erros e logging

### 11.1 Exception Handler

Toda exceção passa por `App\Exceptions\Handler` (errors.md), com dois métodos:

- `report($exception)`: log ou envio a serviços externos (Sentry, Bugsnag). Use `instanceof` para tratar tipos específicos.
- `render($exception)`: converte a exceção em uma resposta HTTP.

```php
public function report(Exception $exception)
{
    if ($exception instanceof \App\Exceptions\CustomException) {
        // reportar de forma específica
    }

    parent::report($exception);
}

public function render($request, Exception $exception)
{
    if ($exception instanceof \App\Exceptions\CustomException) {
        return response()->view('errors.custom', [], 500);
    }

    return parent::render($request, $exception);
}
```

### 11.2 Logging

- Laravel usa **Monolog**. Configure em `config/app.php`: `log` (`single`, `daily`, `syslog`, `errorlog`), `log_max_files` (daily, padrão 5), `log_level` (padrão: loga tudo; em produção use `error` para reduzir ruído) (errors.md).
- `APP_DEBUG` deve ser `false` em produção para não expor dados sensíveis (errors.md).
- Use os níveis semânticos: `info()`, `warning()`, `error()`, `debug()` da facade `Log`. Para integrações customizadas de Monolog, use `configureMonologUsing()` em `bootstrap/app.php`.

### 11.3 Páginas de erro HTTP

Customize templates em `resources/views/errors/{status}.blade.php` (ex.: `503.blade.php` para manutenção) (errors.md, configuration.md).

---

## 12. Segurança por padrão

- **Mass assignment:** defina `$fillable` (ou `$guarded`) nos models Eloquent. Nunca use `User::create($request->all())` sem proteção — prefira `$request->validated()` vindo de Form Request (validation.md).
- **CSRF:** formulários HTML para `POST/PUT/DELETE` em `web.php` exigem token `{{ csrf_field() }}` (routing.md). O grupo `web` já aplica o middleware CSRF. Rotas `api.php` são stateless (sem CSRF, autenticadas por token).
- **Escaping/XSS:** `{{ }}` escapa; `{!! !!}` só para HTML seguro (blade.md).
- **Autenticação/Autorização:** use o middleware `auth` no controller (`$this->middleware('auth')`) e Policies para autorização por recurso (controllers.md, authorization.md).
- **Cookies:** todos os cookies do framework são criptografados e assinados; não confie em cookies do cliente sem validação (requests.md).
- **Verbos HTTP:** use `Route::resource`/`apiResource` para evitar definições manuais propensas a erro; spoofing de `PUT/PATCH/DELETE` via `_method` em formulários HTML (routing.md).
- **Proxy/HTTPS:** configure `TrustProxies` para evitar geração incorreta de URLs (requests.md).

---

## 13. Testabilidade

- Laravel já vem com PHPUnit e `phpunit.xml` configurado; `tests/` tem `Feature` e `Unit` (testing.md).
- O ambiente de teste usa driver `array` para session e cache automaticamente; `APP_ENV=testing` (testing.md).
- Crie testes com `php artisan make:test UserTest` (Feature) ou `--unit` (Unit). Sempre chame `parent::setUp()` se sobrescrever `setUp()` (testing.md).
- Para tornar código testável:
  - Use **DI + Contracts** para que mocks sejam injetáveis.
  - Form Requests isolam validação; controllers ficam magros e fáceis de testar com `RefreshDatabase`, `actingAs`, etc.
  - Se usar Facades, mock via `Facade::shouldReceive('method')->andReturn(...)` (mocking.md).
  - Jobs/Listeners desacoplados permitem testar o disparo do evento sem executar o efeito colateral.

```php
// Exemplo de teste Feature
public function test_usuario_pode_criar_post()
{
    $user = factory(\App\User::class)->create();
    $this->actingAs($user);

    $response = $this->post(route('posts.store'), [
        'title' => 'Meu Post',
        'body'  => 'Conteúdo',
    ]);

    $response->assertStatus(302);
    $this->assertDatabaseHas('posts', ['title' => 'Meu Post']);
}
```

> **Nota 5.5.50:** `phpunit.xml` já define o ambiente `testing`. Alterações em config de teste exigem `config:clear` antes de rodar os testes (testing.md).

---

## 14. Manutenção e qualidade (SOLID aplicado ao Laravel)

- **Comentários mínimos:** o código deve ser expressivo. Comente **por que**, não **o quê**. Evite docblocks óbvios.
- **SRP (Single Responsibility):** controllers coordenam; services contêm regras; Form Requests validam; Policies autorizam; Events/Listeners reagem.
- **OCP (Open/Closed):** estenda via Service Providers (macros, bindings) e Rule objects em vez de modificar o núcleo.
- **LSP (Liskov):** ao implementar Contracts, respeite a interface (ex.: `Illuminate\Contracts\Validation\Rule`).
- **ISP (Interface Segregation):** injete apenas o Contract necessário, não a façade inteira.
- **DIP (Dependency Inversion):** dependa de abstrações (Contracts) e não de classes concretas de vendor (contracts.md).
- **Naming claro:** nomes de métodos e classes que revelam intenção (`authorize`, `register`, `handle`).
- **Consistência:** siga a estrutura de diretórios e namespaces PSR-4; gere classes com `make:*` para garantir o boilerplate correto.
- **Refatoração contínua:** controllers que crescem demais indicam necessidade de extrair serviços ou dividir em controllers menores (controllers.md, dica sobre middleware em subconjunto de ações).

---

## 15. Armadilhas comuns (antipadrão → padrão)

| Armadilha | Antipadrão | Padrão recomendado |
|---|---|---|
| Lógica no controller | Queries + regras + e-mails no método | Controller magro + Service + Event/Listener |
| Validação espalhada | `validate()` inline repetido | Form Request centralizado |
| Autorização na rota | `Route::get(..., ['middleware' => 'can:...'])` solto / nada | Policy + `authorize()` no controller/Form Request |
| `env()` no código | `env('KEY')` em service | `config('arquivo.key')` |
| Queries em Blade | `User::all()` na view | Carregar no controller, passar via compact |
| Facade acoplada em pacote | Depender de `Cache::get` | Depender de `Illuminate\Contracts\Cache\Repository` |
| Rotas com Closures | Lógica em `Route::get(fn)` | Controller + `route:cache` |
| Mass assignment livre | `Model::create($request->all())` | `$request->validated()` + `$fillable` |
| Handler genérico | Nada em `Handler` | `report`/`render` customizados + `log_level` |

---

## 16. Notas específicas do Laravel 5.5.50

- **5.5 é LTS** (Long Term Support): correções de bugs por 2 anos e segurança por 3 anos a partir do release. 5.5.50 é o estado final de patches da linha 5.5.
- **API Resources** (`make:resource`, `Resource`, `ResourceCollection`) estão disponíveis (introduzidos no 5.5) — use-os para respostas de API consistentes.
- **`authorizeResource`** nos controllers (disponível na linha 5.5.x) para vincular resource controller a policies.
- **`Route::view` e `Route::redirect`** disponíveis para atalhos simples (routing.md).
- **`apiResource`** exclui `create`/`edit` automaticamente (controllers.md).
- **`Rule` objects** (`make:rule`, `Illuminate\Contracts\Validation\Rule`) disponíveis para regras de validação orientadas a objeto (validation.md).
- **`Validator::extendImplicit`** para regras que devem rodar mesmo com valor vazio (validation.md).
- **`config:cache`**: após cachear, `env()` fora de config retorna `null` — regra crítica de deploy (configuration.md).
- **`route:cache`**: requer controllers (não Closures) e deve rodar apenas no deploy (controllers.md).
- **`TrimStrings` + `ConvertEmptyStringsToNull`** no middleware global → campos opcionais precisam de `nullable` na validação (validation.md).
- **Handler de exceções** com `report`/`render` e logging via Monolog com `log`, `log_level`, `log_max_files` (errors.md).
- **`make:policy --model`** gera métodos CRUD (`view`, `create`, `update`, `delete`) (authorization.md).
- **Deferred service providers** via `defer` + `provides()` para performance (providers.md).

---

## Resumo de Pontos-Chave

1. **Controllers magros / models com lógica:** orquestração no controller, regras em services/models.
2. **Form Requests** centralizam validação (`rules`, `authorize`, `messages`, `withValidator`).
3. **Policies** cuidam de autorização por recurso; Gates para ações sem modelo.
4. **Events/Listeners/Jobs** para side-effects, mantendo o fluxo principal desacoplado e testável.
5. **Contracts sobre facades** quando importa desacoplamento/testabilidade (essencial em pacotes).
6. **`env()` só em config/**; use `config()` em runtime — crítico após `config:cache`.
7. **Service Providers:** `register()` só faz bindings; `boot()` para composers/macros/rotas; prefira deferred.
8. **DI via constructor/method injection**; facades para conveniência pontual e testáveis via `shouldReceive`.
9. **Resource Controllers** + **API Resources** para rotas e respostas consistentes; `apiResource` para APIs.
10. **Sem queries/lógica em Blade**; escaping padrão com `{{ }}`.
11. **Exception Handler** customizado + logging Monolog adequado (`log_level`, `daily`); `APP_DEBUG=false` em produção.
12. **Segurança por padrão:** `$fillable`, CSRF, escaping, `auth` + policies, `TrustProxies`.
13. **Testabilidade:** PHPUnit + Feature/Unit, DI/Contracts, `RefreshDatabase`, `actingAs`.
14. **SOLID + PSR-4 + comentários mínimos** para manutenção de longo prazo.
15. **Não usar Closures de rota** se for usar `route:cache`; manter responsabilidades focadas.

---

## Referências

- Documentação oficial Laravel 5.5 (arquivos locais em `/home/one/p/one/ai-guides/TMP/laravel5.5/`):
  - `structure.md` — estrutura de diretórios e localização de classes (PSR-4).
  - `configuration.md` — `env()`, `config()`, `config:cache`, maintenance mode.
  - `providers.md` — `register()`/`boot()`, deferred providers, macros/composers.
  - `contracts.md` — Contracts vs Facades, acoplamento fraco.
  - `controllers.md` — controllers, middleware, resource controllers, DI, route caching.
  - `requests.md` — `Request`, input, upload, trusted proxies, old input.
  - `routing.md` — rotas, grupos, route model binding, CSRF, named routes.
  - `validation.md` — Form Requests, regras, mensagens, Rule objects, `sometimes`.
  - `testing.md` — PHPUnit, Feature/Unit, ambiente `testing`.
  - `authorization.md` — Gates, Policies, `authorizeResource`.
  - `eloquent-resources.md` — API Resources / ResourceCollection.
  - `errors.md` — Exception Handler, logging Monolog.
