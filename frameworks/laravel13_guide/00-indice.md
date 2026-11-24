# Dossiê Laravel 13.x — Uso Efetivo

Dossiê técnico, em português, otimizado para o uso **EFETIVO** do Laravel, com foco
estrito na série **13.x**. Todo o conteúdo foi derivado da documentação oficial da
branch `13.x` (páginas em `samples/doc-*.md`) e do skeleton real `laravel/laravel@13.x`
(`samples/samples-*`). A skill `SKILL.md` está em inglês; o conhecimento em português
está nos capítulos numerados.

> **Regra de ouro:** o que não existe no 13.x está marcado como tal e serve apenas como
> contra-exemplo. Toda afirmação pontual tem `samples/arquivo:linha` verificável por
> `python3 verify.py`. O que não foi lido é marcado `não verificado`.

## Requisitos e política de suporte

- **PHP 8.3, 8.4 e 8.5** (`samples/doc-releases-13.md:26-33`). Laravel 13 exige no
  mínimo PHP 8.3 (`samples/doc-releases-13.md:61-63`).
- Lançamento: 17/03/2026 · Bug fixes até Q3 2027 · Security fixes até 17/03/2028.
- SemVer: use `^13.0`; named arguments em chamadas ao framework não são cobertos pela
  compatibilidade (`samples/doc-releases-13.md:8-20`).
- O skeleton real fixa `laravel/framework ^13.17`, `laravel/tinker ^3.0`,
  `phpunit/phpunit ^12.5.12` (`samples/samples-composer.json:5-22`).

## Mapa dos tópicos pedidos → arquivos

| Foco solicitado | Arquivo | Conteúdo central |
|---|---|---|
| Instalação e fundamentos | [`01-instalacao-e-fundamentos.md`](01-instalacao-e-fundamentos.md) | PHP 8.3, Composer, `composer run setup`, skeleton, defaults de segurança |
| Arquitetura/ciclo de vida | [`02-arquitetura-e-ciclo-de-vida.md`](02-arquitetura-e-ciclo-de-vida.md) | `bootstrap/app.php`, container, providers, atributos 13, Octane e estado |
| Configuração/ambiente | [`03-configuracao-e-ambiente.md`](03-configuracao-e-ambiente.md) | `.env`, `env()` vs `config()`, `optimize`, prefixos, maintenance |
| **Segurança** | [`04-seguranca.md`](04-seguranca.md) | `PreventRequestForgery`, serialização, auth/authz, crypto, rate limit, trusted hosts |
| **Logs e erros** | [`05-logs-e-erros.md`](05-logs-e-erros.md) | canais/stacks, `Context`, `withExceptions`, Pail, correlação |
| **Telemetria/instrumentação** | [`06-telemetria-e-instrumentacao.md`](06-telemetria-e-instrumentacao.md) | Pulse, Telescope, Horizon, SLIs, mudanças em eventos de fila |
| **Performance/estabilidade** | [`07-performance-e-estabilidade.md`](07-performance-e-estabilidade.md) | N+1, Octane, health, maintenance, timeouts, orçamentos |
| **Cache e filas** | [`08-cache-e-filas.md`](08-cache-e-filas.md) | `flexible`, `memo`, `touch`, failover, locks, `Queue::route`, atributos de job |
| Banco/Eloquent | [`09-banco-e-eloquent.md`](09-banco-e-eloquent.md) | transações, `upsert`, boot aninhado, pivot morph, global scopes |
| JSON:API resources | [`10-jsonapi-e-recursos.md`](10-jsonapi-e-recursos.md) | `JsonApiResource`, includes, sparse fieldsets, links/meta, headers |
| IA e busca vetorial | [`11-busca-semantica-e-ia.md`](11-busca-semantica-e-ia.md) | agents, tools, embeddings, pgvector, `whereVectorSimilarTo` |
| Blade/frontend | [`12-blade-e-frontend.md`](12-blade-e-frontend.md) | escaping, components, Vite, views de paginação renomeadas |
| API/autenticação | [`13-api-e-autenticacao.md`](13-api-e-autenticacao.md) | `install:api`, Sanctum, `#[Authorize]`, rate limiting |
| Testes/qualidade | [`14-testes-e-qualidade.md`](14-testes-e-qualidade.md) | PHPUnit 12/Pest 4, fakes, Pint, Larastan, regressões 13 |
| Deploy/operação | [`15-deploy-e-operacao.md`](15-deploy-e-operacao.md) | `optimize`, restart de workers, runbook, escala horizontal |
| **Migração 12→13** | [`16-migracao-12-para-13.md`](16-migracao-12-para-13.md) | todas as quebras por impacto, contratos, plano e checklist de aceite |
| Receitas/antipadrões | [`17-receitas-e-antipadroes.md`](17-receitas-e-antipadroes.md) | matriz de decisão, jobs idempotentes, checklist final |

