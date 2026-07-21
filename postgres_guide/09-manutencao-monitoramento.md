# Manutenção e Monitoramento

Baseado em: `03-Server-Administration/maintenance.html`, `routine-vacuuming.html`, `routine-reindex.html`, `monitoring-*.html`, `runtime-config-vacuum.html`, `runtime-config-logging.html`

---

## 1. VACUUM — Essencial e Crítico

### Propósitos

1. **Recuperar espaço** de tuplas mortas (UPDATE/DELETE)
2. **Atualizar visibility map** (index-only scans)
3. **Prevenir wraparound** — ⚠️ causa perda total de dados
4. **Atualizar estatísticas** (com VACUUM ANALYZE)

### Tipos

```sql
VACUUM;                          -- padrão, não retorna espaço ao SO
VACUUM ANALYZE;                  -- vacuum + stats
VACUUM FREEZE;                   -- força freezing de XIDs
VACUUM VERBOSE;                  -- log detalhado
VACUUM FULL;                     -- 🛑 REQUER ACCESS EXCLUSIVE LOCK
-- VACUUM FULL reconstrói a tabela, libera espaço ao SO
-- NUNCA fazer em produção ativa (bloqueia tudo)
```

### Comandos de Manutenção

```bash
# Vacuum em todas as databases
vacuumdb --all --analyze --jobs=4
```

⚠️ **Wraparound Catastrófico**: quando `age(relfrozenxid)` atinge ~2 bilhões, o PostgreSQL para de aceitar transações. Todo o banco fica read-only. O único remédio é conectar em modo single-user e executar VACUUM.

### Monitoramento de Wraparound

```sql
-- Databases mais próximas do wraparound
SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;

-- Tabelas mais próximas do wraparound
SELECT relname, relfrozenxid, age(relfrozenxid)
FROM pg_class WHERE relkind IN ('r', 'm')
ORDER BY age(relfrozenxid) DESC LIMIT 10;

-- Alertas
-- > 40M transações restantes: WARNING
-- > 3M transações restantes: ERROR (server para)
```

---

## 2. Autovacuum — Configuração Fina

```conf
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 30s              # frequência de verificação
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.05  # mais agressivo que default 0.2
autovacuum_vacuum_insert_threshold = 1000
autovacuum_vacuum_insert_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.02
autovacuum_vacuum_cost_delay = 2ms    # pausa para reduzir I/O
autovacuum_vacuum_cost_limit = -1     # usa vacuum_cost_limit (200)
autovacuum_freeze_max_age = 500000000
```

### Ajuste por Tabela

```sql
-- Tabela com alta taxa de UPDATE/DELETE
ALTER TABLE pedidos SET (autovacuum_vacuum_scale_factor = 0.01,
                         autovacuum_vacuum_threshold = 100);

-- Tabela de log (só INSERT, sem UPDATE/DELETE)
ALTER TABLE logs_auditoria SET (autovacuum_vacuum_scale_factor = 0,
                                autovacuum_vacuum_threshold = 1000000);
```

---

## 3. REINDEX — Reconstrução de Índices

```sql
-- ✅ CONCURRENTLY (PG 12+) — sem bloquear escritas
REINDEX TABLE CONCURRENTLY tabela;

-- ⚠️ Sem CONCURRENTLY — bloqueia escritas
REINDEX INDEX nome_index;
REINDEX TABLE nome_tabela;
REINDEX DATABASE nome_db;
REINDEX SCHEMA nome_schema;
```

📝 **Quando reindexar:**
- Índices com bloat (>30% dead tuples)
- Após atualização de versão do PG
- Se `pg_stat_user_indexes` mostra `idx_scan` zero para índices esperados

---

## 4. Monitoramento — pg_stat_*

### Views Essenciais

```sql
-- Sessões ativas
SELECT pid, usename, application_name, state, query, now() - query_start AS duration
FROM pg_stat_activity WHERE state != 'idle';

-- Locks aguardando
SELECT relation::regclass, mode, pid, pg_blocking_pids(pid), granted
FROM pg_locks WHERE NOT granted;

-- Bloat (dead tuples)
SELECT schemaname, tablename, n_dead_tup, n_live_tup,
       CASE WHEN n_live_tup > 0
         THEN round(n_dead_tup::numeric / n_live_tup * 100, 2)
         ELSE 0 END AS dead_pct
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;

-- Tamanho das tabelas
SELECT relname, pg_size_pretty(pg_total_relation_size(oid))
FROM pg_class WHERE relkind IN ('r', 'm') ORDER BY pg_total_relation_size(oid) DESC;

-- Status do WAL archiving
SELECT * FROM pg_stat_archiver;

-- Replicação lag
SELECT application_name, state, replay_lag, write_lag, flush_lag
FROM pg_stat_replication;

-- Performance de índices
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes ORDER BY idx_scan ASC;
```

