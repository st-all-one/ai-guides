# 19 - Coverage Evidence

Coverage is measured per topic, never as one global percentage. Each of eight topics has 20 concrete requirements describing what effective implementation, configuration, operation or review requires. A row counts as `documented` only when its evidence token resolves to a line actually read in the pinned corpus. `unverified` rows are counted as gaps, never as credit. A topic passes at 17 documented rows, which is 85%.

The corpus is fixed: docs are Docusaurus v8 under `docs/`, source is tag `8.6.2` SHA `599fb14bd1ba128b1abc5b2629b9fb1a59bec1be` under `src/`, and main-branch contributor guidance is isolated under `src-head/` and labelled wherever used. The same 20-question set is applied to every topic so the result can be recomputed after a version bump.

## usability

| ID | topic | requirement | status | evidence |
| --- | --- | --- | --- | --- |
| U01 | usability | Confirm Node 22 or higher is installed before any CLI command, since every install and build flow depends on it | documented | docs/main/getting-started/environment-setup.md:13 |
| U02 | usability | Install macOS, Xcode 26.0+, and Xcode Command Line Tools before generating or running an iOS target | documented | docs/main/getting-started/environment-setup.md:37 |
| U03 | usability | Install Android Studio 2025.2.1+ and an SDK platform for API 24 or greater; the IDE provisions the JDK | documented | docs/main/getting-started/environment-setup.md:123-129 |
| U04 | usability | Retrofit only into a project with package.json, a dedicated build output directory, and index.html containing a head element so plugin injection works | documented | docs/main/getting-started/installation.md:23-32 |
| U05 | usability | Scaffold greenfield apps with the create-app initiator run inside an empty directory | documented | docs/main/getting-started/installation.md:15-19 |
| U06 | usability | Install the core runtime and the CLI as separate npm dependencies, with the CLI in devDependencies | documented | docs/main/getting-started/installation.md:36-41 |
| U07 | usability | Initialize via the questionnaire and cross-check the detected bundler output directory before the first sync | documented | docs/main/getting-started/installation.md:45-55 |
| U08 | usability | Install platform packages then generate native projects with cap add before attempting any device run | documented | docs/main/getting-started/installation.md:59-70 |
| U09 | usability | Use cap copy for asset-only refreshes after each web rebuild | documented | docs/cli/commands/copy.md:9-15 |
| U10 | usability | Use cap sync when native plugin or dependency state may have changed, because it copies and updates | documented | docs/cli/commands/sync.md:9-15 |
| U11 | usability | Deploy debug builds with cap run after sync, choosing the platform explicitly | documented | docs/cli/commands/run.md:7-15 |
| U12 | usability | Select the right simulator or device with the list, target, target-name, and live-reload flags before each run | documented | docs/cli/commands/run.md:23-36 |
| U13 | usability | Open Xcode or Android Studio through cap open when native debugging or signing needs IDE control | documented | docs/main/basics/workflow.md:55-69 |
| U14 | usability | Produce distributable AAB, APK, or IPA binaries with cap build or native tooling after a clean sync | documented | docs/main/basics/workflow.md:71-81 |
| U15 | usability | For the fastest inner loop, install the Ionic CLI and native-run and drive live reload through ionic cap run with external binding | documented | docs/main/guides/live-reload.md:15-32 |
| U16 | usability | For framework-CLI live reload, bind the dev server to the LAN, set server.url with cleartext, then copy config into native projects | documented | docs/main/guides/live-reload.md:51-60 |
| U17 | usability | Override server.url temporarily with cap run --live-reload instead of editing the root config for one-off sessions | documented | docs/cli/commands/run.md:31-36 |
| U18 | usability | Diagnose a missing web assets directory by correcting webDir rather than creating an empty folder | documented | docs/main/basics/workflow.md:29-31 |
| U19 | usability | Wire copy, sync, and update hooks through package.json scripts to automate repetitive project maintenance | documented | docs/cli/hooks.md:10-19 |
| U20 | usability | Verify that wireless iOS device discovery and deployment work with cap run --target when the Mac and device sit on different subnets | unverified | unverified |

## configuration

