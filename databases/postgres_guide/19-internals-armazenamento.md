# PostgreSQL 18.4 — Internals: Armazenamento, WAL, Transações, Index AM, Planner/Statistics

Baseado em: `07-Internals/` (storage-*.html, transaction-*.html, wal-*.html, btree.html, gin.html, gist.html, spgist.html, brin.html, hash-index.html, index-*.html, planner-*.html, executor.html, tableam.html, fdw-callbacks.html)

---

## 1. Arquitetura de Armazenamento

### 1.1 Page Layout (8KB pages)

Toda tabela e índice é armazenada como um array de páginas de tamanho fixo (default 8 KB). Cada página tem 5 partes:

```
+-------------------+
| PageHeaderData    |  24 bytes
+-------------------+
| ItemIdData[]      |  4 bytes cada (array de identificadores)
+-------------------+
| Free space        |  entre pd_lower e pd_upper
+-------------------+
| Items             |  dados das tuplas (crescem de cima para baixo)
+-------------------+
| Special space     |  dados específicos do index AM (vazio em tabelas)
+-------------------+
```

**PageHeaderData (24 bytes):**

| Campo | Tipo | Tam | Descrição |
|-------|------|-----|-----------|
| pd_lsn | PageXLogRecPtr | 8B | LSN: último byte WAL da última modificação |
| pd_checksum | uint16 | 2B | Checksum da página (se habilitado) |
| pd_flags | uint16 | 2B | Flag bits |
| pd_lower | LocationIndex | 2B | Offset para início do free space |
| pd_upper | LocationIndex | 2B | Offset para fim do free space |
| pd_special | LocationIndex | 2B | Offset para special space |
| pd_pagesize_version | uint16 | 2B | Tamanho + versão (atual: 4) |
| pd_prune_xid | TransactionId | 4B | XMAX não podado mais antigo |

**ItemIdData (4 bytes cada):**
- Offset + length + flags: `LP_UNUSED` (0), `LP_REDIRECT` (1), `LP_DEAD` (2), `LP_NORMAL` (3)
- Item pointer (CTID) = page number + index do ItemId

**HeapTupleHeaderData (~23 bytes):**

| Campo | Tipo | Tam | Descrição |
|-------|------|-----|-----------|
| t_xmin | TransactionId | 4B | XID que inseriu |
| t_xmax | TransactionId | 4B | XID que deletou/atualizou (0 se ativa) |
| t_cid | CommandId | 4B | CID insert/delete (overlays t_xvac) |
| t_xvac | TransactionId | 4B | XID do VACUUM movendo versão |
| t_ctid | ItemPointerData | 6B | TID atual (ou da nova versão) |
| t_infomask2 | uint16 | 2B | Nº atributos + flags |
| t_infomask | uint16 | 2B | Flag bits |
| t_hoff | uint8 | 1B | Offset para user data |

**Bits t_infomask importantes:**
- `HEAP_XMIN_COMMITTED`, `HEAP_XMIN_INVALID`
- `HEAP_XMAX_COMMITTED`, `HEAP_XMAX_INVALID`, `HEAP_XMAX_IS_MULTI`
- `HEAP_UPDATED`, `HEAP_HOT_UPDATED`
- `HEAP_HASNULL`, `HEAP_HASOID_OLD`

📝 Espaço livre na página: `pd_upper - pd_lower`

### 1.2 TOAST — The Oversized-Attribute Storage Technique

Quando uma tupla excede ~2KB (TOAST_TUPLE_THRESHOLD), PG ativa TOAST.

**Estratégias de armazenamento:**

| Estratégia | Compress | Out-of-line | Uso |
|------------|----------|-------------|-----|
| PLAIN | ❌ | ❌ | Tipos não-TOAST |
| EXTENDED | ✅ (primeiro) | ✅ (depois) | Default para tipos grandes |
| EXTERNAL | ❌ | ✅ | substring mais rápido |
| MAIN | ✅ | ✅ (last resort) | Forçar inline |

**TOAST table:** `pg_toast.pg_toast_NNNN` (onde N = OID da tabela)
- Colunas: `chunk_id` (OID), `chunk_seq`, `chunk_data`
- Chunk size: ~2KB (4 chunks por página)
- Índice único em (chunk_id, chunk_seq)
- Pointer TOAST: 18 bytes (independente do tamanho do valor)

📝 `toast_tuple_target` (PG 18): threshold configurável por tabela via `ALTER TABLE ... SET (toast_tuple_target = N)`

