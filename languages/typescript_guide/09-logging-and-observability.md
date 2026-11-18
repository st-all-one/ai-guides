# 09 - Logging and observability

The compiler exposes diagnostics, emitted map files, and event traces. Application logs are a separate channel that typed TypeScript can shape but cannot execute. Treat each channel as evidence with a different lifetime.

| Channel | Produced by | What it proves | Action | Evidence |
|---|---|---|---|---|
| Config diagnostics | Program diagnostic collection | Config and file-processing errors before checking | Fix config, not emitted code | `repo/src/compiler/programDiagnostics.ts:72-85` |
| Watch status | Watch status reporter | A compilation started or a file changed | Tag CI timeline events | `repo/src/compiler/watch.ts:193-212` |
| Build errors | Diagnostic reporter | Formatted compiler errors in human or plain form | Gate the build on category and code | `repo/src/compiler/watch.ts:125-140` |
| Trace events | `tracingEnabled` | Compiler phase timing and type catalog | Attach artifacts to a failing run | `repo/src/compiler/tracing.ts:142-196` |
| Runtime application logs | Running application only | Request-specific values and failures | Design the record schema yourself | `docs/docs__handbook__2__narrowing.html.txt:45` |

## Typed record design

A structured record is **derived**: a closed level union is checked at every use (`docs/docs__handbook__2__everyday-types.html.txt:186-216`). Keep stable field names (`level`, `code`, `message`, `errorTag`, `correlationId`, `payload`); the compiler emits its own fields in fixed order (`repo/src/compiler/tracing.ts:190-196`). `satisfies` validates a log schema without widening its inferred type, catching typos and missing keys (`docs/docs__handbook__release-notes__typescript-4-9.html.txt:38-53`). Avoid `any` payloads because they disable checks (`docs/docs__handbook__2__everyday-types.html.txt:26-45`); keep `unknown` and narrow, as strict catch bindings require (`docs/docs__handbook__release-notes__typescript-4-4.html.txt:240-253`).

| Field | Discipline | Failure mode | Evidence |
|---|---|---|---|
| `level` | Closed string-literal union | New tier used without schema update | `docs/docs__handbook__2__everyday-types.html.txt:186-216` |
| `code` | Stable diagnostic or domain code | Text edits break downstream queries | `repo/src/compiler/diagnosticMessages.json:4747-4750` |
| `errorTag` | Discriminated union field | Missing variant at an exhaustiveness check | `docs/docs__handbook__2__narrowing.html.txt:559-598` |
| `payload` | `unknown`, narrowed before emission | `any` silently accepts secrets and shapes | `docs/docs__handbook__2__everyday-types.html.txt:26-45` |
| `correlationId` | Required string in every record | Build traces cannot be joined to requests | `repo/src/compiler/tracing.ts:82-92` |

Deterministic tagged-error serialisation is **derived**: a literal field narrows each variant (`docs/docs__handbook__2__narrowing.html.txt:420-436`, `docs/docs__handbook__2__narrowing.html.txt:531`) and a `never` default exposes new variants (`docs/docs__handbook__2__narrowing.html.txt:559-598`). Emit fields in fixed order with JSON-serialisable arguments (`repo/src/compiler/tracing.ts:52-55`, `repo/src/compiler/tracing.ts:190-196`).

## Compiler traces and maps

`--generateTrace` is directory-valued (`repo/src/compiler/commandLineParser.ts:459-466`) and produces an event trace plus a type list (`docs/docs__handbook__compiler-options.html.txt:235-237`). Tracing needs a filesystem, creates the directory, and names files by mode, pid, and count (`repo/src/compiler/tracing.ts:57-102`); the legend stores config and artifact paths (`repo/src/compiler/tracing.ts:82-92`). Push, pop, and instant events carry phase and arguments, and sampled intervals become complete events with duration (`repo/src/compiler/tracing.ts:142-184`). The writer is:

`repo/src/compiler/tracing.ts:190-196`
```
        performance.mark("beginTracing");
        fs.writeSync(traceFd, `,\n{"pid":1,"tid":1,"ph":"${eventType}","cat":"${phase}","ts":${time},"name":"${name}"`);
        if (extras) fs.writeSync(traceFd, `,${extras}`);
        if (args) fs.writeSync(traceFd, `,"args":${JSON.stringify(args)}`);
        fs.writeSync(traceFd, `}`);
        performance.mark("endTracing");
        performance.measure("Tracing", "beginTracing", "endTracing");
```

For stack traces, `--sourceMap` emits maps for JavaScript and `--declarationMap` maps declarations (`docs/docs__handbook__compiler-options.html.txt:163-166`, `docs/docs__handbook__compiler-options.html.txt:477-483`). The decoder maps generated and source positions against `sources`/`sourceRoot`/`sourcesContent` (`repo/src/compiler/sourcemap.ts:461-470`), the mapper normalises paths (`repo/src/compiler/sourcemap.ts:699-705`), and decode failures are logged through the host (`repo/src/compiler/sourcemap.ts:739-745`). Keeping maps with their build is **derived** practice.

## CI signals, hygiene, and limits

Watch and build diagnostics are process signals: program diagnostics separate config, lazy config, and file-processing state (`repo/src/compiler/programDiagnostics.ts:72-102`); the watch reporter adds a locale timestamp (`repo/src/compiler/watch.ts:193-212`). For CI logs prefer the plain reporter over color and context (`repo/src/compiler/watch.ts:125-140`); `pretty` defaults to true (`repo/src/compiler/commandLineParser.ts:421-428`). Screen clearing is suppressed by `preserveWatchOutput`, `extendedDiagnostics`, and `diagnostics` (`repo/src/compiler/watch.ts:146-164`); `traceResolution` and `explainFiles` expose resolution reasons (`repo/src/compiler/commandLineParser.ts:408-435`).

Redaction and correlation ids are **derived**: the reporter flattens message text verbatim (`repo/src/compiler/watch.ts:193-212`), so never log secrets; narrow payloads and redact first. Repeat one correlation id on every request record; the compiler only offers build-level ids such as pid, config path, and artifact paths (`repo/src/compiler/tracing.ts:82-92`). Runtime request ids, thrown values, secret payloads, latency, and propagation failures are outside compiler evidence: type analysis overlays runtime control flow but does not execute it (`docs/docs__handbook__2__narrowing.html.txt:45`), and tracing starts for one project and filesystem (`repo/src/compiler/tracing.ts:57-58`).

## Sources
- https://www.typescriptlang.org/docs/handbook/compiler-options.html
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/tracing.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/sourcemap.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/watch.ts
- https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts
