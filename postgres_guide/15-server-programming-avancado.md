# Programação Avançada no Servidor — PLs Alternativos, Background Workers, SPI, Logical Decoding

Baseado em: `05-Server-Programming/plpython-*.html`, `plperl-*.html`, `pltcl-*.html`, `bgworker.html`, `spi-*.html`, `logicaldecoding-*.html`, `custom-rmgr.html`, `xfunc-c.html`, `xfunc-volatility.html`, `extend-extensions.html`, `extend-pgxs.html`

---

## 1. PL/Python — Python no Servidor

### Trusted vs Untrusted

PL/Python é **apenas untrusted** (`plpython3u`). Não existe variante trusted. O código Python executa sem restrições — acesso a sistema de arquivos, rede, subprocessos. Apenas superusers podem criar funções em `plpython3u`.

```sql
CREATE EXTENSION plpython3u;
```

⚠️ PL/Python roda como superuser se a função for marcada SECURITY DEFINER. Sempre usar `SET search_path = pg_catalog, pg_temp` e qualificar esquemas.

⚠️ Python GIL (Global Interpreter Lock) — não escala bem com paralelismo. Múltiplas funções PL/Python no mesmo backend compartilham o mesmo interpretador.

### Mapeamento de Tipos PostgreSQL → Python

| PostgreSQL | Python |
|------------|--------|
| `boolean` | `bool` |
| `smallint`, `int`, `bigint`, `oid` | `int` |
| `real`, `double precision` | `float` |
| `numeric` | `Decimal` |
| `bytea` | `bytes` |
| `text`, `varchar`, `timestamp`, etc. | `str` |
| `null` | `None` |
| `array` | `list` |
| composite type | `dict` ou `tuple` |

### Funções PL/Python

```sql
CREATE FUNCTION pymax(a integer, b integer)
RETURNS integer
LANGUAGE plpython3u
AS $$
  if a > b:
    return a
  return b
$$;
```

Argumentos são passados como variáveis globais. Para reassign, usar `global x`:

```sql
CREATE FUNCTION pystrip(x text)
RETURNS text
LANGUAGE plpython3u
AS $$
  global x
  x = x.strip()
  return x
$$;
```

### Acesso a Banco — Módulo `plpy`

```sql
CREATE FUNCTION get_users() RETURNS SETOF text
LANGUAGE plpython3u
AS $$
  rv = plpy.execute("SELECT name FROM users", 5)
  return [row["name"] for row in rv]
$$;
```

**plpy.execute(query, limit)** — executa SQL, retorna objeto resultado. Aceita string ou plano preparado.

**plpy.prepare(query, argtypes)** — prepara plano:
```sql
plan = plpy.prepare("SELECT name FROM users WHERE id = $1", ["int"])
rv = plpy.execute(plan, [42])
```

**plpy.cursor(query)** — para grandes result sets:
```sql
for row in plpy.cursor("SELECT * FROM largetable"):
    process(row)
```

**Tratamento de erros** — capturar `plpy.SPIError` ou subtipos específicos:
```sql
from plpy import spiexceptions
try:
    plpy.execute("INSERT INTO fractions VALUES ($1 / $2)", [1, 0])
except spiexceptions.DivisionByZero:
    return "divisão por zero"
```

### Subtransações

```sql
CREATE PROCEDURE transfer_funds()
LANGUAGE plpython3u
AS $$
  try:
    with plpy.subtransaction():
      plpy.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
      plpy.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
  except plpy.SPIError as e:
    result = "erro: %s" % e.args
$$;
```

### Controle de Transação

Em procedures chamadas via `CALL` ou bloco `DO`:

```sql
CREATE PROCEDURE batch_insert()
LANGUAGE plpython3u
AS $$
  for i in range(10):
    plpy.execute("INSERT INTO test VALUES (%d)" % i)
    if i % 2 == 0:
      plpy.commit()
    else:
      plpy.rollback()
$$;
```

### Logging

```python
plpy.info("mensagem informativa")
plpy.warning("aviso")
plpy.error("erro")    # retorna SQLSTATE
plpy.fatal("fatal")   # aborta transação
```

### Triggers em PL/Python

