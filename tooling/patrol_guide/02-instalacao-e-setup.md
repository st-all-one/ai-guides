# 02 — Instalação e setup

> Setup é a parte mais sensível do Patrol: metade dos problemas relatados é de configuração nativa. Este arquivo segue a ordem oficial.

## 1. Instalar a CLI

```console
flutter pub global activate patrol_cli
```

- Adicione `$HOME/.pub-cache/bin` (Unix) ou `%USERPROFILE%\AppData\Local\Pub\Cache\bin` (Windows) ao `PATH`, senão `patrol` não é encontrado.
- A CLI chama o Flutter internamente. Para usar **FVM/puro**: `--flutter-command "fvm flutter"` ou a env var `PATROL_FLUTTER_COMMAND="fvm flutter"`.

### Verificar

```console
patrol doctor
```

Exemplo de saída sadia:

```
Patrol CLI version: 2.3.1+1
Android:
• Program adb found in /Users/.../platform-tools/adb
• Env var $ANDROID_HOME set to /Users/.../Android/sdk
iOS / macOS:
• Program xcodebuild found in /usr/bin/xcodebuild
• Program ideviceinstaller found in /opt/homebrew/bin/ideviceinstaller
Web:
• Program node found in /usr/bin/node
• Program npm found in /usr/bin/npm
```

Todas as linhas da plataforma alvo devem estar verdes.

## 2. Adicionar a dependência

```console
flutter pub add patrol --dev
```

`patrol` requer Android SDK 21+.

## 3. Bloco `patrol` no `pubspec.yaml`

```yaml
patrol:
  app_name: My App
  # test_directory: patrol_test        # opcional; padrão é patrol_test/
  # emit_test_manifest: true           # opt-in: build-time test discovery
  # screenshot_on_failure: true        # opt-in: screenshots nativos (Android)
  flavor: development                  # opcional (recomendado aqui, não na CLI)
  android:
    package_name: com.example.myapp
    # app_name: Nome no Android        # se diferir do iOS
  ios:
    bundle_id: com.example.MyApp
    # app_name: The Awesome App
  macos:
    bundle_id: com.example.macos.MyApp
```

**Para que serve o bloco:**

- `package_name`/`bundle_id` → o Patrol **desinstala o app após cada teste**, tornando o ambiente mais estável.
- `app_name` → necessário para o Patrol **tocar nas notificações** do app.
- `test_directory` → muda o diretório de testes (padrão `patrol_test/` desde 4.0; antes era `integration_test/`).

Onde achar `package_name`: `android/app/build.gradle(.kts)` → `applicationId`. Onde achar `bundle_id`: `ios/Runner.xcodeproj/project.pbxproj` → `PRODUCT_BUNDLE_IDENTIFIER`.

## 4. Setup nativo — Android (Kotlin DSL)

1. Crie `android/app/src/androidTest/java/com/example/myapp/MainActivityTest.java` (ajuste o pacote para o `applicationId`):

```java
package com.example.myapp;

import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameters;
import pl.leancode.patrol.PatrolJUnitRunner;

@RunWith(Parameterized.class)
public class MainActivityTest {
    @Parameters(name = "{0}")
    public static Object[] testCases() {
        PatrolJUnitRunner instrumentation =
            (PatrolJUnitRunner) InstrumentationRegistry.getInstrumentation();
        instrumentation.setUp(MainActivity.class); // ou FlutterActivity.class
        instrumentation.waitForPatrolAppService();
        return instrumentation.listDartTests();
    }
    public MainActivityTest(String dartTestName) { this.dartTestName = dartTestName; }
    private final String dartTestName;
    @Test
    public void runDartTest() {
        PatrolJUnitRunner instrumentation =
            (PatrolJUnitRunner) InstrumentationRegistry.getInstrumentation();
        instrumentation.runDartTest(dartTestName);
    }
}
```

2. Em `android/app/build.gradle.kts`:

```kotlin
android {
  defaultConfig {
    testInstrumentationRunner = "pl.leancode.patrol.PatrolJUnitRunner"
    testInstrumentationRunnerArguments["clearPackageData"] = "true"
  }
  testOptions {
    execution = "ANDROIDX_TEST_ORCHESTRATOR"
  }
}
dependencies {
  androidTestUtil("androidx.test:orchestrator:1.5.1") // se o build travar, 1.6.1
}
```

Para projetos com Groovy (`build.gradle`), use a sintaxe clássica:

```groovy
testInstrumentationRunner "pl.leancode.patrol.PatrolJUnitRunner"
testInstrumentationRunnerArguments clearPackageData: "true"
testOptions { execution "ANDROIDX_TEST_ORCHESTRATOR" }
androidTestUtil "androidx.test:orchestrator:1.5.1"
```

> **ProGuard/R8**: mantenha os pacotes do Patrol ou desative a minificação no build de debug:
> ```kotlin
> buildTypes { getByName("debug") { isMinifyEnabled = false; isShrinkResources = false } }
> ```
> Caso contrário podem surgir `ClassNotFoundException`.

## 5. Setup nativo — iOS

1. Abra `ios/Runner.xcworkspace` no Xcode.
2. Crie um target **UI Testing Bundle** chamado `RunnerUITests`, `Target to be Tested = Runner`, linguagem **Objective-C**.
3. Apague `RunnerUITestsLaunchTests.m` **pelo Xcode**.
4. Iguale o **iOS Deployment Target** do `RunnerUITests` ao do `Runner` (mínimo iOS 13.0).
5. Substitua o conteúdo de `RunnerUITests.m`:

