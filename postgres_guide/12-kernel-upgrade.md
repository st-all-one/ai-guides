# Configuração de Kernel, Upgrade e Non-Durability

Baseado na documentação oficial do PostgreSQL 18.4. Foco: configuração segura do SO, procedimentos de upgrade e理解 dos riscos de non-durability.

## 1. O Perigo do systemd RemoveIPC 🛑

Se `RemoveIPC=yes` em `/etc/systemd/logind.conf`, o systemd remove objetos IPC (shared memory, semáforos) quando o usuário postgres faz logout — mesmo que o PostgreSQL ainda esteja rodando.

```
WARNING:  could not remove shared memory segment
"/PostgreSQL.1450751626": No such file or directory
```

PostgreSQL fica **very unreliable** segundo a documentação oficial.

### Mitigação 1 — Criar usuário como system user

```bash
useradd -r postgres
```

No Debian/Ubuntu:

```bash
adduser --system postgres
```

System users são definidos por `SYS_UID_MAX` em `/etc/login.defs` e são isentos do RemoveIPC.

### Mitigação 2 — Desabilitar RemoveIPC

```ini
# /etc/systemd/logind.conf
RemoveIPC=no
```

```bash
systemctl restart systemd-logind
```

✅ Pelo menos UMA das duas mitigações é obrigatória. Pacotes de distribuição geralmente criam o usuário como system user; instalações manuais (source) são as mais afetadas.

## 2. OOM Killer — Proteção

O Linux pode matar o postmaster se a memória virtual se esgotar:

```
Out of Memory: Killed process 12345 (postgres).
```

Conexões existentes continuam, mas novas são recusadas. Requer restart.

### vm.overcommit_memory = 2

```bash
sysctl -w vm.overcommit_memory=2
```

Modo strict overcommit: o kernel não promete mais memória do que tem. Reduz significativamente as chances de OOM.

### Proteger o postmaster (oom_score_adj = -1000)

```bash
echo -1000 > /proc/self/oom_score_adj
```

No startup script, antes de invocar `postgres`:

```bash
export PG_OOM_ADJUST_FILE=/proc/self/oom_score_adj
export PG_OOM_ADJUST_VALUE=0
```

- Postmaster: `oom_score_adj = -1000` → nunca morto pelo OOM killer
- Processos filhos: `oom_score_adj = 0` (default) → podem ser mortos individualmente
- `PG_OOM_ADJUST_VALUE` pode ser alterado para qualquer valor

### Ajustes de memória preventivos

Se o próprio PostgreSQL causa OOM:

- Reduzir `shared_buffers`, `work_mem`, `hash_mem_multiplier`
- Reduzir `max_connections` e usar pooler externo (PgBouncer)

## 3. Memória Compartilhada e Semáforos

PostgreSQL usa IPC do System V (shmem + semáforos) ou POSIX. No Linux/FreeBSD: semáforos POSIX. Em outras plataformas: System V.

### Parâmetros System V IPC

| Parâmetro | Descrição | Valor mínimo |
|-----------|-----------|-------------|
| `SHMMAX` | Tamanho máximo de segmento shm (bytes) | ≥ 1 kB |
| `SHMMIN` | Tamanho mínimo de segmento shm | 1 |
| `SHMALL` | Total de shm disponível (bytes ou pages) | igual a SHMMAX |
| `SEMMNI` | Máx de identificadores de semáforo (sets) | ≥ ceil(num_os_semaphores / 16) |
| `SEMMNS` | Máx de semáforos no sistema | ≥ ceil(num_os_semaphores / 16) * 17 |
| `SEMMSL` | Máx de semáforos por set | ≥ 17 |

### Quantos semáforos?

PostgreSQL usa 1 semáforo por conexão, autovacuum worker, WAL sender e bgworker. Agrupados em sets de 16. Cada set tem um 17º semáforo extra ("magic number").

```bash
postgres -D $PGDATA -C num_os_semaphores
```

### Comandos por plataforma

**Linux** (defaults são adequados; POSIX semaphores usados):

```bash
sysctl -w kernel.shmmax=17179869184   # 16 GB
sysctl -w kernel.shmall=4194304        # em páginas
```

**FreeBSD**:

```bash
sysctl kern.ipc.shmall=32768
sysctl kern.ipc.shmmax=134217728
```

**NetBSD**:

