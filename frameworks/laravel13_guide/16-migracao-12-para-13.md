# Migração de Laravel 12.x para 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Fonte integral: guia oficial de upgrade
> (`samples/doc-upgrade-13.md`) e release notes (`samples/doc-releases-13.md`).
> Tempo estimado pelo mantenedor: **10 minutos** (`samples/doc-upgrade-13.md:51`).

---

## 1. Plano de execução (ordem importa)

1. **Atualize o runtime** para PHP 8.3+ (`samples/doc-releases-13.md:26-33`).
2. **Atualize dependências** no `composer.json` (`samples/doc-upgrade-13.md:62-77`).
3. **Atualize o installer** global ou o Herd (`samples/doc-upgrade-13.md:79-90`).
4. **Trate os dois impactos altos**: dependências e `PreventRequestForgery`
   (`samples/doc-upgrade-13.md:7-16`).
5. **Trate os impactos médios**: `serializable_classes`, `upsert` com `uniqueBy` vazio
   (`samples/doc-upgrade-13.md:18-26`).
6. **Revise os impactos baixos** aplicáveis ao seu código (categorias listadas em
   `samples/doc-upgrade-13.md:28-47`).
7. **Sincronize configs** com o skeleton usando o comparison oficial, sem copiar cego
   (`samples/doc-upgrade-13.md:513-515`).

Opcional: use Laravel Boost `^2.0` e o comando `/upgrade-laravel-v13` em Claude Code,
Cursor, OpenCode, Gemini ou VS Code (`samples/doc-upgrade-13.md:51-60`).

samples/doc-upgrade-13.md:68-76
```markdown
<div class="content-list" markdown="1">

- `laravel/framework` to `^13.0`
- `laravel/boost` to `^2.0`
- `laravel/tinker` to `^3.0`
- `phpunit/phpunit` to `^12.0`
- `pestphp/pest` to `^4.0`

</div>
```

---

## 2. Impacto ALTO — Request Forgery Protection

O middleware de CSRF foi renomeado de `VerifyCsrfToken` para
`Illuminate\Foundation\Http\Middleware\PreventRequestForgery`, agora com verificação
de origem pelo header `Sec-Fetch-Site`. `VerifyCsrfToken` e `ValidateCsrfToken`
permanecem como **aliases deprecados**, mas referências diretas devem ser atualizadas —
principalmente em `withoutMiddleware(...)` de testes e rotas
(`samples/doc-upgrade-13.md:396-416`).

samples/doc-upgrade-13.md:405-412
```php
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;

// Laravel <= 12.x
->withoutMiddleware([VerifyCsrfToken::class]);

// Laravel >= 13.x
->withoutMiddleware([PreventRequestForgery::class]);
```

A API de configuração agora expõe `preventRequestForgery(...)`
(`samples/doc-upgrade-13.md:418`). O comportamento em detalhe:

- O middleware vem no grupo `web` e aplica **duas camadas**: primeiro verifica
  `Sec-Fetch-Site`; se a origem for *same-origin*, libera sem token
  (`samples/doc-csrf.md:41-43`).
- Se a verificação de origem falhar (browser antigo, conexão não segura), cai para
  validação de token CSRF tradicional (`samples/doc-csrf.md:43`).
- `Sec-Fetch-Site` **só é enviado por browsers sobre HTTPS**
  (`samples/doc-csrf.md:92-93`).
- `originOnly: true` desliga o fallback de token: falha vira `403` em vez do `419`
  clássico (`samples/doc-csrf.md:82-90`).
- `allowSameSite: true` aceita requisições de subdomínios, útil quando
  `dashboard.example.com` chama `example.com` (`samples/doc-csrf.md:95-99`).
- `except: [...]` continua disponível para webhooks (ex.: Stripe) — mas prefira manter
  essas rotas fora do grupo `web` (`samples/doc-csrf.md:105-119`).
- Em testes, o middleware é desabilitado automaticamente (`samples/doc-csrf.md:122-124`).

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->preventRequestForgery(
        allowSameSite: true,
        except: ['stripe/*'],
    );
})
```

> **Regra de migração:** nunca use `originOnly: true` em aplicação servida sem HTTPS ou
> que aceite clientes não-browser; o fallback de token é a única proteção nesses casos.

---

## 3. Impacto MÉDIO — Cache `serializable_classes`

O skeleton 13 define `'serializable_classes' => false` em `config/cache.php` para
bloquear cadeias de deserialização de objetos PHP caso `APP_KEY` vaze
(`samples/doc-upgrade-13.md:132-137`, `samples/samples-config-cache.php:131-134`).

Se a aplicação armazena objetos em cache, você deve listar explicitamente as classes
permitidas (`samples/doc-upgrade-13.md:138-146`):

samples/doc-upgrade-13.md:139-142
```php
'serializable_classes' => [
    App\Data\CachedDashboardStats::class,
    App\Support\CachedPricingSnapshot::class,
],
```

Dependendo do caso, converta o payload para array/scalar em vez de ampliar a allow-list.
Quem implementa um `Store` customizado precisa adicionar `touch($key, $seconds)` ao
contrato (`samples/doc-upgrade-13.md:120-129`).

Além disso, os defaults de prefixos mudaram:

samples/doc-upgrade-13.md:106-114
```php
// Laravel <= 12.x
Str::slug((string) env('APP_NAME', 'laravel'), '_').'_cache_';
Str::slug((string) env('APP_NAME', 'laravel'), '_').'_database_';
Str::slug((string) env('APP_NAME', 'laravel'), '_').'_session';

