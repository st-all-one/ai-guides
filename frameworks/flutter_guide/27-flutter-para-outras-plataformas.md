# 27 — Flutter para quem vem de outras plataformas

Guia de tradução mental para desenvolvedores de Android (Views/Compose), iOS (UIKit/SwiftUI), React Native, Web e Xamarin.Forms. O ponto central é a **mudança para UI declarativa**.

## 1. O paradigma declarativo

Frameworks imperativos (Win32, Android Views, UIKit) constroem um objeto de UI e o **mutam**:

```java
// Imperativo
b.setColor(red);
b.clearChildren();
b.add(new ViewC(...));
```

Flutter é **declarativo**: widgets são **imutáveis** e funcionam como "blueprints". Para mudar a UI, você **reconstrói** o subtree com novo estado.

```dart
// Declarativo
setState(() => _cor = Colors.red);
// o build() gera um novo subtree
```

Consequências:

- Não há `findViewById`/referências mutáveis; você descreve o estado.
- O framework faz o *diff* e atualiza o render tree.
- Estado vive em `State`/ViewModels, não no widget.

## 2. Android (Views) → Flutter

| Android | Flutter |
|---|---|
| `Activity` | Tela (`Scaffold`), `Navigator`/`go_router` |
| `Fragment` | Widget composto / `Navigator` aninhado |
| `View`/`ViewGroup` | `Widget` |
| XML layout | Árvore de widgets em Dart |
| `findViewById` | `GlobalKey`, controllers, estado |
| `LinearLayout`/`RelativeLayout` | `Row`/`Column`/`Stack` |
| `RecyclerView` + Adapter | `ListView.builder`/`GridView.builder` |
| `Intent` | `Navigator.push`/deep links |
| `SharedPreferences` | `shared_preferences` |
| `Retrofit`/OkHttp | `http`/`dio` + codegen |
| `AsyncTask`/coroutines | `Future`/`Stream` + isolates |
| Recursos `res/` | `assets/` no `pubspec.yaml` |
| `strings.xml` | `gen_l10n`/ARB |
| Ciclo de vida da Activity | `State` lifecycle + `AppLifecycleListener` |

## 3. Jetpack Compose → Flutter

| Compose | Flutter |
|---|---|
| `@Composable` | `Widget` |
| `Modifier` | parâmetros do construtor do widget |
| `remember`/`mutableStateOf` | `State`/`ValueNotifier`/ViewModel |
| `Column`/`Row`/`Box` | `Column`/`Row`/`Stack` |
| `LazyColumn` | `ListView.builder`/`CustomScrollView` |
| `rememberLauncherForActivityResult` | plugins/channels |
| Recomposição | rebuild de widgets |

Ambos: UI declarativa, layout em **uma passada**, **constraints** do pai para o filho, imutabilidade. Diferença principal: Compose usa `Modifier`; Flutter configura por parâmetros.

```kotlin
// Compose
Text("Olá", modifier = Modifier.padding(10.dp))
```
```dart
// Flutter
Padding(padding: const EdgeInsets.all(10), child: const Text('Olá'));
```

## 4. iOS UIKit → Flutter

| UIKit | Flutter |
|---|---|
| `UIViewController` | Tela/`Navigator` |
| `UIView` | `Widget` |
| Auto Layout/constraints | `Row`/`Column`/`Expanded`/`Align` |
| `UITableView` | `ListView.builder` |
| `UICollectionView` | `GridView`/`SliverGrid` |
| `UINavigationController` | `Navigator`/`go_router` |
| `UIStoryboard`/XIB | Dart declarativo |
| `@IBAction`/target-action | callbacks (`onPressed`) |
| `UserDefaults` | `shared_preferences` |
| `URLSession` | `http`/`dio` |
| `DispatchQueue` | isolates/`Future` |
| `Info.plist` | `Info.plist` + Dart |
| Delegate/protocol | callbacks/interfaces Dart |

## 5. SwiftUI → Flutter

