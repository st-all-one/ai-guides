# Segurança no Laravel 5.5.50

Este dossiê cobre, com profundidade, os mecanismos de segurança disponíveis no **Laravel 5.5.50 (LTS)**. Todo o conteúdo baseia-se estritamente na documentação oficial de 5.5 e no comportamento daquele release. Recursos de versões posteriores (5.6, 5.7, 5.8, 6, 7, 8…) são **explicitamente sinalizados como indisponíveis** quando relevantes, para evitar armadilhas de compatibilidade.

> **Nota de versão crítica**: Laravel 5.5 utiliza **bcrypt** para hashing (Argon só chega em 5.6+), **AES-256-CBC** para criptografia, e **não possui** verificação de e-mail nativa (isso é 5.7+), nem a diretiva `@csrf` (5.6+) ou `@error` (5.8+). Use os equivalentes 5.5 descritos abaixo.

---

## 1. Autenticação

A autenticação no Laravel 5.5 é composta por dois conceitos centrais:

- **Guards**: definem *como* os usuários são autenticados a cada requisição (por exemplo, o guard `session` mantém estado via sessão e cookies).
- **Providers**: definem *como* os usuários são recuperados do armazenamento persistente (Eloquent ou query builder `database`).

O arquivo de configuração é `config/auth.php`. Aplicações novas já vêm com `App\User` (Eloquent) e os controllers de autenticação em `App\Http\Controllers\Auth`.

### 1.1 Guards: web vs api

O Laravel 5.5 já inclui, por padrão, os guards `web` e `api` em `config/auth.php`:

```php
'guards' => [
    'web' => [
        'driver' => 'session',
        'provider' => 'users',
    ],
    'api' => [
        'driver' => 'token',
        'provider' => 'users',
        'hash' => false,
    ],
],
```

- O guard **`web`** usa o driver `session` (cookie de sessão). É o guard padrão aplicado às rotas em `routes/web.php` (via grupo de middleware `web`).
- O guard **`api`** usa, por padrão no 5.5, o driver `token` (um `api_token` na tabela de usuários, enviado via query string ou header). Para APIs sem estado, também existe o método `Auth::once()` (sem sessão/cookie).

Para selecionar um guard específico, use `Auth::guard('nome')`:

```php
use Illuminate\Support\Facades\Auth;

if (Auth::guard('admin')->attempt($credentials)) {
    // autenticado com o guard 'admin'
}
```

### 1.2 Recuperando o usuário autenticado

Via facade `Auth`:

```php
use Illuminate\Support\Facades\Auth;

$user = Auth::user();   // instância do usuário autenticado
$id   = Auth::id();     // ID do usuário autenticado
```

Via instância de `Request` (injetada pelo container):

```php
public function update(Request $request)
{
    $user = $request->user(); // mesmo que Auth::user()
}
```

Verificando se está logado (embora, na prática, use middleware):

```php
if (Auth::check()) {
    // usuário autenticado
}
```

### 1.3 Autenticação manual com `Auth::attempt`

```php
use Illuminate\Support\Facades\Auth;

public function authenticate()
{
    if (Auth::attempt(['email' => $email, 'password' => $password])) {
        // autenticação passou
        return redirect()->intended('dashboard');
    }
    // credenciais inválidas
}
```

Detalhes de segurança importantes:

- O array passado a `attempt` é usado para **localizar** o usuário no banco (ex.: pela coluna `email`). Se o usuário for encontrado, o `password` informado é **automaticamente** hasheado com bcrypt e comparado ao hash armazenado. **Não hasheie** o `password` antes de passá-lo a `attempt`.
- O `attempt` retorna `true` em caso de sucesso e inicia a sessão autenticada.
- `redirect()->intended()` redireciona para a URL que o usuário tentava acessar antes de ser interceptado pelo middleware de autenticação (com fallback opcional).
- Condições extras podem ser adicionadas (ex.: exigir que a conta esteja ativa):

```php
if (Auth::attempt(['email' => $email, 'password' => $password, 'active' => 1])) {
    // usuário ativo, não suspenso e existente
}
```

### 1.4 Login direto (`Auth::login`, `loginUsingId`, `once`)

```php
Auth::login($user);            // login da instância (deve implementar Authenticatable)
Auth::login($user, true);      // login e "lembrar"
Auth::guard('admin')->login($user);

Auth::loginUsingId(1);         // login pelo ID primário
Auth::loginUsingId(1, true);   // login pelo ID e "lembrar"

if (Auth::once($credentials)) { // autentica apenas para a requisição atual (sem sessão/cookie)
    // útil para APIs stateless
}
```

A instância passada a `Auth::login()` deve implementar `Illuminate\Contracts\Auth\Authenticatable`. O `App\User` padrão já o faz.

### 1.5 "Remember Me"

Passe `true` como segundo argumento de `attempt`:

```php
if (Auth::attempt(['email' => $email, 'password' => $password], $remember)) {
    // usuário será lembrado por tempo indeterminado até logout manual
}
```

Requisitos e comportamento:

