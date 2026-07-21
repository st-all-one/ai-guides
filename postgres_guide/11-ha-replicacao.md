# Alta Disponibilidade e Replicação no PostgreSQL 18.4

## 1. Filosofia de HA

### RPO vs RTO por abordagem

| Abordagem | RPO (perda de dados) | RTO (tempo de recuperação) |
|-----------|----------------------|----------------------------|
| Shared Disk | Zero | Segundos (montar FS) |
| WAL Shipping síncrono | Zero | Minutos (promover standby) |
| WAL Shipping assíncrono | Segundos a minutos | Minutos |
| Replicação Lógica | Depende do lag | Minutos |
| Trigger-based (Slony) | Batches (perda possível) | Minutos |
| SQL Middleware (pgpool) | Zero com 2PC | Variável |
| Async Multimaster | Conflitos descartados | Imediato |
| Sync Multimaster | Zero | Imediato |

### 8 soluções comparadas

- **Shared Disk Failover**: único disco compartilhado (NAS, SAN). Rápido failover, zero perda, mas ponto único de falha no storage. A standby nunca deve acessar o storage compartilhado enquanto a primary está rodando.
- **File System (Block Device) Replication**: DRBD. Espelha blocks em nível de FS. Requer escrita ordenada na standby.
- **Write-Ahead Log Shipping (WAL Shipping)**: built-in. Primary envia WAL para standby. Suporta síncrono e assíncrono. Cobre o servidor inteiro. É a abordagem nativa recomendada para HA com replicação física.
- **Logical Replication**: publish/subscribe por tabela. Permite cross-version, subconjunto de tabelas, múltiplos publishers/subscribers.
- **Trigger-Based (Slony-I)**: por tabela, assíncrono em batches. Perda de dados possível no failover.
- **SQL-Based Middleware (Pgpool-II)**: intercepta queries, distribui read/write. Funções não-determinísticas (random(), CURRENT_TIMESTAMP) podem divergir.
- **Asynchronous Multimaster (Bucardo)**: servidores independentes, reconciliação periódica. Conflitos resolvidos por regras ou manualmente.
- **Synchronous Multimaster**: cada servidor aceita writes, propaga para todos antes do commit. Performance baixa em write-heavy. PostgreSQL não implementa nativamente.

## 2. Replicação Física (WAL Shipping)

### Configuração da Primary

```postgresql
wal_level = replica
max_wal_senders = 10          # mínimo: número de standbys + 1
max_replication_slots = 10    # se usar slots
wal_keep_size = 1024          # MB, alternativa a slots
```

`pg_hba.conf` na primary:

```
host    replication     repl_user     192.168.1.100/32    scram-sha-256
```

Role dedicada (não superuser):

```sql
CREATE ROLE repl_user WITH REPLICATION LOGIN PASSWORD 'senhaforte';
```

### Configuração da Standby

Criar arquivo `standby.signal` no data directory. Em `postgresql.conf`:

```postgresql
primary_conninfo = 'host=192.168.1.50 port=5432 user=repl_user password=senhaforte'
primary_slot_name = 'node_a_slot'
restore_command = 'cp /path/to/archive/%f %p'
```

Criar o slot na primary:

```sql
SELECT * FROM pg_create_physical_replication_slot('node_a_slot');
```

Restaurar base backup na standby:

```bash
pg_basebackup -h 192.168.1.50 -D /var/lib/postgresql/data -U repl_user -P --slot=node_a_slot
```

### Streaming Replication

- **Assíncrona (default)**: lag sub-second tipicamente. Atraso entre commit na primary e visibilidade na standby.
- `archive_timeout` NÃO é necessário para reduzir janela de perda — o streaming já envia WAL continuamente.
- Se WAL for reciclado antes da standby receber, a standby precisa de um novo base backup. Prevenção: `wal_keep_size` ou replication slot.

### Replication Slots

✅ Garantem que WAL não é removido até a standby receber. Também previnem vacuum prematuro de tuplas visíveis na standby (junto com `hot_standby_feedback`).

```sql
SELECT * FROM pg_create_physical_replication_slot('node_a_slot');
```

⚠️ **Slots podem encher `pg_wal`** se a standby ficar muito tempo desconectada. Use `max_slot_wal_keep_size` para limitar:

```postgresql
max_slot_wal_keep_size = 10000    # 10 GB, -1 = ilimitado (default)
```

`idle_replication_slot_timeout` (PG18) invalida slots ociosos automaticamente.

### Autenticação

