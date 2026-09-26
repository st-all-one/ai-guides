# Logging e introspecção

## 1. Logging via array de níveis

```ts
const db = new Kysely({
  // ...
  log: ['query', 'error'],
})
```

- `'query'` — loga todas as queries executadas (sem valores de parâmetros).
- `'error'` — loga todos os erros.

## 2. Logging com função custom

```ts
const db = new Kysely({
  dialect: new PostgresDialect(postgresConfig),
  log(event) {
    if (event.level === 'error') {
      console.error('Query failed : ', {
        durationMs: event.queryDurationMillis,
        error: event.error,
        sql: event.query.sql,
        params: event.query.parameters.map(maskPII),
      })
    } else {
      console.log('Query executed : ', {
        durationMs: event.queryDurationMillis,
        sql: event.query.sql,
        params: event.query.parameters.map(maskPII),
      })
    }
  },
})
```

### Interface `LogEvent`

```ts
interface LogEvent {
  level: 'query' | 'error'
  query: CompiledQuery // SQL, parâmetros e a AST original
  queryDurationMillis: number // tempo de execução
  error: unknown // presente apenas quando level === 'error'
}
```

`event.query.parameters` contém os valores — **mascare PII** antes de logar.

## 3. Integração com logger externo

```ts
import { pino } from 'pino'
const logger = pino()

const db = new Kysely<Database>({
  dialect,
  log(event) {
    logger.info(
      {
        durationMs: event.queryDurationMillis,
        sql: event.query.sql,
        params: event.query.parameters,
      },
      'kysely query',
    )
  },
})
```

## 4. Introspecção de metadata

Extraia tabelas/views do schema em runtime:

```ts
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
const { Pool } = pg

const db = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
})

const tables = await db.introspection.getTables() // TableMetadata[]
console.log({ tables })
```

`TableMetadata` inclui nome, tipo (table/view), colunas, schema, etc. Útil para
codegen, admin e ferramentas internas.

## 5. Hooks de query

Para observabilidade mais fina (tracing, métricas), combine:

- `log` para eventos de log;
- um `KyselyPlugin` custom (`12`) para inspecionar/transformar a AST;
- wrappers de repositório para medir latência de negócio.

## 6. Boas práticas

- Em produção, nunca logue parâmetros sensíveis em texto puro.
- `'query'` em dev é ótimo; em produção prefira apenas queries lentas/erros.
- Use o `queryDurationMillis` para identificar queries problemáticas.
- `db.introspection` requer conexão ativa e permissões de leitura do catálogo.
- Veja `KyselyConfig` na API oficial para a lista completa de opções.
