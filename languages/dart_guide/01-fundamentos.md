# 01 — Fundamentos da linguagem

## 1. Estrutura de um programa

Todo programa Dart tem uma função top-level `main()`. Funções sem retorno
explícito são `void`. `print()` escreve no console.

```dart
void main() {
  print('Hello, World!');
}
```

`main()` aceita argumentos de linha de comando:

```dart
void main(List<String> args) {
  print('args: $args');
}
```

## 2. Variáveis e declarações

```dart
var name = 'Voyager I';     // tipo inferido: String
var year = 1977;            // int
var antennaDiameter = 3.7;  // double
var flybyObjects = ['Jupiter', 'Saturn']; // List<String>
var image = {'tags': ['saturn'], 'url': 'x'}; // Map<String, Object>

final now = DateTime.now(); // atribuído uma vez, em runtime
const pi = 3.14159;         // constante de compilação
```

Regras:
- `var` → tipo inferido do inicializador. `var x;` sem inicializador é
  `dynamic` (perigoso).
- `final` → atribuído uma única vez (pode ser em runtime).
- `const` → constante conhecida em tempo de compilação; implica `final`.
- Tipos não-nulos são obrigatoriamente inicializados antes do uso.
- `late` adia a inicialização até o primeiro acesso (com checagem em runtime).

```dart
late String description; // inicializar antes de ler, senão LateInitializationError
late final int computed = expensive(); // lazy + imutável

int? nullableInt; // null por padrão (tipo nulável)
```

### Wildcards (Dart 3.7+)
`_` declara uma variável **não ligante** (não pode ser lida). Use para
parâmetros ignorados:

```dart
future.then((_) => print('pronto'));       // 1 parâmetro ignorado
map.forEach((_, _) => print('par'));       // vários `_` permitidos
```

### Operador `??=` e afins
```dart
x ??= 10;         // atribui só se x for null
a ?? b            // a, ou b se a for null
a?.b              // null se a for null, senão a.b
a!.b              // força não-nulo (lança se null)
```

## 3. Tipos embutidos

| Tipo | Descrição |
|---|---|
| `int` | inteiro (64-bit na VM; 53-bit exatos na web) |
| `double` | ponto flutuante 64-bit |
| `num` | supertipo de `int` e `double` |
| `String` | sequência UTF-16 imutável |
| `bool` | `true` / `false` |
| `List<T>` | lista ordenada indexada |
| `Set<T>` | conjunto sem duplicatas |
| `Map<K, V>` | dicionário chave-valor |
| `dynamic` | desliga checagem estática (evite) |
| `Object?` | qualquer valor, inclusive `null` |
| `Object` | qualquer valor exceto `null` |
| `Null` | tipo do `null` |
| `Never` | subtipo de todos; função que nunca retorna |
| `void` | ausência de valor útil |
| `Future<T>`/`Stream<T>` | assíncronos |
| `Record` | tupla anônima imutável |

### Números
```dart
int a = 42;
double b = 3.14;
num n = 1;             // int ou double
final hex = 0xFF, exp = 1e3, underscore = 1_000_000;
int.parse('42'); double.parse('3.14'); (3.7).round(); // int
(2.5).ceil(); (2.5).floor(); 10 ~/ 3; // divisão inteira = 3
BigInt.parse('123456789012345678901234567890'); // inteiro arbitrário
```

> **Representação numérica:** na VM nativa `int` é 64 bits; no **web**
> (dart2js/Wasm) `int` é limitado à precisão de 53 bits do `double`. Valores
> além disso perdem precisão ou são rejeitados. Use `BigInt` para inteiros
> arbitrários e `typed_data` (`Int32List`, `Float64List`) para binário. Detalhes
> em `10` e `21`.

### Strings
Strings usam UTF-16. Use `package:characters` para grafemas (emoji etc.).

```dart
var s1 = 'aspas simples';
var s2 = "aspas duplas";
var s3 = '''múltiplas
linhas''';
var s4 = r'raw\nsem escape';        // raw string
var greeting = 'Olá, $name!';        // interpolação
var calc = 'Soma: ${a + b}';         // expressões com {}
'abc'.length; 'abc'[0]; s1 + s2;
s1.contains('as'); s1.startsWith('a'); s1.toUpperCase();
' a '.trim(); 'a,b,c'.split(',');
```

Concatene literais por adjacência (sem `+`):
```dart
raiseAlarm(
  'ERROR: parts of the spaceship are on fire. Other '
  'parts are overrun by martians.',
);
```
Evite `{}` em interpolação de identificador simples: `'Oi, $name'`.

