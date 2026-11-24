# Configuração web e php.ini no PHP 8.5

Este capítulo é a referência de configuração para produção. Ele consolida os
valores recomendados e as mudanças do 8.5. Aplique em `php.ini` do FPM/Apache,
não confie em `.htaccess` para diretivas `INI_SYSTEM`.

## Fontes

- `source/UPGRADING:52-54,949-979` (INI: remoção e adições).
- `docs/max_memory_limit.txt`, `docs/fatal_error_backtraces.txt`,
  `docs/cli-ini-diff.txt`.
- `source/NEWS:43-51,99-113,372-377` (CVEs corrigidas na 8.5.13).

**Piso de patch:** 8.5.13 é security release (19/11/2026) — corrige UAFs em
backtraces de métodos mágicos (CVE-2026-129474), UAF no shutdown
(CVE-2026-129182), UAF epoll do FPM com escalada local (CVE-2026-129291),
request smuggling (CVE-2026-129289), XSS no status do FPM (CVE-2026-129292),
OOB no PATH_INFO do CGI (CVE-2026-129538) e CVEs do parser URI
(`source/NEWS:43-51,99-113,372-377`). Restrinja o endpoint de status do FPM.

### Piso de patch e contexto de segurança

Fixe `8.5.13` como versão mínima na imagem de build. O anúncio
`https://news-web.php.net/php.announce/515` classifica 8.5.13 como security
release; o cabeçalho `source/NEWS:3` ainda está com data não preenchida na
árvore de desenvolvimento, portanto não é fonte de data.

## Novas e alteradas diretivas no 8.5

| Diretiva | Estado 8.5 | Impacto | Fonte |
| --- | --- | --- | --- |
| `max_memory_limit` | nova, `INI_SYSTEM`, default `-1` | teto para `memory_limit`; aviso + clamp se excedido | `source/UPGRADING:953-956` |
| `fatal_error_backtraces` | nova, default On | erros fatais incluem stack trace | `docs/fatal_error_backtraces.txt` |
| `disable_classes` | **removida** | falha de startup se ainda presente | `source/UPGRADING:52-54` |
| `opcache.file_cache_read_only` | nova | suporta filesystem somente-leitura | `source/UPGRADING:959-968` |
| `opcache.jit_hot_loop` | default **61** (primo) | evita múltiplos do tamanho do loop | `source/UPGRADING:969-971` |
| `opcache.memory_consumption` | falha reportada se alterada com SHM ativo | antes silencioso | `source/UPGRADING:972-974` |
| `openssl.libctx` | nova | contexto OpenSSL por thread ou global | `source/UPGRADING:976-979` |
| `intl.error_level` | depreciada | use `intl.use_exceptions=1` | `source/UPGRADING:450-454` |
| `report_memleaks` | depreciada | remova | `source/UPGRADING:382-383` |
| `register_argc_argv` | depreciação do comportamento em SAPIs não-CLI | configure `0` | `source/UPGRADING:403-407` |
| `fastcgi.script_path_encoded` | nova (FPM) | controla decodificação de `ProxyPass` | `source/UPGRADING:353-356` |

## Segurança

### Diretivas de segurança

```ini
; php.ini — PHP 8.5 (FPM/Apache)
expose_php = Off
display_errors = Off
display_startup_errors = Off
log_errors = On
error_log = /var/log/php/php-error.log
error_log_mode = 0640
html_errors = Off
doc_root =
user_dir =

allow_url_fopen = Off          ; se a aplicação não usa
allow_url_include = Off
open_basedir = /var/www/app:/tmp

disable_functions = exec,shell_exec,system,passthru,proc_open,popen,pcntl_exec

session.cookie_secure = On
session.cookie_httponly = On
session.cookie_samesite = Lax
session.use_strict_mode = On
session.use_only_cookies = On
session.gc_probability = 1
session.gc_divisor = 100

cgi.fix_pathinfo = 0
register_argc_argv = 0
intl.use_exceptions = 1
max_memory_limit = 512M
```

