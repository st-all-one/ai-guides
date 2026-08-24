---
name: php-74-correct
description: Authoritative, version-isolated guidance for writing correct, secure, performant, and maintainable PHP 7.4 code — typing (typed properties, arrow fns, ??=), functional/OOP idioms, security, error handling, logging, preloading, and php.ini hardening. Trigger when writing, reviewing, or refactoring PHP 7.4 code, or when a task must target PHP 7.4 specifically.
---

# PHP 7.4 — Correct, Secure, Performant Guide

## 1. Scope & Hard Isolation Rule
- **Target: PHP 7.4 ONLY.** Everything available up to and including 7.4 is allowed: the 7.2 baseline PLUS 7.3/7.4 additions.
- **FORBIDDEN:** any feature from PHP 8.0–8.4 (see §3). No "what's new in 8.x" notes. Keep strictly ≤ 7.4.
- Verify every snippet passes `php -l` on PHP 7.4.
- When unsure whether a token is 7.4-valid, it is NOT — prefer the documented 7.4 surface.

## 2. Allowed Language Surface

**Baseline (7.2, valid here):**
- Scalar type declarations: `int`, `float`, `string`, `bool`; also `array`, `callable`, `iterable`, `object`, `self`, `parent`, classes/interfaces.
- Return types: scalar/`void`/`iterable`/`object`/`self`/`parent`/class; nullable `?Type` (7.1+); `void` (7.1+).
- `declare(strict_types=1)` — per-file, must be first statement.
- `??` null coalescing (7.0), `<=>` spaceship (7.0), variadic `...` + argument unpacking (5.6).
- Throwable hierarchy: `Exception`/`Error`/`TypeError`/`DivisionByZeroError`/`ParseError`/`ArithmeticError`/`AssertionError`; `JsonException` (7.3) via `JSON_THROW_ON_ERROR`; `finally` (5.5); multiple `catch` (7.1).
- Generators: `yield`, `yield from`, `yield $k=>$v`, `getReturn()` (7.0+); SPL `Iterator`/`IteratorAggregate`/`ArrayIterator`.
- OOP: classes, abstract, interfaces, traits (`insteadof`/`as`), `final`, magic methods, anonymous classes (7.0), LSB `static::`, closures + `use`, `Closure::bind`/`bindTo`/`fromCallable` (7.1).
- CSPRNG: `random_bytes`/`random_int`; `sodium_*` (7.2); `password_hash` BCRYPT/ARGON2I; `filter_var`/`filter_input`; `hash_equals`/`hash`/`hash_hmac`; `htmlspecialchars`/`htmlentities`; prepared statements (PDO/MySQLi).
- `is_countable()` (7.3), `mb_str_split()` (7.4), `FILTER_VALIDATE_FLOAT` min/max range (7.4), `error_clear_last()` (7.0), `gc_*`, `opcache_*`.

**7.3/7.4 additions (USE these — correct for 7.4):**
- `??=` null coalescing assignment (7.4).
- Arrow functions `fn () =>` (7.4): auto capture-by-value.
- Typed properties: `public int $x;` (7.4). Allowed types: `int`,`float`,`string`,`bool`,`array`,`iterable`,`object`, classes, interfaces, `self`, `parent`, `?Type`. **NOT `callable`.**
- Covariant return / contravariant parameter types (7.4).
- Preloading: `opcache.preload` + `opcache.preload_user` (7.4).
- `WeakReference` (7.4); `WeakReference::create()`.
- `PASSWORD_ARGON2ID` (7.3).
- `session.cookie_samesite` (7.3): `Lax`/`Strict`/`None`.
- Trailing commas in function **calls** (7.3); flexible heredoc/nowdoc (7.3); numeric literal separators `_` (7.4); array spread `[...$arr]` + `array_merge()` with 0 args (7.4).
- `zend.exception_ignore_args` (7.4); `syslog.facility`/`syslog.ident`/`syslog.filter` (7.3).
- `__serialize()`/`__unserialize()` (7.4); throwing from `__toString()` (7.4).
- `FILTER_VALIDATE_BOOL` alias exists 8.0+ — use `FILTER_VALIDATE_BOOLEAN`.

