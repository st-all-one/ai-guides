# Transações

> `Kysely.transaction()` executa um callback dentro de uma transação e faz
> commit ao retornar / rollback ao lançar.

## 1. Transação simples (recomendada)

```ts
const catto = await db.transaction().execute(async (trx) => {
  const jennifer = await trx
    .insertInto('person')
    .values({ first_name: 'Jennifer', last_name: 'Aniston', age: 40 })
    .returning('id')
    .executeTakeFirstOrThrow()

  return await trx
    .insertInto('pet')
    .values({
      owner_id: jennifer.id,
      name: 'Catto',
      species: 'cat',
      is_favorite: false,
    })
    .returningAll()
    .executeTakeFirst()
})
```

- Se o callback resolver → **COMMIT**.
- Se o callback lançar → **ROLLBACK** (a exceção propaga).

Use sempre o `trx` recebido dentro do callback, nunca o `db` externo.

## 2. Transação controlada (commit/rollback manual)

Quando você precisa decidir explicitamente:

```ts
const trx = await db.startTransaction().execute()

try {
  const jennifer = await trx
    .insertInto('person')
    .values({ first_name: 'Jennifer', last_name: 'Aniston', age: 40 })
    .returning('id')
    .executeTakeFirstOrThrow()

  const catto = await trx
    .insertInto('pet')
    .values({ owner_id: jennifer.id, name: 'Catto', species: 'cat', is_favorite: false })
    .returningAll()
    .executeTakeFirstOrThrow()

  await trx.commit().execute()
} catch (error) {
  await trx.rollback().execute()
}
```

## 3. Savepoints

```ts
const trx = await db.startTransaction().execute()

try {
  const jennifer = await trx
    .insertInto('person')
    .values({ first_name: 'Jennifer', last_name: 'Aniston', age: 40 })
    .returning('id')
    .executeTakeFirstOrThrow()

  const trxAfterJennifer = await trx.savepoint('after_jennifer').execute()

  try {
    const catto = await trxAfterJennifer
      .insertInto('pet')
      .values({ owner_id: jennifer.id, name: 'Catto', species: 'cat' })
      .returning('id')
      .executeTakeFirstOrThrow()

    await trxAfterJennifer
      .insertInto('toy')
      .values({ name: 'Bone', price: 1.99, pet_id: catto.id })
      .execute()
  } catch (error) {
    await trxAfterJennifer.rollbackToSavepoint('after_jennifer').execute()
  }

  await trxAfterJennifer.releaseSavepoint('after_jennifer').execute()

  await trx.insertInto('audit').values({ action: 'added Jennifer' }).execute()
  await trx.commit().execute()
} catch (error) {
  await trx.rollback().execute()
}
```

## 4. `withPlugin` dentro da transação

Plugins podem ser aplicados a uma transação específica:

```ts
await db.transaction().execute(async (trx) => {
  await trx.withPlugin(new DeduplicateJoinsPlugin())
    .selectFrom('person')
    // ...
    .execute()
})
```

## 5. Propriedades importantes

- O objeto `trx` é um `Transaction<DB>` — aceita todos os builders.
- Cada operação deve usar `trx`, não `db`, ou perde o escopo da transação.
- Transações aninhadas: o Kysely suporta `transaction()` dentro de `transaction()`
  via savepoint automático no PostgreSQL.
- Para queries em paralelo dentro de uma transação, cada uma pega a **mesma**
  conexão — cuidado com deadlocks e com pool de conexões.
- Use transações curtas; não faça I/O externo demorado dentro delas.

## 6. Isolamento (dialect-specific)

```ts
db.transaction().setIsolationLevel('serializable').execute(async (trx) => {
  // ...
})
```

Níveis válidos variam por banco (PostgreSQL: `read committed`, `repeatable read`,
`serializable`; MySQL: `read uncommitted`, `read committed`, `repeatable read`,
`serializable`).

## 7. Repositório transacional

Passe o `trx` como parâmetro para funções de repositório em vez de capturá-lo:

```ts
type Trx = Transaction<Database>

async function createPerson(trx: Trx, person: NewPerson) {
  return await trx.insertInto('person').values(person).returningAll().executeTakeFirstOrThrow()
}

await db.transaction().execute(async (trx) => {
  const p = await createPerson(trx, { /* ... */ })
  // ...
})
```
