---
name: php-72-correct
description: Authoritative, version-isolated guidance for writing correct, secure, performant, and maintainable PHP 7.2 code — typing, functional/OOP idioms, security, error handling, logging, and php.ini hardening. Trigger when writing, reviewing, or refactoring PHP 7.2 code, or when a task must target PHP 7.2 specifically.
---

# PHP 7.2 Correct

## 1. Scope & Hard Isolation Rule

Target version: **PHP 7.2** — treated as the latest and only PHP. Every snippet runs on 7.2 and must not use any feature absent from 7.2.

Hard rule: never mention, recommend, hint at, or allude to post-7.2 features. No "what's new later" notes. The language surface below is the complete, closed set. If a token/feature is not listed in §2, it is unavailable — do not use it.

## 2. Allowed Language Surface (what 7.2 supports)

Typing & functions:
- Scalar type declarations: `int`, `float`, `string`, `bool` (param + return).
- `declare(strict_types=1)` — file-scoped, must be first statement; enables coercive-off checking.
- Return types: any class/interface, `self`, `parent`, `array`, `callable`, `iterable`, `object`, `void`, `?Type`, `null` (only as `?X`).
- Nullable types `?Type` (7.1).
- `void` return (7.1) — no return value, not even `return null;`.
- `iterable` (7.1) — `array` or `Traversable`.
- `object` type hint (7.2) — any object instance; also `(object)` cast.
- `callable` — string name, closure, `[$obj,'m']`, `[Class::class,'m']`.
- Variadic `...$args` (def) and `...$arr` spread in call (5.6).
- Anonymous functions with `use ($v)` / `use (&$v)`; `Closure::fromCallable()` (7.1); `Closure::bind/bindTo`.
- Higher-order: `array_map`, `array_filter`, `array_reduce`, `array_walk`; `call_user_func`, `call_user_func_array`.
- Generators: `yield`, `yield $k => $v`, `yield from` (7.0), `return` + `getReturn()` (7.0), `Generator`/`Iterator`/`IteratorAggregate`, SPL iterators (`ArrayIterator`, etc.).
- `??` null coalescing (7.0, eager); `<=>` spaceship (7.0); `?:` elvis; `?:`/`??` chaining.
- `[]` array destructuring shorthand replaces `list()` (7.1); named keys `['id'=>$id]=...`; in `foreach`.
- Negative string offsets `$s[-1]` (7.1) and negative offsets in `substr`/`strpos`.
- Class constant visibility `public/protected/private const` (7.1).
- Multi-catch `catch (A | B $e)` (7.1).
- Trailing comma in grouped `use {}` (7.2).

OOP:
- Classes, `abstract`, `interface`, `trait` (+ `insteadof`/`as`), `final` (class/method).
- Visibility `public/protected/private`; methods `__construct/__destruct/__call/__callStatic/__get/__set/__isset/__unset/__toString/__invoke/__set_state/__clone/__debugInfo/__sleep/__wakeup`.
- Late static binding `static::` / `new static()`; `self`/`parent`.
- Anonymous classes `new class` (7.0) implementing interfaces / extending / `use`.
- `Throwable` hierarchy (7.0): `Error` (`TypeError`, `ParseError`, `AssertionError`, `ArithmeticError`, `DivisionByZeroError`, `ArgumentCountError`) and `Exception` (`RuntimeException`, `InvalidArgumentException`, `LogicException`, `ErrorException`, …).
- `try/catch/finally`; multi-catch; `Serializable` interface (legacy, available).
- Object comparison `==` (same class + equal props) vs `===` (same instance).

Syntax/runtime:
- Tags `<?php`, `<?=`, short echo (always available). Alternative control syntax `: … endforeach;`.
- `declare(ticks=1)`; `assert()` with `zend.assertions`/`assert.exception` (7.0).
- References `=&`, param `&$x`, return `&f()`, `unset` to break; `global`.
- Namespaces: `namespace X;`, block `{}`, `namespace;` global, `use` + `as`, `use function`/`use const` (7.0), grouped `use X{ … }` (7.0, trailing comma 7.2), fallback for funcs/consts, dynamic `new $class`.
- Superglobals; `filter_var`/`filter_input`/`FILTER_*`; `htmlspecialchars` with `ENT_QUOTES|ENT_HTML5`.
- CSPRNG `random_bytes`/`random_int` (7.0); `openssl_random_pseudo_bytes`; Sodium (`sodium_*`) core (7.2).
- Password hashing `password_hash`/`password_verify`/`password_needs_rehash`/`password_get_info` with `PASSWORD_BCRYPT` and `PASSWORD_ARGON2I` (7.2).
- `hash`/`hash_hmac`/`hash_equals`; `sodium_compare`; HMAC.
- PDO / MySQLi prepared statements; `PDO::PARAM_STR|PDO::PARAM_STR_NATL` (7.2).
- Error/exception handlers: `set_error_handler` (no `$errcontext`), `set_exception_handler`, `register_shutdown_function`, `trigger_error`, `error_get_last`/`error_clear_last` (7.0), `error_log`, `syslog`/`openlog`/`closelog`.
- OPcache; `spl_autoload_register`; GC `gc_enable/disable/collect_cycles/enabled` (`zend.enable_gc`).
- `opcache_reset`, `opcache_get_status`.

