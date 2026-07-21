# Information Schema, System Catalogs e Views de Monitoramento

**PostgreSQL 18.4** — Referência completa para consulta de metadados, catálogos internos e diagnóstico.

## 1. Information Schema — Visão Geral

O schema `information_schema` contém visões definidas pelo padrão SQL/ISO que expõem metadados do banco de dados. São portáveis entre bancos compatíveis com o padrão.

✅ **Use `information_schema` quando precisar de portabilidade entre bancos.**

⚠️ **Limitações:**
- Não cobre features exclusivas do PostgreSQL (particionamento nativo, replicação lógica, RLS, etc.)
- Não expõe objetos do sistema (catálogos internos)
- Performance inferior ao `pg_catalog` em consultas complexas
- Constraints com mesmo nome dentro de um schema podem gerar linhas duplicadas (PG não exige unicidade de constraint names)

📝 **Quando usar `pg_catalog` em vez de `information_schema`:**
- Precisar de detalhes PG-specific (partições, RLS, extensões, estatísticas)
- Fazer ferramentas de administração que só rodam em PG
- Performance é crítica

O schema `pg_catalog` já está no `search_path` por padrão — não precisa qualificar.

## 2. Information Schema — Views Essenciais

| View | Para que serve | Colunas-chave |
|---|---|---|
| `information_schema.tables` | Todas as tabelas e views | table_name, table_type, table_schema |
| `information_schema.columns` | Colunas de todas as tabelas | column_name, data_type, is_nullable, character_maximum_length |
| `information_schema.views` | Definição de views | view_definition, is_updatable, is_insertable_into |
| `information_schema.schemata` | Schemas do banco | schema_name, schema_owner, default_character_set_name |
| `information_schema.routines` | Funções e procedures | routine_name, routine_type, data_type, routine_body |
| `information_schema.parameters` | Parâmetros de funções | parameter_name, ordinal_position, parameter_mode, data_type |
| `information_schema.sequences` | Sequências | sequence_name, increment, start_value, minimum_value, maximum_value |
| `information_schema.referential_constraints` | Foreign keys | constraint_name, unique_constraint_name, delete_rule, update_rule |
| `information_schema.table_constraints` | Constraints de tabela | constraint_type (PRIMARY KEY, UNIQUE, CHECK, FOREIGN KEY) |
| `information_schema.key_column_usage` | Colunas em constraints | constraint_name, column_name, ordinal_position, position_in_unique_constraint |
| `information_schema.check_constraints` | CHECK constraints | check_clause |
| `information_schema.triggers` | Triggers | trigger_name, event_manipulation, action_timing, action_statement |
| `information_schema.domains` | Domínios | domain_name, data_type, default_value, is_nullable |
| `information_schema.role_table_grants` | Privilégios em tabelas | grantee, table_name, privilege_type, is_grantable |
| `information_schema.role_routine_grants` | Privilégios em funções | grantee, routine_name, privilege_type |
| `information_schema.role_column_grants` | Privilégios em colunas | grantee, table_name, column_name, privilege_type |
| `information_schema.enabled_roles` | Roles ativas na sessão | role_name |
| `information_schema.applicable_roles` | Roles disponíveis | role_name, grantee, is_grantable |
| `information_schema.user_mappings` | Mapeamentos FDW | authorization_identifier, foreign_server_name |
| `information_schema.foreign_tables` | Foreign tables | foreign_table_name, foreign_server_name |
| `information_schema.element_types` | Tipos de arrays/UDTs | collection_type_identifier, data_type |
| `information_schema.character_sets` | Character sets | character_set_name, character_repertoire, form_of_use |
| `information_schema.collations` | Collations disponíveis | collation_name, character_set_name |
| `information_schema.column_options` | Opções FDW de coluna | table_name, column_name, option_name, option_value |

📝 **Query templates comuns:**

