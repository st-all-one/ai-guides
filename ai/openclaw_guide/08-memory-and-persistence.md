# 08 - Memory and persistence

Memory Core, the default plugin, stores plain workspace files plus one SQLite index in trust tiers (`pages/concepts/memory-architecture.md:11-15`). Rules: no hidden state; write-time curation; the write path is the security boundary; fixed checks bound model judgment; failures never block replies (`pages/concepts/memory-architecture.md:28-51`).

## Memory kinds

| memory kind | writer | retrieval | scope | evidence |
| --- | --- | --- | --- | --- |
| Instructions (`AGENTS.md`) | Human only | Always at session start | Workspace, trusted | `pages/concepts/memory-architecture.md:57` |
| Curated core (`MEMORY.md`, `USER.md`) | Dreaming; user | Bootstrap when provenance eligible; search | Main/private | `pages/concepts/memory-architecture.md:58`, `pages/concepts/memory-architecture.md:232-238` |
| Episodic (daily notes, transcripts) | Agent; flush | Tools or Active Memory | Per agent | `pages/concepts/memory-architecture.md:59`, `pages/concepts/memory-architecture.md:268-273` |
| Prospective (intents, cron) | `intent` tool; schedules | Rule prefilter | Per agent | `pages/concepts/memory-architecture.md:60`, `pages/concepts/memory-architecture.md:376-384` |
| Review (`DREAMS.md`) | Dreaming phases | Never injected; human reading | Workspace | `pages/concepts/memory-architecture.md:61` |
| Session state events | Runtime signal log | `session_status changesSince` | Per session | `pages/concepts/session-state.md:19-37` |
| Memory index | Background worker | `memory_search`, `memory_get` | Per-agent SQLite | `pages/concepts/memory-architecture.md:164-170`, `pages/cli/memory.md:12-22` |

Curated files are small and normally in context; episodic files are append-friendly and search-retrieved (`pages/concepts/memory-architecture.md:63-73`). Workspace files include `AGENTS.md`, `SOUL.md`, `USER.md`, `IDENTITY.md`, `BOOTSTRAP.md`, `MEMORY.md`, and `memory/YYYY-MM-DD.md`; optional files may be absent and large ones truncated (`pages/concepts/agent-workspace.md:105-145`).

## Provenance

Entries carry origin class (`owner`, `agent`, `untrusted`, `system`), session kind, timestamp, and supersession key in SQLite columns prose cannot write (`pages/concepts/memory-architecture.md:75-89`). Unknown provenance becomes `untrusted` if externally derived or `system` if runtime instructions, never `owner` (`pages/concepts/memory-architecture.md:91-93`). Cron, heartbeat, and sub-agent sessions cannot produce promotion candidates, and recalled content is never re-extracted (`pages/concepts/memory-architecture.md:95-106`). Provenance is unforgeable, untrusted content quarantined, and taint propagates (`pages/concepts/memory-architecture.md:393-416`).

## Write path and built-in memory

Dreaming consolidation is the sole primary writer: observations, flush, and session-end transcripts land in the episodic tier with provenance (`pages/concepts/memory-architecture.md:136-157`). A silent flush saves durable context but is skipped if policy removes every persistence tool (`pages/concepts/compaction.md:434-440`). Indexing coalesces notifications over five seconds (`pages/concepts/memory-architecture.md:164-170`). The `memory-core` CLI covers `status`, `index`, `search`, `forget`, and `session-backfill` (`pages/cli/memory.md:12-26`).

## Active memory

`pages/concepts/active-memory/how-it-works.md:57-69`
```
Active Memory has two targeting paths for the deep-recall lane:

1. **Remember across conversations** automatically targets agents whose
   effective `memory.search.rememberAcrossConversations` setting is enabled, but
   only for private direct or persistent explicit UI conversations.
2. **Advanced Active Memory** targets agent IDs listed in
   `plugins.entries.active-memory.config.agents` and applies the plugin's chat
   type and chat ID controls.

Both paths require the plugin to be enabled and an eligible interactive
persistent conversation. A session-scoped `/active-memory off` pauses both
paths for that conversation. If any condition fails, active memory does not run
for that turn, and the main reply is unaffected.
```

