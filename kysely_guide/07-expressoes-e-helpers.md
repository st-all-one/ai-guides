# Expressões e helpers reutilizáveis

> Tudo no Kysely é uma `Expression<T>`: colunas, `sql`, subqueries, funções e
> query builders. `T` é o tipo de saída da expressão. Compreender isso desbloqueia
> helpers LIMPOS, reutilizáveis e type-safe.

## 1. `Expression<T>`

`Expression<T>` tem um `T` e um método `toOperationNode()`. `ExpressionBuilder`
(GDB) é a forma idiomática de criar expressões.

```ts
import type { Expression } from 'kysely'

const expr: Expression<string> = db
  .selectFrom('pet')
  .select('pet.name') // Expression<{ name: string }> — escalar só via $asScalar()
```

## 2. Expression builder (`eb`)

Obtido via callback; o callback dá o **contexto** correto (tabelas visíveis):

```ts
const person = await db.selectFrom('person')
  .select((eb) => [
    eb.fn('upper', ['first_name']).as('upper_first_name'),
    eb.selectFrom('pet').select('name')
      .whereRef('pet.owner_id', '=', 'person.id').limit(1).as('pet_name'),
    eb('first_name', '=', 'Jennifer').as('is_jennifer'),
    eb.val('Some value').as('string_value'),
    eb.lit(42).as('literal_value'),
  ])
  .where(({ and, or, eb, not, exists, selectFrom }) =>
    or([
      and([eb('first_name', '=', firstName), eb('last_name', '=', lastName)]),
      not(exists(
        selectFrom('pet').select('pet.id')
          .whereRef('pet.owner_id', '=', 'person.id')
          .where('pet.species', 'in', ['dog', 'cat'])
      )),
    ])
  )
  .executeTakeFirstOrThrow()
```

SQL gerado:

```sql
select
  upper("first_name") as "upper_first_name",
  (select "name" from "pet" where "pet"."owner_id" = "person"."id" limit 1) as "pet_name",
  "first_name" = $1 as "is_jennifer",
  $2 as "string_value",
  42 as "literal_value"
from "person"
where (
  ("first_name" = $3 and "last_name" = $4)
  or not exists (
    select "pet.id" from "pet"
    where "pet"."owner_id" = "person"."id" and "pet"."species" in ($5, $6)
  )
)
```

### `expressionBuilder` global

```ts
import { expressionBuilder } from 'kysely'

const eb1 = expressionBuilder<DB>()            // sem tabelas no contexto
const eb2 = expressionBuilder<DB, 'person'>()  // pode referenciar colunas de person
const eb3 = expressionBuilder<DB, 'person' | 'pet'>()

// contexto inferido de um query builder existente
const eb = expressionBuilder(qb)
```

> Em helpers, prefira `expressionBuilder<DB>()` (sem contexto) e passe as
> dependências como argumentos, para não assumir o contexto de quem chama.

## 3. `sql` template tag

### Valores vs refs

```ts
import { sql } from 'kysely'

// Interpolação vira PARÂMETRO (seguro contra injeção)
sql`upper(last_name)`                         // texto puro
sql`upper(${ref('last_name')})`               // ref tipada
sql<string>`concat(first_name, ' ', ${name})` // name vira parâmetro

// helper global `ref` quando não há `eb`
import { sql } from 'kysely'
sql<string>`upper(${sql.ref('last_name')})`
```

- `${expr}` dentro do tag vira parâmetro por padrão.
- Use `.ref()` / `sql.ref()` para interpolar **identificadores/colunas**.
- Use `sql.val()` para forçar valor.
- Use `sql.table()` para nomes de tabela.
- Use `sql.id()` para um identificador.
- Use `sql.lit()` para literal inline.
- Use `sql.join(arr, sep)` para juntar expressões.
- Use `sql.raw('...')` para texto cru (cuidado — sem parametrização).

### Executar SQL cru

```ts
import { sql } from 'kysely'

const result = await sql`select * from person where id = ${id}`.execute(db)

// compilar
const compiled = sql`select 1`.compile(db)
```

### Outros usos

```ts
sql`now()`                     // default em DDL
sql`truncate table ${sql.table('person')}`
sql`${sql.id('person')}.${sql.id('first_name')}`
```

## 4. Helpers de função (`fn`)

```ts
eb.fn.count<number>('pet.id')
eb.fn.countAll<number>()
eb.fn.max('age')
eb.fn.min('age')
eb.fn.sum<number>('age')
eb.fn.avg<number>('age')
eb.fn.coalesce('last_name', "''")
eb.fn.any('id')                       // PostgreSQL ANY(array)
eb.fn.jsonAgg('person')               // json_agg
eb.fn.agg<string[]>('array_agg', ['pet.name'])
eb.fn<string>('concat', [val('Ms. '), 'first_name'])
```

