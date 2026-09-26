# Ferramentas de Diagnóstico, Códigos de Erro, Limites e Testes de Performance

## Sobre este guia

Ferramentas utilitárias do PostgreSQL 18.4 para diagnóstico, benchmark, validação e manutenção, códigos de erro SQLSTATE, limites físicos/lógicos do banco e práticas de teste de performance.

---

## 1. pgbench — Teste de Performance

Benchmark baseado no padrão TPC-B. Executa repetidamente uma sequência de comandos SQL em múltiplas sessões concorrentes e calcula a taxa média de transações por segundo (TPS).

### Inicialização

```bash
pgbench -i mydb                        # default scale 1 (~16 MB)
pgbench -i -s 100 mydb                  # scale 100 (~1.6 GB, 10M rows em pgbench_accounts)
pgbench -i --partitions=10 mydb         # tabela particionada (PG18)
pgbench -i --unlogged-tables mydb       # tabelas unlogged (sem WAL)
```

Tabelas criadas: `pgbench_accounts`, `pgbench_branches`, `pgbench_history`, `pgbench_tellers`.

⚠️ `pgbench -i` destrói tabelas existentes com esses nomes.

Opções de inicialização (`-I`): `d` (drop), `t` (create tables), `g`/`G` (generate data client/server), `v` (vacuum), `p` (primary keys), `f` (foreign keys).

### Execução de Benchmark

```bash
pgbench -c 10 -j 2 -T 60 mydb           # 10 clients, 2 threads, 60s
pgbench -c 50 -j 4 -T 300 -P 5 -r mydb  # 50 clients, 4 threads, 5min, progress 5s
```

### Opções Principais

| Opção | Descrição |
|-------|-----------|
| `-c` | Número de clientes simulados (conexões concorrentes) |
| `-j` | Número de threads worker (recomendado = número de CPUs) |
| `-T` | Duração em segundos (mutuamente exclusivo com `-t`) |
| `-t` | Transações por cliente |
| `-P` | Relatório de progresso a cada N segundos |
| `-r` | Estatísticas por comando após o fim |
| `-R` | Rate limiting (transações/segundo, distribuição Poisson) |
| `-M` | Protocolo: `simple`, `extended`, `prepared` |
| `-L` | Latency limit (ms) — transações lentas são reportadas |
| `-n` | Sem vacuum antes do teste |
| `-v` | Vacuum todas as tabelas antes do teste |
| `-D` | Define variável para script customizado |
| `-C` | Nova conexão por transação (mede overhead) |
| `--max-tries` | Retry em serialização/deadlock |
| `--aggregate-interval` | Agregação de logs |
| `--log` | Log por transação |
| `--sampling-rate` | Fração de transações logadas |
| `--random-seed` | Seed para reprodutibilidade |
| `--failures-detailed` | Relatório detalhado de falhas |
| `--exit-on-abort` | Sai imediatamente em erro de cliente |

### Scripts Built-in

```bash
pgbench -b tpcb-like mydb               # default (5 comandos SQL)
pgbench -b simple-update mydb           # atualizações simplificadas
pgbench -b select-only mydb             # apenas SELECT (leitura)
pgbench -N mydb                         # shorthand para simple-update
pgbench -S mydb                         # shorthand para select-only
pgbench -b list                         # lista built-in scripts
pgbench --show-script=tpcb-like         # mostra código do script
```

### Scripts Customizados

Arquivo SQL com variáveis `:client_id`, `:scale`, `:default_seed`:

```sql
\set aid random(1, 100000 * :scale)
\set bid random(1, 1 * :scale)
\set tid random(1, 10 * :scale)
\set delta random(-5000, 5000)
BEGIN;
UPDATE pgbench_accounts SET abalance = abalance + :delta WHERE aid = :aid;
SELECT abalance FROM pgbench_accounts WHERE aid = :aid;
UPDATE pgbench_tellers SET tbalance = tbalance + :delta WHERE tid = :tid;
UPDATE pgbench_branches SET bbalance = bbalance + :delta WHERE bid = :bid;
INSERT INTO pgbench_history (tid, bid, aid, delta, mtime) VALUES (:tid, :bid, :aid, :delta, CURRENT_TIMESTAMP);
END;
```

```bash
pgbench -f script.sql@5 -b tpcb-like@1 mydb   # pesos: script 5, built-in 1
```

### Particionamento (PG18)

```bash
pgbench -i --partitions=50 --partition-method=hash mydb
pgbench -i --partitions=50 --partition-method=range mydb
```

### Logging

```bash
pgbench -l --log-prefix=bench_log mydb
pgbench -l --aggregate-interval=10 mydb        # sumário por intervalo
```

📝 Exemplo completo:

