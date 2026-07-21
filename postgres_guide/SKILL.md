# PostgreSQL 18.4 — Skill para Agentes de IA

## Versão Alvo

PostgreSQL **18.4**. Guia completo em `postgres_guide/*.md` (~9.610 linhas).

## Escopo

Esta skill capacita agentes de IA a gerar, revisar e otimizar código PostgreSQL usando **padrões modernos e segurança de dados**, conforme compilado da documentação oficial.

## Princípios Cardinais (NÃO VIOLAR)

1. **Durabilidade**: `fsync=on`, `full_page_writes=on`, `wal_level=replica`, `synchronous_commit=on` — defaults por boas razões. Qualquer alteração requer justificativa explícita.
2. **Privilégio Mínimo**: roles pré-definidas (pg_read_all_data, pg_write_all_data) em vez de superuser. RLS como camada adicional.
3. **Autovacuum é Crítico**: wraparound causa perda total. Monitore `age(relfrozenxid)`. NUNCA desligar.
4. **Backup não testado não existe**: WAL archiving + pg_basebackup + teste de restore obrigatórios.
5. **SCRAM-SHA-256 é o padrão**: MD5 deprecated. `password_encryption = 'scram-sha-256'`.
6. **Visualizações sensíveis precisam de `security_barrier`** para evitar data leakage via funções de custo artificial.
7. **SECURITY DEFINER exige `SET search_path`** para prevenir ataques de trojan via schema público.
8. **Identity Columns substituem SERIAL**.
9. **SSL no cliente**: `sslmode=prefer` (default) NÃO protege contra MITM. Produção exige `verify-full`.
10. **systemd RemoveIPC** corrompe dados — crie usuário postgres como `useradd -r`.

## Convenções de Código

| Símbolo | Significado |
|---------|------------|
| `✅` | Padrão moderno recomendado |
| `⚠️` | Atenção: risco de segurança/perda de dados |
| `🛑` | Antipadrão: NÃO usar |
| `📝` | Exemplo prático |
| `🔍` | Detalhe de implementação |

## Decision Framework

### Ao receber uma solicitação de código PostgreSQL:

1. **Identificar o padrão**: A solicitação usa patterns modernos ou legados?
2. **Aplicar substituições automáticas**:

| Legado/Errado | ✅ Moderno/Correto |
|---------------|-------------------|
| `SERIAL` | `integer GENERATED ALWAYS AS IDENTITY` |
| `varchar(255)` sem motivo | `text` (+ `CHECK` se necessário) |
| `float` para dinheiro | `numeric(12,2)` |
| `timestamp` sem tz | `timestamptz` |
| `json` para consultas | `jsonb` + GIN |
| `char(n)` | `text` ou `varchar` |
| Tabela sem PK | `GENERATED ALWAYS AS IDENTITY PRIMARY KEY` |
| FK sem índice | Indexar toda FK |
| `SELECT *` em produção | Colunas explícitas |
| `OFFSET` grande | Keyset pagination |
| `sslmode=prefer` | `sslmode=verify-full` + `sslrootcert=system` |
| `md5` | `scram-sha-256` |
| `trust` | `scram-sha-256` ou `peer` |
| `search_path` padrão em SECURITY DEFINER | `SET search_path = pg_catalog, pg_temp` |
| `run_as_owner = true` (subscription) | `run_as_owner = false` |
| `FOR EACH ROW` para auditoria em lote | `FOR EACH STATEMENT` + transition tables |
| `INSERT ... ON CONFLICT` complexo | `MERGE` (PG 15+) |
| `CASE WHEN` dentro de agregado | `count(*) FILTER (WHERE ...)` |
| CTE sem `NOT MATERIALIZED` | Considerar `NOT MATERIALIZED` |
| `VACUUM FULL` em produção | `pg_repack` ou `VACUUM` normal |
| REINDEX sem `CONCURRENTLY` | `REINDEX ... CONCURRENTLY` |
| `uuid_generate_v4()` | `gen_random_uuid()` |
| `dblink` | `postgres_fdw` |

