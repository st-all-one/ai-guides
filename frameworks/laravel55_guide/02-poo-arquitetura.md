# POO e Arquitetura no Laravel 5.5.50

Este dossiê cobre, com profundidade, os mecanismos de Programação Orientada a Objetos e de arquitetura do Laravel **5.5.50 (LTS)**. Todo o conteúdo baseia-se exclusivamente na documentação oficial da série 5.5 e em comportamentos estáveis dessa versão. Recursos introduzidos em versões posteriores (5.6, 5.7, 6, 7, 8+) **não** são abordados — em especial, o método `scoped()` de binding (introduzido no Laravel 5.7) é deliberadamente omitido.

---

## 1. Service Container (Container de Serviços)

### 1.1. Introdução e conceito

O *service container* do Laravel é a ferramenta central para gerenciar dependências de classes e realizar **injeção de dependência** (*dependency injection*). Injeção de dependência, em poucas palavras, significa que as dependências de uma classe são "injetadas" nela através do construtor ou, em alguns casos, de métodos *setter*.

Exemplo clássico (do próprio container):

```php
<?php

namespace App\Http\Controllers;

use App\User;
use App\Repositories\UserRepository;
use App\Http\Controllers\Controller;

class UserController extends Controller
{
    /**
     * The user repository implementation.
     *
     * @var UserRepository
     */
    protected $users;

    /**
     * Create a new controller instance.
     *
     * @param  UserRepository  $users
     * @return void
     */
    public function __construct(UserRepository $users)
    {
        $this->users = $users;
    }

    /**
     * Show the profile for the given user.
     *
     * @param  int  $id
     * @return Response
     */
    public function show($id)
    {
        $user = $this->users->find($id);

        return view('user.profile', ['user' => $user]);
    }
}
```

Neste exemplo, o `UserController` precisa recuperar usuários de uma fonte de dados. Em vez de instanciar diretamente uma implementação concreta, **injetamos** um serviço capaz de recuperar usuários. Assim, a implementação (provavelmente baseada em Eloquent) pode ser trocada facilmente, e o repositório pode ser "mockado" (substituído por uma implementação fictícia) durante os testes.

> **Dica importante:** Não é necessário registrar classes no container se elas não dependem de nenhuma interface. O container consegue construí-las automaticamente via *reflection* (resolução automática). O binding manual é necessário apenas quando você precisa controlar *como* uma dependência é construída ou quando deseja desacoplar uma interface de sua implementação.

Um entendimento profundo do container é essencial para construir aplicações robustas e para contribuir com o próprio core do Laravel.

### 1.2. Binding (Registro de dependências)

Quase todos os bindings são registrados dentro de **service providers**, mas os métodos abaixo são métodos do container e podem ser usados em qualquer contexto onde se tenha acesso a `$this->app` (ou à facade `App`).

#### 1.2.1. Bindings simples (`bind`)

O método `bind` recebe o nome da classe/interface a ser registrada e uma `Closure` que retorna a instância:

```php
$this->app->bind('HelpSpot\API', function ($app) {
    return new HelpSpot\API($app->make('HttpClient'));
});
```

Observe que a própria instância do container (`$app`) é recebida como argumento do *resolver*. Isso permite resolver sub-dependências do objeto que está sendo construído (note o `$app->make('HttpClient')`).

Comportamento do `bind`: **cada vez** que o serviço é resolvido, uma **nova instância** é criada.

#### 1.2.2. Binding de singleton (`singleton`)

O método `singleton` registra uma classe/interface que deve ser resolvida **apenas uma vez**. Após a primeira resolução, a mesma instância de objeto é retornada em chamadas subsequentes:

```php
$this->app->singleton('HelpSpot\API', function ($app) {
    return new HelpSpot\API($app->make('HttpClient'));
});
```

Use `singleton` para serviços que mantêm estado compartilhado ou que são caros de construir (ex.: conexões de banco, clientes HTTP, cache managers).

#### 1.2.3. Binding de instâncias (`instance`)

Você pode registrar uma instância de objeto já existente através do método `instance`. A instância fornecida será sempre retornada nas chamadas seguintes:

```php
$api = new HelpSpot\API(new HttpClient);

$this->app->instance('HelpSpot\API', $api);
```

Isso é útil em testes, quando você deseja "plantar" um objeto concreto (ou um mock) no container.

#### 1.2.4. Binding condicional (`bindIf`)

O Laravel 5.5 inclui o método `bindIf`, que registra o binding **apenas se ele ainda não tiver sido registrado**. É um atalho para:

```php
if (!$this->app->bound('HelpSpot\API')) {
    $this->app->bind('HelpSpot\API', $closure);
}
```

Equivalente simplificado com `bindIf`:

```php
$this->app->bindIf('HelpSpot\API', function ($app) {
    return new HelpSpot\API($app->make('HttpClient'));
});
```

Isso evita sobrescrever acidentalmente um binding já existente — útil em providers de pacotes de terceiros que não querem assumir o controle de uma ligação já definida pela aplicação.

> **Nota v5.5.50:** `bindIf` está disponível nativamente desde o Laravel 5.5. Não confunda com `scoped` — este **não** existe no 5.5 (foi introduzido no 5.7) e, portanto, **não deve ser usado** aqui.

#### 1.2.5. Binding de primitivos (valores escalares)

Às vezes uma classe recebe classes injetadas e também precisa de um valor primitivo (um inteiro, string, etc.). Use *contextual binding* para injetar qualquer valor:

```php
$this->app->when('App\Http\Controllers\UserController')
          ->needs('$variableName')
          ->give($value);
```

O `$value` também pode ser uma `Closure` para resolução tardia, se necessário.

### 1.3. Binding de Interfaces a Implementações

Uma das funcionalidades mais poderosas do container é ligar uma **interface** a uma **implementação** concreta.

