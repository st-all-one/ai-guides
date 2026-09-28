---
name: dart
description: >
  Dart 3.13: strong typing with sound null safety, primary constructors,
  records/patterns, collections, async (Future/Stream) and isolates, error
  handling, core libraries, pub, security, testing, logging/observability,
  performance (measurement, AOT/JS/Wasm, allocation/GC, isolates), Effective
  Dart (style/usage/design), analyzer/lints, interop (FFI/JS/Wasm), and
  compilation (JIT/AOT/JS/Wasm). Load when writing, reviewing, optimizing,
  debugging, or structuring Dart CLIs, servers, libraries, or Flutter apps.
category: languages
version: "3.13.0"
tags: [dart, null-safety, type-system, async, isolates, streams, patterns, records, testing, logging, security, performance, optimization, effective-dart, pub, ffi, wasm]
license: MIT
---

# Dart 3.13

Strongly typed, null-safe. Single-threaded event loop per isolate; real CPU
parallelism via isolates. Compiles to native AOT, JavaScript, and Wasm.

## Use When
- Writing / reviewing / debugging Dart (CLI, server, library, Flutter).
- Modeling data with classes, records, sealed classes, pattern matching.
- Async work: `Future`, `Stream`, `async`/`await`.
- Real parallelism with isolates (CPU-bound, background workers).
- Configuring static analysis, lints, formatting, tests.
- Publishing/maintaining pub.dev packages; managing dependencies.
- Auditing security: dependencies, inputs, secrets, crypto.
- Interop with C/FFI, JavaScript/Wasm, native platforms.

## Core Rules
- **Null safety mandatory** (Dart 3): non-nullable by default; `?` for nullable,
  `!` only when proven, `late` cautiously.
- **Avoid `dynamic`**: use `Object?` + `is`/promotion. Enable `strict-casts`,
  `strict-inference`, `strict-raw-types`.
- **Immutability by default**: `final`/`const` on fields and top-level vars;
  avoid public `late final` without initializer.
- **Errors**: `Error` = programming bug (don't catch); `Exception` = runtime
  (handle). `rethrow` preserves the stack.
- **Async**: prefer `async`/`await` over `.then()`; never leave an orphan
  `Future` (`unawaited_futures`); avoid `Completer` in normal code.
- **API**: type public APIs, return complete types, close hierarchies with
  `sealed`/`final`/`interface`/`base`.
- **Classes**: primary constructors (`class Point(var int x, var int y);`) when
  they cut boilerplate; `this.` only for shadowing/redirect.
- **Collections**: literals, `isEmpty`/`isNotEmpty`, `whereType`, spread and
  `if`/`for` in literals; avoid `cast()`.
- **Security**: never log secrets; validate all external input; use
  `package:crypto`/`cryptography` + TLS; keep deps updated.
- **Quality**: `dart format`; `dart analyze` with `package:lints/recommended`;
  `dart test` mandatory in CI.
- **Logs**: `package:logging` with hierarchical levels; `dart:developer log()`
  for DevTools; never `print()` in production.
- **Performance**: measure first (DevTools/benchmarks); compile release
  (AOT/`-O2`); avoid `dynamic`/`noSuchMethod`/`Function.apply`; CPU via
  isolates, I/O via `Future.wait`.

## Core Patterns
```dart
// Null safety + promotion
String greet(String? n) => n == null ? 'Olá!' : 'Olá, $n!';

// Primary constructor + final fields (3.13)
class Point(final int x, final int y);
class User({required final String name, final int age = 0});

// Sealed + exhaustive switch
sealed class Result<T> {}
final class Ok<T> extends Result<T> { final T value; Ok(this.value); }
final class Err<T> extends Result<T> { final Object error; Err(this.error); }
String describe(Result<int> r) => switch (r) {
  Ok(value: final v) => 'OK: $v',
  Err(error: final e) => 'Erro: $e',
};

// Records
(String, int) parse(String s) => (s, s.length);
var (name, len) = parse('Dart');

// Async, isolate, errors, test, logging
Future<int> countActive(String t) async =>
    (await fetchPlayers(t)).where((p) => p.active).length;
final fib = await Isolate.run(() => slowFib(40));
try { await risky(); } on TimeoutException catch (e, s) {
  logger.warning('timeout', e, s);
} finally { cleanup(); }
test('add', () => expect(add(2, 3), 5));
final _log = Logger('my.app')..info('started');
```

## File Map
| File | Content |
|---|---|
| `00-indice.md` | Overview, platforms, navigation |
| `01-fundamentos.md` | Syntax, variables, types, operators, control flow, functions |
| `02-tipagem-e-null-safety.md` | Type system, inference, soundness, null safety, generics, strict modes |
| `03-poo-e-classes.md` | Classes, (primary) constructors, modifiers, mixins, enums, extensions, annotations |
| `04-colecoes-e-records.md` | List/Map/Set/Queue, Iterable, records, spread, control flow in literals |
| `05-patterns-e-match.md` | Pattern matching, destructuring, exhaustive switch, if-case |
| `06-funcoes-e-generics.md` | Parameters, closures, tear-offs, generics, typedefs, extension types |
| `07-assincronismo.md` | Future, Stream, async/await, async errors, `Future.wait` |
| `08-concorrencia-isolates.md` | Event loop, isolates, `Isolate.run`/`spawn`, web workers |
| `09-tratamento-de-erros.md` | Exception vs Error, try/on/catch/finally, assert, Result |
| `10-bibliotecas-core.md` | `dart:core`, `dart:async` (Future/Stream/Zones), `dart:convert`, `dart:math`, `dart:io`, `dart:typed_data`, env declarations |
| `11-pacotes-e-pub.md` | pubspec, dependencies, workspaces, versioning, publishing |
| `12-seguranca.md` | Philosophy, dependencies, inputs, crypto, secrets, server/web |
| `13-testes.md` | `package:test`, unit/integration, mockito, coverage, CI |
| `14-logs-e-observabilidade.md` | `package:logging`, levels, redaction, DevTools, metrics |
| `15-estilo-efetivo.md` | Names, import order, formatting, 80 columns, doc comments |
| `16-uso-efetivo.md` | Collections, strings, variables, members, async, errors |
| `17-design-de-api.md` | API names, getters/setters, equality, parameters, types |
| `18-ferramentas-e-analise.md` | `dart analyze`, lints, suppression, analyzer plugins/performance, `dart fix`/`format`, build_runner |
| `19-interop-e-plataformas.md` | FFI/C, JS interop, Java/ObjC, Wasm, conditional imports, native assets/hooks, server/web, compile |
| `20-referencia-rapida.md` | Syntax and API cheatsheet |
| `21-performance.md` | Measurement, AOT/JS/Wasm, allocation/GC, structures, isolates, anti-patterns |

## Reading Order
Linear for learning (`00`→`21`). For lookup, jump to the topic. Start with `02`
for type correctness; `12`/`13`/`14` for production; `21` for performance.

## Prerequisites
Basic OOP. Dart 3.13+. `dart` on PATH (`dart --version`). Dart 2.x knowledge
unnecessary.
