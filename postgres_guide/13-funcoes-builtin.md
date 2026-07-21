# Funções e Operadores Built-in no PostgreSQL 18.4

Guia de referência compacta das funções e operadores nativos do PostgreSQL. Organizado por categoria para consulta rápida.

## 1. Funções de String

### Concatenação e Junção

| Função/Operador | Descrição | Exemplo |
|---|---|---|
| `text || text` | Concatena strings | `'Post' || 'greSQL'` → `PostgreSQL` |
| `text || anynonarray` | Concatena com não-string | `'Valor: ' || 42` → `Valor: 42` |
| `concat(val1, val2, ...)` | Concatena, ignora NULLs | `concat('a', NULL, 'b')` → `ab` |
| `concat_ws(sep, val1, ...)` | Concatena com separador, ignora NULLs | `concat_ws(',', 'a', NULL, 'b')` → `a,b` |

### Formatação estilo sprintf

```
format(formatstr, ...)
```
- `%s` — argumento como string
- `%I` — argumento como identificador SQL seguro (escapa aspas)
- `%L` — argumento como literal SQL seguro (escapa aspas simples)
- `%1$s` — referência posicional

```sql
format('Hello %s, %1$s', 'World')                  → 'Hello World, World'
format('INSERT INTO %I VALUES (%L)', 'minha tabela', E'O''Reilly')
-- → 'INSERT INTO "minha tabela" VALUES ('O''Reilly')'
```

### Extração e Substring

```sql
substring('Thomas' from 2 for 3)   → 'hom'
substr('Thomas', 2, 3)             → 'hom'
left('abcde', 2)                   → 'ab'
right('abcde', -2)                 → 'abc'
```

### Split e Junção

```sql
split_part('a|b|c', '|', 2)                       → 'b'
string_to_array('a,b,c', ',')                      → {a,b,c}
array_to_string(ARRAY[1,2,3], '-')                 → '1-2-3'
```

### Substituição e Regex

```sql
replace('abcdef', 'cd', 'XX')                      → 'abXXef'
regexp_replace('Thomas', '.[mN]a.', 'M')           → 'ThM'
regexp_match('foobarbequebaz', '(bar)(beque)')     → {bar,beque}
regexp_matches('foobarbequebaz', '(bar)(beque)', 'g') → múltiplas linhas
regexp_split_to_table('a,b,c', ',')                → linhas a, b, c
```

### Comprimento

```sql
length('josé')            → 4
char_length('josé')       → 4
octet_length('josé')      → 5 (UTF8)
bit_length('jose')        → 32
```

### Posição

```sql
position('om' in 'Thomas')   → 3
strpos('Thomas', 'om')       → 3
starts_with('alphabet', 'alph') → t
```

### Aparação (Trim)

```sql
trim(both 'xyz' from 'yxTomxx')   → 'Tom'
ltrim('zzzytest', 'xyz')          → 'test'
rtrim('testxxzx', 'xyz')          → 'test'
btrim('xyxtrimyyx', 'xyz')        → 'trim'
```

### Case

```sql
upper('tom')        → 'TOM'
lower('TOM')        → 'tom'
initcap('hi THOMAS') → 'Hi Thomas'
```

### Padding

```sql
lpad('hi', 5, 'xy')   → 'xyxhi'
rpad('hi', 5, 'xy')   → 'hixyx'
```

### Repetição e Reversão

```sql
repeat('Pg', 3)    → 'PgPgPg'
reverse('abc')     → 'cba'
```

### ASCII / Chr

```sql
ascii('x')    → 120
chr(65)       → 'A'
```

### Citação Segura (SQL Injection)

```sql
quote_ident('Foo bar')              → '"Foo bar"'
quote_literal(E'O''Reilly')         → '''O''Reilly'''
quote_nullable(NULL)                → NULL
```
Use `quote_ident` para identificadores e `quote_literal`/`quote_nullable` para valores em SQL dinâmico.

