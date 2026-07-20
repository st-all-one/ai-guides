# Performance e Tuning

Baseado em: `optoverview.html`, `pragma.html`, `compile.html`, `malloc.html`,
`eqp.html`, `threadsafe.html`

---

## 1. Diagnóstico de Performance

### EXPLAIN QUERY PLAN

A ferramenta mais importante para entender e otimizar queries:

```sql
-- Verificar se índices estão sendo usados
EXPLAIN QUERY PLAN
SELECT nome, salario FROM funcionario WHERE dept_id = 5 AND salario > 10000;

-- Saída desejada:
-- SEARCH funcionario USING INDEX idx_dept_sal (dept_id=? AND salario>?)
-- Saída RUIM:
-- SCAN funcionario
```

### Medição de Performance

```sql
-- Timing
.timer ON   -- no CLI sqlite3

-- Estatísticas de cache
PRAGMA cache_spill = TRUE;
PRAGMA cache_size = -64000;  -- 64MB de cache

-- Debug
PRAGMA vdbe_listing = ON;   -- mostra bytecode
PRAGMA vdbe_trace = ON;     -- trace de execução
```

### Monitoramento de Memória

```c
sqlite3_int64 used = sqlite3_memory_used();
sqlite3_int64 high = sqlite3_memory_highwater(1);  // 1 = reset highwater
printf("SQLite memory: %lld used, %lld peak\n", used, high);
```

## 2. Otimizações de Compilação

### Flags Recomendadas (5% mais rápido, 3% menor)

```bash
-DSQLITE_DQS=0
-DSQLITE_THREADSAFE=0                # se single-thread
-DSQLITE_DEFAULT_MEMSTATUS=0
-DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1
-DSQLITE_LIKE_DOESNT_MATCH_BLOBS
-DSQLITE_MAX_EXPR_DEPTH=0
-DSQLITE_OMIT_DECLTYPE
-DSQLITE_OMIT_DEPRECATED
-DSQLITE_OMIT_PROGRESS_CALLBACK
-DSQLITE_OMIT_SHARED_CACHE
-DSQLITE_STRICT_SUBTYPE=1
```

### Flags de Performance Adicionais

```bash
-DSQLITE_DIRECT_OVERFLOW_READ        # lê overflow pages direto do disco (sem page cache)
-DSQLITE_ENABLE_BATCH_ATOMIC_WRITE   # atomic write no Linux (se FS suportar)
-DSQLITE_USE_ALLOCA                  # usa alloca() para alocações temporárias
-DSQLITE_HAVE_ISNAN                  # usa isnan() do sistema
-DSQLITE_HAVE_MALLOC_USABLE_SIZE     # evita wrapper de 8 bytes
-DSQLITE_BYTEORDER=1234              # little-endian (evita runtime check)
```

## 3. PRAGMAs de Performance

### Cache

```sql
-- Tamanho do cache de páginas
PRAGMA cache_size = -64000;             -- 64MB (negativo = kilobytes)
PRAGMA cache_size = 16000;              -- 16000 páginas (64MB com page_size=4096)

-- Spill do cache (evita que cache consuma toda a memória)
PRAGMA hard_heap_limit = 104857600;     -- 100MB hard limit
```

### Page Size

```sql
-- Definir ANTES de criar o banco (não pode mudar depois sem VACUUM)
PRAGMA page_size = 4096;    -- default. 8192 é melhor para bancos grandes
PRAGMA page_size = 65536;   -- máximo (banco de até ~281TB)

-- Tamanho ideal:
-- 4096 = 4KB (padrão, bom para uso geral)
-- 8192 = 8KB (bom para bancos com registros médios-grandes)
-- 16384 = 16KB (bom para data warehouse/analytics)
-- 1024 = 1KB (min, para sistemas embarcados com pouco disco)
```

### mmap

```sql
PRAGMA mmap_size = 268435456;   -- 256MB de mmap (leitura mais rápida)
-- PRAGMA mmap_size = 0;        -- desativa (mais seguro)
```

mmap acelera leituras mas torna o banco vulnerável a erros de memória
em outras partes da aplicação.

### Multi-threading

```sql
PRAGMA threads = 4;             -- máximo de threads auxiliares para sort
```

### Outros PRAGMAs de Performance