- A tabela `users` (ou equivalente) **deve** conter uma coluna `remember_token` do tipo string, nullable, com 100 caracteres.
- O método `viaRemember()` indica se o usuário foi autenticado pelo cookie "remember me":

```php
if (Auth::viaRemember()) {
    // autenticado via cookie "lembrar"
}
```

> **Armadilha**: o cookie "remember me" é um alvo de ataque (roubo de sessão). O `remember_token` é rotacionado a cada login/logout, mitigando reuso. Nunca exponha o `remember_token` em APIs públicas.

### 1.6 Logout

```php
Auth::logout(); // limpa as informações de autenticação da sessão
```

### 1.7 Proteção de rotas

Use o middleware `auth` (classe `Illuminate\Auth\Middleware\Authenticate`):

```php
Route::get('profile', function () {
    // apenas usuários autenticados
})->middleware('auth');

// Em um controller:
public function __construct()
{
    $this->middleware('auth');
}
```

Especificando o guard:

```php
public function __construct()
{
    $this->middleware('auth:api');
}
```

O middleware `auth.basic` fornece HTTP Basic Auth rápido (sem tela de login):

```php
Route::get('profile', function () {
    // apenas autenticados
})->middleware('auth.basic');
```

Para APIs *stateless* com Basic Auth, use `Auth::onceBasic()` dentro de um middleware customizado:

```php
public function handle($request, $next)
{
    Auth::onceBasic();
    return $next($request);
}
```

> **Nota FastCGI**: se usar PHP FastCGI, o HTTP Basic pode falhar sem as regras de rewrite no `.htaccess` que repassam o header `Authorization`.

### 1.8 Login Throttling (proteção contra força bruta)

O Laravel 5.5 **possui** throttling de login nativo. O `LoginController` incluído usa o trait `Illuminate\Foundation\Auth\ThrottlesLogins`. Por padrão, após várias tentativas incorretas, o usuário fica bloqueado por **um minuto**. O bloqueio é por combinação de **nome de usuário/e-mail + endereço IP**.

Além disso, o middleware `throttle` (`Illuminate\Routing\Middleware\ThrottleRequests`) está registrado no `App\Http\Kernel`:

```php
'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
```

Uso:

```php
Route::get('/api/users', function () {
    //
})->middleware('throttle:60,1'); // máximo de 60 requisições por 1 minuto
```

> **Armadilha**: o `throttle` padrão usa o IP do cliente. Atrás de um proxy/load balancer, o IP visto pode ser o do proxy; configure `TrustProxies` (`App\Http\Middleware\TrustProxies`) e o header correto (ex.: `X-Forwarded-For`) para que o limite seja aplicado por usuário real.

### 1.9 Eventos de autenticação

O Laravel dispara eventos durante o fluxo (`Illuminate\Auth\Events\*`), úteis para auditoria/log:

- `Registered`, `Attempting`, `Authenticated`, `Login`, `Failed`, `Logout`, `Lockout`, `PasswordReset`.

```php
protected $listen = [
    'Illuminate\Auth\Events\Failed'  => ['App\Listeners\LogFailedLogin'],
    'Illuminate\Auth\Events\Lockout' => ['App\Listeners\LogLockout'],
];
```

### 1.10 Reset de senha (passwords.md)

O 5.5 traz controllers `Auth\ForgotPasswordController` e `Auth\ResetPasswordController`, gerados por `php artisan make:auth`.

Requisitos:

- O `App\User` deve implementar `Illuminate\Contracts\Auth\CanResetPassword` (o model padrão já usa o trait `Illuminate\Auth\Passwords\CanResetPassword`).
- Tabela de tokens de reset (migration já embutida): `php artisan migrate`.

Fluxo:

- `/password/email` envia o link; `/password/reset` efetiva a troca.
- Após o reset, o usuário é **automaticamente logado** e redirecionado (padrão `/home`; customize com `$redirectTo` no `ResetPasswordController`).
- **Os tokens de reset expiram após 1 hora** por padrão (configure `expire` em `config/auth.php`).

Customizações possíveis em 5.5:

```php
use Illuminate\Support\Facades\Auth;
protected function guard()  { return Auth::guard('guard-name'); }

use Illuminate\Support\Facades\Password;
protected function broker() { return Password::broker('name'); }

// Notificação de reset customizada no User model:
public function sendPasswordResetNotification($token)
{
    $this->notify(new ResetPasswordNotification($token));
}
```

> **Armadilha**: tokens de reset com longa expiração + e-mails em texto são vetores de recuperação de conta. Mantenha `expire` curto e sempre invalida tokens após uso (comportamento padrão do broker).

### 1.11 Verificação de e-mail (não existe no 5.5)

**O Laravel 5.5 NÃO possui verificação de e-mail nativa.** Esse recurso (classe `MustVerifyEmail`, trait, rotas `verified`, etc.) foi introduzido apenas no **Laravel 5.7**. No 5.5, se precisar desse comportamento, terá de implementá-lo manualmente (coluna `email_verified_at`/`verification_token`, envio de notificação e middleware customizado).

