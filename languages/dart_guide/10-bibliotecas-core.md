# 10 — Bibliotecas core (dart:*)

## 1. Mapa de bibliotecas

| Biblioteca | Uso | Plataforma |
|---|---|---|
| `dart:core` | tipos, coleções, `Object`, `Function`, `Future`/`Stream` (reexport) | todas |
| `dart:async` | `Future`, `Stream`, `Completer`, `Timer`, `scheduleMicrotask` | todas |
| `dart:collection` | `Queue`, `LinkedList`, `HashMap`, `SplayTreeMap`, `UnmodifiableListView` | todas |
| `dart:convert` | JSON, UTF-8, base64, hex, line splitter | todas |
| `dart:math` | constantes, funções, `Random` | todas |
| `dart:typed_data` | `Uint8List`, `Int32List`, `ByteData`, `Float64List` | todas |
| `dart:developer` | `log()`, `inspect()`, `Timeline`, `Service` | VM (JIT) e DDC |
| `dart:io` | arquivos, sockets, HTTP client/server, processos, stdin/stdout | nativa |
| `dart:isolate` | isolates, `ReceivePort`, `SendPort` | nativa |
| `dart:ffi` | chamadas a C | nativa |
| `dart:js_interop` | interop com JS | web |
| `package:web` | bindings de APIs do browser | web |

> `package:async`, `package:collection`, `package:convert`, `package:io`
> estendem as libs core com utilitários (ex.: `CancelableOperation`,
> `ListEquality`, `ExitCode`).

## 2. `dart:core`

`Object` (`toString`, `==`, `hashCode`, `runtimeType`, `noSuchMethod`);
`String`/`int`/`double`/`bool`/`num`; `List`/`Set`/`Map`/`Iterable`;
`Future`/`Stream`; `DateTime`, `Duration`, `Uri`, `RegExp`, `BigInt`;
`Symbol`, `Enum`, `Record`; `print`, `identical`, `identityHashCode`.

```dart
final now = DateTime.now().toUtc();
final d = Duration(minutes: 5, seconds: 30);
final uri = Uri.https('example.com', '/api', {'q': 'dart'});
final re = RegExp(r'^[a-z]+$');
```

### `Iterable` (lazy) — operações comuns
```dart
final it = [1, 2, 3, 4];
it.map((e) => e * 2); it.where((e) => e.isEven);
it.whereType<num>(); it.expand((e) => [e, e]);
it.fold<int>(0, (a, b) => a + b); it.reduce((a, b) => a + b);
it.any((e) => e > 3); it.every((e) => e > 0);
it.take(2); it.skip(1); it.takeWhile((e) => e < 4);
it.toList(); it.toSet(); it.join(', ');
it.firstWhere((e) => e > 2, orElse: () => -1);
```
Métodos lazy só executam ao serem consumidos.

## 3. `dart:async`

Além de `Future`/`Stream` (ver `07`):
```dart
Timer(Duration(seconds: 1), () => print('tick'));
Timer.periodic(Duration(seconds: 1), (t) => t.cancel());
scheduleMicrotask(() => print('antes do próximo evento'));
Completer<int>()..complete(42);        // baixo nível
StreamController<int>.broadcast();     // múltiplos listeners
```
Utilitários de `package:async`: `CancelableOperation`, `FutureGroup`,
`StreamGroup`, `AsyncMemoizer`, `Result`.

### Zones (`Zone`, `runZonedGuarded`)

Uma `Zone` é um contexto de execução que intercepta erros assíncronos,
agendamentos (`scheduleMicrotask`, `createTimer`) e chamadas. Útil para isolar
erros, telemetria e testes.

```dart
import 'dart:async';

void main() {
  runZonedGuarded(
    () {
      // Erros assíncronos (inclusive de Futures não tratados) caem aqui.
      Future(() => throw StateError('falhou'));
    },
    (error, stack) => print('não capturado: $error'),
  );

  final filha = Zone.current.fork(
    specification: ZoneSpecification(
      handleUncaughtError: (self, parent, zone, error, stack) {
        parent.print(zone, 'capturado: $error');
      },
    ),
  );
  filha.run(() => print('rodando na zona filha'));
}
```
- `Zone.current` é a zona ativa; `Zone.root` é a raiz.
- `runZonedGuarded` captura erros que escapariam (útil no `main`/frameworks).
- Flutter usa zones internamente — não abuse delas por performance.

## 4. `dart:convert`

```dart
import 'dart:convert';

// JSON
final data = jsonDecode('{"a":1,"b":[2,3]}') as Map<String, dynamic>;
final text = jsonEncode({'a': 1, 'b': [2, 3]});
jsonEncode(obj, toEncodable: (o) => o.toString()); // objetos não-encodáveis

// UTF-8 / streams
final bytes = utf8.encode('olá');
final str = utf8.decode(bytes);
stream.transform(utf8.decoder).transform(const LineSplitter());

// Base64 / Hex
base64.encode(bytes); base64.decode('...');
hex.encode([1, 2, 255]); hex.decode('01ff'); // package:convert
```
Tipos diretamente encodáveis em JSON: `int`, `double`, `String`, `bool`,
`null`, `List`, `Map<String, ...>`. Caso contrário, use `toJson()` ou
`toEncodable`.

