# 06 — Funções, closures, generics e typedefs

## 1. Parâmetros

```dart
void main() {}

// Posicionais obrigatórios
int add(int a, int b) => a + b;

// Opcionais posicionais (entre [])
String say(String from, String msg, [String? device]) =>
    '$from says $msg${device != null ? ' from $device' : ''}';

// Nomeados (entre {}); required força presença
void setAlarm({required int hour, int minute = 0}) { /* ... */ }

// Nunca misture [] e {} na mesma declaração
```
- Default values devem ser const de compilação.
- Nomeados melhoram legibilidade no call site.
- Evite parâmetros posicionais booleanos: use nomeados/enum.

## 2. Retorno e expressão

```dart
void log(String msg) { print(msg); }
int square(int x) => x * x;       // arrow (expressão única)
Future<void> run() async { await work(); }
```
- Anote o tipo de retorno em funções não-locais.
- `=>` só para expressões curtas; blocos para lógica complexa.
- `Future<void>` para async sem valor; `void` para sync sem valor.

## 3. Funções como valores, closures e tear-offs

```dart
// Função anônima (closure)
final add = (int a, int b) => a + b;
list.where((e) => e.isEven);

// Closure captura o ambiente
Function makeCounter() {
  var count = 0;
  return () => ++count;
}

// Tear-off: passa a função sem lambda
charCodes.forEach(print);
charCodes.forEach(buffer.write);
var strings = charCodes.map(String.fromCharCode);
var buffers = charCodes.map(StringBuffer.new); // construtor sem nome

// Typedef de função
typedef IntOp = int Function(int, int);
IntOp op = add;
```

Regras:
- Se você só precisa dar nome a uma função local, use **function declaration**
  (`void f() {}`), não variável com lambda.
- Não crie lambda quando um tear-off resolve (`print`, `String.fromCharCode`).
- Funções locais e anônimas inferem tipos de parâmetro do contexto; não os
  anote redundante.
- Para assinaturas de função, prefira tipo inline
  (`bool Function(String)`) a typedefs privados.

## 4. Generics em funções e classes

```dart
T first<T>(List<T> ts) => ts.first;

class Repository<T extends Entity> {
  final List<T> _items = [];
  void add(T item) => _items.add(item);
  List<T> getAll() => List.unmodifiable(_items);
}

// Múltiplos parâmetros e F-bounds
class A<X extends A<X>> {}
X max<X extends Comparable<X>>(X a, X b) => a.compareTo(b) > 0 ? a : b;

// Type arguments explícitos quando a inferência não basta
var map = <String, List<int>>{};
final events = StreamController<Event>();
```

Convenções de tipo: `E` (elemento), `K`/`V` (chave/valor), `R` (retorno),
`T`/`S`/`U` (genérico). Não use nomes de uma letra arbitrários fora disso.

### Genéricos e variance
- Coleções são covariantes: `List<String>` é `List<Object>`.
- O runtime checa escritas incompatíveis e lança `TypeError`.
- Use `contravariant`/`covariant` só quando necessário.

## 5. `typedef`

```dart
// Tipo de função (sintaxe moderna)
typedef Predicate<E> = bool Function(E element);
typedef Json = Map<String, dynamic>;
typedef Callback = void Function(String, {bool urgent});

// Records nomeados
typedef Point = ({int x, int y});
```
- Sintaxe antiga (`typedef int Comparison<T>(T a, T b);`) é **deprecada**.
- Typedefs tornam assinaturas complexas legíveis e reutilizáveis.

## 6. Extension methods (revisão)

```dart
extension StringX on String {
  bool get isBlank => trim().isEmpty;
  int get parseInt => int.parse(this);
}

extension IterableX<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
```
- Resolvidos estaticamente; não há dispatch dinâmico.
- Podem ser genéricos e ter `on` com restrições.
- Nomear a extensão ajuda a desambiguar quando há conflito.

## 7. Callable objects

Um objeto com método `call` pode ser invocado como função:

```dart
class WannabeFunction {
  String call(String a, String b) => '$a $b!';
}
var wf = WannabeFunction();
print(wf('Hi', 'there'));
```
Prefira `typedef`/função quando o único membro é `call`.

## 8. `main` e argumentos

```dart
import 'dart:io';

void main(List<String> args) {
  if (args.isEmpty) {
    stderr.writeln('uso: app <arquivo>');
    exitCode = 64; // EX_USAGE
    return;
  }
  run(args.first);
}
```

## 9. Funções assíncronas e geradores (visão geral)

```dart
Future<int> fetch() async => 42;

Stream<int> countTo(int n) async* {
  for (var i = 1; i <= n; i++) {
    await Future<void>.delayed(const Duration(milliseconds: 100));
    yield i;
  }
}

Iterable<int> naturals() sync* {
  var i = 0;
  while (true) yield i++;
}
```
- `async` → `Future`; `async*` → `Stream`; `sync*` → `Iterable` lazy.
- `yield`/`yield*` delegam valores. Ver `07-assincronismo.md`.

## 10. Boas práticas (Effective Dart — funções)

- Use function declaration para dar nome a funções locais.
- Não crie lambda quando um tear-off basta.
- Anote parâmetros e retorno em funções declaradas.
- Não anote parâmetros de closures/interfaces inferidos.
- Prefira parâmetros nomeados para flags booleanas.
- Evite parâmetros obrigatórios com valor sentinela ("no argument"); torne-os
  opcionais.
- Aceite faixas com `start` inclusivo e `end` exclusivo.
- Evite `FutureOr<T>` como retorno (só em posição contravariante, como callback).
- Use `Future<void>` como retorno de membros async sem valor.