```sql
-- Listar todas as tabelas com colunas e tipos
SELECT c.table_schema, c.table_name, c.column_name, c.data_type,
       c.is_nullable, c.character_maximum_length
FROM information_schema.columns c
JOIN information_schema.tables t USING (table_schema, table_name)
WHERE t.table_type = 'BASE TABLE'
  AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY c.table_schema, c.table_name, c.ordinal_position;

-- Encontrar FKs de uma tabela
SELECT tc.constraint_name, tc.table_schema, tc.table_name,
       kcu.column_name, ccu.table_schema AS foreign_schema,
       ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'minha_tabela';

-- Listar functions com seus parâmetros
SELECT r.routine_name, r.routine_type, r.data_type AS return_type,
       p.parameter_name, p.parameter_mode, p.data_type AS param_type
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p
  ON p.specific_name = r.specific_name
WHERE r.routine_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY r.routine_name, p.ordinal_position;

-- Verificar permissões de um role
SELECT table_schema, table_name, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE grantee = 'meu_role'
ORDER BY table_schema, table_name;
```

## 3. pg_catalog — System Catalogs Essenciais

Os catálogos do sistema são tabelas reais que armazenam metadados internos do PostgreSQL. Diferentemente do `information_schema`, eles são específicos do PG e muito mais completos.

⚠️ **Nunca altere catálogos diretamente.** Use comandos SQL (CREATE/ALTER/DROP). Alterar catálogos manualmente pode corromper o banco.

### Catálogos Essenciais

| Catálogo | Conteúdo | Colunas-chave |
|---|---|---|
| `pg_class` | Tabelas, índices, views, sequences, etc. | relname, relnamespace, relkind, relowner, reltuples, relpages, relfrozenxid, relminmxid, relispartition |
| `pg_attribute` | Colunas de todas as relações | attrelid, attname, atttypid, attnum, attnotnull, attidentity, attgenerated, attisdropped, attstattarget |
| `pg_namespace` | Schemas | nspname, nspowner, nspacl |
| `pg_database` | Databases no cluster (shared) | datname, datdba, encoding, datcollate, datctype, datconnlimit, datfrozenxid, datminmxid |
| `pg_type` | Tipos de dados | typname, typnamespace, typowner, typlen, typbyval, typtype, typcategory, typinput, typoutput |
| `pg_proc` | Funções e procedures | proname, pronamespace, pronargs, prorettype, prokind, prolang, prosecdef, provolatile, proparallel, prosrc |
| `pg_index` | Índices | indexrelid, indrelid, indisunique, indisprimary, indisvalid, indisclustered, indkey, indpred, indnatts, indnkeyatts |
| `pg_constraint` | Constraints | conname, connamespace, contype, conrelid, confrelid, conkey, confkey, conbin, conindid, condeferrable, confupdtype, confdeltype |
| `pg_extension` | Extensões instaladas | extname, extowner, extnamespace, extversion, extrelocatable, extconfig |
| `pg_authid` | Roles (shared, contém senhas!) | rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls, rolconnlimit, rolpassword |
| `pg_auth_members` | Membros de roles (shared) | roleid, member, grantor, admin_option, inherit_option, set_option |
| `pg_tablespace` | Tablespaces (shared) | spcname, spcowner, spcacl, spcoptions |
| `pg_policy` | Políticas RLS | polname, polrelid, polpermissive, polroles, polqual, polwithcheck |
| `pg_statistic` | Estatísticas de colunas (ANALYZE) | starelid, staattnum, stanullfrac, stawidth, stadistinct, stakind1-5, staop1-5, stanumbers1-5, stavalues1-5 |
| `pg_statistic_ext` | Estatísticas multivariadas (definição) | stxname, stxnamespace, stxowner, stxkeys, stxkind (d=ndistinct, f=functional dependencies, m=mcv) |
| `pg_partitioned_table` | Tabelas particionadas | partrelid, partstrat, partnatts, partattrs, partclass, partcollation, PartExprs |
| `pg_inherits` | Herança de tabelas/partições | inhrelid, inhparent, inhseqno |
| `pg_description` | Comentários em objetos | objoid, classoid, objsubid, description |
| `pg_depend` | Dependências entre objetos | classid, objid, objsubid, refclassid, refobjid, deptype (n=normal, a=auto, i=internal, e=extension, P=pin, S=auto partition) |
| `pg_shdepend` | Dependências a nível de cluster | dbid, classid, objid, objsubid, refclassid, refobjid, deptype |
| `pg_publication` | Publicações | pubname, pubowner, puballtables, pubinsert, pubupdate, pubdelete, pubtruncate |
| `pg_subscription` | Subscriptions | subname, subowner, subenabled, subconninfo, subslotname, subsynccommit, subpublications |

