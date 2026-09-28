# 06 — Automação de plataforma

> `$.platform` é o que diferencia o Patrol do `integration_test`. Ele controla o **sistema operacional** e, no caso do web, o **navegador**. A partir do Patrol 4.0, use `$.platform.*` (não `$.native` / `$.native2`, deprecados).

## Hierarquia

| Acesso | Escopo |
|---|---|
| `$.platform.mobile` | Ações cross-platform móveis (recomendado por padrão). |
| `$.platform.android` | Ações exclusivas do Android. |
| `$.platform.ios` | Ações exclusivas do iOS. |
| `$.platform.web` | Automação de navegador (Flutter Web via Playwright). |
| `$.platform.macos` | Alpha: tap/wait limitado, `NSAlert`, itens de menu. |

Há também `PlatformAutomatorConfig.fromOptions(...)` para configurar comportamentos (ex.: tratamento de teclado, supressão de serviços de acessibilidade).

## Seletores

| Tipo | Uso |
|---|---|
| `Selector` | Casos simples em que a mesma "forma" serve para Android e iOS (ex.: texto). |
| `MobileSelector(android: AndroidSelector(...), ios: IOSSelector(...))` | Quando cada plataforma precisa de seletor diferente (mais comum). |
| `PlatformSelector(android:..., ios:..., web:...)` | Um seletor para Android + iOS + Web de uma vez (útil com `$.platform.tap(...)`). |
| `AndroidSelector` | `resourceName`, `text`, `className`, `contentDescription`, `applicationPackage`, `instance`... |
| `IOSSelector` | `identifier`, `elementType`, `label`, `title`, `instance`... |
| `WebSelector` | `text`, `cssOrXpath`, `testId`, `placeholder`... |

```dart
await $.platform.mobile.tap(Selector(text: 'Sign up for newsletter'));

await $.platform.mobile.tap(MobileSelector(
  android: AndroidSelector(resourceName: 'com.example:id/submit_button'),
  ios: IOSSelector(identifier: 'submitButton'),
));
```

### Propriedades de seletor (referência)

**Android** — mais confiável primeiro:

| Propriedade | Descrição | Exemplo |
|---|---|---|
| `resourceName` | ID de recurso (mais confiável) | `com.app:id/login_btn` |
| `text` | Texto visível | `"Sign In"` |
| `className` | Tipo do elemento | `android.widget.Button` |
| `contentDescription` | Descrição de acessibilidade | `"Login button"` |
| `applicationPackage` | Pacote do app | `com.example.app` |

**iOS**:

| Propriedade | Descrição | Exemplo |
|---|---|---|
| `identifier` | Identificador único (mais confiável) | `loginButton` |
| `elementType` | Tipo do elemento | `XCUIElementTypeButton` |
| `label` | Label de acessibilidade | `"Sign In"` |
| `title` | Título | `"Login"` |

## Ações básicas cross-platform

```dart
// Tap em view nativa (ex.: botão em WebView)
await $.platform.mobile.tap(Selector(text: 'Sign up for newsletter'));

// Digitar em view nativa
await $.platform.mobile.enterText(Selector(text: 'Enter your email'), text: 'charlie@root.me');

// Digitar no n-ésimo campo visível (0-based)
await $.platform.mobile.enterTextByIndex('charlie_root', index: 0);
await $.platform.mobile.enterTextByIndex('ny4ncat', index: 1);
```

## Ações Android

```dart
await $.platform.android.pressBack();
await $.platform.android.pressDoubleRecentApps();
await $.platform.android.tap(AndroidSelector(resourceName: 'com.example:id/submit_button'));
await $.platform.android.openPlatformApp(androidAppId: 'com.android.settings');
// doubleTap, tapAt, swipe, swipeBack, pullToRefresh, enableLocation, takeCameraPhoto...
```

## Ações iOS

```dart
await $.platform.ios.tap(IOSSelector(identifier: 'submitButton'));
await $.platform.ios.closeHeadsUpNotification();
await $.platform.ios.swipeBack();
await $.platform.ios.openPlatformApp(iosAppId: 'com.apple.Preferences');
// doubleTap, tapAt, swipe, pullToRefresh...
```

### Interagir com apps que não são o app sob teste

Passe o `appId` (bundle identifier):

```dart
await $.platform.ios.tap(
  IOSSelector(text: 'Add'),
  appId: 'com.apple.MobileAddressBook',
);
```

### System sheets (file picker, share sheet)

Sheets apresentados **pelo seu app** (file picker, share sheet) pertencem à hierarquia do seu app — use o `appId` padrão (o app sob teste):

