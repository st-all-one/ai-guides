# 04 - CLI and workflow

The CLI is a thin dispatcher over native toolchains: it copies assets, edits generated config, and delegates builds to Gradle or xcodebuild. Understanding which command mutates which layer prevents most workflow errors.

## Command surface

Invocation is `npx cap [-V] [-h] [<command>]`, with `-h` also valid per command (`docs/cli/index.md:10-23`). The registered command set is:

(`docs/cli/index.md:25-39`)
```text
### Command List

View all available CLI commands and options.

- [`add`](/cli/commands/add.md)
- [`build`](/cli/commands/build.md)
- [`copy`](/cli/commands/copy.md)
- `doctor`
- [`init`](/cli/commands/init.md)
- [`ls`](/cli/commands/ls.md)
- `migrate`
- [`open`](/cli/commands/open.md)
- [`run`](/cli/commands/run.md)
- [`sync`](/cli/commands/sync.md)
- [`update`](/cli/commands/update.md)
```

Hidden commands exist and are stable enough to script: `config` prints evaluated config with `--json` (`src/cli/src/index.ts:43-52`), `create` scaffolds a project (`src/cli/src/index.ts:54-62`), `telemetry` toggles tracking (`src/cli/src/index.ts:355-363`), `plugin:generate` starts plugin authoring, and `spm-migration-assistant` removes CocoaPods (`src/cli/src/index.ts:372-402`). `serve` remains registered but always fails, directing users to a third-party static server (`src/cli/src/tasks/serve.ts:4-9`). An unknown command is fatal, and no arguments print help (`src/cli/src/index.ts:404-417`). Every action is wrapped so fatal errors set the exit code and non-fatal ones propagate (`src/cli/src/util/cli.ts:10-22`).

## Lifecycle commands

`init` takes app name and app ID with an optional `--web-dir`, prompts when arguments are missing, and supports `--skip-appid-validation` (`docs/cli/commands/init.md:9-24`, `src/cli/src/index.ts:64-76`). `add` creates a platform project from a template, edits native settings, and syncs immediately when the web output exists (`docs/cli/commands/add.md:9-24`, `src/cli/src/tasks/add.ts:77-93`). `copy` refreshes web assets and config only; `update` refreshes native plugin and dependency state; `sync` runs both in that order (`docs/cli/commands/copy.md:9-15`, `docs/cli/commands/update.md:9-15`, `src/cli/src/tasks/sync.ts:10-13`). `open` launches Xcode or Android Studio, and `ls` lists installed Cordova and Capacitor plugins (`docs/cli/commands/open.md:9-19`, `docs/cli/commands/ls.md:9-19`). All platform arguments are optional except for `add`, `open`, and `build`, and omitting them selects every added platform serially (`src/cli/src/common.ts:283-309`, `src/cli/src/tasks/sync.ts:27-42`).

`--inline` inlines JS source maps for Android WebView debugging, available on both `copy` and `sync`; `--deployment` keeps `Podfile.lock` and passes `--deployment` to pod install on `sync` and `update` (`docs/cli/commands/copy.md:21-23`, `docs/cli/commands/sync.md:21-24`, `docs/cli/commands/update.md:21-23`).

## Hooks

Six npm scripts fire around mutating commands, and a plugin can declare the same scripts in its own package:

(`docs/cli/hooks.md:8-18`)
```text
# Capacitor CLI Hooks

Starting in Capacitor 3.1, the following events can be used to hook into Capacitor commands:

- `capacitor:copy:before`
- `capacitor:copy:after`
- `capacitor:update:before`
- `capacitor:update:after`
- `capacitor:sync:before`
- `capacitor:sync:after`
```

The runner executes the app hook first, then the same hook in every resolved plugin (`src/cli/src/common.ts:150-158`). Each hook receives `CAPACITOR_ROOT_DIR`, `CAPACITOR_WEB_DIR`, `CAPACITOR_CONFIG`, and `CAPACITOR_PLATFORM_NAME`, and a nonzero exit aborts the command (`src/cli/src/common.ts:160-205`). `sync` fires its own before/after pair around a `copy` and an `update`, so `copy:before` also runs during sync (`src/cli/src/tasks/sync.ts:45-56`).

## Run and target selection

`run` performs `sync`, builds a debug binary, and deploys it to a chosen device (`docs/cli/commands/run.md:7-15`). Targets come from `native-run` invoked with `--list --json`; physical devices are returned before virtual devices, and errors carry error codes and a wiki link (`src/cli/src/util/native-run.ts:12-24`, `src/cli/src/util/native-run.ts:26-65`). `--list` prints a Name / API / Target ID table or JSON and exits without syncing (`src/cli/src/tasks/run.ts:68-90`). `--target`, `--target-name`, and `--target-name-sdk-version` disambiguate targets sharing a name (`docs/cli/commands/run.md:28-30`). `--no-sync` skips the sync phase; `--scheme` and `--flavor` override config values (`src/cli/src/tasks/run.ts:92-103`, `docs/cli/commands/run.md:23-27`).

## Build and release

`build` emits a signed AAB, APK, or IPA and accepts scheme, flavor, keystore fields, Android release type and signing program, plus Xcode team, export method, signing style, certificate, and profile flags (`docs/cli/commands/build.md:7-34`). Values from flags take priority over config, then defaults apply: AAB, jarsigner, Release, App Store Connect, automatic signing (`src/cli/src/tasks/build.ts:41-57`). Web is rejected as a build target; with multiple platforms added and no explicit platform, an interactive filter narrows the choice to iOS and Android (`src/cli/src/tasks/build.ts:69-83`). After building, release goes through native IDEs or external tooling such as Fastlane or Appflow (`docs/main/basics/workflow.md:71-81`).

## Telemetry, migration, and upgrades

Telemetry is opt-out, activates after the first successful command, and does not run in non-interactive environments; `cap telemetry off`, `on`, or no argument reports status (`docs/cli/telemetry.md:8-12`, `docs/cli/telemetry.md:31-49`). State lives in a machine-level `sysconfig.json` with an anonymous machine UUID (`src/cli/src/sysconfig.ts:10-24`, `src/cli/src/tasks/telemetry.ts:10-29`). `migrate` upgrades a project to the latest major, while `spm-migration-assistant` switches iOS dependency management (`src/cli/src/index.ts:382-402`); both are also documented as an alternative to the manual v8 migration steps (`docs/main/updating/8-0.md:37-51`). Routine upgrades install matching `@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, and `@capacitor/cli` versions together, then sync (`docs/main/basics/workflow.md:83-96`).

## Sources
- https://capacitorjs.com/docs/cli
- https://capacitorjs.com/docs/cli/commands/init
- https://capacitorjs.com/docs/cli/commands/add
- https://capacitorjs.com/docs/cli/commands/copy
- https://capacitorjs.com/docs/cli/commands/sync
- https://capacitorjs.com/docs/cli/commands/update
- https://capacitorjs.com/docs/cli/commands/run
- https://capacitorjs.com/docs/cli/commands/build
- https://capacitorjs.com/docs/cli/commands/open
- https://capacitorjs.com/docs/cli/commands/ls
- https://capacitorjs.com/docs/cli/hooks
- https://capacitorjs.com/docs/cli/telemetry
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor-docs