---

## 2. Autorização

Laravel oferece dois mecanismos: **Gates** (Closures) e **Policies** (agrupadas por modelo/recurso). Você pode misturar ambos.

### 2.1 Gates

Definidos normalmente em `App\Providers\AuthServiceProvider` via facade `Gate`:

```php
use Illuminate\Support\Facades\Gate;

public function boot()
{
    $this->registerPolicies();

    Gate::define('update-post', function ($user, $post) {
        return $user->id === $post->user_id;
    });

    // também aceita estilo Class@method
    Gate::define('update-post', 'App\Policies\PostPolicy@update');
}
```

Autorizando:

```php
if (Gate::allows('update-post', $post)) { /* pode */ }
if (Gate::denies('update-post', $post)) { /* não pode */ }

// Para um usuário específico:
if (Gate::forUser($user)->allows('update-post', $post)) { /* ... */ }
```

**Resource Gates** (atalho para `view`, `create`, `update`, `delete`):

```php
Gate::resource('posts', 'App\Policies\PostPolicy');

// equivalente a:
Gate::define('posts.view',   'App\Policies\PostPolicy@view');
Gate::define('posts.create', 'App\Policies\PostPolicy@create');
Gate::define('posts.update', 'App\Policies\PostPolicy@update');
Gate::define('posts.delete', 'App\Policies\PostPolicy@delete');

// com habilidades extras:
Gate::resource('posts', 'PostPolicy', [
    'image' => 'updateImage',
    'photo' => 'updatePhoto',
]);
```

### 2.2 Policies

Gerando:

```bash
php artisan make:policy PostPolicy            # vazia
php artisan make:policy PostPolicy --model=Post  # com métodos CRUD
```

Registrando (em `AuthServiceProvider`):

```php
protected $policies = [
    App\Post::class => App\Policies\PostPolicy::class,
];
```

Métodos da policy:

```php
namespace App\Policies;

use App\User;
use App\Post;

class PostPolicy
{
    public function update(User $user, Post $post)
    {
        return $user->id === $post->user_id;
    }

    // ações sem modelo (ex.: create) recebem só o usuário:
    public function create(User $user)
    {
        return $user->role === 'author';
    }
}
```

**Filtros (`before`)** — executado antes de qualquer método da policy (ex.: admin total):

```php
public function before($user, $ability)
{
    if ($user->isSuperAdmin()) {
        return true;  // autoriza tudo
    }
    // retornar false nega tudo; retornar null deixa cair no método da policy
}
```

> **Armadilha 5.5**: o método `before` de uma policy **não é chamado** se a classe não possuir um método com o mesmo nome da habilidade verificada. Ou seja, se você checa `update` mas a policy não tem `update`, o `before` pode não disparar conforme esperado.

### 2.3 Autorizando ações

**Via model `User`** (`can`/`cant`):

```php
if ($user->can('update', $post)) { /* ... */ }

// sem instância de modelo (usa a classe para resolver a policy):
if ($user->can('create', App\Post::class)) { /* ... */ }
```

**Via middleware `can`** (key `can` no `App\Http\Kernel`, classe `Illuminate\Auth\Middleware\Authorize`):

```php
Route::put('/post/{post}', function (Post $post) {
    // usuário autorizado
})->middleware('can:update,post');

// sem modelo:
Route::post('/post', function () {
    //
})->middleware('can:create,App\Post');
```

Se não autorizado, gera resposta **403**.

**Via controller helper `authorize()`** (trait `AuthorizesRequests`, herdada pelo `Controller` base):

```php
use App\Post;

public function update(Request $request, Post $post)
{
    $this->authorize('update', $post); // lança AuthorizationException -> 403
}

public function create(Request $request)
{
    $this->authorize('create', Post::class);
}
```

**Via Blade** (`@can` / `@cannot`):

```blade
@can('update', $post)
    <!-- pode atualizar -->
@elsecan('create', App\Post::class)
    <!-- pode criar -->
@endcan

@cannot('update', $post)
    <!-- não pode atualizar -->
@endcannot

@can('create', App\Post::class)
@endcan
```

> **Nota 5.5**: `@can`/`@cannot` traduzem-se internamente para `Auth::user()->can(...)`. Não existe `@error` no 5.5 (ver seção de Validação).

---

## 3. Criptografia

O encrypter do Laravel 5.5 usa **OpenSSL** com cifra **AES-256-CBC** (também suporta AES-128). Todo valor criptografado é assinado com um **MAC** (message authentication code), impedindo alteração do valor após a cifragem.

### 3.1 Configuração e APP_KEY

Em `config/app.php`, a opção `key` deve ser definida. Gere com:

```bash
php artisan key:generate
```

No Laravel 5.5, a `key:generate` produz uma chave codificada em **base64** (formato `base64:...`) usando gerador seguro de bytes aleatórios do PHP. Se esse valor não estiver corretamente definido, **todos os valores criptografados estarão inseguros**.