O dicionário `TD` contém os dados do trigger:

```sql
CREATE FUNCTION py_trigger()
RETURNS trigger
LANGUAGE plpython3u
AS $$
  if TD["event"] == "INSERT":
    TD["new"]["created_at"] = plpy.execute("SELECT now()")[0]["now"]
    return "MODIFY"
  elif TD["event"] == "DELETE":
    return "SKIP"
  return "OK"
$$;
```

Campos do `TD`:

| Campo | Descrição |
|-------|-----------|
| `TD["event"]` | `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` |
| `TD["when"]` | `BEFORE`, `AFTER`, `INSTEAD OF` |
| `TD["level"]` | `ROW`, `STATEMENT` |
| `TD["new"]` | dicionário com a nova linha |
| `TD["old"]` | dicionário com a linha antiga |
| `TD["name"]` | nome do trigger |
| `TD["args"]` | argumentos do trigger |

Retornos possíveis em BEFORE/INSTEAD OF ROW:
- `None` / `"OK"` — linha não modificada
- `"SKIP"` — aborta operação
- `"MODIFY"` — linha foi modificada (apenas INSERT/UPDATE)

### Cache entre Chamadas — GD e SD

```sql
CREATE FUNCTION usesavedplan() RETURNS trigger
LANGUAGE plpython3u
AS $$
  if "plan" in SD:
    plan = SD["plan"]
  else:
    plan = plpy.prepare("SELECT 1")
    SD["plan"] = plan
$$;
```

- `SD` — dicionário privado por função (persistente na sessão)
- `GD` — dicionário global, compartilhado entre todas as funções PL/Python na sessão

---

## 2. PL/Perl — Trusted e Untrusted

### Variantes

| Linguagem | Trusted | Acesso irrestrito | Criação |
|-----------|---------|-------------------|---------|
| `plperl`  | ✅ Sim  | ❌ Sem sistema de arquivos, sem `require` | Qualquer usuário |
| `plperlu` | ❌ Não  | ✅ Acesso completo | Apenas superuser |

`plperl` usa o módulo Perl `Opcode` para bloquear operações inseguras. ⚠️ A documentação do Perl adverte que `Opcode` não é totalmente eficaz para este caso de uso. Considere `REVOKE USAGE ON LANGUAGE plperl FROM PUBLIC` para ambientes críticos.

🛑 `plperlu` permite execução arbitrária de comandos do sistema. Apenas superusers confiáveis devem criar funções `plperlu`.

```sql
CREATE EXTENSION plperl;
```

### Funções PL/Perl

```sql
CREATE FUNCTION perl_max(integer, integer) RETURNS integer
LANGUAGE plperl
AS $$
  my ($a, $b) = @_;
  return $a if $a > $b;
  return $b;
$$;
```

### Acesso a Banco

```perl
elog(NOTICE, "mensagem de log");

# Execução simples
my $rv = spi_exec_query("SELECT * FROM users");

# Com parâmetros
my $rv = spi_exec_query("SELECT * FROM users WHERE id = $1", $id);

# Cursor para grandes result sets
my $cursor = spi_query("SELECT * FROM big_table");
while (defined (my $row = spi_fetchrow($cursor))) {
    # processa $row->{column}
}
```

### Set-Returning Functions

```perl
CREATE FUNCTION perl_sequence(int, int) RETURNS SETOF int
LANGUAGE plperl
AS $$
  my ($start, $end) = @_;
  for ($start .. $end) {
    return_next($_);
  }
  return;
$$;
```

### Triggers em PL/Perl

```perl
CREATE FUNCTION valid_id() RETURNS trigger
LANGUAGE plperl
AS $$
  if ($_TD->{new}{i} >= 100 || $_TD->{new}{i} <= 0) {
    return "SKIP";
  }
  $_TD->{new}{v} .= "(modified)";
  return "MODIFY";
$$;
```

O hash `$_TD` contém:

