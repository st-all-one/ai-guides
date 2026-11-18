# 11 - Lint and code quality

Two layers of authority matter. At tag 8.6.2 the enforced gates are the checked-in npm scripts, ESLint/Prettier/SwiftLint configs, `core/tsconfig.json`, and Android's Gradle lint block. The repository also carries an AGENTS.md on its main branch; here that file is `src-head/AGENTS.md` and is main-branch contribution guidance, not part of tag 8.6.2. Where it describes newer structure (SwiftPM-only iOS, generated `ios/Package.swift`), treat it as direction rather than as the 8.6.2 layout (`src-head/AGENTS.md:56-68`).

## The root gate

The root scripts compose a single lint command: ESLint over TypeScript, Prettier in check mode, then SwiftLint; `fmt` applies the same three tools in write mode (`src/package.json:20-24`):

(`src/package.json:20-24`)
```json
"lint": "npm run eslint && npm run prettier -- --check && npm run swiftlint -- lint",
"fmt": "npm run eslint -- --fix && npm run prettier -- --write && npm run swiftlint -- --fix --format",
"prettier": "prettier \"**/*.{css,html,java,js,mjs,ts}\" --plugin=prettier-plugin-java",
"eslint": "eslint . --ext ts",
"swiftlint": "node-swiftlint",
```

CI runs `npm run lint` on `macos-15` after installing SwiftLint with Homebrew, and every test job depends on the lint job (`src/.github/workflows/ci.yml:33-54`). Node 22 is the CI runtime (`src/.github/workflows/ci.yml:37-39`).

## TypeScript

Prettier uses `@ionic/prettier-config` and `prettier@^3.3.0`; its glob covers CSS, HTML, Java, JS, MJS, and TS, so Markdown is not formatted or linted (`src/package.json:22`, `src/package.json:27`, `src/package.json:38`, `src-head/AGENTS.md:342-343`). Java sources go through `prettier-plugin-java`. Generated bridge assets are excluded from both tools: the four `native-bridge.js` copies under Android and iOS assets appear in both ignore files, alongside `build`, `dist`, `types`, and `cli/assets` (`src/.eslintignore:1-8`, `src/.prettierignore:1-8`).

ESLint extends `@ionic/eslint-config/recommended` pinned at `^0.4.0` and scans `.ts` only (`src/package.json:23`, `src/package.json:28-30`, `src/package.json:32`). The main-branch guidance names the rules that actually bite: `consistent-type-imports` (type-only imports must use `import type`, the most common failure), `explicit-module-boundary-types` on exported functions, `array-type`, `consistent-type-assertions`, `prefer-for-of`, `prefer-optional-chain`, `import/order` with groups builtin+external, parent, sibling+index alphabetised, plus `import/first`, `import/newline-after-import`, `import/no-duplicates`, `import/no-mutable-exports` (`src-head/AGENTS.md:129-143`).

Compiler strictness is independent of lint and fails the build. The core config enables:

(`src/core/tsconfig.json:10-12`)
```json
"noImplicitAny": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
```

An unused parameter therefore breaks compilation, not merely lint (`src-head/AGENTS.md:145-146`).

## Swift

SwiftLint is driven by `node-swiftlint` over the checked-in config, which extends the shared Ionic ruleset and scopes itself to the three iOS trees while excluding tests, the test host, and frameworks (`src/package.json:24`, `src/package.json:34`, `src/package.json:42`):

(`src/swiftlint.config.js:1-5`)
```javascript
module.exports = {
  ...require('@ionic/swiftlint-config'),
  included: ['${PWD}/ios', '${PWD}/ios-pods-template', '${PWD}/ios-spm-template'],
  excluded: ['${PWD}/ios/Capacitor/CapacitorTests', '${PWD}/ios/Capacitor/TestsHostApp', '${PWD}/ios/Frameworks'],
};
```

