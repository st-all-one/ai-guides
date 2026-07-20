# Migração e Versionamento

Baseado em: `lang_altertable.html`, `lang_createindex.html`, `lang_vacuum.html`,
`formatchng.html`, `session.html`, `pragma.html`

---

## 1. Alterações de Schema

### ALTER TABLE (Suportado)

```sql
-- Renomear tabela
ALTER TABLE old_name RENAME TO new_name;

-- Adicionar coluna (só no final, sem constraints NOT NULL sem default)
ALTER TABLE t ADD COLUMN nova_coluna TEXT DEFAULT '';

-- Renomear coluna (v3.25.0+)
ALTER TABLE t RENAME COLUMN old_col TO new_col;

-- Dropar coluna (v3.35.0+)
ALTER TABLE t DROP COLUMN col_obsoleta;
```

### ALTER TABLE (Não Suportado)

SQLite **não suporta** diretamente:
- `DROP CONSTRAINT`
- `ALTER COLUMN TYPE`
- `ADD CONSTRAINT`
- `DROP DEFAULT`

**Workaround** para estas operações:

```sql
-- 1. Criar nova tabela com o schema desejado
CREATE TABLE t_new (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    nova_col TEXT DEFAULT 'valor'
);

-- 2. Copiar dados (com possível transformação)
INSERT INTO t_new (id, nome, nova_col)
SELECT id, nome, 'valor_padrao' FROM t_old;

-- 3. Dropar tabela antiga
DROP TABLE t_old;

-- 4. Renomear nova
ALTER TABLE t_new RENAME TO t_old;

-- 5. Recriar índices e triggers
CREATE INDEX idx_nome ON t_old(nome);
```

### Adicionar NOT NULL a coluna existente

```sql
-- Passo 1: Criar nova tabela com NOT NULL
CREATE TABLE t_new (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL  -- agora NOT NULL
);

-- Passo 2: Migrar dados (lidar com NULLs)
INSERT INTO t_new (id, nome)
SELECT id, COALESCE(nome, '') FROM t_old;

-- Passo 3: Substituir
DROP TABLE t_old;
ALTER TABLE t_new RENAME TO t_old;
```

## 2. Migração Segura com Transações

### Transação Única (Schema + Dados)

```sql
BEGIN IMMEDIATE;  -- importante para migração

-- Criar nova tabela
CREATE TABLE t_new (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE
);

-- Migrar dados
INSERT INTO t_new (id, nome, email)
SELECT id, COALESCE(nome, ''), email FROM t_old;

-- Substituir
DROP TABLE t_old;
ALTER TABLE t_new RENAME TO t_old;

-- Recriar dependências
CREATE INDEX idx_t_email ON t_old(email);

COMMIT;
```

### Tabela de Migrações

```sql
CREATE TABLE IF NOT EXISTS _schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now')),
    description TEXT
);
```

### Classe de Migração (Padrão)

```c
typedef struct {
    int version;
    const char *sql;
    const char *description;
} Migration;

Migration migrations[] = {
    {1, "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)", "Cria users"},
    {2, "ALTER TABLE users ADD COLUMN email TEXT", "Adiciona email"},
    {3, "CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), title TEXT)",
     "Cria posts"},
    {4, "CREATE INDEX idx_posts_user ON posts(user_id)", "Índice posts.user_id"},
};

int current_version = 0;

// Consultar versão atual
sqlite3_prepare_v2(db,
    "SELECT MAX(version) FROM _schema_version", -1, &stmt, NULL);
if (sqlite3_step(stmt) == SQLITE_ROW)
    current_version = sqlite3_column_int(stmt, 0);
sqlite3_finalize(stmt);

// Aplicar migrações pendentes
for (int i = current_version + 1; i <= ARRAYSIZE(migrations); i++) {
    Migration *m = &migrations[i - 1];
    sqlite3_exec(db, "BEGIN IMMEDIATE", NULL, NULL, NULL);

    char *err = NULL;
    if (sqlite3_exec(db, m->sql, NULL, NULL, &err) != SQLITE_OK) {
        sqlite3_exec(db, "ROLLBACK", NULL, NULL, NULL);
        fprintf(stderr, "Migration %d falhou: %s\n", m->version, err);
        sqlite3_free(err);
        return ERROR;
    }

    // Registrar versão
    char sql_version[256];
    snprintf(sql_version, sizeof(sql_version),
        "INSERT INTO _schema_version(version, description) VALUES(%d, %Q)",
        m->version, m->description);
    sqlite3_exec(db, sql_version, NULL, NULL, NULL);

    sqlite3_exec(db, "COMMIT", NULL, NULL, NULL);
    printf("Migration %d aplicada: %s\n", m->version, m->description);
}
```