> **Armadilhas com APP_KEY**:
> - **Nunca commite** a `APP_KEY` real em repositórios públicos.
> - Se você **rotacionar/perder** a `APP_KEY`, **todos os dados criptografados anteriormente (cookies de sessão, valores `encrypt()`, etc.) tornam-se irreversivelmente ilegíveis** — isso causa logout em massa e perda de dados cifrados.
> - Em ambientes com múltiplos servidores (balanceamento), **todos devem compartilhar a mesma `APP_KEY`** para decifrar cookies/sessões.
> - Não use algoritmos "caseiros"; use sempre o facilitador nativo.

### 3.2 Criptografando / Decifrando

Helper `encrypt` (e facade `Crypt`):

```php
use App\User;
use Illuminate\Http\Request;

public function storeSecret(Request $request, $id)
{
    $user = User::findOrFail($id);

    $user->fill([
        'secret' => encrypt($request->secret) // AES-256-CBC + MAC, passa por serialize
    ])->save();
}
```

**Serialização**: no 5.5, `encrypt()` (helper/facade) **serializa** o valor via `serialize` antes de cifrar, permitindo cifrar objetos e arrays. Clientes não-PHP precisarão `unserialize` depois de decifrar. Para evitar a serialização, use `encryptString`/`decryptString`:

```php
use Illuminate\Support\Facades\Crypt;

$encrypted = Crypt::encryptString('Hello world.');
$decrypted = Crypt::decryptString($encrypted);
```

Decifrando:

```php
use Illuminate\Contracts\Encryption\DecryptException;

try {
    $decrypted = decrypt($encryptedValue);
} catch (DecryptException $e) {
    // MAC inválido ou valor não decifrável
}
```

> **Armadilha**: `decrypt()` lança `DecryptException` se o MAC for inválido (tamper detection) ou a chave estiver errada. Sempre envolva em `try/catch` ao decifrar dados não confiáveis (ex.: input do usuário).

---

## 4. Hashing

O facade `Hash` usa **bcrypt** para senhas. Os controllers `LoginController`/`RegisterController` já usam bcrypt automaticamente.

```php
use Illuminate\Support\Facades\Hash;

$hashed = Hash::make($request->newPassword);

// controlando o "work factor" (rounds); o padrão é aceitável:
$hashed = Hash::make('password', ['rounds' => 12]);
```

Verificando:

```php
if (Hash::check('plain-text', $hashedPassword)) {
    // senhas conferem
}
```

Rehash quando o custo mudar:

```php
if (Hash::needsRehash($hashed)) {
    $hashed = Hash::make('plain-text');
}
```

> **Versão**: O **Argon2** (Argon2i/Argon2id) só foi introduzido no **Laravel 5.6**. No 5.5.50, use **apenas bcrypt** via `Hash::make`. Não existem `Hash::make($v, ['algorithm' => ...])` com Argon no 5.5.
>
> **Armadilha**: nunca altere o `password` com atribuição em massa sem hashear; sempre passe por `Hash::make`. O `LoginController` já faz isso no registro/login.

---

## 5. CSRF (Proteção contra Cross-Site Request Forgery)

Laravel gera automaticamente um token CSRF para cada sessão de usuário ativa. O token verifica que o usuário autenticado é quem de fato faz a requisição.

### 5.1 Token nos formulários (5.5)

No 5.5, use `{{ csrf_field() }}` (a diretiva `@csrf` **só existe a partir do Laravel 5.6**):

```blade
<form method="POST" action="/profile">
    {{ csrf_field() }}
    ...
</form>
```

O middleware `VerifyCsrfToken` (grupo `web`) valida automaticamente que o token do input confere com o da sessão.

> **Armadilha 5.5**: não use `@csrf` — isso quebraria no 5.5. Use `{{ csrf_field() }}`.

### 5.2 CSRF e JavaScript / AJAX

O `resources/assets/js/bootstrap.js` registra o valor do meta tag `csrf-token` no Axios. Para jQuery:

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

```javascript
$.ajaxSetup({
    headers: {
        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
    }
});
```

O middleware também aceita o header **`X-CSRF-TOKEN`** e o **`X-XSRF-TOKEN`** (este último preenchido pelo cookie `XSRF-TOKEN` que o framework envia a cada resposta, usado por Angular/Axios automaticamente).

### 5.3 Excluindo URIs da proteção

Para webhooks (ex.: Stripe) que não enviam token:

```php
namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    protected $except = [
        'stripe/*',
        'http://example.com/foo/bar',
        'http://example.com/foo/*',
    ];
}
```

> **Armadilha**: excluir URIs do CSRF cria uma brecha. Faça isso **apenas** para endpoints externos confiáveis e, de preferência, fora do grupo `web` (em `routes/api.php` ou fora do `RouteServiceProvider` web). Valide a autenticidade por outros meios (assinatura/HMAC) nesses endpoints.

### 5.4 Token mismatch

Se o token não conferir, o middleware aborta com **419** (Page Expired). Em AJAX, isso geralmente indica sessão expirada ou token desatualizado.

---

## 6. Validação

