# Tipagem avançada

## 1. `$assertType` — resolver tipos profundos

Erro comum em queries grandes:

```
error TS2589: Type instantiation is excessively deep and possibly infinite.
```

Use `$assertType<T>()` para dizer ao TypeScript o tipo de saída. **Não reduz**
a segurança: `T` precisa ser estruturalmente igual ao tipo atual.

```ts
.with('w12', (qb) =>
  qb.selectFrom('person')
    .select('first_name as fn12')
    .$assertType<{ fn12: string }>()
)
.with('w13', (qb) =>
  qb.selectFrom('person')
    .select('first_name as fn13')
    .$assertType<{ fn13: string }>()
)
```

> `Simplify<T> = { [K in keyof T]: T[K] } & {}` só melhora a exibição no IDE; não
> remove a complexidade interna. Só `$assertType` faz isso.

Disponível também no `select` e em outros builders.

## 2. `$narrowType` — restringir o tipo de saída

Útil quando o Kysely não consegue provar que uma coluna não é nula:

```ts
import { NotNull } from 'kysely'

const persons = db
  .selectFrom('person')
  .selectAll()
  .where('last_name', 'is not', null)
  .$narrowType<{ last_name: NotNull }>()
  .execute()
```

`NotNull` marca como não-anulável. Você também pode usar `$narrowType` para
remover colunas opcionais ou fixar literais.

## 3. `$notNull()` e `$asScalar()`

```ts
// $notNull(): remove `| null` do tipo de uma expressão (sem efeito no SQL)
jsonObjectFrom(/* ... */).$notNull().as('pet')

// $asScalar(): converte Expression<{ col: T }> em Expression<T>
upper(
  eb.selectFrom('pet')
    .select('name')
    .whereRef('person.id', '=', 'pet.owner_id')
    .limit(1)
    .$asScalar()
)
```

## 4. Módulo dinâmico (`db.dynamic`)

Quando o nome de tabela/coluna só existe em runtime:

```ts
const { table, ref } = db.dynamic

const q = db
  .selectFrom(table(someTableName).as('t'))
  .selectAll()
  .where(ref(someColumn), '=', value)
```

Alternativa tipada (com genéricos, quando as opções são limitadas):

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
```

> `db.dynamic` é o escape hatch: perde a validação estática de nomes. Use com
> parcimônia.

## 5. Tipos utilitários do Kysely

```ts
import type {
  Selectable,
  Insertable,
  Updateable,
  SelectType,
  InsertType,
  UpdateType,
  InferResult,
} from 'kysely'
```

- `Selectable<T>` / `Insertable<T>` / `Updateable<T>` — wrappers de tabela.
- `SelectType<C>` / `InsertType<C>` / `UpdateType<C>` — extraem o tipo de uma
  **coluna** em cada operação.
- `InferResult<typeof q>` — tipo de resultado de um query builder ou
  `CompiledQuery` (veja `15`).

## 6. Tipar repositórios

```ts
import type { Insertable, Selectable, Updateable } from 'kysely'
import type { Database } from './types.ts'

type PersonTable = Database['person']
export type Person = Selectable<PersonTable>
export type NewPerson = Insertable<PersonTable>
export type PersonUpdate = Updateable<PersonTable>
```

## 7. `Expression<T>` e `AliasedExpression<T, A>`

Para helpers genéricos, use as interfaces:

```ts
import { Expression, SqlBool } from 'kysely'

function isOlderThan(age: Expression<number>): Expression<SqlBool> {
  return sql<SqlBool>`age > ${age}`
}
```

## 8. `RawBuilder<T>` e `AliasedRawBuilder<T, A>`

```ts
import { RawBuilder, sql } from 'kysely'

function json<T>(value: T): RawBuilder<T> {
  return sql`CAST(${JSON.stringify(value)} AS JSONB)`
}
```

`.as<A>('alias')` transforma em `AliasedRawBuilder<T, A>`, inferindo o nome e o
tipo da coluna resultante.

## 9. Classes custom

Quando precisar de comportamento de compilação próprio, implemente
`Expression<T>` (com `expressionType` e `toOperationNode()`) ou
`AliasedExpression<T, A>`. Exemplo completo em `19-padroes-avancados.md`.

## 10. Extensão via module augmentation (não suportado oficialmente)

```ts
declare module 'kysely/dist/schema/create-table-builder' {
  interface CreateTableBuilder<TB extends string, C extends string = never> {
    addIdColumn<CN extends string = 'id'>(col?: CN): CreateTableBuilder<TB, C | CN>
  }
}

CreateTableBuilder.prototype.addIdColumn = function (
  this: CreateTableBuilder<any, any>,
  col?: string,
) {
  return this.addColumn(col || 'id', 'uuid', (col) =>
    col.primaryKey().defaultTo(sql`gen_random_uuid()`)
  )
}
```

> Use com moderação: depende de caminhos internos (`kysely/dist/...`) que podem
> mudar entre versões.

## 11. `satisfies` para tipos de update/insert

```ts
await db
  .updateTable('person')
  .set({ last_name: 'Aniston' } satisfies PersonUpdate)
  .where('id', '=', 1)
  .execute()
```

Ajuda a detectar chaves inválidas em objetos grandes.
