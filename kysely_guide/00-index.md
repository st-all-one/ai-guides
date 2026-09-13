# Kysely — Guia de Implementação (Otimizado para IA)

> Query builder SQL **type-safe** para TypeScript. NÃO é ORM. Constrói o SQL que
> você escrever, com autocompletar e inferência de tipos de tabelas e colunas.
> Versão de referência: **0.29.5** (`npm:kysely`).
> Objetivo: guia denso de **COMO fazer**, cobrindo toda a doc oficial em português.

## Exemplo canônico (ponto de partida na raiz do projeto)

Todos os tópicos deste guia evoluem a partir deste exemplo. Estrutura mínima:

```
meu-projeto/
├── src/
│   ├── types.ts            # interface Database (tabelas + colunas)
│   ├── database.ts         # instância Kysely (dialect + driver)
│   └── PersonRepository.ts # consultas tipadas
└── main.ts
```

`src/types.ts`:

```ts
import {
  ColumnType,
  Generated,
  Insertable,
  JSONColumnType,
  Selectable,
  Updateable,
} from 'kysely'

export interface Database {
  person: PersonTable
  pet: PetTable
}

export interface PersonTable {
  id: Generated<number>
  first_name: string
  gender: 'man' | 'woman' | 'other'
  last_name: string | null
  age: number | null
  mother_id: number | null
  created_at: ColumnType<Date, string | undefined, never>
  metadata: JSONColumnType<{
    login_at: string
    ip: string | null
    plan: 'free' | 'premium'
  }>
}

export type Person = Selectable<PersonTable>
export type NewPerson = Insertable<PersonTable>
export type PersonUpdate = Updateable<PersonTable>

export interface PetTable {
  id: Generated<number>
  name: string
  owner_id: number
  species: 'dog' | 'cat'
  is_favorite: boolean
}

export type Pet = Selectable<PetTable>
export type NewPet = Insertable<PetTable>
export type PetUpdate = Updateable<PetTable>
```

`src/database.ts` (PostgreSQL + driver `pg`):

```ts
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import type { Database } from './types.ts'

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      database: 'test',
      host: 'localhost',
      user: 'admin',
      password: '123',
      port: 5434,
      max: 10,
    }),
  }),
})
```

`src/PersonRepository.ts`:

```ts
import { db } from './database.ts'
import type { NewPerson, Person, PersonUpdate } from './types.ts'

export async function findPersonById(id: number) {
  return await db
    .selectFrom('person')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export async function findPeople(criteria: Partial<Person>) {
  let query = db.selectFrom('person')

  if (criteria.id) query = query.where('id', '=', criteria.id)
  if (criteria.first_name) query = query.where('first_name', '=', criteria.first_name)

  return await query.selectAll().execute()
}

export async function createPerson(person: NewPerson) {
  return await db
    .insertInto('person')
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

`main.ts`:

```ts
import { createPerson, findPersonById } from './src/PersonRepository.ts'

const jennifer = await createPerson({
  first_name: 'Jennifer',
  last_name: 'Aniston',
  gender: 'woman',
  age: 40,
  mother_id: null,
  created_at: new Date().toISOString(),
  metadata: JSON.stringify({ login_at: '', ip: null, plan: 'free' }),
})

