# Referência exaustiva de mudanças do PHP 8.5

Catálogo de superfície completa do 8.5 organizado por categoria — funções,
constantes, classes, SAPI, compatibilidade e depreciações. Complementa os
capítulos temáticos (10–17, 26) e foi extraído diretamente do `UPGRADING`
oficial da branch `PHP-8.5.13`.

## Fontes

- `source/UPGRADING` (todas as 14 seções; 272 itens nomeáveis).
- `source/NEWS` (correções e patches da branch).
- `docs/pipe-operator.txt`, `docs/fatal_error_backtraces.txt` (PHP.Watch 8.5).

### Funções adicionadas

| Função/método | Finalidade | Fonte |
| --- | --- | --- |
| `get_error_handler()`, `get_exception_handler()` | ler handlers ativos | `source/UPGRADING:738-743` |
| `clone($obj, $props)` | clonar substituindo propriedades | `source/UPGRADING:744-746` |
| `Closure::getCurrent()` | closure em execução | `source/UPGRADING:747` |
| `curl_multi_get_handles()` | handles de um multi handle | `source/UPGRADING:750-752` |
| `curl_share_init_persistent()` | share handle entre requests | `source/UPGRADING:753-755` |
| `Dom\Element::getElementsByClassName()`, `insertAdjacentHTML()` | DOM moderno | `source/UPGRADING:758-759` |
| `enchant_dict_remove_from_session()`, `enchant_dict_remove()` | dicionários Enchant | `source/UPGRADING:762-765` |
| `locale_is_right_to_left()`, `Locale::isRightToLeft()` | direção RTL | `source/UPGRADING:768-769` |
| `grapheme_levenshtein()` | distância Unicode | `source/UPGRADING:770-771` |
| `opcache_is_script_cached_in_file_cache()` | diagnose do file cache | `source/UPGRADING:773-774` |
| `Pdo\Sqlite::setAuthorizer()` | autorização SQLite | `source/UPGRADING:776-779` |
| `pg_close_stmt()` | fechar prepared statement PostgreSQL | `source/UPGRADING:781-784` |
| `ReflectionConstant::getFileName()`, `getExtension()`, `getExtensionName()`, `getAttributes()` | reflexão de constantes | `source/UPGRADING:786-791` |
| `ReflectionProperty::getMangledName()` | nome privado "mangled" | `source/UPGRADING:792` |
| `Sqlite3Stmt::busy()` | estado de statement | `source/UPGRADING:794-796` |
| `array_first()`, `array_last()` | valores extremos | `source/UPGRADING:798-800` |

### Classes, interfaces e exceções adicionadas

| Tipo | Finalidade | Fonte |
| --- | --- | --- |
| `NoDiscard`, `DelayedTargetValidation` | atributos de core | `source/UPGRADING:806-810` |
| `CurlSharePersistentHandle` | handle persistente | `source/UPGRADING:812-815` |
| `Filter\FilterException`, `Filter\FilterFailedException` | validação | `source/UPGRADING:817-820` |
| `Uri\UriException`, `Uri\UriError`, `Uri\InvalidUriException`, `Uri\UriComparisonMode`, `Uri\Rfc3986\Uri`, `Uri\WhatWg\InvalidUrlException`, `UrlValidationErrorType`, `UrlValidationError`, `Url` | URI/WHATWG | `source/UPGRADING:822-827` |

### Constantes globais adicionadas

| Grupo | Constantes | Fonte |
| --- | --- | --- |
| Build | `PHP_BUILD_DATE`, `PHP_BUILD_PROVIDER` (condicional) | `source/UPGRADING:885-887` |
| cURL | `CURLINFO_USED_PROXY`, `CURLINFO_HTTPAUTH_USED`, `CURLINFO_PROXYAUTH_USED`, `CURLINFO_CONN_ID`, `CURLINFO_QUEUE_TIME_T`, `CURLOPT_INFILESIZE_LARGE`, `CURLFOLLOW_ALL`, `CURLFOLLOW_OBEYCODE`, `CURLFOLLOW_FIRSTONLY` | `source/UPGRADING:889-898` |
| Filter | `FILTER_THROW_ON_FAILURE` | `source/UPGRADING:900-901` |
| Intl | `DECIMAL_COMPACT_SHORT`, `DECIMAL_COMPACT_LONG` | `source/UPGRADING:903-905` |
| OpenSSL | `OPENSSL_PKCS1_PSS_PADDING`, `PKCS7_NOSMIMECAP`, `PKCS7_CRLFEOL`, `PKCS7_NOCRL`, `PKCS7_NO_DUAL_CONTENT` | `source/UPGRADING:907-912` |
| POSIX | `POSIX_SC_OPEN_MAX` | `source/UPGRADING:914-915` |
| Sockets | `IPPROTO_ICMP`, `IPPROTO_ICMPV6`, `AF_PACKET`, `ETH_P_IP`, `ETH_P_IPV6`, `ETH_P_LOOP`, `ETH_P_ALL`, `SO_BUSY_POLL`, `UDP_SEGMENT`, `SHUT_RD`, `SHUT_WR`, `SHUT_RDWR` e constantes FreeBSD-specific | `source/UPGRADING:917-935` |
| Tokenizer | `T_VOID_CAST`, `T_PIPE` | `source/UPGRADING:937-939` |
| Standard | `IMAGETYPE_HEIF`, `IMAGETYPE_SVG` | `source/UPGRADING:941-943` |