## Fronteiras de versão que mais causam confusão

- **Request forgery:** `PreventRequestForgery` é o nome canônico no 13; `VerifyCsrfToken`
  e `ValidateCsrfToken` são aliases deprecados (`samples/doc-upgrade-13.md:396-416`).
- **Serialização:** `cache.serializable_classes = false` e `session.serialization = json`
  são defaults de segurança (`samples/samples-config-cache.php:131-134`,
  `samples/samples-config-session.php:219-231`).
- **Bootstrap:** não existem `Http/Kernel.php`, `Console/Kernel.php` nem
  `Exceptions/Handler.php`; tudo em `bootstrap/app.php`
  (`samples/samples-bootstrap-app.php:8-21`).
- **Providers:** registrados em `bootstrap/providers.php`.
- **Rotas:** só `web.php`/`console.php` por padrão; `api.php` após `install:api`.
- **Fila:** `Queue::route`, `#[Tries]`, `#[Backoff]`, `#[Timeout]`, `#[FailOnTimeout]`
  são 13+ (`samples/doc-releases-13.md:124-164`).
- **Eventos:** `JobAttempted::$exception` e `QueueBusy::$connectionName`
  (`samples/doc-upgrade-13.md:311-335`).
- **Cache:** `Cache::touch` é novo; custom stores precisam de `touch($key, $seconds)`
  (`samples/doc-cache.md:321-333`, `samples/doc-upgrade-13.md:120-129`).
- **Busca:** `whereVectorSimilarTo` e `Str::toEmbeddings` são 13+
  (`samples/doc-releases-13.md:172-185`).
- **PHP:** 8.2 não é suportado; use 8.3+.

## Como usar este dossiê

1. Comece pelo arquivo do tópico que você vai tocar hoje; cada capítulo termina em
   **Resumo de Pontos-Chave**.
2. Antes de copiar qualquer snippet, confira a nota de versão no topo.
3. Para dúvidas transversais, cruze os capítulos (ex.: segurança + logs + filas).
4. Para migrar do 12, leia `16-migracao-12-para-13.md` **antes** de mexer no código.
5. Rode `python3 verify.py` para checar citações, links, samples e trechos literais.

## Estrutura de pastas

```
laravel13_guide/
├── 00-indice.md                         (este arquivo)
├── 01-instalacao-e-fundamentos.md
├── 02-arquitetura-e-ciclo-de-vida.md
├── 03-configuracao-e-ambiente.md
├── 04-seguranca.md
├── 05-logs-e-erros.md
├── 06-telemetria-e-instrumentacao.md
├── 07-performance-e-estabilidade.md
├── 08-cache-e-filas.md
├── 09-banco-e-eloquent.md
├── 10-jsonapi-e-recursos.md
├── 11-busca-semantica-e-ia.md
├── 12-blade-e-frontend.md
├── 13-api-e-autenticacao.md
├── 14-testes-e-qualidade.md
├── 15-deploy-e-operacao.md
├── 16-migracao-12-para-13.md
├── 17-receitas-e-antipadroes.md
├── SKILL.md                             (skill em inglês)
├── VERSION
├── verify.py                            (verificação mecânica)
├── example/                             (aplicação de exemplo)
└── samples/                             (fontes verbatim + MANIFEST + hashes)
```

> Fontes: documentação oficial Laravel 13.x (branch `13.x`) e skeleton
> `laravel/laravel@13.x`. Todo sample é byte a byte igual à origem; `verify.py` checa
> isso junto com citações, links e blocos literais.