| Campo | Descrição |
|-------|-----------|
| `$_TD->{new}{col}` | NEW da coluna |
| `$_TD->{old}{col}` | OLD da coluna |
| `$_TD->{event}` | INSERT, UPDATE, DELETE, TRUNCATE |
| `$_TD->{when}` | BEFORE, AFTER, INSTEAD OF |
| `$_TD->{level}` | ROW, STATEMENT |
| `$_TD->{name}` | nome do trigger |
| `$_TD->{args}` | array de argumentos |

---

## 3. PL/Tcl

### Variantes

| Linguagem | Trusted |
|-----------|---------|
| `pltcl`   | ✅ Sim (operações de sistema bloqueadas) |
| `pltclu`  | ❌ Não (acesso completo) |

```sql
CREATE EXTENSION pltcl;
```

### Funções PL/Tcl

```sql
CREATE FUNCTION tcl_max(integer, integer) RETURNS integer
LANGUAGE pltcl STRICT
AS $$
  if {$1 > $2} {return $1}
  return $2
$$;
```

Para nulos, usar `argisnull` e `return_null`:

```sql
CREATE FUNCTION tcl_safe_max(integer, integer) RETURNS integer
LANGUAGE pltcl
AS $$
  if {[argisnull 1]} {
    if {[argisnull 2]} { return_null }
    return $2
  }
  if {[argisnull 2]} { return $1 }
  if {$1 > $2} {return $1}
  return $2
$$;
```

### Acesso a Banco

```tcl
spi_exec "SELECT * FROM users WHERE id = $id"

# Preparado
set plan [spi_prepare "SELECT name FROM users WHERE id = $1" {int}]
spi_execp $plan [list $id]
```

### Set-Returning Functions

```tcl
CREATE FUNCTION tcl_sequence(int, int) RETURNS SETOF int
LANGUAGE pltcl
AS $$
  for {set i $1} {$i < $2} {incr i} {
    return_next $i
  }
$$;
```

### Triggers PL/Tcl

Usa variáveis globais `NEW` e `OLD` como arrays associativos.

---

## 4. Background Workers — Processos em Plano de Fundo

**Conceito**: processo separado que roda no backend do PostgreSQL, gerenciado pelo postmaster. Acessa memória compartilhada e pode conectar a banco via SPI.

**Casos de uso**: pg_prewarm (autoprewarm), pg_stat_statements, replicação lógica, workers de manutenção.

### Registro

```c
typedef struct BackgroundWorker {
    char        bgw_name[BGW_MAXLEN];
    char        bgw_type[BGW_MAXLEN];
    int         bgw_flags;
    BgWorkerStartTime bgw_start_time;
    int         bgw_restart_time;   /* segundos ou BGW_NEVER_RESTART */
    char        bgw_library_name[MAXPGPATH];
    char        bgw_function_name[BGW_MAXLEN];
    Datum       bgw_main_arg;
    char        bgw_extra[BGW_EXTRALEN];
    pid_t       bgw_notify_pid;
} BackgroundWorker;
```

**Flags**:
- `BGWORKER_SHMEM_ACCESS` — obrigatório, acesso a shared memory
- `BGWORKER_BACKEND_DATABASE_CONNECTION` — conexão com banco (requer SHMEM_ACCESS)

**`bgw_start_time`**:
- `BgWorkerStart_PostmasterStart` — imediatamente (sem conexão com banco)
- `BgWorkerStart_ConsistentState` — após recovery consistente (read-only)
- `BgWorkerStart_RecoveryFinished` — após recovery completo (read-write)

**`bgw_restart_time`**: segundos até restart se crashar, ou `BGW_NEVER_RESTART`.

### Inicialização

```c
void _PG_init(void) {
    BackgroundWorker worker;
    memset(&worker, 0, sizeof(BackgroundWorker));
    snprintf(worker.bgw_name, sizeof(worker.bgw_name), "Meu Worker");
    snprintf(worker.bgw_type, sizeof(worker.bgw_type), "Meu Tipo");
    worker.bgw_flags = BGWORKER_SHMEM_ACCESS | BGWORKER_BACKEND_DATABASE_CONNECTION;
    worker.bgw_start_time = BgWorkerStart_RecoveryFinished;
    worker.bgw_restart_time = 10;
    snprintf(worker.bgw_library_name, sizeof(worker.bgw_library_name), "meu_modulo");
    snprintf(worker.bgw_function_name, sizeof(worker.bgw_function_name), "MyWorkerMain");
    worker.bgw_main_arg = (Datum) 0;
    worker.bgw_notify_pid = 0;
    RegisterBackgroundWorker(&worker);
}
```