> `PHP_BUILD_PROVIDER` só existe se definido em build — use
> `defined('PHP_BUILD_PROVIDER')` (`source/main/main.c:117-124`).

### Compatibilidade e mudanças de comportamento

| Mudança | Impacto prático | Fonte |
| --- | --- | --- |
| `class_alias()` não aceita `array`/`callable` | nomes reservados rejeitados | `source/UPGRADING:23-24` |
| Comparação frouxa de objetos incomparáveis (enums, `CurlHandle`) | comportamento alterado | `source/UPGRADING:25-27` |
| `gc_collect_cycles()` não inclui strings no retorno |Não confie na contagem para memory tuning | `source/UPGRADING:31-32` |
| `static` pode ser substituído por `self`/nome concreto | LSB mais flexível | `source/UPGRADING:33-34` |
| Tick handlers desativados após shutdown functions | instrumentação de tick muda | `source/UPGRADING:35-36` |
| Sessão com chave `|` agora avisa | valide chaves | `source/UPGRADING:152-154` |
| SimpleXML XPath não-node-set avisa e retorna `false` | trate o retorno | `source/UPGRADING:156-159` |
| `ArrayObject` não aceita enums | use array/DTO | `source/UPGRADING:161-163` |
| `SplFileObject::fwrite($length)` agora `?int` | default `null` | `source/UPGRADING:164-165` |
| `cli_set_process_title()` falha se título longo | não trunca mais | `source/UPGRADING:347-349` |
| FPM `fastcgi.script_path_encoded` | controla decodificação `ProxyPass` | `source/UPGRADING:353-356` |

### Depreciações adicionais (além das já cobertas nos capítulos 10/14)

| Item | Substituto | Fonte |
| --- | --- | --- |
| `DATE_RFC7231` / `DateTimeInterface::RFC7231` | use `DATE_RFC3339_EXTENDED` | `source/UPGRADING:423-426` |
| `__wakeup()` em `DateTimeInterface`/`DateTime` | `__unserialize()` | `source/UPGRADING:427-431` |
| `finfo_close()` | limpeza automática | `source/UPGRADING:433-435` |
| `$context` de `finfo_buffer()` | remova | `source/UPGRADING:436-439` |
| `imagedestroy()` | limpeza automática | `source/UPGRADING:440-443` |
| Constantes driver-specific em `PDO` | use `Pdo\...` | `source/UPGRADING:482-484` |
| Métodos driver-specific em `PDO` | use `Pdo\...` | `source/UPGRADING:527-529` |
| `setAccessible()` em Reflection | não é mais necessário | `source/UPGRADING:549-551` |
| `ReflectionClass::getConstant()` inexistente | verifique antes | `source/UPGRADING:552-554` |
| `ReflectionProperty::getDefaultValue()` sem default | verifique `hasDefaultValue()` | `source/UPGRADING:555-557` |
| `spl_autoload_call()` como `unregister` | use `spl_autoload_unregister()` | `source/UPGRADING:560-562` |
| `readdir()`/`rewinddir()`/`closedir()` com `null` | passe handle explícito | `source/UPGRADING:577-580` |
| `chr()` fora de `[0,255]` | use bytes válidos | `source/UPGRADING:581-583` |
| `ord()` com string não-unitária | use string de 1 byte | `source/UPGRADING:584-586` |

### Funções alteradas — seleção operacional

| Função | Mudança | Fonte |
| --- | --- | --- |
| `bcround()`, `BcMath\Number::round()` | `ValueError` se precisão inválida | `source/UPGRADING:601-603` |
| `Locale::*` | `ValueError` com NUL | `source/UPGRADING:610-611` |
| `libxml_set_external_entity_loader()` | retorno formal `true` | `source/UPGRADING:626-627` |
| `openssl_sign()`/`openssl_verify()` | novo parâmetro `$padding` | `source/UPGRADING:631-632` |
| `pcntl_exec()` | retorno formal `false` | `source/UPGRADING:638-639` |
| `PDO::quote()` (SQLite) | exceção/warning em vez de silently | `source/UPGRADING:649-650` |
| `posix_kill()` | `ValueError` para pid inválido | `source/UPGRADING:669-670` |
| `session_start()` | opções mais rigorosas | `source/UPGRADING:693-696` |
| `socket_create_listen()`/`socket_bind()`/`socket_sendto()` | `ValueError` em entradas inválidas | `source/UPGRADING:706-708` |
| `tidy::__construct()` etc. | `ValueError` em parâmetro inválido | `source/UPGRADING:722-724` |
| `gzfile()`, `gzopen()`, `readgzfile()` | respeitam stream context | `source/UPGRADING:730-731` |

