# 00 - Index

This dossier documents the Deno runtime as an auditable surface, not as a tutorial. It pins the
official `https://docs.deno.com/runtime/` documentation captured on 2026-11-18, labels every
claim with a resolvable file and line, and keeps seven 20-item coverage checklists separate from
prose. It is part of the `ai-guides` collection and follows the same package shape as the TypeScript
and Podman guides.

## Scope

The corpus is the official runtime documentation tree: 789 URLs in the site sitemap, 174 under
`/runtime/`, and 172 exported Markdown pages including the runtime landing page. The exported
corpus is 1.23 MB and is identified by SHA-256
`d0c857e94d3465657b3671309f4ddbf49d64172ade3e1e3c4ee36c0729a0125f`. The pinned version is Deno
2.9.3, the active LTS line at capture time. `docs/rt_runtime__fundamentals__stability_and_releases.md:52-58`
records that stable and LTS builds can share a version string while remaining byte-different.

Deno is described by the official landing page as a JavaScript, TypeScript and WebAssembly runtime
with secure defaults and a full toolchain (`docs/rt_runtime__index.md:17-23`). The same page states
that `.ts` files run directly without `tsc`, a build step or configuration, and that code starts in
a sandbox with no file, network or environment access until granted
(`docs/rt_runtime__index.md:32-39`). The architecture note maps Web Workers to processes, Ops to
syscalls and resource ids to file descriptors (`docs/rt_runtime__contributing__architecture.md:8-18`).

## Citation contract

- `docs/<file>.md:LINE` resolves into the captured corpus under `/tmp/deno-research/docs/`.
- `docs/<file>.md:START-END` is a verified range, inclusive on both ends.
- `NN-slug.md:LINE` points into a chapter of this guide and is used as coverage evidence.
- A path without a line supports a whole-file fact. Anything not read is `unverified`.
- `derived` marks a calculation or synthesis by the guide author, not a copied source claim.
- Fenced blocks are verbatim, at most 25 lines, and cite their source on the immediately preceding
  line. A lone `…` marks omitted verified segments.
- Every chapter ends with `## Sources` and at least eight official URLs.

The minimal `deno.json` contract is short enough to quote directly:

`docs/rt_runtime__fundamentals__configuration.md:50-62`
```json title="deno.json"
{
  "tasks": {
    "dev": "deno run --watch main.ts"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1"
  },
  "fmt": {
    "lineWidth": 100
  }
}
```

## Measured surface

| Layer | Evidence | Measurement |
|---|---|---|
| Docs site | `/tmp/deno-sitemap.xml` | 789 URLs; 174 under `/runtime/` |
| Runtime corpus | `docs/` export | 172 Markdown pages; 1,234,286 bytes |
| CLI | `docs/rt_runtime__reference__cli.md:14-48` | 5 execution commands, 9 dependency commands, 4 tooling commands in the first sections |
| Config | `docs/rt_runtime__fundamentals__configuration.md:75-99` | 10 named config families, from dependencies to permissions and compile options |
| Telemetry | `docs/rt_runtime__fundamentals__open_telemetry.md:676-698` | 5 OTel protocol values, 3 signal categories, 1 opt-in variable |
| Samples | `samples/MANIFEST.md` | 8 byte-identical slices anchored to docs lines |
| Coverage | `19-coverage-evidence.md` | 7 topics, 20 items each, 85% floor |

The CLI reference groups execution commands (`run`, `serve`, `task`, `repl`, `eval`) separately from
dependency commands (`add`, `audit`, `install`, `outdated`, `why`) and tooling commands (`bench`,
`check`, `compile`) (`docs/rt_runtime__reference__cli.md:14-48`). That grouping is the backbone of
chapter 05.

## Reading order

- **Security and configuration:** 03 → 06 → 08 → 10.
- **Observability:** 10 → 11 → 13 → 12.
- **Daily implementation:** 02 → 03 → 05 → 14 → 15.
- **Server and platform work:** 16 → 17 → 07 → 09.
- **Evidence before claims:** 18 → 19 → 21.

`20-quick-reference.md` is the in-work lookup surface. `18-coverage-and-limits.md` states what the
checklists measure and what they do not. `21-minimal-verified-cut.md` converts the dossier into a
small set of verified decisions.

## Non-goals

- No Deno binary was installed; startup time, profiling output and exporter traffic are not measured live.
- No source checkout of `denoland/deno` was used; source-level claims carry `unverified` here.
- Deploy-specific product behavior is outside the runtime scope except where the runtime docs cross-link it.
- Desktop UI packaging, dialogs and menus are summarized only as runtime-adjacent surfaces in chapter 17.

## Sample index

| Sample | Role |
|---|---|
| `sandbox-notcapable.ts` | Denied-permission error boundary |
| `permission-sets.jsonc` | Named permission sets in config |
| `deno-json-tasks.json` | Task commands with scoped permissions |
| `otel-quickstart.md` | Default OTel opt-in and endpoint |
| `otel-console-exporter.md` | Collector-free console exporter |
| `otel-console-modes.md` | Console capture, replace and ignore modes |
| `lint-rules.json` | Lint tags, include and exclude precedence |
| `deno-serve.ts` | Minimal `Deno.serve` handler |

## Conventions

| Convention | Meaning |
|---|---|
| `docs/` | Captured official page from the 2026-11-18 runtime corpus |
| `samples/` | Byte-identical slice; never normalized or annotated |
| `documented` | Answer backed by a resolved chapter line in the coverage tables |
| `unverified` | Answer needs a live process, registry, collector or benchmark |
| `derived` | Author synthesis, not a verbatim source claim |

Commands inside tables are copied from the cited line range; shell pipes are escaped only for Markdown
rendering. A citation above a fence is part of the proof, not a suggestion. When two pages disagree,
the more specific page wins and the conflict is recorded in chapter 18.

## Sources

- https://docs.deno.com/runtime/
- https://docs.deno.com/runtime/fundamentals/configuration/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/runtime/reference/cli/
- https://docs.deno.com/runtime/fundamentals/security/
- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://docs.deno.com/runtime/contributing/architecture/
- https://docs.deno.com/runtime/fundamentals/stability_and_releases/
- https://docs.deno.com/llms-full.txt
- https://jsr.io/
