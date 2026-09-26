# API C do SQLite — Uso Seguro e Eficiente

Baseado em: `cintro.html`, `c3ref/`, `capi3.html`

---

## 1. Objetos Essenciais

A API C do SQLite gira em torno de **2 objetos** e **8 funções** principais:

### Objetos

| Objeto | Descrição | Criado por | Destruído por |
|---|---|---|---|
| `sqlite3` | Conexão com o banco de dados | `sqlite3_open()` | `sqlite3_close()` |
| `sqlite3_stmt` | Instrução preparada (bytecode compilado) | `sqlite3_prepare()` | `sqlite3_finalize()` |

### Funções Essenciais

| Função | Propósito |
|---|---|
| `sqlite3_open()` | Abre/conecta a um banco de dados |
| `sqlite3_prepare_v2()` | Compila SQL em bytecode |
| `sqlite3_bind_*()` | Vincula valores a parâmetros |
| `sqlite3_step()` | Executa o próximo passo da instrução |
| `sqlite3_column_*()` | Lê valores da linha atual do resultado |
| `sqlite3_reset()` | Reinicia instrução preparada para reuso |
| `sqlite3_finalize()` | Libera instrução preparada |
| `sqlite3_close()` | Fecha conexão |

## 2. Ciclo de Vida de uma Consulta

```c
#include <sqlite3.h>

sqlite3 *db;
sqlite3_stmt *stmt;
int rc;

// 1. ABRIR conexão
rc = sqlite3_open_v2("meubanco.db", &db,
    SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_URI, NULL);
if (rc != SQLITE_OK) { /* erro */ }

// 2. PREPARAR instrução (usar _v2 sempre!)
rc = sqlite3_prepare_v2(db,
    "SELECT id, nome, salario FROM funcionarios WHERE dept = ?", -1, &stmt, NULL);
if (rc != SQLITE_OK) { /* erro */ }

// 3. VINCULAR parâmetros
sqlite3_bind_int(stmt, 1, 42);  // índice 1 = primeiro ?

// 4. EXECUTAR e iterar resultados
while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
    int id       = sqlite3_column_int(stmt, 0);
    const char *nome = (const char*)sqlite3_column_text(stmt, 1);
    double sal   = sqlite3_column_double(stmt, 2);
    // processar linha...
}

if (rc != SQLITE_DONE) { /* erro */ }

// 5. FINALIZAR statement
sqlite3_finalize(stmt);

// 6. FECHAR conexão
sqlite3_close(db);
```

## 3. Reutilização de Prepared Statements

**Sempre reutilize statements preparados** — o custo de `sqlite3_prepare()`
frequentemente equivale ou excede o de `sqlite3_step()`.

```c
// Preparar uma vez
sqlite3_prepare_v2(db, "INSERT INTO log (msg, level) VALUES (?, ?)", -1, &stmt, NULL);

// Reutilizar em loop
for (int i = 0; i < 10000; i++) {
    sqlite3_bind_text(stmt, 1, mensagens[i], -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, niveis[i]);

    int rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) { /* erro */ }

    sqlite3_reset(stmt);  // rewinds para reuso
    sqlite3_clear_bindings(stmt);  // opcional: limpa bindings anteriores
}
```

## 4. Parâmetros de Vinculação

### Formatos de Parâmetros

| Forma | Exemplo | Indexação |
|---|---|---|
| `?` | `WHERE id = ?` | Posicional (1, 2, 3...) |
| `?NNN` | `WHERE id = ?1 AND nome = ?2` | Número explícito |
| `:AAA` | `WHERE id = :id` | Nomeado |
| `$AAA` | `WHERE id = $id` | Nomeado |
| `@AAA` | `WHERE id = @id` | Nomeado |

```c
// Indexação numérica
sqlite3_bind_int(stmt, 1, 42);        // primeiro ?
sqlite3_bind_int(stmt, 2, 100);       // segundo ?

// Indexação nomeada
int idx = sqlite3_bind_parameter_index(stmt, "$nome");
sqlite3_bind_text(stmt, idx, "João", -1, SQLITE_TRANSIENT);
```

