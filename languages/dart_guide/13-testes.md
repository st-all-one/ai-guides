# 13 — Testes

## 1. Tipos de teste

| Tipo | Escopo | Frequência |
|---|---|---|
| **Unit** | função, método, classe isolada | maioria dos testes |
| **Component/Widget** | componente com múltiplas classes | moderada (Flutter/widget) |
| **Integration/E2E** | fluxo completo da app | poucos, lentos |

Regra prática: muitos unitários, alguns de componente, poucos ponta a ponta.

## 2. `package:test`

```yaml
# pubspec.yaml
dev_dependencies:
  test: ^1.25.0
```

```bash
dart test                          # roda tudo em test/
dart test test/foo_test.dart       # arquivo específico
dart test --name "padrão"         # filtra por nome (-n)
dart test --tags integration       # filtra por tag (-t)
dart test --exclude-tags slow      # exclui tag (-x)
dart test --coverage=coverage      # cobertura
dart test --concurrency=4          # paralelismo
dart test --timeout 30s
dart test --help
```
Flags repetidas combinam com **E** (todas as condições).

## 3. Estrutura básica

```dart
import 'package:test/test.dart';

void main() {
  group('Calculadora', () {
    late Calculadora calc;

    setUp(() {
      calc = Calculadora(); // antes de cada teste
    });

    tearDown(() {
      // limpeza após cada teste
    });

    setUpAll(() { /* uma vez antes de todos */ });
    tearDownAll(() { /* uma vez após todos */ });

    test('soma dois inteiros', () {
      expect(calc.soma(2, 3), equals(5));
    });

    test('divisão por zero lança', () {
      expect(() => calc.divide(1, 0), throwsA(isA<ArgumentError>()));
    });
  });
}
```

- `test(descrição, body)` — caso de teste.
- `group(descrição, body)` — agrupa testes relacionados.
- `setUp`/`tearDown` — por teste; `setUpAll`/`tearDownAll` — por suíte.
- Testes assíncronos são escritos como síncronos (retorne `Future`/use `await`).

## 4. Matchers comuns

```dart
expect(value, matcher);

// Igualdade e identidade
equals(5); isNot(equals(5)); same(obj); isA<String>(); isNull; isNotNull;

// Números
greaterThan(3); lessThan(3); greaterThanOrEqualTo(3);
closeTo(3.14, 0.01); inInclusiveRange(1, 10);

// Strings e coleções
contains('sub'); startsWith('a'); endsWith('z'); matches(RegExp(r'\d+'));
isEmpty; isNotEmpty; hasLength(3); containsAll([1, 2]);
unorderedEquals([1, 2]); everyElement(greaterThan(0));
containsPair('k', 1); containsValue(2);

// Exceções
throwsA(isA<FormatException>());
throwsA(predicate((e) => e is Exception && e.toString().contains('x')));
throwsArgumentError; throwsStateError; throwsUnsupportedError;
returnsNormally;

// Assíncrono
completes; completion(equals(42)); emits(1); emitsInOrder([1, 2, 3]);
emitsDone; throwsA(...);

// Booleanos e tipos
isTrue; isFalse; isNot(isA<int>()); predicate<T>((v) => v > 0);
anyOf([1, 2]); allOf([isA<int>(), greaterThan(0)]);
```

## 5. Testes assíncronos, streams e tempo

```dart
test('busca retorna dados', () async {
  final data = await fetchData();
  expect(data, isNotEmpty);
});

test('stream emite valores', () {
  final stream = countTo(3);
  expect(stream, emitsInOrder([1, 2, 3, emitsDone]));
});

test('timeout', () async {
  await expectLater(
    slowOperation(),
    completes,
  );
}, timeout: const Timeout(Duration(seconds: 10)));
```

## 6. Mocks — `package:mockito`

```yaml
dev_dependencies:
  mockito: ^5.4.0
  build_runner: ^2.4.0
```
```bash
dart run build_runner build   # gera mocks (mockito)
```

```dart
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:test/test.dart';

import 'user_repository_test.mocks.dart'; // gerado

@GenerateMocks([UserRepository])
void main() {
  test('usa repositório mock', () async {
    final repo = MockUserRepository();
    when(repo.find(1)).thenAnswer((_) async => User(id: 1, name: 'Ana'));

    final service = UserService(repo);
    final user = await service.getUser(1);

    expect(user.name, 'Ana');
    verify(repo.find(1)).called(1);
    verifyNever(repo.delete(any));
  });
}
```
- `when(...).thenReturn/thenAnswer/thenThrow`.
- `verify(...)`, `verifyNever`, `verify(...).called(n)`.
- Use `any`, `argThat(...)` para argumentos.
- Prefira **fakes manuais** quando a lógica for simples (sem codegen).

Alternativas: `mocktail` (sem geração de código).

## 7. Fakes, stubs e injeção de dependência

```dart
// Fake manual simples
class FakeClock implements Clock {
  DateTime now = DateTime(2026, 1, 1);
  DateTime currentTime() => now;
}
```
Injete dependências (construtor/parâmetro) para testabilidade — não use
singletons globais nem I/O direto em código testável.

## 8. Cobertura

```bash
dart test --coverage=coverage
dart pub global activate coverage
dart run coverage:format_coverage \
  --lcov --in=coverage --out=coverage/lcov.info --report-on=lib
# Opcional: genhtml coverage/lcov.info -o coverage/html
```
- Meça cobertura de `lib/`, não de `test/`.
- Cobertura é indicador, não meta absoluta; priorize caminhos críticos.

## 9. Tags e configuração (`dart_test.yaml`)

```yaml
# dart_test.yaml
tags:
  integration:
    timeout: 2x
  slow:
    skip: false
platforms: [vm]
```

```dart
@TestOn('vm')
library;

@Tags(['integration'])
import 'package:test/test.dart';
```

- `@TestOn('vm')`, `@TestOn('browser')` restringem plataforma.
- `@Skip('motivo')` em teste/grupo.
- Configure tags/timeouts globalmente em `dart_test.yaml`.

## 10. Testes e isolamento

- Cada teste deve ser independente e determinístico.
- Evite estado global; use `setUp`/`tearDown`.
- Não dependa de rede/tempo real; injete fakes (relógio, HTTP client).
- Use dados de teste em `test/test_data/`.
- Rode testes em paralelo por padrão; marque os que precisam de serialização.

## 11. CI

```yaml
# .github/workflows/test.yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dart-lang/setup-dart@v1
        with:
          sdk: stable
      - run: dart pub get
      - run: dart format --output=none --set-exit-if-changed .
      - run: dart analyze --fatal-infos
      - run: dart test
```

- Bloqueie merge sem `dart analyze` limpo e testes verdes.
- Faça upload de cobertura (codecov/coveralls) se desejado.

## 12. Boas práticas

- Nome do teste descreve comportamento: `'retorna erro quando X'`.
- **Arrange–Act–Assert** em cada teste.
- Um comportamento por teste; nomes claros.
- Prefira matchers específicos a `isTrue` genérico.
- Não teste implementação; teste comportamento/contrato.
- Teste casos de borda e erros, não só o caminho felizes.
- Evite `sleep`; use fakes de tempo/`fakeAsync`.
- Mantenha testes rápidos e determinísticos.
- Use `.mocks.dart` gerados só para interfaces complexas.
