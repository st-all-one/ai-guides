# Configuração e ambiente — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. `env()` apenas em `config/*`;
> `config:cache` congela valores; defaults de prefixos mudaram no 13.

---

## 1. `.env` do skeleton 13

O `.env.example` define `APP_NAME`, `APP_ENV`, `APP_KEY`, `APP_DEBUG`, `APP_URL`,
locale/faker, `APP_MAINTENANCE_DRIVER`, `BCRYPT_ROUNDS=12`, `LOG_*`, `DB_*`,
`SESSION_*`, `BROADCAST_CONNECTION`, `FILESYSTEM_DISK`, `QUEUE_CONNECTION`,
`CACHE_STORE`, Memcached/Redis, mail, AWS e `VITE_APP_NAME`
(`samples/samples-env.example:1-65`).

Regras:

1. **Nunca chame `env()` fora de `config/*`** quando `config:cache` pode estar ativo.
2. `APP_DEBUG=false` e `APP_ENV=production` em produção.
3. `APP_KEY` gerado uma vez e rotacionado via `APP_PREVIOUS_KEYS` quando necessário.
4. `LOG_DEPRECATIONS_CHANNEL=null` por padrão
   (`samples/samples-config-logging.php:34-37`); aponte para um canal real em staging
   para preparar upgrades de dependências.

---

## 2. Mudanças de defaults que afetam config existente

| Config | 12 | 13 | Ação | Fonte |
|---|---|---|---|---|
| Cache prefix | `Str::slug(APP_NAME, '_').'_cache_'` | `Str::slug(APP_NAME).'-cache-'` | Definir `CACHE_PREFIX` | `samples/doc-upgrade-13.md:95-117` |
| Redis prefix | `..._database_` | `...-database-` | Definir `REDIS_PREFIX` | `samples/doc-upgrade-13.md:105-114` |
| Session cookie | `..._session` | `...-session` | Definir `SESSION_COOKIE` | `samples/doc-upgrade-13.md:105-117` |
| `cache.serializable_classes` | ausente | `false` | Allow-list se guardar objetos | `samples/samples-config-cache.php:131-134` |
| `session.serialization` | `php` (skeleton anterior) | `json` | Decidir sobre logout na migração | `samples/samples-config-session.php:219-231` |

Se sua aplicação já define essas chaves em `config/*`, a mudança de fallback não afeta
você (`samples/doc-upgrade-13.md:99-103`). Caso contrário, cache é invalidado e
sessões são encerradas — ou corrija explicitamente ou aceite com janela planejada.

---

## 3. Cache de configuração, eventos, rotas e views

```bash
php artisan config:cache       # congela env() lido em config/*
php artisan route:cache        # requer controllers sem closures em rotas
php artisan view:cache
php artisan event:cache
php artisan optimize           # todos acima
php artisan optimize:clear     # limpa todos
```

O script `test` do skeleton roda `config:clear` antes de `artisan test`
(`samples/samples-composer.json:47-50`) — isso evita que um `config:cache` de deploy
vaze para a suíte. Reproduza no CI.

> **Armadilha:** `config:cache` + `env('FLAG')` direto em código retorna `null`.
> Sempre expvia o valor em `config/services.php` ou similar e leia via `config('services.flag')`.

---

## 4. Maintenance mode e health check

O skeleton registra `health: '/up'` no `withRouting`
(`samples/samples-bootstrap-app.php:8-13`). Use `php artisan down --retry=60` para
drenar tráfego com retry e `up` para voltar. `APP_MAINTENANCE_DRIVER=file` é o padrão;
`APP_MAINTENANCE_STORE` permite store compartilhado em múltiplos nós
(`samples/samples-env.example:9-10`).

---

## 5. Ambientes locais e agentes

O skeleton traz `AGENTS.md`/`CLAUDE.md` com instruções de setup para PHP 8.5 via
`php.new`, seguidas de `composer require laravel/boost --dev` e
`php artisan boost:install` (`laravel/laravel@13.x:AGENTS.md`). São arquivos do projeto
**skeleton**, não obrigatórios no seu app — mas úteis como convenção de onboarding para
agentes.

> Outras skills não são necessárias: tudo que você precisa para Laravel 13 está
> neste guia e nos samples verificados.

---

## 6. Config por subsistema (mapa rápido)

| Arquivo | O que controlar | Capítulo |
|---|---|---|
| `config/logging.php` | canais, stack, deprecations, níveis | `05-logs-e-erros.md` |
| `config/cache.php` | stores, `serializable_classes`, failover | `08-cache-e-filas.md` |
| `config/session.php` | `serialization`, driver, lifetime | `04-seguranca.md` |
| `config/queue.php` | conexões, retry, failed jobs | `08-cache-e-filas.md` |
| `config/database.php` | conexões e parâmetros | `09-banco-e-eloquent.md` |
| `bootstrap/app.php` | routing/middleware/exceções | `02-arquitetura-e-ciclo-de-vida.md` |

## Resumo de Pontos-Chave

- **`env()` só em `config/*`**; `config:cache` congela valores.
- **Prefixos de cache/Redis e cookie de sessão mudaram no 13** — defina explicitamente.
- **`serializable_classes: false` e sessão JSON** são novos defaults de segurança.
- **`artisan optimize`** agrega todos os caches de deploy; `optimize:clear` desfaz.
- **Testes devem limpar config** antes de rodar, como faz o script do skeleton.
- **`/up` + `down --retry` / `up`** formam o ciclo de maintenance.
- **`APP_DEBUG=false` em produção**; nunca logue `APP_KEY`.