O `Controller` base usa o trait `ValidatesRequests` (método `validate()`). A validação protege contra dados inválidos/maliciosos e é a primeira linha de defesa contra mass assignment indireto e injeção.

### 6.1 Validação no controller (`validate`)

```php
public function store(Request $request)
{
    $validatedData = $request->validate([
        'title' => 'required|unique:posts|max:255',
        'body'  => 'required',
    ]);

    // dados válidos...
}
```

- Falha → redireciona de volta (HTTP tradicional) ou resposta **JSON 422** (AJAX), com erros na sessão.
- `bail` interrompe na primeira falha do atributo:

```php
$request->validate([
    'title' => 'bail|required|unique:posts|max:255',
    'body'  => 'required',
]);
```

- Atributos aninhados via "dot syntax": `'author.name' => 'required'`.

### 6.2 Campos opcionais e middlewares globais

`TrimStrings` e `ConvertEmptyStringsToNull` estão no stack global. Por isso, campos opcionais devem usar `nullable`:

```php
$request->validate([
    'publish_at' => 'nullable|date',
]);
```

### 6.3 Form Requests

```bash
php artisan make:request StoreBlogPost
```

```php
public function rules()
{
    return [
        'title' => 'required|unique:posts|max:255',
        'body'  => 'required',
    ];
}

// type-hint no controller valida ANTES de entrar no método:
public function store(StoreBlogPost $request)
{
    // válido
}
```

**After hooks** em Form Request:

```php
public function withValidator($validator)
{
    $validator->after(function ($validator) {
        if ($this->somethingElseIsInvalid()) {
            $validator->errors()->add('field', 'Algo está errado!');
        }
    });
}
```

### 6.4 Autorização no Form Request (`authorize`)

O Form Request possui `authorize()` — verifique se o usuário pode executar a ação:

```php
public function authorize()
{
    $comment = Comment::find($this->route('comment'));
    return $comment && $this->user()->can('update', $comment);
}
// retornar false -> 403 automático, o método do controller não executa
```

Se a autorização estiver em outro lugar, retorne `true`.

### 6.5 Mensagens de erro

Customize via `messages()` no Form Request, ou via language file `resources/lang/xx/validation.php` (chave `custom`).

**Exibindo erros no Blade (5.5)**: use a variável `$errors` (`Illuminate\Support\MessageBag`), disponível em todas as views pelo middleware `ShareErrorsFromSession` (grupo `web`):

```blade
@if ($errors->any())
    <div class="alert alert-danger">
        <ul>
            @foreach ($errors->all() as $error)
                <li>{{ $error }}</li>
            @endforeach
        </ul>
    </div>
@endif

{{-- Campo específico --}}
@if ($errors->has('email'))
    <span>{{ $errors->first('email') }}</span>
@endif
```

> **VERSÃO CRÍTICA — `@error` NÃO EXISTE NO 5.5**: a diretiva `@error ... @enderror` foi introduzida no **Laravel 5.8**. No 5.5 use `$errors->has()`, `$errors->first()`, `$errors->all()` conforme acima. Não escreva `@error('email')` em código 5.5.

### 6.6 Validators manuais

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

// Redirecionamento automático:
Validator::make($request->all(), $rules)->validate();

// Named error bags (vários formulários na mesma página):
return redirect('register')->withErrors($validator, 'login');
// na view: {{ $errors->login->first('email') }}
```

**After hook** manual:

```php
$validator->after(function ($validator) {
    if ($this->somethingElseIsInvalid()) {
        $validator->errors()->add('field', 'Inválido!');
    }
});
```

### 6.7 Regras condicionais (`sometimes`)

```php
$v = Validator::make($data, [
    'email' => 'sometimes|required|email',
]);

// só adiciona 'reason' se games >= 100:
$v->sometimes('reason', 'required|max:500', function ($input) {
    return $input->games >= 100;
});
```

### 6.8 Validação de arrays

```php
$validator = Validator::make($request->all(), [
    'photos.profile'        => 'required|image',
    'person.*.email'        => 'email|unique:users',
    'person.*.first_name'   => 'required_with:person.*.last_name',
]);
```

### 6.9 `unique` e `exists` com restrições (usando `Rule`)

No 5.5, a classe `Illuminate\Validation\Rule` já existe e permite definir regras fluentes (sem concatenação por `|`):

```php
use Illuminate\Validation\Rule;

// unique ignorando o próprio ID (update de perfil):
Validator::make($data, [
    'email' => [
        'required',
        Rule::unique('users')->ignore($user->id),
        // coluna PK diferente de 'id':
        // Rule::unique('users')->ignore($user->id, 'user_id'),
        // restrições extras:
        // ->where(function ($query) { $query->where('account_id', 1); })
    ],
]);

