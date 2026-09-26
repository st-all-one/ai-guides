# Transações e WAL Mode

Baseado em: `wal.html`, `lockingv3.html`, `transactional.html`,
`lang_transaction.html`, `atomiccommit.html`

---

## 1. Modelo de Transações ACID

SQLite implementa transações **ACID** completas com isolamento
**serializável** — como se as transações fossem executadas uma após
a outra, mesmo em caso de falha.

| Propriedade | Garantia |
|---|---|
| **Atomicidade** | Cada transação completa ou não acontece |
| **Consistência** | Constraints são verificadas após cada transação |
| **Isolamento** | Transações em andamento são invisíveis para outras |
| **Durabilidade** | Dados confirmados persistem mesmo com queda de energia |

## 2. Controle de Transações

### Sintaxe

```sql
BEGIN [DEFERRED | IMMEDIATE | EXCLUSIVE];
    -- operações DML/DQL
COMMIT;        -- ou END;
-- ou
ROLLBACK;
```

### Modos de Início de Transação

| Modo | Comportamento | Quando Usar |
|---|---|---|
| `DEFERRED` (default) | Não adquire bloqueio até necessário | Leitura pura |
| `IMMEDIATE` | Adquire bloqueio RESERVED imediatamente | Escrita iminente |
| `EXCLUSIVE` | Adquire bloqueio EXCLUSIVE imediatamente | Escrita com isolamento máximo |

⚠️ **Sempre use `BEGIN IMMEDIATE` para transações que vão escrever**.
Com `BEGIN DEFERRED`, se a transação precisar fazer upgrade para
RESERVED e outro processo estiver em RESERVED, ocorre `SQLITE_BUSY`.

```c
sqlite3_exec(db, "BEGIN IMMEDIATE", NULL, NULL, NULL);
// ... operações de escrita ...
sqlite3_exec(db, "COMMIT", NULL, NULL, NULL);
```

### SAVEPOINT (Sub-transações)

```sql
SAVEPOINT sp1;
    INSERT INTO t VALUES (1);
    SAVEPOINT sp2;
        INSERT INTO t VALUES (2);
        ROLLBACK TO sp2;  -- desfaz apenas o INSERT de 2
    RELEASE sp2;          -- consolida
RELEASE sp1;              -- consolida tudo
```

Útil para operações parciais que podem falhar sem abortar toda
a transação.

## 3. Rollback Journal (Modo Padrão)

### Estados de Bloqueio (5 níveis)

```
UNLOCKED → SHARED → RESERVED → PENDING → EXCLUSIVE
```

| Estado | Descrição |
|---|---|
| **UNLOCKED** | Nenhum bloqueio |
| **SHARED** | Leitura permitida. Múltiplos SHARED simultâneos |
| **RESERVED** | Intenção de escrever. Ainda lê; outros podem ler |
| **PENDING** | Espera SHAREDs acabarem. Novo SHARED bloqueado |
| **EXCLUSIVE** | Escrita em andamento. Ninguém mais acessa |

### Funcionamento do Rollback Journal

1. Antes de modificar o banco, SQLite copia as páginas originais
   para o arquivo `-journal`
2. Durante o COMMIT, as alterações são escritas, o journal é deletado
3. Se houver crash, o "hot journal" é usado para reverter na reabertura

### Modos de Journal

```sql
PRAGMA journal_mode = DELETE;    -- default: deleta journal no commit
PRAGMA journal_mode = TRUNCATE;  -- trunca journal (mais rápido que delete)
PRAGMA journal_mode = PERSIST;   -- mantém journal (evita criação/remoção)
PRAGMA journal_mode = MEMORY;    -- journal em RAM (⚠️ perde durabilidade)
PRAGMA journal_mode = OFF;       -- sem journal (⚠️ corrompe em crash!)
PRAGMA journal_mode = WAL;       -- Write-Ahead Log (recomendado)
```

**NUNCA use MEMORY ou OFF** em produção — podem corromper o banco.

## 4. WAL Mode (Write-Ahead Log)

### Como Funciona

No WAL, as modificações são **anexadas** ao arquivo `-wal`. O COMMIT
apenas escreve um registro no WAL (muito rápido). Periodicamente, um
**checkpoint** transfere os dados do WAL para o banco principal.

```
Banco.db      (dados consolidados)
Banco.db-wal   (modificações recentes anexadas)
Banco.db-shm   (índice WAL — memória compartilhada)
```

### Vantagens do WAL

| Vantagem | Descrição |
|---|---|
| **Leitores não bloqueiam escritores** | SELECT pode rodar durante INSERT |
| **Escritores não bloqueiam leitores** | INSERT não bloqueia SELECT |
| **I/O mais sequencial** | WAL é append-only |
| **Menos fsync()** | Mais rápido, menos vulnerável a bugs de fsync |
| **Persistente** | Sobrevive a fechamento/reabertura |

