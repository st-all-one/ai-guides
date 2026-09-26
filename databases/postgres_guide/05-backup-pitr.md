# Backup e Point-in-Time Recovery (PITR)

Baseado em: `03-Server-Administration/backup-*.html`, `continuous-archiving.html`, `wal.html`, `checksums.html`

---

## 1. Filosofia: Backup não testado não existe

📝 **Regra fundamental**: um backup que nunca foi restaurado **não é um backup**. Teste restore periodicamente.

---

## 2. WAL Archiving — Pré-requisito para PITR

### Configuração

```conf
# postgresql.conf — essencial para qualquer ambiente não-descartável
wal_level = replica              # minimal impossibilita PITR
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
archive_timeout = 60             # força switch WAL a cada 60s se inativo
```

### Verificação

```sql
SELECT * FROM pg_stat_archiver;
-- archived_count deve estar crescendo
-- last_failed_wal deve ser nulo
```

⚠️ **Ponto de falha crítico**: se `archive_command` falha repetidamente, os WALs se acumulam em `pg_wal` até encher o disco.

---

## 3. Backup Físico (Base Backup)

### pg_basebackup — Método Principal

```bash
pg_basebackup -h localhost -D /backup/full_$(date +%Y%m%d) \
    -X stream -F tar -z -P -l "Base backup $(date)"
```

**Opções:**
- `-X stream`: inclui WAL gerados durante o backup
- `-F tar -z`: formato tar com compressão
- `-P`: progresso
- `-l`: label identificador

### Base Backup via SQL (Low-Level API)

```sql
SELECT pg_backup_start(label => 'full_backup', fast => true);
-- Enquanto isso, copie $PGDATA com tar/rsync (excluindo pg_wal)
SELECT * FROM pg_backup_stop(wait_for_archive => true);
```

### Backup Incremental (PG 18+)

```bash
pg_basebackup -h localhost -D /backup/incremental \
    --incremental=/backup/full_20260721/backup_manifest
```

📝 Baseia-se em WAL summaries para copiar apenas blocos alterados.

### Backup Lógico (pg_dump)

```bash
# Formato custom (compressão nativa, paralelo no restore)
pg_dump -h localhost -F c -f /backup/db.dump dbname

# Formato directory (paralelo no dump e restore)
pg_dump -h localhost -F d -j 4 -f /backup/dir dbname

# Toda a instância (globais + databases)
pg_dumpall -h localhost -f /backup/full.sql

# Restore
pg_restore -d dbname -F c -j 4 /backup/db.dump
```

### Comparação: Físico vs Lógico

| Aspecto | Físico (pg_basebackup) | Lógico (pg_dump) |
|---------|----------------------|-------------------|
| Tamanho | Maior (copia tudo) | Menor (dados + schema) |
| Velocidade | Mais rápido | Mais lento em grandes volumes |
| PITR | ✅ Suporta | ❌ Não suporta |
| Selectividade | Toda a instância | Database, schema, tabela |
| Versões | Mesma versão | Pode ser versão diferente |
| Paralelismo | Limitado | ✅ (directory format) |

---

## 4. Point-in-Time Recovery (PITR)

### Configuração para Recovery

```conf
# postgresql.conf no servidor de recovery
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-07-21 14:30:00'
# Alternativas:
# recovery_target_xid = '1234567'
# recovery_target_lsn = '0/12345678'
# recovery_target_name = 'restore_point_1'
```

```bash
# Ativar recovery (PG 12+)
touch /var/lib/postgresql/data/recovery.signal
pg_ctl start -D /var/lib/postgresql/data
```

### Restore Point

```sql
-- Criar ponto de restore nomeado (antes de operação crítica)
SELECT pg_create_restore_point('antes_da_migracao_v2');

-- Recovery para este ponto:
recovery_target_name = 'antes_da_migracao_v2'
```

### Timeline — Isolamento de Recuperação

Cada PITR gera uma nova timeline. O WAL da timeline original permanece intacto.

```sql
-- Listar timelines
SELECT * FROM pg_timeline_history;
```

---

## 5. Procedimento Completo de Restore

```bash
# 1. Parar servidor
pg_ctl stop -D $PGDATA

# 2. Mover dados atuais (ou deletar, se for recovery total)
mv $PGDATA $PGDATA.old

# 3. Restaurar base backup
tar -xzf /backup/full_20260721/base.tar.gz -C $PGDATA
# (ajustar permissões)

# 4. Configurar recovery
echo "restore_command = 'cp /archive/%f %p'" >> $PGDATA/postgresql.conf
echo "recovery_target_time = '2026-07-21 14:30:00'" >> $PGDATA/postgresql.conf

# 5. Ativar recovery mode
touch $PGDATA/recovery.signal

# 6. Iniciar servidor
pg_ctl start -D $PGDATA

# 7. Monitorar recovery
SELECT pg_is_in_recovery();
SELECT pg_is_wal_replay_paused();
SELECT * FROM pg_stat_wal_receiver;
```

---

## 6. Validação de Restore

```bash
# Script de validação (essencial!)
pg_isready -h localhost -p 5432 && \
psql -c "SELECT count(*) FROM tabelas_criticas" && \
psql -c "SELECT now() - pg_last_xact_replay_timestamp() AS lag" && \
pg_checksums --check -D $PGDATA
```

---

## 7. Backup de Configuração

```bash
# Incluir sempre no backup:
cp postgresql.conf /backup/config/postgresql.conf.$(date +%Y%m%d)
cp pg_hba.conf /backup/config/pg_hba.conf.$(date +%Y%m%d)
cp pg_ident.conf /backup/config/pg_ident.conf.$(date +%Y%m%d)
```

---

## 8. Estratégia Recomendada

```
📅 Frequência:
  - WAL archiving: contínuo (archive_timeout = 60s)
  - Base backup físico: diário
  - pg_dump de schemas críticos: horário (se necessário)
  - Teste de restore: semanal (automático)

💾 Retenção:
  - Base backups: 30 dias (ou mais conforme RPO)
  - WAL archives: 30 dias ou até o próximo base backup + margem
  - Backups lógicos: 7 dias

🔐 Segurança:
  - Backup criptografado em trânsito (SSL)
  - Backup criptografado em repouso (dm-crypt/LUKS)
  - Cópias em regiões/locations diferentes

📊 Métricas:
  - RPO (Recovery Point Objective): segundos (WAL archiving)
  - RTO (Recovery Time Objective): horas (depende do volume)
  - Testar restore periodicamente
```

---

## 9. Armadilhas Comuns

| 🛑 Problema | Risco | ✅ Solução |
|-------------|-------|-----------|
| WAL archiving não monitorado | Disco cheio, PITR impossível | Monitorar `pg_stat_archiver` |
| `wal_level = minimal` | PITR impossível | `wal_level = replica` |
| Backup nunca testado | Backup corrompido não detectado | Teste de restore automatizado |
| Apenas pg_dump | Perda de dados desde o último dump | Complementar com WAL archiving |
| archive_command falha silenciosa | Lacuna no WAL | Alerta em `last_failed_wal` |
| Sem `full_page_writes` | Corrupção após crash | Default on, não alterar |
| `fsync = off` | Corrupção irreversível em crash | Default on, NUNCA desligar |
| Ignorar data_checksums | Bit rot não detectado | `pg_checksums --enable` |
