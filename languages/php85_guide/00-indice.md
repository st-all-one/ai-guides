# PHP 8.5 — Dossiê de Uso Efetivo

Guia autocontido e versionado para **PHP 8.5**, com foco em implementação
correta, logs, telemetria, segurança, performance, estabilidade,
instrumentação e configuração. Versão de referência: **PHP 8.5.13**
(`source/main/php_version.h:3-7`).

## Abrangência

O PHP 8.5 inclui toda a superfície acumulada até o 8.4 (arrow functions,
enums, readonly, property hooks, fibers, JIT, etc.) e acrescenta:

- **URI extension** (RFC 3986 + WHATWG URL) — sempre disponível.
- **Pipe operator** `|>`.
- **Clone With** — `clone($obj, [...])`.
- **`#[\NoDiscard]`** + cast `(void)`.
- Closures e first-class callables em expressões constantes.
- `array_first()` / `array_last()`.
- `FILTER_THROW_ON_FAILURE` + `Filter\FilterFailedException`.
- `get_error_handler()` / `get_exception_handler()`.
- Stack traces em erros fatais (`fatal_error_backtraces`).
- `max_memory_limit` (INI_SYSTEM), `php --ini=diff`.
- Persistent cURL share handles, `curl_multi_get_handles`.
- `IntlListFormatter`, `locale_is_right_to_left`.
- Atributos `#[\Override]` em propriedades, `#[\Deprecated]` em traits e
  constantes, `#[\DelayedTargetValidation]`, `final` em propriedades
  promovidas, visibilidade assimétrica estática.

## Estrutura

- **01–09:** base comum, já atualizada para o 8.5.
- **10–17:** recursos e mudanças específicas do 8.5.
- **18–24:** referência de linguagem com as alterações 8.5.
- **25:** configuração web/php.ini de produção.

| Arquivo | Tópico |
| --- | --- |
| [01-sintaxe-basica.md](01-sintaxe-basica.md) | Sintaxe básica |
| [02-tipagem-baseline.md](02-tipagem-baseline.md) | Tipagem básica |
| [03-programacao-funcional-baseline.md](03-programacao-funcional-baseline.md) | Programação funcional básica |
| [04-poo-baseline.md](04-poo-baseline.md) | POO básica |
| [05-seguranca-baseline.md](05-seguranca-baseline.md) | Segurança básica |
| [06-logs.md](06-logs.md) | Logs e erros básicos |
| [07-performance-baseline.md](07-performance-baseline.md) | Performance básica |
| [08-configuracao.md](08-configuracao.md) | Configuração básica |
| [09-boas-praticas.md](09-boas-praticas.md) | Boas práticas |
| [10-sintaxe-recursos-85.md](10-sintaxe-recursos-85.md) | Pipe, Clone With, NoDiscard, constantes, depreciações |
| [11-tipagem-85.md](11-tipagem-85.md) | Closure ⊂ callable, final promovido, aviz estático, casts |
| [12-programacao-funcional-85.md](12-programacao-funcional-85.md) | Pipelines, callables, `array_first`/`last` |
| [13-poo-85.md](13-poo-85.md) | Clone With, atributos, reflexão, armadilhas |
| [14-seguranca-85.md](14-seguranca-85.md) | URI extension, filter throw, max_memory_limit, remoções |
| [15-performance-85.md](15-performance-85.md) | OPcache/JIT, cURL persistente, telemetria, medição |
| [16-configuracao-85.md](16-configuracao-85.md) | `--ini=diff`, INI_SYSTEM, validação CI |
| [17-logs-85.md](17-logs-85.md) | Fatal backtraces, get_*_handler, telemetria segura |
| [18-namespaces.md](18-namespaces.md) | Namespaces e os novos namespaces `Uri\`, `Filter\` |
| [19-references.md](19-references.md) | Referências e a restrição do pipe a parâmetros por ref |
| [20-operators.md](20-operators.md) | Operadores, pipe, casts, depreciações |
| [21-generators-iterators.md](21-generators-iterators.md) | Generators, iteradores, fibers |
| [22-input-superglobals.md](22-input-superglobals.md) | Superglobais, `FILTER_THROW_ON_FAILURE`, CHIPS |
| [23-oop-avancado.md](23-oop-avancado.md) | POO avançado no estado 8.5 |
| [24-errors-exceptions.md](24-errors-exceptions.md) | Erros, exceções, novas exceções de extensão |
| [25-config-web-phpini.md](25-config-web-phpini.md) | php.ini/FPM de produção, segurança/performance/estabilidade |
| [26-programacao-funcional-avancada.md](26-programacao-funcional-avancada.md) | Programação funcional avançada — pureza, imutabilidade, composição, coleções, generators, fibers, pipe, erros e performance |
| [27-referencia-mudancas-85.md](27-referencia-mudancas-85.md) | Catálogo exaustivo de funções, constantes, classes, BC e depreciações do 8.5 |
| [28-performance-internals-85.md](28-performance-internals-85.md) | Melhorias internas de performance e impacto prático (VM, SIMD, OPcodes, extensões) |

## Como usar

1. Leia **10–17** para o que é novo no 8.5.
2. Consulte **01–09** e **18–24** para a base completa.
3. Leia **26** para programação funcional em profundidade.
4. Aplique **25** no deploy e valide com `php --ini=diff`.
5. Execute [exemplo-completo.php](exemplo-completo.php) com PHP 8.5.13+.

## Exemplo prático

- [exemplo-completo.php](exemplo-completo.php) — arquivo único e executável
  com pipe operator, Clone With, `#[\NoDiscard]`, Uri, filter throw,
  handlers, logs estruturados e medição.

## Verificação

Cada capítulo traz uma seção final **Verificação** com comandos ou cenários
concretos. O guia foi escrito com citações `arquivo:linha` para fatos
pontuais e `arquivo` para arquivos inteiros.

```php
// PHP_VERSION_ID >= 80513
phpinfo(INFO_GENERAL);
```

```bash
php --ini=diff
```