// exists com restrição:
Validator::make($data, [
    'email' => [
        'required',
        Rule::exists('staff')->where(function ($query) {
            $query->where('account_id', 1);
        }),
    ],
    'zones' => ['required', Rule::in(['first-zone', 'second-zone'])],
    'toppings' => ['required', Rule::notIn(['sprinkles', 'cherries'])],
    'avatar' => ['required', Rule::dimensions()->maxWidth(1000)->maxHeight(500)->ratio(3/2)],
]);
```

### 6.10 Regras de validação customizadas

**Rule Objects** (5.5 possui `php artisan make:rule`):

```bash
php artisan make:rule Uppercase
```

```php
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
        return 'O :attribute deve ser maiúsculo.';
    }
}

// uso:
use App\Rules\Uppercase;
$request->validate([
    'name' => ['required', new Uppercase],
]);
```

**Extensions** via `Validator::extend` (em um service provider):

```php
use Illuminate\Support\Facades\Validator;

Validator::extend('foo', function ($attribute, $value, $parameters, $validator) {
    return $value === 'foo';
});

// mensagem em resources/lang/xx/validation.php (primeiro nível, não em 'custom'):
// "foo" => "Entrada inválida!",

// placeholder customizado:
Validator::replacer('foo', function ($message, $attribute, $rule, $parameters) {
    return str_replace(...);
});

// regra "implícita" (roda mesmo se vazio/ausente):
Validator::extendImplicit('foo', function ($attribute, $value, $parameters, $validator) {
    return $value === 'foo';
});
```

### 6.11 Regras disponíveis (5.5)

Aceitas: `accepted`, `active_url`, `after`/`after_or_equal` (date), `alpha`, `alpha_dash`, `alpha_num`, `array`, `before`/`before_or_equal` (date), `between`, `boolean`, `confirmed`, `date`, `date_equals`, `date_format`, `different`, `digits`, `digits_between`, `dimensions`, `distinct`, `email`, `exists`, `file`, `filled`, `image`, `in`, `in_array`, `integer`, `ip` (+ `ipv4`, `ipv6`), `json`, `max`, `mimetypes`, `mimes`, `min`, `nullable`, `not_in`, `numeric`, `present`, `regex`, `required`, `required_if`, `required_unless`, `required_with`, `required_with_all`, `required_without`, `required_without_all`, `same`, `size`, `string`, `timezone`, `unique`, `url`.

> **Defesa**: use `confirmed` para senhas (`password_confirmation`), `email` para e-mails, `integer`/`numeric` para IDs, `in`/`not_in` para enums de entrada, e sempre `unique`/`exists` parametrizados para evitar cadastros duplicados ou referências inválidas.

---

## 7. Mass Assignment (Eloquent)

Todos os models Eloquent protegem contra mass assignment por padrão. A vulnerabilidade ocorre quando um parâmetro HTTP inesperado (ex.: `is_admin`) é passado ao `create`/`fill`/`update` e altera uma coluna não prevista.

### 7.1 `$fillable` (whitelist)

```php
namespace App;

use Illuminate\Database\Eloquent\Model;

class Flight extends Model
{
    protected $fillable = ['name']; // só 'name' é atribuível em massa
}

$flight = App\Flight::create(['name' => 'Flight 10']); // OK
$flight->fill(['name' => 'Flight 22']);               // OK
```

### 7.2 `$guarded` (blacklist)

```php
class Flight extends Model
{
    protected $guarded = ['price']; // tudo EXCETO 'price' é atribuível
}