## 3. Schema Format Number

O SQLite usa um número de formato de schema (1-4) no cabeçalho do banco:

| Formato | Suporta | Default Desde |
|---|---|---|
| 1 | Básico | 3.0.0 (2004) |
| 4 | Descending indexes, booleanos compactos | 3.7.10 (2012) |

```sql
PRAGMA schema_version;      -- versão do schema (auto-incrementada em DDL)
PRAGMA user_version;        -- versão do usuário (livre)
PRAGMA application_id;      -- identifica seu formato de arquivo
```

### application_id

Útil para identificar o formato do arquivo:

```sql
PRAGMA application_id = 0x4D795F44;  -- "My_D" em hex
```

Quando definido, ferramentas como `file` reconhecem seu formato:

```bash
$ file meubanco.db
meubanco.db: SQLite 3.x database, application id=0x4d795f44
```

## 4. Migração entre Versões do SQLite

### Compatibilidade

SQLite garante **compatibilidade retroativa completa**: bancos de dados
criados na v3.0.0 (2004) abrem na v3.53.0 sem migração.

### Mudanças a Observar

| Mudança | Versão | Detalhe |
|---|---|---|
| Default schema format 4 | 3.7.10 | Descending indexes + booleanos compactos |
| WAL mode | 3.7.0 | Write-Ahead Log |
| FTS5 | 3.9.0 | Full-Text Search 5 (FTS3/4 legado) |
| JSON | 3.9.0 | Funções JSON |
| WITHOUT ROWID | 3.8.0 | Tabelas clusterizadas por PK |
| STRICT tables | 3.37.0 | Tipagem rígida |
| RENAME COLUMN / DROP COLUMN | 3.25.0 / 3.35.0 | ALTER TABLE melhorado |
| Window functions | 3.25.0 | Funções de janela |
| Generated columns | 3.31.0 | Colunas computadas |

### Verificação de Compatibilidade

```c
// Verificar versão do SQLite em tempo de compilação
#if SQLITE_VERSION_NUMBER < 3037000
#error "SQLite 3.37+ required for STRICT tables"
#endif

// Verificar versão em tempo de execução
if (sqlite3_libversion_number() < 3037000) {
    fprintf(stderr, "SQLite 3.37+ required\n");
    exit(1);
}
```

## 5. Boas Práticas de Versionamento

### Estratégia Recomendada

1. **Toda alteração de schema é uma migration** com número de versão
2. **Migrações são imutáveis após aplicadas** (nunca editar uma migration já aplicada)
3. **Sempre testar migrations em staging antes de produção**
4. **Transação por migration** (BEGIN/COMMIT ou ROLLBACK em erro)
5. **Registrar checksum** da migration para detectar alterações

```sql
CREATE TABLE _schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now')),
    description TEXT,
    checksum TEXT    -- hash SHA256 do SQL da migration
);

-- Verificação de integridade
SELECT version, checksum FROM _schema_version ORDER BY version;
-- Comparar com checksums conhecidos
```

### Rollback de Migration

SQLite não tem `ROLLBACK` para migrations (DROP TABLE não desfaz
criação de coluna facilmente). Estratégia:

