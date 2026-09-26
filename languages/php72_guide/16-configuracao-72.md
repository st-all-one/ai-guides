Complementar ao documento comum — específico do PHP 7.2.

# Configuração do PHP 7.2 (além do básico)

Este suplemento cobre a configurabilidade do 7.2. Todo o conteúdo é válido em
7.2.

> Aviso de escopo: **não** existem nesta versão determinadas diretivas de
> configuração nativas introduzidas em versões posteriores. Os exemplos respeitam
> o limite do 7.2.

## 1. `php.ini` e alteração em tempo de execução

O PHP carrega `php.ini` no startup. Muitas diretivas podem ser alteradas por
script com `ini_set()` (escopo da requisição) ou lidas com `ini_get()`.

```php
<?php
// Ler
$display = ini_get('display_errors');

// Alterar (apenas diretivas com modo PHP_INI_USER/PERDIR em tempo de execução)
ini_set('display_errors', '0');
ini_set('error_reporting', (string) E_ALL);

// Valor original do php.ini (ignora overrides em runtime)
var_dump(get_cfg_var('memory_limit'));
```

### `.user.ini` (por diretório)

Em SAPIs CGI/FastCGI, arquivos `.user.ini` aplicam diretivas por diretório
(modo `PHP_INI_PERDIR`). Útil em hospedagem compartilhada.

```ini
; .user.ini
upload_max_filesize = 20M
post_max_size = 22M
display_errors = Off
```

## 2. Diretivas essenciais

| Diretiva | Escopo | Notas 7.2 |
|---|---|---|
| `error_reporting` | PHP_INI_ALL | nível de erros reportados |
| `display_errors` | PHP_INI_ALL | mostra erros no output (off em produção) |
| `display_startup_errors` | PHP_INI_ALL | erros de inicialização do PHP |
| `log_errors` | PHP_INI_ALL | registra erros em log |
| `error_log` | PHP_INI_ALL | destino do log |
| `short_open_tag` | PHP_INI_ALL (perdir) | habilita `<?` (use sempre `<?php`) |
| `expose_php` | php.ini only | remove header `X-Powered-By` (segurança) |
| `max_execution_time` | PHP_INI_ALL | segundos de execução |
| `memory_limit` | PHP_INI_ALL | limite de memória |
| `variables_order` | PHP_INI_ALL | ordem de população de EGPCS |
| `request_order` | PHP_INI_ALL (desde 5.3) | ordem de `$_REQUEST` |
| `default_charset` | PHP_INI_ALL (desde 5.6) | charset padrão (`UTF-8`) |
| `enable_dl` | php.ini only | carga de extensões via `dl()` |
| `zend.assertions` | PHP_INI_ALL (7.0+) | `1` gera, `-1` ignora e remove, `0` não gera |
| `assert.exception` | PHP_INI_ALL (7.0+) | assert falho vira `AssertionError` |
| `session.cookie_secure` | PHP_INI_ALL | cookie só em HTTPS |
| `session.cookie_httponly` | PHP_INI_ALL | cookie inacessível por JS |
| `session.use_strict_mode` | PHP_INI_ALL | recusa IDs externos |
| `zend.enable_gc` | PHP_INI_ALL | ativa coleta de lixo |

## 3. `declare` por arquivo

Instruções `declare` são **por arquivo** e devem aparecer no topo.

```php
<?php
declare(strict_types=1);  // tipagem estrita de argumentos/retorno

declare(ticks=1);        // executa o tick handler a cada statement
register_tick_function(function () {
    // monitoramento leve
});

// Bloco declare (afeta o bloco)
declare(ticks=1) {
    // código monitorado por ticks
}
```

> `declare(strict_types=1)` é por arquivo, não por chamada. O arquivo que
> **define** a função é quem decide o modo para aquela função.

## 4. Asserts (7.0+)

```php
<?php
ini_set('zend.assertions', '1');   // gerar asserts
ini_set('assert.exception', '1');  // lançar AssertionError em falha

assert($x > 0, 'x deve ser positivo'); // lança AssertionError se $x <= 0
```

Em produção, defina `zend.assertions = -1` para que asserts sejam removidos
(zero custo).

## 5. Carga de extensões por nome (7.2)

No 7.2, extensões compartilhadas não exigem a extensão de arquivo no
`php.ini` (nem em `dl()`):

```ini
; php.ini (7.2)
extension=sodium      ; sem .so/.dll
extension=openssl
```

```php
<?php
// Também funciona via dl (quando enable_dl estiver ativo)
dl('sodium');
```

## 6. Boas práticas de configuração

- Produção: `display_errors=Off`, `display_startup_errors=Off`, `log_errors=On`,
  `expose_php=Off`.
- Defina `default_charset=UTF-8` explicitamente.
- Use `.user.ini` apenas onde não puder editar o `php.ini` principal.
- Mantenha `zend.assertions=-1` em produção.
