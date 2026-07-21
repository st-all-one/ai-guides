# DML e Consultas — Padrão Moderno

Baseado em: `02-SQL-Language/dml-*.html`, `queries-*.html`, `functions-*.html`

---

## 1. INSERT — Padrões Modernos

### INSERT com identidade

```sql
INSERT INTO usuarios (nome, email) VALUES ('João', 'joao@email.com');
-- id é gerado automaticamente pela identity column
```

### INSERT com OVERRIDING (identity columns)

```sql
-- Forçar valor em GENERATED ALWAYS
INSERT INTO usuarios (id, nome, email)
    OVERRIDING SYSTEM VALUE
    VALUES (999, 'João', 'joao@email.com');
```

### INSERT múltiplo com VALUES

```sql
INSERT INTO categorias (nome) VALUES
    ('Eletrônicos'),
    ('Livros'),
    ('Roupas')
RETURNING id, nome;
```

### INSERT FROM SELECT com upsert

```sql
INSERT INTO destino (id, nome)
SELECT id, nome FROM origem
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;
```

---

## 2. UPDATE — Padrão Moderno

### UPDATE com RETURNING

```sql
UPDATE pedidos SET status = 'pago', pago_em = now()
WHERE id = 42
RETURNING id, status, pago_em;
```

### UPDATE com FROM (joins)

```sql
UPDATE vendas v SET total = v.total * (1 - d.percentual_desconto)
FROM descontos d
WHERE d.categoria = v.categoria
  AND d.valido_de <= current_date
  AND d.valido_ate >= current_date;
```

---

## 3. DELETE — Padrão Moderno

### DELETE com USING (joins)

```sql
DELETE FROM pedidos p USING clientes c
WHERE p.cliente_id = c.id AND c.ativo = false;
```

### DELETE com RETURNING

```sql
DELETE FROM logs_antigos WHERE criado_em < '2025-01-01'
RETURNING id, criado_em;
```

---

## 4. SELECT — Padrões e Boas Práticas

### Qualificação explícita de colunas

```sql
-- ✅ Sempre qualifique em queries multi-tabela
SELECT u.id, u.nome, p.total
FROM usuarios u
JOIN pedidos p ON p.usuario_id = u.id;
```

### LATERAL — essencial para top-N por grupo

```sql
-- 📝 Top 3 pedidos por usuário
SELECT u.nome, p.id, p.total
FROM usuarios u
CROSS JOIN LATERAL (
    SELECT id, total FROM pedidos
    WHERE usuario_id = u.id
    ORDER BY total DESC
    LIMIT 3
) p;
```

### CTEs vs Subqueries — quando usar cada

```sql
-- ✅ CTE: quando a mesma subquery é referenciada múltiplas vezes
WITH pedidos_ativos AS (
    SELECT * FROM pedidos WHERE status = 'ativo'
)
SELECT * FROM pedidos_ativos WHERE total > 100;

-- ✅ CTE: recursão
WITH RECURSIVE subcategorias AS (
    SELECT id, nome, categoria_pai_id FROM categorias WHERE id = 1
    UNION ALL
    SELECT c.id, c.nome, c.categoria_pai_id
    FROM categorias c
    JOIN subcategorias s ON s.id = c.categoria_pai_id
)
SELECT * FROM subcategorias;

-- ✅ Subquery: quando usada uma vez, especialmente no WHERE
SELECT * FROM pedidos WHERE usuario_id IN (
    SELECT id FROM usuarios WHERE ativo = true
);
```

⚠️ CTEs são **barreiras de otimização** no PostgreSQL — o planner materializa a CTE a menos que seja `NOT MATERIALIZED` (PG 12+):

```sql
WITH pedidos_ativos AS NOT MATERIALIZED (
    SELECT * FROM pedidos WHERE status = 'ativo'
)
```

### Window Functions — padrão moderno

```sql
-- 📝 Row number por partição
SELECT *, row_number() OVER (PARTITION BY usuario_id ORDER BY criado_em DESC) AS rn
FROM pedidos;

-- 📝 Total acumulado
SELECT *, sum(total) OVER (PARTITION BY usuario_id ORDER BY criado_em) AS acumulado
FROM pedidos;

-- 📝 Média móvel (3 pedidos anteriores)
SELECT *, avg(total) OVER (
    PARTITION BY usuario_id ORDER BY criado_em
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
) AS media_movel
FROM pedidos;
```