---

## 2. Pattern Matching

### LIKE / ILIKE

```sql
'abc' LIKE 'a%'         → true
'abc' ILIKE 'A%'        → true  (case-insensitive)
'abc' NOT LIKE 'a%'     → false
```
- `_` — qualquer caractere único
- `%` — qualquer sequência (0+ caracteres)
- `ESCAPE '\'` — escape (default)

### SIMILAR TO (SQL standard regex)

```sql
'abc' SIMILAR TO '%(b|d)%'   → true
```
Metacaracteres: `|` (alternação), `*` (0+), `+` (1+), `?` (0-1), `{m,n}`, `[...]`

### POSIX Regex

| Operador | Descrição |
|---|---|
| `string ~ pattern` | Match case-sensitive |
| `string ~* pattern` | Match case-insensitive |
| `string !~ pattern` | NOT match |
| `string !~* pattern` | NOT match case-insensitive |

```sql
'thomas' ~ 't.*ma'       → true
'thomas' ~* 'T.*ma'      → true
```

### Funções Regex

```sql
regexp_like('Hello World', 'world', 'i')   → true
regexp_match('abc', '(a)(b)')               → {a,b}
regexp_replace('Thomas', '.[mN]a.', 'M')   → 'ThM'
regexp_split_to_array('a,b,c', ',')         → {a,b,c}
regexp_split_to_table('a,b,c', ',')         → linhas
```

---

## 3. Funções Matemáticas

### Operadores

| Op | Descrição | Exemplo |
|---|---|---|
| `+`, `-`, `*`, `/` | Aritmética básica | `5/2` → `2` (int), `5.0/2` → `2.5` |
| `%` | Módulo | `5 % 4` → `1` |
| `^` | Exponenciação | `2 ^ 3` → `8` |
| `|/` | Raiz quadrada | `|/ 25.0` → `5` |
| `||/` | Raiz cúbica | `||/ 64.0` → `4` |
| `@` | Valor absoluto | `@ -5.0` → `5.0` |
| `!` | Fatorial (prefixo) | `! 5` → `120` |
| `!!` | Fatorial (sufixo) | `5 !!` → `120` |

### Funções de Arredondamento

```sql
ceil(42.2)        → 43
floor(42.8)       → 42
round(42.4382, 2) → 42.44
trunc(42.4382, 2) → 42.43
abs(-17.4)        → 17.4
sign(-8.4)        → -1
```

### Log / Expoente

```sql
sqrt(2)            → 1.41421
cbrt(64.0)         → 4
exp(1.0)           → 2.71828
ln(2.0)            → 0.69314
log(100)           → 2  (base 10)
log(2.0, 64.0)     → 6  (base arbitrária)
power(9, 3)        → 729
```

### MDC / MMC / Módulo

```sql
gcd(1071, 462)     → 21
lcm(1071, 462)     → 23562
mod(9, 4)          → 1
```

### Aleatoriedade

```sql
random()           → 0.0 a 1.0
setseed(0.5)       → void  (semente para random() ser determinístico)
```

### Histograma (Bucketing)

```sql
width_bucket(5.35, 0.024, 10.06, 5)   → 3
width_bucket(now(), array['yesterday', 'today', 'tomorrow']::timestamptz[]) → 2
```

### Conversão Angular

```sql
degrees(0.5)     → 28.6479
radians(45.0)    → 0.7854
pi()             → 3.14159
```

---

## 4. Funções de Data/Tempo

### Coleta do Momento Atual

| Função | Tipo | Descrição |
|---|---|---|
| `now()` | `timestamptz` | Início da transação atual |
| `current_timestamp` | `timestamptz` | Início da transação |
| `current_date` | `date` | Data atual |
| `current_time` | `timetz` | Horário atual |
| `localtime` | `time` | Horário atual (sem TZ) |
| `localtimestamp` | `timestamp` | Timestamp atual (sem TZ) |
| `clock_timestamp()` | `timestamptz` | Tempo real (muda durante execução) |
| `statement_timestamp()` | `timestamptz` | Início do statement atual |
| `transaction_timestamp()` | `timestamptz` | Início da transação (= `now()`) |
| `timeofday()` | `text` | String textual do momento |

