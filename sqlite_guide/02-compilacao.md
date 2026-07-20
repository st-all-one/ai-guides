# Configuração e Compilação do SQLite

Baseado em: `compile.html`, `limits.html`

---

## 1. Modos de Distribuição

### Amalgamation (Recomendado)

O SQLite é distribuído como um único arquivo `.c` (sqlite3.c) + header
(sqlite3.h). Esta é a forma **recomendada** de uso:

```bash
# Download do amalgamation
wget https://sqlite.org/2025/sqlite-amalgamation-3530300.zip
unzip sqlite-amalgamation-3530300.zip
cd sqlite-amalgamation-3530300

# Compilação simples
gcc -c sqlite3.c -o sqlite3.o
ar rcs libsqlite3.a sqlite3.o
```

### Compilação com flags otimizadas

```bash
gcc -O3 -DNDEBUG \
    -DSQLITE_DQS=0 \
    -DSQLITE_THREADSAFE=0 \
    -DSQLITE_DEFAULT_MEMSTATUS=0 \
    -DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1 \
    -DSQLITE_LIKE_DOESNT_MATCH_BLOBS \
    -DSQLITE_MAX_EXPR_DEPTH=0 \
    -DSQLITE_OMIT_DECLTYPE \
    -DSQLITE_OMIT_DEPRECATED \
    -DSQLITE_OMIT_PROGRESS_CALLBACK \
    -DSQLITE_OMIT_SHARED_CACHE \
    -DSQLITE_STRICT_SUBTYPE=1 \
    -c sqlite3.c -o sqlite3.o
```

## 2. Conjunto Recomendado de Flags de Compilação

A documentação oficial recomenda o seguinte conjunto para máximo desempenho
e segurança:

| Flag | Efeito | Ganho |
|---|---|---|
| `SQLITE_DQS=0` | Desativa literais string com aspas duplas | Correção de bugs silenciosos |
| `SQLITE_THREADSAFE=0` | Remove mutexes (só single-thread) | ~2% mais rápido, ~2% menor |
| `SQLITE_DEFAULT_MEMSTATUS=0` | Desativa rastreamento de memória | Acelera `sqlite3_malloc()` |
| `SQLITE_DEFAULT_WAL_SYNCHRONOUS=1` | synchronous=NORMAL no WAL | Commit muito mais rápido |
| `SQLITE_LIKE_DOESNT_MATCH_BLOBS` | LIKE retorna FALSE para BLOBs | Acelera otimização LIKE |
| `SQLITE_MAX_EXPR_DEPTH=0` | Desativa verificação de profundidade de expressão | Código mais rápido, menos memória |
| `SQLITE_OMIT_DECLTYPE` | Remove metadados de tipo declarado | Prepared statements menores |
| `SQLITE_OMIT_DEPRECATED` | Remove interfaces obsoletas | Binário menor |
| `SQLITE_OMIT_PROGRESS_CALLBACK` | Remove condicional do loop VDBE | Execução levemente mais rápida |
| `SQLITE_OMIT_SHARED_CACHE` | Remove cache compartilhado | Performance visivelmente melhor |
| `SQLITE_STRICT_SUBTYPE=1` | Erro se função sem subtipo usar `sqlite3_result_subtype()` | Previne bugs sutis |

> **Efeito total**: ~3% menor, ~5% menos ciclos de CPU.

## 3. Tabela de Limites Configuráveis

| Limite | Padrão | Máximo | Redutível |
|---|---|---|---|
| `SQLITE_MAX_LENGTH` | 1.000.000.000 | 2.147.483.645 | Sim |
| `SQLITE_MAX_COLUMN` | 2.000 | 32.767 | Sim |
| `SQLITE_MAX_SQL_LENGTH` | 1.000.000.000 | — | Sim |
| `SQLITE_MAX_COMPOUND_SELECT` | 500 | — | Sim |
| `SQLITE_MAX_EXPR_DEPTH` | 1.000 | — | Sim |
| `SQLITE_MAX_FUNCTION_ARG` | 127 (1000 v3.48+) | 32.767 | Sim |
| `SQLITE_MAX_LIKE_PATTERN_LENGTH` | 50.000 | — | Sim |
| `SQLITE_MAX_VARIABLE_NUMBER` | 999 (32.766 v3.32+) | — | Sim |
| `SQLITE_MAX_ATTACHED` | 10 | 125 | Sim |
| `SQLITE_MAX_PAGE_COUNT` | 4.294.967.294 | — | Sim |
| `SQLITE_MAX_TRIGGER_DEPTH` | 1.000 | — | Sim |
| Tabelas em JOIN | 64 | 64 | **Não** |
| Tamanho máx. banco | ~281 TB | ~281 TB | — |