🔍 Valores TOASTed usam 2 bits do varlena length word:
- `00` = normal
- `01` = compressed
- `10` = single-byte header (valores < 127 bytes)
- `11` = TOAST pointer (out-of-line)

📝 `pg_column_size()` para ver tamanho real, `pg_column_toast_storage()` para ver estratégia

### 1.3 Free Space Map (FSM)

Arquivo separado: `<relfilenode>_fsm`

- Árvore binária de páginas com espaço livre máximo
- 1 byte por página heap no nível inferior
- Nós superiores armazenam o máximo dos filhos
- Insert usa FSM para encontrar página com espaço suficiente
- VACUUM atualiza FSM
- Hash indexes NÃO têm FSM

📝 `pg_freespacemap` extension:
```sql
CREATE EXTENSION pg_freespacemap;
SELECT *, round(100 * avail/8192, 1) AS free_pct
FROM pg_freespace('tabela');
```

### 1.4 Visibility Map (VM)

Arquivo: `<relfilenode>_vm`

- 2 bits por página heap:
  - Bit 1: **all_visible** — todas as tuplas visíveis a todas as transações
  - Bit 2: **all_frozen** — todas as tuplas frozen
- Bits são SET por VACUUM, CLEAR por modificações
- VM é **conservadora**: se bit=1, condição é verdadeira; se bit=0, pode ou não ser

**Crucial para:**
- Index-only scans (precisa all_visible para pular verificação MVCC)
- VACUUM pode pular páginas all_visible
- Anti-wraparound vacuum pula páginas all_frozen

📝 `pg_visibility` extension:
```sql
CREATE EXTENSION pg_visibility;
SELECT * FROM pg_visibility('tabela', 0);
```

### 1.5 Heap-Only Tuples (HOT)

HOT é uma otimização de UPDATE que evita inserir entradas no índice.

**Condições para HOT:**
1. UPDATE não modifica **nenhuma** coluna indexada (exceto índices BRIN)
2. Espaço livre suficiente na mesma página para a nova versão

**Benefícios:**
- ✅ Novas entradas de índice NÃO são necessárias
- ✅ Versões intermediárias podem ser removidas por SELECT (HOT pruning)
- ✅ Menos dead tuples no índice

**Mecanismo:**
- `t_ctid` da old tuple aponta para a nova versão (HOT chain)
- ItemId da old tuple vira redirect (`LP_REDIRECT`)
- Índice sempre aponta para o ItemId original (que redireciona)

🛑 Sem HOT se coluna indexada muda — dead tuple permanece no índice

📝 Monitorar:
```sql
SELECT n_tup_hot_upd, n_tup_upd, 
       round(100 * n_tup_hot_upd / NULLIF(n_tup_upd, 0), 1) AS hot_pct
FROM pg_stat_all_tables WHERE relname = 'tabela';
```

### 1.6 File Layout

**Diretório PGDATA:**
```
PGDATA/base/<datoid>/<relfilenode>   (main fork)
PGDATA/base/<datoid>/<relfilenode>_fsm  (FSM fork)
PGDATA/base/<datoid>/<relfilenode>_vm   (VM fork)
PGDATA/base/<datoid>/<relfilenode>_init (init fork — unlogged only)
```

**Segmentos:** 1GB cada (configurável via `--with-segsize`)
- `relfilenode` (primeiro segmento)
- `relfilenode.1`, `relfilenode.2`, ...

⚠️ Filenode ≠ OID. Operações como TRUNCATE, REINDEX, CLUSTER mudam filenode.

📝 `pg_relation_filepath('tabela')` mostra caminho relativo ao PGDATA

Unlogged tables: init fork é copiado sobre o main fork após crash.

---

## 2. WAL Internals

### 2.1 WAL Records

**Estrutura XLogRecord:**
- xl_tot_len: comprimento total
- xl_xid: Transaction ID
- xl_prev: ponteiro para registro WAL anterior
- xl_info: tipo de registro
- xl_rmid: Resource Manager ID
- xl_crc: CRC32

**Resource Managers (RMGR) built-in:**
Heap, Btree, Gin, GiST, Sequence, Storage, Transaction, Generic, Custom, ...

Cada registro WAL contém: cabeçalho + dados específicos do RMGR + full page images (se `full_page_writes=on`)

### 2.2 WAL Write and Flush

