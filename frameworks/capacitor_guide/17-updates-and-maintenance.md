# 17 - Updates and maintenance

Capacitor ships frequent majors, and the team states plainly that the newest version is recommended for features, fixes, and stability (`docs/main/reference/support-policy.mdx:17-19`). Maintenance means critical bug and security fixes only, with no major feature work; extended support is no longer offered to new customers (`docs/main/reference/support-policy.mdx:34-35`).

## Support and toolchain matrix

At tag 8.6.2 the policy table lists v8 as Active (released December 8, 2025), v7 as Extended Support (maintenance ended June 8, 2026, extended support ends December 8, 2026), and v1 through v6 as End of Support (`docs/main/reference/support-policy.mdx:21-32`). Branch maintenance in the repository agrees: only `main`, `next`, and `7.x` are live, while `6.x` and older are marked not maintained (`src/CONTRIBUTING.md:74-84`).

Capacitor 8 requires Node 22, Xcode 26.0, and Android Studio 2025.2.1 (`docs/main/reference/support-policy.mdx:41-48`). Its platform floors are iOS 15.0 and Android 7.0 (API 24) (`docs/main/reference/support-policy.mdx:50-61`). Reproduce these locally: CI uses Node 22.x for every job and Android JDK 21 (`src/.github/workflows/ci.yml:24-26`, `src/.github/workflows/ci.yml:129-133`). The repository pins its own version at `8.6.2` and permits releases only from `main` with conventional commits (`src/lerna.json:6-15`). Review project dependencies quarterly, as the policy recommends (`docs/main/reference/support-policy.mdx:37-39`).

## Update procedure

Keep `@capacitor/core`, platform packages, CLI, and official plugins on aligned versions. The 8.5 notes show the canonical bump:

(`docs/main/updating/8-5.md:28-29`)
```bash
npm i @capacitor/core@^8.5.0 @capacitor/ios@^8.5.0
npm i -D @capacitor/cli@^8.5.0
```

Then run `npx cap sync` to write the versions into the native projects. Migration between majors is CLI-assisted: install the matching CLI line and run `npx cap migrate`, which reports any step it could not complete so it can be done manually (`docs/main/updating/8-0.md:37-51`, `docs/main/updating/7-0.md:26-40`). Do not treat `cap sync` as an upgrade: it copies web assets and plugin state into an existing native project, whereas migrations change build settings, manifests, and project files.

## Major 8.0

Node 22 or greater is mandatory, Xcode 26.0+ and Android Studio Otter 2025.2.1+ are required, and the iOS deployment target rises to 15.0 including the Podfile `platform` line (`docs/main/updating/8-0.md:33-35`, `docs/main/updating/8-0.md:57-69`). Config changes: the iOS `appendUserAgent` whitespace bug is fixed, `android.adjustMarginsForEdgeToEdge` is removed in favour of the System Bars plugin and `env`/CSS variables, and CLI-created iOS projects default to SPM (`docs/main/updating/8-0.md:12-23`). The Android resource `bridge_layout_main.xml` becomes `capacitor_bridge_layout_main.xml`, and iOS notifications for `viewDidAppear` and `viewWillTransition` are now emitted by `CAPBridgeViewController` (`docs/main/updating/8-0.md:25-31`).

Android project work is substantial: raise `minSdkVersion` to 24 and both `compileSdkVersion` and `targetSdkVersion` to 36, raise the AndroidX and Cordova variables listed in the guide, upgrade AGP to 8.13.0 and the wrapper to 8.14.3, bump `google-services` to 4.4.4 and Kotlin to 2.2.20, replace deprecated Gradle property syntax with `=`, and add `density` to `configChanges` so resizing does not reload the Web View (`docs/main/updating/8-0.md:71-174`). Plugin versions move to 8.0.0, and the guide enumerates per-plugin variable and behaviour changes, including Geolocation timeouts and Android 16 orientation limits for Barcode Scanner and Screen Orientation (`docs/main/updating/8-0.md:176-230`).

## Minor 8.5: UIScene

Capacitor 8.5 adopts the iOS UIScene lifecycle. Xcode 27 requires it, so this ships as a breaking minor; updating dependencies alone does not break an app, but building with Xcode 27 requires a scene delegate, an Info.plist manifest entry, and an AppDelegate hook (`docs/main/updating/8-5.md:9-11`). `SceneDelegateProxy` mirrors `ApplicationDelegateProxy` for URL opens, universal links, and scene connection; legacy `.capacitorOpenURL` and `.capacitorOpenUniversalLink` notifications keep their payloads, while new scene-scoped notifications carry the originating `UIScene` and only exist on 8.5 and later (`docs/main/updating/8-5.md:13-21`). JS `pause` and `resume` now follow scene activation state (`docs/main/updating/8-5.md:18`). `TmpViewController` and `CapacitorBridge.tmpWindow` are removed (`docs/main/updating/8-5.md:21`).

Migration steps: add `SceneDelegate.swift` that creates the window and calls `SceneDelegateProxy.shared` for connect, URL contexts, and user-activity continuation; add the `UIApplicationSceneManifest` with `Default Configuration`; add the `configurationForConnecting` hook to AppDelegate; register the file in the Xcode target; then `npx cap sync ios` (`docs/main/updating/8-5.md:32-108`). Audit custom code: URL and lifecycle methods on AppDelegate stop firing under the scene manifest, `UIApplication.shared.applicationState` should become scene `activationState`, and removed-API references must go (`docs/main/updating/8-5.md:110-118`). Verify cold and warm custom-scheme opens, universal links, and the JS lifecycle events on a device (`docs/main/updating/8-5.md:120-127`). `npx cap migrate` handles template-shaped projects; hand-rolled delegates need the manual path or the migration skill (`docs/main/updating/8-5.md:129-142`).

## Maintenance hygiene

Telemetry became opt-out in 7.0 and never runs in non-interactive environments; `npx cap telemetry off` disables it (`docs/main/updating/7-0.md:21-24`). Keep release discipline intact: conventional commits feed generated changelogs, so a breaking marker in the wrong position is missed by Lerna and disappears from the changelog (`src-head/AGENTS.md:222-228`). Main-branch guidance also requires committing generated bridge assets after touching the bridge source and regenerating committed plugin docs when an interface changes (`src-head/AGENTS.md:247-250`, `src-head/AGENTS.md:299-304`); that guidance is for the main branch, not tag 8.6.2. Always run lint and the platform verification commands before declaring an upgrade complete, and report actual results (`src-head/AGENTS.md:328-340`).

## Sources
- https://capacitorjs.com/docs/main/reference/support-policy
- https://capacitorjs.com/docs/updating/8-0
- https://capacitorjs.com/docs/updating/8-5
- https://capacitorjs.com/docs/updating/7-0
- https://capacitorjs.com/docs/cli/commands/update
- https://registry.npmjs.org/@capacitor/core
- https://registry.npmjs.org/@capacitor/cli
- https://registry.npmjs.org/@capacitor/ios
- https://registry.npmjs.org/@capacitor/android
- https://nodejs.org/
- https://developer.apple.com/documentation/xcode
- https://developer.android.com/studio/releases
- https://github.com/ionic-team/capacitor
