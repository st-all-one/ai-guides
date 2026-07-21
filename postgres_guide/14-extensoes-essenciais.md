# 14. Extensões Essenciais e Foreign Data Wrappers

Compilado a partir da documentação oficial do PostgreSQL 18.4. Foco: extensões contrib mais úteis para produção, diagnóstico, performance e integração.

## Convenções

- `✅` — padrão moderno recomendado
- `⚠️` — atenção: risco de segurança ou perda de dados
- `🛑` — antipadrão: NÃO usar
- `📝` — exemplo prático
- `🔍` — detalhe de implementação

---

## 1. Extensões de Integridade e Diagnóstico

### amcheck — Verificação de Corrupção de Índice

```sql
CREATE EXTENSION amcheck;
```

Verifica a consistência lógica da estrutura de relations (B-Tree, GIN, heap). Crucial para detectar corrupção silenciosa que data checksums não capturam.

**Funções principais:**

- `bt_index_check(index regclass, heapallindexed boolean, checkunique boolean)` — verificação leve com `AccessShareLock`. Adequada para produção.
- `bt_index_parent_check(index regclass, heapallindexed boolean, rootdescend boolean, checkunique boolean)` — verificação mais profunda que inclui relacionamentos pai/filho. Requer `ShareLock`. Não funciona em hot standby.
- `verify_heapam(relation regclass, ...)` — corrupção estrutural e lógica no heap.
- `gin_index_check(index regclass)` — verifica GIN.

**`heapallindexed = true`**: ativa fase adicional que verifica se cada tupla no heap tem entrada correspondente no índice. Aumenta significativamente o tempo de verificação (~2 bytes de memória por tupla).

```sql
-- Verificar todos os índices B-Tree do catálogo
SELECT bt_index_check(index => c.oid, heapallindexed => i.indisunique)
FROM pg_index i
JOIN pg_class c ON i.indexrelid = c.oid
WHERE c.relkind = 'i' AND i.indisready AND i.indisvalid;
```

✅ **Como integrar em manutenção periódica:** execute `bt_index_check` semanalmente com `heapallindexed = false` em produção. Use `verify_heapam` mensalmente em janela de manutenção.

⚠️ amcheck prova a presença de corrupção, mas não sua ausência. Para reparo, use `REINDEX` e investigue com `pageinspect`.

### pageinspect — Inspeção de Páginas

```sql
CREATE EXTENSION pageinspect;
```

Acesso low-level ao conteúdo de páginas do banco. Essencial para diagnóstico avançado.

**Funções-chave:**

- `get_raw_page(relname text, blkno bigint)` — lê bloco como `bytea`
- `page_header(page bytea)` — cabeçalho da página
- `heap_page_items(page bytea)` — line pointers e tuples do heap
- `bt_metap(relname text)` — metapágina do índice B-Tree
- `bt_page_items(relname text, blkno bigint)` — itens de página B-Tree
- `brin_page_items()`, `gin_leafpage_items()`, `hash_page_stats()` — para outros tipos de índice

```sql
-- Diagnóstico: página 0 de pg_class
SELECT * FROM page_header(get_raw_page('pg_class', 0));
```

### pgstattuple — Estatísticas de Tuple

```sql
CREATE EXTENSION pgstattuple;
```

Mede dead tuple ratio e fragmentação. Acesso restrito ao role `pg_stat_scan_tables`.

- `pgstattuple(regclass)` — full scan, resultados exatos (lento em tabelas grandes)
- `pgstattuple_approx(regclass)` — usa visibility map para estimar, muito mais rápido
- `pgstatindex(regclass)` — densidade e fragmentação de índice B-Tree (`avg_leaf_density`)
- `pgstatginindex(regclass)` — pending list de índices GIN
- `pgstathashindex(regclass)` — páginas bucket/overflow de hash

```sql
SELECT * FROM pgstattuple('minha_tabela');
-- dead_tuple_percent alto => VACUUM urgente

SELECT * FROM pgstatindex('meu_indice');
-- avg_leaf_density baixo => REINDEX ou pg_repack
```

