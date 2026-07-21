# Segurança de Dados — Proteção em Camadas

Baseado em: `03-Server-Administration/client-authentication.html`, `auth-*.html`, `ssl-tcp.html`, `encryption-options.html`, `checksums.html`, `ddl-rowsecurity.html`, `ddl-priv.html`, `predefined-roles.html`, `02-SQL-Language/ddl-priv.html`

---

## 1. Autenticação — Portão de Entrada

### pg_hba.conf — Regras de Ouro

```conf
# ✅ Padrão moderno para instalação segura:
# 1. Acesso local administrativo via peer
local   all             postgres                peer

# 2. Aplicação via rede com SCRAM + SSL
hostssl mydb            app_user   10.0.0.0/8   scram-sha-256

# 3. Rejeitar todo o resto
host    all             all         0.0.0.0/0   reject
```

### Métodos de Autenticação

| Método | Segurança | Uso |
|--------|-----------|-----|
| `scram-sha-256` | ✅ **Alta** — resistente a MITM | **Padrão moderno para senhas** |
| `cert` | ✅ **Muito alta** — certificado SSL | Automação, servidores |
| `gss` (Kerberos) | ✅ Alta | Ambientes corporativos |
| `ldap` | ✅ Alta | Autenticação centralizada |
| `peer` | ✅ Alta (local) | Acesso local via SO |
| `md5` | ⚠️ **DEPRECATED** — será removido | Apenas migração |
| `trust` | 🛑 **ZERO segurança** | Apenas localhost sem rede |
| `password` | 🛑 **senha em texto claro** | NUNCA usar |

### Password Encryption

```conf
password_encryption = 'scram-sha-256'  -- ✅ default no PG 14+
scram_iterations = 4096                -- default, aumento custo
```

⚠️ **MD5 está deprecated** e será removido em versão futura. Migre senhas existentes.

---

## 2. SSL/TLS — Proteção em Trânsito

### Configuração Mínima Obrigatória

```conf
ssl = on
ssl_ca_file = 'root.crt'
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'         # permissão 0600 obrigatória
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
ssl_groups = 'X25519:prime256v1'
```

### Forçar SSL no pg_hba.conf

```conf
hostssl all all 0.0.0.0/0 scram-sha-256
hostnossl all all 0.0.0.0/0 reject
```

### Autenticação via Certificado

```conf
hostssl all all 0.0.0.0/0 cert clientcert=verify-full
```

📝 `verify-full` verifica CN/SAN do certificado do cliente.

---

## 3. Roles e Privilégios — Princípio do Menor Privilégio

### Roles Pré-definidas (PG 14+)

```sql
-- ✅ Use roles pré-definidas em vez de SUPERUSER
GRANT pg_read_all_data TO leitor;    -- SELECT em todos os dados
GRANT pg_write_all_data TO escritor;  -- INSERT/UPDATE/DELETE em todos dados
GRANT pg_monitor TO monitor_role;     -- acesso a todas views pg_stat_*
GRANT pg_maintain TO manutencao;      -- VACUUM, ANALYZE, REINDEX
GRANT pg_checkpoint TO operador;      -- pode executar CHECKPOINT
```

⚠️ **Roles de ALTO RISCO** (podem escalar para superuser):
- `pg_read_server_files` — acesso a arquivos via COPY
- `pg_write_server_files` — escrita via COPY
- `pg_execute_server_program` — execução de programas

### Criação de Roles com Privilégio Mínimo

```sql
CREATE ROLE app_web LOGIN PASSWORD 'senha_segura'
    CONNECTION LIMIT 50;
GRANT pg_read_all_data TO app_web;
GRANT pg_write_all_data TO app_web;

CREATE ROLE auditor LOGIN PASSWORD 'senha_auditor'
    CONNECTION LIMIT 3;
GRANT pg_read_all_data TO auditor;
```

### Hierarquia de Roles

