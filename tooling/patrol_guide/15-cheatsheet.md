# 15 — Cheatsheet

## Comandos essenciais

```console
flutter pub global activate patrol_cli
patrol doctor
patrol devices
flutter pub add patrol --dev

# Rodar
patrol test
patrol test -t patrol_test/login_test.dart
patrol test --targets a_test.dart,b_test.dart
patrol test --tags='smoke||regression' --exclude-tags slow
patrol test --coverage --coverage-ignore="**/*.g.dart"
patrol test --record-video
patrol test --device chrome --web-headless
patrol test --full-isolation
patrol test --dart-define 'USER=x' --dart-define 'PASS=y'
patrol test --build-name=1.2.3 --build-number=123

# Desenvolver
patrol develop -t patrol_test/app_test.dart
patrol develop -t patrol_test/app_test.dart --open-devtools

# Build
patrol build android
patrol build ios --release
patrol build ios --simulator --debug
patrol build android --emit-test-manifest
patrol build android --develop -t patrol_test/app_test.dart

# Sem rebuild
patrol test-without-building
patrol test-without-building --only "example_test tap counter increments"
patrol test-without-building --only patrol_test/example_test.dart

patrol update
```

## Flags de log

| Flag | Efeito | Default |
|---|---|---|
| `--show-flutter-logs` | mostra logs do Flutter | `false` |
| `--hide-test-steps` | oculta passos | `false` |
| `--clear-test-steps` | limpa passos ao fim | `true` |

## Teste mínimo

```dart
import 'package:patrol/patrol.dart';

void main() {
  patrolTest('descrição', ($) async {
    await $.pumpWidgetAndSettle(const MyApp());
    await $(#button).tap();
    await $(#result).waitUntilVisible();
  });
}
```

## Finders

```dart
$(#key)                       // Symbol
$(Key('key'))
$(Text)  $(ElevatedButton)    // por tipo
$('texto')                    // por texto
$(find.bySemanticsLabel('x')) // semantics

$(A).$(B).$('texto')          // descendência
$(ListTile).containing('x')   // ancestral/descendente
$(Widget).which<T>((w) => ...) // por propriedade
$(#x).at(2)                   // índice
$(#x).scrollTo(view: $(#list).$(Scrollable))
$(#x).exists  .visible  .text
await $(#x).waitUntilVisible()
```

## Ações

```dart
await $(#x).tap();
await $(#x).enterText('texto');
await $(#x).scrollTo().tap();
await $(#x).tap(settlePolicy: SettlePolicy.trySettle);
await $(#x).tap(findTimeout: const Duration(seconds: 30));
```

## Config

```dart
const PatrolTesterConfig(findTimeout: Duration(seconds: 10), printLogs: true)
```

## Plataforma — móvel

```dart
$.platform.mobile.pressHome(); .openApp(); .openNotifications(); .closeNotifications();
$.platform.mobile.openQuickSettings(); .openUrl(...);
$.platform.mobile.enableWifi(); .disableWifi();
$.platform.mobile.enableCellular(); .disableCellular();
$.platform.mobile.enableBluetooth(); .disableBluetooth();
$.platform.mobile.enableDarkMode(); .disableDarkMode();
$.platform.mobile.enableAirplaneMode(); .disableAirplaneMode();
$.platform.mobile.pressVolumeUp(); .pressVolumeDown();
$.platform.mobile.grantPermissionWhenInUse();
$.platform.mobile.grantPermissionOnlyThisTime();
$.platform.mobile.denyPermission();
$.platform.mobile.selectFineLocation(); .selectCoarseLocation();
$.platform.mobile.isPermissionDialogVisible();
$.platform.mobile.tapOnNotificationByIndex(0);
$.platform.mobile.tapOnNotificationBySelector(Selector(textContains: '...'));
$.platform.mobile.takeCameraPhoto();
$.platform.mobile.pickImageFromGallery(index: 0);
$.platform.mobile.pickMultipleImagesFromGallery(imageIndexes: [0, 1]);
$.platform.mobile.pullToRefresh();
$.platform.mobile.isVirtualDevice(); .getOsVersion(); .setMockLocation(...);
```

## Plataforma — seletores

```dart
Selector(text: 'Sign up')
MobileSelector(
  android: AndroidSelector(resourceName: 'com.app:id/btn'),
  ios: IOSSelector(identifier: 'btn'),
)
PlatformSelector(android: ..., ios: ..., web: ...)
```

## Plataforma — Android/iOS

```dart
$.platform.android.pressBack(); .pressDoubleRecentApps();
$.platform.android.tapAt(Offset(100, 100)); .swipe(...);
$.platform.android.openPlatformApp(androidAppId: 'com.android.settings');

$.platform.ios.swipeBack(); .closeHeadsUpNotification();
$.platform.ios.tap(IOSSelector(text: 'Add'), appId: 'com.apple.MobileAddressBook');
$.platform.ios.openPlatformApp(iosAppId: 'com.apple.Preferences');
```

## Plataforma — web

```dart
$.platform.web.tap(WebSelector(cssOrXpath: 'css=#btn'));
$.platform.web.enterText(WebSelector(placeholder: 'Email'), text: 'a@b.c');
$.platform.web.addCookie(name: 'x', value: 'y');
$.platform.web.getCookies(); .clearCookies();
$.platform.web.acceptNextDialog(); .dismissNextDialog(); // assine antes!
$.platform.web.enableDarkMode(); .disableDarkMode();
$.platform.web.goBack(); .goForward();
$.platform.web.pressKey(key: 'Enter'); .pressKeyCombo(keys: ['Control', 'a']);
$.platform.web.setClipboard(text: 'x'); .getClipboard();
$.platform.web.grantPermissions(permissions: ['geolocation']); .clearPermissions();
$.platform.web.uploadFile(files: [UploadFileData(name: 'a.txt', content: 'x')]);
$.platform.web.verifyFileDownloads();
$.platform.web.resizeWindow(size: Size(800, 600));
$.platform.web.openNewPage(url: '...'); .switchToPage(pageId: ...);
$.platform.web.waitForPopup();
```

## Tags

```dart
patrolTest('t', tags: ['smoke', 'regression'], ($) async { /* ... */ });
```

```console
patrol test --tags='(login && smoke) && !slow'
patrol test --exclude-tags='(smoke||regression)'
```

## pubspec.yaml

```yaml
patrol:
  app_name: My App
  test_directory: patrol_test
  emit_test_manifest: true
  screenshot_on_failure: true
  flavor: development
  android:
    package_name: com.example.myapp
  ios:
    bundle_id: com.example.MyApp
  macos:
    bundle_id: com.example.macos.MyApp
```

## Segredos

```dart
const String.fromEnvironment('PASSWORD')
```

```console
patrol test --dart-define 'PASSWORD=ny4ncat'
# ou .patrol.env (não versionar)
```

## `.gitignore`

```
**/test_bundle.dart
.patrol.env
ios/RunnerUITests/PatrolGeneratedTests.inc
android/app/src/androidTest/**/PatrolGeneratedTests*.java
```

## Compatibilidade (tabela completa)

> A tabela completa `patrol_cli` × `patrol` (24 faixas) e os mínimos de recursos opt-in estão em **`17-migracao-e-versoes.md`**. Recursos opt-in (build-time discovery e native screenshots) exigem `patrol_cli` 4.8 + `patrol` 4.10.

## Fontes

- Documentação oficial completa em `docs_oficiais/`.
