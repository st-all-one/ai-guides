# 20 — Referência rápida (cheatsheet)

## Sintaxe essencial

```dart
// Programa
void main(List<String> args) { print('Hello'); }

// Variáveis
var x = 1;              // inferido
final y = 2;            // imutável
const z = 3;            // constante de compilação
late final v = compute(); // lazy
int? maybeNull;

// Tipos
int, double, num, String, bool, List<T>, Set<T>, Map<K,V>,
Object, Object?, Never, void, Future<T>, Stream<T>, Record

// Null safety
a ?? b; a?.b; a!.b; x ??= b; a?..b;

// Strings
'Olá, $name'; 'Total: ${a + b}'; r'raw\n'; '''multi
linha''';

// Funções
int f(int a, [int b = 0]) => a + b;
void g({required int a, int b = 0}) {}
final fn = (int x) => x * 2;

// Controle
if (c) {} else if (d) {} else {}
for (var i = 0; i < n; i++) {}
for (final e in iterable) {}
while (c) {} do {} while (c);
switch (x) { case 1: ...; case > 2 when c: ...; default: ...; }

// Classes
class A { final int x; const A(this.x); }
class Point(final int x, final int y);          // primário (3.13)
class B extends A { B(super.x); }
class C implements A { final int x; C(this.x); }
mixin M { void hi() {} }
class D with M {}
abstract class E { void f(); }
sealed class S {}
enum Color { red, green }

// Patterns
var (a, [b, c]) = ('x', [1, 2]);
(b, a) = (a, b);
if (v case int n) {}
switch (v) { case [int a, int b]: ...; }
switch (r) { Ok(value: final v) => v, Err() => null };

// Records
var rec = (1, 'a', ok: true);
rec.$1; rec.$2; rec.ok;
(int, String) f() => (1, 'a');

// Async
Future<int> f() async => 1;
Stream<int> s() async* { yield 1; }
await Future.wait([a, b]);
await for (final v in stream) {}

// Exceções
try { ... } on E catch (e, s) { ... } finally { ... }
rethrow;
assert(cond, 'msg');

// Isolate
await Isolate.run(() => heavy());

// Dot shorthands (contexto define o tipo)
Status s = .running;            // Status.running
int p = .parse('80');           // int.parse
Map<String, int> m = .new();    // Map<String,int>.new

// Imports
import 'dart:async';
import 'package:http/http.dart' as http;
import 'src/foo.dart' show Foo hide Bar;
export 'src/api.dart';
```

## Collections

```dart
[1, 2, 3]; {1, 2}; {'a': 1}; <int>[]; <String, int>{};
[...list, 4]; [...?maybe]; {for (final x in xs) x: x};
if (c) 1 else 2;                 // em literal
list.map((e) => e * 2); list.where((e) => e > 0);
list.whereType<int>(); list.expand((e) => [e, e]);
list.fold(0, (a, b) => a + b); list.reduce((a, b) => a + b);
list.any((e) => e > 0); list.every((e) => e > 0);
list.take(3); list.skip(2); list.toList(); list.toSet();
list.isEmpty; list.isNotEmpty; list.contains(2);
map.keys; map.values; map.entries; map.putIfAbsent('k', () => 1);
map.update('k', (v) => v + 1, ifAbsent: () => 1);
map.forEach((k, v) {});
```

## Classes e construtores

```dart
class User {
  final String name; final int age;                 // campos
  User(this.name, this.age);                        // gerador
  User.guest() : this('Visitante', 0);              // nomeado
  factory User.fromJson(Map<String, dynamic> j) =>  // factory
      User(j['name'] as String, j['age'] as int);
  @override String toString() => 'User($name, $age)';
  @override bool operator ==(Object o) =>
      o is User && o.name == name && o.age == age;
  @override int get hashCode => Object.hash(name, age);
  User copyWith({String? name, int? age}) =>
      User(name ?? this.name, age ?? this.age);
}

// Primário (3.13)
class Point(final int x, final int y);
class User2({required final String name, final int age = 0});

// Modificadores
abstract class A {}
base class B {}
interface class C {}
final class D {}
sealed class E {}
mixin class F {}
abstract interface class G {}
```

