# Configuração básica no PHP 8.5

Três superfícies: `php.ini` (SAPI), `declare()` (arquivo) e variáveis de
ambiente (segredos). Nunca coloque segredos em `php.ini` versionado.

## Fontes

- `docs/cli-ini-diff.txt`, `docs/max_memory_limit.txt`.
- `source/UPGRADING:52-54,949-979`.

### Inspeção

```bash
php --ini
php --ini=diff
php -i
```

`--ini=diff` é novo no 8.5 e mostra só o que difere do default embutido
(`docs/cli-ini-diff.txt`).

### Segurança mínima

```ini
expose_php=Off
display_errors=Off
log_errors=On
allow_url_include=Off
session.cookie_secure=On
session.cookie_httponly=On
session.cookie_samesite=Lax
register_argc_argv=0
```

Remova `disable_classes` — foi removido no 8.5 (`source/UPGRADING:52-54`).

### Estabilidade

```ini
memory_limit=256M
max_memory_limit=512M
max_execution_time=30
fatal_error_backtraces=On
```

`max_memory_limit` é `INI_SYSTEM` e não muda em runtime
(`docs/max_memory_limit.txt`).

### Código

```php
declare(strict_types=1);
```

### Auditoria de configuração

Compare `php --ini=diff` com o baseline da imagem e registre diferençasno inventário de configuração.

## Verificação

- `php --ini=diff`; `php -l`; `php-fpm8.5 -t`.
