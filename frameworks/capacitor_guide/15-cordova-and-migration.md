# 15 - Cordova and migration

Capacitor is deliberately backward-compatible: existing Cordova plugins can run beside Capacitor plugins, but Cordova is a compatibility target, not a model for new work. That stance is explicit in main-branch contribution guidance (`src-head/AGENTS.md:29-30`), which is guidance for the main branch, not part of tag 8.6.2. The released behaviour is documented in the Cordova guide and migration guides below.

## Running Cordova plugins on 8.6.2

Installation follows the normal package-manager flow followed by a native sync; an optional `@awesome-cordova-plugins` wrapper adds TypeScript support (`docs/plugins/cordova.md:12-27`):

(`docs/plugins/cordova.md:19-20`)
```bash
npm install cordova-plugin-name
npx cap sync
```

Updates use the same pattern: bump the package, then `npx cap sync` (`docs/plugins/cordova.md:29-36`). `npx cap ls` reports installed Capacitor and Cordova plugins with exact versions, which is the first diagnostic when behaviour differs from the manifest (`docs/plugins/cordova.md:38-44`).

Compatibility is partial by design. Many official Cordova plugins should be replaced by Capacitor alternatives; plugins relying on variables or hooks are at best partially compatible, and some are wholly incompatible (`docs/plugins/cordova.md:46-50`). Capacitor does not execute Cordova install variables, auto-configuration, or hooks: because developers own their native projects, settings must be applied by hand by mapping `plugin.xml` to iOS and Android configuration (`docs/plugins/cordova.md:52-56`). Known-bad plugins are skipped during `npx cap sync`; the list includes `cordova-plugin-ionic-webview` and `cordova-plugin-wkwebview-engine` (Capacitor uses WKWebView), `cordova-plugin-splashscreen` and `cordova-plugin-statusbar` (built-in replacements), `cordova-plugin-crosswalk-webview` (the Web View cannot be swapped), and `cordova-plugin-googlemaps` (iOS build failures) (`docs/plugins/cordova.md:58-80`). A skipped plugin is a silent functional gap unless the app is tested on-device.

Two config knobs are Cordova-specific. `cordova.preferences` carries arbitrary preferences, and `cordova.accessOrigins` populates `<access>` tags; if omitted, a single wildcard `<access origin="*" />` is emitted, so restrict it when a plugin honours the whitelist (`docs/main/reference/config.md:708-723`). At tag 8.6.2 the native runtime still carries Cordova compatibility: `cordovaAndroidVersion` defaults to `14.0.1` and `org.apache.cordova:framework` is a Gradle dependency (`src/android/capacitor/build.gradle:11`, `src/android/capacitor/build.gradle:90`).

## What changes for a Cordova team

Capacitor treats each platform project as a source asset checked into source control and edited in Xcode or Android Studio, not as a generated build artefact (`docs/main/cordova/index.md:23-25`). There is no `config.xml` for platform settings: edit `AndroidManifest.xml` and `Info.plist` directly, and keep Capacitor config for tooling-level options (`docs/main/cordova/index.md:27-29`). Native builds happen in platform tooling or the IDE, not in the Capacitor CLI (`docs/main/cordova/index.md:29`). Plugins ship as CocoaPods or Gradle libraries instead of copied source, and native project settings such as permissions must be added manually (`docs/main/cordova/index.md:38-40`). Plugin JS is registered from native method metadata at runtime, so there is no `deviceready` event (`docs/main/cordova/index.md:42`). The CLI is local to each project and invoked as `npx cap` (`docs/main/cordova/index.md:48-52`). Swift 5 is supported and preferred for iOS plugins, with metadata from macros and annotations rather than `plugin.xml` (`docs/main/cordova/index.md:46`).

## Migration path

Migration can be incremental: Capacitor works alongside Cordova, and Cordova assets may remain when future plugin use is likely (`docs/main/cordova/migration-strategy.md:11-19`, `docs/main/cordova/migrating-from-cordova-to-capacitor.md:155-157`). Work in a separate branch (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:13`). The Ionic VS Code Extension can automate dependency installation and plugin replacement, but the audit is still required (`docs/main/cordova/migration-strategy.md:29-31`).

1. Run `npx cap init`, taking the app name from `<name>` and the bundle ID from the root `<widget id>` in `config.xml` (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:15-26`).
2. Build the web project once so the configured `webDir`, conventionally `www`, exists before platforms are added (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:28-36`).
3. Run `npx cap add ios` and `npx cap add android`. The new top-level `ios/` and `android/` folders are real projects to commit; Cordova plugins already in `package.json` dependencies are installed automatically, minus incompatible ones (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:38-47`).
4. Regenerate icons and splash screens from the existing `resources` folder with `npx @capacitor/assets generate --ios` and `--android` (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:61-72`).
5. Audit plugins: remove what is unused, prefer official or community Capacitor equivalents, and expect feature gaps in some replacements (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:74-82`). Uninstall a replaced plugin and re-sync so its native code is removed (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:84-91`).
6. Map permissions manually from `plugin.xml` into iOS and Android settings; initial Capacitor permissions are already present (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:93-95`). `cap init` ports `config.xml` preferences into `cordova.preferences`, and more can be added by hand (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:97-110`).
7. Review remaining `config.xml` elements. Most `allow-intent` values are unused or have alternatives, `edit-config` targets must be applied in `Info.plist`, and the Author element is not used (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:112-141`).

One migration trap is the origin-bound Web View scheme. Cordova's `cordova-plugin-ionic-webview` used `ionic://` on iOS while Capacitor defaults to `capacitor://`, so `localStorage` and other origin-scoped data appear lost after migration; setting `server.iosScheme` to `ionic` preserves the origin (`docs/main/cordova/migrating-from-cordova-to-capacitor.md:143-153`). This is a compatibility lever, not a long-term security boundary: the config reference warns that non-HTTP/HTTPS Android schemes have been unable to change URL paths since WebView 117 (`docs/main/reference/config.md:637-648`).

## Sources
- https://capacitorjs.com/docs/plugins/cordova
- https://capacitorjs.com/docs/cordova
- https://capacitorjs.com/docs/cordova/migrating-from-cordova-to-capacitor
- https://capacitorjs.com/docs/cordova/migration-strategy
- https://capacitorjs.com/docs/plugins
- https://capacitorjs.com/docs/config
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/cordova-plugin-ionic-webview
- https://registry.npmjs.org/@capacitor/core
- https://github.com/ionic-team/capacitor-docs
