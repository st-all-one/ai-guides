# Segurança no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Auth, Sanctum, Authorization, criptografia, hashing,
> CSRF, validação, mass assignment, sessão e rate limiting. Recursos do 13+ estão sinalizados.

---

## 1. Autenticação (guards & providers)

- **Guard**: como o usuário é autenticado por request (ex.: `session`, `sanctum`, `token`).
- **Provider**: como o usuário é recuperado (Eloquent ou query builder).
- Configuração em `config/auth.php`.

### 1.1 Fluxo manual (sem starter kit)

```php
use Illuminate\Support\Facades\Auth;

if (Auth::attempt(['email' => $email, 'password' => $password], $remember = true)) {
    $request->session()->regenerate();          // evita session fixation
    return redirect()->intended('dashboard');
}
```

- `attempt()` hasheia a senha e compara automaticamente — **não** hasheie antes.
- `attemptWhen($credentials, fn (User $u) => $u->isNotBanned())` inspeciona o usuário antes de logar.
- Condições extras: `Auth::attempt(['email' => $e, 'password' => $p, 'active' => 1])` ou uma closure
  de query no array.

### 1.2 Outros métodos

```php
Auth::login($user);                    // usuário já existente
Auth::login($user, $remember = true);
Auth::loginUsingId(1);
Auth::once($credentials);              // apenas para o request atual (sem sessão)
Auth::viaRemember();                   // foi autenticado via cookie "remember me"?
Auth::guard('admin')->attempt($credentials);
Auth::user(); Auth::id(); Auth::check(); Auth::guest();
$request->user(); $request->user('admin');
```

### 1.3 Protegendo rotas

```php
Route::get('/flights', fn () => 'ok')->middleware('auth');
Route::get('/admin', fn () => 'ok')->middleware('auth:admin');
```

Redirecionamentos em `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->redirectGuestsTo('/login');
    $middleware->redirectUsersTo('/panel');
})
```

### 1.4 Logout e invalidação de sessão

```php
Auth::logout();
$request->session()->invalidate();
$request->session()->regenerateToken();

// deslogar de todos os dispositivos (requer driver de autenticação com sessões)
Auth::logoutOtherDevices($currentPassword);
```

### 1.5 HTTP Basic

```php
Route::middleware('auth.basic')->get('/user', fn () => Auth::user());
Route::middleware('auth.basic.once')->get('/user', fn () => Auth::user()); // stateless
```

### 1.6 Rehashing automático

O Laravel re-hasheia a senha durante o login se o work factor/alg mudou (via
`Hash::needsRehash`). Controlado por configuração do guard.

---

## 2. Sanctum (API tokens + SPA)

Instale com `php artisan install:api` (cria `routes/api.php` e instala `laravel/sanctum`).

### 2.1 Tokens

```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
}

$token = $user->createToken('token-name', ['server:update']);   // NewAccessToken
return ['token' => $token->plainTextToken];                     // exibir 1x

$user->tokens;                                                  // relação
$user->tokenCan('server:update');
$user->tokenCant('server:update');
```

Proteção de rotas:

```php
Route::get('/user', fn (Request $r) => $r->user())->middleware('auth:sanctum');
```

Revogar:

```php
$user->tokens()->delete();
$request->user()->currentAccessToken()->delete();
$user->tokens()->where('id', $id)->delete();
```

Expiração: `config/sanctum.php` `'expiration' => 525600` (minutos) e/ou terceiro argumento do
`createToken`. Limpe tokens expirados com `sanctum:prune-expired` via scheduler.

### 2.2 Middleware de abilities

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->alias([
        'abilities' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
        'ability'   => \Laravel\Sanctum\Http\Middleware\CheckForAnyAbility::class,
    ]);
})
```

```php
Route::get('/orders', ...)->middleware(['auth:sanctum', 'abilities:check-status,place-orders']);
Route::get('/orders', ...)->middleware(['auth:sanctum', 'ability:check-status,place-orders']);
```

### 2.3 SPA authentication

Usa o cookie de sessão (não tokens). SPA e API devem compartilhar o **domínio de topo**.
Envie `Accept: application/json` e `Referer`/`Origin`. Configure
`SANCTUM_STATEFUL_DOMAINS` e a origem da sessão.

> Para autenticação simples de API/SPA/mobile, **Sanctum é o recomendado**. Use **Passport** apenas
> quando precisar de OAuth2 completo (grant types).

---

## 3. Autorização (Gates & Policies)

### 3.1 Gates

```php
use Illuminate\Support\Facades\Gate;

Gate::define('update-post', fn (User $user, Post $post) => $user->id === $post->user_id);
Gate::define('update-post', [PostPolicy::class, 'update']);      // callback de classe

