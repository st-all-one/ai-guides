# Ferramentas, Starter Kits e Frontend — Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Foco em **escolher e integrar**: ambiente local
> (Sail/Valet/Homestead), deploys simples (Envoy), roteamento por páginas (Folio),
> pacotes, bundling (Vite) e os starter kits oficiais de frontend.

---

## 1. Ambiente de desenvolvimento

### 1.1 Laravel Sail (Docker — recomendado)

```bash
composer require laravel/sail --dev
php artisan sail:install                 # publica compose.yaml e ajusta .env
php artisan sail:add                     # adiciona serviços (mysql, redis, mailpit...)
php artisan sail:install --devcontainer

./vendor/bin/sail up -d                  # sobe containers em background
./vendor/bin/sail down
./vendor/bin/sail artisan migrate        # comandos dentro do container
./vendor/bin/sail composer require ...
./vendor/bin/sail npm run dev
./vendor/bin/sail test
./vendor/bin/sail shell
./vendor/bin/sail share                  # compartilha o site publicamente
```

Alias útil: `alias sail='sh $([ -f sail ] && echo sail || echo vendor/bin/sail)'`.

### 1.2 Laravel Valet (macOS/Linux nativo)

```bash
composer global require laravel/valet
valet install
valet park          # serve todos os projetos de um diretório
valet link          # serve o projeto atual
valet secure        # HTTPS local
valet share         # túnel público
valet tld app       # domínio .app
```

### 1.3 Laravel Homestead (Vagrant)

Box Vagrant pré-configurada (Ubuntu + PHP + bancos + Node). Útil para quem prefere VM a Docker;
hoje o **Sail** costuma ser a opção mais prática.

---

## 2. Deploy simples com Envoy

Envoy roda tarefas remotas definidas em Blade.

```bash
composer global require laravel/envoy
```

```blade
{{-- Envoy.blade.php --}}
@servers(['web' => 'deploy@server.com'])

@task('deploy', ['on' => 'web'])
    cd /var/www/app
    git pull origin main
    composer install --no-dev --optimize-autoloader
    php artisan migrate --force
    php artisan optimize
    php artisan reload
@endtask
```

```bash
envoy run deploy
envoy run deploy --branch=develop
```

> Para produção, considere **Laravel Cloud/Forge** (zero-downtime, gerenciado).

---

## 3. Folio (rotas por páginas Blade)

Folio mapeia arquivos em `resources/views/pages` diretamente para URIs — dispensa `routes/web.php`
para páginas simples.

```bash
composer require laravel/folio
php artisan folio:install
php artisan folio:list
php artisan folio:page user/profile      # cria pages/user/profile.blade.php -> /user/profile
```

```php
// FolioServiceProvider::boot()
use Laravel\Folio\Folio;
Folio::path(resource_path('views/pages/guest'))->uri('/');
Folio::path(resource_path('views/pages/admin'))
    ->uri('/admin')
    ->middleware(['*' => ['auth', 'verified']]);
Folio::domain('{account}.example.com')->path(resource_path('views/pages/admin'));
```

- `pages/index.blade.php` → `/`; `pages/users/[id].blade.php` → `/users/1` (`$id` na view).
- `[...ids]` captura múltiplos segmentos (array); wildcards resolvem **route model binding**.
- Em Blade: `@php` para lógica, `@vite`, e named routes via `Folio::route`. Funciona com cache de rotas.

---

## 4. Empacotar como pacote

```json
{
    "extra": {
        "laravel": {
            "providers": ["MeuPacote\\ServiceProvider"],
            "aliases": { "MeuPacote": "MeuPacote\\Facade" }
        }
    }
}
```

```php
class ServiceProvider extends \Illuminate\Support\ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/meu.php', 'meu');
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'meu');

        $this->publishes([
            __DIR__.'/../config/meu.php' => config_path('meu.php'),
        ], 'meu-config');

        $this->publishes([
            __DIR__.'/../resources/views' => resource_path('views/vendor/meu'),
        ], 'meu-views');
    }
}
```

