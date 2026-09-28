# 09 — Tratamento de erros e exceções

## 1. Exceções vs Errors

Dart tem duas famílias:

- **`Exception`**: falha esperada de runtime (I/O, rede, parsing). Deve ser
  **tratada**.
- **`Error`** (e subtipos como `ArgumentError`, `StateError`,
  `AssertionError`, `TypeError`): **bug de programação**. Não deve ser
  capturado — deve derrubar o programa com stack trace para você corrigir.

Todas as exceções em Dart são **unchecked**: métodos não declaram o que
lançam e você não é obrigado a capturar. Qualquer objeto não-nulo pode ser
lançado, mas código de qualidade lança `Error` ou `Exception`.

```dart
throw FormatException('Esperado ao menos 1 seção');
throw StateError('Nenhum astronauta');
throw 'não faça isso'; // tecnicamente válido, mas ruim
```

`throw` é uma **expressão**:
```dart
void distanceTo(Point other) => throw UnimplementedError();
```

## 2. try / on / catch / finally

```dart
try {
  breedMoreLlamas();
} on OutOfLlamasException {
  buyMoreLlamas();
} on Exception catch (e) {
  print('Exceção: $e');
} catch (e, s) {
  print('Desconhecido: $e\n$s');
} finally {
  cleanLlamaStalls(); // sempre executa
}
```

- `on Tipo` filtra por tipo; `catch (e)` captura qualquer coisa.
- `catch (e, s)` dá acesso ao `StackTrace`.
- A **primeira** cláusula que casar trata.
- `finally` executa após qualquer `catch`; se nenhum casar, a exceção é
  propagada após o `finally`.

### `rethrow`
Preserva o stack trace original:

```dart
void misbehave() {
  try {
    dynamic foo = true;
    print(foo++);
  } catch (e) {
    print('tratado parcialmente: ${e.runtimeType}');
    rethrow; // não use `throw e` — isso reseta o stack
  }
}
```

## 3. `assert`

Ferramenta de desenvolvimento para invariantes. Lança `AssertionError` se falso.

```dart
assert(text != null);
assert(number < 100);
assert(url.startsWith('https'), 'URL deve ser https');
```
- Ativo em debug (`--enable-asserts` no `dart run`, Flutter debug, webdev).
- **Ignorado em produção**; argumentos não são avaliados.
- Use apenas para invariantes de desenvolvimento, nunca para validar entrada
  de usuário em produção.

## 4. Boas práticas (Effective Dart — erros)

- **EVITE** `catch` sem `on` (Pokémon exception handling). Filtrar tipos.
- Se precisar capturar tudo, **não descarte**: logue, mostre ou rethrow.
- **Lance `Error`** só para bugs de programação (uso incorreto da API).
- **NÃO capture `Error`** nem tipos que o implementam.
- Use **`rethrow`**, não `throw e`.
- Nunca capture e silencie sem registrar (ver `14-logs-e-observabilidade.md`).

```dart
// Bom
try {
  somethingRisky();
} on SomeException catch (e) {
  if (!canHandle(e)) rethrow;
  handle(e);
}

// Ruim
try {
  somethingRisky();
} catch (_) {} // engole tudo
```

## 5. Exceções personalizadas

```dart
class NetworkException implements Exception {
  final String message;
  final int? statusCode;
  const NetworkException(this.message, [this.statusCode]);

  @override
  String toString() =>
      'NetworkException: $message${statusCode != null ? ' ($statusCode)' : ''}';
}
```
- Prefira `implements Exception` a `extends Exception`.
- Torna o `toString()` informativo.
- Para erros de domínio, defina hierarquia própria.

## 6. Padrão Result (sem exceptions)

Para fluxos previsíveis (validação, regras de negócio), modele sucesso/falha
com `sealed` + patterns — evita exceções como controle de fluxo:

```dart
sealed class Result<T> {
  const Result();
}
final class Ok<T> extends Result<T> {
  final T value;
  const Ok(this.value);
}
final class Failure<T> extends Result<T> {
  final Object error;
  final StackTrace? stackTrace;
  const Failure(this.error, [this.stackTrace]);
}

Result<int> parsePositive(String input) {
  final value = int.tryParse(input);
  if (value == null) return Failure(FormatException('não é inteiro', input));
  if (value < 0) return Failure(ArgumentError('negativo'));
  return Ok(value);
}

String render(Result<int> r) => switch (r) {
  Ok(value: final v) => 'OK: $v',
  Failure(error: final e) => 'Erro: $e',
};
```

## 7. Erros assíncronos

- Erros em `Future` precisam de `await` + `try/catch` ou `.catchError`.
- Erros em `Stream`: `onError` no `listen` ou `try/catch` com `await for`.
- `Future.wait` aborta no primeiro erro; use `.wait` de record/iterable para
  tratar erros parciais (`ParallelWaitError`).
- Sempre cancele subscriptions/feche sinks mesmo em erro (`finally`).

```dart
final sub = stream.listen(
  (v) => handle(v),
  onError: (Object e, StackTrace s) => logger.severe('stream', e, s),
  onDone: () => logger.info('stream concluído'),
);
```

## 8. Stack traces

- `StackTrace.current` em desenvolvimento; `e.stackTrace` ao capturar.
- Use `package:stack_trace` para formatar (`Chain`, `Trace.format`).
- Preserve com `rethrow`; registre sempre junto do erro.
- Em isolates, capture e propague o stack pelo `SendPort`.
- `Error.throwWithStackTrace(error, stack)` relança preservando o stack
  original — melhor que `throw error` quando o stack foi capturado antes.
- `StackTrace.current` é o frame da chamada atual (cuidado: é síncrono).

## 9. Checklist de erros

- [ ] `Error` tratado como bug (não capturado); `Exception` tratada.
- [ ] Sem `catch` genérico silencioso.
- [ ] `rethrow` em vez de `throw e`.
- [ ] `finally` para liberar recursos (arquivos, sockets, subscriptions).
- [ ] Erros de `Future`/`Stream` tratados explicitamente.
- [ ] Erros de domínio modelados com exceções tipadas ou `Result`.
- [ ] Todo erro logado com contexto (ver `14`).
