# PostgreSQL Modern Implementation — Projeto "E-Commerce Platform"

Este exemplo completo une **todas as boas práticas** do guia em um projeto real de e-commerce. Cada seção referencia os guias relevantes.

---

## 1. DDL — Modelagem Moderna

Ref: `01-ddl-modelagem.md`

```sql
-- ============================================================
-- SCHEMA: Domínios e Schemas Organizados
-- ============================================================
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS audit;

-- Domínios reutilizáveis (substitui CHECK repetitivos)
CREATE DOMAIN commerce.email AS text
    CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

CREATE DOMAIN commerce.currency AS numeric(12,2)
    CHECK (VALUE >= 0);

CREATE DOMAIN commerce.phone AS text
    CHECK (VALUE ~ '^\+?[1-9]\d{1,14}$');

-- ============================================================
-- TABELAS: Identity Columns, JSONB, Generated Columns
-- ============================================================

CREATE TABLE commerce.customers (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    external_id uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    name text NOT NULL,
    email commerce.email NOT NULL UNIQUE,
    phone commerce.phone,
    metadata jsonb DEFAULT '{}'::jsonb,
    full_name text GENERATED ALWAYS AS (name) STORED,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commerce.products (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    category_id integer NOT NULL,
    price commerce.currency NOT NULL,
    cost commerce.currency,
    attributes jsonb DEFAULT '{}'::jsonb,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Particionamento por range (pedidos por mês)
CREATE TABLE commerce.orders (
    id bigint GENERATED ALWAYS AS IDENTITY,
    customer_id bigint NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    total commerce.currency NOT NULL DEFAULT 0,
    shipping_address jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Partições mensais (criadas via manutenção programada)
CREATE TABLE commerce.orders_2026_06 PARTITION OF commerce.orders
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE commerce.orders_2026_07 PARTITION OF commerce.orders
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE commerce.orders_2026_08 PARTITION OF commerce.orders
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- ============================================================
-- ÍNDICES OTIMIZADOS
-- ============================================================

-- B-tree multicoluna para queries comuns
CREATE INDEX idx_orders_customer ON commerce.orders (customer_id, created_at DESC);

-- BRIN para dados com correlação temporal (imenso ganho de espaço)
CREATE INDEX idx_orders_brin ON commerce.orders USING brin (created_at)
    WITH (pages_per_range = 32);

-- GIN para JSONB
CREATE INDEX idx_products_attrs ON commerce.products USING gin (attributes jsonb_path_ops);
CREATE INDEX idx_customers_meta ON commerce.customers USING gin (metadata);

-- Partial index: apenas pedidos pendentes
CREATE INDEX idx_orders_pending ON commerce.orders (created_at)
    WHERE status = 'pending';

-- INCLUDE columns (covering index) para index-only scan
CREATE INDEX idx_orders_list ON commerce.orders (customer_id, created_at DESC)
    INCLUDE (status, total);

-- ============================================================
-- CONSTRAINTS: Nomeadas, FK com índices, Exclusion Constraints
-- ============================================================

CREATE TABLE commerce.order_items (
    id bigint GENERATED ALWAYS AS IDENTITY,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price commerce.currency NOT NULL,
    CONSTRAINT pk_order_items PRIMARY KEY (order_id, id)
);

-- FK nomeada + índice automático
CREATE INDEX fk_oi_product ON commerce.order_items (product_id);
ALTER TABLE commerce.order_items ADD CONSTRAINT fk_oi_order
    FOREIGN KEY (order_id) REFERENCES commerce.orders(id)
    ON DELETE CASCADE;
ALTER TABLE commerce.order_items ADD CONSTRAINT fk_oi_product
    FOREIGN KEY (product_id) REFERENCES commerce.products(id)
    ON DELETE RESTRICT;

-- Exclusion constraint: evitar dupla reserva do mesmo item (exemplo)
CREATE TABLE commerce.inventory_reservations (
    product_id bigint NOT NULL,
    order_id bigint NOT NULL,
    period tstzrange NOT NULL,
    EXCLUDE USING gist (product_id WITH =, period WITH &&)
);

-- ============================================================
-- DADOS DE CATÁLOGO (ENUM vs Lookup Table)
-- ============================================================
-- ENUM: valores fixos (workflow de pedidos)
CREATE TYPE commerce.order_status AS ENUM (
    'pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'
);

-- Lookup table: catálogo mutável
CREATE TABLE commerce.categories (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    parent_id integer REFERENCES commerce.categories(id),
    active boolean NOT NULL DEFAULT true
);
```