## Assincronismo

```dart
Future<T> f() async { return await g(); }
Future<void> h() async { await f(); }
Stream<T> s() async* { yield await item(); }

await Future.wait([a, b]);         // todos
await Future.any([a, b]);          // primeiro
await fut.timeout(Duration(seconds: 3));
await [a, b].wait;                 // erros parciais (ParallelWaitError)
await (a, b).wait;                 // record, tipos diferentes
stream.listen((v) {}, onError: (e, s) {}, onDone: () {});
await for (final v in stream) {}
sub.cancel();
controller.close();
```

## Isolates

```dart
final r = await Isolate.run(() => compute());
final port = ReceivePort();
await Isolate.spawn(worker, port.sendPort);
final sendPort = await port.first as SendPort;
Isolate.exit(resultPort, value);
```

## Erros

```dart
class MyException implements Exception {
  final String message;
  const MyException(this.message);
  @override String toString() => 'MyException: $message';
}
try { ... } on MyException catch (e) { ... }
catch (e, s) { log.severe('erro', e, s); rethrow; }
finally { cleanup(); }
```

## Testes

```dart
import 'package:test/test.dart';

void main() {
  group('grupo', () {
    late Subject s;
    setUp(() => s = Subject());
    test('comportamento', () {
      expect(s.value, equals(42));
    });
    test('erro', () => expect(() => s.fail(), throwsStateError));
    test('async', () async => expect(await s.load(), isNotEmpty));
    test('stream', () => expect(s.stream, emitsInOrder([1, 2, emitsDone])));
  });
}
```

## Logs

```dart
import 'package:logging/logging.dart';
final log = Logger('app');
Logger.root.level = Level.INFO;
Logger.root.onRecord.listen((r) => print('${r.level.name}: ${r.message}'));
log.info('info');
log.warning('aviso');
log.severe('erro', error, stackTrace);
```

## `dart:*` mais usados

```dart
// dart:convert
jsonDecode(str); jsonEncode(obj); utf8.encode(s); utf8.decode(b);
base64.encode(bytes); base64.decode(s);

// dart:math
pi; sqrt(x); pow(a, b); min(a, b); max(a, b);
Random(seed).nextInt(100); Random.secure();

// dart:io
File('a').readAsString(); Directory('d').list();
Process.run('git', ['status']); HttpClient();
HttpServer.bind(InternetAddress.anyIPv4, 8080);
stdout.writeln(); stderr.writeln(); stdin.readLineSync();
Platform.environment['HOME']; exitCode;

// dart:typed_data
Uint8List(n); Int32List.fromList([...]); ByteData(n);

// dart:developer
dev.log('msg', name: 'app', level: 800, error: e, stackTrace: s);
```

## CLI

```bash
dart create -t console-simple app
dart pub get
dart run bin/app.dart
dart analyze --fatal-infos
dart fix --apply
dart format .
dart test --coverage=coverage
dart compile exe bin/app.dart -o build/app
dart compile js web/main.dart -O2
dart compile wasm web/main.dart -O2
dart doc
dart pub outdated && dart pub upgrade
dart pub publish --dry-run
dart devtools
```

## `analysis_options.yaml` mínimo

```yaml
include: package:lints/recommended.yaml
analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
linter:
  rules:
    avoid_print: true
    cancel_subscriptions: true
    close_sinks: true
    only_throw_errors: true
    unawaited_futures: true
    use_rethrow_when_possible: true
```

## Salientas da versão 3.13

- **Primary constructors** (`class Point(var int x, var int y);`).
- **Concise constructor syntax** (`new _internal(this.name);`,
  `factory(...)`).
- `final`/`var` em parâmetros só em primary constructors.
- `Future.pause`.
- Formatter refinements.
- Wasm deferred loading (`--enable-deferred-loading`).
