# 21 - Minimal Verified Cut

The dossier answers how Capacitor works. This chapter turns that into the smallest model that still covers the real artifacts: a web bundle, a typed plugin surface, two native projects, a CLI workflow, a telemetry decision, a security gate and a lint gate.

## Dossier Review

1. **Provenance risk:** `AGENTS.md` and `ARCHITECTURE.md` are main-branch documents, not part of tag `8.6.2`. They are useful for intent and lint rules, but runtime facts must come from the pinned source.
2. **Generated-file risk:** `core/native-bridge.ts` is not the file that runs; the generated copies under Android and iOS assets are. Editing the wrong file is the most common silent failure (`src-head/AGENTS.md:247-250`).
3. **Registration risk:** a plugin can compile and still be absent because a native registration list was missed (`src-head/AGENTS.md:282-297`).
4. **Settlement risk:** a bridge call with no resolve or reject hangs forever; listeners need `keepAlive` first (`src-head/AGENTS.md:81-83`, `src-head/AGENTS.md:261-263`).
5. **Config risk:** keys change across majors, so every config decision must be checked against the v8 schema (`docs/main/reference/config.md:30-64`).
6. **Telemetry risk:** opt-out is per project and collection silently skips non-interactive runs; a CI audit cannot infer desktop behavior (`docs/cli/telemetry.md:8-12`, `docs/cli/telemetry.md:31-48`).
7. **Security risk:** the web bundle is readable; secrets must not live there (`docs/main/guides/security.md:21-27`).
8. **Performance risk:** the serial plugin queue is a structural bottleneck, not a tunable setting (`src-head/AGENTS.md:266-269`).
9. **Coverage risk:** unverified rows are deliberately excluded from credit; they are not optimistic estimates.
10. **Runtime risk:** no device run was performed, so this cut is a documentation decision model, not a release certificate.

## Contract By Artifact

| Artifact | Data displayed or consumed | Real interaction | Model requirement |
|---|---|---|---|
| Web bundle | `webDir` output, config, CSP meta tag | Loaded from local scheme in the WebView | `webDir` + config + security header |
| JS plugin proxy | Method name, args, callback id | `registerPlugin`, typed method call, promise | Interface + plugin name + native headers |
| Native plugin class | `@PluginMethod` on Android, `@objc` + `CAP_PLUGIN_METHOD` on iOS | Registered in `Bridge`/plugin list, called by JSON message | Class + method + registration entry |
| Native project | `ios/`, `android/`, entitlements, manifest | `cap add`, `cap sync`, IDE build | Real project files, not regenerated each build |
| CLI workflow | Commands and hooks | `copy` vs `sync` vs `run` vs `open` | Command table and explicit side effects |
| Telemetry decision | Anonymous ids, command metadata, consent | `cap telemetry on/off/status` | Consent state + collection field list |
| Security review | Secrets, deep links, transport, CSP | App audit and plugin choice | Four controls plus PKCE |
| Quality gate | ESLint, Prettier, SwiftLint, Android baseline | `npm run lint`, `npm run fmt`, platform verify | One root lint chain plus platform gates |

Seven of these eight artifacts are projections of one small core: a config object plus a plugin interface plus a native registration list. The telemetry decision and the quality gate need their own explicit state because they are processes, not projections.

## Model Choice

Choose **one config core, one plugin interface, two registration lists and one lint chain**.

- One typed config object covers app identity, web assets, platform overrides, server behavior and plugin configuration.
- One plugin interface describes web, iOS and Android implementations behind the same JSON bridge.
- Two native registration lists are unavoidable because iOS and Android are separate runtimes with separate class systems.
- One root lint chain covers TypeScript, formatting and Swift; Android adds a baseline-gated Gradle task.

Rejected alternatives:

- A separate config model per platform duplicates shared keys and drifts from the v8 schema.
- A generic bridge abstraction across iOS and Android hides `@objc` and `PluginMethod` constraints that fail only at runtime.
- A closure-table or inheritance-heavy plugin model adds no value to a thin typed bridge.
- A telemetry model embedded in app config mixes CLI concerns into the runtime bundle.
- A lint model copied per plugin prevents one root gate from staying authoritative.

## Sufficiency Questions

The chosen model must answer each of these without a new field:

1. Where does the built web bundle come from?
2. Which native schemes serve it?
3. Which config keys are global and which are platform-specific?
4. Which command only copies assets and which also updates native dependencies?
5. Which plugin method failed and was it declared natively?
6. Did the call settle once, hang, or use `keepAlive`?
7. What data crossed the bridge and was it JSON-representable?
8. Where must persistent state live when navigation resets the bridge?
9. Is CLI telemetry enabled for this project and does CI collect anything?
10. Which fields would be collected if it ran interactively?
11. Are secrets, deep links, transport and CSP covered for this build?
12. Which lint gate fails: TypeScript, Prettier, SwiftLint or Android baseline?
13. Was `native-bridge.js` rebuilt after editing `core/native-bridge.ts`?
14. Is the plugin registered in both native platform lists?
15. Which unverified row must be resolved before a release decision?

No question requires a new column. If a future question does, the model needs a change, not a footnote.

## Spec Budget

| Document | Ceiling | Invariant |
|---|---:|---|
| `SKILL.md` | 9,500 bytes | Contract and hard rules only; no examples |
| Each numbered chapter | 7,600 bytes | One concern; derived content labelled |
| `19-coverage-evidence.md` | 23,000 bytes | Rows only; no prose expansion |
| `samples/MANIFEST.md` | 4,000 bytes | Source, size, hash, rationale |
| `VERSION` | 2,000 bytes | Pinned identities only |

Rules that prevent regrowth: derive rather than store; one command table serves all chapters; one field appears only with both a use and a query; every new claim needs a new citation and a new coverage row.

## Decision Rule

Adopt the minimal model. Escalate only when an unverified row becomes a release blocker: run the device build, capture the telemetry payload, execute the lint chain or benchmark the startup path. Record the result in `19-coverage-evidence.md` before changing the model.

## Sources

- https://capacitorjs.com/docs
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/basics/using-plugins
- https://capacitorjs.com/docs/core-apis
- https://capacitorjs.com/docs/cli
- https://capacitorjs.com/docs/cli/telemetry
- https://capacitorjs.com/docs/guides/security
- https://github.com/ionic-team/capacitor/tree/8.6.2/core
- https://github.com/ionic-team/capacitor/tree/8.6.2/cli
- https://github.com/ionic-team/capacitor/tree/8.6.2/android
