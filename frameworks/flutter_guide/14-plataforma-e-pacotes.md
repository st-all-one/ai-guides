# 14 — Plataforma, plugins e interoperabilidade

## 1. Pacotes vs. plugins

| Termo | Definição |
|---|---|
| **Package (Dart)** | Código Dart puro; roda em todos os alvos |
| **Plugin** | Contém código específico de plataforma (Android/iOS/desktop) acessado via channels/FFI |
| **Federated plugin** | Plugin dividido em `app-facing`, `platform interface` e implementações por plataforma |

- Catálogo: <https://pub.dev>. Pacotes oficiais em `flutter/packages`.
- Adicione com `flutter pub add <pacote>`.

```dart
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
```

## 2. Platform channels

Comunicação entre Dart e código nativo (Kotlin/Java, Swift/ObjC) por mensagens serializadas.

```dart
// Dart
const channel = MethodChannel('foo');
final greeting = await channel.invokeMethod<String>('bar', 'world');
```

```kotlin
// Android (Kotlin)
val channel = MethodChannel(flutterView, "foo")
channel.setMethodCallHandler { call, result ->
  when (call.method) {
    "bar" -> result.success("Hello, ${call.arguments}")
    else -> result.notImplemented()
  }
}
```

```swift
// iOS (Swift)
let channel = FlutterMethodChannel(name: "foo", binaryMessenger: flutterView)
channel.setMethodCallHandler { call, result in
  switch call.method {
  case "bar": result("Hello, \(call.arguments as! String)")
  default: result(FlutterMethodNotImplemented)
  }
}
```

- Dados serializados via codecs (`StandardMessageCodec`).
- Trate erros: `result.error(...)` / `PlatformException` no Dart.
- Use `EventChannel` para streams contínuos do nativo para o Dart.
- **Pigeon** gera código type-safe para channels, evitando strings mágicas.

## 3. FFI (`dart:ffi`)

Para APIs C (inclusive geradas de Rust/Go), sem serialização — mais rápido que channels.

```dart
import 'dart:ffi';
import 'package:ffi/ffi.dart';

typedef MessageBoxNative = Int32 Function(IntPtr, Pointer<Utf16>, Pointer<Utf16>, Int32);
typedef MessageBoxDart = int Function(int, Pointer<Utf16>, Pointer<Utf16>, int);

final user32 = DynamicLibrary.open('user32.dll');
final messageBox = user32.lookupFunction<MessageBoxNative, MessageBoxDart>('MessageBoxW');
```

- Disponível em todos os alvos **exceto web**.
- No web, use JS interop + `package:web`.
- Cuidado com gerenciamento de memória (`malloc`/`calloc`/`free`).
- Para trabalho assíncrono com FFI, use isolates.

## 4. Platform views

Embutem controles nativos na árvore Flutter.

```dart
if (defaultTargetPlatform == TargetPlatform.android) {
  return AndroidView(
    viewType: 'plugins.flutter.io/google_maps',
    creationParamsCodec: const StandardMessageCodec(),
  );
} else if (defaultTargetPlatform == TargetPlatform.iOS) {
  return UiKitView(viewType: 'plugins.flutter.io/google_maps');
}
```

- Use só para controles complexos difíceis de reimplementar (ex.: mapas, WebView).
- Há overhead de sincronização (textura, hit-testing, semântica).
- Transparência composta de forma diferente de widgets Flutter.
- No momento, não disponível para desktop (limitação não arquitetural).

## 5. Add-to-app (Flutter em app existente)

- Embuta Flutter como módulo (`flutter create -t module`) ou como AAR/framework.
- Inicialize o `FlutterEngine` cedo (antes da primeira tela) para evitar atraso.
- Reutilize o engine entre telas para economizar memória.
- `FlutterFragment`/`FlutterActivity` (Android), `FlutterViewController` (iOS), `FlutterViewController` (macOS).
- Suporta múltiplas instâncias de Flutter (`multiple-flutters`).

## 6. Swift Package Manager (iOS/macOS)

O Flutter suporta SwiftPM para gerenciar dependências nativas de plugins. Guias específicos para autores de plugins e desenvolvedores de app. Habilite via `flutter config --enable-swift-package-manager` (ver doc oficial).

## 7. Desenvolvendo pacotes

```
meu_pacote/
├── lib/meu_pacote.dart          # API pública
├── lib/src/                     # implementação privada
├── android/ ios/ ...            # código nativo (se plugin)
├── test/
├── example/                     # app de exemplo
└── pubspec.yaml
```

- Exporte só o necessário em `lib/meu_pacote.dart`.
- Documente APIs públicas.
- Mantenha `pubspec.yaml` sem `dependency_overrides` se for publicar.
- Teste em todas as plataformas suportadas.
- Para plugins federados, use `plugin_platform_interface` + implementações por plataforma.

## 8. Processos em background

- Trabalho longo não pode rodar na main isolate.
- Use `WorkManager` (Android) / `BGTaskScheduler` (iOS) via plugins, ou isolates long-lived.
- Plugins de background exigem `BackgroundIsolateBinaryMessenger.ensureInitialized(rootIsolateToken)`.
- Não é possível receber mensagens não solicitadas do host em isolates de background (ex.: listeners push do Firestore).
- Notificações push: Firebase Cloud Messaging ou similar.

## 9. Boas práticas de interop

- Prefira pacotes mantidos e com boa cobertura de plataformas.
- Isole o nativo atrás de services na camada de dados.
- Injete dependências (facilita testes e troca por fakes).
- Trate erros de plataforma (`PlatformException`, `MissingPluginException`).
- Não bloqueie a UI em chamadas de plataforma.
- Teste plugins com mocks (ver `09`).
- Revise permissões e segurança dos plugins (ver `12`).
- Considere Pigeon para channels novos e type-safe.

## 10. Comandos úteis

```console
flutter pub add <pkg>
flutter pub deps
flutter pub outdated
flutter pub upgrade
flutter pub publish --dry-run
flutter doctor -v
flutter create --template=package meu_pacote
flutter create --template=plugin --platforms=android,ios meu_plugin
```