```sql
PRAGMA temp_store = MEMORY;     -- tabelas temporárias em RAM (vs FILE)
PRAGMA automatic_index = ON;    -- índices automáticos em tempo de query
PRAGMA analysis_limit = 1000;   -- limita linhas analisadas pelo ANALYZE
PRAGMA optimize;                -- recomenda otimizações antes de fechar
```

## 4. Otimização de Prepared Statements

### Reutilização é a Otimização #1

```c
// RUIM: preparar para cada linha
for (int i = 0; i < 100000; i++) {
    sqlite3_prepare_v2(db, "INSERT INTO t VALUES(?)", -1, &stmt, NULL);
    sqlite3_bind_int(stmt, 1, i);
    sqlite3_step(stmt);
    sqlite3_finalize(stmt);
}

// BOM: preparar uma vez, reutilizar
sqlite3_prepare_v2(db, "INSERT INTO t VALUES(?)", -1, &stmt, NULL);
for (int i = 0; i < 100000; i++) {
    sqlite3_bind_int(stmt, 1, i);
    sqlite3_step(stmt);
    sqlite3_reset(stmt);
}
sqlite3_finalize(stmt);
```

### Batching de INSERTs

```sql
-- RUIM: transação implícita para cada INSERT (muito lento!)
INSERT INTO t VALUES (1);
INSERT INTO t VALUES (2);
INSERT INTO t VALUES (3);

-- BOM: transação explícita (50-100x mais rápido)
BEGIN;
INSERT INTO t VALUES (1);
INSERT INTO t VALUES (2);
...
INSERT INTO t VALUES (1000);
COMMIT;
```

### Bulk Insert Otimizado

```sql
-- Para inserções em massa com dados externos:
BEGIN;
CREATE TABLE t(a, b);
INSERT INTO t VALUES(1, 'hello');   -- 100k linhas
COMMIT;

-- Ainda mais rápido: desativar índices/triggers temporariamente
PRAGMA synchronous = OFF;       -- ⚠️ só durante bulk insert! (com WAL é seguro)
BEGIN;
INSERT INTO t SELECT * FROM temp_table;
COMMIT;
PRAGMA synchronous = NORMAL;
```

## 5. Otimização de Índices

### Estratégia de Índices

```sql
-- 1. Índice para WHERE frequente
CREATE INDEX idx_status ON pedidos(status);

-- 2. Índice multicoluna com melhor seletividade primeiro
CREATE INDEX idx_cliente_data ON pedidos(cliente_id, data_criacao);

-- 3. Covering index (evita acesso à tabela)
CREATE INDEX idx_cover ON pedidos(cliente_id) INCLUDE(status, total);

-- 4. Índice parcial (economia de espaço e manutenção)
CREATE INDEX idx_pedidos_ativos ON pedidos(data) WHERE status = 'ativo';

-- 5. Índice para ORDER BY
CREATE INDEX idx_data ON pedidos(data_criacao);  -- ORDER BY data_criacao usa índice
```

### Identificar Índices Redundantes

```sql
-- Índices com prefixo duplicado:
-- EXISTE: idx_a_b(a, b)
-- REDUNDANTE: idx_a(a)  → a_b já serve para queries que só usam a
```

## 6. Otimização de Schema

### WITHOUT ROWID

Para tabelas com PRIMARY KEY composta ou TEXT PK:

```sql
-- Com rowid: duas B-trees (rowid + índice PK)
CREATE TABLE pedido_itens (
    pedido_id INTEGER,
    item_id INTEGER,
    PRIMARY KEY (pedido_id, item_id)
);

-- WITHOUT ROWID: uma B-tree (PK é o cluster)
CREATE TABLE pedido_itens (
    pedido_id INTEGER,
    item_id INTEGER,
    PRIMARY KEY (pedido_id, item_id)
) WITHOUT ROWID;
-- Consultas por pedido_id são mais rápidas
```

### STRICT Tables

```sql
-- STRICT permite armazenamento mais compacto (sem overhead de tipo)
CREATE TABLE t (id INTEGER PRIMARY KEY, nome TEXT) STRICT;
-- + Verificação de tipo em tempo de INSERT
-- - Sem conversão automática (rejeita tipos mistos)
```

### Columnas com Defaults