---

## 2. DML — Consultas Modernas

Ref: `02-dml-consultas.md`

```sql
-- ============================================================
-- INSERT com RETURNING + OVERRIDING
-- ============================================================
INSERT INTO commerce.customers (name, email, phone)
VALUES ('Maria Silva', 'maria@example.com', '+5511999999999')
RETURNING id, external_id, created_at;

-- Forçar ID em identity column (OVER riding)
INSERT INTO commerce.customers (id, name, email)
    OVERRIDING SYSTEM VALUE
VALUES (999999, 'Admin', 'admin@example.com');

-- ============================================================
-- MERGE (PG 15+) — Upsert padronizado
-- ============================================================
MERGE INTO commerce.inventory_reservations AS t
USING (VALUES (1, 100, tstzrange('2026-07-21', '2026-07-22'))) AS s(product_id, order_id, period)
ON t.product_id = s.product_id AND t.period && s.period
WHEN MATCHED THEN
    DO NOTHING
WHEN NOT MATCHED THEN
    INSERT (product_id, order_id, period)
    VALUES (s.product_id, s.order_id, s.period);

-- ============================================================
-- UPDATE com FROM (join)
-- ============================================================
UPDATE commerce.orders o
SET total = sub.total
FROM (
    SELECT order_id, sum(quantity * unit_price) AS total
    FROM commerce.order_items
    GROUP BY order_id
) sub
WHERE o.id = sub.order_id
RETURNING o.id, o.total;

-- ============================================================
-- CTE Recursiva + NOT MATERIALIZED
-- ============================================================
WITH RECURSIVE cat_tree AS NOT MATERIALIZED (
    SELECT id, name, parent_id, 1 AS level
    FROM commerce.categories
    WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, c.parent_id, ct.level + 1
    FROM commerce.categories c
    JOIN cat_tree ct ON ct.id = c.parent_id
)
SELECT * FROM cat_tree;

-- ============================================================
-- Window Functions + FILTER
-- ============================================================
SELECT
    customer_id,
    count(*) FILTER (WHERE status = 'paid') AS paid_orders,
    count(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
    sum(total) FILTER (WHERE status = 'paid') AS revenue,
    row_number() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn
FROM commerce.orders
GROUP BY customer_id;

-- ============================================================
-- Keyset Pagination (evita OFFSET)
-- ============================================================
SELECT id, name, email, created_at
FROM commerce.customers
WHERE (created_at, id) < ('2026-07-20', 50000)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- ============================================================
-- LATERAL: Top-N por grupo
-- ============================================================
SELECT c.name, o.id, o.total, o.created_at
FROM commerce.customers c
CROSS JOIN LATERAL (
    SELECT id, total, created_at
    FROM commerce.orders
    WHERE customer_id = c.id AND status = 'paid'
    ORDER BY total DESC
    LIMIT 3
) o;
```

---

## 3. Transactions e Concorrência

Ref: `03-transactions-concorrencia.md`

```sql
-- ============================================================
-- Otimistic Locking (versão)
-- ============================================================
-- 1. Ler versão
SELECT id, name, email, version FROM commerce.customers WHERE id = 42;
-- 2. Atualizar com check de versão
UPDATE commerce.customers
SET name = 'Novo Nome', email = 'novo@email.com', version = version + 1, updated_at = now()
WHERE id = 42 AND version = 3;
-- Se 0 rows → conflito → retry

-- ============================================================
-- Pessimistic Locking + SKIP LOCKED (fila de workers)
-- ============================================================
BEGIN;

SELECT id, payload
FROM commerce.jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- processar...
UPDATE commerce.jobs SET status = 'done' WHERE id = ?;

COMMIT;

-- ============================================================
-- SERIALIZABLE (apenas quando necessário)
-- ============================================================
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- Transações críticas com detecção de dependências
-- Retry obrigatório em erro "could not serialize access"
COMMIT;
```

