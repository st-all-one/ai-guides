# 21 — Integração por plataforma

Como integrar o app Flutter com cada SO. Para platform channels, Pigeon, FFI e platform views, ver `14`; aqui o foco é configuração e comportamento específico de plataforma.

## 1. Visão geral

| Plataforma | Setup | Renderer | Particularidades |
|---|---|---|---|
| Android | `platform-integration/android/setup` | Impeller (Vulkan/GLES) | Splash, predictive back, restore state, Jetpack |
| iOS | `platform-integration/ios/setup` | Impeller (Metal) | Launch screen, app extensions, app clips, Apple frameworks |
| Web | `platform-integration/web/setup` | CanvasKit/Skwasm | Wasm, embedding, CORS, HtmlElementView |
| macOS | Xcode/SwiftPM | Impeller (Metal) | Sandbox/entitlements, SwiftPM |
| Windows | Visual Studio | Impeller/ANGLE | `extern_win`, MSIX |
| Linux | GTK | Impeller/GL | `building.md`, dependências do sistema |

O comando `flutter doctor -v` valida cada toolchain.

## 2. Android

### Splash screen (launch screen)

Use um `Drawable` como `windowBackground` do tema de launch, e um **NormalTheme** para depois do splash.

```xml
<style name="LaunchTheme" parent="@android:style/Theme.Black.NoTitleBar">
  <item name="android:windowBackground">@drawable/launch_background</item>
</style>
<style name="NormalTheme" parent="@android:style/Theme.Black.NoTitleBar">
  <item name="android:windowBackground">@drawable/normal_background</item>
</style>
```

No `AndroidManifest.xml`, aplique `LaunchTheme` à activity e registre `NormalTheme` via `<meta-data android:name="io.flutter.embedding.android.NormalTheme" .../>`. Android 12+ tem a `SplashScreen` API (`windowSplashScreenBackground`, `windowSplashScreenAnimatedIcon`). Para add-to-app, **pré-aqueça um `FlutterEngine`** (ver `25`).

### Predictive back (Android 13+/14+)

Habilite no `<application>`:

```xml
<application android:enableOnBackInvokedCallback="true" ... />
```

Trate o gesto com **`PopScope`** (substitui `WillPopScope`):

```dart
PopScope(
  canPop: false,
  onPopInvokedWithResult: (didPop, result) async {
    if (didPop) return;
    final sair = await _confirmar(context);
    if (sair && context.mounted) Navigator.of(context).pop(result);
  },
  child: const FormScreen(),
);
```

### Restauração de estado

Flutter restaura o estado quando o SO recria o processo. Implemente `RestorationMixin` + `RestorableProperty`:

```dart
class _State extends State<Tela> with RestorationMixin {
  @override
  String? get restorationId => 'tela';
  final _contador = RestorableInt(0);
  @override
  void restoreState(RestorationBucket? oldBucket, bool initial) =>
      registerForRestoration(_contador, 'contador');
  @override
  void dispose() { _contador.dispose(); super.dispose(); }
}
```

### Outros

- **`SensitiveContent`**: oculta conteúdo sensível de screenshots/recents. Ver `12`.
- **Permissão de rede local**: Android 16+ exige `ACCESS_LOCAL_NETWORK`; declare e peça com `permission_handler` antes de abrir sockets.
- **ChromeOS**: `chromeos.md` (resize, mouse/keyboard, janelas).
- **Jetpack APIs**: `call-jetpack-apis.md` (chamadas via channel).
- **Compose activity**: `compose-activity.md` para hospedar Compose dentro de Flutter.

## 3. iOS

### Launch screen

Personalize via `LaunchScreen.storyboard` (ou `Info.plist`). Mantenha o splash curto e consistente com o tema.

### App Extensions

- Adicione o target da extensão no Xcode.
- Compartilhe configurações de build e código/assets.
- Extensões **não podem** renderizar Flutter diretamente na maioria dos casos; comunique-se via **App Groups** (armazenamento compartilhado) e chamadas Dart em modo headless.
- Restrições de memória são mais rígidas que no app principal.