### Função Principal

```c
PGDLLEXPORT void MyWorkerMain(Datum main_arg) {
    BackgroundWorkerUnblockSignals();
    BackgroundWorkerInitializeConnection("mydb", NULL, 0);
    SPI_connect();
    /* loop principal */
    while (!ShutdownRequestPending) {
        int rc = WaitLatch(MyLatch,
                           WL_LATCH_SET | WL_TIMEOUT | WL_POSTMASTER_DEATH,
                           10000, WAIT_EVENT_BGWORKER_MAIN);
        ResetLatch(MyLatch);
        if (rc & WL_POSTMASTER_DEATH)
            break;
        SPI_execute("DELETE FROM jobs WHERE done", false, 0);
    }
    SPI_finish();
    proc_exit(0);
}
```

⚠️ Erro em bgworker derruba o processo mas não o postmaster (é restartado conforme `bgw_restart_time`).

⚠️ Sinais vêm bloqueados inicialmente. Chamar `BackgroundWorkerUnblockSignals()`.

### Registro Dinâmico

```c
BackgroundWorkerHandle *handle;
RegisterDynamicBackgroundWorker(&worker, &handle);
```

Usar `GetBackgroundWorkerPid()`, `WaitForBackgroundWorkerStartup()`, `TerminateBackgroundWorker()` para gerenciar.

**Monitoramento**: `pg_stat_activity` mostra `backend_type = 'background worker'`.

**Limite**: controlado por `max_worker_processes`.

---

## 5. SPI (Server Programming Interface) — Programação Interna

**Conceito**: API para executar SQL dentro de C functions, bgworkers, PL handlers. Cabeçalho: `executor/spi.h`.

### Ciclo de Vida

```c
SPI_connect();         /* conectar ao SPI manager */
/* ... chamadas SPI ... */
SPI_finish();          /* desconectar (obrigatório) */
```

⚠️ Toda chamada a `SPI_connect()` deve ter um `SPI_finish()` correspondente. Vazamentos corrompem o estado interno.

### SPI_execute

```c
int SPI_execute(const char *command, bool read_only, long count);
```

- `read_only = true` — apenas comandos SELECT (snapshot do início da query)
- `read_only = false` — permite INSERT/UPDATE/DELETE
- `count` — máximo de linhas (0 = sem limite)
- Retorno: `SPI_OK_SELECT`, `SPI_OK_INSERT`, `SPI_OK_UTILITY`, etc.

Tuplas resultado disponíveis em `SPI_tuptable`, número de linhas em `SPI_processed`.

### SPI_prepare / SPI_execp

```c
SPIPlanPtr plan = SPI_prepare("SELECT * FROM users WHERE id = $1", 1, argtypes);
/* argtypes = lista de OIDs dos tipos dos parâmetros */

int ret = SPI_execp(plan, values, nulls, read_only, count);
```

`SPI_keepplan(plan)` — mantém o plano entre chamadas da função.

`SPI_freeplan(plan)` — libera plano preparado.

### SPI com Cursores

```c
SPIPlanPtr plan = SPI_prepare("SELECT * FROM big_table", 0, NULL);
Portal portal = SPI_cursor_open(NULL, plan, NULL, NULL, true);
SPI_cursor_fetch(portal, true, 100);   /* fetch 100 linhas */
SPI_cursor_close(portal);
```

Outras funções: `SPI_cursor_move()`, `SPI_scroll_cursor_fetch()`, `SPI_cursor_find()`.

### Controle de Transação

```c
SPI_commit();     /* commit da transação atual */
SPI_rollback();   /* rollback */
```

⚠️ `SPI_commit()` e `SPI_rollback()` não podem ser usados dentro de funções chamadas via SELECT. Apenas em procedures ou bgworkers.

### Memória Gerenciada pelo SPI

```c
void *ptr = SPI_palloc(size);     /* aloca no contexto do executor */
SPI_pfree(ptr);                   /* libera */
```