### Extração de Campos

```sql
EXTRACT(year FROM timestamp '2001-02-16 20:38:40')    → 2001
EXTRACT(dow FROM timestamp '2001-02-16 20:38:40')     → 5  (Friday)
EXTRACT(epoch FROM timestamp '2001-02-16 20:38:40')   → 982352320
date_part('hour', timestamp '2001-02-16 20:38:40')    → 20
```

### date_trunc — Truncamento

```sql
date_trunc('hour', timestamp '2001-02-16 20:38:40')   → 2001-02-16 20:00:00
date_trunc('day', timestamptz '2001-02-16 20:38:40+00', 'Australia/Sydney')
```

### date_bin — Bucket Uniforme (PG14+)

```sql
date_bin('15 minutes', timestamp '2001-02-16 20:38:40', timestamp '2001-02-16 20:05:00')
-- → 2001-02-16 20:35:00
```
Útil para agregação em buckets de tempo fixos.

### AT TIME ZONE / AT LOCAL

```sql
timestamp '2001-09-28 01:00' AT TIME ZONE 'America/New_York'
-- → 2001-09-28 02:00:00-04

timestamp '2001-09-28 01:00' AT LOCAL
-- converte para o timezone da sessão
```

### Aritmética com Datas

```sql
date '2001-09-28' + 7                        → 2001-10-05
date '2001-09-28' + interval '1 hour'        → 2001-09-28 01:00:00
timestamp '2001-09-28 01:00' + interval '23 hours' → 2001-09-29 00:00:00
date '2001-10-01' - date '2001-09-28'        → 3
age(timestamp '2001-04-10', timestamp '1957-06-13') → 43 years 9 mons 27 days
age(timestamp '1957-06-13')                  → idade até hoje
```

Comparação com `OVERLAPS`:
```sql
(date '2001-01-01', date '2001-03-01') OVERLAPS (date '2001-02-01', date '2001-04-01')
-- → true
```

### Funções make_

```sql
make_date(2013, 7, 15)                                    → 2013-07-15
make_time(8, 15, 23.5)                                    → 08:15:23.5
make_timestamp(2013, 7, 15, 8, 15, 23.5)                  → 2013-07-15 08:15:23.5
make_timestamptz(2013, 7, 15, 8, 15, 23.5, 'America/New_York')
make_interval(days => 10)                                  → 10 days
```

### Ajuste de Intervalos

```sql
justify_days(interval '1 year 65 days')      → 1 year 2 mons 5 days
justify_hours(interval '50 hours 10 minutes') → 2 days 02:10:00
justify_interval(interval '1 mon -1 hour')    → 29 days 23:00:00
```

### Testes de Finitude

```sql
isfinite(date '2001-02-16')         → true
isfinite(timestamp 'infinity')      → false
isinf(timestamp 'infinity')         → true  (PG 18+)
```

### Delay / Sleep

```sql
pg_sleep(1.5)               → sleep de 1.5s
pg_sleep_for('5 minutes')   → sleep por intervalo
pg_sleep_until('2025-01-01 00:00:00')
```

---

## 5. Funções de Agregação

### Clássicas

```sql
count(*)              → número de linhas
count(col)            → linhas com col NOT NULL
sum(col)              → soma
avg(col)              → média
min(col)              → mínimo
max(col)              → máximo
```

### Array / JSON

```sql
array_agg(col ORDER BY col)                          → array
string_agg(col, ',' ORDER BY col)                    → string separada
json_agg(col)                                        → JSON array
jsonb_agg(col)                                       → JSONB array
json_agg_strict(col)                                 → JSON array (skipa NULLs)
json_object_agg(key, value)                          → JSON object
json_object_agg_strict(key, value)                   → JSON object (skipa NULLs)
```

