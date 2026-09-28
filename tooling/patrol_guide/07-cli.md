# 07 — CLI (`patrol_cli`)

> `patrol_cli` é a ferramenta que builda, instala, executa e reporta. Sem ela, testes de UI do Patrol não rodam (`flutter test` não serve).

## Instalação

```console
flutter pub global activate patrol_cli
# versão específica (recomendado no CI)
dart pub global activate patrol_cli ^4.8.0
```

Variáveis úteis:

| Variável | Efeito |
|---|---|
| `PATROL_FLUTTER_COMMAND` | Sobrescreve o comando Flutter (ex.: `fvm flutter`, `puro flutter`). |
| `PATROL_ANALYTICS_ENABLED=false` | Desliga analytics. |
| `PATROL_NO_COMPLETION` | Desliga a instalação de shell completion. |
| `CI=true` | Evita prompt interativo de seleção de device. |

## `patrol test` — rodar testes

```console
patrol test
```

Faz: build do AUT + instrumentação → instala → roda nativamente → reporta.

### Seleção de testes

```console
# um teste
patrol test --target patrol_test/login_test.dart

# vários
patrol test --target patrol_test/login_test.dart --target patrol_test/app_test.dart
patrol test --targets patrol_test/login_test.dart,patrol_test/app_test.dart
```

Só arquivos terminados em `_test.dart` são considerados. `--target` e `--targets` são equivalentes.

### Tags

```console
patrol test --tags smoke
patrol test --tags='smoke||regression'
patrol test --tags='(android && tablet)'
patrol test --exclude-tags='(smoke||regression)'
```

### Cobertura

```console
patrol test --coverage
patrol test --coverage --coverage-ignore="**/*.g.dart"
```

- Relatório LCOV em `coverage/patrol_lcov.info`.
- Exige **debug build** (usa Dart VM Service / DDC source maps); `--profile`/`--release` não são suportados com `--coverage`.
- **Não** suportado no macOS.
- No web: reporta linhas cobertas/não cobertas (sem contagem por linha).

### Versionamento

```console
patrol test --build-name=1.2.3 --build-number=123
```

### Isolamento

```console
patrol test --full-isolation   # iOS Simulator (experimental)
```

No Android, o equivalente é `clearPackageData=true` no `build.gradle`.

### Vídeo

```console
patrol test --record-video
patrol test --record-video --video-output-dir videos/ --video-size 720x1280 --video-bit-rate 4M
```

- Salva `.mp4` em `<test-directory>/videos`.
- Suportado em emuladores Android e simuladores iOS; Android físico depende do vendor; iOS físico não.
- `--web-video` para web (Playwright): `on`, `off`, `retain-on-failure`.

### Screenshots nativos (Android)

Requer `patrol_cli` 4.8 + `patrol` 4.10.

- `screenshot_on_failure: true` no `pubspec.yaml` captura a tela no momento da falha.
- `await $.takeNativeScreenshot('tag')` captura sob demanda.
- PNG gravado em `/sdcard/Download/screenshots/<class>/<method>/`.
- Em `patrol test`, puxado para `<test-directory>/screenshots` (`--screenshots-output-dir`).
- **Device farms**: BrowserStack exige capability `debugscreenshots: true` + `emit_test_manifest` para nomes URL-safe; Firebase Test Lab exige `--directories-to-pull=/sdcard/Download/screenshots`. É no-op no iOS.

### Web

```console
patrol test --device chrome --target patrol_test/login_test.dart
patrol test --device chrome --web-headless   # CI
```

Flags não suportadas em web: `--flavor`, `--uninstall`, `--clear-permissions`, `--full-isolation`.

### Outras flags

| Flag | Efeito |
|---|---|
| `-d/--device` | Seleciona device (evita prompt). |
| `--flavor` | Build flavor. |
| `--dart-define` | Variáveis para o código/teste. |
| `--debug/--profile/--release` | Modo de build. |
| `--show-flutter-logs` | Mostra logs do Flutter durante os testes (default `false`). |
| `--hide-test-steps` | Esconde os passos (default `false`). |
| `--clear-test-steps` | Limpa passos ao fim de cada teste (default `true`). |
| `--verbose` | Diagnóstico detalhado. |
| `--emit-test-manifest` / `--no-emit-test-manifest` | Build-time discovery. |

## `patrol build` — buildar artefatos

```console
patrol build android
patrol build ios
patrol build android --target patrol_test/example_test.dart
patrol build ios --target patrol_test/example_test.dart --release   # iOS físico / farm
patrol build ios --simulator --debug
patrol build android --build-name=1.2.3 --build-number=123
patrol build ios --full-isolation
patrol build android --emit-test-manifest
```

- Builda em **debug** por padrão.
- Não roda testes — ideal para CI/device farms.
- Saídas típicas Android: `build/app/outputs/apk/debug/app-debug.apk` e `build/app/outputs/apk/androidTest/debug/app-debug-androidTest.apk`.
- Saídas iOS: `build/ios_integ/Build/Products/{Debug,Release}-iphonesimulator|iphoneos/Runner.app`, `RunnerUITests-Runner.app`, `*.xctestrun`.

### Build para outra máquina (`--develop`)

```console
patrol build android --develop --target patrol_test/example_test.dart
patrol develop --use-prebuilt-apks path/to/apks --target patrol_test/example_test.dart
```

Requer **mesmo commit** e **mesmo SDK Flutter** (evita `Invalid kernel binary format version`), mesmos `--dart-define`, flavor e portas. Só Android.

## `patrol develop` — hot restart

```console
patrol develop --target patrol_test/example_test.dart
patrol develop -t patrol_test/example_test.dart --build-name=1.2.3 --build-number=123
patrol develop -t ... --open-devtools
```

- Builda uma vez; digite **R** para hot restart.
- Não limpa dados, não desinstala, não revoga permissões (ver `03-primeiro-teste.md`).
- Base do **Patrol MCP**.

## `patrol test-without-building` — reexecutar sem rebuildar

Requer build-time discovery (`emit_test_manifest: true`).

```console
patrol build ios --emit-test-manifest
patrol test-without-building
patrol test-without-building --only "example_test tap counter increments"
patrol test-without-building --only patrol_test/example_test.dart
```

- Usa `xcodebuild test-without-building` / `adb shell am instrument`.
- `--only` aceita nome Dart exato do teste **ou** caminho de arquivo; repetível.
- `--flavor` e modo de build são aceitos (selecionam qual artefato rodar); flags de build (`--target`, `--tags`, `--dart-define`...) **não** são aceitas.
- Reusa o **último** build: rode de novo só se app/código de teste não mudou.

## `patrol devices`

```console
patrol devices
```

Lista devices/simuladores/emuladores de forma ciente do Patrol (alternativa ao `flutter devices`).

## `patrol doctor`

```console
patrol doctor
```

Mostra o estado das ferramentas instaladas (adb, ANDROID_HOME, xcodebuild, ideviceinstaller, node, npm).

## `patrol update`

```console
patrol update
```

Atualiza a CLI. **Fixe a versão no CI** para não quebrar por incompatibilidade com o `patrol` do projeto.

## Seleção de device em CI

`patrol test` e `patrol develop` podem pedir um device interativamente. Em CI:

```console
patrol test --device emulator-5554
# ou
CI=true patrol test
```

## Fontes

- `docs/cli-commands/{index,test,build,test-without-building,devices,doctor,update}.mdx`, `docs/documentation/ci/build-time-test-discovery.mdx`.