- WAL buffers em shared memory (default 16MB, config `wal_buffers`)
- `wal_writer_delay` (default 200ms)
- `wal_writer_flush_after` (default 1MB)
- XLogFlush(LSN): garante que WAL até dado LSN está em disco
- `synchronous_commit = on`: COMMIT espera flush WAL

📝 Funções de monitoramento:
```sql
SELECT pg_current_wal_lsn(), pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0');
```

### 2.3 WAL Segments

- Localização: `pg_wal/`
- Tamanho: 16MB (default, configurável via `--wal-segsize`)
- Nomenclatura: `000000010000000000000001` = (timeline 8 hex)(log 8 hex)(seg 8 hex)
- Reciclados (não deletados) em circunstâncias normais
- `max_wal_size` / `min_wal_size` controlam quantos segments manter

### 2.4 Checkpoint

- `checkpoint_timeout` (default 5min)
- `max_wal_size` (default 1GB)
- Checkpoint REDO point: início do recovery
- Checkpoint record: localização do REDO point no WAL
- Checkpoint escreve dirty buffers para disco, atualiza pg_control

📝 `pg_controldata` mostra info do checkpoint

### 2.5 WAL no Recovery

- Startup process lê REDO point do checkpoint
- Aplica WAL até consistency
- Modos: `recovery_target_time`, `recovery_target_xid`, `recovery_target_lsn`, `recovery_target_name`

📝 Funções:
```sql
SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(), pg_is_in_recovery();
```

### 2.6 Generic WAL e Custom Resource Managers (PG18+)

**Generic WAL:** API simplificada para extensões que precisam WAL:
```c
state = GenericXLogStart(relation);
page = GenericXLogRegisterBuffer(state, buffer, flags);
// modifica page (cópia temporária)
GenericXLogFinish(state);
```

⚠️ Generic WAL é ignorado por Logical Decoding.

**Custom WAL Resource Manager (PG14+):** Extensões registram RMGR próprio:
```c
typedef struct RmgrData {
    const char *rm_name;
    void (*rm_redo)(XLogReaderState *record);
    void (*rm_desc)(StringInfo buf, XLogReaderState *record);
    const char *(*rm_identify)(uint8 info);
    void (*rm_startup)(void);
    void (*rm_cleanup)(void);
    void (*rm_mask)(char *pagedata, BlockNumber blkno);
    void (*rm_decode)(struct LogicalDecodingContext *ctx, struct XLogRecordBuffer *buf);
} RmgrData;
```

Registro: `RegisterCustomRmgr(rmid, &rmgr)` no `_PG_init()`.
Usar `RM_EXPERIMENTAL_ID` durante desenvolvimento; reservar ID único em wiki.postgresql.org.

✅ Custom RMGR suporta Logical Decoding e produz registros WAL menores que Generic WAL.

---

## 3. Transaction Internals

### 3.1 Transaction IDs (XID)

- 32-bit: 0-3 são reservados
  - 0: InvalidTransactionId
  - 1: BootstrapTransactionId
  - 2: FrozenTransactionId
  - 3: FirstNormalTransactionId
- ~2^31 transações antes do wraparound
- `xid8` (64-bit) inclui epoch — não wraparound

**VirtualTransactionID (vxid):** `procNumber/localXID` — exemplo: `4/12532`

**pg_xact:** diretório com status commit/abort de cada XID
**pg_commit_ts:** timestamps de commit (se `track_commit_timestamp=on`)

📝 Funções:
```sql
SELECT txid_current(), txid_snapshot_xmin(txid_current_snapshot()), txid_snapshot_xmax(txid_current_snapshot());
SELECT age(relfrozenxid) FROM pg_class WHERE relname = 'tabela';
```

### 3.2 MVCC Implementation

- `t_xmin`: XID que criou a tupla
- `t_xmax`: XID que deletou/atualizou (0 se ativa)
- `t_ctid`: aponta para a tupla atualizada (HOT chain)
- Snapshot: lista de XIDs em progresso no momento

**Freeze:** marca tupla como FrozenTransactionId (válida para todas as snapshots)
- `datfrozenxid`: XID frozen mais antigo no banco
- `relfrozenxid`: XID frozen mais antigo na tabela
- `age()` = txid_current - relfrozenxid

⚠️ Wraparound: quando age atinge ~2^31, banco força shutdown com erro. **NUNCA desative autovacuum.**

### 3.3 Subtransactions

