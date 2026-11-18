# 18 - Minimal verified cut

A dossier can be precise and still fail to decide anything. This chapter closes that gap: it
reviews the guide's own weaknesses, names the target artifacts an implementer actually touches,
and chooses the smallest model that covers them. Everything here is a synthesis of cited sources;
synthesis steps carry `derived`.

## 1. Self-review of this dossier

| Weakness found | Consequence | Treatment |
|---|---|---|
| 951 pages captured, not all read | Breadth indexed, not mastered | Per-topic coverage in `17`; unseen claims `unverified` |
| 53,833 TS/JS/TSX files | Chapter 01 names owners, not paths | Code claims stay at cited anchors |
| No live Gateway was started | Commands are documented, not observed | All execution claims are excluded |
| Four focus themes are deep; provider specifics are shallow | A deploy may need pages not in this guide | `16` points at command families; `00` explains refresh |
| Security defaults can be misread as tenant isolation | Bad architecture decisions | One trust boundary per Gateway restated in `03` and here |
| Context and memory interact with authority | A memory optimization can leak across personas | Targeting and visibility keys are explicit in `04`, `06`, `08` |

No contradiction was found: trust model, prompt stability and session visibility all assume one operator boundary and treat cross-session access as scope, not a hidden security layer (`pages/gateway/security/trust-model.md:11-23`).

## 2. Contract per target artifact

The artifacts below are what an implementer reads, edits or observes; "model requirement" names the authoritative owner.

| Target artifact | Data displayed | Real interaction | Model requirement |
|---|---|---|---|
| `openclaw.json` and env includes | agents, channels, tools, secrets references | edit and reload through config owner | one config snapshot per Gateway |
| Agent entry (`agents.entries.*`) | id, workspace, model, runtime, tools, bindings | `openclaw agents add/list`, binding to channels | one owner per agent; bindings are routing facts |
| Session transcript | ordered messages, delivery origin, status | append through session manager; read via `sessions`/`chat.history` | one transcript owner; append-only history except compaction |
| Approval prompt | command, operands, requesting context, scope | `approvals get/pending/resolve` | authority checked at start; approval binds request context |
| SecretRef config | provider, ref path, masked value | `secrets audit/configure/apply` | secrets referenced, never copied into config or logs |
| Tool policy | allow/deny, sandbox/elevated choice | tool call gated by per-turn authority | one policy owner; capability is not authority |
| Automation job | schedule, payload, delivery, run history | create, force run, inspect runs | run lifecycle owned by Gateway scheduler |
| Standing order | permanent operating authority for an agent program | attach to agent and constrain runs | authority is explicit and scoped; not inferred from chat |
| Active memory index | recalled passages, provenance, targeting state | `memory status/index`, bounded recall sub-agent | bounded enrichment; opt-in per surface |
| Audit report | exposure, plugin trust, config findings | `openclaw audit` | findings derive from config and filesystem state |

**Count (derived):** 10 artifacts, 9 of which are projections of three owners (config snapshot,
session store, authority gate). Only the audit report has an independent read model, and even it is
derived from the same config and filesystem facts. The active memory index is a derived cache with
its own invalidation lifecycle, not a second source of truth.

## 3. Simplest model that covers all artifacts

Choose: **one Gateway owner + one prepared config/model snapshot + one append-only session store +
one authority gate per run**. Everything else is a projection or a cache.

| Alternative | Why rejected |
|---|---|
| Separate state owner per channel | Transports differ, but state ownership must not; adapters translate, they do not own |
| One database per agent or persona | Cross-agent session defaults and one trust boundary make extra stores duplication with divergent invalidation |
| Duplicate memory stores per renderer | Active memory is bounded enrichment with provenance; copying it into each renderer breaks scope control |
| Per-message signature as authorization | `sessionKey` is a routing selector; authenticated operator scope is the control-plane role |
| Stored token or ID as authority | Facts are not authority; admission is checked once when work starts |

The model matches documented boundaries: runtime code is owned under `src/agents/`, model transport
under `src/llm/`, plugin contracts at SDK barrels (`pages/agent-runtime-architecture.md:6-23`);
one prepared model runtime generation is published per configured agent
(`pages/agent-runtime-architecture.md:66-74`); and one Gateway is one trust boundary
(`pages/gateway/security/trust-model.md:11-23`).

## 4. Sufficiency test

Each question must be answerable without inventing a new field or store.

1. Which agent received this message? → bindings in config snapshot.
2. Which workspace did it use? → agent entry in config snapshot.
3. Which model runtime served the turn? → prepared generation and `agentRuntime.id`.
4. Was this tool call authorized? → per-turn authority gate and tool policy.
5. Did approval bind to the exact command? → approval request context.
6. Is this transcript readable by another agent? → `tools.sessions.visibility` and agent-to-agent scope.
7. Was a recalled memory from another conversation? → active memory targeting and provenance.
8. Did compaction rewrite history? → session event and transcript state.
9. Which secret did the runtime use? → SecretRef resolution, not a copied value.
10. Why did this automation fire? → schedule, payload and run history.
11. Is this plugin allowed to call the tool? → plugin contract plus tool policy.
12. What changed the Gateway exposure? → config diff and audit findings.

No question requires a new column. If a future artifact does, revisit the config/session/authority
owners rather than adding a parallel store.

## 5. Specification budget

| Document | Cap | Anti-regrowth rule |
|---|---|---|
| Deployment spec | 200 lines | One config snapshot; env includes reference, never duplicate |
| Agent topology spec | 150 lines | One owner per agent; bindings are routing facts, not permissions |
| Security spec | 200 lines | State the trust boundary once; scope changes are explicit keys |
| Context and memory spec | 180 lines | Prefix stability by default; enrichment bounded and opt-in |
| Operations spec | 150 lines | One command family per signal; derive reports from state |

Anti-regrowth: derive, do not store; one query serves N renderers; one field has one screen plus its query; do not repeat defaults. Cite the incident or source for every new rule.

## Sources

- https://docs.openclaw.ai/agent-runtime-architecture
- https://docs.openclaw.ai/gateway/security/trust-model
- https://docs.openclaw.ai/gateway/security/access-control
- https://docs.openclaw.ai/concepts/active-memory/how-it-works
- https://docs.openclaw.ai/concepts/multi-agent
- https://docs.openclaw.ai/automation/standing-orders
- https://docs.openclaw.ai/gateway/config-tools/sessions-and-subagents
- https://docs.openclaw.ai/gateway/secrets/secretref-contract
- https://github.com/openclaw/openclaw
- https://github.com/openclaw/openclaw/blob/2f5bb506ef61ab6e327df88133bfc68d95e0c90a/SECURITY.md