Gate::allows('update-post', $post);
Gate::denies('update-post', $post);
Gate::forUser($user)->allows('update-post', $post);
Gate::any(['update-post', 'delete-post'], $post);
Gate::none(['update-post', 'delete-post'], $post);
Gate::authorize('update-post', $post);          // lança AuthorizationException (403)
Gate::check('create-post', [$category, $pinned]);
```

Respostas ricas e status custom:

```php
use Illuminate\Auth\Access\Response;

Gate::define('edit-settings', fn (User $user) => $user->isAdmin
    ? Response::allow()
    : Response::deny('Você precisa ser administrador.'));

Gate::define('view', fn (User $u) => $u->isAdmin ? Response::allow() : Response::denyWithStatus(404));
Gate::define('view', fn (User $u) => $u->isAdmin ? Response::allow() : Response::denyAsNotFound());

$response = Gate::inspect('edit-settings');
$response->allowed(); $response->message();
```

Interceptação e inline:

```php
Gate::before(fn (User $user, string $ability) => $user->isAdministrator() ? true : null);
Gate::after(fn (User $user, string $ability, ?bool $result, mixed $args) => $user->isAdmin() ? true : null);

Gate::allowIf(fn (User $user) => $user->isAdministrator()); // lança se falhar
Gate::denyIf(fn (User $user) => $user->banned());
```

### 3.2 Policies

```bash
php artisan make:policy PostPolicy --model=Post
```

```php
namespace App\Policies;

use App\Models\{Post, User};

class PostPolicy
{
    public function viewAny(User $user): bool { return true; }
    public function view(User $user, Post $post): bool { return true; }
    public function create(User $user): bool { return $user->role === 'writer'; }
    public function update(User $user, Post $post): bool { return $user->id === $post->user_id; }
    public function delete(User $user, Post $post): bool { return $user->id === $post->user_id; }
    public function restore(User $user, Post $post): bool { return $user->id === $post->user_id; }
    public function forceDelete(User $user, Post $post): bool { return $user->id === $post->user_id; }
    public function before(User $user, string $ability): ?bool
    {
        return $user->isAdministrator() ? true : null;
    }
}
```

Registro:

- **Auto-discovery** por convenção (`Models/Post` → `Policies/PostPolicy`).
- **Atributo `#[UsePolicy]`** (12+):

```php
use Illuminate\Database\Eloquent\Attributes\UsePolicy;

#[UsePolicy(OrderPolicy::class)]
class Order extends Model {}
```

- Manual: `Gate::policy(Order::class, OrderPolicy::class);`

Uso:

```php
$request->user()->can('update', $post);
$request->user()->cannot('update', $post);
$request->user()->can('create', Post::class);

// Controller: no 11/12 o base Controller é vazio (não inclui AuthorizesRequests).
// Ou adicione `use AuthorizesRequests;` no seu Controller base, ou prefira:
Gate::authorize('update', $post);
$request->user()->can('update', $post);

// Blade: @can / @cannot / @canany (ver 09-blade.md)
// Middleware: ->middleware('can:update,post')
```

### 3.3 Authorization & Inertia

Passe as permissões para o frontend via prop compartilhada, normalmente
`$request->user()->only(...)` ou um helper que resolve `Gate::allows`. No 12.x isso é padrão
nos starter kits (Inertia).

---

## 4. Criptografia (`Crypt`)

- AES-256-CBC (ou AES-128) via OpenSSL, com **MAC** para integridade.
- Chave em `config/app.php` `key`, vinda de `APP_KEY` (`php artisan key:generate`).

```php
use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;

$encrypted = Crypt::encryptString($value);         // string
$encrypted = Crypt::encrypt($value);               // serialize (arrays/objetos)

try {
    $decrypted = Crypt::decryptString($encrypted);
} catch (DecryptException $e) {
    // valor inválido/adulterado
}
```

### Rotação graciosa de chave (12)

```ini
APP_KEY="base64:ATUAL..."
APP_PREVIOUS_KEYS="base64:ANTIGA1...,base64:ANTIGA2..."
```

Cifra sempre com a chave atual; ao decifrar, tenta a atual e depois as anteriores. Isso mantém
sessões/cookies válidos durante a rotação.

---

## 5. Hashing (`Hash`)

- Drivers: `bcrypt`, `argon`, `argon2id`. Config em `config/hashing.php`, env `HASH_DRIVER`.
- bcrypt usa custo adaptativo; argon2id é ótimo em hardware moderno.

```php
use Illuminate\Support\Facades\Hash;

$hashed = Hash::make('password');                       // driver configurado
$hashed = Hash::make('password', ['rounds' => 12]);     // bcrypt
$hashed = Hash::make('password', ['memory' => 1024, 'time' => 2, 'threads' => 2]); // argon2

Hash::check('plain', $hashed);                          // true/false
Hash::needsRehash($hashed);                             // work factor mudou?
if (Hash::needsRehash($hashed)) {
    $hashed = Hash::make('plain');
}
```

