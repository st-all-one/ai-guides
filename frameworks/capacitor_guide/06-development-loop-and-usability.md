# 06 - Development loop and usability

Capacitor's daily rhythm is web build, asset copy, native run. Latency comes from rebuilding native binaries, so live reload and target selection matter more than any single API.

## The inner loop

Build the web app for distribution with the framework's own command, then push it into the native projects with `npx cap sync`, which copies the built bundle and updates native dependencies (`docs/main/basics/workflow.md:11-27`). Deploy a debug build with `npx cap run ios` or `npx cap run android`, or open Xcode and Android Studio directly for full native control (`docs/main/basics/workflow.md:34-69`). A missing web assets directory produces an error naming the resolved path; fix `webDir` in the config rather than creating an empty folder (`docs/main/basics/workflow.md:29-31`, `src/cli/src/common.ts:24-55`).

Computed command sequence for a normal iteration; the second line is needed only when plugin or native dependency state changed:

```bash
npm run build
npx cap sync
npx cap run android --target <device-id>
```

## Live reload paths

Live reload avoids a fresh binary on every edit; a physical device must share the Wi-Fi network with the host (`docs/main/guides/live-reload.md:9-13`). The Ionic CLI automates the whole sequence: install `@ionic/cli` and `native-run` globally, then `ionic cap run android -l --external` or `ionic cap run ios -l --external`, which builds, copies, and opens the IDE while creating a temporary `server` entry that is removed on exit (`docs/main/guides/live-reload.md:15-32`).

With a framework CLI, discover the LAN address (`ifconfig` on macOS, `ipconfig` on Windows), bind the dev server to `0.0.0.0`, then point the native config at it. The required entry is:

(`docs/main/guides/live-reload.md:54-57`)
```text
"server": {
  "url": "http://192.168.1.68:8100",
  "cleartext": true
},
```

Follow that with `npx cap copy` so the modified config reaches each native project, open the IDE, and press Run (`docs/main/guides/live-reload.md:60-69`). Never commit this `server` block to source control (`docs/main/guides/live-reload.md:71-71`).

The Capacitor CLI can inject the URL itself with `npx cap run --live-reload --port 8100` (`docs/main/guides/live-reload.md:73-77`). `--host`, `--https`, and `--forwardPorts <port1:port2>` control the host, scheme, and `adb reverse` behavior; `-l` is the short form (`docs/cli/commands/run.md:31-36`). Internally, a missing host falls back to a detected LAN address and an unset port defaults to 3000, then only `server.url` is patched into the native `capacitor.config.json`; on Ctrl+C the original JSON is restored (`src/cli/src/tasks/run.ts:45-48`, `src/cli/src/util/livereload.ts:144-179`). If the run throws, the revert still happens (`src/cli/src/tasks/run.ts:118-127`). `server.url` also relaxes the webDir existence check, which makes a pure live-reload project possible without local assets (`src/cli/src/tasks/copy.ts:175-184`).

## Debugging and target selection

Use `--list` to enumerate devices before choosing `--target`, `--target-name`, or `--target-name-sdk-version` when several simulators share a name (`docs/cli/commands/run.md:24-30`). `native-run` returns physical devices first, then virtual ones, and surfaces structured errors with codes (`src/cli/src/util/native-run.ts:26-65`). `--no-sync` skips the copy/update phase when assets are already current (`docs/cli/commands/run.md:25-25`). For WebView inspection, `webContentsDebuggingEnabled` enables debuggable content, defaulting to development builds, and `--inline` embeds JS source maps for Chromium-based debugging (`docs/main/reference/config.md:194-202`, `docs/cli/commands/copy.md:21-23`). Native debugging stays in Xcode or Android Studio after `cap open`; `serve` no longer starts a browser PWA (`src/cli/src/tasks/serve.ts:4-9`).

## Failure modes

- Plugins silently do nothing when `index.html` lacks a `<head>` tag (`docs/main/getting-started/installation.md:29-32`).
- A config edit without `copy` leaves native files stale; only `sync` refreshes dependencies as well (`docs/cli/commands/copy.md:9-15`).
- Mixed content and cleartext HTTP are development-only switches; production should keep `allowMixedContent` and `server.cleartext` false (`docs/main/reference/config.md:168-181`, `docs/main/reference/config.md:661-674`).
- Non-http Android schemes break URL path routing from WebView 117 onward, so keep `androidScheme` at its default (`docs/main/reference/config.md:637-648`).
- A committed live-reload `server.url` ships a development endpoint inside the binary (`docs/main/guides/live-reload.md:71-71`).
- An old Android 7 emulator renders blank because its WebView is below 60 (`docs/main/getting-started/faqs.md:64-66`).
- iOS builds cannot be produced or tested locally without macOS and Xcode (`docs/main/getting-started/faqs.md:60-62`).
- Plugin discovery scans all dependencies unless `includePlugins` is set; `cordova.failOnUninstalledPlugins` turns missing transitive Cordova packages into a hard sync failure (`src/cli/src/plugin.ts:56-60`, `docs/main/reference/config.md:726-733`).

## Upgrading the native layer

Install `@capacitor/core`, `@capacitor/android`, and `@capacitor/ios` at the same version and update `@capacitor/cli` in the same pass; mixed versions across core and platforms are the classic source of build mismatches (`docs/main/basics/workflow.md:83-96`). Then run `npx cap sync` so generated native files and plugin registries match the new packages (`docs/main/basics/workflow.md:15-27`). Major upgrades may need `npx cap migrate`, non-interactive flags, and manual follow-up; the v8 path requires Node 22+, Xcode 26+, iOS deployment target 15.0, and reports any step it could not complete (`docs/main/updating/8-0.md:33-51`, `src/cli/src/index.ts:382-392`). Native projects are source assets under version control, so review the generated diff rather than discarding it (`docs/main/cordova/index.md:23-29`). Build numbers and plist or manifest edits can be automated with the Trapeze packages, keeping repetitive release configuration out of manual IDE work (`docs/main/guides/automated-configuration.md:53-77`).

## Sources
- https://capacitorjs.com/docs/basics/workflow
- https://capacitorjs.com/docs/guides/live-reload
- https://capacitorjs.com/docs/cli/commands/run
- https://capacitorjs.com/docs/cli/commands/copy
- https://capacitorjs.com/docs/cli/commands/open
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/getting-started/faqs
- https://capacitorjs.com/docs/updating/8-0
- https://capacitorjs.com/docs/guides/automated-configuration
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor-docs
