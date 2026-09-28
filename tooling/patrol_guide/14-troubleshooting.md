# 14 — Troubleshooting

> Erros mais comuns e suas causas, extraídos da FAQ oficial, das skills e da doc de CLI/setup.

## Setup e build

### Erro dentro de `patrol_test/test_bundle.dart`
Mismatch de versão entre `patrol` e `patrol_cli`. Consulte a tabela de compatibilidade e alinhe os pacotes.

### `Unsupported class file major version`
Versão de JDK incompatível. O Patrol funciona oficialmente com **JDK 17**:

```console
javac -version
```

No Android Studio/IntelliJ: **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK**.

### Build trava em `$ flutter build apk --config-only`
Atualize o orchestrator para `1.6.1` no `build.gradle(.kts)`:

```groovy
androidTestUtil("androidx.test:orchestrator:1.6.1")
```

### `ClassNotFoundException` (Android)
ProGuard/R8 removendo classes do Patrol. Mantenha os pacotes ou desative a minificação no debug:

```kotlin
getByName("debug") { isMinifyEnabled = false; isShrinkResources = false }
```

### `MainActivity` não resolve (Java)
O `package` do `MainActivityTest.java` precisa ser o `applicationId` do app. Se o `AndroidManifest` usa `io.flutter.embedding.android.FlutterActivity`, chame `instrumentation.setUp(FlutterActivity.class)`.

### Não sei o `package_name` / `bundle_id`
- `package_name`: `android/app/build.gradle(.kts)` → `applicationId`.
- `bundle_id`: `ios|macos/Runner.xcodeproj/project.pbxproj` → `PRODUCT_BUNDLE_IDENTIFIER`.

## iOS / macOS

### Simulador sendo clonado
"Parallel execution" ativo. Desative **para todos os schemes** no Xcode (ou no `.xctestplan`, removendo `"parallelizable": true`).

### Teste para em `Wait for com.example.myapp to idle` ou abre o app real sem teste
Há um `FLUTTER_TARGET` nos arquivos do projeto. Remova **chave e valor** de `*.xcconfig` e `*.pbxproj`. Depois regenere:

```console
flutter build ios --config-only patrol_test/example_test.dart
```

### Erros de versão de deployment iOS
Se `platform :ios, '12.0'` estiver no `Podfile`, todos os targets (`Runner` e `RunnerUITests`) devem usar a mesma versão. Mantenha o deployment target do `RunnerUITests` igual ao do `Runner` (mínimo iOS 13.0).

### `release/profile builds are only supported for physical devices` (com flavor)
A build configuration não segue a convenção `<BuildMode>-<flavor>` (ex.: `Debug-development`). Corrija os nomes de configuração (ver `02-instalacao-e-setup.md`).

### `xcodebuild` trava pedindo `password:`
Coleta de diagnósticos após falha. Adicione `"diagnosticCollectionPolicy": "Never"` ao `.xctestplan` (`defaultOptions`).

### HW/SPM
Migrou para SPM? Adicione `FlutterGeneratedPluginSwiftPackage` ao target `RunnerUITests`.

## Finders e ações

### Não acho o widget / devia rolar
- Confirme que a key está atribuída e é única.
- Se o elemento está fora da tela, use `.scrollTo()`. Se há mais de um `Scrollable`, especifique `view:`.
- Use `waitUntilVisible()` se ele aparece depois de rede.

### `pumpAndSettle timed out`
Animação infinita (spinner/splash). Troque para `settlePolicy: SettlePolicy.trySettle` (`pumpAndTrySettle`).

### Ramificação de permissão falha localmente, mas passa no CI
Permissão já concedida no hot restart/instalação anterior. Guarde com `isPermissionDialogVisible()`.

### iOS não concede permissão automaticamente
Idioma do device diferente de inglês. Faça manualmente:

```dart
await $.platform.ios.tap(IOSSelector(text: 'Allow'), appId: 'com.apple.springboard');
```

## Automação de plataforma

### Não sei o seletor nativo
Faça dump:
- Android: `adb shell uiautomator dump` + `adb pull /sdcard/window_dump.xml .`
- iOS: `idb ui describe-all`
- Ou use a Patrol DevTools Extension durante `patrol develop`.

### File picker / share sheet não responde
Eles pertencem ao **seu app** — não passe `com.apple.springboard`; use o `appId` padrão.

### Tocar em outro app iOS
Passe o `appId` (bundle identifier) do app alvo.

## `patrol develop` (hot restart)

### Estado/permissões "grudam"
Esperado: hot restart reinicia só o Dart. App não é desinstalado, dados/arquivos/permissões persistem. Trate os dois casos e limpe o que criar.

### iOS físico
Hot restart é considerado quebrado ([flutter#122698](https://github.com/flutter/flutter/issues/122698)). Use `patrol test`.

## Device farms

### Cada teste roda duas vezes (SauceLabs/BrowserStack/emulator.wtf/Marathon)
Com build-time discovery, o host class do runtime discovery ainda é compilado ao lado da classe gerada. Ferramentas que instrumentam o APK direto rodam os dois. Restrinja à classe gerada (`testOptions.class` no saucectl, `test-targets` no emulator.wtf) ou use uma versão de Patrol que faz a host class "stand down".

### iOS sharding não roda nenhum teste / trava em tela cinza
Formato do identificador errado para o tipo de device (simulador usa `Target/Class/method`; device real, em SauceLabs, `Target.Class/method`). Regenera a lista a cada build.

### Screenshots não associam ao teste
Nomes não-URL-safe no runtime discovery. Habilite `emit_test_manifest` para nomes seguros.

## Debugging

- Anexe um debugger com `patrol develop` (ver `10-logs-e-relatorios.md`).
- IntelliJ/Android Studio não suportam attach via Observatory URI.
- Use `--verbose` para ver a causa raiz de travamentos de build.

## Onde pedir ajuda

- FAQ oficial: <https://patrol.leancode.co/documentation#faq>
- Discord: <https://discord.gg/ukBK5t4EZg>
- Issues: <https://github.com/leancodepl/patrol/issues>

## Fontes

- `docs/documentation/index.mdx` (FAQ), `docs/documentation/other/*`, `docs/cli-commands/*`, `docs/documentation/integrations/*`, `skills/patrol-setup/SKILL.md`, `docs/documentation/ci/build-time-test-discovery.mdx`.
