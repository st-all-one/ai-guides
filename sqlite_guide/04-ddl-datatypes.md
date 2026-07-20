# Tipos de Dados e DDL

Baseado em: `datatype3.html`, `lang_createtable.html`, `lang_altertable.html`,
`foreignkeys.html`, `stricttables.html`, `lang_naming.html`

---

## 1. Storage Classes (5 tipos internos)

Diferente de bancos tradicionais, o SQLite usa **digitação dinâmica** —
o tipo é uma propriedade do **valor**, não da **coluna**.

| Classe | Descrição | Armazenamento |
|---|---|---|
| `NULL` | Ausência de valor | 0 bytes |
| `INTEGER` | Inteiro com sinal | 1, 2, 3, 4, 6 ou 8 bytes (auto-select) |
| `REAL` | Ponto flutuante IEEE 754 | 8 bytes |
| `TEXT` | String UTF-8 ou UTF-16 | 1 byte por caractere + terminador |
| `BLOB` | Dados binários | Exatamente como fornecido |

### Integer Auto-Typing (Economia de Espaço)

O SQLite escolhe automaticamente o menor tamanho para armazenar inteiros:

| Faixa | Bytes |
|---|---|
| -128..127 | 1 |
| -32768..32767 | 2 |
| -8388608..8388607 | 3 |
| -2147483648..2147483647 | 4 |
| -140737488355328..140737488355327 | 6 |
| outros | 8 |

## 2. Type Affinity

O tipo declarado na coluna determina sua **affinity** — a preferência
de conversão quando valores são inseridos:

### Regras de Affinity

| Declaração | Affinity |
|---|---|
| `INT`, `INTEGER`, `TINYINT`, `SMALLINT`, `MEDIUMINT`, `BIGINT`, `UNSIGNED BIG INT`, `INT2`, `INT8` | **INTEGER** |
| `CHARACTER(20)`, `VARCHAR(255)`, `TEXT`, `CLOB` | **TEXT** |
| `BLOB`, sem tipo declarado | **BLOB** (nenhuma) |
| `REAL`, `FLOAT`, `DOUBLE`, `NUMERIC` | **REAL** |
| Qualquer outro (incluindo `BOOLEAN`, `DATE`, `DATETIME`) | **NUMERIC** |

### ⚠️ Armadilhas Comuns

```sql
-- "FLOATING POINT" → affinity INTEGER (contém "INT")!
CREATE TABLE t(x FLOATING POINT);  -- affinity será INTEGER, não REAL!

-- "STRING" → affinity NUMERIC, não TEXT!
CREATE TABLE t(x STRING);          -- affinity NUMERIC!

-- "BOOLEAN" → affinity NUMERIC
CREATE TABLE t(x BOOLEAN);         -- armazenado como 0/1 INTEGER
```

### Comportamento de Conversão por Affinity

| Valor Inserido | INTEGER | TEXT | REAL | NUMERIC | BLOB |
|---|---|---|---|---|---|
| INTEGER 42 | 42 | "42" | 42.0 | 42 | 42 |
| REAL 1.5 | 1 (truncado) | "1.5" | 1.5 | 1.5 | 1.5 |
| TEXT "123" | 123 | "123" | 123.0 | 123 | "123" |
| TEXT "xyz" | 0 (ou erro*) | "xyz" | 0.0 | 0 ou "xyz"** | "xyz" |
| BLOB | erro* | erro* | erro* | erro* | blob |

*\* Em STRICT tables, TEXT inválido para INTEGER é erro.*
*\*\* NUMERIC tenta converter; se falha, mantém TEXT.*

## 3. STRICT Tables (Desde v3.37.0)

Para quem prefere tipagem rígida tradicional:

```sql
CREATE TABLE t (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    salario REAL,
    dados BLOB
) STRICT;
```

**Comportamento**:
- `INTEGER` só aceita inteiros
- `TEXT` só aceita strings
- `REAL` só aceita números de ponto flutuante
- `BLOB` só aceita blobs
- Rejeita tipos mistos com erro `SQLITE_CONSTRAINT_DATATYPE`

## 4. Booleans e Datas

### Booleanos
SQLite não tem tipo booleano nativo. Armazenar como `INTEGER`:
- `TRUE` = 1, `FALSE` = 0

