# Queries e Otimização

Baseado em: `queryplanner.html`, `optoverview.html`, `eqp.html`, `lang_select.html`

---

## 1. EXPLAIN QUERY PLAN (Ferramenta Essencial)

Sempre verifique como o SQLite executa suas queries:

```sql
EXPLAIN QUERY PLAN SELECT * FROM funcionario WHERE dept_id = 5;
-- Saída (árvore de nós):
-- |--SEARCH funcionario USING INDEX idx_dept (dept_id=?)
```

**Notação**:
- `SEARCH ... USING INDEX` → bom, usa índice
- `SEARCH ... USING COVERING INDEX` → excelente, nem toca na tabela
- `SCAN ...` → full table scan (possível problema com tabelas grandes)
- `USE TEMP B-TREE FOR ORDER BY` → ordenação extra (pode ser evitada com índice)

No CLI:
```
.eqp on     -- ativa EXPLAIN QUERY PLAN automático para toda query
.explain on -- formata saída tabular
```

## 2. Tipos de Acesso

### Full Table Scan
```sql
SELECT * FROM funcionario;  -- lê TUDO, O(N)
```

### Busca por Rowid (O(log N))
```sql
SELECT * FROM funcionario WHERE rowid = 42;
SELECT * FROM funcionario WHERE id = 42;  -- se id é INTEGER PRIMARY KEY
```

### Busca por Índice (O(log N) no índice + O(log N) na tabela)
```sql
SELECT * FROM funcionario WHERE email = 'joao@empresa.com';
-- SEARCH funcionario USING INDEX idx_email (email=?)
```

### Covering Index Scan (O(log N) — 2x mais rápido, só no índice)
```sql
SELECT email, nome FROM funcionario WHERE email = 'joao@empresa.com';
-- SEARCH funcionario USING COVERING INDEX idx_email (email=?)
-- Só funciona se TODAS as colunas necessárias estão no índice.
```

Para criar um covering index, use `INCLUDE`:
```sql
CREATE INDEX idx_email_cover ON funcionario(email) INCLUDE(nome, dept_id);
-- Agora SELECT email, nome FROM funcionario WHERE email = ? usa só o índice.
```

## 3. 18 Otimizações do SQLite

### 3.1 Análise da Cláusula WHERE
O SQL quebra WHERE em conjuncts (AND) e verifica quais colunas de índice
podem ser usadas. Colunas mais à esquerda com `=`, `IN`, `IS` permitem
acesso indexado. A coluna mais à direita pode usar desigualdade.

### 3.2 Otimização BETWEEN
```sql
WHERE x BETWEEN 10 AND 20
-- Internamente: x >= 10 AND x <= 20
```

### 3.3 Otimização OR
```sql
WHERE x=1 OR x=2 OR x=3
-- Convertido para: WHERE x IN (1,2,3) — usa índice!
```

Se OR tem termos diferentes:
```sql
WHERE a=1 OR b=2
-- Usa MULTI-INDEX OR: busca separada em cada índice + UNION
```

### 3.4 Otimização LIKE/GLOB
```sql
WHERE nome LIKE 'João%'    -- range: 'João' <= x < 'Joãp' → usa índice
WHERE nome LIKE '%João'    -- curinga inicial → NÃO usa índice
```

⚠️ Para LIKE usar índice:
- Padrão não pode começar com `%` ou `_`
- Padrão deve ser literal ou parâmetro, não coluna
- Compilar com `SQLITE_LIKE_DOESNT_MATCH_BLOBS` melhora ainda mais

### 3.5 Skip-Scan
Usa índice mesmo quando coluna mais à esquerda está faltando no WHERE:
```sql
CREATE INDEX idx ON t(a, b);
SELECT * FROM t WHERE b = 5;  -- sem condição em a!
-- Skip-scan: itera valores distintos de a e busca b=5 em cada um
```

⚠️ Só funciona se `ANALYZE` foi executado (fornece histograma de valores).

### 3.6 Joins
Implementados como **loops aninhados**. O planejador reordena tabelas
(menos restritiva primeiro) automaticamente:

```sql
SELECT * FROM a JOIN b ON a.id = b.a_id;
-- Possível plano: (a → b) ou (b → a), dependendo das estatísticas
```

**Forçar ordem**: use `CROSS JOIN`:
```sql
SELECT * FROM a CROSS JOIN b ON a.id = b.a_id;
-- Ordem fixa: primeiro a, depois b.
```

### 3.7 Subquery Flattening
Subqueries na cláusula FROM são mescladas na consulta externa:
```sql
SELECT * FROM (SELECT * FROM t WHERE a > 0) AS sub WHERE sub.b < 5;
-- Vira: SELECT * FROM t WHERE a > 0 AND b < 5
```

### 3.8 Co-rotinas vs Materialização
```sql
EXPLAIN QUERY PLAN
SELECT * FROM (SELECT * FROM t ORDER BY a LIMIT 10) ORDER BY b;
-- CO-ROUTINE (ideal): t é lida ordenando por a, e o resultado é reordenado por b
-- vs MATERIALIZE: materializa subquery inteira em tabela temporária
```

