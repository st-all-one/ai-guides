# Logs e erros básicos no PHP 8.5

`error_log()`, PSR-3, `syslog()` e handlers continuam sendo a base. A novidade
do 8.5 é a capacidade de inspecionar handlers ativos e backtraces de fatais.

## Fontes

- `docs/fatal_error_backtraces.txt`, `docs/get_error_handler-get_exception_handler.txt`.
- `source/UPGRADING:363-383,738-746`.

### Configuração mínima

```ini
display_errors = Off
log_errors = On
error_reporting = E_ALL
error_log = /var/log/php/php-error.log
error_log_mode = 0640
fatal_error_backtraces = On
zend.exception_ignore_args = On
```

### Log estruturado

```php
error_log(json_encode([
    'evento' => 'pedido.criado',
    'id' => $pedido->id,
    'ms' => round((hrtime(true) - $inicio) / 1e6, 2),
    'request_id' => $_SERVER['HTTP_X_REQUEST_ID'] ?? null,
], JSON_THROW_ON_ERROR));
```

### Handlers

```php
$anterior = get_error_handler();
set_error_handler(static function (int $no, string $str, string $file, int $line) use ($anterior): bool {
    if (!(error_reporting() & $no)) return false;
    error_log("[$no] $str em $file:$line");
    return $anterior !== null ? (bool) $anterior($no, $str, $file, $line) : false;
});
```

`get_error_handler()` e `get_exception_handler()` são novos no 8.5
(`docs/get_error_handler-get_exception_handler.txt:40-78`).

### Fatais

Use `register_shutdown_function()` + `error_get_last()`. O `message` agora
pode incluir stack trace completo (`docs/fatal_error_backtraces.txt:38-44`).

### Redação

Nunca registre senhas, tokens, headers `Authorization` ou corps completos.
`#[\SensitiveParameter]` protege argumentos em traces.

## Verificação

- Teste com `ini_set('memory_limit', '2M')` + `str_repeat()` deve gerar trace
  no log, nunca na resposta HTTP.