> `disable_classes` NÃO existe mais no 8.5 — remova a linha do php.ini
> (`source/UPGRADING:52-54`). Use `disable_functions` e isolamento de processo.

## Performance

### OPcache e JIT

```ini
; OPcache é sempre compilado e carregado no 8.5; enable/enable_cli ainda valem.
opcache.enable = 1
opcache.enable_cli = 0
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 0    ; exige deploy que limpa o cache
opcache.revalidate_freq = 60
opcache.preload = /var/www/app/preload.php
opcache.preload_user = www-data
opcache.jit = tracing              ; meça: I/O-bound costuma não ganhar
opcache.jit_buffer_size = 64M
opcache.jit_hot_loop = 61          ; novo default no 8.5
realpath_cache_size = 4096K
realpath_cache_ttl = 600
zend.assertions = -1
```

OPcache passa a ser sempre incluído no binário e carregado; as diretivas
`opcache.enable` e `opcache.enable_cli` continuam sendo respeitadas
(`source/UPGRADING:860-863`). Para containers com filesystem somente leitura,
`opcache.file_cache_read_only=1` combina com `validate_timestamps=0` e
`enable_file_override=1` (`source/UPGRADING:959-968`).

## Estabilidade e observabilidade

```ini
memory_limit = 256M               ; <= max_memory_limit
max_execution_time = 30
max_input_time = 60
max_input_vars = 1000
post_max_size = 8M                ; >= upload_max_filesize
upload_max_filesize = 2M
max_file_uploads = 20
default_socket_timeout = 60
fatal_error_backtraces = On
zend.exception_ignore_args = On   ; evita vazar args em logs
zend.exception_string_param_max_len = 0
```

`fatal_error_backtraces` é On por padrão e pode ser desligado, mas a proteção
recomendada em produção é `display_errors=Off` — não desligue os backtraces
como única medida (`docs/fatal_error_backtraces.txt`). Parâmetros marcados com
`#[\SensitiveParameter]` não revelam conteúdo; `zend.exception_ignore_args`
remove todos os argumentos dos traces.

## FPM e pools

### Parâmetros de pool

```ini
; pool www
pm = dynamic
pm.max_children = 20
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests = 500
request_terminate_timeout = 35s
slowlog = /var/log/php/fpm-slow.log
request_slowlog_timeout = 5s
access.log = /var/log/php/fpm-access.log
```

No 8.5, o FPM passa a respeitar `log_limit` no access log e adiciona
`fastcgi.script_path_encoded` para o comportamento de `ProxyPass`
(`source/UPGRADING:353-356`).

## Validação

### Comandos de validação

```bash
php -l /etc/php/8.5/fpm/php.ini    # sintaxe do ini (quando aplicável)
php-fpm8.5 -t                      # config do FPM
php --ini                          # arquivos carregados
php --ini=diff                     # só diretivas diferentes do default
php -i | grep -E 'max_memory_limit|fatal_error_backtraces|opcache.jit'
```

`php --ini=diff` é novo no 8.5 e lista apenas diretivas alteradas
(`docs/cli-ini-diff.txt`) — ideal para auditoria de configuração em tickets e
pipelines. Em versões anteriores o comando era equivalente a `--ini`.

## Checklist de deploy

- [ ] Versão fixada em 8.5.**13+** (CVEs do parser URI corrigidas).
- [ ] `disable_classes` removido; `register_argc_argv=0`.
- [ ] `max_memory_limit` <= limite do container e `memory_limit` <= teto.
- [ ] OPcache habilitado, `zend.assertions=-1`, JIT medido antes de ligar.
- [ ] `display_errors=Off`, `log_errors=On`, `html_errors=Off`.
- [ ] Sessões `secure`/`httponly`/`samesite`/`use_strict_mode`.
- [ ] `php-fpm8.5 -t` e `php --ini=diff` executados no deploy.

```php
// leitura dos INIs efetivos no startup
$limite = ini_get('max_memory_limit');
$trace  = ini_get('fatal_error_backtraces');
```
