# Integrações e schemas

## 1. Supabase

Supabase fornece PostgreSQL gerenciado e gera tipos TypeScript. A lib
`kysely-supabase` traduz esses tipos para o formato do Kysely.

Pré-requisitos: CLI `supabase`, `kysely` e driver PostgreSQL (`pg` ou
`postgres` — este último exige `kysely-postgres-js`).

```bash
npm i -D kysely-supabase
npx supabase gen types typescript --local > path/to/supabase/generated/types/file
```

```ts title="src/types.ts"
import type { Database as SupabaseDatabase } from 'path/to/supabase/generated/types/file'
import type { KyselifyDatabase } from 'kysely-supabase'

export type Database = KyselifyDatabase<SupabaseDatabase>
```

```ts title="src/db.ts"
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import type { Database } from './types'

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
})
```

## 2. Working with schemas

"Schemas" aqui significa schemas customizados (ex.: PostgreSQL schemas).

### Caso 1 — conjunto enumerável de schemas

Adicione-os à interface `Database` como `'schema.tabela'`:

```ts
interface Database {
  'user.user': UserTable
  'user.user_permission': UserPermissionTable
  'user.permission': PermissionTable
  pet: PetTable
}
```

Use normalmente:

```ts
db.selectFrom('user.user')
  .where('username', '=', '')
  .where('user.user.created_at', '>', createdAt)
  .innerJoin('user.user_permission as up', 'up.user_id', 'user.user.id')
  .innerJoin('user.permission as p', 'p.id', 'up.permission_id')
  .selectAll()
```

### Caso 2 — multitenant (um schema por tenant)

Use `withSchema(schema)`: define o schema padrão para referências sem schema
explícito.

```ts
db.withSchema(tenant)
  .selectFrom('user')
  .innerJoin('user_permission as up', 'up.user_id', 'user.id')
  .innerJoin('public.permission as p', 'p.id', 'up.permission_id')
  .selectAll()
```

SQL gerado (tenant = `'acme'`):

```sql
select * from "acme"."user"
inner join "acme"."user_permission" as "up" on "up"."user_id" = "acme"."user"."id"
inner join "public"."permission" as "p" on "p"."id" = "up"."permission_id"
```

O `Database` para esse caso:

```ts
interface Database {
  // tabelas de tenant, sem schema
  user: UserTable
  user_permission: UserPermissionTable

  // schemas/tabelas referenciados explicitamente
  'public.permission': PermissionTable

  pet: PetTable
}
```

> Para referenciar `public.permission` de dentro de uma query `withSchema`, o
> nome precisa estar em `Database` com o schema.

## 3. Documentação amigável para LLMs

O Kysely publica documentação no padrão `llms.txt`:

- Índice: https://kysely.dev/llms.txt
- Tudo em um arquivo: https://kysely.dev/llms-full.txt

Uso:

- **Cursor**: `@Docs` → `https://kysely.dev/llms-full.txt`
- **Windsurf**: referencie `@https://kysely.dev/llms-full.txt` ou adicione ao
  `.windsurfrules`
- **ChatGPT/Claude**: mencione Kysely e a URL do `llms-full.txt`
- **Copilot**: inclua snippets relevantes nos comentários
- **Claude Code**: `claude -p "Using the Kysely docs at https://kysely.dev/llms-full.txt, help me build a type-safe query"`

## 4. Playground

Teste queries sem instalar nada em https://play.kysely.dev — útil para montar
exemplos para issues, PRs e Discord. Também há um
[CodeSandbox mínimo](https://codesandbox.io/s/kysely-demo-9l099t).

## 5. Outras integrações

| Integração | Lib |
|-----------|-----|
| Supabase | `kysely-supabase` |
| Postgres.js | `kysely-postgres-js` |
| PlanetScale | `kysely-planetscale` |
| Cloudflare D1 | `kysely-d1` |
| Neon | `kysely-neon` |
| libSQL/sqld | `kysely-libsql` |
| SingleStore | `kysely-singlestore` |
| SurrealDB | `kysely-surrealdb` |
| BigQuery | `kysely-bigquery` |
| ClickHouse | `kysely-clickhouse` |
| Oracle | `kysely-oracledb` |
| MariaDB | `kysely-mariadb` |

Lista completa e links em `official_docs/docs/dialects.md`.

## 6. Fronteiras com outros guias

- SQL/PostgreSQL gerado: `ai-guides/postgres_guide/`
- SQLite: `ai-guides/sqlite_guide/`
- TypeScript moderno: `ai-guides/javascript_guide/`
- Fresh/Deno: `ai-guides/fresh_guide/`