- Usar role com privilégio `REPLICATION` (não `SUPERUSER`)
- `scram-sha-256` no `pg_hba.conf`
- Senha em `primary_conninfo` ou `~/.pgpass`

### Cascading Replication

Standby que alimenta outras standbys. Reduz conexões diretas na primary.

```
Primary → Standby A (upstream) → Standby B (downstream)
```

- É **apenas assíncrona** (síncrono não funciona em cascata)
- Hot standby feedback propaga upstream
- Se o upstream for promovido, downstreams seguem com `recovery_target_timeline = 'latest'`

### Synchronous Replication

Ativado na primary:

```postgresql
synchronous_standby_names = 'FIRST 1 (standby1, standby2)'
synchronous_commit = on   # default, mas necessário
```

Níveis de `synchronous_commit`:

| Valor | Garantia | Risco |
|-------|----------|-------|
| `on` (flush) | WAL flushado em primary + standby | Perda só se ambos crasharem |
| `remote_write` | WAL escrito no OS (não flushado) | Perda se OS da standby crashar |
| `remote_apply` | Transação visível na standby | Commit espera apply completo |
| `local` | Apenas primary | Perda se primary crashar |
| `off` | WAL nem sempre flushado na primary | Perda até em crash do DB |

Múltiplas standbys síncronas:

```postgresql
-- Prioridade: FIRST N (lista)
synchronous_standby_names = 'FIRST 2 (s1, s2, s3)'

-- Quorum: ANY N (lista)
synchronous_standby_names = 'ANY 2 (s1, s2, s3)'
```

🔍 `FIRST` escolhe por prioridade (ordem na lista); `ANY` espera pelo menos N respostas.

Impacto: cada transação write bloqueia até confirmação da(s) standby(s). Mínimo = RTT primary→standby.

### Monitoramento Físico

```sql
-- Na primary: estado de cada walsender
SELECT application_name, state, sync_state,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)) AS send_lag,
       pg_size_pretty(pg_wal_lsn_diff(sent_lsn, write_lsn)) AS write_lag,
       pg_size_pretty(pg_wal_lsn_diff(write_lsn, flush_lsn)) AS flush_lag,
       pg_size_pretty(pg_wal_lsn_diff(flush_lsn, replay_lsn)) AS replay_lag
FROM pg_stat_replication;

-- Na standby: posição recebida vs replay
SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(),
       pg_last_wal_receive_lsn() - pg_last_wal_replay_lsn() AS lag_bytes;

-- Slots
SELECT slot_name, slot_type, active,
       pg_size_pretty(pg_wal_lsn_diff(COALESCE(restart_lsn, '0/0'), '0/0')) AS wal_retained
FROM pg_replication_slots;
```

## 3. Hot Standby

`hot_standby = on` (default) permite consultas read-only na standby.

**Comandos permitidos**:
- `SELECT`, `COPY TO`
- `DECLARE`, `FETCH`, `CLOSE`
- `SHOW`, `SET`, `RESET`
- `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`
- `LOCK TABLE` apenas `ACCESS SHARE`, `ROW SHARE`, `ROW EXCLUSIVE`
- `PREPARE`, `EXECUTE`, `DEALLOCATE`, `DISCARD`

**Comandos proibidos** (erro):
- DML: `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `TRUNCATE`, `COPY FROM`
- DDL: `CREATE`, `DROP`, `ALTER`, `COMMENT`
- `SELECT ... FOR SHARE/UPDATE`
- `LOCK` em modo `ACCESS EXCLUSIVE`
- `BEGIN READ WRITE`, `SET transaction_read_only = off`
- `PREPARE TRANSACTION`, `COMMIT PREPARED`, `ROLLBACK PREPARED`
- `nextval()`, `setval()`
- `LISTEN`, `NOTIFY`

### Conflitos no Hot Standby

O WAL replay na standby pode conflitar com queries ativas:

1. **Access Exclusive locks** (DDL, `LOCK`) — conflitam com qualquer acesso à tabela
2. **DROP TABLESPACE** — conflita com `temp_tablespaces`
3. **DROP DATABASE** — desconecta todos os usuários imediatamente
4. **VACUUM cleanup** — remove tuplas visíveis para snapshots da standby
5. **VACUUM visibility map** — marca páginas all-visible não visíveis a todas as queries

**Controle**: WAL replay espera até `max_standby_streaming_delay` (30s default), depois cancela a query conflitante.

```postgresql
max_standby_archive_delay = 30s    # para WAL de archive
max_standby_streaming_delay = 30s  # para streaming
# -1 = espera para sempre; 0 = cancela imediatamente
```

🔍 O delay não é por query, mas por segmento WAL. Uma query que atrasa cedo no segmento reduz a tolerância para queries subsequentes.

### hot_standby_feedback

```postgresql
hot_standby_feedback = on
```

Envia para a primary informações sobre snapshots ativos na standby, prevenindo vacuum de remover tuplas ainda visíveis.

✅ Elimina cancelamentos por cleanup
⚠️ Causa **bloat na primary** — tuplas mortas não são limpas enquanto a standby as enxerga
⚠️ Se a standby desconectar, tuplas acumulam sem feedback (use replication slot para proteção contínua)

### pg_stat_database_conflicts

```sql
SELECT datname, confl_tablespace, confl_lock, confl_snapshot,
       confl_bufferpin, confl_deadlock
