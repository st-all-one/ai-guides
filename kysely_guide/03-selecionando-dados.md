# Selecionando dados (`select`)

> Ponto de partida: `db.selectFrom('person').selectAll().execute()`.

## 1. Uma coluna

```ts
const persons = await db
  .selectFrom('person')
  .select('id')
  .where('first_name', '=', 'Arnold')
  .execute()
// { id: number }[]
```

## 2. Coluna com tabela (evita ambiguidade em joins)

```ts
const persons = await db
  .selectFrom(['person', 'pet'])
  .select('person.id')
  .execute()
```

## 3. Múltiplas colunas

```ts
const persons = await db
  .selectFrom('person')
  .select(['person.id', 'first_name'])
  .execute()
```

## 4. Aliases

```ts
const persons = await db
  .selectFrom('person as p')
  .select(['first_name as fn', 'p.last_name as ln'])
  .execute()
// { fn: string, ln: string | null }[]
```

Alias dentro de `select` é inferido no tipo de retorno. O alias de tabela
(`as p`) deve vir na string do `selectFrom`/`join`.

## 5. Todas as colunas

```ts
// toda a query (todas as tabelas em contexto)
const all = await db.selectFrom('person').selectAll().execute()

// apenas de uma tabela
const persons = await db.selectFrom('person').selectAll('person').execute()
```

## 6. Seleções complexas (subquery, expressão, valor, literal)

```ts
import { sql } from 'kysely'

const persons = await db.selectFrom('person')
  .select(({ eb, selectFrom, or, val, lit }) => [
    // Subquery correlacionada
    selectFrom('pet')
      .whereRef('person.id', '=', 'pet.owner_id')
      .select('pet.name')
      .orderBy('pet.name')
      .limit(1)
      .as('first_pet_name'),

    // Expressão booleana
    or([
      eb('first_name', '=', 'Jennifer'),
      eb('first_name', '=', 'Arnold'),
    ]).as('is_jennifer_or_arnold'),

    // SQL cru
    sql<string>`concat(first_name, ' ', last_name)`.as('full_name'),

    // Valor estático (vira parâmetro)
    val('Some value').as('string_value'),

    // Literal inline (não vira parâmetro)
    lit(42).as('literal_value'),
  ])
  .execute()
```

> Em `select`, todo item precisa de `.as(nome)` — exceto strings de coluna.

## 7. Funções (`fn`)

```ts
import { sql } from 'kysely'

const result = await db.selectFrom('person')
  .innerJoin('pet', 'pet.owner_id', 'person.id')
  .select(({ fn, val, ref }) => [
    'person.id',

    // funções comuns
    fn.count<number>('pet.id').as('pet_count'),

    // qualquer função; argumentos são colunas por padrão
    fn<string>('concat', [
      val('Ms. '),
      'first_name',
      val(' '),
      'last_name',
    ]).as('full_name_with_title'),

    // funções de agregação
    fn.agg<string[]>('array_agg', ['pet.name']).as('pet_names'),

    // SQL cru com refs
    sql<string>`concat(${ref('first_name')}, ' ', ${ref('last_name')})`.as('full_name'),
  ])
  .groupBy('person.id')
  .having((eb) => eb.fn.count('pet.id'), '>', 10)
  .execute()
```

Atalhos úteis: `eb.fn.count`, `eb.fn.countAll`, `eb.fn.max`, `eb.fn.min`,
`eb.fn.sum`, `eb.fn.avg`, `eb.fn.coalesce`, `eb.fn.any`, `eb.fn.jsonAgg`, etc.
Veja `07-expressoes-e-helpers.md`.

## 8. `distinct` e `distinct on`

```ts
const persons = await db
  .selectFrom('person')
  .select('first_name')
  .distinct()
  .execute()
```

```ts
// distintOn (sintaxe PostgreSQL)
const persons = await db.selectFrom('person')
  .innerJoin('pet', 'pet.owner_id', 'person.id')
  .where('pet.name', '=', 'Doggo')
  .distinctOn('person.id')
  .selectAll('person')
  .execute()
```

## 9. Ordenação, limite e offset

```ts
const latest = await db
  .selectFrom('person')
  .selectAll()
  .orderBy('created_at', 'desc')
  .limit(20)
  .offset(40)
  .execute()
```

`orderBy` aceita expressão e direção; `nulls first/last`:

```ts
.orderBy('last_name', 'asc nulls last')
```

## 10. Agrupamento

```ts
const counts = await db
  .selectFrom('person')
  .innerJoin('pet', 'pet.owner_id', 'person.id')
  .select((eb) => ['person.id', eb.fn.count('pet.id').as('pet_count')])
  .groupBy('person.id')
  .having((eb) => eb.fn.count('pet.id'), '>', 1)
  .execute()
```

## 11. Relações aninhadas (JSON)

```ts
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres'

const result = await db.selectFrom('person')
  .select((eb) => [
    'id',
    jsonArrayFrom(
      eb.selectFrom('pet')
        .select(['pet.id as pet_id', 'pet.name'])
        .whereRef('pet.owner_id', '=', 'person.id')
        .orderBy('pet.name')
    ).as('pets'),
    jsonObjectFrom(
      eb.selectFrom('pet')
        .select(['pet.id as pet_id', 'pet.name'])
        .whereRef('pet.owner_id', '=', 'person.id')
        .where('pet.is_favorite', '=', true)
    ).as('favorite_pet'),
  ])
  .execute()
```

Detalhes e helpers para MySQL/SQLite em `08-cte-subqueries-relacoes.md`.

## 12. Método `.$if` para seleções condicionais

```ts
const person = await db
  .selectFrom('person')
  .select('first_name')
  .$if(withLastName, (qb) => qb.select('last_name'))
  .where('id', '=', id)
  .executeTakeFirstOrThrow()
// tipo: { first_name: string; last_name?: string }
```

Detalhes de condicional (incluindo limitações de tipo) em
`18-faq-troubleshooting.md` e `14-tipagem-avancada.md`.

## 13. Métodos de execução

| Método | Retorno |
|--------|---------|
| `.execute()` | `T[]` |
| `.executeTakeFirst()` | `T \| undefined` |
| `.executeTakeFirstOrThrow()` | `T` (lança se vazio) |
| `.compile()` | `CompiledQuery` (SQL + parâmetros) |
| `.stream(chunkSize)` | AsyncIterable de chunks |
| `.executeQuery(compiled)` | `QueryResult` a partir de compiled |

## 14. Dinâmico: tabela/coluna em runtime

Quando o nome não é conhecido em tempo de compilação (ex.: busca genérica):

```ts
import type { SelectType } from 'kysely'

async function getRowByColumn<
  T extends keyof Database,
  C extends keyof Database[T] & string,
  V extends SelectType<Database[T][C]>,
>(t: T, c: C, v: V) {
  const { table, ref } = db.dynamic
  return await db
    .selectFrom(table(t).as('t'))
    .selectAll()
    .where(ref(c), '=', v)
    .orderBy('t.id')
    .executeTakeFirstOrThrow()
}

const person = await getRowByColumn('person', 'first_name', 'Arnold')
```

O `db.dynamic` existe justamente porque o nome não é literal. Prefira o modo
estático sempre que possível.

## 15. `executeTakeFirstOrThrow` vs `executeTakeFirst`

```ts
// Pode ser undefined
const maybe = await db.selectFrom('person').selectAll().where('id', '=', id).executeTakeFirst()

// Lança se não encontrar
const must = await db.selectFrom('person').selectAll().where('id', '=', id).executeTakeFirstOrThrow()
```
