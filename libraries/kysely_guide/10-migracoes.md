# Migrações

## 1. Arquivo de migração

```ts
import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // aplica a mudança
}

export async function down(db: Kysely<any>): Promise<void> {
  // desfaz a mudança
}
```

- `up` avança a versão do schema; `down` volta.
- O argumento é `Kysely<any>` — **não** `Kysely<YourDatabase>`.
- Migrações são "congeladas no tempo": nunca dependem do código atual do app.
- Podem usar `db.schema` (DDL) e também queries normais (data migration).

## 2. Ordem de execução

- Ordem **alfanumérica** pelo nome do arquivo.
- Prefixe com data ISO 8601 (ex.: `2026-09-13T10-00-00-create-person.ts`).
- Por padrão o Kysely valida que a ordem bate com as migrações já executadas;
  divergiu → erro (proteção).
- Para times grandes que criam migrações em paralelo, use
  `allowUnorderedMigrations`:

```ts
import { FileMigrationProvider, Migrator } from 'kysely/migration'

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({ fs, path, migrationFolder }),
  allowUnorderedMigrations: true,
})
```

Quando ativado, migrações pendentes rodam em ordem alfanumérica no up e são
desfeitas na ordem inversa de execução no down.

## 3. Single file vs multiple files

Não é obrigatório um arquivo por migração. Implemente seu próprio
`MigrationProvider` e entregue ao `Migrator` se quiser agrupar.

## 4. Exemplo PostgreSQL

```ts
import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('person')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('first_name', 'varchar', (col) => col.notNull())
    .addColumn('last_name', 'varchar')
    .addColumn('gender', 'varchar(50)', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute()

  await db.schema
    .createTable('pet')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar', (col) => col.notNull().unique())
    .addColumn('owner_id', 'integer', (col) =>
      col.references('person.id').onDelete('cascade').notNull()
    )
    .addColumn('species', 'varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('pet_owner_id_index')
    .on('pet')
    .column('owner_id')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('pet').execute()
  await db.schema.dropTable('person').execute()
}
```

## 5. Exemplo SQLite

```ts
import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('person')
    .addColumn('id', 'integer', (col) => col.primaryKey())
    .addColumn('first_name', 'text', (col) => col.notNull())
    .addColumn('last_name', 'text')
    .addColumn('gender', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  await db.schema
    .createTable('pet')
    .addColumn('id', 'integer', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull().unique())
    .addColumn('owner_id', 'integer', (col) =>
      col.references('person.id').onDelete('cascade').notNull()
    )
    .addColumn('species', 'text', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('pet_owner_id_index')
    .on('pet')
    .column('owner_id')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('pet').execute()
  await db.schema.dropTable('person').execute()
}
```

## 6. Rodar migrações

```ts
import { Migrator } from 'kysely/migration'

const migrator = new Migrator(migratorConfig)
await migrator.migrateToLatest()
```

Script completo:

```ts
import * as path from 'path'
import { promises as fs } from 'fs'
import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { FileMigrationProvider, Migrator } from 'kysely/migration'
import { Database } from './types'

async function migrateToLatest() {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ host: 'localhost', database: 'kysely_test' }),
    }),
  })

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // precisa ser caminho ABSOLUTO
      migrationFolder: path.join(__dirname, 'some/path/to/migrations'),
    }),
  })

  const { error, results } = await migrator.migrateToLatest()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" foi executada com sucesso`)
    } else if (it.status === 'Error') {
      console.error(`falha ao executar a migration "${it.migrationName}"`)
    }
  })

  if (error) {
    console.error('falha ao migrar')
    console.error(error)
    process.exit(1)
  }

  await db.destroy()
}

migrateToLatest()
```

## 7. Métodos do `Migrator`

| Método | Ação |
|--------|------|
| `migrateToLatest()` | roda todas as pendentes |
| `migrateUp()` | roda a próxima |
| `migrateDown()` | desfaz a última |
| `migrateTo(target)` | migra até a versão alvo |
| `getMigrations()` | lista migrações |

Retorno: `{ error, results }` com `status` igual a `Success` ou `Error`.

## 8. Concorrência e locks

Os métodos de migração usam lock no banco; chamadas paralelas rodam
serialmente. É seguro chamar `migrateToLatest()` de várias instâncias do
servidor ao mesmo tempo — a migração roda uma única vez. Os locks são liberados
automaticamente se o processo cair ou a conexão falhar.

## 9. CLI (opcional)

O CLI `kysely-ctl` ajuda a criar e rodar migrações. Não faz parte do core:

- https://github.com/kysely-org/kysely-ctl

```bash
npx kysely-ctl init
npx kysely-ctl migrate:up
```

## 10. Boas práticas

- Uma mudança lógica por migração; nunca edite migração já aplicada.
- Sempre implemente `down` (mesmo que só em dev, facilita testes).
- Data/hora no nome para ordenação previsível.
- Use `sql` template tag para defaults (`sql\`now()\``).
- Índices em FKs usados por joins.
- Rode migrações no deploy antes de subir a aplicação.

## 11. Referência

- [Migrator](https://kysely-org.github.io/kysely-apidoc/classes/migration.Migrator.html)