### Outras mudanças de extensão

- DOM: `outerHTML`, `$children`, `getElementsByClassName()` —
  `source/UPGRADING:257-259,758-759`.
- EXIF: tags `OffsetTime*`, HEIF/HEIC — `source/UPGRADING:261-263`.
- Intl: constantes de moeda, `addLikelySubtags`, `minimizeSubtags`,
  `IntlListFormatter` — `source/UPGRADING:272-284`.
- SQLite: modos EXPLAIN, `ATTR_BUSY_STATEMENT`, transação configurável —
  `source/UPGRADING:286-295,310-313`.
- SOAP: enums em `__getTypes()`, `xml:lang` em `SoapFault` —
  `source/UPGRADING:302-308`.
- Mail: `mail()` reporta erro real do sendmail — `source/UPGRADING:315-319`.
- `getimagesize()`: HEIF/HEIC e SVG (com libxml), novas chaves
  `width_unit`/`height_unit` — `source/UPGRADING:320-327`.
- XSLT: `$namespace` finalmente funciona — `source/UPGRADING:331-337`.
- Zlib: `flock()` em streams zlib — `source/UPGRADING:339-341`.
- OPcache sempre embutido — `source/UPGRADING:860-863`.

### Matriz completa de funções alteradas (UPGRADING §5)

| Função/método | Mudança no 8.5 | Fonte |
| --- | --- | --- |
| `bcround()`, `BcMath\Number::round()` | `ValueError` com precisão inválida | `source/UPGRADING:601-603` |
| `IntlDateFormatter::setTimeZone()`, `datefmt_set_timezone()` | assinatura/comportamento ajustado | `source/UPGRADING:605-606` |
| `grapheme_extract()` | atribui `$next` corretamente ao pular | `source/UPGRADING:607-609` |
| `Locale::*` | `ValueError` com NUL | `source/UPGRADING:610-611` |
| `transliterator_get_error_code()`, `transliterator_get_error_message()` | erros alinhados | `source/UPGRADING:612-614` |
| `grapheme_strpos()`, `grapheme_stripos()`, `grapheme_strrpos()` | ajustes de offsets | `source/UPGRADING:616-620` |
| `ldap_get_option()` | aceita `NULL` como `ldap_set_option()` | `source/UPGRADING:622-624` |
| `ldap_get_option()`, `ldap_set_option()` | `ValueError` em entradas inválidas | `source/UPGRADING:89-90` |
| `libxml_set_external_entity_loader()` | retorno formal `true` | `source/UPGRADING:626-627` |
| `openssl_public_encrypt()`, `openssl_private_decrypt()` | novo parâmetro | `source/UPGRADING:629-630` |
| `openssl_sign()`, `openssl_verify()` | novo parâmetro `$padding` | `source/UPGRADING:631-632` |
| `openssl_cms_encrypt()` | `$cipher_algo` aceita string | `source/UPGRADING:633-635` |
| `pcntl_exec()` | retorno formal `false` | `source/UPGRADING:638-639` |
| `pcntl_waitid()` | argumento `resource_usage` | `source/UPGRADING:639-641` |
| `PDO::pgsqlCopyFromArray()` | aceita `Iterable` | `source/UPGRADING:643-644` |
| `Pdo\Pgsql::setAttribute()`, `prepare()` | novos atributos | `source/UPGRADING:644-648` |
| `PDO::quote()` (SQLite) | exceção/warning | `source/UPGRADING:649-650` |
| `PDO::sqliteCreateCollation()` | lança exceção | `source/UPGRADING:651-653` |
| `pg_copy_from()` | aceita `Iterable` | `source/UPGRADING:656-657` |
| `pg_connect()`, `pg_close_stmt()` | valida NUL | `source/UPGRADING:657-661` |
| `posix_ttyname()`, `posix_isatty()`, `posix_fpathconf()` | `last_error`/warnings | `source/UPGRADING:663-667` |
| `posix_kill()`, `posix_setrlimit()` | `ValueError` | `source/UPGRADING:669-676` |
| `ReflectionClass::__toString()`, `ReflectionProperty::__toString()` | saída alterada | `source/UPGRADING:678-684` |
| `ReflectionAttribute::newInstance()` | erros internos em atributos | `source/UPGRADING:686-690` |
| `session_start()` | opções mais rigorosas | `source/UPGRADING:693-696` |
| `snmpget()`, `snmpset()`, variantes | comportamento de tipo ajustado | `source/UPGRADING:699-704` |
| `socket_create_listen()`, `socket_bind()`, `socket_sendto()` | `ValueError` | `source/UPGRADING:706-708` |
| `socket_addrinfo_lookup()` | `TypeError` em hints | `source/UPGRADING:709-711` |
| `socket_set_option()` | multicast `ValueError` | `source/UPGRADING:712-720` |
| `socket_create()`, `socket_bind()` | `AF_PACKET` | `source/UPGRADING:715-716` |
| `socket_getsockname()` | índice de interface | `source/UPGRADING:716-717` |
| `tidy::__construct()`, `parseFile()`, `parseString()` | `ValueError` | `source/UPGRADING:722-724` |
| `use_include_path` em funções de arquivo | comportamento ajustado | `source/UPGRADING:727-728` |
| `gzfile()`, `gzopen()`, `readgzfile()` | respeitam stream context | `source/UPGRADING:730-731` |

