# Segurança básica no PHP 8.5

Controles mínimos obrigatórios em qualquer aplicação PHP: validar entrada,
escapar saída, usar prepared statements, hash de senha, CSPRNG, sessão segura
e erros sem vazamento.

## Fontes

- `source/UPGRADING:265-270,368-402,817-827`.
- `docs/filter-validation-throw-exception.txt`.
- `source/ext/uri/php_uri.stub.php:28-220`.

### Entrada

```php
$email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL, FILTER_THROW_ON_FAILURE);
```

`FILTER_THROW_ON_FAILURE` (novo no 8.5) lança `Filter\FilterFailedException`
em vez de retornar `false` (`source/UPGRADING:265-270`). Não combine com
`FILTER_NULL_ON_FAILURE` — `ValueError` garantido.

### Saída

```php
echo htmlspecialchars($nome, ENT_QUOTES | ENT_HTML5, 'UTF-8');
echo json_encode($dados, JSON_THROW_ON_ERROR); // header: application/json
```

### Banco de dados

```php
$pdo = new PDO('mysql:host=localhost;dbname=app;charset=utf8mb4', $u, $s, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
$stmt = $pdo->prepare('SELECT id FROM usuarios WHERE email = ?');
$stmt->execute([$email]);
```

### Senhas, tokens e URLs

- `password_hash($pw, PASSWORD_ARGON2ID)` + `password_verify` +
  `password_needs_rehash`.
- `random_int`/`random_bytes`/`Random\Randomizer` para segredos.
- URLs de entrada: `Uri\Rfc3986\Uri` ou `Uri\WhatWg\Url` — a extensão é sempre
  disponível no 8.5 (`source/UPGRADING:865-868`).

### Erros

`display_errors=Off`, `log_errors=On`, `error_log_mode=0640`. Fatais agora
incluem backtrace; use `zend.exception_ignore_args` e
`#[\SensitiveParameter]` (`docs/fatal_error_backtraces.txt:55-72`).

## Verificação

- Teste de input inválido deve lançar `Filter\FilterFailedException`.
- `php --ini=diff` confirma INIs de segurança.
