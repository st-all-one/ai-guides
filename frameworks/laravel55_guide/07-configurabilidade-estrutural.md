# Configurabilidade Estrutural no Laravel 5.5.50

Este dossiê cobre, com o máximo de detalhe, todos os mecanismos de **configurabilidade estrutural** do Laravel 5.5.50 (LTS). Todo o conteúdo está ancorado na documentação oficial de 5.5 (`configuration.md`, `providers.md`, `structure.md`, `packages.md`, `deployment.md`, `lifecycle.md`, `contracts.md`) e em comportamentos estritos desta versão.

> **Aviso de versão (crítico):** Laravel 5.5 é a versão LTS que **introduziu o Package Auto-Discovery** — service providers e facades passaram a ser descobertos automaticamente via `composer.json` (`extra.laravel`). É também a versão na qual o comando `php artisan optimize` foi **removido** (tornado obsoleto/desnecessário graças a melhorias no op-code cache do PHP). Recursos de versões posteriores (ex.: `php artisan down --allow`, `php artisan config:clear` automático, etc.) **não** se aplicam aqui e são explicitamente marcados.

---

## 1. Arquivos de Configuração (`config/`)

Todos os arquivos de configuração do framework ficam no diretório `config/`, na raiz do projeto. Cada arquivo retorna um array PHP e cada opção é documentada inline. Você deve ler estes arquivos para conhecer as opções disponíveis (`configuration.md` > Introduction).

A árvore típica:

```
config/
    app.php
    auth.php
    broadcasting.php
    cache.php
    database.php
    filesystems.php
    mail.php
    queue.php
    services.php
    session.php
    view.php
    (seus próprios arquivos, ex.: config('riak'))
```

### 1.1 Acessando valores com `config()`

O helper global `config()` é usado em qualquer ponto da aplicação. A sintaxe é **dot notation**: `arquivo.opcao`. Um valor padrão pode ser passado como segundo argumento e é retornado se a opção não existir.

```php
// Lê config/app.php => 'name'
$value = config('app.name');

// Lê config/app.php => 'timezone'
$value = config('app.timezone');

// Com valor padrão
$value = config('app.nome_inexistente', 'fallback');
```

### 1.2 Configuração aninhada

Arrays multidimensionais são acessados encadeando pontos:

```php
// config/database.php:
// 'connections' => [ 'mysql' => [ 'host' => '127.0.0.1' ] ]

$host = config('database.connections.mysql.host');
```

### 1.3 Definindo valores em runtime

Passa-se um array para `config()` para sobrescrever um valor **durante a requisição atual**:

```php
config(['app.timezone' => 'America/Chicago']);
config(['database.connections.mysql.host' => '192.168.0.10']);
```

> **Armadilha (runtime):** Essa alteração **não persiste** em disco nem entre requisições. Ela vale apenas para o processo/PHP request em execução. Após o término da requisição, o valor volta ao definido nos arquivos de configuração. Não use `config([...])` como mecanismo de persistência de configuração.

### 1.4 `config:cache` e o perigo de `env()`

Para ganho de performance em produção, execute `php artisan config:cache`. Ele **combina todos os arquivos de configuração em um único arquivo** serializado, carregado rapidamente pelo framework (`configuration.md` > Configuration Caching, `deployment.md` > Optimizing Configuration Loading).

```bash
php artisan config:cache
```

> **Armadilha crítica (config:cache + env()):** Depois de rodar `config:cache`, o arquivo `.env` **não é mais carregado**. Qualquer chamada a `env()` fora dos arquivos de configuração retornará `null`. A regra de ouro: **use `env()` apenas dentro dos arquivos em `config/`**. Em tempo de execução normal, leia via `config('app.key')`, nunca via `env('APP_KEY')` fora do `config`.

```php
// CORRETO (dentro de config/app.php)
'debug' => env('APP_DEBUG', false),

// ERRADO em runtime (controller, modelo, etc.)
$key = env('APP_KEY'); // retorna null após config:cache
```

Recomendações de deploy (5.5):
- Rode `php artisan config:cache` no processo de deploy de **produção**, não em desenvolvimento local.
- Nunca use `php artisan optimize` — **removido no Laravel 5.5** (veja Seção 9).

> **Nota packages.md:** Você **não deve** definir Closures em arquivos de configuração. Eles não são serializados corretamente quando o usuário executa `config:cache`.