3. **Verificar segurança**:
   - [`SECURITY DEFINER`] → `SET search_path = pg_catalog, pg_temp` + qualificar esquemas
   - [`RLS`] → `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
   - [`View`] → `WITH (security_barrier)` se contém dados sensíveis
   - [`Função`] → volatilidade correta: `IMMUTABLE`, `STABLE`, ou `VOLATILE`
   - [`Senha`] → nunca em texto plano; usar crypt() + gen_salt('bf')
   - [`Conexão cliente`] → `sslmode=verify-full`, `channel_binding=require`

4. **Verificar performance**:
   - Índices: B-tree (default), BRIN (dados correlacionados), GIN (jsonb/array/text), GiST (geo/range)
   - Partial indexes para subsets comuns
   - INCLUDE columns para index-only scans
   - `EXPLAIN (ANALYZE, BUFFERS, TIMING)` para diagnóstico
   - FK sempre indexada

## Regras por Contexto

### DDL (ver `01-ddl-modelagem.md`)
- Identity columns sobre SERIAL
- `timestamptz` SEMPRE (nunca timestamp)
- `jsonb` + GIN sobre json
- `text` sobre varchar(n) sem motivo
- `numeric` para financeiro
- Particionamento declarativo (RANGE, LIST, HASH)
- Nomear constraints (`pk_`, `fk_`, `uq_`, `ck_`)
- Exclusion constraints para ranges sobrepostos

### DML (ver `02-dml-consultas.md`)
- `RETURNING` em vez de `lastval()`
- `MERGE` para upserts complexos (PG 15+)
- CTEs: `NOT MATERIALIZED` se usada 1x (PG 12+)
- Window functions + `FILTER` sobre subqueries
- Keyset pagination sobre `OFFSET`
- `LATERAL` para top-N por grupo
- `COPY` para grandes volumes

### Transactions (ver `03-transactions-concorrencia.md`)
- `READ COMMITTED` para OLTP (default)
- `FOR UPDATE SKIP LOCKED` para filas concorrentes
- Otimistic locking com coluna `version`
- Procedures (`CALL`) para COMMIT em lote
- Ordem consistente de locks para evitar deadlocks

### Segurança (ver `04-seguranca-dados.md`)
- Roles pré-definidas (`pg_read_all_data`, etc.) em vez de superuser
- `scram-sha-256` com `password_encryption`
- RLS com `FORCE ROW LEVEL SECURITY`
- `security_barrier` em views
- `SECURITY DEFINER` + `SET search_path`
- Certificado: verificar permissão 0600 na chave

### Backup (ver `05-backup-pitr.md`)
- `wal_level=replica` + `archive_mode=on`
- WAL archiving com archive_timeout=60
- pg_basebackup diário + pg_verifybackup
- Teste de restore semanal (obrigatório)

### Configuração (ver `06-configuracao-producao.md`)
- `shared_buffers`: 25% RAM (máx 40%)
- `work_mem`: conservador (calcular: RAM / max_connections)
- `wal_compression=lz4`
- Autovacuum: scale_factor=0.05, freeze_max_age=500M
- `track_io_timing=on`, `compute_query_id=on`
- `log_min_duration_statement=1000`

### Server Programming (ver `07-server-programming.md`)
- `SECURITY DEFINER` + `SET search_path = pg_catalog, pg_temp`
- Transition tables (`FOR EACH STATEMENT`) sobre `FOR EACH ROW` em lote
- `SELECT INTO STRICT` para garantir 1 linha
- `EXECUTE ... USING` (nunca concatenar)
- Volatilidade correta: `IMMUTABLE`/`STABLE`/`VOLATILE`
- `CALL` para procedures, `SELECT` para functions

### Replicação (ver `11-ha-replicacao.md`)
- Role dedicada com `REPLICATION` (não superuser)
- `wal_log_hints=on` + `data_checksums=on` (pg_rewind)
- `run_as_owner=false` em subscriptions
- STONITH obrigatório (split-brain)
- `max_connections` >= na standby

### Cliente (ver `10-client-security.md`)
- `sslmode=verify-full` com `sslrootcert=system`
- `channel_binding=require`
- `require_auth=scram-sha-256`
- `.pgpass` com permissão 0600
- NUNCA usar `PGPASSWORD` em produção
- `search_path` limpo: `options=-csearch_path=`

## Anti-Patterns Mortais (NUNCA)

| Antipadrão | Consequência |
|-----------|-------------|
| `fsync=off` | Corrupção irreversível em crash |
| `full_page_writes=off` | Páginas corrompidas pós crash |
| autovacuum desligado | Wraparound → perda total |
| `wal_level=minimal` | PITR impossível |
| superuser para app | Acesso total irrestrito |
| `sslmode=prefer` | MITM sem proteção |
| `search_path` padrão em SECURITY DEFINER | Trojan no schema público |
| `SERIAL` | Não respeita GRANT, sequência pública |
| View sem `security_barrier` | Vazamento via funções baratas |
| `trust` em pg_hba.conf | Conexão sem senha |
| `md5` | Hash quebrado, deprecated |
| `synchronous_commit=off` sem entender risco | Perde transações em crash do DB |

## Exemplo Rápido (DDL Moderno Mínimo)

```sql
CREATE TABLE exemplo (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome text NOT NULL,
    email text NOT NULL UNIQUE,
    metadata jsonb DEFAULT '{}'::jsonb,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    versao integer DEFAULT 1 NOT NULL
);

