# 06 — Arquitetura de apps Flutter (MVVM)

Esta é a arquitetura recomendada pelo time Flutter. Não é regra absoluta; adapte aos requisitos. O princípio central é **separação de responsabilidades**.

## 1. Camadas

```
┌─────────────────────────────────────────────┐
│ UI LAYER                                     │
│   View (widgets)  ←→  ViewModel (lógica UI)  │
├─────────────────────────────────────────────┤
│ (opcional) DOMAIN LAYER — use-cases          │
├─────────────────────────────────────────────┤
│ DATA LAYER                                   │
│   Repository (fonte da verdade)              │
│   Service (APIs externas, stateless)         │
└─────────────────────────────────────────────┘
```

- **UI layer:** interage com o usuário; exibe dados e recebe input. Feita de **Views** e **ViewModels** (MVVM).
- **Domain layer (opcional):** use-cases/interactors para lógica complexa ou reutilizada.
- **Data layer:** gerencia dados; feita de **Repositories** e **Services**.

Cada camada só se comunica com a camada imediatamente acima/abaixo. A UI não deve saber que a camada de dados existe.

## 2. UI Layer

### View

- É o widget (ou coleção de widgets) de uma feature; muitas vezes uma tela com `Scaffold`.
- **Sem lógica de negócio.** Recebe tudo do ViewModel.
- Única lógica permitida: `if` simples para mostrar/ocultar, animação, layout por tamanho/orientação e roteamento simples.
- Relação 1:1 com o ViewModel.

```dart
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.viewModel});
  final HomeViewModel viewModel;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: ListenableBuilder(
          listenable: viewModel,
          builder: (context, _) => viewModel.load.running
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  itemCount: viewModel.bookings.length,
                  itemBuilder: (_, i) => _Booking(
                    key: ValueKey(viewModel.bookings[i].id),
                    booking: viewModel.bookings[i],
                    onDismissed: (_) =>
                        viewModel.deleteBooking.execute(viewModel.bookings[i].id),
                  ),
                ),
        ),
      );
}
```

### ViewModel

- Converte dados de domínio em **UI State** (filtra, ordena, agrega).
- Mantém o estado atual da view para sobreviver a rebuilds/rotação.
- Expõe **commands** (callbacks) para eventos da view.
- Depende de um ou mais repositories (injetados no construtor, **privados**).
- Estende `ChangeNotifier` (ou usa riverpod/bloc/signals).

```dart
class HomeViewModel extends ChangeNotifier {
  HomeViewModel({
    required BookingRepository bookingRepository,
    required UserRepository userRepository,
  })  : _bookingRepository = bookingRepository,
        _userRepository = userRepository {
    load = Command0(_load)..execute();
    deleteBooking = Command1(_deleteBooking);
  }

  final BookingRepository _bookingRepository;
  final UserRepository _userRepository;

  User? _user;
  User? get user => _user;

  List<BookingSummary> _bookings = [];
  UnmodifiableListView<BookingSummary> get bookings =>
      UnmodifiableListView(_bookings);

  late final Command0 load;
  late final Command1<void, int> deleteBooking;

  Future<Result<void>> _load() async {
    try {
      final userResult = await _userRepository.getUser();
      switch (userResult) {
        case Ok<User>(): _user = userResult.value;
        case Error<User>(): _log.warning('Falha ao carregar usuário', userResult.error);
      }
      return userResult;
    } finally {
      notifyListeners();
    }
  }

  Future<Result<void>> _deleteBooking(int id) async {
    try {
      return await _bookingRepository.delete(id);
    } finally {
      notifyListeners();
    }
  }
}
```

> **ViewModel não conhece a View.** A View conhece o ViewModel. Comunicação unidirecional.

## 3. Data Layer

### Service

- **Stateless**, sem efeitos colaterais; só encapsula uma API externa (HTTP, plugin de plataforma, arquivo local).
- Um service por fonte de dados.
- Expõe `Future`/`Stream` (idealmente `Result<T>`).
- Nunca é chamado diretamente pela UI.

```dart
class ApiClient {
  Future<Result<List<ContinentApiModel>>> getContinents() async { /* ... */ }
  Future<Result<List<DestinationApiModel>>> getDestinations() async { /* ... */ }
  Future<Result<void>> deleteBooking(int id) async { /* ... */ }
}
```

### Repository

