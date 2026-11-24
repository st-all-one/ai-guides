# Instalação e fundamentos — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Lançamento 17/03/2026; bug fixes até Q3 2027;
> security fixes até 17/03/2028. Todo fato abaixo é verificável em `samples/`.

---

## 1. Matriz de versões e o que muda em relação ao 12

O piso de PHP sobe de 8.2 para **8.3**: a política de suporte lista Laravel 13 com
`PHP (*) 8.3 - 8.5`, release `March 17th, 2026`, bug fixes `Q3 2027`, security
`March 17th, 2028` (`samples/doc-releases-13.md:26-33`). Laravel e seus pacotes seguem
SemVer; use sempre `^13.0` porque majors têm breaking changes, e evite named arguments
em chamadas ao framework — os nomes dos parâmetros não são cobertos pela compatibilidade
(`samples/doc-releases-13.md:8-20`).

O `composer.json` real do skeleton 13.x fixa as dependências mínimas que você deve
esperar em um projeto novo:

samples/samples-composer.json:8-21
```json
    "require": {
        "php": "^8.3",
        "laravel/framework": "^13.17",
        "laravel/tinker": "^3.0"
    },
    "require-dev": {
        "fakerphp/faker": "^1.23",
        "laravel/pail": "^1.2.5",
        "laravel/pao": "^1.0.6",
        "laravel/pint": "^1.27",
        "mockery/mockery": "^1.6",
        "nunomaduro/collision": "^8.6",
        "phpunit/phpunit": "^12.5.12"
    },
```

Para atualizar a partir do 12, o guia oficial exige `laravel/framework ^13.0`,
`laravel/boost ^2.0`, `laravel/tinker ^3.0`, `phpunit/phpunit ^12.0` e
`pestphp/pest ^4.0` (`samples/doc-upgrade-13.md:62-77`). Laravel Boost `^2.0` é
opcional em projeto novo, mas é o mecanismo first-party do comando
`/upgrade-laravel-v13` (`samples/doc-upgrade-13.md:57-60`).

| Item | 12.x | 13.x | Consequência prática |
|---|---|---|---|
| PHP mínimo | 8.2 | 8.3 | Atualize runtime e CI antes do `composer update` |
| PHPUnit | ^11 | ^12 | Ajustes em suites e assertions |
| Pest | ^3 | ^4 | Atualize plugins |
| Tinker | ^2 | ^3 | Revisar scripts customizados |
| Installer | anterior | atualizado | `composer global update laravel/installer` ou Herd atualizado (`samples/doc-upgrade-13.md:79-90`) |

---

## 2. Criando o projeto

O caminho canônico continua sendo Composer (installer opcional). O skeleton traz
scripts `setup`, `dev`, `test` e hooks `post-root-package-install` /
`post-create-project-cmd` que geram `.env`, `APP_KEY`, `database/database.sqlite` e
rodam as migrations iniciais (`samples/samples-composer.json:34-69`). O comando de setup
roda `composer install`, copia `.env.example`, gera chave, migra, instala npm com
`--ignore-scripts` e compila Vite (`samples/samples-composer.json:34-44`).

```bash
composer create-project laravel/laravel meu-app
cd meu-app
composer run setup          # MVP local determinístico
php artisan test            # equivalente ao script composer test
```

O script `test` do skeleton limpa a config antes de rodar a suíte
(`samples/samples-composer.json:45-49`) — isso evita que `config:cache` de um deploy
contamine os testes. Reproduza isso no CI.

> **Segurança:** `APP_KEY` em branco no `.env.example` é intencional
> (`samples/samples-env.example:1-5`). Gere a chave antes de qualquer request e nunca
> comite `.env`. Em produção, use `APP_DEBUG=false` e `APP_ENV=production`.

---

## 3. Primeira configuração e defaults que mudaram

O `.env.example` 13.x mantém `LOG_CHANNEL=stack`, `LOG_STACK=single`, `LOG_LEVEL=debug`,
`SESSION_DRIVER=database`, `QUEUE_CONNECTION=database`, `CACHE_STORE=database` e
`BCRYPT_ROUNDS=12` (`samples/samples-env.example:15-35`). O `APP_URL` padrão é
`http://localhost:8000` (`samples/samples-env.example:5`).

