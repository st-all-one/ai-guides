# DDL e schema (`db.schema`)

> O módulo `db.schema` constrói DDL type-safe. É a base das migrações (`10`) e
> também pode ser usado para criação de schema em runtime/testes.

## 1. Criar tabela

```ts
import { sql } from 'kysely'

await db.schema
  .createTable('person')
  .addColumn('id', 'serial', (col) => col.primaryKey())
  .addColumn('first_name', 'varchar(255)', (col) => col.notNull())
  .addColumn('last_name', 'varchar(255)')
  .addColumn('gender', 'varchar(50)', (col) => col.notNull())
  .addColumn('created_at', 'timestamp', (col) =>
    col.notNull().defaultTo(sql`now()`)
  )
  .execute()
```

Variações:

```ts
.createTable('person').ifNotExists()
.createTable('person').temporary()
```

## 2. Modificadores de coluna

```ts
.addColumn('id', 'serial', (col) => col.primaryKey())
.addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
.addColumn('name', 'varchar', (col) => col.notNull())
.addColumn('email', 'varchar', (col) => col.notNull().unique())
.addColumn('age', 'integer', (col) => col.defaultTo(0))
.addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
.addColumn('status', 'varchar', (col) => col.defaultTo('active').notNull())
.addColumn('score', 'integer', (col) => col.check(sql`score >= 0`))
.addColumn('total', 'numeric', (col) =>
  col.generatedAlwaysAs(sql`price * quantity`).stored()
)
.addColumn('flag', 'varchar', (col) => col.modifyEnd(sql`identity`)) // MSSQL
```

### Foreign keys

```ts
.addColumn('owner_id', 'integer', (col) =>
  col.references('person.id').onDelete('cascade').onUpdate('no action').notNull()
)
```

Ações: `'cascade' | 'set null' | 'restrict' | 'no action'` (e `'set default'`
onde suportado).

## 3. Constraints nomeadas

```ts
await db.schema
  .createTable('pet')
  .addColumn('id', 'serial', (col) => col.primaryKey())
  .addColumn('owner_id', 'integer', (col) => col.notNull())
  .addColumn('name', 'varchar', (col) => col.notNull())
  .addUniqueConstraint('pet_name_unique', ['name'])
  .addForeignKeyConstraint('pet_owner_fk', ['owner_id'], 'person', ['id'])
  .onDelete('cascade')
  .addPrimaryKeyConstraint('pet_pk', ['id'])
  .addCheckConstraint('pet_name_not_empty', sql`length(name) > 0`)
  .execute()
```

## 4. Alterar tabela

```ts
await db.schema
  .alterTable('person')
  .addColumn('email', 'varchar', (col) => col.notNull())
  .execute()

await db.schema
  .alterTable('person')
  .dropColumn('email')
  .execute()

await db.schema
  .alterTable('person')
  .renameColumn('first_name', 'given_name')
  .execute()

await db.schema
  .alterTable('person')
  .renameTo('people')
  .execute()

await db.schema
  .alterTable('person')
  .dropConstraint('person_email_unique')
  .execute()

await db.schema
  .alterTable('person')
  .addUniqueConstraint('person_email_unique', ['email'])
  .execute()
```

### Alterar tipo / nullability / default

```ts
await db.schema
  .alterTable('person')
  .alterColumn('age', (col) => col.setDataType('bigint'))
  .alterColumn('last_name', (col) => col.setNotNull())
  .alterColumn('email', (col) => col.dropDefault())
  .execute()
```

> A disponibilidade de cada operação de `alterColumn` depende do dialect.

## 5. Índices

```ts
await db.schema
  .createIndex('pet_owner_id_index')
  .on('pet')
  .column('owner_id')
  .execute()

// único
await db.schema
  .createIndex('person_email_unique')
  .on('person')
  .column('email')
  .unique()
  .execute()

// parcial / condicional (PostgreSQL)
await db.schema
  .createIndex('person_active_idx')
  .on('person')
  .column('id')
  .where('active', '=', true)
  .execute()

// remover
await db.schema.dropIndex('pet_owner_id_index').ifExists().execute()
```

## 6. Schemas

```ts
await db.schema.createSchema('user').ifNotExists().execute()
await db.schema.dropSchema('user').ifExists().cascade().execute()
```

## 7. Views

```ts
await db.schema
  .createView('person_summary')
  .as(
    db.selectFrom('person')
      .select(['id', 'first_name'])
      .where('active', '=', true)
  )
  .execute()

// with column list
await db.schema
  .createView('person_view')
  .columns(['id', 'name'])
  .as(db.selectFrom('person').select(['id', 'first_name']))
  .execute()

// materialized (PostgreSQL)
await db.schema
  .createView('person_mat')
  .materialized()
  .as(db.selectFrom('person').selectAll())
  .execute()

await db.schema.dropView('person_summary').ifExists().execute()
```

## 8. Tipos de coluna

Os tipos são passados como **string SQL do dialect**:

| Dialect | Exemplos |
|---------|----------|
| PostgreSQL | `serial`, `integer`, `bigint`, `varchar(255)`, `text`, `boolean`, `timestamp`, `date`, `numeric`, `jsonb`, `uuid` |
| MySQL | `integer`, `varchar(255)`, `text`, `boolean`, `datetime`, `decimal`, `json` |
| SQLite | `integer`, `text`, `real`, `blob`, `numeric` |
| MSSQL | `integer`, `varchar(255)`, `datetime`, `bit`, `uniqueidentifier` |

> O Kysely não valida o nome do tipo — ele é repassado. Use o tipo do seu banco.

## 9. Padrão de migração

```ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('pet')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('owner_id', 'integer', (col) =>
      col.references('person.id').onDelete('cascade').notNull()
    )
    .addColumn('name', 'varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('pet_owner_id_index')
    .on('pet')
    .column('owner_id')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('pet').execute()
}
```

## 10. Boas práticas

- Sempre nomeie constraints e índices de forma explícita e consistente.
- Adicione índice em toda FK usada em joins.
- Use `ifExists`/`ifNotExists` em scripts idempotentes; em migrações versionadas
  nem sempre é desejável (esconde drift).
- DDL em transação funciona no PostgreSQL/SQLite; no MySQL muitos comandos
  fazem commit implícito.