```objective-c
@import XCTest;
@import patrol;
@import ObjectiveC.runtime;

#if !defined(PATROL_INTEGRATION_TEST_IOS_RUNNER)
#import "PatrolIntegrationTestIosRunner.h"
#endif

PATROL_INTEGRATION_TEST_IOS_RUNNER(RunnerUITests)
```

6. **CocoaPods**: adicione ao `ios/Podfile` dentro do target `Runner`:

```ruby
target 'RunnerUITests' do
  inherit! :complete
end
```

**Swift Package Manager (SPM)**: migre o projeto seguindo a doc do Flutter e, em **RunnerUITests > General > Frameworks and Libraries**, adicione `FlutterGeneratedPluginSwiftPackage`.

7. Gere a config do Flutter:

```console
flutter build ios --config-only patrol_test/example_test.dart
pod install --repo-update   # apenas CocoaPods
```

8. No Xcode, garanta que o `RunnerUITests` usa a **mesma build configuration** do `Runner` em cada configuração.
9. Em **RunnerUITests → Build Phases**, adicione duas "Run Script Phase" na ordem:

```
# xcode_backend build
/bin/sh "$FLUTTER_ROOT/packages/flutter_tools/bin/xcode_backend.sh" build
# xcode_backend embed_and_thin
/bin/sh "$FLUTTER_ROOT/packages/flutter_tools/bin/xcode_backend.sh" embed_and_thin
```

10. **Desative "Execute in parallel"** para **todos os schemes** (ou no `.xctestplan`: desmarque *Execute in parallel* / remova `"parallelizable": true`). Já vem ativado por padrão e quebra o Patrol.
11. Em **RunnerUITests → Build Settings**, coloque **User Script Sandboxing = No**.

## 6. Setup nativo — macOS (alpha)

Análogo ao iOS, com diferenças:

- macro `PATROL_INTEGRATION_TEST_MACOS_RUNNER(RunnerUITests)`;
- scripts `macos_assemble.sh build` / `macos_assemble.sh embed`;
- Deployment Target mínimo 10.14;
- em **Runner → Signing & Capabilities**, marque **Incoming Connections (Server)** e **Outgoing Connections (Client)** no App Sandbox;
- copie `DebugProfile.entitlements` e `Release.entitlements` para `RunnerUITests` e aponte **Code Signing Entitlements** por configuração.

## 7. Flavors

Você pode passar via CLI ou (recomendado) no `pubspec.yaml`:

```console
patrol test --target patrol_test/example_test.dart --flavor development
```

### Convenção de nomes (iOS/macOS)

O Patrol deriva **scheme** e **build configuration** do flavor e do modo:

| Entrada Patrol | Objeto Xcode | Nome esperado |
|---|---|---|
| `--flavor development` | Scheme | `development` |
| `--flavor development` (debug) | Build Configuration | `Debug-development` |
| `--flavor development` (profile) | Build Configuration | `Profile-development` |
| `--flavor development` (release) | Build Configuration | `Release-development` |

Formato: `<BuildMode>-<flavor>`, com `BuildMode` capitalizado. Se o projeto usar `Development-debug` em vez de `Debug-development`, o `xcodebuild` cai no default silenciosamente e falha com *"release/profile builds are only supported for physical devices"*. Renomeie/duplique as configurações.

## 8. iOS físico

Restrições de JIT (iOS 14+) exigem **release mode**. É preciso **assinar** o app e o `RunnerUITests`:

1. No Apple Developer Portal, crie um App ID `com.example.myapp.RunnerUITests.xctrunner`.
2. Tenha um certificado de desenvolvimento.
3. Crie um Provisioning Profile ligado ao novo ID.
4. (fastlane) desative assinatura automática no target `RunnerUITests` e configure `PROVISIONING_PROFILE_SPECIFIER` no `project.pbxproj`.
5. Importe o profile no Xcode (avisos de bundle ID mismatch são esperados — o `.xctrunner` é gerado no build).
6. Teste com `patrol build ios --release`.

> **Evite travar no prompt de senha:** se um teste falhar e o `xcodebuild` travar pedindo senha ao coletar diagnósticos, adicione ao `.xctestplan`:
> ```json
> { "defaultOptions": { "diagnosticCollectionPolicy": "Never" } }
> ```

## 9. `.gitignore`

Estes arquivos **não** devem ser versionados:

```
**/test_bundle.dart
.patrol.env
```

Com build-time discovery, ignore também os gerados:

```
ios/RunnerUITests/PatrolGeneratedTests.inc
android/app/src/androidTest/**/PatrolGeneratedTests*.java
```

## 10. Teste de fumaça

```dart
// patrol_test/example_test.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:patrol/patrol.dart';

void main() {
  patrolTest('setup funciona', ($) async {
    await $.pumpWidgetAndSettle(
      MaterialApp(home: Scaffold(appBar: AppBar(title: const Text('app')))),
    );
    expect($('app'), findsOneWidget);
    if (!Platform.isMacOS) {
      await $.platform.mobile.pressHome();
    }
  });
}
```

```console
patrol test -t patrol_test/example_test.dart
```

Saída esperada:

```
Test summary:
📝 Total: 1
✅ Successful: 1
❌ Failed: 0
⏩ Skipped: 0
📊 Report: <caminho>
⏱️  Duration: 4s
```

## Fontes

- `docs/documentation/index.mdx`, `docs/documentation/physical-ios-devices-setup.mdx`, `docs/spm-announcement.mdx`, `docs/documentation/other/tips-and-tricks.mdx`.
