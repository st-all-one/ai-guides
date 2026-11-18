# 00 - Index

Capacitor 8.6.2, docs v8 snapshot 2026-11-18. Read `SKILL.md` first for the corpus contract, then load only the chapter needed for the task. Citations use `docs/<path>:LINE`, `src/<path>:LINE` or `src-head/<path>:LINE`; `src-head` is main-branch contributor documentation and is not part of the 8.6.2 tag.

## Chapter Map

| Chapter | Covers | Load when |
|---|---|---|
| `01-architecture-and-bridge.md` | Bootstrap order, plugin headers, callback identity, wire format, keepAlive, navigation reset, schemes, asset handler | Explaining runtime behavior or diagnosing bridge failures |
| `02-installation-and-first-app.md` | Add Capacitor, required web app shape, `cap add`, first build, native project layout | Starting a new integration |
| `03-configuration-deep.md` | Full `capacitor.config.ts` schema, platform overrides, env-specific config, automated config, generated native settings | Changing behavior through config |
| `04-cli-and-workflow.md` | `add`, `copy`, `sync`, `run`, `build`, `open`, `ls`, `init`, `update`, hooks and telemetry command | Running or scripting the CLI |
| `05-core-apis-and-plugins.md` | Built-in APIs, typed proxies, `registerPlugin`, `WebPlugin`, web/native implementations | Using or writing a plugin |
| `06-development-loop-and-usability.md` | Live reload, dev server, debug loop, common setup mistakes, daily ergonomics | Improving the developer loop |
| `07-logs-and-errors.md` | WebView console, native logs, bridge errors, `UNIMPLEMENTED`, unsettled calls, troubleshooting pages | Reading a failure from any layer |
| `08-telemetry-and-privacy.md` | CLI telemetry fields, auto-enrollment, opt-out/on/status, CI behavior, anonymous IDs, privacy review | Auditing or disabling telemetry |
| `09-performance-and-startup.md` | Startup path, serial queues, bundle size, asset loading, HTTP, storage, games guidance, debugging cost | Reducing latency or jank |
| `10-security.md` | Secrets, Keychain/Keystore, deep links, PKCE, HTTPS, CSP, WebView hardening | Security review or release gate |
| `11-lint-and-code-quality.md` | TS/Swift/Java lint, Prettier, ESLint, SwiftLint, Android baseline, generated-file hygiene | Setting or fixing quality gates |
| `12-ios-native-deep.md` | Swift/ObjC plugin classes, SPM/Pods, view controller, entitlements, Info.plist, deployment | iOS-specific implementation |
| `13-android-native-deep.md` | Java bridge, Gradle wiring, plugin registration, manifest, SDK targets, deployment | Android-specific implementation |
| `14-web-and-pwa.md` | Web fallback, PWA behavior, service workers, web-only APIs, parity limits | Shipping one bundle to web and native |
| `15-cordova-and-migration.md` | Cordova compatibility plugins, migration path, plugin shape differences | Keeping legacy plugins alive |
| `16-testing-and-automation.md` | Native builds, CI-safe commands, mocks, repo scripts, release checks | Automating verification |
| `17-updates-and-maintenance.md` | 8.x upgrades, support policy, plugin version alignment, changelog discipline | Planning upgrades |
| `18-coverage-and-limits.md` | Topic quotas, honest limits, unresolved items | Auditing the dossier |
| `19-coverage-evidence.md` | 160 measured checklist rows across 8 topics | Checking coverage claims |
| `20-quick-reference.md` | Commands, config keys, error signatures, thresholds | Fast lookup during implementation |
| `21-minimal-verified-cut.md` | Smallest verified cut, decisions, sufficiency questions | Turning research into a decision |

## Rule Order

