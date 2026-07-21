# Índices e Performance

Baseado em: `02-SQL-Language/indexes-*.html`, `performance-tips.html`, `using-explain.html`, `parallel-query.html`

---

## 1. Tipos de Índice — Quando Usar Cada

### B-tree (padrão) — para igualdade e range

```sql
CREATE INDEX idx_usuarios_nome ON usuarios (nome);
CREATE INDEX idx_pedidos_data ON pedidos (criado_em);
CREATE INDEX idx_pedidos_usuario_data ON pedidos (usuario_id, criado_em);
```

**📝** B-tree é o padrão (`USING btree` é opcional). Suporta: `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `LIKE 'prefixo%'`, `IS NULL`.

### BRIN — Block Range INdex (PG 9.5+)

```sql
-- ✅ Ideal para dados correlacionados fisicamente (logs, séries temporais)
CREATE INDEX idx_logs_brin ON logs USING brin (criado_em)
    WITH (pages_per_range = 32);
```

**📝** BRIN é **muito menor** que B-tree (centenas de KB vs GB) para dados ordenados. Ideal para tabelas gigantes (data warehouse, logs).

**Quando usar:**
- Tabelas com > 1B linhas
- Dados inseridos em ordem temporal
- Consultas de range (meses, semanas)
- Pouca RAM para índices

### GiST — Generalized Search Tree

```sql
-- ✅ Geometria, full-text search, range types
CREATE INDEX idx_localizacao ON locais USING gist (geom);
CREATE INDEX idx_reserva ON reservas USING gist (periodo)
    WHERE NOT periodo IS NULL;
```

**📝** Suporta: `<<`, `&<`, `&>`, `>>`, `@>`, `<@`, `&&`, `~=`, overlaps (`&&` em ranges/temporal).

### GIN — Generalized Inverted Index

```sql
-- ✅ JSONB, arrays, full-text search
CREATE INDEX idx_eventos_json ON eventos USING gin (payload jsonb_path_ops);
CREATE INDEX idx_tags ON artigos USING gin (tags);
```

**📝** Suporta: `@>`, `?`, `?|`, `?&` (JSONB); `@>`, `&&` (arrays); `@@` (full-text search).

**`jsonb_path_ops` vs default:** `jsonb_path_ops` é mais rápido para path queries, mas não suporta `?` (chave no topo).

### SP-GiST — Space-Partitioned GiST

```sql
-- ✅ Dados geométricos dispersos, textos com busca por prefixo
CREATE INDEX idx_texto ON dados USING spgist (texto COLLATE "pt_BR");
```

### Hash (PG 10+)

```sql
-- ✅ Apenas para igualdade (=) quando não importa ordenação
CREATE INDEX idx_hash_id ON usuarios USING hash (id);
```

**📝** Raramente melhor que B-tree para igualdade. Use apenas quando testado.

---

## 2. Índices Especiais

### Partial Indexes

```sql
-- ✅ Índice apenas para pedidos ativos (economiza espaço e CPU)
CREATE INDEX idx_pedidos_ativos ON pedidos (usuario_id, criado_em)
    WHERE status = 'ativo';
```

**📝** Consultas que usam `WHERE status = 'ativo'` serão drasticamente mais rápidas.

### Expressional Indexes

```sql
-- ✅ Índice em expressão (função)
CREATE INDEX idx_usuarios_nome_minusculo ON usuarios (lower(nome));
SELECT * FROM usuarios WHERE lower(nome) = 'joão';
```

### Unique Indexes

```sql
-- ✅ Unique é constraint + índice
CREATE UNIQUE INDEX idx_email_unico ON usuarios (lower(email));
```

### Covering Indexes / INCLUDE columns (PG 11+)

```sql
-- ✅ Index-only scan sem acessar a tabela
CREATE INDEX idx_pedidos_cobrir ON pedidos (usuario_id) INCLUDE (total, status);
```

**📝** Colunas INCLUDE ficam na leaf page do índice, permitindo index-only scan. Use para colunas frequentemente consultadas mas não usadas em filtros.

---

## 3. Ordenação e Collations

```sql
-- ✅ Índice com ordenação específica
CREATE INDEX idx_pedidos_data_desc ON pedidos (criado_em DESC);
CREATE INDEX idx_usuarios_nome_nulls_last ON usuarios (nome ASC NULLS LAST);
```

---

## 4. EXPLAIN — Leitura e Interpretação

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING) SELECT * FROM usuarios WHERE id = 1;
```

**Plan nodes comuns:**

| Node | Significado | O que indica |
|------|-------------|--------------|
| `Seq Scan` | Escaneia tabela inteira | 🛑 Falta índice (tabela pequena é OK) |
| `Index Scan` | Acessa índice + tabela | ✅ Bom |
| `Index Only Scan` | Só o índice é suficiente | ✅ ✅ Melhor |
| `Bitmap Heap Scan` | Combina múltiplos índices | ✅ Bom para combinação |
| `Nested Loop` | Para cada linha externa, busca interna | ✅ Bom se interno é indexado |
| `Hash Join` | Constrói hash table de uma tabela | ✅ Bom para joins grandes |
| `Merge Join` | Ordena ambos os lados | ✅ Bom se dados já ordenados |


### 📝 Padrões de Leitura

```sql
-- Queries lentas > 1s (configurável)
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state = 'active' AND query != '<IDLE>'
ORDER BY duration DESC;
```

## 5. Paralelismo

```conf
max_parallel_workers_per_gather = 2
max_parallel_workers = 8
parallel_tuple_cost = 0.01
parallel_setup_cost = 100
```

**📝** Queries com `ORDER BY` ou `LIMIT` podem não paralelizar. `FOR UPDATE` impede paralelismo.
**📝** Queries com `ORDER BY` ou `LIMIT` podem não paralelizar. `FOR UPDATE` impede paralelismo.

### Dicas de Performance

**Acesso a dados de outro esquema:** Prefixe com o esquema:
```sql
SET search_path TO public, pg_catalog;
```

---

## 6. Quando NÃO usar índice

- Tabelas pequenas (< 1000 linhas): sequential scan é mais rápido
- Colunas com baixa cardinalidade (booleano, status com poucos valores): B-tree ineficiente
- Colunas raramente consultadas: custo de manutenção do índice supera o benefício
- Tabelas com alta frequência de INSERT/UPDATE sem consultas correspondentes

---

## 7. Diagnóstico de Índices

```sql
-- Índices não usados (idx_scan baixo)
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan < 100
ORDER BY idx_scan;

-- Performance detalhada
SELECT * FROM pg_stat_user_indexes WHERE tablename = 'pedidos';
```

---

## 8. Armadilhas Comuns

| 🛑 Problema | Consequência | ✅ Solução |
|-------------|-------------|-----------|
| Muitos índices em tabela com UPDATE intenso | Cada UPDATE mantém todos os índices | Apenas índices necessários para consultas |
| Índice em coluna de baixa cardinalidade (booleano) | Quase não reduz scans | Partial index com `WHERE coluna = true` |
| Índice em expressão sem usar a expressão na query | Índice ignorado | Usar função exata na query |
| Sem índice em FK | Deadlocks em UPDATE/DELETE | Sempre indexar FK |
| BRIN sem ordenação física | Pior que B-tree | VACUUM ou CLUSTER periódico |
| `LIKE '%busca'` sem índice | Sempre sequential scan | Trigram index ou full-text search |