## 5. `dart:math`

```dart
import 'dart:math';

pi; e; sqrt(2); pow(2, 10); exp(1); log(e);
sin(pi / 2); cos(0); tan(0.5); atan2(1, 1);
min(1, 2); max(1, 2); random();
final r = Random(42);          // determinístico (seed)
r.nextDouble(); r.nextInt(100); r.nextBool();
r.nextBytes(16);               // dart:math (criptograficamente fraco!)
final secure = Random.secure(); // use para tokens, não para senhas
```
> Para criptografia, use `package:crypto`/`cryptography` e
> `Random.secure()`; nunca `Random()` para segredos.

## 6. `dart:typed_data`

```dart
import 'dart:typed_data';

final u8 = Uint8List(4);
final i32 = Int32List.fromList([1, 2, 3]);
final f64 = Float64List.fromList([1.0, 2.0]);
final bd = ByteData(8)
  ..setUint32(0, 0xDEADBEEF)
  ..setFloat32(4, 3.14, Endian.little);
final view = u8.buffer.asByteData();
```
Útil para rede, arquivos binários, FFI, imagens e desempenho.

## 7. `dart:io`

```dart
import 'dart:io';

// Arquivos
final file = File('dados.txt');
await file.writeAsString('conteúdo\n');
final text = await file.readAsString();
final bytes = await file.readAsBytes();
final lines = await file.readAsLines();
if (await file.exists()) { /* ... */ }

// Streams de arquivo
await file.openRead().transform(utf8.decoder).forEach(print);

// Diretórios
final dir = Directory('out')..createSync(recursive: true);
await dir.list().forEach(print);           // Stream<FileSystemEntity>
await for (final e in dir.list()) { if (e is File) print(e.path); }

// Processos
final result = await Process.run('git', ['status']);
print(result.stdout);
final proc = await Process.start('dart', ['run']);
stdin.pipe(proc.stdin); proc.stdout.pipe(stdout);

// HTTP client
final client = HttpClient();
final req = await client.getUrl(Uri.parse('https://example.com'));
final res = await req.close();
final body = await res.transform(utf8.decoder).join();
client.close();
// Prefira package:http para código de alto nível.

// Servidor HTTP
final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 8080);
await for (final req in server) {
  req.response
    ..headers.contentType = ContentType.json
    ..write(jsonEncode({'ok': true}));
  await req.response.close();
}

// Ambiente e exit codes
Platform.environment['HOME']; Platform.isWindows;
stdout.writeln('saída'); stderr.writeln('erro');
exitCode = 0; // exit(0) encerra imediatamente
```

## 8. `dart:developer` (observabilidade)

```dart
import 'dart:developer' as dev;

dev.log(
  'usuário autenticado',
  name: 'auth',
  level: 800,                 // 800=info, 900=warning, 1000=severe
  error: e,
  stackTrace: s,
  sequenceNumber: 1,
);
dev.inspect(obj);
final task = dev.TimelineTask()..start('etapa');
task.finish();
dev.Timeline.timeSync('bloco', () { /* ... */ });
```
`dev.log` aparece no DevTools/observatório — não use em produção como log
estruturado (ver `14`).

## 9. Declarações de ambiente (compile-time)

```dart
const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'https://x');
const debug = bool.fromEnvironment('DEBUG');   // false por padrão
const port = int.fromEnvironment('PORT', defaultValue: 8080);
const hasFlag = bool.hasEnvironment('DEBUG');  // detecta se foi definida
```
```bash
dart run --define=DEBUG=true --define=PORT=9000 bin/app.dart
dart compile exe -DAPI_URL=https://prod -DPORT=8080 bin/app.dart
dart test --define=DEBUG=true
```
- São **constantes de tempo de compilação** (tree shaking remove as não usadas).
- Use para configuração (URLs, feature flags) — **nunca para segredos**.
- `--define`/`-D` funcionam em `run`, `compile`, `test` e `pub`.

## 10. Boas práticas

- Importe libs de plataforma só quando necessário; `dart:io` não roda no web.
- Use `dart:convert` (`jsonDecode`) e converta para tipos precisos cedo.
- Prefira APIs assíncronas (`readAsString`) a síncronas (`readAsStringSync`)
  fora de scripts simples.
- Feche recursos (`client.close()`, `sink.close()`, `file` streams).
- Use `typed_data` para binário; evite `List<int>` genérico sem necessidade.
- Use `Random.secure()`/`package:crypto` para segurança.
- Consulte a [API reference](https://api.dart.dev) para detalhes completos.
