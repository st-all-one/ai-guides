# 03 — POO: classes, construtores, modificadores, mixins e enums

## 1. Classes e membros

```dart
class Spacecraft {
  String name;              // campo mutável
  DateTime? launchDate;     // campo nulável

  int? get launchYear => launchDate?.year; // getter read-only

  Spacecraft(this.name, this.launchDate);       // construtor com initializing formals
  Spacecraft.unlaunched(String name) : this(name, null); // named redirecting

  void describe() {
    print('Spacecraft: $name');
    final launchDate = this.launchDate; // promoção não funciona em getters
    if (launchDate != null) {
      print('Launched ${DateTime.now().difference(launchDate).inDays ~/ 365} anos atrás');
    }
  }
}
```

- `this.x` no parâmetro é um **initializing formal**: atribui ao campo.
- Campos `final` devem ser inicializados na declaração, no initializer list,
  ou no corpo (antes do uso).
- Getters/setters e campos são indistinguíveis para o chamador.
- **Privacidade é por library**: identificadores com `_` são privados à
  biblioteca (arquivo + `part`s), não à classe.

## 2. Construtores

### Formas
```dart
class Point {
  double x, y;

  Point(this.x, this.y);                     // gerador
  Point.origin() : x = 0, y = 0;             // nomeado
  Point.polar(double theta, double radius)    // initializer list
      : x = cos(theta) * radius,
        y = sin(theta) * radius;
  factory Point.fromJson(Map<String, dynamic> json) => // factory
      Point(json['x'] as double, json['y'] as double);
  const Point.zero() : x = 0, y = 0;         // const
}
```

- **Initializer list**: inicializa campos antes do corpo; tem acesso a
  parâmetros e `super`.
- **`super.x`**: encaminha para o construtor do supertipo (super parameter).
- **Redirecting** (`: this(...)`): delega a outro construtor.
- **Factory**: pode retornar instância existente/subtipo; não tem `this`.
- **`const` constructor**: exige todos os campos `final` e inicializadores
  potencialmente constantes; permite criar constantes e usar em `switch`,
  valores default etc.
- Corpo vazio: use `;` em vez de `{}`.

### Construtor primário (Dart 3.13)
Declara campos e o construtor principal no cabeçalho da classe.

```dart
class Point(var int x, var int y);          // mutáveis
class ImmutablePoint(final int x, final int y);
class User(String name);                    // sem campo (não-declaring)
class User({required var String _name});    // private named parameter
class Point.custom(var int x, var int y);   // nomeado
class Point._(var int x, var int y);        // privado
class Person(final String name, final int age);
class Employee(super.name, super.age, final String role) extends Person;
```

- Parâmetro com `var`/`final` = **declaring parameter** → cria campo.
- Sem modificador = parâmetro comum (não cria campo).
- Corpo opcional: `this : assert(x >= 0) { ... }` ou `this : z = x + y;`.
- `const class` para construtor primário constante:
  `class const ConstPoint(final int x, final int y);`.
- Enum com construtor primário: `enum Color(final String hex) { red('#F00'), ... }`.
- Restrições: `final`/`var` em parâmetros só valem aqui (em outras declarações
  é erro `extraneous_modifier`); declaring parameters não podem ser `late`/`external`;
  sem colisão de nomes; sem dupla inicialização; corpo sem `async`/`=>`.

### Sintaxe concisa de construtor (Dart 3.13)
Em declarações *dentro* do corpo, use `new`/`factory` em vez de repetir o nome:

```dart
class Logger {
  final String name;
  factory(String name) => _cache[name] ??= Logger._internal(name);
  new _internal(this.name);
  new fromJson(Map<String, Object?> json) : name = json['name'] as String;
  static final Map<String, Logger> _cache = {};
}
```
Isso aplica-se a **declarações**. Em **invocações**, não use `new`.

## 3. Herança, interfaces e abstract

Dart tem **herança simples**. Toda classe define implicitamente uma interface
(`implements`) que pode ser implementada por qualquer classe.

