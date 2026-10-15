# Exemplo mínimo — Laravel 12.x

Exemplo **didático** que demonstra, na prática, os tópicos do dossiê (ver `../00-indice.md`).
Estrutura enxuta de um "mini-sistema" com: **configuração personalizada**, **páginas Blade**
e o esqueleto de um sistema (model, service, controller, form request, provider, rotas),
já no **modelo de bootstrap do Laravel 11/12** (`bootstrap/app.php` + `bootstrap/providers.php`).

> Tudo segue estritamente o Laravel 12.x (PHP 8.2+). Onde um recurso mudou de lugar ou de nome,
> há comentário explicando a fronteira de versão (ex.: `TrustProxies` agora é nativo e configurado
> em `bootstrap/app.php`; não existe mais `app/Http/Kernel.php`).

## Árvore

```
example/
├── .env.example
├── bootstrap/
│   ├── app.php                          # CONFIGURAÇÃO DO FRAMEWORK (routing/middleware/proxy/health)
│   └── providers.php                    # registro dos providers (12)
├── config/site.php                      # CONFIGURAÇÃO PERSONALIZADA
├── routes/web.php                       # rotas (Route::view/redirect, controllers, grupo auth)
├── app/
│   ├── Models/Post.php                  # Eloquent: $fillable, casts(), #[Scope], SoftDeletes
│   ├── Services/PostService.php         # regra de negócio (DI, cache, Collections funcionais)
│   ├── Http/
│   │   ├── Controllers/PageController.php   # thin controller, typed, route model binding
│   │   └── Requests/StorePostRequest.php    # validação/autorização isoladas
│   └── Providers/SiteServiceProvider.php     # view composer + bootstrap estrutural
├── database/migrations/....create_posts_table.php
└── resources/views/
    ├── layouts/app.blade.php            # layout via componente <x-layouts.app>, @stack, @auth
    ├── components/alert.blade.php       # componente anônimo com @props
    ├── home.blade.php                   # componente, @forelse, $loop
    ├── about.blade.php                  # usada por Route::view
    ├── dashboard.blade.php              # área autenticada
    └── posts/{index,show}.blade.php     # listagem (paginate) e detalhe
```

## O que este exemplo mostra (mapeado ao dossiê)

| Arquivo | Tópico do dossiê | Destaque 12.x |
|---|---|---|
| `bootstrap/app.php` + `providers.php` | `02` / `07` | Routing/middleware/exceptions/proxy centralizados; providers registrados aqui |
| `config/site.php` + `.env.example` | `07-configurabilidade-estrutural.md` | `env()` só em config; `config('site.*')` com dot notation |
| `app/Providers/SiteServiceProvider.php` | `07` / `02-poo-arquitetura.md` | Service Provider `register()`/`boot()`, view composer |
| `app/Services/PostService.php` | `01-programacao-funcional.md` / `02` | `pipe()`, `reduce()`, `where()`; DI de `Cache` |
| `app/Http/Controllers/PageController.php` | `08-sintaxe-tipagem.md` | tipos de retorno, `config()`, route model binding, `abort_unless` |
| `app/Http/Requests/StorePostRequest.php` | `03-seguranca.md` / `06-boas-praticas.md` | Form Request, `authorize()`, `rules()`, `@csrf` |
| `app/Models/Post.php` | `10-database.md` | `$fillable`, `casts()`, `#[Scope]`, SoftDeletes |
| `routes/web.php` | `08-sintaxe-tipagem.md` | `Route::view`/`Route::redirect`, grupo `auth` |
| `resources/views/*` | `09-blade.md` | `<x-layouts.app>`, componente anônimo, `@forelse`, `@stack`, `$loop`, escape `{{ }}` |

## Para rodar de verdade (fora do escopo do exemplo)

1. Criar um app Laravel 12: `composer create-project laravel/laravel:^12.0 meuapp`.
2. Copiar `bootstrap/app.php`, `bootstrap/providers.php`, `config/site.php`, `app/...`,
   `routes/web.php`, `database/migrations/...` e `resources/views/...` para o app.
3. Criar a migration `posts` e rodar `php artisan migrate`.
4. Definir `APP_KEY` (`php artisan key:generate`) e as vars `SITE_*` no `.env`.
5. Em produção:

```bash
composer install --optimize-autoloader --no-dev
php artisan optimize          # config + event + route + view cache
php artisan reload            # recarrega workers/reverb/octane
```

## Armadilhas evitadas neste exemplo

- `env()` usado **apenas** em `config/site.php` (nunca em código após `config:cache`).
- **Sem `app/Http/Kernel.php`**: middleware/aliases/grupos em `bootstrap/app.php`.
- **Sem `config/app.php` `providers`**: providers em `bootstrap/providers.php`.
- `TrustProxies` nativo via `$middleware->trustProxies(at: [...])` (não mais `Fideloper\Proxy`).
- Sintaxe PHP 8.2+ com constructor promotion, `readonly`, tipos de retorno e arrow functions.
- Sem `scopeX()` legado: usamos o atributo `#[Scope]`.
