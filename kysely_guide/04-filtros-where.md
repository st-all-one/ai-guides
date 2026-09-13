# Filtros (`where`)

> `where`, `having`, `on` e outros filtros são **aditivos e imutáveis**:
> concatenam-se com `AND` e cada chamada retorna um novo builder.

## 1. Simples

```ts
const person = await db
  .selectFrom('person')
  .selectAll()
  .where('first_name', '=', 'Jennifer')
  .where('age', '>', 40)
  .executeTakeFirst()
```

Assinatura: `.where(coluna, operador, valor)`.

## 2. Operadores suportados

```
=   ==   !=   <>   >   >=   <   <=
in   not in
is   is not
like   not like   ilike   not ilike
between   not between
@>   <@   &&   ?   ?|   ?&   (operadores de JSON/array — dialect-specific)
```

`is` / `is not` para `null` e booleanos:

```ts
.where('last_name', 'is', null)
.where('active', 'is', true)
```

> Se preferir segurança automática contra `= null`, use
> `SafeNullComparisonPlugin` (`12-plugins.md`).

## 3. `where in`

```ts
const persons = await db
  .selectFrom('person')
  .selectAll()
  .where('id', 'in', [1, 2, 3])
  .execute()
```

Subquery:

```ts
.where('person.id', 'in', (eb) =>
  eb.selectFrom('pet').select('pet.owner_id').where('pet.species', '=', 'dog')
)
```

> Listas vazias com `in ()` são erro em vários bancos. Use
> `HandleEmptyInListsPlugin` (`12-plugins.md`).

## 4. Objeto de filtro (`eb.and` com objeto)

```ts
const persons = await db
  .selectFrom('person')
  .selectAll()
  .where((eb) => eb.and({
    first_name: 'Jennifer',
    last_name: eb.ref('first_name'), // valor pode ser expressão
  }))
  .execute()
```

Valores `null` viram `is null`, `undefined` são ignorados.

## 5. `or`, `and`, `not`, `exists`

```ts
const firstName = 'Jennifer'
const maxAge = 60

const persons = await db
  .selectFrom('person')
  .selectAll('person')
  .where(({ eb, or, and, not, exists, selectFrom }) => and([
    or([
      eb('first_name', '=', firstName),
      eb('age', '<', maxAge),
    ]),
    not(exists(
      selectFrom('pet')
        .select('pet.id')
        .whereRef('pet.owner_id', '=', 'person.id')
    )),
  ]))
  .execute()
```

`or` também pode ser encadeado sobre a própria expressão:

```ts
.where((eb) =>
  eb('last_name', '=', 'Aniston').or('last_name', '=', 'Stallone')
)
```

## 6. `whereRef` — comparar colunas entre si

```ts
.whereRef('person.id', '=', 'pet.owner_id')
.whereRef('pet.owner_id', '=', 'person.id')
```

Use `whereRef` quando o lado direito é **coluna**; `where` trata como **valor**
(parâmetro).

## 7. `where` condicional (filtros opcionais)

A forma imperativa clássica — lembre-se da imutabilidade (reatribua):

```ts
import type { Expression, SqlBool } from 'kysely'

const firstName: string | undefined = 'Jennifer'
const under18 = true
const over60 = true

let query = db.selectFrom('person').selectAll()

if (firstName) {
  query = query.where('first_name', '=', firstName)
}

if (under18 || over60) {
  query = query.where((eb) => {
    const ors: Expression<SqlBool>[] = []
    if (under18) ors.push(eb('age', '<', 18))
    if (over60) ors.push(eb('age', '>', 60))
    return eb.or(ors)
  })
}

const persons = await query.execute()
```

Forma funcional (útil para compor expressões de qualquer complexidade):

```ts
const persons = await db
  .selectFrom('person')
  .selectAll()
  .where((eb) => {
    const filters: Expression<SqlBool>[] = []
    if (firstName) filters.push(eb('first_name', '=', firstName))
    if (lastName) filters.push(eb('last_name', '=', lastName))
    return eb.and(filters)
  })
  .execute()
```

## 8. `where` dinâmico com `$if`

Para filtros que não mudam o tipo do builder, reatribuição imperativa basta.
`$if` é conveniente para encadear:

```ts
const query = db
  .selectFrom('person')
  .selectAll()
  .$if(withLastName, (qb) => qb.where('last_name', 'is not', null))
```

## 9. `having`

```ts
const counts = await db
  .selectFrom('person')
  .innerJoin('pet', 'pet.owner_id', 'person.id')
  .select((eb) => ['person.id', eb.fn.count('pet.id').as('pet_count')])
  .groupBy('person.id')
  .having((eb) => eb.fn.count('pet.id'), '>', 10)
  .having('person.id', 'in', [1, 2, 3])
  .execute()
```

## 10. `on` dentro de joins

```ts
db.selectFrom('person')
  .innerJoin('pet', (join) =>
    join
      .onRef('pet.owner_id', '=', 'person.id')
      .on('pet.name', '=', 'Doggo')
      .on((eb) => eb.or([
        eb('person.age', '>', 18),
        eb('person.age', '<', 100),
      ]))
  )
```

Detalhes em `05-joins.md`.

## 11. Valores e referências dentro de expressões

```ts
.where(({ eb, ref, val }) => eb(
  eb.fn('upper', [ref('last_name')]),
  '=',
  val('STALLONE')
))
```

- `eb.ref('col')` → coluna.
- `eb.val(x)` → parâmetro.
- `eb.lit(x)` → literal inline.

## 12. `where` em colunas JSON/array

```ts
.where(sql<boolean>`metadata->>'plan'`, '=', 'premium')
.where(sql<boolean>`tags`, '@>', ['typescript'])
```

Prefira helpers tipados (`07`) em vez de SQL cru repetido.

## 13. Armadilha: `= null` vs `is null`

```ts
// ❌ gera `where "last_name" = $1` com null — nunca casa no SQL
.where('last_name', '=', null)

// ✅
.where('last_name', 'is', null)
```

`SafeNullComparisonPlugin` converte automaticamente `= null`/`!= null`.
