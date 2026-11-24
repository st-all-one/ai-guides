# Cache e filas — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Inclui `Cache::touch`, `Cache::flexible`,
> `Cache::memo`, failover, `Queue::route` e atributos de job (`#[Tries]`, `#[Backoff]`,
> `#[Timeout]`, `#[FailOnTimeout]`).

---

## 1. Stores e decisão de backend

O skeleton usa `CACHE_STORE=database` (`samples/samples-env.example:32-33`). A
documentação lista Memcached, Redis, DynamoDB, bancos relacionais, filesystem disks,
`file`, `array` e `null` como backends (`samples/doc-cache.md:37-45`). DynamoDB exige TTL
habilitado no atributo `expires_at` — ele não remove itens expirados proativamente
(`samples/doc-cache.md:112-138`).

Use `Cache::store('redis')` para operações específicas (`samples/doc-cache.md:151-187`).
Em produção com Redis, configure `CACHE_PREFIX` explicitamente — o default 13 mudou
para sufixos hifenizados (`samples/doc-upgrade-13.md:95-117`).

**Failover:** o driver `failover` tenta cada store em ordem e dispara
`Illuminate\Cache\Events\CacheFailedOver` quando o primário falha
(`samples/doc-cache.md:671-693`).

samples/doc-cache.md:678-684
```php
'failover' => [
    'driver' => 'failover',
    'stores' => [
        'database',
        'array',
    ],
],
```

---

## 2. Padrões de leitura: `remember`, `flexible`, `memo`, `touch`

| API | Quando usar | Restrição | Fonte |
|---|---|---|---|
| `Cache::remember` | padrão geral | TTL simples | `samples/doc-cache.md:236-263` |
| `Cache::flexible` | stale-while-revalidate; evita pico de latência ao expirar | janela `fresh` e `stale` | `samples/doc-cache.md:264-277` |
| `Cache::memo()` | evitar múltiplos hits ao mesmo store em **um** request/job | escopo de execução | `samples/doc-cache.md:380-421` |
| `Cache::touch` | estender TTL sem recomputar valor | contrato `Store` ganhou o método no 13 | `samples/doc-cache.md:321-333`, `samples/doc-upgrade-13.md:120-129` |

samples/doc-cache.md:274-276
```php
$value = Cache::flexible('users', [5, 10], function () {
    return DB::table('users')->get();
});
```

`samples/doc-cache.md:274-276` — entre 5 e 10s o valor stale é servido e um `defer`
atualiza o cache após a resposta; após 10s a recomputação é síncrona
(`samples/doc-cache.md:269-271`).

`Cache::memo('redis')` decora um store específico; mutações (`put`, `increment`,
`remember`) invalidam o memo local (`samples/doc-cache.md:392-421`).

samples/doc-cache.md:326-326
```php
Cache::touch('key', 3600);
```

> `Cache::touch` retorna `true` se o item existe e o TTL foi estendido, `false` caso
> contrário (`samples/doc-cache.md:323`).

**Tags:** não funcionam com `file`, `dynamodb`, `database` ou `storage`
(`samples/doc-cache.md:452-455`); a ordem da lista de tags deve ser **idêntica** na
escrita e na leitura (`samples/doc-cache.md:458-478`).

---

## 3. Locks, concorrência e consistência

Locks atômicos exigem `memcached`, `redis`, `dynamodb`, `database`, `file` ou `array`
como store padrão e um servidor central comum (`samples/doc-cache.md:496-499`).
`block(5)` lança `LockTimeoutException` quando não adquire; `block(5, $closure)` libera
automaticamente (`samples/doc-cache.md:526-550`). Para liberar em outro processo,
propague `$lock->owner()` e use `Cache::restoreLock(...)->release()`
(`samples/doc-cache.md:552-579`).

`withoutOverlapping(...)` impede execução concorrente; `funnel(...)->limit(n)` controla
paralelismo, mas exige store que implemente `LockProvider`
(`samples/doc-cache.md:601-668`). Anti-padrão: usar lock de arquivo local em múltiplos
servidores — cada nó terá um lock diferente.

---

## 4. Queue routing (novo no 13)

`Queue::route()` define connection/queue padrão por classe, interface, trait ou classe
pai, normalmente no `boot()` de um provider (`samples/doc-queues.md:1495-1517`).

samples/doc-queues.md:1513-1518
```php
public function boot(): void
{
    Queue::route(ProcessPodcast::class, connection: 'redis', queue: 'podcasts');
    Queue::route(RequiresVideo::class, queue: 'video');
    Queue::route(ShouldBroadcast::class, queue: 'events');
}
```