```bash
pgbench -i -s 100 mydb && pgbench -c 50 -j 4 -T 300 -P 5 -r mydb
```

⚠️ Não use pgbench em produção sem entender o impacto.

---

## 2. pg_waldump — Inspeção de WAL

Exibe o Write-Ahead Log em formato legível. Essencial para debugging, diagnóstico de corrupção e entendimento do volume WAL.

```bash
pg_waldump -p /path/to/pg_wal                    # lista arquivos WAL
pg_waldump --start=0/2000000 --end=0/3000000      # range de LSN
pg_waldump --rmgr=Heap                            # filtro por resource manager
pg_waldump --rmgr=Btree
pg_waldump --relation=1234/12345/12345            # tablespace OID / db OID / relfilenode
pg_waldump --fork=main                            # fork específico
pg_waldump --fork=fsm
pg_waldump --fork=vm
pg_waldump --block=42 --relation=...              # bloco específico
pg_waldump --stats                                # estatísticas por tipo de registro
pg_waldump --stats=record                         # estatísticas por registro
pg_waldump -n 100                                 # limite de registros
pg_waldump --xid=12345                            # filtro por transaction ID
pg_waldump --follow                               # monitora WAL em tempo real
pg_waldump --bkp-details                          # detalhes de backup blocks
pg_waldump --save-fullpage=/tmp/pages             # salva full page images
```

Resource managers disponíveis: `Heap`, `Btree`, `Heap2`, `Btree`, `GiST`, `GIN`, `Sequence`, `Standby`, `SMGR`, `XLOG`, `Transaction`, `CLOG`, `Database`, `Tablespace`, `MultiXact`, `RelMap`, `ReplicationOrigin`, `LogicalMessage`, `Xact`, `Extension`, `custom###`.

📝 Útil para: depuração de replicação, estimativa de volume WAL, diagnóstico de corrupção, análise de checkpoint.

⚠️ `pg_waldump` lê arquivos WAL, não consulta slots de replicação — para slots use `pg_replication_slots`. Pode dar resultados incorretos com o servidor rodando.

---

## 3. pg_controldata — Informação de Controle do Cluster

Exibe o conteúdo do `pg_control` — informações de checkpoint, timeline e estado do cluster.

```bash
pg_controldata $PGDATA
```

Informações críticas:

| Campo | Significado |
|-------|-------------|
| `Latest checkpoint location` | Onde o recovery começa |
| `Latest checkpoint's REDO location` | Início da fase REDO |
| `Database cluster state` | `in production`, `in recovery`, `shut down`, `shut down in recovery` |
| `Time of latest checkpoint` | Timestamp do último checkpoint |
| `Min recovery ending loc` | Detecta split-brain |
| `Current timeline ID` | Timeline atual |
| `Latest checkpoint's NextXID` | Próximo XID a ser alocado |
| `Latest checkpoint's oldestXID` | XID mais antigo (posição do wraparound) |
| `Latest checkpoint's oldestXID's DB` | Database com XID mais antigo |
| `Data page checksum version` | 0 = checksums desligados |
| `pg_control version number` | Versão do formato pg_control |
| `Catalog version number` | Versão do catálogo |

📝 Essencial para diagnóstico de recovery, split-brain e validação de pg_rewind.

⚠️ Em servidor rodando, prefira `pg_control_checkpoint()` via SQL.

---

## 4. pg_verifybackup — Validação de Backup

Verifica integridade de backup físico (`pg_basebackup`) contra o `backup_manifest` gerado pelo servidor.

```bash
pg_basebackup -h myserver -D /backup/mydb
pg_verifybackup /backup/mydb                     # validação completa
pg_verifybackup -m /path/to/manifest /backup     # manifest externo
pg_verifybackup --wal-directory=/wal/archive     # WAL separado
pg_verifybackup --skip-checksums /backup         # só verifica presença/tamanho
pg_verifybackup --progress /backup               # progresso
pg_verifybackup --quiet /backup                  # sem output se OK
pg_verifybackup -e /backup                       # exit on first error
pg_verifybackup --ignore=note.txt /backup        # ignora arquivo extra
pg_verifybackup -F tar /path/to/backup.tar       # formato tar
```

Processo de verificação:
1. Lê e valida `backup_manifest`
2. Verifica arquivos presentes vs. manifestados
3. Checksums dos arquivos
4. Valida WAL necessário via `pg_waldump`

✅ Execute sempre após cada `pg_basebackup`. Deve ser parte de todo teste de restore.

⚠️ Lembre-se: `pg_verifybackup` não substitui um teste de restore completo.

---

## 5. pg_checksums — Gerenciamento de Data Checksums

Ativa, desativa ou verifica data checksums no cluster.