## 3. Forbidden in 7.4 (8.0+ leaks — NEVER)

| Forbidden token | 7.4 alternative |
|---|---|
| 8.0 selection expression | `switch` or chained `if`/`elseif` |
| Named arguments `fn(name: $v)` | positional args |
| 8.0 null-safe operator | explicit `null` check / `isset()` |
| Constructor property promotion `function __(public int $x)` | assign in constructor body |
| 8.0 attribute syntax | docblocks `@annotations` |
| 8.0 enumeration declaration | class constants / abstract base |
| 8.0 immutable-class modifier | immutable by convention (no public setters) |
| Union types `int\|string` | docblock `@param int\|string` + runtime checks |
| 8.0 generic top type | docblock or `object`/typed where possible |
| 8.0 self-bounded return type | return concrete type or `self` |
| Intersection `A&B` | document + validate manually |
| 8.0 first-class callable syntax | `Closure::fromCallable('strlen')` or `fn($x)=>strlen($x)` |
| Fibers / `Fiber` | generators + callbacks |
| JIT (`opcache.jit`) | not available — use preloading/opcache |
| 8.0 property hooks / asymmetric visibility / no-return type / DNF / lazy objects | not available — use getters/setters, `@return` docblocks |

Also avoid: `FILTER_VALIDATE_BOOL` (8.0 alias), `FILTER_SANITIZE_STRING` (deprecated 8.1 — use `FILTER_SANITIZE_FULL_SPECIAL_CHARS`), `Serializable` interface (prefer `__serialize`), `$errcontext` in error handlers (removed 8.0).

## 4. Security
- **Password hashing:** `password_hash`/`password_verify`/`password_needs_rehash`. Prefer `PASSWORD_ARGON2ID` (7.3+); `PASSWORD_BCRYPT` portable; `PASSWORD_ARGON2I` (7.2). Never `md5`/`sha1`/`plaintext`. Store in `VARCHAR(255)`. Salt auto-generated — never pass `salt`.
  ```php
  <?php
  $hash = password_hash($pw, PASSWORD_ARGON2ID, [
      'memory_cost' => PASSWORD_ARGON2_DEFAULT_MEMORY_COST,
      'time_cost'   => PASSWORD_ARGON2_DEFAULT_TIME_COST,
      'threads'     => PASSWORD_ARGON2_DEFAULT_THREADS,
  ]);
  if (password_verify($pw, $hash)) { /* ok */ }
  if (password_needs_rehash($hash, PASSWORD_ARGON2ID, $opts)) {
      $hash = password_hash($pw, PASSWORD_ARGON2ID, $opts); // persist
  }
  ```
- **CSRF:** per-session token, compare with `hash_equals`; pair with `session.cookie_samesite=Lax`/`Strict`.
- **Prepared statements:** always parameterize. PDO with `ATTR_EMULATE_PREPARES=>false`, `ATTR_ERRMODE=>ERRMODE_EXCEPTION`.
  ```php
  <?php
  $pdo = new PDO('mysql:host=localhost;dbname=app;charset=utf8mb4', $u, $p, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  $st = $pdo->prepare('SELECT id,nome FROM usuarios WHERE email = ?');
  $st->execute([$email]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  ```
- **Input filtering:** `filter_var`/`filter_input`; `=== false`/`=== null` checks.
  ```php
  <?php
  $email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
  if ($email === false) { /* reject */ }
  $idade = filter_input(INPUT_GET, 'idade', FILTER_VALIDATE_INT,
      ['options' => ['min_range' => 0, 'max_range' => 150]]);
  ```