### App Clips

- Crie o target App Clip e remova arquivos desnecessários.
- Compartilhe build configs, código e assets.
- Configure **associated domains**.
- Integre o Flutter e os plugins no target do Clip.
- Ver `ios/ios-app-clip.md`.

### Apple Frameworks e plugins

- Plugins encapsulam frameworks nativos; adicione via `pubspec` (ver `14`).
- SwiftPM é suportado para apps e autores de plugin.

### Platform views e restore state

- Platform views: composição híbrida com `UiKitView` (ver `14`).
- Restore state: análogo ao Android, com `RestorationMixin`.

## 4. macOS, Windows e Linux

- **macOS**: requer Xcode; use SwiftPM para integrar módulos; cuidado com **sandbox/entitlements** (rede, arquivos). Platform views via `AppKitView`.
- **Windows**: requer Visual Studio com "Desktop development with C++"; empacote com MSIX; `windows/extern_win.md` cobre integração de janelas.
- **Linux**: requer dependências GTK; ver `linux/building.md`.
- Crie projetos desktop com `flutter create --platforms=windows,macos,linux`.
- Suporte a plugins varia por plataforma (verifique em pub.dev).

## 5. Web

### Renderizadores

- **CanvasKit** (padrão): compila C++/Skia para Wasm; renderização consistente.
- **Skwasm** (`--wasm`): melhor desempenho com multithreading.
- **HTML**: legado.

```console
flutter build web --release --wasm
```

### Inicialização e bootstrap

- `flutter_bootstrap.js` controla o carregamento (engine, assets, service worker).
- Personalize a config (ex.: `forceSingleThreadedSkwasm`, callbacks `onEntrypointLoaded`).
- `web-dev-config.json` ajusta flags por ambiente (dev/staging/prod), com precedência definida.

### Embedding (Flutter dentro de uma página)

- **Full page**: Flutter ocupa a página inteira.
- **Embedded mode**: renderiza em um host element dentro de um app HTML/JS existente.
- **Custom element (`hostElement`)**: monte múltiplas views (`multi-view`) e gerencie via JS.
- Requisitos de CSS do host element (tamanho/posição) são obrigatórios.

### Conteúdo HTML dentro do Flutter

- `HtmlElementView` (via `dart:ui_web`/`platformViewRegistry`) para embeddar DOM.
- `webview_flutter` para páginas web completas.
- Cuide de **hit testing** (eventos de ponteiro atravessando a view).

### Imagens e CORS

- Imagens de rede no web exigem **CORS**; configure o servidor ou use proxy.
- Prefira assets locais ou CDNs com cabeçalhos corretos.

### URL strategy

- Use **path URL** (`usePathUrlStrategy()`) para URLs limpas e deep links (ver `07`).
- O botão voltar do navegador funciona com `Router` page-backed.

## 6. Desktop (visão prática)

```console
flutter create --platforms=windows,macos,linux meu_app
flutter run -d macos
flutter build windows --release
flutter build macos --release
flutter build linux --release
```

- Plugins podem não suportar todas as plataformas; verifique `pub.dev` e `flutter pub deps`.
- Habilite suporte a desktop no projeto existente com `flutter create --platforms=... .`.

## 7. Checklist de integração

- [ ] `flutter doctor -v` sem erros na plataforma-alvo
- [ ] Splash/launch screen configurado e curto
- [ ] Predictive back tratado com `PopScope` (Android)
- [ ] Restauração de estado onde o SO recria o processo
- [ ] Permissões declaradas (rede local, câmera, etc.)
- [ ] Deep links / associated domains configurados (ver `07`)
- [ ] CORS resolvido para imagens/rede no web
- [ ] Plugins suportam as plataformas-alvo
- [ ] Sandbox/entitlements revisados (macOS)
- [ ] Testes por plataforma (ver `09`)