```php
$this->app->bind(
    'App\Contracts\EventPusher',
    'App\Services\RedisEventPusher'
);
```

Essa declaração diz ao container que, quando uma classe precisar de uma implementação de `EventPusher`, ele deve injetar `RedisEventPusher`. A partir daí, basta fazer o type-hint da interface no construtor (ou em qualquer local onde o container injeta dependências):

```php
use App\Contracts\EventPusher;

/**
 * Create a new class instance.
 *
 * @param  EventPusher  $pusher
 * @return void
 */
public function __construct(EventPusher $pusher)
{
    $this->pusher = $pusher;
}
```

Isso é a base do **desacoplamento por contratos**: a classe consumidora depende de uma abstração, nunca de uma classe concreta.

### 1.4. Contextual Binding (Binding Contextual)

Há casos em que duas classes usam a mesma interface, mas você quer injetar implementações diferentes em cada uma. O Laravel oferece uma interface fluente para isso:

```php
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\VideoController;
use Illuminate\Contracts\Filesystem\Filesystem;

$this->app->when(PhotoController::class)
          ->needs(Filesystem::class)
          ->give(function () {
              return Storage::disk('local');
          });

$this->app->when(VideoController::class)
          ->needs(Filesystem::class)
          ->give(function () {
              return Storage::disk('s3');
          });
```

Aqui, `PhotoController` recebe o disco `local`, enquanto `VideoController` recebe o disco `s3`, ambos tipados como `Illuminate\Contracts\Filesystem\Filesystem`.

### 1.5. Tagged Bindings (Bindings Rotulados / Tagging)

Ocasionalmente, você precisa resolver "todos" os serviços de uma mesma categoria. Por exemplo, um agregador de relatórios que recebe um array de várias implementações de `Report`.

```php
$this->app->bind('SpeedReport', function () {
    //
});

$this->app->bind('MemoryReport', function () {
    //
});

$this->app->tag(['SpeedReport', 'MemoryReport'], 'reports');
```

Depois de rotulados, você resolve todos via `tagged`:

```php
$this->app->bind('ReportAggregator', function ($app) {
    return new ReportAggregator($app->tagged('reports'));
});
```

`$app->tagged('reports')` retorna um array (iterável) com todas as instâncias rotuladas.

### 1.6. Extending Bindings (Estender / Decorar)

O método `extend` permite modificar serviços já resolvidos. Quando um serviço é resolvido, você pode executar código adicional para decorar ou configurar o serviço. O `extend` recebe uma `Closure` que deve retornar o serviço modificado:

```php
$this->app->extend(Service::class, function ($service) {
    return new DecoratedService($service);
});
```

Isso é ideal para aplicar o padrão *Decorator* (ex.: envolver um serviço com logging, cache, ou validação extra) sem alterar a classe original.

### 1.7. Resolving (Resolução)

#### 1.7.1. O método `make`

Use `make` para resolver uma instância de classe/interface a partir do container:

```php
$api = $this->app->make('HelpSpot\API');
```

Em locais onde não se tem acesso à variável `$app`, use o *helper* global `resolve`:

```php
$api = resolve('HelpSpot\API');
```

Se alguma dependência da sua classe não for resolúvel pelo container, você pode passá-las como array associativo via `makeWith`:

```php
$api = $this->app->makeWith('HelpSpot\API', ['id' => 1]);
```

#### 1.7.2. Injeção Automática (Automatic Injection)

Alternativamente — e este é o caminho preferido na prática — você faz o *type-hint* da dependência no construtor de uma classe que é resolvida pelo container. Isso inclui **controllers**, **event listeners**, **queue jobs**, **middleware** e muito mais. Exemplo com repositório no controller:

```php
<?php

namespace App\Http\Controllers;

use App\Users\Repository as UserRepository;

class UserController extends Controller
{
    /**
     * The user repository instance.
     */
    protected $users;

    /**
     * Create a new controller instance.
     *
     * @param  UserRepository  $users
     * @return void
     */
    public function __construct(UserRepository $users)
    {
        $this->users = $users;
    }

    /**
     * Show the user with the given ID.
     *
     * @param  int  $id
     * @return Response
     */
    public function show($id)
    {
        //
    }
}
```

O repositório será automaticamente resolvido e injetado. **Este é o modo como a maioria dos objetos deve ser resolvida pelo container.**

#### 1.7.3. Resolução via type-hint do próprio container (PSR-11)

O container do Laravel implementa a interface **PSR-11**. Portanto, você pode fazer o type-hint da interface do PSR-11 para obter o container:

```php
use Psr\Container\ContainerInterface;

Route::get('/', function (ContainerInterface $container) {
    $service = $container->get('Service');

    //
});
```

> **Nota:** O método `get` do PSR-11 lança uma exceção se o identificador **não tiver sido explicitamente registrado** no container. Diferente de `make`, ele não faz resolução automática por reflection de classes não registradas.

### 1.8. Container Events (Eventos do Container)

O container dispara um evento cada vez que resolve um objeto. Você pode escutá-lo via `resolving`:

```php
$this->app->resolving(function ($object, $app) {
    // Chamado quando o container resolve um objeto de QUALQUER tipo...
});

$this->app->resolving(HelpSpot\API::class, function ($api, $app) {
    // Chamado quando o container resolve objetos do tipo "HelpSpot\API"...
});
```

O objeto sendo resolvido é passado ao callback, permitindo configurar propriedades adicionais antes de entregá-lo ao consumidor.

---

## 2. Injeção de Dependência na Prática

### 2.1. Em Controllers

Conforme visto, o construtor do controller recebe as dependências tipadas. O Laravel resolve o controller a partir do container durante o roteamento, então a injeção automática funciona nativamente.

### 2.2. Route Model Binding + DI em Closures de Rota

As rotas definidas em `routes/web.php` (e `api.php`) também são resolvidas pelo container. Você pode tanto usar *route model binding* quanto injetar serviços diretamente no *closure*:

