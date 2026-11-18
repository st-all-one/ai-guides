---
name: openclaw
description: >-
  OpenClaw 2026.11.5 audited reference: self-hosted Gateway architecture and agent runtime,
  installation and deep configuration, one-trust-boundary security model, access control and
  SecretRefs, sandbox backends and tool policy, stable conversation context, sessions and
  compaction, active memory and SQLite persistence, multi-agent delegation, autonomous programs
  (standing orders, automations, hooks, A2A), channel routing, MCP and plugins, observability,
  troubleshooting and performance limits. Load when designing, implementing, securing, operating
  or debugging an OpenClaw Gateway or its agents.
category: ai
version: 2026.11.5 / 2f5bb50
tags: [openclaw, gateway, agents, multi-agent, subagents, security, sandbox, secrets, memory, context, sessions, mcp, plugins, self-hosted]
license: MIT
---

# OpenClaw

OpenClaw is a self-hosted Gateway that connects chat channels to coding agents. This guide is a
static, auditable snapshot of the real source at commit `2f5bb506ef61ab6e327df88133bfc68d95e0c90a`
and of the official documentation site. It was captured on 2026-11-18. No live Gateway was
installed and no provider credentials were used; every claim points at a file that was read.

## When to load this skill

- Designing or reviewing an OpenClaw deployment, agent topology or channel routing.
- Implementing configuration, tools, skills, MCP servers, plugins, hooks or automations.
- Hardening trust boundaries, secrets, approvals, sandboxing or tool permissions.
- Debugging context, prompt caching, sessions, compaction, memory or multi-agent delegation.
- Operating the Gateway: Doctor, audit, logs, OTel, updates, backups and incident response.

## Measured surface

| Surface | Measurement |
|---|---|
| Repository files | 65,856 total; 2,529 Markdown; 53,833 TS/JS/TSX; 95 Rust; 1,119 JSON |
| Docs index | `llms.txt`: 1,432 entries; `sitemap.xml`: 15,571 URLs |
| Captured docs | 951 Markdown page exports, 16.5 MB, under `pages/` in the research corpus |
| Guide | 24 chapters (00-23), six byte-identical samples, one mechanical verifier |

## Four focus themes

| Theme | Primary chapters | Core claim |
|---|---|---|
| Implementation | 01, 02, 12, 13 | Gateway owns state; runtime code lives under `src/agents/`; plugins use SDK barrels, never `src/**` internals |
| Security | 03, 04, 05 | One trust boundary per Gateway; identity, scope, then model; session keys are routing selectors, not authorization tokens |
| Controlled memory/context | 06, 07, 08 | Prefix stability within a session; only compaction rewrites history; active memory is bounded and opt-in per surface |
| Autonomous multi-agent | 09, 10, 11 | Subagents, standing orders, automations and A2A are authority-bearing run paths, not chat decoration |

## Five invariants worth memorizing

1. **One owner per responsibility.** Owners decide authoritative state; adapters translate; caches derive with an explicit invalidation lifecycle.
2. **One trust boundary per Gateway.** Authenticated operator access is a control-plane role, not multi-tenant isolation; use separate Gateways for adversarial users.
3. **Stable conversation context.** Tool definitions, system prompt and earlier history depend only on session and config facts inside a session; per-turn facts go in that turn's message.
4. **Authority at the boundary.** Credentials, signatures and IDs are facts, not authority; the owner checks admission once when work starts.
5. **Secrets are referenced, not copied.** SecretRefs, env includes and the shared secret store keep credentials out of config and logs.

## File Map

| File | Content |
|---|---|
| `00-index.md` | Scope, citation contract, measured surface, read order, file map |
| `01-architecture-and-runtime.md` | Process topology, code layout, runtime selection, protocol surfaces |
| `02-installation-and-gateway.md` | Install paths, Gateway service, config, environments, Doctor, updates |
| `03-trust-model-and-threat-surface.md` | Trust boundary, threat model, disclosure, what is not a bug |
| `04-access-control-and-secrets.md` | Auth, scopes, pairing, allowlists, SecretRefs, approvals |
| `05-sandbox-and-tool-policy.md` | Sandbox modes/backends, workspace access, tool policy, elevated mode |
| `06-context-and-prompt-stability.md` | Context engine, prompt assembly, prefix stability, prompt caching |
| `07-sessions-and-compaction.md` | Session lifecycle, pruning, compaction, transcripts, resume, steering |
| `08-memory-and-persistence.md` | Built-in and active memory, provenance, SQLite state, migrations |
| `09-multi-agent-and-delegation.md` | Agent entries, bindings, subagents, nesting, handoff, worktrees |
| `10-autonomous-programs.md` | Standing orders, automations, hooks, MCP events, A2A, broadcast groups |
| `11-channels-and-routing.md` | Ingress, agent/session selection, pairing, groups, loop protection |
| `12-tools-mcp-and-plugins.md` | Built-in tools, skills, MCP, plugin SDK, capability ladder |
| `13-implementation-patterns.md` | Cited recipes for setup, delegation, secrets, sandbox, scheduling, memory |
| `14-observability-and-diagnostics.md` | Doctor, security audit, logs, redaction, OTel, exposure runbook |
| `15-performance-cost-and-limits.md` | Context budget, rate limits, failover, workers, job budgets, usage |
| `16-quick-reference.md` | Commands, config keys and file locations with line citations |
| `17-coverage-and-limits.md` | Per-topic coverage, unexecuted paths, known gaps, verification method |
| `18-minimal-verified-cut.md` | Dossier self-review, target-artifact contract, simplest model, spec budget |
| `19-errors-and-retries-deep.md` | Error taxonomy, retries, idempotency, failover, partial delivery, recovery |
| `20-logs-and-observability-deep.md` | Log fields, redaction, OTel spans and metrics, Prometheus, triage signals |
| `21-performance-deep.md` | Context economics, queues, worker admission, placement, profiling, sizing |
| `22-security-hardening-deep.md` | Exposure runbook, baseline, injection, file/browser controls, incident response |
| `23-coverage-evidence.md` | 20-item checklists and measured coverage for errors, logs, performance, security |
| `samples/` | Byte-identical copies of six source files that anchor the analysis |

## Citation contract

- `pages/<slug>.md:LINE` resolves to the captured Markdown export of `https://docs.openclaw.ai/<slug>`.
- `src/...:LINE`, `docs/...:LINE` and root files such as `SECURITY.md:LINE` resolve to the pinned clone.
- A path without a line supports a whole-file fact. `unverified` marks anything not read.
- Computed claims carry `derived`; code fences are verbatim, at most 25 lines, with the source token above them.
- Every chapter ends with `## Sources` and at least eight official URLs.

## Read order

Always start at `00-index.md`. For implementation, continue `01` → `02` → `12` → `13`. For hardening,
read `03` → `04` → `05` → `14`. For memory and context, read `06` → `07` → `08`. For autonomous
agents, read `09` → `10` → `11`. Use `16-quick-reference.md` during work and `17`/`18` before decisions.

## Verification

The verifier checks the exact tree, first-line headings, final `## Sources`, byte bands, English-only
prose, line-range resolution for every citation, literal code fences, byte-identical samples and
official URL presence. Run it from the research corpus at capture time; see `17-coverage-and-limits.md`.

## Source roots

- https://docs.openclaw.ai/
- https://docs.openclaw.ai/llms.txt
- https://github.com/openclaw/openclaw
- https://github.com/openclaw/openclaw/blob/2f5bb506ef61ab6e327df88133bfc68d95e0c90a/SECURITY.md