```sql
CREATE ROLE funcionario;
CREATE ROLE gerente INHERIT;
GRANT funcionario TO gerente;  -- gerente herda permissões de funcionário

CREATE ROLE joao LOGIN PASSWORD 'senha' INHERIT;
GRANT funcionario TO joao;     -- joão herda permissões de funcionário
```

---

## 4. Row-Level Security (RLS) — Isolamento de Linhas

### Ativação e Política

```sql
-- Habilitar RLS na tabela
CREATE TABLE documentos (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    criado_por text NOT NULL DEFAULT current_user,
    conteudo text
);
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Política: cada usuário vê apenas seus documentos
CREATE POLICY documentos_user_policy ON documentos
    USING (criado_por = current_user);

-- Política: gerentes veem tudo
CREATE POLICY documentos_gerente_policy ON documentos
    FOR ALL
    USING (current_user IN (SELECT uname FROM gerentes));
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos FORCE ROW LEVEL SECURITY;
```

### Tipos de Comando na Policy

```sql
CREATE POLICY nome ON tabela
    FOR ALL                                  -- INSERT, SELECT, UPDATE, DELETE
    USING (expressão_para_existentes)        -- SELECT, UPDATE, DELETE
    WITH CHECK (expressão_para_novos);       -- INSERT, UPDATE
```

⚠️ **RLS NÃO se aplica se:**
- Usuário tem `BYPASSRLS` (superuser por default)
- A função é `SECURITY DEFINER` executando como superuser

---

## 5. Segurança em Views

### Vazamento de Dados via Funções

```sql
-- 🛑 View PERIGOSA sem security_barrier
CREATE VIEW dados_sensiveis AS
    SELECT * FROM funcionarios WHERE salario < 50000;

-- Usuário malicioso pode criar função de custo zero:
CREATE FUNCTION leak(text) RETURNS bool
    COST 0.0000000000001
    LANGUAGE plpgsql AS $$
    BEGIN RAISE NOTICE '%', $1; RETURN true; END $$;

SELECT * FROM dados_sensiveis WHERE leak(nome);
-- ⚠️ Vaza TODOS os funcionários, não apenas os com salario < 50000
```

```sql
-- ✅ Solução: security_barrier
CREATE VIEW dados_sensiveis WITH (security_barrier) AS
    SELECT * FROM funcionarios WHERE salario < 50000;
```

### Funções LEAKPROOF

```sql
-- Operadores padrão (=, <, >) são LEAKPROOF por default
-- Funções customizadas podem ser marcadas
CREATE FUNCTION comparacao_segura(text, text) RETURNS bool
    LEAKPROOF LANGUAGE sql AS $$ SELECT $1 = $2 $$;
```

---

## 6. Segurança em Functions e Procedures

### SECURITY DEFINER — Riscos e Mitigação

```sql
-- 🛑 PERIGOSO: search_path não definido
CREATE FUNCTION mostra_salario(emp_id int) RETURNS numeric
    SECURITY DEFINER
    LANGUAGE sql AS $$
    SELECT salario FROM funcionarios WHERE id = emp_id;
$$;

-- Ataque: usuário cria tabela trojan
CREATE TABLE public.funcionarios (id int, salario numeric);
INSERT INTO public.funcionarios VALUES (1, 999999);
-- Agora a função do superuser consulta a tabela do usuário!
```

```sql
-- ✅ SEGURO: search_path explícito e qualificação
CREATE FUNCTION mostra_salario(emp_id int) RETURNS numeric
    SECURITY DEFINER
    SET search_path = pg_catalog, pg_temp
    LANGUAGE sql AS $$
    SELECT salario FROM public.funcionarios WHERE id = emp_id;
$$;
```

**📝 Regras de ouro para SECURITY DEFINER:**
1. Sempre use `SET search_path = pg_catalog, pg_temp`
2. Qualifique esquemas de todas as tabelas (public.minha_tabela)
3. Evite SECURITY DEFINER se SECURITY INVOKER resolver