```sql
CREATE TABLE t (ativo INTEGER CHECK (ativo IN (0,1)));
INSERT INTO t VALUES (TRUE);  -- TRUE vira 1
SELECT * FROM t WHERE ativo;  -- funciona porque 1 é truthy
```

### Datas
SQLite não tem tipo DATE/TIME nativo. Três abordagens:

| Abordagem | Formato | Exemplo | Funcões |
|---|---|---|---|
| TEXT (ISO-8601) | `"YYYY-MM-DD HH:MM:SS.SSS"` | `"2025-07-13 14:30:00"` | `date()`, `time()`, `datetime()`, `strftime()` |
| INTEGER (Unix timestamp) | segundos desde 1970 | `1750000000` | `unixepoch()`, `datetime(?, 'unixepoch')` |
| REAL (Dia Juliano) | dias desde -4714-11-24 | `2460690.5` | `julianday()`, `date(?, 'localtime')` |

```sql
CREATE TABLE eventos (
    id INTEGER PRIMARY KEY,
    nome TEXT,
    criado_em TEXT DEFAULT (datetime('now')),
    ocorrido_em INTEGER
);

SELECT * FROM eventos
WHERE ocorrido_em BETWEEN strftime('%s','now','-7 days') AND strftime('%s','now');
```

## 5. Collating Sequences

Controlam comparação de strings:

| Collation | Comportamento |
|---|---|
| `BINARY` (default) | Comparação byte-a-byte por memcmp() |
| `NOCASE` | Case-insensitive (**apenas ASCII** — não trata acentos!) |
| `RTRIM` | Ignora espaços à direita |

```sql
CREATE TABLE t (nome TEXT COLLATE NOCASE);
SELECT * FROM t ORDER BY nome COLLATE NOCASE;
-- Ou por conexão:
PRAGMA case_sensitive_like = OFF;
```

Para collation customizada (ex: locale-aware, Unicode):

```c
sqlite3_create_collation(db, "PORTUGUESE", SQLITE_UTF8,
    NULL, [](void*, int l1, const void* s1, int l2, const void* s2) {
        // implementar comparação locale-aware
        return strcoll(s1, s2);  // precisa setlocale
    });
```

## 6. Rowid e WITHOUT ROWID

### Toda tabela tem rowid (a menos que WITHOUT ROWID)

```sql
CREATE TABLE t (a, b);  -- tem rowid implícito
CREATE TABLE t (a TEXT PRIMARY KEY, b);  -- rowid implícito (PRIMARY KEY não-INTEGER é alias)
CREATE TABLE t (id INTEGER PRIMARY KEY, b);  -- id é alias para rowid
CREATE TABLE t (a, b) WITHOUT ROWID;  -- sem rowid, PRIMARY KEY obrigatória
```

### Quando usar WITHOUT ROWID

| Cenário | Recomendação |
|---|---|
| Chave primária composta | WITHOUT ROWID (evita índice extra) |
| Chave primária TEXT | WITHOUT ROWID (evita dupla B-tree) |
| Tabela pequena com INTEGER PK | WITH ROWID (mais eficiente) |
| Precisão de 64 bits para PK | WITH ROWID (rowid é 64-bit) |

```sql
CREATE TABLE pedidos_itens (
    pedido_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantidade INTEGER,
    PRIMARY KEY (pedido_id, item_id)
) WITHOUT ROWID;
```

## 7. Chaves Estrangeiras

### ⚠️ IMPORTANTE: Desativadas por padrão!

```sql
PRAGMA foreign_keys = ON;  -- habilitar por conexão!
```

### Sintaxe

```sql
CREATE TABLE cliente (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL
);

CREATE TABLE pedido (
    id INTEGER PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    total REAL,
    FOREIGN KEY (cliente_id) REFERENCES cliente(id)
        ON DELETE CASCADE
        ON UPDATE SET NULL
);
```

### Ações Referenciais

| Ação | Comportamento |
|---|---|
| `NO ACTION` (default) | Nenhuma ação (violação no COMMIT se DEFERRED) |
| `RESTRICT` | Impede (erro imediato na instrução) |
| `SET NULL` | Seta colunas filhas para NULL |
| `SET DEFAULT` | Seta para valor DEFAULT da coluna |
| `CASCADE` | Deleta/atualiza linhas filhas |

