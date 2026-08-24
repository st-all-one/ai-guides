# Logs e Tratamento de Erros no Laravel 5.5.50

Este dossiê cobre, com o máximo de detalhe, o sistema de **logs** e o **tratamento de erros/exceções** do Laravel **5.5.50 (LTS)**. Todo o conteúdo foi conferido contra a documentação oficial da série 5.5 (`errors.md`, `configuration.md`, `helpers.md`) e contra o comportamento estrito dessa release. Recursos de versões posteriores (em especial o `config/logging.php` com múltiplos *channels* e o driver `daily` com a opção `days`) **não** se aplicam ao 5.5.50 e são tratados em nota específica abaixo.

> **Nota de versão (crítica):** No Laravel 5.5.50 **não existe** o arquivo `config/logging.php` nem o conceito de *log channels* (esse é um recurso do Laravel 5.6+). Toda a configuração de log no 5.5.50 vive em **`config/app.php`** através das chaves `log`, `log_level`, `log_max_files` e `log_channel`. A retenção de arquivos rotativos é controlada por `log_max_files` (não por `days`). Onde este dossiê menciona `days`, trata-se de esclarecimento comparativo com o 5.6 — **não use `days` no 5.5.50**.

---

## 1. Introdução

Ao criar um novo projeto Laravel, o tratamento de erros e exceções já vem configurado. Toda exceção disparada pela aplicação é processada pela classe `App\Exceptions\Handler`, que é responsável por **registrar (log)** a exceção e, em seguida, **renderizá-la** de volta ao usuário.