### Estatística

```sql
stddev(col)          → desvio padrão amostral
variance(col)        → variância amostral
corr(Y, X)           → coeficiente de correlação
covar_samp(Y, X)     → covariância amostral
covar_pop(Y, X)      → covariância populacional
regr_slope(Y, X)     → inclinação da regressão linear
regr_intercept(Y, X) → intercepto
regr_r2(Y, X)        → R²
```

### Booleana

```sql
bool_and(col)        → true se TODOS os valores são true
bool_or(col)         → true se QUALQUER valor é true
every(col)           → sinônimo de bool_and
```

### Bitwise

```sql
bit_and(col)         → AND bit-a-bit
bit_or(col)          → OR bit-a-bit
bit_xor(col)         → XOR bit-a-bit
```

### Ordered-Set (WITHIN GROUP)

```sql
percentile_cont(0.5) WITHIN GROUP (ORDER BY col)    → mediana (contínua)
percentile_disc(0.5) WITHIN GROUP (ORDER BY col)    → mediana (discreta)
mode() WITHIN GROUP (ORDER BY col)                  → moda
```

### Hypothetical-Set

```sql
rank('valor') WITHIN GROUP (ORDER BY col)           → rank hipotético
dense_rank('valor') WITHIN GROUP (ORDER BY col)
percent_rank('valor') WITHIN GROUP (ORDER BY col)
cume_dist('valor') WITHIN GROUP (ORDER BY col)
```

### GROUPING

```sql
SELECT col1, col2, GROUPING(col1, col2), sum(valor)
FROM t GROUP BY ROLLUP(col1, col2);
```
Retorna 1 para colunas agregadas no super-agregado.

### FILTER clause

```sql
count(*) FILTER (WHERE status = 'ativo') AS ativos,
count(*) FILTER (WHERE status = 'inativo') AS inativos
FROM usuarios;
```

---

## 6. Funções de Janela (Window)

### Ranking

```sql
row_number() OVER (ORDER BY col)          → número sequencial (1,2,3,...)
rank() OVER (ORDER BY col)                → rank com gaps (1,1,3,...)
dense_rank() OVER (ORDER BY col)          → rank sem gaps (1,1,2,...)
percent_rank() OVER (ORDER BY col)        → percentual (0 a 1)
cume_dist() OVER (ORDER BY col)           → distribuição acumulativa
ntile(4) OVER (ORDER BY col)              → quartil (1 a 4)
```

### Deslocamento

```sql
lag(col, 1, 'default') OVER (ORDER BY col)   → linha anterior
lead(col, 1, 'default') OVER (ORDER BY col)  → próxima linha
```

### Borda do Frame

```sql
first_value(col) OVER (ORDER BY col)         → primeiro valor do frame
last_value(col) OVER (ORDER BY col)          → último valor do frame
nth_value(col, 3) OVER (ORDER BY col)        → n-ésimo valor do frame
```

### Framing

```sql
sum(col) OVER (ORDER BY col ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
sum(col) OVER (ORDER BY col RANGE BETWEEN INTERVAL '1 day' PRECEDING AND CURRENT ROW)
sum(col) OVER (ORDER BY col GROUPS BETWEEN 1 PRECEDING AND 1 FOLLOWING)  -- PG11+
```

---

## 7. Funções JSON

### Criação de JSON

```sql
to_json('Fred said "Hi."'::text)                                  → "Fred said \"Hi.\""
to_jsonb(row(42, 'texto'))                                        → {"f1": 42, "f2": "texto"}
json_build_array(1, 2, 'foo', true)                               → [1, 2, "foo", true]
json_build_object('foo', 1, 'bar', 2)                             → {"foo" : 1, "bar" : 2}
json_object('{a, 1, b, "def"}')                                   → {"a" : "1", "b" : "def"}
row_to_json(row(1,'foo'))                                          → {"f1":1,"f2":"foo"}
```

