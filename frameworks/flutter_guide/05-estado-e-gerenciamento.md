# 05 — Estado e gerenciamento de estado

## 1. O que é estado

Estado é "todo dado necessário para reconstruir a UI a qualquer momento". Divida em dois conceitos:

| Tipo | Definição | Onde vive | Exemplos |
|---|---|---|---|
| **Ephemeral (local/UI)** | Contido em um único widget; ninguém mais precisa | `State` + `setState` | Página atual do `PageView`, progresso de animação, aba selecionada |
| **App (compartilhado)** | Compartilhado entre telas e/ou persistido entre sessões | ViewModel/Repository | Preferências, login, carrinho, notificações |

> Não há regra universal. "Faça o que for menos estranho." Comece local; promova a app state quando crescer.

## 2. Estado efêmero com `setState`

```dart
class _MinhaHomeState extends State<MinhaHome> {
  int _index = 0;

  @override
  Widget build(BuildContext context) => BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [/* ... */],
      );
}
```

- `setState` deve conter apenas a mutação de estado (síncrona).
- Rebuilda o `State` e **todos os descendentes** — localize ao menor subtree.
- Não chame durante `build`; cheque `mounted` antes de `setState` em callbacks assíncronos.

## 3. Elevar o estado (lifting state up)

Em Flutter, para mudar a UI você **reconstrói** widgets. Não existe `widget.updateWith()`. Portanto, o estado deve viver **acima** dos widgets que o usam, e descer por construtor.

```dart
// RUIM: mutar widget de fora
cartWidget.updateWith(item);

// BOM: estado no pai; filho recebe callback/valor
void myTapHandler(BuildContext context) {
  final cart = context.read<CartModel>();
  cart.add(item);
}
```

## 4. `InheritedWidget` — base do compartilhamento

`InheritedWidget` provê dados a descendentes. `X.of(context)` busca o ancestral mais próximo; `updateShouldNotify()` decide se dependentes rebuildam.

```dart
class CartScope extends InheritedNotifier<CartModel> {
  const CartScope({super.key, required CartModel cart, required super.child})
      : super(notifier: cart);

  static CartModel of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CartScope>()!.notifier!;
}
```

O framework usa isso para `Theme`, `MediaQuery`, `Localizations`. Na prática, use `provider` ou equivalente em vez de escrever `InheritedWidget` à mão.

## 5. `ChangeNotifier` + `ListenableBuilder` (padrão do SDK)

`ChangeNotifier` é um observável do SDK. Ao mudar, chame `notifyListeners()`; a UI escuta com `ListenableBuilder`.

```dart
class CartModel extends ChangeNotifier {
  final List<Item> _items = [];

  UnmodifiableListView<Item> get items => UnmodifiableListView(_items);
  int get totalPrice => _items.length * 42;

  void add(Item item) {
    _items.add(item);
    notifyListeners();
  }

  void removeAll() {
    _items.clear();
    notifyListeners();
  }
}
```

```dart
// Fornecer
ChangeNotifierProvider(
  create: (_) => CartModel(),
  child: const MyApp(),
);

// Consumir / rebuildar
ListenableBuilder(
  listenable: context.watch<CartModel>(),
  builder: (context, _) => Text('${context.watch<CartModel>().totalPrice}'),
);

// Ler sem rebuildar
context.read<CartModel>().add(item);
```

### `provider`

`provider` é a recomendação do time Flutter para **injeção de dependência** e estado simples. Conceitos:

- `ChangeNotifier` — o modelo observável.
- `ChangeNotifierProvider` / `Provider` — disponibiliza na árvore.
- `Consumer` / `context.watch` — rebuilda ao mudar.
- `context.read` — acessa sem rebuildar (em callbacks/init).
- `Selector` — rebuilda só quando uma parte selecionada muda.

```dart
MultiProvider(
  providers: [
    Provider(create: (_) => ApiClient()),
    ChangeNotifierProvider(
      create: (ctx) => HomeViewModel(bookingRepository: ctx.read()),
    ),
  ],
  child: const MyApp(),
);
```

### `ValueNotifier` / `ValueListenableBuilder`

Para um único valor:

```dart
final counter = ValueNotifier<int>(0);

ValueListenableBuilder<int>(
  valueListenable: counter,
  builder: (_, value, __) => Text('$value'),
);
```

## 6. Outras abordagens

| Pacote | Modelo | Quando |
|---|---|---|
| `provider` | `ChangeNotifier` + DI | Padrão recomendado, apps pequenos/médios |
| `riverpod` | Providers, compile-safe, sem `BuildContext` | Apps grandes, testabilidade, sem dependência de contexto |
| `flutter_bloc` | Eventos → estados, streams | Fluxos complexos, rastreabilidade |
| `signals` | Sinais reativos finos | Reatividade granular |
| `flutter_hooks` | Hooks (`useState`, `useMemo`) | Menos boilerplate em widgets |
| `mobx` | Observáveis + reações | Times familiarizados |

Nenhum é "obrigatório". O SDK cobre `ChangeNotifier`/`ListenableBuilder`; escolha por complexidade e experiência do time.

## 7. Regras de ouro

1. **Estado de app não mora no widget.** ViewModels/Repositórios são donos.
2. **Fluxo unidirecional:** dados descem (data → UI); eventos sobem (UI → data).
3. **Imutabilidade:** exponha listas/objetos imutáveis (`UnmodifiableListView`, `freezed`).
4. **Uma fonte da verdade:** só o repositório muta o dado.
5. **`notifyListeners`/emit** após cada mudança; nunca mute silenciosamente.
6. **Descarte** notifiers/listeners em `dispose`.
7. **Não misture** várias bibliotecas de estado no mesmo app.
8. **Teste** ViewModels sem depender de widgets.

## 8. Anti-padrões

- Guardar `BuildContext` para usar depois (use `mounted`/`context.mounted`).
- Chamar `setState` no topo da árvore para uma mudança local.
- Estado global mutável acessado de qualquer lugar (dificulta testes).
- Passar `ViewModel` para widgets profundos quando um `Provider`/`InheritedWidget` resolveria.
- Rebuildar a árvore inteira com um único `ChangeNotifier` gigante; divida por responsabilidade.
- `GlobalKey` como mecanismo de comunicação entre widgets.

## 9. Persistência do estado entre rebuilds

- `State` sobrevive a rebuilds do widget pai; é destruído quando o element sai da árvore.
- Use `PageStorageKey` para preservar posição de rolagem.
- Use `AutomaticKeepAliveClientMixin` em listas com abas.
- Para sobreviver a reinício do app, persista no repositório (ver `08`).