```dart
class Orbiter extends Spacecraft {
  double altitude;
  Orbiter(super.name, DateTime super.launchDate, this.altitude);
}

class MockSpaceship implements Spacecraft { /* ... */ } // interface implícita

abstract class Describable {
  void describe(); // abstrato
  void describeWithEmphasis() { print('===='); describe(); }
}
```
- `abstract`: não instanciável; pode ter métodos abstratos.
- `@override`: boa prática; o analyzer alerta membros órfãos.
- `noSuchMethod()` pode interceptar chamadas inexistentes (use com cautela).

## 4. Modificadores de classe

Controlam construção, extensão, implementação e mixin, dentro e fora da library.

| Modificador | Extender fora | Implementar fora | Notas |
|---|---|---|---|
| (nenhum) | sim | sim | irrestrito |
| `abstract` | sim | sim | não instanciável |
| `base` | sim (precisa `base`/`final`/`sealed`) | **não** | exige construtor chamado |
| `interface` | **não** | sim | contrato puro |
| `final` | **não** | **não** | fecha a hierarquia |
| `sealed` | **não** | **não** | implicitamente abstract; switch exaustivo |
| `mixin` | — | — | só mixin |
| `mixin class` | sim | sim | raro; migração |
| `abstract interface class` | não | sim | interface pura |

```dart
sealed class Vehicle {}
class Car extends Vehicle {}
class Truck implements Vehicle {}

String sound(Vehicle v) => switch (v) {
  Car() => 'vroom',
  Truck() => 'VROOOM',
}; // exaustivo: o compilador garante todos os subtipos
```

Regras de combinação: `abstract` + `sealed` é proibido (sealed já é abstract);
`interface`/`final`/`sealed` não combinam com `mixin`. Use `final class` quando
quiser fechar mas ainda permitir evolução adicionando membros.

## 5. Mixins

Reutilização de código entre hierarquias, sem herança múltipla.

```dart
mixin Piloted {
  int astronauts = 1;
  void describeCrew() => print('Astronauts: $astronauts');
}

class PilotedCraft extends Spacecraft with Piloted {}
```
- `mixin M {}` declara mixin puro; `mixin class C {}` é ambos (raro).
- `on` restringe a quais supertipos o mixin se aplica: `mixin M on Animal`.
- Prefira `mixin` puro ou `class` puro; evite ambiguidade de `mixin class`.

## 6. Enums

### Simples
```dart
enum PlanetType { terrestrial, gas, ice }
final p = PlanetType.gas;
print(p.name);          // 'gas'
print(PlanetType.values); // todos
```

### Enhanced (com campos, construtor, métodos)
```dart
enum Planet {
  mercury(planetType: PlanetType.terrestrial, moons: 0, hasRings: false),
  uranus(planetType: PlanetType.ice, moons: 27, hasRings: true);

  const Planet({required this.planetType, required this.moons, required this.hasRings});
  final PlanetType planetType;
  final int moons;
  final bool hasRings;

  bool get isGiant => planetType == PlanetType.gas || planetType == PlanetType.ice;
}
```
Constraint: construtor `const`, todas as instâncias na primeira linha.

### Dot shorthands (Dart 3.10+)
Quando o contexto define o tipo, omita o nome:
```dart
Planet p = .venus;                 // Planet.venus
int port = .parse('8080');         // int.parse
Point origin = .origin();          // Point.origin()
List<int> l = .filled(5, 0);       // List.filled
Map<String, int> cache = .new();   // Map<String,int>.new (contexto dá o tipo)
return switch (level) { .debug => 'gray', .error => 'red' };
```

## 7. Extension methods e extension types

### Extension methods
Adicionam membros a tipos existentes sem modificá-los.

