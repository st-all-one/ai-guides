# Superglobais e entrada no PHP 8.5

O modelo de entrada não mudou, mas o 8.5 adiciona `FILTER_THROW_ON_FAILURE` e
deprecia duas formas de acesso indireto a dados de requisição.

## Fontes

- `docs/filter-validation-throw-exception.txt`.
- `source/UPGRADING:265-270,400-407,587-589,817-820`.

### Validando `$_GET`/`$_POST` com exceção

```php
<?php
declare(strict_types=1);

use Filter\FilterFailedException;

try {
    $pagina = filter_input(INPUT_GET, 'pagina', FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
        'flags' => FILTER_THROW_ON_FAILURE,
    ]);
} catch (FilterFailedException $e) {
    http_response_code(422);
    return;
}
```

`filter_input()` com `FILTER_THROW_ON_FAILURE` lança
`Filter\FilterFailedException` (`source/UPGRADING:265-270`). Para arrays de
entrada, use `filter_input_array()` — a mensagem de erro **não** identifica a
chave que falhou (`docs/filter-validation-throw-exception.txt:75-98`), então
valide cada campo separadamente quando precisar apontar o erro ao usuário.

### Depreciações de entrada

| Padrão antigo | Substituto 8.5 | Fonte |
| --- | --- | --- |
| `$_SERVER['argc']`/`argv` derivados de query string em SAPIs não-CLI | `register_argc_argv=0` + `$_GET`/`QUERY_STRING` | `source/UPGRADING:403-407` |
| `$http_response_header` | `http_get_last_response_headers()` | `source/UPGRADING:587-589` |
| `null` como chave de array / `array_key_exists()` | `''` | `source/UPGRADING:400-402` |
| Chave de `$_SESSION` contendo `|` | evite `|` (agora aviso) | `source/UPGRADING:152-154` |

### Segurança de superglobais

- `$_REQUEST` continua misturando GET/POST/COOKIE — prefira `$_GET`/`$_POST`
  explícitos.
- `$_FILES` exige validação de tipo real (`finfo`), tamanho e nome sanitizado.
- `$_SERVER` contém dados controlados pelo cliente (`HTTP_*`) — nunca use
  `HTTP_REFERER` como controle de acesso.
- Nunca confie em `$_COOKIE` para autorização; use sessão com
  `session.use_strict_mode=On`, `cookie_secure`, `cookie_httponly`,
  `cookie_samesite` (capítulo 25).
- Novo no 8.5: cookies particionados (CHIPS) via chave `partitioned` em
  `session_set_cookie_params()`, `session_start()` e `setcookie()`
  (`source/UPGRADING:297-300,328-329`).

```php
setcookie('tema', 'escuro', [
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax',
    'partitioned' => true,
]);
```

### Uploads e tamanho

`post_max_size` deve ser ≥ `upload_max_filesize`; `max_file_uploads` limita a
quantidade. `max_memory_limit` (novo) impede que `ini_set('memory_limit', -1)`
escape do teto definido no startup (`docs/max_memory_limit.txt`).

## Verificação

- Envie valor inválido a `filter_input()` com a flag: deve lançar
  `Filter\FilterFailedException`.
- `php --ini=diff` deve mostrar `register_argc_argv = 0`.
