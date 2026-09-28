# 01 — Como o Patrol funciona

> Entender a arquitetura explica por que certas regras existem (ex.: por que não usar `flutter test`, por que `test_bundle.dart` é gerado, por que hot restart não limpa permissões).

## O problema que o Patrol resolve

O `integration_test` oficial do Flutter roda os testes **dentro do processo Dart**, mas não tem acesso à UI do sistema operacional. Consequências:

- não consegue tocar no diálogo de permissão do SO;
- não consegue abrir a gaveta de notificações;
- não consegue interagir com WebViews nativas;
- não consegue alterar Wi-Fi, Bluetooth, localização, tema.

O Patrol contorna isso de duas formas combinadas:

1. **Automação de plataforma** — um servidor local no dispositivo recebe comandos Dart e executa ações nativas (`PlatformAutomator`).
2. **Testes nativos de verdade** — o bundle é executado por runners JUnit/XCTest, o que dá integração com o ecossistema nativo (relatórios, farms, sharding).

## Fluxo de execução de `patrol test`

1. **Build** — a CLI localiza todos os arquivos `*_test.dart` no diretório de testes e gera um **test bundle** (`test_bundle.dart`) que referencia todos eles. Assim, **todos os testes vão para um único binário** (uma só compilação).
2. **Instrumentação** — no Android, um app de instrumentação (`androidTest`) contém o `PatrolJUnitRunner`; no iOS, o target `RunnerUITests` contém o runner XCTest.
3. **Instalação** — o app sob teste (AUT) e a instrumentação são instalados no dispositivo.
4. **Runner nativo** — o runner nativo pergunta ao lado Dart a lista de testes (`listDartTests`) e cria um teste nativo por teste Dart.
5. **Servidor nativo** — o Patrol sobe um servidor HTTP no dispositivo (porta padrão `8081`). As chamadas `$.platform.*` viram requisições HTTP para esse servidor (host/porta via `PATROL_HOST` / `PATROL_TEST_SERVER_PORT`, expostos em Dart como `patrolNativeServerUri`).
6. **Execução** — cada teste Dart roda; passos são logados; asserts falham o teste.
7. **Relatório** — a CLI imprime um resumo e aponta para o **relatório nativo** (HTML do Gradle no Android, `.xcresult` no iOS).

Esse processo é chamado de **advanced test bundling**. Ele corrige problemas históricos do Flutter:

- [flutter#115751](https://github.com/flutter/flutter/issues/115751)
- [flutter#101296](https://github.com/flutter/flutter/issues/101296)
- [flutter#117386](https://github.com/flutter/flutter/issues/117386)

E permite **isolar cada teste em um novo processo** e **sharding**.

## Os três "mundos" de API

| Mundo | Objeto | Para que serve |
|---|---|---|
| Widgets Flutter | `PatrolIntegrationTester $` / `$` | Encontrar e interagir com widgets (`$`, `tap`, `enterText`, `scrollTo`, `waitUntilVisible`). |
| Plataforma nativa | `$.platform.mobile` / `.android` / `.ios` / `.web` / `.macos` | UI do SO, permissões, notificações, settings, WebViews, navegador. |
| `flutter_test` original | `$.tester` | Fallback: `WidgetTester`, `find.*`, `expect`, etc. |

O Patrol **constrói sobre** o `flutter_test`, não substitui. Você pode misturar `PatrolTester` com `WidgetTester` livremente.

## Runners nativos

### Android

- `MainActivityTest.java` (você cria) usa `@RunWith(Parameterized.class)`.
- `PatrolJUnitRunner` faz `setUp(MainActivity.class)`, `waitForPatrolAppService()` e `listDartTests()`; cada teste Dart vira um parâmetro.
- Exige **Android Test Orchestrator** (`execution = "ANDROIDX_TEST_ORCHESTRATOR"`) e `clearPackageData=true` para isolamento.
- Utiliza `UiAutomation` para dirigir a UI nativa.

### iOS / macOS

- `RunnerUITests.m` (você cria) chama o macro `PATROL_INTEGRATION_TEST_IOS_RUNNER(RunnerUITests)` (ou `..._MACOS_RUNNER`).
- O macro registra dinamicamente os testes Dart como métodos XCTest (`class_addMethod`) em **runtime**.
- Habilita interação com XCUITest e `appId` para outros apps.

### Runtime discovery vs build-time discovery

| Modo | Como descobre testes | Quando usar |
|---|---|---|
| **Runtime discovery** (padrão) | Ao lançar o app, o runner nativo pergunta a lista ao Dart. Nada dos testes existe no binário antes da execução. | Fluxo padrão e mais simples. |
| **Build-time discovery** (experimental) | `patrol build` roda `flutter test` em modo descoberta no host, gera `patrol_test_manifest.json` e **compila uma classe nativa por arquivo de teste** (`PatrolGeneratedTests_*`). | `test-without-building`, sharding por teste, relatórios mais limpos. Requer `patrol_cli` 4.8 + `patrol` 4.10. |

No modo build-time, no iOS o runner muda para `PATROL_INTEGRATION_TEST_IOS_RUNNER_STATIC_BASE(RunnerUITests)` + `#include "PatrolGeneratedTests.inc"`. No Android, a classe gerada é selecionada automaticamente.

## Verificação de compatibilidade

A CLI verifica se `patrol` e `patrol_cli` são compatíveis antes de rodar. Se não forem, o erro aparece ao processar `patrol_test/test_bundle.dart` (e não como um erro de compatibilidade óbvio). Alguns recursos opt-in exigem mínimos maiores (ex.: build-time discovery exige `4.8.0`/`4.10.0`; native screenshots idem).

## Pacotes de extensão (native extension packages)

Patrol pode ser estendido por pacotes companion (SDKs de acessibilidade, pagamentos, biometria…) sem adicionar lógica de SDK ao core:

1. O core sobe o servidor em `:8081`.
2. O core descobre extensões no startup: Android via `ServiceLoader` (SPI em `META-INF/services/pl.leancode.patrol.PatrolServerExtension`); iOS via `PatrolRegisterServerExtensionClass` chamado em `+load`.
3. A extensão registra endpoints POST extras (ex.: `/mySdkScan`) no mesmo servidor.
4. O Dart da extensão chama esses endpoints via HTTP, usando `patrolNativeServerUri`.

Regra de ouro: rotas e handlers específicos do SDK vivem na extensão; roteamento e montagem ficam no core. Handlers iOS são chamados em **threads de trabalho**, então chamadas a XCTest/XCUI precisam ir para a main thread (`DispatchQueue.main.sync`).

## Limitações conhecidas

- macOS está em **alpha** e não tem automação nativa completa (só `$.platform.macos` limitado).
- WebViews no Android têm suporte parcial ([issue #244](https://github.com/leancodepl/patrol/issues/244)).
- O hot restart (`patrol develop`) é **inviável em iOS físico** ([bug do Flutter](https://github.com/flutter/flutter/issues/122698)).
- Permissões no iOS só são tratadas automaticamente com o **idioma do device em inglês** (sem forma idiomática de referenciar a view, ao contrário do `resourceId` do Android).

## Fontes

- `docs/overview`, `docs/cli-commands/build`, `docs/documentation/native/advanced`, `docs/documentation/native/extension-packages`, `docs/documentation/ci/build-time-test-discovery`.
