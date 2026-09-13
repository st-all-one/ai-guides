# Joins

## 1. Inner join simples

```ts
const result = await db
  .selectFrom('person')
  .innerJoin('pet', 'pet.owner_id', 'person.id')
  // `select` vem DEPOIS do join para poder selecionar da tabela unida.
  .select(['person.id', 'pet.name as pet_name'])
  .execute()
```

Assinatura: `.innerJoin(tabela, colunaEsq, colunaDir)`.

## 2. Join com alias

```ts
await db.selectFrom('person')
  .innerJoin('pet as p', 'p.owner_id', 'person.id')
  .where('p.name', '=', 'Doggo')
  .selectAll()
  .execute()
```

## 3. Tipos de join

```ts
.innerJoin(...)
.leftJoin(...)
.rightJoin(...)
.fullJoin(...)
.innerJoinLateral(...)   // PostgreSQL / MySQL (lateral)
.leftJoinLateral(...)    // idem
```

## 4. Join complexo (múltiplas condições)

```ts
await db.selectFrom('person')
  .innerJoin('pet', (join) =>
    join
      .onRef('pet.owner_id', '=', 'person.id')
      .on('pet.name', '=', 'Doggo')
      .on((eb) => eb.or([
        eb('person.age', '>', 18),
        eb('person.age', '<', 100),
      ]))
  )
  .selectAll()
  .execute()
```

## 5. Join com subquery

```ts
const result = await db.selectFrom('person')
  .innerJoin(
    (eb) => eb
      .selectFrom('pet')
      .select(['owner_id as owner', 'name'])
      .where('name', '=', 'Doggo')
      .as('doggos'),
    (join) => join.onRef('doggos.owner', '=', 'person.id'),
  )
  .selectAll('doggos')
  .execute()
```

## 6. `leftJoin` com filtro no `on` (não no `where`)

Ao filtrar a tabela da direita num left join, coloque a condição no `on` para
manter o comportamento de outer join:

```ts
// ✅ a condição faz parte do join; pessoas sem pet continuam no resultado
db.selectFrom('person')
  .leftJoin('pet', (join) =>
    join.onRef('pet.owner_id', '=', 'person.id').on('pet.species', '=', 'dog')
  )
  .selectAll('person')
  .select('pet.name as dog_name')

// ❌ no where vira inner join na prática
db.selectFrom('person')
  .leftJoin('pet', 'pet.owner_id', 'person.id')
  .where('pet.species', '=', 'dog')
```

## 7. Deduplicar joins repetidos

Queries dinâmicas com `$if` podem duplicar o mesmo join:

```ts
db.selectFrom('person')
  .selectAll('person')
  .$if(withPetName, (qb) =>
    qb.innerJoin('pet', 'pet.owner_id', 'person.id').select('pet.name as pet_name')
  )
  .$if(withPetSpecies, (qb) =>
    qb.innerJoin('pet', 'pet.owner_id', 'person.id').select('pet.species as pet_species')
  )
  .where('person.id', '=', id)
```

Se ambos forem `true`, o join aparece duas vezes → erro. Soluções:

```ts
// global
const db = new Kysely<Database>({ dialect, plugins: [new DeduplicateJoinsPlugin()] })

// por query
await db
  .withPlugin(new DeduplicateJoinsPlugin())
  .selectFrom('person')
  // ...
```

> Deduplicação de joins arbitrários (subqueries aninhadas) é difícil; o plugin
> cobre os casos comuns. Veja `12-plugins.md`.

## 8. Selecionar tudo de várias tabelas

```ts
db.selectFrom('person')
  .innerJoin('pet', 'pet.owner_id', 'person.id')
  .selectAll('person')
  .selectAll('pet')
```

## 9. `whereRef` combina com joins

Dentro de um join, use `.onRef` (ou `eb.ref`) para comparar colunas:

```ts
.innerJoin('pet', (join) => join.onRef('pet.owner_id', '=', 'person.id'))
```

## 10. Exclusão de duplicatas em joins com `distinctOn`

```ts
db.selectFrom('person')
  .innerJoin('pet', 'pet.owner_id', 'person.id')
  .distinctOn('person.id')
  .selectAll('person')
  .orderBy('person.id')
  .orderBy('pet.name')
```

## 11. Ordem importa

O join precisa vir antes de qualquer `select`/`selectAll` que referencie suas
tabelas:

```ts
db.selectFrom('person')
  .innerJoin('pet', 'pet.owner_id', 'person.id')
  .select('pet.name') // ✅
```