1. Read `SKILL.md` for the contract.
2. Read this index and choose one chapter, not the whole guide.
3. Follow the chapter's verbatim blocks from the pinned corpus; do not invent config keys or native method signatures.
4. Cross-check failures in `07-logs-and-errors.md` before changing native code.
5. For security or telemetry changes, also load `08` and `10`.
6. For repo/plugin contributions, load `11` before editing source.
7. Finish with `20-quick-reference.md` and `21-minimal-verified-cut.md`.

## Sample Inventory

Byte-identical copies live in `samples/` and are listed with source and rationale in `samples/MANIFEST.md`:

- `core-native-bridge.ts` — bridge IIFE injected into the WebView.
- `cli-telemetry.ts` — telemetry collection and consent implementation.
- `root-package.json` — lint scripts and pinned quality packages.
- `core-tsconfig.json` — TypeScript strictness flags.
- `swiftlint.config.js` — SwiftLint package selection.
- `android-capacitor-build.gradle` — Android lint gate and build config.
- `docs-security.md` — official security guidance.
- `docs-reference-config.md` — authoritative config schema.

Samples are evidence, not editable guidance. Verify integrity with `cmp` against the pinned corpus.

## Coverage Contract

Coverage is measured per topic, never as one global percentage. Each of eight topics has 20 requirements. A requirement counts only when the guide answers it with a resolved line citation; `unverified` rows are counted as gaps. See `19-coverage-evidence.md` for the measurement and `18-coverage-and-limits.md` for the boundaries.

## Failure-First Reading

| Symptom | Read first | Then |
|---|---|---|
| Blank WebView after `sync` | `03-configuration-deep.md` | `07-logs-and-errors.md` |
| `UNIMPLEMENTED` from a plugin call | `01-architecture-and-bridge.md` | `05-core-apis-and-plugins.md`, `12-ios-native-deep.md` or `13-android-native-deep.md` |
| Promise never settles | `01-architecture-and-bridge.md` | `07-logs-and-errors.md` |
| Unexpected usage data | `08-telemetry-and-privacy.md` | `04-cli-and-workflow.md` |
| Slow cold start or jank | `09-performance-and-startup.md` | `14-web-and-pwa.md` |
| Security review | `10-security.md` | `03-configuration-deep.md`, `05-core-apis-and-plugins.md` |
| Lint failure in TS, Swift or Java | `11-lint-and-code-quality.md` | `01-architecture-and-bridge.md` |
| Legacy Cordova plugin | `15-cordova-and-migration.md` | `05-core-apis-and-plugins.md` |
| Major upgrade | `17-updates-and-maintenance.md` | `04-cli-and-workflow.md`, `11-lint-and-code-quality.md` |

## Command Surface

The CLI surface covered in `04-cli-and-workflow.md` is `add`, `copy`, `sync`, `run`, `build`, `open`, `ls`, `init`, `update` and `telemetry`. Telemetry has `on`, `off` and status forms, all run from the project root (`docs/cli/telemetry.md:31-48`). Non-interactive runs skip collection entirely.

## Native Touchpoints

iOS work starts in `src/ios/Capacitor/Capacitor/CAPBridge.swift` and `CAPBridgeViewController.swift`; Android work starts in the Java bridge configured by `src/android/capacitor/build.gradle`. Both are real projects owned by the app developer; the CLI writes into them but does not regenerate them on every build. Generated runtime assets are the two `native-bridge.js` copies.

## Evidence Policy

Samples in `samples/` are byte copies; `MANIFEST.md` records source, size and hash. Every claim must resolve to `docs/`, `src/` or `src-head/` with a line number. Unread claims are `unverified` and are excluded from coverage credit.

## Sources

- https://capacitorjs.com/docs
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/cli
- https://capacitorjs.com/docs/cli/telemetry
- https://capacitorjs.com/docs/guides/security
- https://github.com/ionic-team/capacitor/tree/8.6.2
- https://github.com/ionic-team/capacitor-docs/tree/main/versioned_docs/version-v8
- https://developer.apple.com/documentation/webkit/wkwebview
- https://developer.android.com/reference/android/webkit/WebView
