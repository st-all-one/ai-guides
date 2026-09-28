# 08 — Concorrência e isolates

## 1. Event loop

Dart roda cada isolate em uma única thread com um **event loop** que processa
uma fila de eventos FIFO:

```dart
while (eventQueue.waitForEvent()) {
  eventQueue.processNextEvent();
}
```

Operações assíncronas (`Future`, `Stream`) registram callbacks que o event loop
executa quando o resultado chega. Operações **síncronas longas bloqueiam** o
loop e travam o app (jank em UI).

## 2. Isolates

Para usar múltiplos núcleos, Dart usa **isolates** — workers independentes com
memória própria e thread própria. Não há estado compartilhado: comunicação
apenas por mensagens. Isso elimina data races e a necessidade de mutex/locks
no código Dart.

- Todo programa começa no **main isolate**.
- Cada isolate tem variáveis globais próprias.
- Mensagens enviam cópias (ou transferem memória, em alguns casos).
- Isolates não são threads: não compartilham memória.

### `Isolate.run` (recomendado)
Executa uma computação única e retorna o resultado:

```dart
import 'dart:isolate';

int slowFib(int n) => n <= 1 ? 1 : slowFib(n - 1) + slowFib(n - 2);

Future<void> fib40() async {
  final result = await Isolate.run(() => slowFib(40));
  print('Fib(40) = $result');
}
```

### `Isolate.spawn` (worker de longa vida)
Para múltiplas mensagens ao longo do tempo, use `ReceivePort`/`SendPort`:

```dart
Future<void> main() async {
  final receivePort = ReceivePort();
  await Isolate.spawn(worker, receivePort.sendPort, debugName: 'worker');

  final sendPort = await receivePort.first as SendPort;
  final answer = ReceivePort();
  sendPort.send(['ping', answer.sendPort]);
  print(await answer.first); // 'pong'
  answer.close();
  receivePort.close();
}

void worker(SendPort toMain) {
  final commands = ReceivePort();
  toMain.send(commands.sendPort);
  commands.listen((message) {
    if (message is List && message.first == 'ping') {
      (message.last as SendPort).send('pong');
    }
  });
}
```

- `Isolate.exit(sendPort, result)` encerra e transfere o resultado de forma
  eficiente (mesmo isolate group).
- `Isolate.spawnUri` copia o código (mais lento, grupo separado) — evite.
- Isolate groups compartilham código/dados; spawn é mais barato que spawnUri.

## 3. Limitações

- **Não são threads**: sem memória compartilhada; globais não são refletidas.
- **Tipos não enviáveis**: `Socket`, `ReceivePort`, `DynamicLibrary`,
  `Finalizable`, `Finalizer`, `NativeFinalizer`, `Pointer`, `UserTag` e
  classes com `@pragma('vm:isolate-unsendable')`.
- **Bloqueio síncrono via FFI** entre isolates pode causar deadlock; o código C
  deve entrar/sair do isolate (`Dart_EnterIsolate`/`Dart_ExitIsolate`).
- Limite de isolates em paralelo depende do heap da VM; comunicação
  assíncrona escala para centenas.

## 4. Quando usar isolates

Use quando a tarefa for **CPU-bound**: parsing de JSON grande, criptografia,
processamento de imagem, cálculos pesados. Para **I/O-bound**, `async`/`await`
basta (I/O roda fora do Dart).

```dart
// CPU-bound → isolate
final parsed = await Isolate.run(() => jsonDecode(bigJson));

// I/O-bound → async
final content = await File('big.json').readAsString();
```

## 5. Concorrência no web

O web **não suporta isolates**. Use `async`/`await`, `Future`, `Stream` e
**Web Workers** (que copiam dados entre threads; iniciados por entrypoint
separado, sem equivalente a `Isolate.spawn`).

## 6. Utilitários

- `package:isolate` / `package:isolate_name_server` para gerenciar workers.
- No Flutter, `compute()` embrulha `Isolate.run`.
- `dart:developer` para instrumentação e `UserTag`.

## 7. Boas práticas

- Prefira `Isolate.run` para tarefas pontuais.
- Mantenha funções enviadas a isolates **top-level ou estáticas** (ou closures
  capturáveis), evitando capturar estado grande.
- Envie dados serializáveis e pequenos; grandes volumes custam cópia.
- Feche portas (`ReceivePort.close`) e encerre isolates ociosos.
- Não bloqueie o event loop com computação pesada — mova para isolate.
- Não presuma ordem entre isolates; sincronize por mensagens.
- Trate erros no isolate e propague via `SendPort`/`Isolate.exit`.

## 8. Exemplo: paralelismo com pool simples

```dart
Future<List<R>> mapParallel<T, R>(
  List<T> input,
  R Function(T) work, {
  int workers = 4,
}) async {
  final chunks = <List<T>>[];
  final size = (input.length / workers).ceil();
  for (var i = 0; i < input.length; i += size) {
    chunks.add(input.sublist(i, (i + size).clamp(0, input.length)));
  }

  final results = await Future.wait(
    chunks.map((chunk) => Isolate.run(() => chunk.map(work).toList())),
  );
  return results.expand((e) => e).toList();
}
```
