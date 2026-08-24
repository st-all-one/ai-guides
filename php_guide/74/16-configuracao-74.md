Complementar ao documento comum — específico do PHP 7.4.

# Configuração (PHP 7.4)

O documento comum de configuração (7.2) já explica `php.ini`, `ini_get`,
`ini_set`, `.user.ini` e as diretivas baseline. Aqui listamos as **diretivas nova
ou relevantes no PHP 7.4 e 7.3** que afetam segurança, logs e performance.

> Fora de escopo: diretivas de 8.x (ex.: `zend.assertions` já existia no 7.0).

## 1. Novas diretivas do PHP 7.4

### `opcache.preload` e `opcache.preload_user`

Introduzidas no 7.4 para o **preloading** do OPcache. Documentadas em detalhe em
`15-performance-74.md`. Resumo:

```ini
opcache.preload=/var/www/app/preload.php
opcache.preload_user=www-data
```

### `zend.exception_ignore_args` (PHP 7.4)

`bool`. Quando `On` (1), **exclui os argumentos dos stack traces** gerados por
exceções. Útil para evitar vazamento de dados sensíveis (senhas, tokens) em
logs de erro.

```ini
; php.ini — recomendado em produção
zend.exception_ignore_args=On
```

```php
<?php
ini_set('zend.exception_ignore_args', '1'); // em runtime (se permitido)
```

Note que isso reduz a capacidade de depuração (os valores dos argumentos não
aparecem no trace). Em desenvolvimento, mantenha `Off` para ver os argumentos.

## 2. Diretivas de log do 7.3 (`syslog.*`)

Disponíveis desde o PHP 7.3 e válidas no 7.4. Afetam `error_log` quando definido
como `"syslog"` e chamadas a `syslog()`. Detalhes em `17-logs-74.md`.

| Diretiva | Desde | Descrição |
|---|---|---|
| `syslog.facility` | 7.3 | tipo de programa que está logando |
| `syslog.ident` | 7.3 | string de identidade prefixada a cada mensagem |
| `syslog.filter` | 7.3 | filtro de caracteres enviados ao syslog |

```ini
error_log=syslog
syslog.ident=minha-app
syslog.facility=LOG_LOCAL0
syslog.filter=no-ctrl
```

> `syslog.filter=raw` ficou disponível a partir do PHP 7.3.8 / 7.4.0.

## 3. Recapo de diretivas relevantes do baseline (ainda válidas)

| Diretiva | Escopo | Nota |
|---|---|---|
| `error_reporting` | comum | `E_ALL` em dev |
| `display_errors` | comum | `Off` em produção |
| `log_errors` / `error_log` | comum | destino do log |
| `expose_php` | comum | `Off` em produção |
| `default_charset` | comum | `UTF-8` |
| `zend.assertions` | 7.0 | `-1` remove asserts em produção |
| `session.cookie_samesite` | 7.3 | mitiga CSRF |
| `session.cookie_secure`/`httponly` | comum | cookies seguros |
| `opcache.*` | comum + 7.4 | preload (7.4) |

## 4. `declare` e checagem de tipo (revisão)

`declare(strict_types=1)` continua por arquivo. No 7.4 você pode combiná-lo com
propriedades tipadas e covariância/contravariância de tipos (vide `11-tipagem-74.md`).

```php
<?php
declare(strict_types=1);

function somar(int $a, int $b): int
{
    return $a + $b;
}
```

## 5. `.user.ini` e runtime

Nada mudou no 7.4 quanto a `.user.ini` (CGI/FastCGI) e `ini_set`. Lembrete:
muitas diretivas deste documento (`opcache.preload`, `syslog.*`) têm nível
`PHP_INI_SYSTEM`/`PHP_INI_PERDIR` e **só podem ser definidas no php.ini** (ou
`.user.ini`, conforme o caso) — não via `ini_set()` em runtime.

```php
<?php
// Estas NÃO podem ser alteradas em runtime:
// ini_set('opcache.preload', '...');          // sem efeito
// ini_set('syslog.filter', 'no-ctrl');         // depende do nível; em geral php.ini
```

## 6. Diretrizes

- Em produção: `display_errors=Off`, `log_errors=On`, `expose_php=Off`,
  `zend.exception_ignore_args=On`.
- Configure preloading no `php.ini` (`opcache.preload`/`opcache.preload_user`) —
  apenas produção, processo persistente, não Windows.
- Use `syslog.ident`/`syslog.facility`/`syslog.filter` quando `error_log=syslog`.
- Valores de nível `PHP_INI_SYSTEM` devem ir no `php.ini`, não em `ini_set`.
- Defina `default_charset=UTF-8` para consistência de escape/validação.

## 7. Resumo

- **7.4:** `opcache.preload`, `opcache.preload_user`, `zend.exception_ignore_args`.
- **7.3:** `syslog.facility`, `syslog.ident`, `syslog.filter`.
- Diretivas de sistema vão no `php.ini`; combine com as práticas de baseline.
