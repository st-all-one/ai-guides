# CTEs, subqueries e relações

## 1. CTE básica (`with`)

```ts
const result = await db
  // CTE `jennifers`
  .with('jennifers', (db) =>
    db.selectFrom('person')
      .where('first_name', '=', 'Jennifer')
      .select(['id', 'age'])
  )
  // CTE que referencia outra CTE — use a variante callback
  .with('adult_jennifers', (db) =>
    db.selectFrom('jennifers').where('age', '>', 18).select(['id', 'age'])
  )
  .selectFrom('adult_jennifers')
  .where('age', '<', 60)
  .selectAll()
  .execute()
```

Também é possível passar o query builder diretamente (sem callback):

```ts
.with('jennifers', db.selectFrom('person').where('first_name', '=', 'Jennifer').select(['id', 'age']))
```

## 2. CTEs DML (insert/update/delete)

```ts
const result = await db
  .with('new_person', (db) =>
    db.insertInto('person')
      .values({ first_name: 'Jennifer', age: 35 })
      .returning('id')
  )
  .with('new_pet', (db) =>
    db.insertInto('pet')
      .values({
        name: 'Doggo',
        species: 'dog',
        is_favorite: true,
        owner_id: db.selectFrom('new_person').select('id'),
      })
      .returning('id')
  )
  .selectFrom(['new_person', 'new_pet'])
  .select(['new_person.id as person_id', 'new_pet.id as pet_id'])
  .execute()
```

## 3. CTE recursiva

```ts
db.withRecursive('tree', (db) =>
  db.selectFrom('person as p')
    .where('p.id', '=', rootId)
    .select(['p.id', 'p.mother_id'])
    .unionAll((db) =>
      db.selectFrom('person as child')
        .innerJoin('tree', 'tree.id', 'child.mother_id')
        .select(['child.id', 'child.mother_id'])
    )
)
.selectFrom('tree')
.selectAll()
.execute()
```

> O nome e a sintaxe seguem o suporte do dialect. `union`/`unionAll`/`intersect`/
> `except` também estão disponíveis para set operations.

## 4. Subqueries

### Em `select`

```ts
db.selectFrom('person')
  .select((eb) => [
    'id',
    eb.selectFrom('pet')
      .select('pet.name')
      .whereRef('pet.owner_id', '=', 'person.id')
      .orderBy('pet.name')
      .limit(1)
      .as('first_pet_name'),
  ])
```

### Em `where`

```ts
db.selectFrom('person')
  .selectAll()
  .where('person.id', 'in', (eb) =>
    eb.selectFrom('pet').select('pet.owner_id').where('pet.species', '=', 'dog')
  )
```

### Como tabela (derived table) com join

```ts
db.selectFrom('person')
  .innerJoin(
    (eb) => eb.selectFrom('pet')
      .select(['owner_id as owner', 'name'])
      .where('name', '=', 'Doggo')
      .as('doggos'),
    (join) => join.onRef('doggos.owner', '=', 'person.id'),
  )
  .selectAll('doggos')
```

## 5. Relações sem ORM — JSON

Kysely **não é ORM** e não tem o conceito de relação. Você aninha linhas usando
os tipos/ funções JSON do banco.

### Helpers prontos

```ts
// PostgreSQL
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres'
// MySQL
// import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/mysql'
// SQLite
// import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/sqlite'
// MSSQL
// import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/mssql'
```

```ts
const persons = await db
  .selectFrom('person')
  .selectAll('person')
  .select((eb) => [
    jsonArrayFrom(
      eb.selectFrom('pet')
        .select(['pet.id', 'pet.name'])
        .whereRef('pet.owner_id', '=', 'person.id')
        .orderBy('pet.name')
    ).as('pets'),

    jsonObjectFrom(
      eb.selectFrom('person as mother')
        .select(['mother.id', 'mother.first_name'])
        .whereRef('mother.id', '=', 'person.mother_id')
    ).as('mother'),
  ])
  .execute()

console.log(persons[0].pets[0].name)
console.log(persons[0].mother?.first_name)
```

### Implementação dos helpers (referência)

```ts
import { Expression, Simplify, sql } from 'kysely'

function jsonArrayFrom<O>(expr: Expression<O>) {
  return sql<Simplify<O>[]>`(select coalesce(json_agg(agg), '[]') from ${expr} as agg)`
}

function jsonObjectFrom<O>(expr: Expression<O>) {
  return sql<Simplify<O>>`(select to_json(obj) from ${expr} as obj)`
}
```

> Os helpers variam por dialect (PostgreSQL usa `json_agg`/`to_json`; MySQL e
> SQLite têm variações próprias). Use sempre o import do dialect correto.

### Relação não-anulável

Kysely pode marcar a seleção como anulável. Se a relação sempre existe, force:

```ts
jsonObjectFrom(
  eb.selectFrom('person as mother')
    .select(['mother.id', 'mother.first_name'])
    .whereRef('mother.id', '=', 'person.mother_id')
).$notNull().as('mother')
```

Alternativa via `$narrowType`:

```ts
.$narrowType<{ mother: NotNull }>()
```

### Seleção condicional de relações

```ts
const persons = await db
  .selectFrom('person')
  .selectAll('person')
  .$if(includePets, (qb) =>
    qb.select((eb) =>
      jsonArrayFrom(
        eb.selectFrom('pet')
          .select(['pet.id', 'pet.name'])
          .whereRef('pet.owner_id', '=', 'person.id')
      ).as('pets')
    )
  )
  .execute()
```

## 6. Parsing de JSON

Drivers como `pg` e `mysql2` parseiam colunas JSON automaticamente. `SqliteDialect`
e alguns dialects de terceiros **não**. Se as colunas voltarem como string:

```ts
import { ParseJSONResultsPlugin } from 'kysely'

const db = new Kysely<DB>({
  // ...
  plugins: [new ParseJSONResultsPlugin()],
})
```

## 7. Boas práticas

- Use índices em `owner_id`/`mother_id` para os `whereRef` das subqueries JSON.
- Prefira `jsonArrayFrom`/`jsonObjectFrom` a montar SQL manual.
- Relações muito profundas geram tipos pesados; considere `$assertType`
  (`14-tipagem-avancada.md`).