```sql
-- Criar migration reversa como parte do planejamento
-- Migration 5: adiciona coluna
CREATE TABLE t_new (...);
INSERT INTO t_new SELECT id, nome, email FROM t;
DROP TABLE t;
ALTER TABLE t_new RENAME TO t;

-- Rollback migration 5 (se necessário):
CREATE TABLE t_old (...);
INSERT INTO t_old SELECT id, nome FROM t;
DROP TABLE t;
ALTER TABLE t_old RENAME TO t;
DELETE FROM _schema_version WHERE version = 5;
```

## 6. Versionamento de Formato de Arquivo

Para aplicações que usam SQLite como formato de arquivo:

```sql
-- Identificar versão do formato
PRAGMA application_id;  -- deve ser único para o formato
PRAGMA user_version;    -- versão do schema do formato
PRAGMA schema_version;  -- versão interna do schema

-- Aplicação de exemplo:
PRAGMA application_id = 0x4D595F41;  -- "MY_A" (app identifier)
PRAGMA user_version = 2;             -- minha versão de formato
```

### Validação de Formato

```c
int validate_db_format(sqlite3 *db) {
    sqlite3_stmt *stmt;
    int app_id, user_ver;

    sqlite3_prepare_v2(db, "PRAGMA application_id", -1, &stmt, NULL);
    sqlite3_step(stmt);
    app_id = sqlite3_column_int(stmt, 0);
    sqlite3_finalize(stmt);

    sqlite3_prepare_v2(db, "PRAGMA user_version", -1, &stmt, NULL);
    sqlite3_step(stmt);
    user_ver = sqlite3_column_int(stmt, 0);
    sqlite3_finalize(stmt);

    if (app_id != 0x4D595F41) {
        fprintf(stderr, "Formato inválido\n");
        return 0;
    }
    if (user_ver > CURRENT_FORMAT_VERSION) {
        fprintf(stderr, "Formato mais recente que a aplicação\n");
        return 0;
    }
    return user_ver;  // versão atual para migrar se necessário
}
```

## 7. Checklist de Migração

- [ ] Backup do banco antes da migração
- [ ] Testar migration em cópia do banco de produção
- [ ] `BEGIN IMMEDIATE` para evitar deadlock
- [ ] Verificar `PRAGMA schema_version` antes/depois
- [ ] Verificar `PRAGMA integrity_check` após migração
- [ ] Índices e triggers recriados (se tabela foi dropada)
- [ ] Chaves estrangeiras re-habilitadas: `PRAGMA foreign_keys = ON`
- [ ] `PRAGMA optimize` após migração

## 8. Caso Real: task-manager — Transações e Rollback no Runner Rust

O projeto **task-manager** (Axum + SQLite + sqlx) implementa seu próprio
runner de migrações em Rust. A revisão revelou dois problemas:

### Problema 1: Ausência de transação explícita

Cada statement é executado individualmente (split por `;`). Uma migração
com múltiplos ALTER TABLE (como a V3) não tem atomicidade — se o 2º
ALTER falhar, o 1º já foi commitado.

**Solução**: Envolver cada migração em `BEGIN IMMEDIATE`/`COMMIT`:

```rust
sqlx::query("BEGIN IMMEDIATE").execute(pool).await?;
for stmt in statements {
    sqlx::query(stmt).execute(pool).await?;
}
sqlx::query("COMMIT").execute(pool).await?;
// Em caso de erro: ROLLBACK + retorno antecipado
```

### Problema 2: Rollback (down) inexistente

Não há `down()` para reverter nenhuma migração. Estratégia proposta:

```sql
-- Em vez de DROP TABLE, preservar dados:
ALTER TABLE v2_news RENAME TO backup_v2_news_2025_07_17_120000;
```

### Plano de Implementação

O plano completo de refatoração do runner está em
[wiki/plan/plan-02-transaction-safety-rollback.md](../../wiki/plan/plan-02-transaction-safety-rollback.md).

---

**Voltar ao início**: [01-intro.md](01-intro.md)
