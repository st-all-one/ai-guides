# 09 — Testes

## 1. Estratégia

| Tipo | O que testa | Confiança | Custo | Velocidade |
|---|---|---|---|---|
| **Unit** | Função/método/classe | Baixa | Baixo | Rápido |
| **Widget** | Um widget / UI | Alta | Médio | Rápido |
| **Integration** | App completo / fluxo | Altíssima | Alto | Lento |

> Um app bem testado tem **muitos** unit e widget tests (com cobertura), mais poucos integration tests cobrindo casos críticos.

## 2. Unit tests

Testam lógica isolada; dependências externas são mockadas/fakeadas. Não leem disco, não renderizam, não recebem input externo.

```console
flutter pub add dev:test
```

```dart
// lib/counter.dart
class Counter {
  int value = 0;
  void increment() => value++;
  void decrement() => value--;
}

// test/counter_test.dart
import 'package:counter_app/counter.dart';
import 'package:test/test.dart';

void main() {
  group('Counter', () {
    test('começa em 0', () => expect(Counter().value, 0));
    test('incrementa', () {
      final c = Counter()..increment();
      expect(c.value, 1);
    });
  });
}
```

Convenções:

- Arquivos `*_test.dart` na pasta `test/`.
- `test()` define um caso; `expect(actual, matcher)` verifica.
- `group()` agrupa casos relacionados.
- Rode um grupo: `flutter test --plain-name "Counter"`.

### Matchers comuns

`equals`, `isA<T>()`, `isNull`/`isNotNull`, `throwsA(...)`, `contains`, `greaterThan`, `closeTo`, `completion`, `emitsInOrder` (streams).

## 3. Widget tests

Testam UI: layout, interação, rebuild. Usam `flutter_test` (vem com o SDK).

```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
```

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('tem título e mensagem', (tester) async {
    await tester.pumpWidget(const MyWidget(title: 'T', message: 'M'));

    expect(find.text('T'), findsOneWidget);
    expect(find.text('M'), findsOneWidget);
  });
}
```

### APIs essenciais

| API | Função |
|---|---|
| `testWidgets(desc, (tester) async {})` | Define o teste e cria `WidgetTester` |
| `tester.pumpWidget(widget)` | Monta e renderiza o widget |
| `tester.pump([duration])` | Agenda um frame / avança o relógio |
| `tester.pumpAndSettle()` | Repete `pump` até não haver frames (animações terminam) |
| `find.text/...` | Localiza widgets |
| `expect(finder, matcher)` | Verifica |

> Para animações, chame `pump()` uma vez sem duração para iniciar o ticker.

### Finders

```dart
find.text('Olá');
find.byType(ElevatedButton);
find.byKey(const ValueKey('botao'));
find.byIcon(Icons.add);
find.byWidgetPredicate((w) => w is Text && w.data!.startsWith('A'));
find.descendant(of: find.byType(Card), matching: find.text('Título'));
find.ancestor(of: find.text('x'), matching: find.byType(Row));
```

### Matchers de widget

`findsOneWidget`, `findsNothing`, `findsWidgets`, `findsNWidgets(n)`, `matchesGoldenFile`.

### Interação

```dart
await tester.tap(find.byKey(const ValueKey('increment')));
await tester.pump();
await tester.enterText(find.byType(TextField), 'texto');
await tester.drag(find.byType(ListView), const Offset(0, -300));
await tester.pumpAndSettle();
```

### Rolagem

```dart
await tester.scrollUntilVisible(find.text('Item 50'), 500,
    scrollable: find.byType(Scrollable));
```

### Orientação e tamanho

```dart
tester.view.physicalSize = const Size(1080, 1920);
tester.view.devicePixelRatio = 1.0;
addTearDown(tester.view.reset);
```

## 4. Integration tests

Testam o app inteiro em dispositivo/emulador; usam `integration_test` + `flutter_test`.

```console
flutter pub add "dev:integration_test:{sdk: flutter}"
```

```dart
// integration_test/app_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:meu_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('end-to-end', () {
    testWidgets('incrementa o contador', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      expect(find.text('0'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('increment')));
      await tester.pumpAndSettle();
      expect(find.text('1'), findsOneWidget);
    });
  });
}
```

Rodar:

```console
flutter test integration_test/app_test.dart
flutter test integration_test/app_test.dart -d <device>
```

- `IntegrationTestWidgetsFlutterBinding.ensureInitialized()` executa no dispositivo.
- Pode rodar em Firebase Test Lab e CI.
- Não interage com UI nativa (permissões, notificações); para isso use `patrol`.

## 5. Mocking e fakes

### Fakes (preferidos na arquitetura)

Um **fake** implementa a interface com comportamento real simplificado; preocupa-se com entradas/saídas, não com a implementação interna.

```dart
class FakeBookingRepository implements BookingRepository {
  final bookings = <Booking>[];

