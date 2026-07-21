# Programação no Servidor — Functions, Procedures, Triggers, Extensões

Baseado em: `05-Server-Programming/xfunc-*.html`, `xproc.html`, `plpgsql-*.html`, `triggers.html`, `trigger-*.html`, `event-triggers.html`, `extend-*.html`, `rules-*.html`

---

## 1. Functions vs Procedures — Quando Usar Cada

| Aspecto | Function | Procedure |
|---------|----------|-----------|
| Comando | `CREATE FUNCTION` | `CREATE PROCEDURE` |
| Retorno | Obrigatório (`RETURNS type` ou `RETURNS SETOF`) | Opcional (pode usar OUT params) |
| Chamada | Em query (SELECT, WHERE, etc.) | `CALL nome(args)` |
| Transaction control | ❌ Não pode COMMIT/ROLLBACK | ✅ Pode COMMIT/ROLLBACK |
| Usar para | Validações, transformações, consultas | ETL, batch processing, operações longas |

```sql
-- 📝 Function
CREATE FUNCTION get_user_email(user_id integer) RETURNS text
    LANGUAGE sql STABLE
    AS $$ SELECT email FROM users WHERE id = user_id $$;

-- 📝 Procedure (pode commitar em lotes)
CREATE PROCEDURE process_batch()
    LANGUAGE plpgsql AS $$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN SELECT * FROM queue WHERE status = 'pending' LOOP
            INSERT INTO processed (data) VALUES (r.data);
            DELETE FROM queue WHERE id = r.id;
            COMMIT;  -- ✅ só possível em procedure
        END LOOP;
    END;
$$;
```

---

## 2. PL/pgSQL — Padrão Moderno

### Estrutura do Bloco

```sql
CREATE OR REPLACE FUNCTION exemplo(p_id integer)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_nome text;
    v_total integer := 0;
BEGIN
    SELECT nome INTO STRICT v_nome FROM usuarios WHERE id = p_id;
    RETURN v_nome;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 'não encontrado';
    WHEN TOO_MANY_ROWS THEN
        RAISE EXCEPTION 'múltiplos usuários com id %', p_id;
END;
$$;
```

### 📝 Padrões Importantes

**SELECT INTO STRICT** — garante exatamente uma linha:
```sql
SELECT nome INTO STRICT v_nome FROM usuarios WHERE id = p_id;
-- Gera NO_DATA_FOUND (0 rows) ou TOO_MANY_ROWS (>1 row)
```

**RETURN QUERY** — mais eficiente que loop com RETURN NEXT:
```sql
CREATE FUNCTION get_ativos() RETURNS SETOF usuarios
    LANGUAGE plpgsql STABLE AS $$
    BEGIN
        RETURN QUERY SELECT * FROM usuarios WHERE ativo = true;
    END;
$$;
```

**EXECUTE com USING** — queries dinâmicas seguras (NUNCA concatenar):
```sql
CREATE FUNCTION executar_query(tabela text, condicao text)
RETURNS SETOF record
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT * FROM %I WHERE %s', tabela, condicao
    );
END;
$$;
```

### Transaction Control em Procedures

```sql
CREATE PROCEDURE lote_com_checkpoint()
LANGUAGE plpgsql AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM fila LOOP
        INSERT INTO destino VALUES (r.id, r.dado);
        DELETE FROM fila WHERE id = r.id;
        IF r.id % 100 = 0 THEN
            COMMIT;  -- automaticamente inicia nova transação
        END IF;
    END LOOP;
    COMMIT;
END;
$$;

CALL lote_com_checkpoint();
```

⚠️ **Cuidados com Transaction Control:**
- Primeiro COMMIT converte cursores para HOLDABLE (materializa tudo)
- Locks de linha/cursor são perdidos após COMMIT
- Não pode ter `SELECT` entre `CALL`s na pilha

---

## 3. Triggers — Padrão Moderno