### pg_buffercache — Cache de Buffer

```sql
CREATE EXTENSION pg_buffercache;
```

Examina o shared buffer cache em tempo real. Acesso: `pg_monitor` para consulta, superuser para evicção.

- `pg_buffercache` (view) — uma linha por buffer: `bufferid`, `relfilenode`, `relforknumber`, `relblocknumber`, `isdirty`, `usagecount`, `pinning_backends`
- `pg_buffercache_summary()` — resumo: buffers used/unused/dirty/pinned + usagecount_avg
- `pg_buffercache_usage_counts()` — contagem agregada por usage count
- `pg_buffercache_evict(bufferid)` — remove buffer específico (teste/dev apenas)
- `pg_buffercache_evict_relation(relid)` — evita buffers de uma relation

```sql
-- Quais relations estão mais no cache?
SELECT n.nspname, c.relname, count(*) AS buffers
FROM pg_buffercache b
JOIN pg_class c ON b.relfilenode = pg_relation_filenode(c.oid)
  AND b.reldatabase IN (0, (SELECT oid FROM pg_database WHERE datname = current_database()))
JOIN pg_namespace n ON n.oid = c.relnamespace
GROUP BY n.nspname, c.relname
ORDER BY 3 DESC LIMIT 10;
```

🔍 Não adquire locks do buffer manager. Resultados podem ter pequenas imprecisões devido a concorrência.

### pgcrypto — Criptografia (complemento ao guia 04)

```sql
CREATE EXTENSION pgcrypto;
```

Requer OpenSSL. Módulo trusted (pode ser instalado por non-superuser com `CREATE` no database).

**Password Hashing:**
- `crypt(password text, salt text)` — hash estilo `crypt(3)`
- `gen_salt(type text [, iter_count])` — gera salt. Tipos: `bf` (Blowfish), `md5`, `xdes`, `des`, `sha256crypt`, `sha512crypt`

```sql
-- Armazenar senha com Blowfish (recomendado)
UPDATE usuarios SET pswhash = crypt('minha_senha', gen_salt('bf'));

-- Verificar senha
SELECT (pswhash = crypt('senha_digitada', pswhash)) AS valido FROM usuarios;
```

✅ Prefira `bf` (Blowfish) por ser adaptativo e lento. ⚠️ O iter_count default para `sha256crypt`/`sha512crypt` (5000) é considerado baixo para hardware moderno.

**PGP Encryption:**
- `pgp_sym_encrypt(data, psw)` / `pgp_sym_decrypt(msg, psw)` — criptografia simétrica
- `pgp_pub_encrypt(data, key)` / `pgp_pub_decrypt(msg, key)` — criptografia assimétrica
- `armor(data)` / `dearmor(data)` — ASCII-armor (Base64 + CRC)

**Raw Encryption (AES):**
- `encrypt(data, key, type)` / `decrypt(data, key, type)` — algoritmos: `aes`, `bf`, `3des`, `cast5`
- `digest(data, type)` — hash: `md5`, `sha1`, `sha256`, `sha512`
- `hmac(data, key, type)` — HMAC (hash com chave)

⚠️ Gerenciamento de chave é responsabilidade do usuário. pgcrypto não gerencia chaves. Considere o uso de serviços externos de KMS.

---

## 2. Extensões de Segurança

### passwordcheck — Política de Senhas

Módulo que rejeita senhas fracas em `CREATE/ALTER ROLE`.

```sql
-- postgresql.conf (requer restart)
shared_preload_libraries = 'passwordcheck'
```

```sql
-- postgresql.conf
passwordcheck.min_password_length = 12
```

⚠️ **Limitação**: se o cliente envia senha pré-criptografada, o módulo não consegue verificar a senha original. Não substitui autenticação externa (GSSAPI, LDAP).

Extensível via hooks no código fonte. Pode integrar CrackLib descomentando linhas no Makefile.

### sepgsql — SELinux Integration

```sql
-- postgresql.conf
shared_preload_libraries = 'sepgsql'
```

Label-based mandatory access control (MAC) que opera além do RLS. Requer SELinux no sistema operacional configurado. Controla acesso em nível de coluna com base em labels do SELinux.