### Tipos de Bind

| Função | Tipo SQL |
|---|---|
| `sqlite3_bind_int(stmt, i, v)` | INTEGER |
| `sqlite3_bind_int64(stmt, i, v)` | INTEGER 64-bit |
| `sqlite3_bind_double(stmt, i, v)` | REAL |
| `sqlite3_bind_text(stmt, i, str, len, destr)` | TEXT |
| `sqlite3_bind_blob(stmt, i, blob, len, destr)` | BLOB |
| `sqlite3_bind_null(stmt, i)` | NULL |
| `sqlite3_bind_pointer(stmt, i, ptr, type, destr)` | Pointer |
| `sqlite3_bind_zeroblob(stmt, i, len)` | BLOB de zeros |

### Destructor em bind_text/bind_blob

| Valor | Comportamento |
|---|---|
| `SQLITE_STATIC` | Ponteiro é válido até o próximo `step()` ou `reset()` |
| `SQLITE_TRANSIENT` | SQLite copia os dados (seguro, mas aloca) |
| `free`/callback | SQLite chama este callback para liberar os dados |

**Regra prática**: use `SQLITE_TRANSIENT` a menos que tenha certeza do
tempo de vida do buffer.

## 5. Leitura de Colunas

### Funções de Extração

```c
int       sqlite3_column_count(stmt);          // número de colunas
int       sqlite3_column_type(stmt, i);        // tipo do valor (SQLITE_INTEGER, _FLOAT, _TEXT, _BLOB, _NULL)
int       sqlite3_column_int(stmt, i);
sqlite3_int64 sqlite3_column_int64(stmt, i);
double    sqlite3_column_double(stmt, i);
const unsigned char *sqlite3_column_text(stmt, i);   // UTF-8
const void *sqlite3_column_blob(stmt, i);            // BLOB
int       sqlite3_column_bytes(stmt, i);             // tamanho em bytes
```

**⚠️ AVISO IMPORTANTE**: Ponterios retornados por `sqlite3_column_blob()`,
`sqlite3_column_text()`, etc. podem ser **invalidados** por chamadas
subsequentes a `sqlite3_column_bytes()`, `sqlite3_column_text()` ou
`sqlite3_column_blob()`. Sempre extraia bytes/text **antes** de
chamar a outra função de conversão, ou copie os dados.

```c
// CORRETO
const void *blob = sqlite3_column_blob(stmt, 0);
int n = sqlite3_column_bytes(stmt, 0);
// blob ainda é válido aqui

// ERRADO — bytes() pode invalidar blob
// int n = sqlite3_column_bytes(stmt, 0);
// const void *blob = sqlite3_column_blob(stmt, 0);  // blob pode ser inválido!
```

## 6. Convenience Wrappers

### sqlite3_exec()
Para SQL único sem parâmetros ou processamento simples:

```c
// Sem callback (INSERT/UPDATE/DELETE)
rc = sqlite3_exec(db, "CREATE TABLE t(a)", NULL, NULL, &errmsg);

// Com callback para queries
rc = sqlite3_exec(db, "SELECT * FROM t",
    [](void *data, int cols, char **values, char **names) -> int {
        for (int i = 0; i < cols; i++)
            printf("%s = %s\n", names[i], values[i] ? values[i] : "NULL");
        return 0;  // 0 = continua, != 0 = aborta
    }, user_data, &errmsg);
```

### sqlite3_get_table()
Armazena resultados completos em heap:

```c
char **result;
int rows, cols;
rc = sqlite3_get_table(db, "SELECT * FROM t", &result, &rows, &cols, &errmsg);
// result[0..cols-1] = nomes das colunas
// result[cols..] = dados, row r col c = result[(r+1)*cols + c]
sqlite3_free_table(result);
```

## 7. Tratamento de Erros

### Códigos de Retorno Comuns