> O `Hash::check` valida que o hash foi gerado com o **algoritmo configurado**; se divergir, lança
> `RuntimeException` (proteção contra manipulação). Para migrar algoritmos, use
> `HASH_VERIFY=false` temporariamente.

---

## 6. CSRF

- Middleware `Illuminate\Foundation\Http\Middleware\ValidateCsrfToken` está no grupo `web`.
- Toda submissão `POST/PUT/PATCH/DELETE` em formulário HTML precisa do token.

```blade
<form method="POST" action="/profile">
    @csrf
    {{-- equivalente a <input type="hidden" name="_token" value="{{ csrf_token() }}" /> --}}
</form>
```

```php
$token = $request->session()->token();
$token = csrf_token();
```

- Header `X-CSRF-TOKEN` (meta tag) e cookie `XSRF-TOKEN` (Angular/Axios) também são aceitos.
- Excluir URIs (webhooks) via `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->validateCsrfTokens(except: [
        'stripe/*',
        'http://example.com/foo/bar',
    ]);
})
```

> Durante os **testes**, o CSRF é desabilitado automaticamente.

---

## 7. Validação

### 7.1 Quickstart

```php
$validated = $request->validate([
    'title' => ['required', 'string', 'max:255'],
    'body'  => ['required', 'string', 'min:10'],
    'email' => ['required', 'email', 'unique:users,email'],
    'tags'  => ['array'],
    'tags.*'=> ['string', 'distinct'],
]);
```

- Falha em request web: redirect + erros em `$errors`, com repopulação (`old()`).
- Falha em XHR/JSON: HTTP **422** com JSON de erros.
- `$request->validated()`, `$request->safe()->only([...])`, `->except([...])`.
- `Rule` fluente: `Rule::unique('users')->ignore($id)->where('team_id', $tid)`.
- `bail` para parar na primeira falha do atributo, ou `$stopOnFirstFailure = true` no request.

### 7.2 Form Requests

```bash
php artisan make:request StorePostRequest
```

```php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Post::class);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug'  => ['required', 'string', 'unique:posts,slug'],
            'body'  => ['required', 'string', 'min:10'],
            'cover' => ['nullable', 'image', 'max:2048'],
            'tags'  => ['array'],
            'tags.*'=> ['string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['slug' => Str::slug($this->input('title'))]);
    }

    protected function passedValidation(): void
    {
        // normalização após validação
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($this->somethingInvalid()) {
                    $validator->errors()->add('field', 'mensagem');
                }
            },
        ];
    }

    public function messages(): array
    {
        return ['title.required' => 'Informe um título.', 'body.required' => 'Escreva o corpo.'];
    }

    public function attributes(): array
    {
        return ['body' => 'corpo do post'];
    }
}
```

Controller:

```php
public function store(StorePostRequest $request): RedirectResponse
{
    $data = $request->validated();
    Post::create($data);
    return redirect()->route('posts.index');
}
```

> Pode-se tipar dependências nos métodos `rules()`/`authorize()` (resolvidas pelo container).
> `stopOnFirstFailure`, `$redirect` e `$redirectRoute` são configuráveis no Form Request.

### 7.3 Regras notáveis do 12.x

`accepted`, `active_url`, `after`, `after_or_equal`, `alpha`, `alpha_dash`, `alpha_num`, `array`,
`ascii`, `bail`, `before`, `between`, `boolean`, `confirmed`, `contains`, `current_password`,
`date`, `date_equals`, `date_format`, `decimal`, `declined`, `different`, `digits`, `dimensions`,
`distinct`, `email`, `ends_with`, `enum`, `exists`, `file`, `filled`, `gt/gte`, `image`, `in`,
`integer`, `ip`, `json`, `lt/lte`, `mimes`, `mimetypes`, `missing`, `multiple_of`, `not_in`,
`nullable`, `numeric`, `password`, `present`, `prohibited`, `prohibits`, `required`, `required_if`,
`required_unless`, `required_with`, `required_without`, `same`, `size`, `starts_with`, `string`,
`timezone`, `unique`, `url`, `uuid`, `ulid`.

Regras úteis:

```php
'role' => ['required', Rule::in(['writer', 'admin'])],
'email'=> ['required', Rule::unique('users')->ignore($user->id)],
'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()->uncompromised()],
'photo' => ['required', 'dimensions:min_width=100,min_height=100'],
```

### 7.4 Regra customizada / `Rule` object

```bash
php artisan make:rule Uppercase
```