⚠️ Requer cluster **parado** (shutdown fast).

```bash
pg_checksums --enable $PGDATA                    # ativa (reescreve todos os blocos)
pg_checksums --disable $PGDATA                   # desativa (só atualiza pg_control)
pg_checksums --check $PGDATA                     # verifica integridade
pg_checksums --check --progress $PGDATA           # com progresso
pg_checksums --check --verbose $PGDATA            # lista todos os arquivos
pg_checksums --filenode=12345 $PGDATA             # verifica relação específica
pg_checksums --no-sync $PGDATA                    # mais rápido, corrompe se crash
pg_checksums --sync-method=fsync $PGDATA          # default
pg_checksums --sync-method=syncfs $PGDATA         # Linux, sincroniza FS inteiro
```

- Em clusters grandes, `--enable` pode levar horas
- PG 18 ativa checksums por default no `initdb`
- ⚠️ Em replicação, pare todos os nós antes de ativar/desativar
- Se abortado, a configuração não se altera — pode reexecutar

---

## 6. pg_archivecleanup — Limpeza de WAL Archive

Remove arquivos WAL antigos do diretório de archive.

```bash
pg_archivecleanup /path/to/archive 000000010000000000000010
pg_archivecleanup -d /archive 0000000100000000.00000020.backup  # debug
pg_archivecleanup -x .gz /archive 000000010000000000000010       # WAL comprimido
pg_archivecleanup -n /archive 000000010000000000000010           # dry-run
pg_archivecleanup -b /archive 000000010000000000000010           # remove backup history
```

Uso típico em `postgresql.conf` do standby:

```
archive_cleanup_command = 'pg_archivecleanup -d /mnt/standby/archive %r 2>>cleanup.log'
```

⚠️ Use `-x .gz` para WAL comprimido. `-n` faz dry-run.

---

## 7. pg_isready — Verificação de Conectividade

```bash
pg_isready                                    # default localhost:5432
pg_isready -h dbhost -p 5432 -d mydb          # específico
pg_isready -q                                 # quiet (exit code only)
pg_isready --timeout=5                        # timeout (default 3s)
```

### Exit Codes

| Código | Significado |
|--------|-------------|
| 0 | Aceitando conexões |
| 1 | Rejeitando conexões (ex.: startup) |
| 2 | Sem resposta |
| 3 | Erro (parâmetros inválidos) |

✅ Use em scripts de monitoramento e health checks.

⚠️ `pg_isready` só verifica socket — não garante que queries funcionam.

---

## 8. pg_config — Informação de Build

```bash
pg_config --version                           # versão do PostgreSQL
pg_config --configure                         # opções de compilação
pg_config --bindir                            # diretório de binários
pg_config --libdir                            # bibliotecas
pg_config --includedir                        # headers de cliente
pg_config --includedir-server                 # headers de server
pg_config --sharedir                          # arquivos de suporte
pg_config --pkglibdir                         # módulos dinâmicos
pg_config --pgxs                              # makefile de extensões
pg_config --cc                                # compilador usado
pg_config --cflags                            # flags de compilação
pg_config --ldflags                           # flags de linker
```

Útil para compilar extensões (PGXS):

```makefile
PG_CONFIG = pg_config
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
```

---

## 9. pg_ctl — Controle do Servidor (Aprofundamento)

```bash
pg_ctl start -l /var/log/pg.log               # start com log
pg_ctl start -o "-p 5433"                     # start com opções extras
pg_ctl stop                                    # stop fast (default)
pg_ctl stop -m smart                           # aguarda clientes desconectarem
pg_ctl stop -m immediate                       # aborta tudo (crash recovery)
pg_ctl restart                                 # restart
pg_ctl reload                                  # recarrega config (SIGHUP)
pg_ctl status                                  # PID + comando
pg_ctl promote                                 # promove standby a primary
pg_ctl kill TERM <PID>                         # mata backend específico
pg_ctl logrotate                               # rotaciona log
pg_ctl initdb -D /var/lib/pgsql/data           # cria cluster (wrapper initdb)
```

### Modos de Shutdown

| Modo | Descrição |
|------|-----------|
| `smart` | Desliga após todos clientes desconectarem |
| `fast` | Rollback de transações ativas, desconexão forçada (⚠️ default) |
| `immediate` | Aborto imediato → crash recovery na próxima start |

✅ `stop -m fast` para manutenção programada. `smart` para desligamento gracioso.

---

## 10. reindexdb, vacuumdb, clusterdb — Wrappers SQL

### reindexdb

```bash
reindexdb --concurrently --table pg_class     # REINDEX CONCURRENTLY
reindexdb --all                                # todas as databases
reindexdb --schema=public                      # schema específico
reindexdb --index=my_idx                       # índice específico
reindexdb --system                             # catálogos do sistema
reindexdb --jobs=4                             # paralelo
reindexdb --tablespace=fast_ts                 # tablespace específico
```

