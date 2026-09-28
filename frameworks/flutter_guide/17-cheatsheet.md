# 17 — Cheatsheet

## Comandos

```console
# Projeto
flutter create meu_app
flutter create --template=package meu_pacote
flutter create --template=plugin --platforms=android,ios meu_plugin

# Dependências
flutter pub get
flutter pub add <pkg>
flutter pub add dev:<pkg>
flutter pub upgrade
flutter pub upgrade --major-versions
flutter pub outdated
flutter pub deps

# Execução
flutter run
flutter run --profile
flutter run --release
flutter run -d chrome
flutter run --dart-define=API_URL=https://api

# Qualidade
flutter analyze
dart format .
dart fix --dry-run
dart fix --apply
flutter test
flutter test --coverage
flutter test integration_test/app_test.dart
flutter test --update-goldens

# Build
flutter build apk --release
flutter build appbundle --release
flutter build ipa
flutter build web --release --wasm
flutter build macos --release
flutter build windows --release
flutter build linux --release
flutter build apk --obfuscate --split-debug-info=out/android
flutter build apk --analyze-size

# Utilitários
flutter doctor -v
flutter clean
flutter pub run build_runner build --delete-conflicting-outputs
flutter gen-l10n
flutter symbolize -i trace.txt -d symbols.symbols
```

## Widgets essenciais

| Categoria | Widgets |
|---|---|
| Estrutura | `MaterialApp`, `CupertinoApp`, `Scaffold`, `AppBar` |
| Layout | `Container`, `Padding`, `Center`, `Align`, `Row`, `Column`, `Expanded`, `Flexible`, `SizedBox`, `Stack`, `Positioned`, `Wrap`, `LayoutBuilder` |
| Listas | `ListView`, `ListView.builder`, `GridView`, `CustomScrollView`, `SliverList` |
| Texto | `Text`, `RichText`, `SelectableText`, `TextField`, `TextFormField` |
| Botões | `ElevatedButton`, `FilledButton`, `TextButton`, `IconButton`, `FloatingActionButton` |
| Feedback | `CircularProgressIndicator`, `LinearProgressIndicator`, `SnackBar`, `AlertDialog`, `BottomSheet` |
| Navegação | `Navigator`, `Router`, `GoRouter`, `NavigationBar`, `Drawer`, `TabBar` |
| Estado | `StatefulWidget`, `InheritedWidget`, `ChangeNotifier`, `ListenableBuilder`, `ValueListenableBuilder`, `FutureBuilder`, `StreamBuilder` |
| Animações | `AnimatedContainer`, `AnimatedOpacity`, `AnimatedSwitcher`, `AnimationController`, `Tween`, `AnimatedBuilder` |
| A11y | `Semantics`, `ExcludeSemantics`, `MergeSemantics` |

## Snippets

### Stateless + Stateful

```dart
class Tela extends StatelessWidget {
  const Tela({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Olá')));
}

class Contador extends StatefulWidget {
  const Contador({super.key});
  @override
  State<Contador> createState() => _ContadorState();
}

class _ContadorState extends State<Contador> {
  int _n = 0;
  @override
  Widget build(BuildContext context) => FilledButton(
        onPressed: () => setState(() => _n++),
        child: Text('$_n'),
      );
}
```

### Repository + ViewModel + Result

```dart
sealed class Result<T> { const Result(); }
final class Ok<T> extends Result<T> { const Ok(this.value); final T value; }
final class Error<T> extends Result<T> { const Error(this.error); final Exception error; }

class HomeViewModel extends ChangeNotifier {
  HomeViewModel(this._repo) { load = Command0(_load)..execute(); }
  final Repo _repo;
  late final Command0 load;
  List<Item> _items = [];
  List<Item> get items => List.unmodifiable(_items);

  Future<Result<void>> _load() async {
    final r = await _repo.list();
    switch (r) {
      case Ok<List<Item>>(): _items = r.value;
      case Error<List<Item>>(): /* log */
    }
    notifyListeners();
    return r;
  }
}
```

### Consumo na View

```dart
ListenableBuilder(
  listenable: vm,
  builder: (context, _) => vm.load.running
      ? const CircularProgressIndicator()
      : ListView.builder(
          itemCount: vm.items.length,
          itemBuilder: (_, i) => ListTile(title: Text(vm.items[i].name)),
        ),
);
```

### Rede + JSON

```dart
final res = await client.get(Uri.parse('$base/itens'));
if (res.statusCode != 200) throw HttpException('HTTP ${res.statusCode}');
final itens = (jsonDecode(res.body) as List)
    .map((e) => Item.fromJson(e as Map<String, dynamic>))
    .toList();
```

### Isolate

```dart
final data = await Isolate.run<List<Item>>(() {
  final raw = jsonDecode(bigString) as List;
  return raw.map((e) => Item.fromJson(e as Map<String, dynamic>)).toList();
});
```

### Teste de widget

```dart
testWidgets('mostra texto', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: Tela()));
  expect(find.text('Olá'), findsOneWidget);
  await tester.tap(find.byType(FilledButton));
  await tester.pump();
});
```

### Erros globais

```dart
FlutterError.onError = (d) { FlutterError.presentError(d); reporter(d); };
PlatformDispatcher.instance.onError = (e, s) { reporter(e, s); return true; };
```

### i18n

```dart
Text(AppLocalizations.of(context)!.helloWorld);
```

### Provider (DI)

```dart
MultiProvider(
  providers: [
    Provider(create: (_) => ApiClient()),
    ChangeNotifierProvider(create: (c) => HomeViewModel(c.read())),
  ],
  child: const MyApp(),
);
```

## Tabelas rápidas

### Null safety

| Símbolo | Significado |
|---|---|
| `T?` | Pode ser null |
| `T` | Não-nulo |
| `?.` | Acesso seguro |
| `??` | Fallback |
| `??=` | Atribui se null |
| `!` | Asserção não-nula |
| `late` | Inicialização tardia não-nula |
| `required` | Parâmetro nomeado obrigatório |

### Build modes

| Modo | Hot reload | Assertions | Debug info | Uso |
|---|---|---|---|---|
| Debug | ✅ | ✅ | ✅ | Dev |
| Profile | ❌ | ❌ | parcial | Perf |
| Release | ❌ | ❌ | ❌ | Produção |

### Constraints

> Constraints descem, tamanhos sobem, o pai posiciona.

### Isolates vs threads

- Isolates não compartilham memória; comunicam por mensagens.
- Objetos imutáveis passam por referência; mutáveis são copiados.
- Web não tem isolates (use `compute`).
