# Segurança no PHP 8.5

A mudança de segurança mais relevante do 8.5 é a extensão **URI**, sempre
disponível, que substitui `parse_url()` em contextos de confiança. Em seguida
vêm `FILTER_THROW_ON_FAILURE`, o teto `max_memory_limit` e a remoção de
`disable_classes`. Todos os controles do 8.4 (password_hash, CSPRNG, sodium,
prepared statements, escaping, sessões seguras) continuam obrigatórios.

## Fontes

- `source/ext/uri/php_uri.stub.php` (API das classes URI).
- `source/ext/filter/filter.c` (comportamento da flag de exceção).
- `source/UPGRADING`, `source/NEWS` (mudanças e correções da branch).
- `docs/filter-validation-throw-exception.txt`, `docs/max_memory_limit.txt`.

### Extensão URI: análise segura de URLs

A extensão `uri` é **sempre habilitada** no 8.5 e implementa RFC 3986
(`Uri\Rfc3986\Uri`, base uriparser) e WHATWG URL (`Uri\WhatWg\Url`, base
Lexbor) (`source/UPGRADING:865-868`). As classes são `final readonly`, com
métodos `with*` que retornam novas instâncias
(`source/ext/uri/php_uri.stub.php:28-96,152-220`).

```php
<?php
declare(strict_types=1);

use Uri\Rfc3986\Uri;
use Uri\WhatWg\Url;

$uri = new Uri('https://php.net/releases/8.5/en.php');
echo $uri->getHost();   // php.net (RFC 3986 tem getHost())
echo $uri->getScheme(); // https

// WHATWG separa host ASCII (allowlist) de Unicode (exibição).
$url = new Url('https://exemplo.com/caminho');
echo $url->getAsciiHost(); // exemplo.com

$base = new Uri('https://exemplo.com/docs/');
echo $base->resolve('../seguro')->toString(); // https://exemplo.com/seguro
```

**Diferenças práticas:**

| API | Uso | Fonte |
| --- | --- | --- |
| `Uri\Rfc3986\Uri` | URI genérico, `getRaw*`/`get*`, `equals()` com `UriComparisonMode` | `source/ext/uri/php_uri.stub.php:30-96` |
| `Uri\WhatWg\Url` | URLs web, IDNA (ASCII/Unicode), `$errors`/`$softErrors`, serialização | `source/ext/uri/php_uri.stub.php:100-220` |
| `parse_url()` | legado permissivo, sem validação nem normalização | `https://www.php.net/releases/8.5/en.php` |

Segurança operacional:

- **`Url` não tem `getHost()`**: use `getAsciiHost()` para allowlist e
  `getUnicodeHost()` para exibição (`source/ext/uri/php_uri.stub.php:175-177`).
  `Uri\Rfc3986\Uri` expõe `getHost()`/`getRawHost()`
  (`source/ext/uri/php_uri.stub.php:56-58`).
- `parse()` retorna `?static` (null em falha); o construtor lança exceção
  (`source/ext/uri/php_uri.stub.php:32-34,156-159`). Escolha uma estratégia e
  trate o erro — nunca ignore o retorno.
- Credenciais em `withUserInfo()`/`withPassword()` usam
  `#[\SensitiveParameter]` e não aparecem em backtraces
  (`source/ext/uri/php_uri.stub.php:46,173`).
- `$softErrors` (parâmetro por referência) traz `UrlValidationError` com
  `context`, `type` e `failure` (`source/ext/uri/php_uri.stub.php:109-149`).
  Trate `failure=true` como invalidante em contexto de segurança.
- `equals()` ignora o fragmento por padrão (`ExcludeFragment`); para decisões
  de autorização use `IncludeFragment` (`source/ext/uri/php_uri.stub.php:21-25,84`).
- `FILTER_VALIDATE_URL` aceita a opção `uri_parser_class` — o padrão é o
  legado `parse_url`, mais permissivo (`source/ext/filter/logical_filters.c:93,613-619`).
- Após `resolve()` com base remota, revalide esquema e host: resolução
  relativa é vetor clássico de SSRF (`source/ext/uri/php_uri.c:772-782`).
