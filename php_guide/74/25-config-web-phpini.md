Complementar ao documento comum — específico do PHP 7.4.

# Configuração Web e `php.ini` para PHP 7.4

Guia dedicado de configuração com foco em **segurança, performance e
estabilidade** para o contexto de SAPI web (FPM/CGI) no PHP 7.4. Todo o conteúdo
refere-se a diretivas válidas nessa versão; inclui recursos novos no 7.3/7.4.

> Aviso de escopo: nada aqui é específico de versões 8.x. A diretiva
> `opcache.preload` e `session.cookie_samesite` pertencem ao 7.4/7.3 e são
> tratadas aqui. Recursos de otimização que surgiram em versões mais recentes
> não são abordados.

## 1. Segurança

| Diretiva | Valor recomendado | Justificativa |
|---|---|---|
| `expose_php` | `Off` | oculta a versão do PHP no cabeçalho `X-Powered-By` |
| `display_errors` | `Off` (prod) / `On` (dev) | não vaze stack traces ao usuário |
| `log_errors` | `On` | registre erros para análise (vide `06-logs.md`) |
| `error_log` | caminho fora do docroot | destino dos logs de erro |
| `allow_url_fopen` | `Off` (quando possível) | reduz risco de SSRF via `fopen` remoto |
| `allow_url_include` | `Off` | impede `include`/`require` de URLs |
| `open_basedir` | diretório da app | limita acesso do filesystem |
| `disable_functions` | `exec,passthru,shell_exec,system,proc_open,popen` | remove funções perigosas não usadas |
| `session.cookie_secure` | `On` (HTTPS) | cookie só via TLS |
| `session.cookie_httponly` | `On` | impede acesso via script do lado cliente |
| `session.cookie_samesite` | `Lax` (ou `Strict`) | mitiga CSRF via cookie (7.3+) |
| `session.use_strict_mode` | `On` | rejeita IDs de sessão não gerados pelo servidor |
| `session.cookie_lifetime` | `0` (até fechar) ou valor curto | limita janela de roubo de sessão |
| `cgi.fix_pathinfo` | `0` | fecha vulnerabilidade de path info no FPM/nginx |

Valores possíveis de `session.cookie_samesite` (7.3+): `Lax`, `Strict` ou
`None` (este último exige `cookie_secure=On`). Use `Lax` como padrão seguro.

Exemplo de bloco:

```ini
expose_php = Off
display_errors = Off
log_errors = On
error_log = /var/log/php/php-error.log
allow_url_fopen = Off
allow_url_include = Off
open_basedir = /var/www/app:/tmp
disable_functions = "exec,passthru,shell_exec,system,proc_open,popen"
session.cookie_secure = On
session.cookie_httponly = On
session.cookie_samesite = Lax
session.use_strict_mode = On
session.cookie_lifetime = 0
cgi.fix_pathinfo = 0
```

### Hash de senhas (Argon2id no 7.4)

O PHP 7.4 suporta `PASSWORD_ARGON2ID` (introduzido no 7.3) além de BCRYPT e
Argon2i. Exemplo:

```php
<?php
$hash = password_hash('senha-do-usuario', PASSWORD_ARGON2ID);

if (password_verify('senha-do-usuario', $hash)) {
    echo 'senha correta';
}

// Recomendado: verificar se o hash precisa de recálculo (custo/parâmetros)
if (password_needs_rehash($hash, PASSWORD_ARGON2ID)) {
    $hash = password_hash('senha-do-usuario', PASSWORD_ARGON2ID);
}
```

Algoritmos disponíveis: `PASSWORD_BCRYPT`, `PASSWORD_ARGON2I`,
`PASSWORD_ARGON2ID`. Mantenha segredos fora do código-fonte (variáveis de
ambiente).

## 2. Performance

| Diretiva | Valor recomendado | Justificativa |
|---|---|---|
| `opcache.enable` | `1` | liga o cache de opcode (grande ganho) |
| `opcache.memory_consumption` | `128` (MB) | memória para opcodes |
| `opcache.max_accelerated_files` | `10000` | arquivos cacheados |
| `opcache.revalidate_freq` | `60` | frequência de checagem em dev |
| `opcache.validate_timestamps` | `0` (prod) / `1` (dev) | em prod, evita stat por requisição |
| `opcache.preload` | caminho do script de preload | pré-carrega código em memória (7.4) |
| `opcache.preload_user` | usuário do SAPI | dono dos scripts pré-carregados (7.4) |
| `realpath_cache_size` | `4096K` | cache de caminhos de arquivo |
| `realpath_cache_ttl` | `600` | tempo de vida do cache de caminhos |
| `zend.assertions` | `-1` (prod) / `1` (dev) | em prod, remove asserções |

Exemplo:

```ini
opcache.enable = 1
opcache.memory_consumption = 128
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 60
opcache.validate_timestamps = 0
opcache.preload = /var/www/app/preload.php
opcache.preload_user = www-data
realpath_cache_size = 4096K
realpath_cache_ttl = 600
zend.assertions = -1
```

### Pré-carga (preloading, 7.4)

O `opcache.preload` aponta para um script executado uma vez no startup do SAPI.
Esse script pode usar `opcache_compile_file()` para compilar arquivos em
memória compartilhada, tornando-os disponíveis a todas as requisições sem
`require`.

```php
<?php
// /var/www/app/preload.php
$arquivos = [
    __DIR__ . '/src/Autoloader.php',
    __DIR__ . '/src/Util.php',
];
foreach ($arquivos as $f) {
    opcache_compile_file($f);
}
```

O `opcache.preload_user` define qual usuário do sistema deve possuir os scripts
pré-carregados (necessário quando o SAPI roda como root). Após alterar,
recarregue o serviço (FPM/`systemctl reload`). Em desenvolvimento, mantenha
`opcache.validate_timestamps = 1` para refletir mudanças de arquivo.

## 3. Estabilidade

| Diretiva | Valor recomendado | Justificativa |
|---|---|---|
| `memory_limit` | `128M` (ajuste por app) | teto de memória por script |
| `max_execution_time` | `30` | tempo de CPU por requisição |
| `max_input_time` | `60` | tempo de leitura da entrada |
| `max_input_vars` | `1000` | limita variáveis de entrada (mitiga abuso) |
| `post_max_size` | `8M` (conforme necessário) | teto de POST |
| `upload_max_filesize` | `2M` (menor que post_max_size) | tamanho de upload |
| `max_file_uploads` | `20` | número de arquivos por vez |
| `default_socket_timeout` | `60` | timeout de conexões de rede |

Exemplo:

```ini
memory_limit = 128M
max_execution_time = 30
max_input_time = 60
max_input_vars = 1000
post_max_size = 8M
upload_max_filesize = 2M
max_file_uploads = 20
default_socket_timeout = 60
```

## 4. Aplicação das diretivas

- `php.ini` afeta todo o servidor/SAPI.
- `.user.ini` (no docroot) aplica por diretório quando suportado (FCGI/FPM).
- Após alterar, recarregue o serviço (FPM/`systemctl reload`).

## 5. Resumo

| Tema | Diretivas-chave no 7.4 |
|---|---|
| segurança | `expose_php`, `display_errors`, `allow_url_*`, `disable_functions`, `session.*`, `cgi.fix_pathinfo` |
| performance | `opcache.*` (incl. `preload`), `realpath_cache_*`, `zend.assertions` |
| estabilidade | `memory_limit`, `max_execution_time`, `post_max_size`, `upload_max_filesize` |
| FPM/nginx | `cgi.fix_pathinfo = 0` |