⚠️ Configuração complexa. Necessária política SELinux específica para PostgreSQL. Apenas para ambientes com requisitos rigorosos de segurança mandatória.

### sslinfo — Informação SSL

```sql
CREATE EXTENSION sslinfo;
```

Funções para inspecionar a conexão SSL atual:

- `ssl_is_used()` — conexão atual usa SSL?
- `ssl_client_cert_present()` — cliente apresentou certificado?
- `ssl_client_serial()`, `ssl_client_dn()`, `ssl_client_issuer()` — dados do certificado
- `ssl_extension_info()` — extensões do certificado

```sql
SELECT ssl_is_used(), ssl_client_cert_present();
```

Útil para implementar lógica de autorização baseada em certificado.

---

## 3. Extensões de Performance

### pg_prewarm — Preaquecimento de Cache

```sql
CREATE EXTENSION pg_prewarm;
```

Carrega relations no buffer cache para reduzir latência pós-restart.

**Modos:**
- `prefetch` — async (requer suporte do SO)
- `read` — sync, lê para cache do SO
- `buffer` — carrega no shared buffers do PostgreSQL

```sql
-- Preaquecer tabela manualmente
SELECT pg_prewarm('minha_tabela', mode => 'buffer');

-- Preaquecer bloco específico
SELECT pg_prewarm('minha_tabela', first_block => 0, last_block => 1000);
```

✅ **Configuração recomendada com autoprewarm:**

```sql
-- postgresql.conf
shared_preload_libraries = 'pg_prewarm'
pg_prewarm.autoprewarm = true
pg_prewarm.autoprewarm_interval = 300s
```

O background worker `autoprewarm` periodicamente salva o estado dos buffers em `autoprewarm.blocks` e os recarrega após restart.

⚠️ Sem autoprewarm, o cache é perdido no restart. Dados preaquecidos não têm proteção especial contra evicção.

### auto_explain — Log Automático de Planos Lentos

```sql
-- postgresql.conf (ou session_preload_libraries para sessões específicas)
session_preload_libraries = 'auto_explain'
```

Não requer `CREATE EXTENSION` — é carregado como biblioteca.

```sql
-- postgresql.conf
auto_explain.log_min_duration = '3s'    -- loga queries >= 3s
auto_explain.log_analyze = on           -- EXPLAIN ANALYZE
auto_explain.log_buffers = on           -- estatísticas de buffers
auto_explain.log_nested_statements = on -- statements dentro de funções
auto_explain.log_min_duration = 0       -- loga TODAS (apenas para debug)
auto_explain.sample_rate = 0.1          -- amostragem 10%
```

⚠️ `auto_explain.log_analyze = on` adiciona overhead de medição em *todas* as queries, mesmo as que não atingem o threshold. Use `auto_explain.log_timing = off` para reduzir impacto.

🔍 Pode ser ativado por sessão via `LOAD 'auto_explain'` (requer superuser).

### pg_stat_statements — Estatísticas de Consultas

```sql
-- postgresql.conf (requer restart)
shared_preload_libraries = 'pg_stat_statements'

-- Criar extensão em cada database onde será consultada
CREATE EXTENSION pg_stat_statements;
```

**Configuração:**

```sql
-- postgresql.conf
pg_stat_statements.max = 5000           -- max queries tracked
pg_stat_statements.track = 'top'        -- 'top' | 'all' | 'none'
pg_stat_statements.track_planning = on  -- rastreia tempo de planejamento
pg_stat_statements.save = on            -- salva em disco no shutdown
pg_stat_statements.track_utility = on   -- rastreia comandos utilitários
```

**Queries úteis:**

