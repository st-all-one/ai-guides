# Banco de dados e Eloquent — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Mudanças 13: boot aninhado proibido, pivot
> morph plural, serialização restaura eager loads, global scopes em `where()` aninhado,
> `upsert` valida `uniqueBy`, `DELETE ... JOIN` com `ORDER BY`/`LIMIT`.

---

## 1. Conexões e migrations seguras

O skeleton usa SQLite por padrão (`samples/samples-env.example:19-25`) e traz
`config/database.php` completo (`samples/samples-config-database.php`). Em produção,
defina `DB_CONNECTION`, `DB_HOST`, `DB_DATABASE` etc. explicitamente e nunca use
`--force` em migration sem backup prévio.

Migrations: use `change()` com cuidado, `down()` sempre reversível, e índices criados
com nomes explícitos para evitar limite de identificador do MySQL. O skeleton cria
tabelas de users, cache e jobs
(`laravel/laravel@13.x:database/migrations/`), todas com chave primária padrão.

---

## 2. Query Builder e transações

Prefira bindings (Query Builder/Eloquent) a SQL concatenado. Transações com
`DB::transaction(fn () => ..., attempts: 3)` para deadlocks transitórios; mantenha o
escopo curto e não faça chamadas HTTP dentro delas.

`upsert()` no 13 **valida `uniqueBy` não vazio**, mesmo em MySQL/MariaDB onde o valor
é ignorado e as chaves da tabela são usadas (`samples/doc-upgrade-13.md:202-209`).
Sempre passe `uniqueBy`:

```php
DB::table('metrics')->upsert(
    [['key' => 'visits', 'value' => 10]],
    uniqueBy: ['key'],
    update: ['value'],
);
```

`DELETE ... JOIN` com `ORDER BY`/`LIMIT`: o 13 passa a incluir essas cláusulas no SQL
gerado para MySQL; engines que não suportam a sintaxe (MySQL, MariaDB < 11.8.1) podem
lançar `QueryException` (`samples/doc-upgrade-13.md:211-218`). Teste deletes com join
no banco real antes de subir.

---

## 3. Eloquent: mudanças de comportamento no 13

| Mudança | Antes (12) | Agora (13) | Ação | Fonte |
|---|---|---|---|---|
| Boot aninhado | `(new static())->getTable()` em `boot()` funcionava | lança `LogicException` | mover lógica fora do boot | `samples/doc-upgrade-13.md:223-243` |
| Pivot morph | nome singular inferido | nome plural | definir `$table` explicitamente | `samples/doc-upgrade-13.md:244-251` |
| Serialização de coleção | relações some após deserialize | eager loads restaurados | revisar jobs que contavam com ausência | `samples/doc-upgrade-13.md:253-260` |
| Global scopes em closure | `withoutGlobalScope` dentro de `where()` era ignorado | remove o scope da query inteira | chamar no builder externo | `samples/doc-upgrade-13.md:492-511` |

Exemplo do último caso (`samples/doc-upgrade-13.md:504-511` contém o trecho
`User::where(function ($query) { $query->withoutGlobalScope('active'); })->get()`):
no 13 a query retorna também registros antes excluídos. Se a intenção era remover o
scope, escreva `User::withoutGlobalScope('active')->where(...)`.

samples/doc-upgrade-13.md:502-504
```php
User::where(function ($query) {
    $query->withoutGlobalScope('active');
})->get();
```

---

## 4. Relacionamentos, casts e serialização

- Defina chaves estrangeiras e nomes de tabela explicitamente em modelos que usam
  convenções não padrão — o 13 pluraliza nomes inferidos de pivot morph.
- `#[Scope]`, `#[ScopedBy]`, `#[ObservedBy]`, `#[UseFactory]`, `#[CollectedBy]` etc.
  continuam válidos (`samples/doc-releases-13.md:134-164` mostra a expansão de atributos).
- `Model::shouldBeStrict()` em dev/teste evita lazy loading acidental e acesso a
  atributos inexistentes.
- Serialização: `toArray()`, Resource Collections e `JsonApiResource` (capítulo 10)
  são as únicas fronteiras de API — nunca exponha `$model->toArray()` diretamente em
  endpoints públicos.

---

## 5. Busca vetorial no banco

O 13 adiciona suporte nativo a similaridade vetorial no Query Builder com pgvector:
`whereVectorSimilarTo('embedding', 'Best wineries in Napa Valley')`
(`samples/doc-releases-13.md:172-185`). Em PostgreSQL, crie a coluna `vector` e um
índice adequado (IVFFlat/HNSW) antes de medir; sem índice, a busca é força bruta.
Detalhes completos no capítulo 11.

---

## 6. Integridade e testes

- Use factories/seeders do skeleton (`samples/samples-composer.json:20-31` define os
  namespaces) e `RefreshDatabase` nos testes.
- Transações por teste + `DatabaseTransactions` para consistência.
- Testes de constraint: tente inserir duplicata e verifique `QueryException` — isso
  protege contra mudança de `uniqueBy` no upgrade.
- Nunca rode `migrate:fresh` em produção.

## Resumo de Pontos-Chave

- **`upsert` exige `uniqueBy` não vazio** no 13, mesmo em MySQL/MariaDB.
- **DELETE com JOIN** agora inclui `ORDER BY`/`LIMIT` — valide no banco real.
- **Boot aninhado lança `LogicException`**: tire instanciação de `boot()`.
- **Pivot morph plural** e **eager loads restaurados** podem alterar nomes e jobs.
- **`withoutGlobalScope` em closure aninhado** afeta a query inteira no 13.
- **Use transações curtas, bindings e índices** antes de qualquer micro-otimização.
- **Busca vetorial** exige pgvector + índice; sem índice é scanning completo.