- SAVEPOINT cria subtransaction XID
- `pg_subtrans`: mapeamento sub-XID → parent XID
- Até 64 subxids cacheados em shared memory por backend
- Após 64: I/O overhead significativo (lookups em pg_subtrans)

⚠️ Muitos subtransactions abertos causam overflow SLRU e degradação de performance.

### 3.4 Two-Phase Commit (2PC)

- `PREPARE TRANSACTION 'gid'` — persiste estado
- `COMMIT PREPARED 'gid'` / `ROLLBACK PREPARED 'gid'`
- pg_twophase directory: arquivos de estado preparado
- `pg_prepared_xacts` view lista transações preparadas
- GIDs: string única de até 200 bytes

⚠️ Transações preparadas não resolvidas bloqueiam VACUUM (wraparound!). Monitore `pg_prepared_xacts`.

### 3.5 Locking Internals

**Table-level:** lock manager com 8 modos (AccessShareLock a AccessExclusiveLock)

**Row-level:** tupla marcada com MultXact se vários locks
- `pgrowlocks` extension para inspecionar row locks

**pg_locks:** mostra locks em memória (virtualxid, transactionid, relation, etc.)

**Deadlock detection:** background process a cada `deadlock_timeout` (default 1s)

**Fast path locking:** locks em objetos pequenos sem entrada na hash table principal

---

## 4. Index AM Internals

### 4.1 B-Tree

**Estrutura:**
- Metapage (página 0)
- Root page, internal pages, leaf pages
- Doubly-linked list em cada nível (right-link para forward scan)
- >99% das páginas são leaf pages

**Page split:**
- Quando leaf page não cabe novo item
- 50/50 split (default) ou conforme `fillfactor`
- Cascata ascendente: split da página pai se necessário
- Root page split: novo nível adicionado

**Deduplicação (PG13+):**
- Merge de tuplas duplicadas em posting list tuples
- Ativado por default
- Requer função `equalimage` na operator class (retorna true se segura)

**Bottom-up index deletion (PG14+):**
- Deleta versões churn de UPDATEs que não modificam colunas indexadas
- Evita page splits em índices com alta versão churn
- Complementar ao VACUUM (que é top-down)

**Skip scan (PG16+):**
- Otimização que pula valores no índice sem precisar escanear todos
- Requer função `sortsupport` (opcional)

📝 pageinspect:
```sql
CREATE EXTENSION pageinspect;
SELECT * FROM bt_metap('idx');
SELECT * FROM bt_page_items('idx', 1);
```

### 4.2 GIN — Generalized Inverted Index

**Structure:**
- Entry tree: B-tree sobre os termos (keys)
- Posting tree: B-tree de TIDs (para termos com muitos matches)
- Posting list: lista inline de TIDs (para termos com poucos matches)
- Pending list: inserções rápidas não limpas (fastupdate)

**Fast Update:**
- `fastupdate = on` (default): insere na pending list primeiro
- Limpeza: VACUUM, autovacuum, `gin_clean_pending_list()`, ou `gin_pending_list_limit` excedido
- ✅ Muito mais rápido para INSERT
- ⚠️ Pending list grande degrada SELECT

📝 `jsonb_path_ops` vs `jsonb_ops`:
- `jsonb_path_ops`: mais rápido para path queries, não suporta `?` (chave no topo)
- `jsonb_ops` (default): suporta `?`, `?|`, `?&`, `@>`, `@?`, `@@`

✅ Ideal para: full-text search (`tsvector`), JSONB (`jsonb`), arrays

### 4.3 GiST — Generalized Search Tree

**Árvore balanceada** com predicados arbitrários.

**Support functions obrigatórias:**
- `consistent`: entrada satisfaz predicado?
- `union`: união de entradas (bounding box)
- `penalty`: custo de inserir em branch (picksplit decide split)
- `picksplit`: como dividir página
- `same`: duas entradas são idênticas?

**Support functions opcionais:**
- `distance`: nearest-neighbor search (`ORDER BY` com `<->`)
- `compress`/`decompress`: transformação de representação
- `fetch`: index-only scans
- `sortsupport`: acelera criação do índice

✅ Ideal para: geometria (box, polygon, circle), ranges, inet, full-text search (alternativa ao GIN), busca por similaridade (k-NN)

### 4.4 SP-GiST — Space-Partitioned GiST

**Árvore NÃO-balanceada:** quadtree, k-d tree, radix tree.

