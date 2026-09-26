# PHP 7.4 — Dossiê de Uso Efetivo

Índice do dossiê de documentação para **PHP 7.4**. Todo o conteúdo aqui é
**estritamente restrito ao PHP 7.4**: cobre o baseline comum (válido em 7.2,
7.4 e 8.4) mais os recursos específicos introduzidos até e incluindo o 7.4
(7.3 + 7.4). Nenhum exemplo usa recursos de versões 8.x.

## Documentos comuns (baseline — 01 a 09)

Válidos em PHP 7.2, 7.4 e 8.4. Recortados nas pastas de cada versão.

| Arquivo | Assunto |
|---|---|
| [01-sintaxe-basica.md](01-sintaxe-basica.md) | Sintaxe básica (tags, comentários, strings, type juggling) |
| [02-tipagem-baseline.md](02-tipagem-baseline.md) | Tipagem baseline (escalares, `?Tipo`, `void`, `iterable`, `object`, `callable`) |
| [03-programacao-funcional-baseline.md](03-programacao-funcional-baseline.md) | Closures, `Closure::fromCallable`, `array_*`, geradores |
| [04-poo-baseline.md](04-poo-baseline.md) | Classes, interfaces, traits, métodos mágicos, exceções |
| [05-seguranca-baseline.md](05-seguranca-baseline.md) | `password_hash` (BCRYPT/ARGON2I), `random_*`, `sodium`, `filter`, prepared statements |
| [06-logs.md](06-logs.md) | `error_log`, `syslog`, handlers, `error_clear_last` |
| [07-performance-baseline.md](07-performance-baseline.md) | OPcache básico, geradores, autoloading |
| [08-configuracao.md](08-configuracao.md) | `php.ini`, `ini_*`, `.user.ini`, `declare` |
| [09-boas-praticas.md](09-boas-praticas.md) | Namespaces, PSR-4, DI, imutabilidade por convenção |

## Documentos específicos do PHP 7.4 (10 a 17)

Complementam o comum e documentam **apenas** o que é novo/performático no 7.4
(incluindo adições do 7.3 que valem para o 7.4).

| Arquivo | Assunto (novo no 7.3/7.4) |
|---|---|
| [10-sintaxe-recursos-74.md](10-sintaxe-recursos-74.md) | `??=` (7.4), arrow functions `fn()=>` (7.4), spread em array `[...$arr]` (7.4), vírgulas à direita em chamadas (7.3), heredoc/nowdoc flexível (7.3), `_` em literais (7.4) |
| [11-tipagem-74.md](11-tipagem-74.md) | Propriedades tipadas (7.4), covariância de retorno e contravariância de parâmetro (7.4) |
| [12-programacao-funcional-74.md](12-programacao-funcional-74.md) | Arrow functions + closures + `array_*` + geradores (ênfase 7.4) |
| [13-poo-74.md](13-poo-74.md) | `__serialize`/`__unserialize` (7.4), `WeakReference` (7.4), propriedades tipadas em OOP, exceção em `__toString` (7.4) |
| [14-seguranca-74.md](14-seguranca-74.md) | `PASSWORD_ARGON2ID` (7.3) + recapitulação de segurança |
| [15-performance-74.md](15-performance-74.md) | OPcache **Preloading** (7.4): `opcache.preload`/`opcache.preload_user` + tuning |
| [16-configuracao-74.md](16-configuracao-74.md) | `opcache.preload`, `opcache.preload_user`, `zend.exception_ignore_args` (7.4), `syslog.*` (7.3) |
| [17-logs-74.md](17-logs-74.md) | `syslog.facility`/`syslog.ident`/`syslog.filter` (7.3), `zend.exception_ignore_args` (7.4) |

## Documentos complementares específicos do PHP 7.4 (18 a 25)

Complementam o comum e aprofundam tópicos transversais, restritos ao que o
PHP 7.4 oferece (incluindo adições do 7.3).

| Arquivo | Assunto |
|---|---|
| [18-namespaces.md](18-namespaces.md) | Namespaces: declaração, bloco, global, `use`/alias agrupado, fallback, resolução dinâmica e regras de nomes |
| [19-references.md](19-references.md) | Referências: alias, atribuição, parâmetro/retorno por referência, `foreach`, `unset`, ressalvas |
| [20-operators.md](20-operators.md) | Operadores (`??=` 7.4, `<=>`, `??`, bitwise, etc.), type juggling, armadilhas `==`/`===`, constantes mágicas, sintaxe básica |
| [21-generators-iterators.md](21-generators-iterators.md) | Geradores: `yield`, `yield from`, `getReturn()`; iteradores SPL `Iterator`/`IteratorAggregate`/`ArrayIterator` |
| [22-input-superglobals.md](22-input-superglobals.md) | Superglobais, entrada externa segura (`filter_*`), uploads, funções variáveis; link `05-seguranca-baseline` |
| [23-oop-avancado.md](23-oop-avancado.md) | POO avançada: classe anônima, propriedades tipadas (7.4), mágicos, `__clone`, `__serialize`/`__unserialize` (7.4), LSB |
| [24-errors-exceptions.md](24-errors-exceptions.md) | Erros/exceções: `Throwable`/`Error`, `JsonException` (7.3), `finally`, erro->exceção; link `06-logs` |
| [25-config-web-phpini.md](25-config-web-phpini.md) | `php.ini` web: segurança, OPcache + preload (7.4), `session.cookie_samesite` (7.3), estabilidade, `cgi.fix_pathinfo` |

## Escopo deste dossiê

Este dossiê restringe-se aos recursos disponíveis **até o PHP 7.4**
(incluindo as adições do 7.3). Não aborda funcionalidades das versões 8.x;
para consultá-las, utilize o dossiê 8.4.

## Resumo

Use os documentos **01–09** para a base estável e os documentos **10–17** para
o que o PHP 7.4 agrega sobre o 7.2. Todos os exemplos de código foram escritos
para serem **100% válidos e executáveis no PHP 7.4**.

## Exemplo prático

- [exemplo-completo.php](exemplo-completo.php) — arquivo único e executável
  demonstrando diretivas, tipagem, programação funcional, POO e logs em PHP
  7.4 (arrow functions, typed properties, `??=`, WeakReference), com
  comentários destacando o que **não** existe ainda nesta versão.
