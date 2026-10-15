# API, Autenticação e Autorização Avançada — Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Foco em **como integrar** os pacotes oficiais de auth
> e API: Sanctum, Fortify, Passport, Socialite, verificação de e-mail, reset de senha,
> Precognition e Pennant (feature flags).
> Auth básica/CSRF/validação estão em `03-seguranca.md`.

---

## 1. Qual pacote usar?

| Objetivo | Pacote |
|---|---|
| SPA própria + API de terceiros; tokens simples | **Sanctum** (recomendado) |
| Backend de autenticação headless (login, registro, reset, 2FA) | **Fortify** |
| OAuth2 completo (grant types, apps de terceiros) | **Passport** |
| Login social (GitHub/Google/…) | **Socialite** |
| Feature flags / rollout gradual | **Pennant** |
| Validação "ao vivo" no frontend | **Precognition** |

Sanctum e Fortify **não competem**: use Fortify para as rotas de auth e Sanctum para tokens/SPA.

---

## 2. Sanctum (API tokens + SPA)

```bash
php artisan install:api        # cria routes/api.php e instala Sanctum
```

### 2.1 Tokens de API

```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
}

$token = $user->createToken('nome', ['server:update']);   // NewAccessToken
return ['token' => $token->plainTextToken];               // exibir 1x

$user->tokens;                  // relação
$user->tokenCan('server:update');
$user->tokenCant('server:update');

Route::get('/user', fn ($r) => $r->user())->middleware('auth:sanctum');

$user->tokens()->delete();                              // revoga todas
$request->user()->currentAccessToken()->delete();       // a atual
```

Middlewares de abilities (registre os aliases em `bootstrap/app.php`):

```php
Route::get('/orders', ...)->middleware(['auth:sanctum', 'abilities:check-status,place-orders']);
Route::get('/orders', ...)->middleware(['auth:sanctum', 'ability:check-status,place-orders']);
```

Expiração: `config/sanctum.php` → `'expiration' => 525600` (min) ou 3º arg de `createToken`.
Limpe com `sanctum:prune-expired` agendado.

### 2.2 SPA (cookie de sessão, sem tokens)

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
})
```

Integração no frontend:

```js
// resources/js/bootstrap.js
axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;

await axios.get('/sanctum/csrf-cookie');       // inicializa CSRF
await axios.post('/login', { email, password });
```

Requisitos: mesmo domínio de topo; `config/cors.php` com `supports_credentials => true`;
`config/session.php` `'domain' => '.meudominio.com'`; enviar `Accept: application/json`.
Configure os domínios confiáveis em `config/sanctum.php` (`stateful`) com
`Sanctum::currentApplicationUrlWithPort()` / `Sanctum::currentRequestHost()`.

---

## 3. Fortify (auth headless)

```bash
composer require laravel/fortify
php artisan fortify:install      # publica actions, config, provider e migrations
php artisan migrate
```

```php
// config/fortify.php — habilite apenas o que precisa
'features' => [
    Features::registration(),
    Features::resetPasswords(),
    Features::emailVerification(),
    Features::updateProfileInformation(),
    Features::updatePasswords(),
    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]),
],
'views' => false,                // SPA: não registrar rotas de view
```

```php
// FortifyServiceProvider::boot()
Fortify::loginView(fn () => view('auth.login'));
Fortify::registerView(fn () => view('auth.register'));
Fortify::requestPasswordResetLinkView(fn () => view('auth.forgot-password'));
Fortify::resetPasswordView(fn ($request) => view('auth.reset-password', ['request' => $request]));
Fortify::twoFactorChallengeView(fn () => view('auth.two-factor-challenge'));
Fortify::verifyEmailView(fn () => view('auth.verify-email'));