FROM pg_stat_database_conflicts;
```

### Configurações que DEVEM ser >= na standby

```postgresql
max_connections
max_prepared_transactions
max_locks_per_transaction
max_wal_senders
max_worker_processes
```

Se a standby tiver valor menor que a primary, o WAL replay pausa com warning e exige restart.

## 4. Failover

### Procedimento de Failover

Promover a standby:

```bash
pg_ctl promote -D /var/lib/pgsql/data
```

Ou via SQL:

```sql
SELECT pg_promote();
```

Logs durante a promoção:

```
LOG:  entering standby mode
LOG:  consistent recovery state reached
LOG:  database system is ready to accept read-only connections
```

### STONITH — Obrigatório

🛑 **Nunca deixe a primary antiga voltar sem mecanismo que a impeça de aceitar writes.**

> STONITH = Shoot The Other Node In The Head

Sem STONITH, ambas as máquinas podem aceitar writes simultaneamente (split-brain), corrompendo o banco.

✅ Use heartbeat + STONITH (IPMI, fence device) para garantir que a primary antiga está realmente morta antes de promover.

### Switchover (Failover Planejado)

Execute switchovers regularmente para testar o mecanismo. Procedimento:

1. Verificar lag da standby
2. Aplicar STONITH na primary (planejado: shutdown limpo)
3. Promover standby
4. Reconfigurar a primary antiga como standby (pg_rewind)
5. Redirecionar aplicações

### Pós-Failover

- A standby promovida torna-se a nova primary (estado degenerado — apenas 1 servidor)
- A primary antiga deve ser reintegrada com `pg_rewind`
- Se houver logical replication slots com sincronização (`sync_replication_slots = true`), verificar se os slots estão prontos antes do switchover

## 5. pg_rewind — Reintegração Rápida

Sincroniza a primary antiga (target) com a nova primary (source) após failover. Muito mais rápido que base backup pois copia **apenas blocos alterados**.

### Pré-requisitos

- Target (servidor a ser reintegrado) deve ter `wal_log_hints = on` OU `data_checksums = on`
- `full_page_writes = on` (default)
- Target deve estar **cleanly shut down** (ou pg_rewind força crash recovery)
- Source deve conter WAL desde o ponto de divergência

### Uso

Source running:

```bash
pg_rewind --target-pgdata=/var/lib/pgsql/data \
          --source-server='host=192.168.1.100 port=5432 user=repl_user dbname=postgres' \
          -R   # cria standby.signal + primary_conninfo
```

Source parado (filesystem):

```bash
pg_rewind --target-pgdata=/var/lib/pgsql/data \
          --source-pgdata=/mnt/old_primary_data