## 3. Forbidden in 7.2 (never write; use the replacement)

| Token / feature | Why unavailable | Use instead |
|---|---|---|
| null coalescing assignment (7.4+) | invalid | `$x = $x ?? $y;` |
| arrow function syntax (7.4+) | invalid | `function () use ($v) { … }` |
| typed property declaration (7.4+) | invalid | phpdoc `@var` + untyped prop |
| formal covariance/contravariance (7.4+) | invalid | keep compatible signatures; widen param (7.2 allows omitting param type) |
| match expression (8.0+) | invalid | `switch` or lookup array |
| named arguments (8.0+) | invalid | positional args |
| nullsafe operator (8.0+) | invalid | `isset()`/`??` guard then object access |
| constructor promotion (8.0+) | invalid | explicit assigned props |
| attribute declaration syntax (8.0+) | invalid | docblocks / config |
| enumeration types (8.1+) | invalid | class with `const` cases |
| read-only properties/classes (8.1+) | invalid | immutable-by-convention (final + no public setter) |
| union type notation (8.0+) | invalid | docblock `@param int|string`; runtime check via `is_int`/`is_string` |
| mixed type (8.0+) | invalid | untyped param / docblock `@param mixed` |
| static return type (8.0+) | invalid | `: self` or concrete type |
| intersection types (8.1+) | invalid | docblock; runtime `instanceof` checks |
| first-class callable syntax (8.1+) | invalid | `Closure::fromCallable('strlen')` |
| fibers (8.1+) | invalid | generators / async lib |
| JIT (8.0+) | invalid | N/A |
| weak references (7.4+) | invalid | keep strong refs / registry |
| Random namespace / Randomizer (8.1+) | invalid | `random_int`/`random_bytes` |
| Argon2id constant (7.4+) | invalid | `PASSWORD_ARGON2I` or `PASSWORD_BCRYPT` |
| SameSite cookie directive (7.3+) | invalid | cookie flags `secure`+`httponly`+`strict_mode` |
| preloading directive (7.4+) | invalid | warm-up bootstrap `require` |
| property hooks / asymmetric visibility / lazy objects (8.x+) | invalid | not available |

## 4. Security

Password hashing (store in `VARCHAR(255)`; salt auto-generated, never pass `salt`):
```php
<?php
declare(strict_types=1);

$hash = password_hash($senha, PASSWORD_ARGON2I, [
    'memory_cost' => PASSWORD_ARGON2_DEFAULT_MEMORY_COST,
    'time_cost'   => PASSWORD_ARGON2_DEFAULT_TIME_COST,
    'threads'     => PASSWORD_ARGON2_DEFAULT_THREADS,
]);
// or portable, widely supported:
$hash = password_hash($senha, PASSWORD_BCRYPT, ['cost' => 12]);

if (password_verify($senha, $hash)) {
    if (password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => 14])) {
        $hash = password_hash($senha, PASSWORD_BCRYPT, ['cost' => 14]);
    }
}
```

CSRF / token: generate with `random_int`; compare with `hash_equals`.
```php
<?php
$token = bin2hex(random_bytes(32));          // store in session on form render
// on submit:
if (!hash_equals($tokenEsperado, (string) ($_POST['token'] ?? ''))) {
    http_response_code(403); exit('invalid token');
}
```

Prepared statements (never interpolate):
```php
<?php
$pdo = new PDO($dsn, $usr, $pw, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
$stmt = $pdo->prepare('SELECT id,nome FROM usuarios WHERE email = ?');
$stmt->execute([$email]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
```