- **Output escaping (XSS):** `htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8')`. Set `default_charset=UTF-8`.
- **CSP:** send `Content-Security-Policy` header; never reflect untrusted input into HTML/script without escaping.
- **Secure session config:**
  ```php
  <?php
  ini_set('session.cookie_secure', '1');
  ini_set('session.cookie_httponly', '1');
  ini_set('session.cookie_samesite', 'Lax');
  ini_set('session.use_strict_mode', '1');
  session_start();
  session_regenerate_id(true); // after auth
  ```
- **Safe comparison:** `hash_equals($expected, $computed)` for MACs/tokens.
- **Tokens:** `bin2hex(random_bytes(32))` / `random_int(100000, 999999)`; never `rand()`/`mt_rand()`.
- **Avoid:** `eval()`, `unserialize()` on untrusted data, variable-function names built from user input without allowlist, `allow_url_include`, backticks/exec family unless required (then disable others via `disable_functions`).
- **Secrets:** env vars / secret store — never in source; keep out of exception args (`zend.exception_ignore_args=On`).

## 5. Performance
- **OPcache ON in prod** (`opcache.enable=1`); `validate_timestamps=0` in prod, `1` in dev; bump `memory_consumption`/`max_accelerated_files` to cover all files; `revalidate_freq=0` (dev).
- **Preloading (7.4):** `opcache.preload=/path/preload.php` + `opcache.preload_user=www-data` (prod only, persistent SAPI, not Windows). Preloads functions/classes/interfaces/traits into shared memory at SAPI start — no `require`/recompile per request; restart SAPI to refresh. Use `opcache_compile_file()` (no execution, any order) or `require`/`include` (executes, ordered).
  ```php
  <?php
  // preload.php
  foreach (['/app/src/Autoloader.php', '/app/src/Util.php'] as $f) {
      opcache_compile_file($f);
  }
  ```
- **Arrow functions** reduce closure overhead for short pure callbacks (auto value-capture, no `use`).
- **Typed properties** remove manual runtime type checks.
- **Avoid N+1:** batch queries / eager load; use prepared statements reused across rows.
- **Generators** for large/slow streams (`yield`); `yield from` to compose.
- **Autoloading** via PSR-4 + Composer (or `spl_autoload_register`), not mass `require`.
- **Avoid premature optimization:** profile (`opcache_get_status`, XHProf-style tools) before tuning; `realpath_cache_size`/`realpath_cache_ttl` help; `gc_collect_cycles()` only in long loops with cycles.
- **foreach by ref:** `unset($v)` after.

## 6. Maintainability
- **PSR-12** style; **PSR-4** autoloading (namespace → `src/` dir); one class per file; class name = file name.
  ```json
  { "autoload": { "psr-4": { "App\\": "src/" } } }
  ```
- **Namespaces** for organization; `use`/`as` imports; grouped `use` (7.0+); trailing comma in grouped `use` (7.4). Fully-qualified `\Foo\Bar` to force global.
- **DI** via constructor; program to interfaces; composition (traits/interfaces/injection) over deep inheritance; **SOLID**.
- Small pure functions; typed signatures; docblocks where native types insufficient (e.g. unions). No global state abuse; pass dependencies.
- Immutability **by convention** (final class, validated constructor, no public setters, mutators return new instance) — a native immutable modifier does not exist in 7.4.
- `declare(strict_types=1)` in libraries.

## 7. Typing
- `declare(strict_types=1)` at top of file → strict checks for that file only.
- Scalar/return types: `int`,`float`,`string`,`bool`,`array`,`callable`,`iterable`,`object`,`self`,`parent`, class/interface, `void`.
- Nullable `?Type` for optional values; reserve `null` for "absent", not error.
- **Typed properties (7.4):** `public string $x;` allowed types above (NOT `callable`); may have default of compatible type or `null` for nullable. Must be initialized before read (else `Error`). They do NOT trigger `__get`/`__set`.
  ```php
  <?php
  declare(strict_types=1);
  class User {
      public int $id;
      public ?string $name = null;
      public function __construct(int $id, ?string $name) {
          $this->id = $id; $this->name = $name;
      }
  }
  ```
