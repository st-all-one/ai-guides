# Erros e exceções no PHP 8.5

A hierarquia `Throwable` → `Error`/`Exception`, o `try`/`catch`/`finally` e as
regras de handle continuam iguais ao 8.4. O que muda no 8.5 é a
**introspecção de handlers**, os **backtraces de fatais** e um conjunto de
novas exceções em extensões.

## Fontes

- `docs/get_error_handler-get_exception_handler.txt`, `docs/fatal_error_backtraces.txt`.
- `source/UPGRADING:738-743,817-820,822-827,949-952`.
- `source/ext/uri/php_uri.stub.php:5-27,100-107`.

### Novas exceções e tipos de erro

| Exceção/erro | Origem | Quando ocorre | Fonte |
| --- | --- | --- | --- |
| `Filter\FilterException` | ext/filter | classe base de exceções do filtro | `source/UPGRADING:817-820` |
| `Filter\FilterFailedException` | ext/filter | falha de validação com `FILTER_THROW_ON_FAILURE` | `source/UPGRADING:817-820` |
| `Uri\UriException` / `Uri\UriError` / `Uri\InvalidUriException` | ext/uri | parsing inválido de URI | `source/ext/uri/php_uri.stub.php:5-19` |
| `Uri\WhatWg\InvalidUrlException` | ext/uri | URL WHATWG inválida; traz `$errors` | `source/ext/uri/php_uri.stub.php:100-107` |
| `Uri\UriError` (`Error`, não `Exception`) | ext/uri | erro de URI da categoria `Error` | `source/ext/uri/php_uri.stub.php:11-14` |

```php
try {
    $url = new Uri\WhatWg\Url($entrada);
} catch (Uri\WhatWg\InvalidUrlException $e) {
    foreach ($e->errors as $erro) {
        error_log($erro->context . ': ' . $erro->type->name);
    }
    throw new InvalidArgumentException('URL inválida', previous: $e);
}
```

### Ler e restaurar handlers

`get_error_handler()` e `get_exception_handler()` devolvem `?callable`
(`docs/get_error_handler-get_exception_handler.txt:40-78`). Use para
compor — não substituir — os handlers de um framework:

```php
$anterior = get_exception_handler();
set_exception_handler(function (Throwable $e) use ($anterior): void {
    error_log($e::class . ': ' . $e->getMessage());
    if ($anterior !== null) {
        $anterior($e);
    } else {
        http_response_code(500);
    }
});
```

### Fatais agora com stack trace

Condições como estouro de memória e tempo limite incluem trace
(`source/UPGRADING:186-188`). Isso vale também para o shutdown: continue
usando `register_shutdown_function()` + `error_get_last()` para registrar o
evento, mas agora o `message` traz o rastro completo
(`docs/fatal_error_backtraces.txt:38-44`).

### `ValueError`, `TypeError` e avisos reforçados

O 8.5 amplia o uso de `ValueError` para entradas fora de faixa em vez de
silenciar: `bzcompress()`, `finfo_file()`, PDO fetch modes
(`source/UPGRADING:64-79,145-146`). Avisos novos — não exceções — aparecem
para casts de `NAN`, floats fora da faixa e desestruturação de não-array
(`source/UPGRADING:55-62`). Trate avisos como erros em testes:

```php
set_error_handler(static function (int $no, string $str, string $file, int $line): bool {
    throw new ErrorException($str, 0, $no, $file, $line);
});
```

### Handlers que não devem mais ser usados

- `set_error_handler()` continua válido; `restore_error_handler()` continua
  válido. A novidade é apenas a leitura do estado atual.
- Não dependa de `$errcontext` (removido no 8.0) nem de handlers que fazem
  `echo` — output em output handler está depreciado
  (`source/UPGRADING:363-367`).
- Não use `E_USER_ERROR` via `trigger_error()` (depreciado no 8.4); lance
  exceção ou `exit(1)`.

## Verificação

- Teste que `FilterFailedException` e `InvalidUrlException` são capturadas
  separadamente de `Throwable` genérico.
- Script com `get_exception_handler()` antes/depois de
  `set_exception_handler()` deve mostrar o callable e depois `null` ao
  restaurar.
- Confirme que `display_errors=Off` impede que o trace do fatal chegue ao
  cliente.