Input validation & filtering:
```php
<?php
$email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
$idade = filter_input(INPUT_GET, 'idade', FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 0, 'max_range' => 150],
]);
$ip = filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP,
    FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
```
Use `FILTER_VALIDATE_INT/FLOAT/BOOLEAN/EMAIL/URL/IP/DOMAIN`; `FILTER_SANITIZE_EMAIL/URL/NUMBER_INT/NUMBER_FLOAT/FULL_SPECIAL_CHARS`. Prefer `FILTER_VALIDATE_BOOLEAN` (not the 8.0 alias `FILTER_VALIDATE_BOOL`).

Output escaping — context-aware:
```php
<?php
echo htmlspecialchars($valor, ENT_QUOTES | ENT_HTML5, 'UTF-8');
// JSON context: json_encode($d, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT)
// URL context: urlencode($v)
```

Constant-time secret compare: `hash_equals($expected, $computed)`; HMAC via `hash_hmac('sha256', $data, $key)`.

Symmetric crypto (core Sodium 7.2): `sodium_crypto_secretbox` + `random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES)`; wipe keys with `sodium_memzero`.

Session hardening:
```php
<?php
ini_set('session.cookie_secure', '1');     // TLS only
ini_set('session.cookie_httponly', '1');   // no JS access
ini_set('session.use_strict_mode', '1');    // refuse non-server IDs
session_start();
session_regenerate_id(true);                // after auth / periodically
```

Rules: no `eval`; never `unserialize` untrusted data (use `json_decode` or `unserialize` only on server-produced, integrity-checked strings, or filtered `unserialize` with allowed classes); keep secrets in env, not source; disable dangerous funcs; set `default_charset=UTF-8`; restrict `allow_url_fopen`/`allow_url_include`; emit `Content-Security-Policy` and `Strict-Transport-Security` (HSTS) headers at the web layer.

## 5. Performance

- OPcache is the single biggest win: `opcache.enable=1`; prod `opcache.validate_timestamps=0` (reload pool on deploy via `opcache_reset()` or FPM reload); size `opcache.memory_consumption`, `opcache.max_accelerated_files` (≥ total project files), `opcache.interned_strings_buffer`; `realpath_cache_size`/`realpath_cache_ttl`.
- Autoload via `spl_autoload_register` / Composer PSR-4 — avoid chained `require`.
- Generators for large/streaming datasets (constant memory).
- Minimize I/O; cache query/IO results per request; avoid `count()`/`strlen()` in loop conditions (precompute).
- Prefer array functions (`array_map/filter/reduce/walk`) for pure transforms; avoid `goto`.
- `foreach` by reference: always `unset($v)` after, or use `array_map`/`array_walk`.
- Profiling mindset: measure before optimizing; `declare(strict_types=1)` aids OPcache optimization; GC auto-on; call `gc_collect_cycles()` only in long loops with many reference cycles.
- Avoid premature optimization and unnecessary regex (use `filter_var`/string ops).

## 6. Maintainability

- PSR-12 style; one class per file; class name = file name (PSR-4).
- Namespaces for org; `use` imports; explicit aliases to resolve collisions.
- Autoloading (PSR-4 in `composer.json` or `spl_autoload_register`).
- Program to interfaces; traits for horizontal reuse; prefer composition over deep inheritance.
- Dependency injection via constructor; no global state abuse.
- Small functions, single responsibility; explicit types + `declare(strict_types=1)` in libraries.
- Docblocks (`@param`, `@return`, `@var`) where types need documentation; keep comments minimal and meaningful.
- Consistent error strategy (exceptions); readable over clever; no god classes.

## 7. Typing

```php
<?php
declare(strict_types=1);

function totalizar(iterable $itens, ?int $limite = null): int
{
    $soma = 0;
    foreach ($itens as $v) {
        $soma += (int) $v;
    }
    return $limite !== null ? min($soma, $limite) : $soma;
}

function processar(object $alvo): void { /* any object */ }

function buscar(string $id): ?array { return $cache[$id] ?? null; }
```
- `strict_types=1` is per-file; the file that *defines* the function decides the mode for its params/return.
- Coercion pitfalls (weak mode): `float`→`int` truncates; numeric string→number; `bool` accepts almost anything. Prefer strict to catch bugs.
- `null` only via `?Type`; `void` forbids return value; `iterable`/`object` broaden without coupling.
- No native unions: represent `int|string` only in docblocks and validate at runtime (`is_int`/`is_string`).

## 8. Functional Idioms