```sql
-- Top 10 por tempo total de execução
SELECT queryid, left(query, 80), calls,
       total_exec_time, mean_exec_time, rows,
       shared_blks_hit + shared_blks_read AS total_blks
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY total_exec_time DESC LIMIT 10;

-- Top 10 por mean_time (lentas em média)
SELECT queryid, left(query, 80), calls, mean_exec_time, rows
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC LIMIT 10;

-- Top por chamadas (mais frequentes)
SELECT queryid, left(query, 80), calls, rows, mean_exec_time
FROM pg_stat_statements
ORDER BY calls DESC LIMIT 10;

-- Top por I/O (shared_blks_read)
SELECT queryid, left(query, 80), calls, shared_blks_read
FROM pg_stat_statements
ORDER BY shared_blks_read DESC LIMIT 10;

-- Estatísticas do próprio módulo
SELECT * FROM pg_stat_statements_info;
```

⚠️ `pg_stat_statements_reset()` descarta todo o histórico — use com cautela. Acesso ao texto das queries é restrito a superusers e `pg_read_all_stats`.

🔍 O `queryid` é hash da árvore pós-parse. Não é estável entre versões major. Duas queries estruturalmente idênticas com constantes diferentes são agregadas em uma entrada.

---

## 4. Extensões de Texto e Busca

### pg_trgm — Similaridade por Trigrama

```sql
CREATE EXTENSION pg_trgm;
```

Módulo trusted. Fornece similaridade textual via trigramas.

**Funções:**
- `similarity(a, b)` → real (0 a 1)
- `show_trgm(text)` → text[] (debug)
- `word_similarity(a, b)` → real (similaridade com substring contínua)
- `strict_word_similarity(a, b)` → real (similaridade com boundaries de palavra)

**Operadores:**
- `a % b` — similar > threshold (default 0.3)
- `a <% b` — word similarity
- `a <<% b` — strict word similarity
- `a <-> b` — distância (1 - similarity)

```sql
-- Busca por similaridade
SELECT t, similarity(t, 'palavra') AS sml
FROM test_trgm
WHERE t % 'palavra'
ORDER BY sml DESC;

-- Top 10 mais próximos (GiST apenas)
SELECT t, t <-> 'palavra' AS dist
FROM test_trgm
ORDER BY dist LIMIT 10;
```

✅ **Índice GIN para `LIKE '%termo%'`** (que B-tree não suporta):

```sql
CREATE INDEX trgm_idx ON test_trgm USING GIN (t gin_trgm_ops);
```

Suporta: `LIKE`, `ILIKE`, `~` (regex), `~*`, `=`. ⚠️ GIN não suporta ordenação por distância (`<->`) — use GiST para isso.

```sql
-- GiST com signature length configurável
CREATE INDEX trgm_idx ON test_trgm USING GIST (t gist_trgm_ops(siglen=32));
```

**GUCs:**
- `pg_trgm.similarity_threshold` (default 0.3)
- `pg_trgm.word_similarity_threshold` (default 0.6)
- `pg_trgm.strict_word_similarity_threshold` (default 0.5)

### citext — Case-Insensitive Text

```sql
CREATE EXTENSION citext;
```

Tipo `citext` que compara strings ignorando maiúsculas/minúsculas (usa `lower()` internamente).

```sql
CREATE TABLE usuarios (nick CITEXT PRIMARY KEY, pass TEXT NOT NULL);
INSERT INTO usuarios VALUES ('Larry', 'x');
SELECT * FROM usuarios WHERE nick = 'larry';  -- encontra 'Larry'
```

⚠️ **Limitações:**
- Dependente de `LC_CTYPE` do database
- Menos eficiente que `text` (faz cópia + lower)
- Não suporta B-Tree deduplication
- Não lida corretamente com casos Unicode especiais (ex: dois lowercase para um uppercase)

✅ Considere usar **collations nondeterministic** (PG 12+) em vez de citext para mais flexibilidade e correção Unicode.

### unaccent — Dicionário de Remoção de Acentos

```sql
CREATE EXTENSION unaccent;
```

Módulo trusted. Dicionário de texto (FTS) que remove acentos de lexemas. Filtering dictionary: saída sempre passa para o próximo dicionário.

```sql
-- Uso direto
SELECT unaccent('coração');  -- 'coracao'

-- Integração com FTS
CREATE TEXT SEARCH CONFIGURATION fr (COPY = french);
ALTER TEXT SEARCH CONFIGURATION fr
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;

SELECT to_tsvector('fr', 'Hôtel');     -- 'hotel'
SELECT to_tsvector('fr', 'Hôtel') @@ to_tsquery('fr', 'Hotels');  -- true
```

