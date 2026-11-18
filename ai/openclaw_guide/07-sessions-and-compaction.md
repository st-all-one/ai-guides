# 07 - Sessions and compaction

OpenClaw routes inbound messages to **sessions** by origin; the Gateway owns all state (`pages/concepts/session.md:11-13`). Keys have shape `agent:<agentId>:<rest>`; global-scope Gateways use `global` (`pages/concepts/session-attachment.md:32-42`). DMs share one session, groups/rooms are isolated, cron runs are fresh, webhooks per hook (`pages/concepts/session.md:65-74`).

## Main session and lifecycle

The main session is a rolling conversation keyed `agent:<agentId>:main` (for example `agent:main:main`); `session.mainKey` is ignored (`pages/concepts/main-session.md:10-21`). New sessions, group notices, child results, and heartbeats converge there as coalesced notices (`pages/concepts/main-session.md:52-79`).

Default reset mode `none` keeps one `sessionId`; `daily` uses `session.reset.atHour` (default `4`, 0-23) on the Gateway host; `idle` uses `session.reset.idleMinutes`; `/new` and `/reset` reset manually (`pages/concepts/session.md:269-284`).

`pages/concepts/session.md:298-311`
```
{
  session: {
    reset: { mode: "daily", atHour: 4 },
    resetByType: {
      group: { mode: "idle", idleMinutes: 120 },
      thread: { mode: "daily", atHour: 6 },
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 },
    },
  },
}
```

Maintenance defaults: `pruneAfter: "30d"`, `archiveDashboardAfter: "7d"`, `maxEntries: 5000`, `preserveRecent: false`; over-cap cleanup archives instead of deleting transcripts (`pages/concepts/session.md:398-415`).

## Commands and keys

| command / key | effect | evidence |
| --- | --- | --- |
| `agent:<id>:main` | Fixed main-session key | `pages/concepts/main-session.md:16-21` |
| `/new`, `/reset` | Manual reset | `pages/concepts/session.md:281-282` |
| `/compact` | Manual compaction | `pages/concepts/compaction.md:177-180` |
| `/stop` | Stop this agent's work only | `pages/concepts/session.md:96-98` |
| `/status`, `/context list` | Usage/model/toggles; prompt contents | `pages/concepts/session.md:568-573` |
| `/active-memory off` | Session-scoped recall pause | `pages/concepts/active-memory/session-controls.md:14-23` |
| `/session unbind`, `/session idle`, `/session max-age` | Detach, expiry, hard cap | `pages/tools/subagents/thread-bound-sessions.md:58-65` |
| `openclaw sessions compact <key>` | Gateway RPC compaction wrapper | `pages/cli/sessions.md:536-546` |
| `openclaw sessions cleanup --enforce` | Apply the entry cap immediately | `pages/concepts/session.md:419-421` |
| `openclaw resume`, `openclaw tui`, `openclaw attach` | Continue or attach | `pages/concepts/session-attachment.md:99-156` |
| `session_state_events`, `changesSince` | Durable signal log, delta reconciliation | `pages/concepts/session-state.md:19-37` |

State versions are the highest sequence in a durable log surviving pruning; events carry metadata, never message content (`pages/concepts/session-state.md:21-38`). Watchers get one coalesced notice, reconciled via `session_status changesSince` (`pages/concepts/session-state.md:87-109`).

## Pruning versus compaction

Pruning trims old tool results from the in-memory prompt via a hidden `openclaw.cache-ttl` projection; original entries stay on disk (`pages/concepts/session-pruning.md:9-16`). Enable with `agents.defaults.contextPruning.mode: "cache-ttl"`; the last three assistant turns are exempt and nothing before the first user message is pruned (`pages/concepts/session-pruning.md:100-102`). Compaction summarizes the conversation into the transcript (`pages/concepts/compaction.md:520-528`).

## Triggers and policy

