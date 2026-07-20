# SKILL: SQLite

## Description
Complete SQLite guide covering compilation, C API, DDL, queries, optimization, security, transactions, WAL, performance, maintenance, extensions, VFS, FTS5, and migration.

## When to Use
- Working with embedded SQL databases
- Learning SQLite internals and C API
- Optimizing SQLite queries and performance
- Implementing FTS5 full-text search
- Managing SQLite maintenance, WAL, and migrations

## Files

| File | Covers |
|------|--------|
| 01-intro.md | SQLite overview, history, architecture, use cases, CLI |
| 02-compilacao.md | Compilation from source, amalgamation, build flags, Makefile |
| 03-api-c.md | C API: sqlite3_open/prepare/step/finalize, bind, error handling |
| 04-ddl-datatypes.md | DDL (CREATE/ALTER TABLE), type affinity, constraints, indices |
| 05-queries-otimizacao.md | Query execution, EXPLAIN, index usage, optimizer, CTEs, subqueries |
| 06-seguranca.md | Security: SQL injection prevention, encryption, authorization, sandboxing |
| 07-transacoes-wal.md | Transactions (ACID), isolation levels, WAL mode, checkpointing, concurrency |
| 08-performance.md | Performance tuning: pragmas, caching, page size, memory, I/O optimization |
| 09-manutencao.md | Maintenance: VACUUM, ANALYZE, integrity_check, backup, pragma tuning |
| 10-extensoes-vfs.md | Extensions (loadable modules), VFS interface, custom virtual tables |
| 11-fts5.md | FTS5 full-text search: virtual tables, tokenizers, queries, ranking |
| 12-migracao.md | Migration strategies: schema evolution, data transfer, version upgrades |

## How to Read
Read 01-intro.md first for context, then follow any path. For C API work read 03-api-c.md. For performance read 05 + 08 + 09. For full-text search read 11 directly. Each file is self-contained with cross-references.

## Prerequisites
- Basic SQL knowledge
- C programming (for 03-api-c.md, 10-extensoes-vfs.md)

## Related Guides
- (none yet)
