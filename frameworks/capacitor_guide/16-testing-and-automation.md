# 16 - Testing and Automation

Testing a Capacitor app spans two distinct systems: the JavaScript bundle and the native projects that host it. Automation spans a third: the configuration changes needed to produce signed, versioned binaries. The docs and the repository's own scripts provide concrete patterns for each.

## Two layers of CI

Start with the frontend: build on every commit and run the local JS test suite using a generic service such as GitHub Actions or Jenkins (`docs/main/guides/ci-cd.md:15-23`). That is necessary but insufficient, because a large part of the app builds and runs as a native iOS or Android app, and mobile binaries are signed and distributed through stores rather than a mutable server (`docs/main/guides/ci-cd.md:27-31`):

```text
Just building and running JS app tests is not nearly enough for a mobile app, given that a big portion of your app needs to build and run as a native iOS and Android app.

Additionally, the way a mobile app is deployed and updated is very different from a web app. Whereas a web app will be hosted on a server that can be quickly updated, mobile apps are "hosted" in app stores and distributed as cryptographically-signed binaries. The update process is very different.

This means we need a service that can do native mobile builds and tests, and also offer a way to deploy and update our apps in a native mobile appropriate way.
```

A managed service such as Appflow supplies native build environments and can push live JS updates; the docs note it is the only option with that remote-update feature (`docs/main/guides/ci-cd.md:33-51`). Native projects are source assets checked into version control, so CI must operate on real Xcode and Android Studio projects (`docs/main/cordova/index.md:25`).

## Mocking Capacitor plugins in unit tests

Plugins are JavaScript proxies. Wrapping a proxy in a proxy fails, so normal mocking libraries cannot intercept them; use manual mocks instead (`docs/main/guides/mocking-plugins.md:9-13`). A manual mock is a plain object with the same method signatures (`docs/main/guides/mocking-plugins.md:20-27`):

```typescript
export const Storage = {
  async get(data: { key: string }): Promise<{ value: string | undefined }> {
    return { value: undefined };
  },

  async set(data: { key: string; value: string }): Promise<void> {},
  async clear(): Promise<void> {},
};
```

Jest auto-loads files under `__mocks__/@capacitor` in place of the installed packages (`docs/main/guides/mocking-plugins.md:32-51`). Jasmine has no manual mocks; Angular projects simulate them by adding `"@capacitor/*": ["__mocks__/@capacitor/*"]` to `paths` in `tsconfig.spec.json` (`docs/main/guides/mocking-plugins.md:53-83`). The `paths` object is replaced, not merged, so every base mapping must be repeated. Tests can then spy with `jest.fn()` or `spyOn` (`docs/main/guides/mocking-plugins.md:85-141`), and ready-made Jest and Jasmine examples exist as repositories (`docs/main/guides/mocking-plugins.md:143-146`).

## Repository test patterns

The Capacitor CLI itself is a usable reference. Its package defines a serial Jest run with ts-jest and the Jasmine runner (`src/cli/package.json:38-44`):

```json
  "scripts": {
    "build": "npm run clean && npm run assets && tsc",
    "clean": "rimraf ./dist",
    "assets": "node ../scripts/pack-cli-assets.mjs",
    "prepublishOnly": "npm run build",
    "test": "jest -i",
    "watch": "npm run assets && tsc -w"
```

The monorepo adds ESLint, Prettier, and SwiftLint under a single `lint` script, with `fmt` as the fixing counterpart (`src/package.json:10-25`), so static checks and unit tests are separate gates. Telemetry tests demonstrate two useful techniques: mocking `fs-extra` with a Jest mock, and capturing commander command objects to inspect resolved options (`src/cli/test/telemetry.spec.ts:13-17`, `src/cli/test/telemetry.spec.ts:84-100`). They assert that secrets never appear in the payload and that long errors are truncated (`src/cli/test/telemetry.spec.ts:142-167`, `src/cli/test/telemetry.spec.ts:358-362`). Environment problems can be triaged with `npx cap doctor`, one of the listed CLI commands (`docs/cli/index.md:25-39`).

## Device iteration and native builds

Live reload avoids rebuilding a native binary for every web change by reloading the Web View on file changes; the Ionic CLI automates the full flow with `ionic cap run android -l --external` (`docs/main/guides/live-reload.md:9-30`). Manual setups must bind the dev server to `0.0.0.0` and keep the device on the same Wi-Fi network (`docs/main/guides/live-reload.md:13`, `docs/main/guides/live-reload.md:43-49`).

For release automation, `npx cap build <platform>` produces a signed AAB, APK, or IPA from the command line, with signing supplied by flags or config (`docs/cli/commands/build.md:9-34`, `docs/main/reference/config.md:16-26`). The docs explicitly recommend it for terminal and CI builds (`docs/main/basics/workflow.md:73-75`):

```text
After `sync`, you are encouraged to open your target platform's IDE: Xcode for iOS or Android Studio for Android, for compiling your native app.

Alternatively, to compile your app in a terminal or in CI environments, you can use the [cap build command](/cli/commands/build) to build the native project, outputting a signed AAB, APK or IPA file ready for distribution to a device or end users.
```

Tooling such as Fastlane or Appflow can wrap the release process, and platform-specific publishing guides cover store submission (`docs/main/basics/workflow.md:81`).

## Programmatic project configuration

Large apps need to mutate native projects in CI: increment build numbers, edit manifests and plists, add Gradle dependencies, or change resources. The `@trapezedev/project` library offers a typed interface over the iOS and Android projects; `@trapezedev/configure` drives it from YAML and is aimed at plugin authors who need to publish configuration changes (`docs/main/guides/automated-configuration.md:9-15`, `docs/main/guides/automated-configuration.md:61-67`). Changes are buffered on a virtual filesystem until committed (`docs/main/guides/automated-configuration.md:53-59`). Typical version operations (`docs/main/guides/automated-configuration.md:42-50`):

```typescript
await project.ios?.setVersion('App', 'Debug', '1.4.5');
await project.ios?.incrementBuild('App');
await project.ios?.getBuild('App', 'Debug');
await project.ios?.getBuild('App', 'Release');
await project.android?.setVersionName('1.0.2');
await project.android?.getVersionName();
await project.android?.setVersionCode(11);
await project.android?.getVersionCode();
await project.android?.incrementVersionCode();
```

## Sources

- https://capacitorjs.com/docs/guides/ci-cd
- https://capacitorjs.com/docs/guides/mocking-plugins
- https://capacitorjs.com/docs/guides/live-reload
- https://capacitorjs.com/docs/guides/automated-configuration
- https://capacitorjs.com/docs/basics/workflow
- https://capacitorjs.com/docs/cli/commands/build
- https://capacitorjs.com/docs/cli
- https://capacitorjs.com/docs/cordova
- https://github.com/ionic-team/capacitor/blob/main/cli/test/telemetry.spec.ts
- https://github.com/ionic-team/capacitor/blob/main/cli/package.json
- https://github.com/ionic-team/capacitor/blob/main/package.json
- https://github.com/ionic-team/cap-plugin-mock-jest