### Deferred vs Immediate

```sql
CREATE TABLE t (
    a INTEGER REFERENCES parent(a) DEFERRABLE INITIALLY DEFERRED
);
-- Verificação só no COMMIT, não na instrução.
-- Útil para inserções em ordem inversa pai→filho.
```

### Recomendações de Performance

- **Sempre criar índices** nas colunas de chave estrangeira (FK check
  faz lookup na PK da tabela pai e scan linear na tabela filha)
- `PRAGMA foreign_keys=ON` é conexão-específica — habilitar após cada
  `sqlite3_open()`

### Limitações

- `MATCH` não é suportado (SIMPLE/FULL/PARTIAL) — tratado como SIMPLE
- FK não podem cruzar ATTACH databases
- Ações de FK contam para o limite de trigger depth

## 8. GENERATED Columns

```sql
CREATE TABLE t (
    a INTEGER,
    b TEXT,
    c TEXT GENERATED ALWAYS AS (a || ': ' || b) STORED,
    d TEXT GENERATED ALWAYS AS (a * 2) VIRTUAL
);
```

- `STORED`: ocupa espaço no disco, mas não precisa ser fornecida no INSERT
- `VIRTUAL`: calculada na leitura, não ocupa espaço

## 9. Índices

### Criação Eficiente

```sql
-- Índice simples
CREATE INDEX idx_pedidos_cliente ON pedido(cliente_id);

-- Índice multicoluna (ordem importa!)
CREATE INDEX idx_nome_dept ON funcionario(dept_id, nome);

-- Índice com collation
CREATE INDEX idx_nome_ci ON funcionario(nome COLLATE NOCASE);

-- Índice parcial (economia de espaço)
CREATE INDEX idx_pedidos_ativos ON pedido(status) WHERE status = 'ativo';

-- Índice covering (todas as colunas da query)
CREATE INDEX idx_covering ON t(a, b) INCLUDE(c);
-- Com INCLUDE, a coluna c fica nas folhas do índice,
-- permitindo index-only scan sem acessar a tabela.
```

### Ordem de Colunas em Índices Multicoluna

```
WHERE a = ? AND b = ? AND c > ?    →  INDEX(a, b, c)  ← colunas = primeiro, depois range
WHERE a = ? AND c > ?              →  INDEX(a, c)     ← coluna omitida (b) inviabiliza índice
WHERE b = ?                        →  INDEX(a, b)     ← não funciona sem a
```

**Princípio**: colunas com `=` ou `IN` primeiro, colunas com range
(`>`, `<`, `BETWEEN`) por último.

## 10. Caso Real: task-manager — Atualização Automática de Timestamps

Tabelas no **task-manager** usam `updated_at` mas **sem trigger** para
atualizá-lo automaticamente — o código da aplicação precisa gerenciar
manualmente, o que é propenso a bugs.

### Padrão: Trigger com cláusula WHEN para evitar recursão

Em SQLite, um `AFTER UPDATE` que faz `UPDATE` na mesma tabela **dispara
o trigger novamente**, criando recursão infinita. A solução é usar
a cláusula `WHEN` como guarda:

```sql
CREATE TRIGGER trg_tasks_updated_at AFTER UPDATE ON tasks
WHEN NEW.updated_at = OLD.updated_at
  OR (NEW.updated_at IS NULL AND OLD.updated_at IS NULL)
BEGIN
    UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

**Como funciona**: o trigger só executa se `updated_at` não mudou.
Na primeira execução (UPDATE real), o `WHEN` é verdadeiro e o trigger
atualiza `updated_at`. Isso dispara o trigger novamente, mas agora
`NEW.updated_at != OLD.updated_at` → `WHEN` falso → **não executa**.
Recursão interrompida.

### Plano de Implementação

O plano completo de migração V5 está em
[wiki/plan/plan-03-updated-at-triggers.md](../../wiki/plan/plan-03-updated-at-triggers.md).

---

**Próximo**: [05-queries-otimizacao.md](05-queries-otimizacao.md) — Queries e Otimização