| ID | topic | requirement | status | evidence |
| --- | --- | --- | --- | --- |
| C01 | configuration | Know that config file discovery prefers TypeScript, then JavaScript, then JSON, so a leftover higher-priority file silently wins | documented | src/cli/src/config.ts:151-172 |
| C02 | configuration | Install TypeScript locally when using capacitor.config.ts, otherwise config loading fails with an install hint | documented | src/cli/src/config.ts:104-116 |
| C03 | configuration | Set appId, appName, and webDir to values matching the signed identity and the directory that holds the final index.html | documented | docs/main/reference/config.md:35-64 |
| C04 | configuration | Choose loggingBehavior deliberately because production logging can leak data from the device | documented | docs/main/reference/config.md:66-81 |
| C05 | configuration | Use platform-level user agent, background, and debugging overrides only when the global defaults are insufficient | documented | docs/main/reference/config.md:122-269 |
| C06 | configuration | Supply Android signing inputs through buildOptions or CLI flags and review their precedence when producing release artifacts | documented | docs/main/reference/config.md:271-315 |
| C07 | configuration | Point ios.path and ios.scheme at the real native project and target so run and build resolve the correct workspace | documented | docs/main/reference/config.md:336-358 |
| C08 | configuration | Tune iOS navigation and webview behavior such as app-bound domains, preferred content mode, and notification handling before distribution | documented | docs/main/reference/config.md:460-504 |
| C09 | configuration | Configure iOS export method, signing style, certificate, and provisioning profile for automated distribution builds | documented | docs/main/reference/config.md:516-543 |
| C10 | configuration | Treat experimental SPM options as unstable and validate any swift version or package trait change end to end | documented | docs/main/reference/config.md:546-605 |
| C11 | configuration | Keep server.hostname at localhost so secure-context web APIs remain available inside the webview | documented | docs/main/reference/config.md:607-622 |
| C12 | configuration | Avoid custom Android schemes because WebView 117 cannot rewrite URL paths for them | documented | docs/main/reference/config.md:624-648 |
| C13 | configuration | Restrict server.url, cleartext, allowNavigation, errorPath, and appStartPath to development and provide a real error page when needed | documented | docs/main/reference/config.md:650-705 |
| C14 | configuration | Declare Cordova access origins and preferences explicitly and enable failOnUninstalledPlugins to catch broken dependency trees | documented | docs/main/reference/config.md:708-734 |
| C15 | configuration | Pass plugin-specific settings under plugins keyed by class name and enable native overrides only with intent | documented | docs/main/reference/config.md:736-744 |
| C16 | configuration | Use platform-level includePlugins over the global list when native dependency sets must differ per platform | documented | src/cli/src/plugin.ts:45-54 |
| C17 | configuration | Remember that the native capacitor.config.json is regenerated from the root config with buildOptions stripped, so secrets never land in native assets | documented | src/cli/src/tasks/copy.ts:157-169 |
| C18 | configuration | Export environment-specific config from TypeScript by branching on NODE_ENV and prefix every copy and run command with the same variable | documented | docs/main/guides/environment-specific-configurations.md:167-223 |
| C19 | configuration | Automate bulk native project edits through the Trapeze project API or YAML configuration instead of manual IDE clicks | documented | docs/main/guides/automated-configuration.md:17-19 |
| C20 | configuration | Verify whether experimental SPM packageOptions aliases survive a major Capacitor upgrade without recreating the native iOS project | unverified | unverified |

## implementation

