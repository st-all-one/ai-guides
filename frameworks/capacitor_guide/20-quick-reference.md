# 20 - Quick Reference

Pinned to Capacitor 8.6.2, SHA `599fb14bd1ba128b1abc5b2629b9fb1a59bec1be`, docs v8 snapshot 2026-11-18. Every row below resolves to the pinned corpus; no device, simulator or collector was executed.

## Version And Corpus

| Item | Value | Evidence |
|---|---|---|
| Core and CLI | 8.6.2 | `src/package.json:1-44` |
| Git tag | `8.6.2` | `src/package.json:1-3` |
| Docs corpus | Docusaurus v8, 146 files | `docs/index.md` |
| Contributor docs | main branch only, labelled | `src-head/AGENTS.md:1-9` |

## CLI Surface

| Command | Purpose | Evidence |
|---|---|---|
| `npx cap add <platform>` | Add a native platform project | `docs/cli/commands/add.md:9` |
| `npx cap copy` | Copy web assets into native projects | `docs/cli/commands/copy.md:9` |
| `npx cap sync` | Copy web assets and update native dependencies/plugins | `docs/cli/commands/sync.md:9` |
| `npx cap run <platform>` | Build and deploy to device or simulator | `docs/cli/commands/run.md:7` |
| `npx cap build <platform>` | Build the native binary | `docs/cli/commands/build.md:7` |
| `npx cap open <platform>` | Open the native IDE | `docs/cli/commands/open.md:9` |
| `npx cap ls` | List installed platforms and plugins | `docs/cli/commands/ls.md:9` |
| `npx cap init` | Create the initial config file | `docs/cli/commands/init.md:9` |
| `npx cap update` | Update native dependencies without copying web assets | `docs/cli/commands/update.md:9` |
| `npx cap telemetry [on|off]` | Control CLI telemetry consent | `docs/cli/telemetry.md:31-48` |
| CLI hooks | Script around CLI lifecycle events | `docs/cli/hooks.md:8` |

## Config Keys

| Key | Meaning | Evidence |
|---|---|---|
| `appId` | Native bundle id / application id | `docs/main/reference/config.md:45` |
| `appName` | Native display name | `docs/main/reference/config.md:55` |
| `webDir` | Built web assets directory consumed by `copy`/`sync` | `docs/main/reference/config.md:64` |
| `loggingBehavior` | Global WebView console forwarding policy | `docs/main/reference/config.md:70-81` |
| `android` | Android-specific overrides | `docs/main/reference/config.md:122` |
| `ios` | iOS-specific overrides | `docs/main/reference/config.md:336` |
| `server` | Live reload, scheme, hostname and error path | `docs/main/reference/config.md:607` |
| `plugins` | Per-plugin configuration map | `docs/main/reference/config.md:737-744` |
| `includePlugins` | Allowlist used during `npx cap sync` | `docs/main/reference/config.md:747-751` |
| environment variables | CLI-side config overrides | `docs/main/reference/config.md:878` |

## Bridge Invariants

| Invariant | Consequence | Evidence |
|---|---|---|
| Native owns routing via `PluginHeaders` | Missing native declaration yields `UNIMPLEMENTED` at runtime | `src-head/AGENTS.md:76-79` |
| Exactly-once settlement | Early return without reject hangs the JS promise | `src-head/AGENTS.md:81-83` |
| `keepAlive` for repeated callbacks | Listeners must opt in or the call is released after first result | `src-head/AGENTS.md:261-263` |
| JSON-only wire format | `NSNull`, ISO dates and plain objects are the safe forms | `src-head/AGENTS.md:92-94` |
| Navigation resets bridge state | Persistent state belongs on the native side | `src-head/AGENTS.md:84-86` |
| Local schemes, never `file://` | `capacitor://localhost` on iOS, `https://localhost` on Android | `src-head/AGENTS.md:87-91` |
| Serial plugin queues | Long work must be dispatched onward, not run on the plugin queue | `src-head/AGENTS.md:266-269` |
| Generated bridge assets | Rebuild after editing `core/native-bridge.ts` | `src-head/AGENTS.md:247-250` |

## Telemetry

| Fact | Value | Evidence |
|---|---|---|
| Enrollment | Automatic after first successful CLI command | `docs/cli/telemetry.md:8-10` |
| CI | No collection in non-interactive environments | `docs/cli/telemetry.md:12` |
| Collected fields | Timestamp, command, duration, error message, anonymous ids, OS, versions | `docs/cli/telemetry.md:20-29` |
| Disable | `npx cap telemetry off` | `docs/cli/telemetry.md:33-37` |
| Status | `npx cap telemetry` | `docs/cli/telemetry.md:39-43` |
| Rejoin | `npx cap telemetry on` | `docs/cli/telemetry.md:45-49` |

## Security Controls

| Control | Rule | Evidence |
|---|---|---|
| Secrets | Never embed keys in the web bundle; move work server-side | `docs/main/guides/security.md:21-27` |
| Sensitive storage | Use Keychain/Keystore through a plugin | `docs/main/guides/security.md:29-35` |
| Deep links | Do not send sensitive data through custom URL schemes | `docs/main/guides/security.md:37-45` |
| OAuth2 | Require PKCE from the auth plugin | `docs/main/guides/security.md:43-45` |
| Transport | HTTPS only | `docs/main/guides/security.md:49-55` |
| CSP | Add a restrictive `Content-Security-Policy` meta tag or header | `docs/main/guides/security.md:57-72` |

## Quality Gates

| Gate | Rule | Evidence |
|---|---|---|
| Root lint chain | `eslint`, `prettier --check`, `swiftlint` | `src/package.json:20-24` |
| ESLint preset | `@ionic/eslint-config/recommended` pinned `^0.4.0` | `src/package.json:28-32` |
| Prettier preset | `@ionic/prettier-config` pinned `^4.0.0` | `src/package.json:27,33` |
| TypeScript | `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters` | `src/core/tsconfig.json:10-12` |
| SwiftLint | `@ionic/swiftlint-config` pinned `^2.0.0` | `src/package.json:34,42` |
| Java formatting | `prettier-plugin-java` in the Prettier script | `src/package.json:22,39` |
| Generated manifest | `ios/Package.swift` is generated and checked by lint | `src-head/AGENTS.md:61-68` |

## Failure Signatures

| Signature | First action | Evidence |
|---|---|---|
| `UNIMPLEMENTED` | Check native method declaration and registration lists | `src-head/AGENTS.md:76-79`, `src-head/AGENTS.md:282-297` |
| Promise never settles | Check exactly-once settlement and `keepAlive` | `src-head/AGENTS.md:81-83` |
| `does not respond to method call` | Add `@objc` to the Swift bridge method and class | `src-head/AGENTS.md:277-280` |
| Blank page after `sync` | Verify `webDir` and the copied bundle | `docs/main/reference/config.md:64` |
| Bridge listener stops after navigation | Move state native; re-register after load | `src-head/AGENTS.md:84-86` |
| Unexpected telemetry | Check opt-out state and interactive vs CI run | `docs/cli/telemetry.md:8-12` |

## Sources

- https://capacitorjs.com/docs
- https://capacitorjs.com/docs/cli
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/cli/telemetry
- https://capacitorjs.com/docs/guides/security
- https://github.com/ionic-team/capacitor/tree/8.6.2/cli
- https://github.com/ionic-team/capacitor/tree/8.6.2/core
- https://github.com/ionic-team/capacitor/tree/8.6.2/android
- https://github.com/ionic-team/capacitor/tree/8.6.2/ios
- https://developer.apple.com/documentation/webkit/wkwebview
