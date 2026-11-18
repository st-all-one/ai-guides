# 18 - Coverage and limits

Coverage here is a claim about the documentation surface that was actually read, not about every
capability of the Deno binary. The guide fixes one corpus, resolves citations mechanically and
keeps seven independent checklists. A topic passes only when its own checklist clears 85%; a high
average cannot hide an empty topic.

## Coverage model

Seven topics were chosen from the request and from the measured documentation surface:
`usability`, `configuration`, `security`, `logging`, `telemetry`, `performance` and `lint`. Each
topic has 20 concrete requirements. A requirement is `documented` when a chapter answer resolves
to a `NN-slug.md:LINE` token that exists. It is `unverified` when the answer would require a live
process, a deployed collector, a private registry or a benchmark run. The denominator is always
20, so 17 documented items equal 85% and 19 equal 95%.

The verifier parses `19-coverage-evidence.md`, checks every evidence line range, recomputes each
percentage and fails the guide if any topic drops below the floor. It also resolves every
`docs/<file>.md:LINE` citation, compares every fenced block against its cited slice, checks that all
eight samples are byte-identical and scans all Markdown for Portuguese leakage.

## Why these seven topics

| Topic | Primary evidence | Observable contract |
|---|---|---|
| `usability` | `docs/rt_runtime__index.md:25-39` | Direct TS execution, zero config, built-in toolchain |
| `configuration` | `docs/rt_runtime__fundamentals__configuration.md:68-99` | Config discovery, ten config families, workspace root |
| `security` | `docs/rt_runtime__fundamentals__security.md:62-85` | Sandbox, scoped allow flags, deny overrides |
| `logging` | `docs/rt_runtime__fundamentals__open_telemetry.md:270-292` | Console capture, runtime logs, exit errors, modes |
| `telemetry` | `docs/rt_runtime__fundamentals__open_telemetry.md:676-698` | Opt-in, protocols, endpoints, headers |
| `performance` | `docs/rt_runtime__fundamentals__cpu_profiling.md:21-37` | Profiling flags, sampling interval, transpiled line caveat |
| `lint` | `docs/rt_runtime__reference__cli__lint.md:42-87` | CI exit status, tags, include/exclude precedence |

Configuration is not a single file format in this runtime. The same page separates `package.json`
from `deno.json`, describes `.jsonc` support and reports automatic discovery in the current
directory or any parent (`docs/rt_runtime__fundamentals__configuration.md:44-73`). That is why the
`configuration` checklist includes both discovery and field-level behavior.

Security is likewise more than a flag list. The sandbox denies file, network, environment and
subprocess access by default; scoped flags narrow each category; `--deny-*` overrides a broader
allow; `-A` turns the sandbox off
(`docs/rt_runtime__fundamentals__security.md:64-85`, `docs/rt_runtime__fundamentals__security.md:109-114`).
The checklist therefore tests prompts, error handling, named sets and untrusted-code boundaries.

## What is deliberately excluded

- **Live performance numbers.** The docs list the profiling flags and warn that profiles report
  transpiled JavaScript line numbers (`docs/rt_runtime__fundamentals__cpu_profiling.md:32-37`).
  No profile was generated, so no hot-function result is claimed.
- **Exporter delivery.** The docs define the endpoint, protocol and header variables
  (`docs/rt_runtime__fundamentals__open_telemetry.md:681-698`). No collector was started, so the
  guide does not claim that spans arrived at a backend.
- **Private registry access.** Auth tokens are documented as a variable
  (`docs/rt_runtime__reference__env_variables.md:137`), but no private fetch was attempted.
- **Native build behavior.** Source build instructions exist in the install page
  (`docs/rt_runtime__getting_started__installation.md:346`), but no compiler toolchain was used.

## Verification method

The quality gate is intentionally simple enough to run from the CI command surface documented by
the runtime itself:

`docs/rt_runtime__reference__cli__lint.md:47-51`
```sh
deno lint
deno fmt --check
deno test
```

That three-command surface is the model for this guide's own verifier: exact tree, resolved
citations, verbatim blocks, byte-identical samples and computed coverage. The verifier does not
execute Deno, so it never confuses "documented" with "observed in production".

## Known documentation limits

| Limit | Evidence | Consequence |
|---|---|---|
| `@std/log` is no longer recommended | `docs/rt_runtime__reference__std__log.md:12-15` | Logging chapter treats OTel as the production path |
| OTel gRPC needs Deno 2.8+ | `docs/rt_runtime__fundamentals__open_telemetry.md:688-691` | Older pins cannot use the gRPC protocol value |
| Permission traces cost performance | `docs/rt_runtime__reference__env_variables.md:155` | Stack traces in audit are opt-in |
| CPU profiles use transpiled lines | `docs/rt_runtime__fundamentals__cpu_profiling.md:32-37` | Source-map correlation needs extra work |
| Stable and LTS builds share version text | `docs/rt_runtime__fundamentals__stability_and_releases.md:52-58` | Version string alone does not identify channel |

The last row matters for reproducibility. A report that says "2.9.3" has not identified the channel
unless it also states stable or LTS. The release table records that `deno upgrade`, `deno upgrade
2.9.3`, `deno upgrade lts` and `deno upgrade rc` resolve to different builds
(`docs/rt_runtime__fundamentals__stability_and_releases.md:62-66`).

## Interpreting the final number

A passing checklist means an agent can answer the requirement from this guide with a resolved
anchor. It does not mean the agent has run the command. For runtime-sensitive work, chapter 13
gives the debug workflow and chapter 12 names the profiling knobs; the operator still has to run
them against the target program. The minimal cut in chapter 21 keeps that boundary explicit.

## Sources

- https://docs.deno.com/runtime/
- https://docs.deno.com/runtime/reference/cli/lint/
- https://docs.deno.com/runtime/reference/cli/run/
- https://docs.deno.com/runtime/fundamentals/configuration/
- https://docs.deno.com/runtime/fundamentals/security/
- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://docs.deno.com/runtime/fundamentals/cpu_profiling/
- https://docs.deno.com/runtime/fundamentals/stability_and_releases/
- https://docs.deno.com/runtime/reference/env_variables/
- https://docs.deno.com/runtime/reference/std/log/