| ID | topic | requirement | status | evidence |
| --- | --- | --- | --- | --- |
| I01 | implementation | Inject global stub, bridge script, then plugin shims before app code so registerPlugin sees a populated global | documented | `src-head/ARCHITECTURE.md:267-291` |
| I02 | implementation | Keep the app-imported core module separate from the native-injected bridge IIFE | documented | `src-head/ARCHITECTURE.md:55-66` |
| I03 | implementation | Send exactly one options object with callbackId, pluginId, methodName, and options | documented | `src/core/src/definitions-internal.ts:94-100` |
| I04 | implementation | Return callbackId, success, data or error, and save from native results | documented | `src/core/src/definitions-internal.ts:118-126` |
| I05 | implementation | Serialize Android-bound calls to a JSON string on androidBridge.postMessage | documented | `src/core/native-bridge.ts:923-931` |
| I06 | implementation | Post a real object with default type message to the iOS webkit bridge handler | documented | `src/core/native-bridge.ts:932-942` |
| I07 | implementation | Randomize the callback id counter so stale results cannot collide after reload | documented | `src/core/native-bridge.ts:908-911` |
| I08 | implementation | Store resolve/reject or callback keyed by callbackId before posting | documented | `src/core/native-bridge.ts:997-1012` |
| I09 | implementation | Delete a promise callback after its single settlement and rehydrate errors onto cap.Exception | documented | `src/core/native-bridge.ts:1073-1084` |
| I10 | implementation | Delete stored callbacks on save false and purge removeListener bookkeeping to avoid leaks | documented | `src/core/native-bridge.ts:1090-1092` |
| I11 | implementation | Wrap toNative in nativePromise so plugin methods get a Promise API | documented | `src/core/native-bridge.ts:1114-1121` |
| I12 | implementation | Return a Proxy from registerPlugin so methods are materialized lazily | documented | `src/core/src/runtime.ts:160-179` |
| I13 | implementation | Choose nativePromise or nativeCallback per method from PluginHeader rtype | documented | `src/core/src/runtime.ts:78-98` |
| I14 | implementation | Manage web listener registration, retention, and window listener cleanup in WebPlugin | documented | `src/core/src/web-plugin.ts:14-69` |
| I15 | implementation | Register core plugins with a web factory through the same registerPlugin API | documented | `src/core/src/core-plugins.ts:152-154` |
| I16 | implementation | Restrict bridge payloads to JSON-representable values | documented | `docs/main/reference/core-apis/data-types.md:9` |
| I17 | implementation | Expose a Swift plugin as CAPPlugin plus CAPBridgedPlugin with identifier, jsName, and pluginMethods | documented | `docs/plugins/creating-plugins/ios-guide.md:50-68` |
| I18 | implementation | Validate CAPBridgedPlugin conformance, load, and export JS for a registered iOS plugin instance | documented | `src/ios/Capacitor/Capacitor/CapacitorBridge.swift:372-389` |
| I19 | implementation | Annotate an Android Plugin subclass with CapacitorPlugin and each entry point with PluginMethod | documented | `docs/plugins/creating-plugins/android-guide.md:45-64` |
| I20 | implementation | Verify the CLI-generated capacitor.plugins.json classpath for a published plugin is correct | unverified | unverified |

## logs-errors

| ID | topic | requirement | status | evidence |
| --- | --- | --- | --- | --- |
| E01 | logs-errors | Gate iOS native diagnostics through CAPLog with a global switch | documented | `src/ios/Capacitor/Capacitor/CAPLog.swift:1-11` |
| E02 | logs-errors | Emit Android logs at the Capacitor tag through level methods that honor config | documented | `src/android/capacitor/src/main/java/com/getcapacitor/Logger.java:84-102` |
| E03 | logs-errors | Build subtag strings with Logger.tags to identify the emitting plugin component | documented | `src/android/capacitor/src/main/java/com/getcapacitor/Logger.java:28-34` |
| E04 | logs-errors | Detect a missing native-bridge.js asset and throw errorExportingCoreJS | documented | `src/ios/Capacitor/Capacitor/JSExport.swift:24-35` |
| E05 | logs-errors | Interpret the iOS FATAL ERROR block and its npx capacitor copy remedy | documented | `src/ios/Capacitor/Capacitor/CapacitorBridge.swift:185-200` |
| E06 | logs-errors | Recognize the Android export failure message that disables the whole app | documented | `src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:1038-1040` |
| E07 | logs-errors | Diagnose missing or malformed config files from iOS startup warnings | documented | `src/ios/Capacitor/Capacitor/CAPBridgeViewController.swift:341-359` |
| E08 | logs-errors | Diagnose a missing web root from the iOS load error and exit path | documented | `src/ios/Capacitor/Capacitor/CAPBridgeViewController.swift:361-373` |
| E09 | logs-errors | Forward uncaught JS errors as js.error only when DEBUG is enabled | documented | `src/core/native-bridge.ts:944-973` |
| E10 | logs-errors | Read the iOS STARTUP JS ERROR block with message, URL, and line position | documented | `src/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift:340-356` |
| E11 | logs-errors | Find Android JavaScript errors in Logger output from postMessage | documented | `src/android/capacitor/src/main/java/com/getcapacitor/MessageHandler.java:82-95` |
| E12 | logs-errors | Preserve stack and instanceof by copying error fields onto cap.Exception | documented | `src/core/native-bridge.ts:1057-1072` |
| E13 | logs-errors | Warn rather than throw when a result arrives with no stored callback | documented | `src/core/native-bridge.ts:1085-1088` |
| E14 | logs-errors | Detect an unknown iOS plugin from the log because the promise stays pending | documented | `src/ios/Capacitor/Capacitor/CapacitorBridge.swift:500-503` |
| E15 | logs-errors | Detect an unknown Android plugin because errorCallback rejects the call | documented | `src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:826-829` |
| E16 | logs-errors | Interpret the iOS missing selector log and its @objc guidance | documented | `src/ios/Capacitor/Capacitor/CapacitorBridge.swift:518-525` |
| E17 | logs-errors | Detect non-serializable iOS plugin results from the JSResult log and empty payload | documented | `src/ios/Capacitor/Capacitor/JS.swift:60-75` |
| E18 | logs-errors | Resolve iOS plugin not implemented with sync, Podfile checks, and WKAppBoundDomains review | documented | `docs/main/ios/troubleshooting.md:88-98` |
| E19 | logs-errors | Resolve Android plugin not implemented with sync, Gradle sync, and automatic loading checks | documented | `docs/main/android/troubleshooting.md:109-121` |
| E20 | logs-errors | Determine the exact unified-logging subsystem and category emitted by CAPLog on iOS 16 | unverified | unverified |