`fn` trata argumentos como **colunas** por padrão; use `eb.val(x)` para valores.

## 5. `ValueExpression` e retorno de helpers

- `eb.ref('col')` → referência de coluna.
- `eb.val(x)` → valor parametrizado.
- `eb.lit(x)` → literal inline.
- `eb.table('person')` → referência de tabela.

## 6. Helpers reutilizáveis

Receita: aceite `Expression<T>` e devolva `Expression<T>`.

```ts
import { Expression, sql } from 'kysely'

function upper(expr: Expression<string>) {
  return sql<string>`upper(${expr})`
}

function lower(expr: Expression<string>) {
  return sql<string>`lower(${expr})`
}

function concat(...exprs: Expression<string>[]) {
  return sql.join<string>(exprs, sql`||`)
}
```

Uso:

```ts
const persons = await db
  .selectFrom('person')
  .select(['id', 'first_name'])
  .where(({ eb, ref }) => eb(upper(ref('last_name')), '=', 'STALLONE'))
  .execute()

// composição
db.selectFrom('person')
  .select(['id', 'first_name'])
  .where(({ eb, ref, val }) =>
    eb(
      concat(lower(ref('first_name')), val(' '), upper(ref('last_name'))),
      '=',
      'sylvester STALLONE',
    )
  )
```

Em `select`, helpers precisam de `.as(...)`:

```ts
db.selectFrom('person')
  .innerJoin('pet', (join) =>
    join.on(eb => eb('person.first_name', '=', lower(eb.ref('pet.name'))))
  )
  .select(({ ref, val }) => [
    'first_name',
    concat(ref('person.first_name'), val(' '), ref('pet.name')).as('name_with_pet'),
  ])
  .orderBy(({ ref }) => lower(ref('first_name')))
```

## 7. `SqlBool` e predicados reutilizáveis

```ts
import { Expression, SqlBool } from 'kysely'

function isOlderThan(age: Expression<number>) {
  return sql<SqlBool>`age > ${age}`
}

db.selectFrom('person')
  .select(['id', 'first_name'])
  .where(({ val }) => isOlderThan(val(60)))
```

Helper com subquery e `exists`:

```ts
function hasDogNamed(name: Expression<string>, ownerId: Expression<number>) {
  const eb = expressionBuilder<DB>()
  return eb.exists(
    eb.selectFrom('pet')
      .select('pet.id')
      .where('pet.owner_id', '=', ownerId)
      .where('pet.species', '=', 'dog')
      .where('pet.name', '=', name)
  )
}

db.selectFrom('person')
  .selectAll('person')
  .where((eb) => hasDogNamed(eb.val('Doggo'), eb.ref('person.id')))
```

## 8. Cálculo + função

```ts
export function timestampToUnix(expr: Expression<Date>) {
  const eb = expressionBuilder<DB>()
  return eb(eb.fn<number>('UNIX_TIMESTAMP', [expr]), '*', 1_000)
}
```

## 9. Expressões anuláveis

Use genéricos para preservar a nulabilidade:

```ts
function toInt<T extends string | null>(expr: Expression<T>) {
  return sql<T extends null ? number | null : number>`(${expr})::integer`
}
```

## 10. Converter subquery de uma coluna para escalar

Subqueries retornam `Expression<{ name: string }>`; funções que aceitam
`Expression<string>` precisam de `$asScalar()` (só nível de tipo):

```ts
db.selectFrom('person')
  .select((eb) => [
    'id',
    upper(
      eb.selectFrom('pet')
        .select('name')
        .whereRef('person.id', '=', 'pet.owner_id')
        .limit(1)
        .$asScalar()
        .$notNull()
    ).as('pet_name'),
  ])
```

- `$asScalar()` — converte `{ x: T }` → `T` (sem efeito no SQL).
- `$notNull()` — remove `| null` do tipo (sem efeito no SQL).

## 11. Classes custom (`Expression` / `AliasedExpression`)

Quando o `sql` tag não basta, implemente a interface. Veja
`19-padroes-avancados.md` para o exemplo completo `JsonValue` + `AliasedJsonValue`.

## 12. `RawBuilder` e `AliasedRawBuilder`

O `sql` tag retorna `RawBuilder<T>` (e `.as('x')` retorna
`AliasedRawBuilder<T, A>`). Ambos implementam `Expression<T>` /
`AliasedExpression<T, A>` e podem ser passados em qualquer lugar:

```ts
import { RawBuilder, sql } from 'kysely'

function json<T>(value: T): RawBuilder<T> {
  return sql`CAST(${JSON.stringify(value)} AS JSONB)`
}

db.selectFrom('person').select([json({ someValue: 42 }).as('some_object'), 'address'])
```