It runs only in persistent interactive sessions (`pages/concepts/active-memory/how-it-works.md:31-46`). `config.mode` is `escalate` (default), `always`, or `off`, with the trusted-trigger lane still available in `off` (`pages/concepts/active-memory/how-it-works.md:71-81`). `agents.entries.<id>.memory.search.rememberAcrossConversations` defaults on for personal installs without DM isolation (`pages/concepts/active-memory/enabling.md:9-35`). Recall tools resolve as `config.toolsAllow`, provider `recallToolNames`, then built-in fallback: `["memory_search", "memory_get"]` for built-in memory, `["memory_recall"]` for LanceDB (`pages/concepts/active-memory/memory-tools.md:11-25`). `toolsAllow` is a limit, not a grant, and ignores wildcards and core tools (`pages/concepts/active-memory/memory-tools.md:27-47`). Keys include `allowedChatTypes` (default `["direct"]`), `timeoutMs` (default `15000`), `maxSummaryChars` (default `220`) (`pages/concepts/active-memory/configuration.md:12-34`); `/active-memory status|off|on` is session-scoped, `--global` needs owner or `operator.admin` (`pages/concepts/active-memory/session-controls.md:9-36`).

## Recall lanes, dreaming, intents

Lane 1 needs no model calls: eligible `MEMORY.md`/`USER.md` bootstrap, `memory_search` ranking with 30-day recency decay and write-time importance 1-10, and trigger scores at or above 0.65 injecting at most three hidden entries (`pages/concepts/memory-architecture.md:228-250`). Auto-injection is curated-tier only (`pages/concepts/memory-architecture.md:268-273`). Lane 2 is the blocking recall sub-agent on recall intent without a strong lane-1 hit (`pages/concepts/memory-architecture.md:275-291`). Dreaming is on by default: Light/REM stage and reflect; Deep applies a rule gate then bounded consolidation written by atomic rename with optimistic concurrency (`pages/concepts/memory-architecture.md:172-220`). Time intents become cron jobs, event intents SQLite via `intent`, aspirations Markdown; defaults: 24-hour cooldown, three fires, 90-day expiry, at most three intents per turn (`pages/concepts/memory-architecture.md:367-391`).

## Persisted state

SQLite is the default: one control-plane database under the state directory (usually `~/.openclaw`) plus one per agent at `<agentDir>/openclaw-agent.sqlite` (`pages/install/backups.md:13-17`). Never copy live `.sqlite`, `-wal`, `-shm`, or `-journal` files; `openclaw backup create` or Litestream captures committed state (`pages/install/backups.md:34-37`, `pages/install/backups.md:60-68`). `openclaw doctor --fix` owns file-to-SQLite migrations, writing verified rows and receipts before retiring sources (`pages/cli/doctor/state-migrations.md:9-27`, `pages/cli/doctor/state-migrations.md:143`); repairs include legacy `sessions.json` import and disk-layout migration (`pages/gateway/doctor/state-and-sessions.md:49-58`).

## Sources

- https://docs.openclaw.ai/concepts/memory-architecture
- https://docs.openclaw.ai/concepts/active-memory/how-it-works
- https://docs.openclaw.ai/concepts/active-memory/enabling
- https://docs.openclaw.ai/concepts/active-memory/memory-tools
- https://docs.openclaw.ai/concepts/active-memory/session-controls
- https://docs.openclaw.ai/concepts/compaction
- https://docs.openclaw.ai/cli/memory
- https://docs.openclaw.ai/install/backups
- https://docs.openclaw.ai/cli/doctor/state-migrations
- https://docs.openclaw.ai/gateway/doctor/state-and-sessions