```

### Role não-superuser para pg_rewind

```sql
CREATE USER rewind_user LOGIN;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_ls_dir(text, boolean, boolean) TO rewind_user;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_stat_file(text, boolean) TO rewind_user;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_read_binary_file(text) TO rewind_user;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_read_binary_file(text, bigint, bigint, boolean) TO rewind_user;
```

### ⚠️ Riscos

- Se pg_rewind falhar durante o processo, **o diretório target é irrecuperável** — faça backup primeiro
- Opção `--dry-run` (`-n`) testa sem modificar
- Config files são copiados do source — pode ser necessário reconfigurar
- Opção `-c` busca WAL faltante no archive

## 6. Replicação Lógica

### Conceito

Modelo publish/subscribe baseado em **logical decoding** do WAL. Opera por tabela (não por servidor inteiro). Permite:

- Cross-version (ex: PG15 → PG18)
- Cross-platform (Linux → Windows)
- Subconjunto de tabelas
- Múltiplos publishers/subscribers
- Cascading (subscriber → publisher de outros dados)

### Configuração

Publisher (`postgresql.conf`):

```postgresql
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
```

Publisher (`pg_hba.conf`):

```
host    all     repuser     0.0.0.0/0     scram-sha-256
```

Publisher SQL:

```sql
CREATE PUBLICATION mypub FOR TABLE users, departments;
```

Subscriber SQL:

```sql
CREATE SUBSCRIPTION mysub
CONNECTION 'dbname=foo host=bar user=repuser'
PUBLICATION mypub;
```

O processo sincroniza dados existentes (snapshot inicial) e começa a replicar mudanças incrementais.

### Segurança

- Role de conexão: precisa de privilégio `REPLICATION` (não superuser)
- Para copiar dados iniciais: `SELECT` nas tabelas publicadas
- Para criar publication: `CREATE` no database
- Para adicionar tabelas: ownership
- `FOR ALL TABLES`: requer superuser

⚠️ **Publications não têm controle de acesso** — qualquer subscription que consiga conectar pode consumir qualquer publication.

⚠️ **`run_as_owner = true`** é perigoso:

```sql
CREATE SUBSCRIPTION mysub CONNECTION '...' PUBLICATION mypub
WITH (run_as_owner = true);
```

O subscription apply process executa como subscription owner. Qualquer dono de tabela no subscriber pode executar código arbitrário (via triggers) com os privilégios do subscription owner.

✅ Prefira o default (`run_as_owner = false`): o apply process troca para o role dono da tabela para cada operação. Requer `SET ROLE` — o subscription owner precisa de privilégio para `SET ROLE` a cada dono de tabela replicada.

⚠️ **RLS na publisher**: se a role de replicação não tem `BYPASSRLS`, as políticas de segurança de linha executam. Use `options=-crow_security=off` na connection string para parar a replicação (em vez de executar RLS):

```sql
CREATE SUBSCRIPTION mysub
CONNECTION 'dbname=foo host=bar user=repuser options=-crow_security=off'
PUBLICATION mypub;
```

### Conflitos na Replicação Lógica

| Tipo | Descrição | Ação |
|------|-----------|------|
| `insert_exists` | Unique key violada no insert | ⛔ ERRO — replicação para |
| `update_origin_differs` | Update em linha modificada por outra origem | Aplica mesmo assim (log only) |
| `update_exists` | Unique key violada no update | ⛔ ERRO — replicação para |
| `update_missing` | Linha a atualizar não encontrada | ✅ Silencioso (skipped) |
| `delete_origin_differs` | Delete em linha modificada por outra origem | Aplica mesmo assim (log only) |
| `delete_missing` | Linha a deletar não encontrada | ✅ Silencioso (skipped) |
| `multiple_unique_conflicts` | Múltiplas unique constraints violadas | ⛔ ERRO — replicação para |

`track_commit_timestamp = on` no subscriber detalha origem e timestamp dos conflitos.

**Resolução**: pular a transação conflitante:

```sql
ALTER SUBSCRIPTION mysub SKIP (lsn = '0/14C0378');
```

⚠️ **SKIP pula a transação inteira**, não apenas o comando conflitante. Pode causar inconsistência.

### pg_createsubscriber (PG18)

Converte uma standby física em subscriber lógico **sem copiar dados**. Ideal para migrar de replicação física para lógica em bases grandes.

```bash
pg_createsubscriber -D /usr/local/pgsql/data \
                    -P "host=primary" \
                    -d hr -d finance
```

Requisitos:

- Source: `wal_level = logical`, slots e walsenders suficientes
- Target: `max_active_replication_origins` >= databases
- Target: `max_logical_replication_workers` >= databases
- Target: `max_worker_processes` > databases
- Source e target: mesma versão major, mesmo system identifier

## 7. Non-Durability — O Trade-off Extremo

⚠️ ⚠️ Apenas para cenários onde perda de dados é aceitável (ex: cache, logs descartáveis).

### Hierarquia de Risco

| Configuração | Perde com crash DB? | Perde com crash OS? | Corrompe dados? |
|-------------|---------------------|---------------------|-----------------|
| `synchronous_commit = off` | ✅ Sim | Sim | ❌ Não |
| `fsync = off` | ❌ Não | ✅ Sim | ✅ Sim (corrupção) |
| `full_page_writes = off` | ❌ Não | ✅ Sim (página parcial) | ✅ Sim |
| Unlogged tables | ✅ Sim (truncadas) | Sim | ❌ Não |
| Ramdisk | ❌ Não | ✅ Sim (tudo perdido) | ✅ Sim (reboot) |

### Detalhamento

- `synchronous_commit = off`: transações confirmadas antes do WAL ser flushado ao disco. **Perda de dados mesmo em crash do PostgreSQL** (não só do SO). Atraso máximo = 3× `wal_writer_delay`.

- `fsync = off`: desliga sincronização do kernel. **Corrupção de dados em crash do SO**. PostgreSQL pode recovery corretamente após crash do DB, mas crash do SO pode corromper arquivos.

- `full_page_writes = off**: após checkpoint, primeira escrita de página não copia a página inteira. **Páginas parcialmente escritas** (crash do SO) são irrecuperáveis.