```php
namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Uppercase implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (strtoupper($value) !== $value) {
            $fail('O campo :attribute deve ser maiúsculo.');
        }
    }
}

// 'name' => ['required', new Uppercase]
```

### 7.5 Arrays aninhados e `*`

```php
$request->validate([
    'user.name'  => ['required'],
    'user.emails'=> ['array', 'max:3'],
    'user.emails.*' => ['email'],
]);
```

---

## 8. Mass Assignment

```php
class Post extends Model
{
    protected $fillable = ['title', 'slug', 'body'];   // whitelist (preferido)
    protected $guarded = ['id'];                        // blacklist
}
```

- Prefira **`$fillable`** e sempre passe dados validados (`$request->validated()`), nunca
  `$request->all()` cru.
- Para "desproteger" conscientemente: `protected $guarded = [];` (evite) ou `Model::unguard()`.
- Em dev, ative a rigidez para pegar erros cedo (ver seção 9).

---

## 9. Rigidez de modelo (recomendado em dev)

```php
// AppServiceProvider::boot()
use Illuminate\Database\Eloquent\Model;

Model::preventLazyLoading(! app()->isProduction());
Model::preventSilentlyDiscardingAttributes(! app()->isProduction());
Model::preventAccessingMissingAttributes(! app()->isProduction());

// atalho (todas as proteções):
Model::shouldBeStrict(! app()->isProduction());
```

Isso transforma N+1, atributos não preenchíveis e atributos ausentes em exceções durante o
desenvolvimento.

---

## 10. Sessão

```php
$value = $request->session()->get('key', 'default');
$request->session()->put('key', 'value');
session(['key' => 'value']);
session('key');
session()->flash('status', 'Salvo!');   // dura 1 request
$request->session()->reflash();
$request->session()->keep(['status']);
$request->session()->forget('key');
$request->session()->flush();
$request->session()->regenerate();       // novo ID (após login)
$request->session()->invalidate();       // destrói + regenera token
$request->session()->regenerateToken();
```

- Drivers: `file`, `cookie`, `database`, `memcached`, `redis`, `dynamodb`, `array`.
- `array` (usado em testes) não persiste.
- **Session blocking** e **session cache** disponíveis para evitar race conditions.
- Cookies são **encriptados** por padrão (`EncryptCookies` no grupo `web`).

---

## 11. Rate Limiting

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

// AppServiceProvider::boot()
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});

RateLimiter::for('uploads', function (Request $request) {
    return $request->user()->vipCustomer()
        ? Limit::none()
        : Limit::perMinute(100)->by($request->user()->id);
});

// limites múltiplos
RateLimiter::for('login', fn (Request $r) => [
    Limit::perMinute(500),
    Limit::perMinute(3)->by($r->input('email')),
]);

// resposta custom e baseada em status
RateLimiter::for('global', fn (Request $r) => Limit::perMinute(1000)->response(
    fn (Request $r, array $headers) => response('Custom', 429, $headers)
));
RateLimiter::for('resource-not-found', fn (Request $r) => Limit::perMinute(10)
    ->by($r->user()?->id ?: $r->ip())
    ->after(fn (Response $res) => $res->status() === 404));
```

```php
Route::middleware('throttle:uploads')->group(function () {
    Route::post('/audio', ...);
});
// throttle com Redis:
->withMiddleware(fn (Middleware $m) => $m->throttleWithRedis());
```

---

## 12. XSS, headers e proxy

- Blade `{{ }}` escapa HTML por padrão. **Nunca** use `{!! $userInput !!}` sem sanitização.
- `Js::from($array)` para injetar dados em JS com segurança.
- Configure `TrustProxies`/`TrustHosts` para HTTPS e IP reais atrás de LB (ver `11-proxy.md`).
- Use HTTPS forçando URL e cookies `Secure`/`SameSite` em produção.

---

## Resumo de Pontos-Chave

- **Auth**: `attempt()` + `session()->regenerate()`; proteja rotas com `auth`/`auth:sanctum`.
- **Sanctum** para tokens de API e SPA (cookie); abilities via middleware `abilities`.
- **Gates** para ações sem modelo; **Policies** para modelos. `#[UsePolicy]` dispensa registro.
- **Criptografia** AES-256-CBC + rotação graciosa com `APP_PREVIOUS_KEYS`.
- **Hash**: bcrypt/argon; `check` valida algoritmo; `needsRehash` para migrar.
- **CSRF** sempre com `@csrf`; exclua URIs no `bootstrap/app.php`.
- **Validação**: Form Requests > validação inline; use `validated()`, `Rule` fluente e
  `Password::min(...)`.
- **Mass assignment**: `$fillable` + dados validados.
- **Strictness** em dev (`Model::shouldBeStrict`) evita bugs silenciosos.
- **Rate limiting** no provider com `RateLimiter::for(...)`.
