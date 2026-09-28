---
name: flutter
description: >
  Flutter 3.47 / Dart 3.13: cross-platform UI toolkit — layered architecture,
  engine/embedders, widget/element/render trees, Dart typing (null safety,
  records, patterns, sealed classes), widgets/layout/constraints, state
  management, MVVM architecture (views, view models, repositories, services,
  DI), navigation/go_router, async/networking/JSON, persistence, testing
  (unit/widget/integration/golden), logging/observability, performance/main
  thread, security/hardening, accessibility/i18n, packages/plugins, cookbook
  recipes, platform integration (Android/iOS/desktop/web), DevTools/editors,
  media/ads/IAP/games, AI Toolkit/GenUI, add-to-app/embedding, installation,
  build & deploy, comparisons for other frameworks, best practices and common
  errors. Load when writing, reviewing, debugging, testing, securing, or
  shipping Flutter apps.
category: frameworks
version: "3.47"
tags: [flutter, dart, cross-platform, widgets, mvvm, state-management, testing, performance, security, mobile, web, desktop, go-router, provider]
license: MIT
---

# Flutter 3.47 (Dart 3.13)

Declarative UI toolkit. Compiles to native (Android, iOS, Windows, macOS, Linux) and JS/Wasm (web). Renders with its own engine (Impeller/Skia) — no native OS widgets.

## Use When
- Building/structuring an app: widgets, layout, navigation, theming
- Modeling state and architecture: MVVM, repositories, services, DI, commands
- Wiring networking, JSON, persistence, platform channels, plugins
- Writing/reviewing tests: unit, widget, integration, golden
- Debugging layout errors, rebuilds, logs, crashes
- Optimizing performance: const, lazy lists, isolates, build modes, main-thread offload
- Hardening security; accessibility, i18n, adaptive UI
- Building and shipping Android, iOS, web, desktop

## Core Rules
- UI = f(state); `build()` is pure, fast, side-effect-free.
- Widgets are immutable; mutable state lives in `State` + `setState`.
- Layout: constraints go down, sizes go up, parent sets position.
- Use `const`; prefer `StatelessWidget` over functions returning widgets.
- Layers: UI (View + ViewModel) / Data (Repository + Service); unidirectional flow.
- No business logic in widgets; Repository = single source of truth; services stateless.
- Immutable state; handle errors with a sealed `Result` or caught exceptions.
- Navigate with `go_router` (or `Navigator` + `MaterialPageRoute`); avoid named routes.
- Network/IO is `Future`/`Stream`; never block the UI. Main thread renders only — offload anything > 1 frame gap (~8 ms) to isolates (JSON, images, crypto, DB).
- `ChangeNotifier` + `ListenableBuilder` is the SDK baseline; `provider` for DI.
- Test each layer with fakes; end-to-end with `integration_test`.
- Log via `dart:developer`/`debugPrint`; centralize errors in `FlutterError.onError` + `PlatformDispatcher.instance.onError`.
- Never embed secrets; obfuscate releases, keep SYMBOLS; keep deps updated.
- Avoid needless `saveLayer`/`Opacity`/clip; use lazy builders (`ListView.builder`).

