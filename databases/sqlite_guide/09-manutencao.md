# Manutenção e Backup

Baseado em: `backup.html`, `pragma.html`, `lang_vacuum.html`,
`howtocorrupt.html`, `session.html`

---

## 1. Backup Online (API de Backup)

A API `sqlite3_backup_*` permite cópia consistente de bancos de dados
ativos sem parar a aplicação.

### Fluxo Básico

```c
sqlite3 *pSrc, *pDest;

// Abrir fonte (ativo) e destino
sqlite3_open_v2("origem.db", &pSrc, SQLITE_OPEN_READONLY, NULL);
sqlite3_open_v2("backup.db", &pDest,
    SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, NULL);

// Iniciar backup
sqlite3_backup *pBackup = sqlite3_backup_init(pDest, "main", pSrc, "main");
if (pBackup) {
    // Copiar todas as páginas de uma vez
    int rc = sqlite3_backup_step(pBackup, -1);
    // -1 = copiar tudo de uma vez
    sqlite3_backup_finish(pBackup);
}

sqlite3_close(pDest);
sqlite3_close(pSrc);
```

### Backup Incremental (Sem Bloquear)

```c
sqlite3 *pSrc, *pDest;
sqlite3_open_v2("origem.db", &pSrc, SQLITE_OPEN_READONLY, NULL);
sqlite3_open_v2("backup.db", &pDest,
    SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, NULL);

sqlite3_backup *pBackup = sqlite3_backup_init(pDest, "main", pSrc, "main");
if (pBackup) {
    do {
        int rc = sqlite3_backup_step(pBackup, 5);  // 5 páginas por vez
        if (rc == SQLITE_OK || rc == SQLITE_DONE) {
            // Pausa para permitir que escritores da origem executem
            sqlite3_sleep(250);  // 250ms
        } else {
            break;
        }
    } while (rc != SQLITE_DONE);
    sqlite3_backup_finish(pBackup);
}

sqlite3_close(pSrc);
sqlite3_close(pDest);
```

### Parâmetros do backup_step

| N | Comportamento |
|---|---|
| `-1` | Copia todo o banco em uma chamada (bloqueia durante leitura) |
| `N` (positivo) | Copia `N` páginas por chamada, permitindo escrita entre chamadas |

### Tratamento de SQLITE_BUSY no Destino

```c
sqlite3_busy_timeout(pDest, 5000);  // espera até 5s se destino ocupado
```

## 2. VACUUM INTO (Desde v3.47.0)

Alternativa moderna à API de backup — cria cópia compactada:

```sql
VACUUM INTO '/caminho/backup.db';
-- Compacta + copia o banco ativo para um novo arquivo
```

Vantagens:
- Sintaxe SQL simples, sem código C
- Banco de origem nunca é bloqueado por muito tempo
- Resultado é sempre compactado (remove freelist pages)

## 3. sqlite3_rsync (Backup Remoto)

Ferramenta para backup eficiente via SSH de bancos SQLite:

```bash
sqlite3_rsync user@host:/path/origem.db /local/backup.db
```

Usa a API de backup internamente com transferência diferencial
(blocos modificados desde o último backup).

## 4. Checagem de Integridade

### quick_check vs integrity_check

```sql
-- Rápido (~1s por GB): verifica estrutura de páginas
PRAGMA quick_check;

-- Completo (~10s por GB): verifica estrutura + valores reais
PRAGMA integrity_check;

-- Por tabela
PRAGMA integrity_check(nome_tabela);
```

Quando executar:
- Após abrir banco de origem desconhecida
- Periodicamente (ex: semanalmente em cron)
- Após crash ou queda de energia
- Antes e depois de backups

## 5. Manutenção Periódica

### PRAGMA optimize

```sql
-- Executar regularmente (ex: antes de fechar conexão)
PRAGMA optimize;

-- Ou em conexões longas, periodicamente
PRAGMA optimize = 0x10002;  -- análise sem ação
-- ... depois:
PRAGMA optimize;  -- ação
```

### Reindex

```sql
-- Reconstruir índices (após mudanças massivas)
REINDEX;

-- Ou índice específico
REINDEX idx_nome;
```

### Análise de Freelist