---

## 4. Segurança de Dados

Ref: `04-seguranca-dados.md`, `10-client-security.md`

```sql
-- ============================================================
-- Roles com Privilégio Mínimo
-- ============================================================
CREATE ROLE app_web LOGIN PASSWORD 'senha_segura_aqui'
    CONNECTION LIMIT 50;
GRANT pg_read_all_data TO app_web;
GRANT pg_write_all_data TO app_web;

CREATE ROLE analyst LOGIN PASSWORD 'senha_analista'
    CONNECTION LIMIT 5;
GRANT pg_read_all_data TO analyst;

CREATE ROLE support_agent LOGIN PASSWORD 'senha_support';
GRANT pg_read_all_data TO support_agent;

-- ============================================================
-- RLS (Row-Level Security) — Isolamento Multi-tenant
-- ============================================================
ALTER TABLE commerce.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.customers FORCE ROW LEVEL SECURITY;

CREATE POLICY customers_self ON commerce.customers
    FOR ALL
    USING (email = current_user)
    WITH CHECK (email = current_user);

ALTER TABLE commerce.orders ENABLE ROW LEVEL SECURITY;

-- Suporte vê pedidos de clientes que atendem
CREATE POLICY orders_support ON commerce.orders
    FOR SELECT
    USING (customer_id IN (
        SELECT id FROM commerce.customers WHERE support_agent = current_user
    ));

-- ============================================================
-- Security Barrier View (previne vazamento)
-- ============================================================
CREATE VIEW commerce.products_public WITH (security_barrier) AS
    SELECT id, sku, name, description, price, attributes
    FROM commerce.products
    WHERE active = true;

-- ============================================================
-- pg_hba.conf moderno
-- ============================================================
-- local   all   postgres           peer
-- hostssl all  app_web  10.0.0.0/8   scram-sha-256
-- hostssl all  analyst  10.0.0.0/8   scram-sha-256
-- hostssl all  support_agent 10.0.0.0/8 scram-sha-256
-- hostnossl all all 0.0.0.0/0 reject

-- ============================================================
-- SCRAM-SHA-256 obrigatório
-- ============================================================
-- password_encryption = 'scram-sha-256'
-- ALTER ROLE app_web PASSWORD 'nova_senha';
```

---

## 5. Configuração de Produção

Ref: `06-configuracao-producao.md`

```ini
# postgresql.conf — Servidor 32GB RAM, 200 conexões

# Durabilidade (NUNCA alterar em produção)
fsync = on
full_page_writes = on
wal_level = replica
synchronous_commit = on
data_checksums = on

# Memória
shared_buffers = 8GB            # 25% de 32GB
huge_pages = try
effective_cache_size = 24GB     # 75% de 32GB
work_mem = 16MB
hash_mem_multiplier = 2.0
maintenance_work_mem = 1GB
autovacuum_work_mem = -1

# WAL
wal_buffers = -1                # automático (~3% shared_buffers)
wal_compression = lz4
wal_log_hints = on
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
archive_timeout = 60

# Conexões
listen_addresses = 'localhost'
port = 5432
max_connections = 200
superuser_reserved_connections = 3
password_encryption = 'scram-sha-256'
ssl = on

# Autovacuum (CRÍTICO — NUNCA desligar)
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 30s
autovacuum_vacuum_scale_factor = 0.05
autovacuum_vacuum_insert_threshold = 1000
autovacuum_analyze_scale_factor = 0.02
autovacuum_freeze_max_age = 500000000

# Ajuste por tabela (exemplo: tabela de log com alta inserção)
ALTER TABLE commerce.orders SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_vacuum_threshold = 1000
);

# Logging
log_destination = 'csvlog'
logging_collector = on
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_min_duration_statement = 1000
log_statement = 'ddl'
log_line_prefix = '%m [%p] %q%u@%d '

# Monitoramento
track_io_timing = on
track_functions = 'all'
track_wal_io_timing = on
compute_query_id = on
shared_preload_libraries = 'pg_stat_statements, auto_explain, pg_prewarm'

# auto_explain
auto_explain.log_min_duration = '3s'
auto_explain.log_analyze = on
auto_explain.log_buffers = on

# pg_prewarm
pg_prewarm.autoprewarm = true
pg_prewarm.autoprewarm_interval = 300s
```