⚠️ Sem `--concurrently`, o REINDEX toma `ACCESS EXCLUSIVE` — bloqueia leitura.

### vacuumdb

```bash
vacuumdb --all --analyze                       # VACUUM + ANALYZE em todas DBs
vacuumdb --all --analyze --jobs=4              # paralelo
vacuumdb --full --analyze mydb                 # VACUUM FULL
vacuumdb --freeze mydb                         # freeze agressivo
vacuumdb --table=pg_class mydb                 # tabela específica
vacuumdb --min-xid-age=1000000                 # só tabelas com XID age alto
vacuumdb --min-mxid-age=1000000                # wraparound prevention
vacuumdb --skip-locked                         # pula tabelas lockadas
vacuumdb --disable-page-skipping               # não pula páginas visíveis
vacuumdb --no-index-cleanup                    # mantém índices
vacuumdb --analyze-in-stages                   # análise gradual (após pg_upgrade)
```

✅ `--jobs` escala horizontalmente em bancos com muitas tabelas.

### clusterdb

```bash
clusterdb --table pg_class mydb                # CLUSTER por índice
clusterdb --all                                # todas as databases
```

---

## 11. createdb, dropdb, createuser, dropuser

### createdb

```bash
createdb -T template0 -E UTF8 --locale=C -O myowner mydb
createdb -T template0 -E UTF8 --icu-locale=pt-BR-x-icu mydb
createdb --strategy=wal_log                    # estratégia de criação (PG18)
createdb -D fast_tablespace mydb               # tablespace default
```

### dropdb

```bash
dropdb mydb
dropdb --force mydb                            # força shutdown de conexões
dropdb --if-exists mydb                        # sem erro se não existir
dropdb -i mydb                                 # pede confirmação
```

⚠️ `--force` termina conexões existentes antes de dropar.

### createuser

```bash
createuser --replication --login -P repl_user    # usuário de replicação
createuser --superuser admin_user                # superuser
createuser --createdb --createrole dev_user      # privilégios limitados
```

### dropuser

```bash
dropuser repl_user
dropuser --if-exists repl_user
```

---

## 12. Códigos de Erro PostgreSQL (SQLSTATE)

Todos os erros do PostgreSQL possuem código SQLSTATE de 5 caracteres: 2 para classe + 3 para subclasse.

### Classes Principais

| Classe | Significado |
|--------|-------------|
| `00` | Successful Completion |
| `01` | Warning |
| `02` | No Data |
| `03` | SQL Statement Not Yet Complete |
| `08` | Connection Exception |
| `09` | Triggered Action Exception |
| `0A` | Feature Not Supported |
| `0B` | Invalid Transaction Initiation |
| `0F` | Locator Exception |
| `0L` | Invalid Grantor |
| `0P` | Invalid Role Specification |
| `20` | Case Not Found |
| `21` | Cardinality Violation |
| `22` | Data Exception |
| `23` | Integrity Constraint Violation |
| `24` | Invalid Cursor State |
| `25` | Invalid Transaction State |
| `26` | Invalid SQL Statement Name |
| `27` | Triggered Data Change Violation |
| `28` | Invalid Authorization Specification |
| `2B` | Dependent Privilege Descriptors Still Exist |
| `2D` | Invalid Transaction Termination |
| `2F` | SQL Routine Exception |
| `34` | Invalid Cursor Name |
| `38` | External Routine Exception |
| `39` | External Routine Invocation Exception |
| `3B` | Savepoint Exception |
| `3D` | Invalid Catalog Name |
| `3F` | Invalid Schema Name |
| `40` | Transaction Rollback |
| `42` | Syntax Error or Access Rule Violation |
| `44` | WITH CHECK OPTION Violation |
| `53` | Insufficient Resources |
| `54` | Program Limit Exceeded |
| `55` | Object Not In Prerequisite State |
| `57` | Operator Intervention |
| `58` | System Error (PostgreSQL internal) |
| `72` | Snapshot Failure |
| `F0` | Configuration File Error |
| `HV` | Foreign Data Wrapper Error |
| `P0` | PL/pgSQL Error |
| `XX` | Internal Error |

### Subcódigos Mais Comuns

