# Escrita: Insert, Update, Delete e Merge

## INSERT

### Uma linha

```ts
const result = await db
  .insertInto('person')
  .values({
    first_name: 'Jennifer',
    last_name: 'Aniston',
    gender: 'woman',
  })
  .executeTakeFirst()

console.log(result.insertId)
```

> `insertId` só existe em dialects que retornam o id automaticamente (MySQL,
> SQLite). No PostgreSQL use `returning` (veja abaixo).

### Múltiplas linhas

```ts
await db
  .insertInto('person')
  .values([
    { first_name: 'Jennifer', last_name: 'Aniston', gender: 'woman' },
    { first_name: 'Arnold', last_name: 'Schwarzenegger', gender: 'man' },
  ])
  .execute()
```

> Em PostgreSQL/MySQL é possível inserir milhares de linhas numa query, mas
> cuidado com o limite de parâmetros do driver. Para lotes grandes, quebre em
> chunks.

### `returning` dados

```ts
const result = await db
  .insertInto('person')
  .values({ first_name: 'Jennifer', last_name: 'Aniston', gender: 'woman' })
  .returning(['id', 'first_name as name'])
  .executeTakeFirstOrThrow()
```

`.returningAll()` retorna todas as colunas. Use
`.returningAll('person')` quando houver joins/aliases.

> MSSQL não suporta `OUTPUT` no Kysely 0.29 — use o workaround com
> `scope_identity()` descrito em `15-execucao-e-runtimes.md`.

### Valores complexos (expressões, refs, subqueries)

```ts
import { sql } from 'kysely'

const result = await db
  .insertInto('person')
  .values(({ ref, selectFrom, fn }) => ({
    first_name: 'Jennifer',
    last_name: sql<string>`concat(${'Ani'}, ${'ston'})`,
    middle_name: ref('first_name'),
    age: selectFrom('person').select(fn.avg<number>('age').as('avg_age')),
  }))
  .executeTakeFirst()
```

### INSERT ... SELECT

```ts
const result = await db
  .insertInto('person')
  .columns(['first_name', 'last_name', 'gender'])
  .expression((eb) =>
    eb.selectFrom('pet').select((eb) => [
      'pet.name',
      eb.val('Petson').as('last_name'),
      eb.val('other').as('gender'),
    ])
  )
  .execute()
```

### `onConflict` (UPSERT)

```ts
await db
  .insertInto('person')
  .values({ id: 1, first_name: 'Jennifer' })
  .onConflict((oc) =>
    oc.column('id').doUpdateSet({ first_name: 'Jennifer' })
  )
  .execute()

// genérico
.onConflict((oc) => oc.doNothing())
```

> Suporte a `onConflict` varia por dialect (PostgreSQL/SQLite sim; MySQL usa
> `onDuplicateKeyUpdate`).

## UPDATE

```ts
const result = await db
  .updateTable('person')
  .set({
    first_name: 'Jennifer',
    last_name: 'Aniston',
  })
  .where('id', '=', 1)
  .executeTakeFirst()
```

### Valores complexos

```ts
const result = await db
  .updateTable('person')
  .set((eb) => ({
    age: eb('age', '+', 1),
    first_name: eb.selectFrom('pet').select('name').limit(1),
    last_name: 'updated',
  }))
  .where('id', '=', 1)
  .executeTakeFirst()
```

### UPDATE com join (MySQL)

```ts
const result = await db
  .updateTable(['person', 'pet'])
  .set('person.first_name', 'Updated person')
  .set('pet.name', 'Updated doggo')
  .whereRef('person.id', '=', 'pet.owner_id')
  .where('person.id', '=', 1)
  .executeTakeFirst()
```

### UPDATE ... FROM (PostgreSQL)

```ts
db.updateTable('person')
  .set((eb) => ({ last_name: eb.ref('pet.name') }))
  .from('pet')
  .whereRef('person.id', '=', 'pet.owner_id')
```

### `returning` no update

```ts
const updated = await db
  .updateTable('person')
  .set({ last_name: 'New' })
  .where('id', '=', 1)
  .returning(['id', 'last_name'])
  .executeTakeFirst()
```

## DELETE

```ts
const result = await db
  .deleteFrom('person')
  .where('person.id', '=', 1)
  .executeTakeFirst()

console.log(result.numDeletedRows)
```

### `returning` no delete

```ts
const deleted = await db
  .deleteFrom('person')
  .where('id', '=', 1)
  .returning(['id', 'first_name'])
  .executeTakeFirst()
```

### DELETE com USING / join

```ts
db.deleteFrom('person')
  .using('pet')
  .whereRef('pet.owner_id', '=', 'person.id')
  .where('pet.name', '=', 'Doggo')
```

## MERGE

### Source row existence

```ts
const result = await db
  .mergeInto('person as target')
  .using('pet as source', 'source.owner_id', 'target.id')
  .whenMatchedAnd('target.has_pets', '!=', 'Y')
  .thenUpdateSet({ has_pets: 'Y' })
  .whenNotMatchedBySourceAnd('target.has_pets', '=', 'Y')
  .thenUpdateSet({ has_pets: 'N' })
  .executeTakeFirstOrThrow()

console.log(result.numChangedRows)
```

### Tabela temporária de mudanças

```ts
const result = await db
  .mergeInto('wine as target')
  .using('wine_stock_change as source', 'source.wine_name', 'target.name')
  .whenNotMatchedAnd('source.stock_delta', '>', 0)
  .thenInsertValues(({ ref }) => ({
    name: ref('source.wine_name'),
    stock: ref('source.stock_delta'),
  }))
  .whenMatchedAnd(
    (eb) => eb('target.stock', '+', eb.ref('source.stock_delta')),
    '>',
    0,
  )
  .thenUpdateSet('stock', (eb) =>
    eb('target.stock', '+', eb.ref('source.stock_delta')),
  )
  .whenMatched()
  .thenDelete()
  .executeTakeFirstOrThrow()
```

## Movimentos de colunas

### `INSERT` — quais colunas existem no tipo

Se a coluna tiver default/`Generated`, é opcional. Se for `ColumnType` com
`never` no insert, tentar passar dá erro de compilação — bons testes de tipo.

### `UPDATE` — `Updateable<...>`

```ts
import type { PersonUpdate } from './types.ts'

const changes: PersonUpdate = { last_name: 'Aniston' }
await db.updateTable('person').set(changes).where('id', '=', 1).execute()
```

## Retorno de contagem

```ts
const { numInsertedOrUpdatedRows } = await db.insertInto('person').values([...]).execute()
const { numUpdatedRows } = await db.updateTable('person').set(...).execute()
const { numDeletedRows } = await db.deleteFrom('person').where(...).execute()
```

## Boas práticas

- Prefira `.executeTakeFirstOrThrow()` em inserts com `returning`.
- Quebre lotes grandes de `values()` em chunks (limite de parâmetros).
- Nunca concatene valores em SQL cru: use `sql` template tag com parâmetros.
- Migrações / DDL ficam em `10` e `11`; escrita de dados é aqui.