---

## 6. Server Programming — PL/pgSQL Moderno

Ref: `07-server-programming.md`

```sql
-- ============================================================
-- Function com volatilidade correta e SECURITY DEFINER seguro
-- ============================================================
CREATE OR REPLACE FUNCTION commerce.get_customer_orders(
    p_customer_id bigint,
    p_limit integer DEFAULT 20
)
RETURNS TABLE(order_id bigint, total commerce.currency, status text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.total, o.status, o.created_at
    FROM commerce.orders o
    WHERE o.customer_id = p_customer_id
    ORDER BY o.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================
-- Procedure com COMMIT em lote
-- ============================================================
CREATE OR REPLACE PROCEDURE commerce.process_refunds_batch(p_batch_size integer DEFAULT 100)
LANGUAGE plpgsql
AS $$
DECLARE
    v_processed integer := 0;
    v_order_id bigint;
BEGIN
    FOR v_order_id IN
        SELECT id FROM commerce.orders
        WHERE status = 'cancelled' AND total > 0
          AND NOT EXISTS (SELECT 1 FROM billing.refunds WHERE order_id = orders.id)
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        INSERT INTO billing.refunds (order_id, amount, created_at)
        VALUES (v_order_id, (SELECT total FROM commerce.orders WHERE id = v_order_id), now());

        PERFORM pg_sleep_for('10 milliseconds'); -- simula processamento externo

        v_processed := v_processed + 1;

        IF v_processed % 10 = 0 THEN
            COMMIT;
        END IF;
    END LOOP;

    IF v_processed % 10 != 0 THEN
        COMMIT;
    END IF;
END;
$$;

-- ============================================================
-- Trigger com Transition Tables (FOR EACH STATEMENT)
-- ============================================================
CREATE OR REPLACE FUNCTION audit.log_order_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
    INSERT INTO audit.order_audit (operation, data, changed_by, changed_at)
    SELECT TG_OP, row_to_json(NEW.*), current_user, now()
    FROM new_table;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_order_audit
    AFTER INSERT OR UPDATE OR DELETE ON commerce.orders
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION audit.log_order_changes();

-- ============================================================
-- Função LEAKPROOF + IMMUTABLE para índices de expressão
-- ============================================================
CREATE OR REPLACE FUNCTION commerce.normalize_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
LEAKPROOF
AS $$ SELECT lower(trim(email)) $$;

-- Índice de expressão usando a função
CREATE UNIQUE INDEX idx_customers_email_normalized
    ON commerce.customers (commerce.normalize_email(email));
```

---

## 7. Backup e PITR

Ref: `05-backup-pitr.md`

```bash
# ============================================================
# WAL Archiving — Contínuo
# ============================================================
# archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
# archive_timeout = 60

# ============================================================
# Base Backup Diário
# ============================================================
pg_basebackup -h localhost -D /backup/full_$(date +%Y%m%d) \
    -X stream -F tar -z -P -l "Daily backup $(date)"

# ============================================================
# Validação Pós-Backup (OBRIGATÓRIA)
# ============================================================
pg_verifybackup /backup/full_20260721

# ============================================================
# Script de Validação de Restore (semanal)
# ============================================================
pg_isready -h localhost -p 5432 \
    && psql -c "SELECT count(*) FROM commerce.orders" \
    && psql -c "SELECT now() - pg_last_xact_replay_timestamp() AS lag" \
    && pg_checksums --check -D $PGDATA

# ============================================================
# PITR — Recovery para timestamp específico
# ============================================================
# recovery_target_time = '2026-07-21 14:30:00'
# restore_command = 'cp /archive/%f %p'
# touch $PGDATA/recovery.signal
```