```php
<?php
declare(strict_types=1);

$nums = [1, 2, 3, 4, 5];
$dobro = array_map(function (int $n): int { return $n * 2; }, $nums);
$pares = array_filter($nums, function (int $n): bool { return $n % 2 === 0; });
$soma  = array_reduce($nums, function (int $acc, int $n): int { return $acc + $n; }, 0);

$multiplicar = function (int $n) use ($fator): int { return $n * $fator; };
$closure = Closure::fromCallable('strlen');          // callable -> Closure

// generator (lazy)
function intervalo(int $ate): Generator {
    for ($i = 1; $i <= $ate; $i++) { yield $i; }
}
```
- Immutability by convention: return new values; pure functions (no side effects) for transforms.
- Capture with `use` only when needed; prefer explicit params.
- `call_user_func_array($fn, $args)` for variadic dispatch; `[$obj,'m']()` direct call is faster.

## 9. OOP Idioms

```php
<?php
declare(strict_types=1);

interface Repositorio {
    public function salvar(array $dados): void;
    public function buscar(int $id): ?array;
}

trait Auditavel {
    private $log = [];
    public function registrar(string $e): void { $this->log[] = $e; }
}

final class Usuario implements Repositorio {
    use Auditavel;
    /** @var string */
    private $nome;
    public function __construct(string $nome) { $this->nome = $nome; }
    public function salvar(array $dados): void { $this->registrar('salvo'); }
    public function nome(): string { return $this->nome; }
}

// anonymous class
$logger = new class {
    public function info(string $m): void { error_log($m); }
};

// late static binding
class Base {
    public static function criar(): self { return new static(); }
    public static function quem(): string { return static::class; }
}
class Filha extends Base {}
```
- Magic methods sparingly; `__sleep`/`__wakeup` for serialization with resources; `__clone` for deep copy.
- Constructor injection; `final` to protect invariants; composition over inheritance.
- `Serializable` legacy interface available if needed.

## 10. Error & Exception Handling

```php
<?php
declare(strict_types=1);

set_error_handler(function (int $errno, string $errstr, string $errfile = '', int $errline = 0) {
    if (!(error_reporting() & $errno)) return false;     // ignore @-suppressed
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

try {
    $x = someOperation();
} catch (InvalidArgumentException | RuntimeException $e) {  // multi-catch
    logError($e);
} catch (TypeError $e) {
    logError($e);
} catch (Throwable $e) {          // Error + Exception root
    logError($e);
    http_response_code(500);
} finally {
    cleanup();
}
```
- Catch specific before generic; never swallow silently (log always).
- `register_shutdown_function` + `error_get_last()` to capture fatals (`E_ERROR`,`E_PARSE`).
- `set_exception_handler` for top-level uncaught logging.
- Fail fast: throw on invalid state; reserve `null` for "no value", not errors.

## 11. Logging

```php
<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');      // prod: off
ini_set('log_errors', '1');
ini_set('error_log', '/var/log/app/app.log');

function logMsg(string $nivel, string $msg, array $ctx = []): void {
    $linha = sprintf('[%s] %s %s', $nivel, $msg, json_encode($ctx));
    error_log($linha, 3, '/var/log/app/app.log');   // type 3 -> file
}
// PSR-3 style levels: emergency/alert/critical/error/warning/notice/info/debug
// redact secrets: never log passwords, tokens, raw cookies
```
- `error_log` types: 0 (SAPI/syslog), 1 (email), 3 (file append), 4 (SAPI handler).
- `openlog`/`syslog`/`closelog` with `LOG_*` priorities.
- No `$errcontext` in handlers (deprecated in 7.2).
- Rotate logs externally; never log sensitive PII or secrets; include context, not raw credentials.

## 12. php.ini / Web Server Config Hardening (7.2-valid)

Security block:
```ini
expose_php = Off
display_errors = Off
display_startup_errors = Off
log_errors = On
error_log = /var/log/php/php-error.log
allow_url_fopen = Off
allow_url_include = Off
open_basedir = /var/www/app:/tmp
disable_functions = "exec,passthru,shell_exec,system,proc_open,popen,pcntl_exec"
session.cookie_secure = On
session.cookie_httponly = On
session.use_strict_mode = On
session.cookie_lifetime = 0
enable_dl = Off
```
Performance block:
```ini
opcache.enable = 1
opcache.memory_consumption = 128
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 60
opcache.validate_timestamps = 0
realpath_cache_size = 4096K
realpath_cache_ttl = 600
zend.assertions = -1
```
Stability block:
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
FPM/nginx: `cgi.fix_pathinfo = 0`. Dev only: `display_errors=On`, `opcache.validate_timestamps=1`, `zend.assertions=1`. Extension load by name (7.2): `extension=sodium`.