```dart
await $.platform.ios.tap(IOSSelector(label: 'Browse'));
await $.platform.ios.tap(IOSSelector(labelContains: 'On My iPhone'));
await $.platform.ios.tap(IOSSelector(labelContains: 'my_file'));
```

Não use `com.apple.springboard` (ele controla alertas de sistema/permissão, não esses sheets) nem nomes de extensões de sistema como `com.apple.FileProvider.LocalStorage`.

## Notificações

```dart
await $.platform.mobile.openNotifications();
await $.platform.mobile.closeNotifications();
await $.platform.mobile.tapOnNotificationByIndex(1);
await $.platform.mobile.tapOnNotificationBySelector(
  Selector(textContains: 'Someone liked your recent post'),
);
```

> Para tocar notificações do seu app, o bloco `patrol` do `pubspec.yaml` precisa do `app_name`.

## Permissões

```dart
await $.platform.mobile.grantPermissionWhenInUse();
await $.platform.mobile.grantPermissionOnlyThisTime();
await $.platform.mobile.denyPermission();

// localização
await $.platform.mobile.selectFineLocation();
await $.platform.mobile.selectCoarseLocation();

// verificar antes (evita erro quando já concedida)
if (await $.platform.mobile.isPermissionDialogVisible()) {
  await $.platform.mobile.grantPermissionWhenInUse();
}
if (await $.platform.mobile.isPermissionDialogVisible(timeout: const Duration(seconds: 5))) {
  await $.platform.mobile.grantPermissionWhenInUse();
}
```

> Em **iOS** o Patrol só trata permissões automaticamente com o **idioma do device em inglês** (preferencialmente US). Caso contrário, faça manualmente:
> ```dart
> await $.platform.ios.tap(IOSSelector(text: 'Allow'), appId: 'com.apple.springboard');
> ```

## Configurações do dispositivo

```dart
await $.platform.mobile.enableWifi();
await $.platform.mobile.disableWifi();
await $.platform.mobile.enableCellular();
await $.platform.mobile.disableCellular();
await $.platform.mobile.enableBluetooth();
await $.platform.mobile.disableBluetooth();
await $.platform.mobile.enableDarkMode();
await $.platform.mobile.disableDarkMode();
await $.platform.mobile.enableAirplaneMode();
await $.platform.mobile.disableAirplaneMode();
await $.platform.mobile.pressVolumeUp();
await $.platform.mobile.pressVolumeDown();
await $.platform.mobile.openUrl('https://example.com');
await $.platform.mobile.setMockLocation(...);
```

## Câmera, galeria e pull-to-refresh

```dart
await $.platform.mobile.takeCameraPhoto();       // shutter + confirm
await $.platform.mobile.pickImageFromGallery(index: 0);
await $.platform.mobile.pickMultipleImagesFromGallery(imageIndexes: [0, 1]);
await $.platform.mobile.pullToRefresh();
```

Selectors default e quando customizar:

- **Câmera**: Android físico `com.google.android.GoogleCamera:id/shutter_button` + `done_button`; emulador `com.android.camera2:id/...`; iOS `PhotoCapture` / `Done`. Fora desses, passe `shutterButtonSelector` / `doneButtonSelector` (`NativeSelector`).
- **Galeria**: Android `com.google.android.documentsui:id/icon_thumb` (API < 34) ou `com.google.android.providers.media.module:id/icon_thumbnail` (API 34+); iOS `IOSElementType.image`. Customize com `imageSelector`.
- **Pull-to-refresh**: por padrão de `(0.5, 0.5)` até `(0.5, 0.9)`; ajuste com `start:`/`end:` (ex.: horizontal) e `steps` para gesto mais lento. É nativo → **não** faz settle automático; chame `$.pumpAndSettle()` depois.

```dart
await $.platform.mobile.pullToRefresh(
  start: const Offset(0.5, 0.5),
  end: const Offset(0.1, 0.5),
);
```

## Informações do dispositivo

```dart
final isVirtual = await $.platform.mobile.isVirtualDevice();
final osVersion = await $.platform.mobile.getOsVersion(); // ex.: 30 = Android 11
if (osVersion >= 30) { /* comportamento Android 11+ */ }
```

## Serviços de acessibilidade (Android)

Por padrão o Patrol adquire `UiAutomation` com `FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES`, mantendo TalkBack e ferramentas de acessibilidade rodando. Para suprimi-las (necessário em algumas extensões nativas):