  @override
  Future<Result<void>> createBooking(Booking b) async {
    bookings.add(b);
    return Result.ok(null);
  }

  @override
  Future<Result<List<BookingSummary>>> getBookingsList() async =>
      Result.ok(bookings.map(BookingSummary.from).toList());
}
```

Projetar para fakes força interfaces modulares com entradas/saídas bem definidas.

### Mocks com `mockito` (codegen)

```console
flutter pub add http dev:mockito dev:build_runner
```

```dart
@GenerateMocks([], customMocks: [MockSpec<http.Client>(as: #MockHttpClient)])
void main() {
  test('retorna Album em sucesso', () async {
    final client = MockHttpClient();
    when(client.get(Uri.parse('...')))
        .thenAnswer((_) async => http.Response('{"id":1,"title":"x"}', 200));
    expect(await fetchAlbum(client), isA<Album>());
  });
}
```

```console
dart run build_runner build
```

### `mocktail`

Alternativa sem codegen:

```dart
class MockRepo extends Mock implements BookingRepository {}

final repo = MockRepo();
when(() => repo.getBookings()).thenAnswer((_) async => Result.ok([]));
verify(() => repo.getBookings()).called(1);
```

## 6. Golden tests

Comparam a renderização com uma imagem de referência ("golden file").

```dart
await expectLater(
  find.byType(MyWidget),
  matchesGoldenFile('goldens/my_widget.png'),
);
```

```console
flutter test --update-goldens   # gera/atualiza os arquivos
```

- Sensíveis a diferenças de plataforma/fonte; rode no mesmo ambiente do CI.
- Ótimos para detectar regressões visuais.

## 7. Testando cada camada (arquitetura MVVM)

### ViewModel (unit)

```dart
test('carrega bookings', () {
  final vm = HomeViewModel(
    bookingRepository: FakeBookingRepository()..createBooking(kBooking),
    userRepository: FakeUserRepository(),
  );
  expect(vm.bookings.isNotEmpty, true);
});
```

### View (widget)

```dart
void loadWidget(WidgetTester tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: ChangeNotifierProvider.value(
        value: viewModel,
        child: HomeScreen(viewModel: viewModel),
      ),
    ),
  );
}
```

### Repository (unit)

```dart
test('get booking', () async {
  final repo = BookingRepositoryRemote(apiClient: FakeApiClient());
  final result = await repo.getBooking(0);
  expect(result.asOk.value, kBooking);
});
```

### Service (unit)

Mocke o cliente HTTP; teste sucesso, erro, timeout, JSON inválido.

> Se testar é difícil, a arquitetura tem acoplamento excessivo.

## 8. Plugins em testes

Chamadas a plugins nativos quebram em testes de unidade. Estratégias:

- **Fake/mock da interface** do plugin (preferido).
- `TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(...)` para simular channels.
- Veja `testing/plugins-in-tests` e `testing/testing-plugins` na doc oficial.

## 9. Cobertura e CI

```console
flutter test --coverage
# gera coverage/lcov.info
```

- Use `genhtml`/`lcov` ou Codecov para visualizar.
- Rode `flutter analyze` + `flutter test` em cada PR (GitHub Actions, GitLab CI, Codemagic, Bitrise, Cirrus, Appcircle, Travis).
- Para Android, teste no Firebase Test Lab; para web, use `flutter test --platform chrome`.

## 10. Boas práticas

- **Muitos unit + widget**, poucos integration.
- Um comportamento por teste; nomes descritivos.
- Teste o **comportamento**, não a implementação.
- Use fakes para dependências; evite rede/disco reais.
- Isole testes (`setUp`/`tearDown`); não compartilhe estado mutável.
- Teste casos de erro, limites e estados de carregamento.
- Mantenha goldens pequenos e estáveis.
- Não faça `sleep`; use `pump`/`fakeAsync`.
- Teste a arquitetura: se não dá para testar uma camada isolada, refatore.
