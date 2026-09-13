# SKILL: Kysely Guide

## Description
Kysely v0.29.5 — query builder SQL type-safe e com autocompletar para TypeScript. Não é ORM: constrói exatamente o SQL que você escreve. Roda em Node.js, Deno, Bun e browser. A segurança de tipos vem de uma interface `Database` que descreve tabelas e colunas.

## When to Use
- Escrever SQL tipado em TypeScript/Deno/Node com autocompletar de tabelas/colunas
- Selecionar, inserir, atualizar, deletar, fazer joins, CTEs, subqueries e merge
- Precisar de transações, savepoints, migrações e DDL
- Nestar relações via JSON (`jsonArrayFrom`/`jsonObjectFrom`) sem um ORM
- Criar helpers SQL reutilizáveis e type-safe (expression builder, `sql` tag)
- Integrar com PostgreSQL, MySQL, SQLite, MSSQL, PGlite, Supabase, Deno

## Files
| File | Covers |
|------|--------|
| `00-index.md` | Navegação, exemplo canônico (raiz), modelo mental |
| `01-quickstart.md` | Instalação, dialect, `Database`, instância, CRUD inicial |
| `02-tipos-e-database-interface.md` | `Database`, `Generated`, `ColumnType`, `Selectable`/`Insertable`/`Updateable`, codegen |
| `03-selecionando-dados.md` | `select`, `selectAll`, aliases, `fn`, `distinct`, `distinctOn` |
| `04-filtros-where.md` | `where`, operadores, `in`, `or`/`and`/`not`/`exists`, where condicional |
| `05-joins.md` | Inner/left/right/full, aliases, joins complexos, subquery join |
| `06-escrita-crud.md` | Insert, update, delete, `returning`, merge |
| `07-expressoes-e-helpers.md` | `Expression`, `expressionBuilder`, `sql`, `RawBuilder`, helpers reutilizáveis |
| `08-cte-subqueries-relacoes.md` | `with`, CTEs recursivas, `jsonArrayFrom`/`jsonObjectFrom`, relações |
| `09-transacoes.md` | `transaction().execute()`, `startTransaction`, savepoints |
| `10-migracoes.md` | Arquivos up/down, `Migrator`, `FileMigrationProvider`, CLI |
| `11-schema-ddl.md` | `db.schema`, create/alter/drop table, índices, constraints |
| `12-plugins.md` | CamelCase, DeduplicateJoins, HandleEmptyInLists, SafeNullComparison, ParseJSONResults |
| `13-logging-e-introspeccao.md` | `log`, `LogEvent`, `db.introspection.getTables()` |
| `14-tipagem-avancada.md` | `$assertType`, `$narrowType`, `$notNull`, `$asScalar`, dynamic module, classes custom |
| `15-execucao-e-runtimes.md` | `.compile()`, `executeQuery`, `InferResult`, cold/DummyDriver, Deno, browser |
| `16-integracoes-e-schemas.md` | Supabase, schemas/multitenant, `withSchema`, llms.txt |
| `17-cheatsheet.md` | Snippets prontos de todos os builders |
| `18-faq-troubleshooting.md` | Erros comuns, imutabilidade, TS2589, drivers, runtime types |
| `19-padroes-avancados.md` | Repository, helpers, extensão via `Expression`, module augmentation |

## How to Read
- Comece por `00-index.md` (exemplo canônico) e `01-quickstart.md`
- Para consultar: `03-select` → `04-where` → `05-joins` → `06-escrita`
- Para SQL cru/reutilizável: `07-expressoes-e-helpers.md`
- Para configurar engine: dialect/instância em `01`, plugins em `12`, logging em `13`
- Referência rápida: `17-cheatsheet.md`; erros: `18-faq-troubleshooting.md`

## Prerequisites
- TypeScript 5.4+ (recomendado 5.9+) com `"strict": true`
- Um driver do banco: `pg`, `mysql2`, `better-sqlite3`, `tedious`, `@electric-sql/pglite`
- `npm install kysely` ou `npm:kysely` no `deno.json`
- Kysely **não é ORM**: não há relações automáticas nem lazy loading

## Related Guides
- `ai-guides/postgres_guide/` — SQL/PostgreSQL gerado pelo Kysely
- `ai-guides/sqlite_guide/` — SQLite + `better-sqlite3`
- `ai-guides/javascript_guide/` — TS/JS moderno usado nos builders
- `ai-guides/eta_guide/` — templates usados em apps que consultam o banco