- **Atualize para 8.5.13 ou superior**: branch corrigiu `CVE-2026-48841`,
  `CVE-2026-129438` (uriparser/serialização, `source/NEWS:372-377`) e CVEs de
  sessão `CVE-2026-126714`, `CVE-2026-115560`, `CVE-2026-129481`
  (`source/NEWS:314-322`).

### Validação de entrada com exceções

`FILTER_THROW_ON_FAILURE` faz `filter_*` lançar `Filter\FilterFailedException`
em vez de retornar `false` (`source/UPGRADING:265-270`). É incompatível com
`FILTER_NULL_ON_FAILURE`: usá-los juntos lança `ValueError` mesmo para valor
válido (`docs/filter-validation-throw-exception.txt`). Afeta apenas
`FILTER_VALIDATE_*`, não `FILTER_SANITIZE_*`.

```php
<?php
declare(strict_types=1);

use Filter\FilterFailedException;

try {
    $email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL, FILTER_THROW_ON_FAILURE);
    $idade = filter_var($_POST['idade'] ?? '', FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 0, 'max_range' => 150],
        'flags' => FILTER_THROW_ON_FAILURE,
    ]);
} catch (FilterFailedException $e) {
    http_response_code(422);
    error_log('validacao falhou: ' . $e->getMessage()); // sem valor bruto
}
```

Armadilhas auditadas no código-fonte do filtro:

- A flag **tem precedência sobre `options['default']`** em `filter_input()`:
  chave ausente lança exceção mesmo com default definido
  (`source/ext/filter/filter.c:704-745`).
- `filter_var_array()`/`filter_input_array()` com definição por chaves **não
  lançam** para chaves ausentes — inserem `null` silenciosamente
  (`source/ext/filter/filter.c:624-674`). Verifique presença explicitamente.
- A mensagem inclui o valor que falhou
  (`source/ext/filter/filter.c:289-303`): nunca a envie ao cliente e evite
  registrá-la em logs públicos se houver PII.
- `FILTER_CALLBACK` não é afetado pela flag; o callback deve lançar a própria
  `Filter\FilterFailedException`
  (`docs/filter-validation-throw-exception.txt:99-119`).
- `FILTER_REQUIRE_ARRAY`/`FILTER_REQUIRE_SCALAR` fixam a forma dos dados e
  evitam "array injection" em parâmetros escalares
  (`source/ext/filter/filter.c:569-608`).

### Teto de memória: `max_memory_limit`

Nova diretiva `PHP_INI_SYSTEM`, padrão `-1` (desativada), que limita o maior
valor que `memory_limit` pode assumir (`main/main.c:889-890`). Ultrapassar o
teto emite `E_WARNING` e fixa `memory_limit` no teto; `-1` com teto finito
também é limitado (`docs/max_memory_limit.txt`).

```ini
; php.ini — carregado apenas no startup do SAPI
max_memory_limit=512M
memory_limit=256M
```

```php
ini_set('memory_limit', '300M'); // aviso; vira 512M se teto = 512M
ini_set('memory_limit', '-1');   // limitado ao teto
```

