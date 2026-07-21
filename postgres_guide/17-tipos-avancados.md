# PostgreSQL 18.4 — Tipos Avançados e Conversão de Tipos

Este guia complementa `01-ddl-modelagem.md`, focando em tipos de dados PostgreSQL **não cobertos** ou apenas mencionados naquele guia. Inclui tipos binários, de rede, geométricos, enumerados, XML, bit string, range (aprofundado), composite, OID, pg_lsn, pseudo-types e o sistema de conversão de tipos (type conversion).

## Sumário

1. [bytea — Dados Binários](#1-bytea--dados-binários)
2. [Network Types — inet, cidr, macaddr, macaddr8](#2-network-types--inet-cidr-macaddr-macaddr8)
3. [Geometric Types — point, line, lseg, box, path, polygon, circle](#3-geometric-types)
4. [Enumerated Types (ENUM)](#4-enumerated-types-enum)
5. [XML Type](#5-xml-type)
6. [Bit String Types — bit(n), bit varying(n)](#6-bit-string-types)
7. [Range Types — Aprofundamento](#7-range-types)
8. [Composite Types (Row Types)](#8-composite-types-row-types)
9. [OID Types — oid, regproc, regclass, regtype, etc.](#9-oid-types)
10. [pg_lsn — Log Sequence Number](#10-pg_lsn--log-sequence-number)
11. [Pseudo-Types](#11-pseudo-types)
12. [Type Conversion — Regras de Conversão](#12-type-conversion)
13. [Domínios e Tipos Customizados](#13-domínios-e-tipos-customizados)
14. [Armadilhas Comuns](#14-armadilhas-comuns)

---

## 1. bytea — Dados Binários

O tipo `bytea` armazena strings binárias (sequências de octets/bytes). Diferente de strings de caracteres, `bytea` permite octets zero e bytes não-imprimíveis.

Tamanho máximo: 1 GB (via TOAST).

### Formato de Entrada

| Formato | Descrição | Exemplo |
|---------|-----------|---------|
| **hex** (default PG9+) | Prefixo `\\x` + 2 hex digits por byte | `'\\xDEADBEEF'::bytea` |
| **escape** (legado) | Octal com `\\` para bytes especiais | `'abc\\153\\154\\155'::bytea` |

```sql
SET bytea_output = 'hex';
SELECT '\\xDEADBEEF'::bytea;
```

✅ Prefira **hex**: mais rápido, compatível com ferramentas modernas, mais legível.

### Funções Essenciais

| Função | Descrição |
|--------|-----------|
| `encode(bytes bytea, formato text)` | Codifica para hex, base64, escape |
| `decode(string text, formato text)` | Decodifica de hex, base64, escape |
| `sha224(bytes)`, `sha256(bytes)`, `sha384(bytes)`, `sha512(bytes)` | Hash functions |
| `md5(bytes)` | MD5 hash |
| `hmac(data bytea, key bytea, text)` | HMAC com algoritmo especificado |
| `crc32(bytes)`, `crc32c(bytes)` | Checksum CRC (PG18) |
| `convert(data bytea, src_enc name, dest_enc name)` | Conversão entre encodings |
| `convert_from(data bytea, src_enc name)` | `bytea` → `text` |
| `convert_to(data text, dest_enc name)` | `text` → `bytea` |
| `get_bit(bytes, n)`, `set_bit(bytes, n, value)` | Manipulação de bits |
| `bit_count(bytes)` | Contagem de bits setados |
| `octet_length(bytes)`, `bit_length(bytes)` | Comprimento em bytes/bits |

```sql
SELECT encode('\\xDEADBEEF'::bytea, 'base64');
SELECT decode('3q2+7w==', 'base64');
SELECT sha256('senha'::bytea);
SELECT crc32('\\x01020304'::bytea);
```

⚠️ **Grande volume de bytea impacta performance de TOAST**. Para dados > 1 GB, considere **Large Objects** (LO API).

📝 Large Objects são acessados via `lo_creat()`, `lo_open()`, `lo_read()`, `lo_write()`, `lo_unlink()` — mas não têm suporte a TOAST.

---

## 2. Network Types — inet, cidr, macaddr, macaddr8

PostgreSQL oferece tipos específicos para endereços de rede, com validação de entrada, operadores especializados e funções.

### Tabela de Tipos

| Tipo | Tamanho | Descrição |
|------|---------|-----------|
| `inet` | 7 ou 19 bytes | Endereço IPv4/IPv6 com máscara opcional |
| `cidr` | 7 ou 19 bytes | Prefixo de rede IPv4/IPv6 (sem bits de host) |
| `macaddr` | 6 bytes | Endereço MAC (EUI-48) |
| `macaddr8` | 8 bytes | Endereço MAC (EUI-64) |

```sql
SELECT '192.168.1.0/24'::inet;
SELECT '::1/128'::inet;
SELECT '2001:4f8:3:ba::/64'::cidr;
SELECT '08:00:2b:01:02:03'::macaddr;
```

### inet vs cidr

✅ Prefira `inet` para armazenar endereços de host. Use `cidr` apenas para prefixos de rede onde bits à direita da máscara devem ser zero.

📝 `192.168.0.1/24` é válido para `inet`, mas **erro** para `cidr` (bits de host não-zero).

### Operadores de Rede

| Operador | Significado |
|----------|-------------|
| `<<` | Está contido em (rede) |
| `<<=` | Está contido ou é igual |
| `>>` | Contém |
| `>>=` | Contém ou é igual |
| `&&` | Sobreposto (compartilham endereços) |
| `=` | Igualdade |

### Funções de Rede

| Função | Descrição |
|--------|-----------|
| `abbrev(inet)` | Formato abreviado |
| `broadcast(inet)` | Endereço de broadcast |
| `host(inet)` | Endereço sem máscara |
| `hostmask(inet)` | Máscara de host |
| `masklen(inet)` | Comprimento da máscara |
| `netmask(inet)` | Máscara de rede |
| `network(inet)` | Parte da rede |
| `set_masklen(inet, int)` | Altera máscara |
| `family(inet)` | 4 para IPv4, 6 para IPv6 |
| `trunc(inet)` | Zera bits de host |
| `inet_same_family(inet, inet)` | Mesma família? |
| `inet_merge(inet, inet)` | Menor rede que contém ambos |
| `inet_client_addr()` | IP do cliente atual |
| `inet_server_addr()` | IP do servidor |

```sql
SELECT broadcast('192.168.1.0/24'::inet);
SELECT host('192.168.1.1/24'::inet);
SELECT network('192.168.1.1/24'::inet);
SELECT inet_merge('192.168.1.1/24', '192.168.2.1/24');
```

```sql
-- Índice GiST para operadores de rede
CREATE INDEX idx_ip_range ON tabela USING GIST (ip_col inet_ops);
```

### macaddr8 — EUI-64

```sql
SELECT macaddr8_set7bit('08:00:2b:01:02:03');
-- Resultado: 0a:00:2b:ff:fe:01:02:03
```

---

## 3. Geometric Types

Tipos geométricos representam objetos espaciais 2D. Coordenadas armazenadas como `double precision`.

### Tabela de Tipos

| Tipo | Tamanho | Descrição | Representação |
|------|---------|-----------|---------------|
| `point` | 16 bytes | Ponto 2D | `(x,y)` |
| `line` | 24 bytes | Linha infinita | `{A,B,C}` (Ax+By+C=0) |
| `lseg` | 32 bytes | Segmento de reta | `[(x1,y1),(x2,y2)]` |
| `box` | 32 bytes | Caixa retangular | `(x1,y1),(x2,y2)` |
| `path` | 16+16n bytes | Caminho aberto ou fechado | `[(x1,y1),...]` ou `((x1,y1),...)` |
| `polygon` | 40+16n bytes | Polígono (fechado) | `((x1,y1),...)` |
| `circle` | 24 bytes | Círculo | `<(x,y),r>` |

```sql
SELECT point(10, 20);
SELECT line(1.0, -1.0, 0.0);       -- {1,-1,0}
SELECT lseg(point(0,0), point(1,1));
SELECT box(point(0,0), point(1,1));
SELECT path '[(0,0),(1,0),(1,1),(0,1)]';   -- aberto
SELECT polygon '((0,0),(1,0),(1,1),(0,1))'; -- fechado
SELECT circle(point(0,0), 5.0);
```

### Operadores Geométricos

| Operador | Significado |
|----------|-------------|
| `+`, `-`, `*`, `/` | Translação/escala |
| `#` | Interseção ou número de pontos |
| `@>` | Contém |
| `<@` | Contido em |
| `&&` | Sobreposto |
| `\|\|` | Paralelo |
| `?-` | Horizontal |
| `?\|` | Vertical |
| `~=`, `~` | Mesmo que |

### Funções Geométricas

| Função | Descrição |
|--------|-----------|
| `area(object)` | Área |
| `center(object)` | Centro |
| `diameter(circle)` | Diâmetro |
| `height(box)`, `width(box)` | Altura/largura |
| `isclosed(path)`, `isopen(path)` | Testa caminho |
| `length(object)` | Comprimento |
| `npoints(path)` | Número de pontos |
| `pclose(path)`, `popen(path)` | Fecha/abre caminho |
| `radius(circle)` | Raio |
| `slope(point, point)` | Inclinação |
| `distance(obj1, obj2)` | Distância |
| `bound_box(obj1, obj2)` | Bounding box |

```sql
SELECT area(circle(point(0,0), 5));
SELECT center(box(point(0,0), point(10,10)));
SELECT distance(point(0,0), point(3,4));
```

📝 Índice GiST para geometric types:

```sql
CREATE INDEX idx_geo ON tabela USING GIST (col_geo);
```

📝 **GIS avançado: use PostGIS**. Os tipos geométricos nativos são limitados a operações 2D básicas. Para geolocalização, coordenadas geográficas, projeções, use a extensão PostGIS.

---

## 4. Enumerated Types (ENUM)

Enumerados são tipos com conjunto estático e ordenado de valores.

### Declaração

```sql
CREATE TYPE status_pedido AS ENUM ('novo', 'processando', 'enviado', 'entregue', 'cancelado');
CREATE TABLE pedido (
    id serial PRIMARY KEY,
    status status_pedido DEFAULT 'novo',
    ...
);
```

### Ordenação

A ordenação segue a **ordem de criação**, não alfabética:

```sql
SELECT enum_range(null::status_pedido);
-- {novo,processando,enviado,entregue,cancelado}
```

### Type Safety

Cada ENUM é um tipo separado e incompatível com outros ENUMs:

```sql
CREATE TYPE cores AS ENUM ('vermelho', 'azul');
SELECT 'novo'::status_pedido = 'vermelho'::cores;
-- ERROR: operator does not exist: status_pedido = cores
```

Para comparar, faça CAST explícito para `text`:

```sql
SELECT 'novo'::status_pedido::text = 'vermelho'::cores::text;
```

### Modificação

⚠️ **Não é possível remover valores** de um ENUM sem recriar o tipo. Adicionar valores:

```sql
ALTER TYPE status_pedido ADD VALUE 'devolvido' AFTER 'enviado';
-- ou BEFORE / AFTER para posicionar
```

### Funções de Suporte (ENUM)

| Função | Descrição | Exemplo |
|--------|-----------|---------|
| `enum_first(anyenum)` | Primeiro valor | `enum_first(null::status_pedido)` → `novo` |
| `enum_last(anyenum)` | Último valor | `enum_last(null::status_pedido)` → `cancelado` |
| `enum_range(anyenum)` | Todos os valores | `enum_range(null::status_pedido)` |
| `enum_range(a, b)` | Range entre dois valores | `enum_range('novo','enviado')` |

### ENUM vs Lookup Table

| Critério | ENUM | Lookup Table (FK) |
|----------|------|-------------------|
| Velocidade | Mais rápido (sem JOIN) | Requer JOIN |
| Flexibilidade | Fixo (ALTER TYPE para mudar) | CRUD completo |
| Armazenamento | 4 bytes | Depende da PK |
| Validação | Nativa pelo tipo | CHECK ou FK |

✅ Use ENUM para **valores verdadeiramente fixos** (estados de workflow pequenos, categorias imutáveis). Use lookup table para catálogos que mudam com frequência.

---

## 5. XML Type

O tipo `xml` armazena dados XML e valida well-formedness na entrada. Requer `configure --with-libxml`.

### Criação

```sql
SELECT XMLPARSE(DOCUMENT '<?xml version="1.0"?><book><title>Manual</title></book>');
SELECT XMLPARSE(CONTENT 'abc<foo>bar</foo>');
SELECT '<foo>bar</foo>'::xml;
```

### Funções XML

| Função | Descrição |
|--------|-----------|
| `xmlparse({DOCUMENT|CONTENT} value)` | Parse de string para XML |
| `xmlserialize({DOCUMENT|CONTENT} value AS type)` | XML para string |
| `xmlcomment(text)` | Comentário XML |
| `xmlconcat(xml, ...)` | Concatena fragments |
| `xmlelement(name, ...)` | Cria elemento |
| `xmlforest(content, ...)` | Floresta de elementos |
| `xmlagg(xml)` | Agregação |
| `xmlpi(name, text)` | Processing instruction |
| `xmlroot(xml, version, standalone)` | Altera root |
| `xmliswellformed(text)` | Testa well-formedness |
| `xpath(xpath, xml)` | Consulta XPath |
| `xpath_exists(xpath, xml)` | XPath boolean |
| `table_to_xml(...)`, `query_to_xml(...)` | Exporta tabelas para XML |

```sql
SELECT xpath('//title/text()', '<book><title>PG Guide</title></book>'::xml);
```

⚠️ **Comparações em xml não existem**. Não há operadores `=`, `<`, `>` para `xml`. Para indexar, use expressional index em `xpath()` ou cast para `text`.

✅ Use **jsonb** para dados semiestruturados modernos. XML é mais verboso, menos performático e mais complexo. Prefira XML apenas para integração com sistemas legados ou conformidade com padrões (XML Schema, XSLT).

### Índice para XML

```sql
CREATE INDEX idx_xml ON tabela USING GIN ((xpath('//campo/text()', col_xml)));
```

---

## 6. Bit String Types

Armazenam strings de bits (1's e 0's). Úteis para flags binárias, máscaras, protocolos de rede.

| Tipo | Descrição |
|------|-----------|
| `BIT(n)` | Comprimento fixo `n` |
| `BIT VARYING(n)` | Comprimento variável até `n` |

```sql
CREATE TABLE flags (
    permissoes BIT(8),
    mascara BIT VARYING(16)
);

INSERT INTO flags VALUES (B'10101010', B'1111000011110000');
```

### Operadores Bit-a-Bit

| Operador | Significado |
|----------|-------------|
| `&` | AND |
| `\|` | OR |
| `#` | XOR |
| `~` | NOT |
| `<<` | Shift left |
| `>>` | Shift right |

### Funções

| Função | Descrição |
|--------|-----------|
| `bit_length()` | Comprimento em bits |
| `bit_count()` | Número de bits '1' |
| `get_bit(bits, n)` | Valor do bit n |
| `set_bit(bits, n, value)` | Seta bit n |
| `overlay(bits, replacement, start, count)` | Substitui substring |
| `substring(bits, start, count)` | Extrai substring |
| `position(substring in bits)` | Posição |

### Conversão

```sql
SELECT CAST(42 AS bit(8));      -- '00101010'
SELECT CAST(B'101010' AS integer); -- 42
SELECT 42::bit(8);
```

✅ Uso comum: flags binárias, máscaras de sub-rede, protocolos de rede.

---

## 7. Range Types

Complementa a introdução de `01-ddl-modelagem.md`. Ranges representam intervalos de valores com limites inclusivos/exclusivos.

### Tipos Built-in e Multiranges

| Tipo Range | Tipo Multirange | Subtipo |
|------------|-----------------|---------|
| `int4range` | `int4multirange` | `integer` |
| `int8range` | `int8multirange` | `bigint` |
| `numrange` | `nummultirange` | `numeric` |
| `tsrange` | `tsmultirange` | `timestamp` |
| `tstzrange` | `tstzmultirange` | `timestamptz` |
| `daterange` | `datemultirange` | `date` |

### Limites

| Símbolo | Significado |
|---------|-------------|
| `[` | Limite inferior inclusivo |
| `(` | Limite inferior exclusivo |
| `]` | Limite superior inclusivo |
| `)` | Limite superior exclusivo |
| `empty` | Range vazio |

Default (construtor 2-arg): `[)` (inferior inclusivo, superior exclusivo).

```sql
SELECT int4range(10, 20);           -- [10,20)
SELECT int4range(10, 20, '[]');     -- [10,20]
SELECT numrange(1.0, 14.0, '(]');   -- (1.0,14.0]
```

### Operadores

| Operador | Significado |
|----------|-------------|
| `@>` | Contém elemento ou range |
| `<@` | Contido em |
| `&&` | Sobreposto (overlap) |
| `<<` | Estritamente anterior |
| `>>` | Estritamente posterior |
| `&<` | Não se estende à direita |
| `&>` | Não se estende à esquerda |
| `-\|-` | Adjacente |
| `+` | União |
| `*` | Interseção |
| `-` | Diferença |
| `=` | Igualdade |

### Funções

| Função | Descrição |
|--------|-----------|
| `lower(range)` | Limite inferior |
| `upper(range)` | Limite superior |
| `isempty(range)` | Range vazio? |
| `lower_inc(range)`, `upper_inc(range)` | Limite inclusivo? |
| `lower_inf(range)`, `upper_inf(range)` | Limite infinito? |
| `range_merge(r1, r2)` | Range que cobre ambos |
| `range_agg(range)` | Agrega ranges em multirange (PG18) |

### Multiranges (PG14+)

Representam conjunto de ranges não contíguos:

```sql
SELECT '{}'::int4multirange;
SELECT '{[3,7), [8,9)}'::int4multirange;
SELECT nummultirange(numrange(1,5), numrange(10,15));
```

### Exclusion Constraints

Evitam sobreposição de ranges:

```sql
CREATE TABLE sala_reserva (
    sala int,
    durante tstzrange,
    EXCLUDE USING GIST (sala WITH =, durante WITH &&)
);
```

📝 Exige a extensão `btree_gist` para tipos escalares combinados com ranges:

```sql
CREATE EXTENSION btree_gist;
```

### Índices

```sql
CREATE INDEX idx_range ON tabela USING GIST (range_col);
CREATE INDEX idx_multirange ON tabela USING GIST (multirange_col);
```

---

## 8. Composite Types (Row Types)

Tipos compostos representam a estrutura de uma linha (lista de campos nomeados com seus tipos).

### Declaração

Cada tabela cria automaticamente um composite type de mesmo nome. Tipos explícitos:

```sql
CREATE TYPE endereco AS (
    rua text,
    cidade text,
    cep text,
    pais text DEFAULT 'Brasil'
);

CREATE TABLE cliente (
    id serial PRIMARY KEY,
    nome text,
    endereco_entrega endereco
);
```

### Construtor

```sql
INSERT INTO cliente VALUES (1, 'João', ROW('Rua A', 'São Paulo', '01001-000', 'Brasil'));
INSERT INTO cliente VALUES (2, 'Maria', ('Rua B', 'Rio', '20000-000', 'Brasil'));
```

### Acesso

⚠️ Use parênteses para acessar campos de coluna composta:

```sql
SELECT (endereco_entrega).rua FROM cliente;
SELECT (cliente.endereco_entrega).cidade FROM cliente;
```

### Funções

```sql
CREATE FUNCTION calcula_frete(entrega endereco) RETURNS numeric AS $$
    SELECT CASE WHEN entrega.cidade = 'São Paulo' THEN 10.00 ELSE 25.00 END;
$$ LANGUAGE SQL;

SELECT nome, calcula_frete(endereco_entrega) FROM cliente;
```

### pg_typeof, pg_columnof

```sql
SELECT pg_typeof(endereco_entrega) FROM cliente;
```

⚠️ **Prefira normalização** (colunas separadas) na maioria dos casos. Composite types são úteis para:
- Funções que retornam múltiplos valores
- Agrupamento lógico de campos que sempre aparecem juntos
- API de integração

---

## 9. OID Types

Object Identifiers (OIDs) são usados internamente como chaves primárias em tabelas de sistema. O tipo `oid` é um inteiro unsigned de 32 bits.

### Alias Types

| Tipo | Referência | Exemplo |
|------|-----------|---------|
| `oid` | Qualquer objeto | `564182` |
| `regclass` | `pg_class` (tabelas) | `'pg_type'` |
| `regcollation` | `pg_collation` | `'"POSIX"'` |
| `regconfig` | `pg_ts_config` | `'english'` |
| `regdictionary` | `pg_ts_dict` | `'simple'` |
| `regnamespace` | `pg_namespace` | `'pg_catalog'` |
| `regoper` | `pg_operator` | `'+'` |
| `regoperator` | Operador c/ tipos | `'*(integer,integer)'` |
| `regproc` | `pg_proc` (função) | `'sum'` |
| `regprocedure` | Função c/ tipos | `'sum(int4)'` |
| `regrole` | `pg_authid` | `'smithee'` |
| `regtype` | `pg_type` | `'integer'` |

```sql
-- Converter nome de tabela para OID
SELECT 'mytable'::regclass::oid;

-- Com schema qualification
SELECT 'public.mytable'::regclass;

-- Consultar catálogo usando regclass
SELECT * FROM pg_attribute WHERE attrelid = 'pg_class'::regclass;
```

📝 **Early binding**: `'mytable'::regclass` resolve o OID no momento da criação da expressão (ex: em defaults de colunas). Para **late binding** (runtime), use `'mytable'::text` ou `to_regclass('mytable')`.

⚠️ OID é 32-bit — não é único em databases grandes. `WITH OIDS` está obsoleto desde PG12.

---

## 10. pg_lsn — Log Sequence Number

Representa uma posição no Write-Ahead Log (WAL). Internamente é um inteiro 64-bit (XLogRecPtr).

Formato: `16/B374D848` (dois hexadecimais de até 8 dígitos separados por `/`).

```sql
SELECT '16/B374D848'::pg_lsn;
```

### Operadores

| Operador | Significado |
|----------|-------------|
| `=`, `<>`, `<`, `>`, `<=`, `>=` | Comparação |
| `lsn1 - lsn2` | Diferença em bytes |
| `lsn + numeric` | Avança LSN |
| `lsn - numeric` | Retrocede LSN |

### Funções

```sql
SELECT pg_current_wal_lsn();
SELECT pg_last_wal_receive_lsn();
SELECT pg_last_wal_replay_lsn();
SELECT pg_wal_lsn_diff('16/B374D850', '16/B374D848');
-- Resultado: 8 (bytes)
```

📝 Útil para monitoramento de replicação e backup:

```sql
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), pg_last_wal_replay_lsn()) AS lag_bytes;
```

---

## 11. Pseudo-Types

Pseudo-types não podem ser usados como tipo de coluna, apenas para declarar argumentos/retorno de funções.

### Polimórficos

| Tipo | Descrição |
|------|-----------|
| `anyelement` | Aceita qualquer tipo |
| `anyarray` | Aceita qualquer array |
| `anynonarray` | Aceita qualquer tipo não-array |
| `anyenum` | Aceita qualquer ENUM |
| `anyrange` | Aceita qualquer range |
| `anymultirange` | Aceita qualquer multirange |
| `anycompatible` | Promoção automática para tipo comum |
| `anycompatiblearray` | Array com promoção |
| `anycompatiblenonarray` | Não-array com promoção |
| `anycompatiblerange` | Range com promoção |
| `anycompatiblemultirange` | Multirange com promoção |

### Handler/Internal

| Tipo | Descrição |
|------|-----------|
| `internal` | Dado interno do servidor |
| `language_handler` | Handler de linguagem procedural |
| `fdw_handler` | Foreign Data Wrapper handler |
| `table_am_handler` | Table Access Method handler |
| `index_am_handler` | Index Access Method handler |
| `tsm_handler` | Tablesample Method handler |
| `pg_ddl_command` | Comando DDL (event triggers) |

### Outros

| Tipo | Descrição |
|------|-----------|
| `record` | Tipo linha não especificada |
| `void` | Função sem retorno |
| `trigger` | Função trigger |
| `event_trigger` | Função event trigger |
| `unknown` | Literal de tipo ainda não resolvido |
| `cstring` | String C null-terminated |
| `any` | Aceita qualquer tipo (sem polimorfismo) |

📝 Exemplo de função polimórfica:

```sql
CREATE FUNCTION primeiro_elemento(arr anyarray) RETURNS anyelement AS $$
    SELECT arr[1];
$$ LANGUAGE SQL;

SELECT primeiro_elemento(ARRAY[1,2,3]);
SELECT primeiro_elemento(ARRAY['a','b','c']);
```

📝 `COALESCE`, `GREATEST`, `LEAST` usam `anycompatible` internamente.

---

## 12. Type Conversion

SQL é uma linguagem fortemente tipada. PostgreSQL possui regras formais para conversão de tipos em expressões mistas.

### Conceitos Fundamentais

**Conversão Implícita vs Explícita**:

- **Implícita**: ocorre automaticamente quando há um cast registrado como `IMPLICIT` no `pg_cast`
- **Explícita**: exige `CAST(expr AS type)`, `expr::type`, ou `typeName(expr)`

**Sintaxes de CAST**:

```sql
SELECT CAST('123' AS integer);
SELECT '123'::integer;
SELECT integer '123';         -- função-style (apenas para tipos built-in)
```

### Três Passos da Resolução

**1. Identificar candidatos**: funções/operadores com mesmo nome e contagem de argumentos no search path.

**2. Filtrar por match exato**: se existe função/operador com tipos idênticos aos argumentos, use-o.

**3. Escolher entre candidatos restantes** (best match):

   a. Descartar candidatos que não aceitam conversão implícita
   b. Tratar domínios como tipo base
   c. Manter candidatos com mais matches exatos
   d. Manter candidatos que aceitam **tipos preferidos** na categoria
   e. Para `unknown`, preferir categoria `string`
   f. Se todos os argumentos conhecidos são do mesmo tipo, assumir que `unknown` também é

### Categorias de Tipos e Tipos Preferidos

| Categoria | Tipo Preferido |
|-----------|---------------|
| `string` | `text` |
| `numeric` | `float8` (double precision) |
| `datetime` | `timestamptz` |
| `timespan` | `interval` |
| `network` | `inet` |
| `bitstring` | `bit varying` |
| `geometric` | `point` |

### Resolução de Operadores

```sql
SELECT text 'abc' || 'def';     -- unknown → text (categoria string)
SELECT 'abc' || 'def';          -- ambos unknown → text (preferido string)
SELECT |/ 40;                    -- integer → double precision (operador único)
```

### Resolução de Funções

```sql
SELECT round(4, 4);              -- integer → numeric (única função round(num, int))
SELECT substr('1234', 3);        -- unknown → text (categoria string preferida)
SELECT substr(1234, 3);          -- ERRO: integer não tem cast implícito para text
```

📝 Números com ponto decimal são `numeric` por default. `SELECT round(4.0, 4)` não requer conversão.

### UNION, CASE, ARRAY

O algoritmo resolve o tipo comum entre branches:

1. Se todos os inputs são do mesmo tipo (não `unknown`), use esse tipo
2. Se todos são `unknown`, resolve como `text`
3. Se inputs não-unknown são de categorias diferentes, erro
4. Percorre inputs da esquerda para direita: se A pode ser convertido para B mas não vice-versa, escolhe B

```sql
SELECT 1.2 AS x UNION SELECT 1;     -- numeric (integer → numeric)
SELECT 1 UNION SELECT 2.2::real;     -- real (integer → real)
SELECT NULL UNION SELECT NULL UNION SELECT 1;  -- ERRO: text vs integer
```

### Value Storage (INSERT/UPDATE)

Conversão para o tipo da coluna destino:

1. Match exato com o target
2. Tenta assignment cast (registrado em `pg_cast`)
3. Aplica sizing cast (ex: `bpchar(..., atttypmod)` para `character(n)`)

### CREATE CAST

```sql
CREATE CAST (text AS meu_tipo) WITH FUNCTION meu_parse(text) AS IMPLICIT;
```

⚠️ **Alterar casts built-in é perigoso**. Apenas crie casts customizados para seus próprios tipos.

---

## 13. Domínios e Tipos Customizados

Revisão e expansão de `01-ddl-modelagem.md`.

### Domínios

```sql
CREATE DOMAIN email AS text CHECK (VALUE ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
CREATE DOMAIN cpf AS text CHECK (VALUE ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$');

CREATE TABLE usuario (
    id serial PRIMARY KEY,
    email email NOT NULL,
    cpf cpf
);
```

⚠️ Domínios são validados **na entrada** (INSERT/UPDATE). Não validam dados já existentes.

### CREATE TYPE Range Customizado

```sql
CREATE TYPE float8range AS RANGE (
    subtype = float8,
    subtype_diff = float8mi
);
```

### CREATE TYPE Composite

```sql
CREATE TYPE complexo AS (
    real_part double precision,
    imag_part double precision
);
```

📝 Domínios sobre tipos compostos podem ter CHECK constraints (diferente de composite types puros que não permitem constraints).

⚠️ `CREATE TYPE base` (via C function) é para extensões — não tente criar tipos base em SQL.

---

## 14. Armadilhas Comuns

🛑 **Usar `inet` para host mas ignorar a máscara armazenada**: `inet` sempre armazena a máscara. Se você inserir `'10.0.0.1'`, a máscara é /32. Ao comparar, a máscara é considerada.

🛑 **ENUM sem plano para evolução**: adicionar valores requer `ALTER TYPE ... ADD VALUE` (não transacional), remover valores requer recriação da tabela.

🛑 **Escolher XML por "padrão" sem precisar de XPath/XQuery**: `jsonb` é mais rápido, flexível e tem melhor suporte de indexação.

🛑 **Range types sem exclusion constraint**: dados sobrepostos são permitidos a menos que `EXCLUDE USING GIST` seja definido.

🛑 **Ignorar OID wraparound**: OID é 32-bit. `WITH OIDS` está obsoleto desde PG12. Use `BIGSERIAL` ou `uuid` para PKs.

🛑 **Assumir que type conversion implícita sempre funciona**: `text` → `integer` não é implícita. Exige CAST explícito.

🛑 **Geometric types nativos vs PostGIS**: tipos nativos são 2D básicos. Para GIS, use PostGIS (geometrias, geografias, projeções, SRID).

🛑 **bytea grande sem considerar TOAST ou Large Objects**: TOAST comprime/descomprime. Large Objects (>1GB) exigem API própria.

🛑 **Composite types como alternativa a normalização**: na maioria dos casos, colunas separadas são mais flexíveis e têm melhor performance.

🛑 **`bit varying` sem especificar comprimento máximo**: `bit varying` sem `n` permite comprimento ilimitado, o que pode levar a crescimento inesperado.

🛑 **Domínios vs CHECK direto na coluna**: domínios são reutilizáveis, mas a mensagem de erro é genérica. CHECK direto permite mensagens customizadas.