## Key APIs
```dart
// Stateful widget + local state
class Counter extends StatefulWidget {
  const Counter({super.key});
  @override
  State<Counter> createState() => _CounterState();
}
class _CounterState extends State<Counter> {
  int n = 0;
  @override
  Widget build(BuildContext c) =>
      FilledButton(onPressed: () => setState(() => n++), child: Text('$n'));
}

// MVVM: sealed Result + ViewModel + Repository
sealed class Result<T> { const Result(); }
final class Ok<T> extends Result<T> { const Ok(this.value); final T value; }
final class Error<T> extends Result<T> { const Error(this.error); final Exception error; }

class HomeViewModel extends ChangeNotifier {
  HomeViewModel(this._repo) { _load(); }
  final Repo _repo;
  bool loading = true;
  Object? error;
  List<Item> items = const [];
  Future<void> _load() async {
    loading = true; notifyListeners();
    final r = await _repo.list();
    switch (r) {
      case Ok<List<Item>>(): items = r.value;
      case Error<List<Item>>(): error = r.error;
    }
    loading = false; notifyListeners();
  }
}

// View consumes the ViewModel
ListenableBuilder(
  listenable: vm,
  builder: (c, _) => vm.loading
      ? const CircularProgressIndicator()
      : ListView.builder(
          itemCount: vm.items.length,
          itemBuilder: (_, i) => Text(vm.items[i].title)),
);

// Widget test
testWidgets('increments', (t) async {
  await t.pumpWidget(const MaterialApp(home: Counter()));
  await t.tap(find.byType(FilledButton));
  await t.pump();
  expect(find.text('1'), findsOneWidget);
});
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Overview, versions, mental model |
| `01-como-flutter-funciona.md` | Layers, engine, 3 trees, render pipeline, JIT/AOT/Wasm, build modes, hot reload |
| `02-dart-para-flutter.md` | Typing, null safety, records, patterns, sealed/enums, generics, async, isolates |
| `03-projeto-e-pubspec.md` | Structure, pubspec, dependencies, lints, formatting, `dart fix` |
| `04-widgets-e-layout.md` | Widgets, Stateless/Stateful, lifecycle, constraints, lists, slivers, keys |
| `05-estado-e-gerenciamento.md` | Ephemeral vs app state, setState, InheritedWidget, provider, riverpod/bloc |
| `06-arquitetura-mvvm.md` | Layers, View/ViewModel/Repository/Service, DI, UDF, SSOT, Commands, Result |
| `07-navegacao-e-rotas.md` | Navigator, Router, go_router, deep linking, named routes |
| `08-assincronismo-e-dados.md` | Future/Stream, networking, JSON, isolation, persistence, offline-first, optimistic |
| `09-testes.md` | Unit/widget/integration, mocking/fakes, golden, coverage, plugins |
| `10-logs-e-observabilidade.md` | print/log/debugPrint, DevTools Logging, global errors, crash reporting |
| `11-desempenho.md` | const, lazy lists, saveLayer/opacity, intrinsics, isolates, app size |
| `12-seguranca.md` | Obfuscation/SYMBOLS, secrets, keystore, secure storage, network, supply chain |
| `13-acessibilidade-e-i18n.md` | a11y checklist, Semantics, gen_l10n/ARB, adaptive/responsive |
| `14-plataforma-e-pacotes.md` | Plugins, platform channels, Pigeon, FFI, platform views, pub |
| `15-build-e-deploy.md` | Android/iOS/web/desktop release, flavors, CI/CD, Wasm |
| `16-boas-praticas.md` | Recommendations, lints, naming, anti-patterns |
| `17-cheatsheet.md` | Commands, widgets, snippets, quick-reference tables |
| `18-faq-e-erros-comuns.md` | Layout/rebuild errors, troubleshooting |
| `19-arquitetura-e-main-thread.md` | Main-thread offload, isolates, frame scheduling, proving fluidity |
| `20-cookbook-receitas.md` | Recipes: animations, gestures, effects, lists, forms, images, design |
| `21-integracao-por-plataforma.md` | Android/iOS/desktop/web: splash, predictive back, restore, Wasm, embedding |
| `22-devtools-e-editor.md` | DevTools (inspector/performance/CPU/memory/network/size/deep links), editors, hot reload |
| `23-midia-e-plugins-comuns.md` | Camera, video, audio, ads, IAP/payments, games, Firebase, common plugins |
| `24-ai-toolkit-e-genui.md` | AI tooling, Flutter AI Toolkit, GenUI SDK, AI best practices |
| `25-add-to-app-e-embedding.md` | Embed Flutter in existing apps, multi-engine/multi-view, embedding |
| `26-instalacao-e-ambientes.md` | Install, SDK, channels/versions, upgrade, troubleshooting, uninstall |
| `27-flutter-para-outras-plataformas.md` | Translation from Android/Compose/iOS/SwiftUI/RN/Web/Xamarin |

## Read Order
`00`→`01`→`02` for fundamentals, then load only the file matching the task. Coming from another stack: read `27` first.

## Prereqs
Dart 3.13+ (bundled in Flutter 3.47), Flutter SDK; Android Studio/Xcode for native builds; basic Dart/OOP.