The main-branch guidance lists opt-in rules that matter in practice: `force_unwrapping`, `implicitly_unwrapped_optional`, `lower_acl_than_parent`, `modifier_order`, `unused_import`, `unowned_variable_capture`, with a 150-character line-length warning (`src-head/AGENTS.md:148-153`). Intentional violations carry a scoped `// swiftlint:disable <rule>` plus a reason, rather than a widened config (`src-head/AGENTS.md:155-157`); real instances exist for `force_cast`, `identifier_name`, `file_length`, and `cyclomatic_complexity` in bridge sources (`src/ios/Capacitor/Capacitor/Codable/JSValueDecoder.swift:133`, `src/ios/Capacitor/Capacitor/CAPBridgeProtocol.swift:57`, `src/ios/Capacitor/Capacitor/CapacitorBridge.swift:19-21`). Methods reachable from the bridge must be `@objc`; subclassable API is `open`, not `public` (`src-head/AGENTS.md:159-160`).

Language mode is a correctness gate, not style. Tag 8.6.2 pins `SWIFT_VERSION = 5.0` across the Xcode project targets and declares `s.swift_version = '5.1'` in the podspec (`src/ios/Capacitor/Capacitor.xcodeproj/project.pbxproj:910`, `src/ios/Capacitor.podspec:23`). The main-branch guidance explains the intent: tools version 6 with `swiftLanguageModes: [.v5]`, no `async`/`await`, `actor`, `Sendable`, or `@preconcurrency`; concurrency expressed through `DispatchQueue.main.async` and the bridge's serial `dispatchQueue`, and locking via `NSLock` for shared state (`src-head/AGENTS.md:162-199`). Do not introduce Swift concurrency or flip the language mode in an unrelated change (`src-head/AGENTS.md:187-194`).

## Java and Android lint

The Android library applies strict lint with a checked-in baseline and fails on every warning (`src/android/capacitor/build.gradle:59-64`):

(`src/android/capacitor/build.gradle:59-64`)
```gradle
lintOptions {
    baseline file("lint-baseline.xml")
    abortOnError = true
    warningsAsErrors = true
    lintConfig = file('lint.xml')
}
```

The baseline records known issues such as `DefaultLocale` so they do not block; any new warning is a regression (`src/android/capacitor/lint-baseline.xml:4-13`). Compilation targets Java 21, AGP is `8.13.0`, and CI provisions JDK 21 (`src/android/capacitor/build.gradle:24`, `src/android/capacitor/build.gradle:65-68`, `src/.github/workflows/ci.yml:129-133`). Run `npm run verify -w android` for the Gradle clean/lint/build/test cycle; iOS needs macOS plus Xcode (`src-head/AGENTS.md:112-119`, `src-head/AGENTS.md:328-340`).

## Generated files and discipline

The runtime bridge JavaScript is generated, not authored: `core/native-bridge.ts` builds two committed copies, and editing a copy directly is lost (`src-head/AGENTS.md:247-250`). Both are deliberately ignored by formatters and linters (`src/.eslintignore:5-8`, `src/.prettierignore:5-8`). On the main branch `ios/Package.swift` is likewise generated and a stale copy fails lint (`src-head/AGENTS.md:61-68`).

Commits follow Conventional Commits (`type(scope): subject`, with `!` after the scope for breaking changes), and Lerna enforces conventional commits for releases while restricting releases to `main` (`src-head/AGENTS.md:209-228`, `src/lerna.json:6-11`). Branch targeting is part of review: bugfixes and non-breaking work go to the stable branch, breaking work to the pre-release branch, per the current map (`src/CONTRIBUTING.md:74-84`). Large changes require prior consultation, third-party runtime dependencies require approval, and bug reports require a minimal reproduction app (`src/CONTRIBUTING.md:47-57`, `src/CONTRIBUTING.md:20-29`).

## Sources
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor/blob/main/CONTRIBUTING.md
- https://github.com/ionic-team/capacitor/blob/main/AGENTS.md
- https://registry.npmjs.org/@capacitor/core
- https://registry.npmjs.org/@capacitor/cli
- https://nodejs.org/
- https://developer.android.com/studio/write/lint
- https://developer.apple.com/documentation/swift/
- https://capacitorjs.com/docs/
- https://github.com/ionic-team/capacitor-docs