```php
use App\User;
use App\Contracts\EventPusher;

Route::get('/users/{user}', function (User $user, EventPusher $pusher) {
    // $user foi resolvido automaticamente pelo ID da rota (route model binding)
    // $pusher foi injetado pelo container via type-hint da interface
    $pusher->push('user.viewed', ['id' => $user->id]);

    return $user;
});
```

O *route model binding* implícito resolve o modelo `User` automaticamente usando a chave primária (ou a coluna definida por `getRouteKeyName()`). A injeção de `EventPusher` acontece porque o container reconhece o type-hint.

### 2.3. Em Jobs (Queue Jobs)

Jobs enfileiráveis são resolvidos pelo container. A injeção no construtor funciona da mesma forma:

```php
namespace App\Jobs;

use App\Contracts\EventPusher;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

class ProcessPodcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $podcastId;

    protected $pusher;

    public function __construct($podcastId, EventPusher $pusher = null)
    {
        $this->podcastId = $podcastId;
        $this->pusher = $pusher;
    }

    public function handle(EventPusher $pusher)
    {
        // Dependência injetada também no método handle()
    }
}
```

> **Armadilha (jobs):** Lembre-se de que jobs são **serializados** para a fila. Você **não pode** armazenar objetos não serializáveis (como conexões de banco, clients HTTP, ou o próprio container) como propriedades do job. A boa prática é injetar dependências no método `handle()` (que é executado já no contexto do worker, com o container disponível), em vez de guardá-las no construtor. No construtor, passe apenas dados primitivos (IDs, arrays).

### 2.4. Em Event Listeners

Listeners de eventos também são resolvidos pelo container, permitindo type-hint de contracts:

```php
namespace App\Listeners;

use App\User;
use App\Events\OrderWasPlaced;
use Illuminate\Contracts\Redis\Database;

class CacheOrderInformation
{
    protected $redis;

    public function __construct(Database $redis)
    {
        $this->redis = $redis;
    }

    public function handle(OrderWasPlaced $event)
    {
        //
    }
}
```

### 2.5. Method Injection (Injeção em Métodos)

Além do construtor, o Laravel suporta injeção diretamente nos **métodos** de controllers e listeners (e em `handle()` de jobs). Em controllers, você pode injetar a `Request` e outros serviços junto com os parâmetros da rota:

```php
use Illuminate\Http\Request;
use App\Contracts\EventPusher;

public function store(Request $request, EventPusher $pusher)
{
    // $request vem da requisição HTTP
    // $pusher injetado pelo container
}
```

---

## 3. Facades

### 3.1. Introdução

As facades fornecem uma interface "estática" para classes disponíveis no container de serviços. O Laravel embarca muitas facades que dão acesso a quase todos os recursos do framework. Elas funcionam como "proxies estáticos" para classes subjacentes no container, oferecendo sintaxe concisa e expressiva mantendo **testabilidade e flexibilidade** superiores aos métodos estáticos tradicionais.

Todas as facades do Laravel estão definidas no namespace `Illuminate\Support\Facades`. Exemplo:

```php
use Illuminate\Support\Facades\Cache;

Route::get('/cache', function () {
    return Cache::get('key');
});
```

### 3.2. Como as Facades Funcionam

Em uma aplicação Laravel, uma facade é uma classe que dá acesso a um objeto do container. A "mágica" está na classe base `Illuminate\Support\Facades\Facade`. Toda facade (nativa ou customizada) estende essa classe base.

A classe base `Facade` usa o método mágico `__callStatic()` para adiar (defer) chamadas da facade para um objeto resolvido do container. No exemplo abaixo, parece que chamamos um método estático `get` na classe `Cache`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Cache;

class UserController extends Controller
{
    public function showProfile($id)
    {
        $user = Cache::get('user:'.$id);

        return view('profile', ['user' => $user]);
    }
}
```

Na verdade, a facade `Cache` serve como proxy para a implementação subjacente da interface `Illuminate\Contracts\Cache\Factory`. Qualquer chamada feita via facade é encaminhada para a instância subjacente do serviço de cache.

Se olharmos a classe `Illuminate\Support\Facades\Cache`, veremos que **não existe** o método estático `get`:

```php
class Cache extends Facade
{
    /**
     * Get the registered name of the component.
     *
     * @return string
     */
    protected static function getFacadeAccessor() { return 'cache'; }
}
```

A facade estende a base `Facade` e define apenas `getFacadeAccessor()`, cujo trabalho é retornar o **nome de um binding do container**. Quando qualquer método estático é referenciado na facade, o Laravel resolve o binding correspondente (`cache`) e executa o método solicitado contra aquele objeto.

### 3.3. Vantagens das Facades

- **Sintaxe concisa e memorável:** não é preciso lembrar nomes longos de classes a serem injetadas ou configuradas manualmente.
- **Testabilidade:** graças ao uso de métodos dinâmicos (`__callStatic`), as facades podem ser "mockadas" exatamente como instâncias injetadas.
- **Flexibilidade:** trocar a implementação subjacente não afeta o código que usa a facade.

### 3.4. Facades vs. Dependency Injection

O principal benefício da injeção de dependência é a capacidade de **trocar implementações** (especialmente em testes, injetando um mock/stub). Em uma classe estática "de verdade", não seria possível mockar o método. Porém, como as facades usam métodos dinâmicos para fazer proxy das chamadas para objetos resolvidos do container, **podemos testar facades exatamente como testaríamos uma instância injetada**.

Exemplo de teste (verificando que `Cache::get` foi chamado com o argumento esperado):

```php
use Illuminate\Support\Facades\Cache;

/**
 * A basic functional test example.
 *
 * @return void
 */
