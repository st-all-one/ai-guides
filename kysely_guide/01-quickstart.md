# Quickstart

> Do zero ao primeiro CRUD tipado. Este arquivo acompanha o **exemplo canônico**
> de `00-index.md`.

## 1. Pré-requisitos

- **TypeScript 5.4+** (recomendado 5.9+ para performance de compilação).
- `"strict": true` no `tsconfig.json` — obrigatório para a type-safety funcionar.

```json title="tsconfig.json"
{
  "compilerOptions": {
    "strict": true
  }
}
```

## 2. Instalação

```bash
npm install kysely
```

Deno (`deno.json`):

```json
{
  "imports": {
    "kysely": "npm:kysely@^0.29.5"
  }
}
```

## 3. Escolher o dialect e instalar o driver

Kysely precisa de um **dialect** (entende o SQL do banco) e de um **driver**
(comunica com o banco). Dialects embutidos:

| Dialect | Driver peer | Classe |
|---------|-------------|--------|
| PostgreSQL | `pg` | `PostgresDialect` |
| MySQL | `mysql2` | `MysqlDialect` |
| Microsoft SQL Server | `tedious` (+ `tarn`) | `MssqlDialect` |
| SQLite | `better-sqlite3` | `SqliteDialect` |
| PGlite | `@electric-sql/pglite` | `PGliteDialect` |

```bash
npm install pg                     # PostgreSQL
npm install mysql2                 # MySQL
npm install better-sqlite3         # SQLite
npm install tedious tarn           # MSSQL
npm install @electric-sql/pglite   # PGlite
```

> Existem dialects da comunidade para D1, PlanetScale, Neon, libSQL, Deno SQLite
> e outros. Veja `16-integracoes-e-schemas.md` e a lista oficial em `dialects.md`.

## 4. Definir a interface `Database`

```ts title="src/types.ts"
import { Generated, Insertable, Selectable, Updateable } from 'kysely'

export interface Database {
  person: PersonTable
  pet: PetTable
}

export interface PersonTable {
  id: Generated<number>
  first_name: string
  last_name: string | null
  gender: 'man' | 'woman' | 'other'
}

export type Person = Selectable<PersonTable>
export type NewPerson = Insertable<PersonTable>
export type PersonUpdate = Updateable<PersonTable>

export interface PetTable {
  id: Generated<number>
  name: string
  owner_id: number
  species: 'dog' | 'cat'
}
```

Detalhes completos dos tipos em `02-tipos-e-database-interface.md`.

## 5. Criar a instância Kysely (singleton)

```ts title="src/database.ts"
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import type { Database } from './types.ts'

const dialect = new PostgresDialect({
  pool: new Pool({
    database: 'test',
    host: 'localhost',
    user: 'admin',
    port: 5434,
    max: 10,
  }),
})

export const db = new Kysely<Database>({ dialect })
```

> Crie **uma única instância por banco**. A maioria dos dialects usa pool
> interno; não crie uma instância por request.

Variantes de dialect:

```ts
// MySQL
import { createPool } from 'mysql2' // NÃO use 'mysql2/promises'
const dialect = new MysqlDialect({
  pool: createPool({ database: 'test', host: 'localhost', user: 'admin', password: '123' }),
})

// SQLite (better-sqlite3)
import SQLite from 'better-sqlite3'
const dialect = new SqliteDialect({ database: new SQLite(':memory:') })

// PGlite (Postgres WASM, sem servidor)
import { PGlite } from '@electric-sql/pglite'
const dialect = new PGliteDialect({ pglite: new PGlite() })
```

## 6. Primeira query

```ts
import { db } from './src/database.ts'

const person = await db
  .selectFrom('person')
  .selectAll()
  .where('first_name', '=', 'Jennifer')
  .executeTakeFirst()

console.log(person?.last_name)
```

O SQL gerado (PostgreSQL):

```sql
select * from "person" where "first_name" = $1
```

## 7. CRUD mínimo

```ts
import type { NewPerson, PersonUpdate } from './types.ts'

// CREATE
const created = await db
  .insertInto('person')
  .values({ first_name: 'Jennifer', last_name: 'Aniston', gender: 'woman' })
  .returningAll()
  .executeTakeFirstOrThrow()

// READ
const found = await db
  .selectFrom('person')
  .select(['id', 'first_name', 'last_name'])
  .where('id', '=', created.id)
  .executeTakeFirstOrThrow()

// UPDATE
await db
  .updateTable('person')
  .set({ last_name: 'Aniston-Smith' } satisfies PersonUpdate)
  .where('id', '=', created.id)
  .execute()

// DELETE
const deleted = await db
  .deleteFrom('person')
  .where('id', '=', created.id)
  .returningAll()
  .executeTakeFirst()
```

> **MySQL/MSSQL**: `returning` não existe (MSSQL) ou é limitado. MySQL popula
> `insertId`; no MSSQL use o workaround com `scope_identity()` (veja `15`).

## 8. Fechar o banco

```ts
await db.destroy() // libera pool e conexões
```

## 9. Teste de ponta a ponta (padrão oficial)

```ts title="src/PersonRepository.spec.ts"
import { sql } from 'kysely'
import { db } from './database.ts'
import * as PersonRepository from './PersonRepository.ts'

describe('PersonRepository', () => {
  before(async () => {
    await db.schema
      .createTable('person')
      .addColumn('id', 'serial', (cb) => cb.primaryKey())
      .addColumn('first_name', 'varchar', (cb) => cb.notNull())
      .addColumn('last_name', 'varchar')
      .addColumn('gender', 'varchar(50)', (cb) => cb.notNull())
      .addColumn('created_at', 'timestamp', (cb) => cb.notNull().defaultTo(sql`now()`))
      .execute()
  })

  afterEach(async () => {
    await sql`truncate table ${sql.table('person')}`.execute(db)
  })

  after(async () => {
    await db.schema.dropTable('person').execute()
    await db.destroy()
  })

  it('creates a person', async () => {
    await PersonRepository.createPerson({
      first_name: 'Jennifer',
      last_name: 'Aniston',
      gender: 'woman',
    })
  })
})
```

## Opções mais usadas no construtor

| Opção | Padrão | Quando mudar |
|-------|--------|--------------|
| `dialect` | — | **Sempre** (obrigatório) |
| `plugins` | `[]` | `CamelCasePlugin`, `DeduplicateJoinsPlugin` etc. |
| `log` | — | Array `['query','error']` ou função custom |
| `introspection` | — | Raramente |
| `{ connection }` (SQLite) | — | Config. do pool |

> Configuração de `secrets`: use variáveis de ambiente / secrets manager. Nunca
> faça commit de credenciais.

## Próximos passos

- [`02-tipos-e-database-interface.md`](./02-tipos-e-database-interface.md) — tipos e codegen
- [`03-selecionando-dados.md`](./03-selecionando-dados.md) — `select` a fundo
- [`04-filtros-where.md`](./04-filtros-where.md) — filtros
- [`09-transacoes.md`](./09-transacoes.md) — transações
- [`10-migracoes.md`](./10-migracoes.md) — versionar schema