- **Coercion pitfalls:** weak mode truncates float→int, string→number; `strict_types=1` turns mismatches into `TypeError`. `null` only accepted by `?Type`. Prefer `===`/`!==` over `==` (e.g. `0 == ''` true, `0 === ''` false).
- **Covariance/contravariance (7.4):** subclass may narrow return (subtype) or widen parameter (supertype); needs autoloading for cross-file classes.
- **Docblock unions only** (`@param int|string`), never native union types.

## 8. Functional Idioms
- `array_map`/`array_filter`/`array_reduce`/`array_walk` for declarative transforms; `array_values()` to reindex after filter.
- **Arrow functions** `fn()=>`: capture-by-value; ideal for pure read-only callbacks.
  ```php
  <?php
  $f = 10;
  $sq = array_map(fn(int $n): int => $n * $n, [1,2,3]);      // [1,4,9]
  $ev = array_filter([1,2,3,4], fn($n): bool => $n % 2 === 0);
  $sum = array_reduce([1,2,3,4], fn($a,$n) => $a+$n, 0);     // 10
  usort($nums, fn($a,$b): int => $a <=> $b);
  ```
- **Closures** `function() use($v)`: use `use(&$v)` when mutating outer scope (arrow fns cannot). `Closure::fromCallable('fn_name')` unifies callables.
- **Variadic + unpacking:** `function m(...$n)`; `m(...[1,2,3])`; `array_merge(...$arrays)` (7.4 allows 0 args).
- **Generators** for lazy pipelines; `yield`, `yield from`, `getReturn()`; implement `Iterator`/`IteratorAggregate` for custom iterables.
- Immutability by convention; avoid shared mutable state.

## 9. OOP Idioms
- Interfaces as contracts; traits for horizontal reuse; `final` to lock behavior; abstract for partial base.
- Anonymous classes (7.0+) for one-off adapters/stubs; can `implements`/`extends`/`use` and capture via ctor.
- LSB `static::` for factory/self-reference.
- **Typed properties** for state contracts (init in ctor).
- **WeakReference (7.4)** for caches that must not retain objects:
  ```php
  <?php
  class WeakCache {
      private array $items = [];
      public function set(string $k, object $v): void {
          $this->items[$k] = WeakReference::create($v);
      }
      public function get(string $k): ?object {
          return isset($this->items[$k]) ? $this->items[$k]->get() : null;
      }
  }
  ```
- Magic methods sparingly (`__get`/`__set` for virtual props; `__toString` returns string — may throw in 7.4 with care). `__clone` for deep copy of sub-objects.
- Custom serialization via **`__serialize()`/`__unserialize()` (7.4)** (precedence over `__sleep`/`__wakeup`); omit secrets.
- Composition + DI; visibility discipline (`private` by default).

## 10. Error & Exception Handling
- Catch specific types before generic; root is `Throwable`. Catch `Exception` (app) / `Error` (engine) as needed; `finally` always runs.
  ```php
  <?php
  try {
      $data = json_decode($s, true, 512, JSON_THROW_ON_ERROR);
  } catch (JsonException $e) {
      error_log($e->getMessage());
  } catch (Throwable $e) {
      error_log('Fatal: '.$e->getMessage());
      throw $e; // or rethrow after logging
  } finally {
      // cleanup
  }
  ```
- Custom hierarchy: `class AppException extends \Exception {}`.
- `set_error_handler` (signature without `$errcontext`): convert to `ErrorException` if desired; `set_exception_handler` for top-level logging; `register_shutdown_function`+`error_get_last` for fatal catch.
- **Never swallow** exceptions silently; log + rethrow or handle meaningfully. Fail fast on contract violations (`throw new InvalidArgumentException`).
- `error_reporting(E_ALL)`; dev `display_errors=On`, prod `Off`.