Use como defesa em ambientes multi-tenant: um script não pode escapar do teto
via `ini_set`. Como é `INI_SYSTEM`, configure no `php.ini` ou `-d` do FPM/CLI.
A correção do bug GH-17951 ("memory_limit is not always limited by
max_memory_limit") está na linha 8.5 (`source/NEWS:1706-1707`).

### Sessões no 8.5

- Chaves de `$_SESSION` contendo `|` geram `E_WARNING` e falha de escrita
  (`source/UPGRADING:152-154`).
- `session.use_strict_mode=1`, `cookie_secure`, `cookie_httponly`,
  `cookie_samesite` — o próprio `php.ini-production` recomenda strict mode.
- CHIPS: chave `partitioned` em `session_set_cookie_params()`/`session_start()`;
  combinar com `secure=0` gera aviso e o cookie não é enviado
  (`source/UPGRADING:297-300`).
- Use `session.serialize_handler` consistente entre aplicações que compartilham
  `session.save_path` (correções RCE na branch, `source/NEWS:314-322`).

### Remoções e depreciações com impacto de segurança

| Item | Ação | Fonte |
| --- | --- | --- |
| `disable_classes` removido | use `disable_functions`, `open_basedir`, isolamento de processo | `source/UPGRADING:52-54` |
| `-z` / `--zend-extension` removido (CLI/CGI) | carregue extensões via `php.ini` | `docs/cli-cgi-z-option-removed.txt` |
| DSN `uri:` depreciado | DSNs remotos são risco; use caminho local | `source/UPGRADING:479-480` |
| `$key_length` de `openssl_pkey_derive()` depreciado | ignorado ou trunca a chave — vulnerabilidade | `source/UPGRADING:472-476` |
| `MHASH_*` depreciadas | `hash()`/`hash_hmac()` com nomes de algoritmo | `source/UPGRADING:446-448` |
| Backtick depreciado | `shell_exec()` explicitamente (ou evite shell) | `source/UPGRADING:377-378` |
| `curl_close`/`curl_share_close` depreciados | limpeza automática; **`curl_multi_close()` não foi deprecado** | `source/UPGRADING:414-420` |
| `socket_set_timeout` deprecado | `stream_set_timeout()` | `source/UPGRADING:574-576` |
| `xml_parser_free` deprecado | limpeza automática | `source/UPGRADING:592-594` |
| Output em output buffer handler deprecado | retorne a string; não faça `echo` | `source/UPGRADING:363-367` |
| `$_SERVER['argc'/'argv']` via query string deprecado | `register_argc_argv=0`; use `$_GET` | `source/UPGRADING:403-407` |
| `$http_response_header` deprecado | `http_get_last_response_headers()` | `source/UPGRADING:587-589` |
| `allow_url_include` em depreciação | não confie nele como defesa única | `main/main.c:2440-2446` |

### Persistent cURL share handles — segurança de estado compartilhado

`curl_share_init_persistent()` cria um handle que sobrevive ao request e é
reutilizado quando as opções de compartilhamento são iguais
(`source/UPGRADING:753-755`). Compartilhe apenas `CURL_LOCK_DATA_DNS` e
`CURL_LOCK_DATA_CONNECT` (`https://www.php.net/releases/8.5/en.php`). Nunca
compartilhe cookies entre tenants.

```php
$share = curl_share_init_persistent([CURL_LOCK_DATA_DNS, CURL_LOCK_DATA_CONNECT]);
$ch = curl_init('https://api.exemplo.com/v1');
curl_setopt($ch, CURLOPT_SHARE, $share);
// Não chame curl_close(): depreciado no 8.5. curl_multi_close() continua válido.
```

### Checklist de segurança 8.5

- [ ] PHP 8.5.**13+** (CVEs do parser URI e de sessão corrigidas).
- [ ] URLs de entrada via `Uri\` com `uri_parser_class` explícito.
- [ ] `filter_*` com `FILTER_THROW_ON_FAILURE`; jamais combinar com
      `FILTER_NULL_ON_FAILURE`; chaves ausentes verificadas à mão.
- [ ] `max_memory_limit` definido no startup do SAPI.
- [ ] Sessão strict/secure/httponly/samesite, serializador consistente.
- [ ] Nenhuma dependência de `disable_classes`, DSN `uri:`, backtick,
      `MHASH_*`, `$key_length`, `$http_response_header`.
- [ ] Senha com `password_hash(..., PASSWORD_ARGON2ID)`, tokens com
      `random_int`/`Randomizer`, SQL preparado, output escapado.
- [ ] Share handle cURL persistente sem cookies entre usuários.
- [ ] `display_errors=Off`, `log_errors=On`, `error_log_mode=0640`.

## Verificação

- `php --ini=diff` confirma `max_memory_limit` e demais INIs efetivos.
- Validação: `filter_var('x', FILTER_VALIDATE_EMAIL, FILTER_THROW_ON_FAILURE)`
  deve lançar `Filter\FilterFailedException`.
- URL: `new Uri('http://[bad')` deve lançar `Uri\InvalidUriException`;
  `Uri::parse()` deve retornar `null`.
