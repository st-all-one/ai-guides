# Configuração no PHP 8.5

Este capítulo descreve como aplicar e inspecionar configuração no PHP 8.5.
A novidade operacional é `php --ini=diff`, que reduz drasticamente o tempo de
diagnóstico de bugs relacionados a INI. A novidade de segurança é
`max_memory_limit`, uma diretiva `INI_SYSTEM` que não pode ser alterada em
runtime.

## Fontes

- `docs/cli-ini-diff.txt`, `docs/max_memory_limit.txt`.
- `source/UPGRADING:52-54,949-979`.

### Classes de diretivas

| Classe | Onde pode mudar | Exemplo no 8.5 |
| --- | --- | --- |
| `INI_SYSTEM` | apenas startup (`php.ini`, `-d`, FPM) | `max_memory_limit` |
| `INI_ALL` | startup + runtime (`ini_set`, `.htaccess` quando permitido) | `memory_limit`, `error_reporting` |
| `PHP_INI_PERDIR` | `php.ini`, `.htaccess`, `httpd.conf` | `session.cookie_secure` |
| `PHP_INI_ONLY` | `php.ini` | `open_basedir`, `disable_functions` |

`max_memory_limit` é `INI_SYSTEM`: `ini_set('max_memory_limit', ...)` não tem
efeito (`docs/max_memory_limit.txt`).

### Inspecionando configuração efetiva

```bash
php --ini                        # arquivos carregados
php --ini=diff                   # só o que difere do default embutido
php -d date.timezone=UTC --ini=diff
php -n --ini=diff                # sem php.ini
php -c /etc/php/8.5/cli --ini=diff
php --ini=diff | grep max_memory_limit
```

`--ini=diff` imprime pares `chave: "default" -> "efetivo"` e funciona com
`-n`, `-c` e `-d` (`docs/cli-ini-diff.txt`). Não há formato
machine-readable — para pipelines, use `php -i` ou `php -r 'echo ini_get(...);'`.
Em versões anteriores ao 8.5 o sinalizador não gera erro, mas se comporta
como `--ini`.

### Configurando `max_memory_limit`

```ini
; php.ini (startup)
max_memory_limit=512M
memory_limit=256M
```

```php
ini_get('max_memory_limit'); // "512M"
ini_set('memory_limit', '600M');
// Warning: Failed to set memory_limit ... Setting to max_memory_limit instead
ini_get('memory_limit'); // "512M"
```

Regras: valores abaixo ou iguais ao teto são aceitos; valores maiores (ou
`-1` com teto finito) geram aviso e são fixados no teto
(`docs/max_memory_limit.txt`). Default `-1` desativa a restrição, mantendo
compatibilidade com versões anteriores.

### Remoções e mudanças que afetam config

- `disable_classes` **removido** — retire do php.ini
  (`source/UPGRADING:52-54`).
- `-z` / `--zend-extension` removido em CLI/CGI — carregue extensões via
  `php.ini` (`docs/cli-cgi-z-option-removed.txt`).
- `report_memleaks` depreciado (`source/UPGRADING:382-383`).
- `intl.error_level` depreciado; use `intl.use_exceptions=1`
  (`source/UPGRADING:450-454`).
- `register_argc_argv`: configurar `0` e trocar `$_SERVER['argc'/'argv']`
  por `$_GET`/`QUERY_STRING` (`source/UPGRADING:403-407`).
- `openssl.libctx` novo: contexto OpenSSL global ou por thread
  (`source/UPGRADING:976-979`).
- `fastcgi.script_path_encoded` novo no FPM (`source/UPGRADING:353-356`).

### `declare(strict_types=1)` e constantes

`declare(strict_types=1)` continua sendo por arquivo e afeta chamadas de
função; nada mudou no 8.5. Novidades que afetam configuração de código:

- casts em expressões constantes (`source/UPGRADING:199`);
- atributos em constantes de compile-time não-classe
  (`source/UPGRADING:200-201`).

### Exemplo de validação em CI

```bash
set -eu
php -v | grep -q '^PHP 8\.5\.' || { echo 'PHP 8.5 exigido'; exit 1; }
php --ini=diff > /tmp/ini-diff.txt
! grep -qi 'disable_classes' /tmp/ini-diff.txt
php -r 'exit(ini_get("max_memory_limit") === false ? 1 : 0);'
php -r 'exit(function_exists("get_error_handler") ? 0 : 1);'
```

## Verificação

- `php --ini=diff` sem ValueError e sem diretivas legadas.
- `php -r 'var_dump(ini_get("max_memory_limit"));'` retorna o teto definido.
- `php-fpm8.5 -t` para configur pools.