`SPI_palloc()` ao contrário de `palloc()` aloca no "upper executor context", persistindo entre chamadas SPI dentro da mesma função.

### Manipulação de Tuplas

```c
HeapTuple new_tuple = SPI_modifytuple(rel, tuple, nattrs, attnum, values, nulls);
Datum ret = SPI_returntuple(new_tuple, rsinfo->expectedDesc);
HeapTuple copy = SPI_copytuple(tuple);
SPI_freetuple(tuple);
SPI_freetuptable(SPI_tuptable);
```

### Relações Temporárias (Ephemeral Named Relations)

```c
SPI_register_relation(rel);
/* usar o nome da relação em queries SPI */
SPI_unregister_relation(name);
```

---

## 6. Logical Decoding — Mudanças em Tempo Real

**Conceito**: captura de mudanças commitadas no WAL em formato lógico. Útil para replicação, auditoria, CDC.

**Pré-requisitos**:
- `wal_level = logical`
- `max_replication_slots >= 1`

### SQL Interface

```sql
-- Criar slot com plugin test_decoding
SELECT * FROM pg_create_logical_replication_slot('meu_slot', 'test_decoding');

-- Consumir mudanças (consome e remove)
SELECT * FROM pg_logical_slot_get_changes('meu_slot', NULL, NULL);

-- Apenas espiar (não consome)
SELECT * FROM pg_logical_slot_peek_changes('meu_slot', NULL, NULL);

-- Passar opções ao plugin
SELECT * FROM pg_logical_slot_peek_changes('meu_slot', NULL, NULL,
    'include-timestamp', 'on');

-- Destruir slot
SELECT pg_drop_replication_slot('meu_slot');
```

### Output Plugins

Biblioteca compartilhada com função de inicialização:

```c
#include "replication/logical.h"

void _PG_output_plugin_init(OutputPluginCallbacks *cb) {
    cb->startup_cb = my_startup_cb;
    cb->begin_cb = my_begin_cb;
    cb->change_cb = my_change_cb;
    cb->commit_cb = my_commit_cb;
    cb->shutdown_cb = my_shutdown_cb;
}
```

**Callbacks obrigatórios**: `begin_cb`, `change_cb`, `commit_cb`

**Callbacks opcionais**: `startup_cb`, `truncate_cb`, `message_cb`, `filter_by_origin_cb`, `shutdown_cb`

**Para streaming**: `stream_start_cb`, `stream_stop_cb`, `stream_abort_cb`, `stream_commit_cb`, `stream_change_cb`

**Para two-phase**: `begin_prepare_cb`, `prepare_cb`, `commit_prepared_cb`, `rollback_prepared_cb`, `filter_prepare_cb`

### Escrevendo Output

```c
void my_change_cb(LogicalDecodingContext *ctx, ReorderBufferTXN *txn,
                  Relation relation, ReorderBufferChange *change) {
    OutputPluginPrepareWrite(ctx, true);
    appendStringInfo(ctx->out, "INSERT INTO %s ...",
                     RelationGetRelationName(relation));
    OutputPluginWrite(ctx, true);
}
```

### Streaming de Transações Grandes (PG14+)

Quando `logical_decoding_work_mem` é excedido, transações grandes são streamadas incrementalmente via callbacks `stream_start_cb` / `stream_stop_cb` / `stream_commit_cb`.

### Two-Phase Commits (PG15+)

```sql
-- Criar slot com suporte a two-phase
SELECT * FROM pg_create_logical_replication_slot('slot2pc', 'test_decoding',
    false, 'true' /* two_phase */);

-- PREPARE TRANSACTION é decodificado
SELECT * FROM pg_logical_slot_get_changes('slot2pc', NULL, NULL);
-- Mostra: PREPARE TRANSACTION 'test_prepared1', txid 529

-- COMMIT PREPARED também
-- Mostra: COMMIT PREPARED 'test_prepared1', txid 529
```

### Estruturas Internas

- `LogicalDecodingContext` — contexto de decodificação
- `ReorderBuffer` — buffer de reordenação de transações
- `snapshot_builder` — construtor de snapshots para decodificação

