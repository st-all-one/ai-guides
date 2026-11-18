# 00 - Index and citation contract

This guide is a static, auditable map of OpenClaw: a self-hosted Gateway that connects chat
channels to coding agents. Installation, onboarding and a first chat are a short path
(`pages/start/getting-started.md:9-11`), but the interesting engineering lies deeper: runtime
ownership, authority, context stability, memory and autonomous agents. The snapshot is pinned to
commit `2f5bb506ef61ab6e327df88133bfc68d95e0c90a` and product version `2026.11.5`.

## 1. Scope

The guide answers four questions and their operational follow-ups:

| Question | Chapters | What counts as an answer |
|---|---|---|
| How is OpenClaw implemented? | 01, 02, 12, 13 | Real code layout, runtime selection, Gateway lifecycle, tool and plugin surfaces |
| Where are the security boundaries? | 03, 04, 05 | Trust model, identity, secrets, sandbox backends, tool policy, approvals |
| How is context kept controlled? | 06, 07, 08 | Prefix stability, session state, compaction, memory targeting and persistence |
| How do autonomous agents work? | 09, 10, 11 | Delegation, standing orders, automations, hooks, A2A, routing and ingress |

Supporting chapters cover observability (14), performance (15), a command reference (16),
measured coverage (17) and a minimal verified cut (18).

## 2. Measured surface

These are capture-time measurements, not source claims; the sources are the pinned clone and the
official docs index.

| Surface | Measurement | Basis |
|---|---|---|
| Repository files | 65,856 | pinned clone at `2f5bb50` |
| Markdown / TS-JS-TSX / Rust / JSON | 2,529 / 53,833 / 95 / 1,119 | same clone |
| Docs index | 1,432 entries; 15,571 sitemap URLs | `https://docs.openclaw.ai/llms.txt` and `sitemap.xml` |
| Captured docs | 951 Markdown exports, 16.5 MB | `.md` exports under `pages/` |
| Guide | 24 chapters, 6 samples | this repository |

The size is why the guide is sliced by responsibility. The agent runtime alone lives under
`src/agents/`, model transport under `src/llm/`, and plugin-facing contracts under
`openclaw/plugin-sdk/*` (`pages/agent-runtime-architecture.md:6-23`). Core calls the built-in
runtime through those modules; plugins do not import `src/**` internals
(`pages/agent-runtime-architecture.md:21-23`).

## 3. Citation contract

Every factual sentence uses one of these tokens:

- `pages/<slug>.md:LINE` — a line in the captured Markdown export of
  `https://docs.openclaw.ai/<slug>`. Example: `pages/start/getting-started.md:93-106` describes
  Gateway service installation and readiness.
- `src/...:LINE`, `docs/...:LINE`, `SECURITY.md:LINE` — a line in the pinned clone. The path is
  repository-relative.
- A path without a line supports a whole-file fact.
- `unverified` marks anything not read. Inference is marked `derived`, never disguised as a
  source fact.

Code fences are verbatim, at most 25 lines, and carry the source token immediately above them.
A block that omits middle segments uses a line containing only `…`. Computed blocks put
`derived` in the header line with no blank line before the fence.

## 4. Concept map

| Concept | Where it is owned | Evidence |
|---|---|---|
| Gateway control plane | Gateway process: auth, tool policy, routing | `pages/gateway/security/trust-model.md:58-69` |
| Agent run | `src/agents/embedded-agent-runner/` and `packages/agent-core/` | `pages/agent-runtime-architecture.md:10-19` |
| Runtime selection | model/provider scoped `agentRuntime.id`, then `auto` | `pages/agent-runtime-architecture.md:56-62` |
| Model snapshot | one prepared generation per configured agent | `pages/agent-runtime-architecture.md:66-74` |
| Worker pools | CPU admission `max(1, availableParallelism() - 1)` | `pages/agent-runtime-architecture.md:92-99` |
| Trust boundary | one per Gateway, not one per user | `pages/gateway/security/trust-model.md:11-23` |
| Threat stance | identity first, scope next, model last | `pages/gateway/security/trust-model.md:73-79` |
| Active memory | bounded, opt-in enrichment for eligible sessions | `pages/concepts/active-memory/how-it-works.md:25-46` |
| Memory targeting | two paths, three modes, chat-type filters | `pages/concepts/active-memory/how-it-works.md:55-81` |
| First run | Node 24.16+/26.1+, login or API key, `npx openclaw@latest` | `pages/start/getting-started.md:15-29` |

## 5. Read order

1. Start here, then `SKILL.md` for the five invariants.
2. Implementation track: `01` → `02` → `12` → `13`.
3. Hardening track: `03` → `04` → `05` → `14` → `22`.
4. Context and memory track: `06` → `07` → `08`.
5. Autonomous-agent track: `09` → `10` → `11`.
6. Failure and operations deep track: `19` → `20` → `21`.
7. During work use `16`; read measured coverage in `23` and limits in `17`; decide with `18`.

## 6. Out of scope

- Exhaustive setup for every channel and provider in `llms.txt`; only routing and control surfaces are generalized.
- Desktop and mobile application internals beyond their role as Gateway clients and nodes.
- Release-by-release changelog history and marketing material.
- Any claim about a running system: no install, login, gateway start, provider call or smoke test was executed.
- UI layout, theming and CSS capture; this is a knowledge dossier, not a visual audit.

## 7. Refresh procedure

Re-fetch `llms.txt` and `sitemap.xml`, re-clone the repository at a new commit, re-capture the
`.md` exports into `pages/`, update `VERSION`, then run the mechanical verifier. If a citation
fails, re-read the source and rewrite the claim; never edit a line number to make a check pass.

## Sources

- https://docs.openclaw.ai/
- https://docs.openclaw.ai/llms.txt
- https://docs.openclaw.ai/start/getting-started
- https://docs.openclaw.ai/agent-runtime-architecture
- https://docs.openclaw.ai/gateway/security/trust-model
- https://docs.openclaw.ai/concepts/active-memory/how-it-works
- https://docs.openclaw.ai/concepts/multi-agent
- https://github.com/openclaw/openclaw
- https://github.com/openclaw/openclaw/blob/2f5bb506ef61ab6e327df88133bfc68d95e0c90a/AGENTS.md
- https://github.com/openclaw/openclaw/blob/2f5bb506ef61ab6e327df88133bfc68d95e0c90a/SECURITY.md