Arquivo de regras: `$SHAREDIR/tsearch_data/unaccent.rules`. Customizável via `ALTER TEXT SEARCH DICTIONARY unaccent (RULES='my_rules')`.

### hstore — Chave-Valor (Legado)

```sql
CREATE EXTENSION hstore;
```

🛑 **Prefira `jsonb` na maioria dos casos.** hstore tem suporte limitado a strings. jsonb oferece tipos aninhados, arrays, e mais operadores.

```sql
-- Operadores principais
'k=>v'::hstore -> 'k'       -- acesso
'k=>v'::hstore || 'k2=>v2'  -- concatenação
hstore ? 'k'                 -- contém chave?
hstore @> 'k=>v'             -- contém par?
```

Único caso de uso ainda relevante: índice GIN para similaridade com pg_trgm (`hstore % hstore`).

---

## 5. Foreign Data Wrappers

### Conceitos (SQL/MED)

Acesso a dados externos via SQL regular. Hierarquia:

```
FOREIGN DATA WRAPPER (biblioteca)
  → SERVER (configuração de conexão)
    → USER MAPPING (credenciais por role)
      → FOREIGN TABLE (estrutura da tabela remota)
```

```sql
-- DDL básico (ver ddl-foreign-data.html)
CREATE SERVER meu_servidor FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host '...', dbname '...');
CREATE USER MAPPING FOR current_user SERVER meu_servidor
  OPTIONS (user '...', password '...');
CREATE FOREIGN TABLE minha_tabela (...)
  SERVER meu_servidor
  OPTIONS (schema_name 'public', table_name 'tabela_remota');
-- Importar schema inteiro
IMPORT FOREIGN SCHEMA public FROM SERVER meu_servidor INTO local;
```

### postgres_fdw — Acesso a PostgreSQL Remoto

```sql
CREATE EXTENSION postgres_fdw;
```

✅ **Wrapper moderno e recomendado** para acesso a PostgreSQL remoto. Substitui dblink.

**Configuração completa:**

```sql
-- 1. Servidor
CREATE SERVER servidor_remoto FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'db.example.com', port '5432', dbname 'prod');

-- 2. User mapping
CREATE USER MAPPING FOR app_user SERVER servidor_remoto
  OPTIONS (user 'remote_user', password 'secret');

-- 3. Foreign table
CREATE FOREIGN TABLE pedidos_remotos (
  id integer, cliente text, valor numeric, criado_em timestamptz
) SERVER servidor_remoto
  OPTIONS (schema_name 'public', table_name 'pedidos');

-- Ou importar schema inteiro
IMPORT FOREIGN SCHEMA public
  FROM SERVER servidor_remoto INTO local_schema;
```

**Pushdown (otimizações):**

postgres_fdw envia ao servidor remoto:
- ✅ `WHERE` clauses
- ✅ `JOIN` entre foreign tables do mesmo servidor
- ✅ `ORDER BY` e `LIMIT`
- ✅ Agregados (`COUNT`, `SUM`, etc.)
- ✅ `=`, `IN`, e operadores built-in

⚠️ Sem pushdown, dados são transferidos para o local e processados localmente.

**Opções de performance:**

```sql
ALTER SERVER servidor_remoto OPTIONS (
  use_remote_estimate 'true',    -- usa EXPLAIN remoto para custos
  fdw_startup_cost '100',        -- custo de estabelecer conexão
  fdw_tuple_cost '0.2'           -- custo por tupla transferida
);

ALTER FOREIGN TABLE pedidos_remotos OPTIONS (
  fetch_size '100',              -- linhas por fetch
  async_capable 'true'           -- scan concorrente (Append)
);
```

**Segurança:**

- `user`/`password` no USER MAPPING, nunca no SERVER
- `password_required 'false'` apenas para casos especiais (⚠️ superuser apenas)
- `use_scram_passthrough` — evita armazenar senha em texto plano no catálogo
- ⚠️ User mapping expõe credenciais em `pg_user_mappings` (acesso restrito a owner e superuser)

