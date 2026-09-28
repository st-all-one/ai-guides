# 07 — Assincronismo: Future, Stream e async/await

## 1. Modelo básico

Dart é single-threaded por isolate, com **event loop**. Operações assíncronas
devolvem `Future<T>` (valor único) ou `Stream<T>` (sequência). `async`/`await`
permitem escrever código assíncrono com aparência síncrona.

```dart
import 'dart:async'; // Future/Stream já vêm de dart:core, mas async tem utilitários

Future<void> checkVersion() async {
  final version = await lookUpVersion();
  print(version);
}
```

Ao encontrar o primeiro `await`, a função suspende, devolve um `Future` e
libera o event loop; retoma quando o valor estiver pronto.

## 2. `async`/`await`

```dart
Future<String> lookUpVersion() async => '1.0.0';

Future<void> main() async {
  final a = await findEntryPoint();
  final exit = await runExecutable(a, args);
  await flushThenExit(exit);
}
```

Regras:
- `await` só dentro de função `async`.
- Uma função `async` sempre retorna `Future<T>`.
- `async` desnecessário: se você pode omiti-lo sem mudar comportamento, omita
  (ex.: `Future<int> f() => Future.any([a, b]);`).
- Use `async` quando: há `await`, quer lançar erro de forma assíncrona
  (`async { throw ...; }`), ou quer embrulhar um valor em `Future`.

## 3. Tratamento de erros

```dart
try {
  final value = await risky();
} on TimeoutException catch (e, s) {
  logger.warning('timeout', e, s);
} catch (e, s) {
  logger.severe('inesperado', e, s);
} finally {
  cleanup();
}
```

- `try/catch/finally` funcionam para sync e async dentro de `async`.
- Sem `await`/`catch`, erros em `Future` viram **unhandled exceptions** e
  podem derrubar o isolate. Sempre trate ou repasse.
- `Future` API: `then().catchError()` — registre `catchError` no resultado do
  `then`, não no future original.

```dart
httpClient.read(url).then((result) {
  print(result);
}).catchError((Object e, StackTrace s) {
  logger.severe('http', e, s);
});
```

## 4. Combinando futures

```dart
// Esperar todos (paralelo). Falha se qualquer um falhar.
final results = await Future.wait([delete(), copy(), checksum()]);

// Corrida: o primeiro que completar
final fastest = await Future.any([left, right]);

// Timeout
final value = await slow().timeout(const Duration(seconds: 5));

// Execução sequencial
final a = await first();
final b = await second(a);
```

### `Future.wait` estendido (Dart 3)
Para iterables/records, `wait` preserva erros individuais via `ParallelWaitError`:

```dart
try {
  final (a, b, c) = await (delete(), copy(), errorResult()).wait;
} on ParallelWaitError<(int?, String?, bool?),
                       (AsyncError?, AsyncError?, AsyncError?)> catch (e) {
  print(e.values); // resultados bem-sucedidos (null onde falhou)
  print(e.errors); // erros (null onde deu certo)
}
```
Use para coletar sucessos mesmo quando parte falha.

## 5. Streams

`Stream<T>` emite 0..N valores e pode terminar com erro/fim.

### Criando
```dart
// Assíncrono
Stream<int> countTo(int n) async* {
  for (var i = 1; i <= n; i++) {
    await Future<void>.delayed(const Duration(milliseconds: 100));
    yield i;
  }
}

// Síncrono (Iterable)
Iterable<int> naturals() sync* {
  var i = 0;
  while (true) yield i++;
}

// Controller (casos de baixo nível / pontes)
final controller = StreamController<int>();
controller.add(1);
controller.addError(StateError('falhou'));
controller.close();
```

### Consumindo
```dart
// await for (dentro de async)
await for (final value in stream) {
  print(value);
}

// listen (mais controle)
final sub = stream.listen(
  (value) => print(value),
  onError: (Object e, StackTrace s) => print('erro: $e'),
  onDone: () => print('fim'),
  cancelOnError: false,
);
await sub.cancel(); // sempre cancele para evitar leaks
```

### Transformando
```dart
stream
  .where((e) => e.isEven)
  .map((e) => e * 2)
  .take(5)
  .listen(print);

stream.transform(utf8.decoder).transform(const LineSplitter());
```

- `await for` não deve ser usado em streams infinitos (ex.: eventos de UI).
- Prefira métodos de ordem superior (`map`, `where`, `expand`, `asyncMap`) a
  `listen` manual.
- Sempre cancele assinaturas de longa duração (`cancel_subscriptions` lint).
- Feche `StreamController` e `Sink` (`close_sinks` lint).

## 6. Futures vs Streams vs sync

| Necessidade | Use |
|---|---|
| Um valor futuro | `Future<T>` |
| Muitos valores ao longo do tempo | `Stream<T>` |
| Muitos valores imediatos/lazy | `Iterable<T>` |
| Converter stream→future | `stream.first`, `.single`, `.toList()` |
| Converter iterable→stream | `Stream.fromIterable(...)` |

## 7. Boas práticas (Effective Dart — async)

- Prefira `async`/`await` sobre `.then()` encadeado.
- Não use `async` sem efeito útil.
- Use métodos de ordem superior para transformar streams.
- Evite `Completer` diretamente (só para primitivas async ou pontes).
- Teste `value is Future<T>` ao desambiguar `FutureOr<T>` cujo tipo pode ser
  `Object` (senão o branch `is T` captura o próprio Future).
- Não ignore futures: use `await`, `unawaited(...)` explícito (de
  `dart:async`) ou trate erros.
- Encerre streams/subscriptions/controllers.
- Para CPU-bound, não use async — use isolates (`08`).

```dart
// Bom: async/await
Future<int> countActivePlayers(String teamName) async {
  try {
    final team = await downloadTeam(teamName);
    final players = await team.roster;
    return players.where((p) => p.isActive).length;
  } on DownloadException catch (e) {
    log.warning('download falhou', e);
    return 0;
  }
}

// Ruim: then aninhado
Future<int> countActivePlayersBad(String teamName) {
  return downloadTeam(teamName).then((team) {
    return team.roster.then((players) =>
        players.where((p) => p.isActive).length);
  });
}
```

## 8. `Future.pause` (Dart 3.13)

Alternativa a `Future.delayed` sem callback, útil para pausar até um evento
externo. Consulte a API para o padrão de uso com `Completer`/controle de fluxo.

## 9. Armadilhas

- Esquecer `await` → recebe `Future` em vez do valor (o lint
  `unawaited_futures`/`await_only_futures` ajuda).
- `catch` síncrono não pega erro de `Future` sem `await`.
- `Future.wait` aborta no primeiro erro (use `.wait` de record/iterable para
  tolerância parcial).
- Streams de eventos únicos com `first` cancelam automaticamente após o uso.
- `listen` sem `cancel` vaza memória/subscriptions.
- Não misture `Completer` com `async/await` desnecessariamente.
