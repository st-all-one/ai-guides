# Extensões e VFS

Baseado em: `loadext.html`, `c3ref/create_module.html`, `vfs.html`,
`vtab.html`, `carray.html`, `json1.html`, `series.html`

---

## 1. Extensões Carregáveis

### Ativação

Extensões são **desativadas por padrão** por segurança:

```c
// Habilitar carregamento de extensões
sqlite3_db_config(db, SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION, 1, NULL);

// Carregar extensão
sqlite3_load_extension(db, "./minha_ext.so", NULL, &errmsg);
```

Ou via SQL:
```sql
-- Precisa de permissão
LOAD_EXTENSION('./minha_ext.so');
```

### Compilação de Extensões

```bash
# Linux
gcc -g -fPIC -shared minha_ext.c -o minha_ext.so

# macOS
gcc -g -fPIC -dynamiclib minha_ext.c -o minha_ext.dylib

# Windows (MSVC)
cl minha_ext.c -link -dll -out:minha_ext.dll

# Windows (MinGW)
gcc -g -shared minha_ext.c -o minha_ext.dll
```

### Template de Extensão

```c
#include <sqlite3ext.h>
SQLITE_EXTENSION_INIT1

static void minha_funcao(
    sqlite3_context *ctx,
    int argc,
    sqlite3_value **argv
) {
    const char *input = (const char*)sqlite3_value_text(argv[0]);
    // ... processamento ...
    sqlite3_result_text(ctx, resultado, -1, SQLITE_TRANSIENT);
}

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_minha_ext_init(
    sqlite3 *db,
    char **pzErrMsg,
    const sqlite3_api_routines *pApi
) {
    SQLITE_EXTENSION_INIT2(pApi);
    sqlite3_create_function(db, "minha_funcao", 1,
        SQLITE_UTF8 | SQLITE_DETERMINISTIC,
        NULL, minha_funcao, NULL, NULL);
    return SQLITE_OK;
}
```

### Auto-extension (para todas as conexões)

```c
sqlite3_auto_extension((void(*)(void))sqlite3_minha_ext_init);
// Agora toda nova conexão tem a função registrada
```

## 2. Extensões Inclusas no SQLite

| Extensão | Arquivo | Descrição |
|---|---|---|
| **JSON** | `json1.c` | Funções JSON (`json_extract`, `json_array`, etc.) |
| **FTS5** | `fts5.c` | Full-Text Search |
| **FTS3/FTS4** | `fts3.c` | Full-Text Search (legado) |
| **R-Tree** | `rtree.c` | Índices espaciais (R-tree) |
| **DBSTAT** | `dbstat.c` | Estatísticas de b-tree |
| **Carrier** | `carray.c` | Função de array |
| **Series** | `series.c` | Generate_series |
| **Geopoly** | `geopoly.c` | GeoJSON polygons |
| **Math** | `math.c` | Funções matemáticas |
| **Base64** | `base64.c` | Base64 encode/decode |
| **Base85** | `base85.c` | Base85 encode/decode |
| **Bytecode** | `bytecodevtab.c` | VTable para bytecode do VDBE |
| **DBPage** | `dbpage.c` | Acesso direto a páginas do banco |
| **Completion** | `completion.c` | Auto-complete para CLI |
| **CSV** | `csv.c` | Leitura de CSV como tabela virtual |
| **DBHash** | `dbhash.c` | Hash criptográfico de banco |
| **Percentile** | `percentile.c` | Função de percentil |
| **Regex** | `regexp.c` | Suporte a REGEXP |
| **SQLar** | `sqlar.c` | Arquivo zip-like dentro do SQLite |
| **SQLDiff** | `sqldiff.c` | Comparação de bancos |
| **TCL** | `tclsqlite3.c` | Binding para TCL |
| **UINT** | `uint.c` | Unsigned integer |
| **URI** | `uri.c` | Funções URI |
| **ZipFile** | `zipfile.c` | Leitura/escrita de ZIP |

## 3. Tabelas Virtuais (VTables)

### Criando VTable Customizada

```c
static sqlite3_module minha_mod = {
    .iVersion = 0,
    .xCreate = minha_create,
    .xConnect = minha_connect,
    .xBestIndex = minha_bestindex,
    .xDisconnect = minha_disconnect,
    .xDestroy = minha_destroy,
    .xOpen = minha_open,
    .xClose = minha_close,
    .xFilter = minha_filter,
    .xNext = minha_next,
    .xEof = minha_eof,
    .xColumn = minha_column,
    .xRowid = minha_rowid,
    .xUpdate = minha_update,
    .xBegin = NULL,
    .xSync = NULL,
    .xCommit = NULL,
    .xRollback = NULL,
    .xFindFunction = NULL,
    .xRename = NULL,
    .xSavepoint = NULL,
    .xRelease = NULL,
    .xRollbackTo = NULL,
};

sqlite3_create_module(db, "minha_vtab", &minha_mod, NULL);

// Uso:
CREATE VIRTUAL TABLE t1 USING minha_vtab(args);
```

