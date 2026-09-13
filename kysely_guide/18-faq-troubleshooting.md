# FAQ e Troubleshooting

## Imutabilidade dos builders

**Sintoma:** filtros aplicados em variável não têm efeito.

```ts
let query = db.selectFrom('person')
if (name) {
  query.where('first_name', '=', name) // ❌ descartado
}
```

**Correção:** reatribua, pois cada método retorna novo builder.

```ts
if (name) query = query.where('first_name', '=', name) // ✅
```

## `TS2589: Type instantiation is excessively deep`

**Causa:** queries muito grandes (muitos `with`, helpers aninhados).

**Solução:** use `$assertType<T>()` em alguma subquery para simplificar o tipo.
Detalhes em `14-tipagem-avancada.md`. `Simplify<T>` não resolve.

## `= null` não retorna linhas

```ts
// ❌
.where('last_name', '=', null)
// ✅
.where('last_name', 'is', null)
```

Ou use `SafeNullComparisonPlugin`.

## `in ()` com lista vazia

`where('id', 'in', [])` gera SQL inválido em vários bancos. Use
`HandleEmptyInListsPlugin` (`12-plugins.md`).

## `returning` não funciona (MySQL/MSSQL)

- **MySQL**: não suporta `returning`. Use `insertId` no insert, ou faça um
  `select` posterior.
- **MSSQL** (0.29): `OUTPUT` ainda não suportado; use o workaround com
  `scope_identity()` (`15-execucao-e-runtimes.md`).

## `insertId` é `undefined` no PostgreSQL

PostgreSQL não retorna `insertId`. Adicione `.returning('id')` e use
`executeTakeFirstOrThrow()`.

## Tipos TS não batem com os valores em runtime

TypeScript não altera o runtime. O driver (`pg`, `mysql2`) decide os tipos
retornados. Ajuste os parsers do driver (`pg-types`, `typeCast`) e alinhe a
interface `Database`. Veja `02-tipos-e-database-interface.md`.

## `Cannot find module 'kysely/migration'` / `'kysely/helpers/postgres'`

Esses são subpaths de export. Verifique:

- versão do Kysely >= 0.24;
- `moduleResolution`/`module` do TS compatíveis (`bundler`, `node16` ou
  `nodenext`);
- no Deno, importe `npm:kysely` e use os subpaths normalmente.

## Transação "perde" o escopo

**Sintoma:** operações feitas com `db` dentro de `db.transaction()` não
participam da transação.

**Correção:** use sempre o `trx` recebido no callback (ou passe-o como parâmetro
para o repositório).

## Pool esgotado / queries travando

- Não crie um `new Kysely()` por request.
- Não faça queries sequenciais desnecessárias dentro de transações.
- Configure `max`/`min` do pool conforme o servidor de banco.
- Em serverless, use pool pequeno ou proxy (ex.: Supabase pooler).

## `undefined` vs `null` em filtros

No Kysely, `where(col, '=', undefined)` normalmente ignora o filtro; `null` vira
parâmetro. Em filtros condicionais use `if (value !== undefined)` antes.

## Resultado de `.execute()` é sempre array

`insert`/`update`/`delete` também retornam array. Para pegar um item, use
`executeTakeFirst()` / `executeTakeFirstOrThrow()`. Contagens vêm em
`numInsertedOrUpdatedRows`, `numUpdatedRows`, `numDeletedRows`, `numChangedRows`.

## `onConflict` não existe / erro de sintaxe

`onConflict` é específico de PostgreSQL/SQLite. No MySQL use
`onDuplicateKeyUpdate`; confira o suporte do seu dialect.

## Problemas de tipo ao passar objeto grande no `.set()`/`.values()`

Use os wrappers (`Insertable`/`Updateable`) ou `satisfies` para localizar a
chave inválida:

```ts
.set({ ... } satisfies PersonUpdate)
```

## Colunas JSON voltando como string

Alguns drivers/dialects não parseiam JSON automaticamente. Use
`ParseJSONResultsPlugin` ou configure o parser do driver.

## `Type 'X' is not assignable to type 'never'`

Você está tentando inserir/atualizar uma coluna marcada como `never` na operação
(ex.: `ColumnType<Date, string | undefined, never>`). Ajuste o `ColumnType` ou
não envie essa coluna.

## Query lenta

- Rode `.compile()` e `EXPLAIN ANALYZE` no banco.
- Confira se há índice para os `where`/join.
- Evite `select *` desnecessário.
- Use `jsonArrayFrom`/`jsonObjectFrom` com índices nas FKs.
- Meça com `log` (`queryDurationMillis`).

## Erro ao usar `.returningAll()` com joins

Use `.returningAll('person')` para desambiguar a tabela.

## `db.destroy()` e processo não encerra

Certifique-se de aguardar `await db.destroy()` e de não ter queries pendentes.
Em testes, chame `destroy()` no `after`/`afterAll`.