// Laravel >= 13.x
Str::slug((string) env('APP_NAME', 'laravel')).'-cache-';
Str::slug((string) env('APP_NAME', 'laravel')).'-database-';
Str::slug((string) env('APP_NAME', 'laravel')).'-session';
```

Para preservar chaves e cookies existentes, defina explicitamente `CACHE_PREFIX`,
`REDIS_PREFIX` e `SESSION_COOKIE` no `.env` (`samples/doc-upgrade-13.md:106-109`). Sem
isso, cache é invalidado e usuários são deslogados — geralmente aceitável, mas must be
a conscious decision.

---

## 4. Impacto MÉDIO — `upsert` com MySQL/MariaDB

O 13 valida que `uniqueBy` não esteja vazio e lança `InvalidArgumentException` em vez de
gerar SQL inválido. Mesmo com drivers que ignoram o valor e usam índices primários/
únicos da tabela, a validação é aplicada (`samples/doc-upgrade-13.md:202-209`). Lição:
sempre passe `uniqueBy` em `upsert()`, mesmo em MySQL.

---

## 5. Impacto BAIXO — cheque estes pontos no seu código

| Mudança | O que fazer | Fonte |
|---|---|---|
| `Container::call` respeita default nullable | `?Carbon $date = null` agora retorna `null`, não instância | `samples/doc-upgrade-13.md:151-167` |
| Contratos com novos métodos | `Dispatcher::dispatchAfterResponse`, `ResponseFactory::eventStream`, `MustVerifyEmail::markEmailAsUnverified` | `samples/doc-upgrade-13.md:169-197` |
| Eloquentboot aninhado | Mover `(new static())->getTable()` fora de `boot()` | `samples/doc-upgrade-13.md:223-243` |
| Pivot morph com classe customizada | Nomes de tabela agora pluralizados; defina `$table` explicitamente | `samples/doc-upgrade-13.md:244-251` |
| Coleções Eloquent serializadas | Relações eager-loaded são restauradas após deserialize | `samples/doc-upgrade-13.md:253-260` |
| HTTP Client `throw`/`throwIf` | Ajuste assinaturas em classes customizadas | `samples/doc-upgrade-13.md:262-278` |
| Subject do reset de senha | `"Reset Password Notification"` → `"Reset your password"`; atualize testes/traduções | `samples/doc-upgrade-13.md:282-298` |
| Notificações enfileiradas | Agora respeitam `#[DeleteWhenMissingModels]` / `$deleteWhenMissingModels` | `samples/doc-upgrade-13.md:299-306` |
| `JobAttempted` | `$exceptionOccurred` → `$exception` (objeto ou `null`) | `samples/doc-upgrade-13.md:311-326` |
| `QueueBusy` | `$connection` → `$connectionName` | `samples/doc-upgrade-13.md:328-335` |
| Contrato `Queue` | Implemente `pendingSize`, `delayedSize`, `reservedSize`, `creationTimeOfOldestPendingJob` em drivers customizados | `samples/doc-upgrade-13.md:337-354` |
| Rotas com domínio | Domínios explícitos têm precedência sobre rotas sem domínio | `samples/doc-upgrade-13.md:355-365` |
| Session `serialization` | De `'php'` para `'json'` invalida sessões ativas; mantenha `'php'` se precisar de transição suave | `samples/doc-upgrade-13.md:367-379` |
| `withScheduling` | Registro de schedules diferido até `Schedule` ser resolvido | `samples/doc-upgrade-13.md:381-391` |
| Manager `extend` | Closures agora recebem `$this` = manager; use `use (...)` para capturar provider | `samples/doc-upgrade-13.md:421-428` |
| `Str` factories | Resetadas entre testes; configure em `setUp` | `samples/doc-upgrade-13.md:430-437` |
| `Js::from` | Usa `JSON_UNESCAPED_UNICODE`; ajuste expectativas de testes/front | `samples/doc-upgrade-13.md:439-446` |
| `array_first`/`array_last` do polyfill | Prefira `Arr::first`/`Arr::last` | `samples/doc-upgrade-13.md:448-469` |
| Views de paginação | `pagination::default` → `pagination::bootstrap-3`; `simple-default` → `simple-bootstrap-3` | `samples/doc-upgrade-13.md:470-490` |
| Global scopes em `where()` aninhado | Remoção dentro do closure agora afeta a query inteira | `samples/doc-upgrade-13.md:492-511` |
| DELETE com JOIN no MySQL | `ORDER BY`/`LIMIT` passam a ser incluídos; MariaDB < 11.8.1 pode lançar `QueryException` | `samples/doc-upgrade-13.md:211-218` |