### Ajustes finais por extensão e plataforma

- **cURL**: `CURLOPT_FOLLOWLOCATION` é inteiro (`CURLFOLLOW_*`), não booleano
  (`source/UPGRADING:838-840`); `CURLOPT_SSL_SIGNATURE_ALGORITHMS` define
  algoritmos TLS (`source/UPGRADING:254-255`).
- **Fileinfo**: `file` 5.46 (`source/UPGRADING:843`); `finfo_close()` retorna
  `true` (`source/UPGRADING:844-845`).
- **Intl**: erro interno modernizado e `IntlListFormatter::getErrorCode()`/
  `getErrorMessage()` refletem falhas de `format()`
  (`source/UPGRADING:848-853`); `NumberFormatter::CURRENCY_*` disponíveis
  (`source/UPGRADING:273-276`).
- **Lexbor**: extensão sempre habilitada, usada por URI
  (`source/UPGRADING:855-858`).
- **PDO_Sqlite**: versão mínima 3.7.17; `ATTR_EXPLAIN_STATEMENT` e modos
  (`source/UPGRADING:871-872,288-295`).
- **Readline**: `add_history`/`clear_history`/`callback_handler_install`
  retornam `true` (`source/UPGRADING:874-877`).
- **ODBC**: assume ODBC ≥ 3.5; flags de build por driver removidos
  (`source/UPGRADING:100-103`); fetch de colunas grandes mudou
  (`source/UPGRADING:1030-1032`).
- **XSLT**: argumento `$namespace` finalmente funciona
  (`source/UPGRADING:332-337`).
- **Windows/FFI**: não é mais necessário informar a library em `FFI::cdef()`
  (`source/UPGRADING:1005`); extensões shared por padrão
  (`source/UPGRADING:1000-1002`).
- **macOS**: `hrtime()` usa timer recomendado (`source/UPGRADING:1021-1024`).
- **`select()`**: com apenas pipes em `$read`, comportamento ajustado
  (`source/UPGRADING:1010-1013`).

### Itens finais de cobertura exata

- `XSLTProcessor::getParameter()` (e `setParameter`/`removeParameter`): o
  argumento `$namespace` passa a ser respeitado quando `$name` não usa Clark
  notation nem QName (`source/UPGRADING:332-337`).
- `posix_ttyname()` define `last_error` como `EBADF` em certos cenários
  (`source/UPGRADING:663-664`).
- `socket_set_option()` com `MCAST_LEAVE_GROUP`/
  `MCAST_LEAVE_SOURCE_GROUP` tem comportamento ajustado
  (`source/UPGRADING:712-714`).
- Fileinfo: `Upgraded file from 5.45 to 5.46`
  (`source/UPGRADING:843`).
- `readline_add_history()`, `readline_clear_history()` e
  `readline_callback_handler_install()` retornam `true`
  (`source/UPGRADING:874-877`).
- ODBC: `The fetch behaviour for larger columns has been changed`
  (`source/UPGRADING:1030-1032`).
- Core: `Remove OPcodes for identity comparisons against booleans`,
  beneficiando `match(true)` (`source/UPGRADING:1041-1042`).

## Verificação
- `php -r 'foreach (["FILTER_THROW_ON_FAILURE","T_PIPE","PHP_BUILD_DATE"] as $c) var_dump(defined($c));'`
- `php --ini=diff` para confirmar INIs do capítulo 25.
- `php -r 'var_dump(function_exists("get_error_handler"), function_exists("array_first"));'`

```php
// constante nova verificável no runtime
var_dump(defined("FILTER_THROW_ON_FAILURE"), defined("T_PIPE"));
```
