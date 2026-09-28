# 17 — Migração, versões e histórico

> Este arquivo cobre a evolução da API e como migrar. É essencial para projetos que vêm de Patrol 3.x ou que ainda usam `$.native` / `$.native2`.

## Migração `native` → `platform` (Patrol 4.0)

O Patrol 4.0 introduziu a **Platform Automation API** e deprecou os pontos de entrada antigos:

- `$.native` (Native Automation 1.0)
- `$.native2` (Native Automation 2.0)
- `NativeAutomator`, `NativeAutomator2`, `NativeAutomatorConfig`, `NativeSelector`

Todos serão removidos no futuro. Migre para `$.platform` e `PlatformAutomatorConfig`.

### Checklist de migração

- [ ] Atualize `patrol` (e `patrol_cli`) para 4.x.
- [ ] Renomeie `integration_test/` → `patrol_test/` e atualize o `.gitignore` do `test_bundle.dart`.
  - Alternativa: `patrol.test_directory: integration_test` no `pubspec.yaml`.
- [ ] Reescreva `$.native.*` e `$.native2.*` → `$.platform.*`.
- [ ] Substitua `NativeSelector(...)` por `MobileSelector(...)`, `Selector(...)` ou `PlatformSelector(...)`.
- [ ] `patrol test`/`patrol develop` passam a **promptar** o device: em CI, passe `--device`/`-d` ou `CI=true`.

### Tabela de reescritas

| Antes | Depois |
|---|---|
| `$.native2.pressHome()` | `$.platform.mobile.pressHome()` |
| `$.native.tap(Selector(text: 'Allow'))` | `$.platform.mobile.tap(Selector(text: 'Allow'))` |
| `$.native.pressBack()` | `$.platform.android.pressBack()` |
| `$.native.closeHeadsUpNotification()` | `$.platform.ios.closeHeadsUpNotification()` |
| `NativeAutomator(config: nativeConfig)` | `PlatformAutomator(config: platformConfig)` |
| `NativeAutomatorConfig(...)` | `PlatformAutomatorConfig.fromOptions(...)` |

```dart
// Antes (native2) — selectors por plataforma
await $.native2.tap(NativeSelector(
  android: AndroidSelector(resourceName: 'com.example:id/submit_button'),
  ios: IOSSelector(identifier: 'submitButton'),
));

// Depois (platform)
await $.platform.mobile.tap(MobileSelector(
  android: AndroidSelector(resourceName: 'com.example:id/submit_button'),
  ios: IOSSelector(identifier: 'submitButton'),
));
```

```dart
// Antes
patrolTearDown(() async {
  final automator = NativeAutomator(config: nativeConfig);
  await automator.enableWifi();
});
// Depois
patrolTearDown(() async {
  final automator = PlatformAutomator(config: platformConfig);
  await automator.mobile.enableWifi();
});
```

### Tipos de seletor em `$.platform`

| Tipo | Quando usar |
|---|---|
| `MobileSelector` | Android e iOS precisam de seletores diferentes (substituto direto do `NativeSelector`). |
| `Selector` | Mesma "forma" serve para as duas plataformas (ex.: texto). |
| `PlatformSelector` | Android + iOS + Web no mesmo objeto (útil com `$.platform.tap(...)`). |

Detalhes completos em `06-automacao-de-plataforma.md`.

## Native Automation 2.0 (`native2`) — histórico

Disponível no Patrol `3.6.0`, **deprecado a partir do `4.0.0`**. Existiu para resolver a limitação do selector único do native 1.0 (Android usa `resourceName`; iOS usa `identifier`), oferecendo **selectors por plataforma**.

Conceitos que sobrevivem como `MobileSelector`:

```dart
// native2 (antigo): um seletor com android + ios
await $.native2.tap(NativeSelector(
  android: AndroidSelector(resourceName: 'com.android.camera2:id/shutter_button'),
  ios: IOSSelector(label: 'Take Picture'),
));

// iOS: elementType, instance (0-based)
await $.native2.tap(NativeSelector(
  ios: IOSSelector(elementType: IOSElementType.secureTextField, instance: 2),
));

// iOS: interagir com outro app
await $.native2.tap(
  appId: 'com.apple.mobilesafari',
  NativeSelector(ios: IOSSelector(elementType: IOSElementType.button, label: 'Open')),
);
```

> Se você não fornece o selector da plataforma em que o teste roda, o comando falha.

## Patrol 3.x — o que mudou

- **Patrol DevTools Extension**: inspeção da árvore de UI nativa.
- **Flutter mínimo** elevado para 3.16.
- Breaking changes:
  - Removido `bindingType` de `patrolTest` (agora só `PatrolBinding`, inicializado automaticamente).
  - Removido `nativeAutomation` de `patrolTest` (`patrolTest` implica automação nativa; use `patrolWidgetTest` sem ela).
  - `PatrolTester` renomeado para `PatrolIntegrationTester` (o nome `PatrolTester` passou a ser o dos testes de widget sem automação nativa).