| Código | Nome | Significado |
|--------|------|-------------|
| `23505` | `unique_violation` | Duplicate key |
| `23503` | `foreign_key_violation` | FK violation |
| `23514` | `check_violation` | CHECK constraint |
| `23502` | `not_null_violation` | NULL em coluna NOT NULL |
| `23P01` | `exclusion_violation` | Exclusion constraint |
| `22001` | `string_data_right_truncation` | String truncada |
| `22003` | `numeric_value_out_of_range` | Valor numérico fora do range |
| `22007` | `invalid_datetime_format` | Formato datetime inválido |
| `22008` | `datetime_field_overflow` | Overflow em datetime |
| `22012` | `division_by_zero` | Divisão por zero |
| `22P02` | `invalid_text_representation` | Tipo inválido (ex.: texto em int) |
| `40001` | `serialization_failure` | Falha de serialização |
| `40P01` | `deadlock_detected` | Deadlock |
| `40002` | `transaction_integrity_constraint_violation` | Violação em subtransação |
| `42P01` | `undefined_table` | Tabela inexistente |
| `42P02` | `undefined_parameter` | Parâmetro indefinido |
| `42703` | `undefined_column` | Coluna inexistente |
| `42601` | `syntax_error` | Erro de sintaxe |
| `42501` | `insufficient_privilege` | Sem privilégio |
| `42883` | `undefined_function` | Função inexistente |
| `42710` | `duplicate_object` | Objeto duplicado |
| `42P07` | `duplicate_table` | Tabela duplicada |
| `42723` | `duplicate_function` | Função duplicada |
| `53000` | `insufficient_resources` | Recursos insuficientes (disco cheio) |
| `55000` | `object_not_in_prerequisite_state` | Objeto em estado inválido |
| `57P01` | `admin_shutdown` | Shutdown administrativo |
| `57P02` | `crash_shutdown` | Crash seguido de restart |
| `57P03` | `cannot_connect_now` | Não pode conectar agora |
| `P0001` | `raise_exception` | `RAISE` em PL/pgSQL |
| `P0002` | `no_data_found` | Sem dados |
| `P0003` | `too_many_rows` | Múltiplas linhas inesperadas |
| `2201B` | `invalid_regular_expression` | Regex inválida |
| `22023` | `invalid_parameter_value` | Valor de parâmetro inválido |
| `0A000` | `feature_not_supported` | Funcionalidade não suportada |
| `28000` | `invalid_authorization_specification` | Autenticação falhou |
| `28P01` | `invalid_password` | Senha inválida |
| `08003` | `connection_does_not_exist` | Conexão inexistente |
| `08006` | `connection_failure` | Falha de conexão |

📝 Captura por SQLSTATE:

```plpgsql
BEGIN;
  INSERT INTO tab VALUES (1);
EXCEPTION
  WHEN SQLSTATE '23505' THEN
    RAISE NOTICE 'Registro duplicado';
  WHEN SQLSTATE '40001' THEN
    RAISE NOTICE 'Serialization failure, retry';
END;
```

---

## 13. Limites do PostgreSQL

| Parâmetro | Limite | Notas |
|-----------|--------|-------|
| Database size | Ilimitado | Limitado por espaço em disco |
| Number of databases | 4.294.950.911 | OID de 32 bits (4B+) |
| Relations per database | 1.431.650.303 | ~1.4B |
| Relation size | 32 TB | Com BLCKSZ=8192 |
| Rows per table | Ilimitado | Limitado por número de páginas (4B) |
| Columns per table | 1.600 | Limitado também por tamanho da tupla |
| Columns in a result set | 1.664 | |
| Field size | 1 GB | Com TOAST |
| Indexes per table | Ilimitado | Limitado por relations per database |
| Columns per index | 32 | Recompilável |
| Partition keys | 32 | Recompilável |
| Identifier length | 63 bytes | `NAMEDATALEN`, recompilável |
| Function arguments | 100 | Recompilável |
| Query parameters | 65.535 | |
| Query length | Ilimitado | Buffer de 1 GB |
| Connections | `max_connections` | Default 100, max 262143 |
| Tuple size (sem TOAST) | ~1.9 KB | Com BLCKSZ=8192 |
| TOAST values per table | 2^32 | ~4B valores out-of-line |

📝 Colunas dropadas continuam contando para o limite de 1600.

---

## 14. Progress Reporting — Acompanhamento de Operações Longas

Views de sistema para monitorar operações longas em tempo real.

### VACUUM — `pg_stat_progress_vacuum`

```sql
SELECT pid, datname, relid::regclass, phase,
       heap_blks_total, heap_blks_scanned, heap_blks_vacuumed,
       index_vacuum_count, max_dead_tuples, num_dead_tuples
FROM pg_stat_progress_vacuum;
```

Fases: `initializing`, `scanning heap`, `vacuuming indexes`, `vacuuming heap`, `cleaning up indexes`, `truncating heap`, `performing final cleanup`.

### CREATE INDEX / REINDEX — `pg_stat_progress_create_index`