console.log(await findPersonById(jennifer.id))
```

Variante **Deno** (`deno.json` com imports npm e driver do projeto):

```json
{
  "imports": {
    "kysely": "npm:kysely@^0.29.5",
    "pg": "npm:pg@^8.13.0"
  }
}
```

```ts
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
const { Pool } = pg

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool: new Pool({ connectionString: Deno.env.get('DATABASE_URL') }) }),
})
```

Esse exemplo é a base de **todos** os tópicos. As seções seguintes só adicionam
tipos, builders, helpers, transações, migrações e configuração sobre ele.

## Navegação

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [quickstart.md](./01-quickstart.md) | Instalação, dialect, `Database`, instância, CRUD inicial |
| 02 | [02-tipos-e-database-interface.md](./02-tipos-e-database-interface.md) | `Database`, `Generated`, `ColumnType`, `Selectable`/`Insertable`/`Updateable`, codegen |
| 03 | [03-selecionando-dados.md](./03-selecionando-dados.md) | `select`, `selectAll`, aliases, `fn`, `distinct`, `distinctOn` |
| 04 | [04-filtros-where.md](./04-filtros-where.md) | `where`, operadores, `in`, `or`/`and`/`not`/`exists`, where condicional |
| 05 | [05-joins.md](./05-joins.md) | Inner/left/right/full, aliases, joins complexos, subquery join |
| 06 | [06-escrita-crud.md](./06-escrita-crud.md) | Insert, update, delete, `returning`, merge |
| 07 | [07-expressoes-e-helpers.md](./07-expressoes-e-helpers.md) | `Expression`, `expressionBuilder`, `sql`, `RawBuilder`, helpers reutilizáveis |
| 08 | [08-cte-subqueries-relacoes.md](./08-cte-subqueries-relacoes.md) | `with`, CTEs recursivas, `jsonArrayFrom`/`jsonObjectFrom`, relações |
| 09 | [09-transacoes.md](./09-transacoes.md) | `transaction().execute()`, `startTransaction`, savepoints |
| 10 | [10-migracoes.md](./10-migracoes.md) | Arquivos up/down, `Migrator`, `FileMigrationProvider`, CLI |
| 11 | [11-schema-ddl.md](./11-schema-ddl.md) | `db.schema`, create/alter/drop table, índices, constraints |
| 12 | [12-plugins.md](./12-plugins.md) | CamelCase, DeduplicateJoins, HandleEmptyInLists, SafeNullComparison, ParseJSONResults |
| 13 | [13-logging-e-introspeccao.md](./13-logging-e-introspeccao.md) | `log`, `LogEvent`, `db.introspection.getTables()` |
| 14 | [14-tipagem-avancada.md](./14-tipagem-avancada.md) | `$assertType`, `$narrowType`, `$notNull`, `$asScalar`, dynamic module |
| 15 | [15-execucao-e-runtimes.md](./15-execucao-e-runtimes.md) | `.compile()`, `executeQuery`, `InferResult`, cold/DummyDriver, Deno, browser |
| 16 | [16-integracoes-e-schemas.md](./16-integracoes-e-schemas.md) | Supabase, schemas/multitenant, `withSchema`, llms.txt |
| 17 | [17-cheatsheet.md](./17-cheatsheet.md) | Snippets prontos de todos os builders |
| 18 | [18-faq-troubleshooting.md](./18-faq-troubleshooting.md) | Erros comuns, imutabilidade, TS2589, drivers, runtime types |
| 19 | [19-padroes-avancados.md](./19-padroes-avancados.md) | Repository, helpers, extensão via `Expression`, module augmentation |

## Modelo mental (leia antes de escrever queries)

1. **Kysely é query builder, não ORM.** Não existe relação automática, `include`,
   lazy loading nem entidade. Você escreve SQL e recebe linhas tipadas.
2. **`Database` é o contrato.** A interface passada ao construtor mapeia
   `nome_da_tabela → schema_da_tabela`. Sem ela não há type-safety.
3. **Builders são imutáveis.** Cada método retorna **novo** builder. Em código
   condicional, reatribua: `query = query.where(...)`.
4. **Chain termina em execução.** `.execute()`, `.executeTakeFirst()`,
   `.executeTakeFirstOrThrow()` ou `.compile()`. Antes disso nada vai ao banco.
5. **Tudo é `Expression`.** Métodos aceitam `Expression<T>` via callback
   (`(eb) => ...`) — é assim que o Kysely infere o contexto de tabelas.
6. **Tipos TS ≠ tipos runtime.** O driver (`pg`, `mysql2`) define o formato real
   retornado; o Kysely só executa e repassa.
7. **SQL cru tem escape hatch.** `sql` template tag com parâmetros, nunca
   interpolação de string.

## Ordem prática de implementação

1. `npm install kysely <driver>` (ou imports `npm:` no `deno.json`)
2. Definir `interface Database` com todas as tabelas/colunas (`02`)
3. Criar instância única `new Kysely<Database>({ dialect, plugins, log })` (`01`)
4. Escrever repositório com `selectFrom`/`insertInto`/`updateTable`/`deleteFrom` (`03`–`06`)
5. Extrair expressões reutilizáveis para helpers (`07`)
6. Nestar relações com `jsonArrayFrom`/`jsonObjectFrom` (`08`)
7. Envolver operações múltiplas em `db.transaction()` (`09`)
8. Criar schema com migrações up/down (`10`, `11`)
9. Em produção: `CamelCasePlugin` se o banco for snake_case, logging e pool (`12`, `13`)
10. Manter `db` como singleton; `await db.destroy()` no shutdown