public function testBasicExample()
{
    Cache::shouldReceive('get')
         ->with('key')
         ->andReturn('value');

    $this->visit('/cache')
         ->see('value');
}
```

### 3.5. Facades vs. Helper Functions

Além das facades, o Laravel inclui "helper functions" que realizam tarefas comuns (gerar views, disparar eventos, despachar jobs, enviar respostas HTTP). Muitos helpers equivalem a uma facade. Exemplo equivalente:

```php
return View::make('profile');

return view('profile');
```

Não há diferença prática entre facades e helpers. Ao usar um helper, você ainda pode testá-lo como testaria a facade correspondente:

```php
use Illuminate\Support\Facades\Cache;

public function testBasicExample()
{
    Cache::shouldReceive('get')
         ->with('key')
         ->andReturn('value');

    $this->visit('/cache')
         ->see('value');
}
```

### 3.6. Criar uma Facade Customizada (3 passos)

Para criar uma facade própria no Laravel 5.5, são necessários três passos:

**Passo 1 — Binding no container.** Registre a classe subjacente em um service provider:

```php
// Em app/Providers/MyServiceProvider.php
public function register()
{
    $this->app->singleton('meuServico', function ($app) {
        return new \App\Services\MeuServico($app->make('config'));
    });
}
```

**Passo 2 — Classe Facade.** Crie uma classe que estenda `Illuminate\Support\Facades\Facade` e retorne a chave do binding em `getFacadeAccessor()`:

```php
<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

class MeuServico extends Facade
{
    /**
     * Get the registered name of the component.
     *
     * @return string
     */
    protected static function getFacadeAccessor()
    {
        return 'meuServico';
    }
}
```

**Passo 3 — Alias em config/app.php.** Registre o alias no array `aliases` de `config/app.php` para poder usar a facade sem o namespace completo:

```php
'aliases' => [
    // ... outras facades
    'MeuServico' => App\Facades\MeuServico::class,
],
```

Agora você pode usar `MeuServico::algumMetodo()` em qualquer lugar.

### 3.7. `Facade::clearResolvedInstances()` em testes

Uma armadilha comum: facades **cacheiam** a instância resolvida entre chamadas. Em testes, se você altera o binding (ex.: registra um mock via `instance()`) após a facade já ter resolvido a instância, a facade pode continuar retornando a instância antiga.

Para forçar a limpeza dos singletons resolvidos pelas facades em testes, use:

```php
use App\Facades\MeuServico;

public function tearDown()
{
    MeuServico::clearResolvedInstances();

    parent::tearDown();
}
```

Isso garante que, no próximo teste, a facade resolva uma instância fresca (respeitando novos bindings/mocks).

### 3.8. Real-Time Facades (Laravel 5.5+)

Usando *real-time facades*, você pode tratar qualquer classe da aplicação **como se fosse uma facade**, prefixando o namespace importado com `Facades`. Exemplo:

```php
<?php

namespace App;

use Facades\App\Contracts\Publisher;
use Illuminate\Database\Eloquent\Model;

class Podcast extends Model
{
    public function publish()
    {
        $this->update(['publishing' => now()]);

        Publisher::publish($this);
    }
}
```

Quando a real-time facade é usada, a implementação é resolvida do container usando a parte do nome após o prefixo `Facades`. Em testes:

```php
use Facades\App\Contracts\Publisher;

public function test_podcast_can_be_published()
{
    $podcast = factory(Podcast::class)->create();

    Publisher::shouldReceive('publish')->once()->with($podcast);

    $podcast->publish();
}
```

### 3.9. Referência de Facades (principais do 5.5)

| Facade | Classe Subjacente | Binding no Container |
|--------|-------------------|----------------------|
| `App` | `Illuminate\Foundation\Application` | `app` |
| `Artisan` | `Illuminate\Contracts\Console\Kernel` | `artisan` |
| `Auth` | `Illuminate\Auth\AuthManager` | `auth` |
| `Blade` | `Illuminate\View\Compilers\BladeCompiler` | `blade.compiler` |
| `Cache` | `Illuminate\Cache\CacheManager` | `cache` |
| `Config` | `Illuminate\Config\Repository` | `config` |
| `Cookie` | `Illuminate\Cookie\CookieJar` | `cookie` |
| `Crypt` | `Illuminate\Encryption\Encrypter` | `encrypter` |
| `DB` | `Illuminate\Database\DatabaseManager` | `db` |
| `Event` | `Illuminate\Events\Dispatcher` | `events` |
| `File` | `Illuminate\Filesystem\Filesystem` | `files` |
| `Gate` | `Illuminate\Contracts\Auth\Access\Gate` | — |
| `Hash` | `Illuminate\Contracts\Hashing\Hasher` | `hash` |
| `Lang` | `Illuminate\Translation\Translator` | `translator` |
| `Log` | `Illuminate\Log\Writer` | `log` |
| `Mail` | `Illuminate\Mail\Mailer` | `mailer` |
| `Notification` | `Illuminate\Notifications\ChannelManager` | — |
| `Queue` | `Illuminate\Queue\QueueManager` | `queue` |
| `Redirect` | `Illuminate\Routing\Redirector` | `redirect` |
| `Redis` | `Illuminate\Redis\RedisManager` | `redis` |
| `Request` | `Illuminate\Http\Request` | `request` |
| `Response` | `Illuminate\Contracts\Routing\ResponseFactory` | — |
| `Route` | `Illuminate\Routing\Router` | `router` |
| `Session` | `Illuminate\Session\SessionManager` | `session` |
| `Storage` | `Illuminate\Filesystem\FilesystemManager` | `filesystem` |
| `URL` | `Illuminate\Routing\UrlGenerator` | `url` |
| `Validator` | `Illuminate\Validation\Factory` | `validator` |
| `View` | `Illuminate\View\Factory` | `view` |

---

## 4. Contracts (Interfaces do Core)

### 4.1. Introdução

Os *Contracts* do Laravel são um conjunto de **interfaces** que definem os serviços centrais fornecidos pelo framework. Por exemplo, o contract `Illuminate\Contracts\Queue\Queue` define os métodos necessários para enfileirar jobs, enquanto `Illuminate\Contracts\Mail\Mailer` define os métodos para envio de e-mail.

Cada contract tem uma implementação correspondente fornecida pelo framework (ex.: a implementação de fila suporta diversos drivers; o mailer é alimentado por SwiftMailer). Todos os contracts vivem no repositório `illuminate/contracts` — um pacote único e desacoplado, excelente para desenvolvedores de pacotes.

### 4.2. Contracts vs. Facades

Tanto facades quanto helpers oferecem uma forma simples de usar os serviços sem fazer type-hint e resolver contracts do container. Na maioria dos casos, cada facade tem um contract equivalente.

A diferença fundamental:
- **Facades** não exigem que você declare a dependência no construtor.
- **Contracts** permitem definir dependências **explícitas** para suas classes.

Alguns desenvolvedores preferem declarar dependências explicitamente (contracts); outros preferem a conveniência das facades. Em geral, para aplicações, tanto faz. Para **pacotes de terceiros**, recomenda-se fortemente o uso de contracts, pois o helper de testes de facades (`shouldReceive`) **não está disponível** fora do Laravel.

### 4.3. Por que usar Contracts — Acoplamento Fraco (Loose Coupling)

Considere código fortemente acoplado a uma implementação concreta de cache:

```php
<?php