```bash
sysctl -w kern.ipc.semmni=100
sysctl -w kern.ipc.semmns=256
```

**OpenBSD**:

```bash
sysctl kern.seminfo.semmni=100
sysctl kern.seminfo.semmns=256
```

**macOS** — via `/etc/sysctl.conf` (todos os 5 parâmetros obrigatórios):

```ini
kern.sysv.shmmax=4194304
kern.sysv.shmmin=1
kern.sysv.shmmni=32
kern.sysv.shmseg=8
kern.sysv.shmall=1024
```

**Solaris/illumos** — via project:

```bash
projadd -c "PostgreSQL DB User" \
  -K "project.max-shm-memory=(privileged,8GB,deny)" \
  -U postgres -G postgres user.postgres
```

## 4. Huge Pages

Reduz overhead de TLB para `shared_buffers` grandes.

### Verificar necessidade

```bash
postgres -D $PGDATA -C shared_memory_size_in_huge_pages
grep ^Hugepagesize /proc/meminfo
ls /sys/kernel/mm/hugepages/
```

### Configurar

```bash
sysctl -w vm.nr_hugepages=3170
```

Para tamanhos não-padrão (2MB vs 1GB):

```bash
echo 3170 > /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages
```

### Permissões

```bash
sysctl -w vm.hugetlb_shm_group=$(id -g postgres)
ulimit -l unlimited  # ou valor específico
```

### postgresql.conf

```ini
huge_pages = on       # Falha se não disponível
huge_pages = try      # Tenta, mas aceita fallback (default)
huge_page_size = 2MB  # Força tamanho específico
```

## 5. Limites de Recurso do Sistema

PostgreSQL usa 1 processo por conexão. Ajustes recomendados:

### Linux

```bash
# /etc/security/limits.conf
postgres  soft  nofile  65536
postgres  hard  nofile  65536
postgres  soft  nproc   65536
postgres  hard  nproc   65536
```

### Sistema

```bash
sysctl -w fs.file-max=200000
sysctl -w net.core.somaxconn=1024    # Fila de conexões socket
```

### macOS/BSD — via /etc/login.conf

```ini
default:\
        :datasize-cur=8192M:\
        :maxproc-cur=256:\
        :openfiles-cur=256:\
```

### max_files_per_process

Se o limite system-wide for atingido:

```ini
max_files_per_process = 1000
```

## 6. Sistema de Arquivos

Filesystems recomendados: XFS ou ext4 (Linux).

### Montagem

```bash
# /etc/fstab
/dev/sda1 /var/lib/pgsql xfs defaults,noatime 0 0
```

- `noatime`: elimina updates de access time, reduz I/O
- WAL em disco separado (opcional, mas recomendado para alta carga)

### NFS

```bash
mount -o hard,noatime server:/export /var/lib/pgsql
```

- Obrigatório: `hard` (não use `soft`)
- Opcional: `sync` no export do servidor NFS

## 7. Non-Durability Settings — Detalhamento Técnico

A documentação oficial adverte: durabilidade garante que transações confirmadas sobrevivam a crash do servidor OU queda de energia. Desabilitar parcialmente a durabilidade acelera o banco, mas com riscos específicos.

### Tabela comparativa de riscos

| Setting | Protege contra crash do DB? | Protege contra crash do SO? | Risco |
|---------|---------------------------|----------------------------|-------|
| `fsync = off` | ✅ Sim | 🛑 **Não** — corrupção/data loss | Corrupção de página |
| `synchronous_commit = off` | 🛑 **Não** — perde transações recentes | 🛑 **Não** | Perde até ~1s de commits |
| `full_page_writes = off` | ✅ Sim | 🛑 **Não** — página parcial | Corrupção de página |
| Ramdisk | ✅ Sim (enquanto ligado) | 🛑 **Não** — tudo perdido no reboot | Perda total |
| Unlogged tables | 🛑 **Não** — truncadas no crash | 🛑 **Não** | Perda dos dados |

### fsync = off 🛑

```ini
fsync = off
```

- Corrupção ou perda de dados **garantida** em caso de crash do SO
- NUNCA em produção
- Útil apenas para carga bulk efêmera (COPY de dados descartáveis)

### synchronous_commit = off ⚠️

```ini
synchronous_commit = off
```

