# 11 — Performance e eficiência

> O gargalo do E2E móvel é **build + boot**. O Patrol ataca isso com bundling, hot restart, build-time discovery e sharding.

## Advanced test bundling (uma build para todos)

`patrol build` percorre `patrol_test/`, encontra `*_test.dart` e gera um **test bundle** único que os referencia. Resultado: **todos os testes compartilham um binário** → uma build só, e um **novo processo do app por teste** (isolamento + sharding).

Compare com `integration_test`: um arquivo por build.

## Hot restart no desenvolvimento

```console
patrol develop -t patrol_test/app_test.dart
```

- Build inicial lenta; depois **R** reinicia em segundos sem rebuild.
- Ideal para iterar sobre a lógica do teste.
- **Não** substitui rodar `patrol test` de verdade: estado nativo/permissões/arquivos persistem (ver `03-primeiro-teste.md`).

## Build-time test discovery + `test-without-building`

Opt-in (`emit_test_manifest: true`, requer `patrol` 4.10 / `patrol_cli` 4.8):

```console
patrol build android --emit-test-manifest
patrol test-without-building
patrol test-without-building --only "example_test tap counter increments"
patrol test-without-building --only patrol_test/example_test.dart
```

- Custo extra: um `flutter test` no host durante o build (descoberta).
- Benefício: reexecutar a suíte (ou um único teste) **sem recompilar** — loop de debug muito rápido.
- Só reexecute enquanto app/testes não mudaram; mudou código → `patrol build`.

## Sharding e paralelismo

- **Android (emuladores)**: distribua por múltiplos hosts/VMs (um emulador cada). Com build-time discovery, selecione por classe/método:
  `-e class <fqcn>#<method>`; `-e class <fqcn>` para o arquivo inteiro.
- **iOS**: o servidor nativo escolhe um par de portas livre por execução, então **vários simuladores no mesmo host** não colidem.
- **Device farms**:
  - BrowserStack Android: `shards.numberOfShards` (balanceia por contagem, não duração).
  - BrowserStack iOS: `only-testing` com lista explícita de identificadores (`RunnerUITests/<class>/<method>` em device real, com barras).
  - SauceLabs: `shard: concurrency` + `testListFile` (em simulador `Target/Class/method`; em device real `Target.Class/method`).
- **Não** peça mais shards que testes (farm liga device vazio).

### Gerar lista de testes iOS

```bash
awk '/^@implementation /{cls=$2} /^- \(void\)test_/{m=$2; sub(/^\(void\)/,"",m); \
  print "RunnerUITests/" cls "/" m}' ios/RunnerUITests/PatrolGeneratedTests.inc \
  > .sauce/ios_testlist.txt
```

Gere a cada build e não versione (renomear/mover teste muda o seletor).

## Build precompilado para outra máquina

```console
patrol build android --develop --target patrol_test/example_test.dart
# em outra máquina (mesmo commit/SDK):
patrol develop --use-prebuilt-apks path/to/apks --target patrol_test/example_test.dart
```

Evita Gradle na máquina de desenvolvimento. Requer mesmo Flutter/SDK, `--dart-define`, flavor e portas.

## Fatores que impactam a performance

| Fator | Otimização |
|---|---|
| Muitos arquivos de teste | Bundling (automático) → uma build. |
| Iteração do teste | `patrol develop` (hot restart). |
| Reexecução/debug | `test-without-building` + `--only`. |
| Suíte longa | Sharding (hosts/farms). |
| Simulador iOS | Múltiplos no mesmo Mac (portas dinâmicas). |
| Cobertura | Só em debug; gera overhead — colete quando necessário. |
| Vídeo/screenshots | Adicionam overhead; use sob demanda/em falha. |
| Build do iOS físico | Obrigatoriamente release; use device farm. |
| Descoberta build-time | Custa no build, economiza em reexecuções. |

## Redução de flakiness (performance percebida)

- Ações do Patrol fazem retry/espera — evite sleeps manuais.
- `trySettle` lida com animações infinitas sem lançar.
- Seletores por `resourceName`/`identifier` são mais estáveis que por texto.
- Isole estado (`clearPackageData`, `--full-isolation`, reset via API) para evitar testes que falham "do nada".

## CI: escolhas que economizam

- Rode **build no CI** e envie APKs/`.ipa`/zip para farms (`patrol build`).
- Prefira **device farms** a emuladores caseiros instáveis (ver `13-ci-e-device-farms.md`).
- Cacheie dependências do Flutter/pub.
- Use `--device` ou `CI=true` para não travar em prompt.
- Fixe versões de `patrol`/`patrol_cli`.
- Gere a lista de shards por build.

## Fontes

- `docs/cli-commands/build.mdx`, `docs/cli-commands/test.mdx`, `docs/cli-commands/test-without-building.mdx`, `docs/documentation/ci/build-time-test-discovery.mdx`, `docs/documentation/ci/platforms.mdx`.