### VTables Úteis Inclusas

**Series (generate_series)**:
```sql
CREATE VIRTUAL TABLE nums USING generate_series(1, 100, 2);
SELECT value FROM nums WHERE value < 50;
-- 1, 3, 5, ..., 49
```

**CSV**:
```sql
CREATE VIRTUAL TABLE dados USING csv(filename='dados.csv', header=TRUE);
SELECT * FROM dados;
```

**DBSTAT** (estatísticas de b-tree):
```sql
SELECT * FROM dbstat ORDER BY pageno;
```

### Flags de Segurança para VTables

```c
void criar_vtab_segura(sqlite3 *db) {
    static sqlite3_module mod = { ... };
    sqlite3_create_module(db, "vtab_segura", &mod, NULL);
    // Marcar como DIRECTONLY — não pode ser chamada do schema
    sqlite3_vtab_config(db, SQLITE_VTAB_DIRECTONLY);
}
```

## 4. VFS (Virtual File System)

O VFS abstrai todas as operações de arquivo: abrir, ler, escrever,
sincronizar, bloquear, truncar, excluir.

### VFS Padrão (Unix)

| Nome | Descrição |
|---|---|
| `unix` (default) | Locking POSIX, fsync |
| `unix-dotfile` | Locking por arquivo (útil para NFS) |
| `unix-excl` | Locking exclusivo, wal-index em heap |
| `unix-none` | Sem locking (corrompe facilmente) |
| `unix-namedsem` | Semáforos nomeados (VXWorks) |

### VFS Padrão (Windows)

| Nome | Descrição |
|---|---|
| `win32` (default) | Locking Windows |
| `win32-longpath` | Paths de até 65534 bytes |
| `win32-none` | Sem locking |

### VFS Shims (Wrappers)

| VFS | Descrição |
|---|---|
| `vfstrace` | Log de todas as chamadas VFS (debugging) |
| `quota` | Limita tamanho de arquivo de banco |
| `multiplex` | Divide banco em múltiplos arquivos (> limite FS) |
| `appendvfs` | Anexa banco ao final de outro arquivo (ex: executável) |

### Criando VFS Customizado

```c
static sqlite3_vfs meu_vfs = {
    .iVersion = 3,                    // v3 para todos os recursos
    .szOsFile = sizeof(MyFile),       // tamanho da struct de arquivo
    .mxPathname = 512,                // max pathname length
    .zName = "meu_vfs",
    .pAppData = NULL,
    .xOpen = meu_open,
    .xDelete = meu_delete,
    .xAccess = meu_access,
    .xFullPathname = meu_fullpathname,
    .xDlOpen = meu_dlopen,
    .xDlError = meu_dlerror,
    .xDlSym = meu_dlsym,
    .xDlClose = meu_dlclose,
    .xRandomness = meu_randomness,
    .xSleep = meu_sleep,
    .xCurrentTime = meu_currenttime,
    .xGetLastError = meu_getlasterror,
    .xCurrentTimeInt64 = meu_currenttime64,
    .xSetSystemCall = NULL,
    .xGetSystemCall = NULL,
    .xNextSystemCall = NULL,
};

sqlite3_vfs_register(&meu_vfs, 1);  // 1 = make default

// Usar VFS específico na abertura
sqlite3_open_v2("file:data.db?vfs=meu_vfs", &db,
    SQLITE_OPEN_READWRITE, NULL);
```

### Quando Criar VFS Customizado

- **Criptografia**: implementar criptografia transparente em `xRead`/`xWrite`
- **Compressão**: compressão transparente de páginas
- **Auditoria**: log de todas as operações de I/O
- **Storage customizado**: memória compartilhada, rede proprietária
- **Simulação de falhas**: para testes (ex: falha de I/O)

## 5. Epilog: Funções Matemáticas

Desde v3.35.0, funções matemáticas podem ser habilitadas:

```sql
-- Habilitar extensão matemática (se compilada separadamente)
.load ./math

-- Funções disponíveis:
SELECT acos(0.5), asin(0.5), atan(1), atan2(1, 0);
SELECT ceil(3.14), floor(3.14), trunc(3.14);
SELECT cos(0), sin(0), tan(0);
SELECT degrees(pi()), radians(180);
SELECT exp(1), ln(2), log10(100), log(2, 1024);
SELECT pow(2, 10), sqrt(144);
SELECT pi();
```

---

**Próximo**: [11-fts5.md](11-fts5.md) — Full-Text Search (FTS5)