```bash
php artisan vendor:publish --provider="MeuPacote\ServiceProvider" --tag=meu-config
php artisan vendor:publish --tag=meu-views --force
```

- **Package auto-discovery** via `extra.laravel` (ver `07-configurabilidade-estrutural.md`).
- Publishing por grupos (`--tag`) permite publicar só o que o usuário quer.
- Assets públicos: `$this->publishes([... => public_path('vendor/meu')], 'meu-assets')`.

---

## 5. Vite (assets)

```js
// vite.config.js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [laravel({
        input: ['resources/css/app.css', 'resources/js/app.js'],
        refresh: true,
    })],
});
```

```blade
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

```bash
npm install
npm run dev      # HMR
npm run build    # produção (public/build)
```

Recursos: HMR, prefetch de assets, SSR, variáveis `VITE_*` (`import.meta.env`),
tags com atributos, `@viteReactRefresh` para React. Em testes, o Vite é desabilitado quando
configurado; caso contrário, use `$this->withoutVite()`.

---

## 6. Starter Kits (12.x)

Crie com o instalador (`composer global require laravel/installer`):

```bash
laravel new my-app          # escolha o starter kit no prompt
cd my-app
npm install && npm run build
composer run dev
```

| Kit | Stack | Notas |
|---|---|---|
| **React** | Inertia 2 + React 19 + TS + Tailwind + shadcn/ui | SPA com rotas do Laravel |
| **Vue** | Inertia 2 + Composition API + TS + Tailwind + shadcn-vue | idem |
| **Svelte** | Inertia 2 + Svelte 5 + TS + Tailwind + shadcn-svelte | idem |
| **Livewire** | Livewire + Tailwind + Flux UI (+ Volt) | reativo em PHP |
| **WorkOS AuthKit** | variante dos kits | social login, passkeys, SSO |

- Todos usam **Fortify** para a autenticação (login, registro, reset, verificação) e Sanctum.
- Frontend em `resources/js` (`components/`, `hooks/`, `layouts/`, `pages/`, `lib/`).
- Kits React/Vue/Svelte: publições via `npx shadcn@latest add <componente>`.
- **Breeze/Jetstream não recebem mais atualizações** — use os kits novos.

### Inertia (React/Vue/Svelte)

```php
use Inertia\Inertia;
use Inertia\Response;

Route::get('/users/{id}', function (string $id) {
    return Inertia::render('users/show', ['user' => User::findOrFail($id)]);
})->name('users.show');
```

O componente da página em `resources/js/pages/users/show.tsx` recebe `user` como prop.
SSR opcional (configurável no kit).

### Livewire

Componentes reativos em PHP + Blade, sem bundle JS:

```php
<?php
use Livewire\Component;

new class extends Component {
    public int $count = 0;
    public function increment(): void { $this->count++; }
};
?>
<div>
    <button wire:click="increment">+</button>
    <h1>{{ $count }}</h1>
</div>
```

Combine com **Alpine.js** para interações pontuais.

---

## Resumo de Pontos-Chave

- **Sail** (Docker) é o ambiente local padrão; **Valet** e **Homestead** são alternativas.
- **Envoy** para deploys simples via tarefas Blade; Cloud/Forge para gestão.
- **Folio** mapeia páginas Blade para URIs; suporta parâmetros, model binding e middleware.
- **Pacotes**: service provider + `mergeConfigFrom`/`loadRoutesFrom`/`loadViewsFrom` + `publishes`
  (por `--tag`) e auto-discovery.
- **Vite**: `@vite`, `npm run dev|build`; HMR, prefetch, SSR e `VITE_*`.
- **Starter kits 12**: React/Vue/Svelte (Inertia) e Livewire (Flux); todos com Fortify/Sanctum.