Dois destaques que causam bugs silenciosos:

1. **Global scopes:** `User::where(fn ($q) => $q->withoutGlobalScope('active'))->get()`
   removia o scope apenas "no papel" no 12 e o mantinha na query externa; no 13 o
   scope é removido da query inteira, então a consulta pode retornar registros antes
   excluídos (`samples/doc-upgrade-13.md:492-511`). Se você queria realmente remover,
   faça `User::withoutGlobalScope('active')->where(...)` — explicito e legível.
2. **Session serialization:** trocar `php` por `json` invalida todas as sessões ativas.
   Se isso for inaceitável, mantenha `php` temporariamente e planeje uma janela de
   reautenticação (`samples/doc-upgrade-13.md:367-379`).

---

## 6. O que é NOVO no 13 (não é breaking, mas muda como você escreve)

- **AI SDK first-party**: agents, tool calling, embeddings, áudio, imagens
  (`samples/doc-releases-13.md:66-99`).
- **JSON:API resources**: serialização, relacionamentos, fieldsets, links e headers
  conformes à especificação (`samples/doc-releases-13.md:113-117`).
- **`Queue::route(ProcessPodcast::class, connection: 'redis', queue: 'podcasts')`**
  para roteamento central por classe (`samples/doc-releases-13.md:124-131`).
- **Atributos**: `#[Middleware]`, `#[Authorize]`, `#[Tries]`, `#[Backoff]`,
  `#[Timeout]`, `#[FailOnTimeout]`, além de atributos em Eloquent, eventos,
  notificações, validação, testes e serialização (`samples/doc-releases-13.md:134-164`).
- **`Cache::touch(...)`** estende TTL sem reler/regravar o valor
  (`samples/doc-releases-13.md:166-169`).
- **Busca vetorial**: `whereVectorSimilarTo('embedding', '...')` com pgvector
  (`samples/doc-releases-13.md:134-164`).

samples/doc-releases-13.md:152-161
```php
#[Middleware('auth')]
class CommentController
{
    #[Middleware('subscribed')]
    #[Authorize('create', [Comment::class, 'post'])]
    public function store(Post $post)
    {
        // ...
    }
}
```

---

## 7. Checklist de aceite da migração

- [ ] PHP 8.3+ em local, CI e produção.
- [ ] `composer.json` com framework `^13`, tinker `^3`, PHPUnit `^12`, Pest `^4` se usado.
- [ ] `VerifyCsrfToken` / `ValidateCsrfToken` substituídos por `PreventRequestForgery`.
- [ ] HTTPS confirmado antes de considerar `originOnly: true`.
- [ ] `serializable_classes` revisado; objetos em cache convertidos ou allow-listados.
- [ ] `CACHE_PREFIX`, `REDIS_PREFIX`, `SESSION_COOKIE` definidos se quiser preservar chaves.
- [ ] Decisão explícita sobre `session.serialization` (`json` = logout geral).
- [ ] Listeners de `JobAttempted`, `QueueBusy` e contratos customizados ajustados.
- [ ] Upserts com `uniqueBy` não vazio; DELETEs com JOIN testados no MySQL real.
- [ ] Views/aliases de paginação e expectativas de `Js::from` atualizadas.
- [ ] Suíte completa rodando com `config:clear` (padrão do skeleton).

## Resumo de Pontos-Chave

- **O upgrade é curto, mas os defaults de segurança mudaram**: request forgery e serialização.
- **Atualize as cinco dependências** listadas no guia oficial antes de rodar a migração.
- **`PreventRequestForgery` substitui os aliases** e tem modos `originOnly` e `allowSameSite`.
- **`serializable_classes: false` e sessão JSON** bloqueiam gadget chains; allow-liste ou converta payloads.
- **`JobAttempted`, `QueueBusy`, `Dispatcher`, `ResponseFactory` e `MustVerifyEmail`** ganharam/renomearam membros.
- **Global scopes em closures aninhados** agora valem para a query inteira — auditar antes de subir.
- **Recursos novos (AI SDK, JSON:API, vetorial, atributos)** são aditivos e podem ser adotados por módulo.