## 13. Correct Patterns (copy-ready, valid 7.2)

Safe DB query (PDO):
```php
<?php
declare(strict_types=1);
$pdo = new PDO($dsn, $u, $p, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$stmt = $pdo->prepare('SELECT id,email FROM usuarios WHERE id = :id');
$stmt->execute(['id' => $id]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);
```

Password login:
```php
<?php
declare(strict_types=1);
$hash = /* from DB */;
if (password_verify($senha, $hash)) {
    session_regenerate_id(true);
    if (password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => 12])) {
        // update DB with password_hash($senha, PASSWORD_BCRYPT, ['cost'=>12])
    }
}
```

Secure token + compare:
```php
<?php
declare(strict_types=1);
$token = bin2hex(random_bytes(32));
$ok = hash_equals($token, (string) ($_POST['token'] ?? ''));
```

Strict-typed function:
```php
<?php
declare(strict_types=1);
function media(float ...$nums): float {
    return $nums === [] ? 0.0 : array_sum($nums) / count($nums);
}
```

Generator streaming:
```php
<?php
declare(strict_types=1);
function linhas(string $arquivo): Generator {
    $h = fopen($arquivo, 'r');
    try {
        while (($l = fgets($h)) !== false) yield rtrim($l);
    } finally {
        fclose($h);
    }
}
```

PSR-4 autoload bootstrap:
```php
<?php
spl_autoload_register(function (string $classe): void {
    $prefix = 'App\\';
    $base = __DIR__ . '/src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $classe, $len) !== 0) return;
    $arq = $base . str_replace('\\', '/', substr($classe, $len)) . '.php';
    if (is_file($arq)) require $arq;
});
```

Secure session start:
```php
<?php
ini_set('session.cookie_secure', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
session_start();
session_regenerate_id(true);
```

Custom exception:
```php
<?php
declare(strict_types=1);
class DominioException extends InvalidArgumentException {}
throw new DominioException('estado inválido');
```

## 14. Anti-Patterns

- Never output unescaped data (XSS): always `htmlspecialchars(..., ENT_QUOTES|ENT_HTML5, 'UTF-8')`.
- Never hash passwords with `md5`/`sha1`/`crypt` raw; use `password_hash` (ARGON2I/BCRYPT).
- Never `unserialize` untrusted input; never `eval`; avoid variable-function names from user input without allowlist.
- Never swallow exceptions silently (no empty `catch {}`); always log `Throwable`.
- Avoid global state; avoid `goto`; avoid `register_globals`-style trust of input.
- Never use post-7.2 tokens (null coalescing assignment, arrow functions, attribute syntax, match expression) — invalid in 7.2 per §3.
- Soft: over-commenting, god classes, premature optimization, `display_errors=On` in prod, OPcache disabled in prod, deep inheritance instead of composition.

## 15. Validation Checklist (pre-commit / review)

Correctness (7.2):
- [ ] All code passes `php -l`; no syntax/feature from §3 used.
- [ ] `declare(strict_types=1)` present in library files; types explicit.
- [ ] No forbidden tokens from §3 (coalescing assignment, arrow fn, attribute syntax, match, enumeration, read-only, union notation, nullsafe, static return type).
- [ ] `void` returns nothing; `?Type` used for nullable; `iterable`/`object` used correctly.

Security:
- [ ] Passwords via `password_hash` (ARGON2I/BCRYPT) + `password_verify`; no md5/sha1.
- [ ] DB access uses prepared statements (PDO/MySQLi); no string interpolation in SQL.
- [ ] Input validated with `filter_*`; output escaped per context.
- [ ] Tokens from `random_bytes`/`random_int`; compared with `hash_equals`.
- [ ] Sessions: `secure`+`httponly`+`strict_mode`+`regenerate_id`.
- [ ] `display_errors=Off`, `disable_functions` set, `allow_url_include=Off`, `expose_php=Off`.

Performance:
- [ ] OPcache enabled (`validate_timestamps=0` prod); realpath cache sized.
- [ ] Autoloading used; no chained `require`; generators for big data.
- [ ] No `count()` in loop conditions; no `goto`; `unset` after ref `foreach`.

Maintainability:
- [ ] PSR-12; one class/file; namespaces + PSR-4; interfaces as contracts.
- [ ] DI via constructor; small functions; no global state; docblocks where helpful.
- [ ] Exceptions (not error codes); `Throwable` logged; consistent error strategy.
