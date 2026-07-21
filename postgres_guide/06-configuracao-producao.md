# Configuração para Produção — postgresql.conf

Baseado em: `03-Server-Administration/runtime-config-*.html`, `wal.html`, `checksums.html`

---

## 1. Parâmetros de Durabilidade (NÃO ALTERAR)

```conf
-- ⚠️ Esses parâmetros protegem contra perda de dados
-- NUNCA desligar sem entender completamente o risco

fsync = on                    # 🛑 off = corrupção irreversível em crash
full_page_writes = on         # 🛑 off = corrupção silenciosa pós crash
wal_level = replica           # ⚠️ minimal = sem PITR
synchronous_commit = on       # 🛑 off = perda de até 3x wal_writer_delay
data_checksums = on           # detecta bit rot
```

---

## 2. Memória

```conf
# 📝 Regras práticas para servidor dedicado (32GB RAM exemplo):

shared_buffers = 8GB           # 25% da RAM, máximo 40%
huge_pages = try               # melhora gerenciamento de memória
effective_cache_size = 24GB    # 75% da RAM (estima cache do SO)
work_mem = 16MB                # por operação de sort/hash
hash_mem_multiplier = 2.0      # aplicado sobre work_mem para hash
maintenance_work_mem = 1GB     # VACUUM, CREATE INDEX, ADD FK
autovacuum_work_mem = -1       # usa maintenance_work_mem
```

⚠️ **Cuidado com `work_mem * max_connections`**: pode estourar RAM.
```
max_connections * work_mem = RAM potencial para sorts simultâneos
Ex: 200 * 16MB = 3.2GB (aceitável)
    500 * 256MB = 128GB (🛑 estoura RAM)
```

---

## 3. WAL (Write Ahead Log)

```conf
wal_level = replica            # essencial para PITR e replicação
wal_buffers = -1               # automático (~3% shared_buffers)
wal_compression = lz4          # ou zstd (reduz I/O, sem risco)
wal_log_hints = on             # necessário para pg_rewind

# Checkpoints
checkpoint_timeout = 15min     # default 5min; aumentar reduz I/O
checkpoint_completion_target = 0.9  # distribui escrita do checkpoint
max_wal_size = 4GB             # aumenta reduz frequência de checkpoints
min_wal_size = 1GB

# Archiving (obrigatório em produção)
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
archive_timeout = 60
```

---

## 4. Conexões

```conf
listen_addresses = 'localhost'   # NUNCA '*'
port = 5432
max_connections = 100            # ajustar conforme RAM
superuser_reserved_connections = 3
authentication_timeout = 30s     # default 1min
password_encryption = 'scram-sha-256'
ssl = on
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
```

---

## 5. Autovacuum — CRÍTICO para evitar perda de dados

```conf
# 🛑 NUNCA desabilitar autovacuum — causa wraparound catastrophic

autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 30s         # default 1min
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.05   # default 0.2 (mais agressivo)
autovacuum_vacuum_insert_threshold = 1000
autovacuum_vacuum_insert_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.02  # default 0.1
autovacuum_freeze_max_age = 500000000   # default 200M
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_cost_limit = -1
```

⚠️ **Wraparound**: quando `age(relfrozenxid)` atinge 2 bilhões, o PostgreSQL para de aceitar transações — dados se tornam inacessíveis. Monitorar:

```sql
SELECT datname, age(datfrozenxid) FROM pg_database;
SELECT relname, age(relfrozenxid) FROM pg_class
  WHERE relkind IN ('r', 'm') ORDER BY 2 DESC LIMIT 10;
```

**Alertas:**
- > 40 milhões restantes: WARNING
- > 3 milhões restantes: ERROR (server para)

---

## 6. Logging

```conf
log_destination = 'csvlog'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_file_mode = 0600
log_rotation_age = 1d
log_rotation_size = 100MB

# O que logar
log_checkpoints = on
log_connections = on
log_disconnections = on
log_duration = on
log_lock_waits = on
log_recovery_conflict_waits = on
log_statement = 'ddl'               # 'none', 'ddl', 'mod', 'all'
log_temp_files = 0                  # loga arquivos temporários > 0KB
log_min_duration_statement = 1000   # slow queries > 1s

log_line_prefix = '%m [%p] %q%u@%d '
```

---

## 7. Estatísticas e Monitoramento

```conf
track_activities = on
track_counts = on
track_io_timing = on               # overhead ~5%, essencial
track_functions = 'all'
track_wal_io_timing = on
compute_query_id = on              # necessário para pg_stat_statements

# shared_preload_libraries (adicionar conforme necessidade)
shared_preload_libraries = 'pg_stat_statements, auto_explain'
```

---

## 8. Plano de Configuração por Tamanho de Servidor

### Servidor Pequeno (4GB RAM, 50 conexões)

```conf
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 8MB
maintenance_work_mem = 256MB
max_connections = 50
max_wal_size = 1GB
checkpoint_timeout = 10min
```

### Servidor Médio (32GB RAM, 200 conexões)

```conf
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 16MB
maintenance_work_mem = 1GB
max_connections = 200
max_wal_size = 4GB
checkpoint_timeout = 15min
```

### Servidor Grande (256GB RAM, 500 conexões)

```conf
shared_buffers = 64GB
effective_cache_size = 192GB
work_mem = 32MB
maintenance_work_mem = 2GB
max_connections = 500
max_wal_size = 16GB
checkpoint_timeout = 15min
```

---

## 9. Verificação Pós-Configuração

```bash
# Comandos para validar configuração
pg_ctl reload -D $PGDATA

# Verificar parâmetros aplicados
psql -c "SHOW all;" | grep -E "^(fsync|full_page_writes|wal_level|data_checksums)"

# Verificar WAL archiving
psql -c "SELECT * FROM pg_stat_archiver;" -x

# Verificar autovacuum
psql -c "SELECT relname, age(relfrozenxid) FROM pg_class ORDER BY 2 DESC LIMIT 10;"

# Verificar conexões
psql -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY 1;"
```

---

## 10. Armadilhas Comuns

| 🛑 Configuração | Risco | ✅ Correção |
|----------------|-------|-------------|
| `fsync = off` | Corrupção total em crash | `fsync = on` |
| `full_page_writes = off` | Corrupção silenciosa | `full_page_writes = on` |
| `wal_level = minimal` | PITR impossível | `wal_level = replica` |
| autovacuum desligado | Wraparound, perda total | autovacuum = on |
| `work_mem` muito alto | Estouro de RAM | Calcular: RAM / (max_connections * fator) |
| `max_connections` muito alto | Estouro de shared memory | Reduzir ou aumentar RAM |
| `shared_buffers > 40% RAM` | Contenção com cache do SO | Máximo 40% |
| checkpoint muito frequente | WAL volume excessivo | Aumentar `max_wal_size` |
| Sem SSL | Dados em texto claro | `ssl = on` |
| `listen_addresses = '*'` | Superfície de ataque | IPs específicos ou localhost |
