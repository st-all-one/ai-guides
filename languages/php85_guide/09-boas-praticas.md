# Boas práticas no PHP 8.5

Diretrizes para código novo: explícito, imutável por padrão, observável e com
limites claros.

## Fontes

- `source/UPGRADING` (mudanças 8.5 consolidadas nos capítulos 10–17).
- `source/NEWS:372-377` (patch 8.5.13).

### Checklist de código

1. `declare(strict_types=1)` e tipos em todas as assinaturas.
2. `readonly class` para value objects; `clone($obj, [...])` para variações.
3. `#[NoDiscard]` em APIs cujo retorno não pode ser ignorado.
4. `filter_*` com `FILTER_THROW_ON_FAILURE` para entrada; nunca combine com
   `FILTER_NULL_ON_FAILURE`.
5. `Uri\Rfc3986\Uri`/`Uri\WhatWg\Url` para URLs, não `parse_url()` em contexto
   de confiança.
6. Pipe apenas para cadeias claras de um argumento; closure para o resto.
7. `array_first`/`array_last` com cuidado: `null` também é valor válido.
8. Backtraces de fatais habilitados, mas `display_errors=Off`.
9. `get_error_handler()`/`get_exception_handler()` para compor handlers.
10. cURL persistente compartilhe só DNS/conexões, nunca cookies.
11. `max_memory_limit` definido no startup, abaixo do limite do container.
12. PHP 8.5.**13+** fixado em produção.

### Anti-padrões

- Casts não canônicos, backtick, `case;`, `null` como chave, `++` em string.
- Depender de `disable_classes`, DSN `uri:`, `$key_length`, `$_SERVER['argc']`.
- Ignorar `#[\SensitiveParameter]` em parâmetros de senha/token.
- JIT ligado sem medição; OPcache desligado em produção.

### Estrutura recomendada

```
app/
├── src/            # classes PSR-4
├── config/         # php.ini, pool FPM, composants
├── tests/          # PHPUnit + testes de smoke 8.5
└── bin/            # scripts CLI
```

```php
#[\[NoDiscard\]]
function validar(string $s): string { return trim($s); }
```

## Verificação

- `php -l` em todo o código; `php --ini=diff` no deploy.