```sql
-- SCRAM pass-through (PG 16+)
ALTER SERVER servidor_remoto OPTIONS (ADD use_scram_passthrough 'true');
```

**Gerenciamento de conexão:**
- Conexões são mantidas por sessão (`keep_connections = on`)
- `parallel_commit` / `parallel_abort` — commit/abort paralelo de transações remotas
- `batch_size` — INSERT em lote (max 65535 params por query)

### file_fdw — Acesso a Arquivos

```sql
CREATE EXTENSION file_fdw;
CREATE SERVER file_fdw_server FOREIGN DATA WRAPPER file_fdw;
```

Lê arquivos no servidor no formato `COPY` (CSV, TEXT, FIXED). Read-only.

```sql
-- CSV com cabeçalho
CREATE FOREIGN TABLE my_csv (
  id int, nome text, valor numeric
) SERVER file_fdw_server
OPTIONS (filename '/dados/arquivo.csv', format 'csv', header 'true');

-- Programa (saída de comando)
CREATE FOREIGN TABLE logs_recentes (
  log_time timestamptz, message text
) SERVER file_fdw_server
OPTIONS (program 'tail -100 /var/log/postgresql/postgresql.log',
         format 'text');
```

⚠️ **`program` option executa comando no servidor — restrito a superuser e `pg_execute_server_program`.** Risco de segurança: o shell interpreta a string.

Opções: `filename`, `program`, `format`, `header`, `delimiter`, `quote`, `escape`, `null`, `encoding`, `on_error`, `reject_limit`.

### dblink — Conexão a Banco Remoto (Legado)

```sql
CREATE EXTENSION dblink;
```

🛑 **Prefira `postgres_fdw`** na maioria dos casos. dblink é mais verboso e menos otimizado.

```sql
-- Conexão e consulta
SELECT dblink_connect('conn1', 'host=... dbname=... user=... password=...');
SELECT * FROM dblink('conn1', 'SELECT id, nome FROM tabela') AS t(id int, nome text);
SELECT dblink_exec('conn1', 'UPDATE tabela SET nome = ''x'' WHERE id = 1');
SELECT dblink_disconnect('conn1');

-- Cursor para resultados grandes
SELECT dblink_open('conn1', 'mycur', 'SELECT * FROM tabela_grande');
SELECT * FROM dblink_fetch('conn1', 'mycur', 100);
SELECT dblink_close('conn1', 'mycur');
```

🛑 `dblink_connect_u()` — conexão "insegura" que permite non-superuser conectar sem senha explícita. **NÃO usar em produção.**

✅ **Quando usar dblink:** consultas ad-hoc entre bancos em scripts ou funções de manutenção. postgres_fdw é superior para acesso regular a foreign tables.

---

## 6. Monitoramento e Inspeção

### pgfreespacemap — Mapa de Espaço Livre

```sql
CREATE EXTENSION pgfreespacemap;
```

Exibe o espaço livre por página via `pg_freespacemap` view.

```sql
-- Espaço livre por página (diagnóstico de bloat)
SELECT *, round(100 * avail / 8192, 1) AS free_pct
FROM pg_freespacemap('minha_tabela')
WHERE avail > 0
ORDER BY blkno;
-- Muitas páginas com free_pct alto + dead tuples => bloat
```

Acesso restrito a `pg_stat_scan_tables`.

### pgvisibility — Mapa de Visibilidade

```sql
CREATE EXTENSION pgvisibility;
```

Diagnóstico de vacuum: páginas all-visible e all-frozen.

```sql
-- Ver mapa de visibilidade
SELECT * FROM pg_visibility('minha_tabela');

-- Páginas que NÃO são all-visible (precisam de vacuum)
SELECT count(*) FROM pg_visibility('minha_tabela') WHERE all_visible = false;

-- Funções de diagnóstico
SELECT pg_check_frozen('minha_tabela');
SELECT pg_truncate_visibility_map('minha_tabela');  -- ⚠️ superuser apenas
```