```sql
CREATE TABLE t (
    id INTEGER PRIMARY KEY,
    criado_em TEXT DEFAULT (datetime('now')),  -- TIMESTAMP automático
    ativo INTEGER DEFAULT 1                     -- não precisa ser incluído no INSERT
);
```

## 7. VACUUM e Auto-Vacuum

```sql
-- Reorganiza banco (recupera espaço após DELETE)
VACUUM;

-- Cria cópia compactada do banco (útil para backup)
VACUUM INTO '/caminho/backup.db';

-- Auto-vacuum incremental (menos overhead que FULL)
PRAGMA auto_vacuum = INCREMENTAL;
PRAGMA incremental_vacuum(100);  -- reclaim 100 pages
```

### Quando VACUUM

- Após deletar muitas linhas (>20% do banco)
- Após mudar `page_size` ou `auto_vacuum`
- Periodicamente como manutenção

## 8. PRAGMA optimize

O `PRAGMA optimize` analisa o banco e executa recomendações:

```sql
-- Executar antes de fechar conexões de curta duração
PRAGMA optimize;

-- Para conexões longas:
PRAGMA optimize = 0x10002;           -- na abertura (analisar, sem recomendar)
-- Periodicamente:
PRAGMA optimize;                     -- aplicar recomendações
```

O que `optimize` faz:
- Analisa tabelas sem estatísticas (`sqlite_stat1`)
- Recomenda índices que faltam
- Atualiza estatísticas de ANALYZE se necessário

## 9. Performance em Modos Específicos

### Bancos em Memória

```c
sqlite3_open("file::memory:?cache=shared", &db);  -- banco em RAM, até 4x mais rápido
// ou nomeado para compartilhar entre conexões:
sqlite3_open("file:memdb1?mode=memory&cache=shared", &db);
```

### Bancos Only-File (sem journal)

Para bancos de dados puramente de leitura ou para dados descartáveis
com WAL + sincronização mínima:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = OFF;      -- ⚠️ perde durabilidade em crash
PRAGMA temp_store = MEMORY;
```

Para bancos de leitura pura:
```c
sqlite3_open_v2("meubanco.db", &db, SQLITE_OPEN_READONLY, NULL);
```

## 10. Nomes de Banco e URI

```c
// URI mode — permite parâmetros na string de conexão
sqlite3_open_v2("file:data.db?mode=ro&cache=private", &db,
    SQLITE_OPEN_URI, NULL);

// Parâmetros URI úteis:
// mode=ro|rw|rwc|memory
// cache=private|shared
// immutable=1   (otimização para bancos que não mudam — sem locks)
// vfs=NAME
```

## 11. Tabela Resumo de Performance

| Operação | Otimização Principal | Ganho Esperado |
|---|---|---|
| INSERT em massa | Transação única + prepared statement reutilizado | 50-100x |
| SELECT com WHERE | Índice apropriado | 100-10000x |
| SELECT com ORDER BY | Índice na coluna ORDER BY | Elimina sort |
| JOIN | Índice na coluna de junção | 10-100x |
| COUNT(*) em tabela grande | Índice ou approximate count | 100x |
| LIKE 'prefixo%' | Índice + LIKE não começar com `%` | 100x |
| Bulk load | synchronous=OFF + WAL | 2-10x |
| Cache | cache_size adequado + mmap | 2-5x |

## 12. Caso Real: task-manager — Adoção de STRICT Tables e Modern SQLite

O projeto **task-manager** usa SQLite via sqlx 0.8 (Rust). O schema
atual (migração V1) foi criado sem nenhum recurso moderno do SQLite.
O plano de modernização inclui:

- **STRICT** em tabelas novas (type safety em tempo de INSERT)
- **application_id = 0x544D414E** ("TMAN") para identificação de formato
- **user_version** versionado junto com `_schema_version`
- **Generated columns** para contagem de assignees/tags via `json_array_length`
- **Operadores JSON `->` e `->>`** (SQLite 3.38+) para queries mais limpas

### Plano de Implementação

O plano completo está em
[wiki/plan/plan-05-strict-tables-modern-sqlite.md](../../wiki/plan/plan-05-strict-tables-modern-sqlite.md).

---

**Próximo**: [09-manutencao.md](09-manutencao.md) — Manutenção e Backup
