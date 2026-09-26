# PHP 7.2 — Dossiê de Uso Efetivo

Índice da pasta `72/`. Este dossiê é **estritamente limitado ao PHP 7.2**:
todo o código documentado executa corretamente no PHP 7.2 e **não** utiliza
recursos de versões posteriores (7.3, 7.4, 8.0, 8.1, 8.2, 8.4).

## Documentos comuns (base, válidos em 7.2/7.4/8.4)

| Arquivo | Assunto |
|---|---|
| `01-sintaxe-basica.md` | Sintaxe básica comum |
| `02-tipagem-baseline.md` | Tipagem de base |
| `03-programacao-funcional-baseline.md` | Programação funcional de base |
| `04-poo-baseline.md` | POO de base |
| `05-seguranca-baseline.md` | Segurança de base |
| `06-logs.md` | Logs de base |
| `07-performance-baseline.md` | Performance de base |
| `08-configuracao.md` | Configuração de base |
| `09-boas-praticas.md` | Boas práticas |

## Suplementos específicos do PHP 7.2

| Arquivo | Assunto 7.2 |
|---|---|
| `10-sintaxe-recursos-72.md` | `??`, `<=>`, spread em chamadas, `[]` destruturação, visibilidade de `const`, multi-catch, offsets negativos, vírgula final em `use {}` |
| `11-tipagem-72.md` | `declare(strict_types=1)`, tipos de retorno, `?tipo`, `void`, `iterable`, **`object` (novo no 7.2)**, `callable`, juggling, ampliação de parâmetro |
| `12-programacao-funcional-72.md` | Closures, `Closure::bind/bindTo`, `Closure::fromCallable`, variádicas, `array_map/filter/reduce/walk`, geradores |
| `13-poo-72.md` | OOP completa, métodos mágicos (sem `__serialize`), classes anônimas, `Throwable`/`Error`, LSB |
| `14-seguranca-72.md` | **Argon2i (novo no 7.2)**, `random_bytes/int`, Sodium (core no 7.2), `filter_var`, `hash_equals`, escape, prepared statements, sessão |
| `15-performance-72.md` | OPcache, autoload, geradores, GC |
| `16-configuracao-72.md` | `php.ini`/`.user.ini`, diretivas, `declare`, `zend.assertions`, carga de extensão por nome |
| `17-logs-72.md` | `error_log`, syslog, handlers (sem `$errcontext`), `trigger_error`, níveis |
| `18-namespaces.md` | Namespaces: declaração, `use`/alias agrupado, resolução e ordem de nomes |
| `19-references.md` | Referências: alias, parâmetro/retorno por referência, `foreach`, `unset` |
| `20-operators.md` | Operadores, type juggling, `==` vs `===`, constantes mágicas, sintaxe básica |
| `21-generators-iterators.md` | Geradores: `yield`, `yield from`, `getReturn()`, iteradores SPL |
| `22-input-superglobals.md` | Superglobais, entrada externa segura, `filter_*`, funções variáveis |
| `23-oop-avancado.md` | POO avançada: classe anônima, mágicos, `__clone`, `Serializable`, LSB |
| `24-errors-exceptions.md` | Erros/exceções: `Throwable`/`Error`, `finally`, erro->exceção |
| `25-config-web-phpini.md` | `php.ini` web: segurança, OPcache, estabilidade, `cgi.fix_pathinfo` |

## Escopo deste dossiê

Este dossiê restringe-se **exclusivamente** aos recursos disponíveis no PHP
7.2. Não aborda funcionalidades de versões posteriores; para consultá-las,
utilize os dossiês correspondentes a cada versão.

## Exemplo prático

- [exemplo-completo.php](exemplo-completo.php) — arquivo único e executável
  demonstrando diretivas, tipagem, programação funcional, POO e logs em PHP
  7.2, com comentários destacando o que **não** existe ainda nesta versão.