## telemetry

| ID | topic | requirement | status | evidence |
| --- | --- | --- | --- | --- |
| T01 | telemetry | Trigger collection only after a CLI command completes, so failed runs never enroll a machine | documented | src/cli/src/telemetry.ts:157 |
| T02 | telemetry | Auto-enroll on the first successful interactive command by writing the consent flag | documented | src/cli/src/telemetry.ts:154 |
| T03 | telemetry | Support opt-out via `npx cap telemetry off` from the project root | documented | docs/cli/telemetry.md:33 |
| T04 | telemetry | Support a status query via bare `npx cap telemetry` | documented | docs/cli/telemetry.md:42 |
| T05 | telemetry | Support re-enrollment via `npx cap telemetry on` | documented | docs/cli/telemetry.md:48 |
| T06 | telemetry | Suppress all collection in non-interactive environments such as CI servers | documented | docs/cli/telemetry.md:12 |
| T07 | telemetry | Gate every send on both a TTY and an absent CI flag, not just the stored preference | documented | src/cli/src/util/term.ts:31 |
| T08 | telemetry | Report only the documented field set: time, command, duration, error, ids, OS, versions | documented | docs/cli/telemetry.md:20 |
| T09 | telemetry | Emit a typed metric with name, timestamp, session id and fixed source on the wire | documented | src/cli/src/telemetry.ts:33 |
| T10 | telemetry | Reuse one anonymous UUID per machine as the session identifier | documented | src/cli/src/sysconfig.ts:44 |
| T11 | telemetry | Derive a one-way project id from the first git commit, tolerating its absence | documented | src/cli/src/telemetry.ts:313 |
| T12 | telemetry | Persist consent as an optional boolean so undefined distinguishes no choice from off | documented | src/cli/src/sysconfig.ts:13 |
| T13 | telemetry | Locate the consent state in `sysconfig.json` under the CLI environment config path | documented | src/cli/src/sysconfig.ts:10 |
| T14 | telemetry | Null every option value outside a closed allowlist while keeping option names | documented | src/cli/src/telemetry.ts:181 |
| T15 | telemetry | Keep only platform positional arguments and drop user content such as app names | documented | src/cli/src/telemetry.ts:71 |
| T16 | telemetry | Scrub redacted values, arguments and signing credentials out of rethrown error text | documented | src/cli/src/telemetry.ts:234 |
| T17 | telemetry | Collapse dependency specs that can carry tokens or local paths to `non-registry` | documented | src/cli/src/telemetry.ts:265 |
| T18 | telemetry | Deliver metrics through a detached forked process so upload cannot block the command | documented | src/cli/src/ipc.ts:22 |
| T19 | telemetry | Reject anything other than on or off as a fatal argument | documented | src/cli/src/tasks/telemetry.ts:32 |
| T20 | telemetry | Know the retention period and geographic storage of collected metrics | unverified | unverified |

## performance