```dart
extension MyFancyList<T> on List<T> {
  int get doubleLength => length * 2;
  List<T> operator -() => reversed.toList();
}

// Extension sem nome (local ao arquivo) e extension em tipo genérico
extension NumberParsing on String {
  int parseInt() => int.parse(this);
}
'42'.parseInt();
```
- Use `extension Name on Type`; recomenda-se nome para documentação.
- Não substituem a API original; conflitos de membro exigem chamada explícita.

### Extension types (Dart 3.3+)
Wrapper de tempo de compilação sobre um tipo, sem custo em runtime
(zerocost). Útil para "tipos fortes" sobre `String`/`int`.

```dart
extension type UserId(String value) {
  bool get isValid => value.length == 36;
}
extension type const Meters(double value) implements double {}

final id = UserId('abc');
print(id.isValid);
```
- Não cria objeto real; apaga para o tipo representado.
- Pode ter `implements` para expor a interface do tipo representado.

## 8. Membros estáticos, constantes e operadores

```dart
class MathUtils {
  static const pi = 3.14;
  static int max(int a, int b) => a > b ? a : b;
}

class Vector {
  final double x, y;
  const Vector(this.x, this.y);

  Vector operator +(Vector o) => Vector(x + o.x, y + o.y);
  Vector operator -() => Vector(-x, -y);
  @override bool operator ==(Object o) => o is Vector && x == o.x && y == o.y;
  @override int get hashCode => Object.hash(x, y);
  @override String toString() => 'Vector($x, $y)';
}

class IntBox {
  final Map<int, String> _m = {};
  String? operator [](int i) => _m[i];        // getter de índice
  void operator []=(int i, String v) => _m[i] = v; // setter de índice
}
```

## 9. `toString`, `==`/`hashCode`, `copyWith`

```dart
class User {
  final String name;
  final int age;
  const User({required this.name, required this.age});

  User copyWith({String? name, int? age}) =>
      User(name: name ?? this.name, age: age ?? this.age);

  @override
  bool operator ==(Object other) =>
      other is User && other.name == name && other.age == age;

  @override
  int get hashCode => Object.hash(name, age);

  @override
  String toString() => 'User(name: $name, age: $age)';
}
```
Ver `17-design-de-api.md` para as regras de `==`/`hashCode`.

## 10. Boas práticas de OO

- **`final` por padrão** em campos e variáveis de topo.
- Não envolva campo em getter/setter desnecessariamente.
- Não use `late final` público sem inicializador.
- Prefira `const` constructor em value objects.
- Use `sealed` para modelar estados finitos e obter switch exaustivo.
- Use `interface`/`base`/`final` para comunicar intenção de API.
- Não defina classe só com membros estáticos — prefira funções de topo.
- Não estenda/implemente classe que não foi projetada para isso.
- Evite classes de um único membro abstrato — use função/typedef.

## 11. Anotações (metadata)

Anotações (`@nome`) são classes `const` aplicadas a declarações; alimentam o
analyzer, lints e ferramentas.

```dart
import 'package:meta/meta.dart';

@immutable
class Ponto {
  final int x, y;
  const Ponto(this.x, this.y);
}

class Api {
  @visibleForTesting
  void reiniciar() {}

  @protected
  void hook() {}

  @mustCallSuper
  void dispose() {}

  @useResult
  int calcular() => 1;

  @Deprecated('Use calcular()')
  int calc() => 1;
}

class Base {
  void aceitar(covariant Object valor) {} // estreita o tipo ao sobrescrever
}
```

- `@override`, `@deprecated`, `@Deprecated('msg')` — em `dart:core`.
- `package:meta`: `@immutable`, `@visibleForTesting`, `@visibleForOverriding`,
  `@protected`, `@mustCallSuper`, `@useResult`, `@doNotStore`, `@internal`,
  `@nonVirtual`, `@sealed`.
- `@pragma(...)`: dicas para a VM — `vm:prefer-inline`, `vm:entry-point`,
  `vm:isolate-unsendable`.
- `covariant`: permite estreitar o tipo de um parâmetro na sobrescrita.
- Metadata comunica intenção e é checada por lints (ex.: `@useResult` com
  `unused_result`).