- Transações confirmadas até ~1s antes do crash do DB são perdidas
- Distinção **CRÍTICA**: `synchronous_commit = off` perde dados mesmo em crash do DB (não apenas do SO)
- `fsync = off` perde dados apenas em crash do SO
- `full_page_writes = off` pode corromper páginas em crash do SO

### full_page_writes = off ⚠️

```ini
full_page_writes = off
```

- Remove escrita de página inteira no checkpoint
- Após crash do SO, páginas parcialmente escritas corrompem o banco
- Seguro apenas com hardware que garanta escrita atômica de página (bateria em RAID controller)

### Ramdisk 🛑

- Dados colocados em tmpfs ou ramfs
- Tudo perdido no restart/reboot
- Cenário aceitável: réplicas descartáveis, cache de dados temporários

### Unlogged Tables ⚠️

```sql
CREATE UNLOGGED TABLE meu_log (...);
```

- Não geram WAL
- Truncadas em crash do DB
- Úteis para dados efêmeros ou réplicas

### commit_delay / commit_siblings ✅

```ini
commit_delay = 100000    # 100ms (microssegundos)
commit_siblings = 5
```

- Agrupa múltiplos commits em um único flush de WAL
- Risco: muito baixo (apenas atrasa o flush, não o pula)
- Eficaz apenas sob carga com múltiplas transações simultâneas

### Ajustes combinados para carga bulk

```ini
fsync = off
synchronous_commit = off
full_page_writes = off
wal_level = minimal
max_wal_size = 20GB
checkpoint_timeout = 1h
```

🛑 **Nunca usar em produção.** Apenas para carga inicial de dados com backup externo.

## 8. Instalação — Método Moderno (Meson)

PG 18 usa Meson como build system default. Autoconf (configure/make) ainda existe mas é legado.

### Short version

```bash
meson setup build --prefix=/usr/local/pgsql
cd build
ninja
sudo ninja install
```

### Opções comuns

```bash
meson setup build \
  --prefix=/usr/local/pgsql \
  --buildtype=release \
  -Dssl=openssl \
  -Dllvm=enabled \
  -Dlibcurl=enabled \
  -Dicu=enabled \
  -Dlz4=enabled \
  -Dzstd=enabled
```

| Opção | Descrição |
|-------|-----------|
| `-Dssl=openssl` | SSL/TLS |
| `-Dllvm=enabled` | JIT compilation |
| `-Dlibcurl=enabled` | OAuth 2.0 |
| `-Dicu=enabled` | ICU collation |
| `-Dlz4=enabled` | Compressão LZ4 em WAL |
| `-Dzstd=enabled` | Compressão ZSTD |
| `-Dsystemd=enabled` | Notificações systemd |

### Pós-instalação

```bash
adduser postgres && mkdir -p /usr/local/pgsql/data && chown postgres /usr/local/pgsql/data
export PATH=/usr/local/pgsql/bin:$PATH
/sbin/ldconfig /usr/local/pgsql/lib   # se necessário
```

## 9. Criação de Cluster

```bash
initdb -D /var/lib/pgsql/data \
  --locale=pt_BR.UTF-8 \
  --encoding=UTF8 \
  --data-checksums \
  -A scram-sha-256
```

### data_checksums

- PG 18: `--data-checksums` é o **default**
- NUNCA desabilitar em produção

### Locale vs ICU

```bash
# Locale do SO (tradicional)
initdb --locale=pt_BR.UTF-8

# ICU (recomendado para consistência cross-platform)
initdb --locale-provider=icu --icu-locale=pt-BR
```

✅ ICU é mais consistente entre SOs e upgrades.

### Grupos (opcional)

```bash
initdb -D /var/lib/pgsql/data --allow-group-access
```

Diretórios: 0750, arquivos: 0640.

## 10. Upgrade de Versão

### Minor Upgrade — substituir binários e restart

```bash
pg_ctl -D /var/lib/pgsql/data stop -m fast
# substituir binários
pg_ctl -D /var/lib/pgsql/data start
```

### Major Upgrade — 3 métodos

| Método | Velocidade | Downtime | Versões |
|--------|-----------|----------|---------|
| pg_dumpall | Lenta | Alto | Qualquer |
| pg_upgrade | Rápida | Médio | ≥ 9.2 |
| Replicação lógica | Rápida | Segundos | Cross-version |

#### pg_dumpall