- **Fonte única da verdade** para um tipo de dado; só ele muta esse dado.
- Polling, cache, retry, refresh, sincronização offline, transformação em **domain models**.
- Um repository por tipo de dado; muitos-para-muitos com ViewModels e Services.
- Repositories **não conhecem uns aos outros** (combine no ViewModel/domain).

```dart
abstract class BookingRepository {
  Future<Result<void>> createBooking(Booking booking);
  Future<Result<Booking>> getBooking(int id);
  Future<Result<List<BookingSummary>>> getBookingsList();
  Future<Result<void>> delete(int id);
}

class BookingRepositoryRemote implements BookingRepository {
  BookingRepositoryRemote({required ApiClient apiClient}) : _apiClient = apiClient;
  final ApiClient _apiClient;
  List<Destination>? _cachedDestinations;

  @override
  Future<Result<Booking>> getBooking(int id) async {
    try {
      final result = await _apiClient.getBooking(id);
      switch (result) {
        case Error<BookingApiModel>():
          return Result.error(result.error);
        case Ok<BookingApiModel>():
          final booking = result.value;
          final destination = _apiClient.getDestination(booking.destinationRef);
          final activities =
              _apiClient.getActivitiesForBooking(booking.activitiesRef);
          return Result.ok(Booking(
            startDate: booking.startDate,
            endDate: booking.endDate,
            destination: destination,
            activity: activities,
          ));
      }
    } on Exception catch (e) {
      return Result.error(e);
    }
  }

  @override
  Future<Result<void>> delete(int id) async {
    try {
      return await _apiClient.deleteBooking(id);
    } on Exception catch (e) {
      return Result.error(e);
    }
  }
}
```

**Classes abstratas** de repository permitem implementações por ambiente (`Remote`, `Local`, `Fake`).

### Domain models vs. API models

- **API models:** refletem o JSON bruto do servidor.
- **Domain models:** apenas o que o app precisa; imutáveis; consumidos por ViewModels.
- Manter os dois separados evita complexidade nos ViewModels (custo: mais código).

## 4. Domain Layer (opcional)

Use-cases/interactors encapsulam lógica que:

1. precisa combinar múltiplos repositories;
2. é muito complexa;
3. será reutilizada por vários ViewModels.

Regras ao adotar:

- Use-cases dependem de repositories.
- ViewModels dependem de use-cases **e** repositories.
- Adicione use-cases **quando necessário** (não crie um para cada acesso simples).

Prós: menos duplicação, mais testabilidade, ViewModels mais limpos.
Contras: mais classes/boilerplate e mocks nos testes.

## 5. Fluxo de dados unidirecional (UDF)

```
Evento do usuário
   ↓ (UI chama comando do ViewModel)
ViewModel
   ↓ (chama repository)
Repository  →  Service  →  API/DB
   ↓ (novo dado)
Repository
   ↓
ViewModel (atualiza UI state)
   ↓ notifyListeners
View re-renderiza
```

Dados novos também podem iniciar no data layer (ex.: polling) e percorrer só a segunda metade. O importante: **mudanças de dado acontecem sempre na SSOT (data layer)**.

## 6. Single Source of Truth (SSOT)

- Cada tipo de dado tem **uma** classe responsável por representá-lo/mutá-lo (geralmente o repository).
- Aplique também dentro de classes: getters derivados de um único campo em vez de campos paralelos; records em vez de listas paralelas.

## 7. Dependency Injection

Passar dependências pelo construtor. `provider` é a recomendação para DI no topo da árvore.

```dart
runApp(
  MultiProvider(
    providers: [
      Provider(create: (_) => AuthApiClient()),
      Provider(create: (_) => ApiClient()),
      Provider(create: (_) => SharedPreferencesService()),
      ChangeNotifierProvider(
        create: (ctx) => AuthRepositoryRemote(
          authApiClient: ctx.read(),
          apiClient: ctx.read(),
          sharedPreferencesService: ctx.read(),
        ) as AuthRepository,
      ),
      Provider(create: (ctx) =>
          DestinationRepositoryRemote(apiClient: ctx.read()) as DestinationRepository),
    ],
    child: const MainApp(),
  ),
);
```

Os ViewModels são criados no `go_router`, injetando repositories via `context.read()`:

```dart
GoRoute(
  path: Routes.home,
  builder: (context, state) {
    final viewModel = HomeViewModel(bookingRepository: context.read());
    return HomeScreen(viewModel: viewModel);
  },
),
```

**Regras de comunicação:**

