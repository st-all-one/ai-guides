# Deploy e Escala — Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Foco em **colocar em produção e escalar**: cache de
> deploy, reload de serviços, Octane, Concurrency e operação de filas.

---

## 1. Requisitos e permissões

- PHP 8.2+ com extensões usuais (OpenSSL, PDO, Mbstring, Tokenizer, XML, Ctype, JSON, BCMath, Fileinfo).
- Banco suportado (MySQL/MariaDB/PostgreSQL/SQLite/SQL Server) e Redis para cache/fila/sessão.
- Permissão de escrita em `storage/` e `bootstrap/cache/` para o usuário do servidor web.
- `public/index.php` como entry point; `public/` como document root.
- `APP_DEBUG=false` e `APP_ENV=production`.

---

## 2. Otimização de deploy

```bash
composer install --optimize-autoloader --no-dev

php artisan optimize          # config:cache + event:cache + route:cache + view:cache
# granular:
php artisan config:cache
php artisan event:cache
php artisan route:cache
php artisan view:cache

php artisan optimize:clear     # limpa todos os caches
```

- Após `config:cache`, `env()` só funciona em arquivos de `config/`.
- `route:cache` **não aceita closures** de rota (use controllers).
- Recarregue serviços de longa duração:

```bash
php artisan reload             # workers, Reverb, Octane (se estiver rodando)
php artisan queue:restart      # ou, se não usar Horizon
php artisan horizon:terminate  # se usar Horizon
```

### Health check

```php
// bootstrap/app.php
->withRouting(web: ..., commands: ..., health: '/up')
```

`/up` retorna 200 se a app bootou; dispara `DiagnosingHealth` (use um listener para checar
banco/cache e lançar exceção em caso de problema).

### Zero-downtime

- Prefira **Laravel Cloud** (auto-scaling, sem `reload` manual) ou **Forge**.
- Deploy atômico + `php artisan down`/`up` só quando inevitável (gera downtime).
- `php artisan migrate --isolated` evita migrações simultâneas em múltiplos servidores.

---

## 3. Octane (servidor de aplicação)

Mantém a app em memória (FrankenPHP/RoadRunner/Swoole), removendo o bootstrap por request.

```bash
composer require laravel/octane
php artisan octane:install --server=frankenphp   # ou roadrunner | swoole
php artisan octane:start --workers=8 --task-workers=4 --max-requests=500
php artisan octane:reload
php artisan octane:stop
php artisan octane:status
```

FrankenPHP via Docker:

```dockerfile
FROM dunglas/frankenphp
RUN install-php-extensions pcntl
COPY . /app
ENTRYPOINT ["php", "artisan", "octane:frankenphp"]
```

### Regras de ouro com Octane

- Use bindings **`scoped`** (não `singleton`) para estado por request/job.
- Evite estado mutável em propriedades **estáticas** de serviços.
- Monitore **memory leaks**; `--max-requests` recicla workers.
- Tarefas concorrentes: `Octane::concurrently([...])`.
- Ticks/intervals: `Octane::tick('name', fn () => ...)->seconds(5);`
- Cache em memória compartilhada: `Cache::store('octane')->put('k', $v, 30);`
- Tabelas em memória para dados rápidos entre requests (Swoole tables).

---

## 4. Concurrency (tarefas paralelas no mesmo processo)

```php
use Illuminate\Support\Facades\Concurrency;

[$users, $orders] = Concurrency::run([
    fn () => DB::table('users')->count(),
    fn () => DB::table('orders')->count(),
]);

Concurrency::driver('fork')->run([...]);     // escolhe o driver
Concurrency::defer([                          // executa após a resposta
    fn () => Metrics::report('users'),
    fn () => Metrics::report('orders'),
]);
```

- Ideal para I/O independente (chamadas externas, queries pesadas).
- Configure o driver em `config/concurrency.php` (`php artisan config:publish concurrency`).

---

## 5. Filas em produção

```bash
php artisan queue:work --queue=high,default --tries=3 --timeout=120
php artisan queue:listen          # dev: recarrega código a cada job
php artisan queue:restart         # recarrega workers (após deploy)
php artisan queue:failed
php artisan queue:retry all
php artisan queue:prune-failed --hours=48
php artisan queue:clear
```

- Use **Supervisor** para manter `queue:work` vivo (ou **Horizon** com Redis).
- Jobs idempotentes; defina `tries`, `timeout`, `backoff`, `uniqueId`.
- Evite serializar payloads gigantes (`WithoutRelations`, passar IDs).
- Monitore com **Horizon** (métricas) ou **Pulse**.

Exemplo de programa Supervisor:

```ini
[program:laravel-worker]
command=php /var/www/app/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
numprocs=4
autostart=true
autorestart=true
user=www-data
```

---

## 6. Escala horizontal

- **Stateless** na web: sessão/cache em **Redis**/banco; evite arquivos locais.
- Separe conexões de leitura/escrita (`config/database.php` read/write).
- Cache de rotas/config/views e OPcache ativos.
- CDN + cache HTTP para conteúdo estático.
- Filas e broadcast escalam com workers adicionais atrás de Supervisor/Horizon.
- Índices corretos + eager loading (ver `05-performance.md`) evitam gargalos de banco.
- Em Octane, dimensione `--workers` ~ núcleos; balanceadores cuidam do restante.

---

## 7. Checklist de produção

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `APP_KEY` definida.
- [ ] `composer install --no-dev --optimize-autoloader`.
- [ ] `php artisan optimize` executado no deploy.
- [ ] Migrações com `--force` (e `--isolated` em multi-servidor).
- [ ] Workers recarregados (`reload`/`queue:restart`).
- [ ] Health check `/up` monitorado.
- [ ] Cache de config/rotas/views ativo.
- [ ] `storage` e `bootstrap/cache` com permissão correta.
- [ ] Trusted proxies/hosts configurados (ver `11-proxy.md`).
- [ ] Logs/erros e observabilidade (Horizon/Pulse/Telescope) configurados.

---

## Resumo de Pontos-Chave

- Deploy: `composer install --no-dev --optimize-autoloader` + `php artisan optimize` +
  `reload`/`queue:restart`.
- `env()` só em config após `config:cache`; `route:cache` exige controller (sem closures).
- **Octane** reduz bootstrap — use `scoped`, cuidado com estado/leaks; FrankenPHP é o server padrão.
- **Concurrency** (`run`/`defer`) para tarefas independentes.
- Filas: `queue:work` sob Supervisor ou Horizon; `--tries/--timeout/--backoff`.
- Escala horizontal com app stateless, Redis para cache/sessão, read/write split e índices.
- Health check `/up` + gate de observabilidade fecham a operação.
