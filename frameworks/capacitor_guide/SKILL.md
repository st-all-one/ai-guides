---
name: capacitor
description: >
  Capacitor 8.6.2 deep reference: native WebView shell, bridge wire protocol, typed plugin proxies, CLI workflow, capacitor.config.ts schema, logs/errors, CLI telemetry, performance, security, rigorous TS/Swift/Java lint, iOS/Android deep integration, Cordova migration and maintenance. Load when implementing, configuring, debugging or hardening a Capacitor app.
tags: capacitor ionic cross-platform webview ios android cli plugins telemetry performance security lint cordova
category: frameworks
version: 8.6.2 / docs-v8-2026-11-18
license: MIT
---

# Capacitor 8.6.2

Capacitor hosts a web app inside a native iOS/Android WebView and exposes device APIs through a typed JSON bridge. This skill is a dense, auditable map of that system, pinned to one release and one docs snapshot. Every factual claim resolves to a local corpus path with a line number; unread claims are marked `unverified`.

## When To Use

1. Add Capacitor to an existing web app or scaffold the native layers.
2. Implement or debug a plugin across web, iOS and Android.
3. Tune `capacitor.config.ts`, native project settings or environment-specific overrides.
4. Diagnose bridge failures, unsettled calls, WebView navigation and native logs.
5. Audit telemetry, privacy, security, CSP, deep links and secret handling.
6. Optimize startup, bundle size, storage, HTTP and the serial plugin queues.
7. Enforce rigorous TypeScript, Swift and Java lint in the Capacitor repo or a plugin.
8. Migrate Cordova plugins/apps or plan an 8.x upgrade.

## Corpus And Contract

- `docs/` — verbatim Docusaurus v8 docs (146 files, 1,312,128 bytes) from `ionic-team/capacitor-docs/versioned_docs/version-v8`.
- `src/` — Capacitor tag `8.6.2`, SHA `599fb14bd1ba128b1abc5b2629b9fb1a59bec1be`.
- `src-head/` — main-branch contributor docs `AGENTS.md` and `ARCHITECTURE.md`; provenance is stated wherever used.
- Citation form: `docs/<path>:LINE` or `src/<path>:LINE` or `src-head/<path>:LINE`. A bare path means a whole-file fact. `unverified` means not read.
- Inline code blocks are verbatim slices with the citation on the line immediately above. Derived content is labelled `derived`.

## Hard Rules

1. Native decides routing. A JS method absent from native plugin headers throws `UNIMPLEMENTED` at runtime, not at build time.
2. Every plugin call settles exactly once unless `keepAlive` is set. An early return without reject hangs the caller forever.
3. Only JSON crosses the bridge. `NSNull`, ISO dates and stringified objects are the normal forms; functions, class instances, `Blob` and typed arrays are not wire values.
4. The app is served from `capacitor://localhost` on iOS and `https://localhost` on Android, never `file://`.
5. Navigation resets the bridge; saved calls and JS listeners do not survive a page load.
6. Both platforms run plugin methods on one serial queue. Blocking it stalls every plugin.
7. Generated files (`native-bridge.js`, `ios/Package.swift`) must be rebuilt from their sources, never hand-edited.
8. Secrets never ship in the web bundle; move signing and token work server-side or into Keychain/Keystore plugins.
9. Use HTTPS everywhere; CSP belongs in the document head or server headers.
10. Deep links carrying auth tokens must use Universal Links/App Links and PKCE, not custom schemes alone.
11. CLI telemetry is opt-out, skips non-interactive environments, and records command metadata plus anonymous IDs.
12. TypeScript uses type-only imports, explicit export return types, ordered imports and no unused locals/parameters.
13. Swift in this release is Swift 5 language mode with GCD concurrency; do not introduce actors or strict concurrency as a drive-by.
14. Android lint runs with `abortOnError` and warnings as errors against a checked-in baseline.
15. `npx cap sync` updates native projects; `npx cap copy` only copies web assets. Choose deliberately.
16. `npx cap run` builds and deploys to a device/simulator; `npx cap open` opens the native IDE.
17. Environment-specific configs are resolved by CLI commands, not by the runtime bundle.
18. Cordova is a compatibility target; new work should use Capacitor plugin shapes.
19. Verify config keys against `docs/main/reference/config.md` before relying on memory.
20. Treat every `unverified` row in `19-coverage-evidence.md` as an open investigation.

## Navigation Order

`00-index.md` → `01-architecture-and-bridge.md` → `02-installation-and-first-app.md` → `03-configuration-deep.md` → `04-cli-and-workflow.md` → task chapter → `20-quick-reference.md` → `21-minimal-verified-cut.md`.

Coverage is measured per topic in `19-coverage-evidence.md`; `18-coverage-and-limits.md` states the honest boundaries of what was verified.

## Failure Signatures

- `UNIMPLEMENTED` means native never declared the method in `window.Capacitor.PluginHeaders`; the JS proxy rejects before native work starts (`src-head/AGENTS.md:76-79`).
- A promise that never settles usually means a native `PluginCall` returned without `resolve` or `reject`; listeners and repeated callbacks require `keepAlive` first (`src-head/AGENTS.md:81-83`, `src-head/AGENTS.md:261-263`).
- An iOS log saying a method `does not respond to method call` means a bridge-reachable Swift method missed `@objc`; `@objc(ClassName)` on the class is also required for plugin scanning (`src-head/AGENTS.md:277-280`).
- Telemetry surprises come from automatic enrollment after the first successful CLI command; it does not run in non-interactive environments (`docs/cli/telemetry.md:8-12`).
- Hard-coded secrets in the web bundle are readable with basic app analysis; move signing and token work server-side or into Keychain/Keystore plugins (`docs/main/guides/security.md:21-27`).
- Lint gates for 8.6.2 are `eslint`, `prettier --check` and `swiftlint` chained by the root `lint` script (`src/package.json:20-24`).

## Topic Quotas

Eight topics receive 20 requirements each: usability, configuration, implementation, logs/errors, telemetry, performance, security and lint. `19-coverage-evidence.md` records the measured result. A topic passes only at 85% or more; rows marked `unverified` count as gaps, never as coverage.

## Sources Policy

- Official v8 docs and the pinned 8.6.2 tag are the primary evidence; main-branch contributor docs are used only with explicit provenance.
- No guessed config keys, no inferred native signatures, no blog lore, no Stack Overflow answers.
- Inline blocks are verbatim slices; derived tables and calculations are labelled `derived`.
- The snapshot is immutable inside this skill. A version bump requires a new corpus capture and a fresh verification pass.

## Non-Goals

- Not a tutorial for Xcode, Android Studio or general web development.
- Not an authoring guide for Cordova plugins; `15-cordova-and-migration.md` only covers coexistence and migration.
- Not a claim that native builds, devices or collectors were executed here.
- Not a replacement for the official docs when a new Capacitor release changes the pinned facts.
