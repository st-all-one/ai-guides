# 18 - Coverage And Limits

This chapter states what the dossier proves, what it merely reports, and what remains open. Coverage is measured per topic. A topic has 20 concrete requirements; 17 documented answers are required to pass. `19-coverage-evidence.md` holds the row-by-row measurement, so no global percentage is used to hide a weak topic.

## Measurement Contract

| Topic | Items | Pass rule | Evidence source | Measured rows |
|---|---:|---|---|---|
| Usability | 20 | 17 documented | `19-coverage-evidence.md` section `usability` | U01-U20 |
| Configuration | 20 | 17 documented | `19-coverage-evidence.md` section `configuration` | C01-C20 |
| Implementation | 20 | 17 documented | `19-coverage-evidence.md` section `implementation` | I01-I20 |
| Logs and errors | 20 | 17 documented | `19-coverage-evidence.md` section `logs-errors` | E01-E20 |
| Telemetry | 20 | 17 documented | `19-coverage-evidence.md` section `telemetry` | T01-T20 |
| Performance | 20 | 17 documented | `19-coverage-evidence.md` section `performance` | P01-P20 |
| Security | 20 | 17 documented | `19-coverage-evidence.md` section `security` | S01-S20 |
| Lint | 20 | 17 documented | `19-coverage-evidence.md` section `lint` | L01-L20 |

A row counts only when its evidence token resolves to a line actually read in `docs/`, `src/` or `src-head/`. A bare path may support a whole-file fact. `unverified` rows are gaps and receive no credit.

## What Was Verified

1. Version identity: npm latest `8.6.2` from the registry; git tag `8.6.2` at SHA `599fb14bd1ba128b1abc5b2629b9fb1a59bec1be`, dated 2026-11-12.
2. Docs identity: Docusaurus v8 from `versioned_docs/version-v8`, 146 files and 1,312,128 bytes, copied without modification into `docs/`.
3. Source identity: 513 files in the pinned tag, including 28 core files, 90 CLI files, 149 iOS files and 105 Android files.
4. Contributor provenance: `AGENTS.md` and `ARCHITECTURE.md` exist on the main branch, not in the 8.6.2 tag. They were copied into `src-head/` and are labelled wherever cited.
5. Sample integrity: eight byte-identical copies in `samples/`, with size and hash in `samples/MANIFEST.md`.
6. Mechanical integrity: citations resolve, verbatim blocks match their cited lines, official URLs are present, and every topic clears the pass rule.
7. CLI telemetry fields and controls were read from both the docs and the CLI implementation (`docs/cli/telemetry.md:8-29`, `src/cli/src/telemetry.ts`).
8. Security guidance was read from the official security page, including secrets, deep links, PKCE, HTTPS and CSP (`docs/main/guides/security.md:21-72`).
9. Quality gates were read from the pinned package manifest and TypeScript config (`src/package.json:20-42`, `src/core/tsconfig.json:10-12`).
10. Bridge invariants were read from the main-branch contributor guide and cross-checked against the pinned bridge source (`src-head/AGENTS.md:76-97`, `src/core/native-bridge.ts`).

## What Was Not Verified

- No native build ran: no `xcodebuild`, `gradlew`, Android SDK or simulator was available in this environment.
- No device execution ran: no WebView was launched, no plugin call was made, no deep link was opened.
- No telemetry collector ran: collection behavior is documented and read from code, but no endpoint or consent store was exercised.
- No performance benchmark ran: claims about serial queues, bundle size and storage are structural, not measured timings.
- No lint command ran against a live checkout with installed dependencies; the gates are read from configuration, not executed.
- No upgrade was applied to a real app; migration guidance is documentary only.
- No external security audit of a concrete app was performed.
- No Cordova plugin was installed or compiled.

## Scope Cuts

| Cut | Reason | Where the boundary is stated |
|---|---|---|
| 38 API pages are indexed, not fully re-derived | The guide maps usage and integration, not every method signature | `05-core-apis-and-plugins.md`, `14-web-and-pwa.md` |
| iOS and Android tutorials are excluded | Platform SDKs are external systems with their own docs | `12-ios-native-deep.md`, `13-android-native-deep.md` |
| Cordova authoring is excluded | Cordova is a compatibility target, not a model | `15-cordova-and-migration.md` |
| Performance numbers are excluded | No benchmark was executed | `09-performance-and-startup.md` |
| Main-branch contributor docs are marked | They are not part of the 8.6.2 tag | `11-lint-and-code-quality.md`, `17-updates-and-maintenance.md` |
| Runtime claims use the pinned bridge source | Generated assets must match `core/native-bridge.ts` | `01-architecture-and-bridge.md` |

## Unverified Classes

| Class | Why open | How to close |
|---|---|---|
| Device-specific WebView behavior | Requires real iOS and Android runtimes | Run a minimal app on both platforms and record logs |
| Telemetry endpoint payload | Requires an instrumented collector | Capture one CLI run with a local sink |
| Native build/lint success | Requires toolchains and dependencies | Run the root lint chain and platform verify scripts |
| Performance timings | Requires a profiler and representative bundle | Capture startup profile and bridge traces |
| Upgrade outcome | Requires a real app at 7.x | Perform the upgrade and diff generated native files |
| Private registry or enterprise plugins | Not in the public corpus | Add the private docs to the corpus and re-verify |

## Refresh Procedure

1. Confirm the new npm latest version and git tag.
2. Re-clone the tag and re-copy the matching Docusaurus version directory.
3. Recompute file counts, byte counts and hashes.
4. Re-run the mechanical verifier; fix broken citations before editing prose.
5. Re-read each `unverified` row and either resolve it or keep it open with a reason.
6. Re-check every canonical URL with an HTTP status probe.
7. Recopy all eight samples byte-for-byte and refresh `samples/MANIFEST.md`.
8. Update `VERSION`, `SKILL.md` and `INDEX.md` together; never leave a mixed-version guide.

## Decision Rule

Use this dossier to decide implementation shape, configuration, failure triage and review gates. Do not use it as a substitute for a device run, a security review of a concrete app, or the official docs after a version bump. When a chapter and the pinned corpus disagree, the corpus wins and the chapter is a defect.

## Sources

- https://capacitorjs.com/docs
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/cli
- https://capacitorjs.com/docs/cli/telemetry
- https://capacitorjs.com/docs/guides/security
- https://github.com/ionic-team/capacitor/releases/tag/8.6.2
- https://github.com/ionic-team/capacitor/tree/8.6.2/core
- https://github.com/ionic-team/capacitor/tree/8.6.2/cli
- https://github.com/ionic-team/capacitor-docs/tree/main/versioned_docs/version-v8