**Support functions:**
- `config`: tipo do prefixo, label, leaf
- `choose`: decide inserir em nó existente, adicionar nó, ou split
- `picksplit`: divide leaf tuples em nós
- `inner_consistent`: quais branches seguir no search
- `leaf_consistent`: tupla leaf satisfaz query?

**Tipos:**
- `quad_point_ops` (default para point): quadtree
- `kd_point_ops`: k-d tree
- `text_ops`: radix tree (trie) para prefix search (`^@`)

✅ Melhor que GiST para dados esparsos ou distribuição não-uniforme
✅ Prefix search em texto (`text_ops` com `^@`)

### 4.5 Hash Index

**WAL-logged desde PG10.** Antes PG10: não crash-safe.

**Estrutura:**
- Meta page (página 0)
- Primary bucket pages
- Overflow pages
- Bitmap pages (controle de overflow pages livres)

**Características:**
- Operador: apenas `=`
- Hash de 4 bytes (lossy — bitmap scan com recheck)
- Expansão incremental (bucket split) — NÃO precisa REINDEX
- sem FSM

⚠️ Raramente melhor que B-tree para igualdade. Use quando testado com dados reais.
⚠️ Overflow pages podem degradar performance com dados não-únicos.
⚠️ Expansão ocorre em foreground — pode impactar INSERT.

### 4.6 BRIN — Block Range INdex

**Summariza ranges de blocos.** Default: 128 páginas por range.

**Tipos de sumário:**
- `minmax`: mínimo e máximo (padrão para tipos ordenáveis)
- `minmax-multi`: múltiplos min/max (PG14+)
- `inclusion`: bounding box para geometria
- `bloom`: Bloom filter (PG14+)

📝 `pages_per_range` = blocos por sumário. Menor valor = índice maior, precisão maior.

```sql
CREATE INDEX idx_logs_brin ON logs USING brin (criado_em) WITH (pages_per_range = 32);
```

**Manutenção:**
- `brin_summarize_new_values(regclass)` — force summary de ranges novos
- `brin_desummarize_range(regclass, bigint)` — remove summary
- `autosummarize` (PG14+) — summarize automático via autovacuum

✅ Ideal para dados com correlação física (logs, séries temporais)
🛑 Ruim para colunas sem correlação — pior que seq scan

### 4.7 Index AM API

Cada index AM é registrado em `pg_am` com handler function que retorna `IndexAmRoutine`:

```c
typedef struct IndexAmRoutine {
    uint16 amstrategies;
    uint16 amsupport;
    uint16 amoptsprocnum;
    bool amcanorder;
    bool amcanorderbyop;
    bool amcanhash;
    bool amconsistentequality;
    bool amcanbackward;
    bool amcanunique;
    bool amcanmulticol;
    bool amoptionalkey;
    bool amsearcharray;
    bool amsearchnulls;
    bool amstorage;
    bool amclusterable;
    bool ampredlocks;
    bool amcanparallel;
    bool amcaninclude;
    bool amsummarizing;
    uint8 amparallelvacuumoptions;
    Oid amkeytype;
    // + pointers: ambuild, aminsert, ambulkdelete, amvacuumcleanup,
    //   amcostestimate, ambeginscan, amgettuple, amgetbitmap, ...
} IndexAmRoutine;
```

**Scan modes:**
- `amgettuple`: row-at-a-time (suporta forward/backward, mark/restore)
- `amgetbitmap`: bulk TIDs em bitmap (mais eficiente, sem ordenação)
- Index-only scan: se `amcanreturn` retorna dados da tupla

**Locking:**
- Scan: `AccessShareLock` no índice
- Update/VACUUM: `RowExclusiveLock`
- REINDEX: `ACCESS EXCLUSIVE` (ou `SHARE UPDATE EXCLUSIVE` com CONCURRENTLY)
- Index AM gerencia fine-grained locking internamente

**Unique checks:** heap entry inserida antes do index entry; concorrência requer detecção de conflitos.

### 4.8 Index Cost Estimation

Função `amcostestimate` fornecida pelo AM:
```c
void amcostestimate(PlannerInfo *root, IndexPath *path, double loop_count,
                    Cost *indexStartupCost, Cost *indexTotalCost,
                    Selectivity *indexSelectivity, double *indexCorrelation,
                    double *indexPages);
```

