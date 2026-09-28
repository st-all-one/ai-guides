# 04 — Coleções, Iterable e records

## 1. Coleções principais

| Tipo | Ordenada | Duplicatas | Acesso | Literal |
|---|---|---|---|---|
| `List<E>` | sim | sim | índice | `[1, 2, 3]` |
| `Set<E>` | `LinkedHashSet` (inserção) | não | busca | `{1, 2, 3}` |
| `Map<K,V>` | `LinkedHashMap` (inserção) | chaves únicas | chave | `{'a': 1}` |
| `Queue<E>` (`dart:collection`) | sim | sim | pontas | `Queue()` |

```dart
var points = <Point>[];
var addresses = <String, Address>{};
var counts = <int>{};

var list = [1, 2, 3];
var set = {1, 2, 3};           // Set<int>
var map = {'a': 1, 'b': 2};    // Map<String, int>
var emptyMap = <String, int>{}; // evite {} sem tipo (raw)
```

Use **literais** sempre que possível; eles dão acesso a spread e a
`if`/`for` internos.

## 2. Operações essenciais

```dart
final l = [3, 1, 2];
l.add(4); l.addAll([5, 6]); l.insert(0, 0); l.remove(3); l.removeAt(0);
l.contains(2); l.indexOf(2); l.length; l.first; l.last;
l.sort(); l.shuffle(); l.reversed; l.sublist(1, 3);
l.map((e) => e * 2); l.where((e) => e.isEven); l.whereType<int>();
l.fold<int>(0, (sum, e) => sum + e); l.reduce((a, b) => a + b);
l.any((e) => e > 3); l.every((e) => e > 0); l.take(2); l.skip(1);
l.expand((e) => [e, e]); l.toSet(); l.toList();

final m = {'a': 1};
m['b'] = 2; m.putIfAbsent('c', () => 3); m.containsKey('a');
m.update('a', (v) => v + 1, ifAbsent: () => 0);
m.remove('b'); m.keys; m.values; m.entries;
m.map((k, v) => MapEntry(k, v * 2)); m.forEach((k, v) => print('$k=$v'));
```

## 3. Imutabilidade

```dart
final mut = [1, 2, 3];              // referência final, conteúdo mutável
const constList = [1, 2, 3];        // imutável em tempo de compilação
final unmod = List<int>.unmodifiable(mut);
final fixed = List<int>.filled(3, 0, growable: false);
final constMap = const {'a': 1};
final constSet = const {1, 2};
```
`const` em coleções exige elementos constantes. Para imutabilidade em runtime,
use `List.unmodifiable`, `Map.unmodifiable`, `Set.unmodifiable` ou pacotes
(`package:built_collection`, `fast_immutable_collections`).

## 4. Spread e control flow em literais

```dart
var arguments = [
  ...options,
  command,
  ...?modeFlags,                 // spread nulável
  for (var path in filePaths)
    if (path.endsWith('.dart')) path.replaceAll('.dart', '.js'),
];

var map = {
  'env': 'prod',
  ...defaults,
  if (debug) 'debug': true,
  for (final e in entries) e.key: e.value,
};
```

## 5. `Iterable` vs `List`

- `Iterable` é a abstração base (lazy, uma passada); `List` tem índice e
  mutação.
- Métodos como `map`, `where`, `take` retornam `Iterable` lazy.
- `.length` em `Iterable` pode ser O(n) — use `isEmpty`/`isNotEmpty`.

```dart
// Bom
if (words.isNotEmpty) return words.join(' ');

// Ruim
if (words.length != 0) ...
```

## 6. Records

Records são valores anônimos, imutáveis, fixos, heterogêneos e tipados.

```dart
// Expressão de record
var record = ('first', a: 2, b: true, 'last');

// Anotação de tipo
(String, int) rec;
rec = ('A string', 123);
({int a, bool b}) named = (a: 123, b: true);

// Acesso a campos
print(record.$1); // 'first'
print(record.a);  // 2
print(record.$2); // 'last'

// Múltiplos retornos + destructuring
(String name, int age) userInfo(Map<String, dynamic> json) =>
    (json['name'] as String, json['age'] as int);

var (name, age) = userInfo({'name': 'Dash', 'age': 10});
```

- **Shape** = conjunto/ordem dos campos posicionais + nomes dos nomeados.
- Igualdade e `hashCode` são estruturais e gerados automaticamente.
- Records posicionais com mesmos tipos são compatíveis mesmo com nomes de
  documentação diferentes: `(int a, int b)` e `(int x, int y)`.
- Use `typedef` para nomear records complexos:
  `typedef Json = Map<String, dynamic>;`

```dart
typedef Point = ({int x, int y});
Point p = (x: 1, y: 2);
```

## 7. Igualdade de coleções

`List`/`Set`/`Map` comparam por **identidade** (referência), não por conteúdo.

```dart
[1, 2] == [1, 2]; // false
```
Use `package:collection`:

```dart
import 'package:collection/collection.dart';

const eq = ListEquality<int>();
eq.equals([1, 2], [1, 2]); // true
const deep = DeepCollectionEquality();
deep.equals([[1], [2]], [[1], [2]]); // true
```

Records comparam por valor — use-os quando quiser chaves compostas.

## 8. `dart:collection`

```dart
import 'dart:collection';

final q = Queue<int>()..addAll([1, 2, 3]);
q.addFirst(0); q.removeLast();
final lq = ListQueue<int>();
final splay = SplayTreeMap<int, String>(); // chaves ordenadas
final linked = LinkedList<Entry>();
final map = HashMap<String, int>();         // sem ordem
final set = HashSet<String>();
final unmod = UnmodifiableListView<int>([1, 2]);
```

## 9. Typed data (`dart:typed_data`)

Para dados binários de tamanho fixo (Uint8List etc.):

```dart
import 'dart:typed_data';
final bytes = Uint8List(4);          // [0,0,0,0]
final i32 = Int32List.fromList([1, 2, 3]);
final buf = ByteData(8)..setFloat64(0, 3.14, Endian.little);
final view = bytes.buffer.asFloat32List();
```

## 10. Boas práticas (Effective Dart — coleções)

- Use literais (`<Point>[]`, `<String, Address>{}`) em vez de construtores.
- Use spread + `if`/`for` em literais em vez de `addAll`/`where`/`map` externos.
- Use `isEmpty`/`isNotEmpty`, nunca `.length == 0`.
- Evite `Iterable.forEach` com função literal; use `for-in`.
- Use `whereType<T>()` para filtrar por tipo (não `where((e) => e is T)`).
- Evite `cast()`; prefira criar com o tipo correto, converter na criação
  (`List<int>.from`) ou tipar `map<T>`.
- Use `toList()` para copiar preservando tipo; `List.from()` só para mudar tipo.
- Nunca use `List.from` para simples cópia (perde o type argument).
- Prefira `final` para campos que não mudam.

```dart
// Bom
var ints = objects.whereType<int>();
var copy = iterable.toList();          // preserva tipo
var ints2 = List<int>.from(objects);   // converte quando necessário
var args = [...options, command, ...?modeFlags];

// Ruim
var ints3 = objects.where((e) => e is int).cast<int>();
var copy2 = List.from(iterable);       // vira List<dynamic>
```
