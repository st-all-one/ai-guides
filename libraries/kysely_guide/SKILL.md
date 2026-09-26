---
name: kysely
description: >
  Kysely v0.29.5 — type-safe SQL query builder for TypeScript: Database
  interface, select/filter/join/CRUD, CTEs/subqueries, transactions,
  migrations, DDL, plugins, advanced typing, Postgres/SQLite/Deno. Load when
  writing typed SQL without an ORM.
category: libraries
version: "0.29.5"
tags: [kysely, typescript, sql, query-builder, postgres, sqlite, migrations, type-safe]
license: MIT
---

# Kysely v0.29.5

## Use When
- Typed SQL with autocompletion of tables/columns in TS/Deno/Node
- SELECT/INSERT/UPDATE/DELETE, joins, CTEs, subqueries, merge
- Transactions, savepoints, migrations, DDL
- Nested relations as JSON (`jsonArrayFrom`/`jsonObjectFrom`) without an ORM
- Reusable type-safe SQL helpers (`sql` tag, expression builder)
- Postgres, MySQL, SQLite, MSSQL, PGlite, Supabase, Deno

## Core Rules
- Define a `Database` interface describing every table/column; it drives all typing.
- Construct one `Kysely<DB>` per dialect/pool; never per request.
- Not an ORM: Kysely emits exactly the SQL you build.
- Always `.execute()`/`.executeTakeFirst()`/`.executeTakeFirstOrThrow()`.
- Use `Generated<T>` for defaults/serials; `ColumnType` for custom codecs.
- Parameterize values (Kysely does); never concatenate user SQL — use `sql` tag params.
- Wrap multi-step writes in `db.transaction().execute(...)`.
- Prefer `selectFrom` + explicit columns over `selectAll` for stable shapes.
- Manage schema with Kysely migrations in production.

## Core Patterns
```ts
import { Kysely, PostgresDialect, Generated } from "kysely";
import { Pool } from "pg";

interface DB {
  user: { id: Generated<number>; name: string; email: string };
  post: { id: Generated<number>; author_id: number; title: string };
}
const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool: new Pool() }) });

const rows = await db.selectFrom("user")
  .innerJoin("post", "post.author_id", "user.id")
  .select(["user.id", "user.name", "post.title"])
  .where("user.email", "=", email)
  .orderBy("post.id", "desc")
  .limit(20)
  .execute();

await db.transaction().execute(async (trx) => {
  const u = await trx.insertInto("user").values({ name, email })
    .returning("id").executeTakeFirstOrThrow();
  await trx.insertInto("post").values({ author_id: u.id, title }).execute();
});

// Nested JSON
import { jsonArrayFrom } from "kysely/helpers/postgres";
const q = db.selectFrom("user").select((eb) => [
  "user.id",
  jsonArrayFrom(eb.selectFrom("post").select(["post.id","post.title"])
    .whereRef("post.author_id","=","user.id")).as("posts"),
]);
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Overview and mental model |
| `01-quickstart.md` | Install, dialect, `Database`, first CRUD |
| `02-tipos-e-database-interface.md` | `Database`, `Generated`, `ColumnType`, codegen |
| `03-selecionando-dados.md` | select, aliases, fn, distinct |
| `04-filtros-where.md` | where, and/or, exists, operators |
| `05-joins.md` | inner/left/right/full, lateral |
| `06-escrita-crud.md` | insert/update/delete/returning |
| `07-expressoes-e-helpers.md` | `sql` tag, expression builder, helpers |
| `08-cte-subqueries-relacoes.md` | CTEs, subqueries, JSON relations |
| `09-transacoes.md` | transactions, isolation, savepoints |
| `10-migracoes.md` | Migrator, up/down, locking |
| `11-schema-ddl.md` | Schema builder, create/alter/drop |
| `12-plugins.md` | CamelCase, SoftDelete, WithSchema, etc. |
| `13-logging-e-introspeccao.md` | Logging, introspection, codegen |
| `14-tipagem-avancada.md` | Advanced type patterns |
| `15-execucao-e-runtimes.md` | Node/Deno/Bun drivers |
| `16-integracoes-e-schemas.md` | Integrations and generated schemas |
| `17-cheatsheet.md` | Quick reference |
| `18-faq-troubleshooting.md` | FAQ and pitfalls |
| `19-padroes-avancados.md` | Advanced patterns |

## Read Order
`00`→`01`→`02`; queries `03`–`08`; transactions/migrations `09`–`11`; plugins `12`.

## Prereqs
TypeScript and SQL fundamentals; a supported database driver.