```sql
SELECT pid, datname, relid::regclass, index_relid::regclass,
       command, phase, blocks_total, blocks_done, tuples_total, tuples_done,
       partitions_total, partitions_done, lockers_total, lockers_done
FROM pg_stat_progress_create_index;
```

Fases: `initializing`, `waiting for writers before build`, `building index`, `waiting for writers before validation`, `index validation: scanning index`, `index validation: sorting tuples`, `index validation: scanning table`, `waiting for old snapshots`, `waiting for readers before marking dead`, `waiting for readers before dropping`.

Comandos: `CREATE INDEX`, `CREATE INDEX CONCURRENTLY`, `REINDEX`, `REINDEX CONCURRENTLY`.

### CLUSTER / VACUUM FULL — `pg_stat_progress_cluster`

```sql
SELECT pid, datname, relid::regclass, command, phase,
       heap_tuples_scanned, heap_tuples_written, heap_blks_total, heap_blks_scanned,
       index_rebuild_count
FROM pg_stat_progress_cluster;
```

Fases: `initializing`, `seq scanning heap`, `index scanning heap`, `sorting tuples`, `writing new heap`, `swapping relation files`, `rebuilding index`, `performing final cleanup`.

### pg_basebackup — `pg_stat_progress_basebackup`

```sql
SELECT pid, phase, backup_total, backup_streamed, tablespaces_total, tablespaces_streamed
FROM pg_stat_progress_basebackup;
```

### COPY — `pg_stat_progress_copy`

```sql
SELECT pid, datname, relid::regclass, command, type,
       bytes_processed, bytes_total, tuples_processed, tuples_excluded, tuples_skipped
FROM pg_stat_progress_copy;
```

### ANALYZE — `pg_stat_progress_analyze` (PG18)

```sql
SELECT pid, datname, relid::regclass, phase,
       sample_blks_total, sample_blks_scanned,
       ext_stats_total, ext_stats_computed,
       child_tables_total, child_tables_done
FROM pg_stat_progress_analyze;
```

Fases: `initializing`, `acquiring sample rows`, `acquiring inherited sample rows`, `computing statistics`, `computing extended statistics`, `finalizing analyze`.

---

## 15. Dynamic Tracing — DTrace / SystemTap

Instrumentação dinâmica sem overhead de logging. Requer compilação com `--enable-dtrace` ou `--enable-systemtap`.

### Probes Built-in

| Probe | Parâmetros | Descrição |
|-------|------------|-----------|
| `transaction-start` | `(LocalTransactionId)` | Início de transação |
| `transaction-commit` | `(LocalTransactionId)` | Commit |
| `transaction-abort` | `(LocalTransactionId)` | Abort |
| `query-start` | `(const char *)` | Início de processamento de query |
| `query-done` | `(const char *)` | Fim de processamento |
| `query-parse-start` | `(const char *)` | Parse |
| `query-parse-done` | `(const char *)` | Parse concluído |
| `query-rewrite-start` | `(const char *)` | Rewrite |
| `query-rewrite-done` | `(const char *)` | Rewrite concluído |
| `query-plan-start` | `()` | Planejamento |
| `query-plan-done` | `()` | Planejamento concluído |
| `query-execute-start` | `()` | Execução |
| `query-execute-done` | `()` | Execução concluída |
| `checkpoint-start` | `(int flags)` | Início de checkpoint |
| `checkpoint-done` | `(int,int,int,int,int)` | Checkpoint concluído |
| `wal-insert` | `(unsigned char, unsigned char)` | WAL insert |
| `wal-switch` | `()` | WAL segment switch |
| `buffer-read-start` | `(ForkNumber, BlockNumber, Oid, Oid, Oid, int)` | Leitura de buffer |
| `buffer-read-done` | `(ForkNumber, BlockNumber, Oid, Oid, Oid, int, bool)` | Leitura concluída |
| `buffer-flush-start` | `(ForkNumber, BlockNumber, Oid, Oid, Oid)` | Flush de buffer |
| `buffer-flush-done` | `(ForkNumber, BlockNumber, Oid, Oid, Oid)` | Flush concluído |
| `buffer-extend-start` | `(...)` | Extensão de relação |
| `buffer-extend-done` | `(...)` | Extensão concluída |
| `lwlock-acquire` | `(char *, LWLockMode)` | LWLock adquirido |
| `lwlock-release` | `(char *)` | LWLock liberado |
| `lwlock-wait-start` | `(char *, LWLockMode)` | Espera por LWLock |
| `lwlock-wait-done` | `(char *, LWLockMode)` | Fim da espera |
| `lock-wait-start` | `(...)` | Espera por lock pesado |
| `lock-wait-done` | `(...)` | Lock adquirido |
| `deadlock-found` | `()` | Deadlock detectado |
| `sort-start` | `(...)` | Início de sort |
| `sort-done` | `(bool, long)` | Sort concluído |
| `smgr-md-read-start` | `(...)` | Read de storage manager |
| `smgr-md-read-done` | `(...)` | Read concluído |
| `smgr-md-write-start` | `(...)` | Write de storage manager |
| `smgr-md-write-done` | `(...)` | Write concluído |
| `statement-status` | `(const char *)` | Atualização de status |
| `clog-checkpoint-start` | `(bool)` | Checkpoint CLOG |
| `clog-checkpoint-done` | `(bool)` | Checkpoint CLOG concluído |
| `subtrans-checkpoint-start` | `(bool)` | Checkpoint SUBTRANS |
| `subtrans-checkpoint-done` | `(bool)` | Checkpoint SUBTRANS concluído |
| `multixact-checkpoint-start` | `(bool)` | Checkpoint MultiXact |
| `multixact-checkpoint-done` | `(bool)` | Checkpoint MultiXact concluído |
| `twophase-checkpoint-start` | `()` | Checkpoint two-phase |
| `twophase-checkpoint-done` | `()` | Checkpoint two-phase concluído |
| `buffer-checkpoint-start` | `(int)` | Buffer write do checkpoint |
| `buffer-sync-start` | `(int, int)` | Sincronia de buffers |
| `buffer-sync-written` | `(int)` | Buffer escrito |
| `buffer-sync-done` | `(int, int, int)` | Sincronia concluída |
| `buffer-checkpoint-sync-start` | `()` | Fsync do checkpoint |
| `buffer-checkpoint-done` | `()` | Fsync concluído |
| `wal-buffer-write-dirty-start` | `()` | Dirty WAL buffer write |
| `wal-buffer-write-dirty-done` | `()` | Dirty write concluído |