| Componente | Pode conhecer | Nunca conhece |
|---|---|---|
| View | 1 ViewModel | Qualquer outra camada |
| ViewModel | 1 View (só expõe dados) | A View (não a referencia) |
| Repository | N Services | ViewModels |
| Service | Nada | Repository/ViewModel |

## 8. Commands

`Command` encapsula uma ação assíncrona e seus estados (`running`, `completed`, `error`), permitindo UI consistente (loading/erro/sucesso) sem lógica no widget.

```dart
abstract class Command<T> extends ChangeNotifier {
  bool _running = false;
  Result<T>? _result;

  bool get running => _running;
  bool get error => _result is Error;
  bool get completed => _result is Ok;

  Future<void> _execute(Future<Result<T>> Function() action) async {
    if (_running) return;
    _running = true;
    _result = null;
    notifyListeners();
    try {
      _result = await action();
    } finally {
      _running = false;
      notifyListeners();
    }
  }
}
```

Uso na view:

```dart
ListenableBuilder(
  listenable: viewModel.load,
  builder: (context, child) {
    if (viewModel.load.running) return const CircularProgressIndicator();
    if (viewModel.load.error) {
      return ErrorIndicator(onPressed: viewModel.load.execute);
    }
    return child!;
  },
  child: const HomeContent(),
);
```

Vantagem: como o command existe no ViewModel, não importa quando a ação resolve — o estado correto sempre está disponível. Pacote alternativo: `command_it`.

## 9. `Result` (erros previsíveis)

Dart não tem checked exceptions. O padrão `Result` força o chamador a tratar o erro:

```dart
sealed class Result<T> {
  const Result();
  const factory Result.ok(T value) = Ok._;
  const factory Result.error(Exception error) = Error._;
}

final class Ok<T> extends Result<T> {
  const Ok._(this.value);
  final T value;
}

final class Error<T> extends Result<T> {
  const Error._(this.error);
  final Exception error;
}
```

```dart
final result = await repository.getUser();
switch (result) {
  case Ok<User>(): user = result.value;
  case Error<User>(): error = result.error;
}
```

- `sealed` + `switch` exaustivo.
- Evita `try/catch` espalhado e exceções esquecidas.
- Pacotes: `result_dart`, `result_type`, `multiple_result`.

## 10. Modelos imutáveis

Use `freezed` ou `built_value` para gerar `copyWith`, `==`/`hashCode`, `toJson`/`fromJson`.

```dart
@freezed
class User with _$User {
  const factory User({
    required String name,
    required String picture,
  }) = _User;

  factory User.fromJson(Map<String, Object?> json) => _$UserFromJson(json);
}
```

Imutabilidade impede mutações acidentais na UI e garante UDF.

## 11. Nomenclatura recomendada

| Componente | Sufixo/Exemplo |
|---|---|
| View | `HomeScreen`, `LogoutButton` |
| ViewModel | `HomeViewModel`, `LogoutViewModel` |
| Repository | `UserRepository` (abstrato) + `UserRepositoryRemote` |
| Service | `ClientApiService`, `SharedPreferencesService` |
| Model | `User`, `Booking`, `BookingApiModel` |
| Widgets compartilhados | `ui/core/` (não `widgets/`) |

## 12. Recomendações oficiais (resumo)

| Prática | Prioridade |
|---|---|
| Camadas UI/data bem definidas | **Forte** |
| Repository pattern na camada de dados | **Forte** |
| ViewModels e Views (MVVM) | **Forte** |
| `ChangeNotifier`/`Listenable` para updates | Condicional |
| Não colocar lógica em widgets | **Forte** |
| Domain layer | Condicional |
| Fluxo unidirecional | **Forte** |
| Commands para eventos | Recomendado |
| Modelos imutáveis (`freezed`/`built_value`) | **Forte** / Recomendado |
| Separar API models e domain models | Condicional |
| Dependency injection (`provider`) | **Forte** |
| `go_router` para navegação | Recomendado |
| Classes abstratas de repository | **Forte** |
| Testar componentes separadamente e juntos | **Forte** |
| Fakes para testes | **Forte** |

## 13. Testabilidade como termômetro

Se a arquitetura está boa, testar é fácil:

- **ViewModel:** unit test com repository fake — sem Flutter.
- **View:** widget test passando ViewModel + fakes de repository.
- **Repository:** unit test com service fake.
- **Service:** unit test com cliente HTTP mockado.

Ver `09`.