🔍 **Valores de `relkind` em `pg_class`:**
- `r` = tabela comum, `i` = índice, `S` = sequence, `t` = TOAST table, `v` = view, `m` = materialized view, `c` = composite type, `f` = foreign table, `p` = partitioned table, `I` = partitioned index

🔍 **Valores de `contype` em `pg_constraint`:**
- `c` = CHECK, `f` = FOREIGN KEY, `n` = NOT NULL (desde PG 16), `p` = PRIMARY KEY, `u` = UNIQUE, `t` = constraint trigger, `x` = exclusion

🔍 **Valores de `deptype` em `pg_depend`:**
- `n` = normal (independente), `a` = auto (dependente), `i` = internal, `e` = extensão, `P` = pin (sistema), `S` = auto partition

📝 **Query templates para pg_catalog:**

```sql
-- Listar todas as colunas de uma tabela com tipos
SELECT a.attname AS column_name, t.typname AS data_type,
       a.attnotnull AS not_null, a.attnum AS ordinal,
       CASE WHEN a.attidentity != '' THEN 'IDENTITY:' || a.attidentity END AS identity,
       CASE WHEN a.attgenerated != '' THEN 'GENERATED:' || a.attgenerated END AS generated,
       d.description
FROM pg_class c
JOIN pg_attribute a ON a.attrelid = c.oid
JOIN pg_type t ON t.oid = a.atttypid
LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum
WHERE c.relname = 'minha_tabela'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;

-- Encontrar índices sem uso (requer pg_stat_user_indexes)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelid NOT IN (
  SELECT conindid FROM pg_constraint WHERE conindid != 0
)
ORDER BY schemaname, tablename;

-- Listar dependências de um objeto
SELECT refclassid::regclass AS ref_class, refobjid::text AS ref_object,
       deptype AS dependency_type
FROM pg_depend
WHERE classid = 'pg_class'::regclass
  AND objid = 'minha_tabela'::regclass
  AND deptype NOT IN ('i', 'P');

-- Verificar tamanho de relations
SELECT relname, relkind,
       pg_size_pretty(pg_table_size(oid)) AS table_size,
       pg_size_pretty(pg_total_relation_size(oid)) AS total_size,
       reltuples::bigint AS estimated_rows
FROM pg_class
WHERE relkind IN ('r', 'm', 'p')
ORDER BY pg_total_relation_size(oid) DESC
LIMIT 20;

-- Encontrar tabelas sem PK
SELECT n.nspname AS schema, c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND c.oid NOT IN (
    SELECT conrelid FROM pg_constraint WHERE contype = 'p'
  )
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schema, table_name;
```

### Catálogos Compartilhados (Cluster-wide)

Estes catálogos têm apenas uma cópia por cluster, não por database:
- `pg_database` — databases
- `pg_authid` — roles (contém senhas!)
- `pg_auth_members` — membros de roles
- `pg_tablespace` — tablespaces
- `pg_shdepend` — dependências de objetos compartilhados
- `pg_shdescription` — comentários em objetos compartilhados
- `pg_shseclabel` — security labels em objetos compartilhados
- `pg_replication_origin` — origens de replicação

## 4. Sistema de Estatísticas Cumulativas (pg_stat_* / pg_statio_*)

Coletadas pelo Cumulative Statistics System (CSS). Valores são acumulados desde o último reset (`pg_stat_reset()` ou `pg_stat_*_reset()`).

### Views de Atividade e Sessão

| View | Propósito |
|---|---|
| `pg_stat_activity` | Sessões ativas: pid, datname, usename, state, query, wait_event_type, wait_event, backend_start, query_start, state_change |
| `pg_stat_ssl` | Conexões SSL: pid, ssl, version, cipher, bits, compression, client_dn, client_serial |
| `pg_stat_replication` | Conexões de replicação: pid, usesysid, application_name, client_addr, state, write_lag, flush_lag, replay_lag, sync_state |
| `pg_stat_subscription` | Status de subscriptions: subid, subname, pid, relid, received_lsn, latest_end_lsn |
| `pg_stat_subscription_stats` | Estatísticas de conflitos de subscriptions: subid, subname, apply_error_count, sync_error_count |

