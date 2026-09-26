---
name: postgresql
description: >
  PostgreSQL 18.4: DDL/modeling, DML/queries, transactions and MVCC, security
  and RLS, backup/PITR, production config, server programming, indexes and
  performance, replication/HA, advanced types, extensions, internals. Load when
  designing, querying, tuning, or operating PostgreSQL.
category: databases
version: "18.4"
tags: [postgresql, sql, mvcc, rls, index, replication, backup, pitr, tuning, extensions]
license: MIT
---

# PostgreSQL 18.4

## Use When
- Designing schemas, constraints, and data types
- Writing/debugging/tuning queries (`EXPLAIN ANALYZE`)
- Transactions, isolation, locking, MVCC
- Roles, privileges, RLS, column encryption
- Backup/restore, PITR, replication, HA
- Server programming (PL/pgSQL, functions, triggers)
- Extensions and production tuning

## Core Rules
- Always parameterize queries; never string-concatenate SQL.
- Use `text` + checks over `varchar(n)`; `timestamptz` (not `timestamp`) for instants; `numeric` for money.
- Primary keys on every table; `NOT NULL` by default unless absence is meaningful.
- Index for real access patterns (B-tree default; GIN for jsonb/arrays/FTS; GiST for ranges/geo; BRIN for append-only).
- Read plans with `EXPLAIN (ANALYZE, BUFFERS)`; target index scans and low `rows`.
- Keep transactions short; avoid idle-in-transaction; never hold locks across user I/O.
- RLS + least-privilege roles for multi-tenant data.
- `VACUUM`/autovacuum healthy; monitor bloat and `pg_stat_statements`.
- PITR: base backups + WAL archiving; test restores.
- Pool connections (PgBouncer) for many clients; size `shared_buffers`/`work_mem` deliberately.
- Migrations must be backward-compatible (add nullable → backfill → enforce).

## Core Patterns
```sql
-- Schema
CREATE TABLE app.user (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL UNIQUE,
  profile    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_profile_gin ON app.user USING gin (profile jsonb_path_ops);

-- Query + plan
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, email FROM app.user
WHERE profile @> '{"role":"admin"}' LIMIT 20;

-- RLS
ALTER TABLE app.doc ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.doc
  USING (tenant_id = current_setting('app.tenant')::bigint);

-- Concurrency-safe upsert
INSERT INTO app.user (email) VALUES ($1)
ON CONFLICT (email) DO UPDATE SET updated_at = now()
RETURNING id;

-- Maintenance
VACUUM (ANALYZE, VERBOSE) app.user;
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Scope, navigation |
| `01-ddl-modelagem.md` | DDL, modeling, constraints |
| `02-dml-consultas.md` | DML, joins, CTEs, window functions |
| `03-transactions-concorrencia.md` | MVCC, isolation, locking |
| `04-seguranca-dados.md` | Privileges, RLS, encryption |
| `05-backup-pitr.md` | pg_dump/restore, base backup, WAL, PITR |
| `06-configuracao-producao.md` | postgresql.conf, memory, autovacuum |
| `07-server-programming.md` | PL/pgSQL, functions, triggers |
| `08-indices-performance.md` | Index types, EXPLAIN, tuning |
| `09-manutencao-monitoramento.md` | VACUUM, bloat, pg_stat_* |
| `10-client-security.md` | pg_hba, TLS, auth methods |
| `11-ha-replicacao.md` | Streaming/logical replication, failover |
| `12-kernel-upgrade.md` | Kernel resource and version upgrades |
| `13-funcoes-builtin.md` | Built-in functions reference |
| `14-extensoes-essenciais.md` | pg_stat_statements, pg_trgm, PostGIS, etc. |
| `15-server-programming-avancado.md` | Advanced server programming |
| `16-information-schema.md` | Catalogs and information_schema |
| `17-tipos-avancados.md` | jsonb, arrays, ranges, enums, composite |
| `18-ferramentas-diagnostico.md` | Diagnostic tooling |
| `19-internals-armazenamento.md` | Storage, pages, WAL, TOAST |
| `EXAMPLE.md` | Consolidated example |

## Read Order
`00`→`01`→`02`; transactions `03`; security `04`; performance `08`; ops `05`+`06`+`09`.

## Prereqs
SQL fundamentals; access to a PostgreSQL 18 instance.