- **Unlogged tables**: dados não vão ao WAL. Em crash do DB, tabelas são truncadas. ✅ Não corrompe, mas perde todos os dados.

- **Ramdisk**: tudo em memória. **Perda total no reboot**. Útil para bancos temporários ou testes.

```postgresql
-- Combinação para throughput máximo (⚠️ perda total em crash):
synchronous_commit = off
fsync = off
full_page_writes = off
```

## 8. Monitoramento de Replicação

### Visões de sistema

```sql
-- Replicação física: estado dos walsenders
SELECT application_name, state, sync_state,
       write_lag, flush_lag, replay_lag
FROM pg_stat_replication;

-- Replicação física: receiver na standby
SELECT status, receive_lsn, latest_end_lsn, slot_name
FROM pg_stat_wal_receiver;

-- Replicação lógica: subscription workers
SELECT subname, pid, state, last_msg_send_time, last_msg_receipt_time
FROM pg_stat_subscription;

-- Replicação lógica: estatísticas de conflito (PG18)
SELECT subname, conflict_type, conflict_count
FROM pg_stat_subscription_stats;

-- Slots de replicação
SELECT slot_name, slot_type, active,
       pg_size_pretty(pg_wal_lsn_diff(COALESCE(restart_lsn, '0/0'), '0/0')) AS wal_retained
FROM pg_replication_slots;
```

### Alertas recomendados

| Métrica | Condição de alerta | Ação |
|---------|-------------------|------|
| Lag de replicação | > 10 MB ou > 30s | Verificar rede, I/O da standby |
| Slots com WAL retido | > `max_slot_wal_keep_size` | Standby está muito atrás |
| Conflitos hot standby | `pg_stat_database_conflicts` > 0 | Ajustar delays ou feedback |
| Conflitos lógicos | `pg_stat_subscription_stats` com erro | Intervenção manual (SKIP) |
| Subscription state | `pg_stat_subscription` sem worker | Subscription parou |
| WAL sender estado | `state != 'streaming'` | Problema de conexão |

## 9. Armadilhas Comuns

🛑 **Usar superuser para replicação física/lógica**
Use role dedicada com `REPLICATION` (não superuser). O REPLICATION já permite ler WAL.

🛑 **Não configurar STONITH**
Split-brain é a causa mais comum de corrupção em clusters HA. Sempre tenha um mecanismo para garantir que apenas uma primary escreve.

🛑 **hot_standby_feedback sem monitorar bloat**
`hot_standby_feedback = on` previne cancelamentos mas acumula dead tuples na primary. Monitore `pg_stat_user_tables.n_dead_tup` e tenha autovacuum configurado.

🛑 **Slots de replicação sem `max_slot_wal_keep_size`**
Slot ilimitado enche `pg_wal` se a standby ficar desconectada. Configure `max_slot_wal_keep_size` ou use `idle_replication_slot_timeout`.

🛑 **`synchronous_commit = off` achando que é "só um pouco mais rápido"**
Off perde transações em crash do DB (não só do SO). Use `synchronous_commit = local` se quiser apenas evitar espera por standby, mantendo durabilidade local.

🛑 **pg_rewind sem `wal_log_hints` ou checksums**
pg_rewind falha silenciosamente ou produz diretório irrecuperável. Verifique antes:
```sql
SHOW wal_log_hints;
SHOW data_checksums;
```

🛑 **`run_as_owner = true` na subscription**
Qualquer dono de tabela no subscriber pode executar código arbitrário via trigger com privilégios do subscription owner. Evite a menos que não haja preocupação com segurança intra-database.

🛑 **Achar que replicação lógica replica DDL**
Não replica. DDL na publisher não é propagado. É necessário ferramenta externa (pglogical, manual) ou gerenciar esquemas separadamente.

🛑 **Ignorar que `max_connections` e afins devem ser >= na standby**
Se a standby tiver valor menor, o WAL replay pausa com warning. Configure todas as standbys com valores >= primary.

🛑 **Achar que `SKIP (lsn = ...)` resolve apenas o conflito**
Pula a transação inteira, que pode conter outras mudanças não conflitantes. Use com extrema cautela.