Para logging, o Laravel utiliza a biblioteca [Monolog](https://github.com/Seldaek/monolog), que oferece uma ampla variedade de *handlers* poderosos. O framework já pré-configura diversos desses handlers, permitindo escolher entre:

- um **único arquivo** de log (`single`);
- arquivos de log **rotativos por dia** (`daily`);
- escrita no **syslog** do sistema (`syslog`);
- escrita no **error log** do PHP/SAPI (`errorlog`).

Não há, no 5.5.50, roteamento para múltiplos canais nomeados, nem driver `slack`/`stack` dedicado via arquivo de configuração de canais.

---

## 2. Configuração de Log no Laravel 5.5.50

### 2.1 Onde configurar

No Laravel 5.5.50, a configuração de log está em `config/app.php`. Os quatro valores relevantes são:

| Chave em `config/app.php` | Variável de ambiente | Valores possíveis | Default | Função |
|---|---|---|---|---|
| `log` | `APP_LOG` | `single`, `daily`, `syslog`, `errorlog` | `single` | Define o *driver* de armazenamento do log |
| `log_level` | `APP_LOG_LEVEL` | `debug`…`emergency` | `debug` | Nível mínimo de severidade registrado |
| `log_max_files` | `APP_LOG_MAX_FILES` | inteiro | `5` | (somente `daily`) nº de dias retidos |
| `log_channel` | `APP_LOG_CHANNEL` | string | nome da app | Nome do canal Monolog (ambiente) |

Exemplo de trecho típico de `config/app.php` no 5.5.50:

```php
'log' => env('APP_LOG', 'single'),

'log_level' => env('APP_LOG_LEVEL', 'debug'),

/*
 |--------------------------------------------------------------------------
 | Maximum Number Of Log Files
 |--------------------------------------------------------------------------
 |
 | Para o driver "daily", este número define quantos arquivos de log
 | (dias) serão mantidos antes de os mais antigos serem descartados.
 | O padrão é 5 dias.
 |
 */
'log_max_files' => env('APP_LOG_MAX_FILES', 5),

'log_channel' => env('APP_LOG_CHANNEL', env('APP_NAME', 'laravel')),
```

### 2.2 Drivers de armazenamento (`log`)

#### `single` (padrão)
Escreve tudo em um único arquivo `storage/logs/laravel.log`. Simples, mas o arquivo cresce indefinidamente e exige *rotate* externo (ex.: `logrotate`) em produção.

```php
'log' => 'single',
```

#### `daily`
Cria um arquivo de log por dia (`laravel-YYYY-MM-DD.log`) e **automaticamente descarta** os arquivos mais antigos. No 5.5.50 a retenção é controlada por `log_max_files` (quantidade de arquivos/dias), com **default de 5 dias**. Para alterar:

```php
// config/app.php
'log' => 'daily',
'log_max_files' => 30,   // mantém 30 dias de logs
```

> **Comparação 5.6+ (para não confundir):** no Laravel 5.6+, a retenção do `daily` passou a ser a opção `days` dentro do `config/logging.php`. No 5.5.50 **não existe** `days`; use `log_max_files`. Não inclua a chave `days` em projetos 5.5.50.

#### `syslog`
Envia as mensagens para o *syslog* do sistema operacional (ideal em ambientes que já centralizam logs via syslog/rsyslog).

```php
'log' => 'syslog',
```

#### `errorlog`
Escreve no *error log* do PHP (definido pela diretiva `error_log` do `php.ini` ou no log do SAPI/webserver).

```php
'log' => 'errorlog',
```

### 2.3 Níveis de severidade (`log_level`)

O Monolog reconhece oito níveis de severidade, da menos para a mais severa (baseados na [RFC 5424](https://tools.ietf.org/html/rfc5424)):

```
debug < info < notice < warning < error < critical < alert < emergency
```

Por padrão (`log_level` = `debug`), **todos** os níveis são gravados. Em produção, convém subir o nível mínimo para reduzir ruído e volume. Com `log_level => 'error'`, o Laravel registra apenas mensagens de nível **error**, **critical**, **alert** e **emergency** (ou seja, "maior ou igual a" o nível configurado):

```php
// config/app.php
'log_level' => env('APP_LOG_LEVEL', 'error'),
```

### 2.4 Nome do canal (`log_channel`)

Por padrão, o Monolog é instanciado com um nome igual ao ambiente atual (`production`, `local`, etc.). Para customizar, ajuste `log_channel`:

```php
'log_channel' => env('APP_LOG_CHANNEL', 'my-app-name'),
```

### 2.5 Configuração customizada do Monolog

Se você precisar de controle total sobre como o Monolog é configurado (adicionar *handlers*, formatters, etc.), use o método `configureMonologUsing()` no `bootstrap/app.php`, **logo antes** do `return $app;`:

```php
$app->configureMonologUsing(function ($monolog) {
    $monolog->pushHandler(new \Monolog\Handler\StreamHandler(
        storage_path('logs/custom.log'), \Monolog\Logger::DEBUG
    ));
});

return $app;
```

---

## 3. Uso do `Log` Facade e do Helper `logger()`

### 3.1 O facade `Log`

O Laravel oferece uma camada de abstração simples sobre o Monolog através do facade `Illuminate\Support\Facades\Log`. Por padrão, o framework cria o arquivo de log em `storage/logs`.

```php
<?php

namespace App\Http\Controllers;

use App\User;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;

class UserController extends Controller
{
    public function showProfile($id)
    {
        Log::info('Showing user profile for user: '.$id);

        return view('user.profile', ['user' => User::findOrFail($id)]);
    }
}
```

Os oito métodos de nível, correspondentes à RFC 5424:

```php
Log::emergency($message);
Log::alert($message);
Log::critical($message);
Log::error($message);
Log::warning($message);
Log::notice($message);
Log::info($message);
Log::debug($message);
```

### 3.2 Informação de contexto (array contextual)

Um array de dados contextuais pode ser passado como segundo argumento. Esses dados são formatados e exibidos junto com a mensagem:

```php
Log::info('User failed to login.', ['id' => $user->id]);
```

Isso é fundamental para logging estruturado (ver Seção 9): em vez de concatenar variáveis na string, passe-as no array de contexto, mantendo a mensagem estável e os dados pesquisáveis.

### 3.3 O helper `logger()`

O helper global `logger()` escreve uma mensagem de nível **debug** no log:

```php
logger('Debug message');

logger('User has logged in.', ['id' => $user->id]);
```

Se nenhum valor for passado, ele retorna a **instância do logger**, permitindo chamar qualquer nível:

```php
logger()->error('You are not allowed here.');
```

### 3.4 Outros helpers de log

- `info('Some helpful information!')` — escreve nível `info`.
- `info('User login attempt failed.', ['id' => $user->id])` — `info` com contexto.

### 3.5 Acessando a instância Monolog subjacente

Para usar handlers adicionais do Monolog diretamente:

```php
$monolog = Log::getMonolog();
```

> Observação 5.5.50: o facade `Log` expõe `getMonolog()` para acessar a instância do Monolog. Não há `Log::channel()` ou `Log::stack()` — esses são recursos 5.6+.

---

## 4. Tratamento de Exceções

Toda exceção é tratada pela classe `App\Exceptions\Handler`, que contém dois métodos principais: `report()` e `render()`.

### 4.1 O método `report()`

O `report` é usado para **registrar** a exceção (log) ou enviá-la a um serviço externo (Bugsnag, Sentry, Flare, etc.). Por padrão, ele repassa a exceção à classe base, que a registra. Você pode logar da forma que desejar.

```php
/**
 * Report or log an exception.
 *
 * This is a great spot to send exceptions to Sentry, Bugsnag, etc.
 *
 * @param  \Exception  $exception
 * @return void
 */
public function report(Exception $exception)
{
    if ($exception instanceof CustomException) {
        // tratamento específico, ex.: log extra ou notificação
    }

    return parent::report($exception);
}
```

#### O helper `report()`

Às vezes é necessário **reportar** uma exceção mas **continuar** processando a requisição (sem renderizar página de erro). O helper `report()` faz exatamente isso, usando o método `report` do handler:

```php
public function isValid($value)
{
    try {
        // Validate the value...
    } catch (Exception $e) {
        report($e);

        return false;
    }
}
```

#### Ignorando exceções por tipo (`$dontReport`)

A propriedade `$dontReport` do handler contém um array de tipos de exceção que **não serão registradas** no log. Por exemplo, exceções de 404 e outros tipos comuns já não são gravadas. Você pode adicionar outros tipos:

```php
/**
 * A list of the exception types that should not be reported.
 *
 * @var array
 */
protected $dontReport = [
    \Illuminate\Auth\AuthenticationException::class,
    \Illuminate\Auth\Access\AuthorizationException::class,
    \Symfony\Component\HttpKernel\Exception\HttpException::class,
    \Illuminate\Database\Eloquent\ModelNotFoundException::class,
    \Illuminate\Validation\ValidationException::class,
];
```

Quando uma exceção cuja classe está em `$dontReport` é lançada, o Laravel **não a registra** no log (mas ainda a renderiza adequadamente, como a página 404).

### 4.2 O método `render()`

O `render` é responsável por converter uma exceção em uma **resposta HTTP** enviada ao navegador. Por padrão, a exceção é repassada à classe base, que gera a resposta. Você pode verificar o tipo e retornar sua própria resposta:

```php
/**
 * Render an exception into an HTTP response.
 *
 * @param  \Illuminate\Http\Request  $request
 * @param  \Exception  $exception
 * @return \Illuminate\Http\Response
 */
public function render($request, Exception $exception)
{
    if ($exception instanceof CustomException) {
        return response()->view('errors.custom', [], 500);
    }

    return parent::render($request, $exception);
}
```

#### Respostas diferenciadas por tipo de requisição (HTML vs JSON)

No 5.5.50, a distinção entre requisições web e API é feita manualmente dentro do `render()`. Um padrão comum é verificar `$request->expectsJson()`:

```php
public function render($request, Exception $exception)
{
    if ($exception instanceof CustomException) {
        if ($request->expectsJson()) {
            return response()->json([
                'error' => 'custom_error',
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->view('errors.custom', ['exception' => $exception], 500);
    }

    return parent::render($request, $exception);
}
```

> Nota: o método `render()` base do Laravel 5.5 já devolve respostas JSON automaticamente quando a requisição espera JSON (cabeçalho `Accept: application/json` ou `X-Requested-With`), então, na maioria dos casos, basta chamar `parent::render()`.

### 4.3 Exceções Renderable e Reportable (recurso do 5.5)

Em vez de fazer `instanceof` dentro de `report()` e `render()` no handler, o Laravel 5.5 permite definir métodos `report()` e `render()` **diretamente na própria classe de exceção**. Quando esses métodos existem, o framework os chama automaticamente, evitando o acúmulo de lógica condicional no handler:

```php
<?php

namespace App\Exceptions;

use Exception;

class RenderException extends Exception
{
    /**
     * Report the exception.
     *
     * @return void
     */
    public function report()
    {
        // ex.: Log::error('RenderException', ['msg' => $this->getMessage()]);
    }

    /**
     * Render the exception into an HTTP response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function render($request)
    {
        return response()->view('errors.custom', [], 500);
    }
}
```

Regras importantes no 5.5.50:

- Se a exceção define `report()`, ele é usado para o registro em vez do `$dontReport`/lógica global — mas ainda é possível combinar com o handler.
- Se define `render($request)`, ele produz a resposta HTTP; o `render()` do handler **não** precisa mais fazer `instanceof`.
- Para que o `report()` da exceção não seja executado (ex.: você quer silenciá-la), adicione a classe em `$dontReport` no handler — isso faz o framework pular o report automático.

### 4.4 Integração com serviços externos de relatório (conceitual)

O lugar correto para reportar a serviços externos (Sentry, Bugsnag, Flare, Rollbar, etc.) é o `report()` do handler (ou o `report()` da exceção renderable/reportable). O fluxo conceitual:

1. Instalar o pacote do serviço (ex.: `sentry/sentry-laravel`) e registrá-lo como *log channel*/handler Monolog ou como *exception handler* dedicado.
2. No `report()` do `App\Exceptions\Handler`, identificar a exceção e encaminhá-la:

```php
public function report(Exception $exception)
{
    if (app()->bound('sentry') && $this->shouldReport($exception)) {
        app('sentry')->captureException($exception);
    }

    return parent::report($exception);
}
```

3. Manter `$dontReport` para exceções que **não** devem ir a serviços externos (404, validação, autenticação).
4. Nunca expor *tokens* de API ou *DSN* no código — usar variáveis de ambiente (`config/services.php` + `.env`).

> No 5.5.50 não existe integração nativa "pronta" via `reportable()` em estilo closure (esse é recurso 5.7+). Use as classes de exceção ou o handler, como descrito.

---

## 5. HTTP Exceptions

Algumas exceções descrevem códigos de erro HTTP do servidor: "página não encontrada" (404), "não autorizado" (401/403), ou um 500 gerado deliberadamente. Para gerar essa resposta em qualquer ponto da aplicação, use o helper `abort()`:

```php
abort(404);
```

O `abort` lança imediatamente uma exceção que será renderizada pelo handler. Opcionalmente, forneça o texto da resposta:

```php
abort(403, 'Unauthorized action.');
```

### 5.1 `abort_if` e `abort_unless`

O helper `abort_if` lança uma exceção HTTP se uma expressão booleana for `true`:

```php
abort_if(! Auth::user()->isAdmin(), 403);
```

O `abort_unless` faz o inverso — lança se a expressão for `false`:

```php
abort_unless(Auth::user()->isAdmin(), 403);
```

Ambos aceitam, como terceiro argumento, o texto da resposta e, como quarto, um array de cabeçalhos HTTP customizados (mesmo comportamento do `abort`).

### 5.2 Páginas de erro HTTP customizadas

O Laravel facilita a exibição de páginas de erro personalizadas por código de status. Para customizar o 404, crie `resources/views/errors/404.blade.php`. Esse arquivo será servido em todos os 404 da aplicação. As views desse diretório devem ser nomeadas segundo o código HTTP correspondente. A instância de `HttpException` levantada por `abort()` é passada à view como a variável `$exception`:

```blade
{{-- resources/views/errors/404.blade.php --}}
<h2>{{ $exception->getMessage() }}</h2>
```

Exemplos comuns de arquivos:

```
resources/views/errors/403.blade.php
resources/views/errors/404.blade.php
resources/views/errors/419.blade.php   (CSRF token mismatch)
resources/views/errors/429.blade.php   (Too Many Requests)
resources/views/errors/500.blade.php
resources/views/errors/503.blade.php   (Maintenance Mode)
```

A view de fallback para erros 500 (e quaisquer outros sem arquivo específico) pode ser definida criando `resources/views/errors/500.blade.php`. Se não houver view para o código, o Laravel usa a página genérica de erro do framework (ver Seção 6 sobre `APP_DEBUG`).

> A página de *Maintenance Mode* (503) também pode ser customizada em `resources/views/errors/503.blade.php` e é ativada pelo `php artisan down`.

---

## 6. Ambiente, Debug e Ocultação de Erros

### 6.1 `APP_DEBUG` e `config/app.php` → `debug`

A opção `debug` em `config/app.php` determina **quanto** da informação de erro é exibido ao usuário. Por padrão, ela respeita a variável de ambiente `APP_DEBUG` (definida no `.env`):

```php
'debug' => env('APP_DEBUG', false),
```

- **Desenvolvimento local:** `APP_DEBUG=true` — exibe stack traces completos, queries, etc.
- **Produção:** `APP_DEBUG` **sempre** `false`. Deixar `true` em produção expõe valores sensíveis de configuração aos usuários finais.

### 6.2 Whoops em ambiente de debug

No Laravel 5.5, quando `APP_DEBUG=true`, as páginas de erro utilizam o pacote [Whoops](https://github.com/filp/whoops), que apresenta uma interface rica com o stack trace, variáveis de requisição, consultas SQL e mais. Quando `APP_DEBUG=false`, o Whoops é substituído por uma página de erro minimalista (e pelas views customizadas de `resources/views/errors/`, quando existirem).

### 6.3 Ocultar erros em produção

Em produção (`APP_DEBUG=false`):

- O usuário final **não** vê detalhes técnicos; recebe a view de erro adequada (ex.: `500.blade.php`) ou uma página genérica.
- As exceções ainda são **registradas** no log (salvo as de `$dontReport`), garantindo rastreabilidade sem exposição.
- Nunca logue senhas, tokens, chaves de API ou dados pessoais (ver Seção 9).

---

## 7. Helpers de Debugging

### 7.1 `dd()` — dump and die

O `dd` (dump and die) imprime as variáveis passadas e **encerra a execução** do script:

```php
dd($value);

dd($value1, $value2, $value3, ...);
```

Se não quiser interromper a execução, use `dump()`.

### 7.2 `dump()` — dump sem parar

O `dump` imprime as variáveis **sem** encerrar o script:

```php
dump($value);

dump($value1, $value2, $value3, ...);
```

### 7.3 `tap()`

O helper `tap()` (disponível no 5.5) permite "interagir" com um valor e ainda retorná-lo, útil para inspecionar/registrar algo no meio de uma cadeia de chamadas sem quebrá-la:

```php
$user = tap(User::find(1), function ($user) {
    logger()->info('Acessando usuário', ['id' => $user->id]);
});
// $user continua sendo a instância de User
```

Também existe a forma `tap($value, $callback)` (global) e o método `Collection::tap()` / `Macroable::tap()`. É útil para logar dentro de *pipelines* sem alterar o fluxo.

### 7.4 `logger()` como ferramenta de depuração

Como visto na Seção 3, `logger()` e `logger()-><level>()` são alternativas não bloqueantes ao `dd()` para acompanhar o fluxo em produção (onde `dd()` é inadequado).

---

## 8. Logging Estruturado e Boas Práticas de Nível

### 8.1 O que é logging estruturado no 5.5.50

"Estruturado" aqui significa: **mensagens estáveis + dados no array de contexto**, em vez de strings interpoladas. Isso mantém a mensagem como chave de busca e os dados como campos:

```php
// Ruim (difícil de filtrar, e pode vazar dados na string):
Log::info('Falha login usuario 42 ip 10.0.0.1');

// Bom (estruturado):
Log::info('Falha de login', [
    'user_id' => 42,
    'ip'      => $request->ip(),
]);
```

### 8.2 Quando usar cada nível

| Nível | Quando usar no 5.5.50 |
|---|---|
| `debug` | Informação detalhada para depuração em dev; fluxo de variáveis, payloads (sem segredos). |
| `info` | Eventos normais de negócio: "usuário logou", "pedido criado". `logger()`/`info()` escrevem aqui. |
| `notice` | Condições notáveis, mas não erros: uso de fallback, configuração obsoleta. |
| `warning` | Algo deu errado mas a operação continua: API lenta, retry, deprecation. |
| `error` | Erro que impediu uma operação específica, mas a aplicação segue: falha ao enviar e-mail. |
| `critical` | Falha crítica de componente: banco de dados fora do ar, disco cheio. |
| `alert` | Ação imediata necessária: site inteiro indisponível, pagamento falhando em massa. |
| `emergency` | Sistema inutilizável; acionar equipe já. |

Em produção, uma prática comum é `log_level => 'error'`, registrando só `error`/`critical`/`alert`/`emergency` e reduzindo volume e custo de armazenamento.

---

## 9. Armadilhas e Notas Específicas do 5.5.50

1. **`config/logging.php` não existe no 5.5.50.** Toda configuração de log é em `config/app.php` (`log`, `log_level`, `log_max_files`, `log_channel`). O arquivo `config/logging.php` e o sistema de *channels* (incluindo `days` no driver `daily` e drivers `slack`/`stack`) são do **Laravel 5.6+** e **não devem** ser usados em 5.5.50.

2. **Retenção `daily`:** no 5.5.50 é `log_max_files` (default **5** dias). Não use `days` (5.6+). Ajuste `log_max_files` para o período desejado.

3. **Log de dados sensíveis:** nunca passe senhas, tokens de sessão, chaves de API ou PII no primeiro argumento (string) nem no contexto sem sanitização. O Monolog grava o contexto como-array; cuidado ao logar entidades inteiras (`Log::info('user', [$user])` pode vazar colunas sensíveis).

4. **Performance de logs `daily`:** a rotação diária abre um novo arquivo por dia; sob tráfego muito alto, o volume de I/O pode ser relevante. Se necessário, use `syslog`/`errorlog` (que delega ao sistema) ou `single` com *logrotate* externo. Lembre-se de que `log_max_files` apenas remove arquivos antigos — não limita o tamanho de um único arquivo `single`.

5. **`$dontReport` vs serviços externos:** exceções em `$dontReport` (404, validação, auth) **não** são registradas. Se você integrar Sentry/Bugsnag no `report()`, essas também não chegarão ao serviço — confirme se é o comportamento desejado.

6. **`APP_DEBUG` em produção:** manter `true` expõe stack traces e valores de configuração. A regra de ouro é `false`. Combine com `log_level` adequado para não perder visibilidade.

7. **`config:cache` e `env()`:** se você rodar `php artisan config:cache` (recomendado em produção), o `.env` não é mais lido em runtime — todas as chamadas a `env()` fora dos arquivos de config retornam `null`. Mantenha `env()` apenas dentro de `config/*.php`. Como as chaves de log (`APP_LOG`, `APP_LOG_LEVEL`, etc.) são lidas em `config/app.php`, isso está correto; só não chame `env('APP_LOG')` em controllers/models.

8. **`getMonolog()` vs `channel()`:** no 5.5.50 use `Log::getMonolog()` para acessar o Monolog. `Log::channel('x')` não existe (5.6+).

9. **Helpers de log globais:** `info()` e `logger()` escrevem, respectivamente, nível `info` e `debug`. `logger()` sem argumento retorna a instância do logger, permitindo `logger()->error(...)`.

10. **Exceções renderable/reportable:** definir `render()`/`report()` na própria exceção evita `instanceof` no handler, mas lembre-se de que exceções em `$dontReport` continuam sem ser reportadas automaticamente.

---

## Resumo de Pontos-Chave

- No Laravel **5.5.50**, a configuração de log está em **`config/app.php`** (`log`, `log_level`, `log_max_files`, `log_channel`) — **não** em `config/logging.php` (esse é 5.6+).
- Quatro drivers disponíveis: **`single`**, **`daily`**, **`syslog`**, **`errorlog`**.
- Retenção de `daily` controlada por **`log_max_files`** (default **5** dias); **não** use `days` (5.6+).
- Oito níveis RFC 5424: `debug`, `info`, `notice`, `warning`, `error`, `critical`, `alert`, `emergency`; `log_level` define o mínimo registrado.
- Escreva logs com o facade `Log`, o helper `logger()` (debug) ou `info()`; passe dados no **array de contexto**.
- `App\Exceptions\Handler` possui `report()` e `render()`; `$dontReport` silencia tipos de exceção no log.
- O 5.5 introduziu exceções **renderable/reportable** (métodos `render()`/`report()` na própria exceção).
- `abort()`, `abort_if()`, `abort_unless()` geram `HttpException`; páginas customizadas em `resources/views/errors/<codigo>.blade.php`.
- `APP_DEBUG=false` em produção (Whoops só aparece com `true`); nunca exponha erros ao usuário final.
- Helpers de debug: `dd()` (dump + die), `dump()` (dump), `tap()` (inspeciona e retorna), `logger()`.
- Armadilhas: não logar dados sensíveis, cuidado com I/O de `daily`, não usar `env()` fora de `config/`, não portar recursos de `logging.php` do 5.6+.

## Referências

- Documentação oficial Laravel 5.5 — `errors.md` (Errors & Logging): configuração de log, Exception Handler (`report`/`render`), `$dontReport`, exceções renderable/reportable, HTTP exceptions, logging (facade, níveis, contexto, `getMonolog`).
- Documentação oficial Laravel 5.5 — `configuration.md` (Configuration): `APP_DEBUG`/`debug`, variáveis de ambiente, `config:cache`.
- Documentação oficial Laravel 5.5 — `helpers.md`: `abort_if()`, `abort_unless()`, `logger()`, `info()`, `dd()`, `dump()`, `config()`.
- Biblioteca [Monolog](https://github.com/Seldaek/monolog) e [RFC 5424](https://tools.ietf.org/html/rfc5424) (níveis de severidade).
- Nota de versionamento: `config/logging.php`, drivers `days`/`stack`/`slack` e `Log::channel()` pertencem ao Laravel **5.6+** e estão fora do escopo do 5.5.50.

PRONTO: 04-logs-erros.md