**Parâmetros de custo:**
- `seq_page_cost` (default 1.0)
- `random_page_cost` (default 4.0)
- `cpu_tuple_cost` (default 0.01)
- `cpu_index_tuple_cost` (default 0.005)
- `cpu_operator_cost` (default 0.0025)
- `parallel_tuple_cost` (default 0.01)
- `parallel_setup_cost` (default 100)
- `effective_cache_size` influencia index scan vs bitmap scan vs seq scan

---

## 5. Planner and Statistics

### 5.1 Row Estimation

**Fontes de estatística:**
- `pg_class.reltuples`: estimativa de linhas (atualizada por VACUUM/ANALYZE)
- `pg_statistic` (tabela real, acesso restrito a superuser)
- `pg_stats` (visão pública, filtra valores sensíveis)

**Colunas em pg_stats:**
- `n_distinct`: estimativa de valores distintos (-1 = único, 0 = desconhecido, >0 = absoluto, <0 = fração)
- `null_frac`: fração de nulls
- `avg_width`: largura média
- `most_common_vals` + `most_common_freqs`: MCV (até `default_statistics_target` entries)
- `histogram_bounds`: distribuição de valores não-MCV
- `correlation`: correlação física vs lógica (-1 a 1)
- `array_length_histogram`: para arrays

**Correlation:**
- Próximo de 1 ou -1: dados ordenados fisicamente → index scan eficiente
- Próximo de 0: dados aleatórios → bitmap scan pode ser melhor

📝 `default_statistics_target` (default 100) por coluna:
```sql
ALTER TABLE t ALTER COLUMN c SET STATISTICS 1000;
```

### 5.2 Multivariate Statistics (PG10+)

`CREATE STATISTICS` estende estatísticas para múltiplas colunas correlacionadas:

```sql
CREATE STATISTICS stts (dependencies) ON a, b FROM t;
CREATE STATISTICS stts2 (ndistinct) ON a, b FROM t;
CREATE STATISTICS stts3 (mcv) ON a, b FROM t;
```

**Tipos:**
- **dependencies**: dependências funcionais (globais por coluna)
- **ndistinct**: n-distinct combinado (GROUP BY preciso)
- **mcv**: Most Common Values multivariado (valores reais, mais preciso, mais caro)

📝 `pg_stats_ext` e `pg_stats_ext_exprs` para consultar estatísticas multivariadas.

### 5.3 Cost Estimation

**Fórmulas simplificadas:**
- Seq scan: `seq_page_cost * relpages + cpu_tuple_cost * reltuples`
- Index scan: `random_page_cost * index_pages + cpu_index_tuple_cost * index_tuples + cpu_operator_cost * qual_cost`
- Bitmap scan: combina múltiplos índices, depois heap scan

**Parallel query:**
- `parallel_setup_cost` + `parallel_tuple_cost * tuples / workers`
- GUCs: `max_parallel_workers_per_gather`, `max_parallel_workers`, `min_parallel_table_scan_size`

### 5.4 GEQO — Genetic Query Optimizer

Ativado quando número de joins excede `geqo_threshold` (default 12).

**Parâmetros:**
- `geqo_effort` (1-10, default 5): balanceia tempo vs qualidade
- `geqo_pool_size` (default 0 = auto): tamanho da população
- `geqo_generations` (default 0 = auto): número de gerações
- `geqo_selection_bias` (default 2.0): pressão seletiva
- `geqo_threshold` (default 12): mínimo de relations para ativar GEQO

⚠️ GEQO não garante plano ótimo — pode produzir planos piores que exhaustive search.

### 5.5 Statistics Security

- `pg_statistic`: acesso restrito a superuser (contém dados reais das colunas)
- `pg_stats`: visão pública (filtra valores sensíveis)
- Seletividade usa `LEAKPROOF` operators para acessar MCV
- Se operador não é LEAKPROOF e usuário não tem SELECT na coluna, estatísticas são ignoradas

---

## 6. Query Processing Pipeline

```
SQL text → [Parser] → parse tree → [Analyzer] → query tree
         → [Rewriter] → rewritten tree → [Planner] → plan tree
         → [Executor] → tuplas → [Output] → cliente
```

1. **Parser:** SQL text → parse tree (syntax check)
2. **Analyzer:** parse tree → query tree (semantic analysis, type resolution, name resolution)
3. **Rewriter:** rules aplicadas (views, regras)
4. **Planner:** query tree → plan tree (path generation + cost estimation + join order)
5. **Executor:** plan tree → tuplas (demand-pull pipeline: cada node entrega uma row por vez)
6. **Output:** tuplas enviadas ao cliente