### Classificação

```
BEFORE → operação → AFTER
                ↕
         INSTEAD OF (apenas views)
```

**Níveis:** `FOR EACH ROW` ou `FOR EACH STATEMENT`

### Trigger Function Template

```sql
CREATE OR REPLACE FUNCTION trigger_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.criado_em = now();
        NEW.criado_por = current_user;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.atualizado_em = now();
        NEW.atualizado_por = current_user;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit
    BEFORE INSERT OR UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit();
```

### 📝 Transition Tables (PG 10+) — MUITO mais eficiente que FOR EACH ROW

```sql
CREATE FUNCTION log_batch_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO log_audit (operacao, data, usuario, momento)
    SELECT
        TG_OP,
        row_to_json(NEW.*),
        current_user,
        now()
    FROM new_table;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_batch
    AFTER INSERT ON usuarios
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION log_batch_changes();
```

### AFTER STATEMENT com Transition Tables — para auditoria em lote:

```sql
CREATE TRIGGER trg_audit_update
    AFTER UPDATE ON pedidos
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION log_update_changes();
```

### 📝 Regras de Retorno

| Trigger | `RETURN NEW` | `RETURN OLD` | `RETURN NULL` |
|---------|-------------|-------------|---------------|
| BEFORE INSERT | ✅ segue INSERT | N/A | Cancela linha |
| BEFORE UPDATE | ✅ segue UPDATE | Cancela UPDATE | Cancela linha |
| BEFORE DELETE | N/A | ✅ segue DELETE | Cancela linha |
| AFTER INSERT | Ignorado | N/A | Válido |
| AFTER UPDATE | Ignorado | Ignorado | Válido |
| AFTER DELETE | N/A | Ignorado | Válido |

⚠️ **BEFORE DELETE**: `NEW` é NULL. Retorne `OLD` para permitir.

### INSTEAD OF (views atualizáveis)

```sql
CREATE VIEW clientes_ativos AS
    SELECT * FROM clientes WHERE ativo = true;

CREATE FUNCTION inserir_cliente_ativo()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO clientes (nome, ativo) VALUES (NEW.nome, true)
    RETURNING * INTO NEW;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_instead_insert
    INSTEAD OF INSERT ON clientes_ativos
    FOR EACH ROW
    EXECUTE FUNCTION inserir_cliente_ativo();
```

### Event Triggers

```sql
CREATE OR REPLACE FUNCTION log_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
    INSERT INTO ddl_log (evento, tag, usuario, query)
    VALUES (tg_event, tg_tag, session_user,
            current_query());
END;
$$;

CREATE EVENT TRIGGER trg_log_ddl
    ON ddl_command_end
    EXECUTE FUNCTION log_ddl();
```

**Eventos suportados:** `login`, `ddl_command_start`, `ddl_command_end`, `sql_drop`, `table_rewrite`

⚠️ **Event trigger no login**: um bug pode impedir login. Use `event_triggers = false` na connection string para contornar.

---

## 4. Segurança em Funções

### SECURITY DEFINER — Mitigação Obrigatória

```sql
-- 🛑 PERIGOSO
CREATE FUNCTION get_salary(emp_id int) RETURNS numeric
    SECURITY DEFINER
    LANGUAGE sql AS $$
    SELECT salary FROM employees WHERE id = emp_id;
$$;

-- ✅ SEGURO
CREATE FUNCTION get_salary(emp_id int) RETURNS numeric
    SECURITY DEFINER
    SET search_path = pg_catalog, pg_temp
    LANGUAGE sql AS $$
    SELECT salary FROM public.employees WHERE id = emp_id;
$$;
```

**📝 Regras:**
1. `SET search_path = pg_catalog, pg_temp` — essencial
2. Qualificar esquema de todas as tabelas
3. Preferir `SECURITY INVOKER` (default) sempre que possível

### Volatilidade — Otimização do Planner