### FILTER (WHERE) em agregados — PG 9.4+

```sql
-- ✅ Muito mais limpo que CASE WHEN
SELECT
    usuario_id,
    count(*) FILTER (WHERE status = 'pago') AS pagos,
    count(*) FILTER (WHERE status = 'cancelado') AS cancelados
FROM pedidos
GROUP BY usuario_id;
```

### GROUPING SETS, CUBE, ROLLUP

```sql
SELECT categoria, mes, sum(total)
FROM vendas
GROUP BY GROUPING SETS ((categoria), (mes), ())
ORDER BY categoria, mes;
```

---

## 5. MERGE (PG 15+) — Upsert Padronizado SQL

```sql
MERGE INTO estoque e
USING (SELECT 1 AS produto_id, 10 AS quantidade) AS s
ON e.produto_id = s.produto_id
WHEN MATCHED THEN UPDATE SET quantidade = e.quantidade + s.quantidade
WHEN NOT MATCHED THEN INSERT (produto_id, quantidade)
    VALUES (s.produto_id, s.quantidade);
```

**📝** `MERGE` é mais legível que `INSERT ... ON CONFLICT DO UPDATE` para upserts complexos com múltiplas condições.

---

## 6. Queries com JSONB

```sql
-- Criação e indexação
CREATE TABLE eventos (payload jsonb);
CREATE INDEX idx_eventos_gin ON eventos USING gin (payload jsonb_path_ops);

-- Consultas
SELECT * FROM eventos WHERE payload @> '{"tipo": "click"}';
SELECT * FROM eventos WHERE payload ? 'urgente';
SELECT payload->>'nome' AS nome FROM eventos;
```

---

## 7. Full-Text Search — nativo e sem extensão

```sql
-- Índice GIN para busca textual
CREATE INDEX idx_busca_cliente ON clientes USING gin (to_tsvector('portuguese', nome || ' ' || sobrenome));

-- Consulta
SELECT * FROM clientes
WHERE to_tsvector('portuguese', nome || ' ' || sobrenome) @@ to_tsquery('portuguese', 'joão & silva');
```

---

## 8. Dicas de Performance em DML

### Bulk INSERT

```sql
-- ✅ Multi-row VALUES (único statement)
INSERT INTO tabela VALUES (1,'a'), (2,'b'), (3,'c');

-- ✅ COPY para grandes volumes
\copy tabela FROM 'dados.csv' WITH (FORMAT csv, HEADER true);

-- ✅ Desabilitar triggers e índices (cuidado!)
ALTER TABLE tabela SET UNLOGGED;  -- ⚠️ perde dados em crash
-- ... INSERTs ...
ALTER TABLE tabela LOGGED;
```

### UPDATE massivo

```sql
-- ✅ Batch pequenos para evitar table bloat
UPDATE pedidos SET status = 'processado'
WHERE id IN (SELECT id FROM pedidos WHERE status = 'novo' LIMIT 1000);
```

### Retorno de IDs após INSERT

```sql
-- ✅ Muito melhor que lastval() ou currval()
INSERT INTO usuarios (nome) VALUES ('Maria') RETURNING id;
```

---

## 9. Armadilhas Comuns em DML

| 🛑 Antipadrão | Problema | ✅ Solução |
|---------------|----------|-----------|
| `SELECT *` em produção | Quebra se colunas mudam, retorna dados desnecessários | Colunas explícitas |
| Subquery correlacionada sem índice | Nested loop ineficiente | JOIN ou índice |
| `COUNT(*)` em tabelas grandes | Sequential scan caro | Aproximação com pg_class ou estatísticas |
| `IN (subquery)` grande | Pode ser lento | JOIN ou `= ANY(ARRAY[...])` |
| `OFFSET` grande | Sempre escaneia linhas descartadas | Keyset pagination (WHERE id > last_seen) |
| UPDATE sem WHERE | Atualiza tabela inteira | Sempre verifique WHERE |
| INSERT sem colunas explícitas | Quebra se schema mudar | Sempre liste colunas |