**Executor node types comuns:**
- Seq Scan, Index Scan, Index Only Scan, Bitmap Heap Scan
- Nested Loop, Hash Join, Merge Join
- Sort, Aggregate, HashAggregate
- ModifyTable (INSERT/UPDATE/DELETE/MERGE)
- Result (INSERT...VALUES)

---

## 7. Table Access Methods (TableAM)

API para acesso a tabelas. `heap` é o TableAM padrão.

**Criação de TableAM customizado:**
```c
static const TableAmRoutine my_tableam_methods = {
    .type = T_TableAmRoutine,
    // callbacks: scan_begin, scan_getnextslot, tuple_insert,
    // tuple_update, tuple_delete, ...
};
PG_FUNCTION_INFO_V1(my_tableam_handler);
Datum my_tableam_handler(PG_FUNCTION_ARGS) {
    PG_RETURN_POINTER(&my_tableam_methods);
}
```

```sql
CREATE ACCESS METHOD myam TYPE TABLE HANDLER my_tableam_handler;
```

**Requisitos:**
- TID (block_number, item_number) necessário se suporta modificações/índices
- Block number precisa fornecer localidade se suporta bitmap scan
- Pode usar buffer cache do PostgreSQL ou implementação própria
- Pode usar WAL (Generic WAL ou Custom RMGR) ou implementação própria

✅ `heap` é o TableAM padrão e sempre usa formato de página padrão.

---

## 8. FDW Callbacks

Foreign Data Wrappers implementam callbacks via `FdwRoutine`:

**Planner:**
- `GetForeignRelSize`: estima tamanho da tabela remota
- `GetForeignPaths`: gera ForeignPath(s)
- `GetForeignPlan`: cria ForeignScan plan node
- `GetForeignJoinPaths`: joins remotos (opcional)
- `GetForeignUpperPaths`: aggregation/sort remoto (opcional)

**Executor:**
- `BeginForeignScan`: inicializa scan
- `IterateForeignScan`: retorna próxima row (ou NULL)
- `ReScanForeignScan`: restart
- `EndForeignScan`: cleanup

**DML:**
- `AddForeignUpdateTargets`: colunas extras (rowid, pk)
- `PlanForeignModify`: planeja INSERT/UPDATE/DELETE
- `ExecForeignInsert` / `ExecForeignBatchInsert`
- `ExecForeignUpdate` / `ExecForeignDelete`
- `BeginForeignModify` / `EndForeignModify`

**Row locking:**
- `GetForeignRowLockType`
- `RefetchForeignRow`

📝 `postgres_fdw` implementa todos estes callbacks — referência para implementação.

---

## 9. Armadilhas Comuns

| 🛑 Problema | Consequência | ✅ Solução |
|-------------|-------------|-----------|
| Assumir que TOAST é sempre compress | Perda de performance em substring | `EXTERNAL` para colunas com substring frequente |
| FSM desatualizada após bloat | INSERT em páginas cheias, mais I/O | VACUUM regular, ou `pg_freespacemap` para diagnóstico |
| HOT não funciona com UPDATE de coluna indexada | Dead tuples no índice, bloat | `fillfactor` menor, ou índices parciais |
| WAL segment naming confusa | Dificuldade em PITR recovery | Entender timeline/log/seg: `00000001_00000000_00000001` |
| MultXact wrap-around ignorado | Mais frequente que XID wraparound | Monitore `age(datminmxid)` em pg_database |
| GEQO para > 12 joins | Plano subótimo | Ajustar `geqo_threshold` ou forçar join_order |
| pg_statistic vs pg_stats | Erro de permissão ao acessar pg_statistic | Usar pg_stats para usuários não-superuser |
| Subtransactions excessivos | Overflow SLRU, lentidão | Evitar milhares de SAVEPOINTs aninhados |
| Transações preparadas esquecidas | Bloqueiam VACUUM (wraparound!) | Monitore `pg_prepared_xacts`, resolva ASAP |
| BRIN com `pages_per_range` muito grande | Sumário impreciso, falso positivo | Ajustar conforme distribuição dos dados |
| Índice em coluna sem correlação física | Bitmap scan ineficiente | BRIN não é adequado — usar B-tree |
| Assumir que VM bit = sempre true | VM é conservadora: bit=1 é garantido, bit=0 não | pg_visibility para verificar |
