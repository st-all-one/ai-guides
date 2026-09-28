# 19 — Interop e plataformas

## 1. Plataformas e bibliotecas

| Plataforma | Libs disponíveis |
|---|---|
| Todas | `dart:core`, `async`, `collection`, `convert`, `math`, `typed_data` |
| Nativa (VM/AOT) | `dart:io`, `dart:isolate`, `dart:ffi`, `dart:mirrors` (JIT) |
| Web | `dart:js_interop`, `package:web`, `dart:js_interop_unsafe` |

Libs web **legadas/deprecadas**: `dart:html`, `dart:js`, `dart:js_util`,
`dart:svg`, `dart:indexed_db`, `dart:web_audio`, `dart:web_gl`, `package:js`.
Migre para `dart:js_interop` + `package:web`.

### Importações condicionais (multi-plataforma)

```dart
import 'src/impl_io.dart'
    if (dart.library.js_interop) 'src/impl_web.dart';
```
- `if (dart.library.X)` escolhe a implementação **em tempo de compilação**.
- Constantes úteis: `dart.library.io`, `dart.library.js_interop`,
  `dart.library.ffi`, `dart.library.html`.
- Padrão "stub + implementação": interface comum + um arquivo por plataforma.
- Evite importar `dart:io` no web e `dart:html` na VM.

### Native assets e `hooks`

- `dart build` + `hook/build.dart` compilam/bundleiam código nativo (C/Rust)
  junto do pacote.
- Tree-shaking de bibliotecas nativas com `@RecordUse()` (em `package:meta`, 3.13)
  e `package:record_use` no `hook/link.dart`.
- Alternativa a distribuir `.so`/`.dll` manualmente.

## 2. Interop C — `dart:ffi`

Chame bibliotecas C/nativas.

```dart
import 'dart:ffi';
import 'dart:io';
import 'package:ffi/ffi.dart';

typedef CStrlen = IntPtr Function(Pointer<Utf8>);
typedef DartStrlen = int Function(Pointer<Utf8>);

void main() {
  final lib = DynamicLibrary.open(
    Platform.isMacOS ? 'libc.dylib'
    : Platform.isWindows ? 'msvcrt.dll'
    : 'libc.so.6',
  );
  final strlen = lib.lookupFunction<CStrlen, DartStrlen>('strlen');

  final ptr = 'Hello'.toNativeUtf8();
  try {
    print('length = ${strlen(ptr)}');
  } finally {
    malloc.free(ptr);
  }
}
```

Tópicos:
- `Pointer<T>`, `Struct`, `Union`, `@Native`, `NativeFunction`,
  `asFunction`, `lookupFunction`.
- `package:ffi` ajuda com strings, buffers, `calloc`/`malloc`.
- **ffigen** gera bindings a partir de headers C automaticamente.
- `@pragma('vm:prefer-inline')` e `NativeCallable` para callbacks nativos.
- Cuidados: valide ponteiros/tamanhos; libere memória; trate `NULL`;
  processos podem crashar se o nativo falhar. Ver `12-seguranca.md`.

```dart
final class Point extends Struct {
  @Double()
  external double x;
  @Double()
  external double y;
}
```

## 3. Interop JavaScript — `dart:js_interop` + `package:web`

```dart
import 'dart:js_interop';
import 'package:web/web.dart' as web;

void main() {
  // API do browser tipada
  final div = web.document.createElement('div') as web.HTMLDivElement;
  div.id = 'status';
  div.textContent = 'Olá do Dart';
  web.document.body!.append(div);

  // Chamar JS existente
  final now = DateTime.now().millisecondsSinceEpoch.js;
  _consoleLog('timestamp: $now'.toJS);
}

@JS('console.log')
external void _consoleLog(JSAny? message);
```