namespace App\Orders;

class Repository
{
    protected $cache;

    public function __construct(\SomePackage\Cache\Memcached $cache)
    {
        $this->cache = $cache;
    }

    public function find($id)
    {
        if ($this->cache->has($id)) {
            //
        }
    }
}
```

Esse código está acoplado a uma classe concreta de um fornecedor. Se a API do pacote mudar, o código muda. Se quisermos trocar Memcached por Redis, também precisamos alterar o repositório. O repositório não deveria saber *quem* fornece os dados nem *como*.

**Solução — depender de uma interface neutra:**

```php
<?php

namespace App\Orders;

use Illuminate\Contracts\Cache\Repository as Cache;

class Repository
{
    protected $cache;

    public function __construct(Cache $cache)
    {
        $this->cache = $cache;
    }
}
```

Agora o código não está acoplado a nenhum fornecedor específico, nem mesmo ao Laravel. Como o pacote de contracts não contém implementação nem dependências, você pode escrever uma implementação alternativa de qualquer contract e trocar a tecnologia de cache sem modificar o código consumidor.

### 4.4. Simplicidade

Quando todos os serviços do Laravel estão definidos em interfaces simples, é muito fácil determinar a funcionalidade oferecida por um serviço. Os contracts servem como **documentação sucinta** das features do framework. Além disso, dependendo de interfaces simples, seu código fica mais fácil de entender e manter — em vez de caçar métodos em uma classe grande e complexa, você consulta uma interface limpa.

### 4.5. Como usar Contracts

Muitos tipos de classes no Laravel são resolvidos pelo container, incluindo controllers, event listeners, middleware, queued jobs e até route closures. Para obter uma implementação de um contract, basta fazer o type-hint da interface no construtor da classe resolvida. O container lê os type-hints e injeta o valor apropriado automaticamente.

### 4.6. Principais Contracts (referência do 5.5)

| Contract | Facade Equivalente |
|----------|--------------------|
| `Illuminate\Contracts\Auth\Access\Gate` | `Gate` |
| `Illuminate\Contracts\Auth\Factory` | `Auth` |
| `Illuminate\Contracts\Auth\Guard` | `Auth::guard()` |
| `Illuminate\Contracts\Auth\PasswordBroker` | `Password::broker()` |
| `Illuminate\Contracts\Auth\PasswordBrokerFactory` | `Password` |
| `Illuminate\Contracts\Bus\Dispatcher` | `Bus` |
| `Illuminate\Contracts\Broadcasting\Factory` | `Broadcast` |
| `Illuminate\Contracts\Broadcasting\Broadcaster` | `Broadcast::connection()` |
| `Illuminate\Contracts\Cache\Factory` | `Cache` |
| `Illuminate\Contracts\Cache\Repository` | `Cache::driver()` |
| `Illuminate\Contracts\Config\Repository` | `Config` |
| `Illuminate\Contracts\Console\Kernel` | `Artisan` |
| `Illuminate\Contracts\Container\Container` | `App` |
| `Illuminate\Contracts\Cookie\Factory` | `Cookie` |
| `Illuminate\Contracts\Encryption\Encrypter` | `Crypt` |
| `Illuminate\Contracts\Events\Dispatcher` | `Event` |
| `Illuminate\Contracts\Filesystem\Cloud` | `Storage::cloud()` |
| `Illuminate\Contracts\Filesystem\Factory` | `Storage` |
| `Illuminate\Contracts\Filesystem\Filesystem` | `Storage::disk()` |
| `Illuminate\Contracts\Foundation\Application` | `App` |
| `Illuminate\Contracts\Hashing\Hasher` | `Hash` |
| `Illuminate\Contracts\Logging\Log` | `Log` |
| `Illuminate\Contracts\Mail\Mailer` | `Mail` |
| `Illuminate\Contracts\Notifications\Dispatcher` | `Notification` |
| `Illuminate\Contracts\Notifications\Factory` | `Notification` |
| `Illuminate\Contracts\Queue\Factory` | `Queue` |
| `Illuminate\Contracts\Queue\Queue` | `Queue::connection()` |
| `Illuminate\Contracts\Redis\Factory` | `Redis` |
| `Illuminate\Contracts\Routing\ResponseFactory` | `Response` |
| `Illuminate\Contracts\Routing\UrlGenerator` | `URL` |
| `Illuminate\Contracts\Routing\Registrar` | `Route` |
| `Illuminate\Contracts\Session\Session` | `Session::driver()` |
| `Illuminate\Contracts\Translation\Translator` | `Lang` |
| `Illuminate\Contracts\Validation\Factory` | `Validator` |
| `Illuminate\Contracts\Validation\Validator` | `Validator::make()` |
| `Illuminate\Contracts\View\Factory` | `View` |
| `Illuminate\Contracts\View\View` | `View::make()` |

> Outros contracts existem sem facade direta (ex.: `Illuminate\Contracts\Auth\Authenticatable`, `Illuminate\Contracts\Queue\ShouldQueue`, `Illuminate\Contracts\Support\Arrayable`, `Illuminate\Contracts\Support\Renderable`, `Illuminate\Contracts\Support\Responsable`, etc.). Consulte o repositório `illuminate/contracts` da tag 5.5 para a lista completa.

### 4.7. Como trocar a implementação de um Contract

Basta registrar um novo binding da interface para a sua implementação em um service provider:

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Contracts\Cache\Repository as CacheContract;
use App\Services\MyCustomCache;

public function register()
{
    $this->app->singleton(CacheContract::class, function ($app) {
        return new MyCustomCache($app['config']['cache']);
    });
}
```