```sql
-- Ver páginas não utilizadas (freelist)
PRAGMA freelist_count;

-- Recuperar espaço
PRAGMA incremental_vacuum(100);  -- libera 100 páginas
-- ou
VACUUM;  -- reorganização completa
```

## 6. Session Extension (Change Tracking)

A extensão **session** permite rastrear exatamente o que mudou no banco:

```c
// Inicializar sessão
sqlite3_session *pSession;
sqlite3session_create(db, "main", &pSession);

// Anexar tabelas para monitorar
sqlite3session_attach(pSession, "funcionarios");
sqlite3session_attach(pSession, "departamentos");

// ... executar operações ...

// Extrair changeset
int nChangeset;
void *pChangeset;
sqlite3session_changeset(pSession, &nChangeset, &pChangeset);

// Aplicar changeset em outro banco (sincronização)
sqlite3_changeset_apply(dbDest, nChangeset, pChangeset,
    conflict_handler, NULL);

// Liberar
sqlite3_free(pChangeset);
sqlite3session_delete(pSession);
```

Útil para:
- Replicação entre instâncias
- Sincronização offline→online
- Undo/redo
- Backup incremental lógico

## 7. Estratégias de Backup Recomendadas

### Backup Local (um banco)

```bash
# Opção 1: sqlite3 CLI
sqlite3 origem.db ".backup backup.db"

# Opção 2: VACUUM INTO (v3.47+)
sqlite3 origem.db "VACUUM INTO 'backup.db'"

# Opção 3: cópia simples (APENAS se banco não estiver em uso!)
cp origem.db backup.db
cp origem.db-wal backup.db-wal  # se WAL
```

### Backup Automatizado (cron)

```bash
#!/bin/bash
# /etc/cron.daily/sqlite-backup
SRC="/var/data/meubanco.db"
DST="/backup/meubanco-$(date +%Y%m%d-%H%M%S).db"
sqlite3 "$SRC" ".backup $DST"
gzip "$DST"
find /backup -name "*.gz" -mtime +30 -delete
```

### Para Requisitos de Alta Disponibilidade

```c
// A cada 5 minutos, faz backup incremental
void periodic_backup(sqlite3 *db) {
    static int last_pages = 0;
    sqlite3_backup *p = sqlite3_backup_init(
        g_pDest, "main", db, "main");
    if (p) {
        int rc = sqlite3_backup_step(p, 50);
        if (rc == SQLITE_OK) {
            sqlite3_sleep(100);
        }
        sqlite3_backup_finish(p);
    }
}
```

## 8. Tratamento de Corrupção

### Detecção

```sql
PRAGMA integrity_check;

-- Se detectar corrupção, extrair o máximo de dados possível:
.output dados_extraidos.sql
.dump
.output stdout
```

### Recuperação

```bash
# 1. Fazer backup do banco corrompido imediatamente
cp corrompido.db corrompido.db.bkp

# 2. Tentar extrair dados via .dump (ignora erros)
sqlite3 corrompido.db ".dump" > dados.sql

# 3. Recriar banco
sqlite3 novo.db < dados.sql

# 4. Verificar
sqlite3 novo.db "PRAGMA integrity_check;"
```

### Prevenção

```sql
PRAGMA cell_size_check = ON;    -- mais verificação, mais seguro
PRAGMA synchronous = NORMAL;    -- no WAL, previne corrupção
```

## 9. Versionamento de Schema

### application_id

```sql
PRAGMA application_id = 0x4D795F44;  -- My_D em hex, identifica seu formato
PRAGMA user_version = 3;              -- versão do schema (inteiro)
```

### Migração Segura

```sql
-- Verificar versão atual
PRAGMA user_version;

-- Migrar
BEGIN;
-- ALTER TABLE / CREATE TABLE ...
PRAGMA user_version = 4;
COMMIT;
```

### Schema Versioning com gerenciamento manual

```sql
-- Tabela de controle de migrações
CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now')),
    checksum TEXT
);

-- Aplicar migrações na ordem
SELECT MAX(version) FROM _migrations;  -- 3
-- Aplicar migration 4
BEGIN;
ALTER TABLE t ADD COLUMN x INTEGER;
INSERT INTO _migrations(version) VALUES(4);
COMMIT;
```

---

**Próximo**: [10-extensoes-vfs.md](10-extensoes-vfs.md) — Extensões e VFS
