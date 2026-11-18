# 03 - Configuration deep

The Capacitor config controls tooling, not native behavior; native settings stay in platform files. Treat it as evaluated input: the CLI resolves file format, environment, and per-platform overrides before any command runs.

## File discovery and evaluation

Three file names are checked in order: `.ts`, `.js`, `.json`; a higher-priority file silently wins (`src/cli/src/config.ts:30-32`, `src/cli/src/config.ts:151-172`). TS requires a local compiler; missing JSON becomes `{}`, so a filename typo yields defaults, not an error (`src/cli/src/config.ts:98-149`). `init` writes TS only for a new config in a TS project and merges otherwise (`src/cli/src/tasks/init.ts:35-60`, `src/cli/src/tasks/init.ts:147-152`). Inspect all resolved values, including lazy native paths, with `npx cap config --json` (`src/cli/src/tasks/config.ts:6-13`, `src/cli/src/index.ts:43-52`). Typing comes from the CLI interface (`docs/main/reference/config.md:30-34`).

## Global fields and precedence

`appId` becomes the iOS bundle ID and Android application ID, `appName` is the human label, and `webDir` must hold the final `index.html` (`docs/main/reference/config.md:35-64`). Logging is build-configuration gated:

(`docs/main/reference/config.md:66-81`)
```text
  /**
   * The build configuration (as defined by the native app) under which Capacitor
   * will send statements to the log system. This applies to log statements in
   * native code as well as statements redirected from JavaScript (`console.debug`,
   * `console.error`, etc.). Enabling logging will let statements render in the
   * Xcode and Android Studio windows but can leak information on device if enabled
   * in released builds.
   *
   * 'none' = logs are never produced
   * 'debug' = logs are produced in debug builds but not production builds
   * 'production' = logs are always produced
   *
   * @since 3.0.0
   * @default debug
   */
  loggingBehavior?: 'none' | 'debug' | 'production';
```

Global `overrideUserAgent`, `appendUserAgent`, `backgroundColor`, `zoomEnabled`, and `initialFocus` are defaults that platform blocks may replace (`docs/main/reference/config.md:83-120`). Android adds `path`, `allowMixedContent`, `webContentsDebuggingEnabled`, `minWebViewVersion`, `flavor`, and `useLegacyBridge` (`docs/main/reference/config.md:122-334`). iOS adds `path`, `scheme`, `contentInset`, `scrollEnabled`, `limitsNavigationsToAppBoundDomains`, `preferredContentMode`, and `handleApplicationNotifications` (`docs/main/reference/config.md:336-544`). In source, absent `path` resolves to `android` or `ios`, absent scheme to `App`, and `flavor` to an empty string that also changes the APK output path (`src/cli/src/config.ts:205-220`, `src/cli/src/config.ts:265-286`). Scheme and flavor are honored by `run` and `build` when CLI flags are absent (`src/cli/src/ios/run.ts:30-31`, `src/cli/src/tasks/build.ts:41-57`).

## Server and loading

`server.hostname` should stay `localhost` because secure-context APIs such as geolocation and `getUserMedia` depend on it; `iosScheme` defaults to `capacitor` and cannot reuse http or https, while `androidScheme` defaults to `https` because custom Android schemes break path routing from WebView 117 onward (`docs/main/reference/config.md:607-648`). `url`, `cleartext`, `allowNavigation`, `errorPath`, and `appStartPath` cover live-reload targets, cleartext HTTP, external navigation, custom error pages, and non-root startup paths (`docs/main/reference/config.md:650-705`). The first three are development-only; `server.url` also suppresses the missing-webDir check (`src/cli/src/common.ts:24-28`, `src/cli/src/tasks/copy.ts:175-184`). Live reload writes only this field into each native `capacitor.config.json` and restores the original bytes on exit (`src/cli/src/util/livereload.ts:144-179`).

## Plugin, Cordova, and include lists

`plugins` is keyed by plugin class name and supplies arbitrary plugin options; typed entries exist for `CapacitorCookies`, `CapacitorHttp`, and `SystemBars` (`docs/main/reference/config.md:736-744`, `docs/main/reference/config.md:758-861`). `includePlugins` narrows `sync` discovery to named packages; without it the CLI scans `package.json` dependencies, and platform-level lists win over the global list:

(`src/cli/src/plugin.ts:45-54`)
```typescript
export function getIncludedPluginPackages(config: Config, platform: string): readonly string[] | undefined {
  const { extConfig } = config.app;

  switch (platform) {
    case 'android':
      return extConfig.android?.includePlugins ?? extConfig.includePlugins;
    case 'ios':
      return extConfig.ios?.includePlugins ?? extConfig.includePlugins;
  }
}
```

Unresolved names fail hard rather than being skipped (`src/cli/src/plugin.ts:56-68`). The `cordova` block controls `accessOrigins`, arbitrary `preferences`, and `failOnUninstalledPlugins`, which turns missing transitive Cordova dependencies into a sync failure (`docs/main/reference/config.md:708-734`). Experimental `ios.spm` settings cover `swiftToolsVersion`, `packageTraits`, and `packageOptions` and are explicitly unstable (`docs/main/reference/config.md:546-605`).

## Build options and native artifacts

Android `buildOptions` carry keystore path, passwords, alias, `releaseType` (AAB or APK), and `signingType` (jarsigner or apksigner); iOS carries `signingStyle`, `exportMethod`, `signingCertificate`, and `provisioningProfile` (`docs/main/reference/config.md:271-315`, `docs/main/reference/config.md:516-543`). Explicit CLI flags beat config values, and defaults fill remaining gaps (`src/cli/src/tasks/build.ts:41-57`). Before build artifacts exist, `copy` writes a sanitized `capacitor.config.json` into the native assets folder and deletes both `buildOptions` sub-objects (`src/cli/src/tasks/copy.ts:157-169`). Tool paths can be overridden with `CAPACITOR_ANDROID_STUDIO_PATH` and `CAPACITOR_COCOAPODS_PATH`, read at config load time (`docs/main/reference/config.md:878-883`, `src/cli/src/config.ts:368-370`, `src/cli/src/config.ts:421-425`).

## Environment-specific and automated configuration

TypeScript configs can branch on `process.env.NODE_ENV` and spread a base object into variants that select different iOS schemes and Android flavors, with a `switch` symmetrical across `qa` and `default` (`docs/main/guides/environment-specific-configurations.md:167-223`). The same variable must prefix `cap copy` and `cap run`, or the branch changes without native files being refreshed (`docs/main/guides/environment-specific-configurations.md:216-230`). For bulk native edits, `@trapezedev/project` exposes a typed virtual filesystem flushed with `commit()`, and `@trapezedev/configure` applies YAML rules from an npm script (`docs/main/guides/automated-configuration.md:11-19`, `docs/main/guides/automated-configuration.md:53-77`). Any changed `webDir`, scheme, or `server` value needs a fresh `sync`; editing only the root config leaves native copies stale.

## Sources
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/basics/configuring-your-app
- https://capacitorjs.com/docs/guides/environment-specific-configurations
- https://capacitorjs.com/docs/guides/automated-configuration
- https://capacitorjs.com/docs/cli
- https://capacitorjs.com/docs/cli/commands/build
- https://capacitorjs.com/docs/guides/live-reload
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor-docs
- https://github.com/ionic-team/trapeze
- https://developer.apple.com/documentation/uikit/uiscrollview
- https://developer.android.com/reference/android/webkit/WebView
