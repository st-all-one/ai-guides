Complementar ao documento comum — específico do PHP 7.2.

# Erros e Exceções no PHP 7.2

Este documento cobre o tratamento de erros e exceções no PHP 7.2. Todo o código
aqui é 100% válido e executável na versão 7.2.

> Aviso de escopo: nada aqui é específico de versões posteriores. Veja também
> `06-logs.md` e `17-logs-72.md`.

## 1. Níveis de erro

Constantes de bits usadas em `error_reporting()`:

| Constante | Significado |
|---|---|
| `E_ERROR` | erro fatal que aborta a execução |
| `E_WARNING` | aviso (não aborta) |
| `E_NOTICE` | nota (possível problema) |
| `E_DEPRECATED` | recurso em desuso |
| `E_STRICT` | sugestão de padronização |
| `E_ALL` | todos os níveis |

```php
<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');
```

## 2. `error_reporting`, `set_error_handler`, `trigger_error`

```php
<?php
set_error_handler(function (int $errno, string $errstr, string $errfile = '', int $errline = 0) {
    error_log("[$errno] $errstr em $errfile:$errline");
    return false; // deixa o handler interno também tratar
});

trigger_error('algo estranho', E_USER_WARNING);
```

Use `restore_error_handler()` para remover o handler atual.

## 3. Hierarquia de exceções (7.0+)

Desde o PHP 7.0, tanto `Exception` quanto `Error` implementam `Throwable`:

```
Throwable
 ├── Error
 │    ├── TypeError
 │    ├── ParseError
 │    ├── AssertionError
 │    └── ArithmeticError (DivisionByZeroError)
 └── Exception
```

```php
<?php
try {
    $x = 1 / 0; // ArithmeticError em algumas situações; DivisionByZeroError
} catch (DivisionByZeroError $e) {
    echo 'divisão por zero';
}

try {
    strlen(null, 1); // TypeError
} catch (TypeError $e) {
    echo 'tipo inválido';
}
```

## 4. Exceções personalizadas

```php
<?php
class MeuErro extends Exception {}

try {
    throw new MeuErro('falhou');
} catch (MeuErro $e) {
    echo $e->getMessage();
} finally {
    echo 'sempre executa';
}
```

O bloco `finally` (desde 5.5) executa independentemente de lançamento ou
captura.

## 5. Convertendo erros em exceções

Um padrão comum é transformar avisos/notices em exceções via handler:

```php
<?php
set_error_handler(function (int $errno, string $errstr, string $errfile = '', int $errline = 0) {
    if (!(error_reporting() & $errno)) {
        return false;
    }
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

try {
    $f = fopen('inexistente.txt', 'r');
} catch (ErrorException $e) {
    error_log($e->getMessage());
}
```

## 6. Boas práticas

- Em produção, `display_errors=Off` e `log_errors=On`; registre em log (vide
  `06-logs.md`).
- Capture tipos específicos antes dos genéricos (`Throwable`/`Exception`).
- Não capture `Throwable` para "engolir" erros silenciosamente.
- Use `ErrorException` para integração de erros legados com fluxo de exceções.

## 7. Resumo

| Recurso | Desde | Notas no 7.2 |
|---|---|---|
| `Throwable` | 7.0 | raiz de erros/exceções |
| `Error`/`TypeError` | 7.0 | erros fatais capturáveis |
| `Exception` | 5.0 | exceção padrão |
| `finally` | 5.5 | sempre executa |
| `set_error_handler` | 4.0 | handler customizado |
| `ErrorException` | 5.1 | erro -> exceção |