Dois defaults de segurança mudaram no skeleton e você **deve** preservá-los:

1. `config/session.php` agora usa `'serialization' => 'json'` com comentário
   explicando que `'php'` permite objetos, mas abre porta a *gadget chain* se
   `APP_KEY` vazar (`samples/samples-config-session.php:219-231`).
2. `config/cache.php` inclui `'serializable_classes' => false` para impedir
   unserialização arbitrária de objetos em cache (`samples/samples-config-cache.php:131-134`).

O `bootstrap/app.php` do skeleton 13 configura `web`, `commands`, `health: '/up'`,
middleware vazio e `shouldRenderJsonWhen` para rotas `api`, `api/*` ou requests que
esperam JSON (`samples/samples-bootstrap-app.php:8-21`). Não procure `Kernel.php`: a
configuração vive aqui desde o 11.

samples/samples-bootstrap-app.php:8-21
```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api', 'api/*') || $request->expectsJson(),
        );
    })->create();
```

---

## 4. Estrutura de diretórios e limites de responsabilidade

```
app/Models/             Eloquent (App\Models\X)
app/Ai/Agents/          agentes do AI SDK (13+)
app/Services/ app/Actions/  lógica de negócio injetável
app/Http/Controllers/   controllers finos
app/Http/Requests/      Form Requests
app/Http/Middleware/    middleware de aplicação
app/Providers/          service providers
app/Console/Commands/   comandos Artisan
app/Events/ app/Listeners/ app/Jobs/ app/Mail/ app/Notifications/ app/Policies/
config/                 só aqui chame env()
bootstrap/app.php       roteamento/middleware/exceções/agenda
bootstrap/providers.php providers da aplicação
routes/web.php routes/console.php   (+ api.php após install:api)
database/{migrations,factories,seeders}/
tests/{Feature,Unit}/
samples/                fontes verbatim citadas neste dossiê
```

O autoload PSR-4 do skeleton cobre `App\`, `Database\Factories\` e
`Database\Seeders\`, com `Tests\` em autoload-dev (`samples/samples-composer.json:20-31`).
Respeite esses namespaces: criar classes fora delas sem ajustar o Composer gera
`Class not found` em produção, onde o autoload é otimizado.

---

## 5. Pipelines recomendados de desenvolvimento

- **Local:** `composer run dev` usa `artisan dev` com timeout de processo desabilitado
  (`samples/samples-composer.json:40-44`). Isso mantém Vite, filas e logs vivos juntos.
- **Testes:** `composer test` limpa config e roda `artisan test`
  (`samples/samples-composer.json:45-49`).
- **Deploy:** nunca rode `composer install` sem `--no-dev --optimize-autoloader` em
  produção; combine com `artisan optimize` (detalhes em `15-deploy-e-operacao.md`).

---

## 6. Armadilhas de primeiro contato com o 13

- PHP 8.2 no servidor: o Composer recusa `php ^8.3`; não tente `ignore-platform-reqs`.
- Usar `array_first($arr, $cb)` do pacote `laravel/helpers`: o polyfill PHP 8.5 do
  Symfony define `array_first()` com semântica diferente no 13; prefira `Arr::first()`
  (`samples/doc-upgrade-13.md:448-469`).
- Assumir `419` para toda falha de request forgery: no modo `originOnly` a resposta é
  `403` (`samples/doc-csrf.md:88-90`).
- Migrar configs do 12 sem revisar prefixos: cache/Redis e cookie de sessão agora usam
  sufixos hifenizados (`samples/doc-upgrade-13.md:95-118`).
- Rodar testes com `config:cache` ativo: use o padrão do skeleton (limpar config antes).

## Resumo de Pontos-Chave

- **PHP 8.3 é o piso**; Symfony/polyfill e named arguments são armadilhas de compatibilidade.
- **Skeleton 13 já endurece sessão JSON e cache sem unserialização arbitrária.**
- **`bootstrap/app.php` concentra routing, middleware e exceções**; não existe `Kernel.php`.
- **`composer run setup` é o caminho determinístico** para projeto novo.
- **Scripts de teste limpam `config:cache`** antes da suíte — replique no CI.
- **Mude os prefixos de cache/sessão explicitamente** se vier do 12 e depender dos defaults.