## 11. Logging
- PSR-3 style levels (debug/info/notice/warning/error/critical): map to `LOG_*`/`error_log`. Central handler:
  ```php
  <?php
  set_exception_handler(function (Throwable $e): void {
      error_log('['.get_class($e).'] '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());
      http_response_code(500);
  });
  set_error_handler(function (int $c, string $m, string $f='', int $l=0) {
      if (!(error_reporting() & $c)) return false;
      error_log("[$c] $m em $f:$l");
      return true;
  });
  ```
- `error_log($msg)` (type 0/3), `syslog(LOG_INFO, $msg)`. Configure `syslog.ident`/`syslog.facility`/`syslog.filter=no-ctrl` (7.3) when `error_log=syslog`.
- Include context (ids, scalars) but **redact secrets** (passwords, tokens, PII). `zend.exception_ignore_args=On` avoids args in traces.
- Rotation via external logrotate; never write unescaped user data into logs (log injection).

## 12. php.ini / Web Server Hardening (7.4-valid)
```ini
; Security
expose_php = Off
display_errors = Off
display_startup_errors = Off
log_errors = On
error_log = /var/log/php/php-error.log
allow_url_fopen = Off
allow_url_include = Off
open_basedir = /var/www/app:/tmp
disable_functions = "exec,passthru,shell_exec,system,proc_open,popen"
enable_dl = Off
cgi.fix_pathinfo = 0
session.cookie_secure = On
session.cookie_httponly = On
session.cookie_samesite = Lax
session.use_strict_mode = On
session.cookie_lifetime = 0
default_charset = UTF-8
zend.exception_ignore_args = On

; Performance / OPcache
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 0
opcache.revalidate_freq = 0
opcache.preload = /var/www/app/preload.php
opcache.preload_user = www-data
realpath_cache_size = 4096K
realpath_cache_ttl = 600
zend.assertions = -1

; Stability
memory_limit = 128M
max_execution_time = 30
max_input_time = 60
max_input_vars = 1000
post_max_size = 8M
upload_max_filesize = 2M
max_file_uploads = 20
default_socket_timeout = 60

; Logging (syslog, 7.3)
error_log = syslog
syslog.ident = minha-app
syslog.facility = LOG_LOCAL0
syslog.filter = no-ctrl
```
Notes: `opcache.preload`/`preload_user`, `syslog.*`, `zend.exception_ignore_args` are `PHP_INI_SYSTEM`/`PERDIR` → set in php.ini (not `ini_set`). Preload needs SAPI restart + persistent process. `cgi.fix_pathinfo=0` closes FPM/nginx path-info vuln.

## 13. Correct Patterns (copy-ready 7.4)
```php
<?php
declare(strict_types=1);

namespace App;

// Arrow-fn map
$nums = [1,2,3];
$doubled = array_map(fn(int $n): int => $n * 2, $nums);

// Typed-property entity (immutable by convention)
final class Money {
    private int $cents;
    public function __construct(int $cents) {
        if ($cents < 0) throw new \InvalidArgumentException('neg');
        $this->cents = $cents;
    }
    public function cents(): int { return $this->cents; }
    public function add(Money $o): Money { return new Money($this->cents + $o->cents()); }
}

// ??= config default
$config = [];
$config['timeout'] ??= 30;

// WeakReference cache
class Cache {
    private array $items = [];
    public function set(string $k, object $v): void { $this->items[$k] = \WeakReference::create($v); }
    public function get(string $k): ?object { return $this->items[$k]->get() ?? null; }
}

// Safe DB
$pdo = new \PDO('mysql:host=localhost;dbname=app;charset=utf8mb4', $u, $p, [
    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
    \PDO::ATTR_EMULATE_PREPARES => false,
]);
$st = $pdo->prepare('SELECT id FROM usuarios WHERE email = ?');
$st->execute([$email]);

// Password login
if (password_verify($pw, $hash)) {
    if (password_needs_rehash($hash, PASSWORD_ARGON2ID, $opts)) {
        $hash = password_hash($pw, PASSWORD_ARGON2ID, $opts);
    }
}

// Secure session
ini_set('session.cookie_secure','1');
ini_set('session.cookie_httponly','1');
ini_set('session.cookie_samesite','Lax');
ini_set('session.use_strict_mode','1');
session_start();
session_regenerate_id(true);

// PSR-4 bootstrap
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\'; $base = __DIR__.'/src/';
    if (strncmp($prefix, $class, strlen($prefix)) !== 0) return;
    $file = $base.str_replace('\\','/',substr($class,strlen($prefix))).'.php';
    if (is_file($file)) require $file;
});

// Custom exception
class AppException extends \Exception {}

// Safe output
echo htmlspecialchars($user, ENT_QUOTES | ENT_HTML5, 'UTF-8');

// Numeric literal separators / spread
$bytes = 1_048_576;
$all = [0, ...[1,2], 3];
```