---

## 8. Monitoramento e Manutenção

Ref: `09-manutencao-monitoramento.md`

```sql
-- ============================================================
-- Checkup Diário Automatizado
-- ============================================================
WITH checkup AS (
    SELECT 'connections' AS metric, count(*)::text AS value
    FROM pg_stat_activity WHERE state != 'idle'
    UNION ALL
    SELECT 'max_xid_age', max(age(relfrozenxid))::text
    FROM pg_class WHERE relkind IN ('r', 'm')
    UNION ALL
    SELECT 'max_bloat_pct',
        COALESCE(max(round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2))::text, '0')
    FROM pg_stat_user_tables WHERE n_live_tup > 0
    UNION ALL
    SELECT 'cache_hit_ratio',
        round(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2)::text
    FROM pg_stat_database WHERE datname = current_database()
    UNION ALL
    SELECT 'archiving_failed', count(*)::text
    FROM pg_stat_archiver
    WHERE last_failed_time IS NOT NULL AND last_failed_time > now() - interval '1 hour'
)
SELECT * FROM checkup;

-- ============================================================
-- Top Queries Lentas (pg_stat_statements)
-- ============================================================
SELECT queryid, left(query, 80) AS query,
       calls, round(total_exec_time::numeric, 2) AS total_ms,
       round(mean_exec_time::numeric, 2) AS avg_ms,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 1) AS pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- ============================================================
-- REINDEX CONCURRENTLY (sem bloquear)
-- ============================================================
REINDEX INDEX CONCURRENTLY idx_orders_customer;

-- ============================================================
-- Índices não utilizados
-- ============================================================
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan < 10
ORDER BY idx_scan;
```

---

## 9. Replicação Física (HA)

Ref: `11-ha-replicacao.md`

```ini
# Primary postgresql.conf (adicional)
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1024
synchronous_standby_names = 'FIRST 1 (standby1, standby2)'
```

```sql
-- Role dedicada de replicação (não superuser)
CREATE ROLE repl_user WITH REPLICATION LOGIN PASSWORD 'senha_repl';
```

```bash
# pg_hba.conf na primary
# host    replication   repl_user   192.168.1.100/32   scram-sha-256
# host    replication   repl_user   192.168.1.101/32   scram-sha-256

# Criar slot
psql -c "SELECT pg_create_physical_replication_slot('standby1_slot')"
psql -c "SELECT pg_create_physical_replication_slot('standby2_slot')"

# Base backup na standby
pg_basebackup -h 192.168.1.50 -D /var/lib/postgresql/data \
    -U repl_user -P --slot=standby1_slot
```

```ini
# Standby postgresql.conf
primary_conninfo = 'host=192.168.1.50 port=5432 user=repl_user password=senha_repl'
primary_slot_name = 'standby1_slot'
hot_standby = on
hot_standby_feedback = on
restore_command = 'cp /archive/%f %p'
recovery_target_timeline = 'latest'
max_standby_streaming_delay = 30s
```

```bash
# Promoção (failover)
pg_ctl promote -D /var/lib/postgresql/data

# Reintegração com pg_rewind
pg_rewind --target-pgdata=/var/lib/postgresql/data \
    --source-server='host=192.168.1.100 port=5432 user=repl_user dbname=postgres' \
    -R
```

---

## 10. Replicação Lógica (CDC)

Ref: `11-ha-replicacao.md`

```sql
-- ============================================================
-- Publisher (PG 18 source)
-- ============================================================
-- wal_level = logical
CREATE PUBLICATION commerce_pub
    FOR TABLE commerce.customers, commerce.products, commerce.orders, commerce.order_items;

-- ============================================================
-- Subscriber (PG 18 target, sem copiar dados se usar pg_createsubscriber)
-- ============================================================
CREATE SUBSCRIPTION commerce_sub
    CONNECTION 'host=primary_host dbname=mydb user=repl_user password=senha_repl'
    PUBLICATION commerce_pub
    WITH (run_as_owner = false);  -- ✅ seguro
```