✅ Útil para debug de contenção em produção sem overhead de logging.

No SystemTap, use `postgresql$PID.provider.name`. DTrace usa `postgresql$PID:::name`.

---

## 16. Regression Tests

### Testes Core

```bash
make check                                  # instalação temporária (antes de make install)
make installcheck                           # contra servidor rodando
make check-world                            # todos os testes + módulos
make installcheck-world                     # todos contra servidor instalado
```

### Paralelismo

```bash
make check MAX_CONNECTIONS=10                # reduz paralelismo
make check-world -j8 >/dev/null              # paralelo com 8 jobs
```

### Testes Adicionais

```bash
make check PG_TEST_EXTRA='ssl ldap kerberos'
```

Opções de `PG_TEST_EXTRA`: `kerberos`, `ldap`, `ssl`, `load_balance`, `libpq_encryption`, `oauth`, `regress_dump_restore`, `sepgsql`, `wal_consistency_checking`, `xid_wraparound`.

### TAP Tests (Perl)

```bash
make -C src/bin check PROVE_FLAGS='--timer'
make check PROVE_TESTS='t/001_test1.pl t/002_test2.pl'
```

Requer `--enable-tap-tests` no configure e módulo Perl `IPC::Run`.

Variáveis de ambiente: `PG_TEST_NOCLEAN` (retém dados em falha), `PG_TEST_TIMEOUT_DEFAULT` (default 180s).

### Isolation Tests (Concorrência)

```bash
make -C src/test/isolation check
```

### Recovery Tests

```bash
make -C src/test/recovery check
```

### Tests Customizados

```bash
make check EXTRA_TESTS=numeric_big           # teste extra não-default
make check PG_TEST_INITDB_EXTRA_OPTS='-k --wal-segsize=4'
make check PGOPTIONS="-c debug_parallel_query=regress"
```

---

## 17. oid2name e vacuumlo — Utilitários Legados

### oid2name

Mapeia OIDs e filenodes para nomes de tabelas. Útil em conjunto com `pg_waldump`.

```bash
oid2name                                    # lista databases
oid2name -s                                 # lista tablespaces
oid2name -d mydb                            # lista tabelas do database
oid2name -d mydb -f 155173                  # tabela pelo filenode
oid2name -d mydb -o 155173                  # tabela pelo OID
oid2name -d mydb -t accounts                # tabela pelo nome (LIKE)
oid2name -d mydb -f 155173 -x              # extended (schema, tablespace)
oid2name -d mydb -i                         # inclui índices e sequences
oid2name -d mydb -S                         # inclui objetos de sistema
oid2name -d mydb -q                         # sem cabeçalhos (scripting)
```

⚠️ O nome é histórico — oid2name lida mais com filenodes do que OIDs.

📝 Útil com `pg_waldump --relation=OID` para identificar relações nos logs WAL.

### vacuumlo