```bash
pg_dumpall > dump.sql
pg_ctl stop -m fast
initdb -D /var/lib/pgsql/18/data
pg_ctl start -D /var/lib/pgsql/18/data
psql -d postgres -f dump.sql
```

#### pg_upgrade — Detalhado

Sintaxe:

```bash
pg_upgrade -b /usr/lib/postgresql/17/bin -B /usr/lib/postgresql/18/bin \
  -d /var/lib/pgsql/17/data -D /var/lib/pgsql/18/data
```

**Opções principais:**

| Opção | Descrição |
|-------|-----------|
| `--check` | Valida sem modificar nada |
| `--link` (-k) | Hard links — RÁPIDO, mas old cluster inválido após |
| `--clone` | Reflink (COW) — rápido, old cluster intacto |
| `--swap` | Troca diretórios — mais rápido com muitas relations |
| `--copy` | Cópia física (default) — lento mas seguro |
| `--no-sync` | 🛑 **NUNCA em produção** — corrompe em crash do SO |
| `--retain` | Retém logs/SQL mesmo após sucesso |
| `--jobs` | Paralelismo (`-j 4`) |

**Procedimento recomendado:**

```bash
pg_dumpall > /backup/pre-upgrade.sql
pg_ctl -D /var/lib/pgsql/17/data stop -m fast
initdb -D /var/lib/pgsql/18/data
pg_upgrade --check -b /usr/lib/postgresql/17/bin -B /usr/lib/postgresql/18/bin \
  -d /var/lib/pgsql/17/data -D /var/lib/pgsql/18/data
pg_upgrade --clone -j 4 -b /usr/lib/postgresql/17/bin -B /usr/lib/postgresql/18/bin \
  -d /var/lib/pgsql/17/data -D /var/lib/pgsql/18/data
vacuumdb --all --analyze-in-stages
vacuumdb --all --analyze-only --jobs=4
```

⚠️ **Warning:** O superuser da source pode executar código arbitrário na destination.

**Reverter:** `--check`/`--copy`/`--clone` mantêm old intacto. `--link` antes de startar: remove `.old` de `pg_control`. `--link` após start: restore do backup.

#### Replicação Lógica

```sql
CREATE PUBLICATION upgrade_pub FOR ALL TABLES;
CREATE SUBSCRIPTION upgrade_sub
  CONNECTION 'host=old_host dbname=db user=postgres'
  PUBLICATION upgrade_pub;
```

- Cross-version, downtime de segundos
- Requer `wal_level = logical` no publisher
- Sequências não replicadas (sync manual)

## 11. Server Start/Shutdown

### Start

```bash
pg_ctl -D /var/lib/pgsql/data -l logfile start
systemctl start postgresql   # via systemd
```

### Shutdown Modes

| Sinal | Modo | Comportamento | Uso |
|-------|------|---------------|-----|
| `SIGTERM` | **Smart** | Espera conexões terminarem | Default |
| `SIGINT` | **Fast** | Rollback conexões ativas | Manutenção |
| `SIGQUIT` | **Immediate** | Recovery no restart | Emergência |

```bash
pg_ctl stop -m smart      # Espera (default)
pg_ctl stop -m fast       # Rollback (recomendado)
pg_ctl stop -m immediate  # Aborta (emergência)
```

✅ **Fast** é o modo recomendado para manutenção. Smart pode travar. Immediate: recovery no restart — emergência apenas.

## 12. Armadilhas Comuns

- **Ignorar RemoveIPC**: sintomas intermitentes de corrupção de shared memory, erros "could not remove shared memory segment". Difícil de diagnosticar.
- **pg_upgrade --no-sync em produção**: corrupção silenciosa em caso de crash do SO durante o upgrade. 🛑 NUNCA usar.
- **Não testar upgrade em staging**: diferenças de locale, encoding ou extensões quebram o processo.
- **synchronous_commit = off sem entender o risco**: perde transações em crash do DB (não apenas do SO).
- **fsync = off para "ganhar performance"**: corrupção garantida em crash do SO, muitas vezes silenciosa.
- **Usar postgres como non-system user**: RemoveIPC mata shared memory quando o usuário faz logout.
- **Ignorar oom_score_adj**: postmaster morto pelo OOM killer.
- **Upgrade sem --check**: descobrir incompatibilidades só depois de modificar o cluster.
- **Esquecer vacuumdb --analyze-in-stages após upgrade**: performance degradada.