## 14. Anti-Patterns
- **Never:** unescaped output (`echo $x` into HTML), `md5`/`sha1` passwords, `unserialize()` on untrusted, swallow exceptions, rely on globals, ship without OPcache in prod.
- **Invalid in 7.4 (do NOT use — these are 8.x):** the 8.0 selection expression, attribute syntax, null-safe operator, constructor promotion, enumerations, the immutable-class modifier, native union types, the generic top type, the self-bounded return type, intersection types, first-class callable syntax, Fibers, JIT, property hooks, asymmetric visibility, the no-return type, DNF types, lazy objects.
- **Soft anti-patterns:** mixing weak/strict typing inconsistently; nullable everywhere (hides bugs); public typed properties unnecessarily; arrow fn capturing outer scope expecting mutation (use closure `use(&$v)`); forgetting `unset($v)` after `foreach as &$v`; `==` where `===` is required; `FILTER_SANITIZE_STRING` (deprecated 8.1); building variable-function names from user input without allowlist; over-broad `catch (Throwable)` that hides bugs.

## 15. Validation Checklist (pre-commit / review)
**Correctness (7.4-only):**
- [ ] No 8.x syntax (§3): no selection expression, attribute syntax, null-safe operator, enumerations, immutable-class modifier, native union types, first-class callable syntax, property hooks, asymmetric visibility (see §3).
- [ ] All snippets pass `php -l` on PHP 7.4.
- [ ] Typed properties initialized before read; `callable` not used as property type.
- [ ] `declare(strict_types=1)` in library files; `===`/`!==` for critical comparisons.
- [ ] Arrow functions only for value-capturing pure callbacks; closures `use(&$v)` when mutating.

**Security:**
- [ ] Passwords via `password_hash` (ARGON2ID/BCRYPT) + `password_verify`; no md5/sha1/plaintext.
- [ ] All DB via prepared statements; no string-interpolated SQL.
- [ ] Input validated with `filter_*`; output escaped with `htmlspecialchars(ENT_QUOTES|ENT_HTML5)`.
- [ ] Tokens via `random_bytes`/`random_int`; secret compares via `hash_equals`.
- [ ] Session: secure+httponly+samesite+strict_mode; `session_regenerate_id(true)` after auth.
- [ ] No `eval`/`unserialize(untrusted)`; `disable_functions`/allow_url_* set; secrets out of source/logs.

**Performance:**
- [ ] OPcache enabled; `validate_timestamps=0` in prod; preload configured (prod, persistent SAPI).
- [ ] PSR-4 autoloading; no mass `require`; generators for large streams; no N+1.

**Maintainability:**
- [ ] PSR-12 + PSR-4; namespaces; DI via constructor; interfaces over impls.
- [ ] Immutability by convention; docblock unions (no native unions); no global abuse.
- [ ] php.ini hardened (expose_php=Off, display_errors=Off, log_errors=On, syscfg set).