```dart
patrolTest(
  'my test',
  platformAutomatorConfig: PlatformAutomatorConfig.fromOptions(
    androidDontSuppressAccessibilityServices: false, // default: true
  ),
  ($) async { /* ... */ },
);
```

Ou:

```console
patrol test --dart-define=PATROL_ANDROID_DONT_SUPPRESS_ACCESSIBILITY_SERVICES=false
```

## Web (Flutter Web via Playwright)

Exige Node.js. Rode com `--device chrome`.

```dart
// Elementos web
await $.platform.web.tap(WebSelector(text: 'Submit'));
await $.platform.web.tap(WebSelector(cssOrXpath: 'css=#submit-button'));
await $.platform.web.tap(WebSelector(testId: 'login-button'));
await $.platform.web.enterText(WebSelector(placeholder: 'Email address'), text: 'user@example.com');
await $.platform.web.scrollTo(WebSelector(text: 'Load more'));

// iframes
await $.platform.web.tap(
  WebSelector(text: 'Submit'),
  iframeSelector: WebSelector(cssOrXpath: 'css=#payment-iframe'),
);

// Diálogos (assine ANTES de disparar)
final dialogFuture = $.platform.web.acceptNextDialog();
// ... dispara o diálogo ...
final text = await dialogFuture;
await $.platform.web.dismissNextDialog();

// Cookies
await $.platform.web.addCookie(name: 'session', value: 'abc123');
final cookies = await $.platform.web.getCookies();
await $.platform.web.clearCookies();

// Tema
await $.platform.web.enableDarkMode();
await $.platform.web.disableDarkMode();

// Navegação
await $.platform.web.goBack();
await $.platform.web.goForward();

// Teclado
await $.platform.web.pressKey(key: 'Enter');
await $.platform.web.pressKeyCombo(keys: ['Control', 'a']);

// Clipboard
await $.platform.web.setClipboard(text: 'Copied text');
final clip = await $.platform.web.getClipboard();

// Permissões
await $.platform.web.grantPermissions(permissions: ['geolocation', 'notifications']);
await $.platform.web.clearPermissions();

// Arquivos
await $.platform.web.uploadFile(files: [UploadFileData(name: 'test.txt', content: 'Hello')]);
final downloads = await $.platform.web.verifyFileDownloads();

// Janela
await $.platform.web.resizeWindow(size: const Size(1920, 1080));
```

### Multi-página (abas/popups)

```dart
final pageId = await $.platform.web.openNewPage(url: 'https://example.com');
await $.platform.web.switchToPage(pageId: pageId);
final current = await $.platform.web.getCurrentPage();
final url = await $.platform.web.getCurrentPageUrl();
final pages = await $.platform.web.getPages();
await $.platform.web.closePage(pageId: pageId);
await $.platform.web.switchToInitialPage();

// popup aberto pelo app (assine antes)
final popupFuture = $.platform.web.waitForPopup();
await $.platform.web.tap(WebSelector(cssOrXpath: '#open-popup'));
final popupId = await popupFuture;
await $.platform.web.switchToPage(pageId: popupId);
```

A página inicial hospeda o app sob teste, está sempre aberta e não pode ser fechada. Apenas uma página é ativa por vez.

## Paridade de recursos (resumo)

| Recurso | Android | iOS | Web |
|---|---|---|---|
| Home / Open app / Notificações | ✅ | ✅ | — |
| Wi-Fi / cellular / Bluetooth / airplane | ✅ | ✅ | — |
| Modo escuro | ✅ | ✅ | ✅ |
| Permissões | ✅ | ✅ | ✅ |
| Câmera / galeria | ✅ | ✅ | — |
| Pull-to-refresh | ✅ | ✅ | — |
| WebView | ⚠️ parcial | ✅ | — |
| Cookies / arquivos / diálogos / teclado | — | — | ✅ |

macOS (alpha): tap, wait, `NSAlert`, itens de menu.

## Debug de hierarquia nativa

Para descobrir seletores, faça dump da árvore de views:

```console
# Android
adb shell uiautomator dump
adb pull /sdcard/window_dump.xml .

# iOS (idb)
idb ui describe-all
```

Ou use a **Patrol DevTools Extension** (ver `10-logs-e-relatorios.md` e `16-mcp-e-agentes.md`).

## Fontes

- `docs/documentation/native/{overview,usage,feature-parity,advanced,extension-packages,native2}`, `docs/documentation/web`, `docs/documentation/other/tips-and-tricks`, `docs/documentation/other/patrol-devtools-extension`, `docs/feature-guide/*`.
