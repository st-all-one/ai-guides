# Samples Manifest

Byte-identical evidence from the pinned corpus. Source paths are relative to `/tmp/cap-research/`; `src/` is Capacitor tag `8.6.2` SHA `599fb14bd1ba128b1abc5b2629b9fb1a59bec1be`; `docs/` is Docusaurus v8 from `ionic-team/capacitor-docs`.

| Sample | Source | Size (bytes) | SHA-256 (first 12) | Why it is critical |
|---|---|---:|---|---|
| `core-native-bridge.ts` | `src/core/native-bridge.ts` | 38881 | `e573d6c640a6` | The bridge IIFE injected into the WebView: globals, fetch/XHR patching, callback ids and message framing. |
| `cli-telemetry.ts` | `src/cli/src/telemetry.ts` | 11779 | `85ac56f0aa91` | Actual telemetry collection, storage of anonymous ids and consent state. |
| `root-package.json` | `src/package.json` | 2582 | `0aaf429f9fdc` | Authoritative lint scripts and pinned `@ionic/*` quality packages for 8.6.2. |
| `core-tsconfig.json` | `src/core/tsconfig.json` | 473 | `c7a030318be6` | Compiler gates that fail the build on unused locals/parameters. |
| `swiftlint.config.js` | `src/swiftlint.config.js` | 261 | `e48de041c1d8` | SwiftLint config package selection for iOS code. |
| `android-capacitor-build.gradle` | `src/android/capacitor/build.gradle` | 4039 | `2b03df6b5751` | Android lint gate: abort on error, warnings as errors, checked-in baseline. |
| `docs-security.md` | `docs/main/guides/security.md` | 6369 | `96729cb0b829` | Official security guidance: secrets, deep links, PKCE, SSL and CSP. |
| `docs-reference-config.md` | `docs/main/reference/config.md` | 24877 | `561e8a837c3f` | Authoritative `capacitor.config.ts` schema and platform overrides. |

Verify every row with `cmp samples/<sample> /tmp/cap-research/<source>`. Samples are never edited or annotated.
