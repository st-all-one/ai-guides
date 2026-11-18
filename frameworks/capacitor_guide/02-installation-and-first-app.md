# 02 - Installation and first app

Capacitor 8.6.2 wraps an already built web app in a native shell. Setup is a sequence of toolchain gates, config authoring, native project generation, then asset copy. Each step has a distinct failure signature, so diagnose by phase rather than rerunning everything.

## Toolchain gates

Node 22 or higher is mandatory before any CLI work (`docs/main/getting-started/environment-setup.md:11-13`). iOS work needs macOS, Xcode 26.0+, and Xcode Command Line Tools; SPM is the default iOS dependency manager in v8 and CocoaPods is opt-in (`docs/main/getting-started/environment-setup.md:24-63`). Android needs Android Studio 2025.2.1+ plus an SDK platform for API 24 or greater; the JDK is provisioned by Android Studio (`docs/main/getting-started/environment-setup.md:107-129`). The runtime floors are iOS 15 and Android 7 with WebView 60+:

(`docs/main/getting-started/faqs.md:16-26`)
```text
### Official Platforms

Capacitor officially supports the following platforms:
- iOS 15+
- Android 7+
  - Requires Chrome WebView 60+
- Modern Web Browsers
  - Chrome
  - Firefox
  - Safari
  - Edge
```

An emulator running Android 7 often ships an old WebView and renders a blank white screen; use a newer system image (`docs/main/getting-started/faqs.md:64-66`). iOS binaries cannot be produced on non-macOS hosts without a cloud builder, and even then device testing remains local (`docs/main/getting-started/faqs.md:60-62`).

## Scaffold or retrofit

A greenfield app comes from `npm init @capacitor/app@latest` run in an empty directory (`docs/main/getting-started/installation.md:13-19`). Retrofitting requires three artifacts before the CLI can initialize:

(`docs/main/getting-started/installation.md:23-27`)
```text
Capacitor was designed to drop into any modern JavaScript web app. However, your project needs to have the following three requirements in order to use Capacitor with your existing application:

- A `package.json` file
- A separate directory for built web assets such as `dist` or `www`
- An `index.html` file at the root of your web assets directory
```

The generated `index.html` must contain a `<head>` element or plugins will not inject (`docs/main/getting-started/installation.md:29-32`). Install the runtime and CLI separately: `npm i @capacitor/core` and `npm i -D @capacitor/cli` (`docs/main/getting-started/installation.md:34-41`).

## Initialize configuration

`npx cap init` asks for app name and package ID, then writes a config file including the bundler output directory (`docs/main/getting-started/installation.md:43-51`). A brand new project with TypeScript installed gets `capacitor.config.ts`; otherwise JSON is written, and an existing config is merged rather than replaced (`src/cli/src/tasks/init.ts:35-60`, `src/cli/src/tasks/init.ts:147-152`). App IDs must be Java package form with at least two dot-separated segments, each starting with a letter; `--skip-appid-validation` bypasses the check (`src/cli/src/common.ts:120-135`, `src/cli/src/index.ts:64-76`).

When `webDir` is omitted, the CLI matches npm dependencies against known frameworks and takes that framework's directory, highest priority first:

(`src/cli/src/framework-configs.ts:3-15`)
```typescript
const FRAMEWORK_CONFIGS: FrameworkConfig[] = [
  {
    name: 'Angular',
    isMatch: (config) => hasDependency(config, '@angular/cli'),
    webDir: 'dist',
    priority: 3,
  },
  {
    name: 'Create React App',
    isMatch: (config) => hasDependency(config, 'react-scripts'),
    webDir: 'build',
    priority: 3,
  },
```

Unrecognized projects are prompted, defaulting to `www` (`src/cli/src/tasks/init.ts:106-126`). Config loading prefers `capacitor.config.ts`, then `.js`, then `.json`, so a stale higher-priority file silently wins (`src/cli/src/config.ts:151-172`). TypeScript configs require a local typescript install or the CLI fails with an install hint (`src/cli/src/config.ts:98-116`). Cross-check `webDir` at this point; a wrong value is the most common first-sync error (`docs/main/getting-started/installation.md:53-55`).

## Generate and populate native projects

Install `@capacitor/android` and `@capacitor/ios`, then run `npx cap add android` and `npx cap add ios` (`docs/main/getting-started/installation.md:57-70`). `add` refuses to overwrite an existing platform directory and instructs removal first, because native edits are user-owned (`src/cli/src/tasks/add.ts:65-75`). If the web output directory exists, `add` immediately runs a sync; Android also gets `local.properties` generated for Gradle (`src/cli/src/tasks/add.ts:82-90`). Adding iOS with `--packagemanager CocoaPods` switches the template archive from the SPM default (`src/cli/src/index.ts:304-326`). Platform names are validated against `web`, `android`, `ios` and the installed project directories (`src/cli/src/common.ts:283-317`).

Native directories are source assets checked into version control, not disposable build output; platform settings live in `AndroidManifest.xml` and `Info.plist`, edited with native tooling (`docs/main/cordova/index.md:23-29`). Web assets land in `android/app/src/main/assets/public` (`src/cli/src/config.ts:210-218`) and inside the iOS target at `ios/App/App/public` (`src/cli/src/config.ts:339-366`). The config is mirrored into each native project as `capacitor.config.json` with `buildOptions` stripped, so native reads never see signing secrets (`src/cli/src/tasks/copy.ts:157-169`). `sync` is exactly `copy` followed by `update` (`src/cli/src/tasks/sync.ts:10-13`). A missing `webDir` is reported with the literal path and a build hint (`src/cli/src/common.ts:24-55`), but is suppressed when `server.url` is set because no local assets are needed (`src/cli/src/tasks/copy.ts:175-184`).

## Sources
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/getting-started/faqs
- https://capacitorjs.com/docs/basics/workflow
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/cli/commands/add
- https://capacitorjs.com/docs/cli/commands/init
- https://capacitorjs.com/docs/cli/commands/sync
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor-docs
- https://developer.android.com/studio
- https://nodejs.org/
