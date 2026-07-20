# Segurança no SQLite ("Defense Against The Dark Arts")

Baseado em: `security.html`, `pragma.html`, `limits.html`, `compile.html`

---

## 1. Princípios Gerais

SQLite valida rigorosamente todas as entradas e não deve crashar, vazar
memória ou corromper dados mesmo com entradas maliciosas. No entanto,
bugs existem, e a documentação oficial descreve camadas adicionais de
proteção para aplicações que processam entradas ou arquivos não confiáveis.

## 2. Defesa Contra SQL Injection

### Nunca concatene SQL

```c
// ERRADO — SQL injection!
char sql[1024];
snprintf(sql, sizeof(sql), "SELECT * FROM users WHERE name = '%s'", user_input);

// CERTO — usa parâmetros vinculados
sqlite3_prepare_v2(db, "SELECT * FROM users WHERE name = ?", -1, &stmt, NULL);
sqlite3_bind_text(stmt, 1, user_input, -1, SQLITE_TRANSIENT);
```

### Autorizador (sqlite3_set_authorizer)

Bloqueia operações específicas por callback:

```c
int my_authorizer(void *userData, int actionCode,
                  const char *param3, const char *param4,
                  const char *dbName, const char *triggerOrView) {
    switch (actionCode) {
        case SQLITE_CREATE_TABLE:
        case SQLITE_DROP_TABLE:
        case SQLITE_ALTER_TABLE:
            return SQLITE_DENY;  // impede alterações de schema
        case SQLITE_READ:
            // Pode restringir acesso a colunas específicas
            if (strcmp(param3, "salario") == 0)
                return SQLITE_DENY;
            break;
        case SQLITE_INSERT:
        case SQLITE_UPDATE:
        case SQLITE_DELETE:
            // Lógica de permissão
            break;
    }
    return SQLITE_OK;
}

sqlite3_set_authorizer(db, my_authorizer, NULL);
```

## 3. Defesa Contra Arquivos de Banco Não Confiáveis

### Configuração Essencial (fazer após cada sqlite3_open)

```sql
PRAGMA trusted_schema = OFF;           -- impede execução sorrateira de funções customizadas
PRAGMA cell_size_check = ON;           -- verificação extra de integridade
PRAGMA mmap_size = 0;                  -- desativa mmap (evita corrupção por ponteiro solto)
```

Ou via API C:

```c
sqlite3_db_config(db, SQLITE_DBCONFIG_DEFENSIVE, 1, NULL);
sqlite3_db_config(db, SQLITE_DBCONFIG_TRUSTED_SCHEMA, 0, NULL);
```

### Verificação de Integridade

```sql
-- Abrir banco, verificar, rejeitar se corrompido
PRAGMA quick_check;    -- mais rápido, verifica estruturas principais
PRAGMA integrity_check;  -- completo, mais lento (verifica conteúdo real)
```

### Modo Defensive

Em modo DEFENSIVE, operações perigosas são bloqueadas:

```sql
PRAGMA defensive = ON;

-- Bloqueado em modo defensive:
PRAGMA writable_schema = ON;       -- não permite editar sqlite_schema
PRAGMA journal_mode = OFF;          -- não permite desativar journal
INSERT INTO sqlite_schema ...;     -- não permite inserir diretamente no schema
```

## 4. Limites de Segurança

### Configuração Recomendada para Alta Segurança

Usando `sqlite3_limit()` após abrir conexão:

```c
sqlite3_limit(db, SQLITE_LIMIT_LENGTH, 1000000);           // 1MB máx string/blob
sqlite3_limit(db, SQLITE_LIMIT_SQL_LENGTH, 100000);        // 100KB máx SQL
sqlite3_limit(db, SQLITE_LIMIT_COLUMN, 100);               // máx 100 colunas
sqlite3_limit(db, SQLITE_LIMIT_EXPR_DEPTH, 10);            // profundidade expressão
sqlite3_limit(db, SQLITE_LIMIT_COMPOUND_SELECT, 3);        // máximo 3 UNION
sqlite3_limit(db, SQLITE_LIMIT_FUNCTION_ARG, 8);           // máx 8 args função
sqlite3_limit(db, SQLITE_LIMIT_ATTACHED, 0);               // desativa ATTACH
sqlite3_limit(db, SQLITE_LIMIT_LIKE_PATTERN_LENGTH, 50);   // padrão LIKE curto
sqlite3_limit(db, SQLITE_LIMIT_VARIABLE_NUMBER, 10);       // poucos parâmetros
sqlite3_limit(db, SQLITE_LIMIT_TRIGGER_DEPTH, 10);         // profundidade trigger
```

