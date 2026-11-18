---
name: deno
description: >-
  Deno 2.9.3 audited runtime reference: V8 and Rust single-binary architecture, sandbox and
  permission sets, deno.json configuration, modules and TypeScript, Node and npm compatibility,
  JSR packages and supply chain, console and OpenTelemetry logging, traces, metrics and audit,
  CPU profiling, performance flags, debugging, lint, format, tests, HTTP server and web APIs.
  Load when implementing, configuring, securing, observing, tuning or debugging Deno code.
category: runtimes
version: 2.9.3 / docs-2026-11-18
tags: [deno, deno2, runtime, permissions, security, deno-json, telemetry, opentelemetry, logging, performance, lint, jsr]
license: MIT
---

# Deno 2.9.3

Static, auditable snapshot of the official `https://docs.deno.com/runtime/` documentation captured
on 2026-11-18. The corpus is 172 exported Markdown pages, 1,234,286 bytes, SHA-256
`d0c857e94d3465657b3671309f4ddbf49d64172ade3e1e3c4ee36c0729a0125f`. No binary was installed and
no live Deno process was executed; every factual claim resolves to a file that was read.

## When to load this skill

- Choosing permission flags, permission sets or a sandbox boundary for untrusted code.
- Writing `deno.json` tasks, import maps, lint rules, formatter rules or named permissions.
- Adding console logging, `@std/log`, OpenTelemetry exporters, metrics, traces or audit logs.
- Tuning startup, caching, V8 flags, CPU profiling or watch/debug workflows.
- Running Node/npm packages in Deno, publishing to JSR or structuring workspaces.

## Measured surface

| Surface | Measurement |
|---|---|
| Documentation sitemap | 789 URLs total; 174 under `/runtime/` |
| Exported runtime corpus | 171 Markdown pages, 1.23 MB, captured 2026-11-18 |
| Guide | 22 numbered chapters, 8 byte-identical samples, one mechanical verifier |
| Coverage | seven 20-item checklists measured against an 85% floor |

## Four focus themes

| Theme | Primary chapters | Core claim |
|---|---|---|
| Sandbox and configuration | 03, 06, 08 | Capabilities are explicit and can be named in config |
| Observability | 10, 11, 13 | Console output, OTel signals and audit share one runtime pipeline |
| Performance and quality | 12, 14, 15 | Cache, flags, lint, format and tests are repeatable gates |
| Compatibility and platform | 04, 07, 09, 16, 17 | Node, npm, JSR and web APIs are bridged by one runtime |

## Six invariants worth memorizing

1. **Deny by default.** Grant the narrowest `--allow-*` scope; use `--deny-*` to carve exceptions.
2. **Config is executable.** `deno.json` carries tasks, imports, permissions, lint and format rules.
3. **Logs are a runtime surface.** `console.*`, runtime logs and exit errors can be exported via OTel.
4. **Telemetry is opt-in.** `OTEL_DENO=true` selects the exporter path and endpoint contract.
5. **Compatibility is explicit.** `node:`, `npm:` and `jsr:` specifiers each have distinct resolution rules.
6. **Quality is a gate.** `deno lint`, `deno fmt --check`, `deno test` and coverage are CI checks.

## File Map

| File | Content |
|---|---|
| `00-index.md` | Scope, citation contract, measured surface, reading order, non-goals |
| `01-runtime-architecture.md` | V8 and Rust, event loop, TS transpile, permission boundary, release channels |
| `02-installation-and-usability.md` | Install channels, shell, REPL, eval, tasks, editor feedback and daily workflow |
| `03-deno-json-and-configuration.md` | Config discovery, tasks, imports, permissions, compiler options, env vars |
| `04-modules-and-typescript.md` | ESM, `jsr:`, `npm:`, `node:`, import maps, type checking and declarations |
| `05-cli-and-automation.md` | Command surface, CI, Docker, completions, upgrade and LSP integration |
| `06-permissions-and-security.md` | Sandbox, allow/deny flags, prompts, permission sets, APIs, untrusted code |
| `07-node-and-npm-compatibility.md` | `node:` built-ins, package.json, npm specifiers, migration and limits |
| `08-packages-and-supply-chain.md` | JSR publish, lockfile, audit, registry auth and integrity controls |
| `09-workspaces-and-dependency-management.md` | Workspaces, peer deps, private registries, nested package boundaries |
| `10-logging-and-observability.md` | Console streams, std/log status, structured fields, runtime logs, audit path |
| `11-open-telemetry.md` | Traces, metrics, logs, exporters, sampling, console exporter, OTel env vars |
| `12-performance-and-profiling.md` | Caching, startup, V8 flags, CPU profiling, benchmarks and parallel workers |
| `13-debugging-and-troubleshooting.md` | Inspector, LSP, VS Code, watch mode, error classes and common failures |
| `14-lint-and-format.md` | Rules, tags, include/exclude, plugins, ignore directives, fmt config, CI |
| `15-testing-and-coverage.md` | Test runner, assertions, mocks, snapshots, sanitizers, doc tests, coverage |
| `16-http-server-and-web-apis.md` | `Deno.serve`, routing, streaming, TLS, HTTP/2, Web Platform APIs |
| `17-advanced-runtime-features.md` | FFI, WASM, cron, WebGPU, KV-adjacent surfaces and desktop runtime notes |
| `18-coverage-and-limits.md` | Measured surface, coverage model, known limits, verification method |
| `19-coverage-evidence.md` | 20-item checklists and measured coverage for seven focus topics |
| `20-quick-reference.md` | Commands, flags, env vars and config snippets with line citations |
| `21-minimal-verified-cut.md` | Artifact contract, simplest model, sufficiency questions, spec budget |
| `samples/` | Eight byte-identical slices anchored to the captured documentation pages |

## Citation contract

- `docs/<file>.md:LINE` resolves to an exported page in the captured runtime corpus.
- `NN-slug.md:LINE` is used as evidence in the coverage tables.
- A path without a line supports a whole-file fact. Computed claims carry **derived**.
- Fenced blocks are verbatim, cite their source on the line above and never invent code.
- Every chapter ends with `## Sources` and at least eight official URLs.
- A fact not read in the corpus is marked `unverified`, never inferred as documented.

## Read order

Start at `00-index.md`. For security, read `03` → `06` → `08` → `10`. For observability, read
`10` → `11` → `13` → `12`. For daily work, read `02` → `03` → `05` → `14` → `15`. Use `20`
during work and `18`/`19` before claiming coverage.

## Sources

- https://docs.deno.com/runtime/
- https://docs.deno.com/runtime/fundamentals/security/
- https://docs.deno.com/runtime/fundamentals/configuration/
- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/runtime/reference/permissions/
- https://docs.deno.com/runtime/reference/cli/
- https://docs.deno.com/runtime/reference/cli/lint/
- https://docs.deno.com/runtime/reference/std/log/
- https://docs.deno.com/llms-full.txt
- https://jsr.io/
- https://github.com/denoland/deno
