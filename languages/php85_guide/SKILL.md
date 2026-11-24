---
name: php-85-correct
description: Authoritative, version-isolated guidance for writing, reviewing, securing, instrumenting and operating PHP 8.5 code — URI extension, pipe operator, Clone With, NoDiscard, FILTER_THROW_ON_FAILURE, fatal-error backtraces, handler introspection, max_memory_limit, persistent cURL shares, OPcache/JIT defaults, php.ini hardening. Trigger when a task must target PHP 8.5 specifically.
category: languages
version: "8.5.13"
tags: [php, php85, pipe-operator, uri-extension, clone-with, nodiscard, filter-throw, fatal-backtraces, max-memory-limit, opcache]
license: MIT
---

# PHP 8.5 — Correct, Secure, Observable, Performant

## 1. Scope / isolation
Target **PHP 8.5** only (reference 8.5.13). Use the full surface accumulated through 8.4 plus every 8.5 addition listed below. Never recommend features removed before 8.5. No syntax from future versions.

## 2. Allowed surface (≤ 8.5)
Base 7.2–8.4: strict types, union/intersection/DNF, enums, readonly, property hooks, asymmetric visibility, lazy objects, fibers, attributes, `#[\Override]`, `#[\Deprecated]`, `array_all/any/find/find_key`, JIT, preload.
Added 8.5: `|>` pipe; `clone($obj, $props)`; `#[\NoDiscard]` + `(void)` cast; closures and first-class callables in constant expressions; casts in constant expressions; attributes on non-class constants; `#[\Deprecated]` on traits/constants; `#[\Override]` on properties; static asymmetric visibility; `final` promoted properties; `#[\DelayedTargetValidation]`; `array_first`/`array_last`; `FILTER_THROW_ON_FAILURE` + `Filter\FilterException`/`FilterFailedException`; `get_error_handler()`/`get_exception_handler()`; fatal-error backtraces + `fatal_error_backtraces`; `max_memory_limit` (INI_SYSTEM); `php --ini=diff`; `uri` extension (`Uri\Rfc3986\Uri`, `Uri\WhatWg\Url`, `$errors`); `curl_share_init_persistent()`, `curl_multi_get_handles()`, CURLINFO_* telemetry; `IntlListFormatter`, `locale_is_right_to_left`; `Closure::getCurrent()`; OPcache always built/loaded, `opcache.jit_hot_loop=61`, `opcache.file_cache_read_only`; `PHP_BUILD_DATE`, `PHP_BUILD_PROVIDER`; CHIPS `partitioned` cookies.

## 3. Removed / deprecated — use the modern replacement
Removed: `disable_classes` INI; CLI/CGI `-z`/`--zend-extension`; `class_alias(array|callable)` names.
Deprecated: backtick operator → `shell_exec()` or avoid shell; `(boolean)/(integer)/(double)/(binary)` → `(bool)/(int)/(float)/(string)`; `case x;` → `case x:`; null array offset / `array_key_exists(null)` → `''`; `__sleep()`/`__wakeup()` → `__serialize()`/`__unserialize()`; `mysqli_execute()` → `mysqli_stmt_execute()`; `curl_close()`/`curl_share_close()` → automatic cleanup; `socket_set_timeout()` → `stream_set_timeout()`; `xml_parser_free()` → automatic cleanup; `MHASH_*` → `hash_*`/sodium; output inside output-buffer handler → return the string; `$http_response_header` → `http_get_last_response_headers()`; `$_SERVER['argc|argv']` from query string → `register_argc_argv=0` + `$_GET`; `report_memleaks`, `intl.error_level`; string `++` → `str_increment()`; DSN `uri:` PDO; `$key_length` in `openssl_pkey_derive()` (security: truncated key); `ArrayObject`/`ArrayIterator` with objects.
Warnings: `NAN` casts, out-of-range float→int, non-array destructuring, session keys containing `|`.

## 4. Correct patterns (copy-ready)
```php
<?php
declare(strict_types=1);
namespace App;

use Uri\Rfc3986\Uri;
use Filter\FilterFailedException;

readonly class Cor {
    public function __construct(public int $r, public int $g, public int $b, public int $a = 255) {}
    public function comAlfa(int $a): self { return clone($this, ['a' => $a]); }
}
```

- Readonly props need explicit `public public(set)` (or `protected(set)`) to be overridden via `clone($obj, [...])` from outside the class; otherwise `Error: Cannot modify protected(set) readonly property ... from global scope`. Inside the class, `clone($this, [...])` works with private/protected props.

```php
#[\NoDiscard]
function validar(string $s): string { return trim($s); }
$slug = ' PHP 8.5 ' |> trim(...) |> strtolower(...);
$uri = new Uri('https://php.net/releases/8.5/en.php');
$email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL, FILTER_THROW_ON_FAILURE);
$anterior = get_exception_handler();
set_exception_handler(static function (\Throwable $e) use ($anterior): void {
    error_log($e::class . ': ' . $e->getMessage());
    $anterior?->__invoke($e);
});
```

`PHP_BUILD_DATE` is always defined; `PHP_BUILD_PROVIDER` only when set at configure time — guard with `defined('PHP_BUILD_PROVIDER')`.

