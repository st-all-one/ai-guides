# 05 — Patterns e pattern matching

Patterns (Dart 3+) representam a "forma" de valores: comparam, desestruturam e
ligam variáveis. São usados em `switch` (statement e expression), `if-case`,
declarações/atribuições de variáveis, laços `for` e literais de coleção.

## 1. O que patterns fazem

- **Match**: testa se o valor tem certa forma, constante, tipo ou é igual.
- **Destructure**: extrai partes do valor em novas variáveis.
- **Bind**: liga variáveis durante o match.

```dart
// Match por constante
switch (number) {
  case 1: print('one');
}

// Match + destructuring de lista
const a = 'a', b = 'b';
switch (obj) {
  case [a, b]: print('$a, $b'); // lista de 2 elementos iguais a 'a' e 'b'
}

// Destructuring direto
var numList = [1, 2, 3];
var [a2, b2, c2] = numList;
print(a2 + b2 + c2);
```

## 2. Tipos de pattern

| Pattern | Exemplo | Função |
|---|---|---|
| Constante | `1`, `'ok'`, `Color.red` | igualdade |
| Variável | `var x`, `final x` | liga valor |
| Wildcard | `_` | ignora |
| Lista | `[a, b, ...rest]` | casa lista |
| Map | `{'k': v}` | casa chave |
| Record | `(1, x)` / `(x: 1)` | casa record |
| Object | `Point(x: 0, y: var y)` | casa getters/campos |
| Relacional | `> 0`, `<= 10` | comparação |
| Lógico | `&&`, `\|\|`, `!` | combina patterns |
| Cast | `var x as int` | cast |
| Null-check | `var x?` | não-nulo |
| Null-assert | `x!` | força não-nulo |
| Parenthesized | `(pattern)` | agrupa |

```dart
// Object pattern com getters
if (json case {'user': [String name, int age]}) {
  print('$name, $age');
}

// Record pattern
switch (pair) {
  case (int a, int b): print(a + b);
  case (a: int x, b: int y): print(x * y);
}

// Relacional + lógico
String classify(int n) => switch (n) {
  < 0 => 'negativo',
  0 => 'zero',
  > 0 && < 10 => 'pequeno',
  _ => 'grande',
};

// Null-check pattern (promove e liga)
if (maybeUser case var user?) {
  print(user.name);
}
```

## 3. Onde patterns aparecem

### Declaração de variável
```dart
var (a, [b, c]) = ('str', [1, 2]);
final (name, age) = ('Dash', 10);
final [x, y, ...rest] = [1, 2, 3, 4]; // x=1, y=2, rest=[3,4]
```

### Atribuição (troca sem temporária)
```dart
var (a, b) = ('left', 'right');
(b, a) = (a, b); // swap
```

### `if-case`
```dart
if (pair case [int x, int y]) {
  print('$x $y');
}
if (json case {'name': String name}) {
  print(name);
}
```

### `switch` statement
```dart
switch (command) {
  case 'OPEN':
    executeOpen();
  case 'CLOSED' when isWeekend: // guarda
    executeClosed();
  case _:
    executeUnknown();
}
```

### `switch` expression
```dart
String describe(int n) => switch (n) {
  0 => 'zero',
  > 0 => 'positivo',
  _ => 'negativo',
};
```

### Laços `for`
```dart
for (final MapEntry(key: k, value: v) in map.entries) {
  print('$k => $v');
}
for (final [x, y] in points) { /* ... */ }
```

### Literais de coleção
```dart
var list = [if (pair case (int x, int y)) x + y else 0];
```

## 4. Exaustividade

`sealed` + switch exaustivo é o padrão para modelar estados:

```dart
sealed class Shape {}
class Circle extends Shape { final double r; Circle(this.r); }
class Square extends Shape { final double side; Square(this.side); }
class Rect extends Shape { final double w, h; Rect(this.w, this.h); }

double area(Shape s) => switch (s) {
  Circle(r: final r) => 3.14159 * r * r,
  Square(side: final s) => s * s,
  Rect(w: final w, h: final h) => w * h,
};
```
O compilador garante que todos os subtipos diretos são cobertos (Dart 3+).
Se faltar um caso, é erro de compilação.

Para `bool` e `enum`, switches também são verificados quanto a exaustividade.

## 5. Object patterns e destructuring de getters

```dart
class Point {
  final double x, y;
  const Point(this.x, this.y);
}

// Casa getters x/y e liga y
if (p case Point(x: 0, y: var y)) {
  print('no eixo Y em $y');
}

// Negação e nomes
switch (p) {
  case Point(x: 0, y: 0): print('origem');
  case Point(x: 0, y: _): print('eixo Y');
  case Point(): print('outro ponto');
}
```

## 6. Padrões e parâmetros de função

Patterns não aparecem diretamente na lista de parâmetros; use um parâmetro
tipado e desestruture/case no corpo:

```dart
void printPoint((int, int) point) {
  final (x, y) = point; // destructuring no corpo
  print('($x, $y)');
}

void describe(Point p) {
  if (p case Point(x: 0, y: 0)) print('origem'); // object pattern via if-case
}
```

## 7. Casos de uso recomendados

- **Modelar estados finitos** com `sealed` + switch exaustivo.
- **Desestruturar JSON** com map patterns.
- **Múltiplos retornos** via records + destructuring.
- **Guardas** (`when`) para condições extras.
- **Validação de forma** (`if (data case {'id': int id, ...})`).

## 8. Armadilhas

- Variável pattern deve ser declarada com `var`/`final`; em atribuição usa
  parênteses `(a, b) = ...`.
- `_` em `case` é wildcard (não liga); use `case var _`? Não — `_` já ignora.
- Records com **nomes** diferentes têm tipos diferentes; posicionais não.
- Não confunda `pattern` com expressão: em `case`, `>` é relacional.
- Cuidado com map patterns: só casam a chave especificada; padrão `{'a': _}`
  casa mesmo se houver outras chaves.
- Exaustividade depende de `sealed` (ou enum/bool); classes abertas exigem `_`.

## 9. Exemplo completo: pipeline de validação

```dart
sealed class ApiResult<T> {}
final class Success<T> extends ApiResult<T> { final T data; Success(this.data); }
final class Failure<T> extends ApiResult<T> {
  final String message;
  final Object? cause;
  Failure(this.message, [this.cause]);
}

ApiResult<Map<String, Object?>> parseUser(Object? json) {
  return switch (json) {
    {'name': String name, 'age': int age} when age >= 0 =>
      Success({'name': name, 'age': age}),
    {'name': String _} => Failure('idade inválida'),
    _ => Failure('formato inválido'),
  };
}

void render(ApiResult<Map<String, Object?>> result) {
  switch (result) {
    case Success(data: final d):
      print('OK: $d');
    case Failure(message: final m, cause: final c):
      print('Erro: $m (causa: $c)');
  }
}
```
