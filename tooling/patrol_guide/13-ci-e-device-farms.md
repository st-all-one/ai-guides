# 13 — CI e device farms

> O Patrol gera testes **nativos**, então farms os executam como Espresso/XCUITest sem suporte especial.

## Duas abordagens

| Abordagem | Característica | Trade-off |
|---|---|---|
| **Device labs (farms)** | Você sobe o binário; eles rodam e reportam. | Simples, mas limita cenários (sem shell). |
| **Tradicional (CI + emulador)** | Você tem shell; script tudo. | Flexível, mas emuladores em CI são lentos/instáveis. |

O Patrol recomenda **construir no CI e rodar em farms**.

## Preparação comum

```console
patrol build android --target patrol_test/example_test.dart
patrol build ios --target patrol_test/example_test.dart --release   # device físico
```

Saídas Android:

```
build/app/outputs/apk/debug/app-debug.apk
build/app/outputs/apk/androidTest/debug/app-debug-androidTest.apk
```

Saídas iOS:

```
build/ios_integ/Build/Products/Release-iphoneos/Runner.app
build/ios_integ/Build/Products/Release-iphoneos/RunnerUITests-Runner.app
build/ios_integ/Build/Products/Runner_iphoneos16.2-arm64.xctestrun
```

## Firebase Test Lab

### Android

```console
gcloud firebase test android run \
    --type instrumentation \
    --use-orchestrator \
    --app build/app/outputs/apk/debug/app-debug.apk \
    --test build/app/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
    --timeout 1m \
    --device model=MediumPhone.arm,version=34,locale=en,orientation=portrait \
    --record-video \
    --environment-variables clearPackageData=true
```

- `clearPackageData=true` limpa dados entre testes (só do seu app).
- Screenshots nativos: adicione `--directories-to-pull=/sdcard/Download/screenshots` (aparecem na aba **Screenshots**).

### iOS

```console
patrol build ios --target patrol_test/example_test.dart --debug --simulator
# ou --release para device físico

pushd build/ios_integ/Build/Products
zip -r ios_tests.zip Release-iphoneos Runner_iphoneos16.2-arm64.xctestrun
popd

gcloud firebase test ios run \
  --test build/ios_integ/Build/Products/ios_tests.zip \
  --device model=iphone8,version=16.2,locale=en_US,orientation=portrait
```

Se o `.xctestrun` tiver versão diferente do device, renomeie.

## BrowserStack App Automate

### Android

Troque o runner (`BrowserstackPatrolJUnitRunner` só adiciona fallback via `tun0`; devices recentes aceitam o padrão):

```kotlin
testInstrumentationRunner = "pl.leancode.patrol.BrowserstackPatrolJUnitRunner"
```

> Com build-time discovery, use o runner **padrão** — as classes geradas dirigem o runner e o fallback atrapalha.

### iOS

Exige setup de iOS físico e **converter para test plans** (nome `Runner`/scheme `Runner`, test plan `TestPlan`).

### Sharding

- Android: `"shards": { "numberOfShards": 3 }` (balanceia por contagem).
- iOS: `"shards"` com `strategy: "only-testing"` e lista de `RunnerUITests/<class>/<method>` (device real) — requiere build-time discovery. Use `"singleRunnerInvocation": true`.

Scripts recomendados: `bs_android` / `bs_ios` do [mobile-tools](https://github.com/leancodepl/mobile-tools), com `BS_CREDENTIALS` exportado.

## SauceLabs

- Precisa de `saucectl` + `SAUCE_USERNAME`/`SAUCE_ACCESS_KEY`.
- Nenhum runner especial (use `PatrolJUnitRunner`).
- Android: `.sauce/android.yml` (`kind: espresso`).
- iOS: `.sauce/ios.yml` (`kind: xcuitest`); device real exige `.ipa` (zip com `Payload/`).
- Sharding XCUITest via `shard: concurrency` + `testListFile` (formato difere entre simulador e device real — ver `11-performance.md`).
- Se todo teste rodar duas vezes, restrinja à classe `PatrolGeneratedTests` (`testOptions.class`).

## LambdaTest (Android)

Troque o runner:

```groovy
testInstrumentationRunner "pl.leancode.patrol.LambdaTestPatrolJUnitRunner"
```

Uso com scripts (`LAMBDATEST_PROJECT`, `LAMBDATEST_DEVICES`). Integração atualmente **só Android**.

## Marathon (pools locais)

- **Android**: `testParserConfiguration.type: "remote"` (descobre via `PatrolJUnitRunner` no runtime). `Marathonfile.android`, `marathon run`.
- **iOS**: `testParserConfiguration.type: "xctest"`; build-time discovery é o melhor setup (Marathon lista do bundle com parser `nm`, sem bootar simulador). Use `batchingStrategy` `fixed-size` (vários testes por `xcodebuild`) e `simulatorProfile` no `Marathondevices`.
- Configure `batchingStrategy.size` < nº de testes para paralelizar entre simuladores.

## emulator.wtf

- Sobe APK + test APK, seleciona emuladores. Rápido e estável.
- Só Android; relatórios em JUnit; grava vídeos.

## Outros farms e CI

- **Xcode Cloud**: CI/CD da Apple, só iOS/macOS. Como testes Patrol são `XCTest`s nativos, a execução é teoricamente possível (a LeanCode planeja pesquisar; não há guia oficial).
- **AWS Device Farm**: farm genérico popular; uso análogo a Firebase Test Lab (subir app + instrumentação).
- **CircleCI, CirrusCI, GitLab CI/CD**: quaisquer VMs/containers; valem as mesmas recomendações (emulador caseiro é lento/instável).
- **Bitrise**: focado em mobile; sem guia específico oficial.
- **Farm próprio (in-house)**: ferramentas como [Simple Test Farm (STF)](https://github.com/DeviceFarmer/stf) ajudam; cenários muito específicos (ex.: trocar a cena da câmera para testar QR code) só são possíveis quando há acesso de shell — o que farms gerenciados não oferecem.

## Codemagic / GitHub Actions

- **Codemagic**: boa para **preparar APKs** para farms; documentação e exemplo oficiais.
- **GitHub Actions**:
  - Android em emulador: lento e instável (mesmo com Test Butler, que bloqueia Google Play Services). Evite.
  - iOS em simulador: estável, mas requer runner macOS (1 min = 10 min de ubuntu) e sem teste de offline real.

## Execução em CI — checklist

- [ ] `--device`/`-d` ou `CI=true` para não travar em prompt.
- [ ] Versões fixadas de `patrol`/`patrol_cli`.
- [ ] Build em modo correto (`--release` para device físico iOS).
- [ ] `clearPackageData`/`--full-isolation` para isolar.
- [ ] Relatório nativo coletado (HTML/xcresult/JUnit).
- [ ] Sharding configurado (build-time discovery quando o farm exigir lista).
- [ ] Segredos via env vars (`--dart-define`).
- [ ] Screenshots/vídeo só quando necessário.

## Fontes

- `docs/documentation/ci/{overview,platforms,ci/build-time-test-discovery}.mdx`, `docs/documentation/integrations/{firebase-test-lab,browserstack,saucelabs,lambdatest,marathon,allure}.mdx`.
