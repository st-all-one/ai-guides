# Execução, compilação e runtimes

## 1. Fluxo de execução (visão geral)

1. **Query building imutável** — cada método (`selectFrom`, `where`, ...) retorna
   novo `QueryBuilder` com uma `QueryAST` atualizada.
2. **`execute()`** — inicia o fluxo no `QueryExecutor`.
3. **`transformQuery`** — plugins podem modificar a AST.
4. **Compilação** — o `QueryCompiler` do dialect gera `CompiledQuery`
   (`sql` + `parameters`).
5. **Conexão** — o `Driver` adquire conexão do pool (`pg`, `mysql2`, ...).
6. **Execução** — `DatabaseConnection` envia SQL + parâmetros ao banco.
7. **`transformResult`** — plugins podem modificar as linhas.
8. **Retorno** — resultados tipados chegam ao `App`.

## 2. `.compile()` — só gerar SQL

```ts
const compiledQuery = db
  .selectFrom('person')
  .select('first_name')
  .where('id', '=', id)
  .compile()

console.log(compiledQuery)
// { sql: 'select "first_name" from "person" where "id" = $1', parameters: [1], query: {...} }
```

`CompiledQuery`:

```ts
interface CompiledQuery<Q = any> {
  readonly sql: string
  readonly parameters: readonly unknown[]
  readonly query: Q
}
```

SQL cru também compila:

```ts
import { Selectable, sql } from 'kysely'

const compiledQuery = sql<Selectable<Person>>`select * from person where id = ${id}`.compile(db)
```

## 3. `InferResult` — tipo sem executar

```ts
import { InferResult } from 'kysely'

const query = db.selectFrom('person').select('first_name').where('id', '=', id)
type QueryReturnType = InferResult<typeof query> // { first_name: string }[]

const compiledQuery = query.compile()
type CompiledQueryReturnType = InferResult<typeof compiledQuery> // { first_name: string }[]
```

Permite separar build, compile e execute sem perder type-safety.

## 4. `executeQuery` — executar compiled

```ts
const compiledQuery = db
  .selectFrom('person')
  .select('first_name')
  .where('id', '=', id)
  .compile()

const results = await db.executeQuery(compiledQuery)
```

`QueryResult` contém linhas, `insertId` e número de linhas afetadas.

## 5. Instâncias "cold" (sem driver)

Para usar Kysely **apenas** como query builder, sem dependência de driver:

```ts
import {
  DummyDriver,
  Generated,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from 'kysely'

interface Database {
  person: { id: Generated<number>; first_name: string; last_name: string | null }
}

const db = new Kysely<Database>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
})
```

- Compila SQL do dialect escolhido.
- Executar queries numa instância cold retorna resultado vazio, sem tocar no
  banco.
- Útil para gerar SQL, testes de snapshot e ambientes sem DB.

## 6. DummyDriver e browser

```ts
import {
  Kysely, Generated, DummyDriver,
  SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler,
} from 'kysely'

interface Database {
  person: { id: Generated<number>; first_name: string; last_name: string | null }
}

const db = new Kysely<Database>({
  dialect: {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new SqliteIntrospector(db),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  },
})

window.addEventListener('load', () => {
  const sql = db.selectFrom('person').select('id').compile()
  document.body.textContent = sql.sql
})
```

## 7. Deno

Kysely não inclui drivers nativos para Deno, mas roda como query builder ou com
dialects da comunidade.

Via jsDelivr/npm:

```ts
import {
  DummyDriver, Generated, Kysely,
  PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler,
} from 'https://cdn.jsdelivr.net/npm/kysely/dist/index.js'

interface Database {
  person: { id: Generated<number>; first_name: string; last_name: string | null }
}

const db = new Kysely<Database>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
})

console.log(db.selectFrom('person').select('id').compile().sql)
```

Via `deno.json` + driver real:

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

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: Deno.env.get('DATABASE_URL') }),
  }),
})
```

Dialects comunitários para Deno: `kysely-deno-sqlite`,
`kysely-deno-sqlite3`, `kysely-libsql`, `kysely-postgres-js` (postgres.js),
`kysely-d1`, entre outros.

## 8. Workarounds de dialect

### MSSQL — insert com id (sem `OUTPUT`)

```ts
export async function createPerson(person: NewPerson) {
  const compiledQuery = db.insertInto('person').values(person).compile()

  const { rows: [{ id }] } = await db.executeQuery<Pick<Person, 'id'>>({
    ...compiledQuery,
    sql: `${compiledQuery.sql}; select scope_identity() as id`,
  })

  return await findPersonById(id)
}
```

### SQLite — `truncate` não existe

```ts
await sql`delete from ${sql.table('person')}`.execute(db)
```

## 9. Streaming

```ts
const stream = db
  .selectFrom('person')
  .selectAll()
  .stream(100) // chunks de 100

for await (const chunk of stream) {
  for (const row of chunk) {
    console.log(row)
  }
}
```

## 10. Boas práticas

- Reuse uma única instância `Kysely`.
- Sempre aguarde (`await`) as queries antes de encerrar o processo.
- No shutdown, `await db.destroy()` para fechar o pool.
- Em serverless, configure o pool para minimizar conexões ociosas.
- Prefira `.compile()`/`InferResult` para separar geração e execução quando
  necessário.
