# 08 - Telemetry and Privacy

Capacitor's CLI ships an anonymous, opt-out telemetry program. Its behavior is split between the published contract and implementation details the docs only summarize: when enrollment happens, how values are sanitized, where consent is stored, and how a metric reaches the collector. Operators needing deterministic, private builds must understand both layers.

## Enrollment and default state

Enrollment is automatic after the first successful command and never occurs in a non-interactive session. The public contract (`docs/cli/telemetry.md:8-12`):

```text
Capacitor collects anonymous telemetry data about general usage. This is an opt-out program that provides insight to the Capacitor team to help improve the product. By providing usage data, you help provide valuable insights that could shape the future of the product.

You will be automatically enrolled after the Capacitor CLI successfully finishes its first command. You may opt-out at any time, wherein telemetry data will not be collected unless you opt back in. 

> **Note:** Telemetry does not run in non-interactive environments, such as CI servers, ensuring no data is collected in those scenarios. 
```

The decision lives in the command wrapper, not the `telemetry` command. Metrics are always assembled, but an interactive gate and a "first success" rule control persistence and sending (`src/cli/src/telemetry.ts:154-166`):

```typescript
    if (isInteractive()) {
      let sysconfig = await readConfig();

      if (!error && typeof sysconfig.telemetry === 'undefined') {
        // Telemetry is opt-out; turn telemetry on then inform the user how to opt-out.
        sysconfig = { ...sysconfig, telemetry: true };
        await writeConfig(sysconfig);

        output.write(THANK_YOU);
      }

      await sendMetric(sysconfig, 'capacitor_cli_command', data);
    }
```

A failing command never enrolls the machine, and enrollment is skipped without a TTY; a machine that only ran failing commands stays undecided.

## Controls

`npx cap telemetry off` opts out, bare `npx cap telemetry` prints status, and `npx cap telemetry on` rejoins (`docs/cli/telemetry.md:33-48`). The command is hidden from help (`src/cli/src/index.ts:356`). It is idempotent: a repeated state logs "already on/off", no argument is a status query, and any other argument is fatal (`src/cli/src/tasks/telemetry.ts:10-43`). The success message says "on this machine": consent is per machine, not per project.

## Data fields

The documented payload is (`docs/cli/telemetry.md:20-29`):

```text
Usage data is entirely anonymous and will only include the following:

* Timestamp
* Command name, arguments, and selected flags
* Command duration
* Error message (if the command failed, no stacktrace included)
* Capacitor machine ID (anonymous, generated ID)
* Project ID (anonymous, generated ID)
* Your operating system (Mac, Linux, Windows)
* Versions of: NodeJS, Capacitor CLI, core, and official platforms and plugins
```

The concrete metric adds `session_id`, a fixed `source` of `capacitor_cli`, and an `ios_package_manager` signal absent from the prose (`src/cli/src/telemetry.ts:21-39`). Only `@capacitor/` dependencies are reported, renamed to `<name>_version` keys (`src/cli/src/telemetry.ts:128-150`); failed iOS detection degrades to `unknown` (`src/cli/src/telemetry.ts:297-308`).

## Sanitization

Values that can carry secrets are stripped, not hidden. Option values survive only when boolean or in a closed allowlist (`src/cli/src/telemetry.ts:52-65`, `src/cli/src/telemetry.ts:181-193`); all others become `null` while names are retained. Positional arguments keep only `android`, `ios`, `web`, dropping app names and bundle ids (`src/cli/src/telemetry.ts:71-75`, `src/cli/src/telemetry.ts:255-257`). Failed builds rethrow tool output that echoes credentials, so the error is scrubbed of every redacted value, dropped argument, and config-supplied signing credential, then cut to 500 characters (`src/cli/src/telemetry.ts:81`, `src/cli/src/telemetry.ts:201-249`). Values shorter than three characters are left intact to avoid destroying the message (`src/cli/src/telemetry.ts:89`). Git URLs, local paths, and registry specs collapse to `non-registry` (`src/cli/src/telemetry.ts:265-267`). Tests assert each property (`src/cli/test/telemetry.spec.ts:142-167`, `src/cli/test/telemetry.spec.ts:358-362`, `src/cli/test/telemetry.spec.ts:383-407`).

## Identifiers and consent storage

The machine ID is a UUID created on first read of the system config and reused after (`src/cli/src/sysconfig.ts:34-52`); it is also the `session_id` (`src/cli/src/telemetry.ts:278-284`). Consent is an optional boolean in that same file, with `undefined` meaning no choice made (`src/cli/src/sysconfig.ts:13-32`). The file is `sysconfig.json` under the CLI environment config path (`src/cli/src/sysconfig.ts:10-11`, `src/cli/src/util/cli.ts:6`). The project ID is a one-way SHA-1 hash of the repository's first commit, or `null` when unavailable (`src/cli/src/telemetry.ts:313-330`). Deleting `sysconfig.json` resets consent to undecided and regenerates the UUID, re-enabling auto-enrollment.

## CI behavior and transport

Interactivity is one predicate, TTY plus no CI flag (`src/cli/src/util/term.ts:31`). Sending repeats both consent and interactivity checks; otherwise the metric is only debug-logged (`src/cli/src/telemetry.ts:272-290`), which is why CI collects nothing (`docs/main/updating/7-0.md:21-24`). Transport is fire-and-forget: the CLI forks an unreferenced child that POSTs JSON to the events service (`src/cli/src/ipc.ts:22-35`, `src/cli/src/ipc.ts:50-76`), so telemetry cannot block or fail a command.

## Privacy and troubleshooting

Treat telemetry as anonymous but persistent and network-active. Nothing is collected without a TTY, `off` persists machine-wide, and free-form arguments and full error logs are excluded. `DEBUG=capacitor:telemetry` prints the exact payload (`src/cli/src/telemetry.ts:152`); `DEBUG=capacitor:ipc` reports the fork and collector status (`src/cli/src/ipc.ts:27`), with child output appended to `ipc.log` under the environment log path (`src/cli/src/ipc.ts:23-25`). For offline builds, set a CI flag or opt out explicitly, since `off` still requires a writable config directory.

## Sources

- https://capacitorjs.com/docs/cli/telemetry
- https://capacitorjs.com/docs/updating/7-0
- https://capacitorjs.com/docs/cli
- https://github.com/ionic-team/capacitor
- https://github.com/ionic-team/capacitor/blob/8.6.2/cli/src/telemetry.ts
- https://github.com/ionic-team/capacitor/blob/8.6.2/cli/src/tasks/telemetry.ts
- https://github.com/ionic-team/capacitor/blob/8.6.2/cli/src/sysconfig.ts
- https://github.com/ionic-team/capacitor/blob/8.6.2/cli/src/ipc.ts
- https://github.com/ionic-team/capacitor/blob/main/cli/test/telemetry.spec.ts
- https://nodejs.org/api/cli.html