---

## 7. Custom WAL Resource Managers (PG18)

**Conceito**: extensões podem registrar seus próprios tipos de registro WAL, sem precisar do workaround `GenericWAL`.

### Registro

```c
typedef struct RmgrData {
    const char *rm_name;
    void (*rm_redo)(XLogReaderState *record);
    void (*rm_desc)(StringInfo buf, XLogReaderState *record);
    const char *(*rm_identify)(uint8 info);
    void (*rm_startup)(void);
    void (*rm_cleanup)(void);
    void (*rm_mask)(char *pagedata, BlockNumber blkno);
    void (*rm_decode)(struct LogicalDecodingContext *ctx,
                      struct XLogRecordBuffer *buf);
} RmgrData;
```

Chamar `RegisterCustomRmgr(rmid, &rmgr)` dentro de `_PG_init()`.

- Durante desenvolvimento, usar `RM_EXPERIMENTAL_ID` para `rmid`
- Para release, reservar ID único em: https://wiki.postgresql.org/wiki/CustomWALResourceManagers

⚠️ A extensão deve permanecer em `shared_preload_libraries` enquanto existirem registros WAL customizados no sistema.

**Casos de uso**: índices customizados, Table Access Methods, extensões com consistência WAL própria.

---

## 8. C-Language Functions — Convenção Version 1

### Estrutura Mínima

```c
#include "postgres.h"
#include "fmgr.h"

PG_MODULE_MAGIC;

PG_FUNCTION_INFO_V1(add_one);

Datum
add_one(PG_FUNCTION_ARGS) {
    int32 arg = PG_GETARG_INT32(0);
    PG_RETURN_INT32(arg + 1);
}
```

### Macros Essenciais

```c
Datum funcname(PG_FUNCTION_ARGS);

PG_GETARG_INT32(n)          /* argumento como int32 */
PG_GETARG_FLOAT8(n)         /* float8 (pass-by-reference escondido) */
PG_GETARG_TEXT_PP(n)        /* text (toasted-aware) */
PG_GETARG_POINT_P(n)        /* struct passada por referência */

PG_RETURN_INT32(val)        /* retorna int32 */
PG_RETURN_FLOAT8(val)       /* retorna float8 */
PG_RETURN_TEXT_P(ptr)       /* retorna text* */
PG_RETURN_POINTER(ptr)      /* retorna ponteiro genérico */
PG_RETURN_NULL()            /* retorna NULL */

PG_ARGISNULL(n)             /* testa se argumento n é NULL (apenas non-strict) */
```

**Strict functions**: se marcadas `STRICT`, não precisam verificar NULL. O PostgreSQL não chama a função se qualquer argumento for NULL.

### Set-Returning Functions (SRF)

```c
PG_FUNCTION_INFO_V1(srf_example);

Datum
srf_example(PG_FUNCTION_ARGS) {
    FuncCallContext *funcctx;
    int *call_count;

    if (SRF_IS_FIRSTCALL()) {
        funcctx = SRF_FIRSTCALL_INIT();
        call_count = palloc(sizeof(int));
        *call_count = 0;
        funcctx->user_fctx = call_count;
    }

    funcctx = SRF_PERCALL_SETUP();
    call_count = (int *) funcctx->user_fctx;

    if (*call_count < 10) {
        *call_count += 1;
        SRF_RETURN_NEXT(funcctx, Int32GetDatum(*call_count));
    }

    SRF_RETURN_DONE(funcctx);
}
```

### Compilação com PGXS

```makefile
# Makefile
EXTENSION = minha_ext
MODULES = minha_ext
DATA = minha_ext--1.0.sql
PG_CONFIG = pg_config
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
```

---

## 9. Extensão Completa — Estrutura

### Arquivos

```bash
minha_ext/
├── minha_ext.control
├── minha_ext--1.0.sql
├── minha_ext.c
└── Makefile
```

### Control File

```ini
# minha_ext.control
comment = 'Descrição da extensão'
default_version = '1.0'
relocatable = true
trusted = true          # ✅ permite non-superusers instalarem
requires = 'pgcrypto'
```