```sql
CREATE FUNCTION constante() RETURNS integer
    IMMUTABLE LANGUAGE sql AS $$ SELECT 42 $$;
    -- ✅ Pode ser avaliada uma vez e reutilizada

CREATE FUNCTION now_utc() RETURNS timestamptz
    STABLE LANGUAGE sql AS $$ SELECT now() $$;
    -- ✅ Estável dentro de uma transação

CREATE FUNCTION random_id() RETURNS integer
    VOLATILE LANGUAGE sql AS $$ SELECT random() * 1000000 $$;
    -- ⚠️ Sempre reavaliada
```

**📝** Sempre marque o nível correto — IMMUTABLE/STABLE permitem otimizações como indexação de expressão e materialização de CTE.

---

## 5. Extensões — Empacotamento

### Estrutura Mínima

```bash
minha_ext/
├── minha_ext.control          # metadata da extensão
└── minha_ext--1.0.sql         # script de instalação
```

### Control File

```ini
# minha_ext.control
comment = 'Minha extensão exemplo'
default_version = '1.0'
relocatable = true
trusted = false
requires = 'pgcrypto'
```

### SQL Script

```sql
-- minha_ext--1.0.sql
\echo Use "CREATE EXTENSION minha_ext" to load this file. \quit

CREATE FUNCTION minha_funcao(text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path = pg_catalog, pg_temp
    AS $$ SELECT 'olá, ' || $1 || '!' $$;
```

### Versionamento

```bash
minha_ext--1.0--1.1.sql    # upgrade script
```

```sql
-- Atualizar extensão
ALTER EXTENSION minha_ext UPDATE TO '1.1';
```

⚠️ **Limitações**: scripts de extensão NÃO podem conter `BEGIN`, `COMMIT`, `VACUUM`. Executam dentro de bloco transaction.

---

## 6. Regras (Rule System) vs Triggers

| Aspecto | Regras | Triggers |
|---------|--------|----------|
| Mecanismo | Reescrevem a query | Executam função adicional |
| Performance lote | ✅ Melhor (1 chamada) | Pior (1 chamada por row) |
| Views atualizáveis | ✅ `INSTEAD OF` trigger é mais simples |
| Mensagens de erro | Podem descartar dados silenciosamente | ✅ Podem gerar errors explícitos |
| Complexidade | Query planning complexo | Mais simples conceitualmente |

**📝 Recomendação moderna**: Prefira triggers a regras para quase todos os casos. Use regras apenas para otimização de performance em lote quando triggers FOR EACH ROW forem proibitivos.

---

## 7. Armadilhas Comuns

| 🛑 Problema | Consequência | ✅ Solução |
|-------------|-------------|-----------|
| SECURITY DEFINER sem SET search_path | Ataque de trojan via schema público | `SET search_path = pg_catalog, pg_temp` |
| BEGIN/END em PL/pgSQL confundidos com transações | Acha que está em transação separada | Apenas COMMIT/ROLLBACK em procedures |
| RETURN NEXT sem RETURN no final | Erro runtime | Sempre ter RETURN após os RETURN NEXTs |
| Trigger BEFORE DELETE retorna NEW | Erro (NEW é NULL) | Retornar OLD |
| Função VOLATILE marcada como IMMUTABLE | Resultados incorretos em índices | Marcar volatilidade corretamente |
| Nome de argumento = nome de coluna | Coluna vence na resolução | Usar `function_name.arg_name` |
| SELECT INTO sem STRICT | Variável fica NULL se sem rows | Usar `SELECT INTO STRICT` |
| EXECUTE com concatenação de strings | SQL injection | `EXECUTE ... USING` com `format()` |
| Fora do alcance do trigger | Erro | Verificar NEW vs OLD vs TG_OP |
| Cursor + COMMIT em loop | Cursor vira HOLDABLE (materializa tudo) | Planejar tamanho do lote |