### pg_stat_statements — Top Queries

```sql
CREATE EXTENSION pg_stat_statements;

SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 20;
```

---

## 5. Monitoramento de Disco

```sql
-- Tamanho da database
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Espaço livre em tablespace
SELECT * FROM pg_tablespace_size('pg_default');

-- Previsão de crescimento
SELECT relname,
       pg_size_pretty(pg_total_relation_size(oid)) AS tamanho,
       n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
JOIN pg_class ON pg_class.oid = pg_stat_user_tables.relid
ORDER BY pg_total_relation_size(oid) DESC;
```

---

## 6. Logs — Configuração para Diagnóstico

```conf
# O que logar
log_checkpoints = on               # monitorar intervalos
log_lock_waits = on                # detectar deadlocks
log_temp_files = 0                 # arquivos temporários > 0KB
log_connections = on
log_disconnections = on
log_duration = on
log_min_duration_statement = 1000  # slow queries
log_statement = 'ddl'             # ou 'mod' para mais detalhes
```

```sql
-- Últimos logs de erro
SELECT * FROM pg_stat_activity WHERE state = 'active' AND query LIKE 'ERROR%';
-- ou consultar CSV log diretamente
```

---

## 7. CLUSTER — Reordenação Física

```sql
-- Reordenar tuplas na mesma ordem de um índice
CLUSTER pedidos USING idx_pedidos_data;
```

⚠️ **Requer ACCESS EXCLUSIVE LOCK**. Benefício principal: melhora compressão BRIN e performance de range scans. Deve ser executado em janela de manutenção.

---

## 8. Alerta e Monitoramento Automático

### Script de Checkup Diário

```sql
-- 1. Conexões
SELECT 'conexoes', count(*) FROM pg_stat_activity;

-- 2. Wraparound
SELECT 'max_age', max(age(relfrozenxid)) FROM pg_class WHERE relkind IN ('r', 'm');

-- 3. Bloat
SELECT 'max_bloat_pct', max(round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2))
FROM pg_stat_user_tables WHERE n_live_tup > 0;

-- 4. Replicação lag
SELECT 'max_replay_lag', max(replay_lag) FROM pg_stat_replication;

-- 5. Archiver
SELECT 'archiving_failed', count(*) FROM pg_stat_archiver
WHERE last_failed_time IS NOT NULL AND last_failed_time > now() - interval '1 hour';

-- 6. Slow queries
SELECT count(*) AS slow_queries FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 minutes';
```

---

## 9. Plano de Manutenção Recomendado

| Frequência | Tarefa |
|------------|--------|
| **A cada hora** | Verificar `pg_stat_archiver` (WAL archiving funcionando?) |
| | Verificar replicação lag (`pg_stat_replication`) |
| **Diário** | Verificar `age(relfrozenxid)` |
| | Verificar bloat (> 30% estudar tabela) |
| | Rodar `vacuumdb --analyze` (se não usar autovacuum) |
| **Semanal** | Verificar crescimento de disco e tabelas |
| | Verificar índices não usados |
| **Mensal** | `REINDEX TABLE CONCURRENTLY` em tabelas com bloat |
| | Teste de restore do backup |
| **Trimestral** | Revisar configurações conforme workload |
| | Verificar logs por warnings de checkpoint/config |
| | Ajustar `autovacuum_*` por tabela se necessário |
| **Anual** | Planejar upgrade de versão |
| | Revisar grants e permissões |

---

## 10. Armadilhas Comuns

| 🛑 Problema | Risco | ✅ Solução |
|-------------|-------|-----------|
| Autovacuum desligado | Wraparound → perda total | Ligar autovacuum |
| VACUUM FULL em produção | BLOCAIA tudo (ACCESS EXCLUSIVE) | pg_repack ou VACUUM normal |
| Não monitorar wraparound | Desastre silencioso | Alerta em age(relfrozenxid) > 1.5B |
| Índices sem manutenção | Bloat, performance degrada | REINDEX CONCURRENTLY periódico |
| Apenas VACUUM sem ANALYZE | Planos ruins | VACUUM ANALYZE ou vacuumdb --analyze |
| `log_min_duration_statement = 0` | Loga TUDO, enche disco | Ajustar para 500-1000ms |
| `track_io_timing = off` | Sem diagnóstico de I/O | Ligar (overhead ~5%) |
| Sem pg_stat_statements | Cego para queries problemáticas | Configurar shared_preload_libraries |