CREATE INDEX idx_exemplo_meta ON exemplo USING gin (metadata jsonb_path_ops);
CREATE UNIQUE INDEX idx_exemplo_email_lower ON exemplo (lower(email));

ALTER TABLE exemplo ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemplo FORCE ROW LEVEL SECURITY;
```

## Consulta de Diagnóstico Essencial

```sql
SELECT 'xid_age' AS metric, max(age(relfrozenxid))::text AS value
FROM pg_class WHERE relkind IN ('r', 'm')
UNION ALL
SELECT 'bloat_pct', COALESCE(max(round(n_dead_tup::numeric/NULLIF(n_live_tup,0)*100,2))::text,'0')
FROM pg_stat_user_tables WHERE n_live_tup > 0
UNION ALL
SELECT 'cache_hit', round(100.0*blks_hit/NULLIF(blks_hit+blks_read,0),2)::text
FROM pg_stat_database WHERE datname = current_database()
UNION ALL
SELECT 'archiver_fail', count(*)::text
FROM pg_stat_archiver WHERE last_failed_time > now() - interval '1 hour';
```

## Referência Rápida por Guia

| Guia | Tópico | Comandos-chave |
|------|--------|---------------|
| 01 | DDL | `GENERATED AS IDENTITY`, `PARTITION BY`, `jsonb`, `DOMAIN` |
| 02 | DML | `MERGE`, `RETURNING`, `FILTER`, `LATERAL`, `keyset` |
| 03 | Transações | `FOR UPDATE SKIP LOCKED`, `SERIALIZABLE`, advisory locks |
| 04 | Segurança | `RLS`, `SECURITY DEFINER`, `security_barrier`, `SCRAM` |
| 05 | Backup | `pg_basebackup`, `pg_verifybackup`, WAL archiving, PITR |
| 06 | Config | `shared_buffers`, `autovacuum`, `wal_compression`, `track_io_timing` |
| 07 | Programação | Transition tables, `STRICT`, `EXECUTE ... USING`, volatilidade |
| 08 | Índices | BRIN, GIN, partial, INCLUDE, GiST |
| 09 | Manutenção | `VACUUM`, `REINDEX CONCURRENTLY`, wraparound, `pg_stat_*` |
| 10 | Cliente | `sslmode=verify-full`, `require_auth`, `channel_binding`, `.pgpass` |
| 11 | HA | Streaming sync/async, pg_rewind, logical replication |
| 12 | Kernel | RemoveIPC, OOM, huge pages, pg_upgrade, initdb |
| 13 | Funções | `gen_random_uuid()`, `date_bin`, `jsonb_path_query`, FILTER |
| 14 | Extensões | `pg_stat_statements`, `amcheck`, `postgres_fdw`, `pg_prewarm` |
| 15 | Avançado | PL/Python, Background Workers, SPI, Logical Decoding |
| 16 | Catálogo | `information_schema`, `pg_class`, `pg_stats`, `pg_stat_activity` |
| 17 | Tipos | `bytea`, `inet`, `range`, `composite`, OID, type conversion |
| 18 | Ferramentas | `pgbench`, `pg_waldump`, `pg_controldata`, progress reporting |
| 19 | Internals | Page layout, TOAST, FSM, VM, HOT, WAL, XID, Index AM |