---

## 7. Criptografia em Nível de Coluna (pgcrypto)

```sql
CREATE EXTENSION pgcrypto;

-- Hash de senhas
INSERT INTO usuarios (email, senha_hash)
VALUES ('joao@email.com', crypt('minha_senha', gen_salt('bf', 10)));

-- Verificação
SELECT * FROM usuarios
WHERE email = 'joao@email.com'
  AND senha_hash = crypt('minha_senha', senha_hash);

-- Dados criptografados
INSERT INTO dados_sensiveis (cpf_cripto)
VALUES (pgp_sym_encrypt('123.456.789-00', 'chave_secreta'));

SELECT pgp_sym_decrypt(cpf_cripto, 'chave_secreta') FROM dados_sensiveis;
```

⚠️ **Limitação**: criptografia de coluna impede índices, busca por texto, joins.

---

## 8. Data Checksums — Integridade de Armazenamento

```conf
# Habilitado por default no PG 18
data_checksums = on
```

```bash
# Verificar/ativar
pg_checksums --check -D $PGDATA
pg_checksums --enable -D $PGDATA   # requer offline
```

📝 Checksums detectam **bit rot** (corrupção silenciosa de hardware). Combinado com `wal_log_hints = on`, permite `pg_rewind` para failover.

---

## 9. Network Security

```conf
listen_addresses = 'localhost'     -- ✅ default seguro
# ou listen_addresses = '192.168.1.100'  -- IP específico
# 🛑 NUNCA: listen_addresses = '*'
```

### Túnel SSH como alternativa ao SSL

```bash
ssh -L 5432:localhost:5432 usuario@servidor-remoto
psql -h localhost -p 5432
```

---

## 10. Checklist de Segurança em Produção

### 🔒 Autenticação e Acesso
- [ ] `password_encryption = 'scram-sha-256'`
- [ ] pg_hba.conf sem `trust` (exceto localhost isolado)
- [ ] pg_hba.conf sem `password` (texto claro)
- [ ] `ssl = on` com certificados válidos
- [ ] Conexões externas apenas via `hostssl`

### 👮 Autorização
- [ ] Roles seguem princípio do menor privilégio
- [ ] Nenhum usuário de aplicação tem SUPERUSER
- [ ] RLS habilitado para dados multi-tenant
- [ ] Views sensíveis com `security_barrier`
- [ ] Funções SECURITY DEFINER com `SET search_path`

### 💾 Dados em Repouso
- [ ] `data_checksums = on`
- [ ] Criptografia em nível de sistema de arquivos (LUKS/dm-crypt)
- [ ] Colunas sensíveis criptografadas (pgcrypto)
- [ ] Dados de teste nunca contêm dados reais

### 🔐 Integridade
- [ ] WAL archiving funcionando
- [ ] Backup criptografado em repouso
- [ ] `full_page_writes = on`
- [ ] `fsync = on`
- [ ] `wal_level = replica`

---

## 11. Armadilhas Comuns de Segurança

| 🛑 Problema | Risco | ✅ Solução |
|-------------|-------|-----------|
| `trust` em pg_hba.conf | Qualquer um conecta | `scram-sha-256` ou `peer` |
| MD5 | Quebra de hash, deprecated | Migrar para SCRAM-SHA-256 |
| SUPERUSER para app | Acesso total irrestrito | Roles pré-definidas |
| `search_path` padrão em SECURITY DEFINER | Trojan via schema público | `SET search_path = pg_catalog, pg_temp` |
| View sem `security_barrier` | Vazamento de dados via funções baratas | `WITH (security_barrier)` |
| Sem SSL | Dados em texto claro na rede | `ssl = on` |
| BYPASSRLS para app | RLS inútil | Remover BYPASSRLS |
| `pg_execute_server_program` | Escalação para superuser | NUNCA conceder sem auditoria |
