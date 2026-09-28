---
name: patrol
description: >
  Patrol 4.10 (patrol_cli 4.8): Flutter end-to-end UI testing that also drives
  the native OS (permissions, notifications, WebView, Wi-Fi, dark mode, camera,
  gallery). Covers architecture (advanced test bundling, native JUnit/XCTest
  runners), Android/iOS/macOS/SPM setup, custom finders ($), actions/assertions,
  platform automation ($.platform.mobile/android/ios/web), CLI (test, build,
  develop, test-without-building), tags, test architecture (shared keys,
  Modules/System/ApiClients), best practices, logs/coverage/reports, performance
  (hot restart, sharding, build-time discovery), security (secrets, isolation,
  signing), CI/device farms (Firebase, BrowserStack, SauceLabs, Marathon), MCP
  and agent skills, migration (native->platform) and troubleshooting. Load when
  writing, reviewing, debugging, organizing or running Flutter E2E tests.
  Triggers: patrol, patrolTest, patrol_finders, $.platform, flutter e2e,
  integration_test native automation.
category: tooling
version: "4.10"
tags: [patrol, flutter, dart, e2e, ui-testing, integration-testing, native-automation, finders, patrol-cli, device-farms, ci, mobile, web, hot-restart, sharding]
license: MIT
---

# Patrol 4.10

Flutter E2E framework by LeanCode. Extends `flutter_test`/`integration_test` with
native OS control (`$.platform`) and concise finders (`$`). Compiles Dart tests
into **real native tests** (JUnit/Espresso, XCTest/XCUITest), so device farms and
native reports work.

## Use When
- Write/review/debug Flutter E2E or integration tests.
- Drive native UI: permissions, notifications, WebViews/OAuth, Wi-Fi/cellular/
  Bluetooth/location/airplane, dark mode, camera, gallery, pull-to-refresh.
- Use `$(...)` finders in widget/integration tests.
- Structure a suite: shared keys, Modules/System/ApiClients.
- Run on CI/device farms or optimize build/run time.
- Collect logs, coverage, screenshots, video.
- Write/run tests via an AI agent (Patrol MCP + agent skills).

## Avoid When
- Pure unit/widget tests with no native interaction → use `patrol_finders`
  alone (or plain `flutter_test`); no need for `patrol_cli`.
- Running Patrol UI tests with `flutter test` → **won't work**; use `patrol test`.
- Non-Flutter apps.

## Non-negotiable rules
1. **Run with the CLI, not `flutter test`.** UI tests need `patrol test`
   (`develop` for iteration). `Patrol` requires `patrol_cli`.
2. **Use matching versions.** `patrol` ↔ `patrol_cli` compatibility is checked at
   runtime; mismatches error in `test_bundle.dart`. Pin versions in CI.
3. **Choose the right entry point:** `patrolTest` (native automation) vs
   `patrolWidgetTest` (no native; `flutter test` is fine).
4. **Find widgets by `Key` only.** Strings break with i18n; types are
   implementation detail. Keep all keys in one shared `keys.dart`.
5. **One main path per test.** Avoid `if`/branching — it causes flakiness.
6. **Actions already wait.** `tap`/`enterText`/`scrollTo` retry-until-visible and
   settle automatically. Do NOT add waits before/after them.
7. **Assert at the end**, prefer `waitUntilVisible`; use `expect` only when needed.
8. **Handle native dialogs immediately** after the triggering action; prefer
   `grantPermissionWhenInUse` over a raw `tap`.
9. **Never hardcode secrets.** Use `--dart-define` / `.patrol.env` +
   `const String.fromEnvironment(...)`.
10. **Never commit** `test_bundle.dart`, `.patrol.env`, or generated
    `PatrolGeneratedTests*`.
11. **Isolate tests:** Android `clearPackageData=true`; iOS Simulator
    `--full-isolation`.
12. **Hot restart (`develop`) restarts Dart only** — permissions, files, native
    state persist. Not reliable on physical iOS.
13. **macOS is alpha**; WebViews on Android are partial. iOS permission handling
    needs the device language set to English.
14. **Declare scope** when asked about contributing to Patrol itself: core
    framework/CLI codegen (`patrol_gen`), `CONTRIBUTING.md`, internal `.agents`
    skills — not covered by this guide.

