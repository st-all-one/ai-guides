# Padrões avançados

## 1. Repository pattern

Isole as queries em funções de repositório; a aplicação nunca monta SQL solto.

```ts
import { db } from './database.ts'
import type { NewPerson, Person, PersonUpdate } from './types.ts'

export async function findPersonById(id: number) {
  return await db.selectFrom('person')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export async function findPeople(criteria: Partial<Person>) {
  let query = db.selectFrom('person')

  if (criteria.id) {
    query = query.where('id', '=', criteria.id) // reatribuição obrigatória!
  }
  if (criteria.first_name) {
    query = query.where('first_name', '=', criteria.first_name)
  }
  if (criteria.last_name !== undefined) {
    query = query.where(
      'last_name',
      criteria.last_name === null ? 'is' : '=',
      criteria.last_name,
    )
  }

  return await query.selectAll().execute()
}

export async function createPerson(person: NewPerson) {
  return await db.insertInto('person')
    .values(person)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function updatePerson(id: number, updateWith: PersonUpdate) {
  await db.updateTable('person').set(updateWith).where('id', '=', id).execute()
}

export async function deletePerson(id: number) {
  return await db.deleteFrom('person').where('id', '=', id).returningAll().executeTakeFirst()
}
```

## 2. Helpers reutilizáveis

Crie funções que recebem e devolvem `Expression`:

```ts
import { Expression, SqlBool, sql } from 'kysely'

export function upper(expr: Expression<string>) {
  return sql<string>`upper(${expr})`
}

export function lower(expr: Expression<string>) {
  return sql<string>`lower(${expr})`
}

export function concat(...exprs: Expression<string>[]) {
  return sql.join<string>(exprs, sql`||`)
}

export function isOlderThan(age: Expression<number>): Expression<SqlBool> {
  return sql<SqlBool>`age > ${age}`
}
```

Helper com subquery e contexto mínimo:

```ts
import { expressionBuilder } from 'kysely'

export function idsOfPersonsThatHaveDogNamed(name: Expression<string>) {
  const eb = expressionBuilder<DB>()

  return eb.selectFrom('pet')
    .select('pet.owner_id')
    .where('pet.species', '=', 'dog')
    .where('pet.name', '=', name)
}
```

## 3. Estender o Kysely com `Expression` custom

`Expression<T>` exige o getter `expressionType` e `toOperationNode()`.

```ts
import { Expression, Kysely, OperationNode, sql } from 'kysely'

class JsonValue<T> implements Expression<T> {
  #value: T

  constructor(value: T) {
    this.#value = value
  }

  // Getter obrigatório; retorno sempre `T | undefined`.
  get expressionType(): T | undefined {
    return undefined
  }

  toOperationNode(): OperationNode {
    const json = JSON.stringify(this.#value)
    return sql`CAST(${json} AS JSONB)`.toOperationNode()
  }
}
```

Uso type-safe em qualquer lugar:

```ts
interface DB {
  person: { address: { postalCode: string; street: string } }
}

await db.insertInto('person')
  .values({ address: new JsonValue({ postalCode: '123456', street: 'Kysely avenue 42' }) })
  .execute()

await db.selectFrom('person').selectAll()
  .where('address', '@>', new JsonValue({ postalCode: '123456', street: 'Kysely avenue 42' }))
  .execute()
```

Na maioria dos casos, um wrapper de três linhas basta:

```ts
import { RawBuilder, sql } from 'kysely'

function json<T>(value: T): RawBuilder<T> {
  return sql`CAST(${JSON.stringify(value)} AS JSONB)`
}
```

## 4. `AliasedExpression` custom

Para dar nome/alias a uma expressão própria:

```ts
import {
  AliasedExpression, Expression, AliasNode, IdentifierNode, OperationNode,
} from 'kysely'

class AliasedJsonValue<T, A extends string> implements AliasedExpression<T, A> {
  #expression: Expression<T>
  #alias: A

  constructor(expression: Expression<T>, alias: A) {
    this.#expression = expression
    this.#alias = alias
  }

  get expression(): Expression<T> { return this.#expression }
  get alias(): A { return this.#alias }

  toOperationNode(): AliasNode {
    return AliasNode.create(
      this.#expression.toOperationNode(),
      IdentifierNode.create(this.#alias),
    )
  }
}
```