Remove Large Objects órfãos (LOs sem referência em colunas `oid` ou `lo`).

```bash
vacuumlo mydb                               # remove LOs órfãos
vacuumlo -n mydb                            # dry-run (mostra o que seria removido)
vacuumlo -v mydb                            # verbose
vacuumlo -l 100 mydb                        # máximo 100 LOs por transação
```

---

## 18. pg_test_fsync e pg_test_timing

### pg_test_fsync

Determina o método `wal_sync_method` mais rápido no sistema.

```bash
pg_test_fsync                               # teste de 5s por método
pg_test_fsync -f /pgdata/pg_wal/test.out    # arquivo no FS do WAL
pg_test_fsync -s 10                         # 10s por teste (mais preciso)
```

Resultados em microssegundos por operação de sync. Use para ajustar `wal_sync_method` e `commit_delay`.

### pg_test_timing

Mede overhead de timing do sistema. Útil para diagnosticar precisão do `EXPLAIN ANALYZE`.

```bash
pg_test_timing                              # teste de 3s
pg_test_timing -d 10                        # teste de 10s
```

Sistemas lentos para coletar timing produzem resultados de `EXPLAIN ANALYZE` menos precisos. TSC é o clock source mais preciso; `acpi_pm` é mais lento.

Alteração em Linux:

```bash
cat /sys/devices/system/clocksource/clocksource0/available_clocksource
echo tsc > /sys/devices/system/clocksource/clocksource0/current_clocksource
```

---

## 19. pg_amcheck — Verificação de Corrupção

Cliente para as funções da extensão `amcheck`. Verifica integridade de tabelas e índices B-tree.

```bash
pg_amcheck mydb                             # verifica database
pg_amcheck --all                            # todas as databases
pg_amcheck --table=pg_class                 # tabela específica
pg_amcheck --index=my_idx                   # índice específico
pg_amcheck --schema=public                  # schema específico
pg_amcheck --jobs=4                         # paralelo
pg_amcheck --progress                       # progresso
pg_amcheck --heapallindexed                 # verifica todos os heap tuples no índice
pg_amcheck --parent-check                   # verifica relações pai/filho (lock mais forte)
pg_amcheck --rootdescend                    # re-busca do root (implica parent-check)
pg_amcheck --checkunique                    # verifica unique constraints
pg_amcheck --skip=all-frozen                # pula páginas all-frozen
pg_amcheck --skip=all-visible               # pula páginas all-visible
pg_amcheck --exclude-toast-pointers         # não valida TOAST pointers
pg_amcheck --on-error-stop                  # para na primeira página corrompida
pg_amcheck --install-missing                # instala amcheck automaticamente
pg_amcheck --no-dependent-indexes           # não verifica índices dependentes
pg_amcheck --no-dependent-toast             # não verifica TOAST dependente
```

⚠️ `--parent-check` e `--rootdescend` usam locks relativamente fortes e bloqueiam `INSERT`, `UPDATE`, `DELETE`. Funções regulares usam locks leves.

---

## 20. Armadilhas Comuns

- `pgbench` em produção sem isolar o ambiente de teste
- `pg_waldump` sem especificar diretório WAL (`-p`) ou sem permissão de leitura
- `pg_controldata` em servidor rodando quando `pg_control_checkpoint()` via SQL seria mais seguro
- Esquecer `pg_verifybackup` após cada `pg_basebackup`
- `pg_checksums --enable` sem parar o cluster primeiro (shutdown clean)
- Ignorar SQLSTATE em handlers de exceção — usar mensagens de texto é frágil
- Criar tabela com mais de 1600 colunas (falha silenciosa ou erro)
- Não usar `-x .gz` no `pg_archivecleanup` para WAL comprimido — não remove nada
- Achar que `pg_isready` = banco aceita queries (só verifica socket)
- Usar `reindexdb` sem `--concurrently` em produção — `ACCESS EXCLUSIVE` lock
- `pg_checksums --enable` em replicação sem parar todos os nós primeiro
- `oid2name` requer servidor rodando — não funciona em cenários de corrupção catastrófica
- `pg_amcheck --parent-check` bloqueia escrita — usar só em janelas de manutenção
- Confundir OID com filenode no `oid2name` e `pg_waldump`
- Usar `vacuumlo` sem `--dry-run` primeiro em bancos com LOs legítimos
- Ignorar os exit codes do `pg_isready` em scripts — testar só `$? == 0` é insuficiente
- `pg_ctl stop -m immediate` causa crash recovery na próxima start
- Não configurar `PGCTLTIMEOUT` para ambientes com start lento (default 60s)
- `pgbench -l --sampling-rate` requer ajuste no cálculo de TPS
- `make installcheck` em servidor com objetos nomeados `regress_*` — colisão