### Hard Heap Limit

```c
// Limita memória total que SQLite pode alocar
sqlite3_hard_heap_limit64(50 * 1024 * 1024);  // 50MB máximo
```

### Limite de Alocação Individual

Compilar com:
```c
-DSQLITE_MAX_ALLOCATION_SIZE=100000000  // 100MB max por alocação
```

## 5. Prevenção de DoS

### Progress Handler

```c
int counter = 0;
sqlite3_progress_handler(db, 100, [](void *p) -> int {
    int *c = (int*)p;
    (*c)++;
    if (*c > 10000) return 1;  // aborta após ~1M operações VDBE
    return 0;
}, &counter);
```

### Interrupt (chamado de outra thread)

```c
// Thread 1: executa query
sqlite3_step(stmt);

// Thread 2: após timeout, aborta
sqlite3_interrupt(db);  // step() retorna SQLITE_INTERRUPT
```

### printf() Precision Limit

Previne DoS via `printf('%*s', 2147483647, 'hi')`:
```c
-DSQLITE_PRINTF_PRECISION_LIMIT=100000
```

## 6. Sandboxing com SQLITE_ENABLE_MEMSYS5

Para sistemas embarcados ou críticos, isole a memória do SQLite:

```c
#include <sqlite3.h>

static char heap[5 * 1024 * 1024];  // 5MB de heap dedicado

int main() {
    sqlite3_config(SQLITE_CONFIG_HEAP, heap, sizeof(heap), 4096);
    sqlite3_initialize();
    // ... uso normal do SQLite ...
}
```

Benefícios:
- Limite rígido de memória (nunca usa mais que 5MB)
- Isolamento: outros erros de memória não afetam SQLite (e vice-versa)
- Garantia matemática contra fragmentação (Robson proof)

## 7. Mitigação de SQL Injection por Entrada SQL

Mesmo com parâmetros vinculados para dados, entradas SQL não confiáveis
(que geram SQL dinamicamente) requerem proteção extra:

```c
// 1. Habilitar DEFENSIVE
sqlite3_db_config(db, SQLITE_DBCONFIG_DEFENSIVE, 1, NULL);

// 2. Reduzir limites (ver seção 4)

// 3. Usar autorizador para restringir operações
sqlite3_set_authorizer(db, my_authorizer, NULL);

// 4. Progress handler para DoS
sqlite3_progress_handler(db, 100, my_progress, NULL);

// 5. Hard heap limit
sqlite3_hard_heap_limit64(50 * 1024 * 1024);
```

## 8. Boas Práticas Contra Corrupção

| Ação | Motivo |
|---|---|
| `SQLITE_MINIMUM_FILE_DESCRIPTOR=3` | Evita corrupção por assert() escrevendo em fd=2 |
| `PRAGMA synchronous=NORMAL` no WAL | WAL garante não-corrupção com NORMAL |
| Não usar `journal_mode=OFF/MEMORY` | Esses modos podem corromper em queda |
| `PRAGMA cell_size_check=ON` | Detecta corrupção mais cedo |
| `PRAGMA mmap_size=0` para arquivos não confiáveis | Evita que bug de memória corrompa banco |
| Nunca copiar banco ativo sem Backup API ou VACUUM INTO | Cópia inconsistente |
| Nunca usar NFS ou SMB para bancos SQLite | Locking POSIX falha em redes |
| `PRAGMA integrity_check` após abrir arquivo suspeito | Verifica integridade |

### Causas Comuns de Corrupção (howtocorrupt.html)

1. **Sobrescrita por outro processo**: backup durante transação ativa
2. **Locking POSIX**: `close()` em qualquer FD cancela todos os locks
3. **Falha de fsync()**: drives mentem sobre dados chegarem ao disco
4. **Múltiplas cópias do SQLite linkadas**: globais duplicadas
5. **Desvincular/renomear banco aberto**: comportamento indefinido
6. **synchronous=OFF**: corrupção garantida em queda de energia

## 9. Funções DIRECTONLY

Para funções SQL customizadas que não devem ser executadas a partir
do schema de banco de dados:

```c
sqlite3_create_function(db, "minha_funcao_secreta", -1,
    SQLITE_UTF8 | SQLITE_DIRECTONLY,
    NULL, minha_func, NULL, NULL);
```

Com `SQLITE_DIRECTONLY`, a função só pode ser chamada de SQL textual
fornecido pela aplicação, não de triggers ou views armazenados no banco.

---

**Próximo**: [07-transacoes-wal.md](07-transacoes-wal.md) — Transações e WAL
