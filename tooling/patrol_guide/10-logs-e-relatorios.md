# 10 — Logs e relatórios

> Existem duas saídas complementares: **logs de console** (tempo real) e **relatórios nativos** (artefatos). Além disso, cobertura, screenshots e vídeo.

## Logs de passos (test steps)

A partir do Patrol `3.13.0`, cada passo (`tap`, `enterText`, `scrollTo`, chamadas nativas) é logado com status, e cada teste mostra nome/status/duração.

```
🧪 denies various permissions
        ✅   1. scrollTo widgets with text "Open permissions screen".
        ✅   2. tap widgets with text "Open permissions screen".
        ✅   3. tap widgets with text "Request camera permission".
        ✅   4. isPermissionDialogVisible (native)
        ⏳   5. denyPermission (native)
❌ denies various permissions (patrol_test/permissions/deny_many_permissions_twice_test.dart) (9s)
...
✅ taps on notification (patrol_test/permissions/notifications_test.dart) (16s)
```

> Se você passa um `PatrolTesterConfig` customizado, inclua `printLogs: true` para ver os logs.

## Resumo final

```
Test summary:
📝 Total: 8
✅ Successful: 3
❌ Failed: 5
  - taps on notification (patrol_test/permissions/notifications_test.dart)
  - accepts location permission (patrol_test/permissions/permissions_location_test.dart)
  - ...
⏩ Skipped: 0
📊 Report: file:///Users/.../build/app/reports/androidTests/connected/index.html
⏱️  Duration: 227s
```

## Customização de logs

Flags de `patrol test` / `patrol develop`:

| Flag | Descrição | Onde | Default |
|---|---|---|---|
| `--[no-]show-flutter-logs` | Mostra logs do Flutter durante os testes. | `patrol test` (no `develop` é sempre on) | `false` |
| `--[no-]hide-test-steps` | Oculta os passos. | `patrol test`, `patrol develop` | `false` |
| `--[no-]clear-test-steps` | Limpa os passos ao fim do teste. | `patrol test` | `true` |

## Logs em `patrol_finders` (sem o pacote `patrol`)

Habilite explicitamente:

```dart
patrolWidgetTest(
  'throws exception when no widget to tap on is found',
  config: const PatrolTesterConfig(printLogs: true),
  (tester) async { /* ... */ },
);
```

Ou com `testWidgets`:

```dart
final $ = PatrolTester(
  tester: widgetTester,
  config: const PatrolTesterConfig(printLogs: true),
);
```

## Relatórios nativos

O caminho é impresso no resumo.

### Android (Gradle HTML)

```
build/app/reports/androidTests/connected/debug/index.html
build/app/reports/androidTests/connected/debug/flavors/dev/index.html   # com flavor
```

Pode ser aberto no navegador ou importado no Android Studio (`Run > Import tests from file`). No Firebase Test Lab, aparece direto na UI.

### iOS (`.xcresult`)

```
build/ios_results_<timestamp>.xcresult
```

Abra no Xcode para ver logs e vídeos. Para deixar o output do `xcodebuild` legível, use [fastlane scan](https://docs.fastlane.tools/actions/scan) (`xcpretty`).

> Em falha no iOS, o stack trace Dart está no asset `xcodebuild.log` do job; o relatório JUnit trunca a mensagem.

### Build-time discovery → relatórios limpos

Com `emit_test_manifest`, cada teste vira um método XCTest/JUnit nomeado (`test_<nome>`), então os relatórios agrupam por arquivo e teste, em vez de `runDartTest[...]`.

## Cobertura

```console
patrol test --coverage
patrol test --coverage --coverage-ignore="**/*.g.dart"
```

- LCOV em `coverage/patrol_lcov.info`.
- Exige debug build; não suportado no macOS; no web é linha-coberta (sem contagem).

## Screenshots nativos (Android)

- `screenshot_on_failure: true` no `pubspec.yaml` (requer `patrol` 4.10 + `patrol_cli` 4.8).
- `await $.takeNativeScreenshot('tag')` sob demanda.
- Captura nativa no momento da falha (antes do teardown).
- Gravado em `/sdcard/Download/screenshots/<class>/<method>/`.
- Puxado para `<test-directory>/screenshots` (`--screenshots-output-dir`).
- Farms: BrowserStack (`debugscreenshots: true` + `emit_test_manifest`) e Firebase Test Lab (`--directories-to-pull=...`).
- Limitação de nomes: no caminho padrão (runtime discovery), nomes contêm espaços/vírgulas e podem não casar com o nome do farm → use `emit_test_manifest` para nomes URL-safe.

## Vídeo

```console
patrol test --record-video
```

- `.mp4` em `<test-directory>/videos` (`--video-output-dir`).
- Emulador Android e simulador iOS; iOS físico não; Android físico depende do vendor.
- `--video-size` / `--video-bit-rate` só Android.
- Web: `--web-video=on|off|retain-on-failure`.

## Allure (Android, opcional)

Integração não empacotada por padrão. Passos:

1. Troque o runner no `build.gradle` para um `AllurePatrolJUnitRunner` custom.
2. Adicione as dependências `allure-kotlin-*` em `androidTestImplementation`.
3. Crie `android/app/src/main/res/allure.properties` (`allure.results.useTestStorage=true`) — necessário com `clearPackageData`.
4. Adicione regras em `MainActivityTest.java` (screenshot no fim, dump da hierarquia, logcat).
5. Rode `patrol test`, colete e sirva:

```bash
adb exec-out sh -c 'cd /sdcard/googletest/test_outputfiles && tar cf - allure-results' | tar xvf - -C build/reports
allure serve ./build/reports/allure-results
```

## Patrol DevTools Extension

Inspeciona a **árvore de UI nativa** durante `patrol develop`:

- Rode `patrol develop -t patrol_test/example_test.dart` (ou `--open-devtools`).
- Clique no link `Patrol DevTools extension is available at ...`.
- Na aba **Patrol**, clique em **Refresh** para carregar a árvore.
- Copie os seletores para os testes (Android/iOS).
- Para o Flutter Inspector funcionar, aponte o caminho de `lib/` nas settings.

## Debugging (attach de debugger)

1. No VS Code, adicione uma config `attach` com `vmServiceUri: "${command:dart.promptForVmService}"`.
2. Rode `patrol develop` e copie a URI do link "Patrol DevTools extension" (a URI correta, não a do "Dart VM service is listening").
3. Selecione a config e cole a URI.
4. Defina breakpoints.

> IntelliJ/Android Studio não suportam attach via Observatory URI.

## Fontes

- `docs/documentation/logs.mdx`, `docs/documentation/other/patrol-devtools-extension.mdx`, `docs/documentation/other/debugging-patrol-tests.mdx`, `docs/documentation/integrations/allure.mdx`, `docs/cli-commands/test.mdx`.