### Views de Tabelas e Índices

| View | Propósito |
|---|---|
| `pg_stat_user_tables` | Escans, tuples inseridas/atualizadas/deletadas/vivas/mortas, last_*_timestamp, n_live_tup, n_dead_tup, n_mod_since_analyze |
| `pg_stat_user_indexes` | Index scans, tuples fetched (via índice), tuples read (via scan) |
| `pg_stat_all_tables` | Todas as tabelas (inclui sistema) |
| `pg_stat_all_indexes` | Todos os índices (inclui sistema) |
| `pg_statio_user_tables` | I/O por tabela: heap_blks_read, heap_blks_hit, toast_blks_read/hit, idx_blks_read/hit |
| `pg_statio_user_indexes` | I/O por índice: idx_blks_read, idx_blks_hit |
| `pg_statio_all_tables` | I/O de todas as tabelas |
| `pg_statio_all_indexes` | I/O de todos os índices |
| `pg_stat_xact_user_tables` | Estatísticas transacionais (apenas transação atual) |

### Views de Database e Sistema

| View | Propósito |
|---|---|
| `pg_stat_database` | Por database: numbackends, xact_commit, xact_rollback, blks_read, blks_hit, tup_returned/fetched/inserted/updated/deleted, conflicts, deadlocks, temp_files, temp_bytes, blk_read_time, blk_write_time |
| `pg_stat_bgwriter` | Checkpoints (timed/requested), buffers written (checkpoint/clean/backend), fsyncs, buffers_alloc |
| `pg_stat_wal` | WAL records, wal_fpi (full page images), wal_bytes, wal_buffers_full, stats_reset |
| `pg_stat_archiver` | WAL archiving: archived_count, last_archived_wal, failed_count, last_failed_wal |

### Views de Progresso

| View | Propósito |
|---|---|
| `pg_stat_progress_vacuum` | pid, datid, relid, phase (scanning/vacuuming/cleaning/etc.), heap_blks_total/scanned/vacuumed, index_vacuum_count, max_dead_tuple_bytes |
| `pg_stat_progress_create_index` | pid, datid, relid, command, phase, tuples_total/done, blocks_total/done |
| `pg_stat_progress_cluster` | pid, datid, relid, command, phase, cluster_index_relid, heap_tuples_scanned/done |
| `pg_stat_progress_basebackup` | pid, phase, backup_total/backup_streamed, tablespaces_total/tablespaces_streamed |
| `pg_stat_progress_copy` | pid, datid, relid, command (COPY FROM/TO), type (file/program/pipe), bytes_processed, bytes_total, tuples_processed, tuples_excluded |

### Views de SLRU e Estatísticas de Sistema

| View | Propósito |
|---|---|
| `pg_stat_slru` | SLRU cache: name, blks_zeroed, blks_hit, blks_read, blks_written, blks_exists, flush, truncate, stats_reset |
| `pg_stat_replication_slots` | Slot stats: slot_name, spill_txns, spill_count, spill_bytes, stream_txns, stream_count, stream_bytes, total_txns, total_bytes |

📝 **Cache hit ratio por database:**

```sql
SELECT datname,
       round(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname NOT IN ('template0', 'template1')
ORDER BY cache_hit_ratio;
```

📝 **Checkpoints e WAL gerado:**

```sql
SELECT checkpoints_timed, checkpoints_req,
       round(100.0 * checkpoints_req / NULLIF(checkpoints_timed + checkpoints_req, 0), 1) AS req_pct,
       pg_size_pretty(wal_bytes::numeric) AS wal_written
FROM pg_stat_bgwriter, pg_stat_wal;
```

## 5. Views de Configuração e Diagnóstico (pg_*)

### Views de Configuração

| View | Propósito |
|---|---|
| `pg_config` | Parâmetros de compilação do PG (prefixo, bindir, libdir, configure, etc.) |
| `pg_settings` | Todos os GUCs: name, setting, unit, category, short_desc, context (internal/postmaster/sighup/backend/superuser/user), pending_restart, min_val, max_val, enumvals |
| `pg_hba_file_rules` | Regras do pg_hba.conf: line_number, type, database, user_name, address, netmask, auth_method, options, error |
| `pg_ident_file_mappings` | Mapeamentos pg_ident.conf: line_number, map_name, system_user, pg_user, error |
| `pg_file_settings` | Conteúdo do postgresql.conf aplicado: sourcefile, sourceline, seqno, name, setting, applied, error |