Também aceita array de classes (`samples/doc-queues.md:1527-1534`) e connection sem
queue, usando a fila padrão (`samples/doc-queues.md:1521-1525`). Esse é o mecanismo
preferido no 13 para centralizar roteamento; evite espalhar `onQueue()` em cada
`dispatch()` quando a regra é global.

---

## 5. Atributos de job e tentativas

O 13 adiciona controladores declarativos para jobs: `#[Tries]` tem precedência sobre
`--tries` da linha de comando (`samples/doc-queues.md:1585-1606`); `#[Backoff]`
define atrasos entre tentativas (`samples/doc-queues.md:2023`),
`#[Timeout]` limita a execução (`samples/doc-queues.md:1780`) e `#[FailOnTimeout]`
marca timeout como falha (`samples/doc-queues.md:1793-1804`). Há ainda `#[RetryFor]`
para janela temporal (`samples/doc-queues.md:1651-1664`), `#[MaxExceptions]` e
`#[CountCrashesAsExceptions]` (`samples/doc-queues.md:1688-1720`).

samples/doc-queues.md:1596-1606
```php
<?php

namespace App\Jobs;

use Illuminate\Queue\Attributes\Tries;

#[Tries(5)]
class ProcessPodcast implements ShouldQueue
{
    // ...
}
```

Uma *tentativa* pode ser consumida por exceção, `$this->release()`, middleware
`WithoutOverlapping`/`RateLimited` sem lock ou timeout — não apenas por execução do
`handle()` (`samples/doc-queues.md:1564-1578`). Por padrão um job tenta **uma** vez
(`samples/doc-queues.md:1582-1583`); `--tries=0` significa tentativas infinitas
(`samples/doc-queues.md:1591`).

---

## 6. Operação do worker

`php artisan queue:work` é processo de longa duração: **não vê mudanças de código sem
restart** e mantém estado estático entre jobs (`samples/doc-queues.md:2580-2607`).
`queue:listen` recarrega automaticamente, mas é bem menos eficiente
(`samples/doc-queues.md:2608-2619`). Use Supervisor/systemd em produção e reinicie
workers no deploy.

Flags mais usados: `--queue`, `--tries`, `--timeout`, `--backoff`, `--max-jobs`,
`--max-time`, `--sleep=0` (evita delay entre jobs em filas dedicadas) e
`--stop-when-empty`. Combine `--max-jobs=500 --max-time=3600` para reciclar workers e
limitar vazamentos de memória.

Rate limiting por Redis (`samples/doc-queues.md:697`) e jobs únicos
(`samples/doc-queues.md:351-494`) são a base para idempotência; use
`#[UniqueFor(3600)]` / `#[DebounceFor(30)]` quando aplicável
(`samples/doc-queues.md:386`, `samples/doc-queues.md:467`).

Failed jobs: configure tabela via `queue:failed-table` + `migrate`, implemente `failed()`
no job e rode `queue:retry` / `queue:flush` com auditoria
(`samples/doc-queues.md:2937-3189`). Em 13, `JobAttempted::$exception` e
`QueueBusy::$connectionName` substituem as propriedades antigas
(`samples/doc-upgrade-13.md:311-335`).

---

## 7. Configuração de produção (checklist)

- [ ] `CACHE_PREFIX` e `REDIS_PREFIX` definidos explicitamente.
- [ ] `serializable_classes` revisado (allow-list ou payloads array).
- [ ] Worker com Supervisor, `--tries`, `--timeout`, `--backoff` e restart no deploy.
- [ ] `Queue::route` centralizado no provider; sem `onQueue()` espalhado.
- [ ] Locks usam store central; nada de lock de arquivo por nó.
- [ ] Failed jobs com tabela, alerta e runbook de retry.
- [ ] Horizon protegido por auth; `QueueBusy::$connectionName` ajustado nos listeners.

## Resumo de Pontos-Chave

- **`Cache::flexible`** serve stale e revalida após a resposta — ideal para picos de TTL.
- **`Cache::memo()`** evita hits repetidos dentro do mesmo request/job.
- **`Cache::touch`** estende TTL sem recomputar; exige `Store::touch` em drivers customizados.
- **Tags não funcionam** em `file`, `database`, `dynamodb`, `storage`.
- **`Queue::route`** é o novo ponto central de roteamento de jobs no 13.
- **`#[Tries]` sobrepõe `--tries`**; uma tentativa pode ser consumida sem rodar `handle()`.
- **Workers são long-lived**: restart no deploy e reciclagem por `--max-jobs`/`--max-time`.
- **Horizon + `JobAttempted::$exception`** são a base da telemetria de filas no 13.