### pgwalinspect — Inspeção WAL

```sql
CREATE EXTENSION pg_walinspect;
```

Funções SQL para inspecionar o conteúdo WAL visível no servidor atual.

```sql
SELECT * FROM pg_get_wal_records_info('0/00000000', '0/FFFFFFFF');
SELECT * FROM pg_get_wal_block_info('0/00000000', '0/FFFFFFFF');
SELECT * FROM pg_get_wal_stats('0/00000000', '0/FFFFFFFF');
```

⚠️ Requer `wal_level >= replica` e acesso ao WAL local.

### pglogicalinspect — Logical Decoding Inspection

```sql
CREATE EXTENSION pg_logicalinspect;
```

Inspeciona componentes de logical decoding: slots, catálogos, contexts.

```sql
SELECT * FROM pg_logicalinspect_slots();
SELECT * FROM pg_logicalinspect_catcache();
```

Útil para diagnosticar problemas em replicação lógica.

### pgrowlocks — Locks por Linha

```sql
CREATE EXTENSION pgrowlocks;
```

Mostra informações de locking de linhas em uma tabela.

```sql
SELECT * FROM pgrowlocks('minha_tabela');
-- locked_by | lock_type | ... 
```

Diagnóstico de contenção: identifica quais transações estão segurando locks em quais tuplas.

---

## 7. Extensões Especializadas

### bloom — Bloom Filter Index

```sql
CREATE EXTENSION bloom;
CREATE INDEX bloom_idx ON minha_tabela USING bloom (col1, col2, col3, col4);
```

Índice baseado em bloom filter. Útil para consultas com **muitas colunas e condições `OR`** ou buscas em qualquer combinação de colunas.

```sql
CREATE INDEX bloom_idx ON table USING bloom (c1, c2, c3, c4)
  WITH (length=80, col1=4, col2=2, col3=1, col4=1);
```

- `length` — tamanho do signature em bits (default 80)
- `colN` — número de bits por coluna (default 2)

✅ Vantagem: ocupa muito menos espaço que múltiplos índices B-tree ou um índice multicoluna.
⚠️ **Trade-off:** falso-positivos são possíveis. PostgreSQL recheca contra o heap para eliminar falsos positivos.

### lo — Large Objects

```sql
CREATE EXTENSION lo;
```

Gerencia Large Objects (LO) via SQL. Funções: `lo_creat()`, `lo_open()`, `lo_write()`, `lo_read()`, `lo_unlink()`.

```sql
SELECT lo_creat(-1);          -- cria LO, retorna OID
SELECT lo_from_bytea(0, 'dados');  -- cria LO a partir de bytea
SELECT lo_put(oid, 0, 'dados');    -- escreve em posição
SELECT lo_get(oid, 0, 1000);       -- lê trecho
```

⚠️ **Prefira TOAST + `bytea` na maioria dos casos.** Large Objects requerem gerenciamento manual (criação/limpeza). `vacuumlo` pode limpar LOs órfãos.

---

## 8. Extensões Especializadas (UUID)

### uuid-ossp — UUID Generation

```sql
CREATE EXTENSION "uuid-ossp";
```

✅ **Nota:** Desde PG 13, `gen_random_uuid()` é built-in e não requer extensão. Use `uuid-ossp` apenas se precisar de:

- `uuid_generate_v1()` — UUID baseado em tempo + MAC
- `uuid_generate_v1mc()` — v1 com MAC aleatório
- `uuid_generate_v3(uuid, text)` — v3 (MD5 namespace)
- `uuid_generate_v5(uuid, text)` — v5 (SHA-1 namespace)

```sql
SELECT gen_random_uuid();       -- built-in, não requer extensão
SELECT uuid_generate_v5(uuid_ns_url(), 'https://exemplo.com');
```

---

## 9. Como Gerenciar Extensões