// liberar TUDO (perigoso — evite):
protected $guarded = [];
```

> Use **ou** `$fillable` **ou** `$guarded`, nunca ambos.

### 7.3 `forceFill` e exceção

Para atribuir campos protegidos de forma deliberada (ex.: seed/admin), use `forceFill`:

```php
$flight->forceFill(['price' => 100, 'is_admin' => true])->save();
```

Se tentar atribuir em massa um campo não permitido via `create`/`fill`/`update`/`firstOrCreate`/`firstOrNew`/`update`, o Laravel lança `Illuminate\Database\Eloquent\MassAssignmentException`.

> **Armadilha**: `User::create($request->all())` sem `$fillable` apropriado é a causa clássica de escalonamento de privilégio. Sempre use Form Requests validados + `$fillable` restrito, e prefira atribuir explicitamente campos sensíveis (`password => Hash::make(...)`) em vez de `create($request->all())`.

---

## 8. Segurança de Sessão

### 8.1 Regeneração de Session ID (Session Fixation)

A regeneração do ID de sessão previne ataques de **session fixation**. O `LoginController` já regenera o ID durante a autenticação. Manualmente:

```php
$request->session()->regenerate();
```

> Para invalidar a sessão atual e gerar uma nova (logout seguro), o 5.5 também dispõe de `$request->session()->migrate(true)` (equivalente a "invalidate + regenerate"). Use `regenerate()` após login e após qualquer elevação de privilégio.

### 8.2 Drivers e armazenamento

`config/session.php` define o `driver`: `file` (padrão, em `storage/framework/sessions`), `cookie` (cookies criptografados e seguros), `database`, `memcached`/`redis`, `array` (não persiste; usado em testes).

Para `database`:

```php
Schema::create('sessions', function ($table) {
    $table->string('id')->unique();
    $table->unsignedInteger('user_id')->nullable();
    $table->string('ip_address', 45)->nullable();
    $table->text('user_agent')->nullable();
    $table->text('payload');
    $table->integer('last_activity');
});
// php artisan session:table && php artisan migrate
```

> **Armadilha**: driver `cookie` armazena tudo no cliente (cifrado+MAC), mas aumenta o tamanho dos cookies e não escala bem. Para produção, prefira `redis`/`memcached` e garanta que o armazenamento de sessão não seja acessível publicamente.

### 8.3 Cookies e HTTPS

- Cookies de sessão e o `XSRF-TOKEN` são gerenciados pelo framework. Em `config/session.php`/`config/session.php`:
  - `secure` → envie cookies **apenas** via HTTPS (`true` em produção).
  - `http_only` → impede acesso via JavaScript (`true` por padrão; protege contra roubo via XSS).
  - `same_site` pode ser `lax`/`strict` (mitiga CSRF em navegadores compatíveis).
- Sempre sirva a aplicação atrás de **HTTPS** em produção e force redirecionamento HTTP→HTTPS (middleware `ForceHttps` customizado ou no proxy/servidor web).

> **Armadilha**: nunca desative `http_only` sem necessidade; fazê-lo expõe o cookie de sessão a scripts de terceiros (vetor de session hijacking via XSS).

---

## 9. Outras superfícies de segurança

### 9.1 Escape em Blade (XSS)

Blade `{{ }}` é **automaticamente** passado por `htmlspecialchars` (com `double_encode` desligado), prevenindo XSS:

```blade
{{ $userProvidedContent }} {{-- escapado automaticamente — seguro --}}
```

Para exibir **sem** escape (somente para conteúdo confiável!):

```blade
{!! $trustedHtml !!}
```

> **Armadilha (5.5)**: `{!! !!}` **não escapa**. Nunca use para dados de usuários. Para sanitizar HTML de usuários, use bibliotecas externas de sanitização antes de exibir. O helper `e()` também aplica `htmlspecialchars` (duplo encode false).

### 9.2 SQL Injection

O query builder e o Eloquent usam **prepared statements com bindings parametrizados**, protegendo contra injeção:

```php
// DB facade — bindings como 2º argumento (protege contra SQL injection):
$results = DB::select('select * from users where id = ?', [$id]);

// Query builder / Eloquent — sempre parametrizado:
User::where('email', $email)->get();
```

**Expressões raw** — use SEMPRE bindings:

```php
use Illuminate\Support\Facades\DB;

// DB::raw com bindings:
DB::table('users')->select(DB::raw('count(*) as user_count, status'));

