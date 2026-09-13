# Cheatsheet

## Setup

```ts
import { Kysely, PostgresDialect, Generated, sql } from 'kysely'
import { Pool } from 'pg'

interface Database { person: PersonTable; pet: PetTable }

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
  plugins: [],
  log: ['error'],
})
```

## Tipos

```ts
Generated<T>                              // gerado pelo banco
ColumnType<Select, Insert, Update>        // tipo por operação
JSONColumnType<T>                         // ColumnType<T, string, string>
Selectable<T> / Insertable<T> / Updateable<T>
T | null                                  // anulável (nunca `?:`)
```

## SELECT

```ts
db.selectFrom('person')
  .select('id')
  .select(['id', 'first_name'])
  .selectAll()
  .selectAll('person')
  .select((eb) => [eb.fn.count('id').as('n')])
  .distinct()
  .distinctOn('person.id')
  .where('id', '=', 1)
  .groupBy('person.id')
  .having((eb) => eb.fn.count('id'), '>', 1)
  .orderBy('created_at', 'desc')
  .limit(10).offset(20)
  .execute()                 // T[]
  .executeTakeFirst()        // T | undefined
  .executeTakeFirstOrThrow() // T
```

## WHERE

```ts
.where('a', '=', v)
.where('a', 'in', [1,2,3])
.where('a', 'is', null)
.whereRef('a', '=', 'b')
.where((eb) => eb.or([eb('a','=',1), eb('b','=',2)]))
.where(({ and, not, exists, selectFrom }) => and([...]))
.where((eb) => eb.and({ a: 1, b: 2 }))
.$if(cond, (qb) => qb.where(...))
```

## JOIN

```ts
.innerJoin('pet', 'pet.owner_id', 'person.id')
.leftJoin('pet as p', 'p.owner_id', 'person.id')
.innerJoin('pet', (join) => join.onRef('pet.owner_id','=','person.id').on('pet.name','=','Doggo'))
.innerJoin((eb) => eb.selectFrom('pet').selectAll().as('d'), (j) => j.onRef('d.owner_id','=','person.id'))
```

## INSERT

```ts
db.insertInto('person')
  .values({ first_name: 'Jennifer' })
  .values([{ ... }, { ... }])
  .returningAll()
  .onConflict((oc) => oc.column('id').doUpdateSet({ ... }))
  .executeTakeFirstOrThrow()
```

## UPDATE

```ts
db.updateTable('person')
  .set({ last_name: 'Aniston' })
  .set((eb) => ({ age: eb('age', '+', 1) }))
  .where('id', '=', 1)
  .returningAll()
  .execute()
```

## DELETE

```ts
db.deleteFrom('person').where('id', '=', 1).returningAll().executeTakeFirst()
```

## MERGE

```ts
db.mergeInto('person as target')
  .using('pet as source', 'source.owner_id', 'target.id')
  .whenMatched().thenUpdateSet({ ... })
  .whenNotMatched().thenInsertValues({ ... })
  .whenMatchedAnd('active', '=', false).thenDelete()
  .execute()
```

## CTE / SUBQUERY

```ts
db.with('cte', (db) => db.selectFrom('person').selectAll())
  .withRecursive('tree', (db) => db.selectFrom('person').unionAll((db) => ...))
  .selectFrom('cte').selectAll().execute()

// subquery em select
.select((eb) => eb.selectFrom('pet').select('name').whereRef(...).as('pet_name'))

// subquery como tabela
.innerJoin((eb) => eb.selectFrom('pet').selectAll().as('p'), (j) => ...)
```

## RELAÇÕES JSON

```ts
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres'

.select((eb) => [
  jsonArrayFrom(eb.selectFrom('pet').selectAll().whereRef('pet.owner_id','=','person.id')).as('pets'),
  jsonObjectFrom(eb.selectFrom('pet').selectAll().whereRef(...)).$notNull().as('favorite'),
])
```

## EXPRESSÕES / SQL

```ts
sql<string>`upper(${ref('last_name')})`
sql.join<string>(exprs, sql`||`)
eb.ref('col') / eb.val(x) / eb.lit(x)
eb.fn.count<number>('id')
eb.fn('concat', ['first_name', val(' ')])
expressionBuilder<DB, 'person'>()
.$asScalar() / .$notNull() / .$assertType<T>() / .$narrowType<T>()
```

## TRANSAÇÃO

```ts
await db.transaction().execute(async (trx) => {
  await trx.insertInto('person').values({ ... }).execute()
})

const trx = await db.startTransaction().execute()
try { await trx.insertInto(...).execute(); await trx.commit().execute() }
catch (e) { await trx.rollback().execute() }

const sp = await trx.savepoint('sp').execute()
await sp.rollbackToSavepoint('sp').execute()
await sp.releaseSavepoint('sp').execute()
```

## MIGRAÇÃO / DDL

```ts
export async function up(db: Kysely<any>) {
  await db.schema.createTable('person')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('first_name', 'varchar(255)', (c) => c.notNull())
    .addColumn('created_at', 'timestamp', (c) => c.defaultTo(sql`now()`))
    .execute()
  await db.schema.createIndex('person_first_name_idx').on('person').column('first_name').execute()
}
export async function down(db: Kysely<any>) {
  await db.schema.dropTable('person').execute()
}
```

## PLUGINS

```ts
new CamelCasePlugin()
new DeduplicateJoinsPlugin()
new HandleEmptyInListsPlugin({ emptyInLists: 'return-no-rows' })
new SafeNullComparisonPlugin()
new ParseJSONResultsPlugin()
db.withPlugin(new DeduplicateJoinsPlugin())
```

## EXECUÇÃO

```ts
q.compile()                       // { sql, parameters, query }
db.executeQuery(compiled)         // QueryResult
InferResult<typeof q>             // tipo do resultado
db.selectFrom('person').selectAll().stream(100)
await db.destroy()
```

## UTILITÁRIOS

```ts
db.withSchema('acme').selectFrom('user')...
db.dynamic.table(name) / db.dynamic.ref(name)
db.introspection.getTables()
Selectable / Insertable / Updateable wrappers
```