## 5. Security
- Pin **8.5.13+**: URI parser CVEs fixed there (CVE-2026-48841, CVE-2026-129438).
- Parse untrusted URLs with `Uri\Rfc3986\Uri` (parse → `?Uri`, constructor → `InvalidUriException`) or `Uri\WhatWg\Url` (`$errors`/`$softErrors` for validation details); never raw `parse_url()` for trust decisions.
- `#[\SensitiveParameter]` on secrets; `zend.exception_ignore_args=On` in prod; `display_errors=Off`.
- `filter_*` with `FILTER_THROW_ON_FAILURE`; never combine with `FILTER_NULL_ON_FAILURE` (`ValueError`). Exception messages contain the failed value — do not send them to clients.
- `password_hash(..., PASSWORD_ARGON2ID)`, `password_verify`, `password_needs_rehash`; `random_int`/`Randomizer`; prepared PDO statements; `htmlspecialchars(..., ENT_QUOTES|ENT_HTML5, 'UTF-8')`; `JSON_THROW_ON_ERROR`.
- `max_memory_limit=512M` (INI_SYSTEM, startup only) with `memory_limit <= max_memory_limit`.
- Persistent cURL shares: only `CURL_LOCK_DATA_DNS` / `CURL_LOCK_DATA_CONNECT`; never cookies across tenants. Remove `curl_close()`.
- Sessions: `cookie_secure`, `cookie_httponly`, `cookie_samesite=Lax|Strict`, `use_strict_mode=1`, `session_regenerate_id(true)` after auth; CHIPS `partitioned` when needed.

## 6. Observability / logging
- Fatal errors now include full stack traces (`fatal_error_backtraces=On` default). `display_errors=Off` is the production protection; `SensitiveParameter` and `zend.exception_ignore_args` redact args.
- `get_error_handler()`/`get_exception_handler(): ?callable` — compose/delegate to previous handler; restore in `finally`. Polyfill exists via `set_*_handler(null)` + `restore_*_handler()`.
- `Filter\FilterFailedException`, `Uri\InvalidUriException`, `Uri\WhatWg\InvalidUrlException` (has `$errors`) — catch specifically.
- Structured logs via `error_log(json_encode(..., JSON_THROW_ON_ERROR))` or PSR-3; include request id, duration, route; redact PII/secrets.
- cURL telemetry: `CURLINFO_CONN_ID`, `CURLINFO_QUEUE_TIME_T`, `CURLINFO_USED_PROXY`, `CURLINFO_HTTPAUTH_USED`.
- Shutdown hook + `error_get_last()` for fatals; never expose traces in HTTP responses.

## 7. Performance / stability
- OPcache always built and loaded; `opcache.enable=1`, `validate_timestamps=0` with cache-clearing deploys; `opcache.jit_hot_loop=61` (prime); `jit_buffer_size=64M`; JIT `tracing` only after A/B measurement (`hrtime(true)`).
- `opcache.file_cache_read_only=1` for immutable containers (with `validate_timestamps=0`, `enable_file_override=1`).
- Persistent cURL shares reduce DNS/connection setup; `curl_multi_get_handles()` avoids manual WeakMap bookkeeping.
- Pipe compiles to opcodes similar to nested calls — clarity, not speed. Variables + copy-on-write cost nothing until written.
- `array_first`/`array_last` for already-materialized arrays; generators for streaming; `WeakMap`/lazy objects for memory.
- `max_memory_limit` prevents `ini_set('memory_limit', -1)` escapes; set below container limit.
- `zend.assertions=-1`, `realpath_cache_size=4096K`, `realpath_cache_ttl=600`.

## 8a. Functional programming (deep-dive: `26-programacao-funcional-avancada.md`)
Pure functions + `readonly` values + `clone($obj, [...])` with `public public(set)`; four callable forms (closure, arrow, first-class, invokable); `|>` pipelines (one required arg, no by-ref, parenthesize arrow fns on the right, `void` → `null`); `compose()` via `array_reduce`; `array_all/any/find/find_key` + `array_first/last`; generators for lazy streams (pipes do not iterate Generators); fibers for cooperative scheduling; `throw` expressions and `#[\NoDiscard]`; measure with `hrtime(true)`.

## 8b. Exhaustive change catalog: `27-referencia-mudancas-85.md` (all 272 UPGRADING items by category: functions, constants, classes, BC, deprecations), `28-performance-internals-85.md` (VM TAILCALL, SIMD/NEON, OPcodes, Reflection/SPL/array improvements).

## 8. Configuration / verification
```ini
expose_php=Off; display_errors=Off; log_errors=On; error_log_mode=0640
allow_url_include=Off; open_basedir=/var/www/app:/tmp; cgi.fix_pathinfo=0
register_argc_argv=0; intl.use_exceptions=1
max_memory_limit=512M; memory_limit=256M; fatal_error_backtraces=On
opcache.enable=1; opcache.validate_timestamps=0; opcache.jit_hot_loop=61
```
```bash
php -v; php -l file.php; php --ini=diff; php-fpm8.5 -t
php -i | grep -E 'max_memory_limit|fatal_error_backtraces|opcache.jit'
```

## 9. Validation checklist
- [ ] PHP 8.5.13+; `php --ini=diff` reviewed; no `disable_classes`/removed INIs.
- [ ] No deprecated syntax from §3 anywhere.
- [ ] URLs via `Uri\` classes; input via `filter_*` + `FILTER_THROW_ON_FAILURE`.
- [ ] Secrets with `SensitiveParameter`; no secrets in logs/traces.
- [ ] Handlers composed with `get_*_handler()`, restored in `finally`.
- [ ] `max_memory_limit` <= container limit; OPcache on; JIT measured.
- [ ] Persistent cURL shares free of user cookies; no `curl_close()`.
- [ ] Fatal traces in logs only; `display_errors=Off`.
- [ ] `php -l` clean; smoke test with invalid filter input and oversized URI.