### SQL/JSON (PG15+)

```sql
JSON_OBJECT('code' VALUE 'P123', 'title': 'Jaws')                 → {"code" : "P123", "title" : "Jaws"}
JSON_ARRAY(1, true, JSON '{"a":null}')                            → [1, true, {"a":null}]
JSON_SCALAR(123.45)                                                → 123.45
JSON_SERIALIZE('{ "a" : 1 }' RETURNING bytea)
```

### Extração — Operadores

| Operador | Descrição | Exemplo |
|---|---|---|
| `-> 'key'` | Extrai campo como JSON | `'{"a":1}'::json -> 'a'` → `1` |
| `->> 'key'` | Extrai campo como text | `'{"a":1}'::json ->> 'a'` → `1` |
| `#> '{a,b}'` | Caminho como JSON | `'{"a":{"b":1}}' #> '{a,b}'` → `1` |
| `#>> '{a,b}'` | Caminho como text | |
| `@>` | Contém (jsonb) | `'{"a":1}' @> '{"a":1}'` |
| `<@` | Contido por (jsonb) | |
| `? 'key'` | Existe key? (jsonb) | |
| `?| ARRAY['a','b']` | Alguma key existe? | |
| `?& ARRAY['a','b']` | Todas keys existem? | |
| `||` | Concatenação jsonb | |
| `- 'key'` | Remove key | |
| `#- '{a,b}'` | Remove por caminho | |

### Funções de Extração

```sql
json_each('{"a":1, "b":2}')             → pares chave/valor como linhas
json_object_keys('{"a":1, "b":2}')      → conjunto de keys
json_populate_record(null::tipo, '{"a":1}')  → registro tipado
json_to_record('{"a":1, "b":"x"}')      → registro anônimo
```

### SQL/JSON Path Language

```sql
jsonb_path_exists(data, '$.a[*] ? (@ > 2)')          → boolean
jsonb_path_query(data, '$.items[*].price')            → itens correspondentes
jsonb_path_match(data, '$.price > 10')                → boolean (predicate check)
```
- `strict` x `lax` mode: `lax` (default) ignora erros de tipo/caminho
- `.key` — acesso a campo
- `[*]` — todos elementos do array
- `**` — busca recursiva
- `? (@.price > 10)` — filtro

### SQL/JSON Query Functions (PG15+)

```sql
JSON_QUERY(data, '$.items[*].name' WITH WRAPPER)       → JSON
JSON_VALUE(data, '$.name')                              → scalar (text)
JSON_EXISTS(data, '$.items ? (@.price > 10)')           → boolean
```

### JSON_TABLE (PG15+)

```sql
SELECT jt.*
FROM dados,
JSON_TABLE (data, '$.items[*]' COLUMNS (
    id INT PATH '$.id',
    nome text PATH '$.nome'
)) jt;
```
Mais poderoso que `jsonb_to_record` — com PATH expressions e tipagem.

---

## 8. Funções de Array

### Operadores

| Operador | Descrição | Exemplo |
|---|---|---|
| `=` | Igualdade | `ARRAY[1,2] = ARRAY[1,2]` |
| `@>` | Contém | `ARRAY[1,4,3] @> ARRAY[3,1]` |
| `<@` | Contido por | `ARRAY[2,7] <@ ARRAY[1,7,4,2]` |
| `&&` | Overlap (interseção) | `ARRAY[1,4,3] && ARRAY[2,1]` |
| `||` | Concatenação | `ARRAY[1,2] || ARRAY[3,4]` |

### Funções de Manipulação