### Booleanos
```dart
bool ativo = true;
if (!ativo) { /* ... */ }
```
Não compare com `== true`/`== false`. Para nulável, use `?? false` ou
`!= null &&` (que promove o tipo).

### `Object?` vs `dynamic`
- `Object?` aceita tudo, mas só permite operações de `Object`
  (`toString`, `==`, `hashCode`) até você fazer `is`/promoção.
- `dynamic` aceita tudo **e qualquer operação** é permitida em tempo de
  compilação, podendo falhar em runtime. Use só quando realmente precisar
  (ex.: JSON `Map<String, dynamic>`), e converta cedo para tipos precisos.

## 4. Operadores

```dart
// Aritméticos
+ - * / ~/ %          // / = double, ~/ = int
// Igualdade e relacional
== != < > <= >=
// Lógicos
&& || !
// Bit a bit
& | ^ ~ << >> >>>
// Atribuição composta
+= -= *= /= ~/= %= <<= >>= &= |= ^=
// Condicional (ternário)
cond ? expr1 : expr2
// Cascade — encadeia operações no mesmo objeto
final sb = StringBuffer()..write('a')..write('b');
// Spread em coleções
[...list, ...set, ...?maybeNull]
// Teste e cast
x is Tipo            // bool
x as Tipo            // cast (falha em runtime se incompatível)
x is! Tipo           // negação
```

Operadores null-aware: `?.`, `??`, `??=`, `?..` (cascade nulável),
`?[]`, `?..`.

## 5. Controle de fluxo

### if / else
```dart
if (year >= 2001) {
  print('21st century');
} else if (year >= 1901) {
  print('20th century');
} else {
  print('older');
}
```
Use chaves sempre; exceção: `if` de uma linha sem `else` → `if (x == null) return;`.

### for / while / do-while
```dart
for (var i = 0; i < 10; i++) { /* ... */ }
for (final obj in flybyObjects) { /* ... */ }
while (!done) { step(); }
do { step(); } while (!done);
```
`for-in` é o idioma preferido; evite `forEach` com função literal.

### for com padrões (Dart 3)
```dart
for (var MapEntry(key: k, value: v) in map.entries) { /* ... */ }
for (final [a, b] in pairs) { /* ... */ }
```

### switch
```dart
switch (command) {
  case 'OPEN':
    executeOpen();
  case 'CLOSED' when isWeekend: // guarda
    executeClosed();
  default:
    executeUnknown();
}
```
`break` é implícito desde Dart 3; `continue` com label ainda funciona.

## 6. Funções

```dart
// Tipos explícitos são recomendados em APIs
int fibonacci(int n) {
  if (n == 0 || n == 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Arrow para corpo de expressão única
int square(int x) => x * x;

// Parâmetros opcionais posicionais
String say(String from, String msg, [String? device]) { ... }

// Parâmetros nomeados (obrigatórios com required)
void setAlarm({required int hour, int minute = 0}) { ... }

// Funções como valores / closures
final add = (int a, int b) => a + b;
flybyObjects.where((name) => name.contains('turn')).forEach(print);

// Funções locais
void main() {
  void local() { print('local'); }
  local();
}
```

- Ordem dos parâmetros: obrigatórios posicionais → opcionais posicionais
  **ou** nomeados (nunca ambos).
- `required` só em nomeados.
- Default values devem ser constantes de compilação.
- Tear-offs: passe `print` em vez de `(x) => print(x)`.

## 7. Comentários e documentação

```dart
// Comentário de linha.

/// Documentação (doc comment) processada por `dart doc`.
/// A primeira frase deve ser um resumo de uma linha.
///
/// Parâmetros em [colchetes] viram links: [name], [Point.new].
/* Bloco — use apenas para desativar código temporariamente. */
```

Regras: comentários como frases (maiúscula + ponto); `///` para membros e
tipos; documente APIs públicas; escreva o resumo em parágrafo separado.

## 8. Entrada/saída rápida (VM)

```dart
import 'dart:io';

void main() {
  stdout.writeln('Nome?');
  final nome = stdin.readLineSync();
  stdout.writeln('Olá, $nome');
}
```

## Armadilhas comuns
- `var x;` vira `dynamic` — sempre inicialize ou anote o tipo.
- `double`/`int`: `num y = 3; y = 4.0;` é ok; `var x = 3; x = 4.0;` é erro.
- Igualdade de listas/mapas é por identidade — use `package:collection`
  (`ListEquality`, `DeepCollectionEquality`) ou records.
- `==` com objetos mutáveis + `hashCode` → ver `17-design-de-api.md`.
- Não use `new` (`Row(...)` e não `new Row(...)`).
- Não use `const` redundante em contexto constante.
