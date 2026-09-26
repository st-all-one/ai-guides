# Transações e Concorrência — MVCC, Isolamento, Locks

Baseado em: `02-SQL-Language/mvcc-*.html`, `transaction-iso.html`, `explicit-locking.html`, `locking-indexes.html`

---

## 1. MVCC (Multi-Version Concurrency Control)

O PostgreSQL implementa MVCC criando **tuplas mortas (dead tuples)** em vez de locks de leitura:

```
UPDATE → marca tupla antiga como morta, cria nova tupla visível
DELETE → marca tupla como morta
SELECT → vê snapshot do momento da query (ou da transação)
```

🔍 **Implicação prática**: `UPDATE` e `DELETE` geram bloat que precisa ser limpo pelo VACUUM.

### Snapshots e Visibilidade

```sql
-- Modos de transação:
BEGIN ISOLATION LEVEL READ COMMITTED;   -- default
BEGIN ISOLATION LEVEL REPEATABLE READ;
BEGIN ISOLATION LEVEL SERIALIZABLE;
```

---

## 2. Níveis de Isolamento

| Nível | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly |
|-------|-----------|-------------------|--------------|----------------------|
| `READ UNCOMMITTED` | ✅ (PG trata como READ COMMITTED) | ✅ | ✅ | ✅ |
| `READ COMMITTED` | 🛡️ PG previne | ✅ | ✅ | ✅ |
| `REPEATABLE READ` | 🛡️ | 🛡️ | ✅ (PG previne fk) | ✅ |
| `SERIALIZABLE` | 🛡️ | 🛡️ | 🛡️ | 🛡️ |

⚠️ No PostgreSQL, `READ UNCOMMITTED` se comporta como `READ COMMITTED`.

### 📝 READ COMMITTED (default) — comportamento

```sql
-- Transação 1                     -- Transação 2
BEGIN;                             BEGIN;
SELECT * FROM contas WHERE id=1;   UPDATE contas SET saldo=200 WHERE id=1;
-- vê saldo=100                    COMMIT;
SELECT * FROM contas WHERE id=1;
-- vê saldo=200 (mudou!)
```

Cada statement vê um novo snapshot. Útil para workload OLTP normal.

### 📝 REPEATABLE READ

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT * FROM contas WHERE id=1;   -- vê saldo=100
-- outra transação modifica e commita
SELECT * FROM contas WHERE id=1;   -- vê saldo=100 (mesmo snapshot)
COMMIT;
```

⚠️ **Erro de serialização**: se você tentar `UPDATE` uma linha modificada por outra transação após seu snapshot, recebe:
```
ERROR: could not serialize access due to concurrent update
```
Deve-se retry a transação.

### 📝 SERIALIZABLE — verdadeiro isolamento

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- Todas as transações parecem executar em sequência
-- Se houver conflito de dependências cíclicas:
-- ERROR: could not serialize access due to read/write dependencies among transactions
```

⚠️ **Custo**: overhead de monitoramento de dependências (SIREAD locks). Use APENAS se você precisa de verdadeira serialização e não pode usar locks explícitos.

---

## 3. Locks Explícitos

### Table-level Locks

```sql
LOCK TABLE pedidos IN ACCESS EXCLUSIVE MODE;        -- bloqueia leituras e escritas
LOCK TABLE pedidos IN SHARE ROW EXCLUSIVE MODE;     -- bloqueia escritas, permite leitura
```

| Modo | Conflicta com | Uso |
|------|--------------|-----|
| `ACCESS SHARE` | ACCESS EXCLUSIVE | SELECT |
| `ROW SHARE` | EXCLUSIVE, ACCESS EXCLUSIVE | SELECT FOR UPDATE |
| `ROW EXCLUSIVE` | SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE | INSERT, UPDATE, DELETE |
| `SHARE UPDATE EXCLUSIVE` | SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE | VACUUM (non-full) |
| `SHARE` | ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE | CREATE INDEX |
| `SHARE ROW EXCLUSIVE` | ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE | |
| `EXCLUSIVE` | ROW SHARE, ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE | REFRESH MATVIEW CONCURRENTLY |
| `ACCESS EXCLUSIVE` | todos (incluindo ACCESS SHARE) | DROP TABLE, TRUNCATE, VACUUM FULL, CLUSTER, REINDEX (sem CONCURRENTLY) |

### Row-level Locks

