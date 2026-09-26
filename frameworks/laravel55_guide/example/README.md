# Exemplo mínimo — Laravel 5.5.50

Exemplo **didático** que demonstra, na prática, os tópicos do dossiê (ver `../00-indice.md`).
Estrutura enxuta de um "mini-sistema" com: **configuração personalizada**, **páginas Blade**
e o esqueleto de um sistema (model, service, controller, form request, middleware, provider, rotas).

> Tudo segue estritamente o Laravel 5.5.50. Onde um recurso é de versão posterior, está
> comentado para NÃO ser usado (ex.: `@csrf` é 5.6+ → usamos `{{ csrf_field() }}`).

## Árvore

```
example/
├── .env.example
├── config/site.php                      # CONFIGURAÇÃO PERSONALIZADA
├── routes/web.php                       # rotas (Route::view/redirect, controllers, grupo auth)
├── app/
│   ├── Models/Post.php                  # Eloquent: $fillable, $casts, accessor, scope
│   ├── Services/PostService.php         # regra de negócio (DI, cache, Collections funcionais)
│   ├── Http/
│   │   ├── Controllers/PageController.php   # thin controller, route model binding
│   │   ├── Requests/StorePostRequest.php    # validação/autorização isoladas
│   │   └── Middleware/TrustProxies.php       # proxy/HTTPS atrás de load balancer (5.5)
│   └── Providers/SiteServiceProvider.php     # view composer + bootstrap estrutural
└── resources/views/
    ├── layouts/app.blade.php            # herança, @stack, @auth/@else
    ├── components/alert.blade.php       # Blade component/slot (5.5)
    ├── home.blade.php                   # @component, @forelse, $loop
    ├── about.blade.php                  # usada por Route::view
    ├── dashboard.blade.php              # área autenticada
    └── posts/{index,show}.blade.php     # listagem (paginate) e detalhe
```

## O que este exemplo mostra (mapeado ao dossiê)

| Arquivo | Tópico do dossiê | Destaque 5.5 |
|---|---|---|
| `config/site.php` + `.env.example` | `07-configurabilidade-estrutural.md` | `env()` só em config; `config('site.*')` com dot notation |
| `app/Providers/SiteServiceProvider.php` | `07` / `02-poo-arquitetura.md` | Service Provider `register()`/`boot()`, view composer |
| `app/Services/PostService.php` | `01-programacao-funcional.md` / `02` | `pipe()`, `reduce()`, `where()`; DI de `Cache` |
| `app/Http/Controllers/PageController.php` | `08-sintaxe-tipagem.md` | tipo de retorno `View`, `config()`, route model binding, `abort_unless` |
| `app/Http/Requests/StorePostRequest.php` | `03-seguranca.md` / `06-boas-praticas.md` | Form Request, `authorize()`, `rules()`, `{{ csrf_field() }}` |
| `app/Http/Middleware/TrustProxies.php` | `11-proxy.md` | `Fideloper\Proxy` embutido no 5.5, `$proxies`/`$headers` |
| `app/Models/Post.php` | `10-database.md` | `$fillable`, `$casts`, accessor, `scopePublished`, SoftDeletes |
| `routes/web.php` | `08-sintaxe-tipagem.md` | `Route::view`/`Route::redirect` (5.5), grupo `auth` |
| `resources/views/*` | `09-blade.md` | `@extends`/`@yield`, `@component`/`@slot`, `@forelse`, `@stack`, `$loop`, escape `{{ }}` |

## Para rodar de verdade (fora do escopo do exemplo)

1. Criar um app Laravel 5.5: `composer create-project laravel/laravel:5.5.* meuapp`.
2. Copiar `config/site.php`, `app/...`, `routes/web.php` e `resources/views/...` para o app.
3. Registrar providers/middleware em `config/app.php` e `app/Http/Kernel.php`:
   - `App\Providers\SiteServiceProvider::class` em `providers`.
   - `App\Http\Middleware\TrustProxies::class` em `Kernel::$middleware` (logo no topo).
4. Criar a migration `posts` (id, title, slug unique, body text, published_at nullable, timestamps, softDeletes) e rodar `php artisan migrate`.
5. Definir `APP_KEY` (`php artisan key:generate`) e as vars `SITE_*` no `.env`.
6. Em produção: `php artisan config:cache && php artisan route:cache && php artisan view:cache`
   (o `php artisan optimize` **não existe** no 5.5 — foi removido).

## Armadilhas evitadas neste exemplo

- `env()` usado **apenas** em `config/site.php` (nunca em código após `config:cache`).
- Sem arrow functions (`fn =>`) — PHP 7.1 do 5.5 exige `function () {}`.
- Sem typed properties nem union types (PHP 7.4 / 8.0).
- Sem `@csrf` (5.6+): formulários usariam `{{ csrf_field() }}`.
- `Route::view`/`Route::redirect` e `TrustProxies` embutido são recursos legítimos do 5.5.
