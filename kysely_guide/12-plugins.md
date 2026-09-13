# Plugins

> Plugins implementam `KyselyPlugin` e podem transformar a query antes da
> compilação e o resultado depois da execução. São passados no construtor ou
> aplicados por query/transação com `.withPlugin()`.

## 1. Registrando plugins

```ts
import { Kysely, CamelCasePlugin, DeduplicateJoinsPlugin } from 'kysely'

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin(), new DeduplicateJoinsPlugin()],
})
```

Por query:

```ts
await db
  .withPlugin(new DeduplicateJoinsPlugin())
  .selectFrom('person')
  // ...
  .execute()
```

## 2. Plugins embutidos

### CamelCasePlugin

Converte identificadores `snake_case` do banco para `camelCase` no JavaScript.
Útil quando o schema é snake_case mas você prefere camelCase no TS.

```ts
const db = new Kysely<Database>({ dialect, plugins: [new CamelCasePlugin()] })
```

> Cuidado: se seu `Database` já usa snake_case e você adiciona esse plugin,
> os nomes mudam. Escolha um padrão e mantenha.

### DeduplicateJoinsPlugin

Remove joins idênticos duplicados em queries dinâmicas (`$if`). Detalhes em
`05-joins.md`.

### HandleEmptyInListsPlugin

Lida com `in ()` / `not in ()` quando a lista é vazia, evitando erro de sintaxe.
Estratégia configurável:

```ts
new HandleEmptyInListsPlugin({ emptyInLists: 'return-no-rows' })
```

### SafeNullComparisonPlugin

Converte `=`, `!=` e `<>` para `is` / `is not` quando o lado direito é `null`.

```ts
new SafeNullComparisonPlugin()
```

### ParseJSONResultsPlugin

Parseia colunas JSON retornadas como string (útil em SQLite e alguns drivers que
não parseiam automaticamente). Detalhes em `08-cte-subqueries-relacoes.md`.

## 3. Criando um plugin custom

```ts
import {
  IdentifierNode,
  KyselyPlugin,
  OperationNodeTransformer,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryId,
  QueryResult,
  RootOperationNode,
  UnknownRow,
} from 'kysely'

class MyTransformer extends OperationNodeTransformer {
  protected override transformIdentifier(
    node: IdentifierNode,
    queryId: QueryId,
  ): IdentifierNode {
    return super.transformIdentifier(node, queryId)
    // ou transforme o nó aqui
  }
}

class MyPlugin implements KyselyPlugin {
  readonly #transformer = new MyTransformer()

  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    return this.#transformer.transformNode(args.node, args.queryId)
  }

  transformResult(
    args: PluginTransformResultArgs,
  ): Promise<QueryResult<UnknownRow>> {
    return Promise.resolve(args.result)
  }
}
```

### Interfaces

```ts
interface KyselyPlugin {
  transformQuery(args: PluginTransformQueryArgs): RootOperationNode
  transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>>
}

interface PluginTransformQueryArgs {
  readonly node: RootOperationNode
  readonly queryId: QueryId
}

interface PluginTransformResultArgs {
  readonly result: QueryResult<UnknownRow>
  readonly queryId: QueryId
}
```

## 4. Ordem de execução

1. `transformQuery` de cada plugin (na ordem do array) — modifica a AST.
2. Compilação para SQL.
3. Execução no banco.
4. `transformResult` de cada plugin — modifica as linhas.

## 5. Boas práticas

- Prefira `OperationNodeTransformer` a manipular nós manualmente.
- Plugins devem ser puros e não podem executar queries (o pool pode estar
  esgotado durante a execução).
- Para transformações de nome simples, prefira `CamelCasePlugin` a escrever o
  seu.
- Um plugin global afeta todas as queries — use `.withPlugin()` quando o efeito
  deve ser pontual.