// autenticação customizada
Fortify::authenticateUsing(function (Request $request) {
    $user = User::where('email', $request->email)->first();
    if ($user && Hash::check($request->password, $user->password)) {
        return $user;
    }
});
```

Rotas geradas: `POST /login`, `POST /logout`, `POST /register`, `POST /forgot-password`,
`POST /reset-password`, `POST /two-factor-challenge`, `/user/two-factor-*`, etc.
Rode `php artisan route:list` para ver tudo. Customize ações em `app/Actions/Fortify/*`.

2FA (Blade): `$user->twoFactorQrCodeSvg()`, `$user->recoveryCodes()`; endpoints
`/user/two-factor-authentication` (DELETE), `/user/confirmed-two-factor-authentication` (POST).

---

## 4. Passport (OAuth2 completo)

```bash
composer require laravel/passport
php artisan passport:install        # cria chaves + clients
```

```php
use Laravel\Passport\HasApiTokens;

class User extends Authenticatable { use HasApiTokens; }

// config/auth.php: guard 'api' driver 'passport'
// Passport::tokensCan(['check-status' => '...', 'place-orders' => '...']);

$token = $user->createToken('nome', ['check-status'])->accessToken;
Route::get('/user', fn ($r) => $r->user())->middleware('auth:api');
Route::get('/orders', ...)->middleware(['auth:api', 'scope:check-status,place-orders']);

$user->tokenCan('check-status');
```

- Crie clientes de terceiros via `ClientRepository::createAuthorizationCodeGrantClient(...)`.
- Grant types: Authorization Code (+PKCE), Device, Password, Implicit, Client Credentials,
  Personal Access Tokens.
- Customize as views com `Passport::authorizationView(...)`.

Use Passport **só** quando precisar de OAuth2 de verdade; caso contrário, Sanctum.

---

## 5. Socialite (login social)

```bash
composer require laravel/socialite
```

```php
// config/services.php
'github' => [
    'client_id' => env('GITHUB_CLIENT_ID'),
    'client_secret' => env('GITHUB_CLIENT_SECRET'),
    'redirect' => env('GITHUB_REDIRECT_URI'),
],
```

```php
use Laravel\Socialite\Socialite;

Route::get('/auth/redirect', fn () =>
    Socialite::driver('github')->scopes(['read:user'])->redirect());

Route::get('/auth/callback', function () {
    $githubUser = Socialite::driver('github')->user();

    $user = User::updateOrCreate(['github_id' => $githubUser->id], [
        'name' => $githubUser->name,
        'email' => $githubUser->email,
        'github_token' => $githubUser->token,
        'github_refresh_token' => $githubUser->refreshToken,
    ]);

    Auth::login($user);
    return redirect('/dashboard');
});
```

Métodos úteis: `setScopes`, `with(['hd' => 'example.com'])`, `asBotUser()` (Slack),
`$user->token / refreshToken / expiresIn / getId() / getNickname()`.

---

## 6. Verificação de e-mail

```php
use Illuminate\Contracts\Auth\MustVerifyEmail;

class User extends Authenticatable implements MustVerifyEmail {}
```

Migração precisa da coluna `email_verified_at`. O evento `Registered` dispara o e-mail
automaticamente (`event(new Registered($user))` no registro manual).

Rotas esperadas:

```php
// aviso
Route::get('/email/verify', fn () => view('auth.verify-email'))
    ->middleware('auth')->name('verification.notice');

// handler do link (signed)
Route::get('/email/verify/{id}/{hash}', function (EmailVerificationRequest $request) {
    $request->fulfill();
    return redirect('/home');
})->middleware(['auth', 'signed'])->name('verification.verify');

// reenviar
Route::post('/email/verification-notification', function (Request $request) {
    $request->user()->sendEmailVerificationNotification();
    return back()->with('status', 'Link enviado!');
})->middleware(['auth', 'throttle:6,1'])->name('verification.send');
```

Proteja rotas com `->middleware('verified')`. Customize via `VerificationNotification` e os
métodos `hasVerifiedEmail`/`markEmailAsVerified` no model.

---

## 7. Reset de senha

`config/auth.php` → driver `database` ou `cache`. Model precisa de `Notifiable` +
`CanResetPassword` (já no `User` padrão).

```php
Route::get('/forgot-password', fn () => view('auth.forgot-password'))
    ->middleware('guest')->name('password.request');

Route::post('/forgot-password', function (Request $request) {
    $request->validate(['email' => 'required|email']);
    $status = Password::sendResetLink($request->only('email'));
    return $status === Password::ResetLinkSent
        ? back()->with('status', __($status))
        : back()->withErrors(['email' => __($status)]);
})->middleware('guest')->name('password.email');

Route::get('/reset-password/{token}', fn ($token) => view('auth.reset-password', ['token' => $token]))
    ->middleware('guest')->name('password.reset');

Route::post('/reset-password', function (Request $request) {
    $request->validate([
        'token' => 'required',
        'email' => 'required|email',
        'password' => ['required', 'confirmed', Password::min(8)],
    ]);
    $status = Password::reset($request->only('email', 'password', 'password_confirmation', 'token'),
        function ($user, $password) { $user->forceFill(['password' => Hash::make($password)])->save(); });
    return $status === Password::PasswordReset
        ? redirect()->route('login')->with('status', __($status))
        : back()->withErrors(['email' => [__($status)]]);
})->middleware('guest')->name('password.update');
```

Limpe tokens expirados: `php artisan auth:clear-resets` (agende).

---

## 8. Precognition (validação ao vivo no frontend)

```php
use Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests;

Route::post('/users', fn (StoreUserRequest $request) => /* ... */)
    ->middleware([HandlePrecognitiveRequests::class]);