| ID | topic | requirement | status | evidence |
| --- | --- | --- | --- | --- |
| P01 | performance | Enforce a minimum WebView version that cannot be set below the Capacitor floor | documented | docs/main/reference/config.md:244 |
| P02 | performance | Diagnose a blank screen on old Android emulators as a WebView version problem | documented | docs/main/getting-started/faqs.md:64 |
| P03 | performance | Serve bundled assets from a virtual https origin to preserve the Same-Origin policy | documented | src/android/capacitor/src/main/java/com/getcapacitor/WebViewLocalServer.java:40 |
| P04 | performance | Keep work in the asset path handler minimal because the WebView may parallelize it | documented | src/android/capacitor/src/main/java/com/getcapacitor/WebViewLocalServer.java:67 |
| P05 | performance | Keep the local hostname at localhost so secure-context web APIs remain available | documented | docs/main/reference/config.md:607 |
| P06 | performance | Avoid custom Android schemes that break routing on WebView 117 and later | documented | docs/main/reference/config.md:637 |
| P07 | performance | Restrict server url and cleartext settings to live reload rather than production | documented | docs/main/reference/config.md:649 |
| P08 | performance | Run native plugin calls on a dedicated Android HandlerThread instead of the UI thread | documented | src/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:138 |
| P09 | performance | Account for the single serial dispatch queue used by iOS plugin calls | documented | src/ios/Capacitor/Capacitor/CapacitorBridge.swift:126 |
| P10 | performance | Dispatch UI updates to the main queue rather than the plugin execution queue | documented | src/ios/Capacitor/Capacitor/CAPBridgeViewController.swift:283 |
| P11 | performance | Avoid shipping large payloads across the bridge because parsing and transfer degrade performance | documented | docs/apis/http.md:87 |
| P12 | performance | Keep plugin callbacks JSON serializable to avoid failed responses and serialization cost | documented | src/ios/Capacitor/Capacitor/JS.swift:69 |
| P13 | performance | Build web assets before sync because the CLI copies the finished bundle into native projects | documented | docs/main/basics/workflow.md:21 |
| P14 | performance | Enable native fetch patching explicitly since it is disabled by default | documented | docs/apis/http.md:15 |
| P15 | performance | Serialize complex request bodies because native Http accepts only strings or JSON | documented | docs/apis/http.md:236 |
| P16 | performance | Treat Local Storage and IndexedDB as evictable when choosing local persistence | documented | docs/main/guides/storage.md:19 |
| P17 | performance | Use Preferences only for small key/value data to avoid eviction without query cost | documented | docs/main/guides/storage.md:21 |
| P18 | performance | Choose SQLite for large or high-performance data sets | documented | docs/main/guides/storage.md:48 |
| P19 | performance | Build games on WebGL or canvas with a game engine for high-performance rendering | documented | docs/main/guides/games.md:9 |
| P20 | performance | Establish a measured bundle-size budget and quantized bridge latency target | unverified | unverified |

## security

| ID | topic | requirement | status | evidence |
| --- | --- | --- | --- | --- |
| S01 | security | Requires no secret API keys, encryption keys, or sensitive values in shipped app code because static analysis recovers them | documented | docs/main/guides/security.md:23 |
| S02 | security | Requires auditing build-time environment-variable plugins so they do not inline sensitive values into the bundle | documented | docs/main/guides/security.md:23 |
| S03 | security | Requires moving secret-dependent operations to a server or serverless function that holds the secret | documented | docs/main/guides/security.md:25 |
| S04 | security | Requires persisted client tokens or keys to be memory-only or stored through native secure hardware | documented | docs/main/guides/security.md:27 |
| S05 | security | Requires using iOS Keychain Services and Android Keystore through a plugin rather than custom plaintext storage | documented | docs/main/guides/security.md:33 |
| S06 | security | Requires enterprise key and token management through Identity Vault when using Capacitor enterprise products | documented | docs/main/guides/security.md:35 |
| S07 | security | Requires never sending sensitive data through a custom URL scheme deep link | documented | docs/main/guides/security.md:41 |
| S08 | security | Requires PKCE for every OAuth2 flow because the return leg is a deep link | documented | docs/main/guides/security.md:43 |
| S09 | security | Requires verifying that the chosen auth plugin supports PKCE before adoption | documented | docs/main/guides/security.md:45 |
| S10 | security | Requires Universal Links or App Links over custom schemes because domain ownership prevents impersonation | documented | docs/main/guides/deep-links.md:20 |
| S11 | security | Requires hosting apple-app-site-association over HTTPS and enabling Associated Domains | documented | docs/main/guides/deep-links.md:223 |
| S12 | security | Requires an applinks domain entry in the Xcode Associated Domains capability | documented | docs/main/guides/deep-links.md:227 |
| S13 | security | Requires hosting assetlinks.json generated from the app package and SHA256 fingerprint | documented | docs/main/guides/deep-links.md:255 |
| S14 | security | Requires an android:autoVerify intent filter with an HTTPS data host for App Links | documented | docs/main/guides/deep-links.md:284 |
| S15 | security | Requires validating the incoming URL before routing from the appUrlOpen listener | documented | docs/main/guides/deep-links.md:39 |
| S16 | security | Requires only HTTPS endpoints so credentials are never sent in plain text | documented | docs/main/guides/security.md:55 |
| S17 | security | Requires keeping server.cleartext disabled outside live-reload development | documented | docs/main/reference/config.md:669 |
| S18 | security | Requires keeping android.allowMixedContent at its secure false default | documented | docs/main/reference/config.md:176 |
| S19 | security | Requires a restrictive Content Security Policy in a head meta tag or equivalent server header | documented | docs/main/guides/security.md:63 |
| S20 | security | Requires a documented mandatory certificate-pinning policy enforced for every endpoint | unverified | unverified |

