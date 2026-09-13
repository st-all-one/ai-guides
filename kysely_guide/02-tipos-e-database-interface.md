# Tipos e interface `Database`

> Kysely só consegue type-safety porque conhece o formato do banco via uma
> interface `Database` que mapeia **nome da tabela → interface da tabela**.

## 1. Estrutura básica

```ts
export interface Database {
  person: PersonTable
  pet: PetTable
}
```

- As chaves são os nomes **exatamente como no banco**.
- Os valores são interfaces descrevendo as colunas.
- Interfaces de tabela (`PersonTable`) devem ser usadas **apenas** dentro de
  `Database`, nunca como tipo de resultado de query. Para isso use os wrappers.

## 2. Tipos de coluna

```ts
import { ColumnType, Generated, JSONColumnType } from 'kysely'

export interface PersonTable {
  // Gerado pelo banco: opcional em inserts e updates.
  id: Generated<number>

  // Tipo simples.
  first_name: string

  // Anulável: use `| null`, NÃO use `?`.
  last_name: string | null

  // Tipos diferentes por operação: select / insert / update.
  created_at: ColumnType<Date, string | undefined, never>

  // Coluna JSON: atalho para ColumnType<T, string, string>.
  metadata: JSONColumnType<{
    login_at: string
    ip: string | null
    plan: 'free' | 'premium'
  }>

  // Union literal para enums.
  gender: 'man' | 'woman' | 'other'
}
```

Regras:

| Situação | Como tipar |
|----------|-----------|
| Coluna gerada (serial, identity, default) | `Generated<T>` |
| Tipo por operação | `ColumnType<Select, Insert, Update>` |
| Coluna JSON/JSONB | `JSONColumnType<T>` |
| Coluna anulável | `T \| null` (nunca `?:`) |
| Valor imutável | `Update` = `never`, `Insert` = `never` |
| Valor sempre com default no insert | `Insert` = `T \| undefined` |

`ColumnType<SelectType, InsertType, UpdateType>`:

```ts
created_at: ColumnType<Date, string | undefined, never>
// SELECT  → Date
// INSERT  → string | undefined (opcional)
// UPDATE  → nunca atualizável
```

`JSONColumnType<T>` equivale a `ColumnType<T, string, string>`: no select vem o
objeto parseado, no insert/update você passa a string.

## 3. Wrappers `Selectable` / `Insertable` / `Updateable`

```ts
import { Insertable, Selectable, Updateable } from 'kysely'

export type Person = Selectable<PersonTable>
export type NewPerson = Insertable<PersonTable>
export type PersonUpdate = Updateable<PersonTable>
```

- `Selectable` — linha como o banco retorna (colunas `Generated` e com default
  já resolvidas, não opcionais).
- `Insertable` — o que você pode passar em `insertInto().values(...)` (colunas
  geradas opcionais).
- `Updateable` — o que você pode passar em `updateTable().set(...)`.

Na maioria das vezes confie na inferência; use os wrappers para tipar
parâmetros de funções de repositório.

## 4. Tipos TS não afetam runtime

TypeScript é compilação apenas. Se você declarar `string` mas o driver retornar
`number`, o runtime continuará `number`. É **sua responsabilidade** alinhar os
tipos ao que o driver devolve.

- Kysely nunca toca nos valores retornados pelo driver (exceto nomes de coluna
  quando usa `CamelCasePlugin`).
- Plugins como `ParseJSONResultsPlugin` alteram o runtime de JSON.

## 5. Configurar tipos runtime do driver

### PostgreSQL (`pg` + `pg-types`)

`pg` retorna `bigint`/`numeric` como string por padrão. Para converter `int8`:

```ts
import * as pg from 'pg'

const int8TypeId = 20
pg.types.setTypeParser(int8TypeId, (val) => parseInt(val, 10))
```

Tipado como `number` na interface.

### MySQL (`mysql2` + `typeCast`)

```ts
import { createPool } from 'mysql2'

export const db = new Kysely<Database>({
  dialect: new MysqlDialect({
    pool: createPool({
      ...config,
      typeCast(field, next) {
        if (field.type === 'TINY' && field.length === 1) {
          return field.string() === '1' // tinyint(1) → boolean
        }
        return next()
      },
    }),
  }),
})
```

## 6. Geração automática de tipos (codegen)

Para apps de produção, gere a `Database` a partir do schema em vez de escrever
à mão. Ferramentas recomendadas (não fazem parte do core):

| Ferramenta | Fonte | Dialects |
|-----------|-------|----------|
| [kysely-codegen](https://github.com/RobinBlomberg/kysely-codegen) | introspecção do banco | todos os embutidos |
| [prisma-kysely](https://github.com/valtyr/prisma-kysely) | schema Prisma | — |
| [kanel-kysely](https://github.com/kristiandupont/kanel) | introspecção (PostgreSQL) | PostgreSQL |
| [kysely-schema-generator](https://github.com/deanc/kysely-schema-generator) | introspecção | MySQL |

```bash
npx kysely-codegen --dialect postgres --url "$DATABASE_URL" --out-file src/types.ts
```

> Nomes/ordem gerados podem diferir; revise o arquivo gerado. Se o tipo gerado
> não bater com o runtime, o problema é da lib geradora/driver, não do Kysely.

## 7. Introspecção em runtime

```ts
const tables = await db.introspection.getTables() // TableMetadata[]
```

Detalhes em `13-logging-e-introspeccao.md`.

## 8. Múltiplos schemas e `Database`

Tabelas com schema podem ser declaradas como `'schema.tabela'`:

```ts
interface Database {
  'user.user': UserTable
  'user.permission': PermissionTable
  'public.permission': PermissionTable
  pet: PetTable
}
```

Multitenant com `withSchema` em `16-integracoes-e-schemas.md`.