```sql
SELECT * FROM contas WHERE id = 1 FOR UPDATE;           -- bloqueia update/deletion
SELECT * FROM contas WHERE id = 1 FOR NO KEY UPDATE;    -- não bloqueia FKs
SELECT * FROM contas WHERE id = 1 FOR SHARE;            -- bloqueia FOR UPDATE de outros
SELECT * FROM contas WHERE id = 1 FOR KEY SHARE;        -- não bloqueia modos que não deletam
```

**📝** `FOR UPDATE` é o mais restritivo. `FOR NO KEY UPDATE` é preferível quando você não vai alterar a PK (PG 11+).

### Deadlocks

```sql
-- Transação 1: UPDATE A, depois UPDATE B
-- Transação 2: UPDATE B, depois UPDATE A
-- PostgreSQL detecta e aborta uma delas:
-- ERROR: deadlock detected
```

**📝 Prevenção**: sempre adquira locks na **mesma ordem** em todas as transações.

---

## 4. Advisory Locks — Locks de Aplicação

```sql
-- Lock de aplicação (não vinculado a linhas)
SELECT pg_advisory_lock(12345);
SELECT pg_advisory_unlock(12345);

-- Lock compartilhado
SELECT pg_advisory_lock_shared(12345);

-- Tentativa não-bloqueante
SELECT pg_try_advisory_lock(12345);  -- retorna true/false
```

**📝** Úteis para coordenar acesso entre múltiplas sessões (ex: workers concorrentes).

---

## 5. Serializable Snapshot Isolation (SSI)

O nível SERIALIZABLE usa SSI para detectar conflitos entre transações concorrentes sem bloqueio pesado.

**🔍 Como funciona:**
- Monitora dependências de leitura/escrita entre transações
- Se detecta ciclo de dependências, aborta uma transação
- Transação abortada deve ser retentada

⚠️ **Performance**: SSI tem overhead ~10-20% comparado a REPEATABLE READ. Use apenas quando necessário.

---

## 6. Transações e Procedures (PG 11+)

```sql
CREATE PROCEDURE processa_lote()
LANGUAGE plpgsql AS $$
BEGIN
    FOR i IN 1..1000 LOOP
        INSERT INTO log (mensagem) VALUES ('item ' || i);
        IF i % 100 = 0 THEN
            COMMIT;  -- ✅ possível apenas em procedures
        END IF;
    END LOOP;
END;
$$;
```

**📝** Functions NÃO podem fazer COMMIT/ROLLBACK. Procedures podem, mas apenas se chamadas via `CALL`.

---

## 7. Padrões de Concorrência Segura

### Otimistic Locking (sem lock no banco)

```sql
-- 1. Ler versão atual
SELECT id, saldo, versao FROM contas WHERE id = 1;

-- 2. Tentar atualizar apenas se versão não mudou
UPDATE contas SET saldo = saldo - 100, versao = versao + 1
WHERE id = 1 AND versao = 5;
-- se 0 rows updated → conflito → retry
```

### Pessimistic Locking

```sql
BEGIN;
SELECT * FROM contas WHERE id = 1 FOR UPDATE;
-- só uma transação por vez para esta conta
UPDATE contas SET saldo = saldo - 100 WHERE id = 1;
COMMIT;
```

### SKIP LOCKED (PG 9.5+) — fila de trabalho

```sql
-- 1. Pegar próximo trabalho não processado
BEGIN;
SELECT * FROM jobs WHERE status = 'pending'
ORDER BY criado_em
LIMIT 1
FOR UPDATE SKIP LOCKED;
-- 2. Processar...
UPDATE jobs SET status = 'done' WHERE id = ?;
COMMIT;
```

**📝** `SKIP LOCKED` pula linhas já lockadas por outras transações — essencial para workers concorrentes.

---

## 8. Armadilhas Comuns

| 🛑 Problema | Consequência | ✅ Solução |
|-------------|-------------|-----------|
| `SELECT FOR UPDATE` em query longa | Bloqueia muitas linhas por muito tempo | Usar `NOWAIT` ou `SKIP LOCKED` |
| Ordem inconsistente de locks | Deadlocks frequentes | Sempre mesma ordem de tabelas |
| Transaction longa (> 1min) | Bloat, wraparound prevention atrasado | Manter curtas ou usar procedures com COMMIT |
| `SERIALIZABLE` sem necessidade | Overhead desnecessário | `READ COMMITTED` para OLTP |
| Ignorar `could not serialize access` | Dados inconsistentes | Retry automático é obrigatório |
| Sem `FOR UPDATE` em sequência crítica | Condição de corrida | Use FOR UPDATE ou otimistic lock |