A partir daí, qualquer classe que fizer `public function __construct(CacheContract $cache)` receberá `MyCustomCache`. Nenhuma linha de código consumidora precisa mudar — este é o poder do desacoplamento por interfaces.

---

## 5. Service Providers

### 5.1. Introdução

Os service providers são o **local central de todo o bootstrapping** da aplicação Laravel. Tanto a sua aplicação quanto os serviços core do Laravel são inicializados via providers.

Por "bootstrapped" entendemos: **registrar** coisas — bindings no container, event listeners, middleware e até rotas. Os providers são o lugar central para configurar a aplicação.

No `config/app.php` há um array `providers` com todos os providers carregados. Muitos são "deferred" (adiados): não são carregados a cada requisição, apenas quando o serviço que fornecem é realmente necessário.

### 5.2. Escrevendo um Service Provider

Todo provider estende `Illuminate\Support\ServiceProvider`. A maioria possui os métodos `register` e `boot`.

Gere um provider via Artisan:

```bash
php artisan make:provider RiakServiceProvider
```

### 5.3. O método `register()`

Dentro de `register()`, você **deve apenas registrar bindings no container**. **Nunca** tente registrar event listeners, rotas ou qualquer outra funcionalidade em `register()`. Caso contrário, você pode acidentalmente usar um serviço fornecido por um provider que **ainda não foi carregado**.

```php
<?php

namespace App\Providers;

use Riak\Connection;
use Illuminate\Support\ServiceProvider;

class RiakServiceProvider extends ServiceProvider
{
    /**
     * Register bindings in the container.
     *
     * @return void
     */
    public function register()
    {
        $this->app->singleton(Connection::class, function ($app) {
            return new Connection(config('riak'));
        });
    }
}
```

Em qualquer método do provider você tem acesso à propriedade `$app` (o container).

> **Armadilha v5.5:** Nunca use uma facade (ex.: `Cache::get()`, `Config::get()`) dentro de `register()`. Facades resolvem serviços que podem depender de providers ainda não carregados na ordem de boot, causando erros ou resoluções prematuras. Use `$this->app['config']` ou `$this->app->make(...)` com cautela, e prefira deixar lógica que depende de outros serviços para o `boot()`.

### 5.4. O método `boot()`

Use `boot()` para registrar view composers, event listeners, macros, rotas, etc. **Este método é chamado depois que todos os outros providers foram registrados**, então você tem acesso a todos os serviços registrados pelo framework:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class ComposerServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        view()->composer('view', function () {
            //
        });
    }
}
```

#### 5.4.1. Injeção de Dependência no `boot()`

Você pode fazer type-hint das dependências do método `boot()`. O container injeta automaticamente:

```php
use Illuminate\Contracts\Routing\ResponseFactory;

public function boot(ResponseFactory $response)
{
    $response->macro('caps', function ($value) {
        //
    });
}
```

Isso é o local ideal para registrar **macros** (ex.: `Response::macro`, `Collection::macro`, `Str::macro`) e compartilhar comportamentos globais.

### 5.5. Registrando Providers

Registre seus providers no array `providers` de `config/app.php`:

```php
'providers' => [
    // Other Service Providers

    App\Providers\ComposerServiceProvider::class,
],
```

Por padrão, o array já lista os providers core do Laravel (mailer, queue, cache, etc.).

### 5.6. Deferred Providers (Providers Adiados)

Se o seu provider **apenas** registra bindings no container, você pode adiar seu carregamento até que um dos bindings registrados seja realmente necessário. Isso melhora a performance, pois o provider não é lido do sistema de arquivos a cada requisição.

O Laravel compila e armazena uma lista de todos os serviços fornecidos por providers adiados, junto com o nome da classe do provider. Somente quando você tenta resolver um desses serviços é que o Laravel carrega o provider.

> **Nota v5.5 (crítica):** No Laravel 5.5, os providers adiados usam a propriedade **`$defer`** (booleana) e o método **`provides()`**. **Não existe** o método `shouldDefer()` nesta versão (este foi introduzido em versões posteriores). Use `$defer = true` + `provides()`.

```php
<?php

namespace App\Providers;

use Riak\Connection;
use Illuminate\Support\ServiceProvider;

class RiakServiceProvider extends ServiceProvider
{
    /**
     * Indicates if loading of the provider is deferred.
     *
     * @var bool
     */
    protected $defer = true;

    /**
     * Register the service provider.
     *
     * @return void
     */
    public function register()
    {
        $this->app->singleton(Connection::class, function ($app) {
            return new Connection($app['config']['riak']);
        });
    }