```

O frontend (Vue/React/Alpine) usa helpers (`laravel-precognition-vue`, etc.) e envia os headers
`Precognition: true` / `Precognition-Validate-Only`. O Form Request roda como sempre; para evitar
efeitos colaterais durante a validação, use `$request->isPrecognitive()`.

---

## 9. Pennant (feature flags)

```bash
composer require laravel/pennant
php artisan vendor:publish --provider="Laravel\Pennant\PennantServiceProvider"
php artisan migrate
```

```php
use Laravel\Pennant\Feature;
use Illuminate\Support\Lottery;

// AppServiceProvider::boot() — feature por closure
Feature::define('new-api', fn (User $user) => match (true) {
    $user->isInternalTeamMember() => true,
    $user->isHighTrafficCustomer() => false,
    default => Lottery::odds(1 / 100),
});

// ou só o sorteio
Feature::define('site-redesign', Lottery::odds(1, 1000));
```

Feature baseada em classe: `php artisan pennant:feature NewApi` → `app/Features/NewApi.php`
com `resolve()`. Use `#[Name('new-api')]` para desacoplar o nome armazenado.

```php
Feature::active('new-api');                 // escopo = usuário autenticado
Feature::for($user)->active('new-api');
Feature::allAreActive(['a', 'b']);
Feature::anyAreActive(['a', 'b']);
Feature::inactive('new-api');
Feature::value('plan');                     // valores ricos
Feature::activate('new-api');               // e ->for($user)->activate(...)
Feature::deactivate('new-api');
Feature::forget('new-api');
```

No Blade: `@feature('new-api') ... @endfeature`. Testável com `Feature::fake([...])`.

---

## Resumo de Pontos-Chave

- **Sanctum** é o padrão para API + SPA; `install:api`, `statefulApi()`, tokens com abilities.
- **Fortify** dá o backend de auth (rotas + actions) sem UI; `features` configuráveis; 2FA incluso.
- **Passport** só quando OAuth2 completo for requisito.
- **Socialite** para login social; fluxo `redirect()` → `user()` → `Auth::login()`.
- **Verificação de e-mail** via `MustVerifyEmail` + rotas `verification.*` + middleware `verified`.
- **Reset de senha** com `Password::sendResetLink`/`Password::reset` + rotas `password.*`.
- **Precognition** reusa as regras do backend para validação ao vivo no frontend.
- **Pennant** para feature flags com escopo por usuário e rollout por sorteio.