## 5. Helper `values(...)` (VALUES clause)

O Kysely não tem `VALUES` embutido. Crie um `AliasedRawBuilder`:

```ts
import { AliasedRawBuilder, sql } from 'kysely'

function values<R extends Record<string, unknown>, A extends string>(
  records: R[],
  alias: A,
): AliasedRawBuilder<R, A> {
  const keys = Object.keys(records[0] ?? {})

  const values = sql.join(
    records.map((r) => sql`(${sql.join(keys.map((k) => r[k]))})`),
  )

  const wrappedAlias = sql.ref(alias)
  const wrappedColumns = sql.join(keys.map(sql.ref))
  const aliasSql = sql`${wrappedAlias}(${wrappedColumns})`

  return sql<R>`(values ${values})`.as<A>(aliasSql)
}
```

```ts
const records = [
  { id: 1, v1: 'foo', v2: 'bar' },
  { id: 2, v1: 'baz', v2: 'spam' },
]

db.insertInto('t')
  .columns(['t1', 't2'])
  .expression(
    db.selectFrom(values(records, 'v'))
      .innerJoin('j', 'v.id', 'j.vid')
      .select(['v.v1', 'j.j2'])
  )
```

## 6. Herança vs composição

Evite estender `QueryBuilder` por herança (problemas com tipos de retorno e
limitações do TS). Prefira:

- **funções helper** que recebem `Expression`/`QueryBuilder`;
- **plugins** para transformar AST;
- **module augmentation** (não oficial) só quando indispensável.

## 7. Module augmentation (não suportado oficialmente)

```ts
declare module 'kysely/dist/schema/create-table-builder' {
  interface CreateTableBuilder<TB extends string, C extends string = never> {
    addIdColumn<CN extends string = 'id'>(col?: CN): CreateTableBuilder<TB, C | CN>
  }
}

CreateTableBuilder.prototype.addIdColumn = function (
  this: CreateTableBuilder<any, any>,
  col?: string,
) {
  return this.addColumn(col || 'id', 'uuid', (col) =>
    col.primaryKey().defaultTo(sql`gen_random_uuid()`)
  )
}

db.schema.createTable('person').addIdColumn().addColumn('name', 'varchar')
```

## 8. Multi-tenant com `withSchema`

```ts
export function forTenant(tenant: string) {
  return db.withSchema(tenant)
}

await forTenant('acme').selectFrom('user').selectAll().execute()
```

Mantenha o `Database` com tabelas de tenant sem schema e as compartilhadas como
`'public.x'` (`16-integracoes-e-schemas.md`).

## 9. Testes

- Use um schema/tabela criado no `before` via `db.schema` e destruído no `after`.
- Limpe entre testes com `sql`truncate table ${sql.table('person')}`` (ou
  `delete from` no SQLite).
- Use transações com rollback ao final de cada teste quando suportado.
- Para SQL sem banco, use `DummyDriver` + `.compile()` e compare a string SQL.

```ts
import { sql } from 'kysely'
import { db } from './database.ts'

afterEach(async () => {
  await sql`truncate table ${sql.table('person')}`.execute(db)
})

after(async () => {
  await db.schema.dropTable('person').execute()
  await db.destroy()
})
```

## 10. Performance

- Crie a instância uma vez (pool interno).
- Selecione apenas as colunas necessárias.
- Use `jsonArrayFrom`/`jsonObjectFrom` em vez de N+1.
- Prefira `where` que use índices; valide com `EXPLAIN ANALYZE`.
- Em lotes grandes de insert, quebre em chunks (limite de parâmetros).
- Use `.stream(chunkSize)` para result sets grandes.
- Evite transações longas.
- Considere `kysely-codegen` para evitar drift de tipos.

## 11. Segurança

- Nunca interpole strings de usuário em SQL cru — use a `sql` template tag
  (parâmetros).
- Use `sql.ref`/`sql.id`/`sql.table` para identificadores.
- Nunca exponha credenciais; use variáveis de ambiente/secrets manager.
- Mascare PII nos logs (`13-logging-e-introspeccao.md`).
- Least privilege no usuário do banco.