```sql
array_append(ARRAY[1,2], 3)              → {1,2,3}
array_prepend(1, ARRAY[2,3])             → {1,2,3}
array_cat(ARRAY[1,2], ARRAY[3,4])        → {1,2,3,4}
array_remove(ARRAY[1,2,3,2], 2)          → {1,3}
array_replace(ARRAY[1,2,5,4], 5, 3)      → {1,2,3,4}
```

### Dimensões e Limites

```sql
array_length(ARRAY[1,2,3], 1)            → 3
array_dims(ARRAY[[1,2],[3,4]])           → [1:2][1:3]
array_ndims(ARRAY[[1,2],[3,4]])          → 2
array_lower('[0:2]={1,2,3}'::int[], 1)   → 0
array_upper(ARRAY[1,8,3,7], 1)           → 4
cardinality(ARRAY[[1,2],[3,4]])          → 4
trim_array(ARRAY[1,2,3,4,5,6], 2)        → {1,2,3,4}
```

### Busca

```sql
array_position(ARRAY['sun','mon','tue'], 'mon')    → 2
array_positions(ARRAY['A','A','B','A'], 'A')       → {1,2,4}
```

### Expandir Array

```sql
unnest(ARRAY[1,2])                       → linhas 1, 2
SELECT * FROM unnest(ARRAY[1,2], ARRAY['foo','bar','baz']) AS x(a,b)
```

---

## 9. Expressões Condicionais

### CASE

```sql
-- Simple
CASE status WHEN 'A' THEN 'Ativo' WHEN 'I' THEN 'Inativo' ELSE 'Desconhecido' END

-- Searched
CASE WHEN idade < 18 THEN 'Menor' WHEN idade < 65 THEN 'Adulto' ELSE 'Idoso' END
```

### COALESCE / NULLIF / GREATEST / LEAST

```sql
COALESCE(NULL, 'default')              → 'default'
NULLIF('a', 'a')                       → NULL  (retorna NULL se igual)
GREATEST(1, 5, 3)                      → 5
LEAST(1, 5, 3)                         → 1
```

---

## 10. Set-Returning Functions (SRF)

### generate_series

```sql
generate_series(2, 4)                          → 2, 3, 4
generate_series(5, 1, -2)                      → 5, 3, 1
generate_series(1.1, 4, 1.3)                   → 1.1, 2.4, 3.7
generate_series('2025-01-01', '2025-01-05', '1 day'::interval)
```

### generate_subscripts

```sql
generate_subscripts(ARRAY[10,20,30], 1)        → 1, 2, 3
```

### LATERAL com SRF

```sql
SELECT t.id, x.val
FROM tabela t,
LATERAL generate_series(1, t.qtd) AS x(val);
```

### WITH ORDINALITY

```sql
SELECT * FROM unnest(ARRAY['a','b','c']) WITH ORDINALITY;
-- retorna: a, 1 | b, 2 | c, 3
```

---

## 11. Funções de Formatação

### to_char

```sql
to_char(timestamp '2002-04-20 17:31:12.66', 'HH12:MI:SS')     → '05:31:12'
to_char(timestamp '2002-04-20', 'YYYY-MM-DD')                  → '2002-04-20'
to_char(125, '999')                                              → ' 125'
to_char(125.8::real, '999D9')                                   → '125.8'
to_char(-125.8, '999D99S')                                      → '125.80-'
```

### to_date / to_timestamp / to_number

```sql
to_date('05 Dec 2000', 'DD Mon YYYY')          → 2000-12-05
to_timestamp('05 Dec 2000', 'DD Mon YYYY')     → 2000-12-05 00:00:00-05
to_number('12,454.8-', '99G999D9S')            → -12454.8
```

### Templates Principais

| Pattern | Descrição |
|---|---|
| `YYYY` | Ano (4 dígitos) |
| `MM` | Mês (01-12) |
| `DD` | Dia (01-31) |
| `HH24` | Hora (00-23) |
| `HH12` | Hora (01-12) |
| `MI` | Minuto (00-59) |
| `SS` | Segundo (00-59) |
| `MS` | Milissegundo (000-999) |
| `US` | Microssegundo (000000-999999) |
| `Mon` | Mês abreviado (Jan, Feb...) |
| `Month` | Mês completo (January...) |
| `TZ` | Abreviação de fuso horário |
| `FM` | Fill mode (remove padding) |