---

## 2. Ambiente (`.env` / `.env.example`)

O Laravel utiliza a biblioteca [DotEnv](https://github.com/vlucas/phpdotenv) de Vance Lucas para carregar variáveis de ambiente (`configuration.md` > Environment Configuration).

### 2.1 Arquivos

- `.env.example`: vem com a instalação limpa. Contém placeholders das variáveis necessárias. Deve ser **commitado** no controle de versão para que outros desenvolvedores saibam quais variáveis existem.
- `.env`: arquivo real de ambiente. **NÃO deve ser commitado** (deve estar no `.gitignore`). Contém credenciais sensíveis específicas de cada desenvolvedor/servidor.
- `.env.testing`: opcional. Sobrepõe `.env` ao rodar PHPUnit ou comandos Artisan com `--env=testing`.

```bash
# Renomear manualmente se instalou via Composer sem o rename automático
cp .env.example .env
php artisan key:generate   # gera APP_KEY
```

### 2.2 Carregamento e sobrescrita

Todas as variáveis do `.env` são carregadas para a superglobal `$_ENV` quando a aplicação recebe uma requisição. Porém, o acesso recomendado é via helper `env()`.

```php
// env(key, default)
'debug' => env('APP_DEBUG', false),
```

> **Dica oficial:** Qualquer variável no `.env` pode ser sobrescrita por variáveis de ambiente externas (nível de servidor/sistema). Por exemplo, definir `APP_ENV` no servidor web sobrepõe o do `.env`.

### 2.3 `APP_KEY` e segurança

`APP_KEY` (em `config/app.php` como `'key' => env('APP_KEY')`) é a chave usada pelo `Encrypter` para criptografia de cookies/sessões. Deve ser gerada com `php artisan key:generate` e **nunca commitada**. O `.env` é risco de segurança se exposto no controle de versão, pois revela credenciais.

### 2.4 Diferença entre `env()` e `config()`

| Aspecto | `env()` | `config()` |
|--------|---------|-----------|
| Fonte | `.env` / variáveis de sistema | array mesclado de `config/` (+ cache) |
| Uso permitido | **somente** dentro de `config/*.php` | em qualquer ponto da aplicação |
| Pós `config:cache` | retorna `null` fora do config | funciona normalmente |
| Propósito | ler ambiente cru | ler configuração já resolvida |

Regra: nos controllers/modelos/serviços, sempre use `config('app.foo')`, nunca `env('APP_FOO')`.

### 2.5 Detecção do ambiente atual

O ambiente é definido pela variável `APP_ENV` do `.env` (ou sobrescrita por `APP_ENV` de servidor).

```php
$environment = App::environment();

if (App::environment('local')) {
    // ambiente local
}

if (App::environment(['local', 'staging'])) {
    // local OU staging
}
```

---

## 3. Service Providers como mecanismo de configuração estrutural

Service providers são o **ponto central de bootstrapping** de toda a aplicação Laravel — tanto a sua aplicação quanto os serviços core do framework são inicializados por eles (`providers.md` > Introduction). Eles registram bindings no container, listeners de eventos, middleware e até rotas. São o lugar central para **configurar a aplicação**.

### 3.1 Onde ficam registrados

No `config/app.php`, no array `providers`:

```php
'providers' => [
    // Laravel Framework Service Providers...
    Illuminate\Auth\AuthServiceProvider::class,
    Illuminate\Broadcasting\BroadcastServiceProvider::class,
    Illuminate\Bus\BusServiceProvider::class,
    Illuminate\Cache\CacheServiceProvider::class,
    Illuminate\Foundation\Providers\ConsoleSupportServiceProvider::class,
    Illuminate\Cookie\CookieServiceProvider::class,
    Illuminate\Database\DatabaseServiceProvider::class,
    Illuminate\Encryption\EncryptionServiceProvider::class,
    Illuminate\Filesystem\FilesystemServiceProvider::class,
    Illuminate\Foundation\Providers\FormRequestServiceProvider::class,
    Illuminate\Foundation\Providers\FoundationServiceProvider::class,
    Illuminate\Mail\MailServiceProvider::class,
    Illuminate\Notifications\NotificationServiceProvider::class,
    Illuminate\Pagination\PaginationServiceProvider::class,
    Illuminate\Pipeline\PipelineServiceProvider::class,
    Illuminate\Queue\QueueServiceProvider::class,
    Illuminate\Redis\RedisServiceProvider::class,
    Illuminate\Auth\Passwords\PasswordResetServiceProvider::class,
    Illuminate\Session\SessionServiceProvider::class,
    Illuminate\Translation\TranslationServiceProvider::class,
    Illuminate\Validation\ValidationServiceProvider::class,
    Illuminate\View\ViewServiceProvider::class,

    // Application Service Providers...
    App\Providers\AppServiceProvider::class,
    App\Providers\AuthServiceProvider::class,
    App\Providers\BroadcastServiceProvider::class,
    App\Providers\EventServiceProvider::class,
    App\Providers\RouteServiceProvider::class,
],
```

Muitos são **deferred providers** (deferidos): não são carregados a cada requisição, apenas quando o serviço que fornecem é realmente necessário.

### 3.2 `register` vs `boot`

Todo provider estende `Illuminate\Support\ServiceProvider` e geralmente contém dois métodos.

#### `register()`

Usado **apenas** para vincular coisas ao service container. **Nunca** registre listeners de eventos, rotas ou qualquer outra funcionalidade aqui — você pode acidentalmente usar um serviço de um provider que ainda não foi carregado (`providers.md` > The Register Method).

```php
<?php

namespace App\Providers;

use Riak\Connection;
use Illuminate\Support\ServiceProvider;

class RiakServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(Connection::class, function ($app) {
            return new Connection(config('riak'));
        });
    }
}
```

Gerar um provider:

```bash
php artisan make:provider RiakServiceProvider
```

#### `boot()`

Chamado **após todos os outros providers terem sido registrados**, logo você tem acesso a todos os serviços já registrados. É o lugar para view composers, macros, rotas, listeners, etc. (`providers.md` > The Boot Method).

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class ComposerServiceProvider extends ServiceProvider
{
    public function boot()
    {
        view()->composer('view', function () {
            //
        });
    }
}
```

#### Injeção de dependências no `boot()`

Você pode type-hint dependências no `boot()`; o container as injeta automaticamente:

```php
use Illuminate\Contracts\Routing\ResponseFactory;

public function boot(ResponseFactory $response)
{
    $response->macro('caps', function ($value) {
        //
    });
}
```

### 3.3 Ordem de boot

Segundo o `lifecycle.md` (Focus On Service Providers):

1. `public/index.php` carrega o autoloader do Composer e obtém a instância da aplicação de `bootstrap/app.php`.
2. A aplicação cria a instância do service container.
3. O HTTP Kernel executa os **bootstrappers** (configuram erros, logs, **detectam o ambiente**, etc.).
4. **Todos** os providers listados em `config/app.php` (`providers`) têm seu método **`register()` chamado primeiro**.
5. **Depois** que todos terminaram de registrar, o método **`boot()` de cada provider é chamado**.
6. A requisição é entregue ao router.

> **Armadilha de ordenação:** Como `boot()` só roda após todos os `register()`, você pode referenciar livremente serviços de outros providers dentro de `boot()`. Porém, dentro de `register()` você **não pode** confiar em serviços de outros providers terem sido registrados — faça lazy resolution via Closure no container (`$this->app->singleton(...)`), que só executa quando o serviço é resolvido.

### 3.4 Providers de terceiros e carregamento condicional

Para registrar seu provider, adicione a classe ao array `providers` (manualmente, caso o pacote não use auto-discovery — veja Seção 4):

```php
'providers' => [
    // ...
    App\Providers\ComposerServiceProvider::class,
],
```

**Carregamento condicional** (ex.: só em ambiente local) pode ser feito no `register()` do `AppServiceProvider` ou manipulando o array em `config/app.php` dinamicamente. Um padrão comum em 5.5 é registrar providers condicionalmente no `bootstrap/app.php` ou em um provider base, examinando `App::environment()`:

```php
// Exemplo: registrar provider só em ambiente local
if ($this->app->environment('local')) {
    $this->app->register(\Barryvdh\Debugbar\ServiceProvider::class);
}
```

> Nota: em 5.5 o padrão recomendado é usar Package Auto-Discovery (Seção 4) em vez de registro manual.

### 3.5 Deferred Providers

Se o provider **apenas** registra bindings no container, você pode adiar seu carregamento até que um desses bindings seja realmente necessário. Isso melhora a performance (o arquivo não é lido do filesystem a cada requisição).

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

O Laravel compila e armazena a lista de serviços fornecidos por providers deferidos; o provider só é carregado quando o serviço é resolvido.

---

## 4. Package Auto-Discovery (feature do Laravel 5.5)

Esta é a **grande novidade estrutural do Laravel 5.5** (`releases.md` > Package Discovery, `packages.md` > Package Discovery).

Em versões anteriores, instalar um pacote exigia passos manuais: adicionar o service provider ao array `providers` de `config/app.php` e registrar facades. **A partir do Laravel 5.5**, o framework detecta e registra automaticamente service providers e facades.

```bash
composer require barryvdh/laravel-debugbar
# O debug bar já fica disponível, sem configuração extra
```

### 4.1 Como funciona (lado do pacote)

O desenvolvedor do pacote declara providers e aliases no `extra.laravel` do seu `composer.json`:

```json
"extra": {
    "laravel": {
        "providers": [
            "Barryvdh\\Debugbar\\ServiceProvider"
        ],
        "aliases": {
            "Debugbar": "Barryvdh\\Debugbar\\Facade"
        }
    }
}
```

Uma vez configurado, o Laravel **registra automaticamente** o provider e a facade ao instalar o pacote — experiência de instalação conveniente para o usuário.

### 4.2 Como desabilitar (lado do consumidor)

Se você quiser desabilitar a descoberta de um pacote específico, liste-o no `extra.laravel.dont-discover` do **seu** `composer.json`:

```json
"extra": {
    "laravel": {
        "dont-discover": [
            "barryvdh/laravel-debugbar"
        ]
    }
}
```

Para desabilitar a descoberta de **todos** os pacotes, use o curinga `*`:

```json
"extra": {
    "laravel": {
        "dont-discover": [
            "*"
        ]
    }
}
```

> **Benefícios do auto-discovery:** elimina edição manual de `config/app.php`, reduz erros de instalação, mantém o array `providers` mais enxuto e simplifica upgrades de pacotes.

---

## 5. Estrutura de Pastas (Directory Structure)

O Laravel impõe **quase nenhuma restrição** sobre onde uma classe está — desde que o Composer consiga autoloadá-la (PSR-4). A estrutura padrão é um ponto de partida para apps pequenos e grandes (`structure.md`).

### 5.1 Diretório raiz

| Diretório | Conteúdo |
|-----------|----------|
| `app/` | código central da aplicação (quase todas as classes) |
| `bootstrap/` | `app.php` que bootstrapa o framework; subdiretório `cache/` com arquivos gerados (route cache, services cache) |
| `config/` | todos os arquivos de configuração |
| `database/` | migrations, model factories, seeds; pode conter SQLite |
| `public/` | `index.php` (entry point), assets (imagens, JS, CSS) |
| `resources/` | views, assets brutos (LESS/SASS/JS), arquivos de idioma (`lang`) |
| `routes/` | definições de rotas (`web.php`, `api.php`, `console.php`, `channels.php`) |
| `storage/` | Blade compilado, sessions em arquivo, caches, logs; dividido em `app`, `framework`, `logs` |
| `tests/` | testes automatizados (PHPUnit) |
| `vendor/` | dependências do Composer |

Detalhes relevantes para configurabilidade:
- **`routes/web.php`**: rotas no grupo de middleware `web` (session, CSRF, cookie encryption).
- **`routes/api.php`**: rotas no grupo `api` (rate limiting, stateless).
- **`routes/console.php`**: comandos Closure-based (entry points de console).
- **`routes/channels.php`**: canais de broadcasting.
- **`storage/app/public`**: arquivos de usuário publicamente acessíveis; criar symlink com `php artisan storage:link` → `public/storage`.
- **`bootstrap/cache/`**: abriga o route cache e o services cache (relacionado a `route:cache`/`config:cache`).

### 5.2 O diretório `app/`

Por padrão namespaced em `App` (PSR-4). Contém subdiretórios gerados por Artisan:
- `Console/` — comandos Artisan + Console Kernel (agendamento).
- `Events/`, `Listeners/` — eventos e handlers (criados via `event:generate`, `make:event`, `make:listener`).
- `Exceptions/` — handler de exceções.
- `Http/` — controllers, middleware, form requests.
- `Jobs/` — queued jobs (`make:job`).
- `Mail/` — classes de e-mail (`make:mail`).
- `Notifications/` — notificações (`make:notification`).
- `Policies/` — policies de autorização (`make:policy`).
- `Providers/` — service providers da aplicação.
- `Rules/` — regras de validação (`make:rule`).

> **Onde estão os Models?** Não há diretório `models/` por padrão (intencional — "model" é ambíguo). Eloquent models ficam em `app/` diretamente; você pode movê-los para onde quiser.

### 5.3 Organização manual de Domains/Modules

Como o Laravel não impõe estrutura, você pode criar namespaces próprios para Domains/Modules e registrá-los no PSR-4 do `composer.json`:

```json
"autoload": {
    "psr-4": {
        "App\\": "app/",
        "Domain\\": "app/Domain/"
    }
}
```

```php
// app/Domain/Orders/OrderRepository.php
namespace Domain\Orders;

class OrderRepository { /* ... */ }
```

Em seguida, registre os service providers do módulo em `config/app.php` (ou via auto-discovery) e carregue suas rotas/views/migrations a partir do provider do módulo, usando os métodos do `ServiceProvider` (Seção 6).

---

## 6. Recursos de Pacotes e Configuração de Terceiros

Em `packages.md`, vemos como um pacote expõe configurabilidade estrutural via service provider.

### 6.1 Publicando configuração

```php
public function boot()
{
    $this->publishes([
        __DIR__.'/path/to/config/courier.php' => config_path('courier.php'),
    ]);
}
```

Após `php artisan vendor:publish`, o usuário acessa como qualquer config:

```php
$value = config('courier.option');
```

> **Não defina Closures** em arquivos de configuração (não serializam com `config:cache`).

### 6.2 Merge de configuração padrão

Para permitir sobrescrita parcial, mescle a config do pacote com a publicada (no `register()`):

```php
public function register()
{
    $this->mergeConfigFrom(
        __DIR__.'/path/to/config/courier.php', 'courier'
    );
}
```

> **Armadilha:** `mergeConfigFrom` **só mescla o primeiro nível** do array. Se o usuário define parcialmente um array multidimensional, as opções ausentes não serão mescladas.

### 6.3 Outros recursos carregáveis em `boot()`

- `loadRoutesFrom(__DIR__.'/routes.php')` — carrega rotas, respeitando route cache.
- `loadMigrationsFrom(__DIR__.'/migrations')` — migrations rodam com `php artisan migrate`.
- `loadTranslationsFrom(__DIR__.'/translations', 'courier')` — usa sintaxe `courier::file.line`; publicável para `resources/lang/vendor`.
- `loadViewsFrom(__DIR__.'/views', 'courier')` — usa sintaxe `courier::view`; permite override em `resources/views/vendor/courier`.
- `commands([FooCommand::class, BarCommand::class])` — registra comandos Artisan (ideal envolver em `if ($this->app->runningInConsole())`).
- `publishes([...], 'public')` / tags — publica assets e grupos de arquivos (`vendor:publish --tag=config`).

---

## 7. Environment Detection e a Application Instance

A instância da aplicação (`Illuminate\Foundation\Application`) é o service container e o núcleo do bootstrapping (`lifecycle.md`). Obtida em `bootstrap/app.php`.

- **Detecção de ambiente** ocorre nos bootstrappers do HTTP Kernel antes da requisição ser tratada (`configuration.md` > Determining The Current Environment).
- Acessada via facade `App` ou `app()`:
  - `App::environment()` — retorna o ambiente atual.
  - `App::environment('local')` — checagem booleana.
  - `App::environment(['local','staging'])` — OR.
- A instância é o container: `$this->app` dentro de providers.
- `app()->environment()`, `app('config')`, etc.

> A detecção pode ser sobrescrita por `APP_ENV` de nível de servidor (útil para compartilhar a mesma aplicação entre configs de ambiente distintas).

---

## 8. Maintenance Mode (Modo de Manutenção)

Quando ativo, uma view customizada é exibida para todas as requisições. Um check de maintenance mode está incluído no middleware stack padrão; se ativo, lança `MaintenanceModeException` com status **503** (`configuration.md` > Maintenance Mode).

### 8.1 Ativar / desativar

```bash
php artisan down
php artisan up
```

Opções do `down`:

```bash
php artisan down --message="Upgrading Database" --retry=60
```

- `--message`: mensagem customizada (exibida/registrada).
- `--retry`: define o header HTTP `Retry-After`.

### 8.2 Página 503 customizada

Defina `resources/views/errors/503.blade.php` para customizar o template.

### 8.3 Allow IPs (verificação de versão)

> **Importante para 5.5.50:** O comando `php artisan down --allow=127.0.0.1` **NÃO existe no Laravel 5.5**. A opção `--allow` para liberar IPs específicos durante o modo de manutenção foi introduzida apenas no **Laravel 5.6**. Na versão 5.5.50, para permitir acesso de IPs específicos (ex.: sua equipe) durante a manutenção, você precisa de uma **solução alternativa**, como:
> - Um middleware customizado que verifica o IP e bypassa o maintenance check; ou
> - Usar uma ferramenta de deploy com zero-downtime (ex.: Envoyer), recomendada pelo próprio `configuration.md` como alternativa ao maintenance mode.

### 8.4 Manutenção e filas

Enquanto a aplicação está em maintenance mode, **nenhum queued job é processado**. Os jobs continuam normalmente após `php artisan up`.

---

## 9. Macros e Extensibilidade Estrutural (Macroable)

O Laravel 5.5 disponibiliza o trait `Macroable` em várias classes centrais, permitindo estender estruturalmente o framework em runtime, tipicamente a partir do `boot()` de um service provider (padrão visto em `providers.md` Boot Method Dependency Injection com `ResponseFactory`).

Exemplos de classes Macroable em 5.5: `Illuminate\Support\Collection`, `Illuminate\Support\Facades\Response` (via `ResponseFactory`), `Illuminate\Routing\Router`, `Illuminate\Cache\Repository`, entre outras.

```php
// Em AppServiceProvider::boot() — estende ResponseFactory
use Illuminate\Contracts\Routing\ResponseFactory;

public function boot(ResponseFactory $response)
{
    $response->macro('caps', function ($value) {
        return $response->make(strtoupper($value));
    });
}

// Uso em um controller:
return response()->caps('hello'); // "HELLO"
```

```php
// Estendendo Collection em runtime
use Illuminate\Support\Collection;

Collection::macro('toUpper', function () {
    return $this->map(function ($value) {
        return is_string($value) ? strtoupper($value) : $value;
    });
});

collect(['a','b'])->toUpper(); // ['A','B']
```

> Macros registrados em `boot()` de um provider ficam disponíveis globalmente para toda a aplicação. Como `boot()` roda após todos os providers, as dependências necessárias já estão resolvidas.

---

## 10. Condicionais de ambiente em configuração

Um dos usos centrais do `.env` é ter valores diferentes por ambiente (ex.: driver de cache diferente em local vs produção). Isso se faz **dentro dos arquivos `config/`**, usando `env()` com defaults:

```php
// config/cache.php
'default' => env('CACHE_DRIVER', 'file'),

// config/database.php
'default' => env('DB_CONNECTION', 'mysql'),

// config/queue.php
'default' => env('QUEUE_CONNECTION', 'sync'),

// config/app.php
'debug' => env('APP_DEBUG', false),
'env' => env('APP_ENV', 'production'),
```

Exemplo de condicional explícita por ambiente dentro de um arquivo de config:

```php
// config/logging.php (estilo 5.5)
'default' => env('LOG_CHANNEL', 'stack'),

'channels' => [
    'stack' => [
        'driver' => 'stack',
        'channels' => ['single'],
    ],
    'single' => [
        'driver' => 'single',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'debug'),
    ],
],
```

E em runtime, para decidir comportamento:

```php
if (app()->environment('production')) {
    // usar driver de cache Redis
} else {
    // usar driver file
}
```

> Regra reforçada: a escolha do driver por ambiente deve ser feita lendo `env()` **no config**, e consumida via `config()` em runtime. Após `config:cache`, o `.env` não carrega — por isso a resolução de ambiente deve estar consolidada nos arquivos de config.

---

## 11. Armadilhas e notas específicas do Laravel 5.5.50

1. **`env()` retorna `null` após `config:cache`** se chamado fora de `config/`. Sempre leia via `config()`.
2. **`config([...])` em runtime não persiste** — vale só para a requisição atual.
3. **`php artisan optimize` foi removido no 5.5** — não aparece mais; remova-o de scripts de deploy. Use `composer install --optimize-autoloader`, `config:cache` e `route:cache` (deploy.md).
4. **`mergeConfigFrom` só mescla o primeiro nível** do array de configuração.
5. **Não use Closures em arquivos de config** (quebram `config:cache` por não serializarem).
6. **Ordem de providers:** `register()` de todos antes de qualquer `boot()`. Não dependa de serviços externos dentro de `register()`.
7. **`down --allow` não existe em 5.5** — use middleware ou zero-downtime deploy.
8. **Package Auto-Discovery é do 5.5** — não edite `config/app.php` manualmente para pacotes que já declaram `extra.laravel`; use `dont-discover` se precisar desabilitar.
9. **`route:cache` exige rotas baseadas em controller** (Closures não serializam — deploy.md note).
10. **`.env` nunca é commitado**; apenas `.env.example`. Credenciais expostas no VCS são risco de segurança.
11. **APP_KEY ausente/inválida** quebra criptografia de cookies/sessão — rode `php artisan key:generate`.
12. **`config:cache` em desenvolvimento** atrapalha (exige limpar cache a cada mudança); rode apenas em produção.

---

## Resumo de Pontos-Chave

- **Configuração** vive em `config/*.php`, acessada por `config('arquivo.opcao')` com dot notation; `config([...])` altera só em runtime (não persiste).
- **Ambiente** via `.env` + helper `env()` (somente dentro de `config/`); `.env` não vai para VCS; `.env.example` sim.
- **`config:cache`** acelera produção, mas faz `env()` retornar `null` fora do config — regra de ouro.
- **Service Providers** são o mecanismo estrutural central: `register()` (bindings only) → todos → `boot()` (resto). Ordem importa.
- **Deferred providers** (`$defer = true` + `provides()`) melhoram performance quando só registram bindings.
- **Package Auto-Discovery (5.5)** registra providers/facades via `composer.json` `extra.laravel`; desabilitável com `dont-discover` (ou `*` para todos).
- **Estrutura de pastas** é flexível (PSR-4); organize Domains/Modules como quiser, registrando providers e recursos.
- **Maintenance mode** com `down`/`up`, 503 customizável, sem `--allow` no 5.5 (veio no 5.6).
- **Macros (Macroable)** estendem Collection, Router, Response etc. a partir de `boot()`.
- **`php artisan optimize` removido no 5.5**; use autoloader optimization + `config:cache` + `route:cache`.
- **Contracts** (`Illuminate\Contracts\*`) definem interfaces dos serviços core, permitindo desacoplamento e substituição de implementações — são a fundação da configurabilidade via container.

---

## Referências

- `configuration.md` (Configuration, Environment, Maintenance Mode) — `/home/one/p/one/ai-guides/TMP/laravel5.5/configuration.md`
- `providers.md` (Service Providers, register/boot, deferred) — `/home/one/p/one/ai-guides/TMP/laravel5.5/providers.md`
- `structure.md` (Directory Structure) — `/home/one/p/one/ai-guides/TMP/laravel5.5/structure.md`
- `packages.md` (Package Discovery, Resources, Config merge) — `/home/one/p/one/ai-guides/TMP/laravel5.5/packages.md`
- `deployment.md` (Optimization, config:cache, route:cache) — `/home/one/p/one/ai-guides/TMP/laravel5.5/deployment.md`
- `lifecycle.md` (Request Lifecycle, Service Providers boot order) — `/home/one/p/one/ai-guides/TMP/laravel5.5/lifecycle.md`
- `contracts.md` (Contracts vs Facades, Contract Reference) — `/home/one/p/one/ai-guides/TMP/laravel5.5/contracts.md`
- `releases.md` (Package Discovery feature do 5.5) — `/home/one/p/one/ai-guides/TMP/laravel5.5/releases.md`
- `upgrade.md` (remoção de `optimize`) — `/home/one/p/one/ai-guides/TMP/laravel5.5/upgrade.md`

*Versão documentada: Laravel 5.5.50 (LTS). Nenhum recurso de versões posteriores (ex.: `down --allow`, `config:clear`, model factories em `app/Models`, etc.) foi incluído.*