| SwiftUI | Flutter |
|---|---|
| `View` | `Widget` |
| `@State`/`@StateObject` | `State`/`ChangeNotifier`/ViewModel |
| `@EnvironmentObject` | `InheritedWidget`/provider |
| `VStack`/`HStack`/`ZStack` | `Column`/`Row`/`Stack` |
| `List` | `ListView` |
| `NavigationStack` | `Navigator`/`go_router` |
| `Modifier` (`.padding()`) | widget wrapper (`Padding`) |
| `AsyncImage` | `Image.network`/`cached_network_image` |

SwiftUI é a referência declarativa mais próxima; a maior diferença é que Flutter compõe por **wrapping de widgets** em vez de encadear modificadores.

## 6. React Native / JS → Flutter

| React Native | Flutter |
|---|---|
| `Component`/função | `Widget` |
| `useState`/`useEffect` | `State`/`initState`/`dispose` |
| Props | parâmetros do construtor |
| Context/Redux | `InheritedWidget`/provider/bloc |
| `View`/`Text` | `Container`/`Text` |
| `FlatList` | `ListView.builder` |
| `StyleSheet` | estilos inline / `ThemeData` |
| `AsyncStorage` | `shared_preferences` |
| `fetch`/`axios` | `http`/`dio` |
| JS `Promise` | `Future` |
| `npm` | `pub` |

Dart é tipado estaticamente com null safety (ver `02`); não há ponte JS — o código compila para nativo.

## 7. Web → Flutter

- CSS/layout: em vez de `position`/`flex`, use `Row`/`Column`/`Stack`/`Positioned`.
- DOM: `HtmlElementView` para embeddar HTML; `webview_flutter` para páginas.
- Sem `div`/`span`: tudo é `Widget`.
- Estado: `setState`/ViewModel, não manipulação direta de DOM.
- Roteamento: `go_router` com path URL (ver `07`/`21`).
- CORS: obrigatório para imagens/rede (ver `21`).

## 8. Xamarin.Forms → Flutter

| Xamarin.Forms | Flutter |
|---|---|
| `ContentPage` | Tela/`Scaffold` |
| `ContentView` | Widget |
| `StackLayout`/`Grid`/`AbsoluteLayout` | `Row`/`Column`/`Stack`/`GridView` |
| `ListView` | `ListView.builder` |
| `BindableProperty` | `ValueNotifier`/`ChangeNotifier` |
| MVVM/`INotifyPropertyChanged` | ViewModel/`ChangeNotifier` (ver `06`) |
| `Navigation.PushAsync` | `Navigator.push` |
| XAML | Dart |
| `DependencyService` | injeção de dependência/plugins |
| `App.xaml.cs` lifecycle | `AppLifecycleListener` |

## 9. Concorrência (Dart ↔ Swift/Kotlin/JS)

| Linguagem | Modelo | Equivalente Flutter |
|---|---|---|
| Swift | `async/await`, `Task`, actors | `Future`, `Stream`, isolates |
| Kotlin | coroutines, `Flow` | `Future`, `Stream`, isolates |
| JS | event loop, Promises | `Future`, `Stream`, event loop |
| Dart | event loop + isolates | `Future`/`Stream`; `Isolate.run`/`compute` |

- Dart tem **event loop** como JS, mas com **isolates** (memória separada) para paralelismo real.
- `async/await` é sintático; o código ainda roda num isolate.
- Trabalho pesado **sai da main thread** para isolates (ver `19`).

## 10. Erros de tradução comuns

| Vindo de… | Erro comum | Correção |
|---|---|---|
| Android Views | Guardar referência e mutar | Descrever estado e rebuildar |
| Compose | Esperar `Modifier` | Configurar por parâmetros |
| UIKit | Buscar `findViewById` | Usar `GlobalKey`/controllers/estado |
| RN | Esperar ponte JS | Dart compila para nativo |
| Web | Manipular DOM | Compor widgets |
| Swift/Kotlin | Assumir threads | Usar isolates |
| Todos | Esquecer `dispose()` | Descartar controllers/listeners |

## 11. Trilha de leitura recomendada

`02` (Dart) → `04` (widgets/constraints) → `05`+`06` (estado/arquitetura) → `07` (navegação) → `08` (dados) → `19` (main thread).