// whereRaw / selectRaw aceitam bindings como 2º argumento:
DB::table('users')->whereRaw('age > ? and votes = ?', [$age, $votes]);
DB::table('orders')->selectRaw('price * ? as price_with_tax', [$tax]);
```

> **Armadilha**: nunca interpole variáveis do usuário diretamente em `DB::raw()`, `whereRaw()`, `selectRaw()`, etc. Passe-as como bindings. Concatenar input do usuário em SQL bruto é a causa número um de injeção SQL.

### 9.3 Headers de segurança

O Laravel 5.5 **não** adiciona headers de segurança automaticamente (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS). Adicione-os via middleware customizado (ex.: `App\Http\Middleware\SecurityHeaders` registrado no `$middleware` global):

```php
public function handle($request, $next)
{
    $response = $next($request);
    $response->headers->set('X-Frame-Options', 'DENY');
    $response->headers->set('X-Content-Type-Options', 'nosniff');
    $response->headers->set('X-XSS-Protection', '1; mode=block');
    $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // HSTS (somente com HTTPS):
    // $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    return $response;
}
```

> Combine com proteção de CSRF, escape de Blade e `Content-Security-Policy` (CSP) para mitigar XSS e clickjacking.

### 9.4 Rate Limiting / Brute Force

- Middleware `throttle` (seção 1.8): `throttle:60,1` limita 60 requisições/minuto.
- Throttling de login nativo via `ThrottlesLogins` no `LoginController`.
- Para filas/Redis, `Redis::throttle('key')->allow(10)->every(60)` (queues) — fora do escopo web, mas útil para APIs com limite.

> **Armadilha**: `throttle` baseia-se no IP; atrás de proxy, configure `TrustProxies` para obter o IP real. Para APIs com token, combine com limite por `user_id` (middleware customizado) para evitar que um único usuário abuse.

### 9.5 Contratos de autenticação (extensibilidade segura)

Ao implementar guards/providers customizados, respeite os contratos:

- `Illuminate\Contracts\Auth\UserProvider`: `retrieveById`, `retrieveByToken`, `updateRememberToken`, `retrieveByCredentials`, `validateCredentials`.
  - `retrieveByCredentials` **não deve** validar senha; apenas buscar o usuário.
  - `validateCredentials` deve usar `Hash::check` para comparar a senha.
- `Illuminate\Contracts\Auth\Authenticatable`: `getAuthIdentifierName`, `getAuthIdentifier`, `getAuthPassword`, `getRememberToken`, `setRememberToken`, `getRememberTokenName`.

> **Armadilha**: implementações customizadas que comparam senha em texto plano ou ignoram o `Hash::check` quebram a segurança do sistema. Sempre bcrypt + `Hash::check`.

---

## Resumo de Pontos-Chave

- **Hashing**: apenas **bcrypt** no 5.5 (`Hash::make`/`check`/`needsRehash`). Argon é 5.6+ — não use.
- **Criptografia**: **AES-256-CBC** + MAC; `encrypt()` serializa, use `encryptString()`/`decryptString()` sem serialização; proteja a `APP_KEY` (base64 no 5.5) — perdê-la invalida todos os dados cifrados.
- **CSRF**: sempre `{{ csrf_field() }}` (5.5; `@csrf` é 5.6+). Middleware `VerifyCsrfToken`; exclua URIs só para webhooks confiáveis.
- **Auth**: guards `web`(session) e `api`(token); `Auth::attempt`/`login`/`logout`; "remember me" com `viaRemember()`; throttling nativo de login + middleware `throttle`.
- **Reset de senha**: nativo via `make:auth`; tokens expiram em 1h; após reset o usuário é logado automaticamente.
- **Verificação de e-mail**: **não existe** no 5.5 (é 5.7+).
- **Autorização**: Gates (`Gate::define`/`allows`/`forUser`, `Gate::resource`) e Policies (`make:policy --model`, `before`, `authorize()` no controller via `AuthorizesRequests`, `@can`/`@cannot` no Blade, middleware `can`).
- **Validação**: `validate()` no controller, Form Requests (`rules()`, `authorize()`, `withValidator()` after hook, `messages()`), classe `Rule` fluente (`unique`/`exists`/`in`/`notIn`/`dimensions`), custom rules via `make:rule` ou `Validator::extend`. Exibir erros com `$errors` (`has`/`first`/`all`); **`@error` não existe no 5.5** (é 5.8+).
- **Mass assignment**: `$fillable`/`$guarded`; nunca `User::create($request->all())` sem proteção; `forceFill` para exceções; `MassAssignmentException` em violação.
- **Sessão**: `regenerate()`/`migrate(true)` contra session fixation; cookies `secure`+`http_only`; prefira Redis/Memcached em produção; sirva via HTTPS.
- **XSS**: `{{ }}` escapa automaticamente; `{!! !!}` não escapa — perigoso para dados de usuário.
- **SQLi**: query builder/Eloquent parametrizados; raw (`DB::raw`, `whereRaw`, etc.) **sempre** com bindings.
- **Headers**: não há automáticos no 5.5 — adicione via middleware (X-Frame-Options, nosniff, HSTS, CSP).
- **Rate limiting**: middleware `throttle`, `ThrottlesLogins`; cuidado com IP atrás de proxy (`TrustProxies`).

---

## Referências

Documentação oficial do Laravel 5.5 (arquivos locais em `TMP/laravel5.5/`):

- `authentication.md` — guards, `Auth::attempt`/`login`/`logout`, "remember me", `viaRemember`, proteção de rotas, login throttling, reset de senha (eventos, contratos `UserProvider`/`Authenticatable`).
- `authorization.md` — Gates (`define`/`allows`/`forUser`/`resource`), Policies (geração, registro, métodos, `before`, `via User`/`middleware`/`controller`/`Blade`).
- `encryption.md` — AES-256-CBC, `encrypt`/`decrypt`, `encryptString`/`decryptString`, MAC, `DecryptException`.
- `hashing.md` — `Hash::make` (bcrypt, `rounds`), `Hash::check`, `Hash::needsRehash`.
- `csrf.md` — `{{ csrf_field() }}`, middleware `VerifyCsrfToken`, `$except`, `X-CSRF-TOKEN`, `X-XSRF-TOKEN`.
- `validation.md` — `validate()`, Form Requests, `authorize()`, after hooks, `Rule` class, `unique`/`exists` com restrições, rules customizadas (`make:rule`/`extend`), mensagens de erro.
- `passwords.md` — reset de senha, brokers, guards, notificação customizada, expiração de token.
- `session.md` — drivers, regeneração de session ID, flash data, custom drivers.
- `eloquent.md` — Mass Assignment (`$fillable`/`$guarded`, `create`/`fill`, `forceFill`, `MassAssignmentException`).
- `blade.md` — escape automático `{{ }}` via `htmlspecialchars`, `{!! !!}` sem escape.
- `queries.md` — prepared statements, `DB::raw`/`whereRaw`/`selectRaw` com bindings (SQL injection).
- `middleware.md` — middleware `throttle` (`ThrottleRequests`).

> **Aviso de versão**: todos os recursos acima foram verificados contra a documentação de **Laravel 5.5.50**. Recursos citados como "não existe no 5.5" (`@csrf` 5.6+, `@error` 5.8+, verificação de e-mail 5.7+, Argon 5.6+) foram propositalmente excluídos para manter a conformidade de versão.
