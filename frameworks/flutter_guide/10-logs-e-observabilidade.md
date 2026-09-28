# 10 — Logs e observabilidade

## 1. Ferramentas de log

| Ferramenta | Origem | Uso |
|---|---|---|
| `print()` | `dart:io`/core | stdout; simples, mas sem metadados |
| `debugPrint()` | `foundations` | Evita truncamento de linhas longas; mantido em release se fora de asserts |
| `stderr.writeln()` | `dart:io` | stderr; útil em `try/catch` |
| `log()` | `dart:developer` | Maior granularidade, nome de categoria, erro estruturado |

```dart
import 'dart:developer' as developer;

void main() {
  developer.log('log me', name: 'my.app.category');
  developer.log('log me 1', name: 'my.other.category');
}
```

### Dados estruturados no log

Convenção: JSON-encode o objeto e passe em `error:`; o DevTools interpreta como objeto de dados.

```dart
developer.log(
  'evento',
  name: 'my.app.checkout',
  error: jsonEncode({'orderId': 42, 'total': 199.9}),
);
```

### Quando usar cada um

- **Desenvolvimento:** `debugPrint`/`log`.
- **Produção:** use um serviço de crash/analytics; evite `print` (lints como `avoid_print`).
- **Nunca** logue dados sensíveis (tokens, senhas, PII) — ver `12`.

## 2. DevTools — Logging view

- Exibe eventos do runtime Dart, do framework Flutter, `stdout`/`stderr` e logs da aplicação.
- Por padrão mostra: eventos de GC, eventos de frame, `stdout`/`stderr`, logs customizados.
- Botão **Clear logs** limpa a lista.
- `dart:developer log` aparece com categoria e detalhes.

```console
flutter run          # abre DevTools no navegador
# ou
dart devtools
```

## 3. Breakpoints programáticos

```dart
import 'dart:developer';

void someFunction(double offset) {
  debugger(when: offset > 30);
  // ...
}
```

Pausa o app quando a condição é verdadeira (em debug/DevTools).

## 4. Tratamento global de erros

O Flutter captura erros em callbacks do framework (build, layout, paint) e os roteia para `FlutterError.onError`. Erros fora desses callbacks (ex.: `MethodChannel.invokeMethod` assíncrono) vão para `PlatformDispatcher.instance.onError`.

```dart
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

Future<void> main() async {
  await myErrorsHandler.initialize();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);          // mantém o log no console
    myErrorsHandler.onErrorDetails(details);      // envia ao serviço
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    myErrorsHandler.onError(error, stack);
    return true;                                  // erro tratado
  };

  runApp(const MyApp());
}
```

### Widget de erro customizado

```dart
MaterialApp(
  builder: (context, widget) {
    ErrorWidget.builder = (details) => const Scaffold(
      body: Center(child: Text('Ocorreu um erro ao renderizar.')),
    );
    return widget!;
  },
);
```

- Debug: tela vermelha com stack trace.
- Release: tela cinza por padrão.
- Em produção, mostre uma mensagem amigável e registre o erro.

### Sair em release (opcional)

```dart
FlutterError.onError = (details) {
  FlutterError.presentError(details);
  if (kReleaseMode) exit(1);
};
```

`kReleaseMode`, `kDebugMode`, `kProfileMode` indicam o modo de build.

## 5. Crash reporting

Serviços: [Sentry](https://sentry.io), Firebase Crashlytics, Bugsnag, Datadog, Rollbar. Eles agregam e agrupam crashes, permitindo priorizar.

```console
flutter pub add sentry_flutter
```

```dart
Future<void> main() async {
  await SentryFlutter.init(
    (options) => options.dsn = const String.fromEnvironment('SENTRY_DSN'),
    appRunner: () => runApp(const MyApp()),
  );
}

// Reportar manualmente
await Sentry.captureException(exception, stackTrace: stackTrace);
```

- O SDK captura erros Dart **e** nativos (Swift/ObjC/C/C++ no iOS; Java/Kotlin/C/C++ no Android).
- Passe o DSN por `--dart-define`, não hardcoded.
- **Importante:** com obfuscação, envie os **SYMBOLS** ao serviço para desofuscar stack traces (ver `12`).

## 6. Dumps de depuração

Funções do framework que imprimem o estado das árvores:

| Função | Imprime |
|---|---|
| `debugDumpApp()` | Árvore de widgets |
| `debugDumpRenderTree()` | Árvore de render objects |
| `debugDumpLayerTree()` | Árvore de layers |
| `debugDumpFocusTree()` | Árvore de foco |
| `debugDumpSemanticsTree()` | Árvore de semântica (a11y) |

Cada render object inclui os 5 primeiros dígitos hex do `hashCode`, útil como identificador.

### Flags de debug úteis

- `debugPaintSizeEnabled` — mostra caixas de layout.
- `debugPaintBaselinesEnabled` — linhas de base.
- `debugPaintPointersEnabled` — hit-testing.
- `debugRepaintRainbowEnabled` — áreas repintadas.
- `debugPrintMarkNeedsLayoutStacks` / `debugPrintMarkNeedsPaintStacks` — stack de layout/paint.

## 7. Performance overlay e timeline

```dart
MaterialApp(
  showPerformanceOverlay: true, // em profile/debug
);
```

- DevTools **Performance** view: timeline, flame chart, frame times.
- Ative **Track layouts** para ver passes de layout/intrinsics.
- `PerformanceOverlayLayer.checkerboardOffscreenLayers` revela usos de `saveLayer`.
- DevTools **CPU profiler**, **Memory**, **Network**, **App size**.

## 8. Diagnóstico de layout e animação

- `debugDumpRenderTree()` para entender o porquê de tamanhos.
- Verifique `RenderFlex overflow` (ver `18`).
- Use o Flutter Inspector (DevTools) para inspecionar a árvore e editar propriedades.
- Para animações: `timeDilation` (em `scheduler`) desacelera animações para inspeção.

## 9. Boas práticas de logging

- Use níveis/categorias (`name:`) para filtrar.
- Logue eventos relevantes com contexto, não tudo.
- Nunca logue segredos/PII.
- Centralize o handler de erros no `main`.
- Envie crashes a um serviço em produção.
- Envie SYMBOLS ao serviço quando usar `--obfuscate`.
- Monitore: taxa de erro, tempo de frame, ANRs, memória.
- Remova logs verbosos de produção (ou use `kDebugMode`).

## 10. Exemplo de logger com categorias

```dart
import 'dart:developer' as developer;

class AppLog {
  AppLog(this.name);
  final String name;

  void info(String msg, [Object? data]) =>
      developer.log(msg, name: name, error: data == null ? null : jsonEncode(data));

  void error(String msg, Object error, [StackTrace? st]) =>
      developer.log(msg, name: name, error: error, stackTrace: st);
}

final _log = AppLog('my.app.home');
```
