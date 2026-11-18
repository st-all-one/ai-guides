# 10 - Autonomous programs

Standing orders define **what** an agent may do without prompting; automations define **when** it runs (`pages/automation/standing-orders.md:10`, `:62-64`). Standing orders live in `AGENTS.md` (auto-injected every session) and name scope, triggers, approval gates, and escalation rules (`pages/automation/standing-orders.md:18-35`).

## Mechanism map

| mechanism | trigger | authority | delivery | evidence |
| --- | --- | --- | --- | --- |
| Standing order | program defined in `AGENTS.md` | permanent, bounded authority + approval gates | via the calling job's delivery | `pages/automation/standing-orders.md:24-31` |
| Automation (cron) | schedule, one-shot, or condition | per-job scheduled authority | `announce`, `webhook`, `none` | `pages/automation/cron-jobs.md:12-14`; `pages/automation/cron-jobs/delivery.md:16-20` |
| Inbound webhook | bearer-authenticated HTTP POST | `hooks.allowedAgentIds`, dedicated token | admission `200`, optional `waitForCompletion` | `pages/automation/cron-jobs/webhooks.md:16-19`, `:27-37` |
| Gmail PubSub | Google Pub/Sub push to a watcher | restricted reader agent, two tokens | hook submits an isolated agent turn | `pages/automation/cron-jobs/gmail.md:16-24`, `:113` |
| IMAP trigger | watched mailbox message | `agentId` + sender auth + sandbox | isolated reader session, `deliver: false` | `pages/automation/imap.md:11-15`, `:17-73` |
| Internal hook | exact event key or family | event producer's authority; handler cannot block | `event.messages` only for some producers | `pages/automation/hooks/event-types.md:14-18`; `pages/automation/hooks/writing-hooks.md:108-123` |
| MCP Events | signed webhook from an MCP server | automation's existing policy; HMAC per subscription | existing job delivery | `pages/automation/mcp-events.md:11-15`, `:158-163` |
| A2A task | authenticated JSON-RPC `SendMessage` | per-peer bearer token; no unauthenticated mode | task artifact polled via `GetTask` | `pages/channels/a2a.md:9-14`, `:184-188` |
| Broadcast group | admitted group message with mention | per-participant agent policy | one reply per participant session | `pages/channels/broadcast-groups.md:16-20`, `:245-262` |
| Ambient room event | unmentioned allowed group chatter | room allowlist; `message` tool required to post | private final text unless sent explicitly | `pages/channels/ambient-room-events.md:11-15`, `:61-71` |

## Standing orders and the run lifecycle

The recommended automation prompt references the standing order instead of duplicating it (`pages/automation/standing-orders.md:74-86`):

```bash
openclaw automations add \
  --name daily-inbox-triage \
  --cron "0 8 * * 1-5" \
  --tz America/New_York \
  --timeout-seconds 300 \
  --announce \
  --channel imessage \
  --to "+1XXXXXXXXXX" \
  --message "Execute daily inbox triage per standing orders. Check mail for new alerts. Parse, categorize, and persist each item. Report summary to owner. Escalate unknowns."
```

Every task follows Execute-Verify-Report; acknowledgment is not execution, and failures are reported, not silently retried (`pages/automation/standing-orders.md:165-184`). Runtime (`pages/automation/cron-jobs/how-it-works.md:16-30`): jobs persist in SQLite; run-now is authorized when queued; a `session:<key>` job waits for idle; a started run keeps its configuration; `--at` jobs auto-delete after confirmed delivery; budgets are 60 minutes for isolated turns, 10 for commands, 5 for scripts; overdue jobs are rescheduled, not replayed. Restart recovery restores a recorded terminal result without re-running it; an interrupted agent-turn job may get one retry (`pages/automation/cron-jobs/how-it-works.md:54-58`).

## Delivery modes and failure handling

| Mode | Behavior |
| --- | --- |
| `announce` | send result and record confirmed delivery in the destination |
| `webhook` | POST finished event payload to a URL |
| `none` | no automatic conversation result or notification |

(`pages/automation/cron-jobs/delivery.md:16-20`.) `none` disables results and notifications; webhook delivery is external-only (`:58`). Ambiguous webhook sends stay **Unknown** and are not retried; required delivery also leaves completion unknown (`:24-28`). All outbound automation webhooks use a strict SSRF guard that refuses loopback and private targets by default (`:62-83`).

## Internal hooks, MCP events, and agent protocols

Internal events subscribe by exact key or bare family; `command:stop` and compaction keys are not interchangeable with their families (`pages/automation/hooks/event-types.md:14-18`, `:56-61`). Awaited keys include `command:new`, `command:reset`, and `agent:bootstrap`; message events are asynchronous observations, not a transport audit (`:20-49`). Each event carries `type`, `action`, `sessionKey`, `timestamp`, `context`, and `messages` (`pages/automation/hooks/writing-hooks.md:92-106`). A hook needs `HOOK.md` plus a handler discovered as `handler.ts`, `handler.js`, `index.ts`, or `index.js` (`:51-54`); only chat `/new` and `/reset` join `event.messages` into a reply (`:108-123`).

MCP Events uses the opt-in plugin with a public HTTPS callback origin and one signed event per request up to 256 KiB (`pages/automation/mcp-events.md:19-31`, `:158-163`). A `2xx` acknowledges durable receipt, not model completion; duplicate ids are scoped to the source binding (`:160-171`). Subscriptions have finite leases and refresh before `refreshBefore`; `cron.triggers.enabled: false` pauses event-run admission (`:122-136`). Replay is not end-to-end exactly once: make write actions idempotent (`:183-194`).

A2A uses a public Agent Card and a bearer token per trusted peer; there is no unauthenticated mode, and messages beginning with `/` are rejected (`pages/channels/a2a.md:9-14`, `:184-192`). Each peer plus `contextId` gets an isolated session; `CancelTask` is refused rather than falsely reporting cancellation (`:174-178`, `:126`).

Broadcast groups run several agents on one admitted message in its own session; qualified entries allow at most 4 rounds and 32 participant turns, with budgets in memory and lost on restart (`pages/channels/broadcast-groups.md:18-20`, `:108-128`). Ambient rooms require `requireMention: false` and the `message` tool, because final text stays private unless `message(action=send)` is called (`pages/channels/ambient-room-events.md:35-55`, `:61-71`). Bot-loop protection is a sliding-window pair guard: `enabled: true`, `maxEventsPerWindow: 20`, `windowSeconds: 60`, `cooldownSeconds: 60`, with narrowest-override precedence (`pages/channels/bot-loop-protection.md:16-31`, `:49-57`).

## Sources

- https://docs.openclaw.ai/automation/standing-orders
- https://docs.openclaw.ai/automation/cron-jobs
- https://docs.openclaw.ai/automation/cron-jobs/how-it-works
- https://docs.openclaw.ai/automation/cron-jobs/delivery
- https://docs.openclaw.ai/automation/cron-jobs/webhooks
- https://docs.openclaw.ai/automation/cron-jobs/gmail
- https://docs.openclaw.ai/automation/imap
- https://docs.openclaw.ai/automation/hooks
- https://docs.openclaw.ai/automation/hooks/event-types
- https://docs.openclaw.ai/automation/hooks/writing-hooks
- https://docs.openclaw.ai/automation/mcp-events
- https://docs.openclaw.ai/channels/a2a
- https://docs.openclaw.ai/channels/broadcast-groups
- https://docs.openclaw.ai/channels/ambient-room-events
- https://docs.openclaw.ai/channels/bot-loop-protection