### Views de Locks e Sessão

| View | Propósito |
|---|---|
| `pg_locks` | Locks ativos: locktype (relation/extend/frozenid/page/tuple/transactionid/virtualxid/object/userlock/advisory), database, relation, pid, mode (AccessShareRowExclusive, etc.), granted, fastpath, waitstart |
| `pg_prepared_xacts` | Transações preparadas (two-phase commit): transaction, gid, prepared, owner, database |
| `pg_prepared_statements` | Statements preparados na sessão: name, statement, prepare_time, parameter_types, generic_plans, custom_plans |
| `pg_cursors` | Cursors abertos na sessão: name, statement, is_holdable, is_binary, is_scrollable, creation_time |

### Views de Replicação e Extensões

| View | Propósito |
|---|---|
| `pg_replication_slots` | Slots: slot_name, plugin, slot_type (physical/logical), datoid, database, active, active_pid, xmin, catalog_xmin, restart_lsn, confirmed_flush_lsn, wal_status, safe_wal_size, two_phase |
| `pg_publication_tables` | Tabelas em publications: pubname, schemaname, tablename |
| `pg_replication_origin_status` | Status de origens de replicação: local_id, external_id, remote_lsn, local_lsn |
| `pg_available_extensions` | Extensões disponíveis para instalação: name, default_version, installed_version, comment |
| `pg_available_extension_versions` | Todas as versões de extensões: name, version, superuser, relocatable, schema, requires, comment |

### Views de Objetos do Banco

| View | Propósito |
|---|---|
| `pg_indexes` | Índices: schemaname, tablename, indexname, indexdef, tablespace |
| `pg_tables` | Tabelas: schemaname, tablename, tableowner, tablespace, hasindexes, hasrules, hastriggers, rowsecurity |
| `pg_views` | Views: schemaname, viewname, viewowner, definition |
| `pg_matviews` | Materialized views: schemaname, matviewname, matviewowner, definition, ispopulated |
| `pg_sequences` | Sequences: schemaname, sequencename, sequenceowner, data_type, start_value, min_value, max_value, increment_by, cycle, cache_size, last_value |
| `pg_rules` | Regras (rewrite rules): schemaname, tablename, rulename, definition |
| `pg_roles` | Roles (sem senha): rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolconnlimit, rolvaliduntil, rolbypassrls |
| `pg_user` | Usuários com login: usename, usesysid, usecreatedb, usesuper, userepl, usebypassrls, passwd (blanked), valuntil |
| `pg_group` | Grupos (roles sem login): groname, grosysid, grolist (array de members) |
| `pg_policies` | Políticas RLS: schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check |
| `pg_seclabels` | Security labels: objoid, classoid, objsubid, objtype, objnamespace, objname, provider, label |

### Views de Estatísticas do Planner

| View | Propósito |
|---|---|
| `pg_stats` | Estatísticas por coluna (legível): schemaname, tablename, attname, null_frac, avg_width, n_distinct, most_common_vals, most_common_freqs, histogram_bounds, correlation, most_common_elems, most_common_elem_freqs, elem_count_histogram |
| `pg_stats_ext` | Estatísticas multivariadas: schemaname, tablename, statistics_schema, statistics_name, statistics_owner, attnames, kinds, n_distinct, dependencies, most_common_vals, most_common_val_nulls, most_common_freqs, most_common_base_freqs |
| `pg_stats_ext_exprs` | Estatísticas de expressões: statistics_schema, statistics_name, tablename, expr_type, expr, null_frac, avg_width, n_distinct, most_common_vals, most_common_freqs, histogram_bounds, correlation |

### Views de Diagnóstico de Sistema