```sql
-- Listar extensões disponíveis
SELECT * FROM pg_available_extensions ORDER BY name;

-- Listar versões disponíveis de uma extensão
SELECT * FROM pg_available_extension_versions WHERE name = 'pg_stat_statements';

-- Instalar
CREATE EXTENSION pg_trgm;

-- Atualizar (quando nova versão disponível)
ALTER EXTENSION pg_trgm UPDATE;

-- Ver caminhos de atualização disponíveis
SELECT * FROM pg_extension_update_paths('pg_stat_statements');

-- Remover
DROP EXTENSION pg_trgm;

-- Listar extensões instaladas
SELECT * FROM pg_extension;
```

**Trusted vs Untrusted:**
- ✅ **Trusted**: pode ser instalado por non-superuser com privilégio `CREATE` no database. Ex: `pg_trgm`, `citext`, `unaccent`, `pgcrypto`, `fuzzystrmatch`
- ⚠️ **Untrusted**: requer superuser. Ex: `amcheck`, `pageinspect`, `pg_buffercache`, `pgstattuple`, `sepgsql`

**Módulos que requerem `shared_preload_libraries` (restart):**
- `pg_stat_statements`
- `auto_explain` (ou `session_preload_libraries`)
- `passwordcheck`
- `pg_prewarm`
- `sepgsql`

---

## 10. Armadilhas Comuns

🛑 **Esquecer de adicionar ao `shared_preload_libraries`:**
pg_stat_statements, auto_explain, passwordcheck, pg_prewarm (autoprewarm) — todos exigem `shared_preload_libraries`. Sem isso, a funcionalidade não carrega. Requer restart.

⚠️ **pg_prewarm sem autoprewarm:**
Se `pg_prewarm` não estiver em `shared_preload_libraries` ou `autoprewarm = off`, o cache é perdido em restart. Use `autoprewarm_dump_now()` antes de shutdown para salvar estado.

⚠️ **postgres_fdw sem pushdown:**
Consultas lentas geralmente são causadas por falta de pushdown. Verifique com `EXPLAIN (VERBOSE)` se `WHERE`, `JOIN` e `ORDER BY` estão sendo enviados ao remoto. Use `use_remote_estimate` e extensões shippable.

```sql
-- Verificar quais condições são enviadas ao remoto
EXPLAIN (VERBOSE) SELECT * FROM foreign_table WHERE id = 1;
```

⚠️ **file_fdw com `program` option:**
A string é executada pelo shell. Risco de injeção de comandos. Restrito a superuser e `pg_execute_server_program`. Use caminhos fixos, nunca concatenados com input do usuário.

🛑 **dblink_connect_u em produção:**
Permite que non-superuser conecte sem credenciais explícitas. Inseguro por design. Use postgres_fdw com user mapping.

⚠️ **passwordcheck sem política customizada:**
O módulo básico só valida comprimento mínimo. Para requisitos mais rigorosos (complexidade, dicionário), é necessário modificar o código fonte ou integrar CrackLib.

⚠️ **amcheck sem execução periódica:**
Não adianta ter amcheck instalado se não é executado regularmente. Agende via cron/pg_cron:
```sql
-- Exemplo de verificação semanal
SELECT bt_index_check(oid) FROM pg_class WHERE relkind = 'i' AND relam = (SELECT oid FROM pg_am WHERE amname = 'btree');
```

⚠️ **User mapping do postgres_fdw expõe credenciais:**
`pg_user_mappings` mostra senhas para o owner do mapping ou superuser. Use `use_scram_passthrough` (PG 16+) para evitar armazenar senhas em texto plano.

⚠️ **pgcrypto: gerenciamento de chave é manual:**
pgcrypto não oferece KMS, cofre de chaves ou rotação automática. Toda gestão de chaves é responsabilidade da aplicação.

⚠️ **cache de estatísticas do postgres_fDW sem ANALYZE:**
Sem `ANALYZE` na foreign table, o planejador local usa estimativas padrão (1000 linhas). Execute `ANALYZE` periodicamente ou ative `use_remote_estimate`.

```sql
ANALYZE minha_foreign_table;
-- Para sampling remoto (default = auto)
ALTER FOREIGN TABLE minha_foreign_table OPTIONS (ADD analyze_sampling 'bernoulli');
```