⚠️ Extensões que incluem C functions devem marcar `trusted = false` se o código C puder fazer operações inseguras. Trusted = true permite instalação por qualquer usuário com `CREATE` no banco.

### SQL Script

```sql
-- minha_ext--1.0.sql
\echo Use "CREATE EXTENSION minha_ext" to load this file. \quit

CREATE FUNCTION hello(text) RETURNS text
LANGUAGE C STRICT IMMUTABLE
AS 'MODULE_PATHNAME', 'hello_func';

CREATE TABLE minha_config (key text PRIMARY KEY, value text);
```

### Upgrade

```bash
# Script de upgrade
minha_ext--1.0--1.1.sql
```

```sql
ALTER EXTENSION minha_ext UPDATE TO '1.1';
```

⚠️ Scripts de extensão NÃO podem conter `BEGIN`, `COMMIT`, `VACUUM`. Executam dentro de uma transação gerenciada pelo `CREATE EXTENSION`/`ALTER EXTENSION`.

---

## 10. Volatilidade de Funções

| Categoria | Garantia | Otimizações | Exemplos |
|-----------|----------|-------------|----------|
| `IMMUTABLE` | Mesmo resultado sempre (args iguais → mesmo valor) | Indexável, folding em planning time | `2 + 2`, `length('abc')` |
| `STABLE` | Mesmo resultado dentro de uma transação | Uma avaliação por statement | `now()`, `current_timestamp` |
| `VOLATILE` | Pode mudar a cada chamada | Nenhuma, reavaliada por linha | `random()`, `gen_random_uuid()` |

⚠️ Marcar função `VOLATILE` como `IMMUTABLE` quebra índices e pode gerar resultados incorretos.

⚠️ Funções que consultam tabelas NÃO podem ser `IMMUTABLE` (conteúdo muda).

✅ `LEAKPROOF` — permite que a função seja usada dentro de `security_barrier` views. Apenas superuser pode definir.

---

## 11. Armadilhas Comuns

| 🛑 Problema | Consequência | ✅ Solução |
|-------------|-------------|-----------|
| PL/Python untrusted achando que é seguro | Execução de código arbitrário | `plpython3u` é sempre untrusted; restringir via SECURITY INVOKER |
| PL/Perl `plperlu` sem controle de acesso | Acesso a sistema de arquivos | Usar `plperl` (trusted) sempre que possível |
| SPI sem `SPI_connect()`/`SPI_finish()` balanceados | Corrupção de estado interno | Sempre parear connect/finish |
| SPI_commit() dentro de função SELECT | Erro ou crash | Usar apenas em procedures ou bgworkers |
| bgworker sem tratamento de erro | Processo morre (postmaster reinicia) | Tratar erros com try/catch, usar `WaitLatch()` |
| bgworker sem `BackgroundWorkerUnblockSignals()` | Sinais nunca chegam | Chamar `BackgroundWorkerUnblockSignals()` no início |
| C function sem `PG_FUNCTION_INFO_V1` | Comportamento indefinido (versão 0 legada) | Sempre usar `PG_FUNCTION_INFO_V1` |
| C function non-strict sem `PG_ARGISNULL()` | Segfault ao acessar argumento NULL | Usar `STRICT` ou checar com `PG_ARGISNULL` |
| Logical decoding output plugin sem `begin_cb`/`change_cb`/`commit_cb` | Plugin não funcional | Implementar os 3 callbacks obrigatórios |
| Logical decoding sem suporte a two-phase | PREPARE TRANSACTION ignorado | Definir `filter_prepare_cb` + `prepare_cb` |
| Volatility `IMMUTABLE` em função que lê tabela | Resultado incorreto em índices | Usar `STABLE` se lê tabelas |
| Volatility `STABLE` ou `IMMUTABLE` em função que modifica banco | Erro em tempo de execução | Usar `VOLATILE` (única categoria que permite modificação) |
| Extensão sem `trusted = true` quando apropriada | Apenas superusers podem instalar | Marcar `trusted = true` se extensão é segura |
| WAL custom rmgr sem `shared_preload_libraries` | PostgreSQL não inicia se há registros WAL custom | Sempre carregar via `shared_preload_libraries` |