| View | Propósito |
|---|---|
| `pg_shmem_allocations` | Memória compartilhada alocada: name, off, size, allocated_size |
| `pg_shmem_allocations_numa` | Mapeamento NUMA para shared memory |
| `pg_wait_events` | Wait events disponíveis: type, name, description |
| `pg_backend_memory_contexts` | Contextos de memória do backend: name, ident, parent, level, total_bytes, total_nblocks, free_bytes, free_chunks, used_bytes |
| `pg_timezone_names` | Timezones: name, abbrev, utc_offset, is_dst |
| `pg_timezone_abbrevs` | Abreviações de timezone: abbrev, utc_offset, is_dst |
| `pg_aios` | Async IO handles em uso (PG 18+, novo) |

## 6. Wait Events — Diagnóstico de Contenção

Wait events indicam por que um backend está esperando. Consulte `pg_stat_activity.wait_event_type` e `pg_stat_activity.wait_event`.

**Categorias principais:**

| Categoria | Significado |
|---|---|
| `Activity` | Backend está ocioso ou fazendo algo (ex: AutoVacuumMain, BgWriterMain) |
| `IO` | Espera de I/O (leitura/escrita de disco, WAL) |
| `IPC` | Communication inter-processos (LWLock, espera por outro backend) |
| `Lock` | Aguardando lock de relação ou tupla |
| `LWLock` | Contenção em lightweight lock |
| `Timeout` | Aguardando timeout |

**Wait events comuns:**

| Wait Event | Categoria | Causa típica |
|---|---|---|
| `DataFileRead` | IO | Leitura de disco (cache miss) |
| `DataFileWrite` | IO | Escrita de dados |
| `WALWriteLock` | LWLock | Contenção em WAL (muitas transações pequenas) |
| `WALWrite` | IO | Escrita de WAL lenta |
| `WALInsertLock` | LWLock | Contenção em inserção de WAL |
| `RelationLock` | Lock | DDL concorrente (ALTER TABLE, etc.) |
| `TransactionidLock` | Lock | Contenção de linha (FOR UPDATE, etc.) |
| `ClientRead` | IPC | Aguardando dados do cliente |
| `ClientWrite` | IPC | Enviando dados ao cliente |
| `CheckpointDone` | Activity | Checkpoint em andamento |
| `CheckpointStart` | IPC | Aguardando checkpoint começar |
| `BufFileRead` | IO | Leitura de temp file (sort/hash em disco) |
| `BufFileWrite` | IO | Escrita de temp file |
| `PgSleep` | Activity | pg_sleep() |
| `AutoVacuumMain` | Activity | Processo autovacuum |
| `LogicalApplyMain` | Activity | Aplicação de replicação lógica |

📝 **Identificar gargalos:**

```sql
SELECT pid, wait_event_type, wait_event, state,
       left(query, 80) AS query_short,
       query_start, now() - query_start AS duration
FROM pg_stat_activity
WHERE wait_event IS NOT NULL
  AND state != 'idle'
ORDER BY duration DESC;
```

## 7. Consultas Práticas de Diagnóstico — Templates

### Top-level Diagnostics

```sql
-- Conexões ativas com query e wait_event
SELECT pid, datname, usename, application_name, client_addr,
       state, wait_event_type, wait_event,
       now() - query_start AS query_duration,
       left(query, 120) AS query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Locks que estão bloqueando outros
SELECT blocked.pid AS blocked_pid,
       blocked.query AS blocked_query,
       blocking.pid AS blocking_pid,
       blocking.query AS blocking_query
FROM pg_locks blocked
JOIN pg_stat_activity blocked_act ON blocked.pid = blocked_act.pid
JOIN pg_locks blocking ON blocking.locktype = blocked.locktype
  AND blocking.database = blocked.database
  AND blocking.relation = blocked.relation
  AND blocking.pid != blocked.pid
JOIN pg_stat_activity blocking_act ON blocking.pid = blocking_act.pid
WHERE NOT blocked.granted
  AND blocking.granted;

-- Queries mais lentas (requer pg_stat_statements)
SELECT queryid, left(query, 80) AS query,
       calls, round(total_exec_time::numeric, 2) AS total_ms,
       round(mean_exec_time::numeric, 2) AS avg_ms,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 1) AS pct
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 20;
```

### Database Health