Auto-compaction is on by default: it runs near the window limit or on a provider context-overflow error followed by a retry (`pages/concepts/compaction.md:9-15`, `pages/concepts/compaction.md:83-85`). Built-in maintenance starts at the smaller of 75% of the window and the window minus its reserve (`pages/concepts/compaction.md:87-94`). New configs default `agents.defaults.compaction.mode` to `"safeguard"` (`pages/concepts/compaction.md:56-58`).

`pages/cli/sessions.md:542-546`
```
openclaw sessions compact "agent:main:main"
openclaw sessions compact "agent:main:main" --max-lines 200
openclaw sessions compact "agent:work:main" --agent work --json
```

Without `--max-lines` the Gateway summarizes; with it the transcript is truncated without backup (`pages/cli/sessions.md:548-554`).

## What compaction may and may not rewrite

May: write a summary, keep recent messages, move the split point so tool calls stay paired with results, redact credential shapes, and mark omitted images (`pages/concepts/compaction.md:13-21`, `pages/concepts/compaction.md:54`, `pages/concepts/compaction.md:332-341`). Provider-native compaction can return a retained window plus an encrypted checkpoint; the built-in SQLite compactor keeps the session identity (`pages/concepts/compaction.md:38-43`, `pages/concepts/compaction.md:479-487`).

May not: rewrite full on-disk history, split tool pairs, drop an unprocessed admitted human request, or change retained user-message bytes on compatible routes (`pages/concepts/compaction.md:27-29`, `pages/concepts/compaction.md:19`, `pages/concepts/compaction.md:31`, `pages/concepts/context.md:256-268`). Rejected or truncated summaries write no entry; degraded entries record `details.qualityDegraded` in `/status` (`pages/concepts/compaction.md:45-50`, `pages/concepts/compaction.md:67-74`).

## Transcripts, resume, steering, threads

Rows live in `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`; archives under `~/.openclaw/agents/<agentId>/sessions/` (`pages/concepts/session.md:362-370`). `sessionStartedAt` drives daily resets, `lastInteractionAt` idle, `updatedAt` listing only (`pages/concepts/session.md:375-383`). A graceful stop marks running roots and sends one resume input; `SIGKILL` recovery uses persisted run identity (`pages/concepts/session.md:315-354`).

The session controller owns turn order with phases `idle`, `admitting`, `preparing`, `running`, `finishing`, `settling`, `mutating` (`pages/concepts/session-controller.md:80-93`). Queue policies: `steer`, `followup`, `collect`, `interrupt`; `/followup` forces a separate execution and collaborative steering needs `messages.queue.allowCollaborativeSteering: true` (`pages/concepts/session-controller.md:171-182`, `pages/concepts/session-controller.md:211-223`).

Clients project Gateway state: `openclaw resume`, `openclaw tui <target>`, and `openclaw attach <target>` (temporary session-scoped MCP grant) with credential-free URLs (`pages/concepts/session-attachment.md:11-19`, `pages/concepts/session-attachment.md:99-156`). Thread-bound `sessions_spawn` with `thread: true` gives a sub-agent its own thread on Discord/Matrix; Telegram, iMessage, Feishu, and LINE require `mode: "run"` (`pages/tools/subagents/thread-bound-sessions.md:10-30`). Defaults are `session.threadBindings.enabled`, `idleHours`, `maxAgeHours`, with auto-archive after `agents.defaults.subagents.archiveAfterMinutes` (default `60`) (`pages/tools/subagents/thread-bound-sessions.md:67-70`, `pages/tools/subagents/thread-bound-sessions.md:107-115`).

## Sources

- https://docs.openclaw.ai/concepts/session
- https://docs.openclaw.ai/concepts/main-session
- https://docs.openclaw.ai/concepts/compaction
- https://docs.openclaw.ai/concepts/session-pruning
- https://docs.openclaw.ai/concepts/session-state
- https://docs.openclaw.ai/concepts/session-controller
- https://docs.openclaw.ai/concepts/session-attachment
- https://docs.openclaw.ai/cli/sessions
- https://docs.openclaw.ai/tools/subagents/thread-bound-sessions