    /**
     * Get the services provided by the provider.
     *
     * @return array
     */
    public function provides()
    {
        return [Connection::class];
    }
}
```

O método `provides()` deve retornar os bindings registrados pelo provider. **Atenção:** se você definir `$defer = true` mas esquecer de listar um binding em `provides()`, aquele serviço só será resolvido corretamente após o provider ser carregado por outro motivo — risco de "service not found". Liste **todos** os bindings.

### 5.7. Boot de outros providers / Ordem de inicialização

A ordem importa. O Laravel:
1. Executa o método `register()` de **todos** os providers (na ordem do array `providers`).
2. Depois, executa o método `boot()` de todos os providers.

Portanto, no `boot()` você pode consumir qualquer serviço registrado em qualquer `register()` (core ou seu). Mas no `register()` você **não** pode confiar em serviços de outros providers que ainda não rodaram.

---

## 6. Estrutura de Diretórios (structure.md)

### 6.1. Visão geral

A estrutura padrão do Laravel é um ponto de partida para aplicações grandes e pequenas. O Laravel impõe **quase nenhuma restrição** sobre onde uma classe está localizada — desde que o Composer consiga autoloadar a classe (via PSR-4).

#### 6.1.1. Onde está o diretório `Models`?

Muitos iniciantes estranham a ausência de um diretório `models`. Isso é **intencional**: a palavra "model" é ambígua (para uns, é toda a lógica de negócio; para outros, é a classe que interage com o banco). Por isso, os modelos Eloquent ficam em `app/` por padrão, e você pode movê-los para onde quiser.

### 6.2. Diretório Raiz

- **`app`** — código central da aplicação (quase todas as classes).
- **`bootstrap`** — contém `app.php` (inicializa o framework) e o subdiretório `cache` (arquivos gerados para otimização, como route cache e services cache).
- **`config`** — todos os arquivos de configuração.
- **`database`** — migrations, model factories e seeds (e, opcionalmente, um SQLite).
- **`public`** — `index.php` (ponto de entrada) e assets (imagens, JS, CSS).
- **`resources`** — views, assets brutos (LESS/SASS/JS) e arquivos de idioma.
- **`routes`** — definições de rotas: `web.php` (grupo `web` com sessão, CSRF, cookies), `api.php` (grupo `api` com rate limiting, stateless), `console.php` (comandos Closure) e `channels.php` (broadcasting channels).
- **`storage`** — Blade compilado, sessões, caches e logs (subdividido em `app`, `framework`, `logs`). `storage/app/public` guarda arquivos de usuário (use `php artisan storage:link`).
- **`tests`** — testes automatizados (classes com sufixo `Test`).
- **`vendor`** — dependências do Composer.

### 6.3. O Diretório `app`

A maior parte da aplicação vive em `app`, namespaced como `App` e autoloadado via **PSR-4**.

`Console` e `Http` são "APIs" para o core: HTTP e CLI são mecanismos de interação, **não contêm lógica de negócio**. O `Console` tem os comandos Artisan; o `Http` tem controllers, middleware e form requests.

Diretórios gerados sob demanda pelos comandos `make:*`:
- `Console` — comandos Artisan e o console kernel.
- `Events` — classes de evento (criado por `event:generate`/`make:event`).
- `Exceptions` — handler de exceções.
- `Http` — controllers, middleware, requests.
- `Jobs` — queue jobs (criado por `make:job`).
- `Listeners` — handlers de eventos (criado por `event:generate`/`make:listener`).
- `Mail` — classes de e-mail (criado por `make:mail`).
- `Notifications` — notificações transacionais (criado por `make:notification`).
- `Policies` — políticas de autorização (criado por `make:policy`).
- `Providers` — service providers.
- `Rules` — regras de validação customizadas (criado por `make:rule`).

### 6.4. Onde colocar Services, Repositories, Contracts, etc.

Como o Laravel não impõe restrições (apenas PSR-4), a organização é convenção de equipe. Sugestões compatíveis com o 5.5:

```text
app/
├── Contracts/        # Interfaces (ex.: EventPusher, Repository interfaces)
│   └── EventPusher.php
├── Services/         # Classes de serviço (lógica de negócio reutilizável)
│   └── RedisEventPusher.php
├── Repositories/     # Camada de acesso a dados (Repository Pattern)
│   └── UserRepository.php
├── Models/           # Opcional: mover Eloquent models para cá (PSR-4)
│   └── User.php
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   └── Requests/
├── Providers/
└── ...
```

No `composer.json` (PSR-4) do Laravel 5.5:

```json
"autoload": {
    "psr-4": {
        "App\\": "app/"
    }
},
"autoload-dev": {
    "psr-4": {
        "Tests\\": "tests/"
    }
}
```

Como `App\` mapeia para `app/`, qualquer subdiretório vira um sub-namespace automaticamente (ex.: `app/Services/RedisEventPusher.php` → `App\Services\RedisEventPusher`). Após criar novos diretórios, rode `composer dump-autoload`.

---

## 7. Boas-práticas de Arquitetura

### 7.1. Fat Models / Thin Controllers

Mantenha os **controllers magros**: eles devem coordenar o fluxo (receber request, chamar serviços, retornar resposta), não conter regras de negócio. Coloque a lógica pesada nos models (Eloquent com escopes, mutators, relações) ou, melhor ainda, em **service classes**.

```php
// Ruim: lógica de negócio no controller
public function store(Request $request)
{
    $user = new User;
    $user->name = $request->name;
    $user->email = $request->email;
    $user->save();
    Mail::send(...);
    // 50 linhas de regra de negócio...
}

// Bom: controller magro, delega para serviço
public function store(StoreUserRequest $request, UserRegistrationService $service)
{
    $user = $service->register($request->validated());

    return redirect()->route('users.show', $user);
}
```

### 7.2. Service Classes (Classes de Serviço)

Uma *service class* encapsula uma operação de negócio ou um conjunto coeso de operações. Ela é resolvida pelo container e recebe suas dependências via construtor:

```php
<?php

namespace App\Services;