| Código | Significado |
|---|---|
| `SQLITE_OK` (0) | Sucesso |
| `SQLITE_ROW` (100) | `sqlite3_step()` tem outra linha disponível |
| `SQLITE_DONE` (101) | `sqlite3_step()` completou execução |
| `SQLITE_BUSY` (5) | Banco bloqueado (retentar) |
| `SQLITE_ERROR` (1) | Erro genérico |
| `SQLITE_MISUSE` (21) | API usada incorretamente |
| `SQLITE_CONSTRAINT` (19) | Violação de constraint |
| `SQLITE_CORRUPT` (11) | Arquivo de banco corrompido |
| `SQLITE_NOMEM` (7) | Out of memory |
| `SQLITE_TOOBIG` (18) | Linha ou SQL muito grande |
| `SQLITE_INTERRUPT` (9) | Interrompido por `sqlite3_interrupt()` |
| `SQLITE_IOERR` (10) | Erro de I/O |

### Obtenção de Mensagens de Erro

```c
// Último erro da conexão
const char *msg = sqlite3_errmsg(db);
int errcode = sqlite3_errcode(db);
int extended = sqlite3_extended_errcode(db);

// Erro de um statement específico
const char *stmt_err = sqlite3_errmsg(stmt);
```

## 8. Configuração Global vs Por Conexão

### Global (antes de qualquer conexão)

```c
sqlite3_config(SQLITE_CONFIG_SINGLETHREAD);          // modo single-thread
sqlite3_config(SQLITE_CONFIG_MEMSTATUS, 0);          // desativa estatísticas
sqlite3_config(SQLITE_CONFIG_PAGECACHE, buf, sz, n); // page cache dedicado
sqlite3_config(SQLITE_CONFIG_HEAP, buf, sz, min);    // heap fixo (memsys5)
sqlite3_config(SQLITE_CONFIG_LOOKASIDE, 1200, 100);  // lookaside pool
sqlite3_config(SQLITE_CONFIG_MMAP_SIZE, 0, 0);       // desativa mmap
```

### Por Conexão

```c
sqlite3_limit(db, SQLITE_LIMIT_LENGTH, 1000000);     // limite de string/blob
sqlite3_limit(db, SQLITE_LIMIT_SQL_LENGTH, 100000);  // limite de SQL
sqlite3_limit(db, SQLITE_LIMIT_ATTACHED, 0);         // desativa ATTACH

sqlite3_db_config(db, SQLITE_DBCONFIG_DEFENSIVE, 1, NULL);
sqlite3_db_config(db, SQLITE_DBCONFIG_TRUSTED_SCHEMA, 0, NULL);
sqlite3_db_config(db, SQLITE_DBCONFIG_ENABLE_FKEY, 1, NULL);
```

## 9. Controle de Execução

### Timeout de Busy

```c
sqlite3_busy_timeout(db, 5000);  // espera até 5s quando banco ocupado
```

### Interrupção Assíncrona

```c
// Em outra thread:
sqlite3_interrupt(db);  // faz sqlite3_step() retornar SQLITE_INTERRUPT
```

### Progress Handler

```c
sqlite3_progress_handler(db, 100, [](void*) -> int {
    // Verifica se deve abortar — return != 0 aborta
    return check_user_canceled() ? 1 : 0;
}, NULL);
```

## 10. Debugging

```c
// Habilitar trace de SQL
sqlite3_exec(db, "PRAGMA vdbe_trace=ON;", NULL, NULL, NULL);

// Habilitar log de erros
sqlite3_config(SQLITE_CONFIG_LOG, [](void *ud, int ec, const char *msg) {
    fprintf(stderr, "SQLite(%d): %s\n", ec, msg);
}, NULL);
```

Para usar panic hook no Rust com console_error_panic_hook:

```rust
console_error_panic_hook::set_once();
```

---

**Próximo**: [04-ddl-datatypes.md](04-ddl-datatypes.md) — Tipos de Dados e DDL