```sql
-- Tamanho do banco de dados
SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
ORDER BY pg_database_size(datname) DESC;

-- Idade do frozen XID (risco de wraparound)
SELECT datname,
       age(datfrozenxid) AS xid_age,
       round(100.0 * age(datfrozenxid) / 2000000000, 1) AS pct_wraparound
FROM pg_database
ORDER BY age(datfrozenxid) DESC;

-- Idade por tabela (top 10)
SELECT n.nspname, c.relname,
       age(c.relfrozenxid) AS xid_age,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'm', 'p')
ORDER BY age(c.relfrozenxid) DESC
LIMIT 10;
```

### Replication

```sql
-- Lag de replicação
SELECT pid, application_name, client_addr, state,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn)) AS write_lag_bytes,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) AS flush_lag_bytes,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS replay_lag_bytes,
       sync_state
FROM pg_stat_replication;

-- Slots de replicação
SELECT slot_name, slot_type, database, active, restart_lsn,
       confirmed_flush_lsn, wal_status, safe_wal_size
FROM pg_replication_slots;

-- Arquivos WAL gerados vs arquivados
SELECT archived_count,
       pg_stat_get_wal()::int8 AS wal_segments_generated,
       round(100.0 * archived_count / NULLIF(pg_stat_get_wal(), 0), 1) AS archiving_pct,
       last_archived_wal, last_archived_time, failed_count
FROM pg_stat_archiver;
```

### Performance

```sql
-- Cache hit ratio por database
SELECT datname,
       round(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) AS cache_hit_ratio,
       blks_read, blks_hit
FROM pg_stat_database
WHERE datname NOT IN ('template0', 'template1')
ORDER BY cache_hit_ratio;

-- Checkpoints
SELECT checkpoints_timed, checkpoints_req,
       round(100.0 * checkpoints_req / NULLIF(checkpoints_timed + checkpoints_req, 0), 1) AS req_pct,
       buffers_checkpoint, buffers_clean, buffers_backend,
       pg_size_pretty(wal_bytes::numeric) AS wal_written
FROM pg_stat_bgwriter, pg_stat_wal;

-- Autovacuum progress
SELECT pid, datname, relname, phase,
       heap_blks_total, heap_blks_scanned, heap_blks_vacuumed,
       index_vacuum_count, max_dead_tuple_bytes
FROM pg_stat_progress_vacuum;

-- Temp files
SELECT datname, temp_files, pg_size_pretty(temp_bytes::numeric) AS temp_size
FROM pg_stat_database
WHERE temp_files > 0
ORDER BY temp_bytes DESC;
```

## 8. Wait Events — Armadilhas Comuns

- 🛑 `pg_class.reltuples` pode estar **desatualizado** — VACUUM/ANALYZE são necessários para atualizar
- 🛑 `pg_stats` não contém valores exatos — é uma **amostragem** do ANALYZE
- 🛑 `information_schema` **não vê objetos do sistema** (catálogos pg_*)
- 🛑 `pg_locks` sem filtro `granted=false` mostra **todos** os locks, inclusive os concedidos; os que estão em espera têm `granted = false`
- 🛑 `pg_stat_activity.query` mostra apenas a **query corrente** — não a query anterior quando o estado é `idle in transaction`
- 🛑 `pg_stat_statements` vs `pg_stat_activity`: propósitos diferentes — um é cumulativo histórico, outro é estado atual
- 🛑 Wait events **mudam entre versões** do PG — sempre consulte `pg_wait_events` para a lista atual
- 🛑 `pg_stat_user_tables.n_dead_tup` não conta tuplas mortas em **índices** — só no heap
- 🛑 `pg_statistic` é binário e não seguro para consulta direta — use `pg_stats` (que trata os valores de forma legível)
- 🛑 `pg_stat_archiver.failed_count` só conta falhas desde o último reset — não é um contador contínuo
- 🛑 Estatísticas cumulativas (`pg_stat_*`) podem ser resetadas com `pg_stat_reset()` — monitore se houve reset recente
- 🛑 `pg_locks` não mostra locks de relações em memória que foram descartadas — consulte `pg_class.oid` correspondente
- 🛑 `pg_stat_progress_*` views só têm dados enquanto a operação está em andamento — uma vez finalizada, somem
- 🛑 Locks `fastpath` em `pg_locks` não têm linhas no pg_locks para locks de relação simples (otimização) — para ver todos, set `track_activity_query_size`