---

## 12. Funções de Informação do Sistema

### Sessão

```sql
current_database()          → nome do banco atual
current_schema()            → schema atual
current_user()              → usuário atual
session_user                → usuário da sessão
user                        → sinônimo de current_user
current_query()             → query em execução
inet_client_addr()          → IP do cliente
inet_client_port()          → porta do cliente
pg_backend_pid()            → PID do backend atual
pg_postmaster_start_time()  → quando o servidor iniciou
```

### Privilégio

```sql
has_table_privilege('tabela', 'SELECT')                        → boolean
has_column_privilege('tabela', 'coluna', 'UPDATE')             → boolean
has_schema_privilege('schema', 'CREATE')                       → boolean
row_security_active('tabela')                                  → RLS ativo?
pg_has_role('usuario', 'USAGE')                                → tem role?
```

### Catálogo (pg_get_*)

```sql
pg_get_viewdef('minha_view')               → definição SQL da view
pg_get_functiondef('minha_func'::regproc)  → definição da função
pg_get_indexdef('idx'::regclass)           → definição do índice
pg_get_constraintdef('fk'::regclass)       → definição da constraint
pg_get_triggerdef('trg'::regclass)         → definição da trigger
pg_get_serial_sequence('tabela', 'coluna') → sequência associada
pg_get_expr(prosrc, 0)                     → expressão compilada
```

### Comentários

```sql
obj_description('tabela'::regclass)        → comentário da tabela
col_description('tabela'::regclass, 1)     → comentário da coluna
shobj_description(oid, 'pg_database')      → comentário de objeto compartilhado
```

### Tipo

```sql
pg_typeof(42)                              → integer
pg_typeof('texto')                         → unknown (ou text)
```

### Validade de Input (PG 18)

```sql
pg_input_is_valid('123', 'integer')        → true
pg_input_error_message('abc', 'integer')   → 'invalid input syntax for type integer: "abc"'
```

### Tamanhos

```sql
pg_size_pretty(12345678)                         → '12 MB'
pg_database_size('meubanco')                     → bytes
pg_total_relation_size('tabela')                 → tabela + índices + toast
pg_table_size('tabela')                          → tabela (sem índices)
pg_indexes_size('tabela')                        → apenas índices
pg_relation_size('tabela')                       → relação principal
```

---

## 13. Funções de Administração

### Configuração

```sql
current_setting('datestyle')               → 'ISO, MDY'
set_config('log_statement_stats', 'off', false)  → altera e retorna
```

### Signaling

```sql
pg_reload_conf()                           → reload de config
pg_cancel_backend(pid)                     → cancela query
pg_terminate_backend(pid, timeout_ms)      → termina sessão
```

### Backup

```sql
pg_backup_start('meu_backup')              → LSN inicial
pg_backup_stop()                           → LSN final + label file
pg_create_restore_point('antes_deploy')    → restore point
pg_switch_wal()                            → força switch WAL
pg_wal_lsn_diff(lsn1, lsn2)               → diferença em bytes
```

### Recovery / Réplica

```sql
pg_is_in_recovery()                        → está em recovery?
pg_last_wal_receive_lsn()                  → último LSN recebido
pg_last_wal_replay_lsn()                   → último LSN reproduzido
pg_promote()                               → promove standby a primary
```

### Replication Slots

```sql
pg_create_physical_replication_slot('slot_name')
pg_create_logical_replication_slot('slot_name', 'pgoutput')
pg_drop_replication_slot('slot_name')
```

### Manutenção de Índices

```sql
brin_summarize_new_values('idx_brin')      → sumariza páginas novas
gin_clean_pending_list('idx_gin')          → limpa pending list
```

