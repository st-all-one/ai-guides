# 16 — Effective Dart: uso

> Resumo do guia oficial "Effective Dart: Usage". Aplica-se ao corpo do código.

## 1. Bibliotecas e imports

- **DO** usar string em `part of` apontando para o arquivo
  (`part of '../../my_library.dart';`), não o nome da biblioteca.
- **DON'T** importar `lib/src/` de outro pacote (`implementation_imports`).
- **DON'T** usar caminhos que atravessem `lib`
  (`avoid_relative_lib_imports`): dentro de `lib` use imports relativos;
  fora de `lib`, use `package:`.
- **PREFER** imports relativos quando não cruzam `lib`.

```dart
// lib/api.dart
import 'src/stuff.dart';
// test/api_test.dart
import 'package:my_package/api.dart';
import 'test_utils.dart';
```

## 2. Null

- **DON'T** inicializar variáveis com `null` (`Item? x;` já é null).
- **DON'T** usar `= null` em parâmetros opcionais.
- **DON'T** comparar não-nulos com `true`/`false` nem usar `== true`.
  Para nuláveis, use `?? false` ou `!= null &&`.
- **AVOID** `late` quando precisa saber se foi inicializado; prefira nulável.
- **CONSIDER** promoção de tipo / null-check patterns para nuláveis.

```dart
// BOM
if (nonNullableBool) { ... }
if (nullableBool ?? false) { ... }
if (nullableBool != null && nullableBool) { ... }

// RUIM
if (nonNullableBool == true) { ... }
if (nullableBool) { ... } // erro se nulável
```

## 3. Strings

- **DO** concatenar literais por adjacência (sem `+`).
- **PREFER** interpolação a concatenação com `+`.
- **AVOID** `{}` em interpolação de identificador simples.

```dart
// BOM
'ERROR: parts on fire. Other parts overrun.';
'Hello, $name! You are ${year - birth} years old.';

// RUIM
'ERROR: parts on fire. ' + 'Other parts overrun.';
'Hello, ' + name + '!';
```

## 4. Coleções

- **DO** usar literais (`<Point>[]`, `<String, Address>{}`).
- **DON'T** usar `.length` para verificar vazio; use `isEmpty`/`isNotEmpty`.
- **AVOID** `Iterable.forEach` com função literal; use `for-in`.
- **DON'T** usar `List.from()` para copiar preservando tipo (use `toList()`).
- **DO** usar `whereType<T>()` em vez de `where((e) => e is T)`.
- **DON'T** usar `cast()` quando houver operação próxima que resolva.
- **AVOID** `cast()` em geral; prefira criar com o tipo certo.

```dart
// BOM
var points = <Point>[];
if (lunchBox.isEmpty) return 'so hungry...';
var ints = objects.whereType<int>();
var ints2 = List<int>.from(objects);

// RUIM
var addresses = Map<String, Address>();
if (words.length == 0) ...
people.forEach((p) { ... });
var ints3 = objects.where((e) => e is int);
```

## 5. Funções

- **DO** usar function declaration para nomear funções locais.
- **DON'T** criar lambda quando um tear-off resolve.

```dart
void localFunction() { ... }          // BOM
var f = () { ... };                   // RUIM

charCodes.forEach(print);             // BOM
charCodes.forEach((c) => print(c));   // RUIM
```

## 6. Variáveis

- **DO** seguir regra consistente para `var`/`final` em locais (escolha uma:
  `final` onde não reatribui, ou sempre `var`).
- **AVOID** armazenar o que pode calcular (single source of truth).

```dart
// BOM
class Circle {
  double radius;
  Circle(this.radius);
  double get area => pi * radius * radius;
  double get circumference => pi * 2.0 * radius;
}
```

## 7. Membros e construtores

- **DON'T** envolver campo em getter/setter desnecessário.
- **PREFER** campo `final` para propriedade read-only.
- **CONSIDER** `=>` para membros simples; blocos para lógica complexa.
- **DON'T** usar `this.` exceto para shadowing ou redirect de construtor.
- **DO** inicializar campos na declaração quando possível.
- **DO** usar *initializing formals* (`Point(this.x, this.y)`).
- **DON'T** usar `late` quando a lista de inicializadores resolve.
- **DO** usar `;` em corpos vazios de construtor.
- **PREFER** sintaxe concisa de construtor (`new`/`factory`) em declarações
  (Dart 3.13+).
- **DON'T** usar `new` em invocações.
- **DON'T** usar `const` redundante em contexto constante.

```dart
class Point {
  double x, y;
  Point(this.x, this.y);      // initializing formals
}

class Logger {
  factory(String name) => Logger._internal(name);
  new _internal(this.name);
}
```

## 8. Tratamento de erros

- **AVOID** `catch` sem `on`.
- **DON'T** descartar erros capturados sem `on`.
- **DO** lançar `Error` só para bugs de programação.
- **DON'T** capturar `Error` (nem subtipos).
- **DO** usar `rethrow` para relançar preservando stack.

```dart
try {
  somethingRisky();
} catch (e) {
  if (!canHandle(e)) rethrow;
  handle(e);
}
```

## 9. Assincronismo

- **PREFER** `async`/`await` a `.then()`.
- **DON'T** usar `async` sem efeito útil.
- **CONSIDER** métodos de ordem superior para transformar streams.
- **AVOID** `Completer` diretamente.
- **DO** testar `Future<T>` ao desambiguar `FutureOr<T>` que pode ser `Object`.

```dart
Future<int> fastest(Future<int> a, Future<int> b) => Future.any([a, b]);

Future<T> logValue<T>(FutureOr<T> value) async {
  if (value is Future<T>) {
    final result = await value;
    print(result);
    return result;
  }
  print(value);
  return value;
}
```

## 10. Checklist de uso

- [ ] Sem `catch` genérico silencioso; `rethrow` em vez de `throw e`.
- [ ] Sem `== true`/`== false`; sem inicializar com `null`.
- [ ] Coleções com `isEmpty`/`whereType`/literais.
- [ ] Tear-offs em vez de lambdas triviais.
- [ ] `async`/`await` em vez de `then` aninhado.
- [ ] Campos inicializados na declaração/initializer list (não `late`).
- [ ] Sem `new`/`const` redundante.
- [ ] Sem estado duplicado; calcular em vez de armazenar.
