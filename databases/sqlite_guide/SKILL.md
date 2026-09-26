---
name: sqlite
description: >
  SQLite 3.53.0: compilation, C API, DDL/type affinity, queries, security,
  transactions/WAL, performance, maintenance, extensions/VFS, FTS5, migration.
  Load when working with embedded databases, optimizing queries, or integrating
  SQLite via C.
category: databases
version: "3.53.0"
tags: [sqlite, embedded, c-api, wal, fts5, extensions, vfs, performance, migration]
license: MIT
---

# SQLite 3.53.0

## Use When
- Embedded/local storage in an app, CLI, or edge runtime
- Compiling SQLite or tuning build flags
- Using the C API (or a wrapper) correctly
- Transactions, WAL, concurrency, backups
- FTS5 full-text search
- Performance, maintenance, or migration

## Core Rules
- Enable WAL in concurrent apps: `PRAGMA journal_mode=WAL;`.
- Set `PRAGMA foreign_keys=ON;` per connection (off by default).
- Use one writer; many readers. Serialize writes; keep transactions short.
- Always use `sqlite3_prepare_v2` + bound parameters; never build SQL by concatenation.
- Check every `sqlite3_*` return code; free statements with `sqlite3_finalize`.
- Prefer `STRICT` tables (3.37+) for real type enforcement; SQLite uses type affinity otherwise.
- Add indexes for real query patterns; verify with `EXPLAIN QUERY PLAN`.
- Use `busy_timeout`; handle `SQLITE_BUSY` with retry/backoff.
- Back up with the Online Backup API or `VACUUM INTO`, not by copying a live WAL DB.
- Run `PRAGMA optimize;` and `ANALYZE` periodically; `VACUUM` to compact.
- Load extensions explicitly (`sqlite3_enable_load_extension` gated).

## Core Patterns
```c
sqlite3 *db; sqlite3_open_v2(path, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, NULL);
sqlite3_exec(db, "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;", 0,0,0);

sqlite3_stmt *st;
sqlite3_prepare_v2(db, "SELECT id, name FROM user WHERE email = ?1", -1, &st, NULL);
sqlite3_bind_text(st, 1, email, -1, SQLITE_TRANSIENT);
while (sqlite3_step(st) == SQLITE_ROW) { int64_t id = sqlite3_column_int64(st, 0); /* ... */ }
sqlite3_finalize(st);
sqlite3_close(db);
```

```sql
CREATE TABLE user (
  id    INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL
) STRICT;

CREATE VIRTUAL TABLE doc_fts USING fts5(title, body, content='doc', content_rowid='id');
EXPLAIN QUERY PLAN SELECT id FROM user WHERE email = 'a@b.c';
PRAGMA optimize;
```

## File Map
| File | Content |
|---|---|
| `01-intro.md` | Overview, architecture, use cases, CLI |
| `02-compilacao.md` | Source/amalgamation, build flags |
| `03-api-c.md` | open/prepare/step/finalize, bind, errors |
| `04-ddl-datatypes.md` | DDL, type affinity, constraints, indexes |
| `05-queries-otimizacao.md` | Queries, EXPLAIN QUERY PLAN, tuning |
| `06-seguranca.md` | Injection, extensions, permissions |
| `07-transacoes-wal.md` | Transactions, WAL, locking |
| `08-performance.md` | PRAGMAs, indexes, cache, profiling |
| `09-manutencao.md` | VACUUM, ANALYZE, integrity, backup |
| `10-extensoes-vfs.md` | Extensions and VFS |
| `11-fts5.md` | Full-text search with FTS5 |
| `12-migracao.md` | Schema/data migration |

## Read Order
`01`→`04`→`05`; C integration `03`; concurrency `07`; performance `08`.

## Prereqs
SQL basics; C for the C API chapters.
