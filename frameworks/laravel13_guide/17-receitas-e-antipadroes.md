# Receitas e antipadrões — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Este capítulo fecha o guia com decisões
> práticas eanti-padrões verificados contra a documentação/skeleton 13.

---

## 1. Matriz de decisão rápida

| Necessidade | Use | Não use |
|---|---|---|
| Proteger POST/PUT/PATCH/DELETE | `PreventRequestForgery` padrão | `originOnly: true` sem HTTPS |
| Webhook externo | rota fora do grupo `web` | `except:` como primeira opção |
| Objeto em cache | allow-list em `serializable_classes` | `false` com objeto arbitrário |
| TTL sem recomputar | `Cache::touch` | reler/regravar valor |
| Stale while revalidate | `Cache::flexible` | TTL longo e invalidação manual |
| Mesmo dado 5x no request | `Cache::memo()` | 5 chamadas Redis |
| Roteamento de jobs | `Queue::route` no provider | `onQueue()` em cada dispatch |
| Autorização curta no controller | `#[Authorize]` | Policy para tudo |
| Autorização complexa | Policy + Form Request | atributo com regra de negócio |
| Erros de API | `withExceptions` + `shouldRenderJsonWhen` | stack trace em resposta |
| Contrato JSON:API | `JsonApiResource` | `$model->toArray()` |
| Busca por significado | `whereVectorSimilarTo` + pgvector | `LIKE '%termo%'` |
| Processo long-lived | `scoped`/imutável | singleton mutável |

---

## 2. Receita: endpoint de listagem estável

```php
// derivado das APIs documentadas em 07/08/10
$posts = Post::query()
    ->with(['author:id,name'])                      // evita N+1
    ->when($request->string('q')->toString(), fn ($q, $term) =>
        $q->whereFullText(['title', 'body'], $term))  // full-text
    ->latest()
    ->cursorPaginate(20);

return PostResource::collection($posts);
```

- `with([...])` limita colunas e evita carregar modelo inteiro do autor.
- `cursorPaginate` mantém performance em tabelas grandes.
- Resource é a fronteira; nunca `return $posts`.
- Se o cliente pedir `include=comments`, limite profundidade
  (`JsonApiResource::maxRelationshipDepth(3)`, capítulo 10).

---

## 3. Receita: job idempotente com telemetria

```php
// derivado de samples/doc-queues.md e samples/doc-context.md
#[Tries(3)]
#[Backoff([10, 30, 60])]
#[Timeout(120)]
#[UniqueFor(3600)]
class ChargePayment implements ShouldQueue
{
    public function handle(PaymentGateway $gateway): void
    {
        Context::add('payment_id', $this->payment->id);
        $gateway->charge($this->payment);
        Log::info('payment.charged');
    }
}
```

- `#[UniqueFor]` evita duplicação; `#[Tries]`/`#[Backoff]`/`#[Timeout]` são 13+.
- `Context` correlaciona job → log → erro.
- `JobAttempted::$exception` alimenta alerta (capítulo 06).

---

## 4. Receita: migração 12→13 em 30 minutos

1. `php -v` ≥ 8.3; ajuste CI.
2. Atualize `composer.json` (`framework ^13`, `tinker ^3`, PHPUnit `^12`, Pest `^4`).
3. Substitua `VerifyCsrfToken` por `PreventRequestForgery` em testes/rotas.
4. Decida `serializable_classes` e `session.serialization`; defina prefixos.
5.rode `php artisan test` com `config:clear` e corrija as 8 regressões do capítulo 14.
6. Deploy com `queue:restart` e `octane:reload`.

---

## 5. Anti-padrões com consequência concreta

| Anti-padrão | Consequência | Correção |
|---|---|---|
| `env()` direto em controller | retorna `null` com `config:cache` | ler via `config()` |
| Singleton com `$request` em Octane | vazamento de tenant | `scoped`/injeto por método |
| `--tries=0` em produção | retry infinito, fila travada | `#[Tries(n)]` + backoff |
| Lock de arquivo em multi-nó | corrutina não é bloqueada | Redis/database lock |
| `Js::from` comparado com `\u00e8` em teste | teste falso no 13 | esperar Unicode literal |
| `pagination::default` referenciado | view não encontrada | `pagination::bootstrap-3` |
| `array_first($a, $cb)` do helpers | semântica diferente com polyfill 8.5 | `Arr::first($a, $cb)` |
| `(new static())` em `boot()` | `LogicException` no 13 | mover para fora do boot |
| Logar `raw` de provider de IA | vazamento de headers/IDs | mascarar antes de logar |
| Telescope sem gate em produção | exposição de queries/dados | gate `viewTelescope` + TLS |

---

## 6. Checklist final de produção

- [ ] PHP 8.3+, `APP_DEBUG=false`, HTTPS em todo o tráfego.
- [ ] `PreventRequestForgery` configurado; aliases antigos migrados.
- [ ] `serializable_classes`/sessão JSON decididos com plano de reautenticação.
- [ ] Prefixos de cache/Redis/cookie explícitos.
- [ ] `optimize` no deploy; workers e Octane reiniciados.
- [ ] Pulse/Horizon com auth; Telescope restrito a staging.
- [ ] `Context` com request_id/tenant_id; PII mascarado.
- [ ] Testes de regressão 12→13 no CI.
- [ ] Backups e runbook de incidentes versionados.

## Resumo de Pontos-Chave

- **Matriz de decisão evita escolha errada** entre CSRF, cache, filas e autorização.
- **Listagem estável**: eager loading + cursor pagination + Resource.
- **Job idempotente**: `#[UniqueFor]` + `#[Tries]` + `#[Backoff]` + `Context`.
- **Migração 12→13** é curta, mas exige decisões explícitas de serialização e prefixos.
- **`env()` + `config:cache`** e **singleton em Octane** são as armadilhas clássicas.
- **Polyfill 8.5 e nomes de view** causam falhas silenciosas após o upgrade.
- **Checklist final** cobre segurança, deploy, telemetria e testes.