### Advisory Locks

```sql
pg_advisory_lock(42)                       → lock exclusivo (bloqueante)
pg_try_advisory_lock(42)                   → lock exclusivo (não bloqueante)
pg_advisory_unlock(42)                     → unlock
pg_advisory_lock_shared(42)                → lock compartilhado
```

### Acesso a Arquivos (Superuser)

```sql
pg_read_file('postgresql.conf')            → conteúdo como text
pg_read_binary_file('arquivo.bin')         → conteúdo como bytea
pg_ls_dir('pg_wal')                        → lista diretório
```

---

## 14. Funções UUID

### Recomendado (built-in, PG13+)

```sql
gen_random_uuid()                          → '123e4567-e89b-12d3-a456-426614174000'
```
✅ Padrão moderno — não requer extensão.

### Obsoleto (requer uuid-ossp)

```sql
-- 🛑 Evitar: uuid_generate_v1(), uuid_generate_v4()
```

---

## 15. Funções de String Binária (bytea)

### Codificação/Decodificação

```sql
encode('texto'::bytea, 'hex')              → '746578746f'
decode('746578746f', 'hex')                → \x746578746f
encode('texto'::bytea, 'base64')            → 'dGV4dG8='
```

### Hash / Checksum

```sql
sha224('abc'::bytea)      → bytea (28 bytes)
sha256('abc'::bytea)      → bytea (32 bytes)
sha384('abc'::bytea)      → bytea (48 bytes)
sha512('abc'::bytea)      → bytea (64 bytes)
md5('abc'::bytea)         → text (hex)
hmac('msg'::bytea, 'key'::bytea, 'sha256') → HMAC

crc32('abc'::bytea)       → 891568578  (CRC-32)
crc32c('abc'::bytea)      → 910901175  (CRC-32C)
```

### Comprimento e Bits

```sql
octet_length('\x123456'::bytea)   → 3
bit_length('\x123456'::bytea)     → 24
bit_count('\x123456'::bytea)      → 6  (popcount)
```

### Get / Set Bit

```sql
get_bit('\x1234567890'::bytea, 30)   → 1
set_bit('\x1234567890'::bytea, 30, 0) → \x1234563890
```

### Conversão de Encoding

```sql
convert('text_in_utf8', 'UTF8', 'LATIN1')      → bytea
convert_from('\x74657874', 'UTF8')              → 'text'
convert_to('texto', 'UTF8')                     → bytea
```

---

## 16. Armadilhas Comuns (Pitfalls)

| ⚠️ Problema | Explicação | Solução |
|---|---|---|
| `LIKE` vs `ILIKE` | `LIKE` é case-sensitive | Use `ILIKE` para case-insensitive |
| `gen_random_uuid()` vs extensão | `uuid-ossp` é desnecessário em PG13+ | Use `gen_random_uuid()` built-in |
| `jsonb` vs `json` | `json` preserva texto, `jsonb` tem indexação | Prefira `jsonb` |
| `date_bin()` vs `date_trunc()` | `date_trunc` alinha ao início, `date_bin` a qualquer origem | Entenda a diferença |
| `to_char()` localizado | Templates `Mon`, `Day` seguem `lc_time` | Teste com locale esperado |
| `pg_read_file()` superuser | Requer privilégios de superuser | Use `\copy` ou função com SECURITY DEFINER |
| `FILTER (WHERE ...)` | Muitos usam CASE dentro de agregado | Prefira `count(*) FILTER (WHERE ...)` |
| Divisão de inteiros | `5/2` = `2` (trunca) | Use `5.0/2` ou CAST |
| `sum()` de nenhuma linha | Retorna NULL, não 0 | Use `COALESCE(sum(col), 0)` |
| `array_agg()` sem `ORDER BY` | Ordem é indeterminada sem ORDER BY | Use `array_agg(col ORDER BY col)` |