use App\User;
use Illuminate\Contracts\Mail\Mailer;
use Illuminate\Contracts\Hashing\Hasher;

class UserRegistrationService
{
    protected $hasher;
    protected $mailer;

    public function __construct(Hasher $hasher, Mailer $mailer)
    {
        $this->hasher = $hasher;
        $this->mailer = $mailer;
    }

    public function register(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $this->hasher->make($data['password']),
        ]);

        $this->mailer->send('emails.welcome', ['user' => $user], function ($m) use ($user) {
            $m->to($user->email)->subject('Bem-vindo!');
        });

        return $user;
    }
}
```

### 7.3. Repository Pattern (Opcional)

O padrão Repository isola a lógica de acesso a dados, facilitando troca de fonte (Eloquent → API externa, por exemplo) e testes. Combine com Contracts:

```php
// app/Contracts/UserRepository.php
namespace App\Contracts;

interface UserRepository
{
    public function find($id);
    public function all();
    public function create(array $data);
}
```

```php
// app/Repositories/EloquentUserRepository.php
namespace App\Repositories;

use App\Contracts\UserRepository;
use App\User;

class EloquentUserRepository implements UserRepository
{
    public function find($id) { return User::findOrFail($id); }
    public function all() { return User::all(); }
    public function create(array $data) { return User::create($data); }
}
```

```php
// app/Providers/RepositoryServiceProvider.php
public function register()
{
    $this->app->singleton(
        \App\Contracts\UserRepository::class,
        \App\Repositories\EloquentUserRepository::class
    );
}
```

> **Nota arquitetural:** O Repository Pattern é **opcional**. Muitas aplicações Laravel funcionam bem usando Eloquent diretamente nos services. Use repositories quando houver necessidade real de abstrair a fonte de dados ou quando a equipe preferir essa separação. Não o adicione "por default" — pode ser overengineering.

### 7.4. Uso de Contracts para Desacoplamento

Como visto nas seções 4 e 5, depender de `Illuminate\Contracts\*` (ou de seus próprios contracts) em vez de classes concretas permite trocar implementações sem tocar no código consumidor e torna os testes trivialmente "mockáveis". Combine contracts + service providers + (opcionalmente) facades.

### 7.5. Armadilhas (Pitfalls) no Laravel 5.5.50

1. **Usar facade em `register()`** — pode resolver serviços de providers não carregados ainda. Use `$this->app[...]` / `$this->app->make()` com cuidado e evite facades em `register()`.
2. **Dependência circular** — `A` depende de `B` que depende de `A`. O container lançará erro de resolução recursiva. Resolva refatorando (extrair interface, usar `extend`, ou injetar lazily via `make` dentro de um método em vez do construtor).
3. **Singleton vs bind** — usar `bind` para um serviço que deveria ser singleton (ex.: connection) causa múltiplas conexões/custo. Usar `singleton` para algo que deveria ser novo a cada vez (ex.: DTO) causa estado compartilhado indesejado.
4. **`Facade::clearResolvedInstances()` esquecido em testes** — instâncias cacheadas entre testes causam falsos positivos/negativos.
5. **`$defer = true` sem `provides()` completo** — serviço não listado pode não ser resolvido corretamente quando o provider é adiado.
6. **Guardar objetos não serializáveis em Jobs** — conexões, clients, container não sobrevivem à serialização da fila; injete no `handle()`.
7. **Scope creep com facades** — facades fáceis de usar encorajam classes gigantes com muitas responsabilidades. Use DI no construtor para ter "feedback visual" do tamanho da classe.
8. **`scoped()` não existe no 5.5** — não use; use `singleton` ou `bind`.

---

## Resumo de Pontos-Chave

- O **Service Container** gerencia dependências e faz DI; resolva com `make()`, `resolve()` ou injeção automática por type-hint (controllers, jobs, listeners, middleware, closures).
- Métodos de binding: `bind` (nova instância), `singleton` (instância única), `instance` (objeto existente), `bindIf` (condicional, nativo no 5.5), contextual binding (`when->needs->give`), `tag`/`tagged`, `extend`.
- **Facades** são proxies estáticos dinâmicos (`__callStatic`) para o container; testáveis via `shouldReceive`; criar customizada = binding + classe `getFacadeAccessor()` + alias em `config/app.php`; usar `clearResolvedInstances()` em testes.
- **Contracts** = interfaces core; garantem acoplamento fraco e testabilidade; trocar implementação = re-bind da interface no provider.
- **Service Providers**: `register()` apenas faz bindings; `boot()` roda depois de todos os providers e aceita DI; **deferred** no 5.5 usa `$defer = true` + `provides()` (sem `shouldDefer`); nunca usar facade em `register()`.
- **Estrutura**: `app/` é PSR-4 (`App\`); organize Services/Repositories/Contracts livremente; models ficam em `app/` por padrão; use `composer dump-autoload` ao criar diretórios.
- **Arquitetura**: thin controllers, service classes, repository pattern opcional, desacoplamento via contracts.

## Referências

- Documentação oficial Laravel 5.5 (seção Service Container) — `container.md`.
- Documentação oficial Laravel 5.5 (seção Facades) — `facades.md`.
- Documentação oficial Laravel 5.5 (seção Contracts) — `contracts.md`.
- Documentação oficial Laravel 5.5 (seção Service Providers) — `providers.md`.
- Documentação oficial Laravel 5.5 (seção Directory Structure) — `structure.md`.
- Repositório `illuminate/contracts` (tag 5.5) — lista completa de interfaces core.
- PSR-4 Autoloading Standard — http://www.php-fig.org/psr/psr-4/
- PSR-11 Container Interface — https://github.com/php-fig/fig-standards/blob/master/accepted/PSR-11-container.md

> Documento restrito à versão **Laravel 5.5.50 (LTS)**. Recursos de versões 5.6+ (inclusive `scoped()` de binding e `shouldDefer()` de providers) intencionalmente excluídos.