### Desvantagens do WAL

| Desvantagem | Solução |
|---|---|
| Requer memória compartilhada (arquivo -shm) | Usar `PRAGMA locking_mode=EXCLUSIVE` antes do primeiro acesso |
| Só funciona no mesmo host | WAL é local por design |
| Transações multi-banco (ATTACH) não são atômicas entre bancos | Commit separadamente |
| Page size não pode mudar depois de entrar em WAL | Definir page_size antes de habilitar WAL |

### Ativação

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;  -- ⚠️ ESSENCIAL: no WAL, NORMAL garante não-corrupção
PRAGMA wal_autocheckpoint = 1000;  -- default: checkpoint a cada 1000 páginas
```

**Por que synchronous=NORMAL é seguro no WAL?**
- Em WAL, o checkpoint é a única operação que pode causar corrupção
- synchronous=NORMAL garante que o checkpoint só acontece após os dados
  estarem seguros no WAL
- Em queda de energia: perde-se apenas a transação atual (rollback),
  o banco não corrompe

### Checkpoint Manual

```sql
PRAGMA wal_checkpoint;           -- PASSIVE (default)
PRAGMA wal_checkpoint(FULL);     -- bloqueia até completar
PRAGMA wal_checkpoint(RESTART);  -- FULL + garante que próximos leitores usem banco
```

Via API C:
```c
int nLog = 0, nCkpt = 0;
sqlite3_wal_checkpoint_v2(db, NULL, SQLITE_CHECKPOINT_FULL, &nLog, &nCkpt);
```

### Tamanho do WAL e Performance

```sql
PRAGMA journal_size_limit = 8388608;  -- 8MB max para o WAL
PRAGMA wal_autocheckpoint = 2000;     -- checkpoint a cada 2000 páginas (~8MB)
```

WAL muito grande → leitores lentos (precisam escanear WAL)
WAL muito pequeno → checkpoints frequentes (contention)

## 5. Concorrência: Comparação Rollback vs WAL

| Aspecto | Rollback Journal | WAL |
|---|---|---|
| Leitores durante escrita | Bloqueados | Permanecem lendo versão antiga |
| Escritores durante leitura | Bloqueados | Permanece escrevendo |
| Múltiplos escritores | Apenas 1 (exclusivo) | Apenas 1 (exclusivo) |
| Performance commit | Lento (fsync + deletar) | Rápido (append + 1 fsync) |
| Performance leitura | Rápido (dados no banco) | Pode ser mais lento (WAL scan) |
| Espaço em disco | Journal temporário | WAL persiste até checkpoint |
| Rede (NFS) | Funciona (com dotfile locking) | **Não funciona** |

## 6. Modo WAL com Locking Mode EXCLUSIVE

Para evitar o arquivo `-shm` (útil quando o banco é de uso exclusivo):

```sql
PRAGMA journal_mode = WAL;
PRAGMA locking_mode = EXCLUSIVE;
-- Agora o wal-index fica em heap, sem arquivo -shm
```

Nota: em EXCLUSIVE, outros processos não podem acessar o banco.

## 7. Boas Práticas

### Transações Curtas e Frequentes

```sql
-- RUIM: transação gigante (trava muito tempo)
BEGIN;
INSERT INTO log SELECT * FROM tabela_imensa;
COMMIT;

-- BOM: transações por lote
BEGIN;
INSERT INTO log VALUES (1);
INSERT INTO log VALUES (2);
-- ... até 1000 linhas
COMMIT;
```

### Deadlock Prevention

```c
// Sempre usar busy_timeout
sqlite3_busy_timeout(db, 5000);  // 5 segundos de espera

// Ou busy handler customizado
sqlite3_busy_handler(db, [](void*, int count) -> int {
    if (count > 50) return 0;  // desiste após 50 tentativas
    usleep(100000);  // espera 100ms
    return 1;  // tenta novamente
}, NULL);
```

### WAL + IMMEDIATE = Melhor Combinação

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

BEGIN IMMEDIATE;
    -- operações de escrita
COMMIT;
```

### Evitar Hot Journal

"Hot journal" = arquivo `-journal` que sobrou de um crash anterior.
SQLite tenta fazer recovery automaticamente ao abrir. Para evitar
problemas:
- Nunca delete arquivos `-journal` manualmente
- Nunca copie um banco ativo sem o journal correspondente
- Nunca renomeie/desvincule arquivos de banco abertos

---

**Próximo**: [08-performance.md](08-performance.md) — Performance e Tuning
