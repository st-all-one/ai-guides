# 09 - Multi-agent and delegation

One Gateway can host several isolated agents. An **agent** is the full per-persona scope: workspace files, an auth store (`agentDir`), a model registry, and a SQLite session store; a **binding** maps a channel account to one agent (`pages/concepts/multi-agent.md:9-23`).

## Primitives at a glance

| primitive | when to use | config surface | evidence |
| --- | --- | --- | --- |
| `agents.entries.<id>` | a distinct persona, job, or channel account with its own workspace and auth | per-agent `workspace`, `agentDir`, `tools` | `pages/concepts/multi-agent.md:17-23` |
| `bindings[]` | route a slice of admitted traffic to one agent | `agentId` + `match` (`channel`, `accountId`, `peer`, `guildId`, `teamId`, `roles`) | `pages/concepts/agent-bindings.md:11-13`, `:100-111` |
| Template | package a working agent's job for another operator | `openclaw templates add`, ClawHub | `pages/concepts/agents-and-templates.md:14-15`, `:90-100` |
| `subagents.allowAgents` | let one agent spawn named peers | per-agent or `agents.defaults.subagents` | `pages/tools/subagents/thread-bound-sessions.md:77-85` |
| Delegate agent | act as an org identity, never as a human | own credentials + IdP delegation, `AGENTS.md` standing orders | `pages/concepts/delegate-architecture.md:14-21` |
| Broadcast group | several agents answer one admitted message | top-level `broadcast` key | `pages/channels/broadcast-groups.md:16-20` |

## Configuration entries and bindings

Bindings pick the agent only after the channel has admitted the message through pairing, allowlist, and account rules; they are not access control (`pages/concepts/agent-bindings.md:11-13`, `:125-127`). Matching is by specificity, then config order; multiple match fields combine with AND semantics (`pages/concepts/agent-bindings.md:102-111`). An omitted `accountId` matches only the default account; `"*"` is the explicit channel-wide fallback (`pages/concepts/multi-agent.md:321-323`). With more than one agent and no owner, unmatched traffic is not handed to an arbitrary first roster entry (`pages/channels/channel-routing.md:108`).

Verbatim per-agent delegation fragment from the team preset (`pages/concepts/multi-agent.md:143-161`):

```json5
{
  agents: {
    entries: {
      coordinator: {
        subagents: {
          allowAgents: ["researcher", "writer", "reviewer"],
          delegationMode: "prefer",
        },
      },
      researcher: { subagents: { allowAgents: [] } },
      writer: { subagents: { allowAgents: [] } },
      reviewer: { subagents: { allowAgents: [] } },
    },
  },
}
```

## Workspaces and templates

Four things define an agent's job: instructions in `AGENTS.md`/`SOUL.md`, workspace `skills/`, plugins/MCP servers, and automations (`pages/concepts/agents-and-templates.md:53-74`). A Template carries that setup but not memories, conversations, or credentials; secrets are declared as environment references (`pages/concepts/agents-and-templates.md:14-15`, `:97-100`). Adding a Template creates an ordinary agent and is a one-way action (`:134-138`). The workspace is the default cwd, not a hard sandbox: absolute paths can leave it unless sandboxing is enabled (`pages/concepts/multi-agent.md:46-48`).

## Delegate architecture

A delegate has its own identity, acts on behalf of humans, runs under IdP permissions, and follows standing orders in `AGENTS.md` (`pages/concepts/delegate-architecture.md:14-21`). Tier 1 is read-only plus drafts; Tier 2 sends on behalf; Tier 3 adds scheduled autonomy and requires hard blocks first (`:43-75`). Hard blocks include no external sends without approval and no execution of inbound-message commands (`:83-92`). Per-agent tool policy is enforced at the Gateway even if the persona is instructed otherwise (`:94-107`).

## Subagents: nesting and authentication

Default recursion depth is `5`; `maxChildrenPerAgent` defaults to `5` and `maxConcurrent` to `8` (`pages/tools/subagents/nesting.md:13-31`). Depth 0 is the main session; at `maxSpawnDepth` the child is a leaf with no recursive orchestration tools (`:34-41`, `:68-73`). Results announce one level at a time; each parent synthesizes its direct children before announcing upward (`:43-51`). Auth resolves by **agent id**: the local overlay from that agent's `agentDir` overrides shared profiles, and the merge is additive (`:95-105`). Memory audience follows validated parent lineage stamped at spawn, not tool arguments (`:110-130`). Implementation: depth comes from persisted `spawnDepth`/`spawnedBy` with cycle-safe ancestry (`src/agents/subagents/spawn/subagent-depth-policy.ts:20-54`); target ids are intersected with the configured roster (`src/agents/subagents/spawn/subagent-target-policy.ts:1-4`). Spawn context carries host-verified requester facts and inherited tool policy, never tool-supplied authority (`src/gateway/agent-runtime-session-spawn-context.ts:12-28`).

## Yield, handoff, and thread-bound sessions

The subagent registry owns completion across `sessions_yield`: an accepted yield ends the execution but keeps the task and its completion audience, and a successor turn is admitted under fresh authority (`pages/concepts/subagent-yield-handoff.md:12-25`, `:187-195`). One frozen, sorted batch produces exactly one continuation; retired children never hold siblings back (`:239-264`). A paused, continuable run shows `subagentRunState: "paused"` while its recorded status is unchanged (`:93-98`). Cron-owned runs keep scheduler delivery rather than starting a competing requester turn (`:159-163`); admission matches the exact requester, run id, and `subagent_settle` provenance (`src/agents/subagents/requester-cron-authority-admission.ts:10-37`).

Thread bindings give a spawned child its own channel thread; follow-ups in it keep routing to that session (`pages/tools/subagents/thread-bound-sessions.md:10-15`). Only Discord and Matrix open new child threads; `thread: true` is rejected on Telegram, iMessage, Feishu, and LINE (`:22-30`). Global keys are `session.threadBindings.enabled`, `idleHours`, `maxAgeHours`; sessions auto-archive after `archiveAfterMinutes` (default `60`) (`:67-69`, `:107-115`).

## Parallel lanes, worktrees, and the session tool

Specialist lanes serialize per session and share global model/tool capacity; add policy, not just more agents (`pages/concepts/parallel-specialist-lanes.md:16-32`). Each lane writes a contract in `AGENTS.md`, then tunes `maxConcurrent` and queue policy (`:42-88`). Managed worktrees give a task its own branch and checkout, recorded in shared state and snapshotted before removal (`pages/concepts/managed-worktrees.md:11-18`); the store root is `<state-dir>/worktrees` unless `worktreeRoot` is set (`:292-298`). The session tool exposes `sessions_spawn`, `sessions_yield`, `subagents`, `sessions_send`, and `sessions_*` discovery under tool-profile and policy checks (`pages/concepts/session-tool.md:24-52`); `sessions_yield` ends the turn so an announced child completion can run (`:505`).

## Sources

- https://docs.openclaw.ai/concepts/multi-agent
- https://docs.openclaw.ai/concepts/agent-bindings
- https://docs.openclaw.ai/concepts/agents-and-templates
- https://docs.openclaw.ai/concepts/delegate-architecture
- https://docs.openclaw.ai/tools/subagents/nesting
- https://docs.openclaw.ai/tools/subagents/thread-bound-sessions
- https://docs.openclaw.ai/concepts/subagent-yield-handoff
- https://docs.openclaw.ai/concepts/parallel-specialist-lanes
- https://docs.openclaw.ai/concepts/managed-worktrees
- https://docs.openclaw.ai/concepts/session-tool
