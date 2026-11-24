# Testes e qualidade — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. PHPUnit 12 / Pest 4, `artisan test`,
> Pint, Larastan, fakes e isolamento de estado.

---

## 1. Ferramentas e dependências

O skeleton traz `phpunit/phpunit ^12.5.12`, `laravel/pint ^1.27`, `laravel/pail ^1.2.5`,
`mockery/mockery ^1.6` e `nunomaduro/collision ^8.6`
(`samples/samples-composer.json:13-22`). No upgrade do 12, atualize também
`pestphp/pest ^4` se você usa Pest (`samples/doc-upgrade-13.md:62-77`).

```bash
php artisan test                 # suíte padrão
php artisan test --filter=Checkout
composer test                    # config:clear + artisan test (skeleton)
./vendor/bin/pint --test         # checagem de estilo sem mutar
./vendor/bin/pint --dirty        # formata só arquivos alterados
```

O script `test` do skeleton limpa config antes de rodar
(`samples/samples-composer.json:47-50`) — preserve isso no CI.

---

## 2. Organização da suíte

- **Unit:** regras puras, Value Objects, services com mocks.
- **Feature:** HTTP, autenticação, autorização, banco, filas, eventos.
- **Database:** `RefreshDatabase` para isolamento; factories tipadas.
- **Console:** comandos Artisan com `$this->artisan(...)->assertExitCode(0)`.
- **Browser:** Dusk quando fluxo depende de JS real (`samples/doc-dusk.md`).

Use `expects()` / `assert*()` do Laravel em respostas JSON:
`$response->assertJsonResource()` (JSON:API) ou `assertJsonStructure()`. Para erros,
verifique status e corpo padronizado via `withExceptions`.

---

## 3. Fakes, tempo e efeitos colaterais

`Bus::fake()`, `Queue::fake()`, `Mail::fake()`, `Notification::fake()`,
`Event::fake()`, `Http::fake()`, `Storage::fake()`, `Carbon::setTestNow()` e
`Cache::store('array')` eliminam dependências externas. Prefira fakes do framework a
mocks artesanais de interfaces de infraestrutura.

```php
// derivado das APIs de fakes documentadas
Http::fake(['api.payment.test/*' => Http::response(['ok' => true], 200)]);
Bus::fake();
$this->post('/checkout')->assertOk();
Bus::assertDispatched(ChargePayment::class);
```

> `Str` factories customizadas (UUID/ULID/random) são **resetadas entre testes** no 13
> (`samples/doc-upgrade-13.md:430-437`): configure em `setUp()` de cada teste que
> depende delas.

---

## 4. CSRF e autenticação em testes

O middleware de request forgery é desabilitado automaticamente nos testes
(`samples/doc-csrf.md:122-124`). Se precisar excluir explicitamente, use
`PreventRequestForgery::class` — `VerifyCsrfToken::class` ainda funciona como alias
deprecado, mas é alvo de migração (`samples/doc-upgrade-13.md:400-416`).

samples/doc-upgrade-13.md:405-412
```php
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;

// Laravel <= 12.x
->withoutMiddleware([VerifyCsrfToken::class]);

// Laravel >= 13.x
->withoutMiddleware([PreventRequestForgery::class]);
```

---

## 5. Qualidade estática e formatação

- **Pint:** uma config `pint.json` versionada; `--test` no CI; `--dirty` local.
- **Larastan/PHPStan:** nível crescente, começando pelo código novo; minimize
  `@phpstan-ignore` e documente exceções.
- **Rector:** para migrações mecânicas de sintaxe (use com diff revisado).
- **IDE Helper:** gera PHPDoc para facades, melhora autocomplete e análise.
- **Type floor:** escreva para PHP 8.3 target; não use sintaxe 8.4/8.5 em código que
  roda em 8.3. O polyfill PHP 8.5 do Symfony redefine `array_first`/`array_last` —
  prefira `Arr::first`/`Arr::last` (`samples/doc-upgrade-13.md:448-469`).

## 6. Testes de regressão para o upgrade 13

### Riscos concretos que os testes precisam cobrir

- **`config:cache` vazando para a suíte**: valores lidos via `env()` direto retornam
  `null`; rode sempre `config:clear` antes de `artisan test` (padrão do skeleton em
  `samples/samples-composer.json:47-50`).
- **`Str` factories não persistem**: no 13 elas são resetadas no teardown
  (`samples/doc-upgrade-13.md:430-437`); configure UUID/ULID fake em `setUp()`.
- **Regressões silenciosas do upgrade**: `Reset your password`,
  `pagination::bootstrap-3`, `JobAttempted::$exception` e `serializable_classes`
  merecem testes de contrato explícitos.
- **Custo de suíte**: `RefreshDatabase` + factories por teste é correto, mas meça o
  tempo; use transações quando o custo de recriar o schema dominar.

Casos que merecem teste explícito ao migrar do 12:

1. `upsert()` com `uniqueBy` não vazio (falha rápida).
2. `withoutGlobalScope` dentro de closure — Comportamento novo da query inteira.
3. `JobAttempted` e `QueueBusy` — novos nomes de propriedade em listeners.
4. Subject de reset de senha (`Reset your password`).
5. Views de paginaçãoBootstrap 3 referenciadas diretamente.
6. `Js::from` com Unicode — expectativas de output.
7. Cache com objetos — `serializable_classes` allow-list.
8. Sessão — decisão `json` vs `php` e invalidação esperada.

## Resumo de Pontos-Chave

- **PHPUnit 12 / Pest 4** são o piso do 13; `composer test` limpa config antes da suíte.
- **Use fakes do framework** para Http/Bus/Mail/Queue/Storage/Tempo.
- **CSRF é desabilitado em testes**; ao excluir, prefira `PreventRequestForgery::class`.
- **`Str` factories são resetadas entre testes** no 13 — configure no `setUp`.
- **Pint `--test` + Larastan** no CI; evite exceções silenciosas.
- **Polífill PHP 8.5 redefine helpers globais** — use `Arr::first/last`.
- **Teste explicitamente as mudanças 12→13** listadas no capítulo 16.