- `JSAny`, `JSObject`, `JSString`, `JSNumber`, `JSBoolean`, `.toJS`/`.toDart`.
- `@JS('nome.externo')` mapeia para globais/membros JS.
- `dart:js_interop_unsafe` (`getProperty`, `callMethod`) para acesso dinâmico.
- Interfaces: declare `abstract interface class` com `@JS()` ou use `@JS()` em
  `external`.
- Converta dados com `dart:convert` (`jsonEncode`/`jsonDecode`) para não
  bloquear o interop.
- Para Wasm, só o novo interop (`dart:js_interop`) funciona.

```dart
@JS()
@staticInterop
class JsPromise {}

extension type Promise(JSObject _) implements JSObject {
  external JsPromise then(JSFunction onFulfilled, [JSFunction? onRejected]);
}
```

## 4. Interop Java e Objective-C/Swift

- **Java interop**: para Android, via `package:jnigen` (geração de bindings) e
  `dart:jni`. Permite chamar classes Java/Kotlin.
- **Objective-C/Swift interop**: para iOS/macOS, via `package:objective_c`/
  `swiftgen` e ffigen.
- **Community**: pacotes para outras linguagens.

## 5. WebAssembly (Wasm)

```bash
dart compile wasm web/main.dart -O2 -o build/out.wasm
dart compile wasm -O2 --enable-deferred-loading   # deferred loading (3.13)
```

Restrições:
- Alvo é **WasmGC** (nem todos os browsers suportam; veja a lista oficial).
- Só o novo JS interop (`dart:js_interop`, `package:web`).
- Roda em ambientes JavaScript (browsers), não em runtimes Wasm genéricos
  (wasmtime etc.).
- `webdev` ainda não suporta serve/build para Wasm; use `dart compile`.
- Deferred loading experimental exige callback do loader
  (`loadDeferredModules`).
- Package "wasm-ready" = não importa libs não-Wasm (`dart:html`, `dart:js`).

## 6. Web JS (dart2js/DDC)

```bash
dart compile js web/main.dart -O1 -o build/out.js   # prod
webdev serve          # dev (DDC, hot reload)
webdev build          # build de produção
```

- `dart2js` faz dead-code elimination, minificação, tree-shaking.
- `webdev` serve com recarga incremental.
- Sirva com HTTPS e headers de segurança (CSP etc.).

## 7. Servidor e CLI

```dart
import 'dart:io';

Future<void> main() async {
  final server = await HttpServer.bind(InternetAddress.anyIPv4, 8080);
  print('http://${server.address.host}:${server.port}');
  await for (final req in server) {
    req.response
      ..statusCode = HttpStatus.ok
      ..write('ok');
    await req.response.close();
  }
}
```

- Prefira frameworks/pacotes: `shelf`, `dart_frog`, `serverpod`, `grpc`.
- `package:args` para CLI; `cli_util` para utilitários; `package:io` (ansi etc.).
- Compile com `dart compile exe` para distribuição.

## 8. `dart:mirrors` (reflexão)

- Só em JIT nativo (não AOT, não Flutter, não web).
- Prefira geração de código (`build_runner`) a reflexão — funciona em AOT.

## 9. Compilação resumida

| Alvo | Dev | Prod |
|---|---|---|
| Nativo | `dart run` (JIT/hot reload) | `dart compile exe` (AOT) |
| Web | `webdev serve` (DDC) | `dart compile js` / `wasm` |
| Módulo AOT | `dart run` | `dart compile aot-snapshot` + `dartaotruntime` |

## 10. Checklist de interop

- [ ] Web sem libs legadas (`dart:html`/`package:js`).
- [ ] FFI: ponteiros validados, memória liberada, `NULL` tratado.
- [ ] Bindings gerados (`ffigen`/`jnigen`) em vez de manuais.
- [ ] Dados grandes convertidos fora do hot path de interop.
- [ ] Wasm: só interop novo; packages wasm-ready.
- [ ] Compilação adequada ao alvo (AOT para produção nativa).
- [ ] Headers de segurança no servidor/web.