## API quick map
| Need | Use |
|---|---|
| Test entry (native + widgets) | `patrolTest(name, ($) async {...})` |
| Widget test (no native) | `patrolWidgetTest(name, ($) async {...})` |
| Find/act on widgets | `$(#key)`, `$(Type)`, `$('text')`, `.tap()`, `.enterText()`, `.scrollTo()`, `.waitUntilVisible()`, `.which<T>()`, `.containing()` |
| Native OS / browser | `$.platform.mobile`, `.android`, `.ios`, `.web`, `.macos` |
| Cross-platform selector | `MobileSelector(android: AndroidSelector(...), ios: IOSSelector(...))` |
| Raw `flutter_test` | `$.tester` (`WidgetTester`, `find.*`) |

## Core Patterns
```dart
// Minimal test — act, then assert at the end.
import 'package:patrol/patrol.dart';
void main() {
  patrolTest('counter increments', ($) async {
    await $.pumpWidgetAndSettle(const MyApp());
    await $(#plusButton).tap();
    await $(#counterText).waitUntilVisible();
  });
}

// Native permission dialog: handle right after the trigger, guard re-runs.
await $(#requestCamera).tap();
if (await $.platform.mobile.isPermissionDialogVisible()) {
  await $.platform.mobile.grantPermissionWhenInUse();
}

// Cross-platform native selector.
await $.platform.mobile.tap(MobileSelector(
  android: AndroidSelector(resourceName: 'com.example:id/submit'),
  ios: IOSSelector(identifier: 'submitButton'),
));

// Secrets, never inline.
await $(#password).enterText(const String.fromEnvironment('PASSWORD'));
```

## Runtime commands
```bash
patrol doctor                                   # verify tooling
patrol test -t patrol_test/app_test.dart        # run (build+install+test)
patrol test --tags='smoke||regression'          # tag filter
patrol test --coverage --coverage-ignore="**/*.g.dart"
patrol develop -t patrol_test/app_test.dart     # hot-restart loop
patrol build android --emit-test-manifest       # CI artifact + test discovery
patrol test-without-building --only "<test name>"
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Overview, packages, versions, mental model |
| `01-como-patrol-funciona.md` | Architecture, bundling, native runners, native server, discovery modes, extension packages |
| `02-instalacao-e-setup.md` | CLI, pubspec, Android, iOS/macOS, SPM, flavors, physical iOS, gitignore |
| `03-primeiro-teste.md` | `patrolTest`, app init, wrapper, `patrol develop` caveats |
| `04-finders.md` | `$`, `#symbol`, chaining, `containing`, `which`, `scrollTo`, timeouts, `settlePolicy` |
| `05-acoes-e-assertivas.md` | Auto-wait actions, assertions, `waitUntilVisible`, `.text`/`.exists`/`.visible` |
| `06-automacao-de-plataforma.md` | `$.platform.*`, selectors, permissions, notifications, appId, web/multi-page |
| `07-cli.md` | `test`, `build`, `develop`, `test-without-building`, all flags |
| `08-testes-e-organizacao.md` | Tags, structure, keys, Modules/System/ApiClients, VS Code |
| `09-boas-praticas.md` | Effective Patrol, action/assertion rules, tips & tricks |
| `10-logs-e-relatorios.md` | Test steps, summary, native reports, coverage, screenshots, video |
| `11-performance.md` | Bundling, hot restart, build-time discovery, sharding, parallelism |
| `12-seguranca.md` | Secrets, isolation, permissions, signing, supply chain |
| `13-ci-e-device-farms.md` | Firebase, BrowserStack, SauceLabs, LambdaTest, Marathon, other CI |
| `14-troubleshooting.md` | FAQ, setup/finder/platform errors, debugging |
| `15-cheatsheet.md` | Commands, flags, selectors, snippets |
| `16-mcp-e-agentes.md` | Patrol MCP, tools, config, agent skills |
| `17-migracao-e-versoes.md` | native→platform migration, native2, v3/v4 history, full compatibility table |

## Read Order (token-efficient)
`00`→`01`→`02`→`03`; tests `04`+`05`; native `06`; CLI `07`; structure `08`+`09`;
logs `10`; perf/security `11`+`12`; CI `13`; errors `14`; migration `17`. For a
specific task, jump straight to the file that matches.

## Prereqs
Flutter SDK >=3.32, Dart, JDK 17 (Android), Xcode (iOS/macOS), Node.js (web).
Android 5.0+ (API 21), iOS 13+, macOS 10.14+ (alpha). Windows/Linux unsupported.