### 3.9 Propagação de Constantes
```sql
WHERE a = 5 AND b = a
-- WHERE a = 5 AND b = 5   (SQLite deriva a transitividade)
```

### 3.10 OUTER JOIN Strength Reduction
LEFT/RIGHT/FULL JOIN convertido para INNER JOIN quando possível:
```sql
SELECT * FROM a LEFT JOIN b ON a.id = b.a_id WHERE b.x IS NOT NULL;
-- Vira INNER JOIN (WHERE força exclusão de NULLs)
```

### 3.11 MIN/MAX via Índice
```sql
SELECT MAX(preco) FROM produtos;   -- busca única no índice (O(log N))
SELECT MIN(preco) FROM produtos;   -- busca única no índice
```

## 4. Estratégias de Indexação

### Regras de Ouro

1. **Nunca tenha dois índices onde um é prefixo do outro**
   ```sql
   CREATE INDEX a_b ON t(a, b);        -- √
   CREATE INDEX a ON t(a);             -- ✗ redundante! a_b já serve
   ```

2. **Colunas de igualdade primeiro, range depois**
   ```sql
   WHERE dept_id = ? AND salario > ?
   -- Índice: (dept_id, salario)
   ```

3. **Covering index**: adicione colunas de saída no fim do índice
   ```sql
   -- Query frequente: SELECT nome, email FROM user WHERE status = 'ativo'
   CREATE INDEX idx_user_status ON user(status) INCLUDE(nome, email);
   ```

4. **Índices parciais** para economizar espaço
   ```sql
   CREATE INDEX idx_pedidos_pendentes ON pedido(data) WHERE status = 'pendente';
   ```

### Quando ANALYZE é Essencial

```sql
ANALYZE;  -- ou ANALYZE nome_da_tabela;
```

- `ANALYZE` popula as tabelas `sqlite_stat1` (e `sqlite_stat4` se
  compilado com `SQLITE_ENABLE_STAT4`)
- **Skip-scan nunca é usado sem ANALYZE**
- Estimativas de custo do planejador se baseiam nessas estatísticas
- Execute após grandes mudanças nos dados (>10% das linhas alteradas)

## 5. Dicas de Performance para Queries

### Use `PRAGMA optimize` Antes de Fechar Conexões Curtas

```sql
PRAGMA optimize;  -- atualiza estatísticas, recomenda índices
```

### Evite Subqueries Correlacionadas

```sql
-- RUIM (correlated subquery, executa para cada linha)
SELECT *, (SELECT nome FROM dept WHERE id = e.dept_id) FROM emp e;

-- BOM (JOIN)
SELECT e.*, d.nome FROM emp e JOIN dept d ON e.dept_id = d.id;
```

### Use LIMIT para Paginação com Keyset (não OFFSET)

```sql
-- RUIM (OFFSET precisa ler todas as linhas anteriores)
SELECT * FROM t ORDER BY id LIMIT 10 OFFSET 20;

-- BOM (keyset pagination, usa índice)
SELECT * FROM t WHERE id > 20 ORDER BY id LIMIT 10;
```

### Use CTEs com Cuidado
CTEs são materializadas ou inline pelo planejador. Para CTEs usadas
múltiplas vezes, materialização pode ser boa:

```sql
WITH RECURSIVE
    filhos(id) AS (
        SELECT id FROM emp WHERE gerente_id IS NULL
        UNION ALL
        SELECT e.id FROM emp e JOIN filhos f ON e.gerente_id = f.id
    )
SELECT * FROM filhos;
```

## 6. Estatísticas e Diagnóstico

```sql
-- Mostra o plano de execução
EXPLAIN QUERY PLAN SELECT ...;

-- Mostra as estatísticas coletadas
SELECT * FROM sqlite_stat1;

-- Mostra o SQL da criação do índice
SELECT sql FROM sqlite_schema WHERE type = 'index';

-- Verifica uso de índice em tempo real
PRAGMA stats;
```

## 7. Caso Real: task-manager — Otimização de Índices no Projeto

A revisão do schema do **task-manager** identificou 25 índices com
oportunidades de melhoria:

| Técnica | Quantidade | Exemplo |
|---------|-----------|---------|
| Índices parciais | 4 candidatos | `WHERE archived = 0` em `tasks` |
| Ordenação DESC | 4 índices | `created_at DESC` para ORDER BY recentes |
| Covering (INCLUDE) | 2 índices | `INCLUDE(title, priority)` para evitar acesso à tabela |
| Redundância | 5 índices | `idx_tasks_ws` é prefixo de `idx_tasks_status` |

### Plano de Implementação

O plano completo com SQL before/after e análise de EXPLAIN QUERY PLAN
está em [wiki/plan/plan-04-index-optimization.md](../../wiki/plan/plan-04-index-optimization.md).

---

**Próximo**: [06-seguranca.md](06-seguranca.md) — Segurança