---

## 11. Extensões Essenciais

Ref: `14-extensoes-essenciais.md`

```sql
-- shared_preload_libraries = 'pg_stat_statements, auto_explain, pg_prewarm'

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS amcheck;
CREATE EXTENSION IF NOT EXISTS pageinspect;
CREATE EXTENSION IF NOT EXISTS pgstattuple;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- necessário para exclusion constraints
```

---

## 12. Kernel e SO

Ref: `12-kernel-upgrade.md`

```bash
# ============================================================
# systemd RemoveIPC — MITIGAÇÃO OBRIGATÓRIA
# ============================================================
# Opção 1: criar usuário como system user
useradd -r postgres

# Opção 2: desabilitar RemoveIPC
# /etc/systemd/logind.conf → RemoveIPC=no
# systemctl restart systemlogind

# ============================================================
# OOM Killer — Proteger postmaster
# ============================================================
echo -1000 > /proc/self/oom_score_adj  # postmaster nunca morto
# Filhos: oom_score_adj = 0 (default)
sysctl -w vm.overcommit_memory=2

# ============================================================
# Huge Pages (shared_buffers >= 8GB)
# ============================================================
# Calcular: postgres -D $PGDATA -C shared_memory_size_in_huge_pages
sysctl -w vm.nr_hugepages=3170
sysctl -w vm.hugetlb_shm_group=$(id -g postgres)
# huge_pages = try

# ============================================================
# Limites do Sistema
# ============================================================
# /etc/security/limits.conf
# postgres  soft  nofile  65536
# postgres  hard  nofile  65536
# postgres  soft  nproc   65536
# postgres  hard  nproc   65536
sysctl -w fs.file-max=200000
```

---

## 13. Resumo: Checklist de Boas Práticas

- ✅ `GENERATED ALWAYS AS IDENTITY` em vez de `SERIAL`
- ✅ `jsonb` + GIN em vez de `json` (exceto raras exceções)
- ✅ `timestamptz` SEMPRE (nunca `timestamp`)
- ✅ `numeric` para dinheiro
- ✅ Particionamento declarativo (RANGE/HASH) para tabelas grandes
- ✅ `text` como padrão de string (sem `varchar(n)` artificial)
- ✅ `security_barrier` em views sensíveis
- ✅ `SECURITY DEFINER` com `SET search_path = pg_catalog, pg_temp`
- ✅ `LEAKPROOF` + `IMMUTABLE` em funções para índices
- ✅ `sslmode=verify-full` no cliente (nunca `prefer`)
- ✅ `scram-sha-256` (nunca `md5` ou `trust`)
- ✅ RLS habilitado + `FORCE ROW LEVEL SECURITY`
- ✅ `run_as_owner = false` em subscriptions lógicas
- ✅ `wal_log_hints = on` + `data_checksums = on` (pg_rewind)
- ✅ `wal_compression = lz4`
- ✅ `track_io_timing = on`
- ✅ `shared_preload_libraries = 'pg_stat_statements, auto_explain, pg_prewarm'`
- ✅ WAL archiving + pg_basebackup diário + pg_verifybackup
- ✅ Checkup diário com `age(relfrozenxid)`, bloat, archiving, replicação
- ✅ `REINDEX CONCURRENTLY` em vez de REINDEX bloqueante
- ✅ Transition tables em triggers (`FOR EACH STATEMENT`)
- ✅ `MERGE` em vez de `INSERT ... ON CONFLICT` para upserts complexos
- ✅ Keyset pagination em vez de `OFFSET`
- ✅ `count(*) FILTER (WHERE ...)` em vez de `CASE WHEN` em agregados
- ✅ `COPY` para volumes massivos
- ✅ `systemd RemoveIPC` mitigado (system user ou `RemoveIPC=no`)