- Requer `patrol_cli` 2.3.0+.

### `patrol_finders` v2

- Flutter mínimo 3.16.
- Removido o método `andSettle` (deprecado) de todas as ações → use `settlePolicy`.
- Default mudou para `SettlePolicy.trySettle`.

## Patrol 4.0 — o que mudou

- **Platform Automation API** (`$.platform.mobile/android/ios/web`); deprecação de `$.native`/`$.native2`.
- Suporte a **Flutter Web** via Playwright.
- **VS Code extension**.
- Diretório padrão de testes mudou para `patrol_test/` (antes `integration_test/`).
- Prompt de device em `patrol test`/`patrol develop`.

## Compatibilidade `patrol` × `patrol_cli`

| patrol_cli | patrol | Flutter mínimo |
|---|---|---|
| 4.7.0+ | 4.9.0+ | 3.32.0 |
| 4.5.0–4.6.1 | 4.7.0–4.8.0 | 3.32.0 |
| 4.4.0 | 4.6.0–4.6.1 | 3.32.0 |
| 4.3.0–4.3.1 | 4.5.0 | 3.32.0 |
| 4.2.0 | 4.2.0–4.4.0 | 3.32.0 |
| 4.0.2–4.1.0 | 4.1.0–4.1.1 | 3.32.0 |
| 4.0.0–4.0.1 | 4.0.0–4.0.1 | 3.32.0 |
| 3.11.0 | 3.20.0 | 3.32.0 |
| 3.9.0–3.10.0 | 3.18.0–3.19.0 | 3.32.0 |
| 3.7.0–3.8.0 | 3.16.0–3.17.0 | 3.32.0 |
| 3.5.0–3.6.0 | 3.14.0–3.15.2 | 3.24.0 |
| 3.4.1 | 3.13.1–3.13.2 | 3.24.0 |
| 3.4.0 | 3.13.0 | 3.24.0 |
| 3.3.0 | 3.12.0 | 3.24.0 |
| 3.2.1 | 3.11.2 | 3.24.0 |
| 3.2.0 | 3.11.0–3.11.1 | 3.22.0 |
| 3.1.0–3.1.1 | 3.10.0 | 3.22.0 |
| 2.6.5–3.0.1 | 3.6.0–3.10.0 | 3.16.0 |
| 2.6.0–2.6.4 | 3.4.0–3.5.2 | 3.16.0 |
| 2.3.0–2.5.0 | 3.0.0–3.3.0 | 3.16.0 |
| 2.2.0–2.2.2 | 2.3.0–2.3.2 | 3.3.0 |
| 2.0.1–2.1.5 | 2.0.1–2.2.5 | 3.3.0 |
| 2.0.0 | 2.0.0 | 3.3.0 |
| 1.1.4–1.1.11 | 1.0.9–1.1.11 | 3.3.0 |

Notas:

- `+` indica compatibilidade com versões posteriores.
- Ranges cobrem todas as versões do intervalo.
- A verificação de compatibilidade é feita pela CLI antes de rodar.

### Recursos opt-in (mínimos maiores)

| Recurso | patrol_cli | patrol |
|---|---|---|
| Build-time test discovery (macro `..._STATIC_BASE`) | 4.8.0 | 4.10.0 |
| Build-time test discovery (primeira release, `..._STATIC_BEGIN`/`_END`) | 4.7.0 | 4.9.0 |
| Native screenshots (`screenshot_on_failure`, `$.takeNativeScreenshot`) | 4.8.0 | 4.10.0 |

> As duas linhas de build-time discovery são **alternativas**, não um intervalo: a macro mudou. Use o par mais novo.

## `patrol_gen` / contracts generator (extensão nativa)

Para pacotes de extensão, o core disponibiliza um gerador de contratos/clientes (`patrol_gen`) a partir de um schema Dart (`schema/*.dart`), produzindo o cliente Dart, os contratos/rotas Android e iOS. Pacotes de produção devem preferir codegen a escrever o cliente HTTP à mão, para manter endpoints e payloads sincronizados. Passo a passo em `01-como-patrol-funciona.md` (extensão packages) e em `docs/documentation/native/extension-packages.mdx`.

## Escopo deste guia

Este guia cobre a **documentação voltada ao usuário do Patrol**. Os documentos de **contribuidor** do repositório — `CONTRIBUTING.md`, `dev/README.md`, `dev/e2e_app/README.md`, os agent skills internos `.agents/skills/fix-issue` e `.agents/skills/issue-triage` (incluindo o catálogo `common-issues.md`) e a infraestrutura de `patrol_gen` em nível de implementação — **não** são reproduzidos aqui; para esses, consulte o repositório.

## Fontes

- `docs/native-to-platform-migration.mdx`, `docs/v3.mdx`, `docs/v4.mdx`, `docs/documentation/native/native2.mdx`, `docs/documentation/compatibility-table.mdx`, `docs/patrol-finders-release.mdx`, `docs/documentation/native/extension-packages.mdx`, `README.md`.