### Configuração de Alta Segurança

Para ambientes com entradas não confiáveis, reduzir agressivamente:

| Limite | Segurança Alta |
|---|---|
| `SQLITE_MAX_LENGTH` | 1.000.000 |
| `SQLITE_MAX_SQL_LENGTH` | 100.000 |
| `SQLITE_MAX_COLUMN` | 100 |
| `SQLITE_MAX_EXPR_DEPTH` | 10 |
| `SQLITE_MAX_COMPOUND_SELECT` | 3 |
| `SQLITE_MAX_FUNCTION_ARG` | 8 |
| `SQLITE_MAX_ATTACHED` | 0 |
| `SQLITE_MAX_LIKE_PATTERN_LENGTH` | 50 |
| `SQLITE_MAX_VARIABLE_NUMBER` | 10 |
| `SQLITE_MAX_TRIGGER_DEPTH` | 10 |

## 4. Flags Críticas de Segurança

```c
- SQLITE_TRUSTED_SCHEMA=0          // Desativa schema como confiável
- SQLITE_DQS=0                      // Desativa double-quoted string
- SQLITE_DEFAULT_FOREIGN_KEYS=1     // Foreign keys ativadas por padrão
- SQLITE_MINIMUM_FILE_DESCRIPTOR=3  // Evita corrupção por assert()
- SQLITE_PRINTF_PRECISION_LIMIT=100000  // Limita printf() DoS
- SQLITE_JSON_MAX_DEPTH=20          // Previne stack overflow em JSON
- SQLITE_MAX_ALLOCATION_SIZE=100000000 // Limite de alocação individual
- SQLITE_MAX_MEMORY=50000000        // Hard limit de memória total
```

## 5. Alocadores de Memória

### Default (memsys1)
Usa `malloc()`/`free()` do sistema com wrapper de 8 bytes para
rastreamento de tamanho.

### Zero-malloc (memsys5) — para sistemas críticos
Alocador buddy-system first-fit em potência de 2, opera sobre um heap
fixo fornecido pela aplicação. **Garantia matemática contra fragmentação**
(Robson proof):

```
N = M * (1 + log2(n)/2) - n + 1
```

Onde N = heap necessário, M = uso máximo, n = razão maior/menor alocação.
Para alocações < 2KB típicas: N ≈ 2 a 2.5× M.

```c
static char buf[1000000];  // 1MB de heap
sqlite3_config(SQLITE_CONFIG_HEAP, buf, sizeof(buf), 4096);
```

### Page Cache e Lookaside
- **Page cache**: `SQLITE_CONFIG_PAGECACHE` — pool de tamanho fixo para
  páginas de banco, rápido e sem fragmentação
- **Lookaside**: `SQLITE_CONFIG_LOOKASIDE` — pool (~48KB default) de slots
  pequenos (128B + 1200B desde v3.31.0). Reduz chamadas a malloc() em 10-15%.

## 6. Para Projetos Rust

Com o crate `libsqlite3-sys`, é possível customizar a compilação via
variáveis de ambiente ou build.rs:

```rust
// build.rs
fn main() {
    println!("cargo:rustc-cfg=SQLITE_DQS=\"0\"");
    println!("cargo:rustc-cfg=SQLITE_THREADSAFE=\"0\"");
}
```

Ou com o bundle do `rusqlite`:

```rust
// Cargo.toml
[dependencies]
rusqlite = { version = "0.32", features = ["bundled"] }
```

## 7. Verificação das Opções Ativas

Para inspecionar quais opções de compilação foram usadas:

```sql
PRAGMA compile_options;
```

---

**Próximo**: [03-api-c.md](03-api-c.md) — API C do SQLite