## lint

| ID | topic | requirement | status | evidence |
| --- | --- | --- | --- | --- |
| L01 | lint | Requires the aggregate npm run lint gate combining ESLint, Prettier check, and SwiftLint | documented | src/package.json:20 |
| L02 | lint | Requires npm run fmt as the single autofix path for all three linters | documented | src/package.json:21 |
| L03 | lint | Requires the Prettier glob over css/html/java/js/mjs/ts with prettier-plugin-java | documented | src/package.json:22 |
| L04 | lint | Requires excluding generated native-bridge.js assets from lint and format passes | documented | src/.eslintignore:5 |
| L05 | lint | Requires ESLint to extend the pinned @ionic/eslint-config/recommended ruleset | documented | src/package.json:29 |
| L06 | lint | Requires ESLint to scan TypeScript files via the --ext ts flag | documented | src/package.json:23 |
| L07 | lint | Requires noImplicitAny so implicit any types fail compilation | documented | src/core/tsconfig.json:10 |
| L08 | lint | Requires noUnusedLocals so dead locals fail the build | documented | src/core/tsconfig.json:11 |
| L09 | lint | Requires noUnusedParameters so an unused parameter fails the build rather than only lint | documented | src/core/tsconfig.json:12 |
| L10 | lint | Requires SwiftLint to extend the shared @ionic/swiftlint-config rules | documented | src/swiftlint.config.js:2 |
| L11 | lint | Requires SwiftLint scope to the three iOS trees while excluding tests and frameworks | documented | src/swiftlint.config.js:3 |
| L12 | lint | Requires opt-in Swift rules such as force_unwrapping, modifier_order, and unused_import to pass | documented | src-head/AGENTS.md:150 |
| L13 | lint | Requires a scoped swiftlint:disable with a reason for any intentional violation | documented | src-head/AGENTS.md:155 |
| L14 | lint | Requires Conventional Commits with the breaking marker after the scope so Lerna detects it | documented | src-head/AGENTS.md:211 |
| L15 | lint | Requires keeping Swift 5 language mode despite a version 6 tools declaration | documented | src-head/AGENTS.md:164 |
| L16 | lint | Requires GCD-based concurrency with no async/await, actor, or Sendable in unrelated changes | documented | src-head/AGENTS.md:173 |
| L17 | lint | Requires Java sources to be formatted with prettier-plugin-java rather than by hand | documented | src-head/AGENTS.md:201 |
| L18 | lint | Requires Android lint abortOnError and warningsAsErrors against a checked-in baseline so new warnings fail | documented | src/android/capacitor/build.gradle:59 |
| L19 | lint | Requires rebuilding and committing both generated native-bridge.js copies after editing the bridge source | documented | src-head/AGENTS.md:247 |
| L20 | lint | Requires a mandatory PR checklist enforcing changelog fragments and reviewer sign-off | unverified | unverified |

## Sources

- https://capacitorjs.com/docs
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/cli
- https://capacitorjs.com/docs/cli/telemetry
- https://capacitorjs.com/docs/guides/security
- https://github.com/ionic-team/capacitor/tree/8.6.2
- https://github.com/ionic-team/capacitor-docs/tree/main/versioned_docs/version-v8
- https://registry.npmjs.org/@capacitor/core
- https://nodejs.org/
